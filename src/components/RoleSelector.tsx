import { useState, useEffect } from "react";
import { subscribeToRoleChanges } from "@/utils/roleManagement";
import { jobRoles } from "@/utils/interviewUtils";
import { JobRole } from "@/types";
import { useInterview } from "@/contexts/InterviewContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ResumeUpload } from "@/components/ResumeUpload";
import { ResumeData } from "@/types";
import { 
  Code, 
  BarChart, 
  Layout, 
  Brain, 
  Package, 
  Cloud, 
  Shield, 
  TrendingUp, 
  Users, 
  Megaphone 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

interface RoleSelectorProps {
  onRoleSelect?: (roleId: string, resumeData?: ResumeData) => Promise<void>;
  mode?: "test" | "practice";
  className?: string;
  onViewChange?: (isResumeUpload: boolean) => void;
}

const RoleSelector = ({ onRoleSelect, mode = "test", className, onViewChange }: RoleSelectorProps) => {
  const { startInterview, isLoading } = useInterview();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [openRolesFromDB, setOpenRolesFromDB] = useState<JobRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(mode === "test"); // loading only for test mode
  
  // Subscribe to real-time role changes from Firestore for test mode
  useEffect(() => {
    if (mode === "practice") return; // practice mode shows all roles, no need to subscribe
    
    setRolesLoading(true);
    const unsubscribe = subscribeToRoleChanges((roles) => {
      const open = roles.filter(r => r.isOpen);
      setOpenRolesFromDB(open);
      setRolesLoading(false);
    });
    return () => unsubscribe();
  }, [mode]);
  
  // For practice mode, show all roles; for test mode, show only open roles (from Firestore)
  const availableRoles = mode === "practice" ? jobRoles : openRolesFromDB;
  
  const handleRoleSelect = (roleId: string) => {
    if (mode === "practice" && onRoleSelect) {
      // For practice mode, directly call the onRoleSelect callback
      onRoleSelect(roleId);
      return;
    }
    
    // For test mode, show resume upload
    setSelectedRole(roleId);
    setShowResumeUpload(true);
    onViewChange?.(true);
  };

  const handleResumeProcessed = async (resume: ResumeData) => {
    setResumeData(resume);
    if (selectedRole) {
      if (mode === "practice" && onRoleSelect) {
        // For practice mode, call the callback with resume data
        await onRoleSelect(selectedRole, resume);
      } else if (resume.atsScore >= 60) {
        // For formal test mode, redirect to Round 1 Aptitude Test
        const role = availableRoles.find(r => r.id === selectedRole);
        sessionStorage.setItem('pendingResume', JSON.stringify(resume));
        navigate("/round1-aptitude", { 
          state: { 
            roleId: selectedRole,
            roleName: role?.title 
          } 
        });
      }
    }
  };

  const handleSkipResume = async () => {
    if (selectedRole) {
      if (mode === "practice" && onRoleSelect) {
        // For practice mode, call the callback without resume
        await onRoleSelect(selectedRole);
      } else {
        // For formal test mode, redirect to Round 1 Aptitude Test
        const role = availableRoles.find(r => r.id === selectedRole);
        sessionStorage.removeItem('pendingResume');
        navigate("/round1-aptitude", { 
          state: { 
            roleId: selectedRole,
            roleName: role?.title 
          } 
        });
      }
    }
  };
  
  // Map of icon names to components
  const iconMap: Record<string, React.ReactNode> = {
    code: <Code className="h-8 w-8 text-mockmate-primary" />,
    "bar-chart": <BarChart className="h-8 w-8 text-mockmate-primary" />,
    layout: <Layout className="h-8 w-8 text-mockmate-primary" />,
    brain: <Brain className="h-8 w-8 text-mockmate-primary" />,
    package: <Package className="h-8 w-8 text-mockmate-primary" />,
    cloud: <Cloud className="h-8 w-8 text-mockmate-primary" />,
    shield: <Shield className="h-8 w-8 text-mockmate-primary" />,
    "trending-up": <TrendingUp className="h-8 w-8 text-mockmate-primary" />,
    users: <Users className="h-8 w-8 text-mockmate-primary" />,
    megaphone: <Megaphone className="h-8 w-8 text-mockmate-primary" />
  };
  
  // Animation variants for cards
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };
  
  if (showResumeUpload && selectedRole) {
    const role = availableRoles.find(r => r.id === selectedRole);
    
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 dark:text-white">
            {role?.title} Interview
          </h2>
          <p className="text-muted-foreground dark:text-gray-400">
            Upload your resume for ATS analysis or skip to start the interview
          </p>
        </div>
        
        <ResumeUpload 
          roleId={selectedRole} 
          onResumeProcessed={handleResumeProcessed}
          minimumScore={60}
        />
        
        <div className="mt-6 text-center">
          <Button 
            variant="outline" 
            onClick={handleSkipResume}
          >
            Skip Resume Upload & Start Interview
          </Button>
        </div>
        
        <div className="mt-4 text-center">
          <Button 
            variant="ghost" 
            onClick={() => {
              setShowResumeUpload(false);
              setSelectedRole(null);
              onViewChange?.(false);
            }}
          >
            ← Back to Role Selection
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 dark:text-white">Choose an Interview Role</h2>
      <p className="text-muted-foreground dark:text-gray-400 text-center mb-8 max-w-2xl mx-auto">
        Select the job role you want to practice interviewing for. We'll generate role-specific questions to help you prepare.
      </p>
      
      {/* Loading Skeleton */}
      {rolesLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="h-full border-2 border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 animate-pulse">
              <CardHeader className="pb-3">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto" />
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mx-auto" />
                </div>
              </CardContent>
              <CardFooter className="pt-0 justify-center">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {!rolesLoading && (
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {availableRoles.length > 0 ? (
          availableRoles.map((role) => (
            <motion.div 
              key={role.id}
              variants={item}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="job-role-card h-full hover:shadow-md transition-all cursor-pointer border-2 border-gray-200 bg-white hover:border-mockmate-primary dark:bg-gray-800 dark:border-gray-700 dark:hover:border-mockmate-primary"
                onClick={() => handleRoleSelect(role.id)}
              >
                <CardHeader className="pb-3">
                  <div className="w-16 h-16 bg-mockmate-light dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                    {iconMap[role.icon] || <Package className="h-8 w-8 text-mockmate-primary" />}
                  </div>
                  <CardTitle className="text-center text-lg dark:text-white">{role.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="min-h-[60px] flex items-center justify-center dark:text-gray-400">
                    {role.description}
                  </CardDescription>
                </CardContent>
                <CardFooter className="pt-0 justify-center">
                  <Button variant="ghost" size="sm" className="text-mockmate-primary dark:text-mockmate-primary dark:hover:bg-gray-700">
                    Select Role
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-muted-foreground">
              <h3 className="text-xl font-semibold mb-2">No Interview Roles Available</h3>
              <p>{mode === "practice" 
                ? "No roles are currently configured for interviews." 
                : "Please contact the administrator to open interview roles."}</p>
            </div>
          </div>
        )}
      </motion.div>
      )}
      
      <div className="mt-12 text-center">
        <Button 
          variant="outline" 
          size="lg" 
          disabled={isLoading}
          onClick={() => navigate("/history")}
        >
          View Interview History
        </Button>
      </div>
    </div>
  );
};

export default RoleSelector;
