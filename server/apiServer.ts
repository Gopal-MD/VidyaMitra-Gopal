/**
 * VidyaMitra API Server - Vite Plugin
 * All API keys stay server-side. Frontend calls /api/* endpoints.
 * Rate limiting enforced for free-tier APIs.
 */

import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { loadEnv } from 'vite';
import { getDb, hashPassword, verifyPassword, generateId } from './db';
import { DB } from './database';
import { registerSubscriptionRoutes } from './subscriptionRoutes';
import * as vm from 'node:vm';


// ==================== TYPES ====================
interface ApiKeys {
    GEMINI_API_KEY: string;
    GEMINI_IMAGE_API_KEY: string;
    YOUTUBE_API_KEY: string;
    PEXELS_API_KEY: string;
    NEWS_API_KEY: string;
    EXCHANGE_RATE_API_KEY: string;
    OPENAI_API_KEY: string;
    // Judge0 – self-hosted AWS instance (primary)
    JUDGE0_HOST: string;
    // Judge0 – RapidAPI fallback
    JUDGE0_RAPIDAPI_KEY: string;
    JUDGE0_RAPIDAPI_HOST: string;
    JUDGE0_RAPIDAPI_URL: string;
    GROQ_API_KEY: string;
    ELEVENLABS_API_KEY: string;
    // JDoodle Code Execution (replaces Judge0)
    JDOODLE_CLIENT_ID: string;
    JDOODLE_CLIENT_SECRET: string;
}

// ==================== RATE LIMITING ====================
interface RateBucket {
    timestamps: number[];
    maxPerMinute: number;
    maxPerDay: number;
    dayStart: number;
    dayCount: number;
}

const rateBuckets: Record<string, RateBucket> = {};

function getRateBucket(name: string, maxPerMinute: number, maxPerDay: number): RateBucket {
    if (!rateBuckets[name]) {
        rateBuckets[name] = {
            timestamps: [],
            maxPerMinute,
            maxPerDay,
            dayStart: new Date().setHours(0, 0, 0, 0),
            dayCount: 0,
        };
    }
    return rateBuckets[name];
}

function checkAndRecordRate(bucketName: string, maxPerMinute: number, maxPerDay: number): { ok: boolean; error?: string } {
    const bucket = getRateBucket(bucketName, maxPerMinute, maxPerDay);
    const now = Date.now();

    // Reset daily if new day
    const todayStart = new Date().setHours(0, 0, 0, 0);
    if (todayStart !== bucket.dayStart) {
        bucket.dayCount = 0;
        bucket.dayStart = todayStart;
    }

    // Clean minute window
    bucket.timestamps = bucket.timestamps.filter(t => t > now - 60000);

    if (bucket.timestamps.length >= bucket.maxPerMinute) {
        return { ok: false, error: `Rate limit: max ${bucket.maxPerMinute} requests/min for ${bucketName}. Wait a moment.` };
    }
    if (bucket.dayCount >= bucket.maxPerDay) {
        return { ok: false, error: `Daily limit reached for ${bucketName} (${bucket.maxPerDay}/day).` };
    }

    bucket.timestamps.push(now);
    bucket.dayCount++;
    return { ok: true };
}

// Gemini rate limiter: 10 RPM for free tier safety
async function geminiRateWait() {
    const bucket = getRateBucket('gemini', 10, 1400);
    const now = Date.now();
    bucket.timestamps = bucket.timestamps.filter(t => t > now - 60000);
    if (bucket.timestamps.length >= 10) {
        const oldest = bucket.timestamps[0];
        const waitMs = oldest + 60000 - now + 500;
        console.log(`⏳ Gemini rate limit: waiting ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
    }
}

// ==================== HELPERS ====================
function parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
            if (body.length > 2 * 1024 * 1024) reject(new Error('Body too large'));
        });
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

function sendJson(res: ServerResponse, status: number, data: any) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
}

function getUrlPath(req: IncomingMessage): string {
    return (req.url || '').split('?')[0];
}

function getQueryParams(req: IncomingMessage): URLSearchParams {
    const url = req.url || '';
    const qIndex = url.indexOf('?');
    return new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : '');
}

function safeParse(data: any, fallback: any = []) {
    if (!data) return fallback;
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return fallback; }
    }
    return data;
}

// Simple JWT-like token (session token stored in memory + persisted to DB)
const sessions: Map<string, { userId: string; email: string; isAdmin: boolean; name: string }> = new Map();

function createSession(userId: string, email: string, isAdmin: boolean, name: string): string {
    const token = generateId() + '-' + generateId();
    sessions.set(token, { userId, email, isAdmin, name });
    // Persist to DB so sessions survive server restarts
    DB.run(
        'INSERT INTO user_sessions (token, user_id, email, is_admin, name) VALUES (?, ?, ?, ?, ?)',
        [token, userId, email, isAdmin ? 1 : 0, name]
    ).catch((err: any) => console.warn('Failed to persist session:', err?.message));
    return token;
}

async function getSessionAsync(req: IncomingMessage): Promise<{ userId: string; email: string; isAdmin: boolean; name: string } | null> {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return null;
    // Fast path: in-memory
    const cached = sessions.get(token);
    if (cached) return cached;
    // Slow path: look up DB (survives server restarts)
    try {
        const row: any = await DB.get('SELECT user_id, email, is_admin, name FROM user_sessions WHERE token = ?', [token]);
        if (!row) return null;
        const sess = { userId: row.user_id, email: row.email, isAdmin: !!row.is_admin, name: row.name || '' };
        sessions.set(token, sess); // re-hydrate memory cache
        return sess;
    } catch {
        return null;
    }
}

function getSession(req: IncomingMessage) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    return sessions.get(token) || null;
}

// ==================== EXTERNAL API CALLS ====================

async function callGemini(apiKey: string, prompt: string, options: { temperature?: number; maxTokens?: number } = {}): Promise<{ success: boolean; text?: string; error?: string }> {
    if (!apiKey) return { success: false, error: 'Gemini API key not configured' };
    try {
        await geminiRateWait();
        const rate = checkAndRecordRate('gemini', 10, 1400);
        if (!rate.ok) return { success: false, error: rate.error };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: options.temperature ?? 0.7,
                        maxOutputTokens: options.maxTokens ?? 2048,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API error:', response.status, errText);
            if (response.status === 429) return { success: false, error: 'Gemini rate limit exceeded. Please wait.' };
            return { success: false, error: `Gemini API error: ${response.status}` };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return { success: false, error: 'Empty response from Gemini' };
        return { success: true, text };
    } catch (err: any) {
        return { success: false, error: err.message || 'Gemini call failed' };
    }
}

async function callGeminiImage(apiKey: string, prompt: string): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
    if (!apiKey) return { success: false, error: 'Gemini Image API key not configured' };
    try {
        await geminiRateWait();
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseModalities: ["TEXT", "IMAGE"],
                    },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini Image API error:', response.status, errText);
            return { success: false, error: `Gemini API error: ${response.status}` };
        }

        const data = await response.json();
        // The API might return text or image inlineData. If it returns an image, it's typically in parts[0].inlineData.data
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData);
        if (imagePart && imagePart.inlineData.data) {
            return { success: true, imageBase64: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` };
        }

        // Some models drop text response containing image markdown
        const textPart = parts.find((p: any) => p.text);
        if (textPart) {
            console.warn('Gemini 2.5 Flash Image returned text instead of image blob', textPart.text);
            return { success: false, error: 'Model returned text instead of image' };
        }

        return { success: false, error: 'No image found in response' };
    } catch (err: any) {
        return { success: false, error: err.message || 'Gemini Image call failed' };
    }
}

// ==================== GROQ API (Mermaid Roadmap) ====================
async function callGroq(apiKey: string, prompt: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const groqKeys = [
        apiKey,
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_GAP_ANALYSIS_KEY,
    ].filter(Boolean) as string[];

    const uniqueKeys = Array.from(new Set(groqKeys));
    const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'];

    for (const key of (uniqueKeys.length > 0 ? uniqueKeys : [apiKey])) {
        for (const model of models) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: 'You are a career roadmap expert. Generate ONLY valid Mermaid.js flowchart code with subgraph groupings. No explanations, no markdown backticks, just the raw Mermaid code starting with graph TD. Use subgraph blocks for phases. Never use colons in labels.' },
                            { role: 'user', content: prompt },
                        ],
                        temperature: 0.1,
                        max_tokens: 1500,
                    }),
                });

                if (!response.ok) {
                    console.warn(`⚠️ Groq model ${model} status ${response.status}, trying next...`);
                    continue;
                }

                const data = await response.json();
                let content = data.choices?.[0]?.message?.content?.trim() || '';

                // Clean up: strip markdown code fences if present
                content = content.replace(/```mermaid\s*/gi, '').replace(/```\s*/g, '').trim();
                const graphIdx = content.indexOf('graph TD');
                if (graphIdx > 0) content = content.substring(graphIdx);
                if (content.startsWith('graph TD')) {
                    // Sanitize colons inside square-bracket labels
                    content = content.replace(/\[([^\]]*):([^\]]*)\]/g, (_, a, b) => `[${a} - ${b}]`);
                    return { success: true, content };
                }
            } catch (err: any) {
                console.warn('Groq call error, trying next:', err.message);
            }
        }
    }

    return { success: false, error: 'All Groq keys/models failed' };
}

function generateFallbackMermaid(targetRole: string, timeline = '3 months', currentSkills = '', skillsToLearn = ''): string {
    const role = targetRole || 'Software Engineer';
    const numPhases = timeline === '1 month' ? 2 : timeline === '6 months' ? 4 : 3;

    if (numPhases === 2) {
        return `graph TD
    subgraph Phase1[Phase 1 - Core Fundamentals]
        A1[Core Syntax & Concepts] --> A2[Data Structures]
        A2 --> A3[Essential Tooling]
        B1[Environment Setup] --> B2[Git & Collaboration]
        B2 --> B3[Unit Testing Basics]
    end
    subgraph Phase2[Phase 2 - Applied Projects & Mastery]
        C1[Full Application Build] --> C2[API Integration]
        C2 --> C3[Performance Tuning]
        D1[System Architecture] --> D2[CI/CD & Cloud Deploy]
        D2 --> D3[Portfolio Polish]
    end
    A3 --> C1
    B3 --> D1
    C3 --> Goal[${role} Ready]
    D3 --> Goal
    style A1 fill:#6366f1,color:#fff
    style B1 fill:#6366f1,color:#fff
    style C1 fill:#06b6d4,color:#fff
    style D1 fill:#06b6d4,color:#fff
    style Goal fill:#10b981,color:#fff`;
    }

    if (numPhases === 4) {
        return `graph TD
    subgraph Phase1[Month 1 - Foundations]
        A1[Core Languages & Tools] --> A2[Algorithms & Data Structures]
        B1[Version Control & Git] --> B2[Dev Environment]
    end
    subgraph Phase2[Month 2 - Advanced Architecture]
        C1[Framework Deep Dive] --> C2[Database & State Mgmt]
        D1[Design Patterns] --> D2[Security & Auth]
    end
    subgraph Phase3[Month 3-4 - Full Stack Mastery]
        E1[Microservices & Cloud] --> E2[CI/CD Pipelines]
        F1[Real-time Systems] --> F2[Scalability & Caching]
    end
    subgraph Phase4[Month 5-6 - Capstone & Career Prep]
        G1[Production Capstone] --> G2[System Design Prep]
        H1[Mock Technical Interviews] --> H2[Resume & Portfolio]
    end
    A2 --> C1
    B2 --> D1
    C2 --> E1
    D2 --> F1
    E2 --> G1
    F2 --> H1
    G2 --> Goal[Senior ${role} Mastery]
    H2 --> Goal
    style A1 fill:#6366f1,color:#fff
    style C1 fill:#3b82f6,color:#fff
    style E1 fill:#06b6d4,color:#fff
    style G1 fill:#8b5cf6,color:#fff
    style Goal fill:#10b981,color:#fff`;
    }

    return `graph TD
    subgraph Phase1[Month 1 - Foundations & Skills]
        A1[Core Concepts & Syntax] --> A2[Data Structures & Logic]
        A2 --> A3[Hands-on Exercises]
        B1[Tooling & Git Workflow] --> B2[Code Quality & Linting]
        B2 --> B3[Module Testing]
    end
    subgraph Phase2[Month 2 - Advanced & Domain Skills]
        C1[Frameworks & Libraries] --> C2[Backend & API Design]
        C2 --> C3[Database Integration]
        D1[State Management] --> D2[Security & Best Practices]
        D2 --> D3[Optimization]
    end
    subgraph Phase3[Month 3 - Production & Portfolio]
        E1[Full-Stack Capstone] --> E2[CI/CD & Cloud Deployment]
        E2 --> E3[Monitoring & Logging]
        F1[Interview Prep & LeetCode] --> F2[System Design Basics]
        F2 --> F3[Portfolio Deployment]
    end
    A3 --> C1
    B3 --> D1
    C3 --> E1
    D3 --> F1
    E3 --> Goal[${role} Professional Ready]
    F3 --> Goal
    style A1 fill:#6366f1,color:#fff
    style B1 fill:#6366f1,color:#fff
    style C1 fill:#3b82f6,color:#fff
    style D1 fill:#3b82f6,color:#fff
    style E1 fill:#8b5cf6,color:#fff
    style F1 fill:#8b5cf6,color:#fff
    style Goal fill:#10b981,color:#fff`;
}

function generateLocalCareerPlan(targetRole: string, skillGaps: string[] = []): any {
    const role = targetRole || 'Software Engineer';
    const gaps = (skillGaps && skillGaps.length > 0) ? skillGaps : ['Core Principles', 'Architecture', 'System Design'];

    const weeklyPlan = [
        {
            week: 1,
            title: `Week 1: Foundations of ${role}`,
            topics: ['Core syntax & programming paradigms', 'Development environment & modern tooling', 'Version control with Git & GitHub'],
            goals: ['Complete 5 foundational coding exercises', 'Set up local development container/environment'],
            resources: [`Official ${role} documentation`, 'FreeCodeCamp Interactive Course', 'CS50 Introduction']
        },
        {
            week: 2,
            title: `Week 2: Data Structures & Algorithms`,
            topics: ['Arrays, Hash Maps, Linked Lists', 'Time and Space Complexity (Big-O)', 'Binary Search & Two-Pointer techniques'],
            goals: ['Solve 10 LeetCode Easy/Medium problems', 'Implement key data structures from scratch'],
            resources: ['NeetCode 150 roadmap', 'GeeksforGeeks Data Structures', 'LeetCode Explore']
        },
        {
            week: 3,
            title: `Week 3: Key Skill Gap Deep-Dive: ${gaps[0] || 'Domain Architecture'}`,
            topics: [`${gaps[0] || 'Core Architecture'} deep dive`, 'Design patterns & modular coding', 'Error handling and edge cases'],
            goals: ['Build a standalone module showcasing this skill', 'Write comprehensive unit tests'],
            resources: ['Refactoring.Guru Design Patterns', 'Clean Code by Robert C. Martin', 'MDN Web Docs']
        },
        {
            week: 4,
            title: `Week 4: Secondary Skills & Integration: ${gaps[1] || 'API & Data Storage'}`,
            topics: [`${gaps[1] || 'Database & API'} integration`, 'REST / GraphQL architecture', 'Asynchronous programming & concurrency'],
            goals: ['Connect backend services with persistent database', 'Implement robust request validation'],
            resources: ['Postman API Academy', 'Supabase / PostgreSQL Documentation', 'REST API Best Practices']
        },
        {
            week: 5,
            title: `Week 5: System Design & Scalability`,
            topics: ['Monolithic vs Microservices', 'Caching strategies (Redis, CDNs)', 'Load balancing & horizontal scaling'],
            goals: ['Draw end-to-end architecture diagrams for a high-traffic app', 'Implement redis caching layer'],
            resources: ['System Design Primer (GitHub)', 'ByteByteGo System Design', 'High Scalability blog']
        },
        {
            week: 6,
            title: `Week 6: Testing, CI/CD & Cloud Deployment`,
            topics: ['Unit, Integration, and E2E Testing', 'Docker containerization', 'GitHub Actions / CI pipelines', 'Cloud hosting & environments'],
            goals: ['Automate test suites in GitHub Actions', 'Deploy containerized web service to cloud'],
            resources: ['Docker Getting Started', 'GitHub Actions Documentation', 'Render / AWS Deployment Guides']
        },
        {
            week: 7,
            title: `Week 7: Production Capstone Project`,
            topics: ['Building production-grade full-stack project', 'Security best practices (OAuth, CSRF, rate-limiting)', 'Performance auditing & Lighthouse score'],
            goals: ['Complete capstone repository with thorough README', 'Deploy live demo with custom domain or URL'],
            resources: ['OWASP Top 10 Security', 'Web.dev Performance Checklist', 'Production Readiness Review']
        },
        {
            week: 8,
            title: `Week 8: Technical Interview Prep & Career Launch`,
            topics: ['Mock behavioral interviews (STAR method)', 'Live coding interview practice', 'Resume & portfolio optimization for ATS'],
            goals: ['Complete 3 mock interviews on VidyaMitra', 'Tailor resume with ATS score > 85%', 'Apply to 10 matching target positions'],
            resources: ['VidyaMitra AI Mock Interviews', 'Cracking the Coding Interview', 'Tech Interview Handbook']
        }
    ];

    return {
        weeklyPlan,
        milestones: [
            'Milestone 1 (Week 2): Mastered foundational algorithms and environment setup',
            `Milestone 2 (Week 4): Conquered primary skill gaps in ${gaps.slice(0, 2).join(', ')}`,
            'Milestone 3 (Week 6): Deployed containerized services with CI/CD automation',
            `Milestone 4 (Week 8): Completed production capstone and interview readiness for ${role}`
        ],
        estimatedCompletion: '8 weeks',
        dailyHours: 2
    };
}


async function fetchYouTubeVideos(apiKey: string, query: string, maxResults = 3): Promise<any[]> {
    try {
        const rate = checkAndRecordRate('youtube', 5, 90);
        if (!rate.ok) {
            console.warn('YouTube rate limit:', rate.error);
            return getFallbackYouTubeVideos(query);
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) {
            console.error('YouTube API error:', res.status);
            return getFallbackYouTubeVideos(query);
        }
        const data = await res.json();
        return (data.items || []).map((item: any) => ({
            id: item.id?.videoId,
            title: item.snippet?.title,
            description: item.snippet?.description,
            thumbnail: item.snippet?.thumbnails?.medium?.url,
            channelTitle: item.snippet?.channelTitle,
            url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
        }));
    } catch (err) {
        console.error('YouTube fetch error:', err);
        return getFallbackYouTubeVideos(query);
    }
}

function getFallbackYouTubeVideos(query: string): any[] {
    return [
        { id: 'fallback1', title: `Learn ${query} - Full Course`, description: `Complete tutorial on ${query}`, thumbnail: '', channelTitle: 'VidyaMitra', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' tutorial')}` },
        { id: 'fallback2', title: `${query} for Beginners`, description: `Beginner guide to ${query}`, thumbnail: '', channelTitle: 'VidyaMitra', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' beginners')}` },
    ];
}

async function fetchPexelsImages(apiKey: string, query: string, perPage = 3): Promise<any[]> {
    try {
        const rate = checkAndRecordRate('pexels', 5, 180);
        if (!rate.ok) return getFallbackPexelsImages(query);

        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;
        const res = await fetch(url, { headers: { Authorization: apiKey } });
        if (!res.ok) return getFallbackPexelsImages(query);
        const data = await res.json();
        return (data.photos || []).map((photo: any) => ({
            id: photo.id,
            url: photo.src?.medium || photo.src?.original,
            alt: photo.alt || query,
            photographer: photo.photographer,
        }));
    } catch {
        return getFallbackPexelsImages(query);
    }
}

function getFallbackPexelsImages(query: string): any[] {
    return [
        { id: 'fb1', url: `https://via.placeholder.com/400x300?text=${encodeURIComponent(query)}`, alt: query, photographer: 'VidyaMitra' },
    ];
}

async function fetchNews(apiKey: string, query: string): Promise<any[]> {
    try {
        const rate = checkAndRecordRate('news', 3, 90);
        if (!rate.ok) return getFallbackNews(query);

        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=5&sortBy=publishedAt&language=en&apiKey=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return getFallbackNews(query);
        const data = await res.json();
        return (data.articles || []).slice(0, 5).map((a: any) => ({
            title: a.title,
            description: a.description,
            url: a.url,
            source: a.source?.name,
            publishedAt: a.publishedAt,
            image: a.urlToImage,
        }));
    } catch {
        return getFallbackNews(query);
    }
}

function getFallbackNews(query: string): any[] {
    return [
        { title: `Latest trends in ${query}`, description: `Stay updated with ${query} industry news`, url: `https://news.google.com/search?q=${encodeURIComponent(query)}`, source: 'Google News', publishedAt: new Date().toISOString(), image: null },
    ];
}

async function fetchExchangeRate(apiKey: string): Promise<any> {
    try {
        const rate = checkAndRecordRate('exchange', 2, 50);
        if (!rate.ok) return getFallbackExchangeRates();

        const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
        const res = await fetch(url);
        if (!res.ok) return getFallbackExchangeRates();
        const data = await res.json();
        return {
            base: data.base_code || 'USD',
            rates: {
                INR: data.conversion_rates?.INR || 83.5,
                EUR: data.conversion_rates?.EUR || 0.92,
                GBP: data.conversion_rates?.GBP || 0.79,
                JPY: data.conversion_rates?.JPY || 149.5,
            },
            lastUpdated: data.time_last_update_utc || new Date().toISOString(),
        };
    } catch {
        return getFallbackExchangeRates();
    }
}

function getFallbackExchangeRates() {
    return { base: 'USD', rates: { INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 149.5 }, lastUpdated: new Date().toISOString() };
}

// ==================== GITHUB ANALYSIS HELPERS ====================

function extractGitHubUsername(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;
    return null;
}

interface GitHubProfileData {
    username: string;
    publicRepos: number;
    recentlyActivePushed: number;
    topLanguages: string[];
    recentLanguages: string[];
    totalStars: number;
    followersCount: number;
    accountAgeYears: number;
}

