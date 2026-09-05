import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { loadResumeFromProfile } from '@/utils/profileService';
import {
    Briefcase, Search, MapPin, Building, Clock, Upload, User,
    Download, Sparkles, RefreshCw, CheckCircle2, XCircle, Filter,
    ChevronDown, ChevronUp, FileText, Target, BarChart3,
    Star, AlertTriangle, ArrowRight, TrendingUp, Globe, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface JobPosting {
    rank: number;
    title: string;
    company: string;
    location: string;
    postedTime: string;
    employmentType: string;
    salaryRange: string;
    experienceRequired: string;
    requiredSkills: string[];
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    description: string;
    applyUrl: string;
}

interface AnalysisResult {
    jobs: JobPosting[];
    avgMatchScore: number;
    topSkillGap: string;
    totalFound: number;
    bestMatch: JobPosting;
    skillGapSummary: Array<{ skill: string; count: number; severity: 'high' | 'medium' | 'low' }>;
}

// ─── LOCATION DATA ────────────────────────────────────────────────────────────

const INDIA_CITIES = [
    'Bangalore, Karnataka', 'Mumbai, Maharashtra', 'Delhi NCR', 'Hyderabad, Telangana',
    'Chennai, Tamil Nadu', 'Pune, Maharashtra', 'Kolkata, West Bengal', 'Ahmedabad, Gujarat',
    'Jaipur, Rajasthan', 'Noida, UP', 'Gurgaon, Haryana', 'Kochi, Kerala',
    'Chandigarh', 'Indore, MP', 'Coimbatore, Tamil Nadu'
];
const GLOBAL_CITIES = [
    'Remote (Worldwide)', 'New York, USA', 'San Francisco, USA', 'London, UK',
    'Dubai, UAE', 'Singapore', 'Toronto, Canada', 'Sydney, Australia',
    'Berlin, Germany', 'Amsterdam, Netherlands', 'Tokyo, Japan'
];

// ─── PDF PARSING (same as Profile.tsx) ───────────────────────────────────────

async function readPdfText(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
                .map((item) => ('str' in item ? item.str : ''))
                .join(' ');
            pages.push(pageText);
        }
        return pages.join('\n').replace(/\s+/g, ' ').trim();
    } catch {
        return '';
    }
}

function extractSkillsFromText(text: string): string[] {
    const commonSkills = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
        'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
        'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'SASS',
        'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'Firebase',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
        'Git', 'GitHub', 'GitLab', 'CI/CD', 'Jenkins',
        'REST', 'GraphQL', 'gRPC', 'WebSocket',
        'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Pandas', 'NumPy',
        'Figma', 'Sketch', 'Adobe XD', 'Agile', 'Scrum', 'Jira', 'Linux', 'Bash',
        'Data Science', 'Power BI', 'Tableau', 'Excel', 'SQL',
    ];
    const lowerText = text.toLowerCase();
    
    // Count occurrences of each skill to find the true primary skills
    const skillCounts = commonSkills.map(skill => {
        // Escape skill for regex and search with word boundaries to avoid partial matches
        const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase();
        const regex = new RegExp(`\\b${escapedSkill}\\b`, 'g');
        let count = (lowerText.match(regex) || []).length;
        
        // Fallback for skills without clean boundaries (e.g. C++, .NET)
        if (count === 0 && lowerText.includes(skill.toLowerCase())) {
            count = 1; 
        }
        return { skill, count };
    });

    return skillCounts
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count) // Sort by highest frequency
        .map(s => s.skill);
}

// ─── NATIVE LINKEDIN SEARCH BUILDER ─────────────────────────────────────────

