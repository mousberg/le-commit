interface ProcessingLoaderProps {
  applicantName: string;
  status: 'uploading' | 'processing' | 'analyzing';
  fileName?: string;
}

export default function ProcessingLoader({ applicantName, status, fileName }: ProcessingLoaderProps) {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center gap-6">
      {/* Loading Animation */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'uploading' ? 'Uploading Files...' :
           status === 'processing' ? 'Processing CV...' :
           'Analyzing Credibility...'}
        </h2>
        <p className="text-lg text-gray-600 mb-1">{applicantName}</p>
        {fileName && (
          <p className="text-sm text-gray-500">{fileName}</p>
        )}
      </div>

      {/* Progress Steps */}
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${status === 'uploading' ? 'bg-emerald-600' : 'bg-emerald-400'} mr-2`}></div>
            <span className="text-sm font-medium text-gray-700">Upload</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${status === 'processing' ? 'bg-emerald-600' : status === 'uploading' ? 'bg-gray-300' : 'bg-emerald-400'} mr-2`}></div>
            <span className="text-sm font-medium text-gray-700">Process</span>
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${status === 'analyzing' ? 'bg-emerald-600' : (status === 'uploading' || status === 'processing') ? 'bg-gray-300' : 'bg-emerald-400'} mr-2`}></div>
            <span className="text-sm font-medium text-gray-700">Analyze</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
            <span className="text-sm font-medium text-gray-700">Complete</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{
              width: status === 'uploading' ? '25%' :
                     status === 'processing' ? '50%' :
                     status === 'analyzing' ? '75%' : '100%'
            }}
          ></div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="text-center text-sm text-gray-600 max-w-md">
        {status === 'uploading' && (
          <p>Uploading your files securely. This usually takes a few seconds...</p>
        )}
        {status === 'processing' && (
          <p>Analyzing your CV and extracting key information. This may take 30-60 seconds...</p>
        )}
        {status === 'analyzing' && (
          <p>Performing credibility analysis and cross-referencing data sources. Almost done...</p>
        )}
      </div>

      {/* Auto-refresh notice */}
      <div className="text-xs text-gray-400 text-center">
        <p>This page will automatically update when processing is complete.</p>
      </div>
    </div>
  );
}
