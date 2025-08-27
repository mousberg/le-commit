import { AnalysisResult } from '@/lib/interfaces/analysis';
import { useState } from 'react';
import { Eye, Loader2, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CredibilityScoreProps {
  analysisResult: AnalysisResult;
  cvFileId?: string | null;
}

export function CredibilityScore({ analysisResult, cvFileId }: CredibilityScoreProps) {
  const [loadingCv, setLoadingCv] = useState(false);
  
  const handleCvView = async () => {
    if (!cvFileId || loadingCv) return;
    
    setLoadingCv(true);
    try {
      const supabase = createClient();
      
      // Get file record
      const { data: fileRecord, error: fileError } = await supabase
        .from('files')
        .select('storage_bucket, storage_path, original_filename, mime_type')
        .eq('id', cvFileId)
        .single();
        
      if (fileError || !fileRecord) {
        throw new Error('File not found');
      }
      
      // Generate signed URL for viewing
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from(fileRecord.storage_bucket)
        .createSignedUrl(fileRecord.storage_path, 3600); // 1 hour for viewing
        
      if (urlError || !signedUrl) {
        throw new Error('Failed to generate view URL');
      }
      
      // Open in new tab for viewing
      window.open(signedUrl.signedUrl, '_blank');
      
    } catch (error) {
      console.error('CV view error:', error);
      alert('Failed to open CV: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoadingCv(false);
    }
  };
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-700';
    if (score >= 60) return 'text-blue-700';
    if (score >= 40) return 'text-amber-700';
    return 'text-red-700';
  };

  const getScoreBgColor = () => {
    return 'bg-white border-stone-300';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-blue-600';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-6 w-6 text-green-600" />;
    if (score >= 60) return <CheckCircle className="h-6 w-6 text-blue-600" />;
    if (score >= 40) return <AlertTriangle className="h-6 w-6 text-amber-600" />;
    return <AlertTriangle className="h-6 w-6 text-red-600" />;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'verification': return <Shield className="h-4 w-4 text-stone-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-stone-600" />;
    }
  };

  const redFlags = analysisResult.flags?.filter(f => f.type === 'red') || [];
  const yellowFlags = analysisResult.flags?.filter(f => f.type === 'yellow') || [];

  return (
    <div className={`rounded-lg border p-6 ${getScoreBgColor()} shadow-sm`}>
      {/* Header with Score */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getScoreIcon(analysisResult.score)}
            <h3 className="text-xl font-bold text-stone-900">Credibility Analysis</h3>
          </div>
          <p className="text-stone-600 text-sm leading-relaxed">{analysisResult.summary}</p>
        </div>
        <div className="text-right ml-6">
          <div className={`text-5xl font-bold ${getScoreColor(analysisResult.score)} mb-1`}>
            {analysisResult.score}
          </div>
          <div className="text-sm text-stone-500 font-medium">out of 100</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-stone-600 mb-3">
          <span>Credibility Score</span>
          <span>{analysisResult.score}%</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full ${getProgressBarColor(analysisResult.score)} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, analysisResult.score))}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-stone-400 mt-2">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* Flags */}
      {(redFlags.length > 0 || yellowFlags.length > 0) && (
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-stone-600" />
            <h4 className="font-semibold text-stone-900">Areas of Concern</h4>
            <span className="text-sm text-stone-500">({redFlags.length + yellowFlags.length} total)</span>
          </div>

          {redFlags.map((flag, i) => (
            <div key={`red-${i}`} className="flex items-start gap-3 text-sm border-l-4 border-l-red-400 border border-stone-200 bg-red-50/30 px-4 py-3 rounded-lg">
              {getCategoryIcon(flag.category)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-stone-900 capitalize">{flag.category}</span>
                  {flag.severity && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      Severity: {flag.severity}/10
                    </span>
                  )}
                </div>
                <p className="text-stone-700">{flag.message}</p>
                {flag.details && <p className="text-xs text-stone-600 mt-1 italic">{flag.details}</p>}
              </div>
            </div>
          ))}

          {yellowFlags.map((flag, i) => (
            <div key={`yellow-${i}`} className="flex items-start gap-3 text-sm border-l-4 border-l-amber-400 border border-stone-200 bg-amber-50/30 px-4 py-3 rounded-lg">
              {getCategoryIcon(flag.category)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-stone-900 capitalize">{flag.category}</span>
                  {flag.severity && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      Severity: {flag.severity}/10
                    </span>
                  )}
                </div>
                <p className="text-stone-700">{flag.message}</p>
                {flag.details && <p className="text-xs text-stone-600 mt-1 italic">{flag.details}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Questions */}
      {analysisResult.suggestedQuestions && analysisResult.suggestedQuestions.length > 0 && (
        <div className="border-l-4 border-l-blue-400 border border-stone-200 bg-blue-50/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-stone-900">Suggested Follow-up Questions</h4>
          </div>
          <ul className="space-y-3">
            {analysisResult.suggestedQuestions.map((question, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-stone-800">
                <span className="bg-blue-100 text-blue-700 font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs mt-0.5 flex-shrink-0">{i + 1}</span>
                <span className="leading-relaxed">{question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analysis Sources Summary */}
      {analysisResult.sources && analysisResult.sources.length > 0 && (
        <div className="bg-stone-50 rounded-lg p-4 mb-4 border border-stone-200">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-stone-600" />
            <h4 className="font-semibold text-stone-900">Data Sources Analyzed</h4>
          </div>
          <div className="flex gap-3">
            {analysisResult.sources.map((source, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={source.available ? 'text-stone-700' : 'text-stone-400'}>
                  {source.available ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </span>
                <span className="capitalize font-medium text-stone-800">{source.type}</span>
                {source.available && source.score && (
                  <span className="text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                    {source.score}/100
                  </span>
                )}
                {/* CV View Button */}
                {source.type === 'cv' && source.available && cvFileId && (
                  <button
                    onClick={handleCvView}
                    disabled={loadingCv}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-stone-100 hover:bg-stone-200 disabled:bg-stone-50 text-stone-700 disabled:text-stone-400 rounded transition-colors"
                    title="View CV"
                  >
                    {loadingCv ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                    {loadingCv ? 'Loading...' : 'View'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Date */}
      <div className="pt-4 border-t border-stone-200">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <CheckCircle className="h-3 w-3" />
          <span>Analyzed on {new Date(analysisResult.analysisDate).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

export default CredibilityScore;
