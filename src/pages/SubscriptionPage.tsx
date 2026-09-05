import { useState, useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { subscriptionsApi } from '@/lib/api';
import { initiateRazorpayPayment, formatAmount } from '@/lib/razorpayUtils';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import Layout from '@/components/Layout';
import PlanCard from '@/components/PlanCard';
import UsageCard from '@/components/UsageCard';
import { Calendar, CreditCard, AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  maxStudents: number;
  maxInterviewsMonthly: number;
  maxVoiceInterviewsMonthly: number;
  features: string[];
  supportLevel: string;
  supportResponseTime: string;
  hasAnalytics: boolean;
  hasReports: boolean;
  hasApiAccess: boolean;
  hasWebhooks: boolean;
  hasCustomBranding: boolean;
  hasDedicatedServer: boolean;
  hasWhiteLabel: boolean;
}

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: string;
  priceMonthly: number;
  maxStudents: number;
  maxInterviewsMonthly: number;
  maxVoiceInterviewsMonthly: number;
  features: string[];
  supportLevel: string;
  supportResponseTime: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
}

interface Usage {
  studentsCount: number;
  interviewsCount: number;
  voiceInterviewsCount: number;
  completedInterviews: number;
  averageScore: number;
  studentsPercentage: number;
  interviewsPercentage: number;
  voiceInterviewsPercentage: number;
}

interface Limits {
  maxStudents: number;
  maxInterviewsMonthly: number;
  maxVoiceInterviewsMonthly: number;
}

const SubscriptionPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [plansData, subscriptionData, usageData] = await Promise.all([
        subscriptionsApi.getPlans(),
        subscriptionsApi.getInstitutionSubscription(),
        subscriptionsApi.getUsage(),
      ]);

      setPlans(plansData.plans || []);
      setSubscription(subscriptionData.subscription || null);
      setUsage(usageData.usage || null);
      setLimits(usageData.limits || null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load subscription data';
      console.error('Error fetching subscription data:', error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (subscribing) return;

    try {
      setSubscribing(true);

      // Create/update subscription
      const response = await subscriptionsApi.subscribe(planId);

      // For demo purposes using test Razorpay key
      // In production, get this from environment variable
      const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_XXXXXXXX';

      // Initiate Razorpay payment
      await initiateRazorpayPayment(
        {
          amount: response.amount,
          planName: response.planName,
          institutionName: user?.institutionName || user?.name || 'Institution',
          institutionEmail: user?.email || '',
          subscriptionId: response.subscriptionId,
          razorpayKeyId: RAZORPAY_KEY_ID,
        },
        async (razorpayResponse) => {
          // Verify payment with backend
          try {
            await subscriptionsApi.verifyPayment(
              response.subscriptionId,
              razorpayResponse.razorpay_payment_id,
              razorpayResponse.razorpay_signature
            );
            
            toast({
              title: 'Payment Successful!',
              description: `You have successfully subscribed to the ${response.planName} plan.`,
            });
          } catch (error) {
            toast({
              title: 'Payment Verification Failed',
              description: 'Your payment was successful but we could not verify it. Please contact support.',
              variant: 'destructive',
            });
          }
          
          // Refresh data
          fetchData();
        },
        () => {
          // Payment failed or cancelled
          toast({
            title: 'Payment Cancelled',
            description: 'Your payment was cancelled. Please try again.',
            variant: 'destructive',
          });
        }
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process subscription';
      console.error('Error subscribing:', error);
      toast({
        title: 'Subscription Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading subscription data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const showUsageWarning = usage && (
    usage.studentsPercentage >= 80 || 
    usage.interviewsPercentage >= 80 || 
    usage.voiceInterviewsPercentage >= 80
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10">
              <Sparkles className="h-6 w-6 text-violet-600" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Subscription Management
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage your institution's subscription plan and monitor usage
          </p>
        </motion.div>

        {!subscription ? (
          /* PRICING PLANS VIEW (ChatGPT/Claude style) */
          <div className="space-y-8 mt-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Upgrade your Institution
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Scale your AI-powered interview platform with advanced features and higher limits.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch pt-4 pb-12">
              {plans.map((plan, index) => (
                <div 
                  key={plan.id} 
                  className={`relative ${index === 1 ? 'md:-translate-y-4 md:scale-105 z-10' : 'z-0'}`}
                >
                  {index === 1 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-20 whitespace-nowrap">
                      Most Popular
                    </div>
                  )}
                  <div className="h-full">
                    <PlanCard
                      plan={plan}
                      currentPlan={subscription?.planId}
                      onSelectPlan={handleSelectPlan}
                      loading={subscribing}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ACTIVE SUBSCRIPTION DASHBOARD */
          <div className="space-y-8">
            {/* Usage Warning Alert */}
            {showUsageWarning && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 shadow-sm">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200 font-medium">
                    You have used {Math.max(usage.studentsPercentage, usage.interviewsPercentage, usage.voiceInterviewsPercentage).toFixed(0)}% 
                    of your monthly quota. Consider upgrading your plan to avoid service disruption.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Current Plan */}
              <div className="lg:col-span-1 space-y-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="border-primary/20 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center gap-3">
                        {subscription.planName}
                        <Badge className="bg-green-100 text-green-700 border-green-200 shadow-sm">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-base mt-2">Current billing cycle</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                        {formatAmount(subscription.priceMonthly)}
                        <span className="text-sm text-muted-foreground font-normal">/mo</span>
                      </div>
                      <Separator />
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">Next Billing Date</div>
                            <div className="font-medium">{new Date(subscription.nextBillingDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">Auto Renew</div>
                            <div className="font-medium">{subscription.autoRenew ? 'Enabled' : 'Disabled'}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Right Column: Usage Stats */}
              <div className="lg:col-span-2 space-y-6">
                {usage && limits && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <UsageCard
                        title="Students Enrolled"
                        current={usage.studentsCount}
                        max={limits.maxStudents}
                        percentage={usage.studentsPercentage}
                        icon="students"
                        description="Active accounts"
                      />
                      <UsageCard
                        title="Total Interviews"
                        current={usage.interviewsCount}
                        max={limits.maxInterviewsMonthly}
                        percentage={usage.interviewsPercentage}
                        icon="interviews"
                        description="Used this month"
                      />
                    </div>
                    
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Detailed Usage Statistics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Voice Interviews</span>
                            <div className="text-2xl font-semibold">{usage.voiceInterviewsCount} <span className="text-sm font-normal text-muted-foreground">/ {limits.maxVoiceInterviewsMonthly === 999999 ? '∞' : limits.maxVoiceInterviewsMonthly}</span></div>
                          </div>
                          <div className="space-y-1 border-l pl-6">
                            <span className="text-sm text-muted-foreground">Completed Sessions</span>
                            <div className="text-2xl font-semibold">{usage.completedInterviews}</div>
                          </div>
                          <div className="space-y-1 border-l pl-6">
                            <span className="text-sm text-muted-foreground">Avg Candidate Score</span>
                            <div className="text-2xl font-semibold text-primary">{usage.averageScore.toFixed(1)}%</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SubscriptionPage;
