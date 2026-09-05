import { Answer, InterviewSession } from "@/types";

export interface CourseRecommendation {
  id: string;
  title: string;
  provider: string;
  url: string;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  price: string;
  rating: number;
  description: string;
  skills: string[];
}

export interface LearningPath {
  category: string;
  skillGaps: string[];
  recommendations: CourseRecommendation[];
  priority: "High" | "Medium" | "Low";
}

export interface SkillGapAnalysis {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  learningPaths: LearningPath[];
  recommendedCourses: CourseRecommendation[];
}

// Comprehensive Role-Based Course Database - Multiple Platforms
const courseDatabase: CourseRecommendation[] = [

  // ============= SOFTWARE ENGINEER COURSES =============
  {
    id: "js-complete",
    title: "The Complete JavaScript Course 2024: From Zero to Expert!",
    provider: "Udemy",
    url: "https://www.udemy.com/course/the-complete-javascript-course/",
    duration: "69 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.7,
    description: "Master JavaScript with the most complete course! Projects, challenges, final exam, ES2024",
    skills: ["javascript", "programming", "web development", "frontend", "software-engineer"]
  },
  {
    id: "react-complete",
    title: "React - The Complete Guide 2024 (incl. React Router & Redux)",
    provider: "Udemy",
    url: "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
    duration: "48 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.6,
    description: "Dive in and learn React.js from scratch! Learn Reactjs, Hooks, Redux, React Routing, Animations",
    skills: ["react", "frontend", "javascript", "web development", "software-engineer"]
  },
  {
    id: "algorithms-coursera",
    title: "Algorithms Specialization",
    provider: "Coursera",
    url: "https://www.coursera.org/specializations/algorithms",
    duration: "6 months",
    level: "Intermediate",
    price: "$49/month",
    rating: 4.8,
    description: "Master algorithmic programming techniques. Covers divide-and-conquer, greedy algorithms, dynamic programming",
    skills: ["algorithms", "data structures", "programming", "computer science", "software-engineer"]
  },
  {
    id: "system-design-youtube",
    title: "System Design Interview Questions - Complete Course",
    provider: "YouTube",
    url: "https://www.youtube.com/watch?v=bUHFg8CZFws",
    duration: "4 hours",
    level: "Advanced",
    price: "Free",
    rating: 4.9,
    description: "Complete system design course covering scalability, load balancing, databases, and more",
    skills: ["system design", "scalability", "architecture", "software-engineer"]
  },
  {
    id: "cs50-harvard",
    title: "CS50: Introduction to Computer Science",
    provider: "edX",
    url: "https://www.edx.org/course/introduction-computer-science-harvardx-cs50x",
    duration: "10-20 hours/week",
    level: "Beginner",
    price: "Free",
    rating: 4.9,
    description: "Harvard's introduction to computer science and programming",
    skills: ["computer science", "programming", "algorithms", "software-engineer"]
  },
  {
    id: "python-bootcamp",
    title: "100 Days of Code: The Complete Python Pro Bootcamp for 2024",
    provider: "Udemy",
    url: "https://www.udemy.com/course/100-days-of-code/",
    duration: "58 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.7,
    description: "Master Python by building 100 projects in 100 days. Learn data science, automation, build websites",
    skills: ["python", "programming", "data science", "automation", "software-engineer"]
  },
  {
    id: "java-w3schools",
    title: "Java Tutorial - Complete Course",
    provider: "W3Schools",
    url: "https://www.w3schools.com/java/",
    duration: "Self-paced",
    level: "Beginner",
    price: "Free",
    rating: 4.5,
    description: "Comprehensive Java tutorial with examples and exercises",
    skills: ["java", "programming", "object-oriented", "software-engineer"]
  },

  // ============= DATA SCIENTIST COURSES =============
  {
    id: "machine-learning-coursera",
    title: "Machine Learning Specialization",
    provider: "Coursera",
    url: "https://www.coursera.org/specializations/machine-learning-introduction",
    duration: "3 months",
    level: "Intermediate",
    price: "$49/month",
    rating: 4.9,
    description: "Andrew Ng's comprehensive machine learning course covering supervised and unsupervised learning",
    skills: ["machine learning", "python", "data science", "artificial intelligence", "statistics", "data-scientist"]
  },
  {
    id: "data-science-python",
    title: "Python for Data Science and Machine Learning Bootcamp",
    provider: "Udemy",
    url: "https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/",
    duration: "25 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.6,
    description: "Learn to use NumPy, Pandas, Seaborn, Matplotlib, Plotly, Scikit-Learn, Machine Learning, Tensorflow",
    skills: ["python", "data science", "machine learning", "pandas", "numpy", "statistics", "data-scientist"]
  },
  {
    id: "sql-w3schools",
    title: "SQL Tutorial - Complete Course",
    provider: "W3Schools",
    url: "https://www.w3schools.com/sql/",
    duration: "Self-paced",
    level: "Beginner",
    price: "Free",
    rating: 4.7,
    description: "Complete SQL tutorial with examples and exercises",
    skills: ["sql", "database", "data analysis", "data-scientist"]
  },
  {
    id: "statistics-khan-academy",
    title: "Statistics and Probability",
    provider: "Khan Academy",
    url: "https://www.khanacademy.org/math/statistics-probability",
    duration: "Self-paced",
    level: "Beginner",
    price: "Free",
    rating: 4.8,
    description: "Comprehensive statistics and probability course with interactive exercises",
    skills: ["statistics", "probability", "data analysis", "data-scientist", "mathematics"]
  },
  {
    id: "tableau-youtube",
    title: "Tableau Full Course - Learn Tableau in 6 Hours",
    provider: "YouTube",
    url: "https://www.youtube.com/watch?v=aHaOIvR00So",
    duration: "6 hours",
    level: "Beginner",
    price: "Free",
    rating: 4.6,
    description: "Complete Tableau tutorial for data visualization",
    skills: ["tableau", "data visualization", "business intelligence", "data-scientist"]
  },

  // ============= PRODUCT MANAGER COURSES =============
  {
    id: "product-management-coursera",
    title: "Google Project Management Professional Certificate",
    provider: "Coursera",
    url: "https://www.coursera.org/professional-certificates/google-project-management",
    duration: "6 months",
    level: "Beginner",
    price: "$49/month",
    rating: 4.8,
    description: "Learn project management fundamentals and gain in-demand skills",
    skills: ["project management", "product management", "leadership", "communication", "planning", "product-manager"]
  },
  {
    id: "product-strategy-udemy",
    title: "Become a Product Manager | Learn the Skills & Get the Job",
    provider: "Udemy",
    url: "https://www.udemy.com/course/become-a-product-manager-learn-the-skills-get-a-job/",
    duration: "16 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.4,
    description: "Learn product management, strategy, roadmapping, and user research",
    skills: ["product management", "strategy", "user research", "roadmapping", "analytics", "product-manager"]
  },
  {
    id: "agile-scrum-youtube",
    title: "Agile and Scrum Master Tutorial - Complete Course",
    provider: "YouTube",
    url: "https://www.youtube.com/watch?v=9TycLR0TqFA",
    duration: "4 hours",
    level: "Beginner",
    price: "Free",
    rating: 4.6,
    description: "Complete Agile and Scrum methodology course",
    skills: ["agile", "scrum", "project management", "product-manager", "leadership"]
  },
  {
    id: "analytics-google",
    title: "Google Analytics Individual Qualification (IQ)",
    provider: "Google Skillshop",
    url: "https://skillshop.exceedlms.com/student/collection/287715",
    duration: "4-6 hours",
    level: "Intermediate",
    price: "Free",
    rating: 4.7,
    description: "Master Google Analytics for product insights",
    skills: ["analytics", "data analysis", "web analytics", "product-manager"]
  },

  // ============= MARKETING MANAGER COURSES =============
  {
    id: "digital-marketing-coursera",
    title: "Google Digital Marketing & E-commerce Professional Certificate",
    provider: "Coursera",
    url: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce",
    duration: "6 months",
    level: "Beginner",
    price: "$49/month",
    rating: 4.7,
    description: "Learn digital marketing, e-commerce, and analytics",
    skills: ["digital marketing", "analytics", "seo", "social media", "e-commerce", "marketing-manager"]
  },
  {
    id: "marketing-analytics-udemy",
    title: "Marketing Analytics: Data-Driven Digital Marketing",
    provider: "Udemy",
    url: "https://www.udemy.com/course/marketing-analytics/",
    duration: "14 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.5,
    description: "Learn marketing analytics, attribution modeling, and data-driven marketing",
    skills: ["marketing analytics", "data analysis", "digital marketing", "attribution modeling", "marketing-manager"]
  },
  {
    id: "seo-moz",
    title: "The Beginner's Guide to SEO",
    provider: "Moz",
    url: "https://moz.com/beginners-guide-to-seo",
    duration: "Self-paced",
    level: "Beginner",
    price: "Free",
    rating: 4.8,
    description: "Comprehensive guide to search engine optimization",
    skills: ["seo", "digital marketing", "content marketing", "analytics", "marketing-manager"]
  },
  {
    id: "facebook-ads-youtube",
    title: "Facebook Ads Tutorial 2024 - Complete Course",
    provider: "YouTube",
    url: "https://www.youtube.com/watch?v=lbKErH9s7mI",
    duration: "3 hours",
    level: "Intermediate",
    price: "Free",
    rating: 4.5,
    description: "Complete Facebook advertising course",
    skills: ["facebook ads", "social media marketing", "digital advertising", "marketing-manager"]
  },

  // ============= UI/UX DESIGNER COURSES =============
  {
    id: "ux-design-coursera",
    title: "Google UX Design Professional Certificate",
    provider: "Coursera",
    url: "https://www.coursera.org/professional-certificates/google-ux-design",
    duration: "6 months",
    level: "Beginner",
    price: "$49/month",
    rating: 4.8,
    description: "Learn UX design fundamentals, prototyping, and user research",
    skills: ["ux design", "ui design", "prototyping", "user research", "figma", "design thinking", "ux-designer"]
  },
  {
    id: "figma-youtube",
    title: "Figma Tutorial for Beginners - Complete Course",
    provider: "YouTube",
    url: "https://www.youtube.com/watch?v=FTFaQWZBqQ8",
    duration: "2 hours",
    level: "Beginner",
    price: "Free",
    rating: 4.7,
    description: "Complete Figma tutorial covering design basics to advanced features",
    skills: ["figma", "ui design", "prototyping", "design tools", "ux-designer"]
  },
  {
    id: "design-thinking-ideo",
    title: "Design Thinking for Innovation",
    provider: "Coursera",
    url: "https://www.coursera.org/learn/uva-darden-design-thinking-innovation",
    duration: "4 weeks",
    level: "Intermediate",
    price: "$49/month",
    rating: 4.6,
    description: "Learn design thinking methodology for innovation",
    skills: ["design thinking", "innovation", "problem solving", "creativity", "ux design", "ux-designer"]
  },
  {
    id: "adobe-xd-udemy",
    title: "Adobe XD CC for Beginners: Complete Course",
    provider: "Udemy",
    url: "https://www.udemy.com/course/adobe-xd-cc-complete-course/",
    duration: "8 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.4,
    description: "Master Adobe XD for UI/UX design and prototyping",
    skills: ["adobe xd", "ui design", "prototyping", "design tools", "ux-designer"]
  },

  // ============= DEVOPS ENGINEER COURSES =============
  {
    id: "aws-solutions-architect",
    title: "Ultimate AWS Certified Solutions Architect Associate SAA-C03",
    provider: "Udemy",
    url: "https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/",
    duration: "27 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.7,
    description: "Full Practice Exam | Learn Cloud Computing | Pass the AWS Certified Solutions Architect Associate Certification SAA-C03!",
    skills: ["aws", "cloud computing", "devops", "cloud architecture", "system administration", "devops-engineer"]
  },
  {
    id: "docker-kubernetes",
    title: "Docker & Kubernetes: The Complete Guide",
    provider: "Udemy",
    url: "https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/",
    duration: "22 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.6,
    description: "Build, test, and deploy Docker applications with Kubernetes while learning production-style development workflows",
    skills: ["docker", "kubernetes", "devops", "containerization", "cloud deployment", "devops-engineer"]
  },
  {
    id: "linux-command-line",
    title: "Linux Command Line Basics - Complete Course",
    provider: "YouTube",
    url: "https://www.youtube.com/watch?v=ZtqBQ68cfJc",
    duration: "5 hours",
    level: "Beginner",
    price: "Free",
    rating: 4.8,
    description: "Complete Linux command line tutorial for beginners",
    skills: ["linux", "command line", "system administration", "devops", "bash", "devops-engineer"]
  },
  {
    id: "terraform-hashicorp",
    title: "Terraform Associate Certification Course",
    provider: "HashiCorp Learn",
    url: "https://learn.hashicorp.com/terraform",
    duration: "Self-paced",
    level: "Intermediate",
    price: "Free",
    rating: 4.6,
    description: "Learn Infrastructure as Code with Terraform",
    skills: ["terraform", "infrastructure as code", "cloud infrastructure", "devops", "devops-engineer"]
  },

  // ============= SALES REPRESENTATIVE COURSES =============
  {
    id: "sales-training-hubspot",
    title: "HubSpot Sales Software Certification",
    provider: "HubSpot Academy",
    url: "https://academy.hubspot.com/courses/sales-software",
    duration: "4 hours",
    level: "Beginner",
    price: "Free",
    rating: 4.6,
    description: "Learn modern sales techniques and CRM management",
    skills: ["sales techniques", "crm", "lead generation", "sales process", "communication", "sales-representative"]
  },
  {
    id: "negotiation-coursera",
    title: "Introduction to Negotiation: A Strategic Playbook",
    provider: "Coursera",
    url: "https://www.coursera.org/learn/negotiation",
    duration: "7 weeks",
    level: "Intermediate",
    price: "$49/month",
    rating: 4.8,
    description: "Learn negotiation skills from Yale University",
    skills: ["negotiation", "communication", "sales techniques", "persuasion", "conflict resolution", "sales-representative"]
  },
  {
    id: "cold-calling-youtube",
    title: "Cold Calling Mastery - Complete Sales Course",
    provider: "YouTube",
    url: "https://www.youtube.com/watch?v=q6b_7r4LolY",
    duration: "2 hours",
    level: "Beginner",
    price: "Free",
    rating: 4.4,
    description: "Master cold calling techniques and lead conversion",
    skills: ["cold calling", "lead generation", "sales techniques", "communication", "sales-representative"]
  },

  // ============= HR MANAGER COURSES =============
  {
    id: "hr-management-coursera",
    title: "Human Resource Management: HR for People Managers",
    provider: "Coursera",
    url: "https://www.coursera.org/specializations/human-resource-management",
    duration: "4 months",
    level: "Intermediate",
    price: "$49/month",
    rating: 4.5,
    description: "Learn HR fundamentals, recruitment, and employee management",
    skills: ["hr management", "recruitment", "employee relations", "leadership", "communication", "hr-manager"]
  },
  {
    id: "leadership-skills-linkedin",
    title: "Leadership Skills and Emotional Intelligence",
    provider: "LinkedIn Learning",
    url: "https://www.linkedin.com/learning/topics/leadership",
    duration: "Various courses",
    level: "Beginner",
    price: "$29.99/month",
    rating: 4.6,
    description: "Comprehensive leadership development courses",
    skills: ["leadership", "emotional intelligence", "management", "communication", "team building", "hr-manager"]
  },
  {
    id: "recruitment-youtube",
    title: "Recruitment and Selection Process - Complete Guide",
    provider: "YouTube",
    url: "https://www.youtube.com/watch?v=8zR-P6GLSg4",
    duration: "3 hours",
    level: "Beginner",
    price: "Free",
    rating: 4.3,
    description: "Complete guide to recruitment and hiring processes",
    skills: ["recruitment", "hiring", "talent acquisition", "interviewing", "hr-manager"]
  },
  {
    id: "machine-learning-az",
    title: "Machine Learning A-Z™: Hands-On Python & R In Data Science",
    provider: "Udemy",
    url: "https://www.udemy.com/course/machinelearning/",
    duration: "44 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.5,
    description: "Learn to create Machine Learning Algorithms in Python and R from two Data Science experts",
    skills: ["machine learning", "python", "data science", "artificial intelligence"]
  },
  {
    id: "docker-kubernetes",
    title: "Docker & Kubernetes: The Complete Guide",
    provider: "Udemy",
    url: "https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/",
    duration: "22 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.6,
    description: "Build, test, and deploy Docker applications with Kubernetes while learning production-style development workflows",
    skills: ["docker", "kubernetes", "devops", "containerization"]
  },
  {
    id: "system-design",
    title: "Master the System Design Interview",
    provider: "Educative",
    url: "https://www.educative.io/courses/grokking-the-system-design-interview",
    duration: "30 hours",
    level: "Advanced",
    price: "$79/month",
    rating: 4.8,
    description: "Ace system design interviews with this comprehensive course covering scalable distributed systems",
    skills: ["system design", "distributed systems", "scalability", "architecture"]
  },
  {
    id: "data-structures-algorithms",
    title: "Master the Coding Interview: Data Structures + Algorithms",
    provider: "Udemy",
    url: "https://www.udemy.com/course/master-the-coding-interview-data-structures-algorithms/",
    duration: "19 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.6,
    description: "Learn Data Structures and Algorithms in JavaScript. Get Ready to Ace Your Coding Interview!",
    skills: ["data structures", "algorithms", "problem solving", "coding interview"]
  },

  // Soft Skills & Leadership
  {
    id: "communication-skills",
    title: "Complete Communication Skills Master Class for Life",
    provider: "Udemy",
    url: "https://www.udemy.com/course/communication-skills-training/",
    duration: "13 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.5,
    description: "Public Speaking | Presentation | Social Skills | Business Communication | Confidence | Body Language | Small Talk",
    skills: ["communication", "public speaking", "presentation skills", "leadership"]
  },
  {
    id: "project-management",
    title: "Complete Project Management Course - Beginner to Advanced",
    provider: "Udemy",
    url: "https://www.udemy.com/course/project-management-course/",
    duration: "15 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.4,
    description: "Learn Project Management fundamentals. Get PMP ready. Learn Agile, Scrum, Kanban & tools",
    skills: ["project management", "leadership", "agile", "scrum"]
  },
  {
    id: "leadership-skills",
    title: "The Complete Leadership Course - Management Skills",
    provider: "Udemy",
    url: "https://www.udemy.com/course/leadership-course/",
    duration: "12 hours",
    level: "Intermediate",
    price: "$84.99",
    rating: 4.3,
    description: "Leadership Skills, Management Skills, Team Building, Motivation, Coaching, Leader",
    skills: ["leadership", "management", "team building", "coaching"]
  },

  // Design & UX
  {
    id: "ux-design-bootcamp",
    title: "User Experience Design Essentials - Adobe XD UI UX Design",
    provider: "Udemy",
    url: "https://www.udemy.com/course/ui-ux-web-design-using-adobe-xd/",
    duration: "12 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.6,
    description: "Learn User Experience Design, User Interface Design and Adobe XD by creating a real world project",
    skills: ["ux design", "ui design", "adobe xd", "design thinking"]
  },
  {
    id: "figma-ui-ux",
    title: "Figma UI UX Design Essentials",
    provider: "Udemy",
    url: "https://www.udemy.com/course/figma-ux-ui-design-user-experience-tutorial-course/",
    duration: "11 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.7,
    description: "Learn Figma User Interface Design, User Experience design, & web design with Figma tutorials",
    skills: ["figma", "ui design", "ux design", "prototyping"]
  },

  // Data Science & Analytics  
  {
    id: "tableau-bootcamp",
    title: "Tableau 2022 A-Z: Hands-On Tableau Training for Data Science",
    provider: "Udemy",
    url: "https://www.udemy.com/course/tableau10/",
    duration: "18 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.6,
    description: "Learn Tableau Desktop for data visualization and data analysis. Boost your data skills!",
    skills: ["tableau", "data visualization", "data analysis", "business intelligence"]
  },
  {
    id: "sql-bootcamp",
    title: "The Complete SQL Bootcamp 2024: Go from Zero to Hero",
    provider: "Udemy",
    url: "https://www.udemy.com/course/the-complete-sql-bootcamp/",
    duration: "9 hours",
    level: "Beginner",
    price: "$84.99",
    rating: 4.7,
    description: "Learn to use SQL quickly and effectively with this course!",
    skills: ["sql", "database", "data analysis", "postgresql"]
  }
];

