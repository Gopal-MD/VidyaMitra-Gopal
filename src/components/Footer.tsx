
import { Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t dark:border-gray-800 py-6">
      <div className="container flex flex-col md:flex-row justify-between items-center gap-4 px-4 md:px-6">
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          © 2025 MockMate. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <a 
            href="#" 
            className="text-sm text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white transition-colors"
          >
            Privacy Policy
          </a>
          <a 
            href="#" 
            className="text-sm text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white transition-colors"
          >
            Terms of Service
          </a>
          <a 
            href="https://github.com" 
            className="text-sm text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
