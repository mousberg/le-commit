"use client";

export default function Features() {
  return (
    <div id="features" className="mx-auto max-w-7xl pt-20 lg:pt-[16.25rem] select-none lg:border-x border-zinc-200 overflow-hidden">
      {/* Section Header */}
      <div className="mx-auto max-w-2xl sm:text-center px-5 lg:px-0">
        <h2 className="text-lg/10 font-base text-zinc-500 uppercase">How it works</h2>
        <p className="mt-2 text-4xl font-medium tracking-tight text-pretty text-black sm:text-5xl sm:text-balance">
          Unmask helps with everything it checks and hears.
        </p>
      </div>

      {/* First Two Feature Cards (Side by Side) */}
      <div className="grid lg:grid-cols-2 mt-20 mb-16 lg:mb-0 pointer-events-none lg:border-y border-zinc-200 lg:divide-x divide-zinc-200">
        
        {/* Feature Card 1: "User Info Check" */}
        <div className="relative">
          <img 
            src="/22.png" 
            alt="Screen monitoring feature"
            className="w-full h-auto"
          />
          <div className="px-8 py-6">
            <h2 className="text-2xl font-medium break-words">User Info Check</h2>
            <p className="mt-3 text-base leading-5 text-zinc-600 break-words">
              Upload a CV, LinkedIn, and GitHub. Unmask flags timeline gaps, fake profiles, and missing signals.
            </p>
          </div>
          <div className="hidden lg:block absolute bg-[#0055FE] w-1 h-[2.125rem] bottom-[4.5rem] -left-[1px]"></div>
        </div>

        {/* Feature Card 2: "Reference Call Automation" */}
        <div className="relative">
          <img 
            src="/ref.png" 
            alt="Reference Call Automation"
            className="w-full h-auto"
          />
          <div className="px-8 py-6">
            <h2 className="text-2xl font-medium break-words">Reference Call Automation</h2>
            <p className="mt-3 text-base leading-5 text-zinc-600 break-words">
              Add past references — Unmask automates the call, transcribes responses, and checks them against the candidate&apos;s story.
            </p>
          </div>
          <div className="hidden lg:block absolute bg-[#0055FE] w-1 h-[2.125rem] bottom-[4.5rem] -left-[1px]"></div>
        </div>
      </div>

      {/* Feature Card 3: "Live Interview Feedback" (Full Width) */}
      <div className="relative pointer-events-none lg:border-b border-zinc-200">
        <div className="grid lg:grid-cols-2">
          {/* Left side - Text and small image */}
          <div className="px-8 py-16 lg:py-20 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-medium break-words">Live Interview Feedback</h2>
              <p className="mt-3 text-base leading-5 text-zinc-600 break-words">
                Get real-time prompts and live transcripts during calls. Unmask highlights inconsistencies and suggests questions on the spot.
              </p>
            </div>
            <div className="mt-8">
              <img 
                src="/cand.png" 
                alt="Additional feedback component"
                className="max-w-md h-auto rounded-lg"
              />
            </div>
            <div className="hidden lg:block absolute bg-[#0055FE] w-1 h-[2.125rem] top-[5rem] -left-[1px]"></div>
          </div>
          
          {/* Right side - Image */}
          <div className="relative">
            <img 
              src="/gmeet.png" 
              alt="Live Interview Feedback"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}