'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, ExternalLink, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface AshbyIntegrationPanelProps {
  applicant: {
    id: string;
    name: string;
    ashby_candidate_id?: string;
    ashby_sync_status?: 'pending' | 'synced' | 'failed';
    ashby_last_synced_at?: string;
    analysis_result?: {
      credibilityScore: number;
      flags: Array<{ type: string; message: string }>;
    };
  };
}

export default function AshbyIntegrationPanel({ applicant }: AshbyIntegrationPanelProps) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  const isLinkedToAshby = !!applicant.ashby_candidate_id;
  const hasAnalysisResults = !!applicant.analysis_result;

  const handleSyncToAshby = async (action: 'sync_results' | 'sync_status' | 'sync_flags') => {
    setSyncStatus('syncing');
    setSyncMessage('');

    try {
      const response = await fetch('/api/ashby/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantId: applicant.id,
          action
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSyncStatus('success');
        setSyncMessage('Successfully synced to Ashby');
      } else {
        setSyncStatus('error');
        setSyncMessage(data.error || 'Sync failed');
      }
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage('Network error occurred');
    }

    // Reset status after 3 seconds
    setTimeout(() => {
      setSyncStatus('idle');
      setSyncMessage('');
    }, 3000);
  };

  const getSyncStatusIcon = () => {
    switch (applicant.ashby_sync_status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSyncStatusText = () => {
    switch (applicant.ashby_sync_status) {
      case 'synced':
        return 'Synced';
      case 'failed':
        return 'Failed';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const formatLastSyncTime = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  if (!isLinkedToAshby) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Ashby Integration
          </CardTitle>
          <CardDescription>
            This applicant is not linked to an Ashby candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            To enable Ashby integration, this applicant must be created through an Ashby webhook
            or manually linked to an existing Ashby candidate.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Ashby Integration
        </CardTitle>
        <CardDescription>
          Sync verification results with Ashby ATS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Ashby Candidate:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {applicant.ashby_candidate_id}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {getSyncStatusIcon()}
            <span className="text-sm">{getSyncStatusText()}</span>
          </div>
        </div>

        <Separator />

        {/* Last Sync Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Last Synced:</span>
            <div className="text-gray-600">
              {formatLastSyncTime(applicant.ashby_last_synced_at)}
            </div>
          </div>
          <div>
            <span className="font-medium">Sync Status:</span>
            <div className="text-gray-600">
              {getSyncStatusText()}
            </div>
          </div>
        </div>

        <Separator />

        {/* Sync Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Sync Actions</h4>
          
          <div className="grid gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSyncToAshby('sync_results')}
              disabled={!hasAnalysisResults || syncStatus === 'syncing'}
              className="justify-start"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Sync Verification Results
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSyncToAshby('sync_status')}
              disabled={syncStatus === 'syncing'}
              className="justify-start"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Sync Status Update
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSyncToAshby('sync_flags')}
              disabled={!hasAnalysisResults || syncStatus === 'syncing'}
              className="justify-start"
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Sync Verification Flags
            </Button>
          </div>
        </div>

        {/* Status Message */}
        {syncMessage && (
          <div className={`text-sm p-2 rounded ${
            syncStatus === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : syncStatus === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {syncMessage}
          </div>
        )}

        {/* Verification Summary */}
        {hasAnalysisResults && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Verification Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Credibility Score:</span>
                  <div className="text-lg font-bold">
                    {applicant.analysis_result?.credibilityScore}%
                  </div>
                </div>
                <div>
                  <span className="font-medium">Flags:</span>
                  <div className="flex gap-1 mt-1">
                    {applicant.analysis_result?.flags?.map((flag, index) => (
                      <Badge
                        key={index}
                        variant={flag.type === 'red' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {flag.type}
                      </Badge>
                    )) || <span className="text-gray-500">None</span>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}