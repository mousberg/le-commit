'use client';

import { useApplicants } from '../../../lib/contexts/ApplicantContext';
import { useEffect, useState, Suspense } from 'react';
import { Plus, Search, Filter, Users, UserCheck, Clock, UserX } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ApplicantsPageContent() {
  const { applicants, fetchApplicants } = useApplicants();
  const [searchTerm, setSearchTerm] = useState('');
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const showNew = searchParams.get('new') === 'true';

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const filteredApplicants = applicants.filter(applicant => {
    const matchesSearch = applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (applicant.role && applicant.role.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || applicant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applicants.length,
    completed: applicants.filter(a => a.status === 'completed').length,
    processing: applicants.filter(a => a.status === 'processing' || a.status === 'analyzing' || a.status === 'uploading').length,
    failed: applicants.filter(a => a.status === 'failed').length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'processing':
      case 'analyzing':
      case 'uploading':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-zinc-100 text-zinc-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <UserCheck className="h-4 w-4" />;
      case 'failed':
        return <UserX className="h-4 w-4" />;
      case 'processing':
      case 'analyzing':
      case 'uploading':
        return <Clock className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  if (showNew) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Add New Applicant</h1>
          <p className="text-zinc-600">Upload a new candidate resume for analysis.</p>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-zinc-200/50 shadow-sm max-w-2xl">
          <div className="border-2 border-dashed border-zinc-300 rounded-lg p-12 text-center">
            <Plus className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 mb-2">Upload Resume</h3>
            <p className="text-zinc-600 mb-4">Drag and drop a resume file here, or click to browse</p>
            <button className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors">
              Choose File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            {statusFilter ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Applicants` : 'All Applicants'}
          </h1>
          <p className="text-zinc-600">Manage and review candidate applications.</p>
        </div>
        <Link 
          href="/board/applicants?new=true"
          className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link href="/board/applicants" className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-zinc-200/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <Users className="h-6 w-6 text-zinc-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-zinc-600">Total</p>
              <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
            </div>
          </div>
        </Link>

        <Link href="/board/applicants?status=completed" className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-zinc-200/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-zinc-600">Completed</p>
              <p className="text-2xl font-bold text-zinc-900">{stats.completed}</p>
            </div>
          </div>
        </Link>

        <Link href="/board/applicants?status=processing" className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-zinc-200/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-zinc-600">Processing</p>
              <p className="text-2xl font-bold text-zinc-900">{stats.processing}</p>
            </div>
          </div>
        </Link>

        <Link href="/board/applicants?status=failed" className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-zinc-200/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-zinc-600">Failed</p>
              <p className="text-2xl font-bold text-zinc-900">{stats.failed}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-zinc-200/50 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search applicants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black/20"
            />
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Applicants List */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-zinc-200/50 shadow-sm overflow-hidden">
        {filteredApplicants.length > 0 ? (
          <div className="divide-y divide-zinc-200/50">
            {filteredApplicants.map((applicant) => (
              <div key={applicant.id} className="p-6 hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center mr-4">
                      <span className="text-lg font-medium text-zinc-700">
                        {applicant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-zinc-900">{applicant.name}</h3>
                      <p className="text-sm text-zinc-500">{applicant.role || 'No role specified'}</p>
                      {applicant.email && (
                        <p className="text-sm text-zinc-400">{applicant.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor(applicant.status)}`}>
                      {getStatusIcon(applicant.status)}
                      {applicant.status}
                    </div>
                    <button className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500 mb-4">
              {searchTerm || statusFilter ? 'No applicants match your criteria' : 'No applicants yet'}
            </p>
            <Link 
              href="/board/applicants?new=true"
              className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Applicant
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ApplicantsPageContent />
    </Suspense>
  );
}