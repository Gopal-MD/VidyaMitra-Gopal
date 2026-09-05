import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, FileText, Mic, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface UsageCardProps {
  title: string;
  current: number;
  max: number;
  percentage: number;
  icon: 'students' | 'interviews' | 'voice' | 'score';
  description?: string;
}

const iconMap = {
  students: Users,
  interviews: FileText,
  voice: Mic,
  score: TrendingUp,
};

const colorMap = {
  students: 'text-blue-500',
  interviews: 'text-purple-500',
  voice: 'text-pink-500',
  score: 'text-green-500',
};

const gradientMap = {
  students: 'from-blue-500/10 to-cyan-500/10',
  interviews: 'from-purple-500/10 to-pink-500/10',
  voice: 'from-pink-500/10 to-red-500/10',
  score: 'from-green-500/10 to-emerald-500/10',
};

const UsageCard = ({ title, current, max, percentage, icon, description }: UsageCardProps) => {
  const Icon = iconMap[icon];
  const iconColor = colorMap[icon];
  const gradientClass = gradientMap[icon];

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass.replace('/10', '')}`} />
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradientClass}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                {description && (
                  <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {current}
                {max !== 999999 && <span className="text-muted-foreground text-base font-normal">/{max}</span>}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Usage</span>
              <span className={`font-semibold ${
                percentage >= 90 ? 'text-red-500' : 
                percentage >= 80 ? 'text-orange-500' : 
                'text-foreground'
              }`}>
                {max === 999999 ? 'Unlimited' : `${Math.round(percentage)}%`}
              </span>
            </div>
            
            {max !== 999999 && (
              <div className="relative">
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className="h-2.5 bg-secondary"
                />
                <div 
                  className={`absolute top-0 left-0 h-2.5 rounded-full transition-all duration-500 ${getProgressColor()}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            )}
          </div>

          {max !== 999999 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>{current} used</span>
              <span>{max - current} remaining</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UsageCard;
