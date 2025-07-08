import { Applicant } from '@/lib/interfaces/applicant';

interface ProcessingLoaderProps {
  applicantName: string;
  status: 'uploading' | 'processing' | 'analyzing';
  fileName?: string;
  applicant?: Applicant;
}

export default function ProcessingLoader({ applicantName, status, fileName, applicant }: ProcessingLoaderProps) {
  const getStatusText = () => {
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

  const getCompletedSteps = () => {
    let completed = 0;
    if (applicant?.cvData) completed++;
    if (applicant?.linkedinData) completed++;
    if (applicant?.githubData) completed++;
    return completed;
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-8">
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

      {/* Simple Progress Steps */}
      {applicant && (
        <div className="w-full space-y-4">
          <h3 className="text-center text-sm font-medium text-gray-700 mb-4">Analysis Progress</h3>

          <div className="space-y-3">
            {/* CV Analysis */}
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${applicant.cvData ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
              <span className={`text-sm ${applicant.cvData ? 'text-gray-700' : 'text-gray-400'}`}>CV Analysis</span>
              {applicant.cvData && (
                <div className="ml-auto">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            {/* LinkedIn Analysis */}
            {(applicant.linkedinData || status === 'processing') && (
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${applicant.linkedinData ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                <span className={`text-sm ${applicant.linkedinData ? 'text-gray-700' : 'text-gray-400'}`}>LinkedIn Analysis</span>
                {applicant.linkedinData && (
                  <div className="ml-auto">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* GitHub Analysis */}
            {(applicant.githubData || applicant.originalGithubUrl) && (
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${applicant.githubData ? 'bg-purple-500' : 'bg-gray-200'}`}></div>
                <span className={`text-sm ${applicant.githubData ? 'text-gray-700' : 'text-gray-400'}`}>GitHub Analysis</span>
                {applicant.githubData && (
                  <div className="ml-auto">
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Elegant Progress Bar */}
      <div className="w-full max-w-xs">
        <div className="w-full bg-gray-100 rounded-full h-1">
          <div
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-1 rounded-full transition-all duration-500 ease-out"
            style={{
              width: applicant ? `${(getCompletedSteps() / 3) * 100}%` : '30%'
            }}
          ></div>
        </div>
      </div>

      {/* Simple Status Message */}
      <p className="text-center text-sm text-gray-500 max-w-sm">
        Analyzing profile and extracting key insights...
      </p>
    </div>
  );
}
