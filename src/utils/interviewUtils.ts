
// This file contains utility functions for working with interview data

// Since you mentioned that I can't modify interviewUtils.ts directly, I'll add the functions I need here
// and show what changes you should make to the originals when necessary

import { InterviewSession, Question, Answer, Feedback, JobRole, InterviewOutcome } from "@/types";
import { detectAIGeneratedAdvanced, detectTechnicalBuzzwords } from "./aiDetection";
import { 
  GeneratedQuestion, 
  AIEvaluationResult,
  BatchEvaluationInput 
} from "./geminiService";
import { 
  generateQuestions as generateQuestionsWithOpenAI,
  evaluateAnswer as evaluateAnswerWithOpenAI,
  evaluateBatchAnswers as evaluateBatchAnswersWithGemini,
} from "./aiProviderService";
import { v4 as uuidv4 } from 'uuid';

// Define job roles with their details
export const jobRoles: JobRole[] = [
  {
    id: "software-engineer",
    title: "Software Engineer",
    icon: "code",
    description: "Backend, frontend, and full-stack development roles"
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    icon: "bar-chart",
    description: "Data processing, visualization, and business intelligence"
  },
  {
    id: "ux-designer",
    title: "UX Designer",
    icon: "layout",
    description: "User interface and user experience design"
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    icon: "database",
    description: "Machine learning, statistical analysis, and predictive modeling"
  },
  {
    id: "product-manager",
    title: "Product Manager",
    icon: "package",
    description: "Product development, roadmaps, and go-to-market strategy"
  },
  {
    id: "marketing-manager",
    title: "Marketing Manager",
    icon: "megaphone",
    description: "Digital marketing strategies and campaigns"
  },
  {
    id: "sales-representative",
    title: "Sales Representative",
    icon: "briefcase",
    description: "Sales, lead generation, and customer relationships"
  },
  {
    id: "hr-manager",
    title: "HR Manager",
    icon: "users",
    description: "Human resources and talent management"
  },
  {
    id: "cloud-engineer",
    title: "Cloud Engineer",
    icon: "cloud",
    description: "Cloud infrastructure and platform solutions"
  },
  {
    id: "cybersecurity-analyst",
    title: "Cybersecurity Analyst",
    icon: "shield",
    description: "Information security and threat analysis"
  },
  {
    id: "business-analyst",
    title: "Business Analyst",
    icon: "trending-up",
    description: "Business requirements and process improvement"
  },
  {
    id: "devops-engineer",
    title: "DevOps Engineer",
    icon: "settings",
    description: "CI/CD pipelines, automation, and infrastructure as code"
  },
  {
    id: "full-stack-developer",
    title: "Full Stack Developer",
    icon: "layers",
    description: "Frontend and backend development with modern stacks"
  },
  {
    id: "mobile-app-developer",
    title: "Mobile App Developer",
    icon: "smartphone",
    description: "iOS, Android, and cross-platform mobile development"
  },
  {
    id: "ai-ml-research-scientist",
    title: "AI/ML Research Scientist",
    icon: "brain",
    description: "Deep learning research and AI algorithm development"
  },
  {
    id: "blockchain-developer",
    title: "Blockchain Developer",
    icon: "link",
    description: "Ethereum, smart contracts, and decentralized applications"
  },
  {
    id: "game-developer",
    title: "Game Developer",
    icon: "gamepad-2",
    description: "Game engines, graphics programming, and AR/VR"
  },
  {
    id: "embedded-systems-engineer",
    title: "Embedded Systems Engineer",
    icon: "cpu",
    description: "Microcontrollers, IoT, and hardware programming"
  },
  {
    id: "sre",
    title: "Site Reliability Engineer",
    icon: "activity",
    description: "System monitoring, scalability, and performance optimization"
  },
  {
    id: "computer-vision-engineer",
    title: "Computer Vision Engineer",
    icon: "eye",
    description: "Image processing, object detection, and deep learning for vision"
  },
  {
    id: "network-security-engineer",
    title: "Network Security Engineer",
    icon: "lock",
    description: "Network protocols, firewalls, and intrusion detection"
  },
  {
    id: "qa-engineer",
    title: "Quality Assurance Engineer",
    icon: "check-circle",
    description: "Test automation, performance testing, and quality assurance"
  }
];

