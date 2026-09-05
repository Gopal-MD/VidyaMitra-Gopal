// Resume Parser - Extract text from PDF files
// This works client-side without needing Firebase Storage

export interface ParsedResume {
  fileName: string;
  fileSize: number;
  uploadDate: string;
  rawText: string;
  extractedData: {
    email?: string;
    phone?: string;
    name?: string;
    skills: string[];
    experience: string[];
    education: string[];
  };
}

/**
 * Parse PDF file to extract text content
 * For production, consider using: pdf-parse or pdfjs-dist
 * For now, we'll use a simple text extraction
 */
export const parsePDFToText = async (file: File): Promise<string> => {
  try {
    // For demo purposes, if it's a text file, read directly
    if (file.type === 'text/plain') {
      return await file.text();
    }

    // For PDF files, we'll use FileReader to get base64 and extract text
    // In production, you'd use a proper PDF library like pdf-parse
    const text = await readFileAsText(file);
    return text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse resume file');
  }
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // Basic text extraction - in production use proper PDF parser
        resolve(content || 'Resume uploaded successfully');
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    // Read as text (works for .txt files and some PDFs)
    reader.readAsText(file);
  });
};

/**
 * Extract structured data from resume text
 */
export const extractResumeData = (text: string): ParsedResume['extractedData'] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Extract email
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
  const email = text.match(emailRegex)?.[0];
  
  // Extract phone
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phone = text.match(phoneRegex)?.[0];
  
  // Extract name (usually first line or first non-empty line)
  const name = lines[0] || 'Unknown';
  
  // Extract skills (look for common skill keywords)
  const skillKeywords = [
    'javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql',
    'html', 'css', 'git', 'docker', 'aws', 'firebase', 'mongodb', 'express',
    'angular', 'vue', 'swift', 'kotlin', 'flutter', 'django', 'flask',
    'leadership', 'communication', 'teamwork', 'problem solving'
  ];
  
  const skills = skillKeywords.filter(skill => 
    text.toLowerCase().includes(skill)
  ).map(skill => skill.charAt(0).toUpperCase() + skill.slice(1));
  
  // Extract experience (look for year patterns and job indicators)
  const experiencePatterns = [
    /\d{4}\s*-\s*\d{4}/g,  // 2020 - 2023
    /\d{4}\s*-\s*present/gi, // 2020 - Present
    /(software|developer|engineer|manager|analyst)/gi
  ];
  
  const experience: string[] = [];
  experiencePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      experience.push(...matches);
    }
  });
  
  // Extract education
  const educationKeywords = [
    'bachelor', 'master', 'phd', 'diploma', 'degree', 
    'university', 'college', 'school', 'institute'
  ];
  
  const education = lines.filter(line => 
    educationKeywords.some(keyword => 
      line.toLowerCase().includes(keyword)
    )
  );
  
  return {
    email,
    phone,
    name: name.length > 50 ? name.substring(0, 50) : name,
    skills: [...new Set(skills)].slice(0, 20), // Unique skills, max 20
    experience: [...new Set(experience)].slice(0, 10),
    education: education.slice(0, 5)
  };
};

/**
 * Parse resume file and extract all data
 */
export const parseResumeFile = async (file: File): Promise<ParsedResume> => {
  // Validate file
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }
  
  // Extract text from file
  const rawText = await parsePDFToText(file);
  
  // Extract structured data
  const extractedData = extractResumeData(rawText);
  
  return {
    fileName: file.name,
    fileSize: file.size,
    uploadDate: new Date().toISOString(),
    rawText: rawText.substring(0, 50000), // Limit to 50KB of text
    extractedData
  };
};

/**
 * Calculate ATS score based on resume content
 */
export const calculateATSScore = (resume: ParsedResume, roleTitle: string): number => {
  let score = 0;
  
  // Has contact info (20 points)
  if (resume.extractedData.email) score += 10;
  if (resume.extractedData.phone) score += 10;
  
  // Has skills (30 points)
  const skillCount = resume.extractedData.skills.length;
  score += Math.min(30, skillCount * 3);
  
  // Has experience (30 points)
  const expCount = resume.extractedData.experience.length;
  score += Math.min(30, expCount * 5);
  
  // Has education (20 points)
  const eduCount = resume.extractedData.education.length;
  score += Math.min(20, eduCount * 10);
  
  // Role-specific keywords
  const roleKeywords = roleTitle.toLowerCase().split(/\s+/);
  const textLower = resume.rawText.toLowerCase();
  const matchedKeywords = roleKeywords.filter(kw => textLower.includes(kw));
  
  // Bonus for role match (up to 20 points, can push above 100)
  score += matchedKeywords.length * 5;
  
  return Math.min(100, Math.max(0, score));
};
