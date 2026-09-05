import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { sendChatMessage, getQuickReplies, ChatMessage, ChatContext, ChatAction } from '@/utils/chatbotService';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Component to render message content with clickable links
const MessageContent = ({ content }: { content: string }) => {
  // Define page mappings - MUST MATCH routes in App.tsx
  const pageLinks: Record<string, string> = {
    'practice history': '/practice-history',
    'practise history': '/practice-history',
    'practice home': '/practice',
    'practise home': '/practice',
    'practice': '/practice',
    'user home': '/dashboard',
    'dashboard': '/dashboard',
    'aptitude test': '/practice-aptitude',
    'aptitude practice': '/practice-aptitude',
    'aptitude': '/practice-aptitude',
    'interview practice': '/practice-interview',
    'practice interview': '/practice-interview',
    'interview': '/interview',
    'history': '/history',
    'summary': '/summary',
    'home': '/',
    'login': '/login',
  };

  // Parse the content and convert page mentions to links
  const parts: (string | JSX.Element)[] = [];
  const lowerContent = content.toLowerCase();

  // Sort keys by length (longest first) to match longer phrases first
  const sortedKeys = Object.keys(pageLinks).sort((a, b) => b.length - a.length);

  // Find all matches
  const matches: Array<{ start: number; end: number; key: string; link: string }> = [];
  
  for (const key of sortedKeys) {
    let searchIndex = 0;
    while (true) {
      const index = lowerContent.indexOf(key, searchIndex);
      if (index === -1) break;
      
      // Check if this position is not already matched
      const overlaps = matches.some(
        m => (index >= m.start && index < m.end) || (index + key.length > m.start && index + key.length <= m.end)
      );
      
      if (!overlaps) {
        matches.push({
          start: index,
          end: index + key.length,
          key: key,
          link: pageLinks[key]
        });
      }
      
      searchIndex = index + 1;
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Build the result
  let currentIndex = 0;
  matches.forEach((match, idx) => {
    // Add text before the match
    if (match.start > currentIndex) {
      parts.push(content.substring(currentIndex, match.start));
    }
    
    // Add the link
    const originalText = content.substring(match.start, match.end);
    parts.push(
      <Link
        key={`link-${idx}`}
        to={match.link}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {originalText}
      </Link>
    );
    
    currentIndex = match.end;
  });

  // Add remaining text
  if (currentIndex < content.length) {
    parts.push(content.substring(currentIndex));
  }

  // Split by newlines and render
  return (
    <>
      {parts.map((part, idx) => {
        if (typeof part === 'string') {
          return part.split('\n').map((line, lineIdx, arr) => (
            <span key={`${idx}-${lineIdx}`}>
              {line}
              {lineIdx < arr.length - 1 && <br />}
            </span>
          ));
        }
        return part;
      })}
    </>
  );
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: `Hi${user?.name ? ` ${user.name}` : ''}! 👋 I'm your MockMate Assistant. I can help you with:\n\n• Navigating the platform\n• Interview preparation tips\n• Understanding your performance\n• Answering questions about features\n\nWhat can I help you with today?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, user?.name]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context: ChatContext = {
        currentPage: location.pathname,
        userRole: 'candidate',
        userName: user?.name,
      };

      const result = await sendChatMessage(input.trim(), messages, context);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        action: result.action
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Execute action if present
      if (result.action) {
        executeAction(result.action);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = (action: ChatAction) => {
    console.log('🎯 Executing action:', action);
    
    switch (action.type) {
      case 'navigate':
        // Small delay so user sees the message before navigation
        setTimeout(() => {
          navigate(action.payload.path);
        }, 500);
        break;
        
      case 'fetch-data':
        // Will implement data fetching in the next phase
        console.log('📊 Data fetch requested:', action.payload.dataType);
        break;
        
      case 'multi-step':
        // Will implement multi-step tasks in the next phase
        console.log('🔄 Multi-step task:', action.payload);
        break;
    }
  };

  const handleQuickReply = (reply: string) => {
    setInput(reply);
  };

  const quickReplies = getQuickReplies(location.pathname);

  return (
    <>
      {/* Floating Chat Button */}
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
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="w-[400px] h-[600px] flex flex-col shadow-2xl border-2 dark:border-gray-700">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-700 text-white rounded-t-lg">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold">MockMate Assistant</h3>
                    <p className="text-xs opacity-90">Always here to help</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 hover:bg-white/20 text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="text-sm">
                        <MessageContent content={msg.content} />
                      </div>
                      {msg.action && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <Badge variant="secondary" className="text-xs dark:bg-gray-700 dark:text-gray-300">
                            {msg.action.type === 'navigate' && '🚀 Navigating...'}
                            {msg.action.type === 'fetch-data' && '📊 Fetching data...'}
                            {msg.action.type === 'multi-step' && '🔄 Processing...'}
                          </Badge>
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm rounded-lg p-3">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {messages.length <= 1 && !isLoading && (
                <div className="px-4 py-2 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                        onClick={() => handleQuickReply(reply)}
                      >
                        {reply}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me anything..."
                    disabled={isLoading}
                    className="flex-1 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 dark:from-purple-700 dark:to-blue-700 dark:hover:from-purple-800 dark:hover:to-blue-800"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  Powered by MockMate AI
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
