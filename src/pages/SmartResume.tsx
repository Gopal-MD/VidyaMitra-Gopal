import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Upload, FileText, CheckCircle, XCircle, AlertCircle, Trophy, Download,
    Plus, Trash2, ChevronRight, ChevronLeft, Eye, Sparkles, GraduationCap, UserCircle,
    Building2, Search, Star, TrendingUp
} from 'lucide-react';
import { processResume, processResumeFromText } from '@/utils/atsParser';
import { ResumeData } from '@/types';
import { toast } from 'sonner';
import { geminiApi, resumeBuilderApi } from '@/lib/api';
import { generateResumeSkillGaps } from '@/utils/learningRecommendations';
import LearningRecommendations from '@/components/LearningRecommendations';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import { loadResumeFromProfile, saveResumeToProfile, logActivity, type SavedResume } from '@/utils/profileService';
import { 
    COMPANIES, COMPANY_JDS, getAllCompanies, getJD, getJDsByCompany, 
    scoreResumeAgainstJD, findBestRolesForResume, 
    type CompanyJD, type JDMatchResult, type RoleRecommendation 
} from '@/data/companyJDs';

const JOB_ROLES = [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'DevOps Engineer',
    'Cloud Architect', 'Cybersecurity Analyst', 'Product Manager', 'UI/UX Designer',
    'Mobile Developer', 'QA Engineer', 'Database Administrator', 'System Administrator',
    'Business Analyst', 'Project Manager', 'Technical Writer', 'Other'
];

const TEMPLATES = [
    // ── No-photo templates ──
    { id: 'modern',       name: 'Modern',           desc: 'Clean header with violet accent bar',          color: 'from-violet-500 to-purple-600',   hasPhoto: false },
    { id: 'classic',      name: 'Classic',           desc: 'Traditional centered header, black & white',   color: 'from-gray-600 to-gray-800',       hasPhoto: false },
    { id: 'executive',    name: 'Executive',         desc: 'Dark navy sidebar, bold right column',         color: 'from-slate-700 to-slate-900',     hasPhoto: false },
    { id: 'minimal',      name: 'Minimal',           desc: 'Ultra-clean, generous whitespace',             color: 'from-stone-400 to-stone-600',     hasPhoto: false },
    { id: 'techpro',      name: 'Tech Pro',          desc: 'Dark header, monospace accents',               color: 'from-cyan-600 to-blue-700',       hasPhoto: false },
    { id: 'elegant',      name: 'Elegant',           desc: 'Serif fonts, thin ruled lines',                color: 'from-amber-600 to-orange-700',    hasPhoto: false },
    { id: 'bold',         name: 'Bold Impact',       desc: 'Large name, strong section bars',              color: 'from-red-500 to-rose-700',        hasPhoto: false },
    { id: 'twoColumn',    name: 'Two-Column',        desc: 'Left skills/edu, right experience',            color: 'from-teal-500 to-emerald-600',    hasPhoto: false },
    { id: 'gradient',     name: 'Gradient',          desc: 'Purple-to-blue gradient header & accents',     color: 'from-purple-500 via-indigo-500 to-blue-500', hasPhoto: false },
    { id: 'corporate',    name: 'Corporate',         desc: 'Structured, formal, enterprise-ready',         color: 'from-blue-700 to-indigo-800',     hasPhoto: false },
    // ── Photo templates ──
    { id: 'photoModern',  name: 'Photo Modern',      desc: 'Circular photo + violet sidebar',              color: 'from-violet-600 to-fuchsia-600',  hasPhoto: true  },
    { id: 'photoClassic', name: 'Photo Classic',     desc: 'Top-right photo, traditional layout',          color: 'from-blue-500 to-blue-700',       hasPhoto: true  },
    { id: 'photoCreative',name: 'Photo Creative',    desc: 'Full left sidebar with photo & skills',        color: 'from-pink-500 to-rose-600',       hasPhoto: true  },
    { id: 'photoExecutive',name:'Photo Executive',   desc: 'Dark header with inset photo',                 color: 'from-gray-700 to-gray-900',       hasPhoto: true  },
    { id: 'photoMinimal', name: 'Photo Minimal',     desc: 'Square photo, light minimalist layout',        color: 'from-green-500 to-teal-600',      hasPhoto: true  },
];

