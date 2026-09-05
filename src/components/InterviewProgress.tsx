
import { useInterview } from "@/contexts/InterviewContext";
import { Progress } from "@/components/ui/progress";

const InterviewProgress = () => {
  const { getProgressPercentage, currentInterview, currentQuestionIndex } = useInterview();
  
  if (!currentInterview) return null;
  
  const progress = getProgressPercentage();
  const totalQuestions = currentInterview.questions.length;
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>
        <span className="text-sm font-medium">
          {Math.round(progress)}% Complete
        </span>
      </div>
      <Progress value={progress} className="w-full" />
    </div>
  );
};

export default InterviewProgress;
