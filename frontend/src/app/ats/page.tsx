'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { ATSCandidatesTable } from './components/ATSCandidatesTable';

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
  summary: {
    total_fetched: number;
    filtered_count: number;
    created_in_unmask: number;
    already_existing: number;
    with_linkedin: number;
    with_resume: number;
    ready_for_verification: number;
  };
  pagination?: {
    next_cursor?: string;
    more_available: boolean;
  };
}

export default function ATSPage() {
  const [data, setData] = useState<ATSPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoCreate, setAutoCreate] = useState(false);
  const [onlyWithData, setOnlyWithData] = useState(true);
  const [limit, setLimit] = useState(20);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        auto_create: autoCreate.toString(),
        only_with_data: onlyWithData.toString()
      });

      const response = await fetch(`/api/ashby/pull?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch candidates');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleRefresh = () => {
    fetchCandidates();
  };

  const handleExportCSV = () => {
    if (!data?.candidates) return;

    const headers = [
      'Name',
      'Email', 
      'LinkedIn URL',
      'Has Resume',
      'Ashby ID',
      'Created Date',
      'Tags',
      'Unmask Status',
      'Fraud Likelihood',
      'Fraud Reason'
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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto p-6 pt-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">ATS Integration</h1>
              <p className="text-gray-600 mt-2">
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
              <Button onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {data?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Candidates</p>
                    <p className="text-2xl font-bold">{data.summary.total_fetched}</p>
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
                    <p className="text-sm text-gray-600">With Data</p>
                    <p className="text-2xl font-bold">{data.summary.filtered_count}</p>
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
                    <p className="text-sm text-gray-600">Ready for Verification</p>
                    <p className="text-2xl font-bold">{data.summary.ready_for_verification}</p>
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
                    <p className="text-sm text-gray-600">In Unmask</p>
                    <p className="text-2xl font-bold">
                      {data.summary.created_in_unmask + data.summary.already_existing}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sync Settings</CardTitle>
            <CardDescription>
              Configure how candidates are pulled from your ATS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Limit:</label>
                <select 
                  value={limit} 
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="onlyWithData"
                  checked={onlyWithData}
                  onChange={(e) => setOnlyWithData(e.target.checked)}
                />
                <label htmlFor="onlyWithData" className="text-sm font-medium">
                  Only candidates with LinkedIn/Resume
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoCreate"
                  checked={autoCreate}
                  onChange={(e) => setAutoCreate(e.target.checked)}
                />
                <label htmlFor="autoCreate" className="text-sm font-medium">
                  Auto-create in Unmask
                </label>
              </div>

              <Button onClick={fetchCandidates} variant="outline" size="sm">
                Apply Filters
              </Button>
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

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Fetching candidates from ATS...</p>
            </CardContent>
          </Card>
        )}

        {/* Candidates Table */}
        {data && !loading && (
          <ATSCandidatesTable candidates={data.candidates} />
        )}

        {/* Pagination */}
        {data?.pagination?.more_available && (
          <div className="mt-6 text-center">
            <Button variant="outline">
              Load More Candidates
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}