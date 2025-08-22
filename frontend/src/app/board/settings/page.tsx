'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSharedUserProfile } from '@/lib/contexts/UserProfileContext';

const tabs = [
  { id: 'profile', name: 'Personal profile', href: '/board/settings' },
  { id: 'security', name: 'Security & access', href: '/board/settings?tab=security' },
  { id: 'privacy', name: 'Data & privacy', href: '/board/settings?tab=privacy' },
  { id: 'billing', name: 'Billing', href: '/board/settings?tab=billing' },
];

function SettingsContent() {
  const { user, signOut } = useAuth();
  const { loading, updateProfile, displayName, displayInitial } = useSharedUserProfile();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'profile';
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: user?.email || '',
  });
  const [saving, setSaving] = useState(false);

  // Update form data when profile loads
  useEffect(() => {
    setFormData({
      displayName: displayName,
      email: user?.email || '',
    });
  }, [displayName, user?.email]);

  const setActiveTab = (href: string) => {
    window.history.pushState({}, '', href);
  };

  // Save display name changes
  const handleSaveDisplayName = async () => {
    if (!formData.displayName.trim() || saving) return;
    
    try {
      setSaving(true);
      await updateProfile({
        full_name: formData.displayName.trim()
      });
    } catch (error) {
      console.error('Failed to save display name:', error);
      alert('Failed to save display name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'profile':
        if (loading) {
          return (
            <div className="flex-grow bg-wallpaper py-[2rem] px-[3rem]">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-2"></div>
                  <p className="text-stone-600">Loading profile...</p>
                </div>
              </div>
            </div>
          );
        }
        
        return (
          <div className="flex-grow bg-wallpaper py-[2rem] px-[3rem]">
            <div className="grid gap-y-9 max-w-screen-md">
              {/* Avatar Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex items-center">
                  <div className="flex flex-col gap-y-1 px-6 py-6 flex-1">
                    <h2 className="text-lg font-medium tracking-tight">Avatar</h2>
                    <p className="text-sm text-stone-600">
                      This is your avatar. Click on the avatar to upload a custom one from your files.
                    </p>
                  </div>
                  <div className="flex items-center justify-center px-6 py-6 h-full">
                    <div className="h-16 w-16 bg-stone-200 flex items-center justify-center cursor-pointer hover:bg-stone-300 transition-colors">
                      <div className="h-14 w-14 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-lg font-medium">
                        {displayInitial}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-6 py-5">
                  <p className="text-xs text-stone-500">
                    An avatar is optional but strongly recommended.
                  </p>
                </div>
              </section>

              {/* Display Name Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Display Name</h2>
                  <p className="text-sm text-stone-600">
                    Please enter your full name, or a display name you are comfortable with.
                  </p>
                  <div className="mt-4 -mb-1 text-sm">
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="border border-stone-300 text-left py-1.5 px-3 w-96 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 bg-white text-stone-900"
                      placeholder="David Gelberg"
                    />
                  </div>
                </div>
                <div className="flex flex-row text-center items-center justify-between gap-y-1 px-6 py-5">
                  <p className="text-xs text-stone-500">Please use 32 characters at maximum.</p>
                  <button 
                    onClick={handleSaveDisplayName}
                    disabled={saving || loading || !formData.displayName.trim()}
                    className={`border border-stone-300 py-1.5 px-3 text-sm transition-colors ${
                      saving || loading || !formData.displayName.trim()
                        ? 'text-stone-400 cursor-not-allowed bg-stone-50'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </section>

              {/* Connected Accounts Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Connected accounts</h2>
                  <p className="text-sm text-stone-600">
                    External services currently linked to your account for simplified sign-in.
                  </p>
                  <p className="text-sm text-stone-600 mt-4">
                    No external services currently linked to your account.
                  </p>
                </div>
              </section>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="flex-grow bg-wallpaper py-[2rem] px-[3rem]">
            <div className="grid gap-y-9 max-w-screen-md">
              {/* Password Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Password</h2>
                  <p className="text-sm text-stone-600">
                    Manage your account password and security settings.
                  </p>
                </div>
                <div className="flex flex-row justify-end gap-y-1 px-6 py-5">
                  <button className="border border-stone-300 py-1.5 px-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                    Change Password
                  </button>
                </div>
              </section>

              {/* Sign Out Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Sign out</h2>
                  <p className="text-sm text-stone-600">
                    Sign out of your account on this device.
                  </p>
                </div>
                <div className="flex flex-row justify-end gap-y-1 px-6 py-5">
                  <button 
                    onClick={signOut}
                    className="border border-red-500 bg-red-600 py-1.5 px-3 text-sm text-white hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </section>
            </div>
          </div>
        );
      
      case 'privacy':
        return (
          <div className="flex-grow bg-wallpaper py-[2rem] px-[3rem]">
            <div className="grid gap-y-9 max-w-screen-md">
              {/* Data Usage Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Data Usage</h2>
                  <p className="text-sm text-stone-600">
                    Manage how your data is used and stored.
                  </p>
                  <p className="text-sm text-stone-600 mt-4">
                    Privacy controls are coming soon.
                  </p>
                </div>
              </section>

              {/* Data Export Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Data Export</h2>
                  <p className="text-sm text-stone-600">
                    Download a copy of your data.
                  </p>
                </div>
                <div className="flex flex-row justify-end gap-y-1 px-6 py-5">
                  <button className="border border-stone-300 py-1.5 px-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                    Request Data Export
                  </button>
                </div>
              </section>
            </div>
          </div>
        );
      
      case 'billing':
        return (
          <div className="flex-grow bg-wallpaper py-[2rem] px-[3rem]">
            <div className="grid gap-y-9 max-w-screen-md">
              {/* Subscription Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Subscription</h2>
                  <p className="text-sm text-stone-600">
                    Manage your subscription and billing information.
                  </p>
                  <p className="text-sm text-stone-600 mt-4">
                    You are currently on the free plan.
                  </p>
                </div>
              </section>

              {/* Payment Method Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Payment Method</h2>
                  <p className="text-sm text-stone-600">
                    Add or update your payment method.
                  </p>
                </div>
                <div className="flex flex-row justify-end gap-y-1 px-6 py-5">
                  <button className="border border-stone-300 py-1.5 px-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                    Add Payment Method
                  </button>
                </div>
              </section>

              {/* Billing History Section */}
              <section className="border border-stone-300 divide-y divide-stone-300">
                <div className="flex flex-col gap-y-1 px-6 py-6">
                  <h2 className="text-lg font-medium tracking-tight">Billing History</h2>
                  <p className="text-sm text-stone-600">
                    No billing history available.
                  </p>
                </div>
              </section>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="select-none flex flex-col min-h-screen">
      {/* Header Section */}
      <nav className="relative">
        <div className="mx-[3.5rem] mt-[4rem] mb-[2rem]">
          <h1 className="mb-4 text-base text-stone-500 font-normal">Settings</h1>
          <h1 className="text-stone-800 font-medium text-[2.5rem] leading-tight">Personal settings</h1>
        </div>
      </nav>

      {/* Tab Navigation - Sticky */}
      <div className="w-full px-7 border-b border-stone-200 sticky top-0 bg-white z-[500]">
        <nav className="flex">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            
            return (
              <div key={tab.id} className="flex flex-col items-center">
                <a
                  href={tab.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(tab.href);
                  }}
                  className={`px-6 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-stone-900'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {tab.name}
                </a>
                {isActive && <div className="w-3/4 h-0.5 bg-stone-800"></div>}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="select-none flex flex-col min-h-screen">
        <nav className="relative">
          <div className="mx-[3.5rem] mt-[4rem] mb-[2rem]">
            <h1 className="mb-4 text-base text-stone-500 font-normal">Settings</h1>
            <h1 className="text-stone-800 font-medium text-[2.5rem] leading-tight">Personal settings</h1>
          </div>
        </nav>
        <div className="mx-[3.5rem]">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}