import { ResumeData } from '@/types';
import { extractTextFromPDF, parseResumeText } from './atsParser';
import { jobRoles } from './interviewUtils';

// Comprehensive skill-to-role mapping based on industry standards
const roleSkillMapping: Record<string, {
  skills: string[];
  keySkills: string[]; // Core must-have skills
  minExperience: number;
  education: string[];
  certifications: string[];
}> = {
  'software-engineer': {
    skills: [
      'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'express',
      'python', 'java', 'c++', 'c#', 'go', 'rust', 'sql', 'mysql', 'postgresql', 'mongodb',
      'nosql', 'git', 'github', 'gitlab', 'api', 'rest', 'graphql', 'microservices',
      'testing', 'jest', 'cypress', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'ci/cd', 'jenkins', 'agile', 'scrum', 'html', 'css', 'sass', 'webpack', 'vite'
    ],
    keySkills: ['javascript', 'react', 'node', 'python', 'java', 'git', 'api'],
    minExperience: 2,
    education: ['computer science', 'software engineering', 'information technology', 'engineering'],
    certifications: ['aws certified', 'azure certified', 'kubernetes', 'certified scrum']
  },
  'data-analyst': {
    skills: [
      'sql', 'excel', 'python', 'r', 'tableau', 'power bi', 'data visualization',
      'statistics', 'statistical analysis', 'data mining', 'etl', 'data warehousing',
      'business intelligence', 'bi', 'looker', 'qlik', 'sas', 'spss', 'pandas',
      'numpy', 'jupyter', 'reporting', 'dashboard', 'kpi', 'metrics', 'analytics'
    ],
    keySkills: ['sql', 'excel', 'python', 'tableau', 'power bi', 'data visualization'],
    minExperience: 1,
    education: ['statistics', 'mathematics', 'business analytics', 'data science', 'economics'],
    certifications: ['tableau certified', 'microsoft certified', 'google analytics', 'data analyst']
  },
  'ux-designer': {
    skills: [
      'figma', 'sketch', 'adobe xd', 'adobe creative suite', 'photoshop', 'illustrator',
      'wireframing', 'prototyping', 'user research', 'ux research', 'usability testing',
      'user testing', 'user interviews', 'persona', 'user journey', 'information architecture',
      'interaction design', 'visual design', 'ui design', 'responsive design', 'mobile design',
      'accessibility', 'wcag', 'design systems', 'atomic design', 'invision', 'principle', 'framer'
    ],
    keySkills: ['figma', 'adobe creative suite', 'wireframing', 'prototyping', 'user research'],
    minExperience: 2,
    education: ['design', 'graphic design', 'hci', 'human-computer interaction', 'visual design', 'ux design'],
    certifications: ['ux certification', 'nielsen norman', 'interaction design', 'google ux']
  },
  'data-scientist': {
    skills: [
      'python', 'r', 'machine learning', 'ml', 'deep learning', 'ai', 'tensorflow', 'pytorch',
      'keras', 'scikit-learn', 'pandas', 'numpy', 'scipy', 'statistics', 'sql', 'big data',
      'hadoop', 'spark', 'nlp', 'natural language processing', 'computer vision', 'data mining',
      'predictive modeling', 'regression', 'classification', 'clustering', 'neural networks',
      'data visualization', 'jupyter', 'tableau', 'algorithms', 'aws', 'gcp', 'azure'
    ],
    keySkills: ['python', 'machine learning', 'tensorflow', 'pytorch', 'statistics', 'sql'],
    minExperience: 2,
    education: ['data science', 'statistics', 'mathematics', 'computer science', 'physics'],
    certifications: ['aws ml', 'google professional ml', 'tensorflow certified', 'coursera ml']
  },
  'product-manager': {
    skills: [
      'product management', 'roadmapping', 'agile', 'scrum', 'kanban', 'jira', 'confluence',
      'stakeholder management', 'user stories', 'backlog', 'prioritization', 'market research',
      'competitive analysis', 'analytics', 'user research', 'a/b testing', 'sql', 'metrics',
      'kpi', 'okr', 'strategy', 'product strategy', 'go-to-market', 'gtm', 'product lifecycle',
      'wireframing', 'mvp', 'feature definition', 'requirements gathering'
    ],
    keySkills: ['product management', 'roadmapping', 'agile', 'stakeholder management', 'market research'],
    minExperience: 3,
    education: ['business', 'management', 'engineering', 'computer science', 'mba'],
    certifications: ['certified scrum product owner', 'pragmatic marketing', 'product management']
  },
  'marketing-manager': {
    skills: [
      'digital marketing', 'seo', 'sem', 'social media', 'content marketing', 'google analytics',
      'facebook ads', 'google ads', 'ppc', 'email marketing', 'marketing automation', 'hubspot',
      'salesforce', 'crm', 'brand management', 'campaigns', 'lead generation', 'conversion optimization',
      'copywriting', 'content strategy', 'influencer marketing', 'affiliate marketing', 'market research',
      'marketing strategy', 'budget management', 'roi analysis', 'a/b testing'
    ],
    keySkills: ['digital marketing', 'seo', 'sem', 'social media', 'analytics', 'content marketing'],
    minExperience: 3,
    education: ['marketing', 'business', 'communications', 'advertising', 'mba'],
    certifications: ['google ads certified', 'hubspot certified', 'facebook blueprint', 'hootsuite']
  },
  'sales-representative': {
    skills: [
      'sales', 'b2b', 'b2c', 'cold calling', 'lead generation', 'prospecting', 'negotiation',
      'crm', 'salesforce', 'pipeline management', 'account management', 'customer relationship',
      'presentation', 'closing', 'quota', 'revenue', 'business development', 'networking',
      'communication', 'persuasion', 'consultative selling', 'solution selling'
    ],
    keySkills: ['sales', 'crm', 'lead generation', 'negotiation', 'prospecting'],
    minExperience: 1,
    education: ['business', 'marketing', 'communications', 'sales'],
    certifications: ['salesforce certified', 'sandler training', 'challenger sales']
  },
  'hr-manager': {
    skills: [
      'recruitment', 'talent acquisition', 'employee relations', 'hris', 'workday', 'adp',
      'onboarding', 'performance management', 'compensation', 'benefits', 'compliance',
      'labor law', 'training', 'development', 'hr policies', 'conflict resolution',
      'diversity', 'inclusion', 'culture', 'engagement', 'retention', 'succession planning'
    ],
    keySkills: ['recruitment', 'employee relations', 'hris', 'compliance', 'training'],
    minExperience: 3,
    education: ['human resources', 'business', 'psychology', 'organizational behavior'],
    certifications: ['phr', 'sphr', 'shrm-cp', 'shrm-scp', 'cipd']
  },
  'cloud-engineer': {
    skills: [
      'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible',
      'devops', 'ci/cd', 'jenkins', 'gitlab ci', 'github actions', 'infrastructure as code',
      'iac', 'cloudformation', 'monitoring', 'prometheus', 'grafana', 'networking', 'security',
      'linux', 'bash', 'python', 'microservices', 'serverless', 'lambda', 'containers'
    ],
    keySkills: ['aws', 'azure', 'docker', 'kubernetes', 'terraform', 'devops'],
    minExperience: 2,
    education: ['computer science', 'information technology', 'engineering', 'cloud computing'],
    certifications: ['aws certified solutions architect', 'azure administrator', 'kubernetes certified', 'gcp certified']
  },
  'cybersecurity-analyst': {
    skills: [
      'penetration testing', 'ethical hacking', 'vulnerability assessment', 'security audits',
      'cissp', 'ceh', 'network security', 'firewall', 'ids', 'ips', 'siem', 'splunk',
      'threat intelligence', 'incident response', 'forensics', 'compliance', 'iso 27001',
      'gdpr', 'nist', 'risk assessment', 'encryption', 'vpn', 'malware analysis', 'wireshark'
    ],
    keySkills: ['penetration testing', 'network security', 'cissp', 'siem', 'incident response'],
    minExperience: 2,
    education: ['cybersecurity', 'information security', 'computer science', 'information technology'],
    certifications: ['cissp', 'ceh', 'comptia security+', 'cism', 'oscp']
  },
  'business-analyst': {
    skills: [
      'requirements gathering', 'business analysis', 'process mapping', 'bpmn', 'uml',
      'stakeholder analysis', 'gap analysis', 'user stories', 'jira', 'confluence',
      'sql', 'data analysis', 'excel', 'visio', 'lucidchart', 'agile', 'scrum',
      'documentation', 'use cases', 'functional requirements', 'wireframing', 'testing'
    ],
    keySkills: ['requirements gathering', 'process mapping', 'stakeholder analysis', 'sql', 'agile'],
    minExperience: 2,
    education: ['business', 'management', 'information systems', 'computer science', 'mba'],
    certifications: ['cbap', 'ccba', 'pmi-pba', 'certified business analyst']
  },
  'devops-engineer': {
    skills: [
      'ci/cd', 'jenkins', 'gitlab ci', 'github actions', 'docker', 'kubernetes', 'k8s',
      'terraform', 'ansible', 'chef', 'puppet', 'aws', 'azure', 'gcp', 'cloud',
      'linux', 'bash', 'python', 'scripting', 'monitoring', 'prometheus', 'grafana',
      'elk', 'infrastructure as code', 'iac', 'automation', 'git', 'nginx', 'apache',
      'microservices', 'helm', 'argocd', 'cloudformation', 'deployment', 'build pipelines'
    ],
    keySkills: ['ci/cd', 'docker', 'kubernetes', 'terraform', 'aws', 'jenkins'],
    minExperience: 2,
    education: ['computer science', 'information technology', 'engineering', 'systems'],
    certifications: ['aws certified devops', 'kubernetes administrator', 'docker certified', 'azure devops']
  },
  'full-stack-developer': {
    skills: [
      'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'express',
      'nestjs', 'python', 'django', 'flask', 'java', 'spring', 'dotnet', 'c#',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'api', 'rest', 'graphql',
      'html', 'css', 'sass', 'tailwind', 'webpack', 'vite', 'git', 'docker',
      'aws', 'azure', 'testing', 'jest', 'mocha', 'prisma', 'orm', 'authentication'
    ],
    keySkills: ['javascript', 'react', 'node', 'sql', 'api', 'mongodb', 'typescript'],
    minExperience: 2,
    education: ['computer science', 'software engineering', 'information technology', 'engineering'],
    certifications: ['aws certified developer', 'mongodb certified', 'react certified']
  },
  'mobile-app-developer': {
    skills: [
      'react native', 'flutter', 'swift', 'kotlin', 'ios', 'android', 'xcode',
      'android studio', 'mobile ui/ux', 'rest api', 'firebase', 'app store', 'play store',
      'push notifications', 'mobile testing', 'responsive design', 'native modules',
      'expo', 'fastlane', 'app deployment', 'offline storage', 'sqlite', 'realm',
      'mobile analytics', 'crash reporting', 'performance optimization', 'dart', 'java'
    ],
    keySkills: ['react native', 'flutter', 'swift', 'kotlin', 'mobile ui/ux', 'firebase'],
    minExperience: 2,
    education: ['computer science', 'software engineering', 'mobile development', 'engineering'],
    certifications: ['google android certified', 'ios developer certified', 'flutter certified']
  },
  'ai-ml-research-scientist': {
    skills: [
      'python', 'deep learning', 'neural networks', 'tensorflow', 'pytorch', 'keras',
      'machine learning', 'research', 'papers', 'publications', 'algorithms', 'mathematics',
      'transformers', 'attention', 'llm', 'nlp', 'computer vision', 'reinforcement learning',
      'optimization', 'experiment design', 'statistics', 'model architecture', 'gpu computing',
      'distributed training', 'research methodology', 'arxiv', 'peer review', 'latex'
    ],
    keySkills: ['deep learning', 'tensorflow', 'pytorch', 'research', 'neural networks', 'python'],
    minExperience: 3,
    education: ['phd', 'computer science', 'machine learning', 'ai', 'mathematics', 'physics'],
    certifications: ['published papers', 'google researcher', 'nvidia deep learning', 'top conference papers']
  },
  'blockchain-developer': {
    skills: [
      'solidity', 'ethereum', 'smart contracts', 'web3', 'blockchain', 'defi', 'nft',
      'cryptocurrency', 'truffle', 'hardhat', 'ethers.js', 'web3.js', 'metamask',
      'rust', 'solana', 'polygon', 'layer 2', 'consensus', 'cryptography', 'security auditing',
      'gas optimization', 'evm', 'dapps', 'ipfs', 'dao', 'tokenomics', 'upgradeable contracts'
    ],
    keySkills: ['solidity', 'ethereum', 'smart contracts', 'web3', 'defi', 'blockchain'],
    minExperience: 2,
    education: ['computer science', 'cryptography', 'mathematics', 'engineering', 'blockchain'],
    certifications: ['certified blockchain developer', 'ethereum developer', 'blockchain security']
  },
  'game-developer': {
    skills: [
      'unity', 'unreal engine', 'c#', 'c++', 'game development', 'game design', '3d modeling',
      'physics', 'graphics', 'shaders', 'animation', 'ar', 'vr', 'multiplayer', 'networking',
      'ai pathfinding', 'optimization', 'mobile games', 'console development', 'gameplay programming',
      'ui/ux', 'procedural generation', 'game engines', 'blender', 'maya', 'rendering'
    ],
    keySkills: ['unity', 'unreal engine', 'c#', 'c++', 'game development', '3d modeling'],
    minExperience: 2,
    education: ['game development', 'computer science', 'interactive media', 'digital arts', 'engineering'],
    certifications: ['unity certified', 'unreal certified', 'game development certification']
  },
  'embedded-systems-engineer': {
    skills: [
      'c', 'c++', 'embedded c', 'microcontroller', 'arduino', 'raspberry pi', 'arm',
      'rtos', 'freertos', 'embedded linux', 'firmware', 'hardware', 'iot', 'sensors',
      'i2c', 'spi', 'uart', 'can bus', 'modbus', 'assembly', 'debugging', 'oscilloscope',
      'power management', 'wireless', 'bluetooth', 'wifi', 'low power', 'real-time systems'
    ],
    keySkills: ['c', 'c++', 'microcontroller', 'rtos', 'embedded systems', 'firmware'],
    minExperience: 2,
    education: ['electrical engineering', 'computer engineering', 'electronics', 'embedded systems'],
    certifications: ['embedded systems certified', 'arm certified', 'iot specialist']
  },
  'sre': {
    skills: [
      'sre', 'site reliability', 'kubernetes', 'docker', 'monitoring', 'prometheus', 'grafana',
      'incident response', 'on-call', 'slo', 'sli', 'sla', 'observability', 'distributed systems',
      'linux', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'ci/cd', 'performance',
      'scalability', 'load balancing', 'capacity planning', 'chaos engineering', 'postmortem',
      'alerting', 'logging', 'elk', 'splunk', 'automation', 'troubleshooting'
    ],
    keySkills: ['sre', 'kubernetes', 'monitoring', 'incident response', 'slo', 'distributed systems'],
    minExperience: 3,
    education: ['computer science', 'software engineering', 'information technology', 'systems engineering'],
    certifications: ['sre certified', 'kubernetes administrator', 'aws solutions architect', 'cka']
  },
  'computer-vision-engineer': {
    skills: [
      'computer vision', 'opencv', 'image processing', 'deep learning', 'cnn', 'yolo',
      'object detection', 'image segmentation', 'facial recognition', 'tensorflow', 'pytorch',
      'python', 'c++', 'video processing', 'tracking', 'ocr', '3d vision', 'depth estimation',
      'slam', 'augmented reality', 'point cloud', 'calibration', 'edge computing', 'cuda',
      'real-time processing', 'annotation', 'dataset creation', 'model optimization'
    ],
    keySkills: ['computer vision', 'opencv', 'deep learning', 'object detection', 'python', 'tensorflow'],
    minExperience: 2,
    education: ['computer science', 'computer vision', 'ai', 'robotics', 'electrical engineering'],
    certifications: ['computer vision certified', 'opencv certified', 'nvidia deep learning']
  },
  'network-security-engineer': {
    skills: [
      'network security', 'firewall', 'vpn', 'ids', 'ips', 'intrusion detection', 'wireshark',
      'tcp/ip', 'network protocols', 'cisco', 'palo alto', 'fortinet', 'security auditing',
      'vulnerability assessment', 'penetration testing', 'siem', 'splunk', 'network monitoring',
      'packet analysis', 'ddos mitigation', 'zero trust', 'network segmentation', 'compliance',
      'iso 27001', 'nist', 'encryption', 'ssl', 'tls', 'dns security', 'routing', 'switching'
    ],
    keySkills: ['network security', 'firewall', 'ids', 'penetration testing', 'tcp/ip', 'vpn'],
    minExperience: 2,
    education: ['cybersecurity', 'network security', 'information security', 'computer science'],
    certifications: ['cissp', 'ccna security', 'ceh', 'comptia security+', 'network+ certified']
  },
  'qa-engineer': {
    skills: [
      'quality assurance', 'test automation', 'selenium', 'cypress', 'playwright', 'testing',
      'manual testing', 'test plans', 'test cases', 'bug tracking', 'jira', 'api testing',
      'postman', 'performance testing', 'jmeter', 'load testing', 'regression testing',
      'ci/cd', 'jenkins', 'agile', 'scrum', 'test strategy', 'functional testing',
      'non-functional testing', 'accessibility testing', 'security testing', 'mobile testing'
    ],
    keySkills: ['test automation', 'selenium', 'testing', 'qa', 'bug tracking', 'api testing'],
    minExperience: 2,
    education: ['computer science', 'software engineering', 'information technology', 'qa'],
    certifications: ['istqb', 'selenium certified', 'certified tester', 'agile tester']
  }
};

