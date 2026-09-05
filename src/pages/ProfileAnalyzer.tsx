import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  Github, 
  Linkedin, 
  FileText, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Download,
  Play,
  Award,
  Code,
  BarChart3
} from 'lucide-react';
import { 
  analyzeGithubProfile, 
  analyzeLeetCodeProfile, 
  parseResumePDF, 
  calculateATSScore,
  mergeSkills,
  getAIRoadmap,
  getYouTubeCourses,
  careerPaths
} from '@/utils/profileAnalyzerService';
import { useToast } from '@/hooks/use-toast';
import { profileAnalyzerCache } from '@/utils/profileAnalyzerCache';

interface AnalysisResult {
  radarData: Array<{subject: string; score: number; github: number; resume: number; fullMark: number}>;
  score: number;
  gaps: string[];
  improvements: {
    general: string[];
    job_based: string[];
  };
  phases: Array<{phase: string; title: string; focus: string; duration: string; details: string}>;
  courses: Array<{id: string; title: string; thumbnail: string; channel: string}>;
  githubData: {
    userInfo: {name: string; avatar_url: string; login: string};
    skills: Array<{skill: string; github_score: number}>;
    repos: number;
  };
  leetcodeData?: {
    username: string;
    totalSolved: number;
    problems: {easy: number; medium: number; hard: number};
    ranking: number | null;
    contestRating: number | null;
    skillScore: number;
    level: string;
  };
  atsScore?: {
    totalScore: number;
    breakdown: {keywords: number; sections: number; formatting: number; length: number; experience: number};
    feedback: string[];
    passesATS: boolean;
  };
  resumeSkillsCount: number;
}

const ProfileAnalyzer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  // Form State
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [leetcodeInput, setLeetcodeInput] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [careerGoal, setCareerGoal] = useState('Full Stack Developer');

  // Workflow State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const analysisSteps = [
    { id: 'github', title: 'GitHub Analysis', desc: 'Analyzing repositories and contributions' },
    { id: 'leetcode', title: 'LeetCode Profile', desc: 'Fetching coding statistics' },
    { id: 'resume', title: 'Resume Parsing', desc: 'Extracting skills and ATS scoring' },
    { id: 'merge', title: 'Data Fusion', desc: 'Merging all data sources' },
    { id: 'ai', title: 'AI Analysis', desc: 'Generating personalized roadmap' },
    { id: 'resources', title: 'Curating Resources', desc: 'Finding learning materials' }
  ];
