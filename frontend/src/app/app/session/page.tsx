"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { TranscriptBubble } from "@/components/transcript-bubble";
import { FlagBubble } from "@/components/flag-bubble";
import { SuggestedFollowUp } from "@/components/suggested-follow-up";
import { CredibilityScore } from "@/components/credibility-score";
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

export default function SessionPage() {
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [flagItems, setFlagItems] = useState<FlagItem[]>([]);
  const [followUpItems, setFollowUpItems] = useState<FollowUpItem[]>([]);
  const [credibilityScore, setCredibilityScore] = useState(100);
  const [sessionTime, setSessionTime] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [copyStates, setCopyStates] = useState<{[key: string]: boolean}>({});

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Format session time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy functions
  const handleCopy = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStates(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyTranscript = () => {
    const transcriptText = transcriptItems
      .map(item => `${item.speaker}: ${item.text}`)
      .join('\n');
    handleCopy(transcriptText, 'transcript');
  };

  const copyInsights = () => {
    const flagText = flagItems.map(flag => flag.message).join('\n');
    const followUpText = followUpItems.map(item => `• ${item.prompt}`).join('\n');
    const insightsText = `AI Analysis:\n${flagText}\n\nSuggested Follow-ups:\n${followUpText}`;
    handleCopy(insightsText, 'insights');
  };

  // Simulate real-time transcript updates
  useEffect(() => {

    let transcriptIndex = 0;
    let flagIndex = 0;
    let followUpIndex = 0;

    // Start the session
    setIsSessionActive(true);

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

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium text-gray-900">
            NerdBuster Live Session
          </h1>
          <CredibilityScore analysisResult={{
            credibilityScore: credibilityScore,
            summary: `Live credibility analysis in progress. Current score: ${credibilityScore}%.`,
            flags: flagItems.map(flag => ({
              type: flag.type === 'error' ? 'red' : 'yellow',
              category: 'verification',
              message: flag.message,
              severity: flag.type === 'error' ? 8 : 5
            })),
            suggestedQuestions: followUpItems.map(item => item.prompt),
            analysisDate: new Date().toISOString(),
            sources: []
          }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Left Panel: Real-Time Transcript */}
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Live Transcript</h2>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyTranscript}
                  className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900"
                  disabled={transcriptItems.length === 0}
                >
                  {copyStates.transcript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
                <div className="font-mono text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                  {formatTime(sessionTime)}
                </div>
                <div className="flex items-center gap-1 text-xs text-red-600 px-2 py-1 bg-red-50 rounded">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                  Recording
                </div>
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4">
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
            </ScrollArea>
          </Card>

          {/* Right Panel: AI Agent Warnings + Follow-Up Prompts */}
          <div className="space-y-6">
            <Card className="p-6 bg-white border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  AI Analysis
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyInsights}
                  className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900"
                  disabled={flagItems.length === 0 && followUpItems.length === 0}
                >
                  {copyStates.insights ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <ScrollArea className="h-[calc(50vh-120px)]">
                <div className="space-y-3">
                  {flagItems.map((flag) => (
                    <FlagBubble
                      key={flag.id}
                      type={flag.type}
                      message={flag.message}
                    />
                  ))}
                </div>
              </ScrollArea>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Suggested Follow-ups
              </h2>
              <ScrollArea className="h-[calc(50vh-120px)]">
                <div className="space-y-3">
                  {followUpItems.map((followUp) => (
                    <SuggestedFollowUp
                      key={followUp.id}
                      prompt={followUp.prompt}
                    />
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