export interface RoleMatchResult {
  roleId: string;
  roleName: string;
  score: number;
  confidenceLevel: 'excellent' | 'good' | 'fair' | 'poor';
  matchBreakdown: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    certificationsScore: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
}

// Weighted scoring: skills (40%), experience (30%), education (20%), certifications (10%)
const WEIGHTS = {
  skills: 0.4,
  experience: 0.3,
  education: 0.2,
  certifications: 0.1
};

/**
 * Analyzes a resume against all available roles and returns top 3 matches
 */
export async function analyzeResumeForAllRoles(file: File): Promise<RoleMatchResult[]> {
  // Extract and parse resume
  const text = await extractTextFromPDF(file);
  return analyzeResumeForAllRolesFromText(text);
}

/**
 * Analyzes pre-extracted resume text against all roles (no PDF parsing needed)
 */
export async function analyzeResumeForAllRolesFromText(text: string): Promise<RoleMatchResult[]> {
  const parsedData = parseResumeText(text);
  
  const allMatches: RoleMatchResult[] = [];
  
  // Analyze against each role
  for (const role of jobRoles) {
    const roleReqs = roleSkillMapping[role.id];
    if (!roleReqs) continue;
    
    // Calculate skills score (40% weight)
    const resumeSkills = parsedData.skills.map(s => s.toLowerCase());
    const matchedSkills = roleReqs.skills.filter(skill => 
      resumeSkills.some(rs => rs.includes(skill) || skill.includes(rs))
    );
    
    // Key skills have 2x weight
    const keySkillMatches = roleReqs.keySkills.filter(keySkill =>
      resumeSkills.some(rs => rs.includes(keySkill) || keySkill.includes(rs))
    );
    
    const skillsScore = roleReqs.skills.length > 0
      ? ((matchedSkills.length + keySkillMatches.length) / (roleReqs.skills.length + roleReqs.keySkills.length)) * 100
      : 0;
    
    // Calculate experience score (30% weight)
    const totalYears = parsedData.totalExperienceYears || 0;
    const experienceScore = totalYears >= roleReqs.minExperience
      ? 100
      : (totalYears / roleReqs.minExperience) * 100;
    
    // Calculate education score (20% weight)
    const resumeEducation = parsedData.education.map(e => e.toLowerCase());
    const educationMatches = roleReqs.education.filter(edu =>
      resumeEducation.some(re => re.includes(edu) || edu.includes(re))
    );
    const educationScore = roleReqs.education.length > 0
      ? (educationMatches.length / roleReqs.education.length) * 100
      : 50; // Default 50% if no education requirements
    
    // Calculate certifications score (10% weight)
    const resumeCerts = parsedData.certifications.map(c => c.toLowerCase());
    const certMatches = roleReqs.certifications.filter(cert =>
      resumeCerts.some(rc => rc.includes(cert) || cert.includes(rc))
    );
    const certificationsScore = roleReqs.certifications.length > 0
      ? (certMatches.length / roleReqs.certifications.length) * 100
      : 50; // Default 50% if no cert requirements
    
    // Calculate weighted overall score
    const overallScore = Math.round(
      skillsScore * WEIGHTS.skills +
      experienceScore * WEIGHTS.experience +
      educationScore * WEIGHTS.education +
      certificationsScore * WEIGHTS.certifications
    );
    
    // Determine confidence level
    let confidenceLevel: RoleMatchResult['confidenceLevel'];
    if (overallScore >= 80) confidenceLevel = 'excellent';
    else if (overallScore >= 60) confidenceLevel = 'good';
    else if (overallScore >= 40) confidenceLevel = 'fair';
    else confidenceLevel = 'poor';
    
    // Find missing key skills
    const missingSkills = roleReqs.keySkills.filter(keySkill =>
      !resumeSkills.some(rs => rs.includes(keySkill) || keySkill.includes(rs))
    );
    
    allMatches.push({
      roleId: role.id,
      roleName: role.title,
      score: overallScore,
      confidenceLevel,
      matchBreakdown: {
        skillsScore: Math.round(skillsScore),
        experienceScore: Math.round(experienceScore),
        educationScore: Math.round(educationScore),
        certificationsScore: Math.round(certificationsScore)
      },
      matchedSkills: matchedSkills.slice(0, 10), // Top 10 matched skills
      missingSkills: missingSkills
    });
  }
  
  // Sort by score descending
  allMatches.sort((a, b) => b.score - a.score);
  
  // Return top 3 matches with score >= 10%
  return allMatches.filter(m => m.score >= 10).slice(0, 3);
}

/**
 * Get confidence level badge color
 */
export function getConfidenceBadgeVariant(level: RoleMatchResult['confidenceLevel']): 
  'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'excellent': return 'default';
    case 'good': return 'secondary';
    case 'fair': return 'outline';
    case 'poor': return 'destructive';
  }
}