// Question banks for each role
const questionBanks: Record<string, Question[]> = {
  "software-engineer": [
    { id: "se-1", text: "Explain the difference between inheritance and composition in object-oriented programming.", category: "technical" },
    { id: "se-2", text: "How would you optimize a website's performance?", category: "technical" },
    { id: "se-3", text: "Describe a challenging programming bug you've faced and how you resolved it.", category: "behavioral" },
    { id: "se-4", text: "What's your approach to testing and quality assurance?", category: "technical" },
    { id: "se-5", text: "Tell me about a time when you had to meet a tight deadline for a coding project.", category: "behavioral" },
    { id: "se-6", text: "Explain RESTful API design principles.", category: "technical" },
    { id: "se-7", text: "How do you handle code reviews and feedback from team members?", category: "behavioral" },
    { id: "se-8", text: "Describe your experience with agile development methodologies.", category: "behavioral" },
    { id: "se-9", text: "How would you design a scalable database system?", category: "technical" },
    { id: "se-10", text: "What new programming languages or frameworks are you interested in learning and why?", category: "behavioral" },
    { id: "se-11", text: "How do you stay updated with the latest trends in software development?", category: "behavioral" },
    { id: "se-12", text: "Explain the concept of microservices architecture.", category: "technical" },
    { id: "se-13", text: "How would you handle a situation where your team members disagree on a technical approach?", category: "situational" },
    { id: "se-14", text: "Describe your experience with version control systems.", category: "technical" },
    { id: "se-15", text: "What security considerations do you take into account when developing an application?", category: "technical" }
  ],
  "data-analyst": [
    { id: "da-1", text: "How do you approach cleaning and preprocessing a messy dataset?", category: "technical" },
    { id: "da-2", text: "Explain the difference between supervised and unsupervised learning.", category: "technical" },
    { id: "da-3", text: "Describe a complex data analysis project you've worked on.", category: "behavioral" },
    { id: "da-4", text: "How do you communicate technical findings to non-technical stakeholders?", category: "behavioral" },
    { id: "da-5", text: "What visualization tools do you have experience with?", category: "technical" },
    { id: "da-6", text: "How would you detect and handle outliers in a dataset?", category: "technical" },
    { id: "da-7", text: "Explain the concept of statistical significance and how you apply it.", category: "technical" },
    { id: "da-8", text: "How do you approach feature selection for a machine learning model?", category: "technical" },
    { id: "da-9", text: "Tell me about a time when your data analysis led to a significant business decision.", category: "behavioral" },
    { id: "da-10", text: "How do you ensure the quality and reliability of your data?", category: "technical" },
    { id: "da-11", text: "What's your experience with SQL and database querying?", category: "technical" },
    { id: "da-12", text: "How do you handle missing data in your analyses?", category: "technical" },
    { id: "da-13", text: "Describe how you would design a dashboard for tracking key business metrics.", category: "technical" },
    { id: "da-14", text: "How do you stay updated on new statistical methods and data analysis techniques?", category: "behavioral" },
    { id: "da-15", text: "What ethical considerations do you take into account when analyzing sensitive data?", category: "behavioral" }
  ],
  "ui-ux-designer": [
    { id: "ux-1", text: "Walk me through your design process for a recent project.", category: "behavioral" },
    { id: "ux-2", text: "How do you incorporate user feedback into your designs?", category: "behavioral" },
    { id: "ux-3", text: "What methods do you use for usability testing?", category: "technical" },
    { id: "ux-4", text: "How do you ensure your designs are accessible to all users?", category: "technical" },
    { id: "ux-5", text: "Describe a situation where you had to defend a design decision.", category: "behavioral" },
    { id: "ux-6", text: "How do you approach designing for different platforms and screen sizes?", category: "technical" },
    { id: "ux-7", text: "What design systems or frameworks do you prefer working with and why?", category: "technical" },
    { id: "ux-8", text: "How do you collaborate with developers to ensure your designs are implemented correctly?", category: "behavioral" },
    { id: "ux-9", text: "Tell me about a time when you had to simplify a complex user interface.", category: "behavioral" },
    { id: "ux-10", text: "What metrics do you use to measure the success of your designs?", category: "technical" },
    { id: "ux-11", text: "How do you stay updated with current design trends and best practices?", category: "behavioral" },
    { id: "ux-12", text: "Describe how you would create a design system from scratch.", category: "technical" },
    { id: "ux-13", text: "How do you handle stakeholder requests that might negatively impact user experience?", category: "situational" },
    { id: "ux-14", text: "What role does animation and motion play in your design approach?", category: "technical" },
    { id: "ux-15", text: "How do you design for users with different levels of technical expertise?", category: "technical" }
  ],
  "ml-engineer": [
    { id: "ml-1", text: "Explain how gradient descent works in machine learning algorithms.", category: "technical" },
    { id: "ml-2", text: "How do you handle overfitting in a model?", category: "technical" },
    { id: "ml-3", text: "Describe a machine learning project you've worked on from data collection to deployment.", category: "behavioral" },
    { id: "ml-4", text: "How do you approach feature engineering?", category: "technical" },
    { id: "ml-5", text: "What challenges have you faced when deploying machine learning models to production?", category: "behavioral" },
    { id: "ml-6", text: "Explain the difference between precision and recall in classification problems.", category: "technical" },
    { id: "ml-7", text: "How do you evaluate the performance of a regression model?", category: "technical" },
    { id: "ml-8", text: "Describe your experience with deep learning frameworks.", category: "technical" },
    { id: "ml-9", text: "How do you handle imbalanced datasets?", category: "technical" },
    { id: "ml-10", text: "Tell me about a time when you had to optimize a model for performance or resource constraints.", category: "behavioral" },
    { id: "ml-11", text: "How do you approach hyperparameter tuning?", category: "technical" },
    { id: "ml-12", text: "Explain the concept of transfer learning and when you would use it.", category: "technical" },
    { id: "ml-13", text: "How do you ensure fairness and mitigate bias in machine learning models?", category: "technical" },
    { id: "ml-14", text: "What experience do you have with unsupervised learning techniques?", category: "technical" },
    { id: "ml-15", text: "How do you stay updated with the latest research and advancements in machine learning?", category: "behavioral" }
  ],
  "product-manager": [
    { id: "pm-1", text: "How do you prioritize features in a product roadmap?", category: "technical" },
    { id: "pm-2", text: "Tell me about a product you launched from concept to market.", category: "behavioral" },
    { id: "pm-3", text: "How do you gather and incorporate user feedback?", category: "technical" },
    { id: "pm-4", text: "Describe how you work with designers and engineers.", category: "behavioral" },
    { id: "pm-5", text: "How do you measure the success of a product?", category: "technical" },
    { id: "pm-6", text: "Tell me about a time when you had to make a difficult decision about a product feature.", category: "behavioral" },
    { id: "pm-7", text: "How do you approach competitive analysis?", category: "technical" },
    { id: "pm-8", text: "Describe your experience with agile product development.", category: "behavioral" },
    { id: "pm-9", text: "How do you balance user needs with business goals?", category: "technical" },
    { id: "pm-10", text: "Tell me about a product challenge you faced and how you overcame it.", category: "behavioral" },
    { id: "pm-11", text: "How do you create and communicate product vision to stakeholders?", category: "behavioral" },
    { id: "pm-12", text: "What methods do you use for user research and validation?", category: "technical" },
    { id: "pm-13", text: "How do you handle situations where development takes longer than expected?", category: "situational" },
    { id: "pm-14", text: "Describe your approach to pricing strategies for products.", category: "technical" },
    { id: "pm-15", text: "How do you stay updated with market trends and customer needs?", category: "behavioral" }
  ],
  "cloud-engineer": [
    { id: "ce-1", text: "How do you approach setting up a secure cloud infrastructure?", category: "technical" },
    { id: "ce-2", text: "Explain the concept of Infrastructure as Code and its benefits.", category: "technical" },
    { id: "ce-3", text: "How do you handle cloud service outages or failures?", category: "technical" },
    { id: "ce-4", text: "Tell me about a complex cloud migration project you've worked on.", category: "behavioral" },
    { id: "ce-5", text: "How do you optimize costs in cloud environments?", category: "technical" },
    { id: "ce-6", text: "What experience do you have with containerization and orchestration?", category: "technical" },
    { id: "ce-7", text: "How do you approach disaster recovery planning in the cloud?", category: "technical" },
    { id: "ce-8", text: "Describe a situation where you improved cloud performance or reliability.", category: "behavioral" },
    { id: "ce-9", text: "How do you monitor and log cloud resources and applications?", category: "technical" },
    { id: "ce-10", text: "What's your experience with multi-cloud strategies?", category: "technical" },
    { id: "ce-11", text: "How do you stay updated with new cloud services and features?", category: "behavioral" },
    { id: "ce-12", text: "Explain your approach to automation in cloud environments.", category: "technical" },
    { id: "ce-13", text: "How would you handle a security breach in a cloud environment?", category: "situational" },
    { id: "ce-14", text: "Describe your experience with serverless architecture.", category: "technical" },
    { id: "ce-15", text: "How do you approach capacity planning in the cloud?", category: "technical" }
  ],
  "cybersecurity-analyst": [
    { id: "ca-1", text: "How do you stay current with emerging security threats and vulnerabilities?", category: "behavioral" },
    { id: "ca-2", text: "Explain how you would conduct a security risk assessment.", category: "technical" },
    { id: "ca-3", text: "Describe your experience with incident response.", category: "behavioral" },
    { id: "ca-4", text: "How do you approach vulnerability scanning and penetration testing?", category: "technical" },
    { id: "ca-5", text: "Tell me about a time when you identified and mitigated a security threat.", category: "behavioral" },
    { id: "ca-6", text: "What's your approach to security awareness training for employees?", category: "technical" },
    { id: "ca-7", text: "How do you implement and manage security controls?", category: "technical" },
    { id: "ca-8", text: "Describe your experience with compliance frameworks like NIST, ISO, or GDPR.", category: "technical" },
    { id: "ca-9", text: "How would you respond to a ransomware attack?", category: "situational" },
    { id: "ca-10", text: "What tools and technologies do you use for security monitoring?", category: "technical" },
    { id: "ca-11", text: "How do you balance security measures with user experience?", category: "technical" },
    { id: "ca-12", text: "Describe your approach to identity and access management.", category: "technical" },
    { id: "ca-13", text: "How do you communicate security risks to non-technical stakeholders?", category: "behavioral" },
    { id: "ca-14", text: "What's your experience with cloud security challenges?", category: "technical" },
    { id: "ca-15", text: "How do you approach secure software development practices?", category: "technical" }
  ],
  "business-analyst": [
    { id: "ba-1", text: "How do you gather and document business requirements?", category: "technical" },
    { id: "ba-2", text: "Tell me about a time when you had to analyze complex business processes.", category: "behavioral" },
    { id: "ba-3", text: "How do you prioritize and manage competing requirements from different stakeholders?", category: "behavioral" },
    { id: "ba-4", text: "Describe your experience with process improvement methodologies.", category: "technical" },
    { id: "ba-5", text: "How do you translate business needs into technical requirements?", category: "technical" },
    { id: "ba-6", text: "Tell me about a project where your analysis led to significant business improvements.", category: "behavioral" },
    { id: "ba-7", text: "What tools and techniques do you use for data analysis?", category: "technical" },
    { id: "ba-8", text: "How do you approach stakeholder management?", category: "behavioral" },
    { id: "ba-9", text: "Describe your experience with creating use cases and user stories.", category: "technical" },
    { id: "ba-10", text: "How do you validate that a solution meets the business requirements?", category: "technical" },
    { id: "ba-11", text: "Tell me about a time when you had to manage changing requirements.", category: "behavioral" },
    { id: "ba-12", text: "What's your approach to cost-benefit analysis?", category: "technical" },
    { id: "ba-13", text: "How do you communicate complex analysis to different audiences?", category: "behavioral" },
    { id: "ba-14", text: "Describe your experience with requirements elicitation techniques.", category: "technical" },
    { id: "ba-15", text: "How do you stay updated with industry trends and best practices?", category: "behavioral" }
  ],
  "hr-executive": [
    { id: "hr-1", text: "How do you approach creating and implementing HR policies?", category: "technical" },
    { id: "hr-2", text: "Tell me about a challenging employee relations issue you've handled.", category: "behavioral" },
    { id: "hr-3", text: "How do you design and implement effective training programs?", category: "technical" },
    { id: "hr-4", text: "Describe your approach to talent acquisition and retention.", category: "technical" },
    { id: "hr-5", text: "How do you handle sensitive employee data and maintain confidentiality?", category: "behavioral" },
    { id: "hr-6", text: "Tell me about a time when you had to manage a complex organizational change.", category: "behavioral" },
    { id: "hr-7", text: "How do you approach performance management and employee development?", category: "technical" },
    { id: "hr-8", text: "What's your experience with HR analytics and metrics?", category: "technical" },
    { id: "hr-9", text: "How do you ensure compliance with employment laws and regulations?", category: "technical" },
    { id: "hr-10", text: "Describe a situation where you improved employee engagement or satisfaction.", category: "behavioral" },
    { id: "hr-11", text: "How do you approach diversity and inclusion initiatives?", category: "technical" },
    { id: "hr-12", text: "Tell me about your experience with compensation and benefits planning.", category: "technical" },
    { id: "hr-13", text: "How would you handle a situation involving workplace misconduct?", category: "situational" },
    { id: "hr-14", text: "What HRIS systems have you worked with?", category: "technical" },
    { id: "hr-15", text: "How do you stay updated with HR trends and best practices?", category: "behavioral" }
  ],
  "digital-marketer": [
    { id: "dm-1", text: "How do you develop and implement a digital marketing strategy?", category: "technical" },
    { id: "dm-2", text: "Tell me about a successful marketing campaign you've led.", category: "behavioral" },
    { id: "dm-3", text: "How do you measure the ROI of marketing activities?", category: "technical" },
    { id: "dm-4", text: "What's your approach to SEO and content marketing?", category: "technical" },
    { id: "dm-5", text: "Describe your experience with social media marketing and engagement.", category: "technical" },
    { id: "dm-6", text: "How do you approach A/B testing and optimization?", category: "technical" },
    { id: "dm-7", text: "Tell me about a time when a marketing initiative didn't work as expected and how you handled it.", category: "behavioral" },
    { id: "dm-8", text: "What analytics tools do you use to track marketing performance?", category: "technical" },
    { id: "dm-9", text: "How do you approach customer segmentation and targeting?", category: "technical" },
    { id: "dm-10", text: "Describe your experience with email marketing campaigns.", category: "technical" },
    { id: "dm-11", text: "How do you stay updated with digital marketing trends and platform changes?", category: "behavioral" },
    { id: "dm-12", text: "What's your approach to managing marketing budgets?", category: "technical" },
    { id: "dm-13", text: "How would you handle negative feedback or a PR crisis on social media?", category: "situational" },
    { id: "dm-14", text: "Describe your experience with paid advertising platforms.", category: "technical" },
    { id: "dm-15", text: "How do you collaborate with sales teams to ensure marketing-sales alignment?", category: "behavioral" }
  ],
  "devops-engineer": [
    { id: "devops-1", text: "Explain your experience with CI/CD pipeline setup and management.", category: "technical" },
    { id: "devops-2", text: "How do you approach infrastructure as code? What tools have you used?", category: "technical" },
    { id: "devops-3", text: "Describe a time when you automated a manual deployment process.", category: "behavioral" },
    { id: "devops-4", text: "How do you handle production incidents and post-mortem analysis?", category: "technical" },
    { id: "devops-5", text: "What's your experience with containerization using Docker?", category: "technical" },
    { id: "devops-6", text: "How do you manage Kubernetes clusters in production?", category: "technical" },
    { id: "devops-7", text: "Describe your approach to monitoring and alerting systems.", category: "technical" },
    { id: "devops-8", text: "How do you ensure security in your DevOps practices?", category: "technical" },
    { id: "devops-9", text: "Tell me about a time when you improved deployment frequency or reliability.", category: "behavioral" },
    { id: "devops-10", text: "How do you approach configuration management across environments?", category: "technical" },
    { id: "devops-11", text: "What's your experience with cloud platforms like AWS, Azure, or GCP?", category: "technical" },
    { id: "devops-12", text: "How do you balance speed of delivery with system stability?", category: "behavioral" },
    { id: "devops-13", text: "Describe a situation where a deployment went wrong and how you recovered.", category: "situational" },
    { id: "devops-14", text: "How do you collaborate with development teams to improve their workflow?", category: "behavioral" },
    { id: "devops-15", text: "What strategies do you use for database migrations and schema changes?", category: "technical" },
    { id: "devops-16", text: "How do you manage secrets and sensitive configuration data?", category: "technical" },
    { id: "devops-17", text: "Describe your experience with GitOps practices.", category: "technical" },
    { id: "devops-18", text: "How do you optimize cloud infrastructure costs?", category: "technical" }
  ],
  "full-stack-developer": [
    { id: "fs-1", text: "Describe your experience with both frontend and backend technologies.", category: "technical" },
    { id: "fs-2", text: "How do you decide between different tech stacks for a new project?", category: "technical" },
    { id: "fs-3", text: "Explain how you would design a RESTful API for a social media application.", category: "technical" },
    { id: "fs-4", text: "What's your approach to database schema design?", category: "technical" },
    { id: "fs-5", text: "How do you handle state management in complex frontend applications?", category: "technical" },
    { id: "fs-6", text: "Describe a full-stack project you've built from scratch.", category: "behavioral" },
    { id: "fs-7", text: "How do you ensure API security and authentication?", category: "technical" },
    { id: "fs-8", text: "What's your experience with modern frontend frameworks like React, Vue, or Angular?", category: "technical" },
    { id: "fs-9", text: "How do you approach performance optimization across the stack?", category: "technical" },
    { id: "fs-10", text: "Describe your experience with real-time features using WebSockets or similar.", category: "technical" },
    { id: "fs-11", text: "How do you handle error handling and logging in production applications?", category: "technical" },
    { id: "fs-12", text: "What's your approach to testing in full-stack applications?", category: "technical" },
    { id: "fs-13", text: "Tell me about a time when you had to debug a complex issue across multiple layers.", category: "behavioral" },
    { id: "fs-14", text: "How do you stay updated with rapidly changing web technologies?", category: "behavioral" },
    { id: "fs-15", text: "Describe your experience with cloud deployment and DevOps practices.", category: "technical" },
    { id: "fs-16", text: "How would you handle a situation where frontend and backend teams disagree on API design?", category: "situational" },
    { id: "fs-17", text: "What's your approach to mobile-first and responsive design?", category: "technical" },
    { id: "fs-18", text: "How do you manage database migrations in production?", category: "technical" }
  ],
  "mobile-app-developer": [
    { id: "mob-1", text: "What's your experience with native vs. cross-platform mobile development?", category: "technical" },
    { id: "mob-2", text: "How do you approach mobile app performance optimization?", category: "technical" },
    { id: "mob-3", text: "Describe your experience with React Native or Flutter.", category: "technical" },
    { id: "mob-4", text: "How do you handle different screen sizes and device orientations?", category: "technical" },
    { id: "mob-5", text: "What's your approach to offline functionality in mobile apps?", category: "technical" },
    { id: "mob-6", text: "Describe a challenging mobile app project you've worked on.", category: "behavioral" },
    { id: "mob-7", text: "How do you manage app state and data persistence?", category: "technical" },
    { id: "mob-8", text: "What's your experience with mobile app testing strategies?", category: "technical" },
    { id: "mob-9", text: "How do you handle push notifications and background tasks?", category: "technical" },
    { id: "mob-10", text: "Describe your approach to mobile UI/UX design principles.", category: "technical" },
    { id: "mob-11", text: "How do you optimize mobile apps for battery life?", category: "technical" },
    { id: "mob-12", text: "What's your experience with app store submission and review processes?", category: "technical" },
    { id: "mob-13", text: "How do you handle API integration in mobile applications?", category: "technical" },
    { id: "mob-14", text: "Tell me about a time when you resolved a critical bug in production.", category: "behavioral" },
    { id: "mob-15", text: "How do you approach mobile app security and data protection?", category: "technical" },
    { id: "mob-16", text: "What strategies do you use for app versioning and updates?", category: "technical" },
    { id: "mob-17", text: "Describe your experience with mobile analytics and crash reporting.", category: "technical" },
    { id: "mob-18", text: "How would you handle a situation where an app crashes only on specific devices?", category: "situational" }
  ],
  "ai-ml-research-scientist": [
    { id: "aiml-1", text: "Describe your experience with deep learning architectures and frameworks.", category: "technical" },
    { id: "aiml-2", text: "How do you approach designing experiments for new AI research?", category: "technical" },
    { id: "aiml-3", text: "What's your experience with publishing research papers?", category: "behavioral" },
    { id: "aiml-4", text: "Explain your understanding of transformer architectures and attention mechanisms.", category: "technical" },
    { id: "aiml-5", text: "How do you approach model optimization and efficiency?", category: "technical" },
    { id: "aiml-6", text: "Describe a research project where you achieved significant results.", category: "behavioral" },
    { id: "aiml-7", text: "What's your experience with neural network training at scale?", category: "technical" },
    { id: "aiml-8", text: "How do you stay current with the latest AI research and papers?", category: "behavioral" },
    { id: "aiml-9", text: "Explain your approach to hyperparameter tuning and model selection.", category: "technical" },
    { id: "aiml-10", text: "What's your experience with reinforcement learning?", category: "technical" },
    { id: "aiml-11", text: "How do you handle bias and fairness in AI models?", category: "technical" },
    { id: "aiml-12", text: "Describe your experience with computer vision or NLP research.", category: "technical" },
    { id: "aiml-13", text: "How do you collaborate with other researchers and engineers?", category: "behavioral" },
    { id: "aiml-14", text: "What's your approach to reproducibility in ML research?", category: "technical" },
    { id: "aiml-15", text: "Tell me about a time when your research didn't produce expected results.", category: "behavioral" },
    { id: "aiml-16", text: "How do you approach transfer learning and few-shot learning?", category: "technical" },
    { id: "aiml-17", text: "What's your experience with distributed training systems?", category: "technical" },
    { id: "aiml-18", text: "How would you explain complex AI concepts to non-technical stakeholders?", category: "situational" }
  ],
  "data-scientist": [
    { id: "ds-1", text: "How do you approach exploratory data analysis for a new dataset?", category: "technical" },
    { id: "ds-2", text: "Describe your experience with machine learning model deployment.", category: "technical" },
    { id: "ds-3", text: "What's your approach to feature engineering?", category: "technical" },
    { id: "ds-4", text: "How do you handle imbalanced datasets?", category: "technical" },
    { id: "ds-5", text: "Explain your experience with different ML algorithms and when to use each.", category: "technical" },
    { id: "ds-6", text: "Tell me about a data science project that had business impact.", category: "behavioral" },
    { id: "ds-7", text: "How do you evaluate and validate machine learning models?", category: "technical" },
    { id: "ds-8", text: "What's your experience with big data technologies like Spark or Hadoop?", category: "technical" },
    { id: "ds-9", text: "How do you communicate data insights to non-technical stakeholders?", category: "behavioral" },
    { id: "ds-10", text: "Describe your approach to A/B testing and experimentation.", category: "technical" },
    { id: "ds-11", text: "What's your experience with time series forecasting?", category: "technical" },
    { id: "ds-12", text: "How do you handle missing data and outliers?", category: "technical" },
    { id: "ds-13", text: "Describe a time when your model performed poorly in production.", category: "behavioral" },
    { id: "ds-14", text: "What tools and libraries do you prefer for data science work?", category: "technical" },
    { id: "ds-15", text: "How do you approach model interpretability and explainability?", category: "technical" },
    { id: "ds-16", text: "What's your experience with recommendation systems?", category: "technical" },
    { id: "ds-17", text: "How do you monitor and maintain ML models in production?", category: "technical" },
    { id: "ds-18", text: "How would you handle a stakeholder requesting a model for a problem unsuitable for ML?", category: "situational" }
  ],
  "blockchain-developer": [
    { id: "bc-1", text: "Explain your experience with Ethereum and smart contract development.", category: "technical" },
    { id: "bc-2", text: "How do you approach smart contract security and auditing?", category: "technical" },
    { id: "bc-3", text: "Describe your experience with Solidity and its best practices.", category: "technical" },
    { id: "bc-4", text: "What's your understanding of DeFi protocols and their implementation?", category: "technical" },
    { id: "bc-5", text: "How do you handle gas optimization in smart contracts?", category: "technical" },
    { id: "bc-6", text: "Tell me about a blockchain project you've built or contributed to.", category: "behavioral" },
    { id: "bc-7", text: "What's your experience with different blockchain consensus mechanisms?", category: "technical" },
    { id: "bc-8", text: "How do you approach testing smart contracts?", category: "technical" },
    { id: "bc-9", text: "Describe your understanding of Web3 and decentralized applications.", category: "technical" },
    { id: "bc-10", text: "What's your experience with NFT development and standards?", category: "technical" },
    { id: "bc-11", text: "How do you handle upgradeable smart contracts?", category: "technical" },
    { id: "bc-12", text: "Describe common smart contract vulnerabilities and how to prevent them.", category: "technical" },
    { id: "bc-13", text: "What's your experience with different blockchain platforms beyond Ethereum?", category: "technical" },
    { id: "bc-14", text: "How do you stay updated with blockchain technology trends?", category: "behavioral" },
    { id: "bc-15", text: "Tell me about a time when you identified a critical security issue.", category: "behavioral" },
    { id: "bc-16", text: "How do you approach tokenomics design?", category: "technical" },
    { id: "bc-17", text: "What's your experience with layer 2 solutions and scaling?", category: "technical" },
    { id: "bc-18", text: "How would you explain blockchain benefits to a non-technical client?", category: "situational" }
  ],
  "game-developer": [
    { id: "gd-1", text: "What's your experience with Unity or Unreal Engine?", category: "technical" },
    { id: "gd-2", text: "How do you approach game physics and mechanics implementation?", category: "technical" },
    { id: "gd-3", text: "Describe your experience with graphics programming and shaders.", category: "technical" },
    { id: "gd-4", text: "How do you optimize game performance across different platforms?", category: "technical" },
    { id: "gd-5", text: "Tell me about a game project you're most proud of.", category: "behavioral" },
    { id: "gd-6", text: "What's your approach to game AI and pathfinding?", category: "technical" },
    { id: "gd-7", text: "How do you handle multiplayer networking and synchronization?", category: "technical" },
    { id: "gd-8", text: "Describe your experience with procedural generation.", category: "technical" },
    { id: "gd-9", text: "What's your approach to game balancing and playtesting?", category: "technical" },
    { id: "gd-10", text: "How do you implement UI/UX in games?", category: "technical" },
    { id: "gd-11", text: "Describe your experience with AR/VR game development.", category: "technical" },
    { id: "gd-12", text: "How do you approach audio implementation in games?", category: "technical" },
    { id: "gd-13", text: "Tell me about a technical challenge you overcame in game development.", category: "behavioral" },
    { id: "gd-14", text: "What's your experience with mobile game optimization?", category: "technical" },
    { id: "gd-15", text: "How do you handle save systems and player data persistence?", category: "technical" },
    { id: "gd-16", text: "Describe your approach to cross-platform game development.", category: "technical" },
    { id: "gd-17", text: "What's your experience with game monetization strategies?", category: "technical" },
    { id: "gd-18", text: "How would you handle a situation where a game feature is fun but technically challenging?", category: "situational" }
  ],
  "embedded-systems-engineer": [
    { id: "emb-1", text: "Describe your experience with microcontroller programming.", category: "technical" },
    { id: "emb-2", text: "How do you approach real-time operating systems (RTOS)?", category: "technical" },
    { id: "emb-3", text: "What's your experience with C/C++ for embedded systems?", category: "technical" },
    { id: "emb-4", text: "How do you handle memory constraints in embedded devices?", category: "technical" },
    { id: "emb-5", text: "Describe your experience with hardware-software integration.", category: "technical" },
    { id: "emb-6", text: "Tell me about a challenging embedded project you've worked on.", category: "behavioral" },
    { id: "emb-7", text: "How do you approach power optimization in embedded systems?", category: "technical" },
    { id: "emb-8", text: "What's your experience with IoT device development?", category: "technical" },
    { id: "emb-9", text: "How do you debug embedded systems?", category: "technical" },
    { id: "emb-10", text: "Describe your experience with communication protocols like I2C, SPI, UART.", category: "technical" },
    { id: "emb-11", text: "How do you ensure safety and reliability in embedded systems?", category: "technical" },
    { id: "emb-12", text: "What's your approach to firmware updates and versioning?", category: "technical" },
    { id: "emb-13", text: "Describe your experience with sensor integration.", category: "technical" },
    { id: "emb-14", text: "How do you handle interrupt-driven programming?", category: "technical" },
    { id: "emb-15", text: "Tell me about a time when you optimized system performance.", category: "behavioral" },
    { id: "emb-16", text: "What's your experience with wireless protocols like Bluetooth or WiFi?", category: "technical" },
    { id: "emb-17", text: "How do you approach testing embedded systems?", category: "technical" },
    { id: "emb-18", text: "How would you handle a hardware limitation that impacts software design?", category: "situational" }
  ],
  "sre": [
    { id: "sre-1", text: "How do you define and measure SLIs, SLOs, and SLAs?", category: "technical" },
    { id: "sre-2", text: "Describe your approach to incident response and post-mortems.", category: "technical" },
    { id: "sre-3", text: "How do you balance reliability with feature velocity?", category: "behavioral" },
    { id: "sre-4", text: "What's your experience with distributed systems observability?", category: "technical" },
    { id: "sre-5", text: "How do you approach capacity planning and forecasting?", category: "technical" },
    { id: "sre-6", text: "Tell me about a major outage you helped resolve.", category: "behavioral" },
    { id: "sre-7", text: "How do you implement chaos engineering practices?", category: "technical" },
    { id: "sre-8", text: "What's your approach to error budgets?", category: "technical" },
    { id: "sre-9", text: "How do you automate toil and repetitive tasks?", category: "technical" },
    { id: "sre-10", text: "Describe your experience with monitoring and alerting systems.", category: "technical" },
    { id: "sre-11", text: "How do you ensure high availability in distributed systems?", category: "technical" },
    { id: "sre-12", text: "What's your approach to load balancing and traffic management?", category: "technical" },
    { id: "sre-13", text: "How do you handle on-call responsibilities and burnout prevention?", category: "behavioral" },
    { id: "sre-14", text: "Describe your experience with performance optimization at scale.", category: "technical" },
    { id: "sre-15", text: "How do you implement disaster recovery strategies?", category: "technical" },
    { id: "sre-16", text: "What's your experience with database reliability and replication?", category: "technical" },
    { id: "sre-17", text: "How do you collaborate with development teams on reliability?", category: "behavioral" },
    { id: "sre-18", text: "How would you handle a situation where SLOs are consistently missed?", category: "situational" }
  ],
  "computer-vision-engineer": [
    { id: "cv-1", text: "Describe your experience with image processing and computer vision.", category: "technical" },
    { id: "cv-2", text: "How do you approach object detection and recognition tasks?", category: "technical" },
    { id: "cv-3", text: "What's your experience with OpenCV and other CV libraries?", category: "technical" },
    { id: "cv-4", text: "How do you handle real-time video processing?", category: "technical" },
    { id: "cv-5", text: "Describe your experience with convolutional neural networks.", category: "technical" },
    { id: "cv-6", text: "Tell me about a computer vision project you've implemented.", category: "behavioral" },
    { id: "cv-7", text: "How do you approach image segmentation tasks?", category: "technical" },
    { id: "cv-8", text: "What's your experience with 3D vision and depth estimation?", category: "technical" },
    { id: "cv-9", text: "How do you optimize CV models for edge devices?", category: "technical" },
    { id: "cv-10", text: "Describe your approach to data augmentation for vision tasks.", category: "technical" },
    { id: "cv-11", text: "What's your experience with facial recognition or biometric systems?", category: "technical" },
    { id: "cv-12", text: "How do you handle occlusion and challenging lighting conditions?", category: "technical" },
    { id: "cv-13", text: "Describe your experience with video analytics and tracking.", category: "technical" },
    { id: "cv-14", text: "How do you evaluate computer vision model performance?", category: "technical" },
    { id: "cv-15", text: "Tell me about a time when your model failed in production.", category: "behavioral" },
    { id: "cv-16", text: "What's your approach to dataset collection and annotation?", category: "technical" },
    { id: "cv-17", text: "How do you stay updated with latest CV research and techniques?", category: "behavioral" },
    { id: "cv-18", text: "How would you handle privacy concerns in a facial recognition system?", category: "situational" }
  ],
  "network-security-engineer": [
    { id: "nse-1", text: "Describe your experience with network security architecture.", category: "technical" },
    { id: "nse-2", text: "How do you configure and manage firewalls?", category: "technical" },
    { id: "nse-3", text: "What's your approach to intrusion detection and prevention?", category: "technical" },
    { id: "nse-4", text: "How do you conduct network vulnerability assessments?", category: "technical" },
    { id: "nse-5", text: "Describe your experience with VPNs and secure remote access.", category: "technical" },
    { id: "nse-6", text: "Tell me about a security breach you helped investigate or prevent.", category: "behavioral" },
    { id: "nse-7", text: "How do you monitor network traffic for threats?", category: "technical" },
    { id: "nse-8", text: "What's your experience with network segmentation and zero trust?", category: "technical" },
    { id: "nse-9", text: "How do you handle DDoS attack mitigation?", category: "technical" },
    { id: "nse-10", text: "Describe your approach to security incident response.", category: "technical" },
    { id: "nse-11", text: "What's your experience with SIEM tools and log analysis?", category: "technical" },
    { id: "nse-12", text: "How do you ensure compliance with security standards?", category: "technical" },
    { id: "nse-13", text: "Describe your experience with penetration testing networks.", category: "technical" },
    { id: "nse-14", text: "How do you balance security with network performance?", category: "behavioral" },
    { id: "nse-15", text: "What's your approach to wireless network security?", category: "technical" },
    { id: "nse-16", text: "How do you handle security updates and patch management?", category: "technical" },
    { id: "nse-17", text: "Describe your experience with cloud network security.", category: "technical" },
    { id: "nse-18", text: "How would you respond to a suspected insider threat?", category: "situational" }
  ],
  "qa-engineer": [
    { id: "qa-1", text: "Describe your experience with test automation frameworks.", category: "technical" },
    { id: "qa-2", text: "How do you approach creating test plans and test cases?", category: "technical" },
    { id: "qa-3", text: "What's your experience with Selenium or similar tools?", category: "technical" },
    { id: "qa-4", text: "How do you handle regression testing?", category: "technical" },
    { id: "qa-5", text: "Describe your approach to API testing.", category: "technical" },
    { id: "qa-6", text: "Tell me about a critical bug you discovered before production.", category: "behavioral" },
    { id: "qa-7", text: "How do you perform performance and load testing?", category: "technical" },
    { id: "qa-8", text: "What's your experience with CI/CD integration for testing?", category: "technical" },
    { id: "qa-9", text: "How do you prioritize testing when time is limited?", category: "behavioral" },
    { id: "qa-10", text: "Describe your approach to mobile app testing.", category: "technical" },
    { id: "qa-11", text: "What's your experience with different testing methodologies?", category: "technical" },
    { id: "qa-12", text: "How do you handle flaky tests?", category: "technical" },
    { id: "qa-13", text: "Describe your experience with security testing.", category: "technical" },
    { id: "qa-14", text: "How do you collaborate with developers to improve quality?", category: "behavioral" },
    { id: "qa-15", text: "What's your approach to exploratory testing?", category: "technical" },
    { id: "qa-16", text: "How do you track and report bugs effectively?", category: "technical" },
    { id: "qa-17", text: "Describe your experience with accessibility testing.", category: "technical" },
    { id: "qa-18", text: "How would you handle a situation where developers want to skip testing?", category: "situational" }
  ]
};