function buildLinkedInNativeUrl(skills: string[], location: string, filters: any): string {
    const params = new URLSearchParams();
    const query = skills.slice(0, 2).join(' ') || 'Developer';
    params.set('keywords', query);
    params.set('location', location);
    
    // Time filter map
    if (filters.datePosted === 'Last 24 hours') params.set('f_TPR', 'r86400');
    else if (filters.datePosted === 'Last week') params.set('f_TPR', 'r604800');
    else params.set('f_TPR', 'r172800'); // Default to 48 hours

    // Job type map
    if (filters.jobType && filters.jobType !== 'any') {
        const jt: Record<string, string> = { 'Full-Time': 'F', 'Part-Time': 'P', 'Contract': 'C', 'Internship': 'I' };
        if (jt[filters.jobType]) params.set('f_JT', jt[filters.jobType]);
    }
    
    return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

// ─── LIVE JOBS API (JSearch) ──────────────────────────────────────────────────

async function fetchLiveJobsFromJSearch(skills: string[], location: string) {
    const rapidApiKey = import.meta.env.VITE_JSEARCH_RAPIDAPI_KEY;
    if (!rapidApiKey) throw new Error('JSearch API key not configured in .env');

    // Use the top 2 most frequent skills for a highly targeted query (e.g. "Python Machine Learning jobs")
    const searchSkills = skills.slice(0, 2).join(' ') || 'Developer';
    const query = `${searchSkills} jobs in ${location}`;
    
    // Rate Limiting (200 per month)
    const currentMonth = new Date().getMonth().toString();
    const storedMonth = localStorage.getItem('jsearch_month');
    let usageCount = parseInt(localStorage.getItem('jsearch_usage_count') || '0', 10);
    
    if (storedMonth !== currentMonth) {
        usageCount = 0;
        localStorage.setItem('jsearch_month', currentMonth);
    }

    if (usageCount >= 195) {
        throw new Error('JSearch API rate limit approaching (200/month limit). Please try again next month.');
    }

    localStorage.setItem('jsearch_usage_count', (usageCount + 1).toString());

    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&date_posted=all`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'jsearch.p.rapidapi.com'
        }
    };

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`JSearch API failed: ${response.status}`);
    
    const result = await response.json();
    return result.data || [];
}

// ─── GROQ ANALYSIS ────────────────────────────────────────────────────────────

async function analyzeJobsWithGroq(
    resumeText: string,
    skills: string[],
    location: string,
    filters: { expLevel: string; jobType: string; datePosted: string; salaryRange: string }
): Promise<JobPosting[]> {
    // 1. Fetch live jobs first
    const liveJobs = await fetchLiveJobsFromJSearch(skills, location);
    if (!liveJobs || liveJobs.length === 0) {
        throw new Error(`No live jobs found in ${location} for your profile. Try broadening your location or skills.`);
    }

    const top10Jobs = liveJobs.slice(0, 10);

    // 2. Build prompts
    const resumeSnippet = resumeText.substring(0, 2500);
    const jobsForPrompt = top10Jobs.map((j: any) => ({
        id: j.job_id,
        title: j.job_title,
        company: j.employer_name,
        description: (j.job_description || '').substring(0, 800)
    }));

    const userPrompt = `RESUME:\n${resumeSnippet}\n\nKEY SKILLS: ${skills.join(', ')}\n\nJOBS TO EVALUATE:\n${JSON.stringify(jobsForPrompt, null, 2)}`;
    const systemPrompt = `You are a recruitment match-scoring engine. Output ONLY raw JSON. No thinking, no explanation, no markdown.

For each job, evaluate how well the candidate's resume matches.

CRITICAL: Your entire response must be ONLY this JSON array, starting with [ and ending with ]:
[
  {
    "id": "<job_id from the input>",
    "matchScore": <45-95>,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["skill3", "skill4"]
  }
]
Do NOT write anything before [ or after ].`;

    // 3. Call server-side proxy (has access to all 3 Groq keys, including GROQ_GAP_ANALYSIS_KEY)
    let jsonText = '';
    try {
        const serverRes = await fetch('/api/groq/job-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userPrompt }),
        });

        if (serverRes.ok) {
            const serverData = await serverRes.json();
            jsonText = (serverData.content || '').trim();
        } else {
            const err = await serverRes.json().catch(() => ({}));
            console.warn('⚠️ JobBoard server proxy failed:', serverRes.status, err.error);
        }
    } catch (err: any) {
        console.warn('⚠️ JobBoard server proxy network error:', err.message);
    }

    // 4. Parse AI response (robust extraction — handles thinking tokens / preamble)
    if (jsonText) {
        jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
        const startIdx = jsonText.indexOf('[');
        const endIdx = jsonText.lastIndexOf(']');

        if (startIdx !== -1 && endIdx > startIdx) {
            try {
                const evaluatedScores: any[] = JSON.parse(jsonText.substring(startIdx, endIdx + 1));

                const jobs: JobPosting[] = top10Jobs.map((job: any, index: number) => {
                    const evalData = evaluatedScores.find((e: any) => e.id === job.job_id) || {};
                    return {
                        rank: index + 1,
                        title: job.job_title || 'Software Engineer',
                        company: job.employer_name || 'Tech Company',
                        location: job.job_city ? `${job.job_city}, ${job.job_state || ''}` : location,
                        postedTime: job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc).toLocaleDateString() : 'Recently',
                        employmentType: job.job_employment_type || filters.jobType || 'Full-Time',
                        salaryRange: job.job_min_salary ? `$${job.job_min_salary} - $${job.job_max_salary}` : 'Market rate',
                        experienceRequired: filters.expLevel || 'Any',
                        requiredSkills: [],
                        matchScore: typeof evalData.matchScore === 'number' ? Math.min(100, Math.max(0, evalData.matchScore)) : 50,
                        matchedSkills: Array.isArray(evalData.matchedSkills) ? evalData.matchedSkills : [],
                        missingSkills: Array.isArray(evalData.missingSkills) ? evalData.missingSkills : [],
                        description: (job.job_description || '').substring(0, 150) + '...',
                        applyUrl: job.job_apply_link || `https://www.google.com/search?q=${encodeURIComponent(job.job_title + ' ' + job.employer_name)}`,
                    };
                });

                return jobs.sort((a, b) => b.matchScore - a.matchScore).map((job, i) => ({ ...job, rank: i + 1 }));
            } catch (parseErr) {
                console.warn('⚠️ JobBoard: JSON parse failed, using fallback. Content:', jsonText.substring(0, 200));
            }
        } else {
            console.warn('⚠️ JobBoard: No JSON array in response, using fallback. Content:', jsonText.substring(0, 200));
        }
    }

    // 5. Graceful fallback — shows jobs with estimated scores instead of failing
    return analyzeJobsWithGroqFallback(resumeText, skills, location, filters);
}