// Check cache on mount and when inputs change
  useEffect(() => {
    const cachedResult = profileAnalyzerCache.get(
      githubUrl,
      leetcodeInput,
      careerGoal,
      resumeFile?.name
    );

    if (cachedResult) {
      setAnalysisResult(cachedResult);
      toast({
        title: '✓ Loaded from Cache',
        description: 'Using previously analyzed results',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only check cache on mount

  const handleAnalyze = async () => {
    if (!githubUrl) {
      toast({
        title: 'Missing Information',
        description: 'Please provide at least a GitHub URL',
        variant: 'destructive'
      });
      return;
    }

    // Check cache first
    const cachedResult = profileAnalyzerCache.get(
      githubUrl,
      leetcodeInput,
      careerGoal,
      resumeFile?.name
    );

    if (cachedResult) {
      setAnalysisResult(cachedResult);
      toast({
        title: '✓ Loaded from Cache',
        description: 'Using previously analyzed results. Analysis is instant!',
      });
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep(0);
    setErrorMessage('');
    setAnalysisResult(null);

    try {
      // Step 1: GitHub Analysis
      setCurrentStep(0);
      const githubData = await analyzeGithubProfile(githubUrl);
      await delay(500);

      // Step 2: LeetCode Analysis (optional)
      setCurrentStep(1);
      let leetcodeData = null;
      if (leetcodeInput.trim()) {
        try {
          leetcodeData = await analyzeLeetCodeProfile(leetcodeInput);
        } catch (e) {
          console.warn('LeetCode analysis skipped:', e);
        }
      }
      await delay(500);

      // Step 3: Resume Parsing (optional)
      setCurrentStep(2);
      let resumeData = null;
      let atsScore = null;
      if (resumeFile) {
        try {
          resumeData = await parseResumePDF(resumeFile);
          if (resumeData.fullText) {
            atsScore = calculateATSScore(resumeData.fullText, careerGoal);
          }
          // Upload resume PDF to S3
          try {
            const { uploadResumeToS3 } = await import('@/lib/resumeService');
            uploadResumeToS3(resumeFile).catch(() => {});
          } catch { /* non-critical */ }
        } catch (e) {
          console.warn('Resume parsing failed:', e);
        }
      }
      await delay(500);

      // Step 4: Merge Skills
      setCurrentStep(3);
      const mergedSkills = mergeSkills(
        githubData.skills,
        resumeData?.skills || [],
        careerGoal
      );
      await delay(800);

      // Step 5: AI Roadmap
      setCurrentStep(4);
      const aiRoadmap = await getAIRoadmap(mergedSkills, careerGoal);
      await delay(500);

      // Step 6: YouTube Courses
      setCurrentStep(5);
      const courses = await getYouTubeCourses(aiRoadmap.gaps, careerGoal);
      await delay(300);

      // Set Results
      const finalResult = {
        radarData: mergedSkills,
        score: aiRoadmap.score,
        gaps: aiRoadmap.gaps,
        improvements: aiRoadmap.improvements,
        phases: aiRoadmap.phases,
        courses,
        githubData,
        leetcodeData,
        atsScore,
        resumeSkillsCount: resumeData?.skills?.length || 0
      };

      setAnalysisResult(finalResult);

      // Cache the result
      profileAnalyzerCache.set(
        githubUrl,
        leetcodeInput,
        careerGoal,
        finalResult,
        resumeFile?.name
      );

      toast({
        title: '✓ Analysis Complete',
        description: 'Your profile has been analyzed successfully'
      });

    } catch (error) {
      console.error('Analysis error:', error);
      const message = error instanceof Error ? error.message : 'Analysis failed. Please try again.';
      setErrorMessage(message);
      toast({
        title: 'Analysis Failed',
        description: message,
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportRef.current) return;
    window.print();
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Profile Analyzer
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-Powered Career Competency Assessment
          </p>
        </div>

        {/* Input Form */}
        {!analysisResult && !isAnalyzing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Enter Your Profile Information</CardTitle>
              <CardDescription>
                Provide your professional profiles to get a comprehensive analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github" className="flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub Profile URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="github"
                  type="url"
                  placeholder="https://github.com/username"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn Profile URL
                </Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leetcode" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  LeetCode Profile (Optional)
                </Label>
                <Input
                  id="leetcode"
                  type="text"
                  placeholder="username or https://leetcode.com/u/username"
                  value={leetcodeInput}
                  onChange={(e) => setLeetcodeInput(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resume" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume (Optional PDF)
                </Label>
                <Input
                  id="resume"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="career" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Target Career Goal
                </Label>
                <Select value={careerGoal} onValueChange={setCareerGoal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {careerPaths.map(path => (
                      <SelectItem key={path} value={path}>{path}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleAnalyze} 
                className="w-full" 
                size="lg"
                disabled={!githubUrl}
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                Analyze Profile
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Analysis Progress */}
        {isAnalyzing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Analysis in Progress</CardTitle>
              <CardDescription>
                Please wait while we analyze your profile...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysisSteps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    index < currentStep ? 'bg-green-500' :
                    index === currentStep ? 'bg-primary' :
                    'bg-muted'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : index === currentStep ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <span className="text-sm text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{step.title}</div>
                    <div className="text-sm text-muted-foreground">{step.desc}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div ref={reportRef} className="space-y-6">
            {/* Score Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {analysisResult.githubData.userInfo?.avatar_url && (
                      <img 
                        src={analysisResult.githubData.userInfo.avatar_url} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full border-2 border-primary"
                      />
                    )}
                    <div>
                      <CardTitle className="text-2xl">
                        {analysisResult.githubData.userInfo?.name || 'Profile Analysis'}
                      </CardTitle>
                      <CardDescription>
                        Target: {careerGoal}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-1">AI Score</div>
                    <div className="text-5xl font-bold text-primary">
                      {analysisResult.score}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{analysisResult.radarData.length}</div>
                    <div className="text-sm text-muted-foreground">Total Skills</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{analysisResult.gaps.length}</div>
                    <div className="text-sm text-muted-foreground">Skill Gaps</div>
                  </div>
                  {analysisResult.atsScore && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{analysisResult.atsScore.totalScore}</div>
                      <div className="text-sm text-muted-foreground">ATS Score</div>
                    </div>
                  )}
                  {analysisResult.leetcodeData && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{analysisResult.leetcodeData.totalSolved}</div>
                      <div className="text-sm text-muted-foreground">LeetCode Solved</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="skills" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Skills Radar</CardTitle>
                    <CardDescription>Visual comparison of your skills across different sources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={analysisResult.radarData}>
                          <PolarGrid 
                            stroke="hsl(var(--border))" 
                            strokeWidth={1}
                            strokeDasharray="3 3"
                          />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ 
                              fill: 'hsl(var(--foreground))', 
                              fontSize: 13,
                              fontWeight: 500
                            }} 
                          />
                          <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 100]} 
                            tick={{ 
                              fill: 'hsl(var(--muted-foreground))', 
                              fontSize: 11 
                            }}
                            tickCount={6}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              padding: '8px 12px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                          />
                          <Legend 
                            wrapperStyle={{
                              paddingTop: '20px'
                            }}
                          />
                          {analysisResult.resumeSkillsCount > 0 && (
                            <Radar 
                              name="Resume Skills" 
                              dataKey="resume" 
                              stroke="#10b981" 
                              fill="#10b981" 
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                          )}
                          <Radar 
                            name="GitHub Activity" 
                            dataKey="github" 
                            stroke="#3b82f6" 
                            fill="#3b82f6" 
                            fillOpacity={0.25}
                            strokeWidth={2}
                          />
                          <Radar 
                            name="Overall Score" 
                            dataKey="score" 
                            stroke="#8b5cf6" 
                            fill="#8b5cf6" 
                            fillOpacity={0.3} 
                            strokeWidth={2.5}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Skill Gaps</CardTitle>
                    <CardDescription>Critical skills to acquire for {careerGoal}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.gaps.map((gap: string) => (
                        <Badge key={gap} variant="destructive">{gap}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Roadmap Tab */}
              <TabsContent value="roadmap" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        General Improvements
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {analysisResult.improvements.general.map((imp: string, i: number) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Job-Based Recommendations ({careerGoal})
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {analysisResult.improvements.job_based.map((imp: string, i: number) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">Strategic Learning Phases</h4>
                      <div className="space-y-3">
                        {analysisResult.phases.map((phase, i: number) => (
                          <Card key={i}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                  Phase {phase.phase}: {phase.title}
                                </CardTitle>
                                <Badge variant="outline">{phase.duration}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm"><strong>Focus:</strong> {phase.focus}</p>
                              <p className="text-sm text-muted-foreground">{phase.details}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                {analysisResult.atsScore && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Resume ATS Score</CardTitle>
                      <CardDescription>
                        Applicant Tracking System Compatibility
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">Overall Score</span>
                        <span className={`text-3xl font-bold ${analysisResult.atsScore.passesATS ? 'text-green-500' : 'text-yellow-500'}`}>
                          {analysisResult.atsScore.totalScore}/100
                        </span>
                      </div>
                      <Progress value={analysisResult.atsScore.totalScore} className="h-2" />
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-lg font-bold">{Math.round(analysisResult.atsScore.breakdown.keywords)}</div>
                          <div className="text-xs text-muted-foreground">Keywords</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-lg font-bold">{Math.round(analysisResult.atsScore.breakdown.sections)}</div>
                          <div className="text-xs text-muted-foreground">Sections</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-lg font-bold">{Math.round(analysisResult.atsScore.breakdown.formatting)}</div>
                          <div className="text-xs text-muted-foreground">Format</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-lg font-bold">{Math.round(analysisResult.atsScore.breakdown.length)}</div>
                          <div className="text-xs text-muted-foreground">Length</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-lg font-bold">{Math.round(analysisResult.atsScore.breakdown.experience)}</div>
                          <div className="text-xs text-muted-foreground">Experience</div>
                        </div>
                      </div>

                      {analysisResult.atsScore.feedback.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Recommendations:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {analysisResult.atsScore.feedback.map((fb: string, i: number) => (
                              <li key={i}>{fb}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {analysisResult.leetcodeData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        LeetCode Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-3xl font-bold">{analysisResult.leetcodeData.totalSolved}</div>
                          <div className="text-sm text-muted-foreground">Total Solved</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-primary">{analysisResult.leetcodeData.skillScore}</div>
                          <div className="text-sm text-muted-foreground">Skill Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{analysisResult.leetcodeData.level}</div>
                          <div className="text-sm text-muted-foreground">Level</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <div className="text-xl font-bold text-green-500">{analysisResult.leetcodeData.problems.easy}</div>
                          <div className="text-xs text-muted-foreground">Easy</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <div className="text-xl font-bold text-yellow-500">{analysisResult.leetcodeData.problems.medium}</div>
                          <div className="text-xs text-muted-foreground">Medium</div>
                        </div>
                        <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="text-xl font-bold text-red-500">{analysisResult.leetcodeData.problems.hard}</div>
                          <div className="text-xs text-muted-foreground">Hard</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Resources Tab */}
              <TabsContent value="resources" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-red-500" />
                      Recommended Courses
                    </CardTitle>
                    <CardDescription>
                      Curated learning resources for your skill gaps
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysisResult.courses.map((course) => (
                        <a
                          key={course.id}
                          href={`https://youtube.com/watch?v=${course.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                            <img 
                              src={course.thumbnail} 
                              alt={course.title}
                              className="w-full h-40 object-cover"
                            />
                            <CardContent className="p-3">
                              <h4 className="font-medium text-sm line-clamp-2 mb-2">
                                {course.title}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {course.channel}
                              </p>
                            </CardContent>
                          </Card>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setAnalysisResult(null);
                  setGithubUrl('');
                  setLinkedinUrl('');
                  setLeetcodeInput('');
                  setResumeFile(null);
                }}
                className="flex-1"
              >
                Analyze Another Profile
              </Button>
              <Button 
                onClick={handleDownloadReport}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProfileAnalyzer;
