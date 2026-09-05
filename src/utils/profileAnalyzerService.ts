/**
 * Profile Analyzer Service for VidyaMitra
 * Analyzes GitHub, LeetCode, and Resume profiles with AI-powered insights
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Career Paths with 2026 Skills
export const careerPaths = [
  "Full Stack Developer",
  "Frontend Engineer",
  "Backend Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Cloud Architect",
  "Mobile Developer",
  "Cybersecurity Engineer",
  "AI/ML Researcher",
  "Data Engineer",
  "QA Engineer",
  "UI/UX Designer",
  "Blockchain Developer",
  "Game Developer",
  "Site Reliability Engineer",
  "Business Analyst",
  "Software Architect",
  "IoT Engineer",
  "Product Manager",
  "Digital Marketing Specialist",
  "AR/VR Developer",
  "Data Analyst",
  "Technical Writer"
];

const skillsByCareer: Record<string, string[]> = {
  "Full Stack Developer": ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "MongoDB", "Docker", "Git", "REST API", "GraphQL", "AWS", "CI/CD"],
  "Frontend Engineer": ["JavaScript", "TypeScript", "React", "WebAssembly", "Server Components", "Micro-frontends", "Tailwind CSS", "CSS", "HTML", "Vue.js", "Next.js", "Redux"],
  "Backend Engineer": ["Go", "Rust", "Python", "Java", "Docker", "Kubernetes", "Distributed Systems", "Graph Databases", "Microservices", "REST API", "GraphQL", "Node.js"],
  "Data Scientist": ["Python", "SQL", "Machine Learning", "MLOps", "TensorFlow", "PyTorch", "Statistics", "Data Visualization", "Jupyter Notebook", "Pandas", "NumPy"],
  "Machine Learning Engineer": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "MLOps", "Docker", "Kubernetes", "Model Deployment", "Feature Engineering", "SQL", "Deep Learning"],
  "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "Azure", "Terraform", "Jenkins", "GitLab CI", "Ansible", "Prometheus", "Grafana", "Linux", "Python", "Bash"],
  "Cloud Architect": ["AWS", "Azure", "Google Cloud", "Terraform", "CloudFormation", "Serverless", "Microservices", "Security", "Cost Optimization", "High Availability"],
  "Mobile Developer": ["React Native", "Flutter", "Swift", "Kotlin", "Java", "Firebase", "REST API", "Mobile UI/UX", "iOS", "Android"],
  "Cybersecurity Engineer": ["Network Security", "Penetration Testing", "SIEM", "Firewalls", "Cryptography", "Vulnerability Assessment", "Python", "Security Compliance"],
  "AI/ML Researcher": ["Deep Learning", "Natural Language Processing", "Computer Vision", "Reinforcement Learning", "PyTorch", "TensorFlow", "Research Papers", "Python"],
  "Data Engineer": ["Python", "SQL", "Spark", "Kafka", "Airflow", "ETL", "Data Warehousing", "Snowflake", "BigQuery", "Data Modeling"],
  "QA Engineer": ["Selenium", "Automated Testing", "Test Planning", "API Testing", "Performance Testing", "Jest", "Cypress", "Python", "Java", "CI/CD"],
  "UI/UX Designer": ["Figma", "Adobe XD", "Sketch", "Prototyping", "User Research", "Wireframing", "Design Systems", "HTML", "CSS", "Responsive Design"],
  "Blockchain Developer": ["Solidity", "Ethereum", "Smart Contracts", "Web3.js", "Cryptography", "DeFi", "NFT", "JavaScript", "Node.js"],
  "Game Developer": ["Unity", "Unreal Engine", "C++", "C#", "Game Physics", "3D Modeling", "Animation", "Game Design"],
  "Site Reliability Engineer": ["Linux", "Python", "Kubernetes", "Docker", "Monitoring", "Incident Management", "Automation", "Performance Optimization"],
  "Business Analyst": ["Data Analysis", "SQL", "Excel", "Power BI", "Tableau", "Requirements Gathering", "Process Mapping", "Agile", "JIRA"],
  "Software Architect": ["System Design", "Microservices", "Design Patterns", "Cloud Architecture", "Scalability", "Security", "API Design", "Java", "Python"],
  "IoT Engineer": ["Embedded Systems", "Arduino", "Raspberry Pi", "MQTT", "C", "C++", "Python", "Sensor Integration", "Edge Computing"],
  "Product Manager": ["AI Product Strategy", "Data-driven Decision Making", "Agile", "User Research", "Roadmapping", "Stakeholder Management", "Jira"],
  "Digital Marketing Specialist": ["SEO", "Google Analytics", "Content Marketing", "Social Media Marketing", "Email Marketing", "PPC", "A/B Testing"],
  "AR/VR Developer": ["Unity", "Unreal Engine", "C#", "C++", "3D Modeling", "ARKit", "ARCore", "WebXR", "Computer Graphics"],
  "Data Analyst": ["SQL", "Python", "Excel", "Tableau", "Power BI", "Statistics", "Data Visualization", "R", "Data Cleaning"],
  "Technical Writer": ["Documentation", "Markdown", "Git", "API Documentation", "Technical Communication", "HTML", "CSS", "Agile"]
};

// Skill variations mapping
const skillVariations: Record<string, string[]> = {
  "JavaScript": ["js", "javascript", "ecmascript", "es6", "node"],
  "TypeScript": ["ts", "typescript"],
  "Python": ["py", "python", "python3"],
  "Machine Learning": ["ml", "machine learning"],
  "Artificial Intelligence": ["ai", "artificial intelligence"],
  "React": ["react", "reactjs", "react.js"],
  "Node.js": ["node", "nodejs", "node.js"],
  "MongoDB": ["mongo", "mongodb"],
  "PostgreSQL": ["postgres", "postgresql", "psql"],
  "REST API": ["rest", "restful", "rest api"],
  "GraphQL": ["graphql", "graph ql"],
  "Docker": ["docker", "containerization"],
  "Kubernetes": ["k8s", "kubernetes"],
  "Amazon Web Services": ["aws", "amazon web services"],
  "Google Cloud": ["gcp", "google cloud platform"],
  "Microsoft Azure": ["azure", "microsoft azure"],
  "CI/CD": ["ci/cd", "continuous integration"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3"],
  "SQL": ["sql", "mysql", "postgres"],
  "Git": ["git", "github", "gitlab"],
  "TensorFlow": ["tensorflow", "tf"],
  "PyTorch": ["pytorch", "torch"]
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// GitHub Profile Analysis
export async function analyzeGithubProfile(githubUrl: string) {
  const username = extractGithubUsername(githubUrl);
  if (!username) throw new Error('Invalid GitHub URL');

  const headers: HeadersInit = {};
  const githubToken = import.meta.env.VITE_GITHUB_API_KEY;
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  // Fetch user info
  const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
  if (!userRes.ok) {
    if (userRes.status === 404) throw new Error('GitHub user not found');
    if (userRes.status === 429) throw new Error('GitHub rate limit exceeded. Please add API key.');
    throw new Error('Failed to fetch GitHub profile');
  }
  const userData = await userRes.json();

  // Fetch repositories
  const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, { headers });
  if (!reposRes.ok) throw new Error('Failed to fetch repositories');
  const repos = await reposRes.json();

  // Analyze language distribution
  const languageTotals: Record<string, number> = {};
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const repo of repos.slice(0, 15)) {
    if (!repo.language) continue;
    const pushedAt = new Date(repo.pushed_at);
    const weight = pushedAt > sixMonthsAgo ? 2 : 1;

    try {
      const langRes = await fetch(repo.languages_url, { headers });
      if (langRes.ok) {
        const languages = await langRes.json();
        for (const [lang, bytes] of Object.entries(languages)) {
          languageTotals[lang] = (languageTotals[lang] || 0) + ((bytes as number) * weight);
        }
      }
      await delay(100);
    } catch (e) {
      console.warn(`Failed fetching language for repo ${repo.name}`);
    }
  }

  const totalBytes = Object.values(languageTotals).reduce((a, b) => a + b, 0);
  const skills: Array<{ skill: string; github_score: number }> = [];

  for (const [lang, byteCount] of Object.entries(languageTotals)) {
    const percentage = (byteCount / totalBytes) * 100;
    if (percentage > 3) {
      skills.push({ skill: lang, github_score: Math.round(percentage) });
    }
  }

  return {
    userInfo: {
      name: userData.name || username,
      avatar_url: userData.avatar_url,
      login: username
    },
    skills,
    repos: repos.length
  };
}

// LeetCode Profile Analysis
export async function analyzeLeetCodeProfile(input: string) {
  const username = extractLeetCodeUsername(input);
  if (!username) throw new Error('Invalid LeetCode username or URL');

  try {
    // Call backend proxy
    const response = await fetch('/api/leetcode/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      throw new Error('LeetCode profile not found');
    }

    const data = await response.json();

    // Derive skill score and level from solved counts
    const total = data.totalSolved || 0;
    const hard = data.hardSolved || 0;
    const medium = data.mediumSolved || 0;
    const easy = data.easySolved || 0;
    const skillScore = Math.min(100, Math.round((easy * 1 + medium * 2 + hard * 4) / 2));
    const level = hard >= 50 ? 'Expert' : hard >= 20 ? 'Advanced' : medium >= 50 ? 'Intermediate' : 'Beginner';

    return {
      username: data.username,
      totalSolved: total,
      problems: { easy, medium, hard },
      ranking: data.ranking || null,
      contestRating: null, // Not available via public GraphQL
      skillScore,
      level,
      reputation: data.reputation,
      badges: data.badges || [],
    };
  } catch (error) {
    console.warn('LeetCode analysis failed:', error);
    throw new Error('LeetCode proxy not available. Make sure the server is running.');
  }
}

// Resume PDF Parsing
export async function parseResumePDF(file: File) {
  if (!file || file.type !== 'application/pdf') {
    throw new Error('Please upload a valid PDF file');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n';
    }

    const skills = extractSkillsFromText(text);
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    return {
      skills,
      fullText: text,
      wordCount
    };
  } catch (error) {
    throw new Error(`Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract skills from text
function extractSkillsFromText(text: string): Array<{ skill: string; proficiency: number }> {
  const lowerText = text.toLowerCase();
  const allSkills = new Set<string>();
  Object.values(skillsByCareer).forEach(list => list.forEach(s => allSkills.add(s)));

  const extracted: Array<{ skill: string; proficiency: number }> = [];
  const matchedSkills = new Set<string>();

  allSkills.forEach(skill => {
    const variations = skillVariations[skill] || [skill.toLowerCase()];
    const found = variations.some(variant => lowerText.includes(variant.toLowerCase()));

    if (found && !matchedSkills.has(skill.toLowerCase())) {
      let frequency = 0;
      variations.forEach(variant => {
        const regex = new RegExp(variant.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = text.match(regex);
        frequency += matches ? matches.length : 0;
      });

      let proficiency = 70 + Math.min(frequency * 5, 20);
      if (lowerText.includes('skills') && lowerText.split('skills')[1]?.toLowerCase().includes(skill.toLowerCase())) {
        proficiency = Math.min(proficiency + 10, 90);
      }

      extracted.push({ skill, proficiency: Math.min(proficiency, 90) });
      matchedSkills.add(skill.toLowerCase());
    }
  });

  return extracted;
}

// ATS Score Calculator
export function calculateATSScore(resumeText: string, careerGoal: string) {
  const scores = {
    keywords: 0,
    formatting: 0,
    sections: 0,
    length: 0,
    experience: 0
  };

  const lowerText = resumeText.toLowerCase();
  const requiredSkills = skillsByCareer[careerGoal] || [];

  // 1. Keyword matching (40 points)
  let matchedKeywords = 0;
  requiredSkills.forEach(skill => {
    const variations = skillVariations[skill] || [skill.toLowerCase()];
    const found = variations.some(variant => lowerText.includes(variant.toLowerCase()));
    if (found) matchedKeywords++;
  });
  scores.keywords = Math.min(40, (matchedKeywords / requiredSkills.length) * 40);

  // 2. Essential sections (25 points)
  const essentialSections = ['experience', 'education', 'skills', 'projects'];
  let sectionsFound = 0;
  essentialSections.forEach(section => {
    if (lowerText.includes(section)) sectionsFound++;
  });
  scores.sections = (sectionsFound / essentialSections.length) * 25;

  // 3. Resume length (15 points)
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount >= 400 && wordCount <= 1500) {
    scores.length = 15;
  } else if (wordCount > 1500 && wordCount <= 2000) {
    scores.length = 10;
  } else {
    scores.length = 5;
  }

  // 4. Formatting (10 points)
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
  const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(resumeText);
  const hasBulletPoints = resumeText.includes('•') || /^\s*[-*]\s/m.test(resumeText);
  const hasDates = /\d{4}/.test(resumeText);
  scores.formatting = (hasEmail ? 3 : 0) + (hasPhone ? 2 : 0) + (hasBulletPoints ? 3 : 0) + (hasDates ? 2 : 0);

  // 5. Experience indicators (10 points)
  const experienceKeywords = ['developed', 'created', 'implemented', 'managed', 'led', 'designed', 'built', 'achieved', 'improved'];
  let experienceCount = 0;
  experienceKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) experienceCount++;
  });
  scores.experience = Math.min(10, experienceCount * 1.5);

  const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0));

  const feedback: string[] = [];
  if (scores.keywords < 20) feedback.push("Add more relevant technical keywords from the job description");
  if (scores.sections < 15) feedback.push("Include standard sections: Experience, Education, Skills, Projects");
  if (scores.length < 10) feedback.push("Optimize resume length (aim for 400-1500 words)");
  if (scores.formatting < 7) feedback.push("Improve formatting: use bullet points, add contact info");
  if (scores.experience < 7) feedback.push("Use more action verbs: developed, created, implemented, managed");

  return {
    totalScore,
    breakdown: scores,
    feedback,
    passesATS: totalScore >= 70
  };
}

// Merge Skills from Multiple Sources
export function mergeSkills(
  githubSkills: Array<{ skill: string; github_score: number }>,
  resumeSkills: Array<{ skill: string; proficiency: number }>,
  careerGoal: string
) {
  const map: Record<string, {skill?: string; github_score?: number; resume_score?: number}> = {};

  githubSkills.forEach(s => {
    map[s.skill] = { ...s, resume_score: 0 };
  });

  resumeSkills.forEach(s => {
    if (map[s.skill]) {
      map[s.skill].resume_score = s.proficiency;
    } else {
      map[s.skill] = { skill: s.skill, github_score: 0, resume_score: s.proficiency };
    }
  });

  return Object.values(map).map(s => {
    const total = Math.round(((s.github_score || 0) * 0.6) + ((s.resume_score || 0) * 0.4));
    const finalScore = Math.max(total, Math.max((s.github_score || 0), (s.resume_score || 0)));
    return {
      subject: s.skill,
      score: Math.min(finalScore, 100),
      github: s.github_score || 0,
      resume: s.resume_score || 0,
      fullMark: 100
    };
  }).sort((a, b) => b.score - a.score).slice(0, 8);
}

// AI Roadmap Generation (calls backend)
export async function getAIRoadmap(skills: Array<{subject: string; score: number}>, careerGoal: string) {
  try {
    const response = await fetch('/api/groq/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills, careerGoal })
    });

    if (!response.ok) {
      throw new Error('AI analysis failed');
    }

    return await response.json();
  } catch (error) {
    console.warn('AI roadmap failed, using fallback');
    return {
      score: 75,
      gaps: ["Advanced System Design", "Production Deployments"],
      improvements: {
        general: ["Increase contribution frequency", "Improve code documentation"],
        job_based: ["Build production-scale projects", "Learn industry best practices"]
      },
      phases: [
        { phase: "1", title: "Foundation", focus: "Core Skills", duration: "2-3 weeks", details: "Master fundamental concepts" },
        { phase: "2", title: "Application", focus: "Projects", duration: "4 weeks", details: "Build real-world applications" }
      ]
    };
  }
}

// YouTube Courses
export async function getYouTubeCourses(gaps: string[], careerGoal: string) {
  try {
    const response = await fetch('/api/youtube/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gaps, careerGoal })
    });

    if (!response.ok) throw new Error('YouTube API failed');
    return await response.json();
  } catch (error) {
    // Fallback courses
    return [
      {
        id: "fallback1",
        title: `${careerGoal} Complete Course`,
        thumbnail: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&q=80",
        channel: "Tech Education"
      }
    ];
  }
}

// Helper: Extract GitHub username
function extractGithubUsername(url: string): string | null {
  const match = url.match(/github\.com\/([^/?]+)/);
  return match ? match[1] : null;
}

// Helper: Extract LeetCode username
function extractLeetCodeUsername(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/leetcode\.com\/u?\/?([^/?]+)/);
  return urlMatch ? urlMatch[1] : trimmed;
}
