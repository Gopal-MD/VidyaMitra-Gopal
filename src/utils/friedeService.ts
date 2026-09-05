import { GoogleGenerativeAI } from "@google/generative-ai";
import { API_KEYS, RATE_LIMIT } from "@/config/apiKeys";
import { getAIProvider } from "./aiProviderService";
import { friedeInterviewWithOpenAI } from "./openaiService";

const genAI = new GoogleGenerativeAI(API_KEYS.GEMINI_FRIEDE);

export interface InterviewContext {
  candidateName: string;
  role: string;
  isFirstTime: boolean;
  conversationHistory: Array<{ role: string; content: string }>;
  questionCount: number;
  performanceMetrics: {
    clarity: number;
    confidence: number;
    depth: number;
    relevance: number;
  };
  weakPoints: string[];
  strengths: string[];
}

export interface InterviewQuestion {
  question: string;
  type: 'behavioral' | 'technical' | 'basics' | 'role-expectation';
  difficulty: 'easy' | 'medium' | 'hard';
}

class FriedeInterviewService {
  private model;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private conversationSession: any = null;
  private currentContext: InterviewContext | null = null;
  private lastApiCallTime: number = 0;
  private readonly MIN_API_CALL_INTERVAL = RATE_LIMIT.MIN_API_CALL_INTERVAL;

