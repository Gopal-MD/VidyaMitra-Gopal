import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { formatAmount, getPlanColor, getPlanBadgeColor } from '@/lib/razorpayUtils';

interface PlanCardProps {
  plan: {
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
  };
  currentPlan?: string;
  onSelectPlan: (planId: string) => void;
  loading?: boolean;
}

const PlanCard = ({ plan, currentPlan, onSelectPlan, loading }: PlanCardProps) => {
  const isCurrentPlan = currentPlan === plan.id;
  const gradientClass = getPlanColor(plan.name);
  const badgeClass = getPlanBadgeColor(plan.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -8 }}
      className="h-full"
    >
      <Card className={`relative h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl ${
        isCurrentPlan ? 'border-primary border-2 ring-2 ring-primary/20' : 'border-border'
      }`}>
        {/* Gradient Header */}
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${gradientClass}`} />
        
        {isCurrentPlan && (
          <div className="absolute top-4 right-4">
            <Badge className={badgeClass}>Current Plan</Badge>
          </div>
        )}

        <CardHeader className="pb-4 pt-6">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">{plan.displayName}</CardTitle>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {formatAmount(plan.priceMonthly)}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-6">
          {/* Limits */}
          <div className="space-y-3 pb-4 border-b border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Students</span>
              <span className="font-semibold">
                {plan.maxStudents === 999999 ? 'Unlimited' : plan.maxStudents}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Interviews/month</span>
              <span className="font-semibold">
                {plan.maxInterviewsMonthly === 999999 ? 'Unlimited' : plan.maxInterviewsMonthly}
              </span>
            </div>
            {plan.maxVoiceInterviewsMonthly > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Voice Interviews</span>
                <span className="font-semibold">
                  {plan.maxVoiceInterviewsMonthly === 999999 ? 'Unlimited' : plan.maxVoiceInterviewsMonthly}
                </span>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="space-y-3">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                </div>
                <span className="text-sm text-foreground leading-tight">{feature}</span>
              </div>
            ))}
          </div>

          {/* Additional Features */}
          <div className="space-y-2">
            {plan.hasAnalytics && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Advanced Analytics</span>
              </div>
            )}
            {plan.hasReports && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Export Reports</span>
              </div>
            )}
            {plan.hasApiAccess && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>API Access</span>
              </div>
            )}
            {plan.hasWebhooks && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Webhooks</span>
              </div>
            )}
            {plan.hasCustomBranding && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Custom Branding</span>
              </div>
            )}
            {plan.hasDedicatedServer && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Dedicated Server</span>
              </div>
            )}
            {plan.hasWhiteLabel && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>White Label</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-4">
          <Button
            onClick={() => onSelectPlan(plan.id)}
            disabled={isCurrentPlan || loading}
            className={`w-full h-11 font-semibold transition-all duration-200 ${
              isCurrentPlan 
                ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                : `bg-gradient-to-r ${gradientClass} text-white hover:shadow-lg hover:scale-105`
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : isCurrentPlan ? (
              'Current Plan'
            ) : (
              'Choose Plan'
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default PlanCard;
