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
  Clock,
  Shield
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
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'fraud_likelihood'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedCandidates = [...candidates].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'fraud_likelihood':
        const riskOrder = { high: 3, medium: 2, low: 1 };
        aValue = riskOrder[a.fraud_likelihood as keyof typeof riskOrder] || 0;
        bValue = riskOrder[b.fraud_likelihood as keyof typeof riskOrder] || 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: 'name' | 'created_at' | 'fraud_likelihood') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getActionBadge = (action: ATSCandidate['action']) => {
    switch (action) {
      case 'existing':
        return <Badge variant="secondary">Existing</Badge>;
      case 'created':
        return <Badge variant="default">Created</Badge>;
      case 'not_created':
        return <Badge variant="outline">Not Created</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
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
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortBy === 'created_at' && (
                      <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCandidates.map((candidate) => (
                <TableRow key={candidate.ashby_id} className="hover:bg-gray-50">
                  <TableCell>
                    {getStatusIcon(candidate)}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{candidate.name}</span>
                      {candidate.fraud_reason && (
                        <span className="text-xs text-red-600 mt-1">
                          {candidate.fraud_reason}
                        </span>
                      )}
                    </div>
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
                    {getFraudLikelihoodBadge(candidate.fraud_likelihood)}
                  </TableCell>
                  <TableCell>
                    {getActionBadge(candidate.action)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
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
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {new Date(candidate.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {candidate.unmask_applicant_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 px-2"
                        >
                          <a href={`/board/applicants?id=${candidate.unmask_applicant_id}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            View Analysis
                          </a>
                        </Button>
                      ) : candidate.ready_for_processing ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => {
                            // TODO: Implement process candidate functionality
                            console.log('Process candidate:', candidate.ashby_id);
                          }}
                        >
                          Process
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">Not ready</span>
                      )}
                    </div>
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