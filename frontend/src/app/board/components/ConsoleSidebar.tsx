'use client';

import { Trash2, LayoutDashboard, Users, Settings, CreditCard, Cog, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { useApplicants } from '../../../lib/contexts/ApplicantContext';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface ConsoleSidebarProps {
  selectedId: string;
  onSelectApplicant: (id: string) => void;
  onSelectNew: () => void;
  onDeleteApplicant: (id: string, name: string, event: React.MouseEvent) => void;
}

export default function ConsoleSidebar({
  selectedId,
  onSelectApplicant,
  onSelectNew,
  onDeleteApplicant
}: ConsoleSidebarProps) {
  const { applicants } = useApplicants();
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/board',
      icon: LayoutDashboard,
      active: pathname === '/board',
      comingSoon: false
    },
    {
      name: 'Applicants',
      href: '/board/applicants', 
      icon: Users,
      active: pathname.startsWith('/board/applicants') || pathname.includes('?id='),
      comingSoon: false
    },
    {
      name: 'Settings',
      href: '/board/settings',
      icon: Settings,
      active: pathname.startsWith('/board/settings'),
      comingSoon: true
    },
    {
      name: 'Billing',
      href: '/board/billing',
      icon: CreditCard,
      active: pathname.startsWith('/board/billing'),
      comingSoon: true
    },
    {
      name: 'System',
      href: '/board/system',
      icon: Cog,
      active: pathname.startsWith('/board/system'),
      comingSoon: true
    }
  ];

  return (
    <aside className="w-72 bg-white/80 backdrop-blur-md border-r border-zinc-200/50 flex flex-col relative z-10">
      {/* Logo Header */}
      <div className="p-6 border-b border-zinc-200/50">
        <Link href="/" className="flex items-center">
          <Image 
            src="/Logo-full.svg" 
            alt="Unmask" 
            width={150}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
      </div>
      
      {/* Main Navigation */}
      <div className="p-4">
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;
            
            return (
              <div key={item.name} className="relative">
                <Link
                  href={item.comingSoon ? '#' : item.href}
                  className={`
                    flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 group
                    ${isActive && !item.comingSoon
                      ? 'bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-sm'
                      : item.comingSoon
                        ? 'bg-white/30 text-zinc-400 border border-transparent cursor-not-allowed'
                        : 'bg-white/50 hover:bg-white/70 text-zinc-800 border border-transparent hover:border-zinc-200/50 hover:shadow-sm'
                    }
                  `}
                  onClick={(e) => item.comingSoon && e.preventDefault()}
                >
                  <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {item.comingSoon && (
                    <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full ml-2">
                      Soon
                    </span>
                  )}
                  {isActive && !item.comingSoon && (
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Applicants Section - Only show when on applicants route */}
      {(pathname.startsWith('/board/applicants') || pathname.includes('?id=')) && (
        <div className="flex-1 px-4">
          <div className="border-t border-zinc-200/50 pt-4">
            <h3 className="text-sm font-semibold mb-3 text-zinc-700 px-4">Recent Applicants</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {applicants.slice(0, 5).map(applicant => (
                <div key={applicant.id} className="group relative">
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedId === applicant.id
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-800'
                    }`}
                    onClick={() => onSelectApplicant(applicant.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1 truncate">{applicant.name}</span>
                      <div className="flex items-center gap-1">
                        {applicant.status === 'processing' && (
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        )}
                        {applicant.status === 'completed' && (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                        {applicant.status === 'failed' && (
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => onDeleteApplicant(applicant.id, applicant.name, e)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 hover:bg-red-100/70 rounded text-red-500 hover:text-red-600"
                    title={`Delete ${applicant.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Add New Button */}
            <div className="mt-4 pt-3 border-t border-zinc-200/50">
              <Button
                onClick={onSelectNew}
                size="sm"
                className="w-full rounded-lg bg-black text-white font-medium shadow hover:bg-zinc-800 transition-all duration-200"
              >
                + Add New Applicant
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className="p-4 border-t border-zinc-200/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-zinc-700">U</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-900">User</p>
            <p className="text-xs text-zinc-500">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}