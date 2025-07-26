'use client';

import { useState } from 'react';
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
  Mail,
  Calendar,
  Tag,
  Shield,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

interface ATSCandidate {
  ashby_id: string;
  name: string;
  email: string;
  linkedin_url?: string;
  has_resume: boolean;
  resume_url?: string;
  created_at: string;
  tags: string[];
  unmask_applicant_id?: string;
  unmask_status?: string;
  action: 'existing' | 'created' | 'not_created' | 'error';
  ready_for_processing?: boolean;
  fraud_likelihood?: 'low' | 'medium' | 'high';
  fraud_reason?: string;
}

interface ATSCandidatesTableProps {
  candidates: ATSCandidate[];
}

export function ATSCandidatesTable({ candidates }: ATSCandidatesTableProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  const toggleCandidate = (ashbyId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(ashbyId) 
        ? prev.filter(id => id !== ashbyId)
        : [...prev, ashbyId]
    );
  };

  const toggleAll = () => {
    setSelectedCandidates(prev => 
      prev.length === candidates.length ? [] : candidates.map(c => c.ashby_id)
    );
  };

  const getFraudLikelihoodBadge = (likelihood?: string) => {
    switch (likelihood) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" />High Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" />Medium Risk</Badge>;
      case 'low':
        return <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Low Risk</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Not Assessed</Badge>;
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
                <th className="text-left p-3 font-medium text-gray-900">Candidate</th>
                <th className="text-left p-3 font-medium text-gray-900">Data Sources</th>
                <th className="text-left p-3 font-medium text-gray-900">Status</th>
                <th className="text-left p-3 font-medium text-gray-900">Fraud Risk</th>
                <th className="text-left p-3 font-medium text-gray-900">Risk Reason</th>
                <th className="text-left p-3 font-medium text-gray-900">Created</th>
                <th className="text-left p-3 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.ashby_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.ashby_id)}
                      onChange={() => toggleCandidate(candidate.ashby_id)}
                      className="rounded"
                    />
                  </td>
                  
                  {/* Candidate Info */}
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{candidate.name}</span>
                      </div>
                      {candidate.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span>{candidate.email}</span>
                        </div>
                      )}
                      {candidate.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-gray-400" />
                          <div className="flex gap-1">
                            {candidate.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {candidate.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{candidate.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Data Sources */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      {candidate.linkedin_url && (
                        <div className="flex items-center gap-2 text-sm">
                          <ExternalLink className="h-3 w-3 text-blue-500" />
                          <a 
                            href={candidate.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                      {candidate.has_resume && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-3 w-3 text-green-500" />
                          {candidate.resume_url ? (
                            <a 
                              href={candidate.resume_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-600 hover:underline"
                            >
                              Resume
                            </a>
                          ) : (
                            <span className="text-green-600">Resume</span>
                          )}
                        </div>
                      )}
                      {!candidate.linkedin_url && !candidate.has_resume && (
                        <span className="text-sm text-gray-400">No data sources</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-3">
                    {getStatusBadge(candidate.unmask_status, candidate.action)}
                  </td>

                  {/* Fraud Risk */}
                  <td className="p-3">
                    {getFraudLikelihoodBadge(candidate.fraud_likelihood)}
                  </td>

                  {/* Risk Reason */}
                  <td className="p-3">
                    <div className="max-w-xs">
                      {candidate.fraud_reason ? (
                        <span className="text-sm text-gray-700">{candidate.fraud_reason}</span>
                      ) : (
                        <span className="text-sm text-gray-400">No assessment</span>
                      )}
                    </div>
                  </td>

                  {/* Created Date */}
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(candidate.created_at)}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/ats/${candidate.ashby_id}`, '_blank')}
                      >
                        View Details
                      </Button>
                      {candidate.ready_for_processing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Trigger verification for this candidate
                            alert('Starting verification...');
                          }}
                        >
                          Verify
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
    </Card>
  );
}