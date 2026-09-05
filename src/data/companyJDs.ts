/**
 * Company-Specific Job Descriptions (JDs) for Resume Matching
 * 40+ JDs across 15 major tech companies with real-world requirements
 */

export interface JobRequirement {
  skill: string;
  importance: 'must-have' | 'nice-to-have';
  weight: number; // 1-10 scale
}

export interface CompanyJD {
  id: string;
  company: string;
  companyLogo?: string;
  role: string;
  level: 'entry' | 'mid' | 'senior' | 'lead' | 'principal';
  description: string;
  requirements: JobRequirement[];
  responsibilities: string[];
  preferredQualifications: string[];
  experienceYears: { min: number; max: number };
  salaryRange?: { min: number; max: number; currency: string };
  location: string[];
  remote: boolean;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  description: string;
}

// ==================== COMPANIES ====================
export const COMPANIES: Company[] = [
  { id: 'google', name: 'Google', industry: 'Technology', description: 'Search, cloud, and AI leader' },
  { id: 'meta', name: 'Meta', industry: 'Social Media/VR', description: 'Facebook, Instagram, WhatsApp, and metaverse' },
  { id: 'amazon', name: 'Amazon', industry: 'E-commerce/Cloud', description: 'E-commerce and AWS cloud services' },
  { id: 'microsoft', name: 'Microsoft', industry: 'Technology', description: 'Software, cloud, and enterprise solutions' },
  { id: 'apple', name: 'Apple', industry: 'Hardware/Software', description: 'Consumer electronics and software ecosystem' },
  { id: 'netflix', name: 'Netflix', industry: 'Entertainment', description: 'Streaming and content platform' },
  { id: 'uber', name: 'Uber', industry: 'Transportation', description: 'Ride-sharing and delivery services' },
  { id: 'airbnb', name: 'Airbnb', industry: 'Hospitality', description: 'Travel and accommodation marketplace' },
  { id: 'stripe', name: 'Stripe', industry: 'Fintech', description: 'Payment processing and financial infrastructure' },
  { id: 'salesforce', name: 'Salesforce', industry: 'Enterprise SaaS', description: 'CRM and enterprise cloud platform' },
  { id: 'twitter', name: 'X (Twitter)', industry: 'Social Media', description: 'Microblogging and social platform' },
  { id: 'linkedin', name: 'LinkedIn', industry: 'Professional Network', description: 'Professional networking platform' },
  { id: 'spotify', name: 'Spotify', industry: 'Music Streaming', description: 'Audio streaming and podcasts' },
  { id: 'nvidia', name: 'NVIDIA', industry: 'Hardware/AI', description: 'GPUs and AI computing' },
  { id: 'adobe', name: 'Adobe', industry: 'Creative Software', description: 'Creative and document cloud solutions' },
];

