'use client';

import React from 'react';
import { Check, AlertCircle, Loader2, Clock } from 'lucide-react';
import { Applicant } from '@/lib/interfaces/applicant';

interface ProcessingStatusIndicatorProps {
  applicant: Applicant;
  className?: string;
}

interface StatusItemProps {
  label: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  dataPresent?: boolean;
}

function StatusItem({ label, status, dataPresent }: StatusItemProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'ready':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'ready':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'processing':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ready':
        return dataPresent ? 'Ready' : 'Skipped';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      case 'pending':
        return 'Pending';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs ml-auto">{getStatusText()}</span>
    </div>
  );
}

export function ProcessingStatusIndicator({ applicant, className = '' }: ProcessingStatusIndicatorProps) {
  const hasCV = applicant.cv_file_id !== null;
  const hasLinkedIn = applicant.linkedin_url !== null;
  const hasGitHub = applicant.github_url !== null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-semibold text-gray-700 mb-3">Processing Status</div>
      
      <div className="space-y-2">
        {hasCV && (
          <StatusItem 
            label="CV Analysis" 
            status={applicant.cv_status} 
            dataPresent={!!applicant.cv_data}
          />
        )}
        
        {hasLinkedIn && (
          <StatusItem 
            label="LinkedIn Fetch" 
            status={applicant.li_status} 
            dataPresent={!!applicant.li_data}
          />
        )}
        
        {hasGitHub && (
          <StatusItem 
            label="GitHub Analysis" 
            status={applicant.gh_status} 
            dataPresent={!!applicant.gh_data}
          />
        )}
        
        <StatusItem 
          label="AI Analysis" 
          status={applicant.ai_status} 
          dataPresent={!!applicant.ai_data}
        />
      </div>

      {/* Overall Status */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall Status</span>
          <div className="flex items-center gap-1">
            {applicant.status === 'completed' && (
              <div className="flex items-center gap-1 text-green-700">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Complete</span>
              </div>
            )}
            {applicant.status === 'processing' && (
              <div className="flex items-center gap-1 text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Processing</span>
              </div>
            )}
            {applicant.status === 'analyzing' && (
              <div className="flex items-center gap-1 text-purple-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Analyzing</span>
              </div>
            )}
            {applicant.status === 'failed' && (
              <div className="flex items-center gap-1 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Failed</span>
              </div>
            )}
            {applicant.status === 'uploading' && (
              <div className="flex items-center gap-1 text-gray-700">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Uploading</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {applicant.score && (
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Credibility Score</span>
            <div className={`px-2 py-1 rounded text-sm font-semibold ${
              applicant.score >= 80 ? 'bg-green-100 text-green-800' :
              applicant.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {applicant.score}/100
            </div>
          </div>
        </div>
      )}
    </div>
  );
}