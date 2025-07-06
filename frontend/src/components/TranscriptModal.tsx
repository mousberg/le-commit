'use client';

import { useState, useEffect } from 'react';
import { Button } from "./ui/button";

interface TranscriptEntry {
  speaker: string;
  timestamp: string;
  text: string;
}

interface TranscriptData {
  conversation_id: string;
  status: string;
  call_duration_secs: number;
  message_count: number;
  transcript: TranscriptEntry[];
}

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  referenceName: string;
}

export default function TranscriptModal({ 
  isOpen, 
  onClose, 
  conversationId, 
  referenceName 
}: TranscriptModalProps) {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchTranscript();
    }
  }, [isOpen, conversationId]);

  const fetchTranscript = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/get-transcript?conversationId=${conversationId}`);
      const data = await response.json();
      
      if (data.success) {
        setTranscript(data.transcript);
      } else {
        setError(data.error || 'Failed to fetch transcript');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching transcript:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Call Transcript - {referenceName}
              </h2>
              {transcript && (
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Duration: {formatDuration(transcript.call_duration_secs)}</span>
                  <span>Messages: {transcript.message_count}</span>
                  <span>Status: {transcript.status}</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading transcript...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">Error: {error}</div>
            </div>
          )}

          {transcript && !loading && (
            <div className="space-y-4">
              {transcript.transcript.map((entry, index) => (
                <div 
                  key={index} 
                  className={`flex gap-4 p-4 rounded-lg ${
                    entry.speaker === 'AI Agent' 
                      ? 'bg-blue-50 border-l-4 border-blue-400' 
                      : 'bg-green-50 border-l-4 border-green-400'
                  }`}
                >
                  <div className="flex-shrink-0 w-20 text-sm font-medium text-gray-500">
                    {entry.timestamp}
                  </div>
                  <div className="flex-shrink-0 w-24">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      entry.speaker === 'AI Agent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {entry.speaker}
                    </span>
                  </div>
                  <div className="flex-1 text-gray-800">
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Conversation ID: {conversationId}
            </div>
            <Button 
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 