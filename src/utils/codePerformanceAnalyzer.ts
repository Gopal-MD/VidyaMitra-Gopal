// Code Performance Analysis Utility
// Provides detailed analysis of code complexity, quality metrics, and performance insights

import { CodingQuestion, ProgrammingLanguage } from '@/types/coding';

interface PerformanceMetrics {
  timeComplexity: string;
  spaceComplexity: string;
  codeQuality: number;
  readability: number;
  maintainability: number;
  efficiency: number;
  bestPractices: number;
  suggestions: string[];
  strengths: string[];
  issues: string[];
}

interface ComplexityAnalysis {
  time: string;
  space: string;
  explanation: string;
}

export const analyzeCodePerformance = (
  code: string, 
  language: ProgrammingLanguage,
  question: CodingQuestion
): PerformanceMetrics => {
  const complexity = estimateComplexity(code);
  const quality = analyzeCodeQuality(code, language);
  const readability = analyzeReadability(code, language);
  const maintainability = analyzeMaintainability(code);
  const efficiency = analyzeEfficiency(code, complexity);
  const bestPractices = analyzeBestPractices(code, language);
  
  const suggestions = generateSuggestions(code, language, complexity, quality);
  const strengths = identifyStrengths(code, language, quality);
  const issues = identifyIssues(code, language, quality);

  return {
    timeComplexity: complexity.time,
    spaceComplexity: complexity.space,
    codeQuality: Math.round((quality + readability + maintainability + bestPractices) / 4),
    readability,
    maintainability,
    efficiency,
    bestPractices,
    suggestions,
    strengths,
    issues
  };
};