async function fetchGitHubData(githubUrl: string): Promise<GitHubProfileData | null> {
    try {
        const username = extractGitHubUsername(githubUrl);
        if (!username) return null;

        const token = process.env.VITE_GITHUB_API_KEY;
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'VidyaMitra-App',
        };
        if (token) headers['Authorization'] = `token ${token}`;

        const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
        if (!userRes.ok) {
            console.warn(`GitHub user fetch failed for ${username}: ${userRes.status}`);
            return null;
        }
        const userData = await userRes.json() as any;

        const reposRes = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=30&sort=pushed&type=owner`,
            { headers }
        );
        if (!reposRes.ok) return null;
        const repos = await reposRes.json() as any[];

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const langFreq: Record<string, number> = {};
        const recentLangFreq: Record<string, number> = {};
        let totalStars = 0;
        let recentlyActive = 0;

        for (const repo of repos) {
            if (repo.fork) continue;
            const lang: string | null = repo.language;
            if (lang) langFreq[lang] = (langFreq[lang] || 0) + 1;
            if (new Date(repo.pushed_at as string) > sixMonthsAgo) {
                recentlyActive++;
                if (lang) recentLangFreq[lang] = (recentLangFreq[lang] || 0) + 1;
            }
            totalStars += (repo.stargazers_count as number) || 0;
        }

        const topLanguages = Object.entries(langFreq)
            .sort(([, a], [, b]) => b - a).slice(0, 6).map(([l]) => l);
        const recentLanguages = Object.entries(recentLangFreq)
            .sort(([, a], [, b]) => b - a).slice(0, 4).map(([l]) => l);
        const accountAgeYears = parseFloat(
            ((Date.now() - new Date(userData.created_at as string).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
        );

        return {
            username,
            publicRepos: (userData.public_repos as number) || 0,
            recentlyActivePushed: recentlyActive,
            topLanguages,
            recentLanguages,
            totalStars,
            followersCount: (userData.followers as number) || 0,
            accountAgeYears,
        };
    } catch (err) {
        console.warn('GitHub API fetch error:', err);
        return null;
    }
}

async function analyzeGitHubForRole(
    ghData: GitHubProfileData,
    targetRole: string,
    groqKey2: string,
    geminiKey: string
): Promise<{ github_match: number; github_skills: string[]; insight: string }> {
    const mathFallback = () => {
        const langScore = Math.min(30, ghData.topLanguages.length * 5);
        const activityScore = Math.min(25, ghData.recentlyActivePushed * 4);
        const quantityScore = Math.min(20, ghData.publicRepos);
        const starScore = Math.min(10, ghData.totalStars * 0.3);
        return {
            github_match: Math.min(100, Math.round(15 + langScore + activityScore + quantityScore * 0.5 + starScore)),
            github_skills: ghData.topLanguages.slice(0, 4),
            insight: `${ghData.publicRepos} public repos · ${ghData.recentlyActivePushed} recently active · top: ${ghData.topLanguages.slice(0, 3).join(', ')}.`,
        };
    };

    const prompt = `A software developer targets: "${targetRole}"

Their REAL GitHub stats:
- Public repos (own): ${ghData.publicRepos}
- Repos pushed in last 6 months: ${ghData.recentlyActivePushed}
- All-time top languages: ${ghData.topLanguages.join(', ') || 'None'}
- Recent languages: ${ghData.recentLanguages.join(', ') || 'None'}
- Total stars earned: ${ghData.totalStars}
- Followers: ${ghData.followersCount}
- Account age: ${ghData.accountAgeYears} years

Return ONLY valid JSON:
{"github_match":<0-100>,"github_skills":["skill1","skill2","skill3"],"insight":"<one sentence>"}

Score by: language relevance to role (40%), recency of activity (30%), quantity (20%), traction (10%).`;

    // Helper: extract JSON object from model output (handles thinking tokens, markdown fences)
    const extractJSON = (raw: string): any => {
        let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        // Find first { ... } block
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON object found in response');
        return JSON.parse(s.substring(start, end + 1));
    };

    // Try each available Groq key (primary first, then secondary)
    const groqKeys = [process.env.GROQ_API_KEY, groqKey2].filter(Boolean) as string[];
    for (const key of groqKeys) {
        try {
            const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        { role: 'system', content: 'You are a technical recruiter. Respond with ONLY a JSON object, no explanation, no markdown.' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.1,
                    max_tokens: 150,
                }),
            });
            if (!r.ok) {
                console.warn(`GitHub analysis: Groq key failed (${r.status}), trying next...`);
                continue;
            }
            const data = await r.json() as any;
            const content: string = data.choices?.[0]?.message?.content?.trim() || '';
            const parsed = extractJSON(content);
            return {
                github_match: Math.min(100, Math.max(0, Number(parsed.github_match) || 30)),
                github_skills: (parsed.github_skills as string[]) || ghData.topLanguages.slice(0, 3),
                insight: (parsed.insight as string) || '',
            };
        } catch (e) {
            console.warn(`GitHub analysis Groq key failed:`, (e as Error).message);
            continue;
        }
    }

    // All keys failed — use math fallback

    // Ultimate math-based fallback
    return mathFallback();
}

// ==================== PERSISTENT PROCTORING SETTINGS ====================
// Module-level so settings survive Vite HMR (loaded from DB on first request)
let proctoringSettings = {
    // Engine mode: 'tensorflow' | 'rekognition' | 'both'
    proctoringMode: 'tensorflow' as 'tensorflow' | 'rekognition' | 'both',
    // TensorFlow settings
    tensorflow: true,
    objectDetection: true,
    tfIntervalMs: 1500,
    noFaceStrikeSec: 5,
    // Rekognition settings
    rekognition: false,
    rekognitionIntervalMs: 3000,  // Higher interval to reduce API calls and cost
    rekognitionObjectDetection: true,
    // Advanced Rekognition options
    rekognitionLookAwayDetection: true,  // Detect if user is looking away
    rekognitionFaceCoverageDetection: true,  // Detect sunglasses etc.
    maxYawAngle: 30,  // Max face yaw angle before violation
    maxPitchAngle: 25,  // Max face pitch angle before violation
};
let _procSettingsLoaded = false;

async function loadProctoringSettingsFromDB(): Promise<void> {
    if (_procSettingsLoaded) return;
    try {
        const row = await DB.get('SELECT value FROM app_settings WHERE id = ?', ['proctoring']);
        if (row?.value) {
            const saved = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            Object.assign(proctoringSettings, saved);
            // Maintain backward compatibility - if mode not set, use tensorflow if enabled
            if (!saved.proctoringMode) {
                proctoringSettings.proctoringMode = saved.tensorflow !== false ? 'tensorflow' : 'rekognition';
            }
        }
        _procSettingsLoaded = true; // Only set to true if query succeeds
    } catch {
        // Table may not exist yet — use defaults silently (will retry next time)
    }
}

async function saveProctoringSettingsToDB(): Promise<void> {
    try {
        await DB.run(
            "INSERT OR REPLACE INTO app_settings (id, value, updated_at) VALUES (?, ?, datetime('now'))",
            ['proctoring', JSON.stringify(proctoringSettings)]
        );
    } catch {
        // Non-critical — settings work from memory even if save fails
    }
}

// ==================== VITE PLUGIN ====================
export function vidyaMitraApiPlugin(): Plugin {
    let keys: ApiKeys = {} as ApiKeys;
    let resolvedEnv: Record<string, string> = {};

    function initEnvAndKeys(config?: any) {
        if (keys.GEMINI_API_KEY || Object.keys(keys).length > 0) return;
        const loaded = config ? loadEnv(config.mode || 'production', config.root || process.cwd(), '') : {};
        const env = { ...process.env, ...loaded };
        resolvedEnv = env as Record<string, string>;
        keys = {
            GEMINI_API_KEY: env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '',
            GEMINI_IMAGE_API_KEY: env.GEMINI_IMAGE_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '',
            YOUTUBE_API_KEY: env.YOUTUBE_API_KEY || '',
            PEXELS_API_KEY: env.PEXELS_API_KEY || '',
            NEWS_API_KEY: env.NEWS_API_KEY || '',
            EXCHANGE_RATE_API_KEY: env.EXCHANGE_RATE_API_KEY || '',
            OPENAI_API_KEY: env.OPENAI_API_KEY || '',
            // Judge0 – self-hosted AWS instance (primary)
            JUDGE0_HOST: env.JUDGE0_HOST || 'http://54.234.23.242:2358',
            // Judge0 – RapidAPI fallback
            JUDGE0_RAPIDAPI_KEY: env.JUDGE0_RAPIDAPI_KEY || env.VITE_JUDGE0_API_KEY || '',
            JUDGE0_RAPIDAPI_HOST: env.JUDGE0_RAPIDAPI_HOST || env.VITE_JUDGE0_API_HOST || 'judge029.p.rapidapi.com',
            JUDGE0_RAPIDAPI_URL: env.JUDGE0_RAPIDAPI_URL || env.VITE_JUDGE0_BASE_URL || 'https://judge029.p.rapidapi.com',
            GROQ_API_KEY: env.GROQ_API_KEY || '',
            ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY || '',
            JDOODLE_CLIENT_ID: env.JDOODLE_CLIENT_ID || '',
            JDOODLE_CLIENT_SECRET: env.JDOODLE_CLIENT_SECRET || '',
        };

        const dbType = (env.DB_TYPE || 'sqlite').toLowerCase();
        if (dbType === 'sqlite') {
            getDb(); // Initialize SQLite schema + seed data
        } else {
            console.log(`✅ Database mode: SUPABASE (${env.SUPABASE_URL || 'configured from env'})`);
        }

        console.log('✅ VidyaMitra API server initialized');
        console.log('  Gemini:', keys.GEMINI_API_KEY ? '✅' : '⚠️  (not configured, using Groq)');
        console.log('  YouTube:', keys.YOUTUBE_API_KEY ? '✅' : '❌');
        console.log('  Pexels:', keys.PEXELS_API_KEY ? '✅' : '❌');
        console.log('  News:', keys.NEWS_API_KEY ? '✅' : '❌');
        console.log('  Exchange:', keys.EXCHANGE_RATE_API_KEY ? '✅' : '❌');
        console.log('  Groq:', keys.GROQ_API_KEY ? '✅' : '❌');
        console.log('  ElevenLabs:', keys.ELEVENLABS_API_KEY ? '✅' : '❌');
        console.log('  JDoodle:', keys.JDOODLE_CLIENT_ID ? '✅' : '⚠️  (not configured — non-JS code execution disabled)');
        console.log('  Judge0 (AWS):', keys.JUDGE0_HOST ? `✅ ${keys.JUDGE0_HOST}` : '❌');
        console.log('  Judge0 (RapidAPI fallback):', keys.JUDGE0_RAPIDAPI_KEY ? '✅' : '❌');
        const execModeLog = (env.CODE_EXECUTION_MODE || 'auto').toUpperCase();
        const execEmoji = execModeLog === 'LOCAL' ? '🏠' : execModeLog === 'RAPIDAPI' ? '⚡' : '🔄';
        console.log(`  Code Execution Mode: ${execEmoji} ${execModeLog}`);

        // ── AWS Services DISABLED ──────────────────
        console.log('  ℹ️  AWS services disabled — using local fallbacks (TF.js proctoring, PDF.js resume parsing)');
    }

    function setupApiRoutes(server: { middlewares: any }) {

            // CORS preflight
            server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
                if (req.url?.startsWith('/api/') && req.method === 'OPTIONS') {
                    res.writeHead(204, {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    });
                    res.end();
                    return;
                }
                next();
            });

            // ==================== JDOODLE CODE EXECUTION ====================
            // JDoodle is synchronous — 1 call = 1 credit = instant result (no polling)
            // Free tier: 20 credits/day. JS is excluded (handled in-browser, no credits used).
            server.middlewares.use('/api/jdoodle/execute', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();

                // Rate limit: 20/day total (matches JDoodle free tier)
                const rateCheck = checkAndRecordRate('jdoodle', 5, 20);
                if (!rateCheck.ok) {
                    return sendJson(res, 429, {
                        error: rateCheck.error || 'JDoodle daily limit reached (20/day). Try again tomorrow or use JavaScript which runs locally.',
                        statusCode: 429,
                    });
                }

                if (!keys.JDOODLE_CLIENT_ID || !keys.JDOODLE_CLIENT_SECRET) {
                    return sendJson(res, 503, {
                        error: 'JDoodle not configured. Add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to your .env file.',
                    });
                }

                try {
                    const body = await parseBody(req);
                    const { script, language, versionIndex = '0', stdin = '' } = body;

                    if (!script || !language) {
                        return sendJson(res, 400, { error: 'script and language are required' });
                    }

                    // JDoodle API: synchronous, single call, returns output directly
                    const jdoodleRes = await fetch('https://api.jdoodle.com/v1/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            clientId: keys.JDOODLE_CLIENT_ID,
                            clientSecret: keys.JDOODLE_CLIENT_SECRET,
                            script,
                            language,
                            versionIndex,
                            stdin,
                        }),
                    });

                    const data = await jdoodleRes.json() as any;

                    if (!jdoodleRes.ok || data.error) {
                        console.error('JDoodle API error:', data);
                        // 403 = invalid credentials
                        if (jdoodleRes.status === 403 || data.statusCode === 403) {
                            return sendJson(res, 503, {
                                error: 'JDoodle credentials invalid. Please update JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in your .env file with real keys from jdoodle.com.',
                                output: '',
                                isExecutionSuccess: false,
                            });
                        }
                        return sendJson(res, 500, {
                            error: data.error || data.message || `JDoodle error (${jdoodleRes.status})`,
                            output: '',
                            isExecutionSuccess: false,
                        });
                    }

                    // JDoodle response: { output, statusCode, memory, cpuTime, isExecutionSuccess }
                    sendJson(res, 200, {
                        output: data.output || '',
                        statusCode: data.statusCode,
                        memory: data.memory,
                        cpuTime: data.cpuTime,
                        isExecutionSuccess: data.isExecutionSuccess ?? (data.statusCode === 200),
                    });
                } catch (err: any) {
                    console.error('JDoodle proxy error:', err.message);
                    sendJson(res, 500, { error: err.message || 'JDoodle execution failed', output: '' });
                }
            });

            // ==================== AUTH ROUTES ====================
            server.middlewares.use('/api/auth/login', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { email, password } = await parseBody(req);
                    if (!email || !password) return sendJson(res, 400, { error: 'Email and password required' });

                    const user = await DB.get('SELECT * FROM users WHERE email = ?', [email]) as any;
                    if (!user) return sendJson(res, 401, { error: 'Invalid email or password' });

                    if (!verifyPassword(password, user.password_hash)) {
                        return sendJson(res, 401, { error: 'Invalid email or password' });
                    }

                    const userType = user.user_type || (user.is_admin ? 'admin' : 'student');
                    let institutionName = null;
                    if (user.institution_id) {
                        const inst = await DB.get('SELECT name FROM institutions WHERE id = ?', [user.institution_id]) as any;
                        institutionName = inst?.name;
                    }

                    const token = createSession(user.id, user.email, !!user.is_admin, user.name || '');
                    sendJson(res, 200, {
                        token,
                        user: { 
                            id: user.id, 
                            email: user.email, 
                            name: user.name, 
                            isAdmin: !!user.is_admin,
                            userType: userType,
                            studentCategory: user.student_category,
                            institutionId: user.institution_id,
                            institutionName: institutionName
                        },
                    });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            server.middlewares.use('/api/auth/signup', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { email, password, name, studentCategory, institutionId } = await parseBody(req);
                    if (!email || !password) return sendJson(res, 400, { error: 'Email and password required' });
                    if (email === 'admin@vidyamitra.com') return sendJson(res, 403, { error: 'Email reserved for admin' });

                    const existing = await DB.get('SELECT id FROM users WHERE email = ?', [email]);
                    if (existing) return sendJson(res, 409, { error: 'Email already in use' });

                    const id = generateId();
                    const passwordHash = hashPassword(password);
                    const displayName = name || email.split('@')[0];

                    await DB.run(
                        'INSERT INTO users (id, email, password_hash, name, is_admin, user_type, student_category, institution_id) VALUES (?, ?, ?, ?, 0, ?, ?, ?)'
                    , [id, email, passwordHash, displayName, 'student', studentCategory || null, institutionId || null]);

                    // Update institution student count if linked
                    if (institutionId) {
                        await DB.run('UPDATE institutions SET student_count = student_count + 1 WHERE id = ?', [institutionId]);
                    }

                    const token = createSession(id, email, false, displayName);
                    sendJson(res, 201, {
                        token,
                        user: { 
                            id, 
                            email, 
                            name: displayName, 
                            isAdmin: false,
                            userType: 'student',
                            studentCategory: studentCategory || null,
                            institutionId: institutionId || null
                        },
                    });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            server.middlewares.use('/api/auth/me', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const session = await getSessionAsync(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                
                try {
                    // Check if it's an institution
                    const inst = await DB.get('SELECT id, institution_code, name FROM institutions WHERE email = ?', [session.email]) as any;
                    if (inst) {
                        return sendJson(res, 200, { user: { id: session.userId, email: session.email, name: session.name, isAdmin: false, userType: 'institution', institutionId: inst.id, institutionCode: inst.institution_code } });
                    }
                    
                    const user = await DB.get('SELECT user_type, student_category, institution_id FROM users WHERE id = ?', [session.userId]) as any;
                    let institutionName;
                    if (user?.institution_id) {
                         const uInst = await DB.get('SELECT name FROM institutions WHERE id = ?', [user.institution_id]) as any;
                         if (uInst) institutionName = uInst.name;
                    }
                    
                    sendJson(res, 200, { user: { 
                        id: session.userId, 
                        email: session.email, 
                        name: session.name, 
                        isAdmin: session.isAdmin,
                        userType: user?.user_type || (session.isAdmin ? 'admin' : 'student'),
                        studentCategory: user?.student_category,
                        institutionId: user?.institution_id,
                        institutionName
                    } });
                } catch (e) {
                    sendJson(res, 200, { user: { id: session.userId, email: session.email, name: session.name, isAdmin: session.isAdmin } });
                }
            });

            server.middlewares.use('/api/auth/logout', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                const authHeader = req.headers.authorization || '';
                const token = authHeader.replace('Bearer ', '').trim();
                sessions.delete(token);
                if (token) {
                    DB.run('DELETE FROM user_sessions WHERE token = ?', [token]).catch(() => {});
                }
                sendJson(res, 200, { success: true });
            });

            // ==================== INSTITUTION ROUTES ====================
            // Institution Login
            server.middlewares.use('/api/auth/institution/login', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { institutionId, password } = await parseBody(req);
                    if (!institutionId || !password) return sendJson(res, 400, { error: 'Institution ID and password required' });

                    const institution = await DB.get('SELECT * FROM institutions WHERE id = ? AND is_active = 1', [institutionId]) as any;
                    if (!institution) return sendJson(res, 401, { error: 'Invalid institution or inactive account' });

                    if (!verifyPassword(password, institution.password_hash)) {
                        return sendJson(res, 401, { error: 'Invalid password' });
                    }

                    const token = createSession(institution.id, institution.email, false, institution.name);
                    sendJson(res, 200, {
                        token,
                        user: { 
                            id: institution.id, 
                            email: institution.email, 
                            name: institution.name, 
                            isAdmin: false,
                            userType: 'institution',
                            institutionCode: institution.institution_code
                        },
                    });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // Get All Active Institutions (for dropdown)
            server.middlewares.use('/api/institutions/list', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                try {
                    const institutions = await DB.all(
                        'SELECT id, name, institution_code, institution_type, location FROM institutions WHERE is_active = 1 ORDER BY name'
                    , []);
                    sendJson(res, 200, { institutions });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // Get Institution's Students
            server.middlewares.use(async (req: any, res: any, next: any) => {
                const path = getUrlPath(req);
                const studentsMatch = path.match(/^\/api\/institutions\/([^\/]+)\/students$/);
                if (!studentsMatch || req.method !== 'GET') return next();
                
                try {
                    const session = getSession(req);
                    if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                    const institutionId = studentsMatch[1];
                    
                    // Verify institution access
                    const institution = await DB.get('SELECT * FROM institutions WHERE id = ?', [institutionId]) as any;
                    if (!institution) return sendJson(res, 404, { error: 'Institution not found' });
                    
                    // Only allow institution itself or admin to view
                    if (session.userId !== institutionId && !session.isAdmin) {
                        return sendJson(res, 403, { error: 'Access denied' });
                    }

                    const students = await DB.all(`
                        SELECT id, email, name, student_category, target_role, created_at,
                               (SELECT COUNT(*) FROM interviews WHERE user_id = users.id) as interview_count,
                               (SELECT AVG(score) FROM interviews WHERE user_id = users.id AND completed = 1) as avg_score
                        FROM users 
                        WHERE institution_id = ? AND user_type = 'student'
                        ORDER BY created_at DESC
                    `, [institutionId]);

                    sendJson(res, 200, { students, institutionName: institution.name });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // Get Institution Analytics
            server.middlewares.use(async (req: any, res: any, next: any) => {
                const path = getUrlPath(req);
                const analyticsMatch = path.match(/^\/api\/institutions\/([^\/]+)\/analytics$/);
                if (!analyticsMatch || req.method !== 'GET') return next();
                
                try {
                    const session = getSession(req);
                    if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                    const institutionId = analyticsMatch[1];
                    
                    // Verify institution access
                    if (session.userId !== institutionId && !session.isAdmin) {
                        return sendJson(res, 403, { error: 'Access denied' });
                    }

                    const totalStudents = await DB.get('SELECT COUNT(*) as count FROM users WHERE institution_id = ?', [institutionId]) as any;
                    const totalInterviews = await DB.get('SELECT COUNT(*) as count FROM interviews i JOIN users u ON i.user_id = u.id WHERE u.institution_id = ?', [institutionId]) as any;
                    const completedInterviews = await DB.get('SELECT COUNT(*) as count FROM interviews i JOIN users u ON i.user_id = u.id WHERE u.institution_id = ? AND i.completed = 1', [institutionId]) as any;
                    const avgScore = await DB.get('SELECT AVG(score) as avg FROM interviews i JOIN users u ON i.user_id = u.id WHERE u.institution_id = ? AND i.completed = 1', [institutionId]) as any;
                    
                    const categoryBreakdown = await DB.all(`
                        SELECT student_category, COUNT(*) as count 
                        FROM users 
                        WHERE institution_id = ? AND student_category IS NOT NULL
                        GROUP BY student_category
                    `, [institutionId]);

                    const topPerformers = await DB.all(`
                        SELECT u.id, u.name, u.email, AVG(i.score) as avg_score, COUNT(i.id) as interview_count
                        FROM users u
                        LEFT JOIN interviews i ON u.id = i.user_id AND i.completed = 1
                        WHERE u.institution_id = ?
                        GROUP BY u.id
                        ORDER BY avg_score DESC
                        LIMIT 5
                    `, [institutionId]);

                    sendJson(res, 200, {
                        totalStudents: totalStudents.count,
                        totalInterviews: totalInterviews.count,
                        completedInterviews: completedInterviews.count,
                        averageScore: avgScore.avg || 0,
                        categoryBreakdown,
                        topPerformers
                    });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== ADMIN - INSTITUTION MANAGEMENT ====================
            // Get All Institutions (Admin Only)
            server.middlewares.use('/api/admin/institutions', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                try {
                    const session = getSession(req);
                    if (!session || !session.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

                    const institutions = await DB.all(`
                        SELECT i.*, 
                               (SELECT COUNT(*) FROM users WHERE institution_id = i.id) as student_count
                        FROM institutions i
                        ORDER BY i.created_at DESC
                    `, []);
                    sendJson(res, 200, { institutions });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // Update Institution (Admin Only)
            server.middlewares.use(async (req: any, res: any, next: any) => {
                const path = getUrlPath(req);
                const updateMatch = path.match(/^\/api\/admin\/institutions\/([^\/]+)$/);
                if (!updateMatch || req.method !== 'PUT') return next();
                
                try {
                    const session = getSession(req);
                    if (!session || !session.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

                    const institutionId = updateMatch[1];
                    const { name, email, password, institutionCode, institutionType, location, contactPerson, phone, website, isActive } = await parseBody(req);
                    
                    if (password && password.trim() !== '') {
                        const passwordHash = hashPassword(password);
                        await DB.run(`
                            UPDATE institutions 
                            SET name = ?, email = ?, password_hash = ?, institution_code = ?, institution_type = ?, 
                                location = ?, contact_person = ?, phone = ?, website = ?, is_active = ?,
                                updated_at = datetime('now')
                            WHERE id = ?
                        `, [name, email, passwordHash, institutionCode, institutionType, location, contactPerson, phone, website, isActive ? 1 : 0, institutionId]);
                    } else {
                        await DB.run(`
                            UPDATE institutions 
                            SET name = ?, email = ?, institution_code = ?, institution_type = ?, 
                                location = ?, contact_person = ?, phone = ?, website = ?, is_active = ?,
                                updated_at = datetime('now')
                            WHERE id = ?
                        `, [name, email, institutionCode, institutionType, location, contactPerson, phone, website, isActive ? 1 : 0, institutionId]);
                    }

                    sendJson(res, 200, { success: true, message: 'Institution updated' });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // Create New Institution (Admin Only)
            server.middlewares.use('/api/admin/institutions/create', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const session = getSession(req);
                    if (!session || !session.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

                    const { name, email, password, institutionCode, institutionType, location, contactPerson, phone, website } = await parseBody(req);
                    if (!name || !email || !password || !institutionCode) {
                        return sendJson(res, 400, { error: 'Name, email, password, and institution code are required' });
                    }

                    const existing = await DB.get('SELECT id FROM institutions WHERE email = ? OR institution_code = ?', [email, institutionCode]);
                    if (existing) return sendJson(res, 409, { error: 'Institution email or code already exists' });

                    const id = generateId();
                    const passwordHash = hashPassword(password);
                    await DB.run(`
                        INSERT INTO institutions (id, name, email, password_hash, institution_code, institution_type, location, contact_person, phone, website)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [id, name, email, passwordHash, institutionCode, institutionType || 'University', location, contactPerson, phone, website]);

                    sendJson(res, 201, { success: true, message: 'Institution created', institutionId: id });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== SUBSCRIPTION MANAGEMENT ====================
            registerSubscriptionRoutes(server, keys, getSession, sendJson, parseBody, getUrlPath);

            // ==================== PLATFORM PARTNERS (Admin Collab) ====================
            // Helper: auto-create platform_partners table if missing
            async function ensurePlatformPartnersTable() {
                try {
                    await DB.run(`CREATE TABLE IF NOT EXISTS platform_partners (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        base_url TEXT NOT NULL,
                        is_enabled INTEGER NOT NULL DEFAULT 1,
                        agreement_start TEXT,
                        agreement_end TEXT,
                        created_at TEXT DEFAULT (datetime('now')),
                        updated_at TEXT DEFAULT (datetime('now'))
                    )`, []);
                } catch { /* table already exists */ }
            }

            // Helper: get active platforms (not expired, enabled)
            async function getActivePlatforms(): Promise<any[]> {
                await ensurePlatformPartnersTable();
                try {
                    const platforms = await DB.all(`SELECT * FROM platform_partners WHERE is_enabled = 1`, []);
                    const now = new Date().toISOString().split('T')[0];
                    return platforms.filter((p: any) => {
                        if (p.agreement_end && p.agreement_end < now) return false;
                        if (p.agreement_start && p.agreement_start > now) return false;
                        return true;
                    });
                } catch { return []; }
            }

            // Helper: get course mode from app_settings
            async function getCourseMode(): Promise<string> {
                try {
                    const row = await DB.get(`SELECT value FROM app_settings WHERE id = ?`, ['course_mode']);
                    return (row as any)?.value || 'groq';
                } catch { return 'groq'; }
            }

            // Helper: save course mode
            async function saveCourseMode(mode: string): Promise<void> {
                try {
                    await DB.run(`INSERT OR REPLACE INTO app_settings (id, value, updated_at) VALUES (?, ?, datetime('now'))`, ['course_mode', mode]);
                } catch { /* non-critical */ }
            }

            // GET /api/platform-courses — public: return active platforms + current mode (used by user-facing pages)
            server.middlewares.use('/api/platform-courses', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                try {
                    const mode = await getCourseMode();
                    const platforms = await getActivePlatforms();
                    sendJson(res, 200, { mode, platforms });
                } catch (err: any) {
                    sendJson(res, 200, { mode: 'groq', platforms: [] });
                }
            });

            // GET /api/admin/platform-settings — get current mode
            server.middlewares.use('/api/admin/platform-settings', async (req: any, res: any, next: any) => {
                if (req.method === 'GET') {
                    const session = getSession(req);
                    if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });
                    const mode = await getCourseMode();
                    return sendJson(res, 200, { mode });
                }
                if (req.method === 'POST') {
                    const session = getSession(req);
                    if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });
                    try {
                        const { mode } = await parseBody(req);
                        if (!['groq', 'platform', 'combined'].includes(mode)) {
                            return sendJson(res, 400, { error: 'Invalid mode. Use groq, platform, or combined.' });
                        }
                        await saveCourseMode(mode);
                        return sendJson(res, 200, { success: true, mode });
                    } catch (err: any) {
                        return sendJson(res, 500, { error: err.message });
                    }
                }
                return next();
            });

            // GET/POST /api/admin/platforms
            server.middlewares.use('/api/admin/platforms', async (req: any, res: any, next: any) => {
                const path = getUrlPath(req);
                // Only handle /api/admin/platforms exactly (not /api/admin/platforms/:id)
                if (path !== '/api/admin/platforms') return next();

                const session = getSession(req);
                if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

                if (req.method === 'GET') {
                    await ensurePlatformPartnersTable();
                    try {
                        const platforms = await DB.all(`SELECT * FROM platform_partners ORDER BY created_at DESC`, []);
                        const now = new Date().toISOString().split('T')[0];
                        const enriched = platforms.map((p: any) => ({
                            ...p,
                            is_expired: p.agreement_end ? p.agreement_end < now : false,
                            is_active_now: p.is_enabled === 1 && (!p.agreement_end || p.agreement_end >= now) && (!p.agreement_start || p.agreement_start <= now),
                        }));
                        return sendJson(res, 200, { platforms: enriched });
                    } catch (err: any) {
                        return sendJson(res, 500, { error: err.message });
                    }
                }

                if (req.method === 'POST') {
                    await ensurePlatformPartnersTable();
                    try {
                        const { name, description, base_url, agreement_start, agreement_end, is_enabled } = await parseBody(req);
                        if (!name?.trim() || !base_url?.trim()) {
                            return sendJson(res, 400, { error: 'Platform name and URL are required' });
                        }
                        const id = generateId();
                        await DB.run(
                            `INSERT INTO platform_partners (id, name, description, base_url, is_enabled, agreement_start, agreement_end) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [id, name.trim(), description?.trim() || null, base_url.trim(), is_enabled !== false ? 1 : 0, agreement_start || null, agreement_end || null]
                        );
                        return sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        return sendJson(res, 500, { error: err.message });
                    }
                }
                return next();
            });

            // PUT/DELETE /api/admin/platforms/:id
            server.middlewares.use(async (req: any, res: any, next: any) => {
                const path = getUrlPath(req);
                const match = path.match(/^\/api\/admin\/platforms\/([^/]+)$/);
                if (!match) return next();

                const session = getSession(req);
                if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

                const platformId = match[1];

                if (req.method === 'PUT') {
                    await ensurePlatformPartnersTable();
                    try {
                        const { name, description, base_url, agreement_start, agreement_end, is_enabled } = await parseBody(req);
                        await DB.run(
                            `UPDATE platform_partners SET name = ?, description = ?, base_url = ?, is_enabled = ?, agreement_start = ?, agreement_end = ?, updated_at = datetime('now') WHERE id = ?`,
                            [name?.trim(), description?.trim() || null, base_url?.trim(), is_enabled !== false ? 1 : 0, agreement_start || null, agreement_end || null, platformId]
                        );
                        return sendJson(res, 200, { success: true });
                    } catch (err: any) {
                        return sendJson(res, 500, { error: err.message });
                    }
                }

                if (req.method === 'DELETE') {
                    await ensurePlatformPartnersTable();
                    try {
                        await DB.run(`DELETE FROM platform_partners WHERE id = ?`, [platformId]);
                        return sendJson(res, 200, { success: true });
                    } catch (err: any) {
                        return sendJson(res, 500, { error: err.message });
                    }
                }
                return next();
            });

            // GET/POST /api/settings/proctoring — admin proctoring settings (DB-persisted)
            server.middlewares.use('/api/settings/proctoring', async (req: any, res: any, next: any) => {
                if (req.method === 'GET') {
                    try {
                        await loadProctoringSettingsFromDB();
                        return sendJson(res, 200, { ...proctoringSettings });
                    } catch (err: any) {
                        console.warn('[Proctoring] Settings load failed (DB table may not exist yet), using defaults');
                        return sendJson(res, 200, { ...proctoringSettings });
                    }
                }
                if (req.method === 'POST') {
                    const session = await getSessionAsync(req);
                    if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });
                    try {
                        const body = await parseBody(req);
                        // Proctoring mode
                        if (body.proctoringMode && ['tensorflow', 'rekognition', 'both'].includes(body.proctoringMode)) {
                            proctoringSettings.proctoringMode = body.proctoringMode;
                            // Sync boolean flags with mode for backward compatibility
                            proctoringSettings.tensorflow = body.proctoringMode === 'tensorflow' || body.proctoringMode === 'both';
                            proctoringSettings.rekognition = body.proctoringMode === 'rekognition' || body.proctoringMode === 'both';
                        }
                        // TensorFlow settings
                        if (typeof body.tensorflow === 'boolean') proctoringSettings.tensorflow = body.tensorflow;
                        if (typeof body.objectDetection === 'boolean') proctoringSettings.objectDetection = body.objectDetection;
                        if (typeof body.tfIntervalMs === 'number') proctoringSettings.tfIntervalMs = Math.max(1000, Math.min(10000, body.tfIntervalMs));
                        if (typeof body.noFaceStrikeSec === 'number') proctoringSettings.noFaceStrikeSec = Math.max(3, Math.min(15, body.noFaceStrikeSec));
                        // Rekognition settings
                        if (typeof body.rekognition === 'boolean') proctoringSettings.rekognition = body.rekognition;
                        if (typeof body.rekognitionIntervalMs === 'number') proctoringSettings.rekognitionIntervalMs = Math.max(2000, Math.min(10000, body.rekognitionIntervalMs));
                        if (typeof body.rekognitionObjectDetection === 'boolean') proctoringSettings.rekognitionObjectDetection = body.rekognitionObjectDetection;
                        if (typeof body.rekognitionLookAwayDetection === 'boolean') proctoringSettings.rekognitionLookAwayDetection = body.rekognitionLookAwayDetection;
                        if (typeof body.rekognitionFaceCoverageDetection === 'boolean') proctoringSettings.rekognitionFaceCoverageDetection = body.rekognitionFaceCoverageDetection;
                        if (typeof body.maxYawAngle === 'number') proctoringSettings.maxYawAngle = Math.max(15, Math.min(60, body.maxYawAngle));
                        if (typeof body.maxPitchAngle === 'number') proctoringSettings.maxPitchAngle = Math.max(15, Math.min(45, body.maxPitchAngle));
                        await saveProctoringSettingsToDB();
                        return sendJson(res, 200, { success: true, settings: proctoringSettings });
                    } catch (err: any) {
                        return sendJson(res, 500, { error: err.message });
                    }
                }
                return next();
            });

            // POST /api/proctor/violation — log proctoring abort for admin review
            server.middlewares.use('/api/proctor/violation', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const session = await getSessionAsync(req);
                    if (!session) return sendJson(res, 200, {});
                    const { interviewId, reason, violationType } = await parseBody(req);
                    await DB.run(
                        'INSERT INTO proctoring_violations (id, user_id, interview_id, violation_type, reason, strike_count, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [
                            generateId(),
                            session.userId,
                            interviewId || null,
                            violationType || 'proctoring_abort',
                            reason || 'Proctoring violation',
                            2,
                            JSON.stringify({ abortedAt: new Date().toISOString(), interviewId }),
                        ]
                    );
                    sendJson(res, 200, { success: true });
                } catch {
                    sendJson(res, 200, {}); // Non-critical, silent
                }
            });

            // ==================== GEMINI PROXY ====================
            server.middlewares.use('/api/gemini/generate', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { prompt, temperature, maxTokens } = await parseBody(req);
                    if (!prompt) return sendJson(res, 400, { error: 'prompt is required' });
                    if (!keys.GEMINI_API_KEY) return sendJson(res, 503, { error: 'Gemini API key not configured' });

                    const result = await callGemini(keys.GEMINI_API_KEY, prompt, { temperature, maxTokens });
                    if (result.success) {
                        sendJson(res, 200, { success: true, text: result.text });
                    } else {
                        sendJson(res, 500, { success: false, error: result.error });
                    }
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== LEETCODE PROXY ====================
            server.middlewares.use('/api/leetcode/profile', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { username } = await parseBody(req);
                    if (!username) return sendJson(res, 400, { error: 'username is required' });

                    // LeetCode public GraphQL API (no auth required for public profiles)
                    const query = `query getUserProfile($username: String!) {
                        matchedUser(username: $username) {
                            username
                            profile { realName ranking reputation solutionCount }
                            submitStats: submitStatsGlobal {
                                acSubmissionNum { difficulty count submissions }
                            }
                            badges { id displayName }
                        }
                    }`;

                    const lcResponse = await fetch('https://leetcode.com/graphql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Referer': 'https://leetcode.com',
                            'User-Agent': 'Mozilla/5.0 (compatible; VidyaMitra/1.0)',
                        },
                        body: JSON.stringify({ query, variables: { username } }),
                    });

                    if (!lcResponse.ok) {
                        return sendJson(res, 404, { error: 'LeetCode profile not found' });
                    }

                    const lcData = await lcResponse.json();
                    const user = lcData?.data?.matchedUser;
                    if (!user) return sendJson(res, 404, { error: 'LeetCode user not found' });

                    const stats = user.submitStats?.acSubmissionNum || [];
                    sendJson(res, 200, {
                        username: user.username,
                        realName: user.profile?.realName || '',
                        ranking: user.profile?.ranking || 0,
                        totalSolved: stats.find((s: any) => s.difficulty === 'All')?.count || 0,
                        easySolved: stats.find((s: any) => s.difficulty === 'Easy')?.count || 0,
                        mediumSolved: stats.find((s: any) => s.difficulty === 'Medium')?.count || 0,
                        hardSolved: stats.find((s: any) => s.difficulty === 'Hard')?.count || 0,
                        reputation: user.profile?.reputation || 0,
                        solutionCount: user.profile?.solutionCount || 0,
                        badges: (user.badges || []).map((b: any) => b.displayName),
                    });
                } catch (err: any) {
                    console.error('LeetCode proxy error:', err.message);
                    sendJson(res, 500, { error: 'Failed to fetch LeetCode profile' });
                }
            });

            // ==================== YOUTUBE PROXY ====================
            server.middlewares.use('/api/youtube/search', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const params = getQueryParams(req);
                const query = params.get('q') || '';
                const maxResults = parseInt(params.get('maxResults') || '3');
                if (!query) return sendJson(res, 400, { error: 'q parameter required' });
                const videos = await fetchYouTubeVideos(keys.YOUTUBE_API_KEY, query, maxResults);
                sendJson(res, 200, { videos });
            });

            // ==================== YOUTUBE COURSES (Profile Analyzer) ====================
            server.middlewares.use('/api/youtube/courses', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { gaps, careerGoal } = await parseBody(req);
                    const query = `${careerGoal} ${gaps?.[0] || ''} tutorial course`;
                    const videos = await fetchYouTubeVideos(keys.YOUTUBE_API_KEY, query, 6);
                    sendJson(res, 200, videos);
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== GROQ JOB BOARD ANALYSIS (Server-side, uses all 3 keys) ====================
            server.middlewares.use('/api/groq/job-analysis', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { systemPrompt, userPrompt } = await parseBody(req);
                    if (!systemPrompt || !userPrompt) return sendJson(res, 400, { error: 'systemPrompt and userPrompt required' });

                    // Use ALL available keys including the 3rd server-only key
                    const allKeys = [
                        resolvedEnv.GROQ_API_KEY,
                        resolvedEnv.GROQ_API_KEY_2,
                        resolvedEnv.GROQ_GAP_ANALYSIS_KEY,
                    ].filter(Boolean);

                    if (allKeys.length === 0) return sendJson(res, 503, { error: 'No Groq API keys configured' });

                    let lastStatus = 500;
                    const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'];

                    for (const key of allKeys) {
                        for (const model of models) {
                            try {
                                const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                                    body: JSON.stringify({
                                        model,
                                        messages: [
                                            { role: 'system', content: systemPrompt },
                                            { role: 'user', content: userPrompt },
                                        ],
                                        temperature: 0.1,
                                        max_tokens: 1500,
                                    }),
                                });

                                if (!r.ok) {
                                    lastStatus = r.status;
                                    console.warn(`⚠️ Job analysis: Groq model ${model} failed (${r.status}), trying next...`);
                                    continue;
                                }

                                const data = await r.json() as any;
                                return sendJson(res, 200, { content: data.choices?.[0]?.message?.content || '' });
                            } catch (err: any) {
                                console.warn('⚠️ Job analysis Groq key error:', err.message);
                                continue;
                            }
                        }
                    }

                    // All keys exhausted
                    return sendJson(res, lastStatus || 429, { error: 'All Groq API keys rate-limited or failed. Try again in a minute.' });
                } catch (err: any) {
                    console.error('Job analysis error:', err.message);
                    sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== GROQ AI ROADMAP (Profile Analyzer) ====================
            server.middlewares.use('/api/groq/roadmap', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { skills, careerGoal } = await parseBody(req);
                    if (!careerGoal) return sendJson(res, 400, { error: 'careerGoal required' });
                    if (!keys.GROQ_API_KEY) return sendJson(res, 503, { error: 'Groq API key not configured' });

                    const prompt = `You are an expert technical recruiter assessing a candidate's profile for the "${careerGoal}" role based on 2026 industry standards.
Here are the candidate's extracted technical skills and their normalized proficiency scores (0-100):
${JSON.stringify(skills)}

Calculate a realistic overall readiness score out of 100.
Identify top 2 missing critical skills/gaps based on 2026 standards for ${careerGoal}.
Generate a multi-phase learning roadmap containing general improvements, job-based improvements, and specific actionable phases to close those gaps.

Return ONLY valid JSON format:
{
  "score": number,
  "gaps": ["skill1", "skill2"],
  "improvements": {
    "general": ["string", "string"],
    "job_based": ["string", "string"]
  },
  "phases": [
    { "phase": "1", "title": "Foundation", "focus": "string", "duration": "string", "details": "string" },
    { "phase": "2", "title": "Advanced", "focus": "string", "duration": "string", "details": "string" }
  ]
}`;

                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${keys.GROQ_API_KEY}`,
                        },
                        body: JSON.stringify({
                            model: 'openai/gpt-oss-120b',
                            messages: [
                                { role: 'system', content: 'You output only structured JSON containing score, gaps array, improvements, and phases.' },
                                { role: 'user', content: prompt },
                            ],
                            temperature: 0.2,
                            response_format: { type: 'json_object' }
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Groq API error: ${response.status}`);
                    }

                    const data = await response.json();
                    const aiResponse = JSON.parse(data.choices[0].message.content);
                    sendJson(res, 200, aiResponse);
                } catch (err: any) {
                    console.error('Groq roadmap error:', err);
                    // Fallback response
                    sendJson(res, 200, {
                        score: 75,
                        gaps: ["Advanced System Design", "Production Deployments"],
                        improvements: {
                            general: ["Increase contribution frequency", "Improve code documentation"],
                            job_based: ["Build production-scale projects", "Learn industry best practices"]
                        },
                        phases: [
                            { phase: "1", title: "Foundation", focus: "Core Skills", duration: "2-3 weeks", details: "Master fundamental concepts" },
                            { phase: "2", title: "Application", focus: "Projects", duration: "4 weeks", details: "Build real-world applications" }
                        ]
                    });
                }
            });

            // ==================== TEXTRACT RESUME PARSER (via AWS Lambda) ====================
            // POST /api/resume/extract  { bucket, key }  → { text }
            // Calls the deployed Lambda + Textract function.  Falls back gracefully if
            // LAMBDA_TEXTRACT_URL is not configured (returns 503 so client can use PDF.js).
            server.middlewares.use('/api/resume/extract', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const lambdaUrl = process.env.AWS_LAMBDA_RESUME_API;
                    if (!lambdaUrl) {
                        return sendJson(res, 503, { error: 'Textract Lambda not configured' });
                    }

                    const { bucket, key } = await parseBody(req);
                    if (!bucket || !key) {
                        return sendJson(res, 400, { error: 'bucket and key are required' });
                    }

                    const lambdaRes = await fetch(lambdaUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bucket, key }),
                    });

                    const raw = await lambdaRes.json() as any;

                    // API Gateway may wrap Lambda output — body can be a JSON string
                    const data = (typeof raw.body === 'string')
                        ? JSON.parse(raw.body)
                        : raw;

                    if (!lambdaRes.ok || data.error) {
                        console.error('Textract Lambda error:', data.error);
                        return sendJson(res, 502, { error: data.error ?? 'Lambda returned an error' });
                    }

                    if (!data.text || data.text.trim().length === 0) {
                        console.error('Textract returned empty text');
                        return sendJson(res, 502, { error: 'Textract returned empty text' });
                    }

                    console.log(`✅ Textract extracted ${data.text.length} chars from ${key}`);
                    sendJson(res, 200, { text: data.text });
                } catch (err: any) {
                    console.error('POST /api/resume/extract error:', err);
                    sendJson(res, 500, { error: 'Resume text extraction failed' });
                }
            });

            // ==================== TEXTRACT HEALTH CHECK ====================
            // GET /api/textract/health  — verifies Lambda is reachable. No auth required.
            server.middlewares.use('/api/textract/health', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const lambdaUrl = process.env.AWS_LAMBDA_RESUME_API;
                if (!lambdaUrl) return sendJson(res, 503, { ok: false, reason: 'AWS_LAMBDA_RESUME_API not set in .env' });
                try {
                    const r = await fetch(lambdaUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bucket: 'ping', key: 'ping' }),
                    });
                    const raw = await r.json() as any;
                    const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
                    // Any response (even "key not found") means Lambda is reachable
                    sendJson(res, 200, { ok: true, lambdaStatus: r.status, lambdaResponse: data });
                } catch (err: any) {
                    sendJson(res, 502, { ok: false, reason: err.message });
                }
            });

            // ==================== LEETCODE PROXY (Profile Analyzer) ====================
            server.middlewares.use('/api/leetcode/profile', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const { username } = await parseBody(req);
                    if (!username) return sendJson(res, 400, { error: 'username required' });

                    const query = `
                        query getUserProfile($username: String!) {
                            matchedUser(username: $username) {
                                profile {
                                    ranking
                                    reputation
                                }
                                submitStats {
                                    acSubmissionNum {
                                        difficulty
                                        count
                                    }
                                }
                                badges {
                                    name
                                    icon
                                }
                            }
                            userContestRanking(username: $username) {
                                rating
                                globalRanking
                                attendedContestsCount
                            }
                        }
                    `;

                    const response = await fetch('https://leetcode.com/graphql', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://leetcode.com'
                        },
                        body: JSON.stringify({
                            query,
                            variables: { username }
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`LeetCode API error: ${response.status}`);
                    }

                    const data = await response.json();
                    const user = data.data?.matchedUser;
                    const contest = data.data?.userContestRanking;

                    if (!user) {
                        return sendJson(res, 404, { error: 'LeetCode profile not found' });
                    }

                    const problems = {
                        easy: user.submitStats?.acSubmissionNum?.find((s: any) => s.difficulty === 'Easy')?.count || 0,
                        medium: user.submitStats?.acSubmissionNum?.find((s: any) => s.difficulty === 'Medium')?.count || 0,
                        hard: user.submitStats?.acSubmissionNum?.find((s: any) => s.difficulty === 'Hard')?.count || 0
                    };

                    const totalSolved = problems.easy + problems.medium + problems.hard;
                    const skillScore = Math.min(100, Math.round(
                        (problems.easy * 1) + 
                        (problems.medium * 3) + 
                        (problems.hard * 5)
                    ) / 10);

                    sendJson(res, 200, {
                        username,
                        totalSolved,
                        problems,
                        ranking: user.profile?.ranking || null,
                        contestRating: contest?.rating ? Math.round(contest.rating) : null,
                        contestRank: contest?.globalRanking || null,
                        contestsAttended: contest?.attendedContestsCount || 0,
                        badges: user.badges?.map((b: any) => b.name) || [],
                        skillScore,
                        level: skillScore >= 80 ? 'Expert' : skillScore >= 60 ? 'Advanced' : skillScore >= 40 ? 'Intermediate' : 'Beginner'
                    });
                } catch (err: any) {
                    console.error('LeetCode proxy error:', err);
                    sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== PEXELS PROXY ====================
            server.middlewares.use('/api/pexels/search', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const params = getQueryParams(req);
                const query = params.get('q') || '';
                if (!query) return sendJson(res, 400, { error: 'q parameter required' });
                const images = await fetchPexelsImages(keys.PEXELS_API_KEY, query);
                sendJson(res, 200, { images });
            });

            // ==================== NEWS PROXY ====================
            server.middlewares.use('/api/news/search', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const params = getQueryParams(req);
                const query = params.get('q') || 'technology jobs';
                const articles = await fetchNews(keys.NEWS_API_KEY, query);
                sendJson(res, 200, { articles });
            });

            // ==================== EXCHANGE RATE PROXY ====================
            server.middlewares.use('/api/exchange-rates', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const rates = await fetchExchangeRate(keys.EXCHANGE_RATE_API_KEY);
                sendJson(res, 200, rates);
            });

            // ==================== DB CRUD: INTERVIEWS ====================
            server.middlewares.use('/api/interviews', async (req: any, res: any, next: any) => {
                const session = await getSessionAsync(req);
                const path = getUrlPath(req);

                if (req.method === 'GET' && (path === '/' || path === '')) {
                    if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                    const params = getQueryParams(req);
                    const allParam = params.get('all');

                    if (allParam === 'true' && session.isAdmin) {
                        const interviews = await DB.all('SELECT * FROM interviews ORDER BY created_at DESC', []);
                        return sendJson(res, 200, { interviews });
                    }
                    const interviews = await DB.all('SELECT * FROM interviews WHERE user_id = ? ORDER BY created_at DESC', [session.userId]);
                    return sendJson(res, 200, { interviews });
                }

                if (req.method === 'POST' && (path === '/' || path === '')) {
                    if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                    try {
                        const body = await parseBody(req);
                        const id = body.id || generateId();
                        await DB.run(`INSERT OR REPLACE INTO interviews (id, user_id, role_id, role_name, questions, answers, completed, score, feedback, outcome, is_practice, aborted, abort_reason, ai_detection_count, start_time, end_time)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, session.userId, body.roleId || '', body.roleName || '', JSON.stringify(body.questions || []), JSON.stringify(body.answers || []),
                                body.completed ? 1 : 0, body.score || null, body.feedback || '', body.outcome || '',
                                body.isPracticeMode ? 1 : 0, body.aborted ? 1 : 0, body.abortReason || '', body.aiDetectionCount || 0,
                                body.startTime || new Date().toISOString(), body.endTime || null]);
                        sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                if (req.method === 'DELETE') {
                    if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                    const idMatch = path.match(/^\/(.+)/);
                    if (idMatch) {
                        await DB.run('DELETE FROM interviews WHERE id = ?', [idMatch[1]]);
                        return sendJson(res, 200, { success: true });
                    }
                }

                next();
            });

            // ==================== DB CRUD: PRACTICE APTITUDE ====================
            server.middlewares.use('/api/practice-aptitude', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method === 'GET') {
                    const results = await DB.all('SELECT * FROM practice_aptitude WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [session.userId]);
                    return sendJson(res, 200, { results });
                }

                if (req.method === 'POST') {
                    try {
                        const body = await parseBody(req);
                        const id = generateId();
                        await DB.run(`INSERT INTO practice_aptitude (id, user_id, score, total_questions, correct_answers, category_performance, weak_topics, recommendations, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, session.userId, body.score, body.totalQuestions, body.correctAnswers,
                                JSON.stringify(body.categoryPerformance || {}), JSON.stringify(body.weakTopics || []),
                                JSON.stringify(body.recommendations || []), body.completedAt || new Date().toISOString()]);
                        sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }
                next();
            });

            // ==================== DB CRUD: PRACTICE INTERVIEWS ====================
            server.middlewares.use('/api/practice-interviews', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method === 'GET') {
                    const results = await DB.all('SELECT * FROM practice_interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [session.userId]);
                    return sendJson(res, 200, { results });
                }

                if (req.method === 'POST') {
                    try {
                        const body = await parseBody(req);
                        const id = generateId();
                        await DB.run(`INSERT INTO practice_interviews (id, user_id, role_id, role_name, questions, overall_score, average_question_score, strengths, improvements, recommendations, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, session.userId, body.roleId || '', body.roleName || '', JSON.stringify(body.questions || []),
                                body.overallScore || 0, body.averageQuestionScore || 0, JSON.stringify(body.strengths || []),
                                JSON.stringify(body.improvements || []), JSON.stringify(body.recommendations || []),
                                body.completedAt || new Date().toISOString()]);
                        sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }
                next();
            });

            // ==================== DB CRUD: BOT INTERVIEWS ====================
            server.middlewares.use('/api/bot-interviews', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method === 'GET') {
                    const results = await DB.all('SELECT * FROM bot_interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [session.userId]);
                    return sendJson(res, 200, { results });
                }

                if (req.method === 'POST') {
                    try {
                        const body = await parseBody(req);
                        const id = generateId();
                        await DB.run(`INSERT INTO bot_interviews (id, user_id, candidate_name, role, conversation_log, feedback, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, session.userId, body.candidateName || '', body.role || '',
                                JSON.stringify(body.conversationLog || []), JSON.stringify(body.feedback || {}),
                                body.completedAt || new Date().toISOString()]);
                        sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }
                next();
            });

            // ==================== DB CRUD: PRACTICE CODING ====================
            server.middlewares.use('/api/practice-coding', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method === 'GET') {
                    const results = await DB.all('SELECT * FROM practice_coding WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [session.userId]);
                    return sendJson(res, 200, { results });
                }

                if (req.method === 'POST') {
                    try {
                        const body = await parseBody(req);
                        const id = body.id || generateId();
                        await DB.run(`INSERT OR REPLACE INTO practice_coding (id, user_id, session_data, date, start_time, end_time)
              VALUES (?, ?, ?, ?, ?, ?)`, [id, session.userId, JSON.stringify(body), body.date || new Date().toISOString(),
                                body.startTime || new Date().toISOString(), body.endTime || null]);
                        sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }
                next();
            });

            // ==================== DB CRUD: RESUMES ====================
            server.middlewares.use('/api/resumes', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method === 'GET') {
                    const results = await DB.all('SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC', [session.userId]);
                    return sendJson(res, 200, { resumes: results });
                }

                if (req.method === 'POST') {
                    try {
                        let body: any;
                        try {
                            // Use a larger body reader to handle resume text
                            body = await new Promise((resolve, reject) => {
                                let raw = '';
                                req.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
                                req.on('end', () => {
                                    try { resolve(raw ? JSON.parse(raw) : {}); }
                                    catch { reject(new Error('Invalid JSON in resume body')); }
                                });
                                req.on('error', reject);
                            });
                        } catch (parseErr: any) {
                            return sendJson(res, 400, { error: parseErr.message || 'Failed to parse resume body' });
                        }

                        const id = generateId();
                        // Sanitize rawText — replace problematic Unicode chars with safe ASCII equivalents
                        let rawText: string = (typeof body.rawText === 'string') ? body.rawText : '';
                        rawText = rawText
                            .replace(/[\u2010-\u2015\u2212]/g, '-')   // en/em dashes, minus
                            .replace(/[\u2018\u2019]/g, "'")           // curly single quotes
                            .replace(/[\u201C\u201D]/g, '"')           // curly double quotes
                            .replace(/\u2022/g, '*')                    // bullet •
                            .replace(/\u2026/g, '...')                  // ellipsis …
                            .replace(/[\u00A0]/g, ' ')                  // non-breaking space
                            .replace(/[^\x00-\x7F]/g, (c) => {         // any remaining non-ASCII
                                try { return c; } catch { return ''; }
                            });
                        if (rawText.length > 200000) rawText = rawText.substring(0, 200000);

                        await DB.run(`INSERT INTO resumes (id, user_id, file_name, raw_text, parsed_data, ats_score, ats_analysis, target_role)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, session.userId, body.fileName || '', rawText,
                                JSON.stringify(body.parsedData || {}), body.atsScore || 0,
                                JSON.stringify(body.atsAnalysis || {}), body.targetRole || '']);
                        sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }
                next();
            });

            // ==================== DB CRUD: ROUND 1 APTITUDE ====================
            server.middlewares.use('/api/round1-aptitude', async (req: any, res: any, next: any) => {
                const session = await getSessionAsync(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method === 'GET') {
                    const params = getQueryParams(req);
                    if (params.get('all') === 'true' && session.isAdmin) {
                        const results = await DB.all('SELECT * FROM round1_aptitude ORDER BY created_at DESC', []);
                        return sendJson(res, 200, { results });
                    }
                    const results = await DB.all('SELECT * FROM round1_aptitude WHERE user_id = ? ORDER BY created_at DESC', [session.userId]);
                    return sendJson(res, 200, { results });
                }

                if (req.method === 'POST') {
                    try {
                        const body = await parseBody(req);
                        const id = generateId();
                        await DB.run(`INSERT INTO round1_aptitude (id, user_id, user_email, user_name, role_id, role_name, score, total_questions, correct_answers, category_performance, completed_at, aborted, abort_reason)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, session.userId, session.email, session.name, body.roleId || '', body.roleName || '',
                                body.score || 0, body.totalQuestions || 0, body.correctAnswers || 0,
                                JSON.stringify(body.categoryPerformance || {}), body.completedAt || new Date().toISOString(),
                                body.aborted ? 1 : 0, body.abortReason || '']);
                        sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                if (req.method === 'PUT') {
                    try {
                        const body = await parseBody(req);
                        const path = getUrlPath(req);
                        const idMatch = path.match(/^\/(.+)/);
                        if (idMatch && session.isAdmin) {
                            const updates: string[] = [];
                            const values: any[] = [];
                            if (body.selectedForRound2 !== undefined) { updates.push('selected_for_round2 = ?'); values.push(body.selectedForRound2 ? 1 : 0); }
                            if (body.round2EmailSent !== undefined) { updates.push('round2_email_sent = ?'); values.push(body.round2EmailSent ? 1 : 0); }
                            if (updates.length > 0) {
                                values.push(idMatch[1]);
                                await DB.run(`UPDATE round1_aptitude SET ${updates.join(', ')} WHERE id = ?`, [...values]);
                            }
                            return sendJson(res, 200, { success: true });
                        }
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }
                next();
            });

            // ==================== DB CRUD: ROUND 2 CODING ====================
            server.middlewares.use(async (req: any, res: any, next: any) => {
                const path = getUrlPath(req);
                if (!path.startsWith('/api/round2-coding')) return next();

                const session = await getSessionAsync(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                // GET /api/round2-coding/mine
                if (req.method === 'GET' && path === '/api/round2-coding/mine') {
                    try {
                        const row = await DB.get(
                            'SELECT * FROM round2_coding WHERE user_id = ? AND rescheduled = 0 ORDER BY completed_at DESC LIMIT 1',
                            [session.userId]
                        );
                        return sendJson(res, 200, { result: row || null });
                    } catch { return sendJson(res, 200, { result: null }); }
                }

                // GET /api/round2-coding  (admin: ?all=true)
                if (req.method === 'GET' && path === '/api/round2-coding') {
                    const params = getQueryParams(req);
                    if (params.get('all') === 'true' && session.isAdmin) {
                        try {
                            const results = await DB.all('SELECT * FROM round2_coding ORDER BY completed_at DESC', []);
                            return sendJson(res, 200, { results });
                        } catch (err: any) { return sendJson(res, 500, { error: err.message }); }
                    }
                    try {
                        const results = await DB.all(
                            'SELECT * FROM round2_coding WHERE user_id = ? ORDER BY completed_at DESC',
                            [session.userId]
                        );
                        return sendJson(res, 200, { results });
                    } catch (err: any) { return sendJson(res, 500, { error: err.message }); }
                }

                // POST /api/round2-coding  → save completed session
                if (req.method === 'POST' && path === '/api/round2-coding') {
                    try {
                        const body = await parseBody(req);
                        // Prevent duplicate — one attempt per user unless rescheduled
                        const existing = await DB.get(
                            'SELECT id FROM round2_coding WHERE user_id = ? AND rescheduled = 0',
                            [session.userId]
                        ).catch(() => null);
                        if (existing) {
                            return sendJson(res, 409, { error: 'Round 2 already completed. Contact admin to reschedule.' });
                        }
                        const id = generateId();
                        await DB.run(
                            `INSERT INTO round2_coding
                                (id, user_id, user_email, user_name, role_name, score, problems_solved,
                                 total_problems, time_spent, submissions_json, completed_at,
                                 selected_for_round3, round3_email_sent, rescheduled)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
                            [
                                id, session.userId, session.email, session.name,
                                body.roleName || '', body.score || 0,
                                body.problemsSolved || 0, body.totalProblems || 2,
                                body.timeSpent || 0,
                                JSON.stringify(body.submissions || []),
                                body.completedAt || new Date().toISOString(),
                            ]
                        );
                        return sendJson(res, 201, { success: true, id });
                    } catch (err: any) { return sendJson(res, 500, { error: err.message }); }
                }

                // POST /api/round2-coding/:userId/reschedule  (admin only)
                const reschedMatch = path.match(/^\/api\/round2-coding\/([^\/]+)\/reschedule$/);
                if (req.method === 'POST' && reschedMatch) {
                    if (!session.isAdmin) return sendJson(res, 403, { error: 'Admin only' });
                    try {
                        const targetUserId = reschedMatch[1];
                        await DB.run(
                            'UPDATE round2_coding SET rescheduled = 1 WHERE user_id = ?',
                            [targetUserId]
                        );
                        return sendJson(res, 200, { success: true, message: 'Round 2 rescheduled — user can attempt again.' });
                    } catch (err: any) { return sendJson(res, 500, { error: err.message }); }
                }

                // POST /api/round2-coding/:id/select-round3  (admin only)
                const r3Match = path.match(/^\/api\/round2-coding\/([^\/]+)\/select-round3$/);
                if (req.method === 'POST' && r3Match) {
                    if (!session.isAdmin) return sendJson(res, 403, { error: 'Admin only' });
                    try {
                        const resultId = r3Match[1];
                        await DB.run('UPDATE round2_coding SET selected_for_round3 = 1 WHERE id = ?', [resultId]);
                        return sendJson(res, 200, { success: true });
                    } catch (err: any) { return sendJson(res, 500, { error: err.message }); }
                }

                next();
            });

            // ==================== AWS SES EMAIL ====================
            server.middlewares.use('/api/send-round2-email', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                const session = await getSessionAsync(req);
                if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

                try {
                    const body = await parseBody(req);
                    const { to_email, to_name, role_name, round1_score } = body;

                    if (!to_email || !to_name || !role_name) {
                        return sendJson(res, 400, { error: 'to_email, to_name, and role_name are required' });
                    }

                    // Validate email format
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(to_email)) {
                        return sendJson(res, 400, { error: 'Invalid email address format' });
                    }

                    const fromEmail = resolvedEnv.SES_FROM_EMAIL;
                    if (!fromEmail) {
                        return sendJson(res, 503, { error: 'SES_FROM_EMAIL environment variable not set. Please add your verified SES sender email.' });
                    }

                    const awsRegion = resolvedEnv.AWS_REGION || 'us-east-1';
                    const sesClient = new SESClient({
                        region: awsRegion,
                        credentials: resolvedEnv.AWS_ACCESS_KEY_ID ? {
                            accessKeyId: resolvedEnv.AWS_ACCESS_KEY_ID,
                            secretAccessKey: resolvedEnv.AWS_SECRET_ACCESS_KEY,
                            ...(resolvedEnv.AWS_SESSION_TOKEN ? { sessionToken: resolvedEnv.AWS_SESSION_TOKEN } : {}),
                        } : undefined,
                    });

                    const scoreText = round1_score !== undefined ? `\nYour Round 1 Score: ${round1_score}%\n` : '';
                    const appUrl = `http://localhost:8080`;

                    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #2563eb; margin: 0;">VidyaMitra</h1>
      <p style="color: #6b7280; margin: 4px 0 0 0;">AI-Powered Career Platform</p>
    </div>
    <h2 style="color: #1f2937;">🎉 Congratulations, ${to_name}!</h2>
    <p style="color: #374151; line-height: 1.6;">
      You have successfully cleared <strong>Round 1 (Aptitude Test)</strong> for the 
      <strong>${role_name}</strong> position.
    </p>
    ${round1_score !== undefined ? `<div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; color: #1d4ed8; font-weight: bold;">Round 1 Score: ${round1_score}%</p>
    </div>` : ''}
    <p style="color: #374151; line-height: 1.6;">
      You have been selected to proceed to <strong>Round 2 — Mock Interview</strong>.
    </p>
    <p style="color: #374151; line-height: 1.6;">
      Please log in to your VidyaMitra account and navigate to the <strong>Interview</strong> section 
      to begin your Round 2 mock interview at your convenience.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${appUrl}/login" 
         style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
        Start Round 2 →
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 13px; text-align: center;">
      Best of luck!<br>
      <strong>Team VidyaMitra</strong><br>
      <a href="${appUrl}" style="color: #2563eb;">${appUrl}</a>
    </p>
  </div>
</body>
</html>`;

                    const textBody = `Congratulations ${to_name}!\n\nYou have successfully cleared Round 1 (Aptitude Test) for the ${role_name} position.${scoreText}\nYou have been selected to proceed to Round 2 — Mock Interview.\n\nPlease log in to your VidyaMitra account and navigate to the Interview section to begin your Round 2 mock interview.\n\n${appUrl}/login\n\nBest of luck!\nTeam VidyaMitra`;

                    const command = new SendEmailCommand({
                        Destination: { ToAddresses: [to_email.trim()] },
                        Message: {
                            Body: {
                                Html: { Charset: 'UTF-8', Data: emailHtml },
                                Text: { Charset: 'UTF-8', Data: textBody },
                            },
                            Subject: { Charset: 'UTF-8', Data: `🎉 Congratulations! Selected for Round 2 — ${role_name} | VidyaMitra` },
                        },
                        Source: fromEmail,
                    });

                    await sesClient.send(command);
                    trackSESEmail(); // Track SES email send
                    console.log(`✅ SES email sent to ${to_email} for ${role_name}`);
                    return sendJson(res, 200, { success: true, message: `Email sent to ${to_email}` });

                } catch (err: any) {
                    console.error('❌ SES email error:', err.message, err.code);
                    let errorMsg = err.message || 'Failed to send email';
                    if (err.name === 'MessageRejected') errorMsg = 'Email rejected by SES. Check that both sender and recipient emails are verified in SES sandbox mode.';
                    if (err.name === 'MailFromDomainNotVerifiedException' || err.name === 'EmailAddressNotVerifiedException') errorMsg = 'Sender email is not verified in AWS SES. Please verify SES_FROM_EMAIL in AWS console.';
                    if (err.name === 'AccessDenied' || err.code === 'AccessDenied') errorMsg = 'AWS credentials do not have SES:SendEmail permission.';
                    return sendJson(res, 500, { error: errorMsg });
                }
            });

            // ==================== ADMIN: SEED MOCK ROUND1 CANDIDATES ====================
            server.middlewares.use('/api/admin/seed-test-candidates', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                const session = await getSessionAsync(req);
                if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

                const mockCandidates = [
                    { email: 'kganeshram15@gmail.com',     name: 'Ganesh Ram K',       roleId: 'swe',      roleName: 'Software Engineer',     score: 88, correct: 22, total: 25 },
                    { email: 's.yuvashakthiraj@gmail.com', name: 'Yuva Shakthi Raj S', roleId: 'ds',       roleName: 'Data Scientist',        score: 76, correct: 19, total: 25 },
                    { email: 'girikdharan2006@gmail.com',  name: 'Girik Dharan',       roleId: 'fe',       roleName: 'Frontend Developer',    score: 72, correct: 18, total: 25 },
                    { email: 'kganeshram05@gmail.com',     name: 'Ganesh Ram (2)',      roleId: 'be',       roleName: 'Backend Developer',     score: 84, correct: 21, total: 25 },
                    { email: 'thericksmart@gmail.com',     name: 'Rick Smart',         roleId: 'fs',       roleName: 'Full Stack Developer',  score: 92, correct: 23, total: 25 },
                    { email: 'sidarthdhoni@gmail.com',     name: 'Sidarth Dhoni',      roleId: 'devops',   roleName: 'DevOps Engineer',       score: 68, correct: 17, total: 25 },
                ];

                try {
                    let inserted = 0;
                    let skipped = 0;
                    for (const c of mockCandidates) {
                        // Skip if this mock email already has a round1 record
                        const existing: any = await DB.get('SELECT id FROM round1_aptitude WHERE user_email = ? AND user_name = ?', [c.email, c.name]);
                        if (existing) { skipped++; continue; }

                        const id = generateId();
                        const completedAt = new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)).toISOString();
                        await DB.run(
                            `INSERT INTO round1_aptitude (id, user_id, user_email, user_name, role_id, role_name, score, total_questions, correct_answers, category_performance, completed_at, aborted, abort_reason)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            ['mock-' + id, 'mock-user-' + id, c.email, c.name, c.roleId, c.roleName, c.score, c.total, c.correct,
                             JSON.stringify({ 'Logical Reasoning': { correct: Math.floor(c.correct * 0.4), total: 10, percentage: Math.round(c.score * 0.9) }, 'Quantitative': { correct: Math.floor(c.correct * 0.36), total: 9, percentage: Math.round(c.score * 1.0) }, 'Verbal': { correct: Math.floor(c.correct * 0.24), total: 6, percentage: Math.round(c.score * 1.1) } }),
                             completedAt, 0, null]
                        );
                        inserted++;
                    }
                    return sendJson(res, 200, { success: true, inserted, skipped, message: `${inserted} mock candidates seeded, ${skipped} already existed.` });
                } catch (err: any) {
                    console.error('Seed error:', err.message);
                    return sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== CAREER PLAN ====================
            server.middlewares.use('/api/career-plan', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method === 'POST') {
                    try {
                        const { targetRole, skillGaps } = await parseBody(req);
                        if (!targetRole) return sendJson(res, 400, { error: 'targetRole required' });

                        // Fetch platform course settings
                        const courseMode = await getCourseMode();
                        const activePlatforms = (courseMode === 'platform' || courseMode === 'combined') ? await getActivePlatforms() : [];
                        const platformInstruction = activePlatforms.length > 0
                            ? `\n\nPARTNER PLATFORMS: For course recommendations in "resources", you MUST prioritize courses from these partner platforms${courseMode === 'platform' ? ' ONLY' : ' first'}:\n${activePlatforms.map((p: any) => `- ${p.name} (${p.base_url})`).join('\n')}\n${courseMode === 'combined' ? 'After listing partner platform courses, you may also include other free resources.' : 'Only suggest courses from the above partner platforms.'}`
                            : '';

                        let trainingPlan: any = null;

                        // Try Groq for training plan generation
                        const groqKeys = [
                            keys.GROQ_API_KEY,
                            process.env.GROQ_API_KEY,
                            process.env.GROQ_API_KEY_2,
                            process.env.GROQ_GAP_ANALYSIS_KEY,
                        ].filter(Boolean) as string[];

                        const uniqueGroqKeys = Array.from(new Set(groqKeys));

                        if (uniqueGroqKeys.length > 0) {
                            const planPrompt = `You are a career counselor and technical mentor. Create a detailed 8-week training plan for someone aiming to become a "${targetRole}".
Their skill gaps are: ${JSON.stringify(skillGaps || [])}.${platformInstruction}

Return valid JSON with this structure:
{
  "weeklyPlan": [
    { "week": 1, "title": "Week 1: ...", "topics": ["topic1", "topic2"], "goals": ["goal1"], "resources": ["resource1"] },
    ...8 total weeks
  ],
  "milestones": ["milestone1", "milestone2", "milestone3", "milestone4"],
  "estimatedCompletion": "8 weeks",
  "dailyHours": 2
}

Return ONLY valid JSON.`;

                            const planModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'];
                            planLoop:
                            for (const key of uniqueGroqKeys) {
                                for (const model of planModels) {
                                    try {
                                        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                                            body: JSON.stringify({
                                                model,
                                                messages: [
                                                    { role: 'system', content: 'You are an expert technical career mentor. Output ONLY clean, valid JSON.' },
                                                    { role: 'user', content: planPrompt }
                                                ],
                                                temperature: 0.2,
                                                max_tokens: 1500,
                                            }),
                                        });

                                        if (groqRes.ok) {
                                            const groqData = await groqRes.json() as any;
                                            const content = groqData.choices?.[0]?.message?.content || '';
                                            const clean = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                                            const match = clean.match(/\{[\s\S]*\}/);
                                            if (match) {
                                                trainingPlan = JSON.parse(match[0]);
                                                break planLoop;
                                            }
                                        }
                                    } catch {
                                        // Try next
                                    }
                                }
                            }
                        }

                        // Local deterministic fallback if Groq failed or was unconfigured
                        if (!trainingPlan || !trainingPlan.weeklyPlan || !Array.isArray(trainingPlan.weeklyPlan)) {
                            trainingPlan = generateLocalCareerPlan(targetRole, skillGaps);
                        }

                        // Fetch YouTube videos for top skills
                        const topSkills = (skillGaps && skillGaps.length > 0) ? skillGaps.slice(0, 3) : [targetRole];
                        const allVideos: any[] = [];
                        for (const skill of topSkills) {
                            const videos = await fetchYouTubeVideos(keys.YOUTUBE_API_KEY, `${skill} tutorial for ${targetRole}`, 2);
                            allVideos.push({ skill, videos });
                        }

                        // Fetch Pexels images fallback
                        const images = await fetchPexelsImages(keys.PEXELS_API_KEY, `${targetRole} career learning`);

                        // Save plan
                        const id = generateId();
                        await DB.run(`INSERT INTO career_plans (id, user_id, target_role, skill_gaps, training_plan, youtube_videos, pexels_images)
              VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, session.userId, targetRole, JSON.stringify(skillGaps || []),
                                JSON.stringify(trainingPlan), JSON.stringify(allVideos), JSON.stringify(images)]);

                        sendJson(res, 200, { success: true, id, trainingPlan, videos: allVideos, images });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                if (req.method === 'GET') {
                    const plans = await DB.all('SELECT * FROM career_plans WHERE user_id = ? ORDER BY created_at DESC', [session.userId]);
                    return sendJson(res, 200, { plans });
                }
                next();
            });

            // ==================== ROADMAP CHART (Groq + Mermaid) ====================
            server.middlewares.use('/api/roadmap-chart', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method !== 'POST') return next();

                try {
                    const { targetRole, timeline, currentSkills, skillsToLearn, notes } = await parseBody(req);
                    if (!targetRole) return sendJson(res, 400, { error: 'Target role is required' });

                    const timelineText = timeline || '3 months';
                    const currentSkillsText = currentSkills || 'None specified';
                    const skillsToLearnText = skillsToLearn || targetRole;
                    const notesText = notes ? `\nAdditional notes: ${notes}` : '';

                    const prompt = `Create a career learning roadmap flowchart for someone who wants to become a "${targetRole}" within ${timelineText}.

Current skills: ${currentSkillsText}
Skills to learn: ${skillsToLearnText}${notesText}

Generate ONLY valid Mermaid.js flowchart code following these STRICT rules:

1. Start with exactly "graph TD" on the first line
2. Use subgraph blocks to group skills by phase/month. Label each subgraph by the phase name.
   Example: subgraph Phase1[Month 1 Fundamentals]
3. Use ONLY alphanumeric characters and underscores for node IDs (e.g., A1, B2, Step1)
4. Use square brackets for node labels: A1[Label Text Here]
5. Use --> for connections between nodes
6. NEVER use colons inside node labels
7. NEVER use quotes or parentheses in labels
8. Keep labels short - maximum 4 words per label
9. Create a WIDE layout - each subgraph should have 2-3 parallel vertical branches side by side
10. Connect the branches within each subgraph vertically (top to bottom)
11. Connect the last nodes of one subgraph to the first nodes of the next subgraph
12. Use style lines at the end with different colors for each phase
13. Create 15-25 nodes across ${timelineText === '1 month' ? '2 phases' : timelineText === '3 months' ? '3 phases' : '4-6 phases'}
14. End with a single final goal node that all paths converge to

Generate the Mermaid code now for the ${targetRole} roadmap:`;

                    let mermaidCode = '';
                    const result = await callGroq(keys.GROQ_API_KEY, prompt);
                    if (result.success && result.content) {
                        mermaidCode = result.content;
                    }

                    // Guaranteed fallback if Groq failed or produced unparseable output
                    if (!mermaidCode || !mermaidCode.includes('graph TD')) {
                        mermaidCode = generateFallbackMermaid(targetRole, timelineText, currentSkillsText, skillsToLearnText);
                    }

                    sendJson(res, 200, { success: true, mermaidCode });
                } catch (err: any) {
                    // Even on unexpected error, provide fallback chart so UI never breaks
                    const fallback = generateFallbackMermaid('Software Engineer', '3 months');
                    sendJson(res, 200, { success: true, mermaidCode: fallback });
                }
            });

            // ==================== PROFILE SYSTEM ====================
            // Helper: auto-create profile for user if it doesn't exist
            async function ensureUserProfile(userId: string): Promise<any> {
                let profile = await DB.get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]) as any;
                if (!profile) {
                    const id = generateId();
                    await DB.run(`INSERT INTO user_profiles (id, user_id) VALUES (?, ?)`, [id, userId]);
                    profile = await DB.get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
                }
                return profile;
            }

            // Helper: fetch user by ID with parsed skills (avoids repeating the same SELECT + safeParse)
            async function getUserById(userId: string): Promise<any> {
                const user = await DB.get('SELECT id, email, name, target_role, skills, phone, location, bio, github_url, linkedin_url, leetcode_url, profile_picture, created_at FROM users WHERE id = ?', [userId]) as any;
                if (user) {
                    user.skills = safeParse(user.skills, []);
                }
                return user;
            }

            // GET /api/profile/statistics - Get user stats across all tables
            server.middlewares.use('/api/profile/statistics', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                try {
                    const totalInterviews = ((await DB.get('SELECT COUNT(*) as c FROM interviews WHERE user_id = ?', [session.userId])) as any)?.c || 0;
                    const totalPracticeSessions = (
                        ((await DB.get('SELECT COUNT(*) as c FROM practice_interviews WHERE user_id = ?', [session.userId])) as any)?.c || 0
                    ) + (
                        ((await DB.get('SELECT COUNT(*) as c FROM practice_aptitude WHERE user_id = ?', [session.userId])) as any)?.c || 0
                    ) + (
                        ((await DB.get('SELECT COUNT(*) as c FROM bot_interviews WHERE user_id = ?', [session.userId])) as any)?.c || 0
                    );
                    const totalAnalyses = ((await DB.get('SELECT COUNT(*) as c FROM profile_analyses WHERE user_id = ?', [session.userId])) as any)?.c || 0;
                    const totalResumeBuilds = ((await DB.get('SELECT COUNT(*) as c FROM resume_builds WHERE user_id = ?', [session.userId])) as any)?.c || 0;
                    const totalCareerPlans = ((await DB.get('SELECT COUNT(*) as c FROM career_plans WHERE user_id = ?', [session.userId])) as any)?.c || 0;

                    sendJson(res, 200, {
                        statistics: {
                            totalInterviews,
                            totalPracticeSessions,
                            totalAnalyses,
                            totalResumeBuilds,
                            totalCareerPlans,
                        },
                    });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            server.middlewares.use('/api/profile/resume', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });


                // POST - Save resume to profile
                if (req.method === 'POST') {
                    try {
                        // Parse body with larger limit for resume data (10MB)
                        let body: any;
                        try {
                            body = await new Promise((resolve, reject) => {
                                let raw = '';
                                req.on('data', (chunk: Buffer) => {
                                    raw += chunk.toString();
                                    if (raw.length > 10 * 1024 * 1024) reject(new Error('Resume body too large'));
                                });
                                req.on('end', () => {
                                    try { resolve(raw ? JSON.parse(raw) : {}); }
                                    catch { reject(new Error('Invalid JSON in resume body')); }
                                });
                                req.on('error', reject);
                            });
                        } catch (parseErr: any) {
                            return sendJson(res, 400, { error: parseErr.message || 'Failed to parse resume body' });
                        }

                        const resume = body?.resume;
                        if (!resume || typeof resume !== 'object') {
                            return sendJson(res, 400, { error: 'resume object required in body' });
                        }

                        // ── Safely normalize every field ──
                        const safeId: string = (typeof resume.id === 'string' && resume.id) ? resume.id : generateId();
                        const safeName: string = (typeof resume.name === 'string') ? resume.name.substring(0, 500) : '';
                        // Limit text to 500KB to avoid DB bloat from binary PDF garbage
                        let safeText: string = (typeof resume.text === 'string') ? resume.text : '';
                        if (safeText.length > 500000) safeText = safeText.substring(0, 500000);
                        const safeSkills: string[] = Array.isArray(resume.skills) ? resume.skills.filter((s: any) => typeof s === 'string') : [];
                        const safeAtsScore: number = (typeof resume.ats_score === 'number' && !isNaN(resume.ats_score)) ? resume.ats_score : 0;
                        const safeParsedData: Record<string, any> = (resume.parsed_data && typeof resume.parsed_data === 'object' && !Array.isArray(resume.parsed_data)) ? resume.parsed_data : {};
                        const safeUploadedAt: string = (typeof resume.uploaded_at === 'string' && resume.uploaded_at) ? resume.uploaded_at : new Date().toISOString();

                        // Safely extract education & experience from parsed_data
                        const educationSummary: string | null = (typeof safeParsedData.education === 'string') ? safeParsedData.education.substring(0, 2000) :
                            Array.isArray(safeParsedData.education) ? JSON.stringify(safeParsedData.education).substring(0, 2000) : null;
                        const experienceSummary: string | null = (typeof safeParsedData.experience === 'string') ? safeParsedData.experience.substring(0, 2000) :
                            Array.isArray(safeParsedData.experience) ? JSON.stringify(safeParsedData.experience).substring(0, 2000) : null;

                        await ensureUserProfile(session.userId);

                        // Save resume data to user_profiles
                        await DB.run(`UPDATE user_profiles SET
                            saved_resume_id = ?,
                            saved_resume_name = ?,
                            saved_resume_text = ?,
                            saved_resume_skills = ?,
                            saved_resume_ats_score = ?,
                            saved_resume_parsed_data = ?,
                            last_resume_upload = ?,
                            education_summary = ?,
                            experience_summary = ?,
                            updated_at = datetime('now')
                            WHERE user_id = ?`, [safeId,
                            safeName,
                            safeText,
                            JSON.stringify(safeSkills),
                            safeAtsScore,
                            JSON.stringify(safeParsedData),
                            safeUploadedAt,
                            educationSummary,
                            experienceSummary,
                            session.userId]);

                        // ── Auto-fill user profile from resume data (don't overwrite existing) ──
                        const currentUser = await getUserById(session.userId);
                        const autoFillUpdates: string[] = [];
                        const autoFillValues: any[] = [];

                        // Auto-fill skills (merge, don't overwrite)
                        if (safeSkills.length > 0) {
                            const existingSkills: string[] = Array.isArray(currentUser?.skills) ? currentUser.skills : [];
                            const merged = [...new Set([...existingSkills, ...safeSkills])];
                            autoFillUpdates.push('skills = ?');
                            autoFillValues.push(JSON.stringify(merged));
                        }

                        // Auto-fill phone if user has none
                        const extractedPhone = safeParsedData.phone ?? null;
                        if (extractedPhone && typeof extractedPhone === 'string' && !currentUser?.phone) {
                            autoFillUpdates.push('phone = ?');
                            autoFillValues.push(extractedPhone);
                        }

                        // Auto-fill name if user has none
                        const extractedName = safeParsedData.name ?? null;
                        if (extractedName && typeof extractedName === 'string' && !currentUser?.name) {
                            autoFillUpdates.push('name = ?');
                            autoFillValues.push(extractedName);
                        }

                        if (autoFillUpdates.length > 0) {
                            autoFillUpdates.push("updated_at = datetime('now')");
                            autoFillValues.push(session.userId);
                            await DB.run(`UPDATE users SET ${autoFillUpdates.join(', ')} WHERE id = ?`, [...autoFillValues]);
                        }

                        // Return updated profile + user
                        const updatedProfile = await DB.get('SELECT * FROM user_profiles WHERE user_id = ?', [session.userId]) as any;
                        const updatedUser = await getUserById(session.userId);
                        const parsedProfile = updatedProfile ? {
                            ...updatedProfile,
                            saved_resume_skills: safeParse(updatedProfile.saved_resume_skills, []),
                            saved_resume_parsed_data: safeParse(updatedProfile.saved_resume_parsed_data, {}),
                            preferences: safeParse(updatedProfile.preferences, {}),
                        } : null;
                        sendJson(res, 200, { profile: parsedProfile, user: updatedUser });
                    } catch (err: any) {
                        console.error('POST /api/profile/resume error:', err);
                        sendJson(res, 500, { error: err.message || 'Failed to save resume' });
                    }
                    return;
                }

                // GET - Load resume from profile
                if (req.method === 'GET') {
                    try {
                        const profile = await ensureUserProfile(session.userId);
                        if (!profile.saved_resume_id) {
                            return sendJson(res, 200, { resume: null });
                        }

                        const resume = {
                            id: profile.saved_resume_id,
                            name: profile.saved_resume_name,
                            text: profile.saved_resume_text,
                            skills: safeParse(profile.saved_resume_skills, []),
                            ats_score: profile.saved_resume_ats_score,
                            parsed_data: safeParse(profile.saved_resume_parsed_data, {}),
                            uploaded_at: profile.last_resume_upload,
                        };
                        sendJson(res, 200, { resume });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                // DELETE - Delete resume from profile
                if (req.method === 'DELETE') {
                    try {
                        await ensureUserProfile(session.userId);
                        await DB.run(`UPDATE user_profiles SET
                            saved_resume_id = NULL,
                            saved_resume_name = NULL,
                            saved_resume_text = NULL,
                            saved_resume_skills = '[]',
                            saved_resume_ats_score = NULL,
                            saved_resume_parsed_data = '{}',
                            last_resume_upload = NULL,
                            updated_at = datetime('now')
                            WHERE user_id = ?`, [session.userId]);
                        sendJson(res, 200, { success: true });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                next();
            });

            server.middlewares.use('/api/profile/analyses', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                try {
                    const rows = await DB.all('SELECT * FROM profile_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [session.userId]);
                    const analyses = (rows as any[]).map((r: any) => ({
                        ...r,
                        analysis_data: safeParse(r.analysis_data, {}),
                    }));
                    sendJson(res, 200, { analyses });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            server.middlewares.use('/api/profile/analysis', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                try {
                    const { analysis } = await parseBody(req);
                    if (!analysis) return sendJson(res, 400, { error: 'analysis data required' });

                    const id = analysis.id || generateId();
                    await DB.run(`INSERT INTO profile_analyses (id, user_id, analysis_type, analysis_data, score, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`, [id,
                        session.userId,
                        analysis.analysis_type || 'general',
                        JSON.stringify(analysis.analysis_data || {}),
                        analysis.score || null,
                        analysis.status || 'completed',
                        analysis.created_at || new Date().toISOString()]);

                    // Increment analyses counter
                    await ensureUserProfile(session.userId);
                    await DB.run(`UPDATE user_profiles SET total_analyses = total_analyses + 1, updated_at = datetime('now') WHERE user_id = ?`, [session.userId]);

                    sendJson(res, 201, { analysis: { id, ...analysis, user_id: session.userId } });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            server.middlewares.use('/api/profile/activity', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                // POST - Log new activity
                if (req.method === 'POST') {
                    try {
                        const { activity } = await parseBody(req);
                        if (!activity) return sendJson(res, 400, { error: 'activity data required' });

                        const id = activity.id || generateId();
                        await DB.run(`INSERT INTO user_activities (id, user_id, activity_type, activity_title, activity_description, metadata, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`, [id,
                            session.userId,
                            activity.activity_type || 'general',
                            activity.activity_title || 'Activity',
                            activity.activity_description || '',
                            JSON.stringify(activity.metadata || {}),
                            activity.created_at || new Date().toISOString()]);

                        sendJson(res, 201, { activity: { id, ...activity, user_id: session.userId } });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                // GET - Get activity history
                if (req.method === 'GET') {
                    try {
                        const params = getQueryParams(req);
                        const limit = parseInt(params.get('limit') || '50');
                        const rows = await DB.all('SELECT * FROM user_activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [session.userId, limit]);
                        const activities = (rows as any[]).map((r: any) => ({
                            ...r,
                            metadata: safeParse(r.metadata, {}),
                        }));
                        sendJson(res, 200, { activities });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                next();
            });

            server.middlewares.use('/api/profile/info', async (req: any, res: any, next: any) => {
                if (req.method !== 'PUT') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                try {
                    const { updates } = await parseBody(req);
                    if (!updates) return sendJson(res, 400, { error: 'updates required' });

                    const allowedFields = ['name', 'phone', 'location', 'bio', 'github_url', 'linkedin_url', 'leetcode_url', 'profile_picture', 'target_role'];
                    const setClauses: string[] = [];
                    const values: any[] = [];

                    for (const field of allowedFields) {
                        if (updates[field] !== undefined) {
                            setClauses.push(`${field} = ?`);
                            values.push(updates[field]);
                        }
                    }

                    if (updates.skills !== undefined) {
                        setClauses.push('skills = ?');
                        values.push(JSON.stringify(updates.skills));
                    }

                    if (setClauses.length > 0) {
                        setClauses.push("updated_at = datetime('now')");
                        values.push(session.userId);
                        await DB.run(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, [...values]);
                    }

                    const user = await getUserById(session.userId);
                    sendJson(res, 200, { user });
                } catch (err: any) {
                    sendJson(res, 500, { error: err.message });
                }
            });

            server.middlewares.use('/api/profile', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });


                // GET - Get or auto-create profile
                if (req.method === 'GET') {
                    try {
                        const profile = await ensureUserProfile(session.userId);
                        const user = await getUserById(session.userId);

                        // Also parse profile JSON fields
                        const parsedProfile = {
                            ...profile,
                            saved_resume_skills: safeParse(profile.saved_resume_skills, []),
                            saved_resume_parsed_data: safeParse(profile.saved_resume_parsed_data, {}),
                            preferences: safeParse(profile.preferences, {}),
                        };

                        sendJson(res, 200, { profile: parsedProfile, user });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                // PUT - Update profile
                if (req.method === 'PUT') {
                    try {
                        const { updates } = await parseBody(req);
                        if (!updates) return sendJson(res, 400, { error: 'updates required' });

                        await ensureUserProfile(session.userId);

                        const allowedProfileFields = ['preferred_role', 'career_goals', 'total_interviews', 'total_practice_sessions', 'total_analyses'];
                        const setClauses: string[] = [];
                        const values: any[] = [];

                        for (const field of allowedProfileFields) {
                            if (updates[field] !== undefined) {
                                setClauses.push(`${field} = ?`);
                                values.push(updates[field]);
                            }
                        }

                        if (updates.preferences !== undefined) {
                            setClauses.push('preferences = ?');
                            values.push(JSON.stringify(updates.preferences));
                        }

                        if (setClauses.length > 0) {
                            setClauses.push("updated_at = datetime('now')");
                            values.push(session.userId);
                            await DB.run(`UPDATE user_profiles SET ${setClauses.join(', ')} WHERE user_id = ?`, [...values]);
                        }

                        const profile = await DB.get('SELECT * FROM user_profiles WHERE user_id = ?', [session.userId]);
                        sendJson(res, 200, { profile });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                next();
            });

            // ==================== RESUME BUILDER ====================
            server.middlewares.use('/api/resume-builder', async (req: any, res: any, next: any) => {
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                if (req.method === 'POST') {
                    try {
                        const body = await parseBody(req);
                        const id = body.id || generateId();
                        await DB.run(`INSERT OR REPLACE INTO resume_builds (id, user_id, personal_info, education, experience, projects, skills, template, ats_score, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, [id, session.userId, JSON.stringify(body.personalInfo || {}),
                                JSON.stringify(body.education || []), JSON.stringify(body.experience || []),
                                JSON.stringify(body.projects || []), JSON.stringify(body.skills || []),
                                body.template || 'modern', body.atsScore || 0]);
                        sendJson(res, 201, { success: true, id });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }

                if (req.method === 'GET') {
                    const builds = await DB.all('SELECT * FROM resume_builds WHERE user_id = ? ORDER BY updated_at DESC', [session.userId]);
                    return sendJson(res, 200, { builds });
                }
                next();
            });

            // ==================== ADMIN: ALL USERS ====================
            server.middlewares.use('/api/admin/users', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const session = getSession(req);
                if (!session || !session.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });
                const users = await DB.all('SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC', []);
                sendJson(res, 200, { users });
            });

            // ==================== ADMIN: STATS ====================
            server.middlewares.use('/api/admin/stats', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const session = await getSessionAsync(req);
                if (!session || !session.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

                try {
                    const totalUsers = ((await DB.get('SELECT COUNT(*) as count FROM users', []).catch(() => ({ count: 0 }))) as any)?.count || 0;

                    // Formal mock interviews
                    const totalInterviews = ((await DB.get('SELECT COUNT(*) as count FROM interviews', []).catch(() => ({ count: 0 }))) as any)?.count || 0;
                    const completedInterviews = ((await DB.get('SELECT COUNT(*) as count FROM interviews WHERE completed = 1', []).catch(() => ({ count: 0 }))) as any)?.count || 0;
                    const avgScore = ((await DB.get('SELECT AVG(score) as avg FROM interviews WHERE completed = 1 AND score IS NOT NULL', []).catch(() => ({ avg: 0 }))) as any)?.avg || 0;

                    // Round 1 Aptitude
                    const totalRound1 = ((await DB.get('SELECT COUNT(*) as count FROM round1_aptitude', []).catch(() => ({ count: 0 }))) as any)?.count || 0;

                    // Round 2 Coding
                    const totalRound2 = ((await DB.get('SELECT COUNT(*) as count FROM round2_coding', []).catch(() => ({ count: 0 }))) as any)?.count || 0;

                    // Bot Interviews
                    const totalBotInterviews = ((await DB.get('SELECT COUNT(*) as count FROM bot_interviews', []).catch(() => ({ count: 0 }))) as any)?.count || 0;

                    // Practice Interviews
                    const totalPracticeInterviews = ((await DB.get('SELECT COUNT(*) as count FROM practice_interviews', []).catch(() => ({ count: 0 }))) as any)?.count || 0;

                    // Practice Aptitude
                    const totalPracticeAptitude = ((await DB.get('SELECT COUNT(*) as count FROM practice_aptitude', []).catch(() => ({ count: 0 }))) as any)?.count || 0;

                    // Practice Coding
                    const totalPracticeCoding = ((await DB.get('SELECT COUNT(*) as count FROM practice_coding', []).catch(() => ({ count: 0 }))) as any)?.count || 0;

                    // Resumes saved in profiles
                    let totalResumes = 0;
                    try {
                        totalResumes = ((await DB.get("SELECT COUNT(*) as count FROM user_profiles WHERE saved_resume_name IS NOT NULL AND saved_resume_name != ''", []).catch(() => ({ count: 0 }))) as any)?.count || 0;
                    } catch { /* table might not exist */ }

                    // Recent activity across all tables (last 10 items)
                    const recentActivity: any[] = [];
                    try {
                        const recentInterviews = await DB.all('SELECT id, role_name, user_id, completed, created_at FROM interviews ORDER BY created_at DESC LIMIT 5', []) as any[];
                        recentInterviews.forEach((r: any) => recentActivity.push({ type: 'interview', id: r.id, roleName: r.role_name, userId: r.user_id, date: r.created_at, completed: r.completed }));
                    } catch { }
                    try {
                        const recentRound1 = await DB.all('SELECT id, role_name, user_id, user_email, score, completed_at FROM round1_aptitude ORDER BY completed_at DESC LIMIT 5', []) as any[];
                        recentRound1.forEach((r: any) => recentActivity.push({ type: 'round1', id: r.id, roleName: r.role_name, userId: r.user_id, userEmail: r.user_email, score: r.score, date: r.completed_at }));
                    } catch { }
                    try {
                        const recentRound2 = await DB.all('SELECT id, role_name, user_id, user_email, score, completed_at FROM round2_coding ORDER BY completed_at DESC LIMIT 5', []) as any[];
                        recentRound2.forEach((r: any) => recentActivity.push({ type: 'round2', id: r.id, roleName: r.role_name, userId: r.user_id, userEmail: r.user_email, score: r.score, date: r.completed_at }));
                    } catch { }
                    try {
                        const recentBot = await DB.all('SELECT id, role, user_id, completed_at FROM bot_interviews ORDER BY completed_at DESC LIMIT 5', []) as any[];
                        recentBot.forEach((r: any) => recentActivity.push({ type: 'bot_interview', id: r.id, roleName: r.role, userId: r.user_id, date: r.completed_at }));
                    } catch { }
                    try {
                        const recentPractice = await DB.all('SELECT id, role_name, user_id, overall_score, completed_at FROM practice_interviews ORDER BY completed_at DESC LIMIT 5', []) as any[];
                        recentPractice.forEach((r: any) => recentActivity.push({ type: 'practice_interview', id: r.id, roleName: r.role_name, userId: r.user_id, score: r.overall_score, date: r.completed_at }));
                    } catch { }
                    try {
                        const recentPracticeApt = await DB.all('SELECT id, user_id, score, completed_at FROM practice_aptitude ORDER BY completed_at DESC LIMIT 5', []) as any[];
                        recentPracticeApt.forEach((r: any) => recentActivity.push({ type: 'practice_aptitude', id: r.id, userId: r.user_id, score: r.score, date: r.completed_at }));
                    } catch { }

                    // Sort by date descending and take top 10
                    recentActivity.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

                    // Build role popularity map across all sources
                    const roleCountMap: Record<string, number> = {};
                    try {
                        const roleCounts = await DB.all('SELECT role_name, COUNT(*) as cnt FROM interviews GROUP BY role_name', []) as any[];
                        roleCounts.forEach((r: any) => { if (r.role_name) roleCountMap[r.role_name] = (roleCountMap[r.role_name] || 0) + r.cnt; });
                    } catch { }
                    try {
                        const r1Counts = await DB.all('SELECT role_name, COUNT(*) as cnt FROM round1_aptitude GROUP BY role_name', []) as any[];
                        r1Counts.forEach((r: any) => { if (r.role_name) roleCountMap[r.role_name] = (roleCountMap[r.role_name] || 0) + r.cnt; });
                    } catch { }
                    try {
                        const r2Counts = await DB.all('SELECT role_name, COUNT(*) as cnt FROM round2_coding GROUP BY role_name', []) as any[];
                        r2Counts.forEach((r: any) => { if (r.role_name) roleCountMap[r.role_name] = (roleCountMap[r.role_name] || 0) + r.cnt; });
                    } catch { }
                    try {
                        const botCounts = await DB.all('SELECT role, COUNT(*) as cnt FROM bot_interviews GROUP BY role', []) as any[];
                        botCounts.forEach((r: any) => { if (r.role) roleCountMap[r.role] = (roleCountMap[r.role] || 0) + r.cnt; });
                    } catch { }
                    try {
                        const pracCounts = await DB.all('SELECT role_name, COUNT(*) as cnt FROM practice_interviews GROUP BY role_name', []) as any[];
                        pracCounts.forEach((r: any) => { if (r.role_name) roleCountMap[r.role_name] = (roleCountMap[r.role_name] || 0) + r.cnt; });
                    } catch { }

                    const popularRoles = Object.entries(roleCountMap)
                        .map(([role, count]) => ({ role, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);

                    sendJson(res, 200, {
                        totalUsers,
                        totalInterviews,
                        completedInterviews,
                        averageScore: Math.round(avgScore * 10) / 10,
                        totalRound1,
                        totalRound2,
                        totalBotInterviews,
                        totalPracticeInterviews,
                        totalPracticeAptitude,
                        totalPracticeCoding,
                        totalResumes,
                        totalAllActivities: totalInterviews + totalRound1 + totalRound2 + totalBotInterviews + totalPracticeInterviews + totalPracticeAptitude + totalPracticeCoding,
                        recentActivity: recentActivity.slice(0, 10),
                        popularRoles,
                    });
                } catch (err: any) {
                    console.error('Admin stats calculation error:', err);
                    sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== ROLES ====================
            server.middlewares.use('/api/roles', async (req: any, res: any, next: any) => {
                if (req.method === 'GET') {
                    const roles = await DB.all('SELECT * FROM roles', []);
                    return sendJson(res, 200, { roles });
                }
                if (req.method === 'POST') {
                    const session = getSession(req);
                    if (!session || !session.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });
                    try {
                        const { roleId, isOpen } = await parseBody(req);
                        
                        const existing = await DB.get('SELECT id FROM roles WHERE role_id = ?', [roleId]) as any;
                        if (existing) {
                            await DB.run('UPDATE roles SET is_open = ?, updated_at = datetime(\'now\') WHERE role_id = ?', [isOpen ? 1 : 0, roleId]);
                        } else {
                            const id = generateId();
                            await DB.run(`INSERT INTO roles (id, role_id, is_open, updated_at) VALUES (?, ?, ?, datetime('now'))`, [id, roleId, isOpen ? 1 : 0]);
                        }
                        
                        sendJson(res, 200, { success: true });
                    } catch (err: any) {
                        sendJson(res, 500, { error: err.message });
                    }
                    return;
                }
                next();
            });

            // ==================== JUDGE0 CODE EXECUTION PROXY ====================
            // Primary: self-hosted AWS instance. Fallback: RapidAPI.
            // Ultimate fallback: Local Node.js sandbox (works fully offline for JS).

            server.middlewares.use('/api/judge0/submit', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                // Rate limit: 10 submissions/min per user
                const rateCheck = checkAndRecordRate(`judge0_${session.userId}`, 10, 500);
                if (!rateCheck.ok) return sendJson(res, 429, { error: rateCheck.error });

                try {
                    const body = await parseBody(req);
                    const { source_code, language_id, stdin, cpu_time_limit, memory_limit } = body;

                    if (!source_code || !language_id) {
                        return sendJson(res, 400, { error: 'source_code and language_id are required' });
                    }

                    const submission = {
                        source_code,
                        language_id,
                        stdin: stdin || undefined,
                        cpu_time_limit: cpu_time_limit || 10,
                        memory_limit: memory_limit || 256000,
                    };

                    // ── Provider mode toggle (set CODE_EXECUTION_MODE in .env) ────────
                    // local    → always use Node.js sandbox (no external API, works offline)
                    // rapidapi → skip AWS, go straight to RapidAPI
                    // auto     → try AWS → RapidAPI → local (default waterfall)
                    const execMode = (resolvedEnv.CODE_EXECUTION_MODE || 'auto').toLowerCase();
                    console.log(`🔧 Code execution mode: ${execMode.toUpperCase()}`);

                    // ── AWS (skip in 'local' or 'rapidapi' mode) ──────────────────────
                    if (execMode === 'auto' && keys.JUDGE0_HOST) {
                        try {
                            const awsRes = await fetch(
                                `${keys.JUDGE0_HOST}/submissions?base64_encoded=true&wait=false`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(submission),
                                    signal: AbortSignal.timeout(8000),
                                }
                            );
                            if (awsRes.ok) {
                                const data = await awsRes.json();
                                console.log(`✅ Judge0 submission via AWS: token=${data.token}`);
                                return sendJson(res, 200, { token: data.token, provider: 'aws' });
                            }
                            console.warn(`⚠️ AWS Judge0 submit failed (${awsRes.status}), falling back to RapidAPI`);
                        } catch (awsErr: any) {
                            console.warn(`⚠️ AWS Judge0 unreachable: ${awsErr.message}, falling back to RapidAPI`);
                        }
                    }

                    // ── RapidAPI (skip in 'local' mode) ──────────────────────────────
                    if ((execMode === 'auto' || execMode === 'rapidapi') && keys.JUDGE0_RAPIDAPI_KEY && keys.JUDGE0_RAPIDAPI_URL) {
                        try {
                            const rapidRes = await fetch(
                                `${keys.JUDGE0_RAPIDAPI_URL}/submissions?base64_encoded=true&wait=false`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'x-rapidapi-key': keys.JUDGE0_RAPIDAPI_KEY,
                                        'x-rapidapi-host': keys.JUDGE0_RAPIDAPI_HOST,
                                    },
                                    body: JSON.stringify(submission),
                                    signal: AbortSignal.timeout(8000),
                                }
                            );
                            if (rapidRes.ok) {
                                const data = await rapidRes.json();
                                console.log(`✅ Judge0 submission via RapidAPI: token=${data.token}`);
                                return sendJson(res, 200, { token: data.token, provider: 'rapidapi' });
                            }
                            console.warn(`⚠️ RapidAPI Judge0 failed (${rapidRes.status}), using local sandbox`);
                        } catch (rapidErr: any) {
                            console.warn(`⚠️ RapidAPI unreachable: ${rapidErr.message}, using local sandbox`);
                        }
                    }

                    // ── LOCAL NODE.JS SANDBOX (synchronous, works offline) ────────────
                    console.log('🏠 Using local Node.js sandbox for code execution');
                    const localToken = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                    const rawCode = Buffer.from(source_code, 'base64').toString('utf-8');
                    const rawStdin = stdin ? Buffer.from(stdin, 'base64').toString('utf-8').trim() : '';

                    (globalThis as any).__localSandboxJobs = (globalThis as any).__localSandboxJobs || {};

                    // ── Run SYNCHRONOUSLY so result is ready before first poll ────────
                    if (language_id === 63) {
                        // language_id 63 = Node.js JavaScript (vm is statically imported at top)
                        const startMs = Date.now();
                        let stdout = '';
                        let stderr = '';
                        let statusId = 3; // Accepted

                        try {
                            const consoleMock = {
                                log:  (...args: any[]) => { stdout += args.map((a: any) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; },
                                error:(...args: any[]) => { stderr += args.map((a: any) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; },
                                warn: (...args: any[]) => { stderr += args.map((a: any) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n'; },
                            };

                            // Parse pipe-separated stdin into typed JS arguments
                            // Format: "2,7,11,15|9"  → [[2,7,11,15], 9]
                            //         "abcabcbb"     → ["abcabcbb"]
                            //         "A man, a plan, a canal: Panama" → ["A man, a plan, a canal: Panama"]
                            //         "h,e,l,l,o"    → [["h","e","l","l","o"]]
                            const parseArg = (s: string): any => {
                                const t = s.trim();
                                if (t === '') return '';
                                if (t === 'true') return true;
                                if (t === 'false') return false;
                                // Single number
                                if (!isNaN(Number(t)) && t !== '') return Number(t);
                                // Comma-separated: only treat as array if ALL parts are
                                // either pure numbers or single characters (like h,e,l,l,o)
                                const parts = t.split(',');
                                if (parts.length > 1) {
                                    const trimmed = parts.map((p: string) => p.trim());
                                    const allNumbers = trimmed.every((p: string) => p !== '' && !isNaN(Number(p)));
                                    if (allNumbers) return trimmed.map(Number);
                                    // Single-char strings like "h,e,l,l,o" → char array
                                    const allSingleChar = trimmed.every((p: string) => p.length === 1);
                                    if (allSingleChar) return trimmed;
                                    // Negative numbers like "-1,-2,-3"
                                    const allNeg = trimmed.every((p: string) => /^-?\d+(\.\d+)?$/.test(p));
                                    if (allNeg) return trimmed.map(Number);
                                }
                                // Everything else = plain string (preserving commas)
                                return t;
                            };

                            const args = rawStdin ? rawStdin.split('|').map(parseArg) : [];

                            // Build a wrapper that calls the user's function with real test args
                            // We detect the function name from the code (first function declaration)
                            const fnMatch = rawCode.match(/function\s+(\w+)\s*\(/);
                            const fnName = fnMatch ? fnMatch[1] : null;

                            let execCode = rawCode;
                            if (fnName && args.length > 0) {
                                // Replace the bottom "// Test ... console.log(...)" block with real invocation
                                const stripped = rawCode
                                    .replace(/\/\/\s*[Tt]est[\s\S]*$/, '')   // strip "// Test" onwards
                                    .replace(/console\s*\.\s*log[\s\S]*$/, '') // strip any bare console.log
                                    .trimEnd();

                                const argStr = args.map((a: any) => JSON.stringify(a)).join(', ');
                                execCode = `${stripped}\nconsole.log(JSON.stringify(${fnName}(${argStr})));`;
                            }

                            const ctx = vm.createContext({
                                console: consoleMock,
                                Math, JSON, parseInt, parseFloat, isNaN, isFinite,
                                Number, String, Boolean, Array, Object, Date, Map, Set,
                                undefined, null: null,
                            });
                            vm.runInContext(execCode, ctx, { timeout: (cpu_time_limit || 10) * 1000 });

                        } catch (e: any) {
                            stderr = e?.message || String(e);
                            statusId = (e?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') ? 5 : 11;
                        }

                        const execTimeS = ((Date.now() - startMs) / 1000).toFixed(3);

                        // Normalise: strip surrounding quotes that JSON.stringify adds to strings
                        let finalOut = stdout.trim();
                        if (finalOut.startsWith('"') && finalOut.endsWith('"')) {
                            try { finalOut = JSON.parse(finalOut); } catch { /* keep as-is */ }
                        }

                        (globalThis as any).__localSandboxJobs[localToken] = {
                            status: {
                                id: statusId,
                                description: statusId === 3 ? 'Accepted' : statusId === 5 ? 'Time Limit Exceeded' : 'Runtime Error (NZEC)',
                            },
                            stdout: finalOut ? Buffer.from(finalOut + '\n').toString('base64') : null,
                            stderr: stderr  ? Buffer.from(stderr).toString('base64')  : null,
                            compile_output: null,
                            time: execTimeS,
                            memory: Math.round(rawCode.length * 0.1),
                        };

                        console.log(`🏠 Local sandbox result ready: status=${statusId}, stdout="${finalOut.slice(0, 60)}"`);

                    } else {
                        // Python / Java / C++ — friendly demo message
                        const langNames: Record<number, string> = { 71: 'Python 3', 62: 'Java', 54: 'C++ (GCC)' };
                        const langName = langNames[language_id] || `Language #${language_id}`;
                        const msg = `[VidyaMitra Local Sandbox]\n${langName} execution requires an external Judge0 service.\n\nFor this demo, JavaScript (Node.js) runs fully offline.\nTo enable ${langName}:\n  • Change CODE_EXECUTION_MODE=rapidapi in .env\n  • Or self-host: https://github.com/judge0/judge0`;
                        (globalThis as any).__localSandboxJobs[localToken] = {
                            status: { id: 3, description: 'Accepted' },
                            stdout: Buffer.from(msg).toString('base64'),
                            stderr: null, compile_output: null, time: '0.001', memory: 0,
                        };
                    }

                    return sendJson(res, 200, { token: localToken, provider: 'local' });

                } catch (err: any) {
                    console.error('❌ Judge0 submit error:', err.message);
                    sendJson(res, 500, { error: err.message });
                }
            });

            server.middlewares.use('/api/judge0/result/', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });

                const urlPath = getUrlPath(req);
                const token = urlPath.replace('/api/judge0/result/', '').replace(/\/$/, '');
                if (!token) return sendJson(res, 400, { error: 'Token is required' });

                const params = getQueryParams(req);
                const provider = params.get('provider') || 'aws';

                try {
                    // ── Local sandbox result polling ──────────────────────────────
                    if (provider === 'local' || token.startsWith('local_')) {
                        const jobs = (globalThis as any).__localSandboxJobs || {};
                        const job = jobs[token];
                        if (!job) {
                            // Still executing — tell frontend to keep polling
                            return sendJson(res, 200, { token, status: { id: 1, description: 'In Queue' } });
                        }
                        delete jobs[token]; // clean up memory
                        return sendJson(res, 200, { token, ...job });
                    }

                    // Try the same provider that was used for submission
                    if (provider === 'aws' && keys.JUDGE0_HOST) {
                        try {
                            const awsRes = await fetch(
                                `${keys.JUDGE0_HOST}/submissions/${token}?base64_encoded=true&fields=*`,
                                {
                                    method: 'GET',
                                    headers: { 'Content-Type': 'application/json' },
                                    signal: AbortSignal.timeout(8000),
                                }
                            );
                            if (awsRes.ok) {
                                const data = await awsRes.json();
                                return sendJson(res, 200, data);
                            }
                            console.warn(`⚠️ AWS Judge0 result poll failed (${awsRes.status}), trying RapidAPI`);
                        } catch (awsErr: any) {
                            console.warn(`⚠️ AWS Judge0 result unreachable: ${awsErr.message}`);
                        }
                    }

                    // Fallback or RapidAPI provider
                    if (keys.JUDGE0_RAPIDAPI_KEY && keys.JUDGE0_RAPIDAPI_URL) {
                        const rapidRes = await fetch(
                            `${keys.JUDGE0_RAPIDAPI_URL}/submissions/${token}?base64_encoded=true&fields=*`,
                            {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-rapidapi-key': keys.JUDGE0_RAPIDAPI_KEY,
                                    'x-rapidapi-host': keys.JUDGE0_RAPIDAPI_HOST,
                                },
                            }
                        );
                        if (!rapidRes.ok) {
                            const errText = await rapidRes.text();
                            return sendJson(res, rapidRes.status, { error: `Judge0 result error: ${errText}` });
                        }
                        const data = await rapidRes.json();
                        return sendJson(res, 200, data);
                    }

                    sendJson(res, 503, { error: 'No Judge0 provider available' });
                } catch (err: any) {
                    console.error('❌ Judge0 result error:', err.message);
                    sendJson(res, 500, { error: err.message });
                }
            });

            // ==================== ELEVENLABS SIGNED URL ====================
            server.middlewares.use('/api/elevenlabs-signed-url', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();

                if (!keys.ELEVENLABS_API_KEY) {
                    return sendJson(res, 500, { error: 'ElevenLabs API key not configured' });
                }

                // Rate limit: max 3 signed URLs per minute
                const rateCheck = checkAndRecordRate('elevenlabs', 3, 50);
                if (!rateCheck.ok) {
                    return sendJson(res, 429, { error: rateCheck.error });
                }

                try {
                    const agentId = process.env.VITE_ELEVENLABS_AGENT_ID || 'agent_1001kjd3c2k0ec59q6t0g57rxrem';
                    const response = await fetch(
                        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
                        {
                            method: 'GET',
                            headers: {
                                'xi-api-key': keys.ELEVENLABS_API_KEY,
                            },
                        }
                    );

                    if (!response.ok) {
                        const errText = await response.text();
                        console.error('❌ ElevenLabs signed URL error:', response.status, errText);
                        return sendJson(res, response.status, {
                            error: `ElevenLabs API error: ${response.status}`,
                            fallback: true,
                        });
                    }

                    const data = await response.json();
                    sendJson(res, 200, { signedUrl: data.signed_url });
                } catch (err: any) {
                    console.error('❌ ElevenLabs signed URL fetch failed:', err.message);
                    sendJson(res, 500, { error: 'Failed to get signed URL', fallback: true });
                }
            });

            // ==================== GAP ANALYSIS API ====================
            // Get existing analysis
            server.middlewares.use('/api/analysis/:userId', async (req: any, res: any, next: any) => {
                const match = req.url.match(/^\/api\/analysis\/([^?]+)/);
                if (!match || req.method !== 'GET') return next();
                
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                
                const userId = match[1];
                if (session.userId !== userId && !session.isAdmin) {
                    return sendJson(res, 403, { error: 'Access denied' });
                }
                
                try {
                    const analysis = await DB.get(
                        'SELECT * FROM gap_analysis WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                        [userId]
                    );
                    
                    if (!analysis) {
                        return sendJson(res, 404, { error: 'No analysis found' });
                    }
                    
                    sendJson(res, 200, {
                        analysis: {
                            id: analysis.id,
                            target_role: analysis.target_role,
                            future_ready_score: JSON.parse(analysis.future_ready_score || '{}'),
                            skill_gaps: JSON.parse(analysis.skill_gaps || '[]'),
                            profile_conflicts: JSON.parse(analysis.profile_conflicts || '[]'),
                            job_ready_date: analysis.job_ready_date,
                            job_ready_months: analysis.job_ready_months
                        }
                    });
                } catch (err: any) {
                    console.error('Error loading analysis:', err);
                    sendJson(res, 500, { error: err.message });
                }
            });

            // Run gap analysis
            server.middlewares.use('/api/analysis/run', async (req: any, res: any,next: any) => {
                if (req.method !== 'POST') return next();
                
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                
                const rateCheck = checkAndRecordRate(`gap_analysis_${session.userId}`, 2, 10);
                if (!rateCheck.ok) return sendJson(res, 429, { error: rateCheck.error });
                
                try {
                    const { targetRole } = await parseBody(req);
                    if (!targetRole) return sendJson(res, 400, { error: 'Target role required' });
                    
                    const groqKey = process.env.GROQ_GAP_ANALYSIS_KEY || process.env.GROQ_API_KEY;
                    if (!groqKey) return sendJson(res, 500, { error: 'Groq API not configured' });
                    
                    // Fetch user profile data
                    const profile = await DB.get('SELECT * FROM user_profiles WHERE user_id = ?', [session.userId]);
                    const userSkills = profile?.saved_resume_skills ? JSON.parse(profile.saved_resume_skills) : [];
                    const resumeText = profile?.saved_resume_text || '';
                    
                    // Fetch practice performance data
                    const practiceData = await DB.all(
                        `SELECT * FROM practice_aptitude WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
                        [session.userId]
                    );

                    // Fetch REAL GitHub data
                    const userRow = await DB.get('SELECT github_url FROM users WHERE id = ?', [session.userId]) as any;
                    const githubUrl: string = userRow?.github_url || '';
                    let ghData: GitHubProfileData | null = null;
                    let ghAnalysis: { github_match: number; github_skills: string[]; insight: string } | null = null;
                    if (githubUrl) {
                        console.log(`Fetching real GitHub data for gap analysis: ${githubUrl}`);
                        ghData = await fetchGitHubData(githubUrl);
                        if (ghData) {
                            const groqKey2 = process.env.GROQ_API_KEY_2 || '';
                            const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
                            ghAnalysis = await analyzeGitHubForRole(ghData, targetRole, groqKey2, geminiKey);
                            console.log(`GitHub analysis done: ${ghData.username} → match=${ghAnalysis.github_match}`);
                        }
                    }
                    
                    // Build analysis prompt
                    const prompt = `Analyze the skill gap for a user targeting the role: "${targetRole}"

User Profile:
- Current Skills: ${userSkills.join(', ') || 'No skills listed'}
- Resume Summary: ${resumeText.substring(0, 500) || 'No resume available'}
- Practice Sessions: ${practiceData.length} completed
- Average Practice Score: ${practiceData.length > 0 ? (practiceData.reduce((sum: number, p: any) => sum + (p.score || 0), 0) / practiceData.length).toFixed(1) : 'N/A'}

GitHub Activity (REAL data fetched live from GitHub API):
${ghData ? `- Username: ${ghData.username}
- Public Repos (own, non-fork): ${ghData.publicRepos}
- Repos pushed in last 6 months: ${ghData.recentlyActivePushed}
- All-time top languages: ${ghData.topLanguages.join(', ') || 'None'}
- Recent active languages: ${ghData.recentLanguages.join(', ') || 'None'}
- Total stars earned: ${ghData.totalStars}
- Account age: ${ghData.accountAgeYears} years
- PRE-COMPUTED github_match score: ${ghAnalysis?.github_match ?? 15}
- GitHub insight: ${ghAnalysis?.insight ?? ''}
IMPORTANT: Use exactly ${ghAnalysis?.github_match ?? 15} for github_match. This is real data — do NOT change it.` : '- No GitHub profile connected. Use github_match: 15 (minimum).'}

Task: Generate a JSON response with the following structure:
{
  "skill_gaps": [
    {
      "skill": "Skill Name",
      "user_score": 0-100,
      "market_score": 0-100,
      "gap": difference,
      "priority": "CRITICAL"|"IMPORTANT"|"MODERATE"|"LOW",
      "trend": "rising"|"stable"|"declining",
      "growth_rate": percentage,
      "estimated_hours": number,
      "category": "Frontend"|"Backend"|"DevOps"|"Cloud"|"Language"|"Tool"
    }
  ],
  "future_ready_score": {
    "overall": 0-100,
    "grade": "A"|"B"|"C"|"D"|"F",
    "resume_match": 0-100,
    "github_match": 0-100,
    "assessment_performance": 0-100,
    "market_alignment": 0-100
  },
  "profile_conflicts": [
    {
      "type": "CLAIMED_UNPROVEN"|"PROVEN_UNCLAIMED"|"ASSESSMENT_CONTRADICTION",
      "skill": "Skill Name",
      "description": "What the conflict is",
      "action": "What the user should do to fix this",
      "severity": "high"|"medium"|"low"
    }
  ],
  "job_ready_months": number
}

Rules:
- Provide 8-12 relevant skills for the target role.
- profile_conflicts: only add real conflicts if resume skills don't match practice scores (max 3). If no real conflicts, return empty array [].
- IMPORTANT: For future_ready_score, NEVER use 0 for any field. Minimum values: resume_match>=20, github_match>=15, assessment_performance>=25, market_alignment>=20. Base scores on available data - if user has skills listed, resume_match should be at least 30-50. If practice sessions completed, assessment_performance should reflect that (minimum 30 for any completed sessions).
- overall score = weighted average: resume_match*0.3 + assessment_performance*0.3 + market_alignment*0.25 + github_match*0.15
- Be realistic about scores.
- RESPOND WITH ONLY VALID JSON, NO MARKDOWN OR EXPLANATIONS.`;

                    // Call Groq API with retry for network errors (ECONNRESET)
                    let groqResponse: any = null;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${groqKey}`,
                                },
                                body: JSON.stringify({
                                    model: 'openai/gpt-oss-120b',
                                    messages: [
                                        { role: 'system', content: 'You are a technical career analyst. Return ONLY valid compact JSON. No markdown. Keep response under 1500 tokens.' },
                                        { role: 'user', content: prompt }
                                    ],
                                    temperature: 0.3,
                                    max_tokens: 4096,
                                }),
                            });
                            break;
                        } catch (fetchErr: any) {
                            console.warn(`Groq analysis attempt ${attempt + 1} failed:`, fetchErr.message);
                            if (attempt === 2) throw fetchErr;
                            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                        }
                    }

                    if (!groqResponse || !groqResponse.ok) {
                        const errText = groqResponse ? await groqResponse.text() : 'No response';
                        console.error('Groq API error:', groqResponse?.status, errText);
                        return sendJson(res, 500, { error: 'Analysis generation failed' });
                    }

                    let content = await groqResponse.json().then((d: any) => d.choices?.[0]?.message?.content?.trim() || '');
                    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                    
                    let analysisData;
                    try {
                        analysisData = JSON.parse(content);
                    } catch (parseErr) {
                        console.error('Failed to parse Groq response (truncated):', content.substring(0, 300));
                        // Attempt to repair truncated JSON by closing any open brackets/braces
                        try {
                            let repaired = content;
                            // Strip trailing partial key/value
                            repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*[^,\}\]]*$/, '').replace(/,\s*$/, '');
                            const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
                            const openBraces   = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
                            for (let i = 0; i < openBrackets; i++) repaired += ']';
                            for (let i = 0; i < openBraces; i++) repaired += '}';
                            analysisData = JSON.parse(repaired);
                            console.warn('✅ Repaired truncated Groq JSON successfully');
                        } catch {
                            return sendJson(res, 500, { error: 'Invalid analysis data' });
                        }
                    }
                    
                    const analysisId = generateId();
                    const skillGaps = analysisData.skill_gaps || [];
                    const rawScore = analysisData.future_ready_score || {};
                    
                    // Enforce minimum scores - never show 0% (misleading for new users)
                    const hasSkills = userSkills.length > 0;
                    const hasPractice = practiceData.length > 0;
                    const avgScore = hasPractice ? practiceData.reduce((s: number, p: any) => s + (p.score || 0), 0) / practiceData.length : 0;
                    const resumeMin = hasSkills ? 30 : 20;
                    const practiceMin = hasPractice ? Math.max(25, Math.round(avgScore * 0.5)) : 20;
                    
                    const futureReadyScore = {
                        resume_match: Math.max(resumeMin, rawScore.resume_match || 0),
                        // If real GitHub data was fetched, always use that score (authoritative)
                        github_match: ghAnalysis
                            ? ghAnalysis.github_match
                            : Math.max(15, rawScore.github_match || 0),
                        assessment_performance: Math.max(practiceMin, rawScore.assessment_performance || 0),
                        market_alignment: Math.max(20, rawScore.market_alignment || 0),
                        overall: 0,
                        grade: 'F'
                    };
                    // Recalculate overall from components
                    futureReadyScore.overall = Math.round(
                        futureReadyScore.resume_match * 0.30 +
                        futureReadyScore.assessment_performance * 0.30 +
                        futureReadyScore.market_alignment * 0.25 +
                        futureReadyScore.github_match * 0.15
                    );
                    futureReadyScore.grade = futureReadyScore.overall >= 80 ? 'A' : futureReadyScore.overall >= 65 ? 'B' : futureReadyScore.overall >= 50 ? 'C' : futureReadyScore.overall >= 35 ? 'D' : 'F';
                    
                    const profileConflicts = analysisData.profile_conflicts || [];
                    const job_ready_months = Math.min(12, Math.max(3, analysisData.job_ready_months || 12));
                    const job_ready_date = new Date(Date.now() + job_ready_months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    
                    // Store in database
                    await DB.run(
                        `INSERT INTO gap_analysis (id, user_id, target_role, future_ready_score, skill_gaps, profile_conflicts, job_ready_date, job_ready_months, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                        [analysisId, session.userId, targetRole, JSON.stringify(futureReadyScore), JSON.stringify(skillGaps), JSON.stringify(profileConflicts), job_ready_date, job_ready_months]
                    );
                    
                    sendJson(res, 200, {
                        analysis: {
                            id: analysisId,
                            target_role: targetRole,
                            future_ready_score: futureReadyScore,
                            skill_gaps: skillGaps,
                            profile_conflicts: profileConflicts,
                            job_ready_date,
                            job_ready_months
                        }
                    });
                } catch (err: any) {
                    console.error('Error running analysis:', err);
                    sendJson(res, 500, { error: err.message });
                }
            });

            // Get roadmap
            server.middlewares.use('/api/roadmap/:userId', async (req: any, res: any, next: any) => {
                const match = req.url.match(/^\/api\/roadmap\/([^?]+)/);
                if (!match || req.method !== 'GET') return next();
                
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                
                const userId = match[1];
                if (session.userId !== userId && !session.isAdmin) {
                    return sendJson(res, 403, { error: 'Access denied' });
                }
                
                try {
                    const roadmap = await DB.get(
                        'SELECT * FROM learning_roadmaps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                        [userId]
                    );
                    
                    if (!roadmap) {
                        return sendJson(res, 404, { error: 'No roadmap found' });
                    }
                    
                    sendJson(res, 200, {
                        roadmap: {
                            id: roadmap.id,
                            mermaid_code: roadmap.mermaid_code,
                            monthly_plan: JSON.parse(roadmap.monthly_plan || '[]'),
                            total_months: roadmap.total_months,
                            total_hours: roadmap.total_hours,
                            job_ready_date: roadmap.job_ready_date
                        }
                    });
                } catch (err: any) {
                    console.error('Error loading roadmap:', err);
                    sendJson(res, 500, { error: err.message });
                }
            });

            // Generate roadmap
            server.middlewares.use('/api/roadmap/generate', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                
                const rateCheck = checkAndRecordRate(`roadmap_${session.userId}`, 2, 10);
                if (!rateCheck.ok) return sendJson(res, 429, { error: rateCheck.error });
                
                try {
                    const { targetRole, gapAnalysisId } = await parseBody(req);
                    if (!targetRole) return sendJson(res, 400, { error: 'Target role required' });
                    
                    const groqKey = process.env.GROQ_GAP_ANALYSIS_KEY || process.env.GROQ_API_KEY;
                    if (!groqKey) return sendJson(res, 500, { error: 'Groq API not configured' });
                    
                    // Fetch the gap analysis data (simple queries - Supabase adapter can't handle OR)
                    let analysis = null;
                    if (gapAnalysisId) {
                        analysis = await DB.get(
                            'SELECT * FROM gap_analysis WHERE id = ?',
                            [gapAnalysisId]
                        );
                    }
                    if (!analysis) {
                        analysis = await DB.get(
                            'SELECT * FROM gap_analysis WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                            [session.userId]
                        );
                    }
                    
                    if (!analysis) {
                        return sendJson(res, 404, { error: 'Gap analysis not found. Run an analysis first.' });
                    }
                    
                    const skillGaps = JSON.parse(analysis.skill_gaps || '[]');
                    const futureReadyScore = JSON.parse(analysis.future_ready_score || '{}');
                    
                    // Use all skills, allow up to 12 months
                    const topSkills = skillGaps.slice(0, 12);
                    const monthsCap = Math.min(analysis.job_ready_months || 12, 12);
                    
                    // Distribute skills across months
                    const skillList = topSkills.map((sg: any) => `- ${sg.skill}: gap ${sg.gap}, ${sg.priority}, ~${sg.estimated_hours}h`).join('\n');

                    // Fetch platform course settings for prompt injection
                    const rmCourseMode = await getCourseMode();
                    const rmActivePlatforms = (rmCourseMode === 'platform' || rmCourseMode === 'combined') ? await getActivePlatforms() : [];
                    const rmPlatformInstruction = rmActivePlatforms.length > 0
                        ? `\n- PARTNER PLATFORMS: For every skill's courses array, you MUST${rmCourseMode === 'platform' ? ' ONLY' : ' first'} suggest courses from these partner platforms: ${rmActivePlatforms.map((p: any) => `${p.name} (${p.base_url})`).join(', ')}. Use them as platform names and generate course links on their domain.${rmCourseMode === 'combined' ? ' You may also add YouTube/freeCodeCamp courses after partner courses.' : ''}`
                        : '';
                    
                    // Build detailed roadmap prompt
                    const prompt = `Create a ${monthsCap}-month learning roadmap for "${targetRole}".

Skill gaps to address:
${skillList}

Return ONLY valid JSON with this structure:
{
  "monthly_plan": [
    {
      "month": 1,
      "title": "Foundation - Python & SQL Basics",
      "skills": [
        {
          "skill": "Python",
          "priority": "CRITICAL",
          "hours": 30,
          "courses": [
            {"name": "Python for Beginners", "platform": "YouTube", "duration": "10h", "free": true, "url": "https://youtube.com/watch?v=example"},
            {"name": "Python Bootcamp", "platform": "Udemy", "duration": "20h", "free": false, "url": "https://udemy.com/course/python-bootcamp"}
          ]
        }
      ],
      "total_hours": 30,
      "projected_score_improvement": 8
    }
  ],
  "total_months": ${monthsCap},
  "total_hours": 300
}

STRICT RULES:
- EXACTLY ${monthsCap} months in monthly_plan array
- Each month title MUST describe what skills to learn (e.g. "Month 3 - React & Testing")
- 1-2 skills per month, spread all ${topSkills.length} skills across all ${monthsCap} months
- 2-3 courses per skill with REAL URLs from YouTube, Udemy, Coursera, freeCodeCamp, etc.
- Course names must be descriptive (e.g. "Complete React Course 2024")
- Include both free and paid courses
- DO NOT include mermaid_code field, I will generate it myself
- Keep total JSON compact, focus on course quality${rmPlatformInstruction}`;


                    // Call Groq API with retry
                    let groqRoadmapRes: any = null;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            groqRoadmapRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${groqKey}`,
                                },
                                body: JSON.stringify({
                                    model: 'openai/gpt-oss-120b',
                                    messages: [
                                        { role: 'system', content: 'Return ONLY valid compact JSON. No markdown. No mermaid_code field. Focus on providing real course URLs and descriptive month titles.' },
                                        { role: 'user', content: prompt }
                                    ],
                                    temperature: 0.3,
                                    max_tokens: 6000,
                                }),
                            });
                            break;
                        } catch (fetchErr: any) {
                            console.warn(`Groq roadmap attempt ${attempt + 1} failed:`, fetchErr.message);
                            if (attempt === 2) throw fetchErr;
                            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                        }
                    }

                    if (!groqRoadmapRes || !groqRoadmapRes.ok) {
                        console.error('Groq roadmap API error:', groqRoadmapRes?.status);
                        return sendJson(res, 500, { error: 'Roadmap generation failed' });
                    }

                    const groqData = await groqRoadmapRes.json();
                    let content = groqData.choices?.[0]?.message?.content?.trim() || '';
                    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                    
                    // Check if truncated
                    const wasTruncated = groqData.choices?.[0]?.finish_reason === 'length';
                    
                    let roadmapData;
                    try {
                        roadmapData = JSON.parse(content);
                    } catch (parseErr) {
                        if (wasTruncated) {
                            console.warn('Groq roadmap response truncated. Content length:', content.length);
                            // Try to recover: find last complete month object in monthly_plan array
                            try {
                                const planStart = content.indexOf('"monthly_plan"');
                                const arrStart = content.indexOf('[', planStart);
                                if (arrStart > 0) {
                                    let depth = 0, lastComplete = -1, inStr = false, esc = false;
                                    for (let i = arrStart; i < content.length; i++) {
                                        const c = content[i];
                                        if (esc) { esc = false; continue; }
                                        if (c === '\\') { esc = true; continue; }
                                        if (c === '"') { inStr = !inStr; continue; }
                                        if (inStr) continue;
                                        if (c === '{') depth++;
                                        if (c === '}') { depth--; if (depth === 0) lastComplete = i; }
                                    }
                                    if (lastComplete > 0) {
                                        const fixed = content.substring(0, lastComplete + 1) + 
                                            `],"total_months":${monthsCap},"total_hours":200}`;
                                        roadmapData = JSON.parse(fixed);
                                        console.log('✅ Recovered truncated roadmap JSON with', roadmapData.monthly_plan?.length, 'months');
                                    }
                                }
                            } catch { /* fall through to fallback */ }
                        }
                        
                        // Final fallback: generate a detailed roadmap from skill data
                        if (!roadmapData) {
                            console.warn('Using fallback roadmap generation');
                            const fallbackPlan: any[] = [];
                            const skillsPerMonth = Math.max(1, Math.ceil(topSkills.length / monthsCap));
                            for (let m = 0; m < monthsCap; m++) {
                                const monthSkills = topSkills.slice(m * skillsPerMonth, (m + 1) * skillsPerMonth);
                                if (monthSkills.length === 0) {
                                    // Fill remaining months with review/practice
                                    fallbackPlan.push({
                                        month: m + 1,
                                        title: `Review & Practice`,
                                        skills: [{ 
                                            skill: 'Portfolio Projects', 
                                            priority: 'IMPORTANT', 
                                            hours: 25, 
                                            courses: [
                                                { name: 'Build Real Projects', platform: 'YouTube', duration: '15h', free: true, url: 'https://youtube.com' },
                                                { name: 'Portfolio Development', platform: 'freeCodeCamp', duration: '10h', free: true, url: 'https://freecodecamp.org' }
                                            ] 
                                        }],
                                        total_hours: 25,
                                        projected_score_improvement: 5
                                    });
                                } else {
                                    const skillNames = monthSkills.map((s: any) => s.skill).join(' & ');
                                    fallbackPlan.push({
                                        month: m + 1,
                                        title: skillNames,
                                        skills: monthSkills.map((sg: any) => ({
                                            skill: sg.skill,
                                            priority: sg.priority || 'IMPORTANT',
                                            hours: sg.estimated_hours || 25,
                                            courses: [
                                                { name: `${sg.skill} Complete Guide`, platform: 'YouTube', duration: `${Math.round((sg.estimated_hours || 25) * 0.4)}h`, free: true, url: 'https://youtube.com' },
                                                { name: `${sg.skill} Masterclass`, platform: 'Udemy', duration: `${Math.round((sg.estimated_hours || 25) * 0.6)}h`, free: false, url: 'https://udemy.com' }
                                            ]
                                        })),
                                        total_hours: monthSkills.reduce((s: number, sg: any) => s + (sg.estimated_hours || 25), 0),
                                        projected_score_improvement: Math.round(monthSkills.reduce((s: number, sg: any) => s + (sg.gap || 10), 0) / monthsCap)
                                    });
                                }
                            }
                            roadmapData = {
                                monthly_plan: fallbackPlan,
                                total_months: monthsCap,
                                total_hours: fallbackPlan.reduce((s: number, m: any) => s + m.total_hours, 0)
                            };
                        }
                    }
                    
                    const roadmapId = generateId();
                    const monthlyPlan = roadmapData.monthly_plan || [];
                    
                    // ALWAYS generate Mermaid code server-side from monthly_plan data
                    // This ensures descriptive nodes with skill names in each month
                    const mermaidLines: string[] = ['graph TD'];
                    mermaidLines.push('    Start([🚀 Start Learning])');
                    
                    monthlyPlan.forEach((m: any, idx: number) => {
                        const skillNames = (m.skills || []).map((s: any) => s.skill).join(', ');
                        // Sanitize: remove special chars that break mermaid
                        const safeTitle = (m.title || skillNames || 'Study').replace(/[":;()[\]{}|<>#&]/g, '').substring(0, 40);
                        const safeSkills = skillNames.replace(/[":;()[\]{}|<>#&]/g, '').substring(0, 50);
                        mermaidLines.push(`    M${m.month}["Month ${m.month}\\n${safeTitle}\\n${m.total_hours || 20}h"]`);
                    });
                    
                    mermaidLines.push('    Done([✅ Job Ready!])');
                    
                    // Connect nodes
                    if (monthlyPlan.length > 0) {
                        mermaidLines.push(`    Start --> M${monthlyPlan[0].month}`);
                        for (let i = 0; i < monthlyPlan.length - 1; i++) {
                            mermaidLines.push(`    M${monthlyPlan[i].month} --> M${monthlyPlan[i + 1].month}`);
                        }
                        mermaidLines.push(`    M${monthlyPlan[monthlyPlan.length - 1].month} --> Done`);
                    } else {
                        mermaidLines.push('    Start --> Done');
                    }
                    
                    // Add styling
                    mermaidLines.push('    style Start fill:#10b981,stroke:#059669,color:#fff');
                    mermaidLines.push('    style Done fill:#8b5cf6,stroke:#7c3aed,color:#fff');
                    monthlyPlan.forEach((m: any) => {
                        const hasCritical = (m.skills || []).some((s: any) => s.priority === 'CRITICAL');
                        if (hasCritical) {
                            mermaidLines.push(`    style M${m.month} fill:#ef4444,stroke:#dc2626,color:#fff`);
                        } else {
                            mermaidLines.push(`    style M${m.month} fill:#3b82f6,stroke:#2563eb,color:#fff`);
                        }
                    });
                    
                    let mermaidCode = mermaidLines.join('\n');
                    
                    const total_months = roadmapData.total_months || analysis.job_ready_months || 12;
                    const total_hours = roadmapData.total_hours || skillGaps.reduce((sum: number, sg: any) => sum + (sg.estimated_hours || 0), 0);
                    const job_ready_date = analysis.job_ready_date;
                    
                    await DB.run(
                        `INSERT INTO learning_roadmaps (id, user_id, gap_analysis_id, mermaid_code, monthly_plan, total_months, total_hours, job_ready_date, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                        [roadmapId, session.userId, analysis.id, mermaidCode, JSON.stringify(monthlyPlan), total_months, total_hours, job_ready_date]
                    );
                    
                    sendJson(res, 200, {
                        roadmap: {
                            id: roadmapId,
                            mermaid_code: mermaidCode,
                            monthly_plan: monthlyPlan,
                            total_months,
                            total_hours,
                            job_ready_date
                        }
                    });
                } catch (err: any) {
                    console.error('Error generating roadmap:', err);
                    sendJson(res, 500, { error: err.message });
                }
            });

            // AI Narrative
            server.middlewares.use('/api/analysis/narrative', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                
                try {
                    const { targetRole, futureReadyScore, skillGaps } = await parseBody(req);
                    
                    const groqKey = process.env.GROQ_GAP_ANALYSIS_KEY || process.env.GROQ_API_KEY;
                    if (!groqKey) {
                        // Fallback to simple narrative if no API key
                        const narrative = {
                            executive_summary: `Based on your profile analysis for ${targetRole}, you're currently at a ${futureReadyScore?.grade || 'C'} readiness level.`,
                            critical_insights: skillGaps?.slice(0, 3).map((sg: any) => ({
                                skill: sg.skill,
                                insight: `${sg.priority} priority skill with ${sg.gap} point gap to market standards.`
                            })) || [],
                            strength_callout: 'Focus on your critical skill gaps to accelerate your career progress.',
                            motivational_closing: 'Stay consistent with your learning plan!'
                        };
                        return sendJson(res, 200, { narrative });
                    }
                    
                    const prompt = `Generate a personalized career narrative for a candidate targeting: ${targetRole}

Profile Analysis:
- Overall Readiness: ${futureReadyScore?.overall || 50}/100 (Grade ${futureReadyScore?.grade || 'C'})
- Resume Match: ${futureReadyScore?.resume_match || 50}%
- Assessment Performance: ${futureReadyScore?.assessment_performance || 50}%
- Market Alignment: ${futureReadyScore?.market_alignment || 50}%

Top Skill Gaps:
${skillGaps?.slice(0, 5).map((sg: any) => `- ${sg.skill}: ${sg.gap} point gap (${sg.priority})`).join('\n') || 'No gaps identified'}

Generate a JSON response with:
{
  "executive_summary": "2-3 sentence overview of current readiness and path to job-ready status",
  "critical_insights": [
    {"skill": "Skill name", "insight": "Why this matters and what to do"}
  ],
  "strength_callout": "Highlight a positive aspect from their profile",
  "motivational_closing": "Encouraging message to keep them motivated"
}

Be encouraging, specific, and actionable. RESPOND WITH ONLY VALID JSON.`;

                    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${groqKey}`,
                        },
                        body: JSON.stringify({
                            model: 'openai/gpt-oss-120b',
                            messages: [
                                { role: 'system', content: 'You are a supportive career coach. Generate motivational and specific career guidance in JSON format.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.6,
                            max_tokens: 1024,
                        }),
                    });

                    if (!groqResponse.ok) {
                        throw new Error('Groq API failed');
                    }

                    const groqData = await groqResponse.json();
                    let content = groqData.choices?.[0]?.message?.content?.trim() || '';
                    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                    
                    const narrative = JSON.parse(content);
                    sendJson(res, 200, { narrative });
                } catch (err: any) {
                    console.error('Error generating narrative:', err);
                    // Fallback narrative
                    const narrative = {
                        executive_summary: 'Your profile shows promise. Focus on addressing your skill gaps systematically.',
                        critical_insights: [],
                        strength_callout: 'Keep building on your existing strengths.',
                        motivational_closing: 'Stay committed to your learning journey!'
                    };
                    sendJson(res, 200, { narrative });
                }
            });

            // Skill explanation
            server.middlewares.use('/api/analysis/skill-explain', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                
                try {
                    const { skill, userScore, marketScore, targetRole } = await parseBody(req);
                    
                    const groqKey = process.env.GROQ_GAP_ANALYSIS_KEY || process.env.GROQ_API_KEY;
                    if (!groqKey) {
                        // Fallback explanation
                        const explanation = {
                            why_matters: `${skill} is important for ${targetRole} roles and is in demand in the current job market.`,
                            how_to_prove: `Build projects, contribute to open source, and complete relevant certifications.`,
                            project_idea: `Create a portfolio project that demonstrates ${skill} proficiency.`
                        };
                        return sendJson(res, 200, { explanation });
                    }
                    
                    const prompt = `Explain the skill "${skill}" for someone targeting: ${targetRole}

