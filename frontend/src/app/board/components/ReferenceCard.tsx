'use client';

import { Button } from '@/components/ui/button';
import { Reference } from './ReferenceManager';

interface ReferenceCardProps {
  reference: Reference;
  isOpen: boolean;
  onToggle: () => void;
  onCall: (reference: Reference) => Promise<void>;
  onViewTranscript: (reference: Reference) => void;
  callInProgress: boolean;
}

export default function ReferenceCard({
  reference,
  isOpen,
  onToggle,
  onCall,
  onViewTranscript,
  callInProgress
}: ReferenceCardProps) {
  const getCallButtonVariant = (callStatus?: string) => {
    switch (callStatus) {
      case 'calling': return 'outline';
      case 'completed': return 'outline';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  const getCallButtonText = (callStatus?: string) => {
    switch (callStatus) {
      case 'calling': return 'Calling...';
      case 'completed': return '✅ Call Complete';
      case 'failed': return 'Call Failed - Retry';
      default: return '📞 Call Now';
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl">
      <button
        className="w-full flex justify-between items-center px-6 py-4 bg-slate-50 rounded-t-xl focus:outline-none"
        onClick={onToggle}
      >
        <span className="font-semibold text-gray-800">{reference.name}</span>
        <span className="text-gray-500 text-sm">{reference.phoneNumber}</span>
        <span className="ml-2 text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-2">
          <div className="mb-2 text-sm text-gray-600">
            {reference.companyName} 
            {reference.roleTitle && ` | ${reference.roleTitle}`} 
            {reference.workDuration && ` | ${reference.workDuration}`}
          </div>
          <div className="mb-2 text-xs text-gray-400">Added: {reference.dateAdded}</div>
          <div className="flex gap-2 mb-2">
            <Button
              onClick={() => onCall(reference)}
              disabled={reference.callStatus === 'calling' || callInProgress}
              variant={getCallButtonVariant(reference.callStatus)}
              size="sm"
              className={reference.callStatus === 'idle' || !reference.callStatus ?
                'bg-emerald-500 hover:bg-emerald-600 text-white font-semibold' :
                ''}
            >
              {getCallButtonText(reference.callStatus)}
            </Button>
            {reference.callStatus === 'completed' && reference.conversationId && (
              <Button
                onClick={() => onViewTranscript(reference)}
                variant="outline"
                size="sm"
              >
                📄 View Transcript
              </Button>
            )}
          </div>
          {/* AI-generated summary - only show after call completion */}
          {reference.callStatus === 'completed' && reference.summary && (
            <div className="bg-white border border-dashed border-emerald-200 rounded-md px-3 py-2 text-gray-700 text-sm mt-2">
              <span className="font-semibold text-emerald-600">Summary:</span> {reference.summary}
            </div>
          )}
          {reference.callStatus === 'completed' && !reference.summary && (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-md px-3 py-2 text-gray-500 text-sm mt-2">
              <span className="font-medium">Summary:</span> Processing transcript for analysis...
            </div>
          )}
        </div>
      )}
    </div>
  );
}