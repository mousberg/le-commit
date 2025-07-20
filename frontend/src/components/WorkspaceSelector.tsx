'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Settings, Users, Building } from 'lucide-react';
import { useWorkspace } from '../lib/contexts/WorkspaceContext';
import { Workspace } from '../lib/interfaces/database';
import { useRouter } from 'next/navigation';

interface WorkspaceSelectorProps {
  isCollapsed: boolean;
  getTextContainerStyle: () => React.CSSProperties;
  getUniformTextStyle: () => React.CSSProperties;
}

export default function WorkspaceSelector({
  isCollapsed,
  getTextContainerStyle,
  getUniformTextStyle
}: WorkspaceSelectorProps) {
  const {
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    canCurrentUserModifyWorkspace
  } = useWorkspace();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleWorkspaceChange = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setIsDropdownOpen(false);
  };

  const handleCreateWorkspace = () => {
    router.push('/board/setup-workspace');
    setIsDropdownOpen(false);
  };

  const handleWorkspaceSettings = () => {
    if (currentWorkspace) {
      router.push(`/board/workspace-settings?id=${currentWorkspace.id}`);
      setIsDropdownOpen(false);
    }
  };

  const handleManageMembers = () => {
    if (currentWorkspace) {
      router.push(`/board/workspace-members?id=${currentWorkspace.id}`);
      setIsDropdownOpen(false);
    }
  };

  if (!currentWorkspace) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`
          w-full flex items-center justify-between px-3 py-2 rounded-lg
          ${isDropdownOpen ? 'bg-gray-100' : 'hover:bg-gray-50'}
          transition-colors duration-200
        `}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200 rounded-md flex items-center justify-center flex-shrink-0">
            <Building className="h-4 w-4 text-purple-700" />
          </div>

          <div className="ml-3 overflow-hidden" style={getTextContainerStyle()}>
            <p className="text-sm font-medium text-gray-900 truncate" style={getUniformTextStyle()}>
              {currentWorkspace.name}
            </p>
            <p className="text-xs text-gray-500 truncate" style={getUniformTextStyle()}>
              {currentWorkspace.role || 'Member'}
            </p>
          </div>
        </div>

        {!isCollapsed && (
          <ChevronDown
            className={`ml-2 h-4 w-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isDropdownOpen && !isCollapsed && (
        <div className="absolute left-0 z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1">
          <div className="max-h-60 overflow-auto">
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-gray-500">WORKSPACES</p>
            </div>

            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleWorkspaceChange(workspace)}
                className={`
                  w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-gray-50
                  ${workspace.id === currentWorkspace.id ? 'bg-gray-50' : ''}
                `}
              >
                <div className="w-6 h-6 bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-purple-700">
                    {workspace.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {workspace.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {workspace.role || 'Member'}
                  </p>
                </div>
              </button>
            ))}

            <div className="border-t border-gray-100 my-1"></div>

            <button
              onClick={handleCreateWorkspace}
              className="w-full text-left px-3 py-2 flex items-center text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus className="mr-2 h-4 w-4 text-gray-500" />
              Create New Workspace
            </button>

            {canCurrentUserModifyWorkspace && (
              <>
                <button
                  onClick={handleManageMembers}
                  className="w-full text-left px-3 py-2 flex items-center text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Users className="mr-2 h-4 w-4 text-gray-500" />
                  Manage Members
                </button>

                <button
                  onClick={handleWorkspaceSettings}
                  className="w-full text-left px-3 py-2 flex items-center text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="mr-2 h-4 w-4 text-gray-500" />
                  Workspace Settings
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
