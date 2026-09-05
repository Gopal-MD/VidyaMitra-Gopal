/**
 * VidyaMitra API Client
 * Replaces all Firebase SDK calls with REST API calls to our Vite server.
 * All API keys stay server-side.
 */

const API_BASE = '';

// Token management
let authToken: string | null = localStorage.getItem('vidyamitra_token');

export function setAuthToken(token: string | null) {
    authToken = token;
    if (token) {
        localStorage.setItem('vidyamitra_token', token);
    } else {
        localStorage.removeItem('vidyamitra_token');
    }
}

export function getAuthToken(): string | null {
    return authToken;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    // Guard against non-JSON responses (e.g. Vite serving HTML for unmatched routes)
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        if (!res.ok) {
            throw new Error(`API error: ${res.status} (non-JSON response)`);
        }
        // Try parsing anyway, but wrap in try-catch
        try {
            const data = await res.json();
            return data;
        } catch {
            throw new Error(`API error: received non-JSON response from ${path}`);
        }
    }

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || `API error: ${res.status}`);
    }
    return data;
}

// ==================== AUTH ====================
export const authApi = {
    login: (email: string, password: string) =>
        apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    signup: (email: string, password: string, name?: string, studentCategory?: string, institutionId?: string) =>
        apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name, studentCategory, institutionId }) }),

    institutionLogin: (institutionId: string, password: string) =>
        apiFetch('/api/auth/institution/login', { method: 'POST', body: JSON.stringify({ institutionId, password }) }),

    me: () => apiFetch('/api/auth/me'),

    logout: () => {
        const result = apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
        setAuthToken(null);
        return result;
    },
};

// ==================== GEMINI PROXY ====================
export const geminiApi = {
    generate: (prompt: string, temperature?: number, maxTokens?: number) =>
        apiFetch('/api/gemini/generate', {
            method: 'POST',
            body: JSON.stringify({ prompt, temperature, maxTokens }),
        }),
};

// ==================== YOUTUBE PROXY ====================
export const youtubeApi = {
    search: (query: string, maxResults = 3) =>
        apiFetch(`/api/youtube/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`),
};

// ==================== PEXELS PROXY ====================
export const pexelsApi = {
    search: (query: string) =>
        apiFetch(`/api/pexels/search?q=${encodeURIComponent(query)}`),
};

// ==================== NEWS PROXY ====================
export const newsApi = {
    search: (query = 'technology jobs') =>
        apiFetch(`/api/news/search?q=${encodeURIComponent(query)}`),
};

// ==================== EXCHANGE RATE PROXY ====================
export const exchangeApi = {
    getRates: () => apiFetch('/api/exchange-rates'),
};

// ==================== INTERVIEWS ====================
export const interviewsApi = {
    getAll: (allAdmin = false) =>
        apiFetch(`/api/interviews${allAdmin ? '?all=true' : ''}`),

    save: (interview: any) =>
        apiFetch('/api/interviews', { method: 'POST', body: JSON.stringify(interview) }),

    delete: (id: string) =>
        apiFetch(`/api/interviews/${id}`, { method: 'DELETE' }),
};

// ==================== PRACTICE APTITUDE ====================
export const practiceAptitudeApi = {
    getHistory: () => apiFetch('/api/practice-aptitude'),
    save: (result: any) =>
        apiFetch('/api/practice-aptitude', { method: 'POST', body: JSON.stringify(result) }),
};

// ==================== PRACTICE INTERVIEWS ====================
export const practiceInterviewsApi = {
    getHistory: () => apiFetch('/api/practice-interviews'),
    save: (result: any) =>
        apiFetch('/api/practice-interviews', { method: 'POST', body: JSON.stringify(result) }),
};

// ==================== BOT INTERVIEWS ====================
export const botInterviewsApi = {
    getHistory: () => apiFetch('/api/bot-interviews'),
    save: (result: any) =>
        apiFetch('/api/bot-interviews', { method: 'POST', body: JSON.stringify(result) }),
};

// ==================== PRACTICE CODING ====================
export const practiceCodingApi = {
    getSessions: () => apiFetch('/api/practice-coding'),
    save: (session: any) =>
        apiFetch('/api/practice-coding', { method: 'POST', body: JSON.stringify(session) }),
};

// ==================== RESUMES ====================
export const resumesApi = {
    getAll: () => apiFetch('/api/resumes'),
    save: (resume: any) =>
        apiFetch('/api/resumes', { method: 'POST', body: JSON.stringify(resume) }),
};