// Enhanced Role-based skill mappings for precise course recommendations
const roleSkillMaps: Record<string, string[]> = {
  "software-engineer": [
    "programming", "algorithms", "data structures", "system design", "computer science",
    "javascript", "python", "java", "react", "frontend", "web development", "object-oriented", "software-engineer"
  ],
  "full-stack-developer": [
    "javascript", "react", "node.js", "database", "web development", "frontend", "backend",
    "programming", "full-stack-developer"
  ],
  "data-scientist": [
    "python", "machine learning", "statistics", "data analysis", "sql", "data science",
    "artificial intelligence", "pandas", "numpy", "tableau", "data visualization",
    "business intelligence", "mathematics", "probability", "data-scientist"
  ],
  "data-analyst": [
    "sql", "tableau", "data visualization", "data analysis", "business intelligence",
    "statistics", "data-analyst"
  ],
  "ux-designer": [
    "ux design", "ui design", "figma", "adobe xd", "design thinking", "prototyping",
    "user research", "design tools", "innovation", "problem solving", "creativity", "ux-designer"
  ],
  "product-manager": [
    "product management", "strategy", "user research", "analytics", "roadmapping",
    "communication", "project management", "leadership", "planning", "agile", "scrum",
    "web analytics", "data analysis", "product-manager"
  ],
  "devops-engineer": [
    "aws", "docker", "kubernetes", "linux", "automation", "cloud computing", "devops",
    "cloud architecture", "system administration", "containerization", "cloud deployment",
    "terraform", "infrastructure as code", "command line", "bash", "devops-engineer"
  ],
  "cloud-engineer": [
    "aws", "azure", "gcp", "cloud architecture", "devops", "cloud computing", "cloud-engineer"
  ],
  "cybersecurity-analyst": [
    "security", "networking", "ethical hacking", "compliance", "cybersecurity-analyst"
  ],
  "business-analyst": [
    "data analysis", "project management", "communication", "sql", "business-analyst"
  ],
  "marketing-manager": [
    "digital marketing", "analytics", "content marketing", "seo", "social media",
    "e-commerce", "marketing analytics", "attribution modeling", "facebook ads",
    "social media marketing", "digital advertising", "marketing-manager"
  ],
  "hr-manager": [
    "hr management", "recruitment", "employee relations", "leadership", "communication",
    "management", "team building", "emotional intelligence", "hiring", "talent acquisition",
    "interviewing", "hr-manager"
  ],
  "sales-representative": [
    "sales techniques", "communication", "negotiation", "crm", "lead generation",
    "sales process", "persuasion", "conflict resolution", "cold calling", "sales-representative"
  ],
  "mobile-app-developer": [
    "mobile development", "android", "ios", "react native", "flutter", "swift", "kotlin",
    "mobile ui", "app store", "mobile architecture", "javascript", "mobile-app-developer"
  ],
  "ai-ml-research-scientist": [
    "machine learning", "deep learning", "neural networks", "pytorch", "tensorflow",
    "research", "python", "statistics", "mathematics", "computer vision", "nlp",
    "artificial intelligence", "ai-ml-research-scientist"
  ],
  "blockchain-developer": [
    "blockchain", "solidity", "ethereum", "smart contracts", "web3", "cryptocurrency",
    "distributed systems", "cryptography", "javascript", "defi", "blockchain-developer"
  ],
  "game-developer": [
    "game development", "unity", "unreal engine", "c++", "c#", "game design",
    "3d modeling", "graphics programming", "physics simulation", "game-developer"
  ],
  "embedded-systems-engineer": [
    "embedded systems", "c", "c++", "microcontrollers", "arduino", "raspberry pi",
    "rtos", "firmware", "hardware", "electronics", "iot", "embedded-systems-engineer"
  ],
  "sre": [
    "site reliability", "sre", "devops", "monitoring", "kubernetes", "docker",
    "automation", "linux", "incident management", "observability", "terraform", "sre"
  ],
  "computer-vision-engineer": [
    "computer vision", "opencv", "image processing", "deep learning", "python",
    "neural networks", "object detection", "machine learning", "tensorflow", "pytorch",
    "computer-vision-engineer"
  ],
  "network-security-engineer": [
    "network security", "firewalls", "vpn", "intrusion detection", "penetration testing",
    "cybersecurity", "networking", "tcp/ip", "security protocols", "network-security-engineer"
  ]
};

