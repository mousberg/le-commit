'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User,
  Eye,
  Loader2,
  Check,
  X,
  PlayCircle,
  RefreshCw,
  Upload
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ATSCandidateDetailsTray } from './ATSCandidateDetailsTray';
import { ATSCandidate } from '@/lib/ashby/interfaces';
import { isEligibleForAIAnalysis } from '@/lib/scoring';

interface ATSCandidatesTableProps {
  candidates: ATSCandidate[];
  onCandidateUpdate?: (updatedCandidate: ATSCandidate) => void;
}

export function ATSCandidatesTable({ candidates, onCandidateUpdate }: ATSCandidatesTableProps) {
  const router = useRouter();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]); // applicant IDs
  const [selectedCandidate, setSelectedCandidate] = useState<ATSCandidate | null>(null);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [viewingCandidates, setViewingCandidates] = useState<Set<string>>(new Set());
  const [pushingScores, setPushingScores] = useState(false);
  const [pushResults, setPushResults] = useState<Record<string, { success: boolean; error?: string; score?: number; ashbyId?: string; applicantId?: string }>>({});  // applicant ID -> result
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'processable' | 'ready'>('all');

  const handleCvView = async (candidateId: string, cvFileId: string | null | undefined) => {
    if (!cvFileId || viewingCandidates.has(candidateId)) return;
    
    setViewingCandidates(prev => new Set(prev).add(candidateId));
    try {
      const supabase = createClient();
      
      // Get file record
      const { data: fileRecord, error: fileError } = await supabase
        .from('files')
        .select('storage_bucket, storage_path, original_filename')
        .eq('id', cvFileId)
        .single();
        
      if (fileError || !fileRecord) {
        throw new Error('File not found');
      }
      
      // Generate signed URL for viewing
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from(fileRecord.storage_bucket)
        .createSignedUrl(fileRecord.storage_path, 3600); // 1 hour
        
      if (urlError || !signedUrl) {
        throw new Error('Failed to generate view URL');
      }
      
      // Open in new tab for viewing
      window.open(signedUrl.signedUrl, '_blank');
      
    } catch (error) {
      console.error('CV view error:', error);
      alert('Failed to view CV: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setViewingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
  };

  const toggleCandidate = (applicantId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(applicantId) 
        ? prev.filter(id => id !== applicantId)
        : [...prev, applicantId]
    );
  };

  const handleRowClick = (candidate: ATSCandidate, event: React.MouseEvent) => {
    // Don't open tray if clicking on checkbox or actions
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('button')) {
      return;
    }
    setSelectedCandidate(candidate);
    setIsTrayOpen(true);
  };

  const closeTray = () => {
    setIsTrayOpen(false);
    setTimeout(() => setSelectedCandidate(null), 300);
  };

  const handleCandidateUpdate = (updatedCandidate: ATSCandidate) => {
    // Update the selected candidate in local state
    setSelectedCandidate(updatedCandidate);
    
    // Notify parent component if callback is provided
    if (onCandidateUpdate) {
      onCandidateUpdate(updatedCandidate);
    }
  };

  // Manual processing for ATS candidates
  // Updated: January 26, 2025 - Replaced database triggers with direct API calls
  // This allows user control over when ATS candidates are processed
  const handleManualProcessing = async () => {
    if (selectedCandidates.length === 0) {
      alert('No candidates selected');
      return;
    }

    setBatchAnalyzing(true);
    
    try {
      const processPromises = [];
      let totalTasks = 0;
      
      for (const candidateId of selectedCandidates) {
        const candidate = candidates.find(c => c.id === candidateId);
        if (!candidate?.unmask_applicant_id) continue;

        // CV Processing
        if (candidate.cv_file_id && candidate.cv_status === 'pending') {
          processPromises.push(
            fetch('/api/cv-process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                applicant_id: candidate.unmask_applicant_id,
                file_id: candidate.cv_file_id
              })
            })
          );
          totalTasks++;
        }

        // LinkedIn Processing  
        if (candidate.linkedin_url && candidate.li_status === 'pending') {
          processPromises.push(
            fetch('/api/linkedin-fetch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                applicant_id: candidate.unmask_applicant_id,
                linkedin_url: candidate.linkedin_url
              })
            })
          );
          totalTasks++;
        }

        // GitHub Processing
        if (candidate.github_url && candidate.gh_status === 'pending') {
          processPromises.push(
            fetch('/api/github-fetch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                applicant_id: candidate.unmask_applicant_id,
                github_url: candidate.github_url
              })
            })
          );
          totalTasks++;
        }

        // AI Analysis (only if data sources are ready)
        if (candidate.ai_status === 'pending' && 
           (candidate.cv_status === 'ready' || candidate.li_status === 'ready' || candidate.gh_status === 'ready')) {
          processPromises.push(
            fetch('/api/analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                applicant_id: candidate.unmask_applicant_id
              })
            })
          );
          totalTasks++;
        }
      }

      if (processPromises.length === 0) {
        alert('No candidates need processing');
        return;
      }

      // Process all in parallel
      const results = await Promise.allSettled(processPromises);
      
      let successCount = 0;
      results.forEach(result => {
        if (result.status === 'fulfilled') successCount++;
      });
      
      alert(`Started processing for ${successCount}/${totalTasks} tasks`);
      
      // Refresh candidates list after a short delay to see status changes
      setTimeout(() => {
        if (onCandidateUpdate && candidates.length > 0) {
          onCandidateUpdate(candidates[0]); // Trigger parent refresh
        }
      }, 1000);
      
    } catch (error) {
      console.error('Processing error:', error);
      alert('Failed to start processing');
    } finally {
      setBatchAnalyzing(false);
    }
  };

  // Filter candidates based on current filter
  const filteredCandidates = candidates.filter(candidate => {
    switch (filter) {
      case 'processable':
        return candidate.cv_status === 'pending' || 
               candidate.li_status === 'pending' || 
               candidate.gh_status === 'pending' || 
               candidate.ai_status === 'pending';
      case 'ready':
        return candidate.ai_status === 'ready' && 
               (candidate.score !== undefined || candidate.analysis?.score !== undefined);
      default:
        return true; // 'all'
    }
  });

  const handleBatchPushScores = async () => {
    if (selectedCandidatesForScoring.length === 0) {
      alert('No candidates with scores selected');
      return;
    }

    setPushingScores(true);
    setPushResults({});

    try {
      const applicantIds = selectedCandidatesForScoring.map(c => c.unmask_applicant_id);

      const response = await fetch('/api/ashby/push-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchMode: true,
          applicantIds
        })
      });

      const result = await response.json();

      if (result.success) {
        setPushResults(result.results); // Results are now keyed by applicant ID
        alert(`Batch push completed: ${result.summary.successful}/${result.summary.total} successful`);
      } else {
        throw new Error(result.error || 'Failed to push scores');
      }

    } catch (error) {
      console.error('Error pushing scores:', error);
      alert('Failed to push scores: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setPushingScores(false);
    }
  };

  // Removed unused selectAllCandidates and selectCandidatesForAnalysis - replaced with filter system

  // Note: AI analysis is now handled by Process Selected button

  // Get candidates that have scores AND are fully processed for pushing to Ashby
  const selectedCandidatesForScoring = filteredCandidates.filter(c => 
    selectedCandidates.includes(c.id) && 
    c.unmask_applicant_id && 
    (c.score !== undefined || c.analysis?.score !== undefined) &&
    c.ai_status === 'ready' && // AI analysis must be complete
    (c.cv_status === 'ready' || c.li_status === 'ready' || c.gh_status === 'ready') // At least one source processed
  );

  const clearSelection = () => {
    setSelectedCandidates([]);
  };

  const toggleAll = () => {
    setSelectedCandidates(prev => 
      prev.length === filteredCandidates.length && filteredCandidates.length > 0
        ? [] 
        : filteredCandidates.map(c => c.id)
    );
  };

  // Fraud analysis not available yet - removed for now

  const getStatusBadge = (status?: string, action?: string) => {
    if (action === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Analyzed</Badge>;
      case 'processing':
      case 'analyzing':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'pending_from_ashby':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Not Processed</Badge>;
    }
  };

  const getScoreBadge = (score?: number) => {
    if (score === undefined || score === null) {
      return <span className="text-gray-400 text-sm">-</span>;
    }
    
    let colorClass = 'bg-gray-100 text-gray-700';
    if (score >= 80) {
      colorClass = 'bg-green-100 text-green-800';
    } else if (score >= 60) {
      colorClass = 'bg-yellow-100 text-yellow-800';
    } else if (score < 60) {
      colorClass = 'bg-red-100 text-red-800';
    }
    
    return (
      <Badge variant="outline" className={`${colorClass} border-0`}>
        {score}
      </Badge>
    );
  };

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('en-US', {
  //     year: 'numeric',
  //     month: 'short',
  //     day: 'numeric'
  //   });
  // };

  // handleBulkAnalysis removed - functionality moved to handleManualProcessing

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleIndividualAnalysis = async (candidate: ATSCandidate) => {
    if (!candidate.unmask_applicant_id) {
      showNotification('error', 'This candidate is not yet linked to the analysis system');
      return;
    }

    if (!candidate.ready_for_processing) {
      showNotification('error', 'This candidate is not ready for analysis yet');
      return;
    }

    // Check if candidate is eligible for AI analysis (score >= 30)
    if (!isEligibleForAIAnalysis(candidate.score || 10)) {
      showNotification('error', 'AI analysis is only available for candidates with complete data (both LinkedIn and CV)');
      return;
    }

    try {
      // Call the analysis API directly (no more database triggers)
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicant_id: candidate.unmask_applicant_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Analysis completed:', result);
      showNotification('success', 'Analysis completed for ' + candidate.name);
      
      // Trigger UI refresh after short delay
      setTimeout(() => {
        if (onCandidateUpdate) {
          onCandidateUpdate(candidate);
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to start individual analysis:', error);
      showNotification('error', 'Failed to start analysis: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (candidates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
          <p className="text-gray-600">
            Try adjusting your filters or check your ATS connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Candidates ({candidates.length})</CardTitle>
          <div className="flex items-center gap-2">
            {selectedCandidates.length > 0 ? (
              <>
                <span className="text-sm text-gray-600">
                  {selectedCandidates.length} selected
                </span>
                
                {/* Process Selected Button */}
                <Button 
                  onClick={handleManualProcessing}
                  size="sm"
                  disabled={selectedCandidates.length === 0 || batchAnalyzing}
                  variant="default"
                >
                  {batchAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Process Selected ({selectedCandidates.length})
                    </>
                  )}
                </Button>
                
                {/* Push to Ashby Button */}
                {selectedCandidatesForScoring.length > 0 && (
                  <Button 
                    onClick={handleBatchPushScores} 
                    size="sm"
                    disabled={pushingScores}
                    variant="secondary"
                  >
                    {pushingScores ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Pushing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-1" />
                        Push to Ashby ({selectedCandidatesForScoring.length})
                      </>
                    )}
                  </Button>
                )}
                
                <Button onClick={clearSelection} size="sm" variant="outline">
                  Clear Selection
                </Button>
              </>
            ) : (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600">Filter:</span>
                <Button 
                  onClick={() => setFilter('all')} 
                  size="sm" 
                  variant={filter === 'all' ? 'default' : 'outline'}
                >
                  All ({candidates.length})
                </Button>
                <Button 
                  onClick={() => setFilter('processable')} 
                  size="sm" 
                  variant={filter === 'processable' ? 'default' : 'outline'}
                >
                  Processable ({candidates.filter(c => c.cv_status === 'pending' || c.li_status === 'pending' || c.gh_status === 'pending' || c.ai_status === 'pending').length})
                </Button>
                <Button 
                  onClick={() => setFilter('ready')} 
                  size="sm" 
                  variant={filter === 'ready' ? 'default' : 'outline'}
                >
                  Ready to Push ({candidates.filter(c => c.ai_status === 'ready' && (c.score !== undefined || c.analysis?.score !== undefined)).length})
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-3 font-medium text-gray-900">Name</th>
                <th className="text-left p-3 font-medium text-gray-900">CV</th>
                <th className="text-left p-3 font-medium text-gray-900">LinkedIn</th>
                <th className="text-left p-3 font-medium text-gray-900">Status</th>
                <th className="text-left p-3 font-medium text-gray-900">Score</th>
                <th className="text-left p-3 font-medium text-gray-900">Notes</th>
                <th className="text-left p-3 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => (
                <tr 
                  key={candidate.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => handleRowClick(candidate, e)}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.id)}
                      onChange={() => toggleCandidate(candidate.id)}
                      className="rounded"
                    />
                  </td>
                  
                  {/* Name */}
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-gray-900">{candidate.name}</div>
                      {candidate.email && (
                        <div className="text-sm text-gray-500">{candidate.email}</div>
                      )}
                      {candidate.location_summary && (
                        <div className="text-xs text-gray-400">{candidate.location_summary}</div>
                      )}
                    </div>
                  </td>

                  {/* CV */}
                  <td className="p-3">
                    <div className="flex gap-1">
                      {candidate.has_resume && candidate.cv_file_id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handleCvView(candidate.id, candidate.cv_file_id);
                          }}
                          className="hover:bg-green-100 p-1 rounded disabled:opacity-50"
                          title="View CV"
                          disabled={viewingCandidates.has(candidate.id)}
                        >
                          {viewingCandidates.has(candidate.id) ? (
                            <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                          ) : (
                            <Eye className="h-5 w-5 text-green-600" />
                          )}
                        </button>
                      ) : (
                        <FileText className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                  </td>

                  {/* LinkedIn */}
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {candidate.linkedin_url ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            if (candidate.linkedin_url) window.open(candidate.linkedin_url, '_blank');
                          }}
                          className="hover:bg-blue-100 p-1 rounded"
                          title="Open LinkedIn Profile"
                        >
                          <ExternalLink className="h-5 w-5 text-blue-600" />
                        </button>
                      ) : (
                        <ExternalLink className="h-5 w-5 text-gray-300" />
                      )}
                      {/* Show dummy data warning if LinkedIn data is dummy */}
                      {candidate.li_data?.isDummyData && (
                        <div title="⚠️ Using simulated LinkedIn data for testing">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-3">
                    {getStatusBadge(candidate.unmask_status, candidate.action)}
                  </td>

                  {/* Score */}
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {getScoreBadge(candidate.score || candidate.analysis?.score)}
                      {pushResults[candidate.id] && (
                        <span className="ml-1">
                          {pushResults[candidate.id].success ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <X className="h-3 w-3 text-red-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Notes */}
                  <td className="p-3">
                    {candidate.notes ? (
                      <div className="max-w-32 truncate text-sm text-gray-600" title={candidate.notes}>
                        {candidate.notes}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm italic">No notes</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {candidate.unmask_applicant_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/board?id=${candidate.unmask_applicant_id}`);
                          }}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIndividualAnalysis(candidate);
                          }}
                          className="h-8 px-2"
                        >
                          Start Analysis
                        </Button>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      
      {/* Candidate Details Tray */}
      <ATSCandidateDetailsTray
        candidate={selectedCandidate}
        isOpen={isTrayOpen}
        onClose={closeTray}
        onCandidateUpdate={handleCandidateUpdate}
      />

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
    </Card>
  );
}