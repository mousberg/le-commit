'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReferenceCallFormProps {
  candidateName?: string;
  onCallInitiated?: (callSid: string, agentId: string) => void;
}

export default function ReferenceCallForm({
  candidateName = '',
  onCallInitiated
}: ReferenceCallFormProps) {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    candidateName: candidateName,
    referenceName: '',
    companyName: '',
    roleTitle: '',
    workDuration: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    callSid?: string;
    agentId?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/reference-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          callSid: data.callSid,
          agentId: data.agentId,
          message: data.message
        });
        onCallInitiated?.(data.callSid, data.agentId);
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to initiate call'
        });
      }
    } catch {
      setResult({
        success: false,
        error: 'Network error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        AI Reference Calling
      </h2>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-blue-800 text-sm">
          🤖 <strong>Natural AI Conversation</strong><br/>
          AI conducts a friendly, professional reference check with context about the candidate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <Input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="+1234567890"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Candidate Name *
          </label>
          <Input
            type="text"
            value={formData.candidateName}
            onChange={(e) => handleInputChange('candidateName', e.target.value)}
            placeholder="Sarah Chen"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Name *
          </label>
          <Input
            type="text"
            value={formData.referenceName}
            onChange={(e) => handleInputChange('referenceName', e.target.value)}
            placeholder="Mike Johnson"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name
          </label>
          <Input
            type="text"
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder="Google"
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Helps AI ask contextual questions</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role Title
          </label>
          <Input
            type="text"
            value={formData.roleTitle}
            onChange={(e) => handleInputChange('roleTitle', e.target.value)}
            placeholder="Software Engineer"
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Optional context for the conversation</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Work Duration
          </label>
          <Input
            type="text"
            value={formData.workDuration}
            onChange={(e) => handleInputChange('workDuration', e.target.value)}
            placeholder="2 years"
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">Optional timeline information</p>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Starting AI Call...' : 'Start AI Reference Call'}
        </Button>
      </form>

      {result && (
        <div className={`mt-4 p-4 rounded-md ${
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {result.success ? (
            <div className="text-green-800">
              <p className="font-medium">✅ {result.message}</p>
              {result.callSid && (
                <p className="text-sm mt-1">Call SID: {result.callSid}</p>
              )}
              {result.agentId && (
                <p className="text-sm">AI Agent: {result.agentId}</p>
              )}
              <p className="text-sm mt-2 text-green-600">
                💡 AI is calling with natural, conversational questions!
              </p>
            </div>
          ) : (
            <div className="text-red-800">
              <p className="font-medium">❌ {result.error}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        <p className="font-medium mb-2">🎯 AI will ask natural questions like:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>&quot;In what context did you work with [Candidate] at [Company]?&quot;</li>
          <li>&quot;Can you share any projects you remember [Candidate] working on?&quot;</li>
          <li>&quot;How would you describe [Candidate]&apos;s work style?&quot;</li>
          <li>&quot;What were [Candidate]&apos;s main strengths?&quot;</li>
          <li>&quot;Would you work with [Candidate] again?&quot;</li>
        </ul>
        <p className="mt-2 text-blue-600 font-medium">
          💬 Simple, friendly conversation - just like talking to a colleague!
        </p>
      </div>
    </div>
  );
}