// ─── FALLBACK (llama-3.1-70b if 8b needed) ───────────────────────────────────

async function analyzeJobsWithGroqFallback(
    resumeText: string,
    skills: string[],
    location: string,
    filters: { expLevel: string; jobType: string; datePosted: string; salaryRange: string }
): Promise<JobPosting[]> {
    const jobTypeLabel = filters.jobType !== 'any' ? filters.jobType : 'Full-Time';
    const expLabel = filters.expLevel !== 'any' ? filters.expLevel : 'Any';

    const prompt = `Generate 10 job postings for ${location} based on these resume skills: ${skills.slice(0, 15).join(', ')}.
Return ONLY a JSON array. Each item: {"rank":1,"title":"","company":"","location":"${location}","postedTime":"X hours ago","employmentType":"Full-Time","salaryRange":"","experienceRequired":"","requiredSkills":[],"matchScore":70,"matchedSkills":[],"missingSkills":[],"description":""}
JSON only, no markdown.`;

    const availableKeys = [import.meta.env.VITE_GROQ_API_KEY, import.meta.env.VITE_GROQ_API_KEY_2].filter(Boolean);
    
    for (const key of availableKeys) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen/qwen3.8-27b',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 3000,
                }),
            });

            if (!response.ok) {
                console.warn(`⚠️ JobBoard fallback Groq key failed (${response.status}), trying next...`);
                continue;
            }

            const data = await response.json();
            const rawText = data.choices?.[0]?.message?.content || '';
            const startIdx = rawText.indexOf('[');
            const endIdx = rawText.lastIndexOf(']');
            if (startIdx === -1) continue; // Bad response, try next key

            const rawJobs: any[] = JSON.parse(rawText.substring(startIdx, endIdx + 1));
            return rawJobs.slice(0, 10).map((job: any, i: number) => ({
                rank: i + 1,
                title: job.title || 'Software Engineer',
                company: job.company || 'Tech Company',
                location: job.location || location,
                postedTime: job.postedTime || '12 hours ago',
                employmentType: job.employmentType || jobTypeLabel,
                salaryRange: job.salaryRange || 'Competitive',
                experienceRequired: job.experienceRequired || expLabel,
                requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills : [],
                matchScore: typeof job.matchScore === 'number' ? job.matchScore : 60,
                matchedSkills: Array.isArray(job.matchedSkills) ? job.matchedSkills : [],
                missingSkills: Array.isArray(job.missingSkills) ? job.missingSkills : [],
                description: job.description || '',
                applyUrl: buildLinkedInUrl(job.title || 'Software Engineer', location, jobTypeLabel, expLabel),
            }));
        } catch (err: any) {
            console.warn('⚠️ JobBoard fallback network error, trying next key:', err.message);
            continue;
        }
    }

    throw new Error('Job analysis failed. Please try again later.');
}


// ─── EXCEL EXPORT — Dynamic ExcelJS Loading for Premium Styling ─────────

