'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { LayoutDashboard, Users, Plus, ChevronDown, Settings, Check, Search, LogOut } from 'lucide-react';
import { useApplicants } from '../lib/contexts/ApplicantContext';
import { useAuth } from '../lib/contexts/AuthContext';
import { Button } from './ui/button';

const ANIMATION_DURATION = {
    SIDEBAR: 500,
    TEXT: 300,
    COLOR_TRANSITION: 200,
} as const;

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ariaLabel?: string;
}

interface BoardSidebarProps {
  isCollapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

const useAnimationStyles = (isCollapsed: boolean) => {
  const getTextContainerStyle = useCallback(
    (): React.CSSProperties => ({
      width: isCollapsed ? '0px' : '150px',
      overflow: 'hidden',
      transition: `width ${ANIMATION_DURATION.SIDEBAR}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    }),
    [isCollapsed]
  );

  const getUniformTextStyle = useCallback(
    (): React.CSSProperties => ({
      willChange: 'opacity',
      opacity: isCollapsed ? 0 : 1,
      transition: `opacity 300ms ease ${isCollapsed ? '0ms' : '200ms'}`,
      whiteSpace: 'nowrap' as const,
    }),
    [isCollapsed]
  );

  const sidebarContainerStyle: React.CSSProperties = useMemo(
    () => ({
      willChange: 'width',
      transition: `width ${ANIMATION_DURATION.SIDEBAR}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    }),
    []
  );

  return {
    getTextContainerStyle,
    getUniformTextStyle,
    sidebarContainerStyle,
  };
};

const BoardSidebarComponent = ({ isCollapsed, onToggle }: BoardSidebarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applicants } = useApplicants();
  const { user, signOut } = useAuth();
  const [applicantsDropdownOpen, setApplicantsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const selectedApplicantId = searchParams.get('id');

  const {
    getTextContainerStyle,
    getUniformTextStyle,
    sidebarContainerStyle,
  } = useAnimationStyles(isCollapsed);

  const navigation = useMemo<NavigationItem[]>(
    () => [
      {
        name: 'Dashboard',
        href: '/board/dashboard',
        icon: LayoutDashboard,
        ariaLabel: 'Dashboard overview',
      },
      {
        name: 'Personalize',
        href: '/board/personalize',
        icon: Settings,
        ariaLabel: 'Configure analysis settings',
      },
    ],
    []
  );

  const navigateToApplicant = useCallback((id: string) => {
    router.push(`/board?id=${id}`);
  }, [router]);

  const navigateToNew = useCallback(() => {
    router.push('/board');
  }, [router]);

  const filteredApplicants = useMemo(() => {
    if (!searchQuery.trim()) return applicants;
    return applicants.filter(applicant => 
      applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant.role && applicant.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (applicant.email && applicant.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [applicants, searchQuery]);

  // Auto-expand applicants dropdown when on board pages with applicants
  useEffect(() => {
    if (pathname.startsWith('/board') && pathname !== '/board/dashboard' && pathname !== '/board/personalize' && applicants.length > 0) {
      setApplicantsDropdownOpen(true);
    }
  }, [pathname, applicants.length]);

  const toggleSidebar = useCallback(() => {
    onToggle(!isCollapsed);
  }, [isCollapsed, onToggle]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, action?: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action?.();
    }
  }, []);

  const renderNavigationItem = useCallback(
    (item: NavigationItem) => {
      const isActive = pathname === item.href || (item.href === '/board' && pathname.startsWith('/board') && pathname !== '/board/dashboard');

      const baseClasses = `
        group flex items-center rounded-[8px] text-[14px] px-[12px] py-[10px] relative
        focus:outline-none transition-colors duration-${ANIMATION_DURATION.COLOR_TRANSITION} ease-out
      `;

      const getStateClasses = (isActive: boolean) =>
        isActive 
          ? 'bg-[#f2f2f2] text-[#282828]' 
          : 'text-[#282828] hover:text-[#282828] hover:bg-[#f7f7f7]';

      return (
        <li key={item.name}>
          <Link
            href={item.href}
            className={`${baseClasses} ${getStateClasses(isActive)}`}
            title={isCollapsed ? item.name : undefined}
            aria-label={item.ariaLabel || item.name}
            style={{ willChange: 'background-color, color' }}
          >
            <div className="shrink-0 flex items-center justify-center w-5 h-5">
              <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>

            <div className="ml-[12px] overflow-hidden" style={getTextContainerStyle()}>
              <span className="block text-left" style={getUniformTextStyle()}>
                {item.name}
              </span>
            </div>
          </Link>
        </li>
      );
    },
    [pathname, isCollapsed, getUniformTextStyle, getTextContainerStyle]
  );

  return (
    <aside
      className={`flex h-full flex-col bg-white border-r py-3 px-2 border-[#e5e5e5] relative ${
        isCollapsed ? 'w-[64px]' : 'w-[220px]'
      }`}
      style={sidebarContainerStyle}
      role="navigation"
      aria-label="board navigation"
    >
      <header className="group relative h-6 flex shrink-0 items-center justify-between mb-8">
        {isCollapsed ? (
          <div className="flex items-center">
            <Image 
              src="/unmask-logo.svg" 
              alt="Unmask" 
              width={24}
              height={24}
              className="mx-3 h-6 w-6"
            />
            <button
              onClick={toggleSidebar}
              onKeyDown={e => handleKeyDown(e, toggleSidebar)}
              className="absolute inset-0 flex items-center justify-center text-gray-500 hover:text-gray-800 rounded-md opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out focus:outline-none"
              aria-label="Open sidebar"
            >
              <ChevronDown className="h-4 w-4 transform rotate-90" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center">
              <Image 
                src="/unmask-logo.svg" 
                alt="Unmask" 
                width={24}
                height={24}
                className="mx-3 h-6 w-6"
              />
            </div>
            <button
              onClick={toggleSidebar}
              onKeyDown={e => handleKeyDown(e, toggleSidebar)}
              className="text-gray-500 hover:text-gray-800 p-1 rounded-[4px] hover:bg-[#f7f7f7] h-6 w-6 transition-colors focus:outline-none"
              aria-label="Close sidebar"
            >
              <ChevronDown className="h-4 w-4 transform -rotate-90" />
            </button>
          </>
        )}
      </header>

      <nav className="flex flex-1 flex-col" role="navigation" aria-label="Main menu">
        <ul role="list" className="flex flex-1 flex-col">
          <li>
            <ul role="list" className="space-y-1">
              {navigation.map(renderNavigationItem)}
            </ul>
          </li>

          {/* Search Bar */}
          {!isCollapsed && (
            <li className="mt-6">
              <div className={`relative transition-all duration-200 ${
                searchFocused 
                  ? 'bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-1' 
                  : 'bg-gray-50 border border-gray-200 rounded-lg'
              }`}>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                    searchFocused ? 'text-pink-500' : 'text-gray-400'
                  } transition-colors duration-200`} />
                  <input
                    type="text"
                    placeholder="Search applicants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className={`w-full pl-10 pr-8 py-2.5 text-sm rounded-lg border-0 focus:ring-0 focus:outline-none transition-all duration-200 ${
                      searchFocused 
                        ? 'bg-white shadow-sm text-gray-900 placeholder-gray-500' 
                        : 'bg-transparent text-gray-700 placeholder-gray-400'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <span className="sr-only">Clear search</span>
                      ×
                    </button>
                  )}
                </div>
              </div>
            </li>
          )}
          
          {/* Applicants Section */}
          <li className="mt-6">
            <div className="space-y-1">
              {/* Applicants Dropdown Header */}
              <button
                onClick={() => setApplicantsDropdownOpen(!applicantsDropdownOpen)}
                className={`
                  group flex items-center rounded-[8px] text-[14px] px-[12px] py-[10px] w-full
                  text-[#282828] hover:text-[#282828] hover:bg-[#f7f7f7]
                  focus:outline-none transition-colors duration-200 ease-out
                  ${pathname.startsWith('/board') && pathname !== '/board/dashboard' && pathname !== '/board/personalize' ? 'bg-[#f2f2f2]' : ''}
                `}
              >
                <div className="shrink-0 flex items-center justify-center w-5 h-5">
                  <Users className="h-[18px] w-[18px]" />
                </div>
                <div className="ml-[12px] overflow-hidden flex-1" style={getTextContainerStyle()}>
                  <span className="block text-left" style={getUniformTextStyle()}>
                    Applicants ({searchQuery ? filteredApplicants.length : applicants.length}{searchQuery ? `/${applicants.length}` : ''})
                  </span>
                </div>
                <div className="shrink-0" style={getTextContainerStyle()}>
                  <ChevronDown 
                    className={`h-4 w-4 transition-transform duration-200 ${applicantsDropdownOpen ? 'rotate-180' : ''}`}
                    style={getUniformTextStyle()}
                  />
                </div>
              </button>

              {/* Applicants Dropdown Content */}
              {applicantsDropdownOpen && !isCollapsed && (
                <div className="ml-6 space-y-1">
                  {/* Add New Applicant */}
                  <button
                    onClick={navigateToNew}
                    className={`
                      group flex items-center rounded-[8px] text-[13px] px-[12px] py-[8px] w-full
                      text-[#282828] hover:bg-[#f7f7f7] transition-colors duration-200
                      ${!selectedApplicantId ? 'bg-[#f2f2f2]' : ''}
                    `}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Add New Applicant</span>
                  </button>

                  {/* Applicant List */}
                  {filteredApplicants.map(applicant => (
                    <button
                      key={applicant.id}
                      onClick={() => navigateToApplicant(applicant.id)}
                      className={`
                        group flex items-center rounded-[8px] text-[13px] px-[12px] py-[8px] w-full
                        text-[#282828] hover:bg-[#f7f7f7] transition-colors duration-200
                        ${selectedApplicantId === applicant.id ? 'bg-[#f2f2f2]' : ''}
                      `}
                    >
                      <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center mr-2">
                        <span className="text-xs font-medium text-zinc-600">
                          {applicant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="flex-1 text-left truncate">{applicant.name}</span>
                      <div className="ml-2">
                        {applicant.status === 'completed' && (
                          <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-green-600" />
                          </div>
                        )}
                        {(applicant.status === 'processing' || applicant.status === 'analyzing' || applicant.status === 'uploading') && (
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        )}
                        {applicant.status === 'failed' && (
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}

                  {applicants.length === 0 && (
                    <div className="px-[12px] py-[8px] text-xs text-gray-500">
                      No applicants yet
                    </div>
                  )}
                  
                  {applicants.length > 0 && filteredApplicants.length === 0 && searchQuery && (
                    <div className="px-[12px] py-[8px] text-xs text-gray-500">
                      No applicants match &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        </ul>

        <div className="mt-auto space-y-4">
          <div className="h-px bg-[#d9d9d9]"></div>
          
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center min-w-0 flex-1">
              <div className="w-8 h-8 bg-[#f2f2f2] border border-[#8d8d8d] rounded-full flex items-center justify-center">
                <span className="text-[#282828] text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="ml-3 overflow-hidden" style={getTextContainerStyle()}>
                <span className="block text-sm text-[#282828] truncate" style={getUniformTextStyle()}>
                  {user?.email || 'User'}
                </span>
              </div>
            </div>
            
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="flex-shrink-0 h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
};

const BoardSidebar = memo(BoardSidebarComponent);
BoardSidebar.displayName = 'BoardSidebar';

export default BoardSidebar;