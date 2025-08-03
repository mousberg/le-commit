import React from 'react';
import { Applicant } from '@/lib/interfaces/applicant';
import { Check, Clock, Loader2, AlertCircle } from 'lucide-react';

interface ProcessingLoaderProps {
  status: 'uploading' | 'processing' | 'analyzing';
  fileName?: string;
  applicant?: Applicant;
}

export default function ProcessingLoader({ status, fileName, applicant }: ProcessingLoaderProps) {
  const getStatusText = () => {
    if (!applicant) {
      switch (status) {
        case 'uploading':
          return 'Initializing...';
        case 'processing':
          return 'Processing...';
        case 'analyzing':
          return 'Analyzing...';
        default:
          return 'Processing...';
      }
    }

    // Use individual status to determine current activity
    if (applicant.cv_status === 'processing') return 'Processing CV...';
    if (applicant.li_status === 'processing') return 'Fetching LinkedIn profile...';
    if (applicant.gh_status === 'processing') return 'Analyzing GitHub repositories...';
    if (applicant.ai_status === 'processing') return 'Running AI analysis...';

    // Fallback to overall status
    switch (applicant.status) {
      case 'uploading':
        return 'Preparing profile...';
      case 'processing':
        return 'Extracting information...';
      case 'analyzing':
        return 'Analyzing profile...';
      default:
        return 'Processing...';
    }
  };

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
          <p className="text-emerald-600 font-medium">{getStatusText()}</p>
          {fileName && (
            <p className="text-sm text-gray-500">Processing {fileName}</p>
          )}
        </div>

        {/* Enhanced Progress Steps */}
        {applicant && (
          <div className="w-full space-y-6">
            <h3 className="text-center text-sm font-medium text-gray-700">Processing Steps</h3>

            <div className="space-y-3">
              {/* CV Processing Step */}
              {(applicant.cv_file_id || applicant.cv_status !== 'pending') && (
                <ProcessingStep
                  label="CV Analysis"
                  status={getStepStatus(applicant.cv_status)}
                  data={applicant.cv_data}
                  previewContent={applicant.cv_data && (
                    <div className="text-xs text-gray-600 space-y-1">
                      {applicant.cv_data.firstName && applicant.cv_data.lastName && (
                        <p className="font-medium">{applicant.cv_data.firstName} {applicant.cv_data.lastName}</p>
                      )}
                      {applicant.cv_data.jobTitle && (
                        <p>{applicant.cv_data.jobTitle}</p>
                      )}
                      {applicant.cv_data.skills && applicant.cv_data.skills.length > 0 && (
                        <p className="text-emerald-600">{applicant.cv_data.skills.slice(0, 3).join(' • ')}</p>
                      )}
                    </div>
                  )}
                />
              )}

              {/* LinkedIn Processing Step */}
              {(applicant.linkedin_url || applicant.li_status !== 'pending') && (
                <ProcessingStep
                  label="LinkedIn Analysis"
                  status={getStepStatus(applicant.li_status)}
                  data={applicant.li_data}
                  previewContent={applicant.li_data && (
                    <div className="text-xs text-gray-600 space-y-1">
                      {applicant.li_data.headline && (
                        <p>{applicant.li_data.headline}</p>
                      )}
                      {applicant.li_data.skills && applicant.li_data.skills.length > 0 && (
                        <p className="text-blue-600">{applicant.li_data.skills.slice(0, 3).join(' • ')}</p>
                      )}
                    </div>
                  )}
                />
              )}

              {/* GitHub Processing Step */}
              {(applicant.github_url || applicant.gh_status !== 'pending') && (
                <ProcessingStep
                  label="GitHub Analysis"
                  status={getStepStatus(applicant.gh_status)}
                  data={applicant.gh_data}
                  previewContent={applicant.gh_data && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>@{applicant.gh_data.username}</p>
                      <p>{applicant.gh_data.publicRepos} repositories</p>
                      {applicant.gh_data.languages && applicant.gh_data.languages.length > 0 && (
                        <p className="text-purple-600">{applicant.gh_data.languages.slice(0, 3).map(l => l.language).join(' • ')}</p>
                      )}
                    </div>
                  )}
                />
              )}

              {/* AI Analysis Step */}
              <ProcessingStep
                label="AI Analysis"
                status={getStepStatus(applicant.ai_status)}
                data={applicant.ai_data}
                previewContent={applicant.ai_data && applicant.score && (
                  <div className="text-xs text-gray-600">
                    <p className="font-medium text-indigo-600">Score: {applicant.score}/100</p>
                  </div>
                )}
              />
            </div>
          </div>
        )}

        {/* Contextual Status Message */}
        <p className="text-center text-sm text-gray-500 max-w-sm">
          {applicant?.status === 'failed'
            ? 'Something went wrong. Please try again.'
            : 'Analyzing profile and extracting key insights...'}
        </p>
      </div>
    </div>
  );
}

// Processing Step Component
interface ProcessingStepProps {
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'skipped';
  data?: unknown;
  previewContent?: React.ReactNode;
}

function ProcessingStep({ label, status, previewContent }: ProcessingStepProps) {
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
    <div className={`border rounded-lg p-3 transition-all duration-300 ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className={`text-sm font-medium ${getTextColor()}`}>{label}</span>
        {status === 'completed' && (
          <span className="text-xs text-gray-500 ml-auto">✓</span>
        )}
        {status === 'skipped' && (
          <span className="text-xs text-gray-400 ml-auto">skipped</span>
        )}
      </div>
      {previewContent && status === 'completed' && (
        <div className="mt-2 pl-7">
          {previewContent}
        </div>
      )}
    </div>
  );
}