// Utility to detect AI-generated answers
export const detectAIGeneratedAnswer = (text: string): boolean => {
  // In a real application, this would use a more sophisticated AI detection approach
  // For this example, we'll use a simple pattern matching approach
  
  const aiPatterns = [
    /^As an AI (assistant|language model)/i,
    /I'd be happy to/i,
    /I don't have personal/i,
    /Hope this helps/i,
    /Let me know if you need/i
  ];
  
  for (const pattern of aiPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  // Check for perfect grammar and formatting as an indicator
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length > 5) {
    const perfectSentences = sentences.filter(s => 
      /^[A-Z]/.test(s.trim()) && s.trim().length > 10
    );
    if (perfectSentences.length === sentences.length) {
      return true;
    }
  }
  
  return false;
};

// Check if speech recognition is available in the browser
export const isSpeechRecognitionAvailable = (): boolean => {
  return !!(
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition
  );
};

// Create a new interview session with AI-generated questions based on the selected role
export const createInterviewSession = async (roleId: string, userEmail?: string, isMonitored: boolean = true): Promise<InterviewSession> => {
  const role = jobRoles.find(r => r.id === roleId);
  
  if (!role) {
    throw new Error(`Invalid role ID: ${roleId}`);
  }
  
  // Generate 10 AI-powered questions for the interview
  const questions = await getRandomQuestionsForRole(roleId, 10); 
  
  const session: InterviewSession = {
    id: `interview-${uuidv4()}`,
    roleId: role.id,
    roleName: role.title,
    date: new Date().toISOString(),
    startTime: new Date().toISOString(),
    endTime: null,
    userEmail,
    questions,
    answers: [],
    completed: false,
    aiDetectionCount: 0,
    isPracticeMode: !isMonitored
  };
  
  // Save the session to local storage
  saveInterviewToLocalStorage(session);
  
  return session;
};

