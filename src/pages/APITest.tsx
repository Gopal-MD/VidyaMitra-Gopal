import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestTube, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { testGeminiAPI, generateQuestionsWithGemini, evaluateAnswerWithGemini } from "@/utils/geminiService";
import { motion } from "framer-motion";

const APITest = () => {
  const [apiTestResult, setApiTestResult] = useState(null);
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [questionTest, setQuestionTest] = useState(null);
  const [isTestingQuestions, setIsTestingQuestions] = useState(false);
  const [evaluationTest, setEvaluationTest] = useState(null);
  const [isTestingEvaluation, setIsTestingEvaluation] = useState(false);
  const [resumeTest, setResumeTest] = useState(null);
  const [isTestingResume, setIsTestingResume] = useState(false);

  const handleBasicAPITest = async () => {
    setIsTestingAPI(true);
    setApiTestResult(null);
    
    try {
      const result = await testGeminiAPI();
      setApiTestResult(result);
    } catch (error) {
      setApiTestResult({ success: false, error: error.message });
    } finally {
      setIsTestingAPI(false);
    }
  };

  const handleQuestionGenerationTest = async () => {
    setIsTestingQuestions(true);
    setQuestionTest(null);
    
    try {
      const questions = await generateQuestionsWithGemini("Software Developer");
      setQuestionTest({ success: true, questions: questions.slice(0, 3) });
    } catch (error) {
      setQuestionTest({ success: false, error: error.message });
    } finally {
      setIsTestingQuestions(false);
    }
  };

  const handleEvaluationTest = async () => {
    setIsTestingEvaluation(true);
    setEvaluationTest(null);
    
    try {
      const evaluation = await evaluateAnswerWithGemini(
        "What is React?",
        "React is a JavaScript library for building user interfaces, developed by Facebook."
      );
      setEvaluationTest({ success: true, evaluation });
    } catch (error) {
      setEvaluationTest({ success: false, error: error.message });
    } finally {
      setIsTestingEvaluation(false);
    }
  };

  const handleResumeAnalysisTest = async () => {
    setIsTestingResume(true);
    setResumeTest(null);
    
    try {
      // Create a mock text resume for testing
      const mockResumeText = `
        John Doe
        john.doe@email.com
        (555) 123-4567
        
        Software Engineer with 3 years of experience
        
        Technical Skills:
        - JavaScript, TypeScript, React, Node.js
        - Python, Django, Flask
        - SQL, MongoDB, PostgreSQL
        - Git, Docker, AWS
        
        Experience:
        2021-2024: Full Stack Developer at Tech Company
        - Built web applications using React and Node.js
        - Developed REST APIs and microservices
        - Worked with AWS cloud services
        
        Education:
        Bachelor of Science in Computer Science
        University of Technology (2021)
      `;
      
      // Import the analyzeResumeWithGemini function
      const { analyzeResumeWithGemini } = await import('@/utils/geminiService');
      const analysis = await analyzeResumeWithGemini(mockResumeText, "Software Engineer");
      
      setResumeTest({ success: true, analysis });
    } catch (error) {
      setResumeTest({ success: false, error: error.message });
    } finally {
      setIsTestingResume(false);
    }
  };

  const renderTestResult = (result, isLoading, testName) => {
    if (isLoading) {
      return (
        <Badge variant="secondary" className="flex items-center gap-2">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Testing...
        </Badge>
      );
    }

    if (!result) {
      return (
        <Badge variant="outline" className="flex items-center gap-2">
          <AlertCircle className="h-3 w-3" />
          Not Tested
        </Badge>
      );
    }

    return result.success ? (
      <Badge variant="default" className="bg-green-500 flex items-center gap-2">
        <CheckCircle className="h-3 w-3" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive" className="flex items-center gap-2">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <TestTube className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">API Testing Dashboard</h1>
              <p className="text-muted-foreground">Test and verify Gemini AI integration</p>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Basic API Connection Test */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Basic API Connection
                    </CardTitle>
                    <CardDescription>
                      Test basic connectivity to Gemini API
                    </CardDescription>
                  </div>
                  {renderTestResult(apiTestResult, isTestingAPI, "Basic API")}
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleBasicAPITest}
                  disabled={isTestingAPI}
                  className="mb-4"
                >
                  {isTestingAPI ? 'Testing...' : 'Test Basic Connection'}
                </Button>
                
                {apiTestResult && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${
                      apiTestResult.success 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {apiTestResult.success ? (
                        <div className="text-green-800">
                          <strong>✅ Success:</strong> {apiTestResult.response}
                        </div>
                      ) : (
                        <div className="text-red-800">
                          <strong>❌ Error:</strong> {apiTestResult.error}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Question Generation Test */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Question Generation</CardTitle>
                    <CardDescription>
                      Test AI-powered interview question generation
                    </CardDescription>
                  </div>
                  {renderTestResult(questionTest, isTestingQuestions, "Questions")}
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleQuestionGenerationTest}
                  disabled={isTestingQuestions}
                  className="mb-4"
                >
                  {isTestingQuestions ? 'Generating...' : 'Test Question Generation'}
                </Button>
                
                {questionTest && (
                  <div className="space-y-2">
                    {questionTest.success ? (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <div className="text-green-800 font-medium mb-2">✅ Generated Questions:</div>
                        <div className="space-y-2">
                          {questionTest.questions.map((q, index) => (
                            <div key={index} className="bg-white p-2 rounded border">
                              <strong>Q{index + 1}:</strong> {q.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <div className="text-red-800">
                          <strong>❌ Error:</strong> {questionTest.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Answer Evaluation Test */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Answer Evaluation</CardTitle>
                    <CardDescription>
                      Test AI-powered answer evaluation system
                    </CardDescription>
                  </div>
                  {renderTestResult(evaluationTest, isTestingEvaluation, "Evaluation")}
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleEvaluationTest}
                  disabled={isTestingEvaluation}
                  className="mb-4"
                >
                  {isTestingEvaluation ? 'Evaluating...' : 'Test Answer Evaluation'}
                </Button>
                
                {evaluationTest && (
                  <div className="space-y-2">
                    {evaluationTest.success ? (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <div className="text-green-800 font-medium mb-2">✅ Evaluation Result:</div>
                        <div className="bg-white p-3 rounded border space-y-2">
                          <div><strong>Score:</strong> {evaluationTest.evaluation.score}/10</div>
                          <div><strong>Strengths:</strong> {evaluationTest.evaluation.strengths?.join(', ')}</div>
                          <div><strong>Improvements:</strong> {evaluationTest.evaluation.improvements?.join(', ')}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <div className="text-red-800">
                          <strong>❌ Error:</strong> {evaluationTest.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resume Analysis Test */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resume Analysis</CardTitle>
                    <CardDescription>
                      Test AI-powered resume analysis and ATS scoring
                    </CardDescription>
                  </div>
                  {renderTestResult(resumeTest, isTestingResume, "Resume Analysis")}
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleResumeAnalysisTest}
                  disabled={isTestingResume}
                  className="mb-4"
                >
                  {isTestingResume ? 'Analyzing...' : 'Test Resume Analysis'}
                </Button>
                
                {resumeTest && (
                  <div className="space-y-2">
                    {resumeTest.success ? (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <div className="text-green-800 font-medium mb-2">✅ Resume Analysis Result:</div>
                        <div className="bg-white p-3 rounded border space-y-2">
                          <div><strong>ATS Score:</strong> {resumeTest.analysis.ats_match_score}%</div>
                          <div><strong>Total Experience:</strong> {resumeTest.analysis.experience.total_years} years</div>
                          <div><strong>Technical Skills:</strong> {resumeTest.analysis.skills_extracted.technical_skills?.join(', ')}</div>
                          <div><strong>Match Percentage:</strong> {resumeTest.analysis.role_specific_analysis.match_percentage}%</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <div className="text-red-800">
                          <strong>❌ Error:</strong> {resumeTest.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Run All Tests */}
            <Card>
              <CardHeader>
                <CardTitle>Run All Tests</CardTitle>
                <CardDescription>
                  Execute all API tests in sequence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={async () => {
                    await handleBasicAPITest();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await handleQuestionGenerationTest();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await handleEvaluationTest();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await handleResumeAnalysisTest();
                  }}
                  disabled={isTestingAPI || isTestingQuestions || isTestingEvaluation || isTestingResume}
                  variant="outline"
                  className="w-full"
                >
                  Run Full Test Suite
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default APITest;