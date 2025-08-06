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
  Loader2
} from 'lucide-react';
import { ATSCandidateDetailsTray } from './ATSCandidateDetailsTray';
import { ATSCandidate } from '@/lib/ashby/interfaces';

interface ATSCandidatesTableProps {
  candidates: ATSCandidate[];
}

export function ATSCandidatesTable({ candidates }: ATSCandidatesTableProps) {
  const router = useRouter();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ATSCandidate | null>(null);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [downloadingCandidates, setDownloadingCandidates] = useState<Set<string>>(new Set());

  const toggleCandidate = (ashbyId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(ashbyId) 
        ? prev.filter(id => id !== ashbyId)
        : [...prev, ashbyId]
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

  const toggleAll = () => {
    setSelectedCandidates(prev => 
      prev.length === candidates.length ? [] : candidates.map(c => c.ashby_id)
    );
  };

  // Fraud analysis not available yet - removed for now

  const getStatusBadge = (status?: string, action?: string) => {
    if (action === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
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

  const handleBulkVerification = async () => {
    if (selectedCandidates.length === 0) return;

    try {
      const response = await fetch('/api/ashby/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicant_ids: selectedCandidates.map(ashbyId => 
            candidates.find(c => c.ashby_id === ashbyId)?.unmask_applicant_id
          ).filter(Boolean),
          priority: 'high'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh the table or show success message
        alert(`Queued ${result.updated_count} candidates for verification`);
        setSelectedCandidates([]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert(`Failed to queue verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          {selectedCandidates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedCandidates.length} selected
              </span>
              <Button onClick={handleBulkVerification} size="sm">
                Queue for Verification
              </Button>
            </div>
          )}
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
                <th className="text-left p-3 font-medium text-gray-900">Position</th>
                <th className="text-left p-3 font-medium text-gray-900">Company</th>
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
                      checked={selectedCandidates.includes(candidate.ashby_id)}
                      onChange={() => toggleCandidate(candidate.ashby_id)}
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
                      {candidate.has_resume && (candidate.resume_file_handle || candidate.resume_url) ? (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation(); // Prevent row click
                            
                            const candidateId = candidate.ashby_id;
                            if (downloadingCandidates.has(candidateId)) {
                              return; // Already downloading
                            }
                            
                            try {
                              setDownloadingCandidates(prev => new Set(prev).add(candidateId));
                              
                              const response = await fetch('/api/ashby/resume', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  candidateId: candidate.ashby_id,
                                  fileHandle: candidate.resume_file_handle
                                })
                              });
                              
                              if (response.ok) {
                                // For direct file download
                                const contentDisposition = response.headers.get('content-disposition');
                                let filename = 'resume.pdf';
                                if (contentDisposition) {
                                  const matches = /filename="([^"]+)"/.exec(contentDisposition);
                                  if (matches) filename = matches[1];
                                }
                                
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } else {
                                let errorMessage = 'Unknown error';
                                try {
                                  const result = await response.json();
                                  errorMessage = result.error || `Server error: ${response.status}`;
                                } catch {
                                  errorMessage = `Server error: ${response.status}`;
                                }
                                console.error('Failed to download resume:', errorMessage);
                                alert('Failed to download resume: ' + errorMessage);
                              }
                            } catch (error) {
                              console.error('Error downloading resume:', error);
                              const errorMessage = error instanceof Error ? error.message : 'Network error';
                              alert('Failed to download resume: ' + errorMessage);
                            } finally {
                              setDownloadingCandidates(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(candidateId);
                                return newSet;
                              });
                            }
                          }}
                          className="hover:bg-green-100 p-1 rounded disabled:opacity-50"
                          title="Download Resume/CV"
                          disabled={downloadingCandidates.has(candidate.ashby_id)}
                        >
                          {downloadingCandidates.has(candidate.ashby_id) ? (
                            <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                          ) : (
                            <FileText className="h-5 w-5 text-green-600" />
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
                    {getScoreBadge(candidate.analysis?.score)}
                  </td>

                  {/* Position */}
                  <td className="p-3">
                    <span className="text-sm text-gray-900">
                      {candidate.position || (
                        <span className="text-gray-400 italic">Not specified</span>
                      )}
                    </span>
                  </td>

                  {/* Company */}
                  <td className="p-3">
                    <span className="text-sm text-gray-900">
                      {candidate.company || (
                        <span className="text-gray-400 italic">Not specified</span>
                      )}
                    </span>
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
                            router.push(`/board/applicants/${candidate.unmask_applicant_id}`);
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
                            // TODO: Implement start analysis flow
                            alert('Analysis not yet implemented for this candidate');
                          }}
                          className="h-8 px-2 text-gray-500"
                          disabled
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
      />
    </Card>
  );
}