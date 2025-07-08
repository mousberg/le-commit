'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { useApplicants } from '../../../lib/contexts/ApplicantContext';

interface NewApplicantFormProps {
  onSuccess?: (applicantId: string) => void;
}

export default function NewApplicantForm({ onSuccess }: NewApplicantFormProps) {
  const { createApplicant, isLoading } = useApplicants();
  const router = useRouter();

  // Form state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // File input refs
  const cvInputRef = useRef<HTMLInputElement>(null);
  const linkedinInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setCvFile(null);
    setLinkedinFile(null);
    setGithubUrl('');
    if (cvInputRef.current) cvInputRef.current.value = '';
    if (linkedinInputRef.current) linkedinInputRef.current.value = '';
  };

  const handleCreateCandidate = async () => {
    if (!cvFile) {
      alert('Please select a CV file');
      return;
    }

    setIsCreating(true);

    try {
      const applicantId = await createApplicant({
        cvFile,
        linkedinFile: linkedinFile || undefined,
        githubUrl: githubUrl.trim() || undefined
      });

      if (applicantId) {
        resetForm();

        // Navigate immediately with replace to avoid back button issues
        router.replace(`/board?id=${applicantId}`);

        // Call success callback if provided
        onSuccess?.(applicantId);
      }
    } catch (error) {
      console.error('Failed to create applicant:', error);
      alert('Failed to create applicant. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = cvFile && !isCreating && !isLoading;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col gap-8">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">Add New Applicant</h2>

      <div className="flex flex-col gap-6">
        {/* CV Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-lg font-medium text-gray-800 mb-1">
            Upload CV <span className="text-red-500">*</span>
          </label>
          <input
            ref={cvInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setCvFile(e.target.files?.[0] || null)}
            disabled={isCreating}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
          />
          {cvFile && (
            <p className="text-sm text-green-600">✓ {cvFile.name}</p>
          )}
        </div>

        {/* LinkedIn Profile Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-lg font-medium text-gray-800 mb-1">Upload LinkedIn Profile (Optional)</label>
          <input
            ref={linkedinInputRef}
            type="file"
            accept=".pdf,.html,.txt"
            onChange={(e) => setLinkedinFile(e.target.files?.[0] || null)}
            disabled={isCreating}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
          />
          {linkedinFile && (
            <p className="text-sm text-green-600">✓ {linkedinFile.name}</p>
          )}
        </div>

        {/* GitHub Profile URL */}
        <div className="flex flex-col gap-2">
          <label className="text-lg font-medium text-gray-800 mb-1">GitHub Profile (Optional)</label>
          <input
            type="text"
            placeholder="https://github.com/username"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={isCreating}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
          {githubUrl && (
            <p className="text-sm text-green-600">✅ GitHub URL entered</p>
          )}
        </div>
      </div>

      <Button
        onClick={handleCreateCandidate}
        disabled={!isFormValid}
        size="lg"
        className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-8 py-3 text-xl font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? 'Creating...' : 'Analyse Profile'}
      </Button>
    </div>
  );
}
