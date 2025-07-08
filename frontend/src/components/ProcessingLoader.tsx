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
        return 'Uploading files...';
      case 'processing':
        return 'Extracting information...';
      case 'analyzing':
        return 'Analyzing profile...';
      default:
        return 'Gathering data...';
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center gap-8">
      {/* Simple Loading Animation */}
      <div className="relative">
        <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Clean Status Text */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Gathering Data
        </h2>
        <p className="text-lg text-gray-600 mb-2">{applicantName}</p>
        <p className="text-emerald-600 font-medium">{getStatusText()}</p>
        {fileName && (
          <p className="text-sm text-gray-400 mt-2">Processing {fileName}</p>
        )}
      </div>

      {/* Progressive Data Display */}
      {applicant && (
        <div className="w-full max-w-lg space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">Extracted Information</h3>

          {/* CV Data */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${applicant.cvData ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="font-medium text-gray-700">CV Analysis</span>
              {applicant.cvData && <span className="text-green-600 text-sm">✓ Complete</span>}
            </div>
            {applicant.cvData && (
              <div className="text-sm text-gray-600 space-y-1">
                {applicant.cvData.firstName && applicant.cvData.lastName && (
                  <p><span className="font-medium">Name:</span> {applicant.cvData.firstName} {applicant.cvData.lastName}</p>
                )}
                {applicant.cvData.email && (
                  <p><span className="font-medium">Email:</span> {applicant.cvData.email}</p>
                )}
                {applicant.cvData.jobTitle && (
                  <p><span className="font-medium">Role:</span> {applicant.cvData.jobTitle}</p>
                )}
                {applicant.cvData.skills && applicant.cvData.skills.length > 0 && (
                  <p><span className="font-medium">Skills:</span> {applicant.cvData.skills.slice(0, 3).join(', ')}{applicant.cvData.skills.length > 3 ? '...' : ''}</p>
                )}
              </div>
            )}
          </div>

          {/* LinkedIn Data */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${applicant.linkedinData ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="font-medium text-gray-700">LinkedIn Analysis</span>
              {applicant.linkedinData && <span className="text-blue-600 text-sm">✓ Complete</span>}
              {!applicant.linkedinData && !applicant.originalFileName?.includes('linkedin') && (
                <span className="text-gray-400 text-sm">Not provided</span>
              )}
            </div>
            {applicant.linkedinData && (
              <div className="text-sm text-gray-600 space-y-1">
                {applicant.linkedinData.jobTitle && (
                  <p><span className="font-medium">Current Role:</span> {applicant.linkedinData.jobTitle}</p>
                )}
                {applicant.linkedinData.skills && applicant.linkedinData.skills.length > 0 && (
                  <p><span className="font-medium">LinkedIn Skills:</span> {applicant.linkedinData.skills.slice(0, 3).join(', ')}{applicant.linkedinData.skills.length > 3 ? '...' : ''}</p>
                )}
              </div>
            )}
          </div>

          {/* GitHub Data */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${applicant.githubData ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
              <span className="font-medium text-gray-700">GitHub Analysis</span>
              {applicant.githubData && <span className="text-purple-600 text-sm">✓ Complete</span>}
              {!applicant.githubData && !applicant.originalGithubUrl && (
                <span className="text-gray-400 text-sm">Not provided</span>
              )}
            </div>
            {applicant.githubData && (
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Username:</span> @{applicant.githubData.username}</p>
                <p><span className="font-medium">Repositories:</span> {applicant.githubData.publicRepos}</p>
                {applicant.githubData.languages && applicant.githubData.languages.length > 0 && (
                  <p><span className="font-medium">Top Languages:</span> {applicant.githubData.languages.slice(0, 3).map(l => l.language).join(', ')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simple Progress Indicator */}
      <div className="w-full max-w-xs">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-emerald-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>

      {/* Status Message */}
      <div className="text-center text-sm text-gray-500 max-w-md">
        <p>We&apos;re analyzing your profile and extracting key information. This usually takes 30-60 seconds.</p>
      </div>

      {/* Auto-refresh notice */}
      <div className="text-xs text-gray-400 text-center">
        <p>This page will automatically update when complete.</p>
      </div>
    </div>
  );
}
