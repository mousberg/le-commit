"use client";

import { useEffect, useState, useRef } from "react";

export default function Testimonials() {
  const [showConfetti, setShowConfetti] = useState(false);
  const awardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !showConfetti) {
          setShowConfetti(true);
        }
      },
      { threshold: 0.5 }
    );

    if (awardRef.current) {
      observer.observe(awardRef.current);
    }

    return () => {
      const currentRef = awardRef.current;
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [showConfetti]);
  
  return (
    <div id="testimonials" className="mx-auto max-w-7xl pt-20 lg:pt-[16.25rem] select-none lg:border-x border-zinc-200 overflow-hidden">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center px-5 lg:px-0">
        <h2 className="text-lg/10 font-base text-zinc-500 uppercase">Testimonials</h2>
        <p className="mt-2 text-4xl font-medium tracking-tight text-pretty text-black sm:text-5xl sm:text-balance">
          Stop hiring the wrong people.
        </p>
      </div>

      {/* Content Cards with Borders */}
      <div className="mt-20 mb-16 lg:mb-0 lg:border-y border-zinc-200">
        
        {/* Award Section */}
        <div ref={awardRef} className="relative lg:border-b border-zinc-200">
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="confetti absolute animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.8}s`,
                    backgroundColor: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#98FB98', '#DDA0DD'][Math.floor(Math.random() * 6)]
                  }}
                />
              ))}
            </div>
          )}
          <div className="px-8 py-16 lg:py-20 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                🏆 RAISE YOUR HACK 2025
              </div>
              <h3 className="text-2xl font-medium text-zinc-900 mb-4">
                #1 Prize in Vultr Track
              </h3>
              <p className="text-base leading-5 text-zinc-600 mb-6">
                Recognized as the top project at the RAISE summit hackathon in Paris, July 8-9, 2025.
              </p>
              <div className="mb-6">
                <img 
                  src="/team-win.png" 
                  alt="Unmask team winning at RAISE YOUR HACK 2025"
                  className="rounded-lg mx-auto max-w-xl w-full"
                />
              </div>
              <a 
                href="https://lablab.ai/event/raise-your-hack/le-commit-unmask-vultr-track/unmask"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Read more about our submission →
              </a>
            </div>
          </div>
          <div className="hidden lg:block absolute bg-[#0055FE] w-1 h-[2.125rem] top-[4rem] -left-[1px]"></div>
        </div>

        {/* Testimonial Section */}
        <div className="relative lg:border-b border-zinc-200">
          <div className="px-8 py-16 lg:py-20">
            <div className="text-center max-w-3xl mx-auto">
              <blockquote className="text-2xl font-medium text-zinc-900 mb-8">
&quot;Great presentation, and implementation. Real business value for filtering out prospects for People Operations. Job well done.&quot;
              </blockquote>
              <div className="flex items-center justify-center gap-4">
                <img 
                  src="https://storage.googleapis.com/lablab-static-eu/images/midjourney/profile/profile%20(102).png"
                  alt="Mayank Debnath"
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="font-medium text-zinc-900">Mayank Debnath</div>
                  <div className="text-sm text-zinc-500">Judge, RAISE YOUR HACK 2025</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}