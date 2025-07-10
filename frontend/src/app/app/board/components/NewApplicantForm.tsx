'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { useApplicants } from '../../../../lib/contexts/ApplicantContext';

interface NewApplicantFormProps {
  onSuccess?: (applicantId: string) => void;
}

interface DropZoneProps {
  onDrop: (file: File) => void;
  accept: string;
  label: string;
  description: string;
  file: File | null;
  disabled?: boolean;
  required?: boolean;
}

function DropZone({ onDrop, accept, label, description, file, disabled = false, required = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onDrop(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onDrop(selectedFile);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-lg font-medium text-gray-800 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer
          ${isDragOver && !disabled
            ? 'border-emerald-400 bg-emerald-50'
            : file
              ? 'border-emerald-300 bg-emerald-25'
              : 'border-gray-300 bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-400 hover:bg-emerald-25'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center text-center">
          {file ? (
            <>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-emerald-700 mb-1">{file.name}</p>
              <p className="text-xs text-emerald-600">File uploaded successfully</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {isDragOver ? 'Drop file here' : 'Drop file here or click to browse'}
              </p>
              <p className="text-xs text-gray-500">{description}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewApplicantForm({ onSuccess }: NewApplicantFormProps) {
  const { createApplicant, isLoading } = useApplicants();
  const router = useRouter();

  // Form state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setCvFile(null);
    setLinkedinFile(null);
    setGithubUrl('');
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
        router.replace(`/app/board?id=${applicantId}`);

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
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">New Applicant</h2>

      <div className="flex flex-col gap-6">
        {/* CV Upload */}
        <DropZone
          onDrop={setCvFile}
          accept=".pdf,.doc,.docx"
          label="CV"
          description="PDF"
          file={cvFile}
          disabled={isCreating}
          required={true}
        />

        {/* LinkedIn Profile Upload */}
        <DropZone
          onDrop={setLinkedinFile}
          accept=".pdf,.html,.txt"
          label="LinkedIn"
          description="Profile PDF Download"
          file={linkedinFile}
          disabled={isCreating}
        />

        {/* GitHub Profile URL */}
        <div className="flex flex-col gap-2">
          <label className="text-lg font-medium text-gray-800 mb-1">GitHub</label>
          <div className="relative">
            <input
              type="text"
              placeholder="https://github.com/username"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={isCreating}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition-all duration-200"
            />
            {githubUrl && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Button
        onClick={handleCreateCandidate}
        disabled={!isFormValid}
        size="lg"
        className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-8 py-3 text-xl font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200"
      >
        {isCreating ? 'Unmasking...' : 'Unmask'}
      </Button>
    </div>
  );
}
