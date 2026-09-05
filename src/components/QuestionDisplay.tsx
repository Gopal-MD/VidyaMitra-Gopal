
import { Badge } from "@/components/ui/badge";
import { Question } from "@/types";

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
}

const QuestionDisplay = ({ 
  question, 
  questionNumber, 
  totalQuestions 
}: QuestionDisplayProps) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "technical":
        return "bg-blue-100 text-blue-800";
      case "behavioral":
        return "bg-green-100 text-green-800";
      case "situational":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="question-number">{questionNumber}</span>
          <Badge variant="outline" className={getCategoryColor(question.category)}>
            {question.category.charAt(0).toUpperCase() + question.category.slice(1)}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>
      
      <h2 className="text-xl md:text-2xl font-medium mb-4">{question.text}</h2>
    </div>
  );
};

export default QuestionDisplay;