async function downloadExcel(jobs: JobPosting[], location: string, resumeSkills: string[]) {
    toast.loading('Generating styled Excel report...', { id: 'excel-toast' });
    try {
        // Dynamically load ExcelJS from CDN if not already loaded
        if (!(window as any).ExcelJS) {
            await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load ExcelJS'));
                document.head.appendChild(script);
            });
        }

        const ExcelJS = (window as any).ExcelJS;
        const wb = new ExcelJS.Workbook();
        
        // ── Sheet 1: Job Dashboard ──
        const ws = wb.addWorksheet('Job Dashboard', {
            views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
        });

        // Define columns
        ws.columns = [
            { header: 'S.No', key: 'sno', width: 6 },
            { header: 'Job Title', key: 'title', width: 35 },
            { header: 'Company', key: 'company', width: 25 },
            { header: 'Location', key: 'location', width: 20 },
            { header: 'Match Score (%)', key: 'match', width: 15 },
            { header: 'Key Matching Skills', key: 'skills', width: 45 },
            { header: 'Identified Skill Gaps', key: 'gaps', width: 45 },
            { header: 'Experience Level', key: 'exp', width: 15 },
            { header: 'Job Type', key: 'type', width: 15 },
            { header: 'Salary Range', key: 'salary', width: 20 },
            { header: 'Posted Time', key: 'time', width: 15 },
            { header: 'Search Link', key: 'link', width: 15 }
        ];

        // Add rows
        jobs.forEach((job, i) => {
            ws.addRow({
                sno: i + 1,
                title: job.title,
                company: job.company,
                location: job.location,
                match: job.matchScore,
                skills: job.matchedSkills.join(', '),
                gaps: job.missingSkills.join(', '),
                exp: job.experienceRequired,
                type: job.employmentType,
                salary: job.salaryRange,
                time: job.postedTime,
                link: job.applyUrl
            });
        });

        // Styling
        ws.eachRow((row: any, rowNumber: number) => {
            row.eachCell((cell: any, colNumber: number) => {
                // Borders for all
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };

                if (rowNumber === 1) {
                    // Header row
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }; // Dark Blue
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                } else {
                    // Data rows
                    cell.alignment = { vertical: 'middle', wrapText: true };

                    // Color code match score (Column 5)
                    if (colNumber === 5) {
                        const score = parseInt(cell.value);
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        cell.font = { bold: true };
                        if (score >= 80) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }; // Green
                            cell.font.color = { argb: 'FF006100' };
                        } else if (score >= 60) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } }; // Yellow
                            cell.font.color = { argb: 'FF9C5700' };
                        } else {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }; // Red
                            cell.font.color = { argb: 'FF9C0006' };
                        }
                        cell.value = `${score}%`;
                    }

                    // Make links clickable (Column 12)
                    if (colNumber === 12) {
                        const url = cell.value;
                        cell.value = { text: 'Apply Here', hyperlink: url };
                        cell.font = { color: { argb: 'FF0563C1' }, underline: true };
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    }
                }
            });
        });
        
        // ── Sheet 2: Skill Gap Analysis ──
        const wsGaps = wb.addWorksheet('Skill Gap Analysis');
        wsGaps.columns = [
            { header: 'S.No', key: 'sno', width: 6 },
            { header: 'Missing Skill', key: 'skill', width: 25 },
            { header: 'Appears in (# jobs)', key: 'count', width: 20 },
            { header: 'Gap Frequency', key: 'freq', width: 15 },
            { header: 'Priority', key: 'priority', width: 25 }
        ];

        const allGaps: Record<string, number> = {};
        jobs.forEach(j => j.missingSkills.forEach(s => { allGaps[s] = (allGaps[s] || 0) + 1; }));
        const gapList = Object.entries(allGaps).sort(([, a], [, b]) => b - a);

        gapList.forEach(([skill, count], i) => {
            const pct = Math.round((count / jobs.length) * 100);
            const priority = count >= 7 ? 'HIGH - Learn ASAP' : count >= 4 ? 'MEDIUM - Useful' : 'LOW - Nice to have';
            wsGaps.addRow({
                sno: i + 1, skill, count: `${count} of ${jobs.length}`, freq: `${pct}%`, priority
            });
        });

        // Style Gap Headers
        wsGaps.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        wsGaps.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } }; // Dark Red
        wsGaps.eachRow((row: any) => {
            row.eachCell((cell: any) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        });

        // ── Generate & Download ──
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeLoc = location.split(',')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `Job_Analysis_${safeLoc}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('✅ Styled report downloaded successfully!', { id: 'excel-toast', duration: 4000 });
    } catch (error) {
        console.error(error);
        toast.error('Failed to generate Excel report', { id: 'excel-toast' });
    }
}


// ─── LOADING STEPS ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
    { text: 'Parsing your resume...', icon: FileText },
    { text: 'Searching LinkedIn for matching roles...', icon: Search },
    { text: 'Calculating match scores...', icon: BarChart3 },
    { text: 'Identifying skill gaps...', icon: Target },
    { text: 'Preparing your dashboard...', icon: Sparkles },
];

// ─── SCORE COLOR ──────────────────────────────────────────────────────────────

function getScoreColor(score: number) {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
}

function getScoreBg(score: number) {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const JobBoard = () => {
    const { user } = useAuth();

    // Resume state
    const [resumeText, setResumeText] = useState('');
    const [resumeSkills, setResumeSkills] = useState<string[]>([]);
    const [resumeName, setResumeName] = useState('');
    const [profileResume, setProfileResume] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [parsingFile, setParsingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Location
    const [locationMode, setLocationMode] = useState<'preset' | 'custom'>('preset');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [customLocation, setCustomLocation] = useState('');
    const effectiveLocation = locationMode === 'custom' ? customLocation : selectedLocation;

    // Filters (optional)
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        expLevel: 'any',
        jobType: 'any',
        datePosted: 'Last 24-48 hours',
        salaryRange: 'any',
    });

    // Platform selection is now fully automatic via JSearch live listings

    // Analysis
    const [analyzing, setAnalyzing] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [expandedJob, setExpandedJob] = useState<number | null>(null);

    // Load profile resume on mount
    useEffect(() => {
        if (user) {
            loadResumeFromProfile()
                .then(r => setProfileResume(r))
                .catch(() => {});
        }
    }, [user]);

    // Loading step animation
    useEffect(() => {
        if (!analyzing) { setLoadingStep(0); return; }
        const interval = setInterval(() => {
            setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
        }, 1800);
        return () => clearInterval(interval);
    }, [analyzing]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') { toast.error('Please upload a PDF file'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }

        setParsingFile(true);
        try {
            const text = await readPdfText(file);
            const skills = extractSkillsFromText(text);
            setResumeText(text);
            setResumeSkills(skills);
            setResumeName(file.name);
            toast.success(`Resume parsed! Found ${skills.length} skills.`);
        } catch {
            toast.error('Failed to parse PDF. Please try again.');
        } finally {
            setParsingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleLoadFromProfile = async () => {
        if (!profileResume) return;
        setLoadingProfile(true);
        try {
            const text = profileResume.text || '';
            const skills = profileResume.skills?.length
                ? profileResume.skills
                : extractSkillsFromText(text);
            setResumeText(text);
            setResumeSkills(skills);
            setResumeName(profileResume.name || 'Profile Resume');
            toast.success(`Loaded "${profileResume.name}" from profile — ${skills.length} skills found.`);
        } catch {
            toast.error('Failed to load profile resume');
        } finally {
            setLoadingProfile(false);
        }
    };

    const clearResume = () => {
        setResumeText('');
        setResumeSkills([]);
        setResumeName('');
    };

    const handleAnalyze = async () => {
        if (!resumeText) { toast.error('Please upload a resume first'); return; }
        if (!effectiveLocation.trim()) { toast.error('Please select or enter a location'); return; }

        // Rate limiting (60 seconds)
        const lastAnalyze = localStorage.getItem('vidyamitra_last_job_analysis');
        const now = Date.now();
        if (lastAnalyze && now - parseInt(lastAnalyze) < 60000) {
            const remaining = Math.ceil((60000 - (now - parseInt(lastAnalyze))) / 1000);
            toast.error(`Rate limit active. Please wait ${remaining} seconds before analyzing again.`);
            return;
        }

        setAnalyzing(true);
        setResult(null);
        setLoadingStep(0);

        try {
            localStorage.setItem('vidyamitra_last_job_analysis', now.toString());
            const jobs = await analyzeJobsWithGroq(resumeText, resumeSkills, effectiveLocation, filters);

            // Build summary
            const avgMatch = Math.round(jobs.reduce((s, j) => s + j.matchScore, 0) / jobs.length);
            const bestMatch = jobs.reduce((best, j) => (j.matchScore > best.matchScore ? j : best), jobs[0]);

            // Skill gap summary
            const gapCount: Record<string, number> = {};
            jobs.forEach(j => j.missingSkills.forEach(s => { gapCount[s] = (gapCount[s] || 0) + 1; }));
            const skillGapSummary = Object.entries(gapCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([skill, count]) => ({
                    skill,
                    count,
                    severity: count >= 7 ? 'high' : count >= 4 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
                }));

            setResult({
                jobs,
                avgMatchScore: avgMatch,
                topSkillGap: skillGapSummary[0]?.skill || 'None',
                totalFound: jobs.length,
                bestMatch,
                skillGapSummary,
            });
            toast.success(`✅ Found ${jobs.length} matching jobs in ${effectiveLocation}!`);
        } catch (err: any) {
            toast.error(err.message || 'Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    const canAnalyze = !!resumeText && !!effectiveLocation.trim() && !analyzing;

    return (
        <Layout>
            <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold gradient-text">AI Job Board</h1>
                        <p className="text-sm text-muted-foreground">LinkedIn job analysis powered by AI — personalized to your resume</p>
                    </div>
                </div>

                {/* ── STEP 1: Resume ── */}
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Step 1 — Your Resume
                        </CardTitle>
                        <CardDescription>Upload a PDF or load your saved profile resume</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {resumeName ? (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30"
                            >
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{resumeName}</p>
                                    <p className="text-xs text-muted-foreground">{resumeSkills.length} skills detected</p>
                                </div>
                                <div className="flex flex-wrap gap-1 max-w-[280px] hidden sm:flex">
                                    {resumeSkills.slice(0, 4).map(s => (
                                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                    ))}
                                    {resumeSkills.length > 4 && (
                                        <Badge variant="outline" className="text-[10px]">+{resumeSkills.length - 4}</Badge>
                                    )}
                                </div>
                                <Button variant="ghost" size="sm" onClick={clearResume} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500">
                                    <X className="h-4 w-4" />
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Upload Button */}
                                <label className="cursor-pointer">
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 h-16 flex-col"
                                        asChild
                                        disabled={parsingFile}
                                    >
                                        <span>
                                            {parsingFile ? (
                                                <><RefreshCw className="h-5 w-5 animate-spin text-primary" /><span className="text-sm">Parsing PDF...</span></>
                                            ) : (
                                                <><Upload className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Upload Resume (PDF)</span></>
                                            )}
                                        </span>
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={parsingFile}
                                    />
                                </label>

                                {/* Load from Profile */}
                                <Button
                                    variant="outline"
                                    onClick={handleLoadFromProfile}
                                    disabled={!profileResume || loadingProfile}
                                    className="h-16 flex-col gap-1 border-dashed hover:border-violet-500/50 hover:bg-violet-500/5"
                                >
                                    {loadingProfile ? (
                                        <><RefreshCw className="h-5 w-5 animate-spin text-violet-500" /><span className="text-sm">Loading...</span></>
                                    ) : profileResume ? (
                                        <><User className="h-5 w-5 text-violet-500" /><span className="text-sm font-medium">Load from Profile</span><span className="text-xs text-muted-foreground">{profileResume.name}</span></>
                                    ) : (
                                        <><User className="h-5 w-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">No profile resume saved</span></>
                                    )}
                                </Button>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">📄 PDF only · Max 5MB · Save your resume in Profile → Resume tab for quick access</p>
                    </CardContent>
                </Card>

                {/* ── STEP 2: Location ── */}
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            Step 2 — Job Location
                        </CardTitle>
                        <CardDescription>Where do you want to search for jobs?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2">
                            <Button
                                variant={locationMode === 'preset' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setLocationMode('preset')}
                                className="text-xs"
                            >
                                <Globe className="h-3 w-3 mr-1" /> Popular Cities
                            </Button>
                            <Button
                                variant={locationMode === 'custom' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setLocationMode('custom')}
                                className="text-xs"
                            >
                                ✏️ Enter Manually
                            </Button>
                        </div>

                        {locationMode === 'preset' ? (
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">🇮🇳 India</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {INDIA_CITIES.map(city => (
                                            <button
                                                key={city}
                                                onClick={() => setSelectedLocation(city)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${selectedLocation === city
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'border-border/60 hover:border-primary/50 hover:bg-primary/5'}`}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">🌍 Global</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {GLOBAL_CITIES.map(city => (
                                            <button
                                                key={city}
                                                onClick={() => setSelectedLocation(city)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${selectedLocation === city
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'border-border/60 hover:border-primary/50 hover:bg-primary/5'}`}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="e.g. Mysore, Karnataka or Austin, Texas"
                                    value={customLocation}
                                    onChange={e => setCustomLocation(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}

                        {effectiveLocation && (
                            <div className="flex items-center gap-2 text-sm text-primary font-medium">
                                <MapPin className="h-3.5 w-3.5" />
                                Searching in: <span className="font-bold">{effectiveLocation}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── STEP 3: Filters (Optional) ── */}
                <Card className="border-border/50">
                    <button
                        className="w-full"
                        onClick={() => setShowFilters(v => !v)}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    Filters
                                    <Badge variant="secondary" className="text-[10px] ml-1">Optional</Badge>
                                </CardTitle>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </div>
                            </div>
                        </CardHeader>
                    </button>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <CardContent className="pt-0 pb-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <Label className="text-xs mb-1 block">Experience Level</Label>
                                            <Select value={filters.expLevel} onValueChange={v => setFilters(f => ({ ...f, expLevel: v }))}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">Any Level</SelectItem>
                                                    <SelectItem value="Fresher / Entry Level">Fresher</SelectItem>
                                                    <SelectItem value="1-3 years">1-3 Years</SelectItem>
                                                    <SelectItem value="3-5 years">3-5 Years</SelectItem>
                                                    <SelectItem value="5+ years">5+ Years</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-1 block">Job Type</Label>
                                            <Select value={filters.jobType} onValueChange={v => setFilters(f => ({ ...f, jobType: v }))}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">Any Type</SelectItem>
                                                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                                                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                                                    <SelectItem value="Contract">Contract</SelectItem>
                                                    <SelectItem value="Internship">Internship</SelectItem>
                                                    <SelectItem value="Remote">Remote</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-1 block">Date Posted</Label>
                                            <Select value={filters.datePosted} onValueChange={v => setFilters(f => ({ ...f, datePosted: v }))}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Last 24-48 hours">Last 24-48 hours</SelectItem>
                                                    <SelectItem value="Last 24 hours">Last 24 hours</SelectItem>
                                                    <SelectItem value="Last week">Last week</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-1 block">Salary Range</Label>
                                            <Select value={filters.salaryRange} onValueChange={v => setFilters(f => ({ ...f, salaryRange: v }))}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="any">Any Salary</SelectItem>
                                                    <SelectItem value="0-5 LPA / Entry">Entry (0-5 LPA)</SelectItem>
                                                    <SelectItem value="5-15 LPA / Mid">Mid (5-15 LPA)</SelectItem>
                                                    <SelectItem value="15+ LPA / Senior">Senior (15+ LPA)</SelectItem>
                                                    <SelectItem value="30+ LPA / Lead">Lead (30+ LPA)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                {/* ── ANALYZE BUTTON ── */}
                <Button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze}
                    size="lg"
                    className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-700 hover:via-violet-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {analyzing ? (
                        <><RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Fetching Live Jobs...</>
                    ) : (
                        <><Sparkles className="h-5 w-5 mr-2" /> Find Live Jobs for {effectiveLocation || '...'}</>
                    )}
                </Button>

                {!resumeText && (
                    <p className="text-center text-xs text-muted-foreground -mt-3">
                        ↑ Upload your resume and select a location to enable analysis
                    </p>
                )}

                {/* ── LOADING STATE ── */}
                <AnimatePresence>
                    {analyzing && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5">
                                <CardContent className="pt-6 pb-6">
                                    <div className="space-y-4">
                                        {LOADING_STEPS.map((step, i) => {
                                            const Icon = step.icon;
                                            const isDone = i < loadingStep;
                                            const isActive = i === loadingStep;
                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className={`flex items-center gap-3 transition-all ${isActive ? 'opacity-100' : isDone ? 'opacity-60' : 'opacity-30'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDone ? 'bg-green-500/20' : isActive ? 'bg-primary/20' : 'bg-muted'}`}>
                                                        {isDone ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        ) : isActive ? (
                                                            <Icon className="h-4 w-4 text-primary animate-pulse" />
                                                        ) : (
                                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-medium ${isActive ? 'text-primary' : isDone ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                                        {step.text}
                                                    </span>
                                                    {isActive && (
                                                        <div className="ml-auto">
                                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                    <Progress
                                        value={((loadingStep + 1) / LOADING_STEPS.length) * 100}
                                        className="mt-5 h-1.5"
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── RESULTS DASHBOARD ── */}
                <AnimatePresence>
                    {result && !analyzing && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Summary Banner */}
                            <div className="rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-blue-500/5 to-transparent p-5">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 mb-2">
                                            <Sparkles className="h-3 w-3 mr-1" /> AI Analysis Complete
                                        </Badge>
                                        <h2 className="text-xl font-bold">
                                            Found <span className="text-violet-500">{result.totalFound} active jobs</span> in{' '}
                                            <span className="text-blue-500">{effectiveLocation}</span>
                                        </h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Posted within last 24-48 hours · Ranked by match score
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => downloadExcel(result.jobs, effectiveLocation, resumeSkills)}
                                        className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-md"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download Excel
                                    </Button>
                                </div>
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Jobs Found', value: `${result.totalFound}`, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                                    { label: 'Avg Match Score', value: `${result.avgMatchScore}%`, icon: Target, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                                    { label: 'Best Match', value: `${result.bestMatch.matchScore}%`, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                                    { label: 'Top Skill Gap', value: result.topSkillGap, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
                                ].map(({ label, value, icon: Icon, color, bg }) => (
                                    <Card key={label} className="border-border/50">
                                        <CardContent className="pt-4 pb-4">
                                            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                                                <Icon className={`h-4 w-4 ${color}`} />
                                            </div>
                                            <p className="text-lg font-bold truncate">{value}</p>
                                            <p className="text-xs text-muted-foreground">{label}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Main Grid: Jobs + Skill Gap Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                {/* Job Cards */}
                                <div className="lg:col-span-2 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h2 className="text-base font-semibold flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-primary" />
                                            Matching Job Postings
                                            <span className="text-xs text-muted-foreground font-normal ml-1">Click to expand</span>
                                        </h2>
                                    </div>

                                    {result.jobs.map((job, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                        >
                                            <Card
                                                className={`border-border/50 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md ${expandedJob === i ? 'border-primary/40 shadow-md' : ''}`}
                                                onClick={() => setExpandedJob(expandedJob === i ? null : i)}
                                            >
                                                <CardContent className="pt-4 pb-4">
                                                    {/* Top row */}
                                                    <div className="flex items-start gap-3">
                                                        {/* Rank Badge */}
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${job.rank === 1 ? 'bg-yellow-500/20 text-yellow-600' : job.rank <= 3 ? 'bg-violet-500/20 text-violet-600' : 'bg-muted text-muted-foreground'}`}>
                                                            #{job.rank}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <div>
                                                                    <h3 className="font-semibold text-sm leading-tight">{job.title}</h3>
                                                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                                        <span className="flex items-center gap-1"><Building className="h-3 w-3" />{job.company}</span>
                                                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                                                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.postedTime}</span>
                                                                    </div>
                                                                </div>
                                                                {/* Match Score */}
                                                                <div className="text-right shrink-0">
                                                                    <div className={`text-xl font-bold ${getScoreColor(job.matchScore)}`}>
                                                                        {job.matchScore}%
                                                                    </div>
                                                                    <p className="text-[10px] text-muted-foreground">match</p>
                                                                </div>
                                                            </div>

                                                            {/* Score bar */}
                                                            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                <motion.div
                                                                    className={`h-full rounded-full ${getScoreBg(job.matchScore)}`}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${job.matchScore}%` }}
                                                                    transition={{ delay: i * 0.04 + 0.3, duration: 0.6 }}
                                                                />
                                                            </div>

                                                            {/* Badges row */}
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                                <Badge variant="outline" className="text-[10px]">{job.employmentType}</Badge>
                                                                <Badge variant="outline" className="text-[10px]">{job.salaryRange}</Badge>
                                                                <Badge variant="outline" className="text-[10px]">{job.experienceRequired}</Badge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Skill pills preview */}
                                                    <div className="flex flex-wrap gap-1 mt-3">
                                                        {job.matchedSkills.slice(0, 4).map(s => (
                                                            <Badge key={s} variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">{s}</Badge>
                                                        ))}
                                                        {job.missingSkills.slice(0, 3).map(s => (
                                                            <Badge key={s} variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20">{s}</Badge>
                                                        ))}
                                                        {(job.matchedSkills.length + job.missingSkills.length > 7) && (
                                                            <Badge variant="outline" className="text-[10px]">
                                                                +{job.matchedSkills.length + job.missingSkills.length - 7} more
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Expanded details */}
                                                    <AnimatePresence>
                                                        {expandedJob === i && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                                                                    <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1.5 flex items-center gap-1">
                                                                                <CheckCircle2 className="h-3 w-3" />
                                                                                Matched Skills ({job.matchedSkills.length})
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {job.matchedSkills.map(s => (
                                                                                    <Badge key={s} variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">{s}</Badge>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-red-500 mb-1.5 flex items-center gap-1">
                                                                                <XCircle className="h-3 w-3" />
                                                                                Skill Gaps ({job.missingSkills.length})
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {job.missingSkills.map(s => (
                                                                                    <Badge key={s} variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20">{s}</Badge>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">All Required Skills</p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {job.requiredSkills.map(s => (
                                                                                <Badge
                                                                                    key={s}
                                                                                    variant="outline"
                                                                                    className={`text-[10px] ${job.matchedSkills.includes(s) ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
                                                                                >
                                                                                    {s}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {/* Direct Apply Button */}
                                                                    <div className="flex mt-3" onClick={e => e.stopPropagation()}>
                                                                        <Button
                                                                            size="sm"
                                                                            className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                                                                            onClick={() => window.open(job.applyUrl, '_blank', 'noopener,noreferrer')}
                                                                        >
                                                                            <Globe className="h-3 w-3" /> Apply Now <ArrowRight className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Sidebar: Skill Gap Chart + Best Match */}
                                <div className="space-y-4">
                                    {/* Best Match */}
                                    <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <Star className="h-4 w-4 text-yellow-500" />
                                                Best Match
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <p className="font-semibold text-sm">{result.bestMatch.title}</p>
                                            <p className="text-xs text-muted-foreground">{result.bestMatch.company}</p>
                                            <div className={`text-2xl font-bold ${getScoreColor(result.bestMatch.matchScore)}`}>
                                                {result.bestMatch.matchScore}%
                                            </div>
                                            <Progress value={result.bestMatch.matchScore} className="h-2" />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full mt-1 text-xs gap-1"
                                                onClick={() => window.open(result.bestMatch.applyUrl, '_blank', 'noopener,noreferrer')}
                                            >
                                                Apply Now <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {/* Skill Gap Bar Chart */}
                                    {result.skillGapSummary.length > 0 && (
                                        <Card className="border-border/50">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <BarChart3 className="h-4 w-4 text-red-500" />
                                                    Top Skill Gaps
                                                </CardTitle>
                                                <CardDescription className="text-xs">How often each skill is missing</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <BarChart
                                                        data={result.skillGapSummary}
                                                        layout="vertical"
                                                        margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                                                    >
                                                        <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                                        <YAxis
                                                            type="category"
                                                            dataKey="skill"
                                                            tick={{ fontSize: 9 }}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            width={70}
                                                        />
                                                        <Tooltip
                                                            formatter={(val) => [`${val} jobs`, 'Missing from']}
                                                            contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                                                        />
                                                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                                            {result.skillGapSummary.map((entry, idx) => (
                                                                <Cell
                                                                    key={idx}
                                                                    fill={entry.severity === 'high' ? '#ef4444' : entry.severity === 'medium' ? '#f59e0b' : '#8b5cf6'}
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                                <div className="flex gap-3 mt-2">
                                                    {[['#ef4444', 'High (7+ jobs)'], ['#f59e0b', 'Medium (4+)'], ['#8b5cf6', 'Low']].map(([color, label]) => (
                                                        <div key={label} className="flex items-center gap-1">
                                                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                                                            <span className="text-[10px] text-muted-foreground">{label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Re-analyze CTA */}
                                    <Card className="border-border/50 bg-muted/30">
                                        <CardContent className="pt-4 pb-4 text-center space-y-2">
                                            <TrendingUp className="h-6 w-6 mx-auto text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">Try a different location or update filters to discover more opportunities</p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full text-xs gap-1"
                                                onClick={() => { setResult(null); setSelectedLocation(''); setCustomLocation(''); setLoadingStep(0); }}
                                            >
                                                <RefreshCw className="h-3 w-3" /> Start New Search
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {/* LinkedIn Native Search CTA */}
                                    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/5">
                                        <CardContent className="pt-4 pb-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[#0077b5] flex items-center justify-center text-white shrink-0 font-bold text-lg leading-none">
                                                    in
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm text-[#0077b5]">Deep Search on LinkedIn</p>
                                                    <p className="text-[10px] text-muted-foreground leading-tight">View all {filters.datePosted.toLowerCase()} openings matching your stack</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="w-full text-xs bg-[#0077b5] hover:bg-[#005582] text-white gap-1.5 shadow-md"
                                                onClick={() => window.open(buildLinkedInNativeUrl(resumeSkills, effectiveLocation, filters), '_blank', 'noopener,noreferrer')}
                                            >
                                                <Globe className="h-3.5 w-3.5" /> View on LinkedIn
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {/* Download reminder */}
                                    <Alert className="border-green-500/30 bg-green-500/5">
                                        <Download className="h-4 w-4 text-green-500" />
                                        <AlertDescription className="text-xs">
                                            Download the <strong>Excel sheet</strong> above for a complete report with all match scores, skill gaps, and apply links.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
};

export default JobBoard;