  constructor() {
    // Use gemini-2.5-flash-lite which has 1500 requests/day (not gemini-2.5-flash with 20/day)
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 20,
        maxOutputTokens: 200, // Faster responses with concise answers
      },
    });
  }

  /**
   * Rate limiting helper - ensures minimum 4s delay between API calls
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;
    
    if (timeSinceLastCall < this.MIN_API_CALL_INTERVAL) {
      const waitTime = this.MIN_API_CALL_INTERVAL - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastApiCallTime = Date.now();
  }

  /**
   * Initialize FRIEDE's personality and context
   */
  private getSystemPrompt(context: InterviewContext): string {
    return `You are FRIEDE, a professional AI interviewer conducting a ${context.role} interview.

CORE IDENTITY:
- Professional, firm but polite
- Adaptive and context-aware
- Natural conversational style (never robotic)
- You understand the full conversation context
- You ask follow-up questions based on previous answers

INTERVIEW RULES:
- Ask ONE question at a time
- Total questions: 4-6 (dynamic based on performance)
- Question types: behavioral, technical, basics, role-expectation
- Adapt difficulty based on candidate's responses
- If answers are weak, ask fewer questions
- If candidate shows partial knowledge, ask: "What is expected from you in this role?"
- Track weak points and strengths internally

CONVERSATION STYLE:
- Keep responses very short (1-2 sentences)
- No repetitive phrases like "good", "great", "excellent"
- Sound natural and human
- Use ${context.candidateName}'s name occasionally
- Be direct and professional

CURRENT CONTEXT:
- Questions asked so far: ${context.questionCount}
- Is first AI interview: ${context.isFirstTime ? 'Yes' : 'No'}
- Weak points noticed: ${context.weakPoints.join(', ') || 'None yet'}
- Strengths noticed: ${context.strengths.join(', ') || 'None yet'}

Never mention scoring, metrics, or question counts to the candidate.
Respond naturally as a human interviewer would.`;
  }

  /**
   * Start a new interview session
   */
  async startInterview(candidateName: string, role: string, isFirstTime: boolean): Promise<{ greeting: string; context: InterviewContext }> {
    console.log('🚀 FRIEDE: Starting interview...');
    console.log('👤 Candidate:', candidateName);
    console.log('💼 Role:', role);
    console.log('🆕 First time:', isFirstTime);

    const context: InterviewContext = {
      candidateName,
      role,
      isFirstTime,
      conversationHistory: [],
      questionCount: 0,
      performanceMetrics: { clarity: 0, confidence: 0, depth: 0, relevance: 0 },
      weakPoints: [],
      strengths: [],
    };

    // Store context in service
    this.currentContext = context;

    const systemPrompt = this.getSystemPrompt(context);
    
    console.log('🔧 FRIEDE: Initializing conversation session...');
    const provider = getAIProvider();
    
    try {
      if (provider === 'openai') {
        // OpenAI is stateless — we track context manually
        console.log('🟢 FRIEDE: Using OpenAI backend proxy');
        this.conversationSession = 'openai'; // marker
      } else {
        // Gemini uses stateful chat
        await this.enforceRateLimit();
        
        this.conversationSession = await this.model.startChat({
          history: [
            {
              role: "user",
              parts: [{ text: systemPrompt }],
            },
            {
              role: "model",
              parts: [{ text: "I understand. I'm FRIEDE, ready to conduct this interview professionally and naturally." }],
            },
          ],
        });
      }
      console.log('✅ FRIEDE: Conversation session initialized');
    } catch (error) {
      console.error('❌ FRIEDE: Failed to initialize session:', error);
      throw new Error('Failed to initialize AI interview session');
    }

    // Generate greeting
    const greeting = `Hi ${candidateName}, I'm FRIEDE, your AI interviewer today. ${
      isFirstTime 
        ? "I see this is your first AI interview - don't worry, just be yourself and answer honestly. " 
        : "Great to have you here. "
    }Let's get started. Tell me about yourself.`;

    console.log('💬 FRIEDE Greeting:', greeting);
    return { greeting, context };
  }

  /**
   * Generate next question based on candidate's answer
   */
  async generateNextQuestion(
    candidateAnswer: string,
    context: InterviewContext
  ): Promise<{ response: string; shouldContinue: boolean; reasoning?: string }> {
    console.log('🎯 FRIEDE: Generating next question...');
    console.log('📝 Candidate answer:', candidateAnswer);
    console.log('📊 Question count:', context.questionCount);

    // Update stored context
    this.currentContext = context;

    try {
      if (!this.conversationSession) {
        console.error('❌ FRIEDE: No conversation session found!');
        throw new Error('Interview session not initialized');
      }

      // Add candidate's answer to history
      context.conversationHistory.push({
        role: 'candidate',
        content: candidateAnswer,
      });

      // Check if we've reached the question limit (MAX 6 questions)
      // If so, provide a polished closing message instead of asking another question
      if (context.questionCount >= 6) {
        console.log('🎬 Interview limit reached - providing closing message');
        const closingMessage = `Thank you for your time today, ${context.candidateName}. We've covered all the key areas I needed to discuss. This wraps up our interview session.`;
        
        context.conversationHistory.push({
          role: 'friede',
          content: closingMessage,
        });

        return {
          response: closingMessage,
          shouldContinue: false,
        };
      }

      // Evaluate answer and generate next question
      const prompt = `
Candidate just answered: "${candidateAnswer}"

Based on this answer and the conversation history, you must:
1. Analyze the answer quality (clarity, depth, relevance, confidence)
2. Identify any weak points or strengths
3. Decide next action:
   - Ask a follow-up question on the same topic if answer was vague
   - Ask a technical question if they performed well
   - Ask a behavioral question to understand their approach
   - Ask about role expectations if they show partial knowledge
   - Move to closing if ${context.questionCount} >= 5 or answers are consistently weak

RESPONSE FORMAT:
- Maximum 2 sentences
- ONE question only
- No filler words
- Vary reactions naturally
- Be brief and direct`;

      console.log('🤖 FRIEDE: Calling AI...');
      let response: string;
      const provider = getAIProvider();
      
      try {
        if (provider === 'openai') {
          // OpenAI: send full conversation history
          const systemPrompt = this.getSystemPrompt(context);
          response = await friedeInterviewWithOpenAI(
            'question',
            systemPrompt,
            prompt,
            context.conversationHistory
          );
        } else {
          // Gemini: use stateful chat session
          await this.enforceRateLimit();
          
          const result = await this.conversationSession.sendMessage(prompt);
          
          if (!result || !result.response) {
            throw new Error('Empty response from AI');
          }

          response = result.response.text().trim();
        }
        console.log('✅ FRIEDE Response:', response);
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
        console.error('❌ Gemini API Error:', errorMessage);
        console.log('🔄 Using fallback question...');
        
        // Fallback question based on context
        response = this.generateFallbackQuestion(candidateAnswer, context);
        console.log('✅ Fallback Response:', response);
      }

      // Update context
      context.questionCount++;
      context.conversationHistory.push({
        role: 'friede',
        content: response,
      });

      // Determine if interview should continue
      const shouldContinue = this.shouldContinueInterview(context, response);
      console.log('🔄 Should continue:', shouldContinue);

      return {
        response,
        shouldContinue,
      };
    } catch (error) {
      console.error('❌ FRIEDE: Error generating next question:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      
      // Don't retry infinitely - throw error to be handled by caller
      throw new Error(`Failed to generate question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current interview context
   */
  getCurrentContext(): InterviewContext | null {
    return this.currentContext;
  }

  /**
   * Generate fallback question when API fails
   */
  private generateFallbackQuestion(candidateAnswer: string, context: InterviewContext): string {
    const fallbackQuestions = [
      `That's interesting. Could you elaborate more on your experience with ${context.role} responsibilities?`,
      `I see. What specific technical skills have you developed that relate to this position?`,
      `Tell me about a challenging project you've worked on recently.`,
      `How do you approach problem-solving in your work?`,
      `What motivates you in your professional career?`,
      `Can you describe your biggest professional achievement so far?`,
    ];

    // Select based on question count to vary questions
    const index = context.questionCount % fallbackQuestions.length;
    return fallbackQuestions[index];
  }

  /**
   * Determine if interview should continue
   */
  private shouldContinueInterview(context: InterviewContext, lastResponse: string): boolean {
    // Check if FRIEDE is closing the interview
    const closingPhrases = [
      'do you have any questions for me',
      'do you have any questions',
      'that concludes',
      'we\'re done',
      'we have covered',
      'we\'ve covered',
      'thank you for your time',
      'this wraps up',
      'wraps up our interview',
      'looking forward',
    ];

    const isClosing = closingPhrases.some(phrase => 
      lastResponse.toLowerCase().includes(phrase)
    );

    if (isClosing) {
      console.log('🛑 Stopping: Closing phrase detected');
      return false;
    }

    // Continue interview (note: hard limit of 6 questions is enforced in generateNextQuestion)
    console.log('✅ Continuing: Question', context.questionCount, 'of 6');
    return true;
  }

  /**
   * Generate final feedback
   */
  async generateFeedback(context: InterviewContext): Promise<{
    overallScore: number;
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
  }> {
    const prompt = `
As FRIEDE, provide final interview feedback for ${context.candidateName}.

Conversation history:
${context.conversationHistory
  .map(msg => `${msg.role === 'candidate' ? 'Candidate' : 'FRIEDE'}: ${msg.content}`)
  .join('\n')}

Provide:
1. Overall score (0-100)
2. Top 3 strengths
3. Top 3 areas for improvement
4. Detailed constructive feedback (3-4 sentences)

Format as JSON:
{
  "overallScore": number,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "detailedFeedback": "your feedback here"
}`;

    try {
      const provider = getAIProvider();
      let response: string;
      
      if (provider === 'openai') {
        const systemPrompt = this.getSystemPrompt(context);
        response = await friedeInterviewWithOpenAI(
          'feedback',
          systemPrompt,
          prompt,
          context.conversationHistory
        );
      } else {
        await this.enforceRateLimit();
        const result = await this.conversationSession.sendMessage(prompt);
        response = result.response.text().trim();
      }
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback if parsing fails
      return this.generateFallbackFeedback(context);
    } catch (error) {
      console.error('❌ Error generating feedback:', error);
      console.log('🔄 Using fallback feedback...');
      return this.generateFallbackFeedback(context);
    }
  }

  /**
   * Generate fallback feedback when API fails
   */
  private generateFallbackFeedback(context: InterviewContext) {
    const questionCount = context.questionCount;
    const avgAnswerLength = context.conversationHistory
      .filter(msg => msg.role === 'candidate')
      .reduce((sum, msg) => sum + msg.content.split(' ').length, 0) / questionCount;

    // Calculate score based on participation
    const baseScore = Math.min(85, 50 + (questionCount * 5) + Math.min(20, avgAnswerLength / 5));

    return {
      overallScore: Math.round(baseScore),
      strengths: [
        'Actively participated in the interview',
        'Maintained professional communication throughout',
        'Demonstrated interest in the role',
      ],
      improvements: [
        'Provide more detailed technical examples',
        'Show deeper domain knowledge',
        'Practice articulating complex concepts clearly',
      ],
      detailedFeedback: `Thank you for interviewing for the ${context.role} position. You answered ${questionCount} questions and showed engagement. To strengthen your candidacy, focus on providing specific examples and demonstrating deeper technical expertise. Keep practicing!`,
    };
  }

  /**
   * Handle candidate's closing question
   */
  async handleClosingQuestion(question: string, context: InterviewContext): Promise<string> {
    const prompt = `The candidate asked: "${question}". Respond as FRIEDE would, providing helpful information about the role or company. Keep it concise (2-3 sentences).`;
    
    try {
      const provider = getAIProvider();
      
      if (provider === 'openai') {
        const systemPrompt = this.getSystemPrompt(context);
        return await friedeInterviewWithOpenAI(
          'closing',
          systemPrompt,
          prompt,
          context.conversationHistory
        );
      } else {
        await this.enforceRateLimit();
        const result = await this.conversationSession.sendMessage(prompt);
        return result.response.text().trim();
      }
    } catch (error) {
      return `That's a great question. In this role, you'll have opportunities to grow and work on challenging projects. Our team values collaboration and continuous learning.`;
    }
  }
}

export const friedeService = new FriedeInterviewService();
