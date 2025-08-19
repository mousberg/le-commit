'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ExternalLink, 
  FileText, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Clock
} from 'lucide-react';

interface ATSCandidate {
  id: string; // Primary identifier - applicant ID
  ashby_id?: string;
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
  score?: number | null;
  notes?: string | null;
  analysis?: {
    score?: number;
    [key: string]: any;
  };
}

interface ATSCandidatesTableProps {
  candidates: ATSCandidate[];
}

export function ATSCandidatesTable({ candidates }: ATSCandidatesTableProps) {
  const [sortBy, setSortBy] = useState<'name' | 'fraud_likelihood' | 'score'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedCandidates = [...candidates].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'fraud_likelihood':
        const riskOrder = { high: 3, medium: 2, low: 1 };
        aValue = riskOrder[a.fraud_likelihood as keyof typeof riskOrder] || 0;
        bValue = riskOrder[b.fraud_likelihood as keyof typeof riskOrder] || 0;
        break;
      case 'score':
        aValue = a.score ?? a.analysis?.score ?? 0;
        bValue = b.score ?? b.analysis?.score ?? 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: 'name' | 'fraud_likelihood' | 'score') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
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

  const getFraudLikelihoodBadge = (likelihood?: 'low' | 'medium' | 'high') => {
    if (!likelihood) return <Badge variant="outline">Not Assessed</Badge>;
    
    switch (likelihood) {
      case 'low':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Low Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (candidate: ATSCandidate) => {
    if (candidate.fraud_likelihood === 'high') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (candidate.unmask_status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (candidate.ready_for_processing) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <User className="h-4 w-4 text-gray-400" />;
  };

  if (candidates.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
          <p className="text-gray-600">
            No candidates are currently available from your ATS system.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          ATS Candidates ({candidates.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortBy === 'name' && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>LinkedIn</TableHead>
                <TableHead>Resume</TableHead>
                <TableHead>Status</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center gap-1">
                    Score
                    {sortBy === 'score' && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Flagged Reason</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('fraud_likelihood')}
                >
                  <div className="flex items-center gap-1">
                    Risk Level
                    {sortBy === 'fraud_likelihood' && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCandidates.map((candidate) => (
                <TableRow key={candidate.id} className="hover:bg-gray-50">
                  <TableCell>
                    {getStatusIcon(candidate)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span>{candidate.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{candidate.email}</span>
                  </TableCell>
                  <TableCell>
                    {candidate.linkedin_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 px-2"
                      >
                        <a 
                          href={candidate.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-400">No LinkedIn</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {candidate.has_resume ? (
                      candidate.resume_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 px-2"
                        >
                          <a 
                            href={candidate.resume_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            View
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      )
                    ) : (
                      <span className="text-sm text-gray-400">No Resume</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {candidate.unmask_status === 'completed' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Completed
                      </Badge>
                    ) : candidate.ready_for_processing ? (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not Ready
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {getScoreBadge(candidate.score ?? candidate.analysis?.score)}
                  </TableCell>
                  <TableCell>
                    {candidate.fraud_reason ? (
                      <span className="text-xs text-red-600 max-w-xs truncate" title={candidate.fraud_reason}>
                        {candidate.fraud_reason}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getFraudLikelihoodBadge(candidate.fraud_likelihood)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}