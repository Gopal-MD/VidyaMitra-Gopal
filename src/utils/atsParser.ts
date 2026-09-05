import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite worker import for PDF.js v5
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';
import { ResumeData } from '@/types';
import { analyzeResume as analyzeResumeWithAI } from './aiProviderService';
import type { AIATSAnalysis } from './geminiService';

// Configure PDF.js worker via Vite-bundled worker to avoid CORS issues
(pdfjsLib as any).GlobalWorkerOptions.workerPort = new (PdfWorker as any)();

// Role requirements for ATS scoring - comprehensive and role-specific
const roleRequirements: Record<string, {
  skills: string[];
  minExperience: number;
  education: string[];
  keySkills: string[]; // Must-have skills with higher weight
}> = {
  'software-engineer': {
    skills: ['javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'express', 'python', 'java', 'c++', 'c#', 'sql', 'mysql', 'postgresql', 'mongodb', 'nosql', 'git', 'github', 'gitlab', 'api', 'rest', 'graphql', 'testing', 'jest', 'cypress', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'cloud', 'ci/cd', 'agile', 'scrum', 'html', 'css', 'sass', 'webpack', 'vite'],
    keySkills: ['javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql', 'git'],
    minExperience: 2,
    education: ['computer science', 'software engineering', 'information technology', 'engineering', 'it', 'cs', 'computer', 'software']
  },
  'data-analyst': {
    skills: ['sql', 'excel', 'python', 'r', 'tableau', 'power bi', 'data visualization', 'statistics', 'statistical analysis', 'data mining', 'etl', 'data warehousing', 'business intelligence', 'bi', 'looker', 'qlik', 'sas', 'spss', 'pandas', 'numpy', 'jupyter', 'reporting', 'dashboard', 'kpi', 'metrics', 'analytics'],
    keySkills: ['sql', 'excel', 'python', 'tableau', 'power bi', 'data visualization'],
    minExperience: 1,
    education: ['statistics', 'mathematics', 'business analytics', 'data science', 'economics', 'business', 'computer science']
  },
  'product-manager': {
    skills: ['product management', 'product', 'agile', 'scrum', 'roadmap', 'stakeholder', 'analytics', 'user research', 'jira', 'strategy', 'kpi', 'okr', 'metrics', 'a/b testing', 'user stories', 'backlog', 'prioritization', 'market research', 'competitive analysis', 'go-to-market', 'gtm', 'product lifecycle', 'product strategy', 'data-driven', 'sql', 'excel', 'powerpoint', 'presentation'],
    keySkills: ['product management', 'agile', 'roadmap', 'stakeholder', 'analytics', 'user research'],
    minExperience: 3,
    education: ['business', 'management', 'engineering', 'computer science', 'mba', 'business administration', 'product management']
  },
  'data-scientist': {
    skills: ['python', 'r', 'machine learning', 'ml', 'deep learning', 'ai', 'artificial intelligence', 'statistics', 'statistical analysis', 'sql', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy', 'data analysis', 'data visualization', 'visualization', 'tableau', 'power bi', 'jupyter', 'big data', 'hadoop', 'spark', 'nlp', 'computer vision', 'predictive modeling', 'regression', 'classification', 'clustering'],
    keySkills: ['python', 'machine learning', 'statistics', 'sql', 'pandas', 'data analysis'],
    minExperience: 2,
    education: ['data science', 'statistics', 'mathematics', 'computer science', 'physics', 'math', 'quantitative', 'analytics']
  },
  'ux-designer': {
    skills: ['figma', 'sketch', 'adobe xd', 'xd', 'user research', 'ux research', 'wireframing', 'prototyping', 'usability', 'usability testing', 'design systems', 'ui', 'ux', 'ui/ux', 'interaction design', 'visual design', 'user testing', 'user interviews', 'persona', 'user journey', 'information architecture', 'ia', 'accessibility', 'responsive design', 'mobile design', 'web design', 'photoshop', 'illustrator', 'invision', 'principle', 'framer'],
    keySkills: ['figma', 'user research', 'wireframing', 'prototyping', 'design systems', 'ui/ux'],
    minExperience: 2,
    education: ['design', 'graphic design', 'hci', 'human-computer interaction', 'visual design', 'interaction design', 'ux design', 'user experience']
  },
  'marketing-manager': {
    skills: ['marketing', 'digital marketing', 'seo', 'sem', 'google analytics', 'analytics', 'content', 'content marketing', 'social media', 'social media marketing', 'campaigns', 'email marketing', 'strategy', 'marketing strategy', 'brand', 'branding', 'brand management', 'ppc', 'paid advertising', 'facebook ads', 'google ads', 'marketing automation', 'hubspot', 'salesforce', 'crm', 'lead generation', 'conversion optimization', 'copywriting', 'market research'],
    keySkills: ['marketing', 'digital marketing', 'seo', 'analytics', 'campaigns', 'social media'],
    minExperience: 3,
    education: ['marketing', 'business', 'communications', 'advertising', 'mba', 'business administration', 'digital marketing']
  },
  'sales-representative': {
    skills: ['sales', 'b2b sales', 'b2c sales', 'crm', 'salesforce', 'negotiation', 'prospecting', 'cold calling', 'b2b', 'b2c', 'closing', 'pipeline', 'pipeline management', 'customer', 'customer relationship', 'account management', 'lead generation', 'sales strategy', 'quota', 'revenue', 'business development', 'networking', 'presentation', 'communication', 'relationship building', 'hubspot'],
    keySkills: ['sales', 'crm', 'negotiation', 'prospecting', 'closing', 'pipeline'],
    minExperience: 1,
    education: ['business', 'marketing', 'communications', 'sales', 'commerce', 'business administration']
  },
  'hr-manager': {
    skills: ['recruitment', 'talent acquisition', 'employee relations', 'hris', 'workday', 'adp', 'onboarding', 'performance management', 'compensation', 'benefits', 'compliance', 'labor law', 'training', 'development', 'hr policies', 'conflict resolution', 'diversity', 'inclusion', 'culture', 'engagement', 'retention', 'succession planning'],
    keySkills: ['recruitment', 'employee relations', 'hris', 'compliance', 'training'],
    minExperience: 3,
    education: ['human resources', 'business', 'psychology', 'organizational behavior', 'hr management']
  },
  'cloud-engineer': {
    skills: ['aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible', 'devops', 'ci/cd', 'jenkins', 'gitlab ci', 'github actions', 'infrastructure as code', 'iac', 'cloudformation', 'monitoring', 'prometheus', 'grafana', 'networking', 'security', 'linux', 'bash', 'python', 'microservices', 'serverless', 'lambda', 'containers'],
    keySkills: ['aws', 'azure', 'docker', 'kubernetes', 'terraform', 'devops'],
    minExperience: 2,
    education: ['computer science', 'information technology', 'engineering', 'cloud computing']
  },
  'cybersecurity-analyst': {
    skills: ['penetration testing', 'ethical hacking', 'vulnerability assessment', 'security audits', 'cissp', 'ceh', 'network security', 'firewall', 'ids', 'ips', 'siem', 'splunk', 'threat intelligence', 'incident response', 'forensics', 'compliance', 'iso 27001', 'gdpr', 'nist', 'risk assessment', 'encryption', 'vpn', 'malware analysis', 'wireshark'],
    keySkills: ['penetration testing', 'network security', 'cissp', 'siem', 'incident response'],
    minExperience: 2,
    education: ['cybersecurity', 'information security', 'computer science', 'information technology']
  },
  'business-analyst': {
    skills: ['requirements gathering', 'business analysis', 'process mapping', 'bpmn', 'uml', 'stakeholder analysis', 'gap analysis', 'user stories', 'jira', 'confluence', 'sql', 'data analysis', 'excel', 'visio', 'lucidchart', 'agile', 'scrum', 'documentation', 'use cases', 'functional requirements', 'wireframing', 'testing'],
    keySkills: ['requirements gathering', 'process mapping', 'stakeholder analysis', 'sql', 'agile'],
    minExperience: 2,
    education: ['business', 'management', 'information systems', 'computer science', 'mba']
  },
  'devops-engineer': {
    skills: ['ci/cd', 'jenkins', 'gitlab ci', 'github actions', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'chef', 'puppet', 'aws', 'azure', 'gcp', 'cloud', 'linux', 'bash', 'python', 'scripting', 'monitoring', 'prometheus', 'grafana', 'elk', 'infrastructure as code', 'iac', 'automation', 'git', 'nginx', 'apache', 'microservices', 'helm', 'argocd', 'cloudformation', 'deployment', 'build pipelines'],
    keySkills: ['ci/cd', 'docker', 'kubernetes', 'terraform', 'aws', 'jenkins'],
    minExperience: 2,
    education: ['computer science', 'information technology', 'engineering', 'systems']
  },
  'full-stack-developer': {
    skills: ['javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'express', 'nestjs', 'python', 'django', 'flask', 'java', 'spring', 'dotnet', 'c#', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'api', 'rest', 'graphql', 'html', 'css', 'sass', 'tailwind', 'webpack', 'vite', 'git', 'docker', 'aws', 'azure', 'testing', 'jest', 'mocha', 'prisma', 'orm', 'authentication'],
    keySkills: ['javascript', 'react', 'node', 'sql', 'api', 'mongodb', 'typescript'],
    minExperience: 2,
    education: ['computer science', 'software engineering', 'information technology', 'engineering']
  },
  'mobile-app-developer': {
    skills: ['react native', 'flutter', 'swift', 'kotlin', 'ios', 'android', 'xcode', 'android studio', 'mobile ui/ux', 'rest api', 'firebase', 'app store', 'play store', 'push notifications', 'mobile testing', 'responsive design', 'native modules', 'expo', 'fastlane', 'app deployment', 'offline storage', 'sqlite', 'realm', 'mobile analytics', 'crash reporting', 'performance optimization', 'dart', 'java'],
    keySkills: ['react native', 'flutter', 'swift', 'kotlin', 'mobile ui/ux', 'firebase'],
    minExperience: 2,
    education: ['computer science', 'software engineering', 'mobile development', 'engineering']
  },
  'ai-ml-research-scientist': {
    skills: ['python', 'deep learning', 'neural networks', 'tensorflow', 'pytorch', 'keras', 'machine learning', 'research', 'papers', 'publications', 'algorithms', 'mathematics', 'transformers', 'attention', 'llm', 'nlp', 'computer vision', 'reinforcement learning', 'optimization', 'experiment design', 'statistics', 'model architecture', 'gpu computing', 'distributed training', 'research methodology', 'arxiv', 'peer review', 'latex'],
    keySkills: ['deep learning', 'tensorflow', 'pytorch', 'research', 'neural networks', 'python'],
    minExperience: 3,
    education: ['phd', 'computer science', 'machine learning', 'ai', 'mathematics', 'physics']
  },
  'blockchain-developer': {
    skills: ['solidity', 'ethereum', 'smart contracts', 'web3', 'blockchain', 'defi', 'nft', 'cryptocurrency', 'truffle', 'hardhat', 'ethers.js', 'web3.js', 'metamask', 'rust', 'solana', 'polygon', 'layer 2', 'consensus', 'cryptography', 'security auditing', 'gas optimization', 'evm', 'dapps', 'ipfs', 'dao', 'tokenomics', 'upgradeable contracts'],
    keySkills: ['solidity', 'ethereum', 'smart contracts', 'web3', 'defi', 'blockchain'],
    minExperience: 2,
    education: ['computer science', 'cryptography', 'mathematics', 'engineering', 'blockchain']
  },
  'game-developer': {
    skills: ['unity', 'unreal engine', 'unreal', 'c#', 'c++', 'game development', 'game design', '3d modeling', 'physics', 'graphics', 'shaders', 'animation', 'ar', 'vr', 'augmented reality', 'virtual reality', 'multiplayer', 'networking', 'ai pathfinding', 'optimization', 'mobile games', 'console development', 'gameplay programming', 'ui/ux', 'procedural generation', 'game engines', 'blender', 'maya', 'rendering', 'opengl', 'directx', 'vulkan'],
    keySkills: ['unity', 'unreal engine', 'c#', 'c++', 'game development', '3d modeling'],
    minExperience: 2,
    education: ['game development', 'computer science', 'interactive media', 'digital arts', 'engineering', 'game design']
  },
  'embedded-systems-engineer': {
    skills: ['c', 'c++', 'embedded c', 'microcontroller', 'arduino', 'raspberry pi', 'arm', 'rtos', 'freertos', 'embedded linux', 'firmware', 'hardware', 'iot', 'sensors', 'i2c', 'spi', 'uart', 'can bus', 'modbus', 'assembly', 'debugging', 'oscilloscope', 'power management', 'wireless', 'bluetooth', 'wifi', 'low power', 'real-time systems'],
    keySkills: ['c', 'c++', 'microcontroller', 'rtos', 'embedded systems', 'firmware'],
    minExperience: 2,
    education: ['electrical engineering', 'computer engineering', 'electronics', 'embedded systems']
  },
  'sre': {
    skills: ['sre', 'site reliability', 'kubernetes', 'docker', 'monitoring', 'prometheus', 'grafana', 'incident response', 'on-call', 'slo', 'sli', 'sla', 'observability', 'distributed systems', 'linux', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'ci/cd', 'performance', 'scalability', 'load balancing', 'capacity planning', 'chaos engineering', 'postmortem', 'alerting', 'logging', 'elk', 'splunk', 'automation', 'troubleshooting'],
    keySkills: ['sre', 'kubernetes', 'monitoring', 'incident response', 'slo', 'distributed systems'],
    minExperience: 3,
    education: ['computer science', 'software engineering', 'information technology', 'systems engineering']
  },
  'computer-vision-engineer': {
    skills: ['computer vision', 'opencv', 'image processing', 'deep learning', 'cnn', 'yolo', 'object detection', 'image segmentation', 'facial recognition', 'tensorflow', 'pytorch', 'python', 'c++', 'video processing', 'tracking', 'ocr', '3d vision', 'depth estimation', 'slam', 'augmented reality', 'point cloud', 'calibration', 'edge computing', 'cuda', 'real-time processing', 'annotation', 'dataset creation', 'model optimization'],
    keySkills: ['computer vision', 'opencv', 'deep learning', 'object detection', 'python', 'tensorflow'],
    minExperience: 2,
    education: ['computer science', 'computer vision', 'ai', 'robotics', 'electrical engineering']
  },
  'network-security-engineer': {
    skills: ['network security', 'firewall', 'vpn', 'ids', 'ips', 'intrusion detection', 'wireshark', 'tcp/ip', 'network protocols', 'cisco', 'palo alto', 'fortinet', 'security auditing', 'vulnerability assessment', 'penetration testing', 'siem', 'splunk', 'network monitoring', 'packet analysis', 'ddos mitigation', 'zero trust', 'network segmentation', 'compliance', 'iso 27001', 'nist', 'encryption', 'ssl', 'tls', 'dns security', 'routing', 'switching'],
    keySkills: ['network security', 'firewall', 'ids', 'penetration testing', 'tcp/ip', 'vpn'],
    minExperience: 2,
    education: ['cybersecurity', 'network security', 'information security', 'computer science']
  },
  'qa-engineer': {
    skills: ['quality assurance', 'test automation', 'selenium', 'cypress', 'playwright', 'testing', 'manual testing', 'test plans', 'test cases', 'bug tracking', 'jira', 'api testing', 'postman', 'performance testing', 'jmeter', 'load testing', 'regression testing', 'ci/cd', 'jenkins', 'agile', 'scrum', 'test strategy', 'functional testing', 'non-functional testing', 'accessibility testing', 'security testing', 'mobile testing'],
    keySkills: ['test automation', 'selenium', 'testing', 'qa', 'bug tracking', 'api testing'],
    minExperience: 2,
    education: ['computer science', 'software engineering', 'information technology', 'qa']
  }
};

/**
 * AWS Textract disabled — credits expired.
 * This function intentionally throws so callers fall back to PDF.js automatically.
 *
 * TO RE-ENABLE: Replace this function body with the original fetch logic:
 *   const res = await fetch('/api/resume/extract', { method: 'POST', ... })
 *   and restore the S3 upload step in SmartResume.tsx / ResumeUpload.tsx.
 */
export const extractTextViaTextract = async (_s3Key: string): Promise<string> => {
  throw new Error('AWS Textract disabled — using PDF.js fallback');
};

// Extract text from PDF (client-side fallback using PDF.js)
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF.');
  }
};

// Parse resume text and extract information
export const parseResumeText = (text: string): ResumeData['parsedData'] => {
  const lowerText = text.toLowerCase();
  
  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : undefined;
  
  // Extract phone
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;
  
  // Extract name (typically first line or before email)
  const lines = text.split('\n').filter(line => line.trim());
  const name = lines[0]?.trim();
  
  // Comprehensive skills to look for across all roles
  const commonSkills = [
    // Programming languages
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'go', 'rust', 'swift', 'kotlin', 'r',
    // Frontend frameworks
    'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt', 'gatsby',
    // Backend frameworks
    'node.js', 'nodejs', 'node', 'express', 'django', 'flask', 'spring', 'asp.net', 'laravel',
    // Databases
    'sql', 'mysql', 'postgresql', 'mongodb', 'nosql', 'redis', 'elasticsearch', 'oracle', 'cassandra',
    // DevOps & Cloud
    'git', 'github', 'gitlab', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'ci/cd', 'terraform',
    // Methodologies
    'agile', 'scrum', 'kanban', 'waterfall', 'lean',
    // Data Science & ML
    'machine learning', 'deep learning', 'ai', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
    'data analysis', 'data science', 'statistics', 'nlp', 'computer vision',
    // Design
    'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'invision', 'wireframing', 'prototyping',
    'ui/ux', 'user research', 'usability testing',
    // Marketing
    'marketing', 'digital marketing', 'seo', 'sem', 'google analytics', 'content marketing', 'social media',
    'email marketing', 'ppc', 'google ads', 'facebook ads',
    // Sales & CRM
    'salesforce', 'crm', 'hubspot', 'sales', 'negotiation', 'b2b', 'b2c',
    // Product Management
    'product management', 'roadmap', 'jira', 'confluence', 'user stories', 'backlog', 'okr', 'kpi',
    // Testing
    'testing', 'jest', 'mocha', 'cypress', 'selenium', 'unit testing', 'integration testing', 'qa',
    // Other
    'api', 'rest', 'graphql', 'microservices', 'html', 'css', 'sass', 'webpack', 'vite'
  ];
  
  // Extract skills more accurately using word boundaries
  const skills: string[] = [];
  commonSkills.forEach(skill => {
    // Create regex pattern for word boundaries
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(text)) {
      skills.push(skill);
    }
  });
  
  // Extract experience (look for year patterns and calculate total years)
  const experiencePattern = /(\d{4})\s*[-–—]\s*(\d{4}|present|current)/gi;
  const experienceMatches = text.match(experiencePattern) || [];
  const experience = experienceMatches.map(exp => exp.trim());
  
  // Calculate total years of experience
  let totalYears = 0;
  experienceMatches.forEach(match => {
    const years = match.match(/\d{4}/g);
    if (years && years.length >= 1) {
      const startYear = parseInt(years[0]);
      const endYear = years[1] ? parseInt(years[1]) : new Date().getFullYear();
      totalYears += Math.max(0, endYear - startYear);
    }
  });
  
  // Extract education
  const educationKeywords = [
    'bachelor', 'master', 'phd', 'doctorate', 'diploma', 'degree',
    'university', 'college', 'institute', 'b.s.', 'm.s.', 'b.a.', 'm.a.',
    'computer science', 'engineering', 'business', 'mba'
  ];
  
  const education: string[] = [];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (educationKeywords.some(keyword => lowerLine.includes(keyword))) {
      education.push(line.trim());
    }
  });
  
  // Extract certifications
  const certificationKeywords = [
    'certified', 'certification', 'certificate', 'aws certified',
    'pmp', 'scrum master', 'google analytics', 'cisco'
  ];
  
  const certifications: string[] = [];
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    if (certificationKeywords.some(keyword => lowerLine.includes(keyword))) {
      certifications.push(line.trim());
    }
  });
  
  return {
    name,
    email,
    phone,
    skills,
    experience,
    education,
    certifications,
    totalExperienceYears: totalYears
  };
};

