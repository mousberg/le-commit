'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Users, Settings, LayoutDashboard, Activity, Sliders } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const searchableItems = [
  { name: 'Dashboard', href: '/board/dashboard', icon: LayoutDashboard, description: 'Main dashboard view' },
  { name: 'New Applicant', href: '/board', icon: Users, description: 'Add a new applicant' },
  { name: 'Applicants', href: '/board/applicants', icon: Users, description: 'Manage your job applicants' },
  { name: 'Personalize', href: '/board/personalize', icon: Sliders, description: 'Configure detection rules' },
  { name: 'My Activity', href: '/board/activity', icon: Activity, description: 'View your recent activity' },
  { name: 'Settings', href: '/board/settings', icon: Settings, description: 'Account and preferences' },
];

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const filteredItems = searchQuery
    ? searchableItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchableItems;

  const handleSelect = useCallback((item: typeof searchableItems[0]) => {
    router.push(item.href);
    onClose();
    setSearchQuery('');
  }, [router, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isOpen) {
        e.preventDefault();
        // This would be handled by the parent component
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [onClose, isOpen, filteredItems, selectedIndex, handleSelect]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Search Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white  shadow-2xl border border-stone-200 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-stone-200">
          <Search className="h-5 w-5 text-stone-400 mr-3" />
          <input
            type="text"
            placeholder="Search pages, settings, and more..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-lg bg-transparent outline-none text-stone-900 placeholder-stone-400"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600  transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredItems.length > 0 ? (
            <div className="p-2">
              <div className="space-y-1">
                {filteredItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left p-3  transition-colors flex items-center gap-3 ${
                        index === selectedIndex
                          ? 'bg-stone-100 border border-stone-200'
                          : 'hover:bg-stone-50 border border-transparent'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-stone-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-stone-900">{item.name}</div>
                        <div className="text-sm text-stone-500 truncate">{item.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-stone-300 mx-auto mb-3" />
                <div className="font-medium text-stone-900 mb-1">No results found</div>
                <div className="text-sm text-stone-500">
                  Try searching for &quot;applicants&quot;, &quot;settings&quot;, or &quot;dashboard&quot;
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-stone-50 border-t border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <div className="flex items-center space-x-4">
              <span>↵ to select</span>
              <span>↑↓ to navigate</span>
            </div>
            <span>ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}