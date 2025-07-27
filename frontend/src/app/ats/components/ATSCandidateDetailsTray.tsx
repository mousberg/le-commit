'use client';

import { useEffect, useState } from 'react';
import { X, FileText, ExternalLink, Mail, Phone, MapPin, Calendar, Tag, Shield, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface ATSCandidateDetailsTrayProps {
  candidate: ATSCandidate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ATSCandidateDetailsTray({ candidate, isOpen, onClose }: ATSCandidateDetailsTrayProps) {
  const [mounted, setMounted] = useState(false);

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

  const getFraudLikelihoodBadge = (likelihood?: string) => {
    switch (likelihood) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" />High Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" />Medium Risk</Badge>;
      case 'low':
        return <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Low Risk</Badge>;
      default:
        return <Badge variant="outline" className="gap-1">Not Assessed</Badge>;
    }
  };

  const getStatusBadge = (status?: string, action?: string) => {
    if (action === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Verified</Badge>;
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
                  {getFraudLikelihoodBadge(candidate.fraud_likelihood)}
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

                {/* Fraud Analysis */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Fraud Risk Analysis</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Risk Level</span>
                      {getFraudLikelihoodBadge(candidate.fraud_likelihood)}
                    </div>
                    {candidate.fraud_reason && (
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Risk Reason</span>
                        <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-200">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{candidate.fraud_reason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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
                    onClick={() => {
                      // Trigger verification
                      alert('Starting verification for ' + candidate.name);
                    }}
                  >
                    Start Verification
                  </Button>
                )}
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}