// Calculate ATS score based on role requirements with accurate matching
export const calculateATSScore = (
  parsedData: ResumeData['parsedData'],
  roleId: string
): { score: number; analysis: ResumeData['atsAnalysis'] } => {
  let requirements = roleRequirements[roleId];
  
  if (!requirements) {
    console.warn(`No requirements found for role: ${roleId}, using software-engineer as fallback`);
    // Use software-engineer as fallback but cap the max score at 50% since it's not the target role
    requirements = roleRequirements['software-engineer'];
    if (!requirements) {
      // Ultimate fallback if even software-engineer is missing
      return {
        score: 0,
        analysis: {
          matchedSkills: [],
          missingSkills: ['Unable to evaluate - role requirements not found'],
          experienceMatch: 0,
          educationMatch: 0,
          overallMatch: 0
        }
      };
    }
  }
  
  console.log('Calculating ATS for role:', roleId);
  console.log('Parsed skills:', parsedData.skills);
  console.log('Required skills:', requirements.skills);
  
  // Improved skills matching with better accuracy
  const candidateSkills = parsedData.skills.map(s => s.toLowerCase().trim());
  
  const matchedSkills: string[] = [];
  const matchedRequirementSkills = new Set<string>();
  
  // Match candidate skills against requirements
  requirements.skills.forEach(reqSkill => {
    const reqSkillLower = reqSkill.toLowerCase().trim();
    const isMatched = candidateSkills.some(candSkill => {
      // Exact match
      if (candSkill === reqSkillLower) return true;
      // Contains match (for compound skills like "node.js" matching "node")
      if (candSkill.includes(reqSkillLower) || reqSkillLower.includes(candSkill)) {
        // Avoid false positives like "test" matching "testing"
        const words1 = candSkill.split(/[\s.,/-]+/);
        const words2 = reqSkillLower.split(/[\s.,/-]+/);
        return words1.some(w1 => words2.some(w2 => 
          (w1 === w2) || 
          (w1.length > 3 && w2.length > 3 && (w1.includes(w2) || w2.includes(w1)))
        ));
      }
      return false;
    });
    
    if (isMatched) {
      matchedRequirementSkills.add(reqSkill);
      // Find the actual candidate skill that matched
      const matchedCandSkill = parsedData.skills.find(cs => {
        const csLower = cs.toLowerCase().trim();
        return csLower === reqSkillLower || 
               csLower.includes(reqSkillLower) || 
               reqSkillLower.includes(csLower);
      });
      if (matchedCandSkill && !matchedSkills.includes(matchedCandSkill)) {
        matchedSkills.push(matchedCandSkill);
      }
    }
  });
  
  // Get missing skills
  const missingSkills = requirements.keySkills.filter(
    skill => !matchedRequirementSkills.has(skill)
  );
  
  // Calculate skills score with emphasis on key skills
  const keySkillsMatched = requirements.keySkills.filter(
    skill => matchedRequirementSkills.has(skill)
  ).length;
  
  const keySkillsScore = (keySkillsMatched / requirements.keySkills.length) * 100;
  const totalSkillsScore = (matchedRequirementSkills.size / requirements.skills.length) * 100;
  
  // Weighted: 70% key skills, 30% all skills
  const skillsScore = (keySkillsScore * 0.7) + (totalSkillsScore * 0.3);
  
  console.log('Matched skills:', matchedSkills);
  console.log('Missing key skills:', missingSkills);
  console.log('Skills score:', skillsScore);
  
  // Experience matching (use calculated total years)
  const totalYears = parsedData.totalExperienceYears || 0;
  const experienceScore = totalYears >= requirements.minExperience 
    ? 100 
    : totalYears > 0 
      ? (totalYears / requirements.minExperience) * 100
      : 0;
  
  console.log('Total experience years:', totalYears);
  console.log('Experience score:', experienceScore);
  
  // Education matching - improved to handle variations
  const candidateEducation = parsedData.education.map(e => e.toLowerCase());
  const hasMatchingEducation = candidateEducation.some(edu =>
    requirements.education.some(reqEdu =>
      edu.includes(reqEdu.toLowerCase()) || reqEdu.toLowerCase().includes(edu)
    )
  );
  
  const educationScore = hasMatchingEducation ? 100 : 30;
  
  console.log('Education match:', hasMatchingEducation, 'Score:', educationScore);
  
  // Overall score (weighted average: skills 50%, experience 30%, education 20%)
  const overallScore = Math.round(
    (skillsScore * 0.5) + (experienceScore * 0.3) + (educationScore * 0.2)
  );
  
  console.log('Final ATS Score:', overallScore);
  
  return {
    score: overallScore,
    analysis: {
      matchedSkills: matchedSkills,
      missingSkills: missingSkills,
      experienceMatch: Math.round(experienceScore),
      educationMatch: Math.round(educationScore),
      overallMatch: overallScore
    }
  };
};

