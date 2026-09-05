import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { InterviewSession, RoundOneAptitudeResult } from "@/types";
import {
  getUserInterviews,
  deleteInterview,
  getRound1AptitudeResults,
  getBotInterviewHistory,
  getPracticeInterviewHistory,
  BotInterviewResult,
  PracticeInterviewResult,
} from "@/lib/firebaseService";
import { useAuth } from "@/contexts/AuthContext";
import { useInterview } from "@/contexts/InterviewContext";
import { generatePDF } from "@/utils/reportUtils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Download,
  Calendar,
  Clock,
  Briefcase,
  FileText,
  BarChart,
  Trash,
  CheckCircle,
  Mail,
  AlertTriangle,
  Ban,
  Shield,
  Search,
  Eye,
  EyeOff,
  PlayCircle,
  Award,
  Brain,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const History = () => {
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [round1Results, setRound1Results] = useState<RoundOneAptitudeResult[]>([]);
  const [botInterviews, setBotInterviews] = useState<BotInterviewResult[]>([]);
  const [practiceInterviews, setPracticeInterviews] = useState<PracticeInterviewResult[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { startInterview } = useInterview();

  useEffect(() => {
    const loadInterviews = async () => {
      if (!user) {
        console.log('⏭️ History: No user logged in, skipping load');
        return;
      }

      try {
        console.log('🔄 History: Loading interviews for user:', user.id);
        console.log('User details:', { id: user.id, email: user.email, name: user.name });

        const userInterviews = await getUserInterviews(user.id);
        console.log(`✅ Loaded ${userInterviews.length} interviews from Firestore`);

        const completedInterviews = userInterviews.filter(i => i.completed);
        console.log(`✅ ${completedInterviews.length} completed interviews`);
        setInterviews(completedInterviews);

        // Load Round 1 aptitude results for this user
        console.log('🔄 Loading Round 1 aptitude results...');
        const round1 = await getRound1AptitudeResults(user.id);
        console.log(`✅ Loaded ${round1.length} Round 1 results`);
        setRound1Results(round1);

        // Load bot interview history
        try {
          const botResults = await getBotInterviewHistory(user.id);
          setBotInterviews(botResults);
        } catch (err) { console.error('Error loading bot interviews:', err); }

        // Load practice interview history
        try {
          const practiceResults = await getPracticeInterviewHistory(user.id);
          setPracticeInterviews(practiceResults);
        } catch (err) { console.error('Error loading practice interviews:', err); }
      } catch (error: any) {
        console.error('❌ Error loading interviews:', error);
        console.error('Error details:', {
          message: error?.message,
          code: error?.code,
          stack: error?.stack
        });
        toast({
          title: "Error",
          description: "Failed to load interview history",
          variant: "destructive"
        });
      }
    };

    loadInterviews();

    // Refresh every 10 seconds
    const intervalId = setInterval(loadInterviews, 10000);

    return () => clearInterval(intervalId);
  }, [user]);

  const handleDeleteInterview = async (interviewId: string) => {
    try {
      const result = await deleteInterview(interviewId);
      if (result.success) {
        const updatedInterviews = interviews.filter(i => i.id !== interviewId);
        setInterviews(updatedInterviews);
        toast({
          title: "Interview Deleted",
          description: "The interview record has been removed.",
        });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting interview:', error);
      toast({
        title: "Error",
        description: "Failed to delete interview",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if interview results should be hidden (formal interviews for non-admin users)
  const shouldHideResults = (interview: InterviewSession) => {
    return !interview.isPracticeMode && !user?.isAdmin;
  };

  // Handle starting Round 2 interview
  const handleStartRound2 = async (roleId: string, roleName: string, round1ResultId: string) => {
    try {
      console.log('🎬 Starting Round 2 interview for role:', roleName, 'Round 1 ID:', round1ResultId);
      // Start the interview with the selected role (formal interview, not practice)
      // Pass round=2 and reference to Round 1 result
      await startInterview(roleId, undefined, true, { round: 2, aptitudeRoundId: round1ResultId });
      // Navigate to interview page
      navigate('/interview');
    } catch (error) {
      console.error('❌ Error starting Round 2 interview:', error);
      toast({
        title: "Error",
        description: "Failed to start Round 2 interview. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getOutcomeMessage = (interview: InterviewSession) => {
    // For formal interviews viewed by non-admin users, show pending status
    if (shouldHideResults(interview)) {
      return (
        <div className="mb-4 bg-blue-50 p-4 rounded-md border border-blue-200">
          <p className="text-blue-800 flex items-center gap-2 mb-2">
            <Search className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">Results Under Evaluation</span>
          </p>
          <p className="text-sm text-blue-700">
            Your interview responses are being evaluated. You will receive an email notification once the results are ready.
            Please check your inbox (including spam folder) regularly.
          </p>
        </div>
      );
    }

    if (interview.aborted) {
      return (
        <div className="mb-4 bg-red-50 p-3 rounded-md border border-red-200">
          <p className="text-red-800 flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            <span className="font-medium">Interview Aborted</span>
            {interview.abortReason && <span>: {interview.abortReason}</span>}
          </p>
        </div>
      );
    }

    if (interview.selected) {
      return (
        <div className="mb-4 bg-green-50 p-3 rounded-md border border-green-200">
          <p className="text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium">Congratulations!</span> You have been selected for this role based on your performance.
          </p>
        </div>
      );
    }

    if (interview.score) {
      if (interview.score >= 6) {
        return (
          <div className="mb-4 bg-green-50 p-3 rounded-md border border-green-200">
            <p className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">Great Performance!</span> Your score indicates you're well prepared for this role.
            </p>
          </div>
        );
      } else if (interview.score >= 4) {
        return (
          <div className="mb-4 bg-amber-50 p-3 rounded-md border border-amber-200">
            <p className="text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-medium">Average Performance.</span> There's room for improvement, but you're on the right track.
            </p>
          </div>
        );
      } else {
        return (
          <div className="mb-4 bg-red-50 p-3 rounded-md border border-red-200">
            <p className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-medium">Needs Improvement.</span> Review your feedback and try again.
            </p>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Interview History</h1>
            <p className="text-muted-foreground">
              {user?.isAdmin ? 'All interview records (Admin View)' : 'Your interview records and status updates'}
            </p>
          </div>

          <Button onClick={() => navigate("/mock-interview")}>
            Start New Interview
          </Button>
        </div>

        {user?.isAdmin && (
          <Alert className="mb-6 bg-purple-50 border-purple-200">
            <Shield className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-800">Admin Mode Active</AlertTitle>
            <AlertDescription className="text-purple-700">
              You can view all interview details including scores and feedback. Regular users cannot see formal interview results here.
            </AlertDescription>
          </Alert>
        )}

        {/* Round 1 Aptitude Results */}
        {round1Results.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Round 1 - Aptitude Test Results
            </h2>
            <div className="space-y-4">
              {round1Results
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                .map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          <Brain className="h-5 w-5 text-primary" />
                          {result.roleName} - Round 1

                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Aptitude Test
                          </Badge>

                          {result.selectedForRound2 && (
                            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Selected for Round 2!
                            </Badge>
                          )}

                          {result.aborted && (
                            <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                              <Ban className="h-3 w-3" />
                              Aborted
                            </Badge>
                          )}

                          {!result.selectedForRound2 && !result.aborted && result.score >= 50 && (
                            <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Under Review
                            </Badge>
                          )}
                        </CardTitle>
                      </div>

                      <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(result.completedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        {result.selectedForRound2 && (
                          <>
                            <span className="flex items-center gap-1">
                              <Award className="h-4 w-4" />
                              Score: <span className="font-medium">{result.score}%</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart className="h-4 w-4" />
                              {result.correctAnswers} / {result.totalQuestions} correct
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result.aborted && (
                        <Alert className="mb-4 bg-red-50 border-red-200">
                          <Ban className="h-4 w-4 text-red-600" />
                          <AlertTitle className="text-red-800">Test Aborted</AlertTitle>
                          <AlertDescription className="text-red-700">
                            {result.abortReason || 'Your aptitude test was aborted due to a proctoring violation.'}
                          </AlertDescription>
                        </Alert>
                      )}

                      {result.selectedForRound2 && (
                        <Alert className="mb-4 bg-green-50 border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-800">Congratulations!</AlertTitle>
                          <AlertDescription className="text-green-700">
                            <p className="mb-2">
                              You've been selected to proceed to <strong>Round 2 - Mock Interview</strong>
                              for the {result.roleName} position! Your Round 1 score of {result.score}% was impressive.
                            </p>
                            {result.round2EmailSent && (
                              <p className="text-sm flex items-center gap-1 mb-2">
                                <Mail className="h-4 w-4" />
                                A confirmation email has been sent to {result.userEmail}
                              </p>
                            )}
                            <Button
                              onClick={() => handleStartRound2(result.roleId, result.roleName, result.id)}
                              className="mt-2 gap-2"
                            >
                              <PlayCircle className="h-4 w-4" />
                              Start Round 2 Interview
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      {!result.selectedForRound2 && (
                        <Alert className="mb-4 bg-blue-50 border-blue-200">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Under Review</AlertTitle>
                          <AlertDescription className="text-blue-700">
                            Your Round 1 aptitude test has been submitted and is currently under review by our admin team.
                            Results and performance details will be available here once the review is complete.
                            You'll receive an email notification if you're selected for Round 2.
                          </AlertDescription>
                        </Alert>
                      )}

                      {result.selectedForRound2 && (
                        <div className="mt-4 p-4 bg-accent/50 rounded-lg">
                          <h4 className="font-semibold mb-2">Category Performance:</h4>
                          <div className="space-y-2">
                            {Object.entries(result.categoryPerformance).map(([category, stats]) => (
                              <div key={category} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium capitalize">{category}</span>
                                  <span className="text-sm">{stats.correct}/{stats.total} ({stats.percentage}%)</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${stats.percentage >= 70
                                      ? 'bg-green-500'
                                      : stats.percentage >= 50
                                        ? 'bg-blue-500'
                                        : 'bg-amber-500'
                                      }`}
                                    style={{ width: `${stats.percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Bot Interview (FRIEDE) Results */}
        {botInterviews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              AI Interview (FRIEDE) Results
            </h2>
            <div className="space-y-4">
              {botInterviews
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                .map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          {result.role || 'AI Interview'}
                          <Badge variant="outline" className="bg-violet-50 text-violet-700">FRIEDE</Badge>
                        </CardTitle>
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(result.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart className="h-4 w-4" />
                          Score: <span className="font-medium">{result.feedback?.overallScore?.toFixed(1) || 'N/A'}/10</span>
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result.feedback?.strengths && result.feedback.strengths.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-green-700 mb-1">Strengths:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {result.feedback.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {result.feedback?.improvements && result.feedback.improvements.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-amber-700 mb-1">Improvements:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {result.feedback.improvements.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Practice Interview Results */}
        {practiceInterviews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Practice Interview Results
            </h2>
            <div className="space-y-4">
              {practiceInterviews
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                .map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          <PlayCircle className="h-5 w-5 text-primary" />
                          {result.roleName || 'Practice Interview'}
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">Practice</Badge>
                        </CardTitle>
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(result.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart className="h-4 w-4" />
                          Score: <span className="font-medium">{result.overallScore?.toFixed(1) || 'N/A'}/10</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {result.questions?.length || 0} questions
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {result.strengths && result.strengths.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-green-700 mb-1">Strengths:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {result.strengths.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {result.improvements && result.improvements.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-amber-700 mb-1">Areas to Improve:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {result.improvements.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Round 2 Mock Interview Results */}
        {interviews.length === 0 && round1Results.length === 0 && botInterviews.length === 0 && practiceInterviews.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">No Interview History Yet</h2>
              <p className="text-muted-foreground mb-8">
                Complete an interview to see your history and track your progress.
              </p>
              <Button onClick={() => navigate("/mock-interview")}>
                Start Your First Interview
              </Button>
            </CardContent>
          </Card>
        ) : interviews.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Round 2 - Mock Interview Results
            </h2>
            {interviews
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((interview) => (
                <Card key={interview.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {interview.roleName} Interview

                        {interview.isPracticeMode && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Practice
                          </Badge>
                        )}

                        {!interview.isPracticeMode && interview.round === 2 && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            Round 2 - Mock Interview
                          </Badge>
                        )}

                        {!interview.isPracticeMode && interview.round !== 2 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Formal
                          </Badge>
                        )}

                        {interview.selected && (
                          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Selected!
                          </Badge>
                        )}

                        {interview.aborted && (
                          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                            <Ban className="h-3 w-3" />
                            Aborted
                          </Badge>
                        )}

                        {shouldHideResults(interview) && (
                          <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </CardTitle>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteInterview(interview.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>

                        {/* Only show download button for practice mode or admin viewing formal interviews */}
                        {(!shouldHideResults(interview)) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => generatePDF(interview)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(interview.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {interview.questions.length} questions
                      </span>
                      {!shouldHideResults(interview) && (
                        <span className="flex items-center gap-1">
                          <BarChart className="h-4 w-4" />
                          Score: <span className="font-medium">
                            {interview.aborted ? "N/A" : `${interview.score?.toFixed(1)}/10`}
                          </span>
                        </span>
                      )}
                      {user?.isAdmin && !interview.isPracticeMode && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          <Eye className="h-3 w-3 mr-1" />
                          Admin View
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getOutcomeMessage(interview)}

                    {interview.messageGenerated && !shouldHideResults(interview) && (
                      <Alert className="mb-4 bg-green-50 border-green-200">
                        <Mail className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Congratulations!</AlertTitle>
                        <AlertDescription className="text-green-700">
                          <p className="mb-1">You've Cleared the Interview!</p>
                          <p className="mb-1">
                            🎉 You've successfully cleared the {interview.roleName} mock interview.
                          </p>
                          <p className="mb-1">
                            Your Score: {interview.score?.toFixed(1)}/10
                          </p>
                          <p>
                            Feedback: {interview.feedback?.substring(0, 120)}
                            {interview.feedback && interview.feedback.length > 120 ? "..." : ""}
                          </p>
                          <p className="mt-2 font-medium">Get ready for your next step with confidence!</p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {!shouldHideResults(interview) && interview.feedback && (
                      <p className="text-sm text-muted-foreground">
                        {interview.feedback?.substring(0, 150)}
                        {interview.feedback && interview.feedback.length > 150 ? "..." : ""}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default History;