export const analyzeSkillGaps = (
  interview: InterviewSession,
  answers: Answer[]
): SkillGapAnalysis => {
  const roleId = interview.roleId;
  const requiredSkills = roleSkillMaps[roleId] || [];

  // Calculate overall score from answers
  const validAnswers = answers.filter(a => a.feedback?.overall);
  const overallScore = validAnswers.length > 0
    ? validAnswers.reduce((sum, a) => sum + (a.feedback?.overall || 0), 0) / validAnswers.length
    : 0;

  // Extract strengths and weaknesses from feedback
  const allStrengths: string[] = [];
  const allWeaknesses: string[] = [];

  answers.forEach(answer => {
    if (answer.feedback) {
      if (answer.feedback.strengths) {
        allStrengths.push(...answer.feedback.strengths);
      } else {
        // Fallback: extract positive aspects from suggestions
        allStrengths.push(`Score: ${answer.feedback.overall.toFixed(1)}/10`);
      }

      if (answer.feedback.weaknesses) {
        allWeaknesses.push(...answer.feedback.weaknesses);
      } else {
        // Fallback: use suggestions as areas for improvement
        if (answer.feedback.suggestions) {
          allWeaknesses.push(...answer.feedback.suggestions.slice(0, 2));
        }
      }
    }
  });

  // Identify skill gaps based on weaknesses and role requirements
  const identifiedGaps = identifySkillGaps(allWeaknesses, requiredSkills, overallScore);

  // Generate learning paths
  const learningPaths = generateLearningPaths(identifiedGaps, roleId);

  // Get recommended courses
  const recommendedCourses = getRecommendedCourses(identifiedGaps, roleId, overallScore);

  return {
    overallScore,
    strengths: [...new Set(allStrengths)], // Remove duplicates
    weaknesses: [...new Set(allWeaknesses)],
    learningPaths,
    recommendedCourses
  };
};

