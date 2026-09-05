import { MCQQuestion } from '@/data/aptitudeQuestions';

export interface YouTubeRecommendation {
  topic: string;
  channel: string;
  searchQuery: string;
  channelUrl: string;
  description: string;
}

// YouTube channel mappings
const CHANNELS = {
  feelFreeToLearn: {
    name: 'Feel Free to Learn',
    url: 'https://www.youtube.com/@FeelFreetoLearn',
    handle: '@FeelFreetoLearn'
  },
  careerRide: {
    name: 'CareerRide',
    url: 'https://www.youtube.com/@Careerride',
    handle: '@Careerride'
  }
};

// Topic to YouTube search query mapping with channel specificity
const topicToVideoMap: Record<string, { channel: keyof typeof CHANNELS; searchTerms: string; description: string }> = {
  // Logical Reasoning
  'Number Series': {
    channel: 'careerRide',
    searchTerms: 'Number Series Reasoning Tricks',
    description: 'Master number patterns and series completion'
  },
  'Blood Relations': {
    channel: 'careerRide',
    searchTerms: 'Blood Relations Family Tree',
    description: 'Solve family relationship problems easily'
  },
  'Coding-Decoding': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Coding Decoding Letter Shift',
    description: 'Learn letter and pattern coding techniques'
  },
  'Direction Sense': {
    channel: 'careerRide',
    searchTerms: 'Direction Sense Distance Direction',
    description: 'Understand direction and distance problems'
  },
  'Analogy': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Analogy Reasoning Tricks',
    description: 'Find relationships between words and concepts'
  },
  'Syllogism': {
    channel: 'careerRide',
    searchTerms: 'Syllogism Logical Deduction',
    description: 'Master syllogism and logical conclusions'
  },
  'Clock Problems': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Clock Angle Problems Tricks',
    description: 'Solve clock angle and time problems'
  },
  'Calendar': {
    channel: 'careerRide',
    searchTerms: 'Calendar Problems Odd Days',
    description: 'Learn calendar and day calculations'
  },
  'Seating Arrangement': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Seating Arrangement Circular Linear',
    description: 'Solve complex seating arrangement puzzles'
  },
  'Pattern Recognition': {
    channel: 'careerRide',
    searchTerms: 'Pattern Recognition Letter Series',
    description: 'Identify patterns in sequences'
  },

  // Quantitative Aptitude
  'Percentage': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Percentage Problems Shortcuts',
    description: 'Master percentage calculations and tricks'
  },
  'Profit and Loss': {
    channel: 'careerRide',
    searchTerms: 'Profit Loss Cost Price Selling Price',
    description: 'Learn profit and loss formulas'
  },
  'Simple Interest': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Simple Interest Formula Tricks',
    description: 'Calculate simple interest quickly'
  },
  'Compound Interest': {
    channel: 'careerRide',
    searchTerms: 'Compound Interest Formula Problems',
    description: 'Understand compound interest calculations'
  },
  'Ratio and Proportion': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Ratio Proportion Problems Tricks',
    description: 'Master ratio and proportion concepts'
  },
  'Time and Work': {
    channel: 'careerRide',
    searchTerms: 'Time Work Problems Efficiency',
    description: 'Solve time and work problems efficiently'
  },
  'Time Speed Distance': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Speed Distance Time Train Problems',
    description: 'Learn speed, distance and time formulas'
  },
  'Averages': {
    channel: 'careerRide',
    searchTerms: 'Averages Mean Problems Tricks',
    description: 'Calculate averages and weighted means'
  },
  'Probability': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Probability Dice Cards Problems',
    description: 'Understand probability concepts and formulas'
  },
  'Permutation Combination': {
    channel: 'careerRide',
    searchTerms: 'Permutation Combination nCr nPr',
    description: 'Master permutation and combination'
  },

  // Verbal Ability
  'Synonyms': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Synonyms Vocabulary Words',
    description: 'Expand your vocabulary with synonyms'
  },
  'Antonyms': {
    channel: 'careerRide',
    searchTerms: 'Antonyms Opposite Words Vocabulary',
    description: 'Learn opposite words and meanings'
  },
  'Sentence Correction': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Grammar Sentence Correction Rules',
    description: 'Fix grammatical errors in sentences'
  },
  'Fill in the Blanks': {
    channel: 'careerRide',
    searchTerms: 'Fill Blanks Vocabulary Grammar',
    description: 'Master contextual word usage'
  },
  'Idioms': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Idioms Phrases English Expressions',
    description: 'Learn common idioms and their meanings'
  },
  'One Word Substitution': {
    channel: 'careerRide',
    searchTerms: 'One Word Substitution Vocabulary',
    description: 'Replace phrases with single words'
  },
  'Spotting Errors': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Error Spotting Grammar Rules',
    description: 'Identify grammatical mistakes'
  },
  'Reading Comprehension': {
    channel: 'careerRide',
    searchTerms: 'Reading Comprehension Passage Tricks',
    description: 'Improve reading and comprehension skills'
  },
  'Para Jumbles': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Para Jumbles Sentence Rearrangement',
    description: 'Arrange jumbled sentences logically'
  },
  'Cloze Test': {
    channel: 'careerRide',
    searchTerms: 'Cloze Test Fill Blanks Passage',
    description: 'Fill blanks in passages contextually'
  },

  // Data Interpretation
  'Tables': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Data Interpretation Tables Tricks',
    description: 'Analyze tabular data efficiently'
  },
  'Bar Charts': {
    channel: 'careerRide',
    searchTerms: 'Bar Chart Data Interpretation',
    description: 'Understand bar chart analysis'
  },
  'Pie Charts': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Pie Chart Percentage Problems',
    description: 'Solve pie chart data problems'
  },
  'Line Graphs': {
    channel: 'careerRide',
    searchTerms: 'Line Graph Data Analysis',
    description: 'Interpret line graph trends'
  },
  'Data Analysis': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Data Interpretation Statistics',
    description: 'Master data analysis techniques'
  },

  // Technical
  'Time Complexity': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Time Complexity Big O Notation',
    description: 'Understand algorithm complexity'
  },
  'Binary Search': {
    channel: 'careerRide',
    searchTerms: 'Binary Search Algorithm Explained',
    description: 'Learn binary search technique'
  },
  'Data Structures': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Data Structures Array Stack Queue',
    description: 'Master fundamental data structures'
  },
  'Sorting Algorithms': {
    channel: 'careerRide',
    searchTerms: 'Sorting Algorithms Merge Quick Sort',
    description: 'Learn sorting algorithms'
  },
  'Programming Paradigms': {
    channel: 'feelFreeToLearn',
    searchTerms: 'Programming Paradigms OOP Functional',
    description: 'Understand programming concepts'
  },
  'Arrays': {
    channel: 'careerRide',
    searchTerms: 'Arrays Data Structure Problems',
    description: 'Master array manipulations'
  },
  'Database Basics': {
    channel: 'feelFreeToLearn',
    searchTerms: 'SQL Database Basics',
    description: 'Learn database fundamentals'
  },
  'SQL': {
    channel: 'careerRide',
    searchTerms: 'SQL Queries Commands Tutorial',
    description: 'Master SQL queries'
  }
};

