
/**
 * Advanced AI-generated content detection utility with confidence scoring.
 * Provides detailed analysis of why content was flagged.
 */

export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number; // 0-100
  analysis: {
    indicators: string[];
    humanSignals: string[];
    structureScore: number;
    vocabularyScore: number;
    naturalnessScore: number;
  };
}

// Common patterns in AI-generated content with weights
const AI_INDICATORS = [
  { pattern: /^In this response,? I will/i, weight: 10, reason: "Formal response introduction" },
  { pattern: /I'd be happy to (help|assist|provide)/i, weight: 8, reason: "AI assistant language" },
  { pattern: /^As an AI (assistant|language model)/i, weight: 15, reason: "AI self-identification" },
  { pattern: /^Let me (explain|provide|break down)/i, weight: 7, reason: "Structured explanation start" },
  { pattern: /^To summarize the (key|main) points/i, weight: 6, reason: "Formal summarization" },
  { pattern: /^In conclusion, (we can see|it's clear|it's evident)/i, weight: 6, reason: "Academic conclusion" },
  { pattern: /plethora of/i, weight: 4, reason: "Overly formal vocabulary" },
  { pattern: /myriad of/i, weight: 4, reason: "Uncommon word choice" },
  { pattern: /paradigm shift/i, weight: 5, reason: "Corporate buzzword" },
  { pattern: /holistic (approach|view|perspective)/i, weight: 5, reason: "Generic business language" },
  { pattern: /It's important to note that/i, weight: 6, reason: "Repetitive AI phrase" },
  { pattern: /It's worth mentioning that/i, weight: 6, reason: "Repetitive AI phrase" },
  { pattern: /As mentioned (earlier|previously|above)/i, weight: 5, reason: "Self-referential structure" },
  { pattern: /Hope this helps/i, weight: 8, reason: "AI assistant closure" },
  { pattern: /Please let me know if you need further assistance/i, weight: 10, reason: "AI assistant closure" },
  { pattern: /I'm here to help/i, weight: 8, reason: "AI assistant language" },
  { pattern: /^\d\. .+\n\d\. .+\n\d\. .+/m, weight: 5, reason: "Perfect numbered formatting" },
  { pattern: /^• .+\n• .+\n• .+/m, weight: 5, reason: "Perfect bullet formatting" },
  { pattern: /Furthermore|Moreover|Additionally|Consequently/gi, weight: 3, reason: "Formal connectors overuse" },
  { pattern: /delve into/i, weight: 6, reason: "AI-favored phrase" },
  { pattern: /It is crucial to understand/i, weight: 5, reason: "Overly formal emphasis" },
];

// Words and phrases that humans commonly use in interviews with weights
const HUMAN_INDICATORS = [
  { pattern: /\bum\b/gi, weight: 3, reason: "Natural filler word" },
  { pattern: /\blike\b/gi, weight: 2, reason: "Casual speech pattern" },
  { pattern: /you know/gi, weight: 3, reason: "Conversational filler" },
  { pattern: /I mean/gi, weight: 3, reason: "Natural clarification" },
  { pattern: /basically/gi, weight: 2, reason: "Informal explanation" },
  { pattern: /actually/gi, weight: 2, reason: "Natural emphasis" },
  { pattern: /kinda|sorta/gi, weight: 3, reason: "Casual approximation" },
  { pattern: /sort of/gi, weight: 2, reason: "Hedging language" },
  { pattern: /I guess/gi, weight: 3, reason: "Uncertainty marker" },
  { pattern: /I think/gi, weight: 2, reason: "Personal opinion marker" },
  { pattern: /probably|maybe/gi, weight: 2, reason: "Uncertainty" },
  { pattern: /honestly|to be honest/gi, weight: 3, reason: "Informal emphasis" },
  { pattern: /\bwell\b/gi, weight: 2, reason: "Hesitation marker" },
  { pattern: /\bso\b/gi, weight: 1, reason: "Casual connector" },
  { pattern: /I've been/gi, weight: 2, reason: "Personal experience" },
  { pattern: /I believe/gi, weight: 2, reason: "Personal conviction" },
  { pattern: /in my experience/gi, weight: 3, reason: "Personal context" },
  { pattern: /from what I've seen/gi, weight: 3, reason: "Personal observation" },
  { pattern: /gonna|wanna/gi, weight: 4, reason: "Casual contraction" },
  { pattern: /can't|won't|don't/gi, weight: 1, reason: "Informal contraction" },
];

export const detectAIGeneratedAdvanced = (text: string): AIDetectionResult => {
  if (!text || text.length < 100) {
    return {
      isAIGenerated: false,
      confidence: 0,
      analysis: {
        indicators: ["Text too short for reliable analysis"],
        humanSignals: [],
        structureScore: 0,
        vocabularyScore: 0,
        naturalnessScore: 100,
      }
    };
  }

  const indicators: string[] = [];
  const humanSignals: string[] = [];
  let aiScore = 0;
  let humanScore = 0;

  // Check AI indicators
  for (const item of AI_INDICATORS) {
    const matches = text.match(item.pattern);
    if (matches) {
      aiScore += item.weight * matches.length;
      indicators.push(`${item.reason} (found ${matches.length}x)`);
    }
  }

  // Check human indicators
  for (const item of HUMAN_INDICATORS) {
    const matches = text.match(item.pattern);
    if (matches) {
      humanScore += item.weight * matches.length;
      humanSignals.push(`${item.reason} (found ${matches.length}x)`);
    }
  }

  // Structure analysis
  const sentences = text.match(/[^.!?]+[.!?]/g) || [];
  const perfectCapitalization = sentences.filter(s => /^\s*[A-Z]/.test(s)).length;
  const capitalizationRatio = perfectCapitalization / (sentences.length || 1);
  
  const avgSentenceLength = text.length / (sentences.length || 1);
  const hasVariedLength = sentences.some(s => s.length < 50) && sentences.some(s => s.length > 100);
  
  let structureScore = 0;
  if (capitalizationRatio > 0.95) {
    structureScore += 30;
    indicators.push("Perfect capitalization throughout (95%+)");
  }
  if (!hasVariedLength && avgSentenceLength > 80) {
    structureScore += 20;
    indicators.push("Uniform sentence length (AI characteristic)");
  }
  if (text.match(/^(First|Second|Third|Finally|In conclusion)/gm)?.length > 2) {
    structureScore += 15;
    indicators.push("Excessive structural markers");
  }

  // Vocabulary sophistication
  const sophisticatedWords = text.match(/\b(utilize|implement|facilitate|optimize|leverage|comprehensive|fundamental|significant|substantial|considerable)\b/gi);
  const vocabularyScore = sophisticatedWords ? Math.min((sophisticatedWords.length / (text.split(/\s+/).length)) * 100, 40) : 0;
  
  if (vocabularyScore > 20) {
    indicators.push(`High sophisticated vocabulary density (${vocabularyScore.toFixed(1)}%)`);
  }

  // Naturalness score (inverse of human indicators)
  const naturalnessScore = Math.max(0, 100 - (humanScore * 2));
  
  if (humanScore < 5) {
    indicators.push("Very few natural speech patterns detected");
  }

  // Calculate total scores
  const totalAIScore = aiScore + structureScore + vocabularyScore + (naturalnessScore / 2);
  const adjustedScore = totalAIScore - humanScore;

  // Normalize to 0-100 confidence
  const confidence = Math.min(100, Math.max(0, (adjustedScore / 150) * 100));
  const isAIGenerated = confidence >= 60;

  return {
    isAIGenerated,
    confidence: Math.round(confidence),
    analysis: {
      indicators: indicators.slice(0, 10), // Top 10 indicators
      humanSignals: humanSignals.slice(0, 5), // Top 5 human signals
      structureScore: Math.round(structureScore),
      vocabularyScore: Math.round(vocabularyScore),
      naturalnessScore: Math.round(100 - naturalnessScore),
    }
  };
};

// Legacy function for backward compatibility
export const detectAIGenerated = (text: string): boolean => {
  return detectAIGeneratedAdvanced(text).isAIGenerated;
};

// Function to check if text contains too many technical terms or buzzwords
export const detectTechnicalBuzzwords = (text: string): boolean => {
  const buzzwords = [
    /synergy/i,
    /leverage/i,
    /optimize/i,
    /paradigm/i,
    /innovative/i,
    /disruptive/i,
    /cutting-edge/i,
    /state-of-the-art/i,
    /best-in-class/i,
    /next-generation/i,
    /revolutionary/i,
    /game-changing/i,
    /mission-critical/i,
    /scalable/i,
    /robust/i,
    /enterprise-grade/i,
    /turnkey/i,
    /seamless/i,
    /high-level/i,
    /low-hanging fruit/i
  ];

  let buzzwordCount = 0;
  for (const pattern of buzzwords) {
    if (pattern.test(text)) {
      buzzwordCount++;
    }
  }

  // If more than 4 buzzwords in the text, it might be AI-generated fluff
  return buzzwordCount > 4;
};