// AI-powered function to process resume with intelligent analysis
export const processResume = async (
  file: File,
  roleId: string
): Promise<ResumeData> => {
  console.log(`🔍 Processing resume: ${file.name} for role: ${roleId}`);
  
  // First extract text (needed for both AI and fallback)
  let text: string;
  try {
    text = await extractTextFromPDF(file);
    console.log(`✅ PDF text extracted successfully (${text.length} characters)`);
  } catch (pdfError) {
    console.error('❌ Failed to extract PDF text:', pdfError);
    throw new Error('Failed to read PDF file. Please ensure it is a valid PDF.');
  }
  
  // Get role title from roleId
  const roleMap: Record<string, string> = {
    'software-engineer': 'Software Engineer',
    'data-scientist': 'Data Scientist',
    'product-manager': 'Product Manager',
    'ux-designer': 'UX Designer',
    'marketing-manager': 'Marketing Manager',
    'sales-representative': 'Sales Representative',
    'hr-manager': 'HR Manager',
    'cloud-engineer': 'Cloud Engineer',
    'cybersecurity-analyst': 'Cybersecurity Analyst',
    'business-analyst': 'Business Analyst',
    'devops-engineer': 'DevOps Engineer',
    'full-stack-developer': 'Full Stack Developer',
    'mobile-app-developer': 'Mobile App Developer',
    'ai-ml-research-scientist': 'AI/ML Research Scientist'
  };
  
  const targetRole = roleMap[roleId] || roleId.replace(/-/g, ' ');
  
  // Try AI analysis first
  try {
    console.log(`🤖 Attempting AI analysis with Gemini for role: ${targetRole}`);
    const aiAnalysis = await analyzeResumeWithAI(text, targetRole);
    console.log(`✅ AI analysis successful - Score: ${aiAnalysis.ats_match_score}`);
    
    // Convert AI analysis to our ResumeData format
    const parsedData: ResumeData['parsedData'] = {
      name: extractNameFromText(text),
      email: extractEmailFromText(text),
      phone: extractPhoneFromText(text),
      skills: [
        ...aiAnalysis.skills_extracted.technical_skills,
        ...aiAnalysis.skills_extracted.soft_skills,
        ...aiAnalysis.skills_extracted.tools_and_technologies
      ],
      experience: aiAnalysis.experience.project_summary,
      education: aiAnalysis.education,
      certifications: aiAnalysis.achievements,
      totalExperienceYears: aiAnalysis.experience.total_years
    };
    
    const atsAnalysis: ResumeData['atsAnalysis'] = {
      matchedSkills: aiAnalysis.role_specific_analysis.matched_skills,
      missingSkills: aiAnalysis.role_specific_analysis.unmatched_skills,
      experienceMatch: Math.min(100, (aiAnalysis.experience.relevant_experience_years / 2) * 100), // Assume 2+ years is good
      educationMatch: aiAnalysis.education.length > 0 ? 90 : 50,
      overallMatch: aiAnalysis.role_specific_analysis.match_percentage
    };
    
    return {
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      parsedData,
      atsScore: aiAnalysis.ats_match_score,
      atsAnalysis
    };
  } catch (aiError) {
    console.warn('⚠️ AI analysis failed, using fallback parsing:', aiError?.message || aiError);
    
    // Fallback to manual parsing if AI fails
    try {
      console.log('🔄 Using fallback local parsing...');
      const parsedData = parseResumeText(text);
      const { score, analysis } = calculateATSScore(parsedData, roleId);
      
      console.log(`✅ Fallback parsing successful - Score: ${score}`);
      
      return {
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        parsedData,
        atsScore: score,
        atsAnalysis: analysis
      };
    } catch (fallbackError) {
      console.error('❌ Fallback parsing also failed:', fallbackError);
      throw new Error('Failed to process resume. Please try again or contact support.');
    }
  }
};