// Generate YouTube recommendations based on weak topics
export const generateYouTubeRecommendations = (
  questions: MCQQuestion[],
  userAnswers: number[],
  threshold: number = 0.5 // 50% accuracy threshold
): YouTubeRecommendation[] => {
  // Analyze performance by topic
  const topicPerformance: Record<string, { correct: number; total: number }> = {};
  
  questions.forEach((question, index) => {
    const topic = question.topic;
    if (!topicPerformance[topic]) {
      topicPerformance[topic] = { correct: 0, total: 0 };
    }
    
    topicPerformance[topic].total++;
    if (userAnswers[index] === question.correctAnswer) {
      topicPerformance[topic].correct++;
    }
  });
  
  // Find weak topics (below threshold)
  const weakTopics: string[] = [];
  Object.entries(topicPerformance).forEach(([topic, stats]) => {
    const accuracy = stats.correct / stats.total;
    if (accuracy < threshold) {
      weakTopics.push(topic);
    }
  });
  
  // Generate recommendations for weak topics
  const recommendations: YouTubeRecommendation[] = [];
  
  weakTopics.forEach(topic => {
    const mapping = topicToVideoMap[topic];
    if (mapping) {
      const channel = CHANNELS[mapping.channel];
      const searchQuery = `${mapping.searchTerms} ${channel.handle}`;
      
      recommendations.push({
        topic,
        channel: channel.name,
        searchQuery,
        channelUrl: channel.url,
        description: mapping.description
      });
    }
  });
  
  // If no weak topics, recommend general improvement videos
  if (recommendations.length === 0) {
    recommendations.push({
      topic: 'General Aptitude',
      channel: CHANNELS.feelFreeToLearn.name,
      searchQuery: 'Aptitude Complete Preparation @FeelFreetoLearn',
      channelUrl: CHANNELS.feelFreeToLearn.url,
      description: 'Complete aptitude preparation guide'
    });
    
    recommendations.push({
      topic: 'Placement Preparation',
      channel: CHANNELS.careerRide.name,
      searchQuery: 'Placement Aptitude Full Course @Careerride',
      channelUrl: CHANNELS.careerRide.url,
      description: 'Full placement preparation course'
    });
  }
  
  return recommendations;
};

// Get YouTube search URL
export const getYouTubeSearchUrl = (query: string): string => {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
};

// Get topic-specific recommendations regardless of performance
export const getTopicRecommendations = (topics: string[]): YouTubeRecommendation[] => {
  const recommendations: YouTubeRecommendation[] = [];
  
  topics.forEach(topic => {
    const mapping = topicToVideoMap[topic];
    if (mapping) {
      const channel = CHANNELS[mapping.channel];
      const searchQuery = `${mapping.searchTerms} ${channel.handle}`;
      
      recommendations.push({
        topic,
        channel: channel.name,
        searchQuery,
        channelUrl: channel.url,
        description: mapping.description
      });
    }
  });
  
  return recommendations;
};
