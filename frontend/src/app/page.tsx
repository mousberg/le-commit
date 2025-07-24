"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import DemoOverlay from "@/components/DemoOverlay";
import WaitlistOverlay from "@/components/WaitlistOverlay";

export default function Home() {
  const [email, setEmail] = useState("");
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  useEffect(() => {
    const handleDemoOpen = () => setIsDemoOpen(true);
    const handleWaitlistOpen = () => setIsWaitlistOpen(true);
    
    window.addEventListener('openDemo', handleDemoOpen);
    window.addEventListener('openWaitlist', handleWaitlistOpen);
    
    return () => {
      window.removeEventListener('openDemo', handleDemoOpen);
      window.removeEventListener('openWaitlist', handleWaitlistOpen);
    };
  }, []);
  return (
    <main className="w-full">
      {/* Hero Section */}
      <div className="relative py-32 sm:py-48 lg:py-60 select-none bg-gradient-to-t from-pink-100 to-pink-200" id="waitlist-form">
        {/* Island animation layers - different for mobile and desktop */}
        <div className="absolute inset-0 overflow-hidden contain-paint">
          {/* Desktop islands */}
          <div className="hidden lg:block">
            <div className="absolute inset-[0.5rem] rounded-[12rem] bg-white/2 shadow-[0_0_40px_rgba(255,105,180,0.3)] blur-[4px] island-float-1"></div>
            <div className="absolute inset-[3rem] rounded-[12rem] bg-white/2 shadow-[0_0_30px_rgba(255,105,180,0.25)] blur-[3px] island-float-2"></div>
            <div className="absolute inset-[6rem] rounded-[12rem] bg-white/2 shadow-[0_0_20px_rgba(255,105,180,0.2)] blur-[2px] island-float-3"></div>
            <div className="absolute inset-[10rem] rounded-[8rem] bg-white/2 shadow-[inset_0_0_30px_rgba(255,255,255,0.4)] blur-[1px] island-float-4"></div>
          </div>
          
          {/* Mobile islands - smaller and more subtle */}
          <div className="lg:hidden overflow-hidden">
            <div className="absolute inset-[2rem] rounded-[6rem] bg-white/2 shadow-[0_0_15px_rgba(255,105,180,0.15)] blur-[1px] island-float-1"></div>
            <div className="absolute inset-[5rem] rounded-[4rem] bg-white/1 shadow-[0_0_10px_rgba(255,105,180,0.1)] blur-[0.5px] island-float-3"></div>
            <div className="absolute inset-[8rem] rounded-[3rem] bg-white/1 shadow-[inset_0_0_10px_rgba(255,255,255,0.2)] blur-[0.5px] island-float-2"></div>
          </div>
        </div>

        {/* Background gradient blob */}
        <div 
          aria-hidden="true" 
          className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 overflow-hidden blur-3xl"
        >
          <div 
            style={{
              clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            }} 
            className="relative left-1/2 aspect-[1155/678] w-96 -translate-x-1/2 bg-gradient-to-tr from-pink-500 to-pink-600 opacity-30 sm:w-[36rem] md:w-[72rem] animate-pulse"
          />
        </div>

        {/* Hero content */}
        <div className="relative text-center z-[1] mx-auto max-w-3xl lg:pb-16">
          <h1 className="text-4xl font-medium tracking-tight text-balance text-zinc-900 sm:text-7xl">
            Trust who you hire, without wasting time.
          </h1>
          <p className="mx-auto max-w-lg mt-5 text-lg/6 lg:text-xl/6 font-medium text-balance text-zinc-500">
            Instant checks across CVs, LinkedIn, GitHub, and calls to expose red flags and protect your hiring pipeline.
          </p>

          {/* Glassmorphic Email Island */}
          <div className="mt-10 max-w-lg mx-auto relative px-4 sm:px-0">
            {/* Floating particles around input - mobile only */}
            <div className="lg:hidden absolute inset-0 pointer-events-none">
              <div className="absolute -top-6 left-2 w-1.5 h-1.5 bg-pink-300/40 rounded-full island-float-1"></div>
              <div className="absolute -top-4 right-4 w-1 h-1 bg-pink-400/30 rounded-full island-float-2" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-2 right-2 w-2 h-2 bg-pink-200/50 rounded-full island-float-3" style={{animationDelay: '2s'}}></div>
              <div className="absolute -bottom-4 left-8 w-1.5 h-1.5 bg-pink-300/35 rounded-full island-float-1" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute -bottom-2 left-2 w-1 h-1 bg-pink-400/40 rounded-full island-float-2" style={{animationDelay: '1.5s'}}></div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full p-2 shadow-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,105,180,0.3)] focus-within:shadow-[0_0_30px_rgba(255,105,180,0.5)] focus-within:border-pink-300/50 relative z-10">
              <div className="flex items-center gap-x-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-10 bg-transparent border-none outline-none placeholder:text-gray-600 text-gray-900 focus:ring-0 focus:border-none"
                />
                <button 
                  onClick={() => {
                    if (email && email.includes('@')) {
                      setIsWaitlistOpen(true);
                    } else {
                      alert('Please enter a valid email address');
                    }
                  }}
                  className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-black/90 hover:scale-105 whitespace-nowrap"
                >
                  Join the waitlist
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* UI Preview - desktop only */}
        <div className="hidden z-[11] lg:block absolute -bottom-[11.5rem] left-1/2 transform -translate-x-1/2 z-[1] max-w-2xl pointer-events-none">
          <img 
            src="/screen.png" 
            alt="Unmask UI Preview" 
            width={768}
            height={432}
            className="w-full h-auto rounded-lg"
          />
        </div>
      </div>

      <Features />
      <Testimonials />
      <Footer />
      
      {/* Demo Overlay */}
      <DemoOverlay 
        isOpen={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
      />
      
      {/* Waitlist Overlay */}
      <WaitlistOverlay 
        isOpen={isWaitlistOpen} 
        onClose={() => setIsWaitlistOpen(false)}
        initialEmail={email}
      />
    </main>
  );
}
