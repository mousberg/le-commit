import React from 'react';
import { Applicant } from '@/lib/interfaces/applicant';
import { Check, Clock, Loader2, AlertCircle } from 'lucide-react';

interface ProcessingLoaderProps {
  status: 'uploading' | 'processing' | 'analyzing';
  fileName?: string;
  applicant?: Applicant;
}

export default function ProcessingLoader({ applicant }: ProcessingLoaderProps) {

  const getStepStatus = (stepStatus: string) => {
    switch (stepStatus) {
      case 'ready': return 'completed';
      case 'processing': return 'active';
      case 'error': return 'error';
      case 'not_provided': return 'skipped';
      case 'pending': return 'pending';
      default: return 'pending';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-8">
        {/* Clean Status Text */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Unmasking Profile
          </h2>
        </div>

        {/* Processing Flow */}
        {applicant && (
          <div className="w-full max-w-lg">
            {/* Parallel Processing Stage */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {/* CV Processing Step */}
                {(applicant.cv_file_id || applicant.cv_status !== 'pending') && (
                  <ProcessingStep
                    label="CV Analysis"
                    status={getStepStatus(applicant.cv_status)}
                    compact={true}
                  />
                )}

                {/* LinkedIn Processing Step */}
                {(applicant.linkedin_url || applicant.li_status !== 'pending') && (
                  <ProcessingStep
                    label="LinkedIn Analysis"
                    status={getStepStatus(applicant.li_status)}
                    compact={true}
                  />
                )}

                {/* GitHub Processing Step */}
                {(applicant.github_url || applicant.gh_status !== 'pending') && (
                  <ProcessingStep
                    label="GitHub Analysis"
                    status={getStepStatus(applicant.gh_status)}
                    compact={true}
                  />
                )}
              </div>

              {/* Arrow Connector */}
              <div className="flex justify-center py-2">
                <div className="text-gray-400 text-lg">↓</div>
              </div>

              {/* AI Analysis Step */}
              <ProcessingStep
                label="AI Analysis"
                status={getStepStatus(applicant.ai_status)}
                compact={false}
                isDependent={true}
              />
            </div>
          </div>
        )}

        {/* Status Message */}
        {applicant?.status === 'failed' && (
          <p className="text-center text-sm text-red-600">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}

// Processing Step Component
interface ProcessingStepProps {
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'skipped';
  compact?: boolean;
  isDependent?: boolean;
}

function ProcessingStep({ label, status, compact = false, isDependent = false }: ProcessingStepProps) {
  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-emerald-600" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'skipped':
        return <span className="w-4 h-4 text-gray-300 text-xs">−</span>;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (isDependent) {
      switch (status) {
        case 'completed':
          return 'border-indigo-200 bg-indigo-50';
        case 'active':
          return 'border-indigo-200 bg-indigo-50';
        case 'error':
          return 'border-red-200 bg-red-50';
        case 'pending':
          return 'border-gray-300 bg-gray-100';
        default:
          return 'border-gray-300 bg-gray-100';
      }
    }
    
    switch (status) {
      case 'completed':
        return 'border-emerald-200 bg-emerald-50';
      case 'active':
        return 'border-blue-200 bg-blue-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'skipped':
        return 'border-gray-200 bg-gray-100 opacity-60';
      case 'pending':
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTextColor = () => {
    if (isDependent) {
      switch (status) {
        case 'completed':
          return 'text-indigo-700';
        case 'active':
          return 'text-indigo-700';
        case 'error':
          return 'text-red-700';
        case 'pending':
          return 'text-gray-500';
        default:
          return 'text-gray-500';
      }
    }
    
    switch (status) {
      case 'completed':
        return 'text-emerald-700';
      case 'active':
        return 'text-blue-700';
      case 'error':
        return 'text-red-700';
      case 'skipped':
        return 'text-gray-400';
      case 'pending':
        return 'text-gray-500';
    }
  };

  return (
    <div className={`border rounded-lg transition-all duration-300 ${getStatusColor()} ${
      compact ? 'p-2' : 'p-3'
    } ${isDependent ? 'shadow-sm' : ''}`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className={`text-xs font-medium ${getTextColor()}`}>{label}</span>
        {status === 'skipped' && (
          <span className="text-xs text-gray-400 ml-auto">skipped</span>
        )}
      </div>
    </div>
  );
}
