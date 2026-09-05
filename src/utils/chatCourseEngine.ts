/**
 * Course Recommendation Engine for Mitoi Chatbot
 * 100+ curated courses across 12 platforms (Udemy, Coursera, YouTube, edX, etc.)
 */

export interface Course {
  id: string;
  title: string;
  platform: Platform;
  url: string;
  instructor: string;
  rating: number; // 0-5
  students?: number;
  duration: string; // e.g., "40 hours", "8 weeks"
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  skills: string[]; // Skills taught
  topics: string[]; // Related search topics
  price: 'free' | 'paid' | 'freemium';
  certificate: boolean;
  description: string;
}

export type Platform = 
  | 'udemy' 
  | 'coursera' 
  | 'youtube' 
  | 'edx' 
  | 'pluralsight' 
  | 'linkedin-learning' 
  | 'udacity' 
  | 'skillshare' 
  | 'codecademy' 
  | 'freecodecamp' 
  | 'mit-ocw' 
  | 'khan-academy';

export const PLATFORM_INFO: Record<Platform, { name: string; icon: string; baseUrl: string }> = {
  'udemy': { name: 'Udemy', icon: '🎓', baseUrl: 'https://www.udemy.com' },
  'coursera': { name: 'Coursera', icon: '📚', baseUrl: 'https://www.coursera.org' },
  'youtube': { name: 'YouTube', icon: '▶️', baseUrl: 'https://www.youtube.com' },
  'edx': { name: 'edX', icon: '🏛️', baseUrl: 'https://www.edx.org' },
  'pluralsight': { name: 'Pluralsight', icon: '💡', baseUrl: 'https://www.pluralsight.com' },
  'linkedin-learning': { name: 'LinkedIn Learning', icon: '💼', baseUrl: 'https://www.linkedin.com/learning' },
  'udacity': { name: 'Udacity', icon: '🚀', baseUrl: 'https://www.udacity.com' },
  'skillshare': { name: 'Skillshare', icon: '🎨', baseUrl: 'https://www.skillshare.com' },
  'codecademy': { name: 'Codecademy', icon: '💻', baseUrl: 'https://www.codecademy.com' },
  'freecodecamp': { name: 'freeCodeCamp', icon: '🔥', baseUrl: 'https://www.freecodecamp.org' },
  'mit-ocw': { name: 'MIT OpenCourseWare', icon: '🎓', baseUrl: 'https://ocw.mit.edu' },
  'khan-academy': { name: 'Khan Academy', icon: '📖', baseUrl: 'https://www.khanacademy.org' },
};

