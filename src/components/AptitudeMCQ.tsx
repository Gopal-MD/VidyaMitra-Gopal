import { useState } from 'react';
import { MCQQuestion } from '@/data/aptitudeQuestions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AptitudeMCQProps {
  question: MCQQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  onAnswerSelect: (answerIndex: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  showExplanation?: boolean;
  isFirst: boolean;
  isLast: boolean;
  timeRemaining?: number;
}

export const AptitudeMCQ = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  onNext,
  onPrevious,
  showExplanation = false,
  isFirst,
  isLast,
  timeRemaining
}: AptitudeMCQProps) => {
  const getCategoryColor = (category: MCQQuestion['category']) => {
    switch (category) {
      case 'logical': return 'bg-blue-100 text-blue-800';
      case 'quantitative': return 'bg-green-100 text-green-800';
      case 'verbal': return 'bg-purple-100 text-purple-800';
      case 'data-interpretation': return 'bg-orange-100 text-orange-800';
      case 'technical': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge className={getCategoryColor(question.category)}>
                  {question.category.replace('-', ' ').toUpperCase()}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getDifficultyColor(question.difficulty)}`} />
                  {question.difficulty}
                </Badge>
                <Badge variant="secondary">{question.topic}</Badge>
              </div>
              
              {timeRemaining !== undefined && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className={`font-mono ${timeRemaining < 300 ? 'text-red-600 font-bold' : ''}`}>
                    {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Question {questionNumber} of {totalQuestions}</span>
                <span>{Math.round((questionNumber / totalQuestions) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">{question.question}</h3>

              {/* Options */}
              <RadioGroup
                value={selectedAnswer !== null ? selectedAnswer.toString() : undefined}
                onValueChange={(value) => onAnswerSelect(parseInt(value))}
                disabled={showExplanation}
              >
                <div className="space-y-3">
                  {question.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrectOption = index === question.correctAnswer;
                    const showCorrect = showExplanation && isCorrectOption;
                    const showIncorrect = showExplanation && isSelected && !isCorrect;

                    return (
                      <Label
                        key={index}
                        htmlFor={`option-${index}`}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          showCorrect
                            ? 'border-green-500 bg-green-50'
                            : showIncorrect
                            ? 'border-red-500 bg-red-50'
                            : isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        } ${showExplanation ? 'cursor-not-allowed' : ''}`}
                      >
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} className="shrink-0" />
                        <span className="flex-1 font-medium">
                          <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </span>
                        {showCorrect && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                        {showIncorrect && <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
                      </Label>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Explanation */}
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <h4 className="font-semibold text-blue-900 mb-2">Explanation:</h4>
                <p className="text-blue-800">{question.explanation}</p>
                
                {!isCorrect && (
                  <div className="mt-3 p-3 bg-blue-100 rounded">
                    <p className="text-sm text-blue-900">
                      <strong>Correct Answer:</strong> {String.fromCharCode(65 + question.correctAnswer)}. {question.options[question.correctAnswer]}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={isFirst}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                {selectedAnswer !== null ? (
                  <span className="text-primary font-medium">Answer selected</span>
                ) : (
                  <span>Select an answer to continue</span>
                )}
              </div>

              <Button
                onClick={onNext}
                disabled={selectedAnswer === null && !showExplanation}
              >
                {isLast ? 'Submit Test' : 'Next'}
                {!isLast && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
