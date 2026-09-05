import React, { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useInterview } from "@/contexts/InterviewContext";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { InterviewSession, RoundOneAptitudeResult } from "@/types";
import { updateRound1AptitudeResult } from "@/lib/firebaseService";
import { adminApi, emailApi, round1Api, round2Api, snsApi } from "@/lib/api";
import { BulkResumeUpload } from "@/components/BulkResumeUpload";
import { ResumeUpload } from "@/components/ResumeUpload";
import { toast } from "sonner";
import AddQuestionDialog from "@/components/AddQuestionDialog";
import { CodingQuestion } from "@/types/coding";
import { useAdminStats, useAdminInterviews, useRound1Results, useRound2Results, useInstitutions, useCreateInstitution, useUpdateInstitution, QUERY_KEYS } from "@/hooks/useDataQueries";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  BarChart,
  Clock,
  Filter,
  CheckCheck,
  Mail,
  Bot,
  AlertTriangle,
  Ban,
  MessageSquare,
  Settings,
  Lock,
  Unlock,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  Brain,
  Code,
  Plus,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Building2,
  HardDrive,
  DollarSign,
  Megaphone,
  Send,
  RefreshCw,
  ShieldCheck,
  Globe
} from "lucide-react";

import ProctoringSettingsTab from "@/components/ProctoringSettingsTab";
import PlatformCollabTab from "@/components/PlatformCollabTab";
import { subscribeToRoleChanges, toggleRoleStatusInDB } from "@/utils/roleManagement";
import { codingQuestions } from "@/data/codingQuestions";
import { getAIProvider, toggleAIProvider, getProviderConfig, type AIProvider } from "@/utils/aiProviderService";
import { jobRoles } from "@/utils/interviewUtils";

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { sendSelectionEmailToUser, isLoading } = useInterview();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // React Query hooks for cached data
  const { data: adminStats, isLoading: statsLoading } = useAdminStats();
  const { data: interviews = [], isLoading: interviewsLoading } = useAdminInterviews();
  const { data: round1Results = [], isLoading: round1Loading } = useRound1Results();
  const { data: round2Results = [], isLoading: round2Loading } = useRound2Results();
  const { data: institutions = [], isLoading: institutionsLoading } = useInstitutions();
  const createInstitutionMutation = useCreateInstitution();
  const updateInstitutionMutation = useUpdateInstitution();

  // Local state for UI filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [rolesWithStatus, setRolesWithStatus] = useState<Array<import("@/types").JobRole & { isOpen: boolean }>>(jobRoles.map(r => ({ ...r, isOpen: true })));
  const [round1SearchQuery, setRound1SearchQuery] = useState("");
  const [round2SearchQuery, setRound2SearchQuery] = useState("");
  const [sendingRound2Emails, setSendingRound2Emails] = useState<Set<string>>(new Set());
  const [reschedulingRound2, setReschedulingRound2] = useState<Set<string>>(new Set());
  const [sendingRound3Emails, setSendingRound3Emails] = useState<Set<string>>(new Set());
  const [seedingData, setSeedingData] = useState(false);

  // Bypass dialog state — add test candidate without doing full aptitude test
  const [showBypassDialog, setShowBypassDialog] = useState(false);
  const [bypassForm, setBypassForm] = useState({ name: '', email: '', role: '', score: '80' });
  const [submittingBypass, setSubmittingBypass] = useState(false);

  // Custom send-email dialog (admin enters any email address)
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [emailTarget, setEmailTarget] = useState<RoundOneAptitudeResult | null>(null);
  const [customEmailForm, setCustomEmailForm] = useState({ to_email: '', to_name: '', role_name: '', round1_score: '' });
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);
  
  // Institution Dialog State
  const [showInstitutionDialog, setShowInstitutionDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [institutionFormData, setInstitutionFormData] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    institutionCode: '',
    institutionType: 'University',
    location: '',
    contactPerson: '',
    phone: '',
    website: ''
  });
  const [creatingInstitution, setCreatingInstitution] = useState(false);
  const [updatingInstitution, setUpdatingInstitution] = useState<string | null>(null);

  // Coding Questions State
  const [questions, setQuestions] = useState<CodingQuestion[]>(codingQuestions);

  // AI Provider State
  const [aiProvider, setAiProvider] = useState<AIProvider>(getAIProvider());

  // Active View State for sidebar navigation
  const [activeView, setActiveView] = React.useState<'dashboard' | 'round1' | 'round2' | 'coding' | 'institutions' | 'roles' | 'resume' | 'proctoring' | 'platforms'>('dashboard');

  // Filtered Round 2 results
  const filteredRound2Results = useMemo(() => {
    if (!round2SearchQuery) return round2Results;
    const q = round2SearchQuery.toLowerCase();
    return round2Results.filter((r: any) =>
      (r.user_email || '').toLowerCase().includes(q) ||
      (r.user_name || '').toLowerCase().includes(q) ||
      (r.role_name || '').toLowerCase().includes(q)
    );
  }, [round2Results, round2SearchQuery]);



  const handleToggleProvider = () => {
    const newProvider = toggleAIProvider();
    setAiProvider(newProvider);
    toast.success(`Switched to ${getProviderConfig(newProvider).displayName}`);
  };

  // Handler for adding new question
  const handleQuestionAdded = (newQuestion: CodingQuestion) => {
    setQuestions(prev => [...prev, newQuestion]);
    toast.success('Question added successfully!');
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate("/login");
    }
  }, [isAdmin, navigate]);

  // Real-time subscription to role changes from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToRoleChanges((roles) => {
      setRolesWithStatus(roles);
    });
    return () => unsubscribe();
  }, []);

  // Filter interviews using useMemo for performance
  const filteredInterviews = useMemo(() => {
    let results = interviews;

    if (filterRole) {
      results = results.filter(interview =>
        interview.roleName.toLowerCase().includes(filterRole.toLowerCase())
      );
    }

    if (searchQuery) {
      results = results.filter(interview =>
        interview.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        interview.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return results;
  }, [interviews, filterRole, searchQuery]);

  // Filter Round 1 results using useMemo
  const filteredRound1Results = useMemo(() => {
    let results = round1Results;

    if (round1SearchQuery) {
      results = results.filter(result =>
        result.userEmail.toLowerCase().includes(round1SearchQuery.toLowerCase()) ||
        result.roleName.toLowerCase().includes(round1SearchQuery.toLowerCase()) ||
        result.userName?.toLowerCase().includes(round1SearchQuery.toLowerCase())
      );
    }

    return results;
  }, [round1Results, round1SearchQuery]);

  // Total resumes from admin stats
  const totalResumes = adminStats?.totalResumes || 0;

  // Handle institution creation/update using React Query mutations
  const handleSaveInstitution = async () => {
    // Validation
    if (!institutionFormData.name.trim()) {
      toast.error('Institution name is required');
      return;
    }
    if (!institutionFormData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!editMode && (!institutionFormData.password.trim() || institutionFormData.password.length < 6)) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!institutionFormData.institutionCode.trim()) {
      toast.error('Institution code is required');
      return;
    }
    
    try {
      setCreatingInstitution(true);
      
      if (editMode) {
        // Update existing institution using mutation
        await updateInstitutionMutation.mutateAsync({
          id: institutionFormData.id,
          data: {
            name: institutionFormData.name,
            email: institutionFormData.email,
            password: institutionFormData.password, // Send new password if provided
            institutionCode: institutionFormData.institutionCode,
            institutionType: institutionFormData.institutionType,
            location: institutionFormData.location,
            contactPerson: institutionFormData.contactPerson,
            phone: institutionFormData.phone,
            website: institutionFormData.website,
            isActive: true
          }
        });
        
        toast.success(`Institution "${institutionFormData.name}" updated successfully!`);
      } else {
        // Create new institution using mutation
        await createInstitutionMutation.mutateAsync(institutionFormData);
        
        toast.success(`Institution "${institutionFormData.name}" created successfully!`);
        
        // Show credentials info
        toast.info(`Login Code: ${institutionFormData.institutionCode} | Password: ${institutionFormData.password}`, {
          duration: 10000
        });
      }
      
      // Reset form
      setInstitutionFormData({
        id: '',
        name: '',
        email: '',
        password: '',
        institutionCode: '',
        institutionType: 'University',
        location: '',
        contactPerson: '',
        phone: '',
        website: ''
      });
      
      setEditMode(false);
      setShowInstitutionDialog(false);
      
      // Institutions list will auto-refresh via React Query cache invalidation
    } catch (error: any) {
      console.error('Failed to save institution:', error);
      const errorMessage = error instanceof Error ? error.message : `Failed to ${editMode ? 'update' : 'create'} institution`;
      toast.error(errorMessage);
    } finally {
      setCreatingInstitution(false);
    }
  };
  
  // Handle view institution details
  const handleViewInstitution = (institution: any) => {
    setSelectedInstitution(institution);
    setShowViewDialog(true);
  };
  
  // Handle edit institution
  const handleEditInstitution = (institution: any) => {
    setInstitutionFormData({
      id: institution.id,
      name: institution.name,
      email: institution.email,
      password: '', // Don't show existing password
      institutionCode: institution.institution_code,
      institutionType: institution.institution_type || 'University',
      location: institution.location || '',
      contactPerson: institution.contact_person || '',
      phone: institution.phone || '',
      website: institution.website || ''
    });
    setEditMode(true);
    setShowInstitutionDialog(true);
  };
  
  // Handle toggle institution active status
  const handleToggleInstitutionStatus = async (institution: any) => {
    try {
      setUpdatingInstitution(institution.id);
      const newStatus = !institution.is_active;
      
      await updateInstitutionMutation.mutateAsync({
        id: institution.id,
        data: {
          name: institution.name,
          email: institution.email,
          institutionCode: institution.institution_code,
          institutionType: institution.institution_type,
          location: institution.location,
          contactPerson: institution.contact_person,
          phone: institution.phone,
          website: institution.website,
          isActive: newStatus
        }
      });
      
      toast.success(`Institution ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error: any) {
      console.error('Failed to toggle institution status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update institution status';
      toast.error(errorMessage);
    } finally {
      setUpdatingInstitution(null);
    }
  };
  
  // Open create dialog (reset form)
  const handleOpenCreateDialog = () => {
    setInstitutionFormData({
      id: '',
      name: '',
      email: '',
      password: '',
      institutionCode: '',
      institutionType: 'University',
      location: '',
      contactPerson: '',
      phone: '',
      website: ''
    });
    setEditMode(false);
    setShowInstitutionDialog(true);
  };

  // Use admin stats from API for accurate counts, fallback to client-side computation
  const totalInterviews = adminStats?.totalAllActivities ?? interviews.length;
  const completedInterviews = adminStats?.completedInterviews ?? interviews.filter(i => i.completed).length;
  const averageScore = adminStats?.averageScore ?? (
    interviews.filter(i => i.completed).length > 0
      ? interviews
        .filter(i => i.completed && i.score)
        .reduce((sum, i) => sum + (i.score || 0), 0) / interviews.filter(i => i.completed).length
      : 0
  );

  const uniqueRoles = Array.from(new Set(interviews.map(i => i.roleName)));

  // AI Detection Statistics
  const interviewsWithAI = interviews.filter(i =>
    i.answers?.some(a => a.feedback?.possiblyAI)
  ).length;

  const totalAIDetections = interviews.reduce((acc, i) =>
    acc + (i.answers?.filter(a => a.feedback?.possiblyAI).length || 0), 0
  );

  const averageAIConfidence = interviews.reduce((acc, i) => {
    const aiAnswers = i.answers?.filter(a => a.feedback?.possiblyAI && a.feedback?.aiConfidence) || [];
    const totalConfidence = aiAnswers.reduce((sum, a) => sum + (a.feedback?.aiConfidence || 0), 0);
    return acc + totalConfidence;
  }, 0) / (totalAIDetections || 1);

  const highConfidenceAI = interviews.reduce((acc, i) =>
    acc + (i.answers?.filter(a => a.feedback?.aiConfidence && a.feedback.aiConfidence >= 80).length || 0), 0
  );

  const handleSendSelectionEmail = async (interviewId: string) => {
    setProcessingEmail(interviewId);
    try {
      await sendSelectionEmailToUser(interviewId);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_INTERVIEWS] });
    } catch (error) {
      console.error("Failed to send selection email:", error);
    } finally {
      setProcessingEmail(null);
    }
  };

  const getStatusBadge = (interview: InterviewSession) => {
    if (interview.aborted) {
      return <Badge className="bg-red-600 flex items-center gap-1"><Ban className="h-3 w-3" />Aborted</Badge>;
    } else if (interview.selected) {
      return <Badge className="bg-primary">Selected</Badge>;
    } else if (interview.completed) {
      return <Badge className="bg-green-600">Completed</Badge>;
    } else if (interview.answers.length > 0) {
      return <Badge className="bg-amber-500">In Progress</Badge>;
    } else {
      return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getAIBadge = (interview: InterviewSession) => {
    const aiCount = interview.aiDetectionCount ||
      interview.answers.filter(a => a.feedback?.possiblyAI).length;

    if (aiCount > 0) {
      const highConfidence = interview.answers.filter(
        a => a.feedback?.possiblyAI && a.feedback?.aiConfidence && a.feedback.aiConfidence >= 70
      ).length;

      return (
        <Badge
          variant="outline"
          className={`flex items-center gap-1 ${highConfidence > 0
            ? 'bg-red-100 text-red-800 border-red-300'
            : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
        >
          <Bot className="h-3 w-3" />
          Possible AI Usage ({aiCount})
        </Badge>
      );
    }
    return null;
  };

  const getMessageBadge = (interview: InterviewSession) => {
    if (interview.messageGenerated) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Message Sent
        </Badge>
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleToggleRole = async (roleId: string) => {
    const currentRole = rolesWithStatus.find(r => r.id === roleId);
    const isCurrentlyOpen = currentRole?.isOpen ?? true;
    const confirmed = window.confirm(
      `Are you sure you want to ${isCurrentlyOpen ? 'close' : 'open'} this job role for interviews?`
    );

    if (confirmed) {
      try {
        await toggleRoleStatusInDB(roleId, isCurrentlyOpen);
        // No need to manually update state — the real-time listener will do it
        toast.success(`Role ${isCurrentlyOpen ? 'closed' : 'opened'} successfully`);
      } catch (error) {
        console.error('Failed to toggle role:', error);
        toast.error('Failed to update role status. Please try again.');
      }
    }
  };

  // Handle selecting candidate for Round 2 and sending SES email
  const handleSelectForRound2 = async (resultId: string, result: RoundOneAptitudeResult) => {
    setSendingRound2Emails(prev => new Set(prev).add(resultId));
    try {
      // Mark as selected in DB
      await round1Api.update(resultId, { selectedForRound2: true, round2EmailSent: false });

      // Send email via AWS SES
      const emailResult = await emailApi.sendRound2Email({
        to_email: result.userEmail,
        to_name: result.userName || 'Candidate',
        role_name: result.roleName,
        round1_score: result.score,
      });

      // Mark email as sent
      await round1Api.update(resultId, { round2EmailSent: true });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUND1_RESULTS] });
      toast.success(`Round 2 invitation sent to ${result.userEmail}`);
    } catch (error: any) {
      console.error('Error selecting for Round 2:', error);
      // Still mark as selected even if email failed — admin can retry
      try { await round1Api.update(resultId, { selectedForRound2: true }); } catch { }
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUND1_RESULTS] });
      toast.error(`Selected for R2, but email failed: ${error.message || 'Unknown error'}. Use "Send Email" to retry.`);
    } finally {
      setSendingRound2Emails(prev => {
        const newSet = new Set(prev);
        newSet.delete(resultId);
        return newSet;
      });
    }
  };

  // ── Admin: Reschedule Round 2 for a user ─────────────────────────────────
  const handleRescheduleRound2 = async (userId: string, userName: string) => {
    if (!window.confirm(`Reset Round 2 access for ${userName || userId}? They will be able to attempt Round 2 again.`)) return;
    setReschedulingRound2(prev => new Set(prev).add(userId));
    try {
      await round2Api.reschedule(userId);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUND2_RESULTS] });
      toast.success(`Round 2 rescheduled for ${userName || userId}`);
    } catch (err: any) {
      toast.error(`Reschedule failed: ${err.message}`);
    } finally {
      setReschedulingRound2(prev => { const s = new Set(prev); s.delete(userId); return s; });
    }
  };

  // ── Admin: Select for R3 and send invite email ────────────────────────────
  const handleSelectForRound3 = async (result: any) => {
    setSendingRound3Emails(prev => new Set(prev).add(result.id));
    try {
      // 1. Send R3 invitation email first
      await emailApi.sendRound3Email({
        to_email:    result.user_email,
        to_name:     result.user_name || 'Candidate',
        role_name:   result.role_name || 'Software Engineer',
        round2_score: result.score || 0,
      });
      // 2. Once email is sent successfully, mark in DB
      await round2Api.selectForRound3(result.id);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUND2_RESULTS] });
      toast.success(`Round 3 invitation sent to ${result.user_email}`);
    } catch (err: any) {
      console.error('R3 select/email error:', err);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUND2_RESULTS] });
      toast.error(`Email failed: ${err.message}`);
    } finally {
      setSendingRound3Emails(prev => { const s = new Set(prev); s.delete(result.id); return s; });
    }
  };

  // Seed mock test candidates into Round 1 results (bypass for testing)
  const handleSeedTestCandidates = async () => {
    setSeedingData(true);
    try {
      const result = await adminApi.seedTestCandidates();
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUND1_RESULTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_STATS] });
      toast.success(result.message || 'Mock candidates seeded successfully!');
    } catch (error: any) {
      toast.error(`Failed to seed data: ${error.message}`);
    } finally {
      setSeedingData(false);
    }
  };

  // Add a single bypass candidate manually
  const handleBypassSubmit = async () => {
    if (!bypassForm.name.trim() || !bypassForm.email.trim() || !bypassForm.role.trim()) {
      toast.error('Name, email, and role are required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bypassForm.email)) {
      toast.error('Invalid email address');
      return;
    }
    const score = parseInt(bypassForm.score, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error('Score must be 0–100');
      return;
    }
    setSubmittingBypass(true);
    try {
      const correct = Math.round((score / 100) * 25);
      await round1Api.save({
        userId: 'bypass-' + Date.now(),
        userEmail: bypassForm.email.trim(),
        userName: bypassForm.name.trim(),
        roleId: bypassForm.role.toLowerCase().replace(/\s+/g, '-'),
        roleName: bypassForm.role.trim(),
        score,
        totalQuestions: 25,
        correctAnswers: correct,
        categoryPerformance: {},
        completedAt: new Date().toISOString(),
        aborted: false,
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUND1_RESULTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_STATS] });
      toast.success(`Candidate ${bypassForm.name} added to Round 1 results!`);
      setBypassForm({ name: '', email: '', role: '', score: '80' });
      setShowBypassDialog(false);
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setSubmittingBypass(false);
    }
  };

  // Send email to any address (custom / retry)
  const handleCustomEmailSend = async () => {
    if (!customEmailForm.to_email || !customEmailForm.to_name || !customEmailForm.role_name) {
      toast.error('Email, name, and role are required');
      return;
    }
    setSendingCustomEmail(true);
    try {
      await emailApi.sendRound2Email({
        to_email: customEmailForm.to_email.trim(),
        to_name: customEmailForm.to_name.trim(),
        role_name: customEmailForm.role_name.trim(),
        round1_score: customEmailForm.round1_score ? parseInt(customEmailForm.round1_score, 10) : undefined,
      });
      toast.success(`Email sent to ${customEmailForm.to_email}!`);
      setShowSendEmailDialog(false);
      setEmailTarget(null);
      setCustomEmailForm({ to_email: '', to_name: '', role_name: '', round1_score: '' });
    } catch (error: any) {
      toast.error(`Email failed: ${error.message}`);
    } finally {
      setSendingCustomEmail(false);
    }
  };



  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage and monitor interview system</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={aiProvider === 'openai' ? 'default' : 'outline'}
                  onClick={handleToggleProvider}
                  size="sm"
                  className="gap-2"
                >
                  {aiProvider === 'openai' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/api-test')} size="sm">
                  <Bot className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate('/openai-test')} size="sm">
                  <Brain className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => setActiveView('dashboard')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <BarChart className="h-4 w-4" />
                Overview
              </Button>
              <Button
                variant={activeView === 'round1' ? 'default' : 'ghost'}
                onClick={() => setActiveView('round1')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <Brain className="h-4 w-4" />
                Round 1 <Badge variant="secondary" className="ml-1">{round1Results.length}</Badge>
              </Button>
              <Button
                variant={activeView === 'round2' ? 'default' : 'ghost'}
                onClick={() => setActiveView('round2')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <Code className="h-4 w-4" />
                Round 2 <Badge variant="secondary" className="ml-1">{round2Results.length}</Badge>
              </Button>
              <Button
                variant={activeView === 'coding' ? 'default' : 'ghost'}
                onClick={() => setActiveView('coding')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <Code className="h-4 w-4" />
                Coding
              </Button>
              <Button
                variant={activeView === 'institutions' ? 'default' : 'ghost'}
                onClick={() => setActiveView('institutions')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <Building2 className="h-4 w-4" />
                Institutions <Badge variant="secondary" className="ml-1">{institutions.length}</Badge>
              </Button>
              <Button
                variant={activeView === 'roles' ? 'default' : 'ghost'}
                onClick={() => setActiveView('roles')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <Settings className="h-4 w-4" />
                Roles
              </Button>
              <Button
                variant={activeView === 'resume' ? 'default' : 'ghost'}
                onClick={() => setActiveView('resume')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <CheckCheck className="h-4 w-4" />
                Resume
              </Button>

              <Button
                variant={activeView === 'proctoring' ? 'default' : 'ghost'}
                onClick={() => setActiveView('proctoring')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <ShieldCheck className="h-4 w-4" />
                Proctoring
              </Button>
              <Button
                variant={activeView === 'platforms' ? 'default' : 'ghost'}
                onClick={() => setActiveView('platforms')}
                className="gap-2 whitespace-nowrap"
                size="sm"
              >
                <Globe className="h-4 w-4" />
                Platforms
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container max-w-7xl mx-auto px-6 py-6">
            
            {/* Dashboard View */}
            {activeView === 'dashboard' && (
              <div className="space-y-6">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                          <h3 className="text-3xl font-bold mt-1">{adminStats?.totalUsers ?? 0}</h3>
                          <p className="text-xs text-muted-foreground mt-2">{totalResumes} resumes saved</p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                          <Users className="h-8 w-8 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                          <h3 className="text-3xl font-bold mt-1">{totalInterviews}</h3>
                          <p className="text-xs text-muted-foreground mt-2">
                            Avg: {averageScore > 0 ? `${averageScore.toFixed(1)}/10` : 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                          <BarChart className="h-8 w-8 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Institutions</p>
                          <h3 className="text-3xl font-bold mt-1">{institutions.length}</h3>
                          <p className="text-xs text-muted-foreground mt-2">
                            {institutions.filter(i => i.is_active).length} active
                          </p>
                        </div>
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                          <Building2 className="h-8 w-8 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">AI Detections</p>
                          <h3 className="text-3xl font-bold mt-1">{interviewsWithAI}</h3>
                          <p className="text-xs text-muted-foreground mt-2">
                            {averageAIConfidence.toFixed(1)}% confidence
                          </p>
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                          <AlertTriangle className="h-8 w-8 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Stats Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Activity Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50 transition-colors">
                        <span className="text-sm text-muted-foreground">Mock Interviews</span>
                        <Badge variant="secondary">{adminStats?.totalInterviews ?? interviews.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50 transition-colors">
                        <span className="text-sm text-muted-foreground">Round 1 Aptitude</span>
                        <Badge variant="secondary">{adminStats?.totalRound1 ?? round1Results.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50 transition-colors">
                        <span className="text-sm text-muted-foreground">AI Bot Interviews</span>
                        <Badge variant="secondary">{adminStats?.totalBotInterviews ?? 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded hover:bg-muted/50 transition-colors">
                        <span className="text-sm text-muted-foreground">Practice Sessions</span>
                        <Badge variant="secondary">{(adminStats?.totalPracticeInterviews ?? 0) + (adminStats?.totalPracticeAptitude ?? 0) + (adminStats?.totalPracticeCoding ?? 0)}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart className="h-4 w-4" />
                        Popular Roles
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(adminStats?.popularRoles && adminStats.popularRoles.length > 0) ? (
                        <div className="space-y-2">
                          {adminStats.popularRoles.map(({ role, count }) => (
                            <div key={role} className="flex justify-between items-center p-2 rounded hover:bg-muted/50 transition-colors">
                              <span className="text-sm text-muted-foreground">{role}</span>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : uniqueRoles.length > 0 ? (
                        <div className="space-y-2">
                          {uniqueRoles.slice(0, 4).map(role => (
                            <div key={role} className="flex justify-between items-center p-2 rounded hover:bg-muted/50 transition-colors">
                              <span className="text-sm text-muted-foreground">{role}</span>
                              <Badge variant="secondary">{interviews.filter(i => i.roleName === role).length}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">No data available</p>
                      )}
                    </CardContent>
        </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(adminStats?.recentActivity && adminStats.recentActivity.length > 0) ? (
                        <div className="space-y-2">
                          {adminStats.recentActivity.slice(0, 4).map((activity) => (
                            <div key={activity.id} className="p-2 rounded border hover:bg-muted/50 transition-colors">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                                  {activity.type === 'interview' && `Mock: ${activity.roleName || 'N/A'}`}
                                  {activity.type === 'round1' && `R1: ${activity.roleName || 'N/A'}`}
                                  {activity.type === 'bot_interview' && `Bot: ${activity.roleName || 'N/A'}`}
                                </p>
                                <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                                  {formatDate(activity.date)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* AI Detection Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      AI Detection Analytics
                    </CardTitle>
                    <CardDescription>Monitor AI-generated content detection across interviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border">
                        <p className="text-xs text-muted-foreground mb-1">With AI</p>
                        <p className="text-2xl font-bold">{interviewsWithAI}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border">
                        <p className="text-xs text-muted-foreground mb-1">Total Answers</p>
                        <p className="text-2xl font-bold">{totalAIDetections}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border">
                        <p className="text-xs text-muted-foreground mb-1">Avg Confidence</p>
                        <p className="text-2xl font-bold">{averageAIConfidence.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border">
                        <p className="text-xs text-muted-foreground mb-1">High Confidence</p>
                        <p className="text-2xl font-bold">{highConfidenceAI}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Detection Rate</p>
                        <p className="text-sm font-bold">{((interviewsWithAI / (interviews.length || 1)) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                          style={{ width: `${(interviewsWithAI / (interviews.length || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Role Management View */}
            {activeView === 'roles' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rolesWithStatus.map((role) => (
                    <Card key={role.id} className={`transition-all hover:shadow-md ${
                      role.isOpen ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
                    }`}>
                      <CardContent className="p-5">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-base mb-1">{role.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">{role.description}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant={role.isOpen ? "default" : "secondary"} className={role.isOpen ? "bg-green-500" : ""}>
                              {role.isOpen ? (
                                <>
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Open
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  Closed
                                </>
                              )}
                            </Badge>
                            <Button
                              variant={role.isOpen ? "destructive" : "default"}
                              size="sm"
                              onClick={() => handleToggleRole(role.id)}
                            >
                              {role.isOpen ? (
                                <>
                                  <Lock className="h-3 w-3 mr-1" />
                                  Close
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-3 w-3 mr-1" />
                                  Open
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Resume Analysis View */}
            {activeView === 'resume' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Single Resume Analysis</CardTitle>
                    <CardDescription>Upload a resume to find the best matching role</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResumeUpload showBestMatch={true} minimumScore={0} />
                  </CardContent>
                </Card>

                <BulkResumeUpload />
              </div>
            )}

            {/* Proctoring Settings View */}
            {activeView === 'proctoring' && (
              <ProctoringSettingsTab />
            )}

            {/* Round 1 - Aptitude View */}
            {activeView === 'round1' && (
              <div className="space-y-4">
                {/* Admin Testing Bypass Toolbar */}
                <Card className="border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <Brain className="h-4 w-4" />
                        <span className="text-sm font-medium">Admin Testing Tools</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-100"
                        onClick={handleSeedTestCandidates}
                        disabled={seedingData}
                      >
                        {seedingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {seedingData ? 'Seeding...' : 'Seed 6 Mock Candidates'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-100"
                        onClick={() => setShowBypassDialog(true)}
                      >
                        <Edit className="h-4 w-4" />
                        Add Test Candidate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-blue-400 text-blue-700 hover:bg-blue-100"
                        onClick={() => {
                          setCustomEmailForm({ to_email: '', to_name: '', role_name: '', round1_score: '' });
                          setEmailTarget(null);
                          setShowSendEmailDialog(true);
                        }}
                      >
                        <Mail className="h-4 w-4" />
                        Send Email to Any Address
                      </Button>
                      <span className="text-xs text-muted-foreground">Bypass for testing — no aptitude test needed</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Round 1 - Aptitude Test Results</CardTitle>
                    <CardDescription>{round1Results.length} candidates completed • Review and select for Round 2</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by email, name, or role..."
                          className="pl-8"
                          value={round1SearchQuery}
                          onChange={(e) => setRound1SearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {filteredRound1Results.length > 0 ? (
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Candidate</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Correct/Total</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Proctoring</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRound1Results
                              .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                              .map(result => (
                                <TableRow key={result.id} className="hover:bg-muted/20 transition-colors">
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{result.userName || 'N/A'}</p>
                                      <p className="text-sm text-muted-foreground">{result.userEmail}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>{result.roleName}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={result.score >= 70 ? "default" : result.score >= 50 ? "secondary" : "destructive"}
                                      className="text-base px-3 py-1"
                                    >
                                      {result.score}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {result.correctAnswers} / {result.totalQuestions}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {new Date(result.completedAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </TableCell>
                                  <TableCell>
                                    {result.selectedForRound2 ? (
                                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                                        <CheckCircle className="h-3 w-3" />
                                        Selected for R2
                                      </Badge>
                                    ) : result.aborted ? (
                                      <Badge className="bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                                        <Ban className="h-3 w-3" />
                                        Aborted
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                        <Clock className="h-3 w-3" />
                                        Pending
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {result.aborted ? (
                                      <div className="max-w-[220px]">
                                        <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-md px-2.5 py-1.5 whitespace-normal break-words leading-snug">
                                          {result.abortReason || 'Violated rules'}
                                        </div>
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                                        Clean
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex flex-col items-end gap-1">
                                      {!result.selectedForRound2 && !result.aborted && result.score >= 50 && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleSelectForRound2(result.id, result)}
                                          disabled={sendingRound2Emails.has(result.id)}
                                          className="gap-2"
                                        >
                                          {sendingRound2Emails.has(result.id) ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                                          ) : (
                                            <><Mail className="h-4 w-4" />Select & Email R2</>
                                          )}
                                        </Button>
                                      )}
                                      {result.selectedForRound2 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 text-xs"
                                          onClick={() => {
                                            setCustomEmailForm({ to_email: result.userEmail, to_name: result.userName || 'Candidate', role_name: result.roleName, round1_score: String(result.score) });
                                            setEmailTarget(result);
                                            setShowSendEmailDialog(true);
                                          }}
                                        >
                                          <Mail className="h-3 w-3" />
                                          Resend Email
                                        </Button>
                                      )}
                                      {!result.selectedForRound2 && !result.aborted && result.score < 50 && (
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                          <XCircle className="h-3 w-3" />
                                          Below threshold
                                        </Badge>
                                      )}
                                      {result.aborted && !result.selectedForRound2 && (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                          <Ban className="h-3 w-3" />
                                          Disqualified
                                        </Badge>
                                      )}
                                      {result.selectedForRound2 && result.round2EmailSent && (
                                        <Badge className="bg-green-50 text-green-700 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          Email Sent
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <CheckCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Round 1 Results Found</h3>
                        <p className="text-muted-foreground mb-4">
                          No candidates have completed the aptitude test yet
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleSeedTestCandidates}
                          disabled={seedingData}
                          className="gap-2"
                        >
                          {seedingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          Load 6 Mock Candidates for Testing
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Round 2 - Coding Interview Results */}
            {activeView === 'round2' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Round 2 — Coding Interview Results
                    </CardTitle>
                    <CardDescription>
                      {round2Results.length} submissions • Review, reschedule, or select candidates for Round 3
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                          placeholder="Search by email, name, or role..."
                          className="w-full h-10 rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={round2SearchQuery}
                          onChange={(e) => setRound2SearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {round2Loading ? (
                      <div className="py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground mt-3">Loading results…</p>
                      </div>
                    ) : filteredRound2Results.length > 0 ? (
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Candidate</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Solved</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRound2Results
                              .sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
                              .map((result: any) => (
                                <TableRow key={result.id} className="hover:bg-muted/20 transition-colors">
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{result.user_name || 'N/A'}</p>
                                      <p className="text-sm text-muted-foreground">{result.user_email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{result.role_name || '—'}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={result.score >= 70 ? 'default' : result.score >= 40 ? 'secondary' : 'destructive'}
                                      className="text-base px-3 py-1"
                                    >
                                      {Math.round(result.score || 0)}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-center">
                                    {result.problems_solved ?? 0} / {result.total_problems ?? 2}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {result.time_spent ? `${result.time_spent}m` : '—'}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {result.completed_at
                                      ? new Date(result.completed_at).toLocaleDateString('en-US', {
                                          year: 'numeric', month: 'short', day: 'numeric',
                                          hour: '2-digit', minute: '2-digit',
                                        })
                                      : '—'}
                                  </TableCell>
                                  <TableCell>
                                    {result.selected_for_round3 ? (
                                      <Badge className="bg-violet-100 text-violet-800 flex items-center gap-1 w-fit">
                                        <CheckCircle className="h-3 w-3" />
                                        Selected R3
                                      </Badge>
                                    ) : result.rescheduled ? (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-700 flex items-center gap-1 w-fit">
                                        <RefreshCw className="h-3 w-3" />
                                        Rescheduled
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                        <Clock className="h-3 w-3" />
                                        Completed
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex flex-col items-end gap-1">
                                      {/* Select for R3 + Send Email */}
                                      {!result.selected_for_round3 && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleSelectForRound3(result)}
                                          disabled={sendingRound3Emails.has(result.id)}
                                          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                                        >
                                          {sendingRound3Emails.has(result.id) ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                                          ) : (
                                            <><Mail className="h-4 w-4" />Select & Email R3</>
                                          )}
                                        </Button>
                                      )}
                                      {result.selected_for_round3 && (
                                        <Badge className="bg-green-50 text-green-700 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          R3 Email Sent
                                        </Badge>
                                      )}
                                      {/* Reschedule Round 2 */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRescheduleRound2(result.user_id, result.user_name)}
                                        disabled={reschedulingRound2.has(result.user_id)}
                                        className="gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                                      >
                                        {reschedulingRound2.has(result.user_id) ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <RefreshCw className="h-3 w-3" />
                                        )}
                                        Reschedule R2
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <Code className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Round 2 Submissions Yet</h3>
                        <p className="text-muted-foreground">
                          Candidates selected for Round 2 will appear here after completing the coding interview.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}


            {/* Coding Questions View */}
            {activeView === 'coding' && (
              <div className="space-y-4">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-2xl font-bold">{questions.length}</p>
                        </div>
                        <Code className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Easy</p>
                          <p className="text-2xl font-bold text-green-600">
                            {questions.filter(q => q.difficulty === 'easy').length}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <span className="text-green-600 font-bold">E</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Medium</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {questions.filter(q => q.difficulty === 'medium').length}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                          <span className="text-yellow-600 font-bold">M</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Hard</p>
                          <p className="text-2xl font-bold text-red-600">
                            {questions.filter(q => q.difficulty === 'hard').length}
                          </p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <span className="text-red-600 font-bold">H</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Questions Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">All Coding Questions</CardTitle>
                        <CardDescription>Manage coding practice questions</CardDescription>
                      </div>
                      <AddQuestionDialog onQuestionAdded={handleQuestionAdded} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Question</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Test Cases</TableHead>
                            <TableHead>Time Limit</TableHead>
                            <TableHead>Languages</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {questions.map((question) => (
                            <TableRow key={question.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell>
                                <div>
                                  <p className="font-medium">{question.title}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {question.description.slice(0, 60)}...
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    question.difficulty === 'easy'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : question.difficulty === 'medium'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }
                                >
                                  {question.difficulty.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{question.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <span className="font-medium">{question.testCases.length}</span>
                                  <span className="text-muted-foreground ml-1">
                                    ({question.testCases.filter(tc => tc.isHidden).length} hidden)
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {question.timeLimit ? `${question.timeLimit} min` : 'No limit'}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(question.starterCode).map(lang => (
                                    <Badge key={lang} variant="secondary" className="text-xs">
                                      {lang}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" title="View Details">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" title="Edit">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" title="Delete">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Institutions Management View */}
            {activeView === 'institutions' && (
              <div className="space-y-4">
                {/* Institution Create/Edit Dialog */}
                <Dialog open={showInstitutionDialog} onOpenChange={(open) => {
                  setShowInstitutionDialog(open);
                  if (!open) {
                    setEditMode(false);
                  }
                }}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">{editMode ? 'Edit Institution' : 'Create New Institution'}</DialogTitle>
                      <DialogDescription>
                        {editMode 
                          ? 'Update institution details. Leave password empty to keep existing password.'
                          : 'Add a new institution to the system. They can login using the institution code and password.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      {/* Institution Name */}
                      <div className="grid gap-2">
                        <Label htmlFor="inst-name">Institution Name *</Label>
                        <Input
                          id="inst-name"
                          placeholder="e.g., MIT University"
                          value={institutionFormData.name}
                          onChange={(e) => setInstitutionFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      {/* Institution Code */}
                      <div className="grid gap-2">
                        <Label htmlFor="inst-code">Institution Code * (Unique Identifier)</Label>
                        <Input
                          id="inst-code"
                          placeholder="e.g., MIT or MITECH"
                          value={institutionFormData.institutionCode}
                          onChange={(e) => setInstitutionFormData(prev => ({ 
                            ...prev, 
                            institutionCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                          }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          This code will be used for login. Only letters and numbers allowed.
                        </p>
                      </div>

                      {/* Email and Password Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="inst-email">Email *</Label>
                          <Input
                            id="inst-email"
                            type="email"
                            placeholder="contact@institution.edu"
                            value={institutionFormData.email}
                            onChange={(e) => setInstitutionFormData(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="inst-password">Password {editMode ? '(leave empty to keep existing)' : '* (min 6 chars)'}</Label>
                          <Input
                            id="inst-password"
                            type="text"
                            placeholder={editMode ? "Leave empty to keep current password" : "Enter password"}
                            value={institutionFormData.password}
                            onChange={(e) => setInstitutionFormData(prev => ({ ...prev, password: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Institution Type and Location */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="inst-type">Institution Type</Label>
                          <Select 
                            value={institutionFormData.institutionType}
                            onValueChange={(value) => setInstitutionFormData(prev => ({ ...prev, institutionType: value }))}
                          >
                            <SelectTrigger id="inst-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="University">University</SelectItem>
                              <SelectItem value="College">College</SelectItem>
                              <SelectItem value="School">School</SelectItem>
                              <SelectItem value="Company">Company</SelectItem>
                              <SelectItem value="Training Center">Training Center</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="inst-location">Location</Label>
                          <Input
                            id="inst-location"
                            placeholder="e.g., Boston, MA"
                            value={institutionFormData.location}
                            onChange={(e) => setInstitutionFormData(prev => ({ ...prev, location: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Contact Person and Phone */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="inst-contact">Contact Person</Label>
                          <Input
                            id="inst-contact"
                            placeholder="e.g., John Doe"
                            value={institutionFormData.contactPerson}
                            onChange={(e) => setInstitutionFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="inst-phone">Phone</Label>
                          <Input
                            id="inst-phone"
                            placeholder="e.g., +1-234-567-8900"
                            value={institutionFormData.phone}
                            onChange={(e) => setInstitutionFormData(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Website */}
                      <div className="grid gap-2">
                        <Label htmlFor="inst-website">Website</Label>
                        <Input
                          id="inst-website"
                          placeholder="https://institution.edu"
                          value={institutionFormData.website}
                          onChange={(e) => setInstitutionFormData(prev => ({ ...prev, website: e.target.value }))}
                        />
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <strong>Login Instructions:</strong> After creation, institutions can login using their Institution Code and Password on the login page.
                        </p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setShowInstitutionDialog(false);
                        setEditMode(false);
                      }} disabled={creatingInstitution}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveInstitution} disabled={creatingInstitution}>
                        {creatingInstitution ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {editMode ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          <>
                            {editMode ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                            {editMode ? 'Update Institution' : 'Create Institution'}
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* View Institution Details Dialog */}
                <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Institution Details</DialogTitle>
                      <DialogDescription>
                        View complete information about this institution
                      </DialogDescription>
                    </DialogHeader>
                    
                    {selectedInstitution && (
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Institution Name</Label>
                            <p className="font-medium mt-1">{selectedInstitution.name}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Institution Code</Label>
                            <p className="font-medium mt-1">
                              <Badge variant="outline" className="text-base">{selectedInstitution.institution_code}</Badge>
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Email</Label>
                            <p className="font-medium mt-1">{selectedInstitution.email}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Type</Label>
                            <p className="font-medium mt-1">{selectedInstitution.institution_type}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Location</Label>
                            <p className="font-medium mt-1">{selectedInstitution.location || 'Not specified'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Status</Label>
                            <p className="font-medium mt-1">
                              {selectedInstitution.is_active ? (
                                <Badge variant="default" className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Contact Person</Label>
                            <p className="font-medium mt-1">{selectedInstitution.contact_person || 'Not specified'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Phone</Label>
                            <p className="font-medium mt-1">{selectedInstitution.phone || 'Not specified'}</p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-muted-foreground">Website</Label>
                          <p className="font-medium mt-1">
                            {selectedInstitution.website ? (
                              <a 
                                href={selectedInstitution.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {selectedInstitution.website}
                              </a>
                            ) : (
                              'Not specified'
                            )}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Total Students</Label>
                            <p className="font-medium mt-1 flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {selectedInstitution.student_count || 0}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Created Date</Label>
                            <p className="font-medium mt-1">
                              {selectedInstitution.created_at ? new Date(selectedInstitution.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            <strong>Login Credentials:</strong> Institution Code: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{selectedInstitution.institution_code}</code>
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Password is securely stored and cannot be viewed. Use the edit button to change it.
                          </p>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                        Close
                      </Button>
                      <Button onClick={() => {
                        if (selectedInstitution) {
                          handleEditInstitution(selectedInstitution);
                          setShowViewDialog(false);
                        }
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Institution
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {institutionsLoading ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                        <p className="text-muted-foreground">Loading institutions...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : institutions.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">All Institutions</CardTitle>
                          <CardDescription>{institutions.length} registered • {institutions.filter(i => i.is_active).length} active</CardDescription>
                        </div>
                        <Button className="gap-2" onClick={handleOpenCreateDialog} size="sm">
                          <Plus className="h-4 w-4" />
                          Add Institution
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Institution Name</TableHead>
                              <TableHead>Code</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Students</TableHead>
                              <TableHead>Contact</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {institutions.map((inst: any) => (
                              <TableRow key={inst.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="font-medium">{inst.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono">{inst.institution_code}</Badge>
                                </TableCell>
                                <TableCell>{inst.institution_type}</TableCell>
                                <TableCell className="text-muted-foreground">{inst.location || 'N/A'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{inst.student_count || 0}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">{inst.email}</TableCell>
                                <TableCell>
                                  {inst.is_active ? (
                                    <Badge variant="default" className="bg-green-500">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Inactive
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      title="View Details"
                                      onClick={() => handleViewInstitution(inst)}
                                      className="hover:bg-blue-50 dark:hover:bg-blue-950"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      title="Edit"
                                      onClick={() => handleEditInstitution(inst)}
                                      className="hover:bg-purple-50 dark:hover:bg-purple-950"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      title={inst.is_active ? "Deactivate" : "Activate"}
                                      className={inst.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" : "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"}
                                      onClick={() => handleToggleInstitutionStatus(inst)}
                                      disabled={updatingInstitution === inst.id}
                                    >
                                      {updatingInstitution === inst.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        inst.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <h3 className="text-lg font-semibold mb-1">No institutions yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">Add your first institution to get started</p>
                      <Button className="gap-2" onClick={handleOpenCreateDialog}>
                        <Plus className="h-4 w-4" />
                        Add First Institution
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Platforms / Collaborations View */}
            {activeView === 'platforms' && (
              <div className="space-y-6">
                <PlatformCollabTab />
              </div>
            )}
          </main>

          {/* ========== BYPASS: Add Test Candidate Dialog ========== */}
          <Dialog open={showBypassDialog} onOpenChange={setShowBypassDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-amber-600" />
                  Add Test Candidate (Bypass)
                </DialogTitle>
                <DialogDescription>
                  Directly add a candidate to Round 1 results without them taking the aptitude test. For testing only.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="bypass-name">Candidate Name *</Label>
                  <Input
                    id="bypass-name"
                    placeholder="e.g. John Doe"
                    value={bypassForm.name}
                    onChange={(e) => setBypassForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="bypass-email">Email Address *</Label>
                  <Input
                    id="bypass-email"
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={bypassForm.email}
                    onChange={(e) => setBypassForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="bypass-role">Role Applied For *</Label>
                  <Input
                    id="bypass-role"
                    placeholder="e.g. Software Engineer"
                    value={bypassForm.role}
                    onChange={(e) => setBypassForm(f => ({ ...f, role: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="bypass-score">Score (%) *</Label>
                  <Input
                    id="bypass-score"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="80"
                    value={bypassForm.score}
                    onChange={(e) => setBypassForm(f => ({ ...f, score: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBypassDialog(false)}>Cancel</Button>
                <Button onClick={handleBypassSubmit} disabled={submittingBypass} className="gap-2">
                  {submittingBypass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Candidate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ========== Send Email Dialog ========== */}
          <Dialog open={showSendEmailDialog} onOpenChange={(open) => { setShowSendEmailDialog(open); if (!open) { setEmailTarget(null); } }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Send Round 2 Invitation Email
                </DialogTitle>
                <DialogDescription>
                  Send a Round 2 invitation via AWS SES to any email address.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="email-to">To (Email Address) *</Label>
                  <Input
                    id="email-to"
                    type="email"
                    placeholder="candidate@example.com"
                    value={customEmailForm.to_email}
                    onChange={(e) => setCustomEmailForm(f => ({ ...f, to_email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email-name">Candidate Name *</Label>
                  <Input
                    id="email-name"
                    placeholder="e.g. John Doe"
                    value={customEmailForm.to_name}
                    onChange={(e) => setCustomEmailForm(f => ({ ...f, to_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email-role">Role *</Label>
                  <Input
                    id="email-role"
                    placeholder="e.g. Software Engineer"
                    value={customEmailForm.role_name}
                    onChange={(e) => setCustomEmailForm(f => ({ ...f, role_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email-score">Round 1 Score (%) — Optional</Label>
                  <Input
                    id="email-score"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 80"
                    value={customEmailForm.round1_score}
                    onChange={(e) => setCustomEmailForm(f => ({ ...f, round1_score: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  ⚠️ AWS SES sandbox mode requires both sender (<code>SES_FROM_EMAIL</code>) and recipient addresses to be verified. In production mode, any address can receive emails.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSendEmailDialog(false)}>Cancel</Button>
                <Button onClick={handleCustomEmailSend} disabled={sendingCustomEmail} className="gap-2">
                  {sendingCustomEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {sendingCustomEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      </div>
    </Layout>
  );
};

export default AdminDashboard;