const identifySkillGaps = (
  weaknesses: string[],
  requiredSkills: string[],
  overallScore: number
): string[] => {
  const gaps: string[] = [];

  // Based on overall score, identify general areas
  if (overallScore < 6) {
    gaps.push("communication", "problem solving", "technical knowledge");
  } else if (overallScore < 8) {
    gaps.push("advanced concepts", "optimization");
  }

  // Extract skill gaps from weaknesses
  weaknesses.forEach(weakness => {
    const lowerWeakness = weakness.toLowerCase();

    // Technical skills gaps
    if (lowerWeakness.includes("technical") || lowerWeakness.includes("coding")) {
      gaps.push("programming", "data structures", "algorithms");
    }
    if (lowerWeakness.includes("system") || lowerWeakness.includes("architecture")) {
      gaps.push("system design", "scalability");
    }
    if (lowerWeakness.includes("communication") || lowerWeakness.includes("explain")) {
      gaps.push("communication", "presentation skills");
    }
    if (lowerWeakness.includes("leadership") || lowerWeakness.includes("management")) {
      gaps.push("leadership", "project management");
    }
    if (lowerWeakness.includes("data") || lowerWeakness.includes("analysis")) {
      gaps.push("data analysis", "sql", "data visualization");
    }
  });

  // Add role-specific gaps if score is low
  if (overallScore < 7) {
    gaps.push(...requiredSkills.slice(0, 3)); // Add top 3 required skills
  }

  return [...new Set(gaps)]; // Remove duplicates
};

