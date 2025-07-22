import { Applicant } from '@/lib/interfaces/applicant';

export interface LinkedInProgress {
  attempt: number;
  maxAttempts: number;
  status: 'starting' | 'polling' | 'running' | 'ready' | 'retrying' | 'error';
  message: string;
  percentage?: number;
}

interface ProcessingLoaderProps {
  status: 'uploading' | 'processing' | 'analyzing';
  fileName?: string;
  applicant?: Applicant;
  linkedinProgress?: LinkedInProgress;
}

export default function ProcessingLoader({ status, fileName, applicant, linkedinProgress }: ProcessingLoaderProps) {
  const getStatusText = () => {
    // Show LinkedIn-specific status if available
    if (applicant?.linkedinJobStatus === 'running' && applicant?.originalLinkedinUrl) {
      return 'Processing LinkedIn profile...';
    }
    
    switch (status) {
      case 'uploading':
        return 'Processing...';
      case 'processing':
        return 'Extracting information...';
      case 'analyzing':
        return 'Analyzing profile...';
      default:
        return 'Processing...';
    }
  };

  const getProgressInfo = () => {
    // If LinkedIn job is running, show indeterminate progress
    if (applicant?.linkedinJobStatus === 'running' && applicant?.originalLinkedinUrl) {
      return {
        showBar: false,
        message: 'Waiting for LinkedIn data...'
      };
    }
    
    // If we have LinkedIn progress data, use it
    if (linkedinProgress?.percentage) {
      return {
        showBar: true,
        percentage: linkedinProgress.percentage,
        message: linkedinProgress.message
      };
    }
    
    // Default indeterminate progress
    return {
      showBar: false,
      message: 'Processing data...'
    };
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-8">
        {/* Elegant Loading Animation */}
        <div className="relative">
          <div className="w-16 h-16 border-2 border-emerald-100 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

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

        {/* Progress Steps with Basic Info */}
        {applicant && (
          <div className="w-full space-y-6">
            <h3 className="text-center text-sm font-medium text-gray-700">Analysis Progress</h3>

            <div className="space-y-4">
              {/* CV Analysis */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${applicant.cvData ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                  <span className={`text-sm ${applicant.cvData ? 'text-gray-700' : 'text-gray-400'}`}>CV Analysis</span>
                  {applicant.cvData && (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {applicant.cvData && (
                  <div className="text-xs text-gray-600 space-y-1">
                    {applicant.cvData.firstName && applicant.cvData.lastName && (
                      <p className="font-medium">{applicant.cvData.firstName} {applicant.cvData.lastName}</p>
                    )}
                    {applicant.cvData.jobTitle && (
                      <p>{applicant.cvData.jobTitle}</p>
                    )}
                    {applicant.cvData.skills && applicant.cvData.skills.length > 0 && (
                      <p className="text-emerald-600">{applicant.cvData.skills.slice(0, 3).join(' • ')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* LinkedIn Analysis */}
              {(applicant.linkedinData || applicant.originalLinkedinUrl || applicant.linkedinJobId || status === 'processing' || linkedinProgress) && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      applicant.linkedinData ? 'bg-blue-500' : 
                      applicant.linkedinJobStatus === 'failed' ? 'bg-red-500' :
                      applicant.linkedinJobStatus === 'running' ? 'bg-blue-300 animate-pulse' :
                      linkedinProgress?.status === 'error' ? 'bg-red-500' :
                      linkedinProgress ? 'bg-blue-300 animate-pulse' : 'bg-gray-200'
                    }`}></div>
                    <span className={`text-sm ${applicant.linkedinData ? 'text-gray-700' : 'text-gray-400'}`}>LinkedIn Analysis</span>
                    {applicant.linkedinData && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {(applicant.linkedinJobStatus === 'failed' || linkedinProgress?.status === 'error') && (
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  
                  {/* LinkedIn Job Status */}
                  {applicant.linkedinJobId && !applicant.linkedinData && (
                    <div className="text-xs text-gray-600 space-y-2">
                      <p className={`${
                        applicant.linkedinJobStatus === 'failed' ? 'text-red-600' :
                        applicant.linkedinJobStatus === 'running' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {applicant.linkedinJobStatus === 'running' ? 'LinkedIn processing in progress...' :
                         applicant.linkedinJobStatus === 'failed' ? 'LinkedIn processing failed' :
                         applicant.linkedinJobStatus === 'completed' ? 'LinkedIn processing completed' :
                         'LinkedIn job started'}
                      </p>
                      {applicant.linkedinJobStatus === 'running' && (
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div className="bg-blue-500 h-1 rounded-full animate-pulse w-1/2" />
                        </div>
                      )}
                      {applicant.linkedinJobId && (
                        <p className="text-gray-500 text-xs">Job ID: {applicant.linkedinJobId.slice(0, 8)}...</p>
                      )}
                    </div>
                  )}
                  
                  {/* LinkedIn Progress Details (for real-time processing) */}
                  {linkedinProgress && !applicant.linkedinData && !applicant.linkedinJobId && (
                    <div className="text-xs text-gray-600 space-y-2">
                      <p className={`${linkedinProgress.status === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
                        {linkedinProgress.message}
                      </p>
                      {linkedinProgress.percentage && linkedinProgress.status !== 'error' && (
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${linkedinProgress.percentage}%` }}
                          />
                        </div>
                      )}
                      {linkedinProgress.status !== 'error' && (
                        <p className="text-gray-500">
                          {linkedinProgress.attempt}/{linkedinProgress.maxAttempts} attempts
                        </p>
                      )}
                    </div>
                  )}
                  
                  {applicant.linkedinData && (
                    <div className="text-xs text-gray-600 space-y-1">
                      {applicant.linkedinData.jobTitle && (
                        <p>{applicant.linkedinData.jobTitle}</p>
                      )}
                      {applicant.linkedinData.skills && applicant.linkedinData.skills.length > 0 && (
                        <p className="text-blue-600">{applicant.linkedinData.skills.slice(0, 3).join(' • ')}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* GitHub Analysis */}
              {(applicant.githubData || applicant.originalGithubUrl) && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${applicant.githubData ? 'bg-purple-500' : 'bg-gray-200'}`}></div>
                    <span className={`text-sm ${applicant.githubData ? 'text-gray-700' : 'text-gray-400'}`}>GitHub Analysis</span>
                    {applicant.githubData && (
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {applicant.githubData && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>@{applicant.githubData.username}</p>
                      <p>{applicant.githubData.publicRepos} repositories</p>
                      {applicant.githubData.languages && applicant.githubData.languages.length > 0 && (
                        <p className="text-purple-600">{applicant.githubData.languages.slice(0, 3).map(l => l.language).join(' • ')}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="w-full max-w-xs space-y-2">
          {getProgressInfo().showBar ? (
            // Determinate progress bar
            <>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${getProgressInfo().percentage}%`
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{getProgressInfo().message}</span>
                <span>{Math.round(getProgressInfo().percentage || 0)}%</span>
              </div>
            </>
          ) : (
            // Indeterminate progress - pulsing bar
            <>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center text-xs text-gray-500">
                <span>{getProgressInfo().message}</span>
              </div>
            </>
          )}
        </div>

        {/* Simple Status Message */}
        <p className="text-center text-sm text-gray-500 max-w-sm">
          Analyzing profile and extracting key insights...
        </p>
      </div>
    </div>
  );
}
