'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  User, 
  Mail, 
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface CandidateDetail {
  ashby_id: string;
  name: string;
  email: string;
  linkedin_url?: string;
  has_resume: boolean;
  resume_url?: string;
  created_at: string;
  tags: string[];
  custom_fields?: Record<string, any>;
  unmask_applicant_id?: string;
  unmask_status?: string;
  fraud_likelihood?: 'low' | 'medium' | 'high';
  fraud_reason?: string;
  analysis_summary?: string;
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.candidateId as string;
  
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        // For now, we'll simulate fetching candidate details
        // In a real implementation, you'd fetch from your API
        const mockCandidate: CandidateDetail = {
          ashby_id: candidateId,
          name: 'John Doe',
          email: 'john.doe@example.com',
          linkedin_url: 'https://linkedin.com/in/johndoe',
          has_resume: true,
          resume_url: 'https://example.com/resume.pdf',
          created_at: new Date().toISOString(),
          tags: ['software-engineer', 'remote', 'senior'],
          unmask_status: 'completed',
          fraud_likelihood: 'low',
          fraud_reason: '',
          analysis_summary: 'Candidate profile appears authentic with consistent work history and verifiable LinkedIn profile.'
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setCandidate(mockCandidate);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch candidate');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [candidateId]);

  const getFraudRiskColor = (likelihood?: string) => {
    switch (likelihood) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getFraudRiskIcon = (likelihood?: string) => {
    switch (likelihood) {
      case 'high': return <AlertTriangle className="h-5 w-5" />;
      case 'medium': return <Shield className="h-5 w-5" />;
      case 'low': return <CheckCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Candidate Not Found</h3>
              <p className="text-red-700">{error || 'Could not load candidate details.'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 pt-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to ATS
          </Button>
        </div>

        {/* Candidate Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{candidate.name}</CardTitle>
                    <CardDescription>Ashby ID: {candidate.ashby_id}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{candidate.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      Added {new Date(candidate.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {candidate.tags.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Data Sources</CardTitle>
                <CardDescription>Available candidate information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.linkedin_url && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <ExternalLink className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">LinkedIn Profile</p>
                        <p className="text-sm text-gray-600">Professional background and network</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(candidate.linkedin_url, '_blank')}
                    >
                      View Profile
                    </Button>
                  </div>
                )}

                {candidate.has_resume && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Resume/CV</p>
                        <p className="text-sm text-gray-600">Work experience and qualifications</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => candidate.resume_url && window.open(candidate.resume_url, '_blank')}
                      disabled={!candidate.resume_url}
                    >
                      Download
                    </Button>
                  </div>
                )}

                {!candidate.linkedin_url && !candidate.has_resume && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>No data sources available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Fraud Risk Assessment */}
            <Card className={`border-2 ${getFraudRiskColor(candidate.fraud_likelihood)}`}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {getFraudRiskIcon(candidate.fraud_likelihood)}
                  <CardTitle className="text-lg">Fraud Risk Assessment</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Risk Level</p>
                    <Badge 
                      variant={candidate.fraud_likelihood === 'high' ? 'destructive' : 'outline'}
                      className="capitalize"
                    >
                      {candidate.fraud_likelihood || 'Not Assessed'}
                    </Badge>
                  </div>
                  
                  {candidate.fraud_reason && (
                    <div>
                      <p className="text-sm font-medium mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{candidate.fraud_reason}</p>
                    </div>
                  )}
                  
                  {candidate.analysis_summary && (
                    <div>
                      <p className="text-sm font-medium mb-1">Analysis Summary</p>
                      <p className="text-sm text-gray-700">{candidate.analysis_summary}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidate.unmask_applicant_id ? (
                  <Button 
                    className="w-full"
                    onClick={() => window.open(`/board/applicants?id=${candidate.unmask_applicant_id}`, '_blank')}
                  >
                    View Full Analysis
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline">
                    Start Verification
                  </Button>
                )}
                
                <Button variant="outline" className="w-full">
                  Export Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}