// Process resume from pre-extracted text (no PDF parsing needed)
export const processResumeFromText = async (
  text: string,
  fileName: string,
  roleId: string
): Promise<ResumeData> => {
  console.log(`🔍 Processing resume from text for role: ${roleId} (${text.length} chars)`);

  const roleMap: Record<string, string> = {
    'software-engineer': 'Software Engineer',
    'data-scientist': 'Data Scientist',
    'product-manager': 'Product Manager',
    'ux-designer': 'UX Designer',
    'marketing-manager': 'Marketing Manager',
    'sales-representative': 'Sales Representative',
    'hr-manager': 'HR Manager',
    'cloud-engineer': 'Cloud Engineer',
    'cybersecurity-analyst': 'Cybersecurity Analyst',
    'business-analyst': 'Business Analyst',
    'devops-engineer': 'DevOps Engineer',
    'full-stack-developer': 'Full Stack Developer',
    'mobile-app-developer': 'Mobile App Developer',
    'ai-ml-research-scientist': 'AI/ML Research Scientist'
  };
  const targetRole = roleMap[roleId] || roleId.replace(/-/g, ' ');

  try {
    console.log(`🤖 Attempting AI analysis with Gemini for role: ${targetRole}`);
    const aiAnalysis = await analyzeResumeWithAI(text, targetRole);
    console.log(`✅ AI analysis successful - Score: ${aiAnalysis.ats_match_score}`);

    const parsedData: ResumeData['parsedData'] = {
      name: extractNameFromText(text),
      email: extractEmailFromText(text),
      phone: extractPhoneFromText(text),
      skills: [
        ...aiAnalysis.skills_extracted.technical_skills,
        ...aiAnalysis.skills_extracted.soft_skills,
        ...aiAnalysis.skills_extracted.tools_and_technologies
      ],
      experience: aiAnalysis.experience.project_summary,
      education: aiAnalysis.education,
      certifications: aiAnalysis.achievements,
      totalExperienceYears: aiAnalysis.experience.total_years
    };

    const atsAnalysis: ResumeData['atsAnalysis'] = {
      matchedSkills: aiAnalysis.role_specific_analysis.matched_skills,
      missingSkills: aiAnalysis.role_specific_analysis.unmatched_skills,
      experienceMatch: Math.min(100, (aiAnalysis.experience.relevant_experience_years / 2) * 100),
      educationMatch: aiAnalysis.education.length > 0 ? 90 : 50,
      overallMatch: aiAnalysis.role_specific_analysis.match_percentage
    };

    return {
      fileName,
      uploadDate: new Date().toISOString(),
      parsedData,
      atsScore: aiAnalysis.ats_match_score,
      atsAnalysis
    };
  } catch (aiError) {
    console.warn('⚠️ AI analysis failed, using fallback parsing:', (aiError as any)?.message || aiError);
    try {
      const parsedData = parseResumeText(text);
      const { score, analysis } = calculateATSScore(parsedData, roleId);
      return {
        fileName,
        uploadDate: new Date().toISOString(),
        parsedData,
        atsScore: score,
        atsAnalysis: analysis
      };
    } catch (fallbackError) {
      console.error('❌ Fallback parsing also failed:', fallbackError);
      throw new Error('Failed to process resume. Please try again or contact support.');
    }
  }
};

// Helper functions for basic extraction (used in fallback)
const extractNameFromText = (text: string): string | undefined => {
  const lines = text.split('\n').filter(line => line.trim());
  return lines[0]?.trim();
};

const extractEmailFromText = (text: string): string | undefined => {
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return emailMatch ? emailMatch[0] : undefined;
};

const extractPhoneFromText = (text: string): string | undefined => {
  const phoneMatch = text.match(/(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/);
  return phoneMatch ? phoneMatch[0] : undefined;
};