const generateLearningPaths = (skillGaps: string[], roleId: string): LearningPath[] => {
  const paths: LearningPath[] = [];

  // Technical Skills Path
  const technicalSkills = skillGaps.filter(skill =>
    ["programming", "javascript", "python", "data structures", "algorithms", "system design"].includes(skill)
  );

  if (technicalSkills.length > 0) {
    paths.push({
      category: "Technical Skills",
      skillGaps: technicalSkills,
      recommendations: courseDatabase.filter(course =>
        course.skills.some(skill => technicalSkills.includes(skill))
      ).slice(0, 3),
      priority: "High"
    });
  }

  // Soft Skills Path
  const softSkills = skillGaps.filter(skill =>
    ["communication", "leadership", "management", "presentation skills"].includes(skill)
  );

  if (softSkills.length > 0) {
    paths.push({
      category: "Soft Skills & Leadership",
      skillGaps: softSkills,
      recommendations: courseDatabase.filter(course =>
        course.skills.some(skill => softSkills.includes(skill))
      ).slice(0, 3),
      priority: softSkills.includes("communication") ? "High" : "Medium"
    });
  }

  // Role-Specific Path
  const roleSkills = roleSkillMaps[roleId] || [];
  const roleSpecificGaps = skillGaps.filter(skill => roleSkills.includes(skill));

  if (roleSpecificGaps.length > 0) {
    paths.push({
      category: "Role-Specific Skills",
      skillGaps: roleSpecificGaps,
      recommendations: courseDatabase.filter(course =>
        course.skills.some(skill => roleSkills.includes(skill))
      ).slice(0, 3),
      priority: "High"
    });
  }

  return paths;
};

