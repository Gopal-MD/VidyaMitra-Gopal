import Layout from '@/components/Layout';
import RoleSelector from '@/components/RoleSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, ShieldCheck, Brain, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const MockInterview = () => {
  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 px-4 py-1.5 text-xs">
            <ShieldCheck className="h-3 w-3 mr-1.5" /> Proctored Interview
          </Badge>
          <h1 className="text-3xl lg:text-4xl font-bold">
            Mock Interview
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Take a formal proctored interview. Select a role opened by the admin, upload your resume, 
            and proceed through Round 1 (Aptitude) and Round 2 (AI Interview).
          </p>
        </motion.div>

        {/* Flow Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { step: 1, icon: Target, title: 'Select Role', desc: 'Choose from admin-opened roles', color: 'text-violet-500' },
            { step: 2, icon: ShieldCheck, title: 'Upload Resume', desc: 'ATS analysis & scoring', color: 'text-blue-500' },
            { step: 3, icon: Brain, title: 'Round 1: Aptitude', desc: '25 MCQs with proctoring', color: 'text-emerald-500' },
            { step: 4, icon: MessageSquare, title: 'Round 2: Interview', desc: 'AI-powered mock interview', color: 'text-orange-500' },
          ].map((item, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Step {item.step}</p>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Role Selector in test mode — shows only admin-opened roles */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <RoleSelector mode="test" />
        </motion.div>
      </div>
    </Layout>
  );
};

export default MockInterview;