// ============= RESUME UPLOAD SECTION =============
const ResumeUploadSection = () => {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [resume, setResume] = useState<ResumeData | null>(null);
    const [error, setError] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [customRole, setCustomRole] = useState('');
    const [skillGapAnalysis, setSkillGapAnalysis] = useState<any>(null);
    const [profileResume, setProfileResume] = useState<SavedResume | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    // AWS Textract disabled — using PDF.js directly (re-enable by restoring S3 upload block in handleUpload)
    
    // NEW: Company-specific JD matching state
    const [targetCompany, setTargetCompany] = useState<string | undefined>(undefined);
    const [companyJDMatch, setCompanyJDMatch] = useState<JDMatchResult | null>(null);
    const [selectedJD, setSelectedJD] = useState<CompanyJD | null>(null);
    
    // NEW: Role recommendations state
    const [showRoleRecommendations, setShowRoleRecommendations] = useState(false);
    const [roleRecommendations, setRoleRecommendations] = useState<RoleRecommendation[]>([]);
    const [findingRoles, setFindingRoles] = useState(false);

    // Check for saved resume on mount
    useEffect(() => {
        loadResumeFromProfile().then(r => setProfileResume(r)).catch(() => {});
    }, []);

    // Get available companies
    const availableCompanies = getAllCompanies();
    
    // Get available roles for selected company
    const companyRoles = targetCompany ? getJDsByCompany(targetCompany).map(jd => jd.role) : [];

    const effectiveRole = targetRole === 'Other' ? customRole : targetRole;

    // Update JD match when company and role are selected (and resume exists)
    useEffect(() => {
        if (resume && targetCompany && effectiveRole) {
            console.log('🏢 Attempting company JD match:', { 
                company: targetCompany, 
                role: effectiveRole,
                hasResume: !!resume,
                hasAtsAnalysis: !!resume.atsAnalysis,
                matchedSkills: resume.atsAnalysis?.matchedSkills?.length || 0,
                parsedSkills: resume.parsedData?.skills?.length || 0
            });
            
            const jd = getJD(targetCompany, effectiveRole);
            if (jd) {
                console.log('✅ Found JD for', targetCompany, '-', effectiveRole);
                setSelectedJD(jd);
                const allSkills = [...(resume.atsAnalysis?.matchedSkills || []), ...(resume.parsedData?.skills || [])].filter(Boolean);
                const experienceYears = resume.parsedData?.totalExperienceYears || 0;
                console.log('📊 Scoring resume with', allSkills.length, 'skills and', experienceYears, 'years exp');
                const matchResult = scoreResumeAgainstJD(allSkills, experienceYears, jd);
                console.log('✅ Company JD Match Result:', matchResult);
                setCompanyJDMatch(matchResult);
            } else {
                console.warn('⚠️ No JD found for', targetCompany, '-', effectiveRole);
                setSelectedJD(null);
                setCompanyJDMatch(null);
            }
        } else {
            console.log('⚠️ Company JD match conditions not met:', {
                hasResume: !!resume,
                targetCompany,
                effectiveRole
            });
            setSelectedJD(null);
            setCompanyJDMatch(null);
        }
    }, [resume, targetCompany, effectiveRole]);

    // Find Best Roles function
    const handleFindBestRoles = async () => {
        if (!resume) {
            toast.error('Please upload a resume first');
            return;
        }
        
        setFindingRoles(true);
        try {
            const allSkills = [...(resume.atsAnalysis?.matchedSkills || []), ...(resume.parsedData?.skills || [])].filter(Boolean);
            const experienceYears = resume.parsedData?.totalExperienceYears || 0;
            
            const recommendations = findBestRolesForResume(allSkills, experienceYears, 15);
            setRoleRecommendations(recommendations);
            setShowRoleRecommendations(true);
            
            toast.success(`Found ${recommendations.length} matching roles!`);
            await logActivity('role_recommendation', 'Best Roles Analysis', `Found ${recommendations.length} matching roles`).catch(() => {});
        } catch (err) {
            toast.error('Failed to find matching roles');
        } finally {
            setFindingRoles(false);
        }
    };

    const handleLoadFromProfile = async () => {
        if (!profileResume) return;
        if (!effectiveRole) {
            toast.error('Select a target role first');
            return;
        }
        setLoadingProfile(true);
        setError('');
        toast.success('Loading resume from profile...', { duration: 1500 });
        try {
            // Use text-based processing — profile stores extracted text, not PDF binary
            const resumeText = profileResume.text || '';
            const resumeName = profileResume.name || 'profile-resume.pdf';
            const processedResume = await processResumeFromText(resumeText, resumeName, effectiveRole);
            setResume(processedResume);

            if (processedResume.atsAnalysis) {
                try {
                    const allSkills = [...(processedResume.atsAnalysis.matchedSkills || []), ...(processedResume.parsedData.skills || [])].filter(Boolean);
                    const gaps = generateResumeSkillGaps(allSkills, effectiveRole, processedResume.atsScore, processedResume.atsAnalysis);
                    setSkillGapAnalysis(gaps);
                } catch { /* ignore */ }
            }

            toast.success(`Resume scored ${processedResume.atsScore}% (loaded from profile)`);
            await logActivity('resume_analysis', 'Analyzed resume from profile', `Role: ${effectiveRole}, Score: ${processedResume.atsScore}%`).catch(() => {});
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to process resume';
            setError(message);
            toast.error('Failed to process profile resume');
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            if (f.type !== 'application/pdf') { setError('Please upload a PDF file'); setFile(null); return; }
            if (f.size > 5 * 1024 * 1024) { setError('File must be < 5MB'); setFile(null); return; }
            setFile(f); setError(''); setResume(null); setSkillGapAnalysis(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !effectiveRole) { toast.error('Select a target role first'); return; }
        setProcessing(true); setError('');
        toast.success('AI is analyzing your resume...', { duration: 2000 });
        try {
            // AWS S3 + Textract disabled — process file directly via PDF.js
            // TO RE-ENABLE: restore the S3 upload + extractTextViaTextract block here
            // and import { extractTextViaTextract } from '@/utils/atsParser'
            const processedResume = await processResume(file, effectiveRole);

            setResume(processedResume);

            if (processedResume.atsAnalysis) {
                try {
                    const allSkills = [...(processedResume.atsAnalysis.matchedSkills || []), ...(processedResume.parsedData.skills || [])].filter(Boolean);
                    const gaps = generateResumeSkillGaps(allSkills, effectiveRole, processedResume.atsScore, processedResume.atsAnalysis);
                    setSkillGapAnalysis(gaps);
                } catch { }
            }
            // Auto-save to profile
            try {
                const allSkills = [...(processedResume.atsAnalysis?.matchedSkills || []), ...(processedResume.parsedData?.skills || [])].filter(Boolean);
                await saveResumeToProfile({
                    name: file.name,
                    text: processedResume.parsedData?.skills?.join(', ') || file.name,
                    skills: allSkills,
                    ats_score: processedResume.atsScore,
                });
                setProfileResume({ name: file.name, text: '', skills: allSkills, ats_score: processedResume.atsScore });
                await logActivity('resume_analysis', 'ATS Resume Analysis', `Role: ${effectiveRole}, Score: ${processedResume.atsScore}%`).catch(() => {});
            } catch { /* silent save */ }
            toast.success(`Resume scored ${processedResume.atsScore}%`);
        } catch (err: any) {
            setError(err.message || 'Failed to process resume');
            toast.error('Failed to process resume');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Role & Company Selection */}
            <Card className="border-border/50">
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Target Job Role *</Label>
                            <Select value={targetRole} onValueChange={setTargetRole}>
                                <SelectTrigger><SelectValue placeholder="Select a role..." /></SelectTrigger>
                                <SelectContent>
                                    {JOB_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5" />
                                Target Company <span className="text-xs text-muted-foreground">(optional)</span>
                            </Label>
                            <Select value={targetCompany || ''} onValueChange={(v) => { setTargetCompany(v || undefined); setCompanyJDMatch(null); }}>
                                <SelectTrigger><SelectValue placeholder="Any company..." /></SelectTrigger>
                                <SelectContent>
                                    {availableCompanies.map(company => (
                                        <SelectItem key={company} value={company}>{company}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {targetRole === 'Other' && (
                            <div>
                                <Label>Custom Role</Label>
                                <Input value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="Enter your target role" />
                            </div>
                        )}
                    </div>

                    {/* File Upload & Actions */}
                    <div className="flex gap-3 flex-wrap">
                        <Input type="file" accept=".pdf" onChange={handleFileChange} disabled={processing} className="flex-1 min-w-[200px]" />
                        <Button onClick={handleUpload} disabled={!file || processing || !effectiveRole}
                            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 min-w-[120px]">
                            {processing ? 'Analyzing...' : <><Upload className="mr-2 h-4 w-4" />Upload</>}
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={handleFindBestRoles} 
                            disabled={!resume || findingRoles}
                            className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                            <Search className="h-4 w-4" />
                            {findingRoles ? 'Finding...' : 'Find Best Roles'}
                        </Button>
                    </div>

                    {profileResume && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <UserCircle className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">Resume saved in profile: <span className="text-muted-foreground">{profileResume.name}</span></p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                                if (!effectiveRole) { toast.error('Please select a Target Job Role first'); return; }
                                handleLoadFromProfile();
                            }} disabled={loadingProfile}>
                                {loadingProfile ? 'Loading...' : 'Load from Profile'}
                            </Button>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">📄 PDF only • Max 5MB • Select a company for company-specific JD matching</p>
                </CardContent>
            </Card>

            {error && <Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

            {processing && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                        <p className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 animate-pulse text-primary" /> AI is analyzing your resume...</p>
                        <Progress value={50} className="mt-3" />
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {resume && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <Card className="border-border/50">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>ATS Analysis Results</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant={resume.atsScore >= 80 ? 'default' : resume.atsScore >= 60 ? 'secondary' : 'destructive'}>
                                        {resume.atsScore >= 80 ? 'Excellent' : resume.atsScore >= 60 ? 'Good' : 'Needs Work'}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm font-medium mb-2">Overall ATS Score</p>
                                    <p className={`text-5xl font-bold ${resume.atsScore >= 80 ? 'text-green-500' : resume.atsScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {resume.atsScore}%
                                    </p>
                                    <Progress value={resume.atsScore} className="mt-3" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Skills Match</span><span className="font-medium">{resume.atsAnalysis.overallMatch}%</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Experience</span><span className="font-medium">{resume.atsAnalysis.experienceMatch}%</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Education</span><span className="font-medium">{resume.atsAnalysis.educationMatch}%</span></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Matched Skills ({resume.atsAnalysis.matchedSkills.length})</p>
                                    <div className="flex flex-wrap gap-1.5">{resume.atsAnalysis.matchedSkills.map((s, i) => <Badge key={i} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">{s}</Badge>)}</div>
                                </div>
                                {resume.atsAnalysis.missingSkills.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-yellow-500" /> Missing Skills ({resume.atsAnalysis.missingSkills.length})</p>
                                        <div className="flex flex-wrap gap-1.5">{resume.atsAnalysis.missingSkills.slice(0, 10).map((s, i) => <Badge key={i} variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">{s}</Badge>)}</div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {skillGapAnalysis && (
                        <LearningRecommendations skillGapAnalysis={skillGapAnalysis} title="📚 Skill Gap & Course Recommendations" showOverallScore={true} />
                    )}

                    {/* Company JD Match Results */}
                    {companyJDMatch && (
                        <Card className="mt-6 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-blue-500" />
                                        {targetCompany} - {effectiveRole} Match
                                    </CardTitle>
                                    <Badge variant={companyJDMatch.overallScore >= 80 ? 'default' : companyJDMatch.overallScore >= 60 ? 'secondary' : 'destructive'}>
                                        {companyJDMatch.overallScore}% Fit
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                        <p className="text-sm font-medium text-green-600 mb-2">Must-Have Skills Score</p>
                                        <p className="text-3xl font-bold text-green-500">{companyJDMatch.mustHaveScore}%</p>
                                        <Progress value={companyJDMatch.mustHaveScore} className="mt-2" />
                                    </div>
                                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <p className="text-sm font-medium text-blue-600 mb-2">Nice-to-Have Skills Score</p>
                                        <p className="text-3xl font-bold text-blue-500">{companyJDMatch.niceToHaveScore}%</p>
                                        <Progress value={companyJDMatch.niceToHaveScore} className="mt-2" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" /> 
                                            Matched Must-Have ({companyJDMatch.matchedMustHaves.length})
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {companyJDMatch.matchedMustHaves.map((s, i) => (
                                                <Badge key={i} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">{s}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    {companyJDMatch.missedMustHaves.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-red-500" /> 
                                                Missing Must-Have ({companyJDMatch.missedMustHaves.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {companyJDMatch.missedMustHaves.map((s, i) => (
                                                    <Badge key={i} variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">{s}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <Star className="h-4 w-4 text-blue-500" /> 
                                            Matched Nice-to-Have ({companyJDMatch.matchedNiceToHaves.length})
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {companyJDMatch.matchedNiceToHaves.map((s, i) => (
                                                <Badge key={i} variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">{s}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    {companyJDMatch.missedNiceToHaves.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-yellow-500" /> 
                                                Missing Nice-to-Have ({companyJDMatch.missedNiceToHaves.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {companyJDMatch.missedNiceToHaves.slice(0, 8).map((s, i) => (
                                                    <Badge key={i} variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">{s}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Alert className={companyJDMatch.overallScore >= 70 ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}>
                                    <TrendingUp className="h-4 w-4" />
                                    <AlertDescription>
                                        {companyJDMatch.overallScore >= 80 
                                            ? `Excellent match for ${targetCompany}! Your profile aligns well with this role.`
                                            : companyJDMatch.overallScore >= 60 
                                            ? `Good potential for ${targetCompany}. Focus on the missing must-have skills to strengthen your application.`
                                            : `Consider building skills in ${companyJDMatch.missedMustHaves.slice(0, 3).join(', ')} before applying to ${targetCompany}.`
                                        }
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}

                    {/* Role Recommendations Section */}
                    {showRoleRecommendations && roleRecommendations.length > 0 && (
                        <Card className="mt-6 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-purple-500" />
                                        Top Role Recommendations Based on Your Resume
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => setShowRoleRecommendations(false)}>
                                        ✕ Close
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    We analyzed your resume against 40+ job descriptions across 15 top companies
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {roleRecommendations.map((rec, index) => (
                                        <div 
                                            key={index} 
                                            className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                            onClick={() => {
                                                setTargetCompany(rec.jd.company);
                                                setTargetRole(rec.jd.role);
                                                setShowRoleRecommendations(false);
                                                toast.success(`Selected ${rec.jd.role} at ${rec.jd.company}`);
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-bold text-purple-500">#{index + 1}</span>
                                                    <div>
                                                        <p className="font-semibold">{rec.jd.role}</p>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" /> {rec.jd.company}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={rec.matchResult.overallScore >= 80 ? 'default' : rec.matchResult.overallScore >= 60 ? 'secondary' : 'outline'}>
                                                        {rec.matchResult.overallScore}% Match
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-green-500">●</span> Must-Have: {rec.matchResult.mustHaveScore}%
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-blue-500">●</span> Nice-to-Have: {rec.matchResult.niceToHaveScore}%
                                                </div>
                                            </div>
                                            {rec.matchResult.matchedMustHaves.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {rec.matchResult.matchedMustHaves.slice(0, 5).map((skill, i) => (
                                                        <Badge key={i} variant="outline" className="text-xs bg-green-500/5">{skill}</Badge>
                                                    ))}
                                                    {rec.matchResult.matchedMustHaves.length > 5 && (
                                                        <Badge variant="outline" className="text-xs">+{rec.matchResult.matchedMustHaves.length - 5} more</Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            )}
        </div>
    );
};

// ============= RESUME BUILDER SECTION =============
interface ResumeFormData {
    personalInfo: { name: string; email: string; phone: string; linkedin: string; location: string; summary: string };
    education: Array<{ institution: string; degree: string; field: string; year: string; gpa: string }>;
    experience: Array<{ company: string; position: string; duration: string; description: string }>;
    projects: Array<{ name: string; description: string; technologies: string; link: string }>;
    skills: string[];
    template: string;
}

const ResumeBuilderSection = () => {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [template, setTemplate] = useState('modern');
    const [atsScore, setAtsScore] = useState<number | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [scoring, setScoring] = useState(false);
    const [photoData, setPhotoData] = useState<string | null>(null); // base64 for photo templates

    const [formData, setFormData] = useState<ResumeFormData>({
        personalInfo: { name: '', email: user?.email || '', phone: '', linkedin: '', location: '', summary: '' },
        education: [{ institution: '', degree: '', field: '', year: '', gpa: '' }],
        experience: [{ company: '', position: '', duration: '', description: '' }],
        projects: [{ name: '', description: '', technologies: '', link: '' }],
        skills: [],
        template: 'modern',
    });

    const [skillInput, setSkillInput] = useState('');

    const steps = ['Personal Info', 'Education', 'Experience', 'Projects', 'Skills', 'Template'];

    const updatePersonalInfo = (field: string, value: string) =>
        setFormData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));

    const addItem = (section: 'education' | 'experience' | 'projects') => {
        const defaults: Record<string, any> = {
            education: { institution: '', degree: '', field: '', year: '', gpa: '' },
            experience: { company: '', position: '', duration: '', description: '' },
            projects: { name: '', description: '', technologies: '', link: '' },
        };
        setFormData(prev => ({ ...prev, [section]: [...prev[section], defaults[section]] }));
    };

    const removeItem = (section: 'education' | 'experience' | 'projects', index: number) => {
        if (formData[section].length <= 1) return;
        setFormData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
    };

    const updateItem = (section: 'education' | 'experience' | 'projects', index: number, field: string, value: string) =>
        setFormData(prev => ({
            ...prev,
            [section]: prev[section].map((item, i) => i === index ? { ...item, [field]: value } : item),
        }));

    const addSkill = () => {
        if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
            setSkillInput('');
        }
    };

    const removeSkill = (skill: string) =>
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));

    const scoreResume = async () => {
        setScoring(true);
        try {
            const result = await geminiApi.generate(
                `Score this resume for ATS friendliness (0-100). Name: ${formData.personalInfo.name}. Skills: ${formData.skills.join(', ')}. Education: ${formData.education.map(e => `${e.degree} in ${e.field} from ${e.institution}`).join('; ')}. Experience: ${formData.experience.map(e => `${e.position} at ${e.company}`).join('; ')}. Return ONLY a JSON object: {"score": number, "feedback": "string"}`,
                0.3, 200
            );
            if (result.success && result.text) {
                try {
                    const clean = result.text.replace(/```json\n?|\n?```/g, '').trim();
                    const match = clean.match(/\{[\s\S]*\}/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        setAtsScore(parsed.score || 70);
                        toast.success(`ATS Score: ${parsed.score}%`);
                    }
                } catch { setAtsScore(72); }
            }
        } catch { setAtsScore(70); toast.info('Using estimated score'); }
        setScoring(false);
    };

    const generatePDF = () => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const { personalInfo, education, experience, projects, skills } = formData;
        const PW = 210; // page width mm
        const PH = 297; // page height mm
        const ML = 15; // left margin
        const MR = 15; // right margin
        const CW = PW - ML - MR; // content width
        let y = 0;

        // ─── helper utilities ───────────────────────────────────────────
        const checkPage = (needed = 12) => {
            if (y > PH - needed) { doc.addPage(); y = 18; }
        };

        const sectionHeader = (title: string, accentR: number, accentG: number, accentB: number) => {
            checkPage(18);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.setTextColor(accentR, accentG, accentB);
            doc.text(title, ML, y);
            y += 2;
            doc.setDrawColor(accentR, accentG, accentB);
            doc.setLineWidth(0.5);
            doc.line(ML, y, PW - MR, y);
            doc.setTextColor(30, 30, 30);
            y += 5;
        };

        const metaLine = (txt: string) => {
            doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(90, 90, 90);
            doc.text(txt, ML, y); y += 4.5;
        };

        const bodyText = (txt: string, width = CW) => {
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
            const lines = doc.splitTextToSize(txt, width);
            lines.forEach((l: string) => { checkPage(6); doc.text(l, ML, y); y += 4.5; });
        };

        const boldLine = (txt: string, size = 9.5) => {
            doc.setFontSize(size); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
            doc.text(txt, ML, y); y += 5;
        };

        // ─── contact line builder ────────────────────────────────────────
        const contactLine = () => {
            const parts = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin]
                .filter(Boolean);
            return parts.join('  |  ');
        };

        // ─── TEMPLATE RENDERING ─────────────────────────────────────────

        // ── MODERN ──────────────────────────────────────────────────────
        if (template === 'modern') {
            doc.setFillColor(109, 40, 217); doc.rect(0, 0, PW, 38, 'F');
            doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text(personalInfo.name || 'Your Name', ML, 16);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
            doc.text(contactLine(), ML, 24);
            if (personalInfo.linkedin) doc.text(personalInfo.linkedin, ML, 32);
            doc.setTextColor(30, 30, 30); y = 46;

            if (personalInfo.summary) {
                sectionHeader('PROFESSIONAL SUMMARY', 109, 40, 217);
                bodyText(personalInfo.summary); y += 3;
            }
            if (skills.length) { sectionHeader('SKILLS', 109, 40, 217); bodyText(skills.join(' • ')); y += 3; }
            if (experience.some(e => e.company)) {
                sectionHeader('EXPERIENCE', 109, 40, 217);
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18);
                    boldLine(`${exp.position} — ${exp.company}`);
                    if (exp.duration) metaLine(exp.duration);
                    if (exp.description) bodyText(exp.description);
                    y += 2;
                });
            }
            if (education.some(e => e.institution)) {
                sectionHeader('EDUCATION', 109, 40, 217);
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14);
                    boldLine(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`);
                    metaLine(`${edu.institution}${edu.year ? '  |  ' + edu.year : ''}${edu.gpa ? '  |  GPA: ' + edu.gpa : ''}`);
                    y += 2;
                });
            }
            if (projects.some(p => p.name)) {
                sectionHeader('PROJECTS', 109, 40, 217);
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(18);
                    boldLine(proj.name);
                    if (proj.technologies) metaLine(`Tech: ${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    if (proj.link) metaLine(proj.link);
                    y += 2;
                });
            }
        }

        // ── CLASSIC ─────────────────────────────────────────────────────
        else if (template === 'classic') {
            y = 18;
            doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
            doc.text(personalInfo.name || 'Your Name', PW / 2, y, { align: 'center' }); y += 7;
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
            doc.text(contactLine(), PW / 2, y, { align: 'center' }); y += 4;
            doc.setDrawColor(20, 20, 20); doc.setLineWidth(0.8); doc.line(ML, y, PW - MR, y); y += 8;

            const sh = (t: string) => {
                checkPage(16); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                doc.text(t, ML, y); y += 2;
                doc.setLineWidth(0.4); doc.setDrawColor(20, 20, 20); doc.line(ML, y, PW - MR, y); y += 5;
                doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { sh('OBJECTIVE'); bodyText(personalInfo.summary); y += 4; }
            if (skills.length) { sh('SKILLS'); bodyText(skills.join(' • ')); y += 4; }
            if (experience.some(e => e.company)) {
                sh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18);
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(exp.position, ML, y);
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
                    if (exp.duration) doc.text(exp.duration, PW - MR, y, { align: 'right' });
                    y += 5;
                    doc.setFontSize(8.5); doc.text(exp.company, ML, y); y += 5;
                    if (exp.description) bodyText(exp.description);
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                sh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14);
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`, ML, y);
                    if (edu.year) { doc.setFont('helvetica', 'normal'); doc.text(edu.year, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.text(edu.institution, ML, y);
                    if (edu.gpa) doc.text(`GPA: ${edu.gpa}`, PW - MR, y, { align: 'right' });
                    y += 6;
                });
            }
            if (projects.some(p => p.name)) {
                sh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(18);
                    boldLine(proj.name);
                    if (proj.technologies) metaLine(`Tech: ${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    y += 3;
                });
            }
        }

        // ── EXECUTIVE ───────────────────────────────────────────────────
        else if (template === 'executive') {
            const sideW = 62;
            // Dark left panel
            doc.setFillColor(30, 42, 68); doc.rect(0, 0, sideW, PH, 'F');
            // Name in sidebar
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
            const nameLines = doc.splitTextToSize(personalInfo.name || 'Your Name', sideW - 10);
            nameLines.forEach((l: string, i: number) => doc.text(l, 5, 20 + i * 7));
            // Accent bar
            doc.setFillColor(88, 167, 255); doc.rect(0, 20 + nameLines.length * 7, sideW, 1.5, 'F');
            let sy = 32 + nameLines.length * 7;
            // Contact in sidebar
            const sideText = (t: string, fsize = 7.5) => {
                doc.setFontSize(fsize); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 220, 255);
                const ls = doc.splitTextToSize(t, sideW - 10);
                ls.forEach((l: string) => { doc.text(l, 5, sy); sy += 4.5; });
            };
            if (personalInfo.email) { sideText('EMAIL', 6.5); sideText(personalInfo.email); sy += 2; }
            if (personalInfo.phone) { sideText('PHONE', 6.5); sideText(personalInfo.phone); sy += 2; }
            if (personalInfo.location) { sideText('LOCATION', 6.5); sideText(personalInfo.location); sy += 2; }
            if (personalInfo.linkedin) { sideText('LINKEDIN', 6.5); sideText(personalInfo.linkedin); sy += 4; }
            // Skills in sidebar
            if (skills.length) {
                doc.setFillColor(88, 167, 255); doc.rect(0, sy, sideW, 1, 'F'); sy += 5;
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
                doc.text('SKILLS', 5, sy); sy += 5;
                skills.forEach(s => { sideText('• ' + s, 7.5); });
            }
            // Right column content
            const rx = sideW + 8;
            const rcw = PW - sideW - 8 - MR;
            y = 18;
            const rsh = (t: string) => {
                if (y > PH - 16) { doc.addPage(); doc.setFillColor(30, 42, 68); doc.rect(0, 0, sideW, PH, 'F'); y = 18; }
                doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 42, 68);
                doc.text(t, rx, y); y += 2;
                doc.setDrawColor(88, 167, 255); doc.setLineWidth(0.6); doc.line(rx, y, PW - MR, y); y += 5;
                doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) {
                rsh('PROFESSIONAL SUMMARY');
                doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
                const sl = doc.splitTextToSize(personalInfo.summary, rcw);
                sl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; }); y += 3;
            }
            if (experience.some(e => e.company)) {
                rsh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    if (y > PH - 18) { doc.addPage(); doc.setFillColor(30, 42, 68); doc.rect(0, 0, sideW, PH, 'F'); y = 18; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(exp.position, rx, y);
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
                    if (exp.duration) doc.text(exp.duration, PW - MR, y, { align: 'right' });
                    y += 5;
                    doc.setTextColor(50, 50, 50); doc.text(exp.company, rx, y); y += 4;
                    if (exp.description) {
                        doc.setFontSize(8.5); doc.setTextColor(40, 40, 40);
                        const dl = doc.splitTextToSize(exp.description, rcw);
                        dl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; });
                    }
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                rsh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    if (y > PH - 16) { doc.addPage(); doc.setFillColor(30, 42, 68); doc.rect(0, 0, sideW, PH, 'F'); y = 18; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`, rx, y);
                    doc.setFont('helvetica', 'normal'); if (edu.year) doc.text(edu.year, PW - MR, y, { align: 'right' });
                    y += 5;
                    doc.setFontSize(8.5); doc.setTextColor(50, 50, 50);
                    doc.text(edu.institution + (edu.gpa ? `  |  GPA: ${edu.gpa}` : ''), rx, y); y += 6;
                });
            }
            if (projects.some(p => p.name)) {
                rsh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    if (y > PH - 18) { doc.addPage(); doc.setFillColor(30, 42, 68); doc.rect(0, 0, sideW, PH, 'F'); y = 18; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(proj.name, rx, y); y += 5;
                    if (proj.technologies) { doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(80, 80, 80); doc.text(`Tech: ${proj.technologies}`, rx, y); y += 4.5; }
                    if (proj.description) {
                        doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
                        const pl = doc.splitTextToSize(proj.description, rcw);
                        pl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; });
                    }
                    y += 3;
                });
            }
        }

        // ── MINIMAL ──────────────────────────────────────────────────────
        else if (template === 'minimal') {
            y = 20;
            doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
            doc.text(personalInfo.name || 'Your Name', ML, y); y += 8;
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
            doc.text(contactLine(), ML, y); y += 10;
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.4); doc.line(ML, y, PW - MR, y); y += 8;

            const msh = (t: string) => {
                checkPage(16); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(140, 140, 140);
                doc.text(t, ML, y); y += 5; doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { msh('SUMMARY'); bodyText(personalInfo.summary); y += 6; }
            if (experience.some(e => e.company)) {
                msh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(16);
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(exp.position, ML, y);
                    if (exp.duration) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(exp.duration, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
                    doc.text(exp.company, ML, y); y += 5;
                    if (exp.description) bodyText(exp.description);
                    y += 4;
                });
            }
            if (education.some(e => e.institution)) {
                msh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14);
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`, ML, y);
                    if (edu.year) { doc.setFont('helvetica', 'normal'); doc.text(edu.year, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
                    doc.text(edu.institution + (edu.gpa ? `  •  ${edu.gpa}` : ''), ML, y); y += 6;
                });
            }
            if (skills.length) {
                msh('SKILLS');
                doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
                const sl = doc.splitTextToSize(skills.join('   •   '), CW);
                sl.forEach((l: string) => { checkPage(6); doc.text(l, ML, y); y += 4.5; }); y += 4;
            }
            if (projects.some(p => p.name)) {
                msh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(16);
                    boldLine(proj.name);
                    if (proj.technologies) metaLine(`${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    y += 4;
                });
            }
        }

        // ── TECH PRO ─────────────────────────────────────────────────────
        else if (template === 'techpro') {
            doc.setFillColor(10, 22, 48); doc.rect(0, 0, PW, 42, 'F');
            doc.setFontSize(20); doc.setFont('courier', 'bold'); doc.setTextColor(6, 182, 212);
            doc.text((personalInfo.name || 'Your Name').toUpperCase(), ML, 16);
            doc.setFontSize(8); doc.setFont('courier', 'normal'); doc.setTextColor(148, 222, 241);
            doc.text(contactLine(), ML, 25);
            doc.setFillColor(6, 182, 212); doc.rect(ML, 30, CW, 0.8, 'F');
            doc.setTextColor(30, 30, 30); y = 50;

            const tsh = (t: string) => {
                checkPage(16); doc.setFontSize(9); doc.setFont('courier', 'bold'); doc.setTextColor(6, 182, 212);
                doc.text('▸ ' + t, ML, y); y += 2;
                doc.setDrawColor(6, 182, 212); doc.setLineWidth(0.4); doc.line(ML, y, PW - MR, y); y += 5;
                doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { tsh('ABOUT'); bodyText(personalInfo.summary); y += 4; }
            if (skills.length) {
                tsh('TECH STACK');
                const cols = 3;
                const colW = CW / cols;
                let col = 0, skillY = y;
                skills.forEach(s => {
                    if (col >= cols) { col = 0; skillY += 5; y = skillY; }
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
                    doc.text('› ' + s, ML + col * colW, skillY);
                    col++;
                });
                y = skillY + 7;
            }
            if (experience.some(e => e.company)) {
                tsh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18);
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(`${exp.position}  @  ${exp.company}`, ML, y);
                    if (exp.duration) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.text(exp.duration, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    if (exp.description) bodyText(exp.description);
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                tsh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14);
                    boldLine(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`);
                    metaLine(`${edu.institution}${edu.year ? '  |  ' + edu.year : ''}${edu.gpa ? '  |  ' + edu.gpa : ''}`);
                    y += 2;
                });
            }
            if (projects.some(p => p.name)) {
                tsh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(18);
                    boldLine(proj.name);
                    if (proj.technologies) metaLine(`Stack: ${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    y += 3;
                });
            }
        }

        // ── ELEGANT ──────────────────────────────────────────────────────
        else if (template === 'elegant') {
            y = 22;
            doc.setFontSize(22); doc.setFont('times', 'bold'); doc.setTextColor(139, 76, 0);
            doc.text(personalInfo.name || 'Your Name', PW / 2, y, { align: 'center' }); y += 6;
            doc.setFontSize(8.5); doc.setFont('times', 'normal'); doc.setTextColor(80, 80, 80);
            doc.text(contactLine(), PW / 2, y, { align: 'center' }); y += 4;
            doc.setDrawColor(139, 76, 0); doc.setLineWidth(1.2); doc.line(ML + 20, y, PW - MR - 20, y); y += 10;

            const esh = (t: string) => {
                checkPage(16); doc.setFontSize(10); doc.setFont('times', 'bold'); doc.setTextColor(139, 76, 0);
                doc.text(t, ML, y); y += 2;
                doc.setLineWidth(0.4); doc.line(ML, y, PW - MR, y); y += 5;
                doc.setFont('times', 'normal'); doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { esh('PROFILE'); doc.setFontSize(9); doc.setFont('times', 'italic'); doc.setTextColor(40, 40, 40); const sl = doc.splitTextToSize(personalInfo.summary, CW); sl.forEach((l: string) => { checkPage(6); doc.text(l, ML, y); y += 5; }); y += 3; }
            if (experience.some(e => e.company)) {
                esh('PROFESSIONAL EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18);
                    doc.setFontSize(10); doc.setFont('times', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(exp.position, ML, y);
                    if (exp.duration) { doc.setFont('times', 'italic'); doc.setFontSize(8.5); doc.text(exp.duration, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFontSize(9); doc.setFont('times', 'italic'); doc.setTextColor(80, 80, 80);
                    doc.text(exp.company, ML, y); y += 4;
                    if (exp.description) { doc.setFont('times', 'normal'); doc.setTextColor(40, 40, 40); const dl = doc.splitTextToSize(exp.description, CW); dl.forEach((l: string) => { checkPage(6); doc.text(l, ML, y); y += 5; }); }
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                esh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14);
                    doc.setFontSize(10); doc.setFont('times', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`, ML, y);
                    if (edu.year) { doc.setFont('times', 'italic'); doc.setFontSize(8.5); doc.text(edu.year, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFontSize(9); doc.setFont('times', 'normal'); doc.setTextColor(60, 60, 60);
                    doc.text(edu.institution + (edu.gpa ? `  •  GPA ${edu.gpa}` : ''), ML, y); y += 6;
                });
            }
            if (skills.length) { esh('CORE COMPETENCIES'); doc.setFontSize(9); doc.setFont('times', 'normal'); doc.setTextColor(40, 40, 40); const sl = doc.splitTextToSize(skills.join('  •  '), CW); sl.forEach((l: string) => { checkPage(6); doc.text(l, ML, y); y += 5; }); y += 3; }
            if (projects.some(p => p.name)) {
                esh('NOTABLE PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(16);
                    doc.setFontSize(10); doc.setFont('times', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(proj.name, ML, y); y += 5;
                    if (proj.technologies) { doc.setFontSize(8.5); doc.setFont('times', 'italic'); doc.setTextColor(100, 100, 100); doc.text(`Technologies: ${proj.technologies}`, ML, y); y += 4; }
                    if (proj.description) { doc.setFont('times', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 40, 40); const pl = doc.splitTextToSize(proj.description, CW); pl.forEach((l: string) => { checkPage(6); doc.text(l, ML, y); y += 5; }); }
                    y += 3;
                });
            }
        }

        // ── BOLD IMPACT ──────────────────────────────────────────────────
        else if (template === 'bold') {
            doc.setFillColor(220, 38, 38); doc.rect(0, 0, PW, 2, 'F');
            doc.setFillColor(220, 38, 38); doc.rect(0, PH - 2, PW, 2, 'F');
            y = 18;
            doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38);
            doc.text((personalInfo.name || 'Your Name').toUpperCase(), ML, y); y += 8;
            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
            doc.text(contactLine(), ML, y); y += 10;

            const bsh = (t: string) => {
                checkPage(16);
                doc.setFillColor(220, 38, 38); doc.rect(ML, y, CW, 8, 'F');
                doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                doc.text(t, ML + 3, y + 5.5); y += 13; doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { bsh('PROFESSIONAL SUMMARY'); bodyText(personalInfo.summary); y += 4; }
            if (skills.length) { bsh('SKILLS'); bodyText(skills.join('  |  ')); y += 4; }
            if (experience.some(e => e.company)) {
                bsh('WORK EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18);
                    boldLine(`${exp.position} — ${exp.company}`, 10);
                    if (exp.duration) metaLine(exp.duration);
                    if (exp.description) bodyText(exp.description);
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                bsh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14);
                    boldLine(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`);
                    metaLine(`${edu.institution}${edu.year ? '  |  ' + edu.year : ''}${edu.gpa ? '  |  ' + edu.gpa : ''}`);
                    y += 3;
                });
            }
            if (projects.some(p => p.name)) {
                bsh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(16); boldLine(proj.name);
                    if (proj.technologies) metaLine(`Tech: ${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    y += 3;
                });
            }
        }

        // ── TWO-COLUMN ───────────────────────────────────────────────────
        else if (template === 'twoColumn') {
            const lw = 72; const rw = CW - lw - 8; const rx = ML + lw + 8;
            // Header across full width
            doc.setFillColor(5, 150, 105); doc.rect(0, 0, PW, 36, 'F');
            doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text(personalInfo.name || 'Your Name', ML, 16);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
            doc.text(contactLine(), ML, 26);
            doc.setTextColor(30, 30, 30);
            y = 44;
            const leftY_start = y; let ly = y; let ry = y;

            const lsh = (t: string) => {
                doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(5, 150, 105);
                doc.text(t, ML, ly); ly += 2;
                doc.setDrawColor(5, 150, 105); doc.setLineWidth(0.4); doc.line(ML, ly, ML + lw, ly); ly += 5;
                doc.setTextColor(30, 30, 30);
            };
            const rsh = (t: string) => {
                doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(5, 150, 105);
                doc.text(t, rx, ry); ry += 2;
                doc.setDrawColor(5, 150, 105); doc.setLineWidth(0.4); doc.line(rx, ry, rx + rw, ry); ry += 5;
                doc.setTextColor(30, 30, 30);
            };
            // Left: skills + education
            if (skills.length) {
                lsh('SKILLS');
                skills.forEach(s => { doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); doc.text('• ' + s, ML, ly); ly += 4.5; });
                ly += 4;
            }
            if (education.some(e => e.institution)) {
                lsh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    const el = doc.splitTextToSize(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`, lw);
                    el.forEach((l: string) => { doc.text(l, ML, ly); ly += 4.5; });
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 70, 70);
                    const il = doc.splitTextToSize(edu.institution, lw);
                    il.forEach((l: string) => { doc.text(l, ML, ly); ly += 4; });
                    if (edu.year) { doc.text(edu.year, ML, ly); ly += 4; }
                    ly += 3;
                });
            }
            if (projects.some(p => p.name)) {
                lsh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    const pl = doc.splitTextToSize(proj.name, lw); pl.forEach((l: string) => { doc.text(l, ML, ly); ly += 4.5; });
                    if (proj.technologies) { doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(80, 80, 80); doc.text(proj.technologies, ML, ly); ly += 4; }
                    ly += 2;
                });
            }
            // Right: summary + experience
            if (personalInfo.summary) {
                rsh('SUMMARY');
                doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
                const sl = doc.splitTextToSize(personalInfo.summary, rw);
                sl.forEach((l: string) => { doc.text(l, rx, ry); ry += 4.5; }); ry += 4;
            }
            if (experience.some(e => e.company)) {
                rsh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(exp.position, rx, ry);
                    if (exp.duration) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text(exp.duration, rx + rw, ry, { align: 'right' }); }
                    ry += 5;
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60); doc.text(exp.company, rx, ry); ry += 5;
                    if (exp.description) { doc.setTextColor(40, 40, 40); const dl = doc.splitTextToSize(exp.description, rw); dl.forEach((l: string) => { doc.text(l, rx, ry); ry += 4.5; }); }
                    ry += 3;
                });
            }
            doc.setDrawColor(5, 150, 105); doc.setLineWidth(0.3);
            doc.line(ML + lw + 3.5, leftY_start, ML + lw + 3.5, Math.max(ly, ry));
            y = Math.max(ly, ry);
        }

        // ── GRADIENT ──────────────────────────────────────────────────────
        else if (template === 'gradient') {
            // Approximate gradient with color bands
            const colors: [number,number,number][] = [[124,58,237],[99,60,240],[72,61,243],[60,80,220],[50,100,200]];
            colors.forEach((c, i) => { doc.setFillColor(...c); doc.rect(0, i * 8, PW, 9, 'F'); });
            doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text(personalInfo.name || 'Your Name', ML, 20);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
            doc.text(contactLine(), ML, 30);
            doc.setTextColor(30, 30, 30); y = 52;

            const gsh = (t: string) => {
                checkPage(16); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(124, 58, 237);
                doc.text(t, ML, y); y += 2;
                doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.5); doc.line(ML, y, PW - MR, y); y += 5;
                doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { gsh('SUMMARY'); bodyText(personalInfo.summary); y += 4; }
            if (skills.length) { gsh('SKILLS'); bodyText(skills.join('  ·  ')); y += 4; }
            if (experience.some(e => e.company)) {
                gsh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18); boldLine(`${exp.position}  ·  ${exp.company}`);
                    if (exp.duration) metaLine(exp.duration);
                    if (exp.description) bodyText(exp.description);
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                gsh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14); boldLine(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`);
                    metaLine(`${edu.institution}${edu.year ? '  |  ' + edu.year : ''}${edu.gpa ? '  |  ' + edu.gpa : ''}`);
                    y += 3;
                });
            }
            if (projects.some(p => p.name)) {
                gsh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(16); boldLine(proj.name);
                    if (proj.technologies) metaLine(`Tech: ${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    y += 3;
                });
            }
        }

        // ── CORPORATE ─────────────────────────────────────────────────────
        else if (template === 'corporate') {
            doc.setFillColor(29, 78, 216); doc.rect(0, 0, PW, 44, 'F');
            doc.setFillColor(37, 99, 235); doc.rect(0, 3, PW, 38, 'F');
            doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text(personalInfo.name || 'Your Name', ML, 18);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(186, 213, 255);
            doc.text(contactLine(), ML, 28);
            if (personalInfo.linkedin) { doc.setTextColor(186, 213, 255); doc.text(personalInfo.linkedin, ML, 36); }
            doc.setTextColor(30, 30, 30); y = 52;

            const csh = (t: string) => {
                checkPage(16); doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(29, 78, 216);
                doc.text(t, ML, y); y += 2;
                doc.setDrawColor(29, 78, 216); doc.setLineWidth(0.5); doc.line(ML, y, PW - MR, y); y += 5;
                doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { csh('EXECUTIVE SUMMARY'); bodyText(personalInfo.summary); y += 4; }
            if (skills.length) { csh('KEY COMPETENCIES'); bodyText(skills.join('  |  ')); y += 4; }
            if (experience.some(e => e.company)) {
                csh('PROFESSIONAL EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18);
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(exp.position, ML, y);
                    if (exp.duration) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80); doc.text(exp.duration, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFontSize(8.5); doc.setTextColor(29, 78, 216); doc.text(exp.company, ML, y); y += 5;
                    doc.setTextColor(40, 40, 40);
                    if (exp.description) bodyText(exp.description);
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                csh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14); boldLine(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`);
                    metaLine(`${edu.institution}${edu.year ? '  |  ' + edu.year : ''}${edu.gpa ? '  |  ' + edu.gpa : ''}`);
                    y += 3;
                });
            }
            if (projects.some(p => p.name)) {
                csh('KEY PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(16); boldLine(proj.name);
                    if (proj.technologies) metaLine(`Technologies: ${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    y += 3;
                });
            }
        }

        // ── PHOTO MODERN ─────────────────────────────────────────────────
        else if (template === 'photoModern') {
            const sideW = 58;
            doc.setFillColor(109, 40, 217); doc.rect(0, 0, sideW, PH, 'F');
            let sy = 16;
            // Photo
            if (photoData) {
                try { doc.addImage(photoData, 'JPEG', 6, sy, 46, 46, '', 'MEDIUM'); } catch {}
                sy += 52;
            } else { sy += 10; }
            // Name in sidebar
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            const nameL = doc.splitTextToSize(personalInfo.name || 'Your Name', sideW - 10);
            nameL.forEach((l: string) => { doc.text(l, 5, sy); sy += 6; }); sy += 3;
            // Contact
            const sc = (t: string, label?: string) => {
                if (label) { doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 180, 255); doc.text(label, 5, sy); sy += 3.5; }
                doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(240, 230, 255);
                const ls = doc.splitTextToSize(t, sideW - 10);
                ls.forEach((l: string) => { doc.text(l, 5, sy); sy += 4; });
            };
            if (personalInfo.email) sc(personalInfo.email, 'EMAIL');
            if (personalInfo.phone) sc(personalInfo.phone, 'PHONE');
            if (personalInfo.location) sc(personalInfo.location, 'LOCATION');
            if (personalInfo.linkedin) sc(personalInfo.linkedin, 'LINKEDIN');
            sy += 4;
            if (skills.length) {
                doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                doc.text('SKILLS', 5, sy); sy += 3;
                doc.setFillColor(180, 150, 255); doc.rect(5, sy, 46, 0.7, 'F'); sy += 5;
                skills.forEach(s => { doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(240, 230, 255); doc.text('• ' + s, 5, sy); sy += 4; });
            }
            // Right main area
            const rx = sideW + 10; const rcw = PW - sideW - 10 - MR;
            y = 16;
            const psh = (t: string) => {
                if (y > PH - 16) { doc.addPage(); doc.setFillColor(109, 40, 217); doc.rect(0, 0, sideW, PH, 'F'); y = 16; }
                doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(109, 40, 217);
                doc.text(t, rx, y); y += 2;
                doc.setDrawColor(109, 40, 217); doc.setLineWidth(0.5); doc.line(rx, y, PW - MR, y); y += 5;
                doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { psh('ABOUT ME'); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); const sl = doc.splitTextToSize(personalInfo.summary, rcw); sl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; }); y += 4; }
            if (experience.some(e => e.company)) {
                psh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    if (y > PH - 18) { doc.addPage(); doc.setFillColor(109, 40, 217); doc.rect(0, 0, sideW, PH, 'F'); y = 16; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(exp.position, rx, y);
                    if (exp.duration) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text(exp.duration, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60); doc.text(exp.company, rx, y); y += 5;
                    if (exp.description) { doc.setTextColor(40, 40, 40); const dl = doc.splitTextToSize(exp.description, rcw); dl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; }); }
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                psh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    if (y > PH - 16) { doc.addPage(); doc.setFillColor(109, 40, 217); doc.rect(0, 0, sideW, PH, 'F'); y = 16; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`, rx, y);
                    if (edu.year) { doc.setFont('helvetica', 'normal'); doc.text(edu.year, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
                    doc.text(edu.institution + (edu.gpa ? `  |  ${edu.gpa}` : ''), rx, y); y += 6;
                });
            }
            if (projects.some(p => p.name)) {
                psh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    if (y > PH - 18) { doc.addPage(); doc.setFillColor(109, 40, 217); doc.rect(0, 0, sideW, PH, 'F'); y = 16; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(proj.name, rx, y); y += 5;
                    if (proj.technologies) { doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(80, 80, 80); doc.text(`Tech: ${proj.technologies}`, rx, y); y += 4.5; }
                    if (proj.description) { doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); const pl = doc.splitTextToSize(proj.description, rcw); pl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; }); }
                    y += 3;
                });
            }
        }

        // ── PHOTO CLASSIC ─────────────────────────────────────────────────
        else if (template === 'photoClassic') {
            y = 16;
            // Photo top-right
            if (photoData) {
                try { doc.addImage(photoData, 'JPEG', PW - MR - 32, y, 32, 36, '', 'MEDIUM'); } catch {}
            }
            doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
            doc.text(personalInfo.name || 'Your Name', ML, y + 8);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 70, 70);
            const parts = [personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean);
            parts.forEach((p, i) => { doc.text(p, ML, y + 16 + i * 5); });
            y = photoData ? 60 : 48;
            doc.setDrawColor(20, 20, 20); doc.setLineWidth(0.6); doc.line(ML, y, PW - MR, y); y += 8;

            const csh2 = (t: string) => {
                checkPage(16); doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                doc.text(t, ML, y); y += 2;
                doc.setDrawColor(20, 20, 20); doc.setLineWidth(0.4); doc.line(ML, y, PW - MR, y); y += 5;
                doc.setTextColor(40, 40, 40);
            };
            if (personalInfo.summary) { csh2('PROFILE'); bodyText(personalInfo.summary); y += 4; }
            if (experience.some(e => e.company)) {
                csh2('WORK EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18); boldLine(`${exp.position} — ${exp.company}`, 9.5);
                    if (exp.duration) metaLine(exp.duration);
                    if (exp.description) bodyText(exp.description);
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                csh2('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14); boldLine(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`, 9.5);
                    metaLine(`${edu.institution}${edu.year ? '  |  ' + edu.year : ''}${edu.gpa ? '  |  ' + edu.gpa : ''}`);
                    y += 3;
                });
            }
            if (skills.length) { csh2('SKILLS'); bodyText(skills.join('  •  ')); y += 4; }
            if (projects.some(p => p.name)) {
                csh2('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(16); boldLine(proj.name, 9.5);
                    if (proj.technologies) metaLine(`Tech: ${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    y += 3;
                });
            }
        }

        // ── PHOTO CREATIVE ────────────────────────────────────────────────
        else if (template === 'photoCreative') {
            const sideW = 64;
            doc.setFillColor(244, 63, 94); doc.rect(0, 0, sideW, PH, 'F');
            let sy = 12;
            if (photoData) {
                try { doc.addImage(photoData, 'JPEG', (sideW - 44) / 2, sy, 44, 44, '', 'MEDIUM'); } catch {}
                sy += 50;
            } else { sy += 8; }
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            const nl = doc.splitTextToSize(personalInfo.name || 'Your Name', sideW - 8);
            nl.forEach((l: string) => { doc.text(l, 4, sy); sy += 5.5; }); sy += 3;
            doc.setFillColor(255, 180, 190); doc.rect(4, sy, sideW - 8, 0.7, 'F'); sy += 5;
            const sc2 = (icon: string, val: string) => {
                if (!val) return;
                doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 230, 235);
                const ls = doc.splitTextToSize(icon + ' ' + val, sideW - 8);
                ls.forEach((l: string) => { doc.text(l, 4, sy); sy += 4; });
            };
            sc2('✉', personalInfo.email); sc2('☎', personalInfo.phone); sc2('⌂', personalInfo.location);
            sy += 4;
            if (skills.length) {
                doc.setFillColor(255, 180, 190); doc.rect(4, sy, sideW - 8, 0.7, 'F'); sy += 5;
                doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
                doc.text('SKILLS', 4, sy); sy += 5;
                skills.forEach(s => { doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(255, 230, 235); doc.text('◦ ' + s, 4, sy); sy += 4; });
            }
            const rx = sideW + 10; const rcw = PW - sideW - 10 - MR;
            y = 16;
            const crsh = (t: string) => {
                if (y > PH - 16) { doc.addPage(); doc.setFillColor(244, 63, 94); doc.rect(0, 0, sideW, PH, 'F'); y = 16; }
                doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(244, 63, 94);
                doc.text(t, rx, y); y += 2;
                doc.setDrawColor(244, 63, 94); doc.setLineWidth(0.5); doc.line(rx, y, PW - MR, y); y += 5;
                doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { crsh('ABOUT'); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); const sl = doc.splitTextToSize(personalInfo.summary, rcw); sl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; }); y += 4; }
            if (experience.some(e => e.company)) {
                crsh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    if (y > PH - 18) { doc.addPage(); doc.setFillColor(244, 63, 94); doc.rect(0, 0, sideW, PH, 'F'); y = 16; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(exp.position, rx, y);
                    if (exp.duration) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text(exp.duration, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60); doc.text(exp.company, rx, y); y += 5;
                    if (exp.description) { doc.setTextColor(40, 40, 40); const dl = doc.splitTextToSize(exp.description, rcw); dl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; }); }
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                crsh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    if (y > PH - 16) { doc.addPage(); doc.setFillColor(244, 63, 94); doc.rect(0, 0, sideW, PH, 'F'); y = 16; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                    doc.text(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`, rx, y);
                    if (edu.year) { doc.setFont('helvetica', 'normal'); doc.text(edu.year, PW - MR, y, { align: 'right' }); }
                    y += 5;
                    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
                    doc.text(edu.institution + (edu.gpa ? `  |  ${edu.gpa}` : ''), rx, y); y += 6;
                });
            }
            if (projects.some(p => p.name)) {
                crsh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    if (y > PH - 18) { doc.addPage(); doc.setFillColor(244, 63, 94); doc.rect(0, 0, sideW, PH, 'F'); y = 16; }
                    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.text(proj.name, rx, y); y += 5;
                    if (proj.technologies) { doc.setFontSize(8.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(80, 80, 80); doc.text(`Tech: ${proj.technologies}`, rx, y); y += 4.5; }
                    if (proj.description) { doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); const pl = doc.splitTextToSize(proj.description, rcw); pl.forEach((l: string) => { doc.text(l, rx, y); y += 4.5; }); }
                    y += 3;
                });
            }
        }

        // ── PHOTO EXECUTIVE ───────────────────────────────────────────────
        else if (template === 'photoExecutive') {
            doc.setFillColor(30, 30, 30); doc.rect(0, 0, PW, 50, 'F');
            if (photoData) {
                try { doc.addImage(photoData, 'JPEG', PW - MR - 36, 7, 36, 36, '', 'MEDIUM'); } catch {}
            }
            doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text(personalInfo.name || 'Your Name', ML, 20);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 180, 180);
            doc.text(contactLine(), ML, 30);
            if (personalInfo.linkedin) { doc.text(personalInfo.linkedin, ML, 38); }
            doc.setTextColor(30, 30, 30); y = 58;

            const exsh = (t: string) => {
                checkPage(16); doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(40, 40, 40);
                doc.text(t, ML, y); y += 2;
                doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.5); doc.line(ML, y, PW - MR, y); y += 5;
                doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { exsh('EXECUTIVE SUMMARY'); bodyText(personalInfo.summary); y += 4; }
            if (skills.length) { exsh('SKILLS'); bodyText(skills.join('  |  ')); y += 4; }
            if (experience.some(e => e.company)) {
                exsh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(18); boldLine(`${exp.position} — ${exp.company}`);
                    if (exp.duration) metaLine(exp.duration);
                    if (exp.description) bodyText(exp.description);
                    y += 3;
                });
            }
            if (education.some(e => e.institution)) {
                exsh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14); boldLine(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`);
                    metaLine(`${edu.institution}${edu.year ? '  |  ' + edu.year : ''}${edu.gpa ? '  |  ' + edu.gpa : ''}`);
                    y += 3;
                });
            }
            if (projects.some(p => p.name)) {
                exsh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(16); boldLine(proj.name);
                    if (proj.technologies) metaLine(`Tech: ${proj.technologies}`);
                    if (proj.description) bodyText(proj.description);
                    y += 3;
                });
            }
        }

        // ── PHOTO MINIMAL ─────────────────────────────────────────────────
        else if (template === 'photoMinimal') {
            y = 16;
            if (photoData) {
                try { doc.addImage(photoData, 'JPEG', ML, y, 34, 34, '', 'MEDIUM'); } catch {}
                doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                doc.text(personalInfo.name || 'Your Name', ML + 40, y + 10);
                doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
                const parts2 = [personalInfo.email, personalInfo.phone, personalInfo.location].filter(Boolean);
                doc.text(parts2.join('  •  '), ML + 40, y + 18);
                y = 58;
            } else {
                doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
                doc.text(personalInfo.name || 'Your Name', ML, y + 6);
                doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
                doc.text(contactLine(), ML, y + 14);
                y = 40;
            }
            doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4); doc.line(ML, y, PW - MR, y); y += 8;

            const pmsh = (t: string) => {
                checkPage(16); doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(160, 160, 160);
                doc.text(t, ML, y); y += 5; doc.setTextColor(30, 30, 30);
            };
            if (personalInfo.summary) { pmsh('SUMMARY'); bodyText(personalInfo.summary); y += 6; }
            if (experience.some(e => e.company)) {
                pmsh('EXPERIENCE');
                experience.filter(e => e.company).forEach(exp => {
                    checkPage(16); boldLine(`${exp.position}  —  ${exp.company}`);
                    if (exp.duration) metaLine(exp.duration);
                    if (exp.description) bodyText(exp.description);
                    y += 4;
                });
            }
            if (education.some(e => e.institution)) {
                pmsh('EDUCATION');
                education.filter(e => e.institution).forEach(edu => {
                    checkPage(14); boldLine(`${edu.degree}${edu.field ? ' in ' + edu.field : ''}`);
                    metaLine(`${edu.institution}${edu.year ? '  |  ' + edu.year : ''}${edu.gpa ? '  |  ' + edu.gpa : ''}`);
                    y += 4;
                });
            }
            if (skills.length) { pmsh('SKILLS'); bodyText(skills.join('   •   ')); y += 4; }
            if (projects.some(p => p.name)) {
                pmsh('PROJECTS');
                projects.filter(p => p.name).forEach(proj => {
                    checkPage(16); boldLine(proj.name);
                    if (proj.technologies) metaLine(proj.technologies);
                    if (proj.description) bodyText(proj.description);
                    y += 4;
                });
            }
        }

        // ── FALLBACK (shouldn't happen) ───────────────────────────────────
        else {
            y = 20;
            doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
            doc.text(personalInfo.name || 'Your Name', ML, y); y += 10;
            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
            doc.text(contactLine(), ML, y); y += 12;
            if (skills.length) { bodyText('Skills: ' + skills.join(', ')); y += 6; }
            experience.filter(e => e.company).forEach(exp => { boldLine(`${exp.position} at ${exp.company}`); if (exp.description) bodyText(exp.description); y += 4; });
            education.filter(e => e.institution).forEach(edu => { boldLine(`${edu.degree} — ${edu.institution}`); y += 4; });
        }

        const safeName = (personalInfo.name || 'Resume').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Resume';
        const fileName = `${safeName}_VidyaMitra.pdf`;
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Resume PDF downloaded!');
    };

    return (
        <div className="space-y-6">
            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-1 flex-wrap">
                {steps.map((s, i) => (
                    <button key={i} onClick={() => setStep(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${i === step ? 'bg-primary text-primary-foreground shadow-lg' :
                            i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                        <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">{i + 1}</span>
                        <span className="hidden sm:inline">{s}</span>
                    </button>
                ))}
            </div>

            <Card className="border-border/50">
                <CardContent className="pt-6">
                    {/* Step 0: Personal Info */}
                    {step === 0 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><Label>Full Name *</Label><Input value={formData.personalInfo.name} onChange={e => updatePersonalInfo('name', e.target.value)} placeholder="John Doe" /></div>
                                <div><Label>Email *</Label><Input value={formData.personalInfo.email} onChange={e => updatePersonalInfo('email', e.target.value)} placeholder="john@email.com" /></div>
                                <div><Label>Phone *</Label><Input value={formData.personalInfo.phone} onChange={e => updatePersonalInfo('phone', e.target.value)} placeholder="+91 9876543210" /></div>
                                <div><Label>Location</Label><Input value={formData.personalInfo.location} onChange={e => updatePersonalInfo('location', e.target.value)} placeholder="City, Country" /></div>
                                <div className="md:col-span-2"><Label>LinkedIn URL</Label><Input value={formData.personalInfo.linkedin} onChange={e => updatePersonalInfo('linkedin', e.target.value)} placeholder="linkedin.com/in/..." /></div>
                                <div className="md:col-span-2"><Label>Professional Summary</Label><Textarea value={formData.personalInfo.summary} onChange={e => updatePersonalInfo('summary', e.target.value)} placeholder="Brief professional summary..." rows={3} /></div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Education */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between"><h3 className="font-semibold text-lg">Education</h3>
                                <Button size="sm" variant="outline" onClick={() => addItem('education')}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
                            {formData.education.map((edu, i) => (
                                <div key={i} className="p-4 border rounded-lg space-y-3 relative">
                                    {formData.education.length > 1 && <button onClick={() => removeItem('education', i)} className="absolute top-2 right-2 text-destructive"><Trash2 className="h-4 w-4" /></button>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div><Label>Institution *</Label><Input value={edu.institution} onChange={e => updateItem('education', i, 'institution', e.target.value)} placeholder="MIT" /></div>
                                        <div><Label>Degree *</Label><Input value={edu.degree} onChange={e => updateItem('education', i, 'degree', e.target.value)} placeholder="B.Tech" /></div>
                                        <div><Label>Field of Study *</Label><Input value={edu.field} onChange={e => updateItem('education', i, 'field', e.target.value)} placeholder="Computer Science" /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><Label>Year</Label><Input value={edu.year} onChange={e => updateItem('education', i, 'year', e.target.value)} placeholder="2024" /></div>
                                            <div><Label>GPA</Label><Input value={edu.gpa} onChange={e => updateItem('education', i, 'gpa', e.target.value)} placeholder="8.5" /></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Experience */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between"><h3 className="font-semibold text-lg">Experience</h3>
                                <Button size="sm" variant="outline" onClick={() => addItem('experience')}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
                            {formData.experience.map((exp, i) => (
                                <div key={i} className="p-4 border rounded-lg space-y-3 relative">
                                    {formData.experience.length > 1 && <button onClick={() => removeItem('experience', i)} className="absolute top-2 right-2 text-destructive"><Trash2 className="h-4 w-4" /></button>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div><Label>Company</Label><Input value={exp.company} onChange={e => updateItem('experience', i, 'company', e.target.value)} placeholder="Google" /></div>
                                        <div><Label>Position</Label><Input value={exp.position} onChange={e => updateItem('experience', i, 'position', e.target.value)} placeholder="Software Engineer" /></div>
                                        <div><Label>Duration</Label><Input value={exp.duration} onChange={e => updateItem('experience', i, 'duration', e.target.value)} placeholder="Jan 2023 - Present" /></div>
                                    </div>
                                    <div><Label>Description</Label><Textarea value={exp.description} onChange={e => updateItem('experience', i, 'description', e.target.value)} placeholder="Key achievements..." rows={2} /></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 3: Projects */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between"><h3 className="font-semibold text-lg">Projects</h3>
                                <Button size="sm" variant="outline" onClick={() => addItem('projects')}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
                            {formData.projects.map((proj, i) => (
                                <div key={i} className="p-4 border rounded-lg space-y-3 relative">
                                    {formData.projects.length > 1 && <button onClick={() => removeItem('projects', i)} className="absolute top-2 right-2 text-destructive"><Trash2 className="h-4 w-4" /></button>}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div><Label>Project Name</Label><Input value={proj.name} onChange={e => updateItem('projects', i, 'name', e.target.value)} placeholder="E-Commerce App" /></div>
                                        <div><Label>Technologies</Label><Input value={proj.technologies} onChange={e => updateItem('projects', i, 'technologies', e.target.value)} placeholder="React, Node.js" /></div>
                                    </div>
                                    <div><Label>Description</Label><Textarea value={proj.description} onChange={e => updateItem('projects', i, 'description', e.target.value)} placeholder="What did you build?" rows={2} /></div>
                                    <div><Label>Link (optional)</Label><Input value={proj.link} onChange={e => updateItem('projects', i, 'link', e.target.value)} placeholder="github.com/..." /></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 4: Skills */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Skills</h3>
                            <div className="flex gap-2">
                                <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add a skill..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
                                <Button onClick={addSkill} variant="outline"><Plus className="h-4 w-4" /></Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.skills.map((skill, i) => (
                                    <Badge key={i} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/20" onClick={() => removeSkill(skill)}>
                                        {skill} <XCircle className="h-3 w-3" />
                                    </Badge>
                                ))}
                            </div>
                            {formData.skills.length === 0 && <p className="text-sm text-muted-foreground">Add your technical and soft skills</p>}
                        </div>
                    )}

                    {/* Step 5: Template */}
                    {step === 5 && (
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Choose Template</h3>
                                <p className="text-xs text-muted-foreground">15 professional templates — 5 include a photo slot</p>
                            </div>

                            {/* No-photo templates */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Without Photo</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {TEMPLATES.filter(t => !t.hasPhoto).map(t => (
                                        <button key={t.id} onClick={() => { setTemplate(t.id); setFormData(prev => ({ ...prev, template: t.id })); }}
                                            className={`p-3 border-2 rounded-xl text-left transition-all ${template === t.id ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' : 'border-border hover:border-primary/50 hover:shadow-md'}`}>
                                            <div className={`w-full h-16 rounded-lg bg-gradient-to-br ${t.color} mb-2 flex items-center justify-center`}>
                                                <FileText className="h-6 w-6 text-white/80" />
                                            </div>
                                            <p className="font-semibold text-xs leading-tight">{t.name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
                                            {template === t.id && <div className="mt-1.5 w-full h-0.5 rounded bg-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Photo templates */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">With Photo</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {TEMPLATES.filter(t => t.hasPhoto).map(t => (
                                        <button key={t.id} onClick={() => { setTemplate(t.id); setFormData(prev => ({ ...prev, template: t.id })); }}
                                            className={`p-3 border-2 rounded-xl text-left transition-all ${template === t.id ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' : 'border-border hover:border-primary/50 hover:shadow-md'}`}>
                                            <div className={`w-full h-16 rounded-lg bg-gradient-to-br ${t.color} mb-2 flex items-center justify-center relative`}>
                                                <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/30 border-2 border-white/60 flex items-center justify-center">
                                                    <UserCircle className="h-4 w-4 text-white" />
                                                </div>
                                                <FileText className="h-5 w-5 text-white/60" />
                                            </div>
                                            <p className="font-semibold text-xs leading-tight">{t.name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
                                            {template === t.id && <div className="mt-1.5 w-full h-0.5 rounded bg-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Photo upload — only shown when a photo template is selected */}
                            {TEMPLATES.find(t => t.id === template)?.hasPhoto && (
                                <div className="border-2 border-dashed border-primary/40 rounded-xl p-4 bg-primary/5">
                                    <div className="flex items-start gap-3">
                                        <UserCircle className="h-8 w-8 text-primary shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm">Add Your Photo</p>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                This template supports a profile photo. Upload a clear, professional headshot (JPG/PNG, square recommended).
                                            </p>
                                            {photoData ? (
                                                <div className="flex items-center gap-3">
                                                    <img src={photoData} alt="Profile preview" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                                                    <div>
                                                        <p className="text-xs text-green-600 font-medium mb-1">✓ Photo ready</p>
                                                        <Button size="sm" variant="outline" onClick={() => setPhotoData(null)} className="text-xs h-7">Remove</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer">
                                                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                                                        onChange={e => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
                                                            const reader = new FileReader();
                                                            reader.onload = ev => setPhotoData(ev.target?.result as string);
                                                            reader.readAsDataURL(file);
                                                        }} />
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90 transition-opacity">
                                                        <Upload className="h-3.5 w-3.5" /> Upload Photo
                                                    </span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Score & Download */}
                            <div className="flex flex-wrap gap-3 pt-4 border-t">
                                <Button onClick={scoreResume} disabled={scoring} variant="outline">
                                    {scoring ? 'Scoring...' : <><Sparkles className="h-4 w-4 mr-2" />Score Resume</>}
                                </Button>
                                <Button onClick={generatePDF} className="bg-gradient-to-r from-violet-600 to-purple-600">
                                    <Download className="h-4 w-4 mr-2" />Download PDF
                                </Button>
                                {atsScore !== null && (
                                    <Badge className={`text-lg px-4 py-2 ${atsScore >= 80 ? 'bg-green-500' : atsScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                        ATS Score: {atsScore}%
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-6 mt-6 border-t">
                        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                            <ChevronLeft className="h-4 w-4 mr-1" />Previous
                        </Button>
                        {step < steps.length - 1 ? (
                            <Button onClick={() => setStep(step + 1)}>
                                Next<ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button onClick={generatePDF} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 gap-2">
                                <Download className="h-4 w-4" />Generate & Download PDF
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// ============= MAIN PAGE =============
const SmartResume = () => {
    return (
        <Layout>
            <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Smart Resume</h1>
                    <p className="text-muted-foreground mt-1">Upload your resume for AI analysis or build one from scratch</p>
                </div>

                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                        <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                            <Upload className="h-4 w-4" />Upload & Analyze
                        </TabsTrigger>
                        <TabsTrigger value="builder" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
                            <FileText className="h-4 w-4" />Resume Builder
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="mt-6"><ResumeUploadSection /></TabsContent>
                    <TabsContent value="builder" className="mt-6"><ResumeBuilderSection /></TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
};

export default SmartResume;
