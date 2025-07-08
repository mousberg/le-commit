import { AnalysisResult } from '@/lib/interfaces/analysis';

interface CredibilityScoreProps {
  analysisResult: AnalysisResult;
}

export function CredibilityScore({ analysisResult }: CredibilityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'bg-green-50 border-green-200';
    if (score >= 50) return 'bg-yellow-50 border-yellow-200';
    if (score >= 30) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const redFlags = analysisResult.flags?.filter(f => f.type === 'red') || [];
  const yellowFlags = analysisResult.flags?.filter(f => f.type === 'yellow') || [];

  return (
    <div className={`rounded-lg border p-6 ${getScoreBgColor(analysisResult.credibilityScore)}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Credibility Analysis</h3>
        <div className={`text-3xl font-bold ${getScoreColor(analysisResult.credibilityScore)}`}>
          {analysisResult.credibilityScore}/100
        </div>
      </div>

      <p className="text-gray-700 mb-4">{analysisResult.summary}</p>

      {/* Flags */}
      {(redFlags.length > 0 || yellowFlags.length > 0) && (
        <div className="space-y-2 mb-4">
          <h4 className="font-medium text-gray-900 text-sm">Concerns:</h4>
          {redFlags.map((flag, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded border border-red-200">
              <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
              <div>
                <span className="font-medium">{flag.category}: </span>
                {flag.message}
                {flag.details && <div className="text-xs text-red-600 mt-1">{flag.details}</div>}
              </div>
            </div>
          ))}
          {yellowFlags.map((flag, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></span>
              <div>
                <span className="font-medium">{flag.category}: </span>
                {flag.message}
                {flag.details && <div className="text-xs text-yellow-600 mt-1">{flag.details}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Questions */}
      {analysisResult.suggestedQuestions && analysisResult.suggestedQuestions.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 text-sm mb-2">Suggested Follow-up Questions:</h4>
          <ul className="space-y-1">
            {analysisResult.suggestedQuestions.map((question, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="text-gray-400 mr-2">•</span>
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analysis Date */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          Analyzed on {new Date(analysisResult.analysisDate).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export default CredibilityScore;