// ==================== ROUND 1 APTITUDE ====================
export const round1Api = {
    getResults: (allAdmin = false) =>
        apiFetch(`/api/round1-aptitude${allAdmin ? '?all=true' : ''}`),
    save: (result: any) =>
        apiFetch('/api/round1-aptitude', { method: 'POST', body: JSON.stringify(result) }),
    update: (id: string, updates: any) =>
        apiFetch(`/api/round1-aptitude/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
};

// ==================== CAREER PLAN ====================
export const careerPlanApi = {
    generate: (targetRole: string, skillGaps: string[]) =>
        apiFetch('/api/career-plan', { method: 'POST', body: JSON.stringify({ targetRole, skillGaps }) }),
    getAll: () => apiFetch('/api/career-plan'),
};

// ==================== ROADMAP CHART (Groq + Mermaid) ====================
export const roadmapChartApi = {
    generate: (params: { targetRole: string; timeline?: string; currentSkills?: string; skillsToLearn?: string; notes?: string }) =>
        apiFetch('/api/roadmap-chart', { method: 'POST', body: JSON.stringify(params) }),
};

// ==================== RESUME BUILDER ====================
export const resumeBuilderApi = {
    save: (data: any) =>
        apiFetch('/api/resume-builder', { method: 'POST', body: JSON.stringify(data) }),
    getAll: () => apiFetch('/api/resume-builder'),
};

// ==================== ADMIN ====================
export const adminApi = {
    getUsers: () => apiFetch('/api/admin/users'),
    getStats: () => apiFetch('/api/admin/stats'),
    getInstitutions: () => apiFetch('/api/admin/institutions'),
    createInstitution: (data: any) =>
        apiFetch('/api/admin/institutions/create', { method: 'POST', body: JSON.stringify(data) }),
    updateInstitution: (id: string, data: any) =>
        apiFetch(`/api/admin/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    seedTestCandidates: () =>
        apiFetch('/api/admin/seed-test-candidates', { method: 'POST' }),
};

// ==================== EMAIL (EmailJS — browser-side, no server needed) ====================
export const emailApi = {
    sendRound2Email: async (data: { to_email: string; to_name: string; role_name: string; round1_score?: number }) => {
        const { sendRound2InvitationEmail } = await import('@/utils/emailService');
        const result = await sendRound2InvitationEmail(
            data.to_email,
            data.to_name,
            data.role_name,
            data.round1_score ?? 0
        );
        if (!result.success) {
            throw new Error(result.error || 'Failed to send email via EmailJS');
        }
        return result;
    },

    sendRound3Email: async (data: { to_email: string; to_name: string; role_name: string; round2_score?: number }) => {
        const { sendRound3InvitationEmail } = await import('@/utils/emailService');
        const result = await sendRound3InvitationEmail(
            data.to_email,
            data.to_name,
            data.role_name,
            data.round2_score ?? 0
        );
        if (!result.success) {
            throw new Error(result.error || 'Failed to send Round 3 email via EmailJS');
        }
        return result;
    },
};

// ==================== ROUND 2 CODING ====================
export const round2Api = {
    /** Check if current user has already completed Round 2 */
    getMyResult: () => apiFetch('/api/round2-coding/mine'),
    /** Save a completed Round 2 session */
    save: (session: any) =>
        apiFetch('/api/round2-coding', { method: 'POST', body: JSON.stringify(session) }),
    /** Admin: get all Round 2 results */
    getAll: () => apiFetch('/api/round2-coding?all=true'),
    /** Admin: reschedule (reset completion flag) for a user */
    reschedule: (userId: string) =>
        apiFetch(`/api/round2-coding/${userId}/reschedule`, { method: 'POST' }),
    /** Admin: select for Round 3 and mark */
    selectForRound3: (resultId: string) =>
        apiFetch(`/api/round2-coding/${resultId}/select-round3`, { method: 'POST' }),
};


// ==================== INSTITUTIONS ====================
export const institutionsApi = {
    getList: () => apiFetch('/api/institutions/list'),
    getStudents: (institutionId: string) => apiFetch(`/api/institutions/${institutionId}/students`),
    getAnalytics: (institutionId: string) => apiFetch(`/api/institutions/${institutionId}/analytics`),
};

// ==================== SUBSCRIPTIONS ====================
export const subscriptionsApi = {
    getPlans: () => apiFetch('/api/subscription/plans'),
    getInstitutionSubscription: () => apiFetch('/api/institution/subscription'),
    getUsage: () => apiFetch('/api/institution/usage'),
    subscribe: (planId: string) => 
        apiFetch('/api/institution/subscribe', { method: 'POST', body: JSON.stringify({ planId }) }),
    verifyPayment: (subscriptionId: string, paymentId?: string, signature?: string) =>
        apiFetch('/api/institution/verify-payment', { method: 'POST', body: JSON.stringify({ subscriptionId, paymentId, signature }) }),
    trackInterview: (interviewId: string, interviewType: string, isVoice: boolean = false) =>
        apiFetch('/api/institution/track-interview', { 
            method: 'POST', 
            body: JSON.stringify({ interviewId, interviewType, isVoice }) 
        }),
    getPaymentHistory: () => apiFetch('/api/institution/payment-history'),
};

// ==================== ROLES ====================
export const rolesApi = {
    getAll: () => apiFetch('/api/roles'),
    update: (roleId: string, isOpen: boolean) =>
        apiFetch('/api/roles', { method: 'POST', body: JSON.stringify({ roleId, isOpen }) }),
};

// ==================== S3 FILE MANAGEMENT ====================
export const s3Api = {
    listFiles: (prefix?: string, limit?: number, token?: string) => {
        const params = new URLSearchParams();
        if (prefix) params.set('prefix', prefix);
        if (limit) params.set('limit', String(limit));
        if (token) params.set('token', token);
        return apiFetch(`/api/s3/files?${params.toString()}`);
    },
    getDownloadUrl: (key: string) =>
        apiFetch(`/api/s3/download?key=${encodeURIComponent(key)}`),
    getUploadUrl: (fileName: string, contentType: string, folder: string) =>
        apiFetch('/api/s3/upload-url', {
            method: 'POST',
            body: JSON.stringify({ fileName, contentType, folder }),
        }),
    deleteFile: (key: string) =>
        apiFetch(`/api/s3/delete?key=${encodeURIComponent(key)}`, { method: 'DELETE' }),
    bulkDelete: (keys: string[]) =>
        apiFetch('/api/s3/bulk-delete', { method: 'POST', body: JSON.stringify({ keys }) }),
    getStats: () => apiFetch('/api/s3/stats'),
    // Upload a file to S3 using presigned URL
    uploadFile: async (file: File, folder: string) => {
        const { uploadUrl, key } = await apiFetch('/api/s3/upload-url', {
            method: 'POST',
            body: JSON.stringify({ fileName: file.name, contentType: file.type, folder }),
        });
        const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });
        if (!putRes.ok) {
            throw new Error(`S3 upload failed (${putRes.status}): ${putRes.statusText || 'check AWS credentials / CORS'}`);
        }
        return { key, fileName: file.name, size: file.size };
    },
};

