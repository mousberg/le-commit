"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const ArrowIcon = () => (
  <svg 
    width="20" 
    height="21" 
    viewBox="0 0 20 21" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="10" cy="10.9469" r="10" fill="#282828"></circle>
    <mask 
      id="mask0_1_567" 
      style={{ maskType: "alpha" }} 
      maskUnits="userSpaceOnUse" 
      x="0" 
      y="0" 
      width="20" 
      height="21"
    >
      <circle cx="10" cy="10.9469" r="10" fill="#282828"></circle>
    </mask>
    <g mask="url(#mask0_1_567)">
      <path 
        d="M4.78544 8.12311L12.8231 8.12311M12.8231 8.12311L12.8231 16.1608M12.8231 8.12311L3.1779 17.7683" 
        stroke="white" 
        strokeWidth="1.3" 
        strokeLinecap="square"
      />
    </g>
  </svg>
);

interface HeaderProps {
  onDemoOpen?: () => void;
  onWaitlistOpen?: () => void;
}

export default function Navbar({ onDemoOpen, onWaitlistOpen }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleWaitlistClick = () => {
    if (onWaitlistOpen) {
      onWaitlistOpen();
    } else {
      // Dispatch custom event to open waitlist overlay
      window.dispatchEvent(new CustomEvent('openWaitlist'));
    }
  };

  const handleDemoClick = () => {
    if (onDemoOpen) {
      onDemoOpen();
    } else {
      // Dispatch custom event to open demo overlay
      window.dispatchEvent(new CustomEvent('openDemo'));
    }
  };

  return (
    <div className={`mx-auto fixed flex left-0 right-0 top-0 w-full z-[50] items-center justify-between max-w-[76rem] select-none transition-all duration-300 ease-spring lg:mt-5 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md lg:rounded-full mx-0 lg:mx-auto shadow-lg' 
        : 'bg-transparent'
    }`}>
      <header className="relative isolate w-full bg-transparent">
        <nav className="flex items-center justify-between p-3 lg:p-2 bg-transparent">
          {/* Logo */}
          <div className="flex lg:flex-1 ml-2 -mt-0.5">
            <Link 
              href="/" 
              className="flex items-center"
            >
              <img 
                src="/Logo-full.svg" 
                alt="Unmask" 
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-zinc-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="size-5.5 mr-1 outline-none" />
              ) : (
                <Menu className="size-5.5 mr-1 outline-none" />
              )}
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex lg:gap-x-12">
            <Link 
              href="/#features" 
              className="text-sm/6 font-semibold text-zinc-900 hover:text-pink-400 transition-colors"
            >
              How it works
            </Link>
            <button 
              onClick={handleDemoClick}
              className="text-sm/6 font-semibold text-zinc-900 hover:text-pink-400 transition-colors"
            >
              Demo
            </button>
            <Link 
              href="/#testimonials" 
              className="text-sm/6 font-semibold text-zinc-900 hover:text-pink-400 transition-colors"
            >
              Testimonials
            </Link>
            <Link 
              href="/blog" 
              className="text-sm/6 font-semibold text-zinc-900 hover:text-pink-400 transition-colors"
            >
              Blog
            </Link>
          </div>

          {/* Desktop CTA buttons */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-x-5">
            <button 
              onClick={handleWaitlistClick}
              className="flex px-3 py-1.5 gap-x-1 text-sm/6 font-semibold rounded-full text-white bg-black hover:bg-pink-500 hover:shadow-[0_0_20px_rgba(255,105,180,0.7)] transition-all duration-300"
            >
              Try Unmask
              <ArrowIcon />
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-white/20 shadow-xl z-50 mobile-menu-animated">
            <div className="p-6">
              <nav className="flex flex-col space-y-1">
                <Link 
                  href="/#features" 
                  className="text-base font-semibold text-zinc-900 hover:text-pink-500 transition-colors py-3 px-4 rounded-lg hover:bg-pink-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  How it works
                </Link>
                <button 
                  onClick={() => {
                    handleDemoClick();
                    setIsMenuOpen(false);
                  }}
                  className="text-base font-semibold text-zinc-900 hover:text-pink-500 transition-colors py-3 px-4 rounded-lg hover:bg-pink-50 text-left w-full"
                >
                  Demo
                </button>
                <Link 
                  href="/#testimonials" 
                  className="text-base font-semibold text-zinc-900 hover:text-pink-500 transition-colors py-3 px-4 rounded-lg hover:bg-pink-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Testimonials
                </Link>
                <Link 
                  href="/blog" 
                  className="text-base font-semibold text-zinc-900 hover:text-pink-500 transition-colors py-3 px-4 rounded-lg hover:bg-pink-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Blog
                </Link>
              </nav>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={() => {
                    handleWaitlistClick();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-x-1 px-6 py-3 text-base font-semibold rounded-full text-white bg-black hover:bg-pink-500 hover:shadow-[0_0_20px_rgba(255,105,180,0.7)] transition-all duration-300"
                >
                  Try Unmask
                  <ArrowIcon />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