// ==================== JOB DESCRIPTIONS ====================
export const COMPANY_JDS: CompanyJD[] = [
  // ============ GOOGLE ============
  {
    id: 'google-swe-1',
    company: 'Google',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build next-generation technologies that change how billions of users connect, explore, and interact with information.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'must-have', weight: 9 },
      { skill: 'c++', importance: 'nice-to-have', weight: 7 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'distributed systems', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
      { skill: 'sql', importance: 'must-have', weight: 7 },
      { skill: 'linux', importance: 'nice-to-have', weight: 6 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'computer science', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Design and implement large-scale distributed systems',
      'Write high-quality, testable code in Python, Java, or C++',
      'Collaborate with cross-functional teams to define product requirements',
      'Optimize performance and reliability of critical systems',
    ],
    preferredQualifications: [
      'Experience with Google Cloud Platform or similar',
      'Publication in peer-reviewed journals or conferences',
      'PhD in Computer Science or related field',
    ],
    experienceYears: { min: 2, max: 5 },
    salaryRange: { min: 150000, max: 250000, currency: 'USD' },
    location: ['Mountain View, CA', 'New York, NY', 'Seattle, WA'],
    remote: false,
  },
  {
    id: 'google-ml-1',
    company: 'Google',
    role: 'Machine Learning Engineer',
    level: 'senior',
    description: 'Develop cutting-edge ML models that power Google Search, Assistant, and other products used by billions.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'tensorflow', importance: 'must-have', weight: 9 },
      { skill: 'pytorch', importance: 'nice-to-have', weight: 7 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'deep learning', importance: 'must-have', weight: 10 },
      { skill: 'nlp', importance: 'must-have', weight: 8 },
      { skill: 'computer vision', importance: 'nice-to-have', weight: 7 },
      { skill: 'transformers', importance: 'must-have', weight: 9 },
      { skill: 'llm', importance: 'must-have', weight: 9 },
      { skill: 'statistics', importance: 'must-have', weight: 8 },
      { skill: 'data analysis', importance: 'must-have', weight: 7 },
      { skill: 'distributed training', importance: 'nice-to-have', weight: 7 },
    ],
    responsibilities: [
      'Design and train large-scale machine learning models',
      'Develop novel architectures for NLP and multimodal AI',
      'Work closely with research teams to productionize ML models',
      'Mentor junior engineers and contribute to technical strategy',
    ],
    preferredQualifications: [
      'PhD in Machine Learning, AI, or related field',
      'Publications at NeurIPS, ICML, CVPR, or similar',
      'Experience with TPUs and distributed training at scale',
    ],
    experienceYears: { min: 5, max: 10 },
    salaryRange: { min: 200000, max: 400000, currency: 'USD' },
    location: ['Mountain View, CA', 'New York, NY'],
    remote: false,
  },
  {
    id: 'google-frontend-1',
    company: 'Google',
    role: 'Frontend Developer',
    level: 'mid',
    description: 'Build beautiful, performant user interfaces for Google products used by billions worldwide.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'angular', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 8 },
      { skill: 'css', importance: 'must-have', weight: 8 },
      { skill: 'web performance', importance: 'must-have', weight: 8 },
      { skill: 'accessibility', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'responsive design', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Develop responsive, accessible web applications',
      'Optimize front-end performance for Core Web Vitals',
      'Collaborate with UX designers to implement pixel-perfect designs',
      'Write comprehensive unit and integration tests',
    ],
    preferredQualifications: [
      'Experience with Angular Material or similar component libraries',
      'Knowledge of web animation and micro-interactions',
      'Contributions to open-source projects',
    ],
    experienceYears: { min: 2, max: 5 },
    salaryRange: { min: 140000, max: 220000, currency: 'USD' },
    location: ['Mountain View, CA', 'New York, NY'],
    remote: false,
  },
  {
    id: 'google-fullstack-1',
    company: 'Google',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack solutions for Google products, from frontend UIs to backend infrastructure.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'python', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 8 },
      { skill: 'angular', importance: 'nice-to-have', weight: 7 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
      { skill: 'distributed systems', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Design and implement full-stack features across web and mobile',
      'Build scalable backend APIs and frontend interfaces',
      'Optimize performance from database to UI',
      'Collaborate with cross-functional teams on product development',
    ],
    preferredQualifications: [
      'Experience with Google Cloud Platform (GCP)',
      'Knowledge of Kubernetes and containerization',
      'Experience with gRPC and protobuf',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 160000, max: 270000, currency: 'USD' },
    location: ['Mountain View, CA', 'New York, NY', 'Seattle, WA'],
    remote: true,
  },

  // ============ META ============
  {
    id: 'meta-swe-1',
    company: 'Meta',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build products that connect billions of people across Facebook, Instagram, WhatsApp, and Messenger.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'c++', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'nice-to-have', weight: 6 },
      { skill: 'hack', importance: 'nice-to-have', weight: 5 },
      { skill: 'php', importance: 'nice-to-have', weight: 5 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
      { skill: 'sql', importance: 'must-have', weight: 7 },
      { skill: 'distributed systems', importance: 'must-have', weight: 8 },
      { skill: 'git', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build and ship features used by billions of users',
      'Write clean, maintainable code with strong test coverage',
      'Participate in code reviews and design discussions',
      'Move fast and ship products iteratively',
    ],
    preferredQualifications: [
      'Experience at scale (millions+ users)',
      'Mobile development experience (iOS/Android)',
      'GraphQL and Relay experience',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 160000, max: 280000, currency: 'USD' },
    location: ['Menlo Park, CA', 'New York, NY', 'Seattle, WA'],
    remote: false,
  },
  {
    id: 'meta-ml-1',
    company: 'Meta',
    role: 'Machine Learning Engineer',
    level: 'senior',
    description: 'Build AI systems that power content ranking, ads, and AR/VR experiences at Meta.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'pytorch', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'deep learning', importance: 'must-have', weight: 10 },
      { skill: 'recommendation systems', importance: 'must-have', weight: 9 },
      { skill: 'nlp', importance: 'nice-to-have', weight: 7 },
      { skill: 'computer vision', importance: 'nice-to-have', weight: 7 },
      { skill: 'c++', importance: 'must-have', weight: 8 },
      { skill: 'distributed training', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 7 },
      { skill: 'statistics', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Design and implement ML models for ranking and recommendations',
      'Optimize models for inference at scale',
      'Collaborate with product teams to define ML strategy',
      'Contribute to PyTorch ecosystem and open-source',
    ],
    preferredQualifications: [
      'Publications at top ML conferences',
      'Experience with large-scale recommendation systems',
      'Understanding of causal inference and A/B testing',
    ],
    experienceYears: { min: 4, max: 8 },
    salaryRange: { min: 200000, max: 380000, currency: 'USD' },
    location: ['Menlo Park, CA', 'New York, NY'],
    remote: false,
  },
  {
    id: 'meta-frontend-1',
    company: 'Meta',
    role: 'Frontend Developer',
    level: 'mid',
    description: 'Build the user interfaces that billions interact with daily on Facebook, Instagram, and WhatsApp.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'react', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'must-have', weight: 8 },
      { skill: 'relay', importance: 'nice-to-have', weight: 7 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'web performance', importance: 'must-have', weight: 8 },
      { skill: 'git', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build React components for Facebook and Instagram',
      'Implement features that scale to billions of users',
      'Optimize performance using React best practices',
      'Work with GraphQL and Relay for data fetching',
    ],
    preferredQualifications: [
      'Experience with React Native',
      'Knowledge of accessibility standards (WCAG)',
      'Experience with design systems',
    ],
    experienceYears: { min: 2, max: 5 },
    salaryRange: { min: 150000, max: 240000, currency: 'USD' },
    location: ['Menlo Park, CA', 'New York, NY'],
    remote: false,
  },
  {
    id: 'meta-fullstack-1',
    company: 'Meta',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build end-to-end features across the entire tech stack for Meta products used by billions.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'react', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 8 },
      { skill: 'nodejs', importance: 'must-have', weight: 9 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'databases', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Build features from UI to backend APIs and databases',
      'Implement GraphQL APIs and React frontends',
      'Optimize full-stack performance for billions of users',
      'Collaborate with designers, PMs, and engineers across the stack',
    ],
    preferredQualifications: [
      'Experience with Relay and React Native',
      'Knowledge of microservices architecture',
      'Experience with CI/CD and deployment pipelines',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 160000, max: 260000, currency: 'USD' },
    location: ['Menlo Park, CA', 'New York, NY', 'Seattle, WA'],
    remote: true,
  },

  // ============ AMAZON ============
  {
    id: 'amazon-swe-1',
    company: 'Amazon',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build scalable systems that power Amazon retail, AWS, and innovative new products.',
    requirements: [
      { skill: 'java', importance: 'must-have', weight: 10 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'aws', importance: 'must-have', weight: 9 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
      { skill: 'distributed systems', importance: 'must-have', weight: 9 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'nosql', importance: 'must-have', weight: 7 },
      { skill: 'microservices', importance: 'must-have', weight: 8 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Design and implement high-availability distributed systems',
      'Own and operate services following DevOps practices',
      'Write operational runbooks and on-call documentation',
      'Drive technical decisions aligned with Leadership Principles',
    ],
    preferredQualifications: [
      'Experience with DynamoDB, S3, Lambda',
      'Knowledge of event-driven architecture',
      'Experience with CI/CD pipelines',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 140000, max: 240000, currency: 'USD' },
    location: ['Seattle, WA', 'Arlington, VA', 'New York, NY'],
    remote: false,
  },
  {
    id: 'amazon-sde2-1',
    company: 'Amazon',
    role: 'Software Development Engineer II',
    level: 'senior',
    description: 'Lead technical design and implementation of complex systems powering AWS services.',
    requirements: [
      { skill: 'java', importance: 'must-have', weight: 10 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'aws', importance: 'must-have', weight: 10 },
      { skill: 'system design', importance: 'must-have', weight: 10 },
      { skill: 'distributed systems', importance: 'must-have', weight: 10 },
      { skill: 'databases', importance: 'must-have', weight: 8 },
      { skill: 'microservices', importance: 'must-have', weight: 9 },
      { skill: 'leadership', importance: 'must-have', weight: 8 },
      { skill: 'mentoring', importance: 'nice-to-have', weight: 6 },
      { skill: 'technical writing', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Lead design of complex distributed systems',
      'Mentor junior engineers and raise team bar',
      'Define operational excellence standards',
      'Influence technical direction of the team',
    ],
    preferredQualifications: [
      'Experience building AWS services',
      'Track record of delivering complex projects',
      'Strong communication and documentation skills',
    ],
    experienceYears: { min: 5, max: 10 },
    salaryRange: { min: 180000, max: 320000, currency: 'USD' },
    location: ['Seattle, WA', 'Arlington, VA'],
    remote: false,
  },
  {
    id: 'amazon-data-1',
    company: 'Amazon',
    role: 'Data Scientist',
    level: 'mid',
    description: 'Use data to drive business decisions across Amazon retail, supply chain, and customer experience.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'sql', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 9 },
      { skill: 'statistics', importance: 'must-have', weight: 10 },
      { skill: 'data analysis', importance: 'must-have', weight: 9 },
      { skill: 'a/b testing', importance: 'must-have', weight: 8 },
      { skill: 'spark', importance: 'nice-to-have', weight: 7 },
      { skill: 'redshift', importance: 'nice-to-have', weight: 6 },
      { skill: 'data visualization', importance: 'must-have', weight: 7 },
      { skill: 'pandas', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Build ML models to optimize business metrics',
      'Design and analyze A/B experiments',
      'Create dashboards and reporting for stakeholders',
      'Partner with product teams to inform strategy',
    ],
    preferredQualifications: [
      'Experience with large-scale data processing',
      'Industry experience in e-commerce or retail',
      'PhD in quantitative field',
    ],
    experienceYears: { min: 2, max: 5 },
    salaryRange: { min: 140000, max: 220000, currency: 'USD' },
    location: ['Seattle, WA', 'Arlington, VA'],
    remote: false,
  },
  {
    id: 'amazon-fullstack-1',
    company: 'Amazon',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build end-to-end features for Amazon products, leveraging AWS cloud services and modern web technologies.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'must-have', weight: 9 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 8 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'aws', importance: 'must-have', weight: 10 },
      { skill: 'dynamodb', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'microservices', importance: 'must-have', weight: 9 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Design and implement full-stack features for Amazon retail',
      'Build scalable services on AWS infrastructure',
      'Optimize performance and customer experience',
      'Own features from design through deployment',
    ],
    preferredQualifications: [
      'Experience with AWS Lambda and serverless',
      'Knowledge of distributed systems',
      'Experience with high-traffic applications',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 150000, max: 260000, currency: 'USD' },
    location: ['Seattle, WA', 'Arlington, VA', 'Austin, TX'],
    remote: true,
  },
  {
    id: 'amazon-frontend-1',
    company: 'Amazon',
    role: 'Frontend Developer',
    level: 'mid',
    description: 'Build customer-facing web applications for Amazon retail, AWS, and other products used by millions.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'react', importance: 'must-have', weight: 10 },
      { skill: 'html', importance: 'must-have', weight: 9 },
      { skill: 'css', importance: 'must-have', weight: 9 },
      { skill: 'responsive design', importance: 'must-have', weight: 8 },
      { skill: 'webpack', importance: 'must-have', weight: 7 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 8 },
      { skill: 'web performance', importance: 'must-have', weight: 8 },
      { skill: 'accessibility', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build responsive web applications for Amazon products',
      'Optimize frontend performance and page load times',
      'Implement accessible and inclusive user interfaces',
      'Collaborate with UX designers and backend engineers',
    ],
    preferredQualifications: [
      'Experience with AWS services (S3, CloudFront)',
      'Knowledge of web performance optimization',
      'Experience with A/B testing frameworks',
    ],
    experienceYears: { min: 2, max: 5 },
    salaryRange: { min: 140000, max: 240000, currency: 'USD' },
    location: ['Seattle, WA', 'Arlington, VA', 'Austin, TX', 'San Francisco, CA'],
    remote: true,
  },

  // ============ MICROSOFT ============
  {
    id: 'microsoft-swe-1',
    company: 'Microsoft',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build products that empower every person and organization on the planet to achieve more.',
    requirements: [
      { skill: 'c#', importance: 'must-have', weight: 9 },
      { skill: 'dotnet', importance: 'must-have', weight: 9 },
      { skill: 'azure', importance: 'must-have', weight: 9 },
      { skill: 'typescript', importance: 'nice-to-have', weight: 7 },
      { skill: 'python', importance: 'nice-to-have', weight: 6 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Design and implement cloud-based services',
      'Write clean, maintainable C# code',
      'Collaborate with diverse global teams',
      'Contribute to agile development processes',
    ],
    preferredQualifications: [
      'Experience with Azure DevOps',
      'Knowledge of microservices architecture',
      'Experience with Office 365 APIs',
    ],
    experienceYears: { min: 2, max: 5 },
    salaryRange: { min: 130000, max: 210000, currency: 'USD' },
    location: ['Redmond, WA', 'New York, NY', 'Atlanta, GA'],
    remote: true,
  },
  {
    id: 'microsoft-ai-1',
    company: 'Microsoft',
    role: 'AI Engineer',
    level: 'senior',
    description: 'Build AI capabilities for Azure Cognitive Services and Microsoft 365 Copilot.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'deep learning', importance: 'must-have', weight: 10 },
      { skill: 'llm', importance: 'must-have', weight: 10 },
      { skill: 'azure', importance: 'must-have', weight: 9 },
      { skill: 'nlp', importance: 'must-have', weight: 9 },
      { skill: 'pytorch', importance: 'must-have', weight: 8 },
      { skill: 'transformers', importance: 'must-have', weight: 9 },
      { skill: 'onnx', importance: 'nice-to-have', weight: 6 },
      { skill: 'c++', importance: 'nice-to-have', weight: 6 },
    ],
    responsibilities: [
      'Design AI solutions for Azure Cognitive Services',
      'Optimize LLMs for production deployment',
      'Collaborate with OpenAI partnership teams',
      'Define AI ethics and responsible AI practices',
    ],
    preferredQualifications: [
      'Experience with GPT/LLM fine-tuning',
      'Publications in NLP or ML conferences',
      'Experience with ONNX runtime optimization',
    ],
    experienceYears: { min: 5, max: 10 },
    salaryRange: { min: 180000, max: 350000, currency: 'USD' },
    location: ['Redmond, WA', 'San Francisco, CA'],
    remote: false,
  },
  {
    id: 'microsoft-frontend-1',
    company: 'Microsoft',
    role: 'Frontend Developer',
    level: 'mid',
    description: 'Build user interfaces for Microsoft 365, Teams, and Azure Portal.',
    requirements: [
      { skill: 'typescript', importance: 'must-have', weight: 10 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'javascript', importance: 'must-have', weight: 9 },
      { skill: 'html', importance: 'must-have', weight: 8 },
      { skill: 'css', importance: 'must-have', weight: 8 },
      { skill: 'fluent ui', importance: 'nice-to-have', weight: 7 },
      { skill: 'accessibility', importance: 'must-have', weight: 8 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'azure', importance: 'nice-to-have', weight: 5 },
    ],
    responsibilities: [
      'Build accessible, performant web applications',
      'Implement Fluent Design System components',
      'Ensure cross-browser compatibility',
      'Write comprehensive tests with Jest and Playwright',
    ],
    preferredQualifications: [
      'Experience with Fluent UI React',
      'Knowledge of SharePoint Framework (SPFx)',
      'Experience with Teams app development',
    ],
    experienceYears: { min: 2, max: 5 },
    salaryRange: { min: 130000, max: 200000, currency: 'USD' },
    location: ['Redmond, WA', 'New York, NY'],
    remote: true,
  },
  {
    id: 'microsoft-fullstack-1',
    company: 'Microsoft',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build enterprise-grade full-stack solutions across Microsoft products using .NET and Azure.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'c#', importance: 'must-have', weight: 10 },
      { skill: '.net', importance: 'must-have', weight: 10 },
      { skill: 'react', importance: 'must-have', weight: 8 },
      { skill: 'nodejs', importance: 'must-have', weight: 7 },
      { skill: 'azure', importance: 'must-have', weight: 9 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Develop full-stack solutions for Microsoft cloud services',
      'Build web applications using .NET and modern JavaScript frameworks',
      'Deploy and manage services on Azure',
      'Collaborate with teams across Microsoft products',
    ],
    preferredQualifications: [
      'Experience with Azure DevOps and CI/CD',
      'Knowledge of microservices architecture',
      'Experience with Cosmos DB or SQL Server',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 150000, max: 250000, currency: 'USD' },
    location: ['Redmond, WA', 'New York, NY', 'San Francisco, CA'],
    remote: true,
  },

  // ============ APPLE ============
  {
    id: 'apple-swe-1',
    company: 'Apple',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build software that runs on billions of Apple devices worldwide.',
    requirements: [
      { skill: 'swift', importance: 'must-have', weight: 10 },
      { skill: 'objective-c', importance: 'must-have', weight: 8 },
      { skill: 'ios', importance: 'must-have', weight: 9 },
      { skill: 'macos', importance: 'nice-to-have', weight: 7 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'xcode', importance: 'must-have', weight: 8 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'performance optimization', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Design and implement iOS/macOS features',
      'Collaborate with hardware and design teams',
      'Optimize for performance and battery life',
      'Maintain highest privacy and security standards',
    ],
    preferredQualifications: [
      'Experience with Metal or Core ML',
      'Published apps on the App Store',
      'Knowledge of Apple Silicon architecture',
    ],
    experienceYears: { min: 3, max: 7 },
    salaryRange: { min: 150000, max: 280000, currency: 'USD' },
    location: ['Cupertino, CA'],
    remote: false,
  },
  {
    id: 'apple-ml-1',
    company: 'Apple',
    role: 'Machine Learning Engineer',
    level: 'senior',
    description: 'Build on-device ML models for Siri, Photos, and Apple Intelligence.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'swift', importance: 'must-have', weight: 8 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'deep learning', importance: 'must-have', weight: 10 },
      { skill: 'core ml', importance: 'must-have', weight: 9 },
      { skill: 'on-device ml', importance: 'must-have', weight: 9 },
      { skill: 'nlp', importance: 'nice-to-have', weight: 7 },
      { skill: 'computer vision', importance: 'nice-to-have', weight: 7 },
      { skill: 'model optimization', importance: 'must-have', weight: 9 },
      { skill: 'pytorch', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Design ML models optimized for on-device inference',
      'Implement privacy-preserving ML techniques',
      'Collaborate with hardware teams on Neural Engine',
      'Quantize and optimize models for Apple Silicon',
    ],
    preferredQualifications: [
      'Experience with model compression techniques',
      'Publications in on-device ML',
      'Knowledge of differential privacy',
    ],
    experienceYears: { min: 5, max: 10 },
    salaryRange: { min: 200000, max: 380000, currency: 'USD' },
    location: ['Cupertino, CA', 'Seattle, WA'],
    remote: false,
  },
  {
    id: 'apple-fullstack-1',
    company: 'Apple',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack web services and tools that power Apple products and services.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'swift', importance: 'nice-to-have', weight: 7 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 8 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Develop web applications for Apple services',
      'Build backend APIs and infrastructure',
      'Create tools and dashboards for internal teams',
      'Ensure security and privacy in all implementations',
    ],
    preferredQualifications: [
      'Experience with Apple ecosystem (macOS, iOS)',
      'Knowledge of cloud infrastructure',
      'Experience with large-scale systems',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 160000, max: 280000, currency: 'USD' },
    location: ['Cupertino, CA', 'Austin, TX', 'Seattle, WA'],
    remote: true,
  },

  // ============ NETFLIX ============
  {
    id: 'netflix-swe-1',
    company: 'Netflix',
    role: 'Software Engineer',
    level: 'senior',
    description: 'Build the technology platform that delivers entertainment to 230+ million members.',
    requirements: [
      { skill: 'java', importance: 'must-have', weight: 10 },
      { skill: 'python', importance: 'nice-to-have', weight: 7 },
      { skill: 'spring boot', importance: 'must-have', weight: 8 },
      { skill: 'microservices', importance: 'must-have', weight: 9 },
      { skill: 'distributed systems', importance: 'must-have', weight: 10 },
      { skill: 'aws', importance: 'must-have', weight: 9 },
      { skill: 'kafka', importance: 'must-have', weight: 8 },
      { skill: 'databases', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 10 },
      { skill: 'data structures', importance: 'must-have', weight: 9 },
    ],
    responsibilities: [
      'Design highly available microservices',
      'Build systems that scale to millions of concurrent streams',
      'Contribute to Netflix OSS ecosystem',
      'Drive technical excellence in a freedom & responsibility culture',
    ],
    preferredQualifications: [
      'Experience with video streaming architecture',
      'Contributions to Netflix OSS projects',
      'Experience with Chaos Engineering',
    ],
    experienceYears: { min: 5, max: 12 },
    salaryRange: { min: 200000, max: 400000, currency: 'USD' },
    location: ['Los Gatos, CA', 'Los Angeles, CA'],
    remote: false,
  },
  {
    id: 'netflix-data-1',
    company: 'Netflix',
    role: 'Data Scientist',
    level: 'senior',
    description: 'Use data to improve content recommendations and member experience.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'sql', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 9 },
      { skill: 'statistics', importance: 'must-have', weight: 10 },
      { skill: 'recommendation systems', importance: 'must-have', weight: 9 },
      { skill: 'a/b testing', importance: 'must-have', weight: 9 },
      { skill: 'causal inference', importance: 'must-have', weight: 8 },
      { skill: 'spark', importance: 'must-have', weight: 8 },
      { skill: 'data visualization', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build recommendation algorithms for personalization',
      'Design and analyze large-scale experiments',
      'Influence content and product strategy with data',
      'Partner with engineering on ML infrastructure',
    ],
    preferredQualifications: [
      'PhD in Statistics, CS, or related field',
      'Experience with entertainment or media',
      'Publications in recommendation research',
    ],
    experienceYears: { min: 4, max: 10 },
    salaryRange: { min: 180000, max: 350000, currency: 'USD' },
    location: ['Los Gatos, CA'],
    remote: false,
  },
  {
    id: 'netflix-fullstack-1',
    company: 'Netflix',
    role: 'Full Stack Developer',
    level: 'senior',
    description: 'Build full-stack solutions that power content delivery and member experience for 230M+ subscribers.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'must-have', weight: 9 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'microservices', importance: 'must-have', weight: 9 },
      { skill: 'aws', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
    ],
    responsibilities: [
      'Design and build full-stack features for Netflix platform',
      'Optimize streaming experience and content discovery',
      'Build tools and APIs for internal teams',
      'Scale systems to handle global traffic',
    ],
    preferredQualifications: [
      'Experience with high-scale distributed systems',
      'Knowledge of video streaming technologies',
      'Experience with A/B testing frameworks',
    ],
    experienceYears: { min: 3, max: 8 },
    salaryRange: { min: 180000, max: 320000, currency: 'USD' },
    location: ['Los Gatos, CA', 'Los Angeles, CA'],
    remote: true,
  },

  // ============ UBER ============
  {
    id: 'uber-swe-1',
    company: 'Uber',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build the technology that moves millions of people and goods every day.',
    requirements: [
      { skill: 'java', importance: 'must-have', weight: 9 },
      { skill: 'go', importance: 'must-have', weight: 9 },
      { skill: 'python', importance: 'nice-to-have', weight: 7 },
      { skill: 'microservices', importance: 'must-have', weight: 9 },
      { skill: 'distributed systems', importance: 'must-have', weight: 9 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'kafka', importance: 'must-have', weight: 8 },
      { skill: 'databases', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
    ],
    responsibilities: [
      'Build scalable backend services for ride-hailing',
      'Design systems that handle millions of requests',
      'Collaborate with product and data science teams',
      'On-call ownership and operational excellence',
    ],
    preferredQualifications: [
      'Experience with real-time location services',
      'Knowledge of mapping and routing systems',
      'Experience with high-throughput systems',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 140000, max: 240000, currency: 'USD' },
    location: ['San Francisco, CA', 'New York, NY', 'Seattle, WA'],
    remote: false,
  },
  {
    id: 'uber-ml-1',
    company: 'Uber',
    role: 'Machine Learning Engineer',
    level: 'senior',
    description: 'Build ML systems for dynamic pricing, ETA prediction, and fraud detection.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'deep learning', importance: 'must-have', weight: 9 },
      { skill: 'spark', importance: 'must-have', weight: 8 },
      { skill: 'time series', importance: 'must-have', weight: 8 },
      { skill: 'forecasting', importance: 'must-have', weight: 8 },
      { skill: 'pytorch', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'feature engineering', importance: 'must-have', weight: 8 },
      { skill: 'mlops', importance: 'nice-to-have', weight: 7 },
    ],
    responsibilities: [
      'Build ML models for pricing and demand prediction',
      'Design feature pipelines at scale',
      'Deploy models to production serving infrastructure',
      'Partner with product to define ML strategy',
    ],
    preferredQualifications: [
      'Experience with geospatial ML',
      'Knowledge of causal ML methods',
      'Experience with real-time ML serving',
    ],
    experienceYears: { min: 4, max: 8 },
    salaryRange: { min: 180000, max: 320000, currency: 'USD' },
    location: ['San Francisco, CA'],
    remote: false,
  },
  {
    id: 'uber-fullstack-1',
    company: 'Uber',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack solutions for Uber Rides, Eats, and marketplace platforms.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'go', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'microservices', importance: 'must-have', weight: 9 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Develop full-stack features for rider and driver experiences',
      'Build scalable backend services and mobile-web frontends',
      'Optimize performance for real-time systems',
      'Collaborate across product and engineering teams',
    ],
    preferredQualifications: [
      'Experience with real-time data processing',
      'Knowledge of location-based services',
      'Experience with mobile web optimization',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 160000, max: 270000, currency: 'USD' },
    location: ['San Francisco, CA', 'New York, NY', 'Seattle, WA'],
    remote: true,
  },

  // ============ AIRBNB ============
  {
    id: 'airbnb-swe-1',
    company: 'Airbnb',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build the platform that helps people belong anywhere in the world.',
    requirements: [
      { skill: 'ruby', importance: 'must-have', weight: 8 },
      { skill: 'java', importance: 'must-have', weight: 8 },
      { skill: 'python', importance: 'nice-to-have', weight: 6 },
      { skill: 'react', importance: 'must-have', weight: 8 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
      { skill: 'microservices', importance: 'must-have', weight: 7 },
      { skill: 'aws', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build features for hosts and guests platform',
      'Collaborate with design to create delightful experiences',
      'Ensure platform reliability and scalability',
      'Contribute to Airbnb\'s engineering culture',
    ],
    preferredQualifications: [
      'Experience with marketplace platforms',
      'Knowledge of payments systems',
      'Experience with internationalization',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 150000, max: 260000, currency: 'USD' },
    location: ['San Francisco, CA'],
    remote: true,
  },
  {
    id: 'airbnb-data-1',
    company: 'Airbnb',
    role: 'Data Scientist',
    level: 'mid',
    description: 'Use data to improve search, pricing, and trust & safety at Airbnb.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'sql', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 9 },
      { skill: 'statistics', importance: 'must-have', weight: 10 },
      { skill: 'a/b testing', importance: 'must-have', weight: 9 },
      { skill: 'data analysis', importance: 'must-have', weight: 9 },
      { skill: 'spark', importance: 'nice-to-have', weight: 7 },
      { skill: 'airflow', importance: 'nice-to-have', weight: 6 },
      { skill: 'data visualization', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build models for search ranking and pricing',
      'Design experiments to improve user experience',
      'Partner with product to inform strategy',
      'Create dashboards for business stakeholders',
    ],
    preferredQualifications: [
      'Experience with two-sided marketplaces',
      'PhD in quantitative field',
      'Experience with trust & safety ML',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 150000, max: 250000, currency: 'USD' },
    location: ['San Francisco, CA'],
    remote: true,
  },
  {
    id: 'airbnb-fullstack-1',
    company: 'Airbnb',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack solutions for Airbnb platform connecting hosts and travelers worldwide.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'ruby', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Develop full-stack features for host and guest experiences',
      'Build backend APIs and frontend interfaces',
      'Optimize booking flows and search functionality',
      'Ensure trust and safety in platform features',
    ],
    preferredQualifications: [
      'Experience with marketplace platforms',
      'Knowledge of payments and fraud detection',
      'Experience with internationalization',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 160000, max: 270000, currency: 'USD' },
    location: ['San Francisco, CA', 'Seattle, WA'],
    remote: true,
  },

  // ============ STRIPE ============
  {
    id: 'stripe-swe-1',
    company: 'Stripe',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build financial infrastructure that powers millions of businesses worldwide.',
    requirements: [
      { skill: 'ruby', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'nice-to-have', weight: 7 },
      { skill: 'go', importance: 'nice-to-have', weight: 7 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'databases', importance: 'must-have', weight: 9 },
      { skill: 'distributed systems', importance: 'must-have', weight: 9 },
      { skill: 'api design', importance: 'must-have', weight: 9 },
      { skill: 'payments', importance: 'nice-to-have', weight: 7 },
      { skill: 'security', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Build and maintain payment processing systems',
      'Design APIs that developers love',
      'Ensure PCI compliance and security',
      'Write clean, well-documented code',
    ],
    preferredQualifications: [
      'Experience with financial systems',
      'Knowledge of PCI-DSS compliance',
      'Experience with API design',
    ],
    experienceYears: { min: 2, max: 7 },
    salaryRange: { min: 160000, max: 280000, currency: 'USD' },
    location: ['San Francisco, CA', 'Seattle, WA', 'New York, NY'],
    remote: true,
  },
  {
    id: 'stripe-ml-1',
    company: 'Stripe',
    role: 'Machine Learning Engineer',
    level: 'senior',
    description: 'Build ML systems for fraud detection and risk assessment at scale.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'fraud detection', importance: 'must-have', weight: 9 },
      { skill: 'anomaly detection', importance: 'must-have', weight: 9 },
      { skill: 'deep learning', importance: 'nice-to-have', weight: 7 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'spark', importance: 'must-have', weight: 8 },
      { skill: 'real-time ml', importance: 'must-have', weight: 8 },
      { skill: 'statistics', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Build fraud detection models protecting billions in payments',
      'Design real-time ML serving systems',
      'Balance fraud prevention with user experience',
      'Collaborate with risk and product teams',
    ],
    preferredQualifications: [
      'Experience with payments fraud',
      'Knowledge of regulatory requirements',
      'Experience with adversarial ML',
    ],
    experienceYears: { min: 5, max: 10 },
    salaryRange: { min: 200000, max: 350000, currency: 'USD' },
    location: ['San Francisco, CA'],
    remote: true,
  },
  {
    id: 'stripe-fullstack-1',
    company: 'Stripe',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack payment infrastructure and developer tools used by millions of businesses.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'ruby', importance: 'must-have', weight: 9 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 9 },
      { skill: 'graphql', importance: 'nice-to-have', weight: 7 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
    ],
    responsibilities: [
      'Build payment processing infrastructure and APIs',
      'Develop dashboard and developer tools',
      'Ensure reliability and security of financial systems',
      'Create documentation and developer experiences',
    ],
    preferredQualifications: [
      'Experience with payment systems',
      'Knowledge of financial regulations (PCI, SOC2)',
      'Experience with API design',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 160000, max: 280000, currency: 'USD' },
    location: ['San Francisco, CA', 'Seattle, WA', 'New York, NY'],
    remote: true,
  },

  // ============ SALESFORCE ============
  {
    id: 'salesforce-swe-1',
    company: 'Salesforce',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build the #1 CRM platform trusted by companies worldwide.',
    requirements: [
      { skill: 'java', importance: 'must-have', weight: 10 },
      { skill: 'apex', importance: 'must-have', weight: 8 },
      { skill: 'lightning', importance: 'nice-to-have', weight: 7 },
      { skill: 'javascript', importance: 'must-have', weight: 8 },
      { skill: 'data structures', importance: 'must-have', weight: 9 },
      { skill: 'algorithms', importance: 'must-have', weight: 9 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'soql', importance: 'nice-to-have', weight: 6 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build features for Sales Cloud and Service Cloud',
      'Design scalable multi-tenant architecture',
      'Collaborate with product teams on requirements',
      'Ensure platform security and performance',
    ],
    preferredQualifications: [
      'Salesforce certifications',
      'Experience with CRM systems',
      'Enterprise software experience',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 130000, max: 220000, currency: 'USD' },
    location: ['San Francisco, CA', 'Indianapolis, IN', 'Atlanta, GA'],
    remote: true,
  },
  {
    id: 'salesforce-fullstack-1',
    company: 'Salesforce',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack CRM solutions and enterprise applications on the Salesforce platform.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'java', importance: 'must-have', weight: 9 },
      { skill: 'apex', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 8 },
      { skill: 'lightning web components', importance: 'must-have', weight: 8 },
      { skill: 'nodejs', importance: 'nice-to-have', weight: 7 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Develop full-stack features for Salesforce products',
      'Build custom applications on Salesforce platform',
      'Integrate with third-party APIs and services',
      'Optimize performance for enterprise customers',
    ],
    preferredQualifications: [
      'Salesforce certifications',
      'Experience with enterprise software',
      'Knowledge of cloud architecture',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 140000, max: 230000, currency: 'USD' },
    location: ['San Francisco, CA', 'Indianapolis, IN', 'Atlanta, GA'],
    remote: true,
  },

  // ============ X (TWITTER) ============
  {
    id: 'twitter-swe-1',
    company: 'X (Twitter)',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build the platform that serves as the global town square for conversations.',
    requirements: [
      { skill: 'scala', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'must-have', weight: 8 },
      { skill: 'python', importance: 'nice-to-have', weight: 6 },
      { skill: 'distributed systems', importance: 'must-have', weight: 10 },
      { skill: 'microservices', importance: 'must-have', weight: 9 },
      { skill: 'kafka', importance: 'must-have', weight: 8 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
      { skill: 'gcp', importance: 'nice-to-have', weight: 6 },
    ],
    responsibilities: [
      'Build real-time systems processing billions of tweets',
      'Design for extreme scale and reliability',
      'Contribute to open-source infrastructure',
      'Optimize for latency and throughput',
    ],
    preferredQualifications: [
      'Experience with social media platforms',
      'Contributions to open-source',
      'Experience with real-time data processing',
    ],
    experienceYears: { min: 3, max: 7 },
    salaryRange: { min: 150000, max: 280000, currency: 'USD' },
    location: ['San Francisco, CA'],
    remote: true,
  },
  {
    id: 'twitter-fullstack-1',
    company: 'X (Twitter)',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack features for the X platform serving real-time conversations at global scale.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'scala', importance: 'must-have', weight: 8 },
      { skill: 'java', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'nice-to-have', weight: 7 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'nosql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
    ],
    responsibilities: [
      'Build real-time features for timeline and messaging',
      'Develop APIs for web and mobile clients',
      'Optimize performance for high-scale traffic',
      'Ensure reliability and low latency',
    ],
    preferredQualifications: [
      'Experience with real-time systems',
      'Knowledge of social media platforms',
      'Experience with event-driven architecture',
    ],
    experienceYears: { min: 3, max: 7 },
    salaryRange: { min: 160000, max: 280000, currency: 'USD' },
    location: ['San Francisco, CA', 'New York, NY'],
    remote: true,
  },

  // ============ LINKEDIN ============
  {
    id: 'linkedin-swe-1',
    company: 'LinkedIn',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build products that connect the world\'s professionals to opportunity.',
    requirements: [
      { skill: 'java', importance: 'must-have', weight: 10 },
      { skill: 'python', importance: 'nice-to-have', weight: 6 },
      { skill: 'scala', importance: 'nice-to-have', weight: 6 },
      { skill: 'rest', importance: 'must-have', weight: 8 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'distributed systems', importance: 'must-have', weight: 9 },
      { skill: 'kafka', importance: 'must-have', weight: 8 },
      { skill: 'system design', importance: 'must-have', weight: 9 },
      { skill: 'databases', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Build features for LinkedIn Feed and Jobs',
      'Design scalable microservices architecture',
      'Collaborate with AI teams on personalization',
      'Ensure platform reliability at scale',
    ],
    preferredQualifications: [
      'Experience with social networks',
      'Knowledge of graph databases',
      'Experience with recommendation systems',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 140000, max: 240000, currency: 'USD' },
    location: ['Sunnyvale, CA', 'San Francisco, CA', 'New York, NY'],
    remote: true,
  },
  {
    id: 'linkedin-fullstack-1',
    company: 'LinkedIn',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack products connecting professionals to opportunities on LinkedIn platform.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'must-have', weight: 9 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'nice-to-have', weight: 7 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'distributed systems', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Develop features for feed, messaging, and jobs',
      'Build scalable backend services and APIs',
      'Optimize member experience and engagement',
      'Work with cross-functional product teams',
    ],
    preferredQualifications: [
      'Experience with professional networks',
      'Knowledge of recommendation systems',
      'Experience with A/B testing',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 150000, max: 250000, currency: 'USD' },
    location: ['Sunnyvale, CA', 'San Francisco, CA', 'New York, NY'],
    remote: true,
  },

  // ============ SPOTIFY ============
  {
    id: 'spotify-swe-1',
    company: 'Spotify',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build the platform that brings music and podcasts to millions worldwide.',
    requirements: [
      { skill: 'java', importance: 'must-have', weight: 9 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'gcp', importance: 'must-have', weight: 8 },
      { skill: 'kubernetes', importance: 'must-have', weight: 8 },
      { skill: 'microservices', importance: 'must-have', weight: 9 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
      { skill: 'distributed systems', importance: 'must-have', weight: 8 },
      { skill: 'apollo graphql', importance: 'nice-to-have', weight: 6 },
    ],
    responsibilities: [
      'Build backend services for audio streaming',
      'Design for global scale and low latency',
      'Collaborate with product squads',
      'Contribute to Backstage and internal tools',
    ],
    preferredQualifications: [
      'Experience with audio/video streaming',
      'Knowledge of content delivery networks',
      'Experience with A/B testing at scale',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 130000, max: 220000, currency: 'USD' },
    location: ['New York, NY', 'Stockholm, Sweden'],
    remote: true,
  },
  {
    id: 'spotify-ml-1',
    company: 'Spotify',
    role: 'Machine Learning Engineer',
    level: 'senior',
    description: 'Build recommendation and personalization systems for 500M+ users.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'recommendation systems', importance: 'must-have', weight: 10 },
      { skill: 'deep learning', importance: 'must-have', weight: 9 },
      { skill: 'tensorflow', importance: 'must-have', weight: 8 },
      { skill: 'pytorch', importance: 'must-have', weight: 8 },
      { skill: 'nlp', importance: 'nice-to-have', weight: 7 },
      { skill: 'audio processing', importance: 'nice-to-have', weight: 7 },
      { skill: 'spark', importance: 'must-have', weight: 8 },
      { skill: 'gcp', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build Discover Weekly and personalization features',
      'Design ML models for music and podcast discovery',
      'Collaborate with research on novel algorithms',
      'Scale ML systems to serve 500M+ users',
    ],
    preferredQualifications: [
      'PhD in ML or related field',
      'Experience with audio/music ML',
      'Publications in recommendation research',
    ],
    experienceYears: { min: 5, max: 10 },
    salaryRange: { min: 180000, max: 320000, currency: 'USD' },
    location: ['New York, NY', 'Stockholm, Sweden'],
    remote: true,
  },
  {
    id: 'spotify-fullstack-1',
    company: 'Spotify',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack features for music streaming platform serving 500M+ users worldwide.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'must-have', weight: 8 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Develop full-stack features for streaming and discovery',
      'Build APIs for music playback and recommendations',
      'Optimize performance and user experience',
      'Work with data science teams on personalization',
    ],
    preferredQualifications: [
      'Experience with audio processing',
      'Knowledge of recommendation systems',
      'Experience with high-scale consumer apps',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 150000, max: 260000, currency: 'USD' },
    location: ['New York, NY', 'Stockholm, Sweden', 'Los Angeles, CA'],
    remote: true,
  },

  // ============ NVIDIA ============
  {
    id: 'nvidia-swe-1',
    company: 'NVIDIA',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build software that powers AI and graphics computing worldwide.',
    requirements: [
      { skill: 'c++', importance: 'must-have', weight: 10 },
      { skill: 'cuda', importance: 'must-have', weight: 10 },
      { skill: 'python', importance: 'must-have', weight: 8 },
      { skill: 'gpu programming', importance: 'must-have', weight: 10 },
      { skill: 'parallel computing', importance: 'must-have', weight: 9 },
      { skill: 'linux', importance: 'must-have', weight: 8 },
      { skill: 'data structures', importance: 'must-have', weight: 9 },
      { skill: 'algorithms', importance: 'must-have', weight: 9 },
      { skill: 'performance optimization', importance: 'must-have', weight: 9 },
      { skill: 'git', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Develop GPU-accelerated software libraries',
      'Optimize deep learning frameworks for NVIDIA hardware',
      'Collaborate with hardware teams on new architectures',
      'Write high-performance CUDA kernels',
    ],
    preferredQualifications: [
      'Experience with graphics or game engines',
      'PhD in Computer Science or Engineering',
      'Publications in parallel computing',
    ],
    experienceYears: { min: 3, max: 7 },
    salaryRange: { min: 150000, max: 280000, currency: 'USD' },
    location: ['Santa Clara, CA', 'Austin, TX'],
    remote: false,
  },
  {
    id: 'nvidia-ai-1',
    company: 'NVIDIA',
    role: 'AI Research Scientist',
    level: 'senior',
    description: 'Advance the state of the art in AI and accelerate LLM training and inference.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'deep learning', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'pytorch', importance: 'must-have', weight: 10 },
      { skill: 'cuda', importance: 'must-have', weight: 9 },
      { skill: 'llm', importance: 'must-have', weight: 10 },
      { skill: 'transformers', importance: 'must-have', weight: 10 },
      { skill: 'distributed training', importance: 'must-have', weight: 9 },
      { skill: 'c++', importance: 'nice-to-have', weight: 7 },
      { skill: 'triton', importance: 'nice-to-have', weight: 7 },
    ],
    responsibilities: [
      'Research and develop novel AI architectures',
      'Optimize LLM training on multi-GPU clusters',
      'Publish at top AI conferences',
      'Collaborate with NVIDIA Research teams',
    ],
    preferredQualifications: [
      'PhD in ML/AI with publications',
      'Experience with NeMo or Megatron',
      'Experience training 100B+ parameter models',
    ],
    experienceYears: { min: 5, max: 12 },
    salaryRange: { min: 220000, max: 450000, currency: 'USD' },
    location: ['Santa Clara, CA'],
    remote: false,
  },
  {
    id: 'nvidia-fullstack-1',
    company: 'NVIDIA',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack solutions for NVIDIA cloud platforms, developer tools, and AI services.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'python', importance: 'must-have', weight: 9 },
      { skill: 'c++', importance: 'nice-to-have', weight: 7 },
      { skill: 'react', importance: 'must-have', weight: 8 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Develop web applications for NVIDIA cloud services',
      'Build dashboards for GPU monitoring and management',
      'Create developer tools and documentation portals',
      'Integrate GPU computing with web interfaces',
    ],
    preferredQualifications: [
      'Understanding of GPU computing',
      'Experience with cloud platforms',
      'Knowledge of data visualization',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 150000, max: 270000, currency: 'USD' },
    location: ['Santa Clara, CA', 'Austin, TX', 'Seattle, WA'],
    remote: true,
  },

  // ============ ADOBE ============
  {
    id: 'adobe-swe-1',
    company: 'Adobe',
    role: 'Software Engineer',
    level: 'mid',
    description: 'Build creative and document solutions used by millions of creators worldwide.',
    requirements: [
      { skill: 'c++', importance: 'must-have', weight: 9 },
      { skill: 'javascript', importance: 'must-have', weight: 8 },
      { skill: 'typescript', importance: 'nice-to-have', weight: 7 },
      { skill: 'react', importance: 'nice-to-have', weight: 7 },
      { skill: 'data structures', importance: 'must-have', weight: 10 },
      { skill: 'algorithms', importance: 'must-have', weight: 10 },
      { skill: 'graphics programming', importance: 'nice-to-have', weight: 7 },
      { skill: 'performance optimization', importance: 'must-have', weight: 8 },
      { skill: 'git', importance: 'must-have', weight: 7 },
    ],
    responsibilities: [
      'Build features for Creative Cloud applications',
      'Optimize performance for complex creative workflows',
      'Collaborate with design and product teams',
      'Ensure cross-platform compatibility',
    ],
    preferredQualifications: [
      'Experience with graphics programming',
      'Knowledge of image/video processing',
      'Experience with desktop application development',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 130000, max: 220000, currency: 'USD' },
    location: ['San Jose, CA', 'San Francisco, CA', 'Seattle, WA'],
    remote: true,
  },
  {
    id: 'adobe-ai-1',
    company: 'Adobe',
    role: 'AI/ML Engineer',
    level: 'senior',
    description: 'Build AI features for Adobe Sensei and Firefly generative AI.',
    requirements: [
      { skill: 'python', importance: 'must-have', weight: 10 },
      { skill: 'deep learning', importance: 'must-have', weight: 10 },
      { skill: 'machine learning', importance: 'must-have', weight: 10 },
      { skill: 'computer vision', importance: 'must-have', weight: 10 },
      { skill: 'generative ai', importance: 'must-have', weight: 10 },
      { skill: 'diffusion models', importance: 'must-have', weight: 9 },
      { skill: 'pytorch', importance: 'must-have', weight: 9 },
      { skill: 'image processing', importance: 'must-have', weight: 8 },
      { skill: 'c++', importance: 'nice-to-have', weight: 6 },
    ],
    responsibilities: [
      'Build generative AI models for Adobe Firefly',
      'Develop computer vision features for Photoshop/Illustrator',
      'Research and implement state-of-the-art AI techniques',
      'Collaborate with product teams on AI strategy',
    ],
    preferredQualifications: [
      'PhD in Computer Vision or ML',
      'Publications in CVPR/ICCV/SIGGRAPH',
      'Experience with image generation models',
    ],
    experienceYears: { min: 5, max: 10 },
    salaryRange: { min: 180000, max: 350000, currency: 'USD' },
    location: ['San Jose, CA', 'San Francisco, CA'],
    remote: false,
  },
  {
    id: 'adobe-fullstack-1',
    company: 'Adobe',
    role: 'Full Stack Developer',
    level: 'mid',
    description: 'Build full-stack solutions for Adobe Creative Cloud and Document Cloud products.',
    requirements: [
      { skill: 'javascript', importance: 'must-have', weight: 10 },
      { skill: 'typescript', importance: 'must-have', weight: 9 },
      { skill: 'java', importance: 'must-have', weight: 8 },
      { skill: 'react', importance: 'must-have', weight: 9 },
      { skill: 'nodejs', importance: 'must-have', weight: 8 },
      { skill: 'rest api', importance: 'must-have', weight: 8 },
      { skill: 'graphql', importance: 'nice-to-have', weight: 7 },
      { skill: 'sql', importance: 'must-have', weight: 8 },
      { skill: 'html', importance: 'must-have', weight: 7 },
      { skill: 'css', importance: 'must-have', weight: 7 },
      { skill: 'git', importance: 'must-have', weight: 7 },
      { skill: 'testing', importance: 'must-have', weight: 7 },
      { skill: 'system design', importance: 'must-have', weight: 8 },
    ],
    responsibilities: [
      'Develop full-stack features for Creative Cloud services',
      'Build web applications for design and collaboration',
      'Create APIs for creative tools and workflows',
      'Optimize performance for creative content',
    ],
    preferredQualifications: [
      'Experience with design tools or creative software',
      'Knowledge of media processing (images, video)',
      'Experience with cloud storage systems',
    ],
    experienceYears: { min: 2, max: 6 },
    salaryRange: { min: 140000, max: 240000, currency: 'USD' },
    location: ['San Jose, CA', 'San Francisco, CA', 'Seattle, WA'],
    remote: true,
  },
];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get all unique companies from JDs
 */
