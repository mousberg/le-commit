"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface DemoOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoOverlay({ isOpen, onClose }: DemoOverlayProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Glassmorphic container */}
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-colors"
          >
            <X className="size-5 text-white" />
          </button>

          {/* Video Container */}
          <div className="p-4">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full rounded-2xl"
                src="https://www.youtube.com/embed/YSiELAmtgww?autoplay=1&rel=0&modestbranding=1"
                title="Unmask Demo Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}