const getRecommendedCourses = (
  skillGaps: string[],
  roleId: string,
  overallScore: number
): CourseRecommendation[] => {
  const roleSkills = roleSkillMaps[roleId] || [];
  const allRelevantSkills = [...new Set([...skillGaps, ...roleSkills])];

  // Filter courses by relevant skills with role-specific prioritization
  const relevantCourses = courseDatabase.filter(course => {
    // Prioritize courses that directly match the role
    const hasRoleMatch = course.skills.includes(roleId);
    const hasSkillMatch = course.skills.some(skill => allRelevantSkills.includes(skill));

    return hasRoleMatch || hasSkillMatch;
  });

  // Sort by relevance and score level
  const sortedCourses = relevantCourses.sort((a, b) => {
    // Highest priority: courses that match the exact role
    const aRoleMatch = a.skills.includes(roleId) ? 100 : 0;
    const bRoleMatch = b.skills.includes(roleId) ? 100 : 0;

    // Second priority: skill gap matches
    const aGapMatches = a.skills.filter(skill => skillGaps.includes(skill)).length * 10;
    const bGapMatches = b.skills.filter(skill => skillGaps.includes(skill)).length * 10;

    // Third priority: general role skill matches
    const aRoleSkillMatches = a.skills.filter(skill => roleSkills.includes(skill)).length * 5;
    const bRoleSkillMatches = b.skills.filter(skill => roleSkills.includes(skill)).length * 5;

    // Fourth priority: free courses get slight boost for accessibility
    const aFreeBonus = a.price === "Free" ? 2 : 0;
    const bFreeBonus = b.price === "Free" ? 2 : 0;

    // Calculate total relevance score
    const aRelevance = aRoleMatch + aGapMatches + aRoleSkillMatches + aFreeBonus + a.rating;
    const bRelevance = bRoleMatch + bGapMatches + bRoleSkillMatches + bFreeBonus + b.rating;

    if (aRelevance !== bRelevance) return bRelevance - aRelevance;

    // Then by level appropriateness
    const levelPriority = overallScore < 6 ? "Beginner" : overallScore < 8 ? "Intermediate" : "Advanced";
    if (a.level === levelPriority && b.level !== levelPriority) return -1;
    if (b.level === levelPriority && a.level !== levelPriority) return 1;

    // Finally by rating
    return b.rating - a.rating;
  });

  return sortedCourses.slice(0, 6); // Return top 6 recommendations
};

