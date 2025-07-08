'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useApplicants } from '../../../lib/contexts/ApplicantContext';

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
  const { applicants } = useApplicants();

  return (
    <aside className="w-72 bg-white border-r border-gray-100 flex flex-col py-6 px-4 gap-4">
      <div className="mb-4">
        <div className="text-lg font-semibold mb-2">Applicants</div>
        <ul className="space-y-1">
          {applicants.map(applicant => (
            <li key={applicant.id} className="group relative">
              <button
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                  selectedId === applicant.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'hover:bg-slate-100 text-gray-800'
                }`}
                onClick={() => onSelectApplicant(applicant.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="flex-1">{applicant.name}</span>
                  <div className="flex items-center gap-2 pr-8">
                    {applicant.status === 'processing' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        Processing...
                      </span>
                    )}
                    {applicant.status === 'analyzing' && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        Analyzing...
                      </span>
                    )}
                    {applicant.status === 'uploading' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Uploading...
                      </span>
                    )}
                    {applicant.status === 'failed' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <button
                onClick={(e) => onDeleteApplicant(applicant.id, applicant.name, e)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-700 z-10"
                title={`Delete ${applicant.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Button
        onClick={onSelectNew}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold shadow-sm"
      >
        + Add New Applicant
      </Button>
    </aside>
  );
}