Context:
- User's Current Level: ${userScore}/100
- Market Expectation: ${marketScore}/100
- Gap: ${marketScore - userScore} points

Generate a JSON response with:
{
  "why_matters": "Why this skill is critical for the target role (2-3 sentences)",
  "how_to_prove": "Concrete ways to demonstrate proficiency (certifications, projects, contributions)",
  "project_idea": "A specific project idea they can build to showcase this skill"
}

Be specific, actionable, and relevant to ${targetRole}. RESPOND WITH ONLY VALID JSON.`;

                    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${groqKey}`,
                        },
                        body: JSON.stringify({
                            model: 'openai/gpt-oss-120b',
                            messages: [
                                { role: 'system', content: 'You are a technical mentor providing specific, actionable skill development advice in JSON format.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.5,
                            max_tokens: 800,
                        }),
                    });

                    if (!groqResponse.ok) {
                        throw new Error('Groq API failed');
                    }

                    const groqData = await groqResponse.json();
                    let content = groqData.choices?.[0]?.message?.content?.trim() || '';
                    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                    
                    const explanation = JSON.parse(content);
                    sendJson(res, 200, { explanation });
                } catch (err: any) {
                    console.error('Error generating skill explanation:', err);
                    // Fallback
                    const explanation = {
                        why_matters: `${skill} is a valuable skill for ${targetRole} positions.`,
                        how_to_prove: 'Build projects and gain hands-on experience.',
                        project_idea: 'Create a portfolio-worthy project demonstrating your skills.'
                    };
                    sendJson(res, 200, { explanation });
                }
            });

            // ==================== COMPANY INTERVIEW SIMULATOR ====================

            // POST /api/company-interview/questions
            // Generates 5 company-specific questions for a given round
            server.middlewares.use('/api/company-interview/questions', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const body = await parseBody(req);
                    const { company, round } = body;
                    if (!company || !round) return sendJson(res, 400, { error: 'company and round are required' });

                    const groqKey = process.env.GROQ_GAP_ANALYSIS_KEY || process.env.GROQ_API_KEY;
                    if (!groqKey) return sendJson(res, 500, { error: 'GROQ key not configured' });

                    const roundDescriptions: Record<string, string> = {
                        DSA: 'Data Structures and Algorithms (arrays, trees, graphs, dynamic programming, sorting)',
                        SYSTEM_DESIGN: 'System Design and Architecture (scalability, databases, APIs, microservices, caching)',
                        HR: 'HR and Behavioral (situational, leadership, teamwork, conflict resolution, career goals)',
                        TECHNICAL: 'Technical CS fundamentals (OOP, OS, DBMS, networking, project-based)',
                    };
                    const roundDesc = roundDescriptions[round] || round;

                    const prompt = `Generate exactly 5 interview questions that ${company} commonly asks in their ${roundDesc} interview round.
Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "questions": [
    {
      "id": 1,
      "question": "<full question text>",
      "topic": "<specific topic, e.g. Binary Search / LRU Cache / Leadership>",
      "difficulty": "Easy" | "Medium" | "Hard",
      "hint": "<one-line hint to guide the candidate>"
    }
  ]
}
Rules:
- Questions must reflect ${company}'s actual interview style and difficulty
- Vary difficulty: include 1 Easy, 2-3 Medium, 1-2 Hard
- Topics should be specific to the ${roundDesc} round
- Each question must be unique and realistic
- Hints should be subtle guidance, not give away the answer`;

                    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                        body: JSON.stringify({
                            model: 'openai/gpt-oss-120b',
                            messages: [
                                { role: 'system', content: 'You are an expert technical interview coach with deep knowledge of company-specific hiring processes. Return only valid JSON.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.7,
                            max_tokens: 1500,
                        }),
                    });

                    if (!groqRes.ok) return sendJson(res, 500, { error: 'Groq API error' });
                    const groqData = await groqRes.json();
                    let content = groqData.choices?.[0]?.message?.content?.trim() || '';
                    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                    const parsed = JSON.parse(content);
                    sendJson(res, 200, { questions: parsed.questions });
                } catch (err: any) {
                    console.error('Company interview questions error:', err);
                    sendJson(res, 500, { error: 'Failed to generate questions' });
                }
            });

            // POST /api/company-interview/evaluate
            // Evaluates a single answer and returns AI feedback
            server.middlewares.use('/api/company-interview/evaluate', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                try {
                    const body = await parseBody(req);
                    const { company, round, question, topic, answer } = body;
                    if (!company || !question || !answer) return sendJson(res, 400, { error: 'company, question and answer are required' });

                    const groqKey = process.env.GROQ_GAP_ANALYSIS_KEY || process.env.GROQ_API_KEY;
                    if (!groqKey) return sendJson(res, 500, { error: 'GROQ key not configured' });

                    const prompt = `You are a senior ${company} interviewer evaluating a candidate's answer.
Question: ${question}
Topic: ${topic || 'General'}
Candidate's Answer: ${answer}

Evaluate the answer and return ONLY valid JSON:
{
  "score": <integer 1-10>,
  "what_was_good": "<specific praise about what the candidate did well, 1-2 sentences>",
  "what_was_missing": "<specific gaps or improvements needed, 1-2 sentences>",
  "model_answer": "<ideal concise answer a top candidate would give, 3-5 sentences>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>"]
}
Scoring guide: 1-3 = very poor, 4-5 = partial, 6-7 = good, 8-9 = strong, 10 = exceptional.
Be honest and constructive. Score based on technical accuracy, depth, and clarity.`;

                    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                        body: JSON.stringify({
                            model: 'openai/gpt-oss-120b',
                            messages: [
                                { role: 'system', content: 'You are a strict but fair technical interviewer. Return only valid JSON.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.4,
                            max_tokens: 700,
                        }),
                    });

                    if (!groqRes.ok) throw new Error('Groq API error');
                    const groqData = await groqRes.json();
                    let content = groqData.choices?.[0]?.message?.content?.trim() || '';
                    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                    const feedback = JSON.parse(content);
                    sendJson(res, 200, { feedback });
                } catch (err: any) {
                    console.error('Company interview evaluate error:', err);
                    // Graceful fallback
                    sendJson(res, 200, {
                        feedback: {
                            score: 5,
                            what_was_good: 'You attempted the question with some relevant points.',
                            what_was_missing: 'Could not evaluate fully — try providing more detail.',
                            model_answer: 'Review this topic and revisit the question with more depth.',
                            key_points: ['Be specific and structured', 'Use examples', 'Cover edge cases'],
                        }
                    });
                }
            });

            // POST /api/company-interview/save — persist completed session
            server.middlewares.use('/api/company-interview/save', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                try {
                    const body = await parseBody(req);
                    const { company, round, score, questions_count, results } = body;
                    if (!company || !round) return sendJson(res, 400, { error: 'company and round required' });

                    const id = generateId();
                    await DB.run(
                        `INSERT INTO company_interviews (id, user_id, company, round, score, questions_count, results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [id, session.userId, company, round, score || 0, questions_count || 5, JSON.stringify(results || []), new Date().toISOString()]
                    );

                    // Log to user_activities so it appears on Profile page
                    await DB.run(
                        `INSERT INTO user_activities (id, user_id, activity_type, activity_title, activity_description, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            generateId(), session.userId,
                            'company_interview',
                            `${company} — ${round.replace(/_/g, ' ')} Interview`,
                            `Completed mock interview · Score: ${score}/100 · ${questions_count || 5} questions`,
                            JSON.stringify({ company, round, score, questions_count }),
                            new Date().toISOString(),
                        ]
                    );

                    sendJson(res, 201, { id });
                } catch (err: any) {
                    console.error('Company interview save error:', err);
                    sendJson(res, 500, { error: 'Failed to save session' });
                }
            });

            // GET /api/company-interview/history — fetch user's past sessions
            server.middlewares.use('/api/company-interview/history', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                try {
                    const rows = await DB.all(
                        'SELECT id, company, round, score, questions_count, created_at FROM company_interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
                        [session.userId]
                    );
                    sendJson(res, 200, { history: rows });
                } catch (err: any) {
                    console.error('Company interview history error:', err);
                    sendJson(res, 500, { error: 'Failed to fetch history' });
                }
            });

            // ==================== CAREER MENTOR ENDPOINTS ====================

            // GET /api/mentor/context — Fetch all user career data for AI context
            server.middlewares.use('/api/mentor/context', async (req: any, res: any, next: any) => {
                if (req.method !== 'GET') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                try {
                    // 1. Profile: skills + resume summary
                    const profile = await DB.get(
                        'SELECT saved_resume_skills, saved_resume_text, target_role FROM user_profiles WHERE user_id = ?',
                        [session.userId]
                    ).catch(() => null);

                    let skills: string[] = [];
                    let resumeSummary = '';
                    let targetRole = '';
                    if (profile) {
                        try { skills = JSON.parse(profile.saved_resume_skills || '[]'); } catch { skills = []; }
                        resumeSummary = (profile.saved_resume_text || '').substring(0, 300);
                        targetRole = profile.target_role || '';
                    }

                    // 2. Latest gap analysis
                    const gapRow = await DB.get(
                        'SELECT target_role, future_ready_score, skill_gaps, grade FROM gap_analysis WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                        [session.userId]
                    ).catch(() => null);

                    let gapAnalysis: any = null;
                    if (gapRow) {
                        let skillGaps: any[] = [];
                        try { skillGaps = JSON.parse(gapRow.skill_gaps || '[]'); } catch { skillGaps = []; }
                        const topGaps = skillGaps
                            .sort((a: any, b: any) => (b.gap || 0) - (a.gap || 0))
                            .slice(0, 6);
                        gapAnalysis = {
                            targetRole: gapRow.target_role,
                            futureReadyScore: gapRow.future_ready_score,
                            grade: gapRow.grade,
                            topGaps,
                            weakSkills: topGaps.filter((g: any) => g.priority === 'CRITICAL').map((g: any) => g.skill),
                        };
                        if (!targetRole) targetRole = gapRow.target_role || '';
                    }

                    // 3. Practice history — last 10 aptitude sessions
                    const practiceRows = await DB.all(
                        'SELECT score, total_questions FROM practice_aptitude WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
                        [session.userId]
                    ).catch(() => []);

                    let practiceAvg = 0;
                    if (practiceRows.length > 0) {
                        const pcts = practiceRows.map((r: any) =>
                            r.total_questions > 0 ? Math.round((r.score / r.total_questions) * 100) : 0
                        );
                        practiceAvg = Math.round(pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length);
                    }

                    // 4. Company interview history — last 5
                    const companyRows = await DB.all(
                        'SELECT company, round, score, created_at FROM company_interviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
                        [session.userId]
                    ).catch(() => []);

                    sendJson(res, 200, {
                        skills,
                        resumeSummary,
                        targetRole,
                        gapAnalysis,
                        practiceAvg,
                        practiceSessions: practiceRows.length,
                        companyInterviews: companyRows,
                        hasData: skills.length > 0 || gapAnalysis !== null || practiceRows.length > 0,
                    });
                } catch (err: any) {
                    console.error('Mentor context error:', err);
                    sendJson(res, 500, { error: 'Failed to fetch mentor context' });
                }
            });

            // POST /api/mentor/chat — AI Career Mentor using Groq (Gemini fallback)
            server.middlewares.use('/api/mentor/chat', async (req: any, res: any, next: any) => {
                if (req.method !== 'POST') return next();
                const session = getSession(req);
                if (!session) return sendJson(res, 401, { error: 'Not authenticated' });
                try {
                    const body = await parseBody(req);
                    const { message, history = [], context } = body;
                    if (!message?.trim()) return sendJson(res, 400, { error: 'Message required' });

                    // Build rich system prompt from context
                    const ctx = context || {};
                    let systemPrompt = `You are an expert AI Career Mentor inside VidyaMitra, an interview prep platform. You have access to this user's real profile data and must give specific, data-driven, actionable advice.

USER PROFILE:`;
                    if (ctx.skills?.length > 0) {
                        systemPrompt += `\n• Known skills: ${ctx.skills.slice(0, 15).join(', ')}`;
                    }
                    if (ctx.targetRole) {
                        systemPrompt += `\n• Target role: ${ctx.targetRole}`;
                    }
                    if (ctx.resumeSummary) {
                        systemPrompt += `\n• Resume snippet: "${ctx.resumeSummary.substring(0, 200)}..."`;
                    }
                    if (ctx.gapAnalysis) {
                        const g = ctx.gapAnalysis;
                        systemPrompt += `\n• Future-Ready Score: ${g.futureReadyScore}/100 (Grade ${g.grade})`;
                        if (g.topGaps?.length > 0) {
                            const gapList = g.topGaps.slice(0, 5).map((gap: any) =>
                                `${gap.skill} (gap: ${gap.gap || 0}%, ${gap.priority || 'normal'})`
                            ).join(', ');
                            systemPrompt += `\n• Skill gaps: ${gapList}`;
                        }
                        if (g.weakSkills?.length > 0) {
                            systemPrompt += `\n• Critical weak skills: ${g.weakSkills.join(', ')}`;
                        }
                    }
                    if (ctx.practiceSessions > 0) {
                        systemPrompt += `\n• Practice aptitude: avg ${ctx.practiceAvg}% over ${ctx.practiceSessions} session(s)`;
                    }
                    if (ctx.companyInterviews?.length > 0) {
                        const recent = ctx.companyInterviews.slice(0, 3).map((ci: any) =>
                            `${ci.company} ${ci.round}: ${ci.score}%`
                        ).join(', ');
                        systemPrompt += `\n• Recent company interviews: ${recent}`;
                    }

                    systemPrompt += `

MENTOR GUIDELINES:
- Reference the user's ACTUAL scores, skills, and gaps — don't be generic
- If score is low, give specific improvement steps
- Suggest which VidyaMitra features to use (mock interview, coding practice, aptitude, career planner)
- For skill gaps, suggest concrete resources and a priority order
- Keep responses under 200 words unless user asks for a detailed plan
- Be direct, encouraging, and specific — like a personal career coach
- Use **bold** for key points and skill names`;

                    // Build message history
                    const historyText = (history || []).slice(-6).map((m: any) =>
                        `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.content}`
                    ).join('\n');

                    const groqApiKey = process.env.GROQ_API_KEY;
                    const groqApiKey2 = process.env.GROQ_API_KEY_2;

                    // Groq-based mentor chat with key rotation
                    const groqKeys = [groqApiKey, groqApiKey2].filter(Boolean) as string[];
                    
                    const mentorModels = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'];
                    for (const key of groqKeys) {
                        for (const model of mentorModels) {
                            try {
                                const groqBody = {
                                    model,
                                    messages: [
                                        { role: 'system', content: systemPrompt },
                                        ...(historyText ? [{ role: 'user', content: `[Previous conversation]\n${historyText}` }, { role: 'assistant', content: 'Understood. I have the context.' }] : []),
                                        { role: 'user', content: message },
                                    ],
                                    max_tokens: 400,
                                    temperature: 0.7,
                                };
                                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify(groqBody),
                                });
                                if (groqRes.ok) {
                                    const groqData = await groqRes.json() as any;
                                    const reply = groqData.choices?.[0]?.message?.content?.trim();
                                    if (reply) return sendJson(res, 200, { response: reply, model: 'groq' });
                                } else {
                                    console.warn(`Mentor Groq key/model failed (status ${groqRes.status}), trying next...`);
                                }
                            } catch (err: any) {
                                console.warn('Mentor Groq error:', err.message);
                            }
                        }
                    }

                    // Hardcoded fallback if all Groq keys fail
                    return sendJson(res, 200, {
                        response: "I'm having trouble connecting right now. Please check your profile is set up and try again in a moment. 🔄",
                        model: 'fallback',
                    });
                } catch (err: any) {
                    console.error('Mentor chat error:', err);
                    sendJson(res, 500, { error: 'Mentor chat failed' });
                }
            });

            // NOTE: OpenAI proxy routes are registered separately via vite.config.ts
        }

        return {
            name: 'vidyamitra-api',

            async configResolved(config) {
                initEnvAndKeys(config);
            },

            configureServer(server: ViteDevServer) {
                initEnvAndKeys();
                setupApiRoutes(server);
            },

            configurePreviewServer(server: any) {
                initEnvAndKeys();
                setupApiRoutes(server);
            },
        };
    }

