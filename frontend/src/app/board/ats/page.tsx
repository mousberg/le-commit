'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAshbyAccess } from '@/lib/ashby/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, CheckCircle, Clock, ExternalLink, AlertTriangle, Mail, Filter } from 'lucide-react';
import { ATSCandidatesTable } from './components/ATSCandidatesTable';
import { ATSPageData, ATSCandidate } from '@/lib/ashby/interfaces';
import { CandidateFilter } from '@/lib/interfaces/applicant';
import { SCORE_FILTER_OPTIONS, DEFAULT_SCORE_FILTER, getScoreTierDescription } from '@/lib/scoring';

export default function ATSPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useAshbyAccess();
  const [data, setData] = useState<ATSPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CandidateFilter>({
    minScore: DEFAULT_SCORE_FILTER,
    hasLinkedIn: undefined,
    hasCV: undefined
  });
  const [showFilters, setShowFilters] = useState(false);
  const [fetchLimit, setFetchLimit] = useState(10); // Default fetch limit - matches auto-sync

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ashby/candidates', {
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
      
      if (result.auto_synced && result.sync_results) {
        console.log('🔄 Auto-synced candidates:', result.sync_results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial load - only fetch when authenticated
  useEffect(() => {
    if (user && !authLoading) {
      fetchCandidates();
    }
  }, [user, authLoading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/ashby/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          limit: fetchLimit 
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh candidates');
      }

      console.log('🔄 Full refresh completed:', result);
      
      // Fetch updated candidates
      await fetchCandidates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCandidateUpdate = (updatedCandidate: ATSCandidate) => {
    // Update the candidate in the local data state using functional update to prevent race conditions
    setData(currentData => {
      if (!currentData?.candidates) {
        return currentData;
      }

      const candidateId = updatedCandidate.id;
      
      const updatedCandidates = currentData.candidates.map(candidate => {
        if (candidate.id === candidateId) {
          return { ...candidate, ...updatedCandidate };
        }
        return candidate;
      });

      // Verify we actually found and updated a candidate
      const wasUpdated = updatedCandidates.some(candidate => 
        candidate.id === candidateId && 
        (candidate.score === updatedCandidate.score || candidate.notes === updatedCandidate.notes)
      );

      if (wasUpdated) {
        return {
          ...currentData,
          candidates: updatedCandidates
        };
      } else {
        console.warn('Candidate not found for update:', candidateId);
        return currentData;
      }
    });
  };

  // Filter candidates based on score and data completeness
  const getFilteredCandidates = () => {
    if (!data?.candidates) return [];
    
    return data.candidates.filter(candidate => {
      // Filter by score (data completeness or AI analysis score)
      const score = candidate.score || 10; // Default to 10 if not provided
      if (score < filter.minScore) return false;
      
      // Filter by LinkedIn data presence
      if (filter.hasLinkedIn !== undefined) {
        const hasLinkedIn = !!candidate.linkedin_url;
        if (hasLinkedIn !== filter.hasLinkedIn) return false;
      }
      
      // Filter by CV data presence
      if (filter.hasCV !== undefined) {
        const hasCV = !!candidate.has_resume;
        if (hasCV !== filter.hasCV) return false;
      }
      
      return true;
    });
  };

  const filteredCandidates = getFilteredCandidates();

  const handleExportCSV = () => {
    if (!filteredCandidates.length) return;

    const headers = [
      'Name',
      'Email', 
      'LinkedIn URL',
      'Has Resume',
      'Base Score',
      'Applicant ID',
      'Created Date',
      'Tags',
      'Unmask Status',
      'Position',
      'Company'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredCandidates.map(candidate => [
        `"${candidate.name}"`,
        `"${candidate.email}"`,
        `"${candidate.linkedin_url || ''}"`,
        candidate.has_resume ? 'Yes' : 'No',
        candidate.score || 10,
        candidate.id,
        candidate.created_at,
        `"${candidate.tags.join('; ')}"`,
        `"${candidate.unmask_status || 'Not processed'}"`,
        `"${candidate.position || ''}"`,
        `"${candidate.company || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ats-candidates-filtered-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading state while checking authentication or access
  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Show access denied message if user doesn't have ATS access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                ATS Integration Required
              </h2>
              <p className="text-gray-600 mb-6">
                To access the ATS dashboard, you need to enable the integration with your applicant tracking system.
              </p>
              <Button
                onClick={() => window.open('mailto:support@unmask.click?subject=Enable ATS Integration', '_blank')}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email support@unmask.click
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Our team will help you set up the integration and configure your API access.
              </p>
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
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {filter.minScore > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filter.minScore}+
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={!filteredCandidates.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV ({filteredCandidates.length})
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="fetch-limit" className="text-sm text-gray-600 whitespace-nowrap">
                    Fetch limit:
                  </label>
                  <input
                    id="fetch-limit"
                    type="number"
                    min="1"
                    max="1000"
                    value={fetchLimit}
                    onChange={(e) => setFetchLimit(Math.max(1, Math.min(1000, parseInt(e.target.value) || 10)))}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading || refreshing}
                  />
                </div>
                <Button onClick={handleRefresh} disabled={loading || refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing All...' : 'Refresh All'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter Candidates</CardTitle>
              <CardDescription>
                Filter by base score and data completeness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Score
                  </label>
                  <select
                    value={filter.minScore}
                    onChange={(e) => setFilter({ ...filter, minScore: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {SCORE_FILTER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {getScoreTierDescription(filter.minScore)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn Data
                  </label>
                  <select
                    value={filter.hasLinkedIn === undefined ? 'all' : filter.hasLinkedIn.toString()}
                    onChange={(e) => setFilter({ 
                      ...filter, 
                      hasLinkedIn: e.target.value === 'all' ? undefined : e.target.value === 'true' 
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">All candidates</option>
                    <option value="true">With LinkedIn</option>
                    <option value="false">Without LinkedIn</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume Data
                  </label>
                  <select
                    value={filter.hasCV === undefined ? 'all' : filter.hasCV.toString()}
                    onChange={(e) => setFilter({ 
                      ...filter, 
                      hasCV: e.target.value === 'all' ? undefined : e.target.value === 'true' 
                    })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">All candidates</option>
                    <option value="true">With Resume</option>
                    <option value="false">Without Resume</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="outline">
                  Showing {filteredCandidates.length} of {data?.candidates?.length || 0} candidates
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter({
                    minScore: DEFAULT_SCORE_FILTER,
                    hasLinkedIn: undefined,
                    hasCV: undefined
                  })}
                >
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Stored</p>
                    <p className="text-2xl font-bold">{data.stored_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Filter className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Filtered</p>
                    <p className="text-2xl font-bold">{filteredCandidates.length}</p>
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
                    <p className="text-sm text-gray-600">Complete Data</p>
                    <p className="text-2xl font-bold">
                      {filteredCandidates.filter(c => (c.score || 10) >= 30).length}
                    </p>
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
                    <p className="text-sm text-gray-600">AI Eligible</p>
                    <p className="text-2xl font-bold">
                      {filteredCandidates.filter(c => (c.score || 10) >= 30).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ready to Process</p>
                    <p className="text-2xl font-bold">
                      {filteredCandidates.filter(c => c.ready_for_processing).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sync Status */}
        {data && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>
                Last sync: {data.last_sync ? new Date(data.last_sync).toLocaleString() : 'Never'}
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
        )}

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
                  <ATSCandidatesTable 
          candidates={filteredCandidates} 
          onCandidateUpdate={handleCandidateUpdate}
        />
        )}

      </div>
    </div>
  );
}