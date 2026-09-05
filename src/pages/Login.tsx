import { useState, useEffect, useRef } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Building2, User } from 'lucide-react';
import VidyaMitraLogo from '@/components/VidyaMitraLogo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { institutionsApi } from '@/lib/api';
import type { Institution } from '@/types/auth';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const institutionLoginSchema = z.object({
  institutionId: z.string({ required_error: 'Please select an institution' }).min(1, 'Please select an institution'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).required();

const signupSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
  name: z.string().optional(),
  studentCategory: z.string().optional(),
  institutionId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type InstitutionLoginFormValues = z.infer<typeof institutionLoginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const STUDENT_CATEGORIES = [
  'First Year',
  'Second Year',
  'Third Year',
  'Final Year',
  'Fresher (0-1 year exp)',
  '1-2 years experience',
  '2-5 years experience',
  '5+ years experience',
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, institutionLogin, signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'student' | 'institution'>('student');
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  // ── Typewriter hero word ─────────────────────────────────────────────
  const { displayText: heroWord } = useTypewriter({
    words: ['Mastery', 'Excellence', 'Intelligence', 'Innovation', 'Growth'],
    typingSpeed: 75,
    deletingSpeed: 50,
    pauseDuration: 1500,
    variableSpeed: { min: 60, max: 120 },
  });

  const from = location.state?.from?.pathname || '/dashboard';

  // Fetch institutions list
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const data = await institutionsApi.getList();
        console.log('Institutions loaded:', data.institutions?.length || 0, data.institutions);
        setInstitutions(data.institutions || []);
      } catch (error) {
        console.error('Failed to fetch institutions:', error);
      }
    };
    fetchInstitutions();
  }, []);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const institutionLoginForm = useForm<InstitutionLoginFormValues>({
    resolver: zodResolver(institutionLoginSchema),
    defaultValues: { institutionId: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', name: '', studentCategory: undefined, institutionId: undefined },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const user = await login({ email: values.email, password: values.password });
      if (user.isAdmin) {
        navigate('/admin');
      } else {
        navigate(from);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid email or password.';
      setAuthError(message);
      toast({ variant: 'destructive', title: 'Login failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstitutionLogin = async (values: InstitutionLoginFormValues) => {
    console.log('Institution login attempt with values:', values);
    setIsLoading(true);
    setAuthError(null);
    try {
      if (!values.institutionId || values.institutionId.trim() === '') {
        console.error('Institution ID is empty!', values);
        throw new Error('Please select an institution');
      }
      console.log('Calling institutionLogin API with:', { institutionId: values.institutionId, password: '***' });
      await institutionLogin({ institutionId: values.institutionId, password: values.password });
      navigate('/institution/dashboard');
    } catch (error) {
      console.error('Institution login error:', error);
      const message = error instanceof Error ? error.message : 'Invalid credentials.';
      setAuthError(message);
      toast({ variant: 'destructive', title: 'Login failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (values: SignupFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signup({ 
        email: values.email, 
        password: values.password, 
        name: values.name || undefined,
        studentCategory: values.studentCategory || undefined,
        institutionId: values.institutionId || undefined
      });
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed.';
      setAuthError(message);
      toast({ variant: 'destructive', title: 'Signup failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTR2Mkg4di0yaDI4em0tOCA2djJINC12LTJoMjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <VidyaMitraLogo size={56} />
              <div>
                <h1 className="text-3xl font-bold text-white">VidyaMitra</h1>
                <p className="text-violet-200 text-sm">AI Career Companion</p>
              </div>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Your Career Companion for<br />
              <span className="inline-block relative" style={{ minWidth: '1ch' }}>
                <span className="bg-gradient-to-r from-violet-300 to-pink-300 bg-clip-text text-transparent">{heroWord}</span>
                <motion.span
                  animate={{ opacity: [1, 1, 0, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: 'loop', times: [0, 0.5, 0.5, 1] }}
                  className="text-violet-300"
                  style={{ marginLeft: '2px' }}>
                  |
                </motion.span>
              </span>
            </h2>
            <p className="text-violet-200/80 text-lg mb-10 max-w-md">
              AI-powered interviews, smart resume analysis, personalized career roadmaps, and real-time job matching — all in one platform.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {[
                'Smart Resume Analysis',
                'AI Mock Interviews',
                'Career Roadmaps',
                'Job Matching',
              ].map((label, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="relative overflow-hidden rounded-lg px-4 py-3 border border-white/10 backdrop-blur-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(244,114,182,0.08) 100%)',
                  }}
                >
                  {/* shine sweep */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
                      animation: `shine-${i} 3.5s ${i * 0.7}s infinite`,
                    }}
                  />
                  <span
                    className="relative text-xs font-semibold tracking-wide"
                    style={{
                      background: 'linear-gradient(135deg, #c4b5fd 0%, #f9a8d4 60%, #a5b4fc 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: 'none',
                    }}
                  >
                    {label}
                  </span>
                </motion.div>
              ))}
            </div>
            <style>{`
              @keyframes shine-0 { 0%,100%{transform:translateX(-100%)} 40%,60%{transform:translateX(200%)} }
              @keyframes shine-1 { 0%,100%{transform:translateX(-100%)} 40%,60%{transform:translateX(200%)} }
              @keyframes shine-2 { 0%,100%{transform:translateX(-100%)} 40%,60%{transform:translateX(200%)} }
              @keyframes shine-3 { 0%,100%{transform:translateX(-100%)} 40%,60%{transform:translateX(200%)} }
            `}</style>
          </motion.div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        {/* Back to home button — top-left of right panel */}
        <button
          onClick={() => navigate('/home')}
          className="absolute top-5 right-5 lg:top-6 lg:right-8 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 group z-10"
        >
          <svg
            viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Home
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 justify-center mb-8 lg:hidden">
            <VidyaMitraLogo size={40} />
            <h1 className="text-2xl font-bold gradient-text">VidyaMitra</h1>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader className="pb-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                  <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign Up</TabsTrigger>
                </TabsList>

                {authError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{authError}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="login" className="mt-4">
                  {/* Login Type Selector */}
                  <div className="mb-6">
                    <label className="text-sm font-medium mb-3 block">I'm logging in as:</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { setLoginType('student'); institutionLoginForm.reset(); setAuthError(null); }}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                          loginType === 'student'
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span>Student</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLoginType('institution'); institutionLoginForm.reset(); setAuthError(null); }}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                          loginType === 'institution'
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Building2 className="h-4 w-4" />
                        <span>Institution</span>
                      </button>
                    </div>
                  </div>

                  {loginType === 'student' ? (
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                        <FormField control={loginForm.control} name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl><Input placeholder="you@example.com" {...field} autoComplete="email" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField control={loginForm.control} name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} autoComplete="current-password" />
                                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/20" disabled={isLoading}>
                          {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    <Form {...institutionLoginForm} key="institution-login-form">
                      <form onSubmit={institutionLoginForm.handleSubmit(handleInstitutionLogin)} className="space-y-4">
                        <FormField control={institutionLoginForm.control} name="institutionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Your Institution</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  console.log('Institution selected:', value);
                                  field.onChange(value);
                                  // Trigger validation
                                  institutionLoginForm.trigger('institutionId');
                                }} 
                                value={field.value || ''}
                                name={field.name}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose institution" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {institutions.length === 0 ? (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading institutions...</div>
                                  ) : (
                                    institutions.map((inst) => (
                                      <SelectItem key={inst.id} value={inst.id}>
                                        {inst.name} ({inst.institution_code})
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField control={institutionLoginForm.control} name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" {...field} />
                                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/20" disabled={isLoading}>
                          {isLoading ? 'Signing in...' : 'Sign In as Institution'}
                        </Button>
                      </form>
                    </Form>
                  )}
                </TabsContent>

                <TabsContent value="signup" className="mt-4">
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      <FormField control={signupForm.control} name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name (Optional)</FormLabel>
                            <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={signupForm.control} name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input placeholder="you@example.com" {...field} autoComplete="email" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={signupForm.control} name="studentCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Student Category (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your category (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {STUDENT_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={signupForm.control} name="institutionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Link to Institution (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select institution (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {institutions.length === 0 ? (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading institutions...</div>
                                ) : (
                                  institutions.map((inst) => (
                                    <SelectItem key={inst.id} value={inst.id}>
                                      {inst.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={signupForm.control} name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl><Input type="password" placeholder="••••••••" {...field} autoComplete="new-password" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={signupForm.control} name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl><Input type="password" placeholder="••••••••" {...field} autoComplete="new-password" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/20" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardHeader>
            <CardContent />
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
