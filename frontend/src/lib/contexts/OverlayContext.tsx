"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import DemoOverlay from '../../components/DemoOverlay';
import WaitlistOverlay from '../../components/WaitlistOverlay';

interface OverlayContextType {
  openDemo: () => void;
  openWaitlist: (email?: string) => void;
  closeDemo: () => void;
  closeWaitlist: () => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');

  const openDemo = () => setIsDemoOpen(true);
  const openWaitlist = (email?: string) => {
    setWaitlistEmail(email || '');
    setIsWaitlistOpen(true);
  };
  const closeDemo = () => setIsDemoOpen(false);
  const closeWaitlist = () => setIsWaitlistOpen(false);

  // Listen for global events for backward compatibility
  useEffect(() => {
    const handleDemoOpen = () => openDemo();
    const handleWaitlistOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ email?: string }>;
      const email = customEvent.detail?.email || '';
      openWaitlist(email);
    };
    
    window.addEventListener('openDemo', handleDemoOpen);
    window.addEventListener('openWaitlist', handleWaitlistOpen);
    
    return () => {
      window.removeEventListener('openDemo', handleDemoOpen);
      window.removeEventListener('openWaitlist', handleWaitlistOpen);
    };
  }, []);

  return (
    <OverlayContext.Provider value={{ openDemo, openWaitlist, closeDemo, closeWaitlist }}>
      {children}
      
      {/* Demo Overlay */}
      <DemoOverlay 
        isOpen={isDemoOpen} 
        onClose={closeDemo} 
      />
      
      {/* Waitlist Overlay */}
      <WaitlistOverlay 
        isOpen={isWaitlistOpen} 
        onClose={closeWaitlist}
        initialEmail={waitlistEmail}
      />
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const context = useContext(OverlayContext);
  if (context === undefined) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
}