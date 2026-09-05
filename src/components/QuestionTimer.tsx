
import { useState, useEffect } from "react";
import { useInterview } from "@/contexts/InterviewContext";
import { Alert } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface QuestionTimerProps {
  onTimeout: () => void;
  duration?: number; // in seconds
  questionIndex: number; // Added question index to detect question changes
}

const QuestionTimer = ({ onTimeout, duration = 90, questionIndex }: QuestionTimerProps) => {
  const { timerEnabled } = useInterview();
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);
  
  // Reset timer when question changes
  useEffect(() => {
    if (timerEnabled) {
      setTimeLeft(duration);
      setIsWarning(false);
    }
  }, [duration, questionIndex, timerEnabled]);
  
  // Timer logic
  useEffect(() => {
    if (!timerEnabled) {
      return;
    }
    
    // Set a warning at 30% of time remaining
    if (timeLeft <= duration * 0.3 && !isWarning) {
      setIsWarning(true);
    }
    
    // Handle timeout
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    
    // Decrement timer
    const timerId = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [timeLeft, timerEnabled, duration, isWarning, onTimeout]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage
  const progressPercentage = (timeLeft / duration) * 100;
  
  // Determine color based on time left
  const getTimerColor = () => {
    if (progressPercentage > 60) return "bg-green-500";
    if (progressPercentage > 30) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  if (!timerEnabled) {
    return null;
  }
  
  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Time Remaining</span>
        <span className={`text-sm font-medium ${isWarning ? "text-red-500" : ""}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      <div className="h-2 w-full bg-gray-200 rounded-full">
        <div 
          className={`h-2 rounded-full transition-all duration-1000 ${getTimerColor()}`}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      {isWarning && (
        <Alert variant="destructive" className="mt-2 py-2">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2 text-sm">Time is running out!</span>
        </Alert>
      )}
    </div>
  );
};

export default QuestionTimer;