// ==================== SNS MARKETING ====================
export const snsApi = {
    // Topics
    createTopic: (name: string, displayName?: string, description?: string) =>
        apiFetch('/api/sns/topics/create', {
            method: 'POST',
            body: JSON.stringify({ name, displayName, description }),
        }),
    listTopics: () => apiFetch('/api/sns/topics'),
    getTopicDetails: (arn: string) =>
        apiFetch(`/api/sns/topics/details?arn=${encodeURIComponent(arn)}`),
    deleteTopic: (arn: string) =>
        apiFetch(`/api/sns/topics/delete?arn=${encodeURIComponent(arn)}`, { method: 'DELETE' }),
    
    // Subscriptions
    subscribe: (topicArn: string, email: string) =>
        apiFetch('/api/sns/subscribe', {
            method: 'POST',
            body: JSON.stringify({ topicArn, email }),
        }),
    bulkSubscribe: (topicArn: string, emails: string[]) =>
        apiFetch('/api/sns/subscribe/bulk', {
            method: 'POST',
            body: JSON.stringify({ topicArn, emails }),
        }),
    unsubscribe: (subscriptionArn: string) =>
        apiFetch(`/api/sns/unsubscribe?arn=${encodeURIComponent(subscriptionArn)}`, { method: 'DELETE' }),
    listSubscriptions: (topicArn: string) =>
        apiFetch(`/api/sns/subscriptions?arn=${encodeURIComponent(topicArn)}`),
    
    // Publishing
    publish: (topicArn: string, subject: string, message: string) =>
        apiFetch('/api/sns/publish', {
            method: 'POST',
            body: JSON.stringify({ topicArn, subject, message }),
        }),
};

// ==================== PLATFORM PARTNERS ====================
export const platformApi = {
    // Admin: CRUD for platform partners
    getAll: () => apiFetch('/api/admin/platforms'),
    create: (data: { name: string; description?: string; base_url: string; agreement_start?: string; agreement_end?: string; is_enabled?: boolean }) =>
        apiFetch('/api/admin/platforms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name: string; description?: string; base_url: string; agreement_start?: string; agreement_end?: string; is_enabled?: boolean }) =>
        apiFetch(`/api/admin/platforms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
        apiFetch(`/api/admin/platforms/${id}`, { method: 'DELETE' }),

    // Admin: course mode settings
    getSettings: () => apiFetch('/api/admin/platform-settings'),
    saveSettings: (mode: 'groq' | 'platform' | 'combined') =>
        apiFetch('/api/admin/platform-settings', { method: 'POST', body: JSON.stringify({ mode }) }),

    // Public: get active platforms + current mode (used by user-facing pages)
    getActivePlatforms: () => apiFetch('/api/platform-courses'),
};