// Get random questions for a specific role using OpenAI - ensuring role relevance
export const getRandomQuestionsForRole = async (roleId: string, count: number): Promise<Question[]> => {
  const role = jobRoles.find(r => r.id === roleId);
  const roleTitle = role ? role.title : roleId.replace(/-/g, ' ');
  
  try {
    // Generate questions using OpenAI
    const aiQuestions = await generateQuestionsWithOpenAI(roleTitle);
    
    // Convert to Question format and limit to requested count
    return aiQuestions.slice(0, count).map((q: GeneratedQuestion) => ({
      id: q.id,
      text: q.text,
      category: q.category
    }));
  } catch (error) {
    console.error('Failed to generate questions with OpenAI, using fallback:', error);
    
    // Fallback to static questions if OpenAI fails
    const roleQuestions = questionBanks[roleId] || [];
    
    if (roleQuestions.length === 0) {
      // Final fallback to generic questions
      return Array(count).fill(null).map((_, i) => ({
        id: `generic-${i + 1}`,
        text: `Tell me about your experience with ${roleId.replace(/-/g, ' ')}.`,
        category: "behavioral" as const
      }));
    }
    
    // Shuffle the static questions and take the first 'count' questions
    const shuffled = [...roleQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
};

// Check if answer is irrelevant or placeholder
export const isIrrelevantAnswer = (text: string): boolean => {
  // Check for empty or very short answers
  if (!text || text.trim().length < 10) return true;
  
  // Check for common evasive phrases
  const evasivePhrases = [
    'i don\'t know', 
    'not sure', 
    'sorry', 
    'no idea', 
    'can\'t answer', 
    'skip',
    'pass',
    'no clue',
    'idk',
    'dunno'
  ];
  
  // Check if the answer contains any evasive phrases
  const lowerText = text.toLowerCase();
  for (const phrase of evasivePhrases) {
    if (lowerText.includes(phrase) && text.length < 100) {
      return true;
    }
  }
  
  // Check for random characters or repeated patterns
  const randomPatterns = [
    /^[a-z]{1,3}$/i,                    // Very short answers like "aaa", "xyz"
    /(.)\1{4,}/,                        // Repeated characters like "aaaaa"
    /^[a-z]{1,2}[a-z\s]{0,10}$/i,       // Short nonsense like "ab cd ef"
    /^[^a-z0-9]*$/i                     // Just special characters
  ];
  
  for (const pattern of randomPatterns) {
    if (pattern.test(text.trim())) {
      return true;
    }
  }
  
  // Check for very low information density
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  
  // If answer has very few unique words compared to length
  if (words.length > 15 && uniqueWords.size < words.length * 0.3) {
    return true; // Likely repetitive nonsense
  }
  
  return false;
};

// Generate AI-powered feedback for an answer
export const generateFeedback = async (question: string, answerText: string, isAIGenerated: boolean = false): Promise<Feedback> => {
  // Check if the answer is irrelevant or a placeholder
  const irrelevant = isIrrelevantAnswer(answerText);
  
  // If the answer is irrelevant, provide appropriate feedback
  if (irrelevant) {
    return {
      relevance: 1,
      clarity: 2,
      confidence: 1,
      tone: "uncertain",
      suggestions: [
        "Your answer appears to be incomplete or irrelevant.",
        "Try to provide a specific, detailed answer that addresses the question.",
        "Include relevant examples and demonstrate your knowledge of the subject."
      ],
      overall: 1.5, // Very low score for irrelevant answers
      possiblyAI: false, // Irrelevant answers are unlikely to be AI-generated
      strengths: [],
      weaknesses: ["Answer is not relevant to the question", "Lacks specific details and examples"],
      final_feedback: "Please provide a more relevant and detailed response to the question."
    };
  }

  try {
    // Get AI evaluation of the answer
    const aiEvaluation = await evaluateAnswerWithOpenAI(question, answerText);
    
    // Check for AI-generated content
    let possiblyAI = isAIGenerated;
    if (!possiblyAI) {
      const aiCheck = detectAIGeneratedAdvanced(answerText);
      possiblyAI = aiCheck.isAIGenerated;
    }
    
    // Determine tone based on AI score
    let tone: "confident" | "neutral" | "uncertain" = "neutral";
    if (aiEvaluation.score >= 8) tone = "confident";
    if (aiEvaluation.score <= 5) tone = "uncertain";
    
    // Convert AI evaluation to Feedback format
    const feedback: Feedback = {
      relevance: Math.min(aiEvaluation.score, 10),
      clarity: Math.min(aiEvaluation.score, 10), 
      confidence: Math.min(aiEvaluation.score, 10),
      tone,
      suggestions: [
        ...aiEvaluation.improvements,
        ...(possiblyAI ? ["Your answer appears to be AI-generated. Please provide your own authentic response."] : [])
      ],
      overall: possiblyAI ? Math.min(aiEvaluation.score, 5) : aiEvaluation.score,
      possiblyAI,
      strengths: aiEvaluation.strengths || [],
      weaknesses: aiEvaluation.weaknesses || [],
      final_feedback: aiEvaluation.final_feedback || ''
    };
    
    return feedback;
    
  } catch (error) {
    console.error('Failed to get AI feedback, using fallback:', error);
    
    // Fallback to basic evaluation if AI fails
    const fillerWords = ['like', 'basically', 'actually', 'you know', 'kind of', 'sort of'];
    const fillerWordCount = fillerWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (answerText.match(regex) || []).length;
    }, 0);
    
    let relevance = Math.min(6 + Math.random() * 2, 8);
    if (answerText.length < 50) relevance = Math.max(3, relevance - 3);
    
    let clarity = Math.min(6 + Math.random() * 2, 8);
    clarity = Math.max(2, clarity - (fillerWordCount * 0.5));
    
    let confidence = 5 + Math.random() * 2;
    
    let tone: "confident" | "neutral" | "uncertain" = "neutral";
    if (confidence >= 7) tone = "confident";
    if (confidence <= 4) tone = "uncertain";
    
    let possiblyAI = isAIGenerated;
    if (!possiblyAI) {
      const aiCheck = detectAIGeneratedAdvanced(answerText);
      possiblyAI = aiCheck.isAIGenerated;
    }
    
    const overall = (relevance * 0.4) + (clarity * 0.3) + (confidence * 0.3);
    
    return {
      relevance,
      clarity, 
      confidence,
      tone,
      suggestions: [
        "AI evaluation temporarily unavailable - basic feedback provided.",
        ...(answerText.length < 100 ? ["Consider providing more detailed examples."] : []),
        ...(possiblyAI ? ["Your answer appears to be AI-generated. Please provide your own authentic response."] : [])
      ],
      overall: possiblyAI ? Math.min(overall, 5) : overall,
      possiblyAI,
      strengths: answerText.length > 100 ? ["Provided a detailed response"] : [],
      weaknesses: answerText.length < 50 ? ["Answer could be more comprehensive"] : [],
      final_feedback: "Basic evaluation provided due to AI service unavailability."
    };
  }
};

