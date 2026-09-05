import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TranscriptionPanelProps {
  messages: Array<{
    speaker: 'friede' | 'candidate';
    text: string;
    timestamp: number;
  }>;
  show: boolean;
}

export default function TranscriptionPanel({ messages, show }: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!show) {
    return null;
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-400" />
        <h3 className="text-white font-medium text-sm">Live Transcription</h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Transcription will appear here...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.speaker === 'friede' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.speaker === 'friede'
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'bg-green-600/20 border border-green-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        message.speaker === 'friede' ? 'text-blue-400' : 'text-green-400'
                      }`}
                    >
                      {message.speaker === 'friede' ? 'FRIEDE' : 'You'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{message.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
