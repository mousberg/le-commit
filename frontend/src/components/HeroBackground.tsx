import React from 'react';

interface HeroBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  cropped?: boolean;
}

export default function HeroBackground({ className = "", children, cropped = false }: HeroBackgroundProps) {
  return (
    <div className={`relative select-none bg-gradient-to-t from-pink-100 to-pink-200 overflow-hidden isolate ${className}`}>
      {/* Island animation layers */}
      <div className="absolute inset-0 overflow-hidden contain-paint">
        {/* Desktop islands */}
        <div className="hidden lg:block">
          <div className="absolute inset-[0.5rem] rounded-[12rem] bg-white/2 shadow-[0_0_40px_rgba(255,105,180,0.3)] blur-[4px] island-float-1"></div>
          <div className="absolute inset-[3rem] rounded-[12rem] bg-white/2 shadow-[0_0_30px_rgba(255,105,180,0.25)] blur-[3px] island-float-2"></div>
          <div className="absolute inset-[6rem] rounded-[12rem] bg-white/2 shadow-[0_0_20px_rgba(255,105,180,0.2)] blur-[2px] island-float-3"></div>
          <div className="absolute inset-[10rem] rounded-[8rem] bg-white/2 shadow-[inset_0_0_30px_rgba(255,255,255,0.4)] blur-[1px] island-float-4"></div>
        </div>
        
        {/* Mobile islands */}
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

      {/* Content */}
      <div className="relative z-[1]">
        {children}
      </div>
    </div>
  );
}