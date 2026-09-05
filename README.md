# VidyaMitra

**AI-Powered Mock Interview & Resume Shortlisting Platform**

VidyaMitra is a full-stack web application that simulates real interview experiences using AI. It helps candidates practice interviews with instant feedback, and enables recruiters to shortlist resumes efficiently using ATS scoring.

---

## Features

### For Candidates
- **AI Interview Simulator (FRIEDE Bot)** — Real-time voice-based mock interviews powered by Google Gemini AI
- **Multi-Round Interview System** — Aptitude MCQs, coding challenges, and behavioral interviews
- **Live Code Editor** — In-browser code editor with Judge0 code execution and test case validation
- **Resume Upload & ATS Scoring** — Upload your resume and get an ATS compatibility score
- **Instant Feedback & Scoring** — AI-generated performance reports with strengths and improvement areas
- **Interview History** — Track all past interviews with downloadable PDF reports
- **AI Chatbot Assistant** — Get help and guidance throughout the platform
- **Malpractice Detection** — Tab-switch detection, AI-answer flagging, and anti-cheating measures

### For Admins / Recruiters
- **Admin Dashboard** — Manage candidates, questions, and interview sessions
- **Bulk Resume Shortlisting** — Upload and auto-screen hundreds of resumes
- **Custom Question Sets** — Add role-based randomized question pools
- **Selection Email Notifications** — Send selection/rejection emails to candidates

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | cloud (aws s3, lambda, ec2) |
| **AI** | Google Gemini API, OpenAI GPT-4.1 (server-side proxy) |
| **Code Execution** | Judge0 API via RapidAPI |
| **Voice** | Web Speech API (Speech Recognition + Synthesis) |
| **PDF Processing** | pdf.js, jsPDF |

---

## Getting Started


### Installation

```bash
# Clone the repository
git clone https://github.com/GaneshRam15/VidyaMitra.git
cd VidyaMitra

# Install dependencies
npm install
```

### Environment Setup

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual API keys:

```env
# Google Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_CHATBOT_API_KEY=your_chatbot_key
VITE_GEMINI_FRIEDE_API_KEY=your_friede_key

# Database
DB_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Run Locally

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Project Structure

```
VidyaMitra/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page-level components (routes)
│   ├── contexts/       # React contexts (Auth, Interview, Theme)
│   ├── config/         # API key configuration
│   ├── data/           # Static question data
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   ├── types/          # TypeScript type definitions
│   └── utils/          # AI services, code execution, helpers
├── server/             # Express API Server & Database adapters
├── public/             # Static assets
└── supabase/           # Database schema & migrations
```

---

## Documentation

- [FRIEDE Bot Documentation](FRIEDE_BOT_DOCUMENTATION.md)
- [Multi-Round Interview System](MULTI_ROUND_SYSTEM.md)
- [Security Enhancements](SECURITY_ENHANCEMENTS.md)

---

## License

This project is for educational and demonstration purposes.
