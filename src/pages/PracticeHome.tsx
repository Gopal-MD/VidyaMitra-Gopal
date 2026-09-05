import { useState } from "react";
import Layout from "@/components/Layout";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useInterview } from "@/contexts/InterviewContext";
import { useAuth } from "@/contexts/AuthContext";
import { jobRoles } from "@/utils/interviewUtils";
import { motion } from "framer-motion";
import { 
  PlayCircle, 
  Target, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Award,
  Zap,
  Users,
  Lightbulb,
  Brain,
  History,
  Bot,
  Code,
  BarChart,
  Layout as LayoutIcon,
  Package,
  Cloud,
  Shield,
  Megaphone
} from "lucide-react";

const PracticeHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startInterview } = useInterview();
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleStartPractice = async (roleId: string, resumeData?: unknown) => {
    try {
      // Start practice interview without monitoring
      await startInterview(roleId, resumeData, false); // false = no monitoring
      navigate("/practice-interview");
    } catch (error) {
      console.error("Failed to start practice:", error);
    }
  };

  // Map of icon names to components
  const iconMap: Record<string, React.ReactNode> = {
    code: <Code className="h-6 w-6" />,
    "bar-chart": <BarChart className="h-6 w-6" />,
    layout: <LayoutIcon className="h-6 w-6" />,
    brain: <Brain className="h-6 w-6" />,
    package: <Package className="h-6 w-6" />,
    cloud: <Cloud className="h-6 w-6" />,
    shield: <Shield className="h-6 w-6" />,
    "trending-up": <TrendingUp className="h-6 w-6" />,
    users: <Users className="h-6 w-6" />,
    megaphone: <Megaphone className="h-6 w-6" />
  };

  const practiceFeatures = [
    {
      icon: <PlayCircle className="h-8 w-8 text-blue-500" />,
      title: "Unlimited Practice",
      description: "Practice as many times as you want without restrictions"
    },
    {
      icon: <Clock className="h-8 w-8 text-green-500" />,
      title: "No Time Limits",
      description: "Take your time to think and formulate perfect answers"
    },
    {
      icon: <BookOpen className="h-8 w-8 text-purple-500" />,
      title: "Instant Feedback",
      description: "Get AI-powered feedback immediately after each answer"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-orange-500" />,
      title: "Track Progress",
      description: "Monitor your improvement over multiple practice sessions"
    }
  ];

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1"></div>
            <div className="flex items-center justify-center gap-3">
              <Zap className="h-10 w-10 text-yellow-500" />
              <h1 className="text-4xl font-bold text-mockmate-secondary dark:text-white">
                Practice Mode
              </h1>
            </div>
            <div className="flex-1 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => navigate('/practice-history')}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Practice History
              </Button>
            </div>
          </div>
          <p className="text-xl text-muted-foreground dark:text-gray-400 max-w-2xl mx-auto">
            Improve your interview skills with unlimited practice sessions. 
            No monitoring, no restrictions - just pure learning!
          </p>
          <Badge variant="secondary" className="mt-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <Users className="h-4 w-4 mr-1" />
            Free Practice • No Limits
          </Badge>
        </motion.div>

        {/* Practice Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {practiceFeatures.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2 dark:text-white">{feature.title}</h3>
                <p className="text-sm text-muted-foreground dark:text-gray-400">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Bot Interview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 dark:border-blue-900 dark:from-blue-950 dark:to-cyan-950">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <CardTitle className="text-blue-900 dark:text-blue-100">AI Interview Bot - FRIEDE</CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-300">
                      Real-time voice interview with adaptive AI interviewer
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-blue-600 dark:bg-blue-700">LIVE</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Experience Includes:</h4>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                      Real-time voice conversation (no typing)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                      Adaptive questions based on your answers
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                      Live webcam & transcription
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                      Instant detailed feedback & scoring
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col justify-center">
                  <Button 
                    onClick={() => navigate('/bot-interview')}
                    className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    <Bot className="mr-2 h-5 w-5" />
                    Start Bot Interview
                  </Button>
                  <p className="text-xs text-center text-blue-700 dark:text-blue-300 mt-2">
                    🎤 Requires microphone & camera • Chrome/Edge recommended
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Aptitude Practice Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:border-purple-900 dark:from-purple-950 dark:to-pink-950">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  <div>
                    <CardTitle className="text-purple-900 dark:text-purple-100">Aptitude Practice</CardTitle>
                    <CardDescription className="text-purple-700 dark:text-purple-300">
                      Master MCQs: Logical, Quantitative, Verbal & More
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-purple-600 dark:bg-purple-700">NEW</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-purple-900 dark:text-purple-100">What's Included:</h4>
                  <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                      25 Randomized MCQ Questions
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                      5 Categories: Logical, Quant, Verbal, Data, Technical
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                      Instant Feedback & Explanations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></div>
                      YouTube Learning Recommendations
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col justify-center">
                  <Button 
                    onClick={() => navigate('/practice-aptitude')}
                    className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
                  >
                    <Brain className="mr-2 h-5 w-5" />
                    Start Aptitude Practice
                  </Button>
                  <p className="text-xs text-center text-purple-700 dark:text-purple-300 mt-2">
                    💡 Get personalized video recommendations from Feel Free to Learn & CareerRide
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Coding Practice Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:border-green-900 dark:from-green-950 dark:to-emerald-950">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <div>
                    <CardTitle className="text-green-900 dark:text-green-100">Coding Practice</CardTitle>
                    <CardDescription className="text-green-700 dark:text-green-300">
                      Solve DSA problems with instant code execution & feedback
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-600 dark:bg-green-700">HOT</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">Features:</h4>
                  <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></div>
                      25+ DSA Problems (Easy, Medium, Hard)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></div>
                      Topic-based Categories & Filters
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></div>
                      Live Code Editor with Monaco (VS Code)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></div>
                      Instant Test Case Validation
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></div>
                      Multi-language Support (JS, Python, Java, C++)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></div>
                      Hints, Complexity Analysis & Scoring
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col justify-center gap-3">
                  <Button 
                    onClick={() => navigate('/practice-dashboard')}
                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                  >
                    <Code className="mr-2 h-5 w-5" />
                    Browse All Questions
                  </Button>
                  <Button 
                    onClick={() => navigate('/practice-coding')}
                    variant="outline"
                    className="w-full h-10 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-950"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Quick Random Practice
                  </Button>
                  <p className="text-xs text-center text-green-700 dark:text-green-300">
                    💻 Interactive code editor • Test cases • Detailed feedback
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Practice Setup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <BookOpen className="h-5 w-5" />
                Choose Your Practice Role
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Select a role to practice interview questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Compact Role Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                {jobRoles.map((role) => (
                  <motion.div
                    key={role.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <button
                      onClick={() => {
                        setSelectedRole(role.id);
                        handleStartPractice(role.id);
                      }}
                      className="w-full h-full p-3 flex flex-col items-center gap-2 rounded-lg border-2 border-border hover:border-mockmate-primary hover:bg-mockmate-primary/10 transition-all text-center group"
                    >
                      <div className="w-12 h-12 bg-mockmate-primary/10 dark:bg-mockmate-primary/20 rounded-full flex items-center justify-center text-mockmate-primary group-hover:bg-mockmate-primary/20 dark:group-hover:bg-mockmate-primary/30 transition-colors">
                        {iconMap[role.icon] || <Package className="h-6 w-6" />}
                      </div>
                      <span className="text-xs font-medium text-foreground/80 group-hover:text-mockmate-primary line-clamp-2">
                        {role.title}
                      </span>
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Benefits Info */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Practice Mode Benefits</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                        <span>No monitoring</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                        <span>Unlimited attempts</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                        <span>Instant feedback</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                        <span>No time limits</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Resume Upload Section */}
              <div className="mt-6">
                {!showResumeUpload ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Button 
                        onClick={() => setShowResumeUpload(true)}
                        className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all border-2 border-amber-400"
                      >
                        <Award className="h-5 w-5 mr-2" />
                        Upload Resume for Personalized Questions (Optional)
                      </Button>
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg blur opacity-30 group-hover:opacity-50 -z-10 animate-pulse"></div>
                    </div>
                    <p className="text-xs text-center text-amber-700 font-medium">
                      ⭐ Get tailored questions based on your experience & skills
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-bold text-amber-900 flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-600" />
                        Upload Resume
                      </h4>
                      <Button 
                        onClick={() => setShowResumeUpload(false)}
                        variant="ghost"
                        size="sm"
                        className="hover:bg-amber-100"
                      >
                        Cancel
                      </Button>
                    </div>
                    <ResumeUpload 
                      showBestMatch={true}
                      onResumeProcessed={(resume) => {
                        const bestRole = selectedRole || "software-engineer";
                        handleStartPractice(bestRole, resume);
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Practice vs Test Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <Card>
            <CardHeader>
              <CardTitle>Practice vs Test Mode</CardTitle>
              <CardDescription>
                Understand the difference between practice and formal testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-600 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Practice Mode (Current)
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Unlimited practice sessions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      No admin monitoring
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Instant feedback after each question
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      No time limits or restrictions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Can pause and resume anytime
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Test Mode
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Formal interview assessment
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Admin monitoring and evaluation
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Time-bound questions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Detailed performance report
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Results shared with recruiters
                    </li>
                  </ul>
                  <Button 
                    onClick={() => navigate("/home")}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    Switch to Test Mode
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default PracticeHome;