export function getAllCompanies(): string[] {
  return [...new Set(COMPANY_JDS.map(jd => jd.company))];
}

/**
 * Get all JDs for a specific company
 */
export function getJDsByCompany(company: string): CompanyJD[] {
  return COMPANY_JDS.filter(jd => jd.company.toLowerCase() === company.toLowerCase());
}

/**
 * Get all JDs for a specific role across all companies
 */
export function getJDsByRole(role: string): CompanyJD[] {
  const normalizedRole = role.toLowerCase().replace(/[^a-z\s]/g, '');
  return COMPANY_JDS.filter(jd => {
    const jdRole = jd.role.toLowerCase().replace(/[^a-z\s]/g, '');
    return jdRole.includes(normalizedRole) || normalizedRole.includes(jdRole);
  });
}

/**
 * Get a specific JD by company and role
 */
export function getJD(company: string, role: string): CompanyJD | undefined {
  const normalizedRole = role.toLowerCase().replace(/[^a-z\s]/g, '');
  console.log('🔍 Searching for JD:', { company, role, normalizedRole });
  
  const result = COMPANY_JDS.find(jd => {
    const matchCompany = jd.company.toLowerCase() === company.toLowerCase();
    const jdRole = jd.role.toLowerCase().replace(/[^a-z\s]/g, '');
    const matchRole = jdRole.includes(normalizedRole) || normalizedRole.includes(jdRole);
    
    if (matchCompany) {
      console.log('  Checking JD:', jd.role, 'normalized:', jdRole, 'matches:', matchRole);
    }
    
    return matchCompany && matchRole;
  });
  
  if (result) {
    console.log('✅ Found JD:', result.id);
  } else {
    console.warn('❌ No JD found for', company, role);
    console.warn('Available roles for', company, ':', 
      COMPANY_JDS.filter(j => j.company.toLowerCase() === company.toLowerCase()).map(j => j.role)
    );
  }
  
  return result;
}