// ============= BATCH FEEDBACK GENERATION (90% API reduction) =============
// Generate AI-powered feedback for multiple answers in ONE API call
export const generateBatchFeedback = async (
  questionsAndAnswers: Array<{ question: string; answerText: string; isAIGenerated?: boolean }>
): Promise<Feedback[]> => {
  console.log(`🚀 Generating batch feedback for ${questionsAndAnswers.length} answers`);
  
  try {
    // Prepare batch input (filter out irrelevant answers first)
    const batchInput: BatchEvaluationInput[] = [];
    const feedbackResults: Feedback[] = [];
    const indexMap: number[] = []; // Map batch result index to original index
    
    // Pre-process: handle irrelevant answers immediately (no API call needed)
    for (let i = 0; i < questionsAndAnswers.length; i++) {
      const { question, answerText, isAIGenerated = false } = questionsAndAnswers[i];
      
      if (isIrrelevantAnswer(answerText)) {
        // Add irrelevant answer feedback immediately
        feedbackResults[i] = {
          relevance: 1,
          clarity: 2,
          confidence: 1,
          tone: "uncertain",
          suggestions: [
            "Your answer appears to be incomplete or irrelevant.",
            "Try to provide a specific, detailed answer that addresses the question.",
            "Include relevant examples and demonstrate your knowledge of the subject."
          ],
          overall: 1.5,
          possiblyAI: false,
          strengths: [],
          weaknesses: ["Answer is not relevant to the question", "Lacks specific details and examples"],
          final_feedback: "Please provide a more relevant and detailed response to the question."
        };
      } else {
        // Add to batch for AI evaluation
        batchInput.push({ question, answer: answerText });
        indexMap.push(i);
      }
    }
    
    // If all answers were irrelevant, return immediately
    if (batchInput.length === 0) {
      console.log('✅ All answers were irrelevant - no API calls needed');
      return feedbackResults;
    }
    
    // Call batch evaluation API (ONE API call for all valid answers)
    console.log(`📡 Making ONE API call to evaluate ${batchInput.length} answers`);
    const { evaluations } = await evaluateBatchAnswersWithGemini(batchInput);
    console.log(`✅ Batch evaluation complete`);
    
    // Process results and check for AI-generated content
    for (let i = 0; i < evaluations.length; i++) {
      const aiEvaluation = evaluations[i];
      const originalIndex = indexMap[i];
      const { answerText, isAIGenerated = false } = questionsAndAnswers[originalIndex];
      
      // Check for AI-generated content
      let possiblyAI = isAIGenerated;
      if (!possiblyAI) {
        const aiCheck = detectAIGeneratedAdvanced(answerText);
        possiblyAI = aiCheck.isAIGenerated;
      }
      
      // Determine tone based on AI score
      let tone: "confident" | "neutral" | "uncertain" = "neutral";
      if (aiEvaluation.score >= 8) tone = "confident";
      if (aiEvaluation.score <= 5) tone = "uncertain";
      
      // Convert AI evaluation to Feedback format
      feedbackResults[originalIndex] = {
        relevance: Math.min(aiEvaluation.score, 10),
        clarity: Math.min(aiEvaluation.score, 10),
        confidence: Math.min(aiEvaluation.score, 10),
        tone,
        suggestions: [
          ...aiEvaluation.improvements,
          ...(possiblyAI ? ["Your answer appears to be AI-generated. Please provide your own authentic response."] : [])
        ],
        overall: possiblyAI ? Math.min(aiEvaluation.score, 5) : aiEvaluation.score,
        possiblyAI,
        strengths: aiEvaluation.strengths || [],
        weaknesses: aiEvaluation.weaknesses || [],
        final_feedback: aiEvaluation.final_feedback || ''
      };
    }
    
    console.log(`✅ Batch feedback generation complete: ${feedbackResults.length} feedbacks generated with 1 API call`);
    return feedbackResults;
    
  } catch (error) {
    console.error('❌ Batch feedback generation failed, falling back to sequential evaluations with delays:', error);
    
    // 🚨 CRITICAL FIX: Use sequential calls with 4s delays instead of Promise.all
    // Promise.all fires all API calls at once → instant 429 error!
    // Sequential with delays: stays under 15 RPM limit
    const feedbacks: Feedback[] = [];
    for (let i = 0; i < questionsAndAnswers.length; i++) {
      const { question, answerText, isAIGenerated = false } = questionsAndAnswers[i];
      try {
        // generateFeedback calls evaluateAnswerWithGemini which has built-in rate limiting
        const feedback = await generateFeedback(question, answerText, isAIGenerated);
        feedbacks.push(feedback);
      } catch (err) {
        console.error(`❌ Error evaluating answer ${i + 1}:`, err);
        // Add fallback feedback for failed evaluation
        feedbacks.push({
          relevance: 5,
          clarity: 5,
          confidence: 5,
          tone: "neutral",
          suggestions: ["Unable to evaluate due to technical issues"],
          overall: 5,
          possiblyAI: false,
          strengths: [],
          weaknesses: [],
          final_feedback: "Evaluation temporarily unavailable"
        });
      }
    }
    
    return feedbacks;
  }
};

