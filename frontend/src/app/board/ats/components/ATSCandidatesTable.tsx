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
  Send,
  Edit2,
  Check,
  X,
  Brain
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ATSCandidateDetailsTray } from './ATSCandidateDetailsTray';
import { ATSCandidate } from '@/lib/ashby/interfaces';

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
  const [editingScores, setEditingScores] = useState<Record<string, number>>({}); // applicant ID -> score
  const [pushingScores, setPushingScores] = useState(false);
  const [pushResults, setPushResults] = useState<Record<string, { success: boolean; error?: string; score?: number; ashbyId?: string; applicantId?: string }>>({});  // applicant ID -> result
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleScoreEdit = (applicantId: string, newScore: number) => {
    setEditingScores(prev => ({
      ...prev,
      [applicantId]: newScore
    }));
  };

  const handleSaveScore = async (applicantId: string) => {
    const newScore = editingScores[applicantId];
    if (newScore === undefined) return;

    try {
      const supabase = createClient();
      
      // Update the score in the database
      const { error } = await supabase
        .from('applicants')
        .update({
          ai_data: {
            score: newScore,
            updated_at: new Date().toISOString(),
            manually_edited: true
          }
        })
        .eq('id', applicantId);

      if (error) throw error;

      // Remove from editing state
      setEditingScores(prev => {
        const newState = { ...prev };
        delete newState[applicantId];
        return newState;
      });

      // Refresh the page to show updated score
      window.location.reload();
    } catch (error) {
      console.error('Error saving score:', error);
      alert('Failed to save score: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCancelEdit = (applicantId: string) => {
    setEditingScores(prev => {
      const newState = { ...prev };
      delete newState[applicantId];
      return newState;
    });
  };

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

  const selectAllCandidates = () => {
    const candidatesWithScores = candidates.filter(c => c.score !== undefined || c.analysis?.score !== undefined);
    setSelectedCandidates(candidatesWithScores.map(c => c.id));
  };

  const selectCandidatesForAnalysis = () => {
    const candidatesForAnalysis = candidates.filter(c => 
      c.unmask_applicant_id && 
      c.ready_for_processing && 
      !c.analysis
    );
    setSelectedCandidates(candidatesForAnalysis.map(c => c.id));
  };

  // Get candidates that are ready for analysis
  const selectedCandidatesForAnalysis = candidates.filter(c => 
    selectedCandidates.includes(c.id) && 
    c.unmask_applicant_id && 
    c.ready_for_processing && 
    !c.analysis
  );

  // Get candidates that have scores for pushing
  const selectedCandidatesForScoring = candidates.filter(c => 
    selectedCandidates.includes(c.id) && 
    c.unmask_applicant_id && 
    (c.score !== undefined || c.analysis?.score !== undefined)
  );

  const clearSelection = () => {
    setSelectedCandidates([]);
  };

  const toggleAll = () => {
    setSelectedCandidates(prev => 
      prev.length === candidates.length ? [] : candidates.map(c => c.id)
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

  const handleBulkAnalysis = async () => {
    const candidatesWithApplicantIds = candidates.filter(c => 
      selectedCandidates.includes(c.id) && c.unmask_applicant_id
    );

    if (candidatesWithApplicantIds.length === 0) {
      alert('No candidates with applicant IDs selected');
      return;
    }

    setBatchAnalyzing(true);
    try {
      const supabase = createClient();
      const applicantIds = selectedCandidates; // selectedCandidates already contains applicant IDs
      
      console.log('🔍 Starting bulk analysis for applicant IDs:', applicantIds);
      console.log('📋 Candidates being processed:', candidatesWithApplicantIds.map(c => ({
        name: c.name,
        applicant_id: c.id,
        ready_for_processing: c.ready_for_processing
      })));
      
      // Direct database update - triggers event-driven analysis
      const { data, error } = await supabase
        .from('applicants')
        .update({ 
          ai_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .in('id', applicantIds)
        .select();

      console.log('📊 Supabase update result:', { data, error });

      if (error) {
        console.error('❌ Supabase error details:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error(`No applicants were updated. This might mean the applicant IDs don't exist in the database: ${applicantIds.join(', ')}`);
      }
      
      console.log('✅ Successfully updated applicants:', data);
      showNotification('success', `Started analysis for ${data.length} candidates`);
      setSelectedCandidates([]);
    } catch (error) {
      console.error('Failed to start batch analysis:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      showNotification('error', 'Failed to start batch analysis: ' + errorMessage);
    } finally {
      setBatchAnalyzing(false);
    }
  };

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
                
                {/* Bulk Analysis Button */}
                {selectedCandidatesForAnalysis.length > 0 && (
                  <Button 
                    onClick={handleBulkAnalysis} 
                    size="sm"
                    disabled={batchAnalyzing}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {batchAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-1" />
                        Start Analysis ({selectedCandidatesForAnalysis.length})
                      </>
                    )}
                  </Button>
                )}
                
                {/* Batch Push Scores Button */}
                {selectedCandidatesForScoring.length > 0 && (
                  <Button 
                    onClick={handleBatchPushScores} 
                    size="sm"
                    disabled={pushingScores}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {pushingScores ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Pushing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
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
              <>
                <Button onClick={selectAllCandidates} size="sm" variant="outline">
                  Select All with Scores
                </Button>
                <Button onClick={selectCandidatesForAnalysis} size="sm" variant="outline">
                  Select Ready for Analysis
                </Button>
              </>
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
                    checked={selectedCandidates.length === candidates.length}
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
              {candidates.map((candidate) => (
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
                  </td>

                  {/* Status */}
                  <td className="p-3">
                    {getStatusBadge(candidate.unmask_status, candidate.action)}
                  </td>

                  {/* Score */}
                  <td className="p-3">
                    {editingScores[candidate.id] !== undefined ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingScores[candidate.id]}
                          onChange={(e) => handleScoreEdit(candidate.id, Number(e.target.value))}
                          className="w-16 px-2 py-1 border rounded text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveScore(candidate.id);
                          }}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                          title="Save"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit(candidate.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {getScoreBadge(candidate.score || candidate.analysis?.score)}
                        {(candidate.score !== undefined || candidate.analysis?.score !== undefined) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScoreEdit(candidate.id, candidate.score || candidate.analysis?.score || 0);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Edit score"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
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
                    )}
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