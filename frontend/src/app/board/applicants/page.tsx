'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Users, Clock, Trash2, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApplicants } from '@/lib/contexts/ApplicantContext';

export default function ApplicantsPage() {
  const router = useRouter();
  const { applicants, fetchApplicants, deleteApplicant } = useApplicants();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load applicants on component mount
  useEffect(() => {
    async function loadApplicants() {
      try {
        setLoading(true);
        await fetchApplicants();
      } catch (error) {
        console.error('Failed to load applicants:', error);
      } finally {
        setLoading(false);
      }
    }

    loadApplicants();
  }, [fetchApplicants]);

  // Handle add new applicant
  const handleAddApplicant = () => {
    router.push('/board'); // Navigate to the main board page (new applicant form)
  };

  // Handle delete applicant
  const handleDeleteApplicant = async (id: string) => {
    if (deleting) return;
    
    try {
      setDeleting(id);
      await deleteApplicant(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete applicant:', error);
    } finally {
      setDeleting(null);
    }
  };

  // Filter applicants based on search and status
  const filteredApplicants = applicants.filter(applicant => {
    const matchesSearch = !searchTerm || 
      applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (applicant.email && applicant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((applicant.cv_data?.jobTitle && applicant.cv_data.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (applicant.li_data?.headline && applicant.li_data.headline.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = !statusFilter || applicant.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


  if (loading) {
    return (
      <div className="select-none flex flex-col min-h-screen">
        <nav className="relative">
          <div className="mx-[3.5rem] mt-[4rem] mb-[2rem]">
            <h1 className="mb-4 text-base text-stone-500 font-normal">Manage</h1>
            <h1 className="text-stone-800 font-medium text-[2.5rem] leading-tight">Applicants</h1>
          </div>
        </nav>
        <div className="flex-grow bg-wallpaper py-[3rem] px-[3rem]">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-stone-600" />
              <p className="text-stone-600">Loading your applicants...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="select-none flex flex-col min-h-screen">
      {/* Header */}
      <nav className="relative">
        <div className="mx-[3.5rem] mt-[4rem] mb-[2rem]">
          <h1 className="mb-4 text-base text-stone-500 font-normal">Manage</h1>
          <div className="flex justify-between items-start">
            <h1 className="text-stone-800 font-medium text-[2.5rem] leading-tight">Applicants</h1>
            <button 
              className="px-4 py-2 text-sm font-medium transition-all duration-200 bg-stone-800 text-white hover:bg-stone-700 cursor-pointer flex items-center gap-2"
              onClick={handleAddApplicant}
            >
              <Plus className="h-4 w-4" />
              Add Applicant
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-grow bg-wallpaper py-[3rem] px-[3rem]">
        <div className="bg-white border border-stone-300 divide-y divide-stone-300">
          {/* Search and Filters Section */}
          <section className="py-[3rem] px-[3rem]">
            <div className="mb-[2rem]">
              <h2 className="text-stone-800 font-medium text-lg mb-2">Search & Filter</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                Find specific applicants or filter by verification status.
              </p>
            </div>
            
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search applicants by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-transparent bg-white text-stone-900"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-4 pr-16 py-3 border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 bg-white text-stone-900 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Im0xIDEgNSA1IDUtNSIgc3Ryb2tlPSIjNjg2ODY4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat bg-[center_right_12px] min-w-[160px]"
              >
                <option value="">All Status</option>
                <option value="uploading">Uploading</option>
                <option value="processing">Processing</option>
                <option value="analyzing">Analyzing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </section>

          {/* Applicants List Section */}
          <section className="py-[3rem] px-[3rem]">
            <div className="mb-[2rem]">
              <h2 className="text-stone-800 font-medium text-lg mb-2">Applicants ({filteredApplicants.length})</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                {filteredApplicants.length === 0 && applicants.length > 0
                  ? "No applicants match your current search criteria."
                  : filteredApplicants.length === 0
                  ? "No applicants yet. Add your first applicant to get started."
                  : "View and manage your applicants. Click on an applicant to view details."}
              </p>
            </div>
            
            <div className="space-y-4">
              {filteredApplicants.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-stone-400" />
                  <h3 className="text-lg font-medium mb-2 text-stone-900">
                    {applicants.length === 0 ? "No applicants yet" : "No matching applicants"}
                  </h3>
                  <p className="text-stone-500 mb-6">
                    {applicants.length === 0 
                      ? "Start by adding your first job applicant to begin the verification process."
                      : "Try adjusting your search terms or filters to find applicants."}
                  </p>
                  {applicants.length === 0 && (
                    <button 
                      onClick={handleAddApplicant}
                      className="px-4 py-2 text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 transition-colors"
                    >
                      Add Your First Applicant
                    </button>
                  )}
                </div>
              ) : (
                filteredApplicants.map((applicant) => (
                  <div key={applicant.id} className="bg-white border border-stone-200 p-6 hover:border-stone-300 transition-colors group relative">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 cursor-pointer" onClick={() => router.push(`/board?id=${applicant.id}`)}>
                        <h3 className="text-lg font-medium text-stone-900 mb-1">{applicant.name}</h3>
                        <p className="text-stone-600 text-sm mb-1">{applicant.email}</p>
                        {(applicant.cv_data?.jobTitle || applicant.li_data?.headline) && (
                          <p className="text-xs text-stone-500">
                            Role: {applicant.cv_data?.jobTitle || applicant.li_data?.headline}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${
                            applicant.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                            applicant.status === 'failed' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {applicant.status}
                          </span>
                          {applicant.score && (
                            <p className="text-sm font-medium mt-2 text-stone-900">Score: {applicant.score}</p>
                          )}
                          <p className="text-xs text-stone-500 mt-1">
                            {applicant.created_at ? new Date(applicant.created_at).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(showDeleteConfirm === applicant.id ? null : applicant.id);
                            }}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete applicant"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {showDeleteConfirm === applicant.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 shadow-lg z-10 min-w-[200px]">
                              <div className="p-3">
                                <p className="text-sm text-stone-900 mb-3">Delete this applicant?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteApplicant(applicant.id);
                                    }}
                                    disabled={deleting === applicant.id}
                                    className="px-3 py-1 text-xs bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center gap-1"
                                  >
                                    {deleting === applicant.id ? (
                                      <Clock className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                    Delete
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteConfirm(null);
                                    }}
                                    className="px-3 py-1 text-xs border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Click outside to close delete confirmation */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  );
}