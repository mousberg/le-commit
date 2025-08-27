'use client';

import { useApplicants } from '@/lib/contexts/ApplicantContext';
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

  const recentApplicants = applicants.slice(0, 5);

  return (
    <div className="select-none flex flex-col min-h-screen">
      {/* Header Section */}
      <nav className="relative">
        <div className="mx-[3.5rem] mt-[4rem] mb-[2rem]">
          <h1 className="mb-4 text-base text-stone-500 font-normal">Dashboard</h1>
          <h1 className="text-stone-800 font-medium text-[2.5rem] leading-tight">Good afternoon, David</h1>
          <p className="text-stone-600 mt-2">Here&apos;s what&apos;s happening with your applicants today.</p>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-grow bg-wallpaper py-[3rem] px-[3rem]">
        <div className="max-w-screen-xl">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Total Applicants */}
            <section className="border border-stone-300">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-5 w-5 text-stone-600" />
                  <h3 className="text-sm font-medium text-stone-600">Total Applicants</h3>
                </div>
                <p className="text-3xl font-semibold text-stone-900">{stats.total}</p>
              </div>
            </section>

            {/* Completed */}
            <section className="border border-stone-300">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-medium text-stone-600">Completed</h3>
                </div>
                <p className="text-3xl font-semibold text-stone-900">{stats.completed}</p>
              </div>
            </section>

            {/* Processing */}
            <section className="border border-stone-300">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-sm font-medium text-stone-600">Processing</h3>
                </div>
                <p className="text-3xl font-semibold text-stone-900">{stats.processing}</p>
              </div>
            </section>

            {/* Failed */}
            <section className="border border-stone-300">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h3 className="text-sm font-medium text-stone-600">Failed</h3>
                </div>
                <p className="text-3xl font-semibold text-stone-900">{stats.failed}</p>
              </div>
            </section>
          </div>

          {/* Main Content Grid */}
          <div className="border border-stone-300 divide-y lg:divide-y-0 lg:divide-x divide-stone-300">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Recent Applicants Section */}
              <div className="divide-y divide-stone-300">
                <div className="flex items-center justify-between px-6 py-6">
                  <div>
                    <h2 className="text-lg font-medium tracking-tight">Recent Applicants</h2>
                    <p className="text-sm text-stone-600 mt-1">Latest candidates in your pipeline</p>
                  </div>
                  {applicants.length > 0 && (
                    <button
                      onClick={() => {
                        window.location.href = `/board?id=${applicants[0].id}`;
                      }}
                      className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
                    >
                      View all
                    </button>
                  )}
                </div>
                
                <div className="px-6 py-6">
                  {recentApplicants.length > 0 ? (
                    <div className="space-y-6">
                      {recentApplicants.map((applicant) => (
                        <Link 
                          key={applicant.id} 
                          href={`/board?id=${applicant.id}`}
                          className="flex items-center justify-between py-3 px-3 -mx-3 hover:bg-stone-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-stone-200 flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-stone-700">
                                {applicant.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-900">{applicant.name}</p>
                              <p className="text-xs text-stone-500">
                                {applicant.cv_data?.jobTitle || applicant.li_data?.headline || 'No role specified'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {applicant.cv_data && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 font-medium">
                                CV ✓
                              </span>
                            )}
                            {applicant.li_data && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 font-medium">
                                LinkedIn ✓
                              </span>
                            )}
                            {applicant.gh_data && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 font-medium">
                                GitHub ✓
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                      <p className="text-stone-500 mb-4">No applicants yet</p>
                      <Link 
                        href="/board"
                        className="inline-flex items-center px-4 py-2 bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
                      >
                        Add First Applicant
                      </Link>
                    </div>
                  )}
                </div>
              </div>
  
              {/* Quick Actions Section */}
              <div className="divide-y divide-stone-300">
                <div className="px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Quick Actions</h2>
                  <p className="text-sm text-stone-600 mt-1">Common tasks and shortcuts</p>
                </div>
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    <Link
                      href="/board"
                      className="flex items-center p-4 hover:bg-stone-50 transition-colors group w-full text-left"
                    >
                      <div className="flex items-center justify-center w-10 h-10 mr-4">
                        <Users className="h-5 w-5 text-stone-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900">Manage Applicants</p>
                        <p className="text-xs text-stone-600 mt-0.5">View and analyze candidates</p>
                      </div>
                    </Link>
                    
                    <Link 
                      href="/board/personalize"
                      className="flex items-center p-4 hover:bg-stone-50 transition-colors group w-full text-left"
                    >
                      <div className="flex items-center justify-center w-10 h-10 mr-4">
                        <FileText className="h-5 w-5 text-stone-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900">Configure Analysis</p>
                        <p className="text-xs text-stone-600 mt-0.5">Set up detection rules</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}