// Calculate overall score for an interview
export const calculateScore = (answers: Answer[], aiDetectionCount: number): number => {
  if (answers.length === 0) return 0;
  
  // Get the average score from all answers with feedback
  const answersWithFeedback = answers.filter(a => a.feedback);
  
  if (answersWithFeedback.length === 0) return 0;
  
  // Calculate the base score as the average of all answer scores
  const baseScore = answersWithFeedback.reduce(
    (sum, answer) => sum + (answer.feedback?.overall || 0), 
    0
  ) / answersWithFeedback.length;
  
  // Apply penalty for AI-detected answers
  const aiPenalty = Math.min(aiDetectionCount * 1.5, 5);
  
  // Ensure score is between 0 and 10
  let finalScore = Math.max(0, Math.min(10, baseScore - aiPenalty));
  
  return finalScore;
};

// Generate overall feedback based on interview score
export const generateOverallFeedback = (score: number, aiDetectionCount: number): string => {
  // Determine outcome tier
  let outcome: InterviewOutcome = "failed";
  if (score >= 6) outcome = "passed";
  else if (score >= 4) outcome = "conditionalPass";
  
  // Base feedback templates
  const feedbackTemplates = {
    passed: [
      "Excellent performance! Your answers were clear, relevant, and demonstrated strong expertise.",
      "Great job! You showed confidence and provided specific examples that highlighted your skills.",
      "Very impressive interview. Your responses were thoughtful and well-structured.",
      "Outstanding performance. You effectively communicated your expertise and experience."
    ],
    conditionalPass: [
      "Good effort. Your answers covered the basics, but could use more specific examples.",
      "Reasonable performance. You demonstrated some knowledge, but could improve in providing more detailed responses.",
      "Satisfactory interview. You showed potential, but there's room for improvement in how you structure your answers.",
      "Decent performance. With some preparation, you could significantly improve your interview skills."
    ],
    failed: [
      "You need more preparation before your next interview. Focus on providing specific examples from your experience.",
      "Your responses lacked the detail and relevance needed. Consider practicing with more structured answers.",
      "More preparation is needed. Try to be more specific and confident in your responses.",
      "Your interview needs improvement. Focus on answering questions directly and providing relevant examples."
    ]
  };
  
  // Select a random template from the appropriate category
  const templates = feedbackTemplates[outcome];
  const baseFeedback = templates[Math.floor(Math.random() * templates.length)];
  
  // Add AI detection warning if needed
  let aiFeedback = "";
  if (aiDetectionCount > 0) {
    aiFeedback = ` Note that some of your answers appeared to be AI-generated, which is not recommended for real interviews. Authentic responses that showcase your personal experience are much more effective.`;
  }
  
  // Add specific improvement suggestions based on score
  let improvementSuggestions = "";
  if (score < 8) {
    const suggestions = [
      "Practice giving more concise and structured responses.",
      "Try to include specific examples from your experience that highlight your skills.",
      "Work on communicating with more confidence and clarity.",
      "Prepare concrete examples that demonstrate your problem-solving abilities.",
      "Consider practicing with a friend to get feedback on your delivery."
    ];
    
    // Select 1-2 random suggestions
    const count = Math.min(2, Math.floor(Math.random() * 2) + 1);
    const selectedSuggestions = [];
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * suggestions.length);
      selectedSuggestions.push(suggestions[index]);
      suggestions.splice(index, 1);
    }
    
    improvementSuggestions = ` Areas to focus on: ${selectedSuggestions.join(' ')}`;
  }
  
  return `${baseFeedback}${aiFeedback}${improvementSuggestions}`;
};