/**
 * Score a resume against a specific JD
 * Returns detailed breakdown of must-have vs nice-to-have matches
 */
export interface JDMatchResult {
  overallScore: number;
  mustHaveScore: number;
  niceToHaveScore: number;
  matchedMustHaves: string[];
  missedMustHaves: string[];
  matchedNiceToHaves: string[];
  missedNiceToHaves: string[];
  experienceMatch: boolean;
  recommendation: string;
}

export function scoreResumeAgainstJD(
  resumeSkills: string[],
  resumeExperienceYears: number,
  jd: CompanyJD
): JDMatchResult {
  const normalizedSkills = resumeSkills.map(s => s.toLowerCase().trim());
  
  const mustHaves = jd.requirements.filter(r => r.importance === 'must-have');
  const niceToHaves = jd.requirements.filter(r => r.importance === 'nice-to-have');
  
  const matchedMustHaves: string[] = [];
  const missedMustHaves: string[] = [];
  const matchedNiceToHaves: string[] = [];
  const missedNiceToHaves: string[] = [];
  
  let mustHaveWeightTotal = 0;
  let mustHaveWeightMatched = 0;
  let niceToHaveWeightTotal = 0;
  let niceToHaveWeightMatched = 0;
  
  // Check must-haves
  for (const req of mustHaves) {
    mustHaveWeightTotal += req.weight;
    const skillLower = req.skill.toLowerCase();
    const isMatched = normalizedSkills.some(s => 
      s.includes(skillLower) || skillLower.includes(s) ||
      // Handle common aliases
      (skillLower === 'javascript' && s.includes('js')) ||
      (skillLower === 'typescript' && s.includes('ts')) ||
      (skillLower === 'c#' && s.includes('csharp')) ||
      (skillLower === 'c++' && (s.includes('cpp') || s === 'c++')) ||
      (skillLower === 'dotnet' && (s.includes('.net') || s.includes('dot net'))) ||
      (skillLower === 'nodejs' && (s.includes('node') || s.includes('node.js'))) ||
      (skillLower === 'machine learning' && (s.includes('ml') || s.includes('machine learning'))) ||
      (skillLower === 'deep learning' && (s.includes('dl') || s.includes('deep learning'))) ||
      (skillLower === 'artificial intelligence' && (s.includes('ai') || s.includes('artificial intelligence')))
    );
    
    if (isMatched) {
      matchedMustHaves.push(req.skill);
      mustHaveWeightMatched += req.weight;
    } else {
      missedMustHaves.push(req.skill);
    }
  }
  
  // Check nice-to-haves
  for (const req of niceToHaves) {
    niceToHaveWeightTotal += req.weight;
    const skillLower = req.skill.toLowerCase();
    const isMatched = normalizedSkills.some(s => 
      s.includes(skillLower) || skillLower.includes(s)
    );
    
    if (isMatched) {
      matchedNiceToHaves.push(req.skill);
      niceToHaveWeightMatched += req.weight;
    } else {
      missedNiceToHaves.push(req.skill);
    }
  }
  
  // Calculate scores
  const mustHaveScore = mustHaveWeightTotal > 0 
    ? Math.round((mustHaveWeightMatched / mustHaveWeightTotal) * 100) 
    : 0;
  const niceToHaveScore = niceToHaveWeightTotal > 0 
    ? Math.round((niceToHaveWeightMatched / niceToHaveWeightTotal) * 100) 
    : 0;
  
  // Overall score: 70% must-haves, 30% nice-to-haves
  const overallScore = Math.round(mustHaveScore * 0.7 + niceToHaveScore * 0.3);
  
  // Experience match
  const experienceMatch = resumeExperienceYears >= jd.experienceYears.min && 
                          resumeExperienceYears <= jd.experienceYears.max + 2;
  
  // Generate recommendation
  let recommendation: string;
  if (overallScore >= 80 && experienceMatch) {
    recommendation = '🏆 Strong Match! Your profile aligns well with this role. Apply with confidence!';
  } else if (overallScore >= 60 && experienceMatch) {
    recommendation = '✅ Good Match. Focus on highlighting your matching skills in your application.';
  } else if (overallScore >= 40) {
    recommendation = '⚠️ Partial Match. Consider building skills in: ' + missedMustHaves.slice(0, 3).join(', ');
  } else {
    recommendation = '📚 Growth Opportunity. This role requires skills you\'re still developing. Keep learning!';
  }
  
  return {
    overallScore,
    mustHaveScore,
    niceToHaveScore,
    matchedMustHaves,
    missedMustHaves,
    matchedNiceToHaves,
    missedNiceToHaves,
    experienceMatch,
    recommendation,
  };
}

/**
 * Find best matching roles for a resume across all companies
 */
export interface RoleRecommendation {
  jd: CompanyJD;
  matchResult: JDMatchResult;
}

export function findBestRolesForResume(
  resumeSkills: string[],
  resumeExperienceYears: number,
  limit: number = 15
): RoleRecommendation[] {
  const recommendations: RoleRecommendation[] = [];
  
  for (const jd of COMPANY_JDS) {
    const matchResult = scoreResumeAgainstJD(resumeSkills, resumeExperienceYears, jd);
    recommendations.push({ jd, matchResult });
  }
  
  // Sort by overall score descending
  recommendations.sort((a, b) => b.matchResult.overallScore - a.matchResult.overallScore);
  
  return recommendations.slice(0, limit);
}

/**
 * Get role categories for grouping
 */
export function getRoleCategories(): Record<string, string[]> {
  return {
    'Software Engineering': ['Software Engineer', 'Software Development Engineer II', 'Frontend Developer'],
    'Machine Learning & AI': ['Machine Learning Engineer', 'AI Engineer', 'AI Research Scientist', 'AI/ML Engineer'],
    'Data Science': ['Data Scientist'],
  };
}
