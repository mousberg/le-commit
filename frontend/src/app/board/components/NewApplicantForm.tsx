'use client';

import { useState, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { useApplicants } from '../../../lib/contexts/ApplicantContext';

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
    <div className="flex flex-col gap-3">
      <label className="text-lg font-medium text-zinc-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer
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

        <div className="flex flex-col items-center justify-center text-center">
          {file ? (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-green-700 mb-1">{file.name}</p>
              <p className="text-xs text-green-600">File uploaded successfully</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-700 mb-1">
                {isDragOver ? 'Drop file here' : 'Drop file here or click to browse'}
              </p>
              <p className="text-xs text-zinc-500">{description}</p>
            </>
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
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>('');

  const isLoading = applicantLoading;

  const resetForm = () => {
    setCvFile(null);
    setLinkedinFile(null);
    setGithubUrl('');
    setRole('');
    setError(null);
  };

  const handleCreateCandidate = async () => {
    if (!cvFile) {
      setError('Please select a CV file');
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const applicantId = await createApplicant({
        cvFile,
        linkedinFile: linkedinFile || undefined,
        githubUrl: githubUrl.trim() || undefined,
        role: role.trim() || undefined
      });

      if (applicantId) {
        resetForm();

        // Call success callback if provided
        onSuccess?.(applicantId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to create applicant:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = cvFile && !isCreating && !isLoading;

  return (
    <div className="bg-white">
      <div className="flex flex-col gap-8">
        {/* CV Upload */}
        <DropZone
          onDrop={setCvFile}
          accept=".pdf,.doc,.docx"
          label="CV"
          description="PDF, DOC, or DOCX format"
          file={cvFile}
          disabled={isCreating || isLoading}
          required={true}
        />

        {/* Role Input */}
        <div className="flex flex-col gap-3">
          <label className="text-lg font-medium text-zinc-900">Role</label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Software Engineer, Product Manager"
            disabled={isCreating || isLoading}
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 placeholder-zinc-400"
          />
        </div>

        {/* LinkedIn Profile Upload */}
        <DropZone
          onDrop={setLinkedinFile}
          accept=".pdf,.html,.txt"
          label="LinkedIn"
          description="Profile PDF Download (optional)"
          file={linkedinFile}
          disabled={isCreating || isLoading}
        />

        {/* GitHub URL Input */}
        <div className="flex flex-col gap-3">
          <label className="text-lg font-medium text-zinc-900">GitHub (optional)</label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/username"
            disabled={isCreating || isLoading}
            className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 placeholder-zinc-400"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleCreateCandidate}
          disabled={!isFormValid}
          size="lg"
          className={`rounded-lg shadow-sm text-lg font-medium px-8 py-4 mt-4 transition-all duration-200 ${
            isFormValid
              ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
              : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {isCreating ? 'Creating...' : 'Unmask'}
        </Button>
      </div>
    </div>
  );
}
