import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { CodingQuestion, DIFFICULTY_COLORS, CATEGORY_COLORS } from '@/types/coding';
import { motion } from 'framer-motion';

interface CodingQuestionDisplayProps {
  question: CodingQuestion;
  onHintRequest?: (hintIndex: number) => void;
  revealedHints?: number[];
}

export const CodingQuestionDisplay = ({
  question,
  onHintRequest,
  revealedHints = []
}: CodingQuestionDisplayProps) => {
  const [showHints, setShowHints] = useState(false);

  const difficultyClass = DIFFICULTY_COLORS[question.difficulty];
  const categoryClass = CATEGORY_COLORS[question.category] || 'bg-gray-100 text-gray-800';

  return (
    <Card className="h-full flex flex-col shadow-none border-0 rounded-none">
      <CardHeader className="pb-2 pt-3 px-4 border-b bg-gray-50/50 shrink-0">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-blue-100 p-1 rounded shrink-0">
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-bold text-gray-900 truncate">{question.title}</CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={difficultyClass + " text-xs font-semibold px-2 py-0.5"}>
                {question.difficulty.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className={categoryClass + " font-medium text-xs py-0.5"}>
              {question.category}
            </Badge>
            {question.timeLimit && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{question.timeLimit} min</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="description" className="h-full flex flex-col">
          <TabsList className="w-full mx-4 my-2 shrink-0 grid grid-cols-3">
            <TabsTrigger value="description" className="text-xs">
              📝 Description
            </TabsTrigger>
            <TabsTrigger value="examples" className="text-xs">
              💡 Examples
            </TabsTrigger>
            <TabsTrigger value="hints" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Hints ({revealedHints.length}/{question.hints.length})
            </TabsTrigger>
          </TabsList>

          {/* Description Tab */}
          <TabsContent value="description" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full px-4">
              <div className="space-y-3 py-2">
                {/* Problem Description */}
                <div>
                  <h3 className="font-semibold text-xs mb-1.5 text-gray-900">Problem Description</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {question.description}
                  </p>
                </div>

                {/* Input/Output Format */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <h4 className="font-semibold text-xs mb-1 text-blue-900">Input Format</h4>
                    <code className="text-xs text-blue-800 font-mono">{question.inputFormat}</code>
                  </div>
                  <div className="bg-green-50 p-2 rounded border border-green-200">
                    <h4 className="font-semibold text-xs mb-1 text-green-900">Output Format</h4>
                    <code className="text-xs text-green-800 font-mono">{question.outputFormat}</code>
                  </div>
                </div>

                {/* Constraints */}
                <div>
                  <h3 className="font-semibold text-xs mb-2 text-gray-900">Constraints</h3>
                  <ul className="space-y-1.5">
                    {question.constraints.map((constraint, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5 font-bold text-xs">•</span>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">{constraint}</code>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Topics */}
                {question.topics && question.topics.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-xs mb-2 text-gray-900">Related Topics</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {question.topics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs font-medium py-0.5">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Examples Tab */}
          <TabsContent value="examples" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full px-4">
              <div className="space-y-3 py-2">
                {question.examples.map((example, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-lg p-3 bg-muted/20"
                  >
                    <h3 className="font-semibold text-xs mb-2">Example {index + 1}</h3>
                    
                    <div className="space-y-2">
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Input:</p>
                        <code className="text-xs text-blue-800 block">{example.input}</code>
                      </div>
                      
                      <div className="bg-green-50 p-2 rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-900 mb-1">Output:</p>
                        <code className="text-xs text-green-800 block">{example.output}</code>
                      </div>
                      
                      {example.explanation && (
                        <div className="bg-purple-50 p-2 rounded border border-purple-200">
                          <p className="text-xs font-semibold text-purple-900 mb-1">Explanation:</p>
                          <p className="text-xs text-purple-800">{example.explanation}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Sample Test Cases (visible ones) */}
                <div className="mt-4">
                  <h3 className="font-semibold text-xs mb-2">Sample Test Cases</h3>
                  <div className="space-y-2">
                    {question.testCases.filter(tc => !tc.isHidden).map((testCase, index) => (
                      <div key={testCase.id} className="bg-gray-50 p-2 rounded border">
                        <p className="text-xs font-semibold mb-1">Test Case {index + 1}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Input: </span>
                            <code className="bg-white px-1.5 py-0.5 rounded text-xs">
                              {testCase.input.substring(0, 50)}
                              {testCase.input.length > 50 && '...'}
                            </code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expected: </span>
                            <code className="bg-white px-1.5 py-0.5 rounded text-xs">
                              {testCase.expectedOutput}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Hints Tab */}
          <TabsContent value="hints" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full px-4">
              <div className="space-y-3 py-2">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-xs text-yellow-900 mb-0.5">Hints Available</h3>
                      <p className="text-xs text-yellow-800">
                        Click to reveal hints. Using hints may affect your score.
                      </p>
                    </div>
                  </div>
                </div>

                {question.hints.map((hint, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Badge variant="outline" className="text-xs py-0.5">Hint {index + 1}</Badge>
                          {revealedHints.includes(index) && (
                            <Badge className="bg-green-100 text-green-800 text-xs py-0.5">
                              <Eye className="h-2.5 w-2.5 mr-1" />
                              Revealed
                            </Badge>
                          )}
                        </div>
                        
                        {revealedHints.includes(index) ? (
                          <p className="text-xs text-muted-foreground">{hint}</p>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Click to reveal this hint</span>
                          </div>
                        )}
                      </div>
                      
                      {!revealedHints.includes(index) && onHintRequest && (
                        <Button
                          onClick={() => onHintRequest(index)}
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-7 text-xs"
                        >
                          Reveal
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