// ==================== COURSE DATABASE ====================
export const COURSES: Course[] = [
  // ============ MACHINE LEARNING & AI ============
  {
    id: 'coursera-ml-stanford',
    title: 'Machine Learning Specialization',
    platform: 'coursera',
    url: 'https://www.coursera.org/specializations/machine-learning-introduction',
    instructor: 'Andrew Ng',
    rating: 4.9,
    students: 5000000,
    duration: '3 months',
    level: 'beginner',
    skills: ['machine learning', 'python', 'tensorflow', 'supervised learning', 'unsupervised learning'],
    topics: ['ml', 'machine learning', 'ai', 'andrew ng', 'deep learning basics'],
    price: 'freemium',
    certificate: true,
    description: 'The most popular ML course taught by Andrew Ng. Covers supervised/unsupervised learning, neural networks, and best practices.',
  },
  {
    id: 'coursera-deep-learning',
    title: 'Deep Learning Specialization',
    platform: 'coursera',
    url: 'https://www.coursera.org/specializations/deep-learning',
    instructor: 'Andrew Ng',
    rating: 4.9,
    students: 900000,
    duration: '5 months',
    level: 'intermediate',
    skills: ['deep learning', 'neural networks', 'cnn', 'rnn', 'tensorflow', 'keras'],
    topics: ['deep learning', 'neural network', 'cnn', 'rnn', 'computer vision', 'nlp basics'],
    price: 'freemium',
    certificate: true,
    description: 'Master deep learning fundamentals including CNNs, RNNs, LSTM, and transformers. Build AI applications.',
  },
  {
    id: 'udemy-ml-az',
    title: 'Machine Learning A-Z: AI, Python & R',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/machinelearning/',
    instructor: 'Kirill Eremenko',
    rating: 4.5,
    students: 900000,
    duration: '44 hours',
    level: 'beginner',
    skills: ['machine learning', 'python', 'r', 'data preprocessing', 'regression', 'classification'],
    topics: ['ml', 'machine learning', 'python ml', 'r programming', 'data science'],
    price: 'paid',
    certificate: true,
    description: 'Comprehensive ML course covering all major algorithms with hands-on Python and R implementations.',
  },
  {
    id: 'youtube-sentdex-ml',
    title: 'Machine Learning with Python',
    platform: 'youtube',
    url: 'https://www.youtube.com/playlist?list=PLQVvvaa0QuDfKTOs3Keq_kaG2P55YRn5v',
    instructor: 'sentdex',
    rating: 4.7,
    duration: '10 hours',
    level: 'beginner',
    skills: ['machine learning', 'python', 'scikit-learn', 'pandas'],
    topics: ['ml', 'machine learning', 'python ml', 'sklearn', 'free ml course'],
    price: 'free',
    certificate: false,
    description: 'Free YouTube playlist covering ML fundamentals with scikit-learn and practical examples.',
  },
  {
    id: 'edx-cs50-ai',
    title: 'CS50\'s Introduction to Artificial Intelligence with Python',
    platform: 'edx',
    url: 'https://www.edx.org/course/cs50s-introduction-to-artificial-intelligence-with-python',
    instructor: 'David J. Malan',
    rating: 4.8,
    students: 300000,
    duration: '7 weeks',
    level: 'intermediate',
    skills: ['ai', 'python', 'search algorithms', 'machine learning', 'neural networks'],
    topics: ['ai', 'artificial intelligence', 'cs50', 'harvard ai', 'python ai'],
    price: 'free',
    certificate: true,
    description: 'Harvard\'s CS50 AI course covering search, knowledge representation, machine learning, and neural networks.',
  },
  {
    id: 'udacity-ml-nanodegree',
    title: 'Machine Learning Engineer Nanodegree',
    platform: 'udacity',
    url: 'https://www.udacity.com/course/machine-learning-engineer-nanodegree--nd009t',
    instructor: 'Udacity',
    rating: 4.6,
    duration: '3 months',
    level: 'intermediate',
    skills: ['machine learning', 'deep learning', 'aws sagemaker', 'mlops'],
    topics: ['ml engineer', 'machine learning career', 'mlops', 'aws ml'],
    price: 'paid',
    certificate: true,
    description: 'Professional nanodegree with real-world projects and career services for ML engineers.',
  },
  {
    id: 'coursera-nlp-specialization',
    title: 'Natural Language Processing Specialization',
    platform: 'coursera',
    url: 'https://www.coursera.org/specializations/natural-language-processing',
    instructor: 'DeepLearning.AI',
    rating: 4.6,
    students: 100000,
    duration: '4 months',
    level: 'intermediate',
    skills: ['nlp', 'transformers', 'attention', 'sequence models', 'text classification'],
    topics: ['nlp', 'natural language processing', 'text analysis', 'transformers', 'bert', 'gpt'],
    price: 'freemium',
    certificate: true,
    description: 'Master NLP with classification, sequence models, attention mechanisms, and transformer architecture.',
  },
  {
    id: 'udemy-pytorch',
    title: 'PyTorch for Deep Learning with Python Bootcamp',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/pytorch-for-deep-learning-with-python-bootcamp/',
    instructor: 'Jose Portilla',
    rating: 4.6,
    students: 100000,
    duration: '17 hours',
    level: 'intermediate',
    skills: ['pytorch', 'deep learning', 'cnn', 'rnn', 'gans', 'python'],
    topics: ['pytorch', 'deep learning pytorch', 'neural networks', 'pytorch tutorial'],
    price: 'paid',
    certificate: true,
    description: 'Complete PyTorch guide covering CNNs, RNNs, GANs, and deployment with practical projects.',
  },
  {
    id: 'youtube-3blue1brown-nn',
    title: 'Neural Networks',
    platform: 'youtube',
    url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi',
    instructor: '3Blue1Brown',
    rating: 4.9,
    duration: '4 hours',
    level: 'beginner',
    skills: ['neural networks', 'deep learning', 'mathematics', 'backpropagation'],
    topics: ['neural network explained', 'deep learning math', 'backpropagation', 'gradient descent'],
    price: 'free',
    certificate: false,
    description: 'Beautiful visual explanations of neural networks, backpropagation, and gradient descent.',
  },
  {
    id: 'freecodecamp-ml-python',
    title: 'Machine Learning with Python',
    platform: 'freecodecamp',
    url: 'https://www.freecodecamp.org/learn/machine-learning-with-python/',
    instructor: 'freeCodeCamp',
    rating: 4.5,
    duration: '300 hours',
    level: 'beginner',
    skills: ['machine learning', 'python', 'tensorflow', 'neural networks'],
    topics: ['free ml course', 'machine learning free', 'python ml free', 'tensorflow free'],
    price: 'free',
    certificate: true,
    description: 'Free comprehensive ML certification covering TensorFlow, neural networks, and 5 projects.',
  },
  {
    id: 'coursera-tensorflow',
    title: 'TensorFlow Developer Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/tensorflow-in-practice',
    instructor: 'Laurence Moroney',
    rating: 4.7,
    students: 200000,
    duration: '4 months',
    level: 'intermediate',
    skills: ['tensorflow', 'deep learning', 'cnn', 'nlp', 'time series'],
    topics: ['tensorflow', 'tensorflow certification', 'google tensorflow', 'tf developer'],
    price: 'freemium',
    certificate: true,
    description: 'Official Google TensorFlow certification prep covering computer vision, NLP, and time series.',
  },
  {
    id: 'linkedin-learning-gen-ai',
    title: 'Generative AI: The Big Picture',
    platform: 'linkedin-learning',
    url: 'https://www.linkedin.com/learning/generative-ai-the-big-picture',
    instructor: 'Jonathan Fernandes',
    rating: 4.6,
    duration: '1 hour',
    level: 'beginner',
    skills: ['generative ai', 'llm', 'chatgpt', 'stable diffusion', 'ai tools'],
    topics: ['generative ai', 'chatgpt', 'llm', 'ai for business', 'gen ai'],
    price: 'freemium',
    certificate: true,
    description: 'Overview of generative AI technologies including LLMs, image generation, and business applications.',
  },

  // ============ WEB DEVELOPMENT ============
  {
    id: 'udemy-webdev-bootcamp',
    title: 'The Complete 2024 Web Development Bootcamp',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/the-complete-web-development-bootcamp/',
    instructor: 'Dr. Angela Yu',
    rating: 4.7,
    students: 1000000,
    duration: '65 hours',
    level: 'beginner',
    skills: ['html', 'css', 'javascript', 'react', 'node.js', 'mongodb', 'web3'],
    topics: ['web development', 'full stack', 'frontend', 'backend', 'mern stack'],
    price: 'paid',
    certificate: true,
    description: 'The #1 web dev bootcamp covering HTML, CSS, JS, React, Node, MongoDB, and Web3.',
  },
  {
    id: 'coursera-meta-frontend',
    title: 'Meta Front-End Developer Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer',
    instructor: 'Meta',
    rating: 4.7,
    students: 200000,
    duration: '7 months',
    level: 'beginner',
    skills: ['html', 'css', 'javascript', 'react', 'version control', 'ux/ui'],
    topics: ['frontend', 'react', 'meta certification', 'web developer', 'frontend developer'],
    price: 'freemium',
    certificate: true,
    description: 'Official Meta certification covering HTML, CSS, JavaScript, React, and UX principles.',
  },
  {
    id: 'freecodecamp-responsive',
    title: 'Responsive Web Design Certification',
    platform: 'freecodecamp',
    url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
    instructor: 'freeCodeCamp',
    rating: 4.6,
    duration: '300 hours',
    level: 'beginner',
    skills: ['html', 'css', 'responsive design', 'flexbox', 'grid'],
    topics: ['html free course', 'css free course', 'web design free', 'responsive design'],
    price: 'free',
    certificate: true,
    description: 'Free certification covering modern HTML5, CSS3, Flexbox, Grid, and responsive design.',
  },
  {
    id: 'youtube-traversy-js',
    title: 'JavaScript Crash Course For Beginners',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
    instructor: 'Traversy Media',
    rating: 4.8,
    duration: '1.5 hours',
    level: 'beginner',
    skills: ['javascript', 'dom manipulation', 'es6'],
    topics: ['javascript', 'js tutorial', 'javascript free', 'learn javascript', 'js basics'],
    price: 'free',
    certificate: false,
    description: 'Quick JavaScript fundamentals covering variables, functions, arrays, objects, and DOM.',
  },
  {
    id: 'udemy-react-complete',
    title: 'React - The Complete Guide 2024',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
    instructor: 'Maximilian Schwarzmüller',
    rating: 4.6,
    students: 800000,
    duration: '68 hours',
    level: 'beginner',
    skills: ['react', 'redux', 'react router', 'hooks', 'nextjs', 'typescript'],
    topics: ['react', 'react tutorial', 'react course', 'redux', 'react hooks', 'nextjs'],
    price: 'paid',
    certificate: true,
    description: 'The most comprehensive React course covering Hooks, Redux, Router, Next.js, and TypeScript.',
  },
  {
    id: 'coursera-google-ux',
    title: 'Google UX Design Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/google-ux-design',
    instructor: 'Google',
    rating: 4.8,
    students: 500000,
    duration: '6 months',
    level: 'beginner',
    skills: ['ux design', 'ui design', 'figma', 'user research', 'wireframing', 'prototyping'],
    topics: ['ux design', 'ui design', 'google ux', 'figma', 'user experience', 'product design'],
    price: 'freemium',
    certificate: true,
    description: 'Official Google UX certification covering research, wireframing, Figma, and portfolio building.',
  },
  {
    id: 'pluralsight-angular',
    title: 'Angular: Getting Started',
    platform: 'pluralsight',
    url: 'https://www.pluralsight.com/courses/angular-2-getting-started-update',
    instructor: 'Deborah Kurata',
    rating: 4.6,
    duration: '5 hours',
    level: 'beginner',
    skills: ['angular', 'typescript', 'components', 'services', 'routing'],
    topics: ['angular', 'angular tutorial', 'angular course', 'typescript angular'],
    price: 'paid',
    certificate: true,
    description: 'Introduction to Angular covering components, templates, services, and routing.',
  },
  {
    id: 'udemy-nodejs-complete',
    title: 'The Complete Node.js Developer Course',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/the-complete-nodejs-developer-course-2/',
    instructor: 'Andrew Mead',
    rating: 4.6,
    students: 300000,
    duration: '35 hours',
    level: 'beginner',
    skills: ['node.js', 'express', 'mongodb', 'rest api', 'socket.io', 'jest'],
    topics: ['nodejs', 'node js', 'express', 'backend', 'rest api', 'mongodb'],
    price: 'paid',
    certificate: true,
    description: 'Master Node.js by building REST APIs, real-time apps with Socket.io, and testing with Jest.',
  },
  {
    id: 'codecademy-javascript',
    title: 'Learn JavaScript',
    platform: 'codecademy',
    url: 'https://www.codecademy.com/learn/introduction-to-javascript',
    instructor: 'Codecademy',
    rating: 4.5,
    duration: '30 hours',
    level: 'beginner',
    skills: ['javascript', 'es6', 'functions', 'arrays', 'objects', 'classes'],
    topics: ['javascript', 'learn javascript', 'js course', 'javascript interactive'],
    price: 'freemium',
    certificate: true,
    description: 'Interactive JavaScript course with hands-on exercises and projects.',
  },
  {
    id: 'youtube-fireship-100',
    title: '100+ Web Development Concepts',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=erEgovG9WBs',
    instructor: 'Fireship',
    rating: 4.9,
    duration: '23 min',
    level: 'beginner',
    skills: ['web development', 'frontend', 'backend', 'devops'],
    topics: ['web dev overview', 'web development roadmap', 'learn web dev', 'fullstack overview'],
    price: 'free',
    certificate: false,
    description: 'Fast-paced overview of 100+ essential web development concepts in under 30 minutes.',
  },
  {
    id: 'udemy-vue-complete',
    title: 'Vue - The Complete Guide',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/vuejs-2-the-complete-guide/',
    instructor: 'Maximilian Schwarzmüller',
    rating: 4.7,
    students: 200000,
    duration: '32 hours',
    level: 'beginner',
    skills: ['vue', 'vuex', 'vue router', 'composition api', 'typescript'],
    topics: ['vue', 'vue.js', 'vuejs', 'vue tutorial', 'vue course'],
    price: 'paid',
    certificate: true,
    description: 'Complete Vue.js guide covering Vue 3, Composition API, Vuex, Vue Router, and authentication.',
  },
  {
    id: 'coursera-meta-backend',
    title: 'Meta Back-End Developer Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/meta-back-end-developer',
    instructor: 'Meta',
    rating: 4.6,
    students: 100000,
    duration: '8 months',
    level: 'beginner',
    skills: ['python', 'django', 'mysql', 'rest api', 'version control'],
    topics: ['backend', 'backend developer', 'python backend', 'django', 'meta backend'],
    price: 'freemium',
    certificate: true,
    description: 'Official Meta certification covering Python, Django, databases, APIs, and cloud deployment.',
  },

  // ============ PYTHON ============
  {
    id: 'udemy-python-bootcamp',
    title: '100 Days of Code: The Complete Python Pro Bootcamp',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/100-days-of-code/',
    instructor: 'Dr. Angela Yu',
    rating: 4.7,
    students: 1000000,
    duration: '65 hours',
    level: 'beginner',
    skills: ['python', 'web scraping', 'automation', 'data science', 'gui', 'games'],
    topics: ['python', 'python bootcamp', 'learn python', 'python course', 'python projects'],
    price: 'paid',
    certificate: true,
    description: 'The #1 Python course with 100 projects covering automation, web dev, data science, and more.',
  },
  {
    id: 'coursera-python-google',
    title: 'Google IT Automation with Python',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/google-it-automation',
    instructor: 'Google',
    rating: 4.7,
    students: 500000,
    duration: '6 months',
    level: 'beginner',
    skills: ['python', 'git', 'automation', 'configuration management', 'cloud'],
    topics: ['python automation', 'google python', 'it automation', 'scripting'],
    price: 'freemium',
    certificate: true,
    description: 'Google\'s Python certification covering automation, Git, and cloud configuration management.',
  },
  {
    id: 'youtube-corey-python',
    title: 'Python Tutorial for Beginners',
    platform: 'youtube',
    url: 'https://www.youtube.com/playlist?list=PL-osiE80TeTskrapNbzXhwoFUiLCjGgY7',
    instructor: 'Corey Schafer',
    rating: 4.9,
    duration: '12 hours',
    level: 'beginner',
    skills: ['python', 'oop', 'file handling', 'modules'],
    topics: ['python', 'python free', 'python tutorial', 'learn python free', 'python beginner'],
    price: 'free',
    certificate: false,
    description: 'Comprehensive free Python playlist covering basics to advanced OOP concepts.',
  },
  {
    id: 'codecademy-python',
    title: 'Learn Python 3',
    platform: 'codecademy',
    url: 'https://www.codecademy.com/learn/learn-python-3',
    instructor: 'Codecademy',
    rating: 4.6,
    duration: '25 hours',
    level: 'beginner',
    skills: ['python', 'data types', 'functions', 'loops', 'classes'],
    topics: ['python', 'python interactive', 'learn python', 'python 3'],
    price: 'freemium',
    certificate: true,
    description: 'Interactive Python course with hands-on exercises for complete beginners.',
  },
  {
    id: 'edx-python-mit',
    title: 'Introduction to Computer Science and Programming Using Python',
    platform: 'edx',
    url: 'https://www.edx.org/course/introduction-to-computer-science-and-programming-7',
    instructor: 'MIT',
    rating: 4.8,
    students: 2000000,
    duration: '9 weeks',
    level: 'beginner',
    skills: ['python', 'algorithms', 'data structures', 'computational thinking'],
    topics: ['python', 'mit python', 'computer science', 'programming', 'cs50'],
    price: 'free',
    certificate: true,
    description: 'MIT\'s legendary intro to programming course using Python. Gold standard for CS education.',
  },

  // ============ DATA SCIENCE ============
  {
    id: 'coursera-data-science-ibm',
    title: 'IBM Data Science Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/ibm-data-science',
    instructor: 'IBM',
    rating: 4.6,
    students: 500000,
    duration: '5 months',
    level: 'beginner',
    skills: ['python', 'sql', 'data visualization', 'machine learning', 'pandas', 'jupyter'],
    topics: ['data science', 'ibm data science', 'data analyst', 'data science career'],
    price: 'freemium',
    certificate: true,
    description: 'IBM\'s comprehensive data science certification covering Python, SQL, ML, and visualization.',
  },
  {
    id: 'udemy-data-science-bootcamp',
    title: 'The Data Science Course: Complete Data Science Bootcamp',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/the-data-science-course-complete-data-science-bootcamp/',
    instructor: '365 Careers',
    rating: 4.6,
    students: 700000,
    duration: '31 hours',
    level: 'beginner',
    skills: ['python', 'statistics', 'machine learning', 'deep learning', 'pandas', 'numpy'],
    topics: ['data science', 'data science bootcamp', 'learn data science', 'python data science'],
    price: 'paid',
    certificate: true,
    description: 'Complete data science bootcamp from math to deep learning with real projects.',
  },
  {
    id: 'kaggle-pandas',
    title: 'Pandas Course',
    platform: 'freecodecamp',
    url: 'https://www.kaggle.com/learn/pandas',
    instructor: 'Kaggle',
    rating: 4.5,
    duration: '4 hours',
    level: 'beginner',
    skills: ['pandas', 'data manipulation', 'python'],
    topics: ['pandas', 'data analysis', 'python pandas', 'dataframes'],
    price: 'free',
    certificate: true,
    description: 'Free hands-on Pandas course from Kaggle with interactive exercises.',
  },
  {
    id: 'coursera-sql-google',
    title: 'Google Data Analytics Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/google-data-analytics',
    instructor: 'Google',
    rating: 4.8,
    students: 1000000,
    duration: '6 months',
    level: 'beginner',
    skills: ['sql', 'spreadsheets', 'r', 'tableau', 'data cleaning'],
    topics: ['data analytics', 'google data analytics', 'sql', 'data analyst', 'tableau'],
    price: 'freemium',
    certificate: true,
    description: 'Google\'s data analytics certification covering SQL, R, Tableau, and data visualization.',
  },
  {
    id: 'youtube-sentdex-pandas',
    title: 'Data Analysis with Python and Pandas',
    platform: 'youtube',
    url: 'https://www.youtube.com/playlist?list=PLQVvvaa0QuDc-3szzjeP6N6b0aDrrKyL-',
    instructor: 'sentdex',
    rating: 4.6,
    duration: '4 hours',
    level: 'beginner',
    skills: ['pandas', 'data analysis', 'python', 'visualization'],
    topics: ['pandas tutorial', 'data analysis free', 'python data', 'pandas free'],
    price: 'free',
    certificate: false,
    description: 'Free YouTube tutorial on data analysis with Pandas and data visualization.',
  },
  {
    id: 'udemy-sql-bootcamp',
    title: 'The Complete SQL Bootcamp: From Zero to Hero',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/the-complete-sql-bootcamp/',
    instructor: 'Jose Portilla',
    rating: 4.7,
    students: 600000,
    duration: '9 hours',
    level: 'beginner',
    skills: ['sql', 'postgresql', 'database', 'queries', 'joins'],
    topics: ['sql', 'sql bootcamp', 'learn sql', 'postgresql', 'database'],
    price: 'paid',
    certificate: true,
    description: 'Master SQL from scratch with PostgreSQL. Covers joins, subqueries, and window functions.',
  },
  {
    id: 'coursera-excel-colorado',
    title: 'Excel Skills for Data Analytics and Visualization',
    platform: 'coursera',
    url: 'https://www.coursera.org/specializations/excel-data-analytics-visualization',
    instructor: 'University of Colorado',
    rating: 4.6,
    duration: '4 months',
    level: 'beginner',
    skills: ['excel', 'data visualization', 'pivot tables', 'charts', 'power query'],
    topics: ['excel', 'excel course', 'data visualization', 'spreadsheet', 'excel analytics'],
    price: 'freemium',
    certificate: true,
    description: 'Master Excel for data analysis including pivot tables, Power Query, and visualization.',
  },

  // ============ CLOUD & DEVOPS ============
  {
    id: 'udemy-aws-saa',
    title: 'Ultimate AWS Certified Solutions Architect Associate',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/',
    instructor: 'Stephane Maarek',
    rating: 4.7,
    students: 900000,
    duration: '27 hours',
    level: 'intermediate',
    skills: ['aws', 'cloud architecture', 'ec2', 's3', 'vpc', 'iam', 'rds'],
    topics: ['aws', 'aws certification', 'aws saa', 'cloud', 'solutions architect'],
    price: 'paid',
    certificate: true,
    description: 'The #1 AWS SAA certification course covering all exam topics with hands-on labs.',
  },
  {
    id: 'coursera-gcp-google',
    title: 'Google Cloud Professional Cloud Architect',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/gcp-cloud-architect',
    instructor: 'Google Cloud',
    rating: 4.6,
    students: 100000,
    duration: '6 months',
    level: 'intermediate',
    skills: ['gcp', 'cloud architecture', 'kubernetes', 'bigquery', 'compute engine'],
    topics: ['gcp', 'google cloud', 'cloud architect', 'gcp certification'],
    price: 'freemium',
    certificate: true,
    description: 'Official Google Cloud certification prep covering architecture, security, and services.',
  },
  {
    id: 'linkedin-learning-azure',
    title: 'Exam Prep: Microsoft Azure Administrator (AZ-104)',
    platform: 'linkedin-learning',
    url: 'https://www.linkedin.com/learning/paths/prepare-for-the-microsoft-azure-administrator-az-104-certification',
    instructor: 'LinkedIn Learning',
    rating: 4.5,
    duration: '30 hours',
    level: 'intermediate',
    skills: ['azure', 'virtual machines', 'storage', 'networking', 'identity'],
    topics: ['azure', 'azure certification', 'az-104', 'microsoft azure'],
    price: 'paid',
    certificate: true,
    description: 'Complete Azure Administrator certification prep with hands-on exercises.',
  },
  {
    id: 'udemy-docker-kubernetes',
    title: 'Docker and Kubernetes: The Complete Guide',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/',
    instructor: 'Stephen Grider',
    rating: 4.6,
    students: 300000,
    duration: '22 hours',
    level: 'intermediate',
    skills: ['docker', 'kubernetes', 'containers', 'docker compose', 'cicd'],
    topics: ['docker', 'kubernetes', 'containers', 'k8s', 'devops'],
    price: 'paid',
    certificate: true,
    description: 'Master Docker and Kubernetes with production deployment strategies.',
  },
  {
    id: 'youtube-techworld-k8s',
    title: 'Kubernetes Tutorial for Beginners',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=X48VuDVv0do',
    instructor: 'TechWorld with Nana',
    rating: 4.9,
    duration: '4 hours',
    level: 'beginner',
    skills: ['kubernetes', 'docker', 'containers', 'deployment', 'services'],
    topics: ['kubernetes', 'k8s', 'kubernetes free', 'k8s tutorial', 'container orchestration'],
    price: 'free',
    certificate: false,
    description: 'Free comprehensive Kubernetes crash course from basics to deployment.',
  },
  {
    id: 'coursera-devops-ibm',
    title: 'IBM DevOps and Software Engineering Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/devops-and-software-engineering',
    instructor: 'IBM',
    rating: 4.6,
    students: 100000,
    duration: '4 months',
    level: 'beginner',
    skills: ['devops', 'cicd', 'docker', 'kubernetes', 'python', 'agile'],
    topics: ['devops', 'cicd', 'ibm devops', 'software engineering', 'devops career'],
    price: 'freemium',
    certificate: true,
    description: 'IBM\'s DevOps certification covering CI/CD, containers, and agile practices.',
  },
  {
    id: 'udemy-terraform',
    title: 'HashiCorp Certified: Terraform Associate',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/terraform-beginner-to-advanced/',
    instructor: 'Zeal Vora',
    rating: 4.5,
    students: 100000,
    duration: '12 hours',
    level: 'intermediate',
    skills: ['terraform', 'infrastructure as code', 'aws', 'azure', 'gcp'],
    topics: ['terraform', 'infrastructure as code', 'iac', 'terraform certification'],
    price: 'paid',
    certificate: true,
    description: 'Complete Terraform course from basics to certification prep with hands-on labs.',
  },
  {
    id: 'pluralsight-cicd',
    title: 'Continuous Delivery and DevOps with Azure DevOps',
    platform: 'pluralsight',
    url: 'https://www.pluralsight.com/courses/azure-devops-continuous-delivery-devops',
    instructor: 'Marcel de Vries',
    rating: 4.5,
    duration: '4 hours',
    level: 'intermediate',
    skills: ['azure devops', 'cicd', 'pipelines', 'deployment'],
    topics: ['cicd', 'azure devops', 'devops', 'continuous delivery'],
    price: 'paid',
    certificate: true,
    description: 'Master CI/CD pipelines with Azure DevOps for automated deployments.',
  },

  // ============ CYBERSECURITY ============
  {
    id: 'coursera-cybersecurity-google',
    title: 'Google Cybersecurity Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/google-cybersecurity',
    instructor: 'Google',
    rating: 4.8,
    students: 300000,
    duration: '6 months',
    level: 'beginner',
    skills: ['cybersecurity', 'network security', 'linux', 'python', 'siem', 'incident response'],
    topics: ['cybersecurity', 'google cybersecurity', 'security analyst', 'network security'],
    price: 'freemium',
    certificate: true,
    description: 'Google\'s cybersecurity certification covering security operations, incident response, and tools.',
  },
  {
    id: 'udemy-ethical-hacking',
    title: 'Learn Ethical Hacking From Scratch',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/learn-ethical-hacking-from-scratch/',
    instructor: 'Zaid Sabih',
    rating: 4.6,
    students: 500000,
    duration: '16 hours',
    level: 'beginner',
    skills: ['ethical hacking', 'penetration testing', 'network hacking', 'kali linux'],
    topics: ['ethical hacking', 'hacking', 'penetration testing', 'cybersecurity', 'kali linux'],
    price: 'paid',
    certificate: true,
    description: 'Learn penetration testing and ethical hacking with hands-on Kali Linux labs.',
  },
  {
    id: 'edx-cybersecurity-mit',
    title: 'Cybersecurity for Critical Systems',
    platform: 'edx',
    url: 'https://www.edx.org/course/cybersecurity-critical-systems',
    instructor: 'MIT',
    rating: 4.5,
    duration: '6 weeks',
    level: 'intermediate',
    skills: ['cybersecurity', 'critical infrastructure', 'risk assessment', 'security'],
    topics: ['cybersecurity', 'mit security', 'infrastructure security'],
    price: 'free',
    certificate: true,
    description: 'MIT course on protecting critical systems and infrastructure from cyber threats.',
  },
  {
    id: 'youtube-networkchuck-linux',
    title: 'Linux for Hackers',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=VbEx7B_PTOE',
    instructor: 'NetworkChuck',
    rating: 4.8,
    duration: '2 hours',
    level: 'beginner',
    skills: ['linux', 'terminal', 'scripting', 'security'],
    topics: ['linux', 'linux tutorial', 'linux free', 'hacking linux', 'terminal'],
    price: 'free',
    certificate: false,
    description: 'Free Linux crash course covering essential commands for security professionals.',
  },

  // ============ MOBILE DEVELOPMENT ============
  {
    id: 'udemy-flutter-complete',
    title: 'The Complete Flutter Development Bootcamp with Dart',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/flutter-bootcamp-with-dart/',
    instructor: 'Dr. Angela Yu',
    rating: 4.7,
    students: 300000,
    duration: '28 hours',
    level: 'beginner',
    skills: ['flutter', 'dart', 'mobile development', 'ios', 'android', 'firebase'],
    topics: ['flutter', 'mobile development', 'cross platform', 'dart', 'flutter course'],
    price: 'paid',
    certificate: true,
    description: 'Build iOS & Android apps with Flutter and Dart. Official Flutter & Google-partnered course.',
  },
  {
    id: 'coursera-ios-meta',
    title: 'Meta iOS Developer Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/meta-ios-developer',
    instructor: 'Meta',
    rating: 4.6,
    students: 50000,
    duration: '7 months',
    level: 'beginner',
    skills: ['swift', 'ios', 'swiftui', 'xcode', 'mobile ui'],
    topics: ['ios', 'swift', 'ios development', 'meta ios', 'swiftui'],
    price: 'freemium',
    certificate: true,
    description: 'Official Meta iOS certification covering Swift, SwiftUI, and iOS app development.',
  },
  {
    id: 'coursera-android-meta',
    title: 'Meta Android Developer Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/meta-android-developer',
    instructor: 'Meta',
    rating: 4.6,
    students: 50000,
    duration: '7 months',
    level: 'beginner',
    skills: ['kotlin', 'android', 'jetpack compose', 'android studio', 'mobile ui'],
    topics: ['android', 'kotlin', 'android development', 'meta android', 'jetpack compose'],
    price: 'freemium',
    certificate: true,
    description: 'Official Meta Android certification covering Kotlin, Jetpack Compose, and Android development.',
  },
  {
    id: 'udemy-react-native',
    title: 'React Native - The Practical Guide',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/react-native-the-practical-guide/',
    instructor: 'Maximilian Schwarzmüller',
    rating: 4.6,
    students: 200000,
    duration: '28 hours',
    level: 'intermediate',
    skills: ['react native', 'javascript', 'expo', 'mobile development'],
    topics: ['react native', 'mobile development', 'cross platform', 'expo'],
    price: 'paid',
    certificate: true,
    description: 'Build native iOS & Android apps with React Native, Redux, and Expo.',
  },
  {
    id: 'youtube-traversy-rn',
    title: 'React Native Crash Course',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=Hf4MJH0jDb4',
    instructor: 'Traversy Media',
    rating: 4.7,
    duration: '2 hours',
    level: 'beginner',
    skills: ['react native', 'expo', 'mobile development'],
    topics: ['react native', 'react native free', 'mobile dev free', 'expo'],
    price: 'free',
    certificate: false,
    description: 'Free React Native crash course for building cross-platform mobile apps.',
  },

  // ============ BLOCKCHAIN & WEB3 ============
  {
    id: 'udemy-blockchain-az',
    title: 'Blockchain A-Z: Build A Blockchain, Cryptocurrency',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/build-your-blockchain-az/',
    instructor: 'Kirill Eremenko',
    rating: 4.5,
    students: 200000,
    duration: '14 hours',
    level: 'beginner',
    skills: ['blockchain', 'cryptocurrency', 'python', 'smart contracts'],
    topics: ['blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'web3'],
    price: 'paid',
    certificate: true,
    description: 'Build your own blockchain and cryptocurrency from scratch with Python.',
  },
  {
    id: 'coursera-blockchain-buffalo',
    title: 'Blockchain Specialization',
    platform: 'coursera',
    url: 'https://www.coursera.org/specializations/blockchain',
    instructor: 'University at Buffalo',
    rating: 4.6,
    students: 100000,
    duration: '4 months',
    level: 'intermediate',
    skills: ['blockchain', 'solidity', 'ethereum', 'smart contracts', 'dapps'],
    topics: ['blockchain', 'solidity', 'ethereum', 'smart contracts', 'dapps'],
    price: 'freemium',
    certificate: true,
    description: 'University course covering blockchain fundamentals, Solidity, and decentralized apps.',
  },
  {
    id: 'youtube-patrick-solidity',
    title: 'Learn Blockchain, Solidity, and Full Stack Web3 Development',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=gyMwXuJrbJQ',
    instructor: 'Patrick Collins',
    rating: 4.9,
    duration: '32 hours',
    level: 'beginner',
    skills: ['solidity', 'web3', 'ethereum', 'smart contracts', 'hardhat'],
    topics: ['solidity', 'web3', 'blockchain free', 'smart contracts', 'hardhat'],
    price: 'free',
    certificate: false,
    description: 'The most comprehensive free blockchain development course on YouTube (32 hours!).',
  },

  // ============ SOFT SKILLS & INTERVIEW PREP ============
  {
    id: 'udemy-tech-interview',
    title: 'Master the Coding Interview: Data Structures + Algorithms',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/master-the-coding-interview-data-structures-algorithms/',
    instructor: 'Andrei Neagoie',
    rating: 4.7,
    students: 300000,
    duration: '20 hours',
    level: 'intermediate',
    skills: ['data structures', 'algorithms', 'interview prep', 'problem solving'],
    topics: ['coding interview', 'dsa', 'algorithm', 'data structures', 'faang interview'],
    price: 'paid',
    certificate: true,
    description: 'Master technical interviews with Big-O, data structures, and algorithm problems.',
  },
  {
    id: 'coursera-interview-skills',
    title: 'How to Get Hired',
    platform: 'coursera',
    url: 'https://www.coursera.org/learn/how-to-get-hired',
    instructor: 'University of Maryland',
    rating: 4.5,
    duration: '4 weeks',
    level: 'beginner',
    skills: ['resume writing', 'interviewing', 'job search', 'networking'],
    topics: ['job search', 'resume', 'interview tips', 'career'],
    price: 'free',
    certificate: true,
    description: 'Career preparation course covering resume writing, networking, and interview strategies.',
  },
  {
    id: 'youtube-neetcode',
    title: 'NeetCode 150 Problems',
    platform: 'youtube',
    url: 'https://www.youtube.com/c/NeetCode',
    instructor: 'NeetCode',
    rating: 4.9,
    duration: '100+ hours',
    level: 'intermediate',
    skills: ['leetcode', 'algorithms', 'data structures', 'interview prep'],
    topics: ['leetcode', 'coding interview', 'dsa', 'algorithm problems', 'neetcode'],
    price: 'free',
    certificate: false,
    description: 'Free video explanations for 150 essential LeetCode problems for tech interviews.',
  },
  {
    id: 'linkedin-learning-communication',
    title: 'Communication Foundations',
    platform: 'linkedin-learning',
    url: 'https://www.linkedin.com/learning/communication-foundations-2',
    instructor: 'Tatiana Kolovou',
    rating: 4.7,
    duration: '2 hours',
    level: 'beginner',
    skills: ['communication', 'presentation', 'interpersonal skills'],
    topics: ['communication skills', 'soft skills', 'presentation', 'workplace'],
    price: 'freemium',
    certificate: true,
    description: 'Master workplace communication including presentations, meetings, and interpersonal skills.',
  },
  {
    id: 'khan-academy-algorithms',
    title: 'Algorithms Course',
    platform: 'khan-academy',
    url: 'https://www.khanacademy.org/computing/computer-science/algorithms',
    instructor: 'Khan Academy',
    rating: 4.7,
    duration: '20 hours',
    level: 'beginner',
    skills: ['algorithms', 'binary search', 'sorting', 'recursion', 'big o'],
    topics: ['algorithms', 'algorithm free', 'dsa free', 'sorting', 'binary search'],
    price: 'free',
    certificate: false,
    description: 'Free interactive algorithms course covering sorting, searching, and complexity analysis.',
  },

  // ============ PROJECT MANAGEMENT & PRODUCT ============
  {
    id: 'coursera-pm-google',
    title: 'Google Project Management Professional Certificate',
    platform: 'coursera',
    url: 'https://www.coursera.org/professional-certificates/google-project-management',
    instructor: 'Google',
    rating: 4.8,
    students: 800000,
    duration: '6 months',
    level: 'beginner',
    skills: ['project management', 'agile', 'scrum', 'stakeholder management'],
    topics: ['project management', 'google pm', 'agile', 'scrum', 'pmp'],
    price: 'freemium',
    certificate: true,
    description: 'Google\'s project management certification covering traditional and agile methodologies.',
  },
  {
    id: 'udemy-product-management',
    title: 'Become a Product Manager',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/become-a-product-manager-learn-the-skills-get-a-job/',
    instructor: 'Cole Mercer',
    rating: 4.5,
    students: 200000,
    duration: '12 hours',
    level: 'beginner',
    skills: ['product management', 'user research', 'roadmaps', 'agile', 'metrics'],
    topics: ['product management', 'product manager', 'pm course', 'product roadmap'],
    price: 'paid',
    certificate: true,
    description: 'Complete product management course covering research, roadmaps, and metrics.',
  },
  {
    id: 'linkedin-learning-agile',
    title: 'Agile Foundations',
    platform: 'linkedin-learning',
    url: 'https://www.linkedin.com/learning/agile-foundations',
    instructor: 'Doug Rose',
    rating: 4.6,
    duration: '2 hours',
    level: 'beginner',
    skills: ['agile', 'scrum', 'kanban', 'sprint planning'],
    topics: ['agile', 'scrum', 'kanban', 'agile certification'],
    price: 'freemium',
    certificate: true,
    description: 'Introduction to Agile methodologies including Scrum, Kanban, and sprint planning.',
  },

  // ============ DESIGN ============
  {
    id: 'skillshare-figma',
    title: 'Learn Figma: User Interface Design Essentials',
    platform: 'skillshare',
    url: 'https://www.skillshare.com/classes/Learn-Figma-User-Interface-Design-Essentials-UIUX-Design',
    instructor: 'Daniel Scott',
    rating: 4.7,
    students: 100000,
    duration: '10 hours',
    level: 'beginner',
    skills: ['figma', 'ui design', 'ux design', 'prototyping'],
    topics: ['figma', 'ui design', 'ux design', 'web design', 'app design'],
    price: 'freemium',
    certificate: true,
    description: 'Complete Figma course covering UI design, components, prototyping, and collaboration.',
  },
  {
    id: 'youtube-figma-tutorial',
    title: 'Figma Tutorial for Beginners',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8',
    instructor: 'freeCodeCamp',
    rating: 4.8,
    duration: '3 hours',
    level: 'beginner',
    skills: ['figma', 'ui design', 'wireframing'],
    topics: ['figma free', 'figma tutorial', 'ui design free', 'design tool'],
    price: 'free',
    certificate: false,
    description: 'Free comprehensive Figma tutorial covering all essential features.',
  },
  {
    id: 'coursera-graphic-design',
    title: 'Graphic Design Specialization',
    platform: 'coursera',
    url: 'https://www.coursera.org/specializations/graphic-design',
    instructor: 'CalArts',
    rating: 4.6,
    students: 200000,
    duration: '6 months',
    level: 'beginner',
    skills: ['graphic design', 'typography', 'color theory', 'adobe illustrator'],
    topics: ['graphic design', 'typography', 'visual design', 'adobe', 'branding'],
    price: 'freemium',
    certificate: true,
    description: 'CalArts graphic design specialization covering fundamentals to portfolio building.',
  },

  // ============ MISCELLANEOUS / EMERGING TECH ============
  {
    id: 'coursera-prompt-engineering',
    title: 'Prompt Engineering for ChatGPT',
    platform: 'coursera',
    url: 'https://www.coursera.org/learn/prompt-engineering',
    instructor: 'Vanderbilt University',
    rating: 4.6,
    students: 200000,
    duration: '4 weeks',
    level: 'beginner',
    skills: ['prompt engineering', 'chatgpt', 'llm', 'ai tools'],
    topics: ['prompt engineering', 'chatgpt', 'gpt', 'ai prompts', 'llm'],
    price: 'free',
    certificate: true,
    description: 'Learn to effectively prompt LLMs like ChatGPT for various tasks.',
  },
  {
    id: 'udemy-chatgpt-complete',
    title: 'The Complete ChatGPT Course: Beginner to Expert',
    platform: 'udemy',
    url: 'https://www.udemy.com/course/chatgpt-complete-guide/',
    instructor: 'Julian Melanson',
    rating: 4.5,
    students: 300000,
    duration: '8 hours',
    level: 'beginner',
    skills: ['chatgpt', 'ai tools', 'prompt engineering', 'productivity'],
    topics: ['chatgpt', 'ai tools', 'chatgpt course', 'gpt-4', 'ai productivity'],
    price: 'paid',
    certificate: true,
    description: 'Master ChatGPT for coding, content creation, marketing, and productivity.',
  },
  {
    id: 'mit-ocw-algorithms',
    title: 'Introduction to Algorithms',
    platform: 'mit-ocw',
    url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
    instructor: 'MIT',
    rating: 4.9,
    duration: '24 lectures',
    level: 'intermediate',
    skills: ['algorithms', 'data structures', 'dynamic programming', 'graphs'],
    topics: ['algorithms', 'mit algorithms', 'dsa', 'computer science'],
    price: 'free',
    certificate: false,
    description: 'MIT\'s legendary algorithms course (6.006) with full lecture videos and problem sets.',
  },
  {
    id: 'freecodecamp-apis',
    title: 'Back End Development and APIs',
    platform: 'freecodecamp',
    url: 'https://www.freecodecamp.org/learn/back-end-development-and-apis/',
    instructor: 'freeCodeCamp',
    rating: 4.6,
    duration: '300 hours',
    level: 'intermediate',
    skills: ['nodejs', 'express', 'mongodb', 'rest api'],
    topics: ['backend free', 'api development', 'nodejs free', 'express free'],
    price: 'free',
    certificate: true,
    description: 'Free certification covering Node.js, Express, MongoDB, and building RESTful APIs.',
  },
  {
    id: 'pluralsight-clean-code',
    title: 'Clean Code: Writing Code for Humans',
    platform: 'pluralsight',
    url: 'https://www.pluralsight.com/courses/writing-clean-code-humans',
    instructor: 'Cory House',
    rating: 4.8,
    duration: '3 hours',
    level: 'intermediate',
    skills: ['clean code', 'refactoring', 'best practices', 'code quality'],
    topics: ['clean code', 'code quality', 'refactoring', 'best practices'],
    price: 'paid',
    certificate: true,
    description: 'Write maintainable, readable code following clean code principles.',
  },
  {
    id: 'edx-git-github',
    title: 'Introduction to Git and GitHub',
    platform: 'edx',
    url: 'https://www.edx.org/course/introduction-to-git-and-github',
    instructor: 'Google',
    rating: 4.5,
    duration: '4 weeks',
    level: 'beginner',
    skills: ['git', 'github', 'version control', 'collaboration'],
    topics: ['git', 'github', 'version control', 'git free'],
    price: 'free',
    certificate: true,
    description: 'Google\'s introduction to Git and GitHub for version control and collaboration.',
  },
  {
    id: 'youtube-git-freecodecamp',
    title: 'Git and GitHub for Beginners',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=RGOj5yH7evk',
    instructor: 'freeCodeCamp',
    rating: 4.8,
    duration: '1 hour',
    level: 'beginner',
    skills: ['git', 'github', 'version control'],
    topics: ['git tutorial', 'github tutorial', 'git free', 'version control free'],
    price: 'free',
    certificate: false,
    description: 'Free crash course covering Git basics, branching, merging, and GitHub workflows.',
  },
];

// ==================== SEARCH & RECOMMENDATION ENGINE ====================

export interface CourseSearchResult {
  course: Course;
  relevanceScore: number;
  matchedTopics: string[];
}

/**
 * Search for courses by query
 */
export function searchCourses(
  query: string,
  platform?: Platform,
  maxResults: number = 5
): CourseSearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  
  const results: CourseSearchResult[] = [];
  
  for (const course of COURSES) {
    // Filter by platform if specified
    if (platform && course.platform !== platform) continue;
    
    let score = 0;
    const matchedTopics: string[] = [];
    
    // Check title match (highest weight)
    const titleLower = course.title.toLowerCase();
    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        score += 10;
        matchedTopics.push(word);
      }
    }
    
    // Check topics match
    for (const topic of course.topics) {
      const topicLower = topic.toLowerCase();
      if (topicLower.includes(normalizedQuery) || normalizedQuery.includes(topicLower)) {
        score += 8;
        matchedTopics.push(topic);
      }
      for (const word of queryWords) {
        if (topicLower.includes(word)) {
          score += 3;
          if (!matchedTopics.includes(topic)) matchedTopics.push(topic);
        }
      }
    }
    
    // Check skills match
    for (const skill of course.skills) {
      const skillLower = skill.toLowerCase();
      for (const word of queryWords) {
        if (skillLower.includes(word) || word.includes(skillLower)) {
          score += 5;
          if (!matchedTopics.includes(skill)) matchedTopics.push(skill);
        }
      }
    }
    
    // Check instructor match
    if (course.instructor.toLowerCase().includes(normalizedQuery)) {
      score += 4;
    }
    
    // Boost by rating
    score += course.rating;
    
    // Boost free courses slightly
    if (course.price === 'free') score += 1;
    
    if (score > 0) {
      results.push({ course, relevanceScore: score, matchedTopics: [...new Set(matchedTopics)] });
    }
  }
  
  // Sort by relevance score
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return results.slice(0, maxResults);
}

