import React, { useState } from 'react';
import { processLinkedInUrl, type LinkedInProgress } from '../linkedin-api';
import ProcessingLoader from '../../components/ProcessingLoader';
import { ProfileData } from '../interfaces/applicant';

/**
 * Demo component to test LinkedIn API with progress tracking
 * Shows how to integrate LinkedIn progress into the UI
 */
export default function LinkedInProgressDemo() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<LinkedInProgress | undefined>();
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const testLinkedInUrl = 'https://www.linkedin.com/in/satyanadella';

  const startLinkedInTest = async () => {
    setIsProcessing(true);
    setProgress(undefined);
    setResult(null);
    setError(null);

    try {
      const data = await processLinkedInUrl(testLinkedInUrl, (progressUpdate) => {
        console.log('LinkedIn Progress:', progressUpdate);
        setProgress(progressUpdate);
      });

      setResult(data);
      console.log('LinkedIn Data:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('LinkedIn Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing || progress) {
    return (
      <ProcessingLoader
        status="processing"
        fileName="LinkedIn Profile"
        applicant={{
          id: 'demo',
          name: 'Demo User',
          email: 'demo@test.com',
          status: 'processing',
          cvData: undefined,
          linkedinData: result as ProfileData | undefined,
          githubData: undefined,
          originalLinkedinUrl: testLinkedInUrl,
          originalGithubUrl: undefined,
          createdAt: new Date().toISOString()
        }}
        linkedinProgress={progress}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">LinkedIn API Progress Demo</h1>
        
        <button
          onClick={startLinkedInTest}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Test LinkedIn API with Progress
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">Error: {error}</p>
          </div>
        )}

        {result && typeof result === 'object' && result !== null ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">LinkedIn Data Retrieved!</h3>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Name:</strong> {(result as ProfileData).firstName} {(result as ProfileData).lastName}</p>
              <p><strong>Job Title:</strong> {(result as ProfileData).jobTitle}</p>
              <p><strong>Location:</strong> {(result as ProfileData).address}</p>
              <p><strong>Skills:</strong> {(result as ProfileData).skills?.slice(0, 5).join(', ')}</p>
            </div>
          </div>
        ) : null}

        <div className="text-sm text-gray-600">
          <p><strong>Test URL:</strong> {testLinkedInUrl}</p>
          <p>This demo shows how LinkedIn API progress is tracked in real-time during processing.</p>
        </div>
      </div>
    </div>
  );
}