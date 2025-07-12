'use client';

import { useApplicants } from '../../../lib/contexts/ApplicantContext';
import { useEffect } from 'react';
import { Users, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { applicants, fetchApplicants } = useApplicants();

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const stats = {
    total: applicants.length,
    completed: applicants.filter(a => a.status === 'completed').length,
    processing: applicants.filter(a => a.status === 'processing' || a.status === 'analyzing' || a.status === 'uploading').length,
    failed: applicants.filter(a => a.status === 'failed').length
  };

  const recentApplicants = applicants.slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-zinc-900 mb-2">Good afternoon, David</h1>
          <p className="text-zinc-500">Here&apos;s what&apos;s happening with your applicants today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-zinc-50 rounded-lg">
                <Users className="h-5 w-5 text-zinc-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-500">Total Applicants</p>
                <p className="text-2xl font-semibold text-zinc-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-500">Completed</p>
                <p className="text-2xl font-semibold text-zinc-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <FileText className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-500">Processing</p>
                <p className="text-2xl font-semibold text-zinc-900">{stats.processing}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-500">Failed</p>
                <p className="text-2xl font-semibold text-zinc-900">{stats.failed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-zinc-900">Recent Applicants</h3>
              <button
                onClick={() => {
                  // Navigate to first applicant if any exist, otherwise new form
                  if (applicants.length > 0) {
                    window.location.href = `/board?id=${applicants[0].id}`;
                  } else {
                    window.location.href = '/board';
                  }
                }}
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                View all
              </button>
            </div>
            
            {recentApplicants.length > 0 ? (
              <div className="space-y-4">
                {recentApplicants.map((applicant) => (
                  <div key={applicant.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-zinc-600">
                          {applicant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{applicant.name}</p>
                        <p className="text-xs text-zinc-500">{applicant.role || 'No role specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {applicant.status === 'completed' && (
                        <>
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200 font-medium">
                            CV ✓
                          </span>
                          {applicant.linkedinData && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200 font-medium">
                              LinkedIn ✓
                            </span>
                          )}
                          {applicant.githubData && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-200 font-medium">
                              GitHub ✓
                            </span>
                          )}
                        </>
                      )}
                      {applicant.status === 'failed' && (
                        <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full border border-red-200 font-medium">
                          Failed
                        </span>
                      )}
                      {(applicant.status === 'processing' || applicant.status === 'analyzing' || applicant.status === 'uploading') && (
                        <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full border border-yellow-200 font-medium">
                          Processing...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500 mb-4">No applicants yet</p>
                <Link 
                  href="/board"
                  className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Add First Applicant
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-zinc-900 mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Navigate to first applicant if any exist, otherwise new form
                  if (applicants.length > 0) {
                    window.location.href = `/board?id=${applicants[0].id}`;
                  } else {
                    window.location.href = '/board';
                  }
                }}
                className="flex items-center p-3 rounded-lg hover:bg-zinc-50 transition-colors group border border-transparent hover:border-zinc-200 w-full text-left"
              >
                <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-200 transition-colors">
                  <Users className="h-4 w-4 text-zinc-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-zinc-900">Manage Applicants</p>
                  <p className="text-xs text-zinc-500">View and analyze candidates</p>
                </div>
              </button>
              
              <Link 
                href="/board/personalize"
                className="flex items-center p-3 rounded-lg hover:bg-zinc-50 transition-colors group border border-transparent hover:border-zinc-200"
              >
                <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-200 transition-colors">
                  <FileText className="h-4 w-4 text-zinc-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-zinc-900">Configure Analysis</p>
                  <p className="text-xs text-zinc-500">Set up detection rules</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}