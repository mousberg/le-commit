'use client';

import { useState, Suspense } from 'react';
import BoardSidebar from './BoardSidebar';

interface BoardClientLayoutProps {
  children: React.ReactNode;
}

export default function BoardClientLayout({ children }: BoardClientLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      <Suspense fallback={<div className="w-[220px] bg-white border-r border-gray-200"></div>}>
        <BoardSidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={setIsSidebarCollapsed} 
        />
      </Suspense>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}