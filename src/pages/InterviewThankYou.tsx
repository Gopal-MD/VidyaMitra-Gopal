import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, History, Mail, ArrowRight, Clock, Bell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

const InterviewThankYou = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(30);

  // Auto-redirect to history page after 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/history");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-green-400 to-green-600 p-8 shadow-2xl animate-pulse">
                <CheckCircle className="h-24 w-24 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-2 -right-2">
                <div className="bg-yellow-400 rounded-full p-2 shadow-lg animate-bounce">
                  <span className="text-2xl">🎉</span>
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Interview Submitted Successfully!
          </h1>
          
          <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            Thank you for completing the interview. Your responses have been recorded and will be evaluated shortly.
          </p>

          {/* Progress Bar for Countdown */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Auto-redirecting in {countdown} seconds
              </span>
              <span className="text-sm font-semibold text-primary">{Math.round((countdown / 30) * 100)}%</span>
            </div>
            <Progress value={(countdown / 30) * 100} className="h-2" />
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* History Card */}
          <Card className="border-2 border-primary/30 hover:border-primary/60 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary/10 p-3 mb-3">
                  <History className="h-8 w-8 text-primary" />
                </div>
                <Badge variant="outline" className="bg-blue-50">Step 1</Badge>
              </div>
              <CardTitle className="text-2xl">Check Your History</CardTitle>
              <CardDescription className="text-base">
                Track your interview status and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Visit the <strong>History</strong> page to monitor your interview status. 
                Once the evaluation is complete, your detailed performance report will be available there.
              </p>
              <Button 
                onClick={() => navigate("/history")}
                className="w-full group"
                size="lg"
              >
                <History className="h-4 w-4 mr-2" />
                View History
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Email Card */}
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-blue-100 p-3 mb-3">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <Badge variant="outline" className="bg-purple-50">Step 2</Badge>
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription className="text-base">
                Important notifications will be sent to you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Please monitor your email inbox <strong>(including spam/junk folder)</strong> regularly. 
                You'll receive notifications about your results, next steps, and any important updates.
              </p>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-900">
                  Results typically arrive within <strong>24-48 hours</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Important Notice */}
        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertDescription className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 mb-1">What happens next?</p>
              <p className="text-amber-800">
                Our AI system is now evaluating your responses. You'll be notified via email once the evaluation is complete. 
                Check your History page regularly for real-time status updates.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate("/dashboard")}
            className="min-w-[200px]"
          >
            Return to Dashboard
          </Button>
          
          <Button 
            variant="default" 
            size="lg"
            onClick={() => navigate("/history")}
            className="min-w-[200px] bg-primary hover:bg-primary/90"
          >
            <History className="h-5 w-5 mr-2" />
            Go to History
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default InterviewThankYou;