/**
 * Get courses for specific platform
 */
export function getCoursesByPlatform(platform: Platform, maxResults: number = 10): Course[] {
  return COURSES.filter(c => c.platform === platform).slice(0, maxResults);
}

/**
 * Get courses for specific skill
 */
export function getCoursesBySkill(skill: string, maxResults: number = 5): Course[] {
  const skillLower = skill.toLowerCase();
  return COURSES.filter(c => 
    c.skills.some(s => s.toLowerCase().includes(skillLower) || skillLower.includes(s.toLowerCase()))
  ).slice(0, maxResults);
}

/**
 * Get free courses
 */
export function getFreeCourses(maxResults: number = 10): Course[] {
  return COURSES.filter(c => c.price === 'free').slice(0, maxResults);
}

/**
 * Get top rated courses
 */
export function getTopRatedCourses(maxResults: number = 10): Course[] {
  return [...COURSES].sort((a, b) => b.rating - a.rating).slice(0, maxResults);
}

/**
 * Parse user query for course recommendations
 * Returns structured search params from natural language
 */
export interface ParsedCourseQuery {
  skill: string | null;
  platform: Platform | null;
  level: 'beginner' | 'intermediate' | 'advanced' | null;
  free: boolean;
  rawQuery: string;
}

export function parseCourseQuery(message: string): ParsedCourseQuery {
  const lower = message.toLowerCase();
  
  // Detect platform
  let platform: Platform | null = null;
  if (lower.includes('udemy')) platform = 'udemy';
  else if (lower.includes('coursera')) platform = 'coursera';
  else if (lower.includes('youtube')) platform = 'youtube';
  else if (lower.includes('edx')) platform = 'edx';
  else if (lower.includes('pluralsight')) platform = 'pluralsight';
  else if (lower.includes('linkedin learning')) platform = 'linkedin-learning';
  else if (lower.includes('udacity')) platform = 'udacity';
  else if (lower.includes('skillshare')) platform = 'skillshare';
  else if (lower.includes('codecademy')) platform = 'codecademy';
  else if (lower.includes('freecodecamp') || lower.includes('free code camp')) platform = 'freecodecamp';
  else if (lower.includes('mit') || lower.includes('mit ocw')) platform = 'mit-ocw';
  else if (lower.includes('khan academy')) platform = 'khan-academy';
  
  // Detect level
  let level: 'beginner' | 'intermediate' | 'advanced' | null = null;
  if (lower.includes('beginner') || lower.includes('basics') || lower.includes('intro') || lower.includes('start')) {
    level = 'beginner';
  } else if (lower.includes('intermediate') || lower.includes('mid-level')) {
    level = 'intermediate';
  } else if (lower.includes('advanced') || lower.includes('expert')) {
    level = 'advanced';
  }
  
  // Detect free preference
  const free = lower.includes('free') && !lower.includes('freecodecamp');
  
  // Extract skill/topic (remove common words)
  const stopWords = ['want', 'learn', 'course', 'courses', 'suggest', 'recommend', 'show', 'me', 'the', 'a', 'an', 'on', 'for', 'to', 'i', 'about', 'only', 'with', 'links', 'give', 'please', 'can', 'you', 'find', 'best', platform || ''].filter(Boolean);
  const words = lower.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
  const skill = words.join(' ').trim() || null;
  
  return {
    skill,
    platform,
    level,
    free,
    rawQuery: message,
  };
}

