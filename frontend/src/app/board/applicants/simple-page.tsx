'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Users, UserCheck, Clock, UserX } from 'lucide-react';
import { Applicant } from '@/lib/interfaces/applicant';
import { simpleDatabaseService } from '@/lib/services/database';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function SimpleApplicantsPage() {
  const { user, loading: authLoading } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Load user's applicants
  useEffect(() => {
    async function loadApplicants() {
      if (!user || authLoading) return;
      
      try {
        setLoading(true);
        const userApplicants = await simpleDatabaseService.listUserApplicants({
          search: searchTerm || undefined,
          status: statusFilter || undefined
        });
        setApplicants(userApplicants);
      } catch (error) {
        console.error('Failed to load applicants:', error);
      } finally {
        setLoading(false);
      }
    }

    loadApplicants();
  }, [user, authLoading, searchTerm, statusFilter]);

  const statusCounts = {
    total: applicants.length,
    completed: applicants.filter(a => a.status === 'completed').length,
    processing: applicants.filter(a => a.status === 'processing' || a.status === 'analyzing').length,
    failed: applicants.filter(a => a.status === 'failed').length,
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading your applicants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Applicants</h1>
          <p className="text-muted-foreground">Manage and analyze your job applicants</p>
        </div>
        <button 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90"
          onClick={() => {/* TODO: Open new applicant form */}}
        >
          <Plus className="h-4 w-4" />
          Add Applicant
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold">{statusCounts.total}</p>
        </div>
        
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
        </div>
        
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-muted-foreground">Processing</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{statusCounts.processing}</p>
        </div>
        
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <div className="flex items-center space-x-2">
            <UserX className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-muted-foreground">Failed</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{statusCounts.failed}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search applicants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="">All Status</option>
          <option value="uploading">Uploading</option>
          <option value="processing">Processing</option>
          <option value="analyzing">Analyzing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Applicants List */}
      <div className="space-y-4">
        {applicants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No applicants yet</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first job applicant</p>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
              Add Your First Applicant
            </button>
          </div>
        ) : (
          applicants.map((applicant) => (
            <div key={applicant.id} className="bg-card text-card-foreground p-6 rounded-lg border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{applicant.name}</h3>
                  <p className="text-muted-foreground">{applicant.email}</p>
                  {(applicant.cv_data?.jobTitle || applicant.li_data?.headline) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Role: {applicant.cv_data?.jobTitle || applicant.li_data?.headline}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    applicant.status === 'completed' ? 'bg-green-100 text-green-800' :
                    applicant.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {applicant.status}
                  </span>
                  {applicant.score && (
                    <p className="text-lg font-bold mt-2">Score: {applicant.score}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Created: {applicant.created_at ? new Date(applicant.created_at).toLocaleDateString() : 'Unknown'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}