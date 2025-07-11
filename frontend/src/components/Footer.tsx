"use client";

import { useEffect } from "react";
import { Github } from "lucide-react";

export default function Footer() {
  useEffect(() => {
    const handleBackToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const backToTopButton = document.getElementById('back-to-top');
    if (backToTopButton) {
      backToTopButton.addEventListener('click', handleBackToTop);
      return () => backToTopButton.removeEventListener('click', handleBackToTop);
    }
  }, []);

  return (
    <footer className="bg-black text-white py-8 select-none">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-4">
        {/* Left Side */}
        <div className="flex flex-col md:flex-row items-center gap-4 text-sm">
          <span>Unmask 2025. All Rights Reserved</span>
          <span className="hidden md:block">•</span>
          <a href="mailto:info@unmask.click" className="flex items-center gap-2 hover:text-pink-400 transition-colors">
            <svg className="size-4 text-pink-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
            </svg>
            info@unmask.click
          </a>
          <span className="hidden md:block">•</span>
          <span className="flex items-center gap-2">
            Built for RAISE YOUR HACK 2025 • 
            <svg className="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 36.4">
              <path fill="#007bfc" d="M14.63,4a2.09,2.09,0,0,0-1.77-1H2.1A2.1,2.1,0,0,0,0,5.1,2.12,2.12,0,0,0,.32,6.22l2.21,3.5L16.84,7.48Z" transform="translate(0 -3)"/>
              <path fill="#51b9ff" d="M16.84,7.48a2.1,2.1,0,0,0-1.78-1H4.31a2.1,2.1,0,0,0-2.1,2.1,2,2,0,0,0,.32,1.12l3.09,4.9,14.31-2.24Z" transform="translate(0 -3)"/>
              <path fill="#fff" d="M5.62,14.62A2,2,0,0,1,5.3,13.5a2.1,2.1,0,0,1,2.1-2.1H18.15a2.1,2.1,0,0,1,1.78,1l9.62,15.27a2,2,0,0,1,.33,1.12,2.07,2.07,0,0,1-.33,1.12l-5.37,8.53a2.11,2.11,0,0,1-3.56,0Z" transform="translate(0 -3)"/>
              <path fill="#fff" d="M32.74,19.19a2.11,2.11,0,0,0,3.56,0l1.85-2.93,3.53-5.6A2.12,2.12,0,0,0,42,9.54a2.15,2.15,0,0,0-.32-1.12L38.88,4A2.11,2.11,0,0,0,37.1,3H26.34a2.1,2.1,0,0,0-2.1,2.1,2,2,0,0,0,.33,1.12Z" transform="translate(0 -3)"/>
            </svg>
            Vultr Track
          </span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/mousberg/le-commit" 
            className="flex items-center gap-2 text-sm hover:text-pink-400 transition-colors"
          >
            <Github className="size-4" />
            GitHub
          </a>
          <button 
            id="back-to-top"
            className="text-sm hover:text-pink-400 transition-colors"
          >
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}