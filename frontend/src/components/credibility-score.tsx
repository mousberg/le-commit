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

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🎯';
    if (score >= 70) return '✅';
    if (score >= 50) return '⚠️';
    if (score >= 30) return '🚨';
    return '❌';
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'consistency': return '🔄';
      case 'verification': return '🔍';
      case 'authenticity': return '🛡️';
      case 'activity': return '📊';
      default: return '⚡';
    }
  };

  const redFlags = analysisResult.flags?.filter(f => f.type === 'red') || [];
  const yellowFlags = analysisResult.flags?.filter(f => f.type === 'yellow') || [];

  return (
    <div className={`rounded-xl border p-6 ${getScoreBgColor(analysisResult.credibilityScore)} shadow-sm`}>
      {/* Header with Score */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getScoreEmoji(analysisResult.credibilityScore)}</span>
          <h3 className="text-xl font-bold text-gray-900">Credibility Analysis</h3>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold ${getScoreColor(analysisResult.credibilityScore)} mb-1`}>
            {analysisResult.credibilityScore}
          </div>
          <div className="text-sm text-gray-500 font-medium">out of 100</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Credibility Score</span>
          <span>{analysisResult.credibilityScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full ${getProgressBarColor(analysisResult.credibilityScore)} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, analysisResult.credibilityScore))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white/60 rounded-lg p-4 mb-4">
        <p className="text-gray-800 leading-relaxed">{analysisResult.summary}</p>
      </div>

      {/* Flags */}
      {(redFlags.length > 0 || yellowFlags.length > 0) && (
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚩</span>
            <h4 className="font-semibold text-gray-900">Areas of Concern</h4>
            <span className="text-sm text-gray-500">({redFlags.length + yellowFlags.length} total)</span>
          </div>

          {redFlags.map((flag, i) => (
            <div key={`red-${i}`} className="flex items-start gap-3 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
              <span className="text-lg flex-shrink-0">{getCategoryEmoji(flag.category)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="font-semibold text-red-800 capitalize">{flag.category}</span>
                  {flag.severity && (
                    <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full">
                      Severity: {flag.severity}/10
                    </span>
                  )}
                </div>
                <p className="text-red-700">{flag.message}</p>
                {flag.details && <p className="text-xs text-red-600 mt-1 italic">{flag.details}</p>}
              </div>
            </div>
          ))}

          {yellowFlags.map((flag, i) => (
            <div key={`yellow-${i}`} className="flex items-start gap-3 text-sm border border-yellow-100 px-4 py-3 rounded-lg bg-white/60">
              <span className="text-lg flex-shrink-0">{getCategoryEmoji(flag.category)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span className="font-semibold text-yellow-800 capitalize">{flag.category}</span>
                  {flag.severity && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                      Severity: {flag.severity}/10
                    </span>
                  )}
                </div>
                <p className="text-yellow-700">{flag.message}</p>
                {flag.details && <p className="text-xs text-yellow-600 mt-1 italic">{flag.details}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Questions */}
      {analysisResult.suggestedQuestions && analysisResult.suggestedQuestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💡</span>
            <h4 className="font-semibold text-blue-900">Suggested Follow-up Questions</h4>
          </div>
          <ul className="space-y-2">
            {analysisResult.suggestedQuestions.map((question, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="text-blue-500 font-bold mt-0.5">{i + 1}.</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analysis Sources Summary */}
      {analysisResult.sources && analysisResult.sources.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
            <h4 className="font-semibold text-gray-900">Data Sources Analyzed</h4>
          </div>
          <div className="flex gap-3">
            {analysisResult.sources.map((source, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={source.available ? 'text-green-500' : 'text-gray-400'}>
                  {source.available ? '✅' : '❌'}
                </span>
                <span className="capitalize font-medium">{source.type}</span>
                {source.available && source.score && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                    {source.score}/100
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Date */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>📅</span>
          <span>Analyzed on {new Date(analysisResult.analysisDate).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

export default CredibilityScore;
