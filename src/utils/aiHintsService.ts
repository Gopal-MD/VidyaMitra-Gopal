// AI-Powered Hints and Explanations Service
// Provides intelligent hints, explanations, and learning guidance using Gemini AI

import { GoogleGenerativeAI } from '@google/generative-ai';
import { API_KEYS } from '@/config/apiKeys';
import { CodingQuestion, ProgrammingLanguage } from '@/types/coding';
import { getAIProvider } from './aiProviderService';
import { getCodingHintsWithOpenAI } from './openaiService';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(API_KEYS.GEMINI_MAIN);

// Helper: call either Gemini or OpenAI for coding hints
async function callAIForHints(prompt: string, action: string = 'hint'): Promise<string> {
  const provider = getAIProvider();
  
  if (provider === 'openai') {
    return getCodingHintsWithOpenAI(prompt, action);
  }
  
  // Gemini path
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export interface HintLevel {
  level: 1 | 2 | 3;
  title: string;
  content: string;
}

export interface CodeExplanation {
  overview: string;
  approach: string;
  complexity: {
    time: string;
    space: string;
    explanation: string;
  };
  keyPoints: string[];
  commonMistakes: string[];
}

export interface PersonalizedHint {
  hint: string;
  guidance: string;
  nextSteps: string[];
  relevantConcepts: string[];
}

/**
 * Generate progressive hints for a coding question
 * Returns 3 levels of hints: subtle, medium, and direct
 */
export const generateProgressiveHints = async (
  question: CodingQuestion,
  language: ProgrammingLanguage
): Promise<HintLevel[]> => {
  try {
    const prompt = `
You are an expert coding instructor. Generate 3 progressive hints for this coding problem.

Problem: ${question.title}
Description: ${question.description}
Difficulty: ${question.difficulty}
Language: ${language}

Provide hints in this EXACT JSON format (no markdown, just pure JSON):
{
  "hints": [
    {
      "level": 1,
      "title": "Subtle Hint - Think About...",
      "content": "A very subtle hint that guides thinking without giving away the solution"
    },
    {
      "level": 2,
      "title": "Medium Hint - Consider This Approach...",
      "content": "A more direct hint about the approach or data structure to use"
    },
    {
      "level": 3,
      "title": "Direct Hint - Here's the Strategy...",
      "content": "A clear explanation of the solution approach without complete code"
    }
  ]
}

Make hints educational and encourage problem-solving rather than just giving answers.
`;

    const response = await callAIForHints(prompt, 'hint');
    
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.hints || [];

  } catch (error) {
    console.error('Error generating hints:', error);
    
    // Return fallback hints
    return [
      {
        level: 1,
        title: 'Think About Data Structures',
        content: 'Consider what data structure would help you efficiently solve this problem. Think about access patterns and time complexity.'
      },
      {
        level: 2,
        title: 'Consider the Algorithm',
        content: question.hints?.[0] || 'Break the problem down into smaller steps. What patterns do you recognize?'
      },
      {
        level: 3,
        title: 'Solution Approach',
        content: question.hints?.[1] || 'Look at the example test cases carefully. What transformations are happening?'
      }
    ];
  }
};

/**
 * Generate personalized hint based on user's current code
 */
export const generatePersonalizedHint = async (
  question: CodingQuestion,
  userCode: string,
  language: ProgrammingLanguage,
  testResults?: { passed: number; total: number }
): Promise<PersonalizedHint> => {
  try {
    const testInfo = testResults 
      ? `Currently passing ${testResults.passed} out of ${testResults.total} test cases.` 
      : '';

    const prompt = `
You are a helpful coding mentor. Analyze this student's code and provide personalized guidance.

Problem: ${question.title}
Description: ${question.description}
Language: ${language}
${testInfo}

Student's Code:
\`\`\`${language}
${userCode}
\`\`\`

Provide personalized guidance in this EXACT JSON format:
{
  "hint": "A specific hint based on their current code",
  "guidance": "Constructive guidance on what they're doing right and what needs improvement",
  "nextSteps": ["Step 1", "Step 2", "Step 3"],
  "relevantConcepts": ["Concept 1", "Concept 2"]
}

Be encouraging and educational. Focus on helping them learn, not just solving the problem.
`;

    const response = await callAIForHints(prompt, 'hint');
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Error generating personalized hint:', error);
    
    return {
      hint: 'Review your logic step by step. Try adding console.log statements to debug.',
      guidance: 'Break down the problem into smaller parts and test each part separately.',
      nextSteps: [
        'Identify which test cases are failing',
        'Add debug output to understand your code\'s behavior',
        'Review the problem constraints carefully'
      ],
      relevantConcepts: ['Problem Decomposition', 'Debugging', 'Test-Driven Development']
    };
  }
};

/**
 * Explain a code solution in detail
 */
export const explainSolution = async (
  question: CodingQuestion,
  solutionCode: string,
  language: ProgrammingLanguage
): Promise<CodeExplanation> => {
  try {
    const prompt = `
Provide a comprehensive explanation of this solution to a coding problem.

Problem: ${question.title}
Description: ${question.description}

Solution Code:
\`\`\`${language}
${solutionCode}
\`\`\`

Provide explanation in this EXACT JSON format:
{
  "overview": "High-level explanation of what the solution does",
  "approach": "Detailed explanation of the algorithm/approach used",
  "complexity": {
    "time": "O(n) notation",
    "space": "O(n) notation",
    "explanation": "Why this complexity"
  },
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "commonMistakes": ["Common mistake 1", "Common mistake 2"]
}
`;

    const response = await callAIForHints(prompt, 'explain');
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Error explaining solution:', error);
    
    return {
      overview: 'This solution solves the problem using standard algorithmic techniques.',
      approach: 'The code implements a solution by processing the input and generating the expected output.',
      complexity: {
        time: 'O(n)',
        space: 'O(1)',
        explanation: 'Analysis not available'
      },
      keyPoints: [
        'Review the solution code carefully',
        'Understand the data structures used',
        'Trace through with example inputs'
      ],
      commonMistakes: [
        'Not handling edge cases',
        'Inefficient nested loops',
        'Missing input validation'
      ]
    };
  }
};

/**
 * Generate learning recommendations based on performance
 */
export const generateLearningPath = async (
  weakAreas: string[],
  strengths: string[],
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<{
  recommendations: string[];
  topicsToReview: string[];
  practiceProblems: string[];
}> => {
  try {
    const prompt = `
As a coding education expert, provide personalized learning recommendations.

Student's Weak Areas: ${weakAreas.join(', ')}
Student's Strengths: ${strengths.join(', ')}
Current Level: ${difficulty}

Provide recommendations in this EXACT JSON format:
{
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "topicsToReview": ["Topic 1", "Topic 2", "Topic 3"],
  "practiceProblems": ["Problem type 1", "Problem type 2", "Problem type 3"]
}

Focus on actionable advice that will help them improve.
`;

    const response = await callAIForHints(prompt, 'hint');
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error('Error generating learning path:', error);
    
    return {
      recommendations: [
        'Practice more problems in your weak areas',
        'Review fundamental data structures and algorithms',
        'Focus on understanding time and space complexity'
      ],
      topicsToReview: weakAreas.length > 0 ? weakAreas : ['Arrays', 'Strings', 'Hash Tables'],
      practiceProblems: [
        'Easy array manipulation problems',
        'String processing challenges',
        'Basic algorithm implementation'
      ]
    };
  }
};

/**
 * Get AI debugging help
 */
export const getDebuggingHelp = async (
  code: string,
  error: string,
  language: ProgrammingLanguage
): Promise<{
  diagnosis: string;
  likelyCause: string;
  suggestedFixes: string[];
}> => {
  try {
    const prompt = `
You are a debugging expert. Help diagnose this coding error.

Language: ${language}
Error: ${error}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide debugging help in this EXACT JSON format:
{
  "diagnosis": "What the error means in simple terms",
  "likelyCause": "Most probable cause of the error",
  "suggestedFixes": ["Fix suggestion 1", "Fix suggestion 2", "Fix suggestion 3"]
}
`;

    const response = await callAIForHints(prompt, 'hint');
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (aiError) {
    console.error('Error getting debugging help:', aiError);
    
    return {
      diagnosis: error,
      likelyCause: 'Check for syntax errors, undefined variables, or logic issues',
      suggestedFixes: [
        'Review your code for typos and syntax errors',
        'Check that all variables are properly declared',
        'Verify your function logic matches the requirements'
      ]
    };
  }
};

export default {
  generateProgressiveHints,
  generatePersonalizedHint,
  explainSolution,
  generateLearningPath,
  getDebuggingHelp,
};