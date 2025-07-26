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
import { ATSCandidateDetailsTray } from './ATSCandidateDetailsTray';

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
  const [selectedCandidate, setSelectedCandidate] = useState<ATSCandidate | null>(null);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

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
                <th className="text-left p-3 font-medium text-gray-900">Name</th>
                <th className="text-left p-3 font-medium text-gray-900">CV</th>
                <th className="text-left p-3 font-medium text-gray-900">LinkedIn</th>
                <th className="text-left p-3 font-medium text-gray-900">Status</th>
                <th className="text-left p-3 font-medium text-gray-900">Fraud Risk</th>
                <th className="text-left p-3 font-medium text-gray-900 w-2/5">Fraud Reason</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr 
                  key={candidate.ashby_id} 
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
                    </div>
                  </td>

                  {/* CV */}
                  <td className="p-3">
                    {candidate.has_resume ? (
                      <FileText className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-300" />
                    )}
                  </td>

                  {/* LinkedIn */}
                  <td className="p-3">
                    {candidate.linkedin_url ? (
                      <ExternalLink className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ExternalLink className="h-5 w-5 text-gray-300" />
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-3">
                    {getStatusBadge(candidate.unmask_status, candidate.action)}
                  </td>

                  {/* Fraud Risk */}
                  <td className="p-3">
                    {getFraudLikelihoodBadge(candidate.fraud_likelihood)}
                  </td>

                  {/* Fraud Reason */}
                  <td className="p-3">
                    <div className="text-sm text-gray-900">
                      {candidate.fraud_reason ? (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span>{candidate.fraud_reason}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">No issues detected</span>
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