export const estimateComplexity = (code: string): ComplexityAnalysis => {
  let timeComplexity = 'O(1)';
  let spaceComplexity = 'O(1)';
  let explanation = 'Constant time and space complexity';

  const normalizedCode = code.toLowerCase()
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const forLoops = (normalizedCode.match(/for\s*\(/g) || []).length;
  const whileLoops = (normalizedCode.match(/while\s*\(/g) || []).length;
  const nestedLoops = analyzeNestedLoops(normalizedCode);
  
  if (nestedLoops >= 3) {
    timeComplexity = 'O(n^3)';
    explanation = 'Triple nested loops detected';
  } else if (nestedLoops >= 2) {
    timeComplexity = 'O(n^2)';
    explanation = 'Double nested loops detected';
  } else if (forLoops > 0 || whileLoops > 0) {
    timeComplexity = 'O(n)';
    explanation = 'Single loop detected';
  } else if (normalizedCode.includes('sort') || normalizedCode.includes('.sort(')) {
    timeComplexity = 'O(n log n)';
    explanation = 'Sorting operation detected';
  } else if (normalizedCode.includes('recursion') || hasRecursion(normalizedCode)) {
    if (normalizedCode.includes('fibonacci') || normalizedCode.includes('fib')) {
      timeComplexity = 'O(2^n)';
      explanation = 'Exponential recursion (likely Fibonacci-style)';
    } else {
      timeComplexity = 'O(n)';
      explanation = 'Linear recursion detected';
    }
  }

  if (normalizedCode.includes('new array') || normalizedCode.includes('new Array') || 
      normalizedCode.match(/\[.*\]/g) || normalizedCode.includes('list(') || 
      normalizedCode.includes('vector<') || normalizedCode.includes('ArrayList')) {
    if (nestedLoops >= 2) {
      spaceComplexity = 'O(n^2)';
    } else {
      spaceComplexity = 'O(n)';
    }
  } else if (hasRecursion(normalizedCode)) {
    spaceComplexity = 'O(n)';
    explanation += '. Stack space for recursion';
  }

  return { time: timeComplexity, space: spaceComplexity, explanation };
};

const analyzeNestedLoops = (code: string): number => {
  const lines = code.split('\n');
  let maxNesting = 0;
  let currentNesting = 0;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    
    braceDepth += (trimmed.match(/{/g) || []).length;
    
    if (trimmed.match(/^(for|while|do)\s*\(/)) {
      currentNesting++;
      maxNesting = Math.max(maxNesting, currentNesting);
    }
    
    braceDepth -= (trimmed.match(/}/g) || []).length;
    
    if (braceDepth === 0) {
      currentNesting = 0;
    }
  }

  return maxNesting;
};

const hasRecursion = (code: string): boolean => {
  const functionMatches = code.match(/function\s+(\w+)|def\s+(\w+)|class\s+\w+\s*{[^}]*?(\w+)\s*\(/g);
  
  if (!functionMatches) return false;
  
  for (const match of functionMatches) {
    const funcName = match.match(/\b(\w+)(?=\s*\()/)?.[1];
    if (funcName && code.includes(funcName + '(') && 
        code.indexOf(funcName + '(', code.indexOf(match)) > code.indexOf(match)) {
      return true;
    }
  }
  
  return false;
};

const analyzeCodeQuality = (code: string, language: ProgrammingLanguage): number => {
  let score = 70;
  
  const lines = code.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 5) score -= 15;
  if (lines.length > 100) score -= 10;
  
  const commentLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('#') || 
           trimmed.startsWith('/*') || trimmed.includes('*/');
  });
  
  if (commentLines.length > 0) score += 10;
  if (commentLines.length / lines.length > 0.2) score += 5;
  
  switch (language) {
    case 'javascript':
      if (code.includes('const ') || code.includes('let ')) score += 5;
      if (code.includes('===') && !code.includes('==')) score += 5;
      if (code.includes('console.log')) score -= 5;
      break;
      
    case 'python':
      if (code.includes('def ')) score += 5;
      if (code.match(/^\s+/m)) score += 5;
      if (code.includes('print(') && !code.includes('# Test')) score -= 5;
      break;
      
    case 'java':
      if (code.includes('public class')) score += 5;
      if (code.includes('private ') || code.includes('protected ')) score += 5;
      if (code.includes('System.out.print')) score -= 5;
      break;
      
    case 'cpp':
      if (code.includes('#include')) score += 5;
      if (code.includes('std::')) score += 5;
      if (code.includes('cout')) score -= 5;
      break;
  }
  
  return Math.max(0, Math.min(100, score));
};

const analyzeReadability = (code: string, language: ProgrammingLanguage): number => {
  let score = 60;
  
  const variables = code.match(/(\b[a-z][a-zA-Z0-9]*\b)/g) || [];
  const descriptiveVars = variables.filter(v => v.length > 2 && !['int', 'str', 'num'].includes(v));
  
  if (descriptiveVars.length / Math.max(variables.length, 1) > 0.7) score += 15;
  
  if (code.includes('function ') || code.includes('def ') || code.includes('public ')) {
    score += 10;
  }
  
  const longLines = code.split('\n').filter(line => line.length > 120);
  if (longLines.length === 0) score += 10;
  
  const indentedLines = code.split('\n').filter(line => line.startsWith('  ') || line.startsWith('\t'));
  if (indentedLines.length > 0) score += 10;
  
  return Math.max(0, Math.min(100, score));
};

const analyzeMaintainability = (code: string): number => {
  let score = 60;
  
  const functions = code.match(/(function\s+\w+|def\s+\w+|public\s+\w+\s+\w+\s*\()/g) || [];
  if (functions.length > 1) score += 15;
  
  const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 10);
  const uniqueLines = new Set(lines);
  if (uniqueLines.size / Math.max(lines.length, 1) > 0.8) score += 10;
  
  const numbers = code.match(/\b\d{2,}\b/g) || [];
  if (numbers.length > 3) score -= 10;
  
  return Math.max(0, Math.min(100, score));
};

const analyzeEfficiency = (code: string, complexity: ComplexityAnalysis): number => {
  let score = 70;
  
  if (complexity.time === 'O(1)') score = 95;
  else if (complexity.time === 'O(log n)') score = 90;
  else if (complexity.time === 'O(n)') score = 80;
  else if (complexity.time === 'O(n log n)') score = 70;
  else if (complexity.time === 'O(n^2)') score = 50;
  else if (complexity.time.includes('^3')) score = 30;
  else if (complexity.time.includes('^n')) score = 20;
  
  if (complexity.space === 'O(1)') score += 5;
  else if (complexity.space === 'O(n^2)') score -= 10;
  
  return Math.max(0, Math.min(100, score));
};

const analyzeBestPractices = (code: string, language: ProgrammingLanguage): number => {
  let score = 60;
  
  if (code.includes('try') && code.includes('catch')) score += 10;
  if (code.includes('if') && code.includes('null')) score += 5;
  
  if (code.includes('\n\n')) score += 5;
  
  switch (language) {
    case 'javascript':
      if (!code.includes('var ')) score += 10;
      if (code.includes('arrow function') || code.includes('=>')) score += 5;
      break;
      
    case 'python':
      if (code.includes('"""') || code.includes("'''")) score += 10;
      if (!code.includes('global ')) score += 5;
      break;
  }
  
  return Math.max(0, Math.min(100, score));
};

const generateSuggestions = (
  code: string, 
  language: ProgrammingLanguage, 
  complexity: ComplexityAnalysis,
  quality: number
): string[] => {
  const suggestions: string[] = [];
  
  if (complexity.time.includes('^2') || complexity.time.includes('^3')) {
    suggestions.push(`Consider optimizing time complexity from ${complexity.time}`);
  }
  
  if (complexity.space === 'O(n^2)') {
    suggestions.push('Try to reduce space complexity by using more efficient data structures');
  }
  
  if (quality < 60) {
    suggestions.push('Add more descriptive variable names and comments');
  }
  
  if (code.includes('console.log') || code.includes('print(') || code.includes('cout')) {
    suggestions.push('Remove debug print statements from final solution');
  }
  
  const lines = code.split('\n').filter(l => l.trim());
  if (lines.length < 5) {
    suggestions.push('Solution seems incomplete - ensure all edge cases are handled');
  }
  
  if (!code.includes('if') && !code.includes('switch')) {
    suggestions.push('Consider adding input validation or edge case handling');
  }
  
  return suggestions;
};

const identifyStrengths = (
  code: string, 
  language: ProgrammingLanguage, 
  quality: number
): string[] => {
  const strengths: string[] = [];
  
  if (quality >= 80) {
    strengths.push('Clean, well-structured code');
  }
  
  if (code.includes('//') || code.includes('#') || code.includes('/*')) {
    strengths.push('Good use of comments for clarity');
  }
  
  if (code.includes('const ') || code.includes('final ')) {
    strengths.push('Proper use of constants');
  }
  
  const functions = code.match(/(function\s+\w+|def\s+\w+)/g) || [];
  if (functions.length > 1) {
    strengths.push('Modular approach with multiple functions');
  }
  
  if (code.includes('if') || code.includes('switch')) {
    strengths.push('Includes proper conditional logic');
  }
  
  return strengths;
};

const identifyIssues = (
  code: string, 
  language: ProgrammingLanguage, 
  quality: number
): string[] => {
  const issues: string[] = [];
  
  if (quality < 40) {
    issues.push('Code quality needs significant improvement');
  }
  
  const longLines = code.split('\n').filter(line => line.length > 120);
  if (longLines.length > 0) {
    issues.push('Some lines are too long (>120 characters)');
  }
  
  if (code.includes('var ') && language === 'javascript') {
    issues.push('Avoid using "var" - use "let" or "const" instead');
  }
  
  const nestedLevel = analyzeNestedLoops(code);
  if (nestedLevel > 2) {
    issues.push('Deeply nested loops may indicate inefficient algorithm');
  }
  
  const magicNumbers = code.match(/\b(?!0|1)\d{2,}\b/g) || [];
  if (magicNumbers.length > 2) {
    issues.push('Consider replacing magic numbers with named constants');
  }
  
  return issues;
};

export const formatExecutionTime = (timeMs: number): string => {
  if (timeMs < 1) return `${Math.round(timeMs * 1000)} microseconds`;
  if (timeMs < 1000) return `${Math.round(timeMs)} ms`;
  return `${(timeMs / 1000).toFixed(2)} s`;
};

export const estimateMemoryUsage = (code: string, language: ProgrammingLanguage): string => {
  let baseMemory = 1;
  
  const arrays = (code.match(/\[|Array|list\(|vector</g) || []).length;
  const objects = (code.match(/{|}|dict\(|Map</g) || []).length;
  
  baseMemory += arrays * 0.5 + objects * 0.3;
  
  switch (language) {
    case 'java':
      baseMemory *= 2;
      break;
    case 'python':
      baseMemory *= 1.5;
      break;
    case 'cpp':
      baseMemory *= 0.8;
      break;
  }
  
  return `${Math.round(baseMemory)} KB`;
};

export default {
  analyzeCodePerformance,
  estimateComplexity,
  formatExecutionTime,
  estimateMemoryUsage
};