'use client';

import { useEffect, useState } from 'react';
import { X, FileText, ExternalLink, Mail, Calendar, Tag, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ATSCandidate } from '@/lib/ashby/interfaces';
import { createClient } from '@/lib/supabase/client';
import { ManualAssessmentSection } from '@/components/ManualAssessmentSection';

interface ATSCandidateDetailsTrayProps {
  candidate: ATSCandidate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ATSCandidateDetailsTray({ candidate, isOpen, onClose }: ATSCandidateDetailsTrayProps) {
  const [mounted, setMounted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) return null;

  // Fraud analysis not available yet - removed for now

  const getStatusBadge = (status?: string, action?: string) => {
    if (action === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Analyzed</Badge>;
      case 'processing':
      case 'analyzing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'pending_from_ashby':
        return <Badge variant="outline">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Not Processed</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const startAnalysis = async () => {
    if (!candidate?.unmask_applicant_id) return;
    setAnalyzing(true);
    
    try {
      const supabase = createClient();
      
      // Direct database update - triggers event-driven analysis
      const { error } = await supabase
        .from('applicants')
        .update({ 
          ai_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.unmask_applicant_id);

      if (error) {
        throw error;
      }
      
      showNotification('success', 'Analysis started for ' + candidate.name);
      setTimeout(() => onClose(), 1500); // Close the tray after showing notification
    } catch (error) {
      console.error('Failed to start analysis:', error);
      showNotification('error', 'Failed to start analysis: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Tray */}
      <div 
        className={`fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {candidate && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900">{candidate.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  {getStatusBadge(candidate.unmask_status, candidate.action)}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Contact Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    {candidate.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{candidate.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Applied: {formatDate(candidate.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {candidate.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Sources */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Available Data Sources</h3>
                  <div className="space-y-2">
                    {candidate.linkedin_url && (
                      <a 
                        href={candidate.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="font-medium">View LinkedIn Profile</span>
                      </a>
                    )}
                    {candidate.has_resume && candidate.resume_url && (
                      <a 
                        href={candidate.resume_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">View Resume</span>
                      </a>
                    )}
                    {!candidate.linkedin_url && !candidate.has_resume && (
                      <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                        No data sources available for this candidate
                      </div>
                    )}
                  </div>
                </div>

                {/* Professional Information */}
                {(candidate.position || candidate.company || candidate.school) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Professional Information</h3>
                    <div className="space-y-2">
                      {candidate.position && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Position</span>
                          <span className="text-gray-900">{candidate.position}</span>
                        </div>
                      )}
                      {candidate.company && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Company</span>
                          <span className="text-gray-900">{candidate.company}</span>
                        </div>
                      )}
                      {candidate.school && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">School</span>
                          <span className="text-gray-900">{candidate.school}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Processing Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Unmask Status</span>
                      {getStatusBadge(candidate.unmask_status, candidate.action)}
                    </div>
                    {candidate.unmask_applicant_id && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Unmask ID</span>
                        <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                          {candidate.unmask_applicant_id.slice(0, 8)}...
                        </code>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Ready for Processing</span>
                      <span className={candidate.ready_for_processing ? 'text-green-600' : 'text-gray-500'}>
                        {candidate.ready_for_processing ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manual Assessment Section */}
                <ManualAssessmentSection 
                  candidate={candidate}
                  onUpdate={(updatedCandidate) => {
                    // In a real implementation, you might want to update the parent component's state
                    // For now, we'll just log the update
                    console.log('Candidate updated:', updatedCandidate);
                  }}
                />

                {/* Debug Information */}
                {candidate.unmask_applicant_id && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Debug Information</h3>
                    <div className="space-y-3">
                      {/* Processing Status Details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">AI Status</span>
                          <Badge variant="outline" className="text-xs">
                            {candidate.ai_status || 'null'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">CV Status</span>
                          <Badge variant="outline" className="text-xs">
                            {candidate.cv_status || 'null'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">LinkedIn Status</span>
                          <Badge variant="outline" className="text-xs">
                            {candidate.li_status || 'null'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">GitHub Status</span>
                          <Badge variant="outline" className="text-xs">
                            {candidate.gh_status || 'null'}
                          </Badge>
                        </div>
                      </div>

                      {/* Trigger Analysis */}
                      <div className="pt-2 border-t border-red-200">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 font-medium">Analysis Trigger</span>
                          <span className={
                            candidate.ai_status === 'pending' && 
                            (candidate.cv_status === 'ready' || candidate.li_status === 'ready' || candidate.gh_status === 'ready') &&
                            candidate.cv_status !== 'processing' && candidate.li_status !== 'processing' && candidate.gh_status !== 'processing'
                              ? 'text-green-600 font-medium' 
                              : 'text-red-600 font-medium'
                          }>
                            {candidate.ai_status === 'pending' && 
                            (candidate.cv_status === 'ready' || candidate.li_status === 'ready' || candidate.gh_status === 'ready') &&
                            candidate.cv_status !== 'processing' && candidate.li_status !== 'processing' && candidate.gh_status !== 'processing'
                              ? '✅ Should Trigger' 
                              : '❌ Won\'t Trigger'
                            }
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>• AI Status must be &apos;pending&apos;</div>
                          <div>• At least one data source must be &apos;ready&apos; (CV, LinkedIn, or GitHub)</div>
                          <div>• No data sources should be &apos;processing&apos;</div>
                          {candidate.ai_status !== 'pending' && (
                            <div className="text-red-600">⚠ AI Status is &apos;{candidate.ai_status}&apos; (needs &apos;pending&apos;)</div>
                          )}
                          {!(candidate.cv_status === 'ready' || candidate.li_status === 'ready' || candidate.gh_status === 'ready') && (
                            <div className="text-red-600">⚠ No data sources are ready</div>
                          )}
                          {(candidate.cv_status === 'processing' || candidate.li_status === 'processing' || candidate.gh_status === 'processing') && (
                            <div className="text-red-600">⚠ Some data sources are still processing</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex gap-3">
                {candidate.unmask_applicant_id && candidate.unmask_status === 'completed' && (
                  <Button 
                    className="flex-1"
                    onClick={() => window.open(`/board?id=${candidate.unmask_applicant_id}`, '_blank')}
                  >
                    View Full Analysis
                  </Button>
                )}
                {candidate.ready_for_processing && !candidate.unmask_applicant_id && (
                  <Button 
                    className="flex-1"
                    disabled={analyzing}
                    onClick={startAnalysis}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Starting Analysis...
                      </>
                    ) : (
                      'Start Analysis'
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-right duration-300">
            <div className={`
              px-6 py-4 rounded-lg shadow-lg max-w-sm
              ${notification.type === 'success' 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
              }
            `}>
              <div className="flex items-center gap-3">
                {notification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                )}
                <p className="text-sm font-medium">{notification.message}</p>
                <button
                  onClick={() => setNotification(null)}
                  className="ml-auto hover:bg-black/20 p-1 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}