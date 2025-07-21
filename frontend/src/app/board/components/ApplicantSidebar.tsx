'use client';

import { Trash2, Check, Briefcase, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useApplicants } from '../../../lib/contexts/ApplicantContext';
import { useState } from 'react';

interface ApplicantSidebarProps {
  selectedId: string;
  onSelectApplicant: (id: string) => void;
  onSelectNew: () => void;
  onDeleteApplicant: (id: string, name: string, event: React.MouseEvent) => void;
}

export default function ApplicantSidebar({
  selectedId,
  onSelectApplicant,
  onSelectNew,
  onDeleteApplicant
}: ApplicantSidebarProps) {
  const { applicants, fetchApplicants, isLoading: applicantsLoading } = useApplicants();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = applicantsLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchApplicants();
    setIsRefreshing(false);
  };

  return (
    <aside className="w-72 bg-white border-r border-zinc-200 flex flex-col py-6 px-4 gap-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-medium text-zinc-900">Applicants</div>
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors disabled:opacity-50"
            title="Refresh applicants"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {!currentWorkspace ? (
          <div className="text-center py-6 px-2 border border-dashed border-zinc-300 rounded-lg">
            <Briefcase className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Select a workspace to view applicants</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin"></div>
          </div>
        ) : applicants.length === 0 ? (
          <div className="text-center py-6 px-2 border border-dashed border-zinc-300 rounded-lg">
            <p className="text-sm text-zinc-500">No applicants in this workspace</p>
            <Button
              onClick={onSelectNew}
              variant="outline"
              size="sm"
              className="mt-2 text-xs"
            >
              Add First Applicant
            </Button>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {applicants.map(applicant => (
              <li key={applicant.id} className="group relative">
                <button
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors border ${
                    selectedId === applicant.id
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900'
                      : 'hover:bg-zinc-50 text-zinc-700 border-transparent hover:border-zinc-200'
                  }`}
                  onClick={() => onSelectApplicant(applicant.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-zinc-600">
                          {applicant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{applicant.name}</div>
                        {applicant.role && (
                          <div className="text-xs text-zinc-500 truncate">{applicant.role}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {applicant.status === 'completed' && (
                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                      )}
                      {applicant.status === 'processing' && (
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      )}
                      {applicant.status === 'analyzing' && (
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      )}
                      {applicant.status === 'uploading' && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      )}
                      {applicant.status === 'failed' && (
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => onDeleteApplicant(applicant.id, applicant.name, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-700 z-10"
                  title={`Delete ${applicant.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {currentWorkspace && (
        <Button
          onClick={onSelectNew}
          disabled={isLoading}
          className="w-full rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 transition-colors disabled:opacity-50"
        >
          + Add New Applicant
        </Button>
      )}
    </aside>
  );
}
