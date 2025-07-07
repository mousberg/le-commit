'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const fetchTranscript = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/get-transcript?conversationId=${conversationId}`);
      const data = await response.json();
      
      if (data.success) {
        if (data.hasTranscript && data.transcript) {
          setTranscript(data.transcript);
        } else {
          setError(data.transcriptError || 'Transcript not yet available. Please try again later.');
        }
      } else {
        setError(data.error || 'Failed to fetch transcript');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching transcript:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchTranscript();
    }
  }, [isOpen, conversationId, fetchTranscript]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-200 scale-100">
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
              <div className="text-center">
                <div className="text-gray-500 mb-2">📄</div>
                <div className="text-gray-700 font-medium mb-1">Transcript Not Available</div>
                <div className="text-gray-500 text-sm">{error}</div>
              </div>
            </div>
          )}

          {transcript && !loading && (
            <div className="space-y-4">
              {transcript.transcript && transcript.transcript.length > 0 ? (
                transcript.transcript.map((entry, index) => (
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
                ))
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="text-gray-500 mb-2">📄</div>
                    <div className="text-gray-700 font-medium mb-1">No Messages</div>
                    <div className="text-gray-500 text-sm">This conversation doesn&apos;t have any transcript messages yet.</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            {/* <div className="text-sm text-gray-500">
              Conversation ID: {conversationId}
            </div> */}
            <span />
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