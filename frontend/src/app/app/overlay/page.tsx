"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Minimize2, Settings } from "lucide-react";
import { FloatingPanel } from "@/components/floating-panel";
import { TranscriptBubble } from "@/components/transcript-bubble";
import { FlagBubble } from "@/components/flag-bubble";
import { SuggestedFollowUp } from "@/components/suggested-follow-up";
import { mockTranscripts, mockFlags, mockFollowUps } from "@/lib/mockData";

interface TranscriptItem {
  id: string;
  text: string;
  timestamp: Date;
  speaker: "candidate" | "interviewer";
}

interface FlagItem {
  id: string;
  type: "warning" | "info" | "error";
  message: string;
  relatedTranscriptId: string;
  timestamp: Date;
}

interface FollowUpItem {
  id: string;
  prompt: string;
  relatedTranscriptId: string;
  timestamp: Date;
}

export default function OverlayPage() {
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [flagItems, setFlagItems] = useState<FlagItem[]>([]);
  const [followUpItems, setFollowUpItems] = useState<FollowUpItem[]>([]);
  const [credibilityScore, setCredibilityScore] = useState(100);
  const [sessionTime, setSessionTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format session time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  // Simulate real-time transcript updates
  useEffect(() => {

    let transcriptIndex = 0;
    let flagIndex = 0;
    let followUpIndex = 0;

    const transcriptInterval = setInterval(() => {
      if (transcriptIndex < mockTranscripts.length) {
        const newItem: TranscriptItem = {
          id: `transcript-${transcriptIndex}`,
          text: mockTranscripts[transcriptIndex].text,
          speaker: mockTranscripts[transcriptIndex].speaker,
          timestamp: new Date(),
        };
        setTranscriptItems(prev => [...prev, newItem]);

        // Check for flags and follow-ups for this transcript
        setTimeout(() => {
          mockFlags.forEach((flag, idx) => {
            if (flag.relatedIndex === transcriptIndex && flagIndex <= idx) {
              const newFlag: FlagItem = {
                id: `flag-${idx}`,
                type: flag.type,
                message: flag.message,
                relatedTranscriptId: `transcript-${transcriptIndex}`,
                timestamp: new Date(),
              };
              setFlagItems(prev => [...prev, newFlag]);
              
              // Decrease credibility score for warnings
              if (flag.type === "warning") {
                setCredibilityScore(prev => Math.max(0, prev - 7));
              }
              flagIndex = idx + 1;
            }
          });

          mockFollowUps.forEach((followUp, idx) => {
            if (followUp.relatedIndex === transcriptIndex && followUpIndex <= idx) {
              const newFollowUp: FollowUpItem = {
                id: `followup-${idx}`,
                prompt: followUp.prompt,
                relatedTranscriptId: `transcript-${transcriptIndex}`,
                timestamp: new Date(),
              };
              setFollowUpItems(prev => [...prev, newFollowUp]);
              followUpIndex = idx + 1;
            }
          });
        }, 1000);

        transcriptIndex++;
      } else {
        clearInterval(transcriptInterval);
      }
    }, 3000);

    return () => clearInterval(transcriptInterval);
  }, []);

  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="glass-panel p-3 flex items-center gap-2">
          <span className="text-sm font-medium text-white">NerdBuster</span>
          <div className="text-xs text-white/70 font-mono">{formatTime(sessionTime)}</div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(false)}
            className="h-6 w-6 p-0 text-white/70 hover:text-white"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Mock Google Meet Interface - Always show realistic demo */}
      <div className="absolute inset-0 bg-gray-900">
        <div className="h-full w-full relative">
          {/* Mock Google Meet Interface */}
          <div className="w-full h-full bg-black relative">
            {/* Top Meet bar */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gray-800 flex items-center justify-between px-4">
              <div className="text-white text-sm">meet.google.com/pwv-fkrf-ufp</div>
              <div className="flex items-center gap-2">
                <div className="text-green-400 text-xs">● Connected</div>
                <div className="text-gray-400 text-xs">2 participants</div>
              </div>
            </div>
            
            {/* Main video area */}
            <div className="absolute inset-4 top-20 bg-gray-800 rounded-lg overflow-hidden">
              {/* Large video (interviewer) */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
                    JD
                  </div>
                  <div className="text-white text-lg">John Doe</div>
                  <div className="text-gray-300 text-sm">Senior Engineering Manager</div>
                </div>
              </div>
              
              {/* Small video (candidate) - bottom right */}
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-gradient-to-br from-green-800 to-teal-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-lg font-bold mb-2">
                    AS
                  </div>
                  <div className="text-white text-sm">Alex Smith</div>
                  <div className="text-gray-300 text-xs">Candidate</div>
                </div>
              </div>
            </div>
            
            {/* Bottom Meet controls */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-800 flex items-center justify-center gap-4">
              <button className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white">
                🎤
              </button>
              <button className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white">
                📹
              </button>
              <button className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white">
                📞
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Header Panel */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="glass-panel p-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">NerdBuster</span>
            <div className="flex items-center gap-1 text-xs text-red-400">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Live
            </div>
          </div>
          
          <div className="text-xs text-white/70 font-mono">{formatTime(sessionTime)}</div>
          
          <div className={`text-xs px-2 py-1 rounded ${
            credibilityScore >= 80 ? 'bg-green-500/20 text-green-300' :
            credibilityScore >= 60 ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-red-500/20 text-red-300'
          }`}>
            {credibilityScore}% credible
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0 text-white/70 hover:text-white"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.history.back()}
              className="h-6 w-6 p-0 text-white/70 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transcript Panel */}
      <div className="absolute top-20 left-4 pointer-events-auto">
        <FloatingPanel title="Live Transcript" className="w-80">
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {transcriptItems.map((item, index) => (
              <TranscriptBubble
                key={item.id}
                text={item.text}
                speaker={item.speaker}
                timestamp={item.timestamp}
                isNew={index === transcriptItems.length - 1}
              />
            ))}
          </div>
        </FloatingPanel>
      </div>

      {/* AI Analysis Panel */}
      <div className="absolute top-20 right-4 pointer-events-auto">
        <FloatingPanel title="AI Analysis" className="w-72 mb-4">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {flagItems.map((flag) => (
              <FlagBubble
                key={flag.id}
                type={flag.type}
                message={flag.message}
              />
            ))}
          </div>
        </FloatingPanel>

        <FloatingPanel title="Suggested Questions" className="w-72">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {followUpItems.map((followUp) => (
              <SuggestedFollowUp
                key={followUp.id}
                prompt={followUp.prompt}
              />
            ))}
          </div>
        </FloatingPanel>
      </div>
    </div>
  );
}