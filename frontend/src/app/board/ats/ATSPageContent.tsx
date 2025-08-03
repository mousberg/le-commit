'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, AlertTriangle, CheckCircle, Clock, ExternalLink} from 'lucide-react';
import { ATSCandidatesTable } from '@/app/board/components/ATSCandidatesTable';
import { refreshCandidates, autoSyncCandidates } from './actions';

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

interface ATSPageData {
  candidates: ATSCandidate[];
  cached_count: number;
  auto_synced: boolean;
  sync_results?: {
    new_candidates?: number;
    message?: string;
  };
  last_sync: number | null;
}

interface ATSPageContentProps {
  initialData: ATSPageData;
  user: { id: string; email?: string };
}

export function ATSPageContent({ initialData }: ATSPageContentProps) {
  const [data, setData] = useState<ATSPageData>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-sync on client if needed (silent, no loading UI)
  useEffect(() => {
    if (shouldAutoSync(initialData)) {
      handleAutoSync();
    }
  }, [initialData]);

  const shouldAutoSync = (data: ATSPageData) => {
    return data.cached_count === 0 || 
      (data.last_sync && Date.now() - data.last_sync > 60 * 60 * 1000);
  };

  const handleAutoSync = async () => {
    try {
      const result = await autoSyncCandidates();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.warn('Auto-sync failed:', error);
      // Handle error silently in auto-sync to avoid disrupting UX
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const result = await refreshCandidates();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.candidates) return;

    const headers = [
      'Name', 'Email', 'LinkedIn URL', 'Has Resume', 'Ashby ID', 
      'Created Date', 'Tags', 'Unmask Status', 'Fraud Likelihood', 'Fraud Reason'
    ];

    const csvContent = [
      headers.join(','),
      ...data.candidates.map(candidate => [
        `"${candidate.name}"`,
        `"${candidate.email}"`,
        `"${candidate.linkedin_url || ''}"`,
        candidate.has_resume ? 'Yes' : 'No',
        candidate.ashby_id,
        candidate.created_at,
        `"${candidate.tags.join('; ')}"`,
        `"${candidate.unmask_status || 'Not processed'}"`,
        `"${candidate.fraud_likelihood || 'Not assessed'}"`,
        `"${candidate.fraud_reason || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ats-candidates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="select-none flex flex-col min-h-screen">
      {/* Header */}
      <nav className="relative">
        <div className="mx-[3.5rem] mt-[4rem] mb-[2rem]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-stone-800 font-medium text-[2.5rem] leading-tight">ATS Integration</h1>
              <p className="text-stone-600 mt-2">
                View and analyze candidates from your ATS system
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={!data?.candidates?.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing All...' : 'Refresh All'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-grow bg-wallpaper py-[3rem] px-[3rem]">
        <div className="max-w-screen-xl">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cached Candidates</p>
                    <p className="text-2xl font-bold">{data.cached_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">With LinkedIn</p>
                    <p className="text-2xl font-bold">{data.candidates.filter(c => c.linkedin_url).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">With Resume</p>
                    <p className="text-2xl font-bold">{data.candidates.filter(c => c.has_resume).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">High Risk</p>
                    <p className="text-2xl font-bold">
                      {data.candidates.filter(c => c.fraud_likelihood === 'high').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sync Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>
                Last sync: {data.last_sync ? formatDate(data.last_sync) : 'Never'}
                {data.auto_synced && data.sync_results && (
                  <Badge variant="outline" className="ml-2">
                    Auto-synced: {data.sync_results.message}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  Candidates are automatically synced when you visit this page. 
                  Use the refresh button to force a full sync of all candidates.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Error:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Candidates Table */}
          <ATSCandidatesTable candidates={data.candidates} />
        </div>
      </div>
    </div>
  );
} 