// Normalize role names: "Software Engineer" → "software-engineer", "UI/UX Designer" → "ux-designer"
const normalizeRoleId = (role: string): string => {
  const normalized = role.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-').replace(/--+/g, '-');
  // Check direct match first
  if (roleSkillMaps[normalized]) return normalized;
  // Try partial matches
  for (const key of Object.keys(roleSkillMaps)) {
    if (normalized.includes(key) || key.includes(normalized)) return key;
  }
  // Try word-based matching
  const words = normalized.split('-');
  for (const key of Object.keys(roleSkillMaps)) {
    const keyWords = key.split('-');
    const matchCount = words.filter(w => keyWords.includes(w)).length;
    if (matchCount >= 2) return key;
  }
  return normalized;
};

export const generateResumeSkillGaps = (
  detectedSkills: string[],
  targetRole: string,
  atsScore: number,
  aiAnalysis?: any  // Optional AI analysis with improvements and missing_skills_for_target_role
): SkillGapAnalysis => {
  const roleId = normalizeRoleId(targetRole);
  const requiredSkills = roleSkillMaps[roleId] || [];
  
  console.log('🎯 Generating skill gaps:', { 
    targetRole, 
    roleId, 
    requiredSkillsCount: requiredSkills.length,
    detectedSkillsCount: detectedSkills.length,
    atsScore,
    hasAIAnalysis: !!aiAnalysis
  });
  
  // Prioritize AI-generated improvements and missing skills
  let weaknesses: string[] = [];
  
  if (aiAnalysis?.improvements && aiAnalysis.improvements.length > 0) {
    console.log('✅ Using AI-generated improvements from Groq');
    weaknesses = [...aiAnalysis.improvements];
    
    // Also add AI-identified missing skills
    if (aiAnalysis.missing_skills_for_target_role && aiAnalysis.missing_skills_for_target_role.length > 0) {
      console.log('✅ Adding AI-identified missing skills');
      weaknesses = [...weaknesses, ...aiAnalysis.missing_skills_for_target_role];
    }
    
    // Remove duplicates
    weaknesses = [...new Set(weaknesses)];
    console.log('📊 AI-generated weaknesses:', weaknesses);
  } else {
    console.log('⚠️ No AI improvements available, falling back to rule-based analysis');
    
    // Fallback: rule-based missing skills detection
    const missingSkills = requiredSkills.filter(skill =>
      !detectedSkills.some(detected =>
        detected.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(detected.toLowerCase())
      )
    );

    console.log('📊 Missing skills (rule-based):', missingSkills);

    // Enhanced: If score is low, ensure we have weaknesses even if all role skills are present
    weaknesses = missingSkills;
    
    if (atsScore < 70 && weaknesses.length === 0) {
      console.log('⚠️ Low ATS score but no missing skills - generating improvement areas');
      
      // Generate improvement areas based on common requirements
      const improvementAreas = [];
      
      if (atsScore < 40) {
        improvementAreas.push(
          'Resume formatting and structure',
          'Quantifiable achievements',
          'Action verbs and impact statements',
          'Relevant keywords for the role',
          'Professional summary'
        );
      } else if (atsScore < 70) {
        improvementAreas.push(
          'More detailed project descriptions',
          'Quantified results and metrics',
          'Advanced technical skills',
          'Leadership and collaboration examples'
        );
      }
      
      // Add role-specific skills as potential improvements
      if (requiredSkills.length > 0) {
        const additionalSkills = requiredSkills.slice(0, 5).filter(skill => 
          !improvementAreas.includes(skill)
        );
        improvementAreas.push(...additionalSkills);
      }
      
      weaknesses = improvementAreas.slice(0, 8);
      console.log('✅ Generated weaknesses (fallback):', weaknesses);
    }
  }

  const learningPaths = generateLearningPaths(weaknesses, roleId);
  const recommendedCourses = getRecommendedCourses(weaknesses, roleId, atsScore / 10);

  // If no courses from role-based matching, provide general recommendations
  const finalCourses = recommendedCourses.length > 0 ? recommendedCourses :
    courseDatabase
      .filter(c => c.skills.some(s => detectedSkills.some(d => d.toLowerCase().includes(s.toLowerCase()))))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);

  return {
    overallScore: atsScore,
    strengths: detectedSkills,
    weaknesses: weaknesses,
    learningPaths,
    recommendedCourses: finalCourses
  };
};
