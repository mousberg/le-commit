'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useApplicants } from '@/lib/contexts/ApplicantContext';

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
    <div className="flex flex-col gap-2 h-full">
      <label className="text-sm font-medium text-zinc-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed p-4 transition-all duration-200 cursor-pointer rounded-md flex-1 flex items-center justify-center
          ${isDragOver && !disabled
            ? 'border-zinc-400 bg-zinc-50'
            : file
              ? 'border-green-300 bg-green-50'
              : 'border-zinc-300 bg-zinc-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-400 hover:bg-zinc-50'}
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

        <div className="flex items-center justify-center text-center">
          {file ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-green-700">{file.name}</p>
                <p className="text-xs text-green-600">File uploaded successfully</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-700">
                  {isDragOver ? 'Drop file here' : 'Drop file here or click to browse'}
                </p>
                <p className="text-xs text-zinc-500">{description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewApplicantForm({ onSuccess }: NewApplicantFormProps) {
  const { createApplicant, isLoading: applicantLoading } = useApplicants();

  // Form state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = applicantLoading;

  const resetForm = () => {
    setCvFile(null);
    setLinkedinUrl('');
    setGithubUrl('');
    setError(null);
  };

  const handleCreateCandidate = async () => {
    if (!cvFile && !linkedinUrl.trim()) {
      setError('Please provide either a CV file or LinkedIn profile URL');
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const applicantId = await createApplicant({
        cvFile: cvFile || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined
      });

      if (applicantId) {
        resetForm();

        // Call success callback if provided
        onSuccess?.(applicantId);
      } else {
        setError('Failed to create applicant. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to create applicant:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = (cvFile || linkedinUrl.trim()) && !isCreating && !isLoading;

  return (
    <div className="bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CV Upload */}
            <div className="lg:col-span-1">
              <DropZone
                onDrop={setCvFile}
                accept=".pdf"
                label="CV"
                description="PDF file"
                file={cvFile}
                disabled={isCreating || isLoading}
                required={!linkedinUrl.trim()}
              />
            </div>

            {/* LinkedIn and GitHub URLs - Stacked vertically */}
            <div className="lg:col-span-1">
              <div className="flex flex-col gap-4">
                {/* LinkedIn URL */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-900">
                    LinkedIn {!cvFile ? <span className="text-red-500">*</span> : null}
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    disabled={isCreating || isLoading}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 placeholder-zinc-400"
                  />
                </div>

                {/* GitHub URL Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-zinc-900">GitHub</label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    disabled={isCreating || isLoading}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 placeholder-zinc-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6">
            <Button
              onClick={handleCreateCandidate}
              disabled={!isFormValid}
              size="lg"
              className={`w-full shadow-sm text-lg font-medium px-8 py-3 transition-all duration-200 ${
                isFormValid
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isCreating ?
                (cvFile ? 'CV Analysis...' : 'LinkedIn Analysis...')
                : 'Unmask'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
