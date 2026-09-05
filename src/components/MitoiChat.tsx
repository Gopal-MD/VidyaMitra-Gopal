import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, Loader2, RotateCcw, BrainCircuit, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  sendMitoiMessage,
  generateQuizQuestions,
  MitoiMessage,
  MitoiAction,
  QuizQuestion,
  QuizSession,
  fetchMentorContext,
  sendMentorMessage,
  MentorContext,
} from '@/utils/mitoiService';
import { searchCourses, parseCourseQuery, formatCoursesForChat } from '@/utils/chatCourseEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Unique ID generator
let _mid = 0;
const mid = () => `mitoi-${++_mid}-${Date.now()}`;

export default function MitoiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MitoiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizSession | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [mode, setMode] = useState<'general' | 'mentor'>('general');
  const [mentorContext, setMentorContext] = useState<MentorContext | null>(null);
  const [mentorLoading, setMentorLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const name = user?.name ? ` ${user.name}` : '';
      addAssistantMessage(
        `Hey${name}! 👋 I'm **Mitoi AI**, your VidyaMitra companion.\n\nI can:\n• 🧭 Navigate anywhere\n• 🧠 Quiz you (aptitude, logical, coding)\n• 💡 Answer platform questions\n\nTip: Switch to **Career Mentor mode** (🧠 button) for personalized advice based on your real profile!`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const addAssistantMessage = useCallback((content: string, extra?: Partial<MitoiMessage>) => {
    const msg: MitoiMessage = {
      id: mid(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      type: 'text',
      ...extra,
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  // ==================== QUIZ FLOW ====================
  const startQuiz = useCallback(async (category: string) => {
    setQuizLoading(true);
    addAssistantMessage(`⏳ Fetching ${category} questions...`);

    const questions = await generateQuizQuestions(category);
    const session: QuizSession = {
      active: true,
      category,
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
    };
    setQuiz(session);
    setQuizLoading(false);

    // Show first question
    showQuizQuestion(session, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showQuizQuestion = (session: QuizSession, index: number) => {
    const q = session.questions[index];
    const content = `**Question ${index + 1}/5** — ${q.category}\n\n${q.question}\n\n${q.options.map((o, i) => `**${String.fromCharCode(65 + i)}.** ${o}`).join('\n')}`;
    addAssistantMessage(content, { type: 'quiz-question', quizData: q });
  };

  const handleQuizAnswer = useCallback((answerIndex: number) => {
    if (!quiz || !quiz.active) return;

    const q = quiz.questions[quiz.currentIndex];
    const isCorrect = answerIndex === q.correctIndex;
    const newScore = quiz.score + (isCorrect ? 1 : 0);
    const newAnswers = [...quiz.answers, answerIndex];

    // Show result for this question
    const icon = isCorrect ? '✅' : '❌';
    const correctLetter = String.fromCharCode(65 + q.correctIndex);
    addAssistantMessage(
      `${icon} ${isCorrect ? 'Correct!' : `Wrong! Answer: **${correctLetter}. ${q.options[q.correctIndex]}**`}\n\n💡 ${q.explanation}`
    );

    const nextIndex = quiz.currentIndex + 1;
    if (nextIndex >= 5) {
      // Quiz complete
      const pct = Math.round((newScore / 5) * 100);
      const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👏' : pct >= 40 ? '💪' : '📚';
      addAssistantMessage(
        `${emoji} **Quiz Complete!**\n\nScore: **${newScore}/5** (${pct}%)\n\n${pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good job! Keep practicing.' : 'Keep learning, you\'ll get there!'}\n\nSay *"another quiz"* to try again or ask me anything else!`,
        { type: 'quiz-result' }
      );
      setQuiz(null);
    } else {
      // Next question
      const updatedSession = { ...quiz, currentIndex: nextIndex, score: newScore, answers: newAnswers };
      setQuiz(updatedSession);
      setTimeout(() => showQuizQuestion(updatedSession, nextIndex), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, addAssistantMessage]);

  // ==================== SEND MESSAGE ====================
  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || quizLoading || mentorLoading) return;

    const userMsg: MitoiMessage = { id: mid(), role: 'user', content: text, timestamp: new Date(), type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // If quiz is active, try parsing answer
    if (quiz?.active) {
      const lower = text.toLowerCase().trim();
      const letterMap: Record<string, number> = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      const ansIdx = letterMap[lower] ?? letterMap[lower.charAt(0)];
      if (ansIdx !== undefined) {
        handleQuizAnswer(ansIdx);
        return;
      }
      // If they typed something else during quiz, check if they want to quit
      if (['quit', 'stop', 'exit', 'cancel', 'end quiz'].some(k => lower.includes(k))) {
        addAssistantMessage("Quiz ended! 👋 Your progress was not saved. Feel free to start another anytime!");
        setQuiz(null);
        return;
      }
      addAssistantMessage("Please answer with **A**, **B**, **C**, or **D** (or type *quit* to end the quiz).");
      return;
    }

    setIsLoading(true);
    try {
      // Check for course intent first (works in both modes)
      const lower = text.toLowerCase().trim();
      const courseSignals = [
        'course', 'courses', 'tutorial', 'tutorials', 'learn', 'learning', 'study',
        'recommend', 'suggestion', 'suggest', 'teach me', 'how to learn',
        'where to learn', 'best way to learn', 'resources for', 'want to learn',
        'udemy', 'coursera', 'youtube', 'edx', 'pluralsight', 'udacity',
        'free course', 'paid course', 'beginner course', 'advanced course'
      ];
      
      const hasCourseIntent = courseSignals.some(s => lower.includes(s));
      
      if (hasCourseIntent) {
        try {
          const query = parseCourseQuery(text);
          const courses = searchCourses(
            query.skill || query.rawQuery,
            query.platform || undefined,
            8
          );
          
          if (courses.length > 0) {
            const formatted = formatCoursesForChat(courses.map(c => c.course), text);
            addAssistantMessage(formatted);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('Course search error:', err);
          // Fall through to mentor mode if course search fails
        }
      }
      
      // Route to career mentor if in mentor mode
      if (mode === 'mentor') {
        const result = await sendMentorMessage(text, messages, mentorContext);
        addAssistantMessage(result.response);
        setIsLoading(false);
        return;
      }

      const result = await sendMitoiMessage(text, messages, {
        currentPage: location.pathname,
        userName: user?.name,
      });

      addAssistantMessage(result.response, result.action ? { action: result.action, type: 'action' } : undefined);

      // Execute navigation
      if (result.action?.type === 'navigate') {
        setTimeout(() => navigate(result.action!.path), 700);
      }

      // Start quiz if detected
      if (result.quizCategory) {
        startQuiz(result.quizCategory);
      }
    } catch {
      addAssistantMessage("Something went wrong. Please try again! 🔄");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const clearChat = () => {
    setMessages([]);
    setQuiz(null);
  };

  // ==================== MENTOR MODE TOGGLE ====================
  const toggleMentorMode = async () => {
    const entering = mode === 'general';
    setMode(entering ? 'mentor' : 'general');
    setMessages([]);
    setQuiz(null);

    if (entering) {
      setMentorLoading(true);
      addAssistantMessage('🔄 Loading your career profile...');
      const ctx = await fetchMentorContext();
      setMentorContext(ctx);
      setMentorLoading(false);
      setMessages([]); // clear the loading message

      const name = user?.name ? ` ${user.name}` : '';
      if (ctx?.hasData) {
        const parts: string[] = [];
        if (ctx.targetRole) parts.push(`🎯 **Target role:** ${ctx.targetRole}`);
        if (ctx.gapAnalysis) parts.push(`📊 **Future-Ready Score:** ${ctx.gapAnalysis.futureReadyScore}/100 (${ctx.gapAnalysis.grade})`);
        if (ctx.skills.length > 0) parts.push(`🛠 **Skills on file:** ${ctx.skills.slice(0, 5).join(', ')}${ctx.skills.length > 5 ? '...' : ''}`);
        if (ctx.practiceSessions > 0) parts.push(`📝 **Practice avg:** ${ctx.practiceAvg}% over ${ctx.practiceSessions} session(s)`);
        if (ctx.gapAnalysis?.weakSkills.length) parts.push(`⚠️ **Critical gaps:** ${ctx.gapAnalysis.weakSkills.join(', ')}`);
        addAssistantMessage(
          `🧠 **Career Mentor Mode Active**${name ? ` — Hi ${name.trim()}!` : ''}\n\nI can see your full profile:\n\n${parts.join('\n')}\n\n**Ask me anything** about your career path, skills to improve, interview tips, or say *"Make me a study plan"*!`
        );
      } else {
        addAssistantMessage(
          `🧠 **Career Mentor Mode**${name ? ` — Hi ${name.trim()}!` : ''}\n\nI don't have much data yet for you. To get personalized advice:\n\n• Upload your resume at **Smart Resume**\n• Run a **Skill Gap Analysis** (AuraSkills)\n• Complete some **practice aptitude** tests\n\nFor now, I can still answer career questions! What's on your mind?`
        );
      }
    } else {
      const name = user?.name ? ` ${user.name}` : '';
      addAssistantMessage(
        `Hey${name}! 👋 Back to **General Mode**. I can navigate, quiz you, or answer platform questions. What would you like?`
      );
    }
  };

  // Quick action buttons
  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 border-2 border-white/20"
            >
              <Bot className="h-6 w-6 text-white" />
            </Button>
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-teal-400/30 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="w-[380px] sm:w-[420px] h-[620px] flex flex-col shadow-2xl border-2 border-teal-200/50 dark:border-teal-800/50 overflow-hidden">
              {/* Header */}
              <div className={`flex items-center justify-between px-4 py-3 text-white ${
                mode === 'mentor'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-700'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-600'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                    {mode === 'mentor' ? <BrainCircuit className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wide">
                      {mode === 'mentor' ? 'Career Mentor' : 'Mitoi AI'}
                    </h3>
                    <p className="text-[10px] opacity-80">
                      {mode === 'mentor' ? 'Personalized Advice' : 'VidyaMitra Assistant'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMentorMode}
                    className={`h-8 w-8 p-0 hover:bg-white/20 text-white ${
                      mode === 'mentor' ? 'bg-white/20 ring-1 ring-white/40' : ''
                    }`}
                    title={mode === 'mentor' ? 'Switch to General Mode' : 'Switch to Career Mentor Mode'}
                    disabled={mentorLoading}
                  >
                    <BrainCircuit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearChat} className="h-8 w-8 p-0 hover:bg-white/20 text-white" title="Clear chat">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0 hover:bg-white/20 text-white">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50 dark:bg-gray-950">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm text-gray-800 dark:text-gray-100 rounded-bl-md'
                      }`}
                    >
                      <MitoiContent content={msg.content} />

                      {/* Quiz answer buttons */}
                      {msg.type === 'quiz-question' && quiz?.active && msg.quizData && quiz.questions[quiz.currentIndex]?.question === msg.quizData.question && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {['A', 'B', 'C', 'D'].map((letter, i) => (
                            <Button
                              key={letter}
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuizAnswer(i)}
                              className="text-xs font-semibold hover:bg-teal-50 hover:border-teal-400 dark:hover:bg-teal-900/30 dark:border-gray-600"
                            >
                              {letter}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Navigation badge */}
                      {msg.action && (
                        <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-600">
                          <Badge className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                            🚀 Navigating to {msg.action.label}
                          </Badge>
                        </div>
                      )}

                      <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'opacity-70' : 'text-gray-400 dark:text-gray-500'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {(isLoading || quizLoading || mentorLoading) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className={`h-4 w-4 animate-spin ${mode === 'mentor' ? 'text-purple-500' : 'text-teal-500'}`} />
                        <span className="text-xs text-gray-400">
                          {mentorLoading ? 'Loading your profile...' : mode === 'mentor' ? 'Mentor is thinking...' : 'Mitoi is thinking...'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions — show only at start */}
              {messages.length <= 1 && !isLoading && !quiz && (
                <div className="px-3 py-2 border-t dark:border-gray-800 bg-white dark:bg-gray-900">
                  <div className="flex flex-wrap gap-1.5">
                    {mode === 'mentor' ? (
                      [
                        '📊 What should I focus on?',
                        '📝 Make me a study plan',
                        '🎓 Interview tips for my role',
                        '� Suggest courses for skill gaps',
                      ].map((action, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer text-xs hover:bg-purple-50 hover:border-purple-400 dark:hover:bg-purple-900/30 dark:border-gray-600 dark:text-gray-300 transition-colors"
                          onClick={() => handleQuickAction(action.replace(/^[^\s]+\s/, ''))}
                        >
                          {action}
                        </Badge>
                      ))
                    ) : (
                      [
                        '🧠 Start a quiz',
                        '🎤 Mock interview',
                        '📊 Career planner',
                        '💡 What can you do?',
                      ].map((action, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer text-xs hover:bg-teal-50 hover:border-teal-400 dark:hover:bg-teal-900/30 dark:border-gray-600 dark:text-gray-300 transition-colors"
                          onClick={() => handleQuickAction(action.replace(/^[^\s]+\s/, ''))}
                        >
                          {action}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Quiz progress bar */}
              {quiz?.active && (
                <div className="px-3 py-1.5 border-t dark:border-gray-800 bg-teal-50 dark:bg-teal-900/20">
                  <div className="flex items-center justify-between text-[10px] text-teal-700 dark:text-teal-300 mb-1">
                    <span>Quiz: {quiz.category}</span>
                    <span>{quiz.currentIndex + 1}/5 • Score: {quiz.score}</span>
                  </div>
                  <div className="h-1 bg-teal-200 dark:bg-teal-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${((quiz.currentIndex) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={
                      quiz?.active
                        ? 'Type A, B, C, or D...'
                        : mode === 'mentor'
                        ? 'Ask your career mentor...'
                        : 'Ask Mitoi anything...'
                    }
                    disabled={isLoading || quizLoading || mentorLoading}
                    className="flex-1 text-sm dark:bg-gray-800 dark:border-gray-700 rounded-full px-4"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || quizLoading || mentorLoading}
                    size="icon"
                    className={`rounded-full shrink-0 ${
                      mode === 'mentor'
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800'
                        : 'bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700'
                    }`}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1.5 text-center">
                  Powered by <span className="font-semibold text-teal-500">Mitoi AI</span>
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== MARKDOWN-LITE RENDERER ====================
function MitoiContent({ content }: { content: string }) {
  // Simple markdown: **bold**, *italic*, [links](url), and newlines
  const lines = content.split('\n');

  // URL regex pattern for detecting links
  const urlPattern = /(https?:\/\/[^\s\)]+)/g;
  // Markdown link pattern: [text](url)
  const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  const renderWithLinks = (text: string) => {
    // First handle markdown-style links [text](url)
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex
    mdLinkPattern.lastIndex = 0;

    while ((match = mdLinkPattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add the link
      parts.push(
        <a 
          key={`md-${match.index}`}
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-400 underline underline-offset-2"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    // If no markdown links found, check for raw URLs
    if (parts.length === 0 || (parts.length === 1 && typeof parts[0] === 'string')) {
      const textToProcess = parts.length === 1 ? parts[0] as string : text;
      const urlParts: (string | JSX.Element)[] = [];
      let urlLastIndex = 0;

      urlPattern.lastIndex = 0;
      while ((match = urlPattern.exec(textToProcess)) !== null) {
        if (match.index > urlLastIndex) {
          urlParts.push(textToProcess.slice(urlLastIndex, match.index));
        }
        urlParts.push(
          <a 
            key={`url-${match.index}`}
            href={match[1]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 underline underline-offset-2"
          >
            {match[1].length > 40 ? match[1].slice(0, 40) + '...' : match[1]}
          </a>
        );
        urlLastIndex = match.index + match[0].length;
      }

      if (urlLastIndex < textToProcess.length) {
        urlParts.push(textToProcess.slice(urlLastIndex));
      }

      if (urlParts.length > 0) return urlParts;
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Bold: **text**, Italic: *text*, and links
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={j} className="italic opacity-90">{part.slice(1, -1)}</em>;
              }
              // Check for links in the text
              const linkParts = renderWithLinks(part);
              return <span key={j}>{linkParts}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}