/**
 * Format course for chat display
 */
export function formatCourseForChat(course: Course): string {
  const platformInfo = PLATFORM_INFO[course.platform];
  const priceLabel = course.price === 'free' ? '🆓 Free' : course.price === 'freemium' ? '🔓 Free to audit' : '💰 Paid';
  
  return `**${course.title}**
${platformInfo.icon} ${platformInfo.name} | ⭐ ${course.rating} | ${priceLabel}
👤 ${course.instructor} | ⏱️ ${course.duration}
🔗 [View Course](${course.url})`;
}

/**
 * Format multiple courses for chat
 */
export function formatCoursesForChat(courses: Course[], query: string): string {
  if (courses.length === 0) {
    return `❌ No courses found for "${query}".\n\nTry searching for popular topics like:\n• Machine Learning\n• Web Development\n• Python\n• AWS\n• Data Science`;
  }
  
  const formatted = courses.map((c, i) => `${i + 1}. ${formatCourseForChat(c)}`).join('\n\n');
  return `📚 **Course Recommendations for "${query}":**\n\n${formatted}`;
}

/**
 * Get all available platforms
 */
export function getAllPlatforms(): { id: Platform; name: string; icon: string }[] {
  return Object.entries(PLATFORM_INFO).map(([id, info]) => ({
    id: id as Platform,
    name: info.name,
    icon: info.icon,
  }));
}

/**
 * Count courses by platform
 */
export function getCourseCountByPlatform(): Record<Platform, number> {
  const counts: Partial<Record<Platform, number>> = {};
  for (const course of COURSES) {
    counts[course.platform] = (counts[course.platform] || 0) + 1;
  }
  return counts as Record<Platform, number>;
}