// ============= DEPRECATED: localStorage functions (use Firebase instead) =============
/**
 * @deprecated Use Firebase functions from @/lib/firebaseService instead
 * This project has migrated to Firebase for data persistence
 */
export const saveInterviewToLocalStorage = (interview: InterviewSession): void => {
  console.warn('⚠️ saveInterviewToLocalStorage is deprecated - use Firebase saveInterview instead');
  // Calculate AI detection count before saving
  const aiDetectionCount = interview.answers.filter(a => a.feedback?.possiblyAI).length;
  const updatedInterview = { ...interview, aiDetectionCount };
  
  localStorage.setItem(`mockmate-interview-${interview.id}`, JSON.stringify(updatedInterview));
};

/**
 * @deprecated Use Firebase functions from @/lib/firebaseService instead
 * This project has migrated to Firebase for data persistence
 */
export const getInterviewFromLocalStorage = (id: string): InterviewSession | null => {
  console.warn('⚠️ getInterviewFromLocalStorage is deprecated - use Firebase getInterview instead');
  const data = localStorage.getItem(`mockmate-interview-${id}`);
  return data ? JSON.parse(data) : null;
};

/**
 * @deprecated Use Firebase functions from @/lib/firebaseService instead
 * This project has migrated to Firebase for data persistence
 */
export const getInterviewsFromLocalStorage = (userEmail?: string): InterviewSession[] => {
  console.warn('⚠️ getInterviewsFromLocalStorage is deprecated - use Firebase getUserInterviews instead');
  const interviews: InterviewSession[] = [];
  
  // Loop through all localStorage items
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    // Check if the key matches our interview pattern
    if (key && key.startsWith('mockmate-interview-')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const interview = JSON.parse(data);
          // Filter by user email if provided
          if (!userEmail || interview.userEmail === userEmail) {
            interviews.push(interview);
          }
        }
      } catch (error) {
        console.error('Error parsing interview data:', error);
      }
    }
  }
  
  // Sort by date (newest first)
  return interviews.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};
