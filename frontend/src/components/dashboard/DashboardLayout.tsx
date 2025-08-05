'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  Activity, 
  Search, 
  Sliders,
  Menu,
  User,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Shield,
  Database,
  CreditCard,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSharedUserProfile } from '@/lib/contexts/UserProfileContext';
import { usePathname } from 'next/navigation';
import { useAshbyAccess } from '@/lib/ashby/config';
import SearchOverlay from './SearchOverlay';

// Base navigation items
const baseNavigation = [
  { name: 'Dashboard', href: '/board/dashboard', icon: LayoutDashboard },
  { name: 'Personalize', href: '/board/personalize', icon: Sliders },
  { name: 'Applicants', href: '/board/applicants', icon: Users },
  { name: 'My Activity', href: '/board/activity', icon: Activity },
  { name: 'Search', href: '/board/search', icon: Search },
  { 
    name: 'Settings', 
    href: '/board/settings', 
    icon: Settings,
    subItems: [
      { name: 'Personal Profile', href: '/board/settings', icon: User },
      { name: 'Security & access', href: '/board/settings?tab=security', icon: Shield },
      { name: 'Data & privacy', href: '/board/settings?tab=privacy', icon: Database },  
      { name: 'Billing', href: '/board/settings?tab=billing', icon: CreditCard }
    ]
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { displayName, displayInitial } = useSharedUserProfile();
  
  const { hasAccess: hasATSAccess } = useAshbyAccess();
  
  // Create navigation with conditional ATS item
  const navigation = useMemo(() => {
    const nav = [...baseNavigation];
    
    // Add ATS item if user has Ashby configuration
    if (hasATSAccess) {
      nav.splice(2, 0, { name: 'ATS', href: '/board/ats', icon: Building2 });
    }
    
    return nav;
  }, [hasATSAccess]);

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchOpen(true);
  };

  const isActive = (href: string) => {
    if (href === '/board/dashboard') {
      return pathname === '/board/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Check if settings is active for dropdown state
  const isSettingsActive = pathname.startsWith('/board/settings');
  
  // Keep settings expanded if it's active, regardless of sidebar state
  const shouldShowSettingsMenu = isSettingsActive || settingsExpanded;

  return (
    <div 
      data-is-root-theme="true" 
      data-accent-color="cyan" 
      data-gray-color="slate" 
      data-has-background="false" 
      data-panel-background="translucent" 
      data-radius="small" 
      data-scaling="100%" 
      style={{ minHeight: 0 }} 
      className="radix-themes light woswidgets-root"
    >
      <div className="relative isolate flex min-h-svh w-full max-lg:flex-col">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div 
          className={`fixed inset-y-0 left-0 z-50 w-56 transition-transform duration-300 overflow-y-auto lg:hidden border-[#dbdac9] bg-sidebar border-r shadow-inner ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="select-none flex h-full min-h-0 flex-col">
            {/* Logo/Brand area */}
            <div className="p-4 border-b border-[#dbdac9]/50 flex items-center">
              <div className="flex items-center">
                <Image 
                  src="/logo-um.svg" 
                  alt="Unmask Logo" 
                  width={120}
                  height={32}
                  className="h-8 w-auto"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-3 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const hasSubItems = 'subItems' in item && item.subItems;
                
                if (item.name === 'Search') {
                  return (
                    <span key={item.name} className="relative">
                      <button
                        onClick={handleSearchClick}
                        className="flex w-full items-center gap-2 px-2 py-1 mb-1 text-left text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-sidebar-active active:bg-sidebar-active transition-colors"
                      >
                        <Icon className="lucide lucide-search z-[500] stroke-[2.1px] h-3 w-3 shrink-0" />
                        <span className="z-[500] navbar_item whitespace-nowrap">{item.name}</span>
                      </button>
                    </span>
                  );
                }

                if (hasSubItems && item.name === 'Settings') {
                  return (
                    <div key={item.name} className={`${shouldShowSettingsMenu ? 'mb-1 bg-sidebar-active' : ''}`}>
                      <span className="relative">
                        {active && (
                          <div className="absolute inset-y-0 z-[10] h-8 w-full bg-sidebar-active"></div>
                        )}
                        <button
                          onClick={() => setSettingsExpanded(!settingsExpanded)}
                          className={`flex w-full items-center gap-2 px-2 py-1 mb-1 text-left text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-sidebar-active active:bg-sidebar-active transition-colors ${
                            active ? 'text-stone-900 bg-sidebar-active' : ''
                          }`}
                        >
                          <Icon className={`lucide z-[500] stroke-[2.1px] h-3 w-3 shrink-0 ${
                            active ? 'stroke-stone-900' : 'stroke-stone-500'
                          }`} />
                          <span className="z-[500] navbar_item whitespace-nowrap flex-1">{item.name}</span>
                          <ChevronDown className={`h-3 w-3 stroke-[2.1px] transition-transform ${shouldShowSettingsMenu ? 'rotate-180' : ''}`} />
                        </button>
                      </span>
                      
                      {/* Settings submenu */}
                      {shouldShowSettingsMenu && (
                        <div className="px-1 mt-1">
                          {item.subItems.map((subItem) => {
                            const subActive = pathname === subItem.href;
                            const SubIcon = subItem.icon;
                            return (
                              <span key={subItem.href} className="relative">
                                {subActive && (
                                  <div className="absolute inset-y-0 z-[10] h-8 w-full bg-sidebar-active"></div>
                                )}
                                <Link
                                  href={subItem.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`flex w-full items-center gap-2 pl-6 pr-2 py-1 mb-1 text-left text-sm font-medium transition-colors ${
                                    subActive ? 'text-stone-900 bg-sidebar-active' : 'text-stone-500 hover:text-stone-900 hover:bg-sidebar-active active:bg-sidebar-active'
                                  }`}
                                >
                                  <SubIcon className={`z-[500] stroke-[2.1px] h-3 w-3 ${
                                    subActive ? 'text-stone-900' : 'text-stone-500'
                                  }`} />
                                  <span className="z-[500] navbar_item whitespace-nowrap text-sm">{subItem.name}</span>
                                </Link>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <span key={item.name} className="relative">
                    {active && (
                      <div className="absolute inset-y-0 z-[10] h-8 w-full bg-sidebar-active"></div>
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex w-full items-center gap-2 px-2 py-1 mb-1 text-left text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-sidebar-active active:bg-sidebar-active transition-colors ${
                        active ? 'text-stone-900 bg-sidebar-active' : ''
                      }`}
                    >
                      <Icon className={`lucide z-[500] stroke-[2.1px] h-3 w-3 shrink-0 ${
                        active ? 'stroke-stone-900' : 'stroke-stone-500'
                      }`} />
                      <span className="z-[500] navbar_item whitespace-nowrap">{item.name}</span>
                    </Link>
                  </span>
                );
              })}
            </div>

            {/* User profile section */}
            <div className="mt-auto space-y-4">
              <div className="h-px bg-[#d9d9d9]"></div>
              
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="w-8 h-8 bg-[#f2f2f2] border border-[#8d8d8d] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#282828] text-sm font-medium">
                      {displayInitial}
                    </span>
                  </div>
                  <div className="ml-3 overflow-hidden">
                    <span className="block text-sm text-[#282828] truncate font-medium">
                      {displayName}
                    </span>
                    {user?.email && (
                      <span className="block text-xs text-[#6b7280] truncate">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={signOut}
                  className="flex-shrink-0 h-8 w-8 p-0 text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar */}
        <div 
          data-expanded={!sidebarCollapsed}
          className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 overflow-y-auto max-lg:hidden border-[#dbdac9] bg-sidebar border-r shadow-inner ${
            sidebarCollapsed ? 'w-16' : 'w-56'
          } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <nav className="select-none flex h-full min-h-0 flex-col">
            {/* Logo/Brand area with collapse button */}
            <div className="p-4 border-b border-[#dbdac9]/50 flex items-center justify-between relative">
              {!sidebarCollapsed ? (
                <div className="flex items-center">
                  <Image 
                    src="/logo-um.svg" 
                    alt="Unmask Logo" 
                    width={120}
                    height={32}
                    className="h-8 w-auto"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="flex items-center justify-center w-full p-1 text-stone-600 hover:text-stone-900 transition-colors"
                  title="Expand sidebar"
                >
                  <Image 
                    src="/logo-um.svg" 
                    alt="Unmask Logo" 
                    width={120}
                    height={32}
                    className="h-8 w-auto"
                  />
                </button>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`hidden lg:block p-1 text-stone-600 hover:text-stone-900 transition-colors ${
                  sidebarCollapsed ? 'absolute top-2 right-2 opacity-30 hover:opacity-60' : ''
                }`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronLeft className={`h-3 w-3 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-3 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const hasSubItems = 'subItems' in item && item.subItems;
                
                if (item.name === 'Search') {
                  return (
                    <span key={item.name} className="relative">
                      <button
                        onClick={handleSearchClick}
                        className={`flex w-full items-center py-1 mb-1 text-left text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-sidebar-active active:bg-sidebar-active transition-colors ${
                          sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-2'
                        }`}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <Icon className="lucide lucide-search z-[500] stroke-[2.1px] h-3 w-3 shrink-0" />
                        {!sidebarCollapsed && (
                          <span className="z-[500] navbar_item whitespace-nowrap">{item.name}</span>
                        )}
                      </button>
                    </span>
                  );
                }

                if (hasSubItems && item.name === 'Settings') {
                  return (
                    <div key={item.name} className={`${shouldShowSettingsMenu ? 'mb-1 bg-sidebar-active' : ''}`}>
                      <span className="relative">
                        {active && (
                          <div className="absolute inset-y-0 z-[10] h-8 w-full bg-sidebar-active"></div>
                        )}
                        <button
                          onClick={() => {
                            if (sidebarCollapsed) {
                              setSidebarCollapsed(false);
                            }
                            setSettingsExpanded(!settingsExpanded);
                          }}
                          data-current={active}
                          className={`flex w-full items-center py-1 mb-1 text-left text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-sidebar-active active:bg-sidebar-active transition-colors ${
                            active ? 'text-stone-900 bg-sidebar-active' : ''
                          } ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-2'}`}
                          title={sidebarCollapsed ? item.name : undefined}
                        >
                          <Icon className={`lucide z-[500] stroke-[2.1px] h-3 w-3 shrink-0 ${
                            active ? 'stroke-stone-900' : 'stroke-stone-500'
                          }`} />
                          {!sidebarCollapsed && (
                            <>
                              <span className="z-[500] navbar_item whitespace-nowrap flex-1">{item.name}</span>
                              <ChevronDown className={`h-3 w-3 stroke-[2.1px] transition-transform ${shouldShowSettingsMenu ? 'rotate-180' : ''}`} />
                            </>
                          )}
                        </button>
                      </span>
                      
                      {/* Settings submenu - show when expanded OR when settings is active */}
                      {shouldShowSettingsMenu && (
                        <div className={`${sidebarCollapsed ? 'px-0' : 'px-1'} mt-1`}>
                          {item.subItems.map((subItem) => {
                            const subActive = pathname === subItem.href;
                            const SubIcon = subItem.icon;
                            return (
                              <span key={subItem.href} className="relative">
                                {subActive && (
                                  <div className="absolute inset-y-0 z-[10] h-8 w-full  bg-sidebar-active"></div>
                                )}
                                <Link
                                  href={subItem.href}
                                  className={`flex w-full items-center py-1 mb-1 text-left text-sm font-medium transition-colors ${
                                    sidebarCollapsed ? 'justify-center px-0' : 'gap-2 pl-6 pr-2'
                                  } ${
                                    subActive ? 'text-stone-900 bg-sidebar-active' : 'text-stone-500 hover:text-stone-900 hover:bg-sidebar-active active:bg-sidebar-active'
                                  }`}
                                  title={sidebarCollapsed ? subItem.name : undefined}
                                >
                                  <SubIcon className={`z-[500] stroke-[2.1px] h-3 w-3 ${
                                    subActive ? 'text-stone-900' : 'text-stone-500'
                                  }`} />
                                  {!sidebarCollapsed && (
                                    <span className="z-[500] navbar_item whitespace-nowrap text-sm">{subItem.name}</span>
                                  )}
                                </Link>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <span key={item.name} className="relative">
                    {active && (
                      <div className="absolute inset-y-0 z-[10] h-8 w-full  bg-sidebar-active"></div>
                    )}
                    <Link
                      href={item.href}
                      data-current={active}
                      className={`flex w-full items-center py-1 mb-1 text-left text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-sidebar-active active:bg-sidebar-active transition-colors ${
                        active ? 'text-stone-900 bg-sidebar-active' : ''
                      } ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-2'}`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className={`lucide z-[500] stroke-[2.1px] h-3 w-3 shrink-0 ${
                        active ? 'stroke-stone-900' : 'stroke-stone-500'
                      }`} />
                      {!sidebarCollapsed && (
                        <span className="z-[500] navbar_item whitespace-nowrap">{item.name}</span>
                      )}
                    </Link>
                  </span>
                );
              })}
            </div>

            {/* User profile section */}
            <div className="mt-auto space-y-4">
              <div className="h-px bg-[#d9d9d9]"></div>
              
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="w-8 h-8 bg-[#f2f2f2] border border-[#8d8d8d] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#282828] text-sm font-medium">
                      {displayInitial}
                    </span>
                  </div>
                  {!sidebarCollapsed && (
                    <div className="ml-3 overflow-hidden">
                      <span className="block text-sm text-[#282828] truncate font-medium">
                        {displayName}
                      </span>
                      {user?.email && (
                        <span className="block text-xs text-[#6b7280] truncate">
                          {user.email}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!sidebarCollapsed && (
                  <button
                    onClick={signOut}
                    className="flex-shrink-0 h-8 w-8 p-0 text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* Mobile/Desktop content wrapper */}
        <div className="flex flex-1 flex-col w-full">
          {/* Mobile header */}
          <header className="flex items-center px-4 lg:hidden">
            <div className="py-2.5">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-stone-600 hover:text-stone-900 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <nav className="select-none flex flex-1 items-center gap-4 py-2.5">
                <div aria-hidden="true" className="-ml-4 flex-1"></div>
                <h1 className="text-lg font-semibold text-stone-900">Unmask</h1>
              </nav>
            </div>
          </header>

          {/* Main content */}
          <main className={`flex flex-1 flex-col lg:min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56'
          }`}>
            <div className="w-full h-full">
              {children}
            </div>
          </main>
        </div>

        {/* Search Overlay */}
        <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </div>
  );
}