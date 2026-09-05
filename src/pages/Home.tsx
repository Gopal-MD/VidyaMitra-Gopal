import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import DarkVeil from '@/components/DarkVeil';
import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState, useRef } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
import VidyaMitraLogo from '@/components/VidyaMitraLogo';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useAnimationFrame } from 'framer-motion';
import {
  ArrowRight, FileText, Route, Briefcase,
  MessageSquare, Brain, Code, Target, Sparkles,
  Play, ChevronLeft, ChevronRight, Check,
  UserCheck, Trophy, Moon, Sun,
} from 'lucide-react';

// ─── Static data ──────────────────────────────────────────────────────────

const features = [
  {
    icon: FileText, title: 'Smart Resume', desc: 'AI-powered ATS analysis & resume builder with instant scoring',
    color: 'from-violet-500 to-purple-600', glow: 'rgba(139,92,246,0.35)',
    accent: '#a78bfa',
    how: 'Upload your existing resume or start from scratch. VidyaMitra\'s AI reads your resume the same way a recruiter\'s ATS software does — it checks for the right keywords, proper formatting, measurable achievements, and role alignment. You instantly see a score out of 100, a breakdown of what\'s missing, and specific suggestions like "Add a quantified result to your third bullet point." You can apply fixes inline and re-score in real time. For every target role, a keyword gap report shows exactly which skills and terms recruiters are searching for that your resume currently lacks.',
    steps: [
      'Upload your resume or paste it in',
      'AI scores it against ATS criteria (keywords, format, impact)',
      'See a full report: what works, what\'s missing, what to fix',
      'Edit with AI-suggested rewrites and re-score instantly',
      'Download an ATS-optimised version ready to submit',
    ],
  },
  {
    icon: Route, title: 'Career Roadmap', desc: 'Personalized learning paths with YouTube recommendations',
    color: 'from-blue-500 to-cyan-500', glow: 'rgba(59,130,246,0.35)',
    accent: '#60a5fa',
    how: 'Tell VidyaMitra your current role and your target role. The AI maps the skill gap between where you are and where you want to be, then builds a step-by-step learning path — ordered by priority. Each node in the roadmap links to handpicked YouTube videos, free courses, and practice tasks. As you complete milestones, the roadmap adapts. If you nail a skill faster than expected, the path shortens. If something takes longer, related resources are deepened. You always know exactly what to do next and why.',
    steps: [
      'Enter your current skills and your dream job title',
      'AI performs a skill-gap analysis against real job requirements',
      'A personalised milestone roadmap is generated',
      'Each milestone links to free YouTube courses and exercises',
      'Mark milestones done — the roadmap adjusts dynamically',
    ],
  },
  {
    icon: MessageSquare, title: 'AI Interviews', desc: 'Realistic mock interviews with detailed performance feedback',
    color: 'from-emerald-500 to-green-600', glow: 'rgba(16,185,129,0.35)',
    accent: '#34d399',
    how: 'Choose a role, company type, or interview round (HR, technical, behavioural). VidyaMitra\'s AI interviewer asks you real questions drawn from a live question bank. You answer by voice or text. The AI listens — or reads — and gives you a score card covering content quality, communication clarity, confidence indicators, and keyword relevance. After each session you get a full transcript, a list of strong answers to keep, and a list of weak answers to improve. You can re-do any question immediately to practice a better response.',
    steps: [
      'Select role, difficulty level, and interview type',
      'The AI asks questions one by one in a real interview format',
      'Answer by voice or text at your own pace',
      'Receive instant per-answer feedback and an overall score',
      'Review the full transcript and retry weak answers on the spot',
    ],
  },
  {
    icon: Briefcase, title: 'Job Board', desc: 'Cross-platform job search with live market trends',
    color: 'from-orange-500 to-red-500', glow: 'rgba(249,115,22,0.35)',
    accent: '#fb923c',
    how: 'VidyaMitra aggregates live job listings from multiple platforms into one searchable feed. You filter by role, location, experience, or salary. For each listing, the AI compares it against your resume and tells you your match percentage — so you only invest time in roles where you have a real shot. It also shows trending skills in your target field so you know what to learn next. Save listings, track applications, and get notified when similar roles are posted.',
    steps: [
      'Set your job preferences (role, location, skills)',
      'Browse aggregated listings from multiple job platforms',
      'See an AI match score for each job vs. your profile',
      'Identify skill gaps highlighted by trend analysis',
      'Save jobs, track status, and get alerts for new matches',
    ],
  },
  {
    icon: Brain, title: 'Aptitude Tests', desc: 'Practice aptitude with category tracking & analytics',
    color: 'from-pink-500 to-rose-600', glow: 'rgba(236,72,153,0.35)',
    accent: '#f472b6',
    how: 'VidyaMitra has a large bank of aptitude questions across quantitative reasoning, logical reasoning, verbal ability, and data interpretation — the categories that appear in campus placement exams like TCS, Infosys, Wipro, and AMCAT. You take timed topic-wise tests or full mock tests. After each test, the system shows you which category you\'re weakest in, your speed vs. accuracy trade-off, and which question types you consistently get wrong. The difficulty adapts — as you improve in a category, harder questions are served.',
    steps: [
      'Choose a category (quant, logical, verbal) or take a full test',
      'Answer timed questions drawn from a large question bank',
      'Immediately see which answers were wrong and why',
      'Track your accuracy and speed trends across sessions',
      'Get targeted weak-area question sets to drill further',
    ],
  },
  {
    icon: Code, title: 'Coding Lab', desc: 'Code practice with live execution and AI hints',
    color: 'from-teal-500 to-cyan-600', glow: 'rgba(20,184,166,0.35)',
    accent: '#2dd4bf',
    how: 'Pick a coding problem by topic (arrays, trees, dynamic programming) or difficulty. Write your solution in the built-in code editor — which supports Python, Java, C++, and JavaScript. Click run and your code executes against hidden test cases within seconds. If you\'re stuck, the AI hint system gives you a conceptual nudge — not the answer, just enough to unblock you. After you solve it (or give up), a full explanation of the optimal approach is shown. Your solve history is tracked so you can come back to questions you found hard.',
    steps: [
      'Pick a problem by topic, difficulty, or company tag',
      'Write your solution in the in-browser code editor',
      'Run code — results come back from live test cases instantly',
      'Request an AI hint if stuck (conceptual, not a spoiler)',
      'Review the optimal solution and approach explanation after',
    ],
  },
];

const howItWorks = [
  { step: 1, icon: UserCheck, title: 'Sign Up Free',      desc: 'Create your account in seconds — no credit card, no commitment.' },
  { step: 2, icon: Target,    title: 'Choose a Feature',  desc: 'Pick from interviews, resume builder, career planner and more.' },
  { step: 3, icon: Brain,     title: 'Get AI Guidance',   desc: 'Receive personalised feedback, roadmaps and real-time insights.' },
  { step: 4, icon: Trophy,    title: 'Achieve Your Goals', desc: 'Land your dream role with data-driven preparation and practice.' },
];

// UPDATE_POINT: To change section screenshots, update the `imageSrc` field below.
// Files are served from the ./videos/ folder via the Vite videosStaticPlugin.
// Naming: /screenshots/<filename> maps to ./videos/<filename>
const deepDiveSections = [
  {
    direction: 'ltr' as const,
    tag: 'AI Interview',
    accent: '#a78bfa',
    title: 'Master every interview with real-time AI coaching',
    desc: "VidyaMitra's AI interviewer adapts to your responses, simulating thousands of company-specific interview styles — with detailed post-session analysis on tone, content and confidence.",
    benefits: [
      'Voice & text-based interview modes',
      'Company-specific question banks for FAANG and more',
      'Instant scoring on communication, clarity and depth',
      'Post-session transcript with targeted improvements',
    ],
    mockBg: 'from-violet-900/60 via-purple-900/40 to-[#08080f]',
    mockIcon: MessageSquare,
    imageSrc: '/screenshots/AI-interview.png',
  },
  {
    direction: 'rtl' as const,
    tag: 'Resume Analyzer',
    accent: '#60a5fa',
    title: 'Build a resume that clears every ATS in one shot',
    desc: 'Our intelligent resume parser scores your CV against real ATS criteria — showing exactly what recruiters and algorithms look for with actionable, line-by-line feedback.',
    benefits: [
      'ATS compatibility score with keyword gap analysis',
      'Before/after comparison to measure every improvement',
      'Industry-specific templates optimised for top roles',
      'One-click AI rewrite for any bullet point',
    ],
    mockBg: 'from-blue-900/60 via-cyan-900/40 to-[#08080f]',
    mockIcon: FileText,
    imageSrc: '/screenshots/ats.png',
  },
  {
    direction: 'ltr' as const,
    tag: 'Career Roadmap',
    accent: '#34d399',
    title: 'Your personalised path to your dream career',
    desc: 'VidyaMitra generates a step-by-step career roadmap based on your current skills, target role and industry — every milestone comes with curated YouTube courses and practice exercises.',
    benefits: [
      'Dynamic roadmap updated as you progress',
      'Curated YouTube resources for every learning node',
      'Skill gap analysis with priority ranking',
      'Integration with job board for real opportunity matching',
    ],
    mockBg: 'from-emerald-900/60 via-green-900/40 to-[#08080f]',
    mockIcon: Route,
    imageSrc: '/screenshots/roadmap.png',
  },
];

// UPDATE_POINT: To swap carousel screenshots, update the `imageSrc` field.
// Files served from ./videos/ folder via Vite videosStaticPlugin at /screenshots/*
const carouselItems = [
  { label: 'Dashboard',       desc: 'Your command centre for all career activities',   accent: 'from-violet-600 to-purple-600', imageSrc: '/screenshots/dashboard.png' },
  { label: 'AI Interview',    desc: 'Real-time interview with instant AI feedback',    accent: 'from-blue-600 to-cyan-600',    imageSrc: '/screenshots/AI-interview.png' },
  { label: 'Resume Builder',  desc: 'ATS-optimised templates with AI suggestions',    accent: 'from-emerald-600 to-green-600', imageSrc: '/screenshots/resume-builder.png' },
  { label: 'Career Planner',  desc: 'Personalised roadmap with resource curation',    accent: 'from-orange-600 to-red-600',   imageSrc: '/screenshots/roadmap.png' },
  { label: 'Coding Lab',      desc: 'Live coding environment with AI hints',          accent: 'from-pink-600 to-rose-600',    imageSrc: '/screenshots/coding-lab.png' },
  { label: 'Analytics',       desc: 'Progress tracking and performance insights',     accent: 'from-teal-600 to-cyan-600',    imageSrc: '/screenshots/analystics.png' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

// Tiny pill label (replaces Badge to avoid theme bleed on forced-dark page)
const Chip = ({ children, color = 'rgba(167,139,250,0.15)', text = '#a78bfa' }: {
  children: React.ReactNode; color?: string; text?: string;
}) => (
  <span
    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
    style={{ background: color, color: text, border: `1px solid ${text}30` }}>
    {children}
  </span>
);

interface TiltCardProps { children: React.ReactNode; className?: string; style?: React.CSSProperties }

const TiltCard = ({ children, className = '', style }: TiltCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<React.CSSProperties>({});
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { top, left, width, height } = ref.current.getBoundingClientRect();
    const rx = ((e.clientY - top) / height - 0.5) * 10;
    const ry = ((e.clientX - left) / width - 0.5) * 10;
    setTilt({ transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.025,1.025,1.025)` });
  };
  const handleMouseLeave = () => setTilt({ transform: 'perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)' });
  return (
    <div
      ref={ref} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.2s ease', willChange: 'transform', ...tilt, ...style }}
      className={className}>
      {children}
    </div>
  );
};

const ScrollBar = () => {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[200] origin-left"
      style={{
        scaleX: scrollYProgress,
        background: 'linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)',
      }}
    />
  );
};

// Reusable fade-up variant
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Component ────────────────────────────────────────────────────────────

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  // ── Feature card auto-scroll ──────────────────────────────────────────
  const FEATURE_PERIOD = features.length * (308 + 24); // card 308px + gap-6 24px
  const featureX = useMotionValue(0);
  const featureScrollPaused = useRef(false);
  useAnimationFrame(() => {
    if (featureScrollPaused.current) return;
    const next = (Math.abs(featureX.get()) + 0.55) % FEATURE_PERIOD;
    featureX.set(-next);
  });

  // ── Typewriter hero word ──────────────────────────────────────────────
  const { displayText: heroWord } = useTypewriter({
    words: ['Mastery', 'Excellence', 'Intelligence', 'Innovation', 'Growth'],
    typingSpeed: 75,
    deletingSpeed: 50,
    pauseDuration: 1500,
    variableSpeed: { min: 60, max: 120 },
  });

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -80]);

  // ── Auth redirect (preserve existing logic) ──────────────────────────
  useEffect(() => {
    if (isAuthenticated) navigate(isAdmin ? '/admin' : '/dashboard');
  }, [isAuthenticated, isAdmin, navigate]);

  // ── Carousel timer ───────────────────────────────────────────────────
  const startCarousel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setCarouselIdx(p => (p + 1) % carouselItems.length), 3200);
  };
  const stopCarousel = () => { if (timerRef.current) clearInterval(timerRef.current); };
  useEffect(() => { startCarousel(); return stopCarousel; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // ── Theme tokens ─────────────────────────────────────────────────────
  const isDark = theme === 'dark';
  const T = {
    bg:     isDark ? '#08080f'                  : '#ffffff',
    fg:     isDark ? '#ffffff'                  : '#1a0050',
    navBg:  isDark ? 'rgba(8,8,15,0.85)'        : 'rgba(255,255,255,0.97)',
    navBrd: isDark ? 'rgba(255,255,255,0.07)'   : 'rgba(109,40,217,0.18)',
    crdBg:  isDark ? 'rgba(255,255,255,0.04)'   : 'rgba(109,40,217,0.05)',
    crdBrd: isDark ? 'rgba(255,255,255,0.08)'   : 'rgba(109,40,217,0.22)',
    secBrd: isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(109,40,217,0.14)',
    grid:   isDark ? 'rgba(255,255,255,0.5)'    : 'rgba(109,40,217,0.12)',
    fade:   isDark ? '#08080f'                  : '#ffffff',
    csel:   isDark ? '#10101a'                  : '#ede9fe',
    a82: isDark ? 'rgba(255,255,255,0.82)' : 'rgba(45,8,100,0.90)',
    a78: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(45,8,100,0.86)',
    a75: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(45,8,100,0.82)',
    a70: isDark ? 'rgba(255,255,255,0.7)'  : 'rgba(45,8,100,0.78)',
    a65: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(45,8,100,0.74)',
    a60: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(45,8,100,0.74)',
    a58: isDark ? 'rgba(255,255,255,0.58)' : 'rgba(45,8,100,0.70)',
    a55: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(45,8,100,0.66)',
    a52: isDark ? 'rgba(255,255,255,0.52)' : 'rgba(45,8,100,0.62)',
    a50: isDark ? 'rgba(255,255,255,0.5)'  : 'rgba(45,8,100,0.60)',
    a45: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(45,8,100,0.55)',
    a40: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(45,8,100,0.50)',
    a35: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(45,8,100,0.46)',
    a30: isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(45,8,100,0.42)',
    a25: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(45,8,100,0.36)',
    a22: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(45,8,100,0.32)',
    a20: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(90,30,180,0.22)',
    a15: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(90,30,180,0.18)',
    a12: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(90,30,180,0.14)',
    a10: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(90,30,180,0.12)',
    a08: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(90,30,180,0.10)',
    a07: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(90,30,180,0.09)',
    a06: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(90,30,180,0.08)',
    a05: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(90,30,180,0.07)',
    a04: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(90,30,180,0.06)',
    a03: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(90,30,180,0.05)',
  };

  // Shared card surface (theme-reactive)
  const card = { background: T.crdBg, border: `1px solid ${T.crdBrd}` };
  const cardHover = isDark ? 'hover:border-white/[0.14] transition-all duration-300' : 'hover:border-black/[0.10] transition-all duration-300';

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: T.bg, color: T.fg, fontFamily: "'Google Sans', 'Inter', system-ui, sans-serif" }}>

      <ScrollBar />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
        style={{ background: T.navBg, borderBottom: `1px solid ${T.navBrd}` }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <VidyaMitraLogo size={36} />
            <span className="text-base font-bold tracking-tight"
              style={{ background: 'linear-gradient(135deg,#a78bfa,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              VidyaMitra
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
              style={{ background: T.a08, color: T.a75 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a15; (e.currentTarget as HTMLButtonElement).style.color = T.fg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a08; (e.currentTarget as HTMLButtonElement).style.color = T.a75; }}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors duration-200"
              style={{ color: T.a70 }}
              onMouseEnter={e => (e.currentTarget.style.color = T.fg)}
              onMouseLeave={e => (e.currentTarget.style.color = T.a70)}>
              Sign in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color: '#fff',
                boxShadow: '0 0 20px rgba(139,92,246,0.4)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px rgba(139,92,246,0.65)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(139,92,246,0.4)'; }}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* DarkVeil (import placeholder) */}
        <DarkVeil speed={0.4} warpAmount={0.18} />

        {/* Background atmosphere — dark mode only */}
        {isDark && (
          <motion.div style={{ y: heroY }} className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(124,58,237,0.38) 0%,transparent 70%)' }} />
            <div className="absolute top-1/3 left-1/3 w-[520px] h-[520px] rounded-full blur-[120px] opacity-40"
              style={{ background: 'radial-gradient(circle,#7c3aed,transparent)' }} />
            <div className="absolute top-1/2 right-1/4 w-[380px] h-[380px] rounded-full blur-[100px] opacity-30"
              style={{ background: 'radial-gradient(circle,#a855f7,transparent)' }} />
            {/* Subtle grid */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(${T.grid} 1px,transparent 1px),linear-gradient(90deg,${T.grid} 1px,transparent 1px)`,
                backgroundSize: '80px 80px',
              }} />
          </motion.div>
        )}

        <div className="max-w-5xl mx-auto text-center relative z-10 pt-28 pb-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex justify-center mb-7">
            <Chip><Sparkles className="h-3 w-3" /> AI-Powered Career Platform</Chip>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 38 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-black leading-[1.04] tracking-tight"
            style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)' }}>
            Your Career Companion for{' '}
            <br className="hidden sm:block" />
            <span className="inline-block" style={{ minWidth: '1ch' }}>
              <span style={{
                background: 'linear-gradient(135deg,#a78bfa 0%,#c084fc 45%,#f472b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>{heroWord}</span>
              <motion.span
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'loop', times: [0, 0.5, 0.5, 1] }}
                style={{ color: '#a78bfa', WebkitTextFillColor: '#a78bfa', marginLeft: '2px' }}>
                |
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className="mt-8 max-w-2xl mx-auto leading-relaxed"
            style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: T.a58 }}>
            Master interviews, build ATS-ready resumes, unlock personalised career roadmaps
            and discover opportunities — all powered by artificial intelligence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.33 }}
            className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-base font-semibold px-8 h-13 rounded-full transition-all duration-200"
              style={{
                height: '52px',
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color: '#fff',
                boxShadow: '0 0 30px rgba(139,92,246,0.45)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 50px rgba(168,85,247,0.65)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(139,92,246,0.45)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
              Start your journey <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 text-base font-semibold px-8 rounded-full transition-all duration-200"
              style={{
                height: '52px',
                background: T.a06,
                color: T.a82,
                border: `1px solid ${T.a12}`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a10; (e.currentTarget as HTMLButtonElement).style.borderColor = T.a22; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a06; (e.currentTarget as HTMLButtonElement).style.borderColor = T.a12; }}>
              Explore features
            </button>
          </motion.div>

        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 overflow-hidden" style={{ borderTop: `1px solid ${T.secBrd}` }}>

        {/* Heading */}
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp} className="text-center mb-16">
            <Chip><Sparkles className="h-3 w-3" />Core Features</Chip>
            <h2 className="mt-5 font-black tracking-tight leading-tight"
              style={{ fontSize: 'clamp(2rem,4.5vw,3.5rem)', color: T.fg }}>
              Everything you need{' '}
              <span style={{ background: 'linear-gradient(135deg,#a78bfa,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                to succeed
              </span>
            </h2>
            <p className="mt-3 text-sm" style={{ color: T.a45 }}>
              Click any card to explore how it works
            </p>
          </motion.div>
        </div>

        {/* Auto-scroll track */}
        <div
          className="relative"
          onMouseEnter={() => { featureScrollPaused.current = true; }}
          onMouseLeave={() => { featureScrollPaused.current = false; }}>

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${T.bg}, transparent)` }} />
          <div className="absolute right-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to left, ${T.bg}, transparent)` }} />

          <motion.div
            className="flex gap-6 pl-16 pb-4"
            style={{ width: 'max-content', x: featureX }}>

            {[...features, ...features].map((f, idx) => {
              const realIdx = idx % features.length;
              return (
                <motion.div
                  key={`feat-${idx}`}
                  className="flex-shrink-0 relative overflow-hidden rounded-2xl cursor-pointer group"
                  style={{
                    width: '308px',
                    height: '232px',
                    background: isDark
                      ? 'linear-gradient(145deg,rgba(20,13,40,0.97) 0%,rgba(12,9,24,0.99) 100%)'
                      : 'linear-gradient(145deg,rgba(252,250,255,1) 0%,rgba(240,236,255,0.97) 100%)',
                    border: `1px solid ${isDark ? 'rgba(139,92,246,0.13)' : 'rgba(109,40,217,0.16)'}`,
                    boxShadow: isDark
                      ? '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
                      : '0 2px 20px rgba(109,40,217,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
                    transition: 'border-color 220ms ease, box-shadow 220ms ease',
                  }}
                  whileHover={{
                    scale: 1.05,
                    y: -10,
                    transition: { duration: 0.22, ease: 'easeOut' },
                  }}
                  onClick={() => setSelectedFeature(realIdx)}>

                  {/* Ambient blobs */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: f.accent, opacity: isDark ? 0.13 : 0.08, filter: 'blur(32px)' }} />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full pointer-events-none"
                    style={{ background: f.accent, opacity: isDark ? 0.07 : 0.04, filter: 'blur(24px)' }} />

                  {/* Hover border glow overlay */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${f.accent}44, 0 0 36px ${f.glow}` }} />

                  {/* Bottom accent strip */}
                  <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${f.color}`} style={{ opacity: 0.75 }} />

                  <div className="relative z-10 p-7 h-full flex flex-col justify-between">
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${f.color} flex-shrink-0`}
                        style={{ boxShadow: `0 0 22px ${f.glow}` }}>
                        <f.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}38` }}>
                        <ArrowRight className="h-3.5 w-3.5" style={{ color: f.accent }} />
                      </div>
                    </div>

                    {/* Text */}
                    <div>
                      <h3 className="text-[17px] font-bold mb-1.5 tracking-tight leading-snug"
                        style={{ color: T.fg }}>{f.title}</h3>
                      <p className="text-xs leading-relaxed"
                        style={{ color: T.a50, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Feature detail modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedFeature !== null && (() => {
          const f = features[selectedFeature];
          return (
            <motion.div
              key="feature-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
              onClick={() => { setSelectedFeature(null); featureScrollPaused.current = false; }}>
              <motion.div
                initial={{ opacity: 0, y: 64, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 32, scale: 0.97 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl"
                style={{
                  background: isDark
                    ? 'linear-gradient(160deg, rgba(20,13,40,0.99) 0%, rgba(10,7,22,1) 100%)'
                    : 'linear-gradient(160deg, #ffffff 0%, rgba(248,245,255,1) 100%)',
                  border: `1px solid ${f.accent}38`,
                  boxShadow: `0 0 0 1px ${f.accent}18, 0 48px 120px rgba(0,0,0,0.65), 0 0 80px ${f.glow}`,
                }}>

                {/* Top accent bar */}
                <div className={`h-[3px] w-full rounded-t-3xl bg-gradient-to-r ${f.color}`} />

                <div className="p-8 sm:p-10">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-7">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0`}
                        style={{ boxShadow: `0 0 28px ${f.glow}` }}>
                        <f.icon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tight" style={{ color: T.fg }}>{f.title}</h3>
                        <p className="text-sm mt-1" style={{ color: T.a45 }}>{f.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedFeature(null); featureScrollPaused.current = false; }}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-150"
                      style={{ background: T.a08, color: T.a55 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a15; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a08; }}>
                      ✕
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="mb-7" style={{ borderTop: `1px solid ${T.a08}` }} />

                  {/* How it works narrative */}
                  <div className="mb-7">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 rounded-full" style={{ background: f.accent }} />
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: f.accent }}>How it works</p>
                    </div>
                    <p className="text-sm leading-[1.8]" style={{ color: T.a70 }}>{f.how}</p>
                  </div>

                  {/* Step by step */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-4 rounded-full" style={{ background: f.accent }} />
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: f.accent }}>Step by step</p>
                    </div>
                    <div className="space-y-3">
                      {f.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl p-3"
                          style={{ background: isDark ? `${f.accent}08` : `${f.accent}06` }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ background: `${f.accent}22`, color: f.accent, border: `1px solid ${f.accent}40` }}>
                            {i + 1}
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: T.a65 }}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg,${f.accent},${f.accent}cc)`,
                      color: '#fff',
                      boxShadow: `0 0 24px ${f.glow}`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 40px ${f.glow}`; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 24px ${f.glow}`; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
                    Try {f.title} free <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── See It In Action ─────────────────────────────────────────────── */}
      <section className="py-32 px-6" style={{ borderTop: `1px solid ${T.secBrd}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp} className="text-center mb-14">
            <Chip color="rgba(52,211,153,0.12)" text="#34d399"><Play className="h-3 w-3" />Platform Demo</Chip>
            <h2 className="mt-5 font-black tracking-tight"
              style={{ fontSize: 'clamp(2rem,4.5vw,3.5rem)', color: T.fg }}>
              Watch VidyaMitra{' '}
              <span style={{ background: 'linear-gradient(135deg,#34d399,#a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                in action
              </span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto" style={{ color: T.a50, fontSize: '1.05rem' }}>
              See how students and professionals are transforming their careers
            </p>
          </motion.div>

          {/* UPDATE_POINT: Main entry video — swap src to change the promo video.
               File: ./videos/Vidyamitra Entry video.mp4 served at /screenshots/Vidyamitra Entry video.mp4 */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden mb-6 cursor-pointer group"
            style={{
              aspectRatio: '16/9',
              border: `1px solid ${T.crdBrd}`,
              background: '#000',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            }}
            onClick={() => {
              if (videoRef.current) {
                if (videoPlaying) { videoRef.current.pause(); setVideoPlaying(false); }
                else { videoRef.current.play(); setVideoPlaying(true); }
              }
            }}>
            {/* Real video */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              src="/screenshots/Vidyamitra Entry video.mp4"
              poster="/screenshots/dashboard.png"
              preload="metadata"
              onEnded={() => setVideoPlaying(false)}
            />
            {/* Play overlay — hides when playing */}
            {!videoPlaying && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(2px)' }}>
                <motion.div
                  whileHover={{ scale: 1.12 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.85)', boxShadow: '0 0 40px rgba(124,58,237,0.6)', backdropFilter: 'blur(12px)' }}>
                  <Play className="h-8 w-8 fill-white text-white ml-1" />
                </motion.div>
                <p className="text-sm font-semibold text-white/80">Full Platform Overview — Watch Demo</p>
              </div>
            )}
          </motion.div>

        </div>
      </section>

      {/* ── Feature Deep Dives ───────────────────────────────────────────── */}
      {deepDiveSections.map((sec, idx) => (
        <section key={idx} className="py-28 px-6" style={{ borderTop: `1px solid ${T.secBrd}` }}>
          <div className="max-w-6xl mx-auto">
            <div className={`flex flex-col ${sec.direction === 'ltr' ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-16 items-center`}>

              {/* Visual */}
              {/* UPDATE_POINT: Deep-dive section screenshot — update imageSrc in deepDiveSections array above */}
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp} custom={0}
                className="w-full lg:w-1/2 flex-shrink-0">
                <div
                  className="relative rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-500 cursor-default"
                  style={{
                    height: '360px',
                    border: `1px solid ${sec.accent}25`,
                    boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px ${sec.accent}15`,
                    background: '#000',
                  }}>
                  {/* Real screenshot */}
                  <img
                    src={sec.imageSrc}
                    alt={`${sec.tag} screenshot`}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    draggable={false}
                  />
                  {/* Accent glow border overlay */}
                  <div className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${sec.accent}30` }} />
                  {/* Corner blobs for depth */}
                  <div className="absolute top-6 left-6 w-20 h-20 rounded-full blur-2xl pointer-events-none"
                    style={{ background: `${sec.accent}18` }} />
                  <div className="absolute bottom-6 right-6 w-28 h-28 rounded-full blur-3xl pointer-events-none"
                    style={{ background: `${sec.accent}12` }} />
                </div>
              </motion.div>

              {/* Text */}
              <div className="w-full lg:w-1/2 space-y-6">
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={0}>
                  <Chip
                    color={`${sec.accent}15`}
                    text={sec.accent}>
                    {sec.tag}
                  </Chip>
                  <h2 className="mt-4 font-black tracking-tight leading-snug"
                    style={{ fontSize: 'clamp(1.6rem,3.5vw,2.6rem)' }}>
                    {sec.title}
                  </h2>
                  <p className="mt-4 leading-relaxed" style={{ color: T.a52, lineHeight: '1.75' }}>
                    {sec.desc}
                  </p>
                </motion.div>

                <motion.ul initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={1}
                  className="space-y-3">
                  {sec.benefits.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${sec.accent}18`, border: `1px solid ${sec.accent}35` }}>
                        <Check className="h-3 w-3" style={{ color: sec.accent }} />
                      </div>
                      <span className="text-sm leading-relaxed" style={{ color: T.a60 }}>{b}</span>
                    </li>
                  ))}
                </motion.ul>

                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={2}>
                  <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full mt-2 transition-all duration-200"
                    style={{ background: `${sec.accent}18`, color: sec.accent, border: `1px solid ${sec.accent}35` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${sec.accent}28`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${sec.accent}18`; }}>
                    Try it free <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-32 px-6" style={{ borderTop: `1px solid ${T.secBrd}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp} className="text-center mb-20">
            <Chip color="rgba(192,132,252,0.12)" text="#c084fc">Simple Process</Chip>
            <h2 className="mt-5 font-black tracking-tight"
              style={{ fontSize: 'clamp(2rem,4.5vw,3.5rem)' }}>
              Up and running in{' '}
              <span style={{ background: 'linear-gradient(135deg,#c084fc,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                4 steps
              </span>
            </h2>
            <p className="mt-4 max-w-lg mx-auto" style={{ color: T.a50 }}>
              From sign-up to career success — your journey starts here
            </p>
          </motion.div>

          <div className="relative">
            {/* Connector line desktop */}
            <div className="hidden lg:block absolute top-[46px] left-[14%] right-[14%] z-0"
              style={{ borderTop: '2px dashed rgba(167,139,250,0.18)' }} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {howItWorks.map((step, i) => (
                <motion.div key={i}
                  initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp} custom={i}>
                  <TiltCard>
                    <div
                      className={`p-6 rounded-2xl text-center ${cardHover}`}
                      style={{ ...card }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 35px rgba(139,92,246,0.2)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                      <div className="relative inline-block mb-5">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(139,92,246,0.12)', border: '1.5px solid rgba(139,92,246,0.25)' }}>
                          <step.icon className="h-8 w-8" style={{ color: '#a78bfa' }} />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 12px rgba(139,92,246,0.5)' }}>
                          {step.step}
                        </div>
                      </div>
                      <h3 className="text-sm font-bold mb-2">{step.title}</h3>
                      <p className="text-xs leading-relaxed" style={{ color: T.a45 }}>{step.desc}</p>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp} custom={4} className="text-center mt-14">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 text-base font-semibold px-10 h-12 rounded-full transition-all duration-200"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', boxShadow: '0 0 28px rgba(139,92,246,0.4)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 45px rgba(168,85,247,0.6)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(139,92,246,0.4)'; }}>
              Begin your journey <ArrowRight className="h-5 w-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Platform Preview Carousel ────────────────────────────────────── */}
      <section className="py-32 px-6" style={{ borderTop: `1px solid ${T.secBrd}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp} className="text-center mb-14">
            <Chip color="rgba(244,114,182,0.12)" text="#f472b6">Platform Preview</Chip>
            <h2 className="mt-5 font-black tracking-tight"
              style={{ fontSize: 'clamp(2rem,4.5vw,3.5rem)' }}>
              Explore the{' '}
              <span style={{ background: 'linear-gradient(135deg,#f472b6,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                interface
              </span>
            </h2>
            <p className="mt-4 max-w-lg mx-auto" style={{ color: T.a50 }}>
              A glimpse into the powerful platform waiting for you
            </p>
          </motion.div>

          <div
            className="relative"
            onMouseEnter={stopCarousel}
            onMouseLeave={startCarousel}>

            {/* UPDATE_POINT: Carousel screenshots — update imageSrc in carouselItems array above */}
            <AnimatePresence mode="wait">
              <motion.div
                key={carouselIdx}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.38, ease: 'easeInOut' }}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  height: '400px',
                  border: `1px solid ${T.crdBrd}`,
                  background: '#000',
                  boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
                }}>
                {/* Real screenshot */}
                <img
                  src={carouselItems[carouselIdx].imageSrc}
                  alt={carouselItems[carouselIdx].label}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  draggable={false}
                />
                {/* Subtle gradient overlay for label readability */}
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)' }} />
                {/* Label at bottom */}
                <div className="absolute bottom-0 left-0 right-0 px-8 pb-6">
                  <h3 className="text-xl font-black tracking-tight text-white">{carouselItems[carouselIdx].label}</h3>
                  <p className="mt-1 text-sm text-white/60">{carouselItems[carouselIdx].desc}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {[
              { side: 'left',  Icon: ChevronLeft,  action: () => setCarouselIdx(p => (p - 1 + carouselItems.length) % carouselItems.length) },
              { side: 'right', Icon: ChevronRight, action: () => setCarouselIdx(p => (p + 1) % carouselItems.length) },
            ].map(({ side, Icon, action }) => (
              <button key={side}
                onClick={action}
                aria-label={`${side === 'left' ? 'Previous' : 'Next'} slide`}
                className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 z-10"
                style={{
                  [side]: '12px',
                  background: T.a06,
                  border: `1px solid ${T.a10}`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a12; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a06; }}>
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-5">
            {carouselItems.map((_, i) => (
              <button key={i} onClick={() => setCarouselIdx(i)} aria-label={`Slide ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  height: '6px',
                  width: i === carouselIdx ? '24px' : '6px',
                  background: i === carouselIdx ? '#a78bfa' : T.a20,
                }} />
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {carouselItems.map((item, i) => (
              <button key={i} onClick={() => setCarouselIdx(i)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                style={{
                  background: i === carouselIdx ? 'rgba(167,139,250,0.15)' : T.a04,
                  color: i === carouselIdx ? '#a78bfa' : T.a45,
                  border: `1px solid ${i === carouselIdx ? 'rgba(167,139,250,0.35)' : T.a08}`,
                }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-36 px-6 relative overflow-hidden" style={{ borderTop: `1px solid ${T.secBrd}` }}>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="max-w-3xl mx-auto text-center relative z-10">
          <Chip><Sparkles className="h-3 w-3" />Start today — it's free</Chip>
          <h2 className="mt-6 font-black tracking-tight"
            style={{ fontSize: 'clamp(2.4rem,5.5vw,4.5rem)', lineHeight: 1.06 }}>
            Ready to accelerate<br />
            <span style={{ background: 'linear-gradient(135deg,#a78bfa 0%,#c084fc 45%,#f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              your career?
            </span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed max-w-xl mx-auto" style={{ color: T.a52 }}>
            Join VidyaMitra and get personalised AI guidance for interviews, resumes and career growth.
            No credit card required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-base font-semibold px-10 rounded-full transition-all duration-200"
              style={{
                height: '54px',
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                color: '#fff',
                boxShadow: '0 0 35px rgba(139,92,246,0.5)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 55px rgba(168,85,247,0.7)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 35px rgba(139,92,246,0.5)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}>
              Get started — free <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 text-base font-semibold px-8 rounded-full transition-all duration-200"
              style={{
                height: '54px',
                background: T.a05,
                color: T.a78,
                border: `1px solid ${T.a12}`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a10; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.a05; }}>
              Explore features
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {['No credit card', 'Instant access', 'Cancel anytime'].map(t => (
              <span key={t} className="flex items-center gap-2 text-xs" style={{ color: T.a40 }}>
                <Check className="h-3.5 w-3.5" style={{ color: '#34d399' }} /> {t}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="px-6 py-8" style={{ borderTop: `1px solid ${T.secBrd}` }}>
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <VidyaMitraLogo size={28} />
            <span className="text-sm font-bold"
              style={{ background: 'linear-gradient(135deg,#a78bfa,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              VidyaMitra
            </span>
          </div>
          <p className="text-xs" style={{ color: T.a30 }}>
            © 2024 VidyaMitra. AI-Powered Career Companion.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
