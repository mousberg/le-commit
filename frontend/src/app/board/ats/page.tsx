'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedUserProfile } from '@/lib/contexts/UserProfileContext';
import { isAuthorizedForATS } from '@/lib/auth/ats-access';
import { Building2, Users, Briefcase, Calendar, TrendingUp, Clock } from 'lucide-react';

export default function ATSPage() {
  const router = useRouter();
  const { authUser, loading } = useSharedUserProfile();
  
  useEffect(() => {
    if (!loading && !isAuthorizedForATS(authUser?.email)) {
      router.push('/board/dashboard');
    }
  }, [authUser?.email, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-wallpaper flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthorizedForATS(authUser?.email)) {
    return null;
  }

  return (
    <div className="select-none flex flex-col min-h-screen">
      {/* Header Section */}
      <nav className="relative">
        <div className="mx-[3.5rem] mt-[4rem] mb-[2rem]">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-6 w-6 text-stone-500" />
            <h1 className="text-base text-stone-500 font-normal">Applicant Tracking System</h1>
          </div>
          <h1 className="text-stone-800 font-medium text-[2.5rem] leading-tight">ATS Dashboard</h1>
          <p className="text-stone-600 mt-2">Manage your recruitment pipeline and track candidates across all stages.</p>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-grow bg-wallpaper py-[3rem] px-[3rem]">
        <div className="max-w-screen-xl">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Active Jobs */}
            <section className="border border-stone-300">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  <h3 className="text-sm font-medium text-stone-600">Active Jobs</h3>
                </div>
                <p className="text-3xl font-semibold text-stone-900">12</p>
                <p className="text-xs text-stone-500 mt-1">3 new this week</p>
              </div>
            </section>

            {/* Total Candidates */}
            <section className="border border-stone-300">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-medium text-stone-600">Total Candidates</h3>
                </div>
                <p className="text-3xl font-semibold text-stone-900">248</p>
                <p className="text-xs text-stone-500 mt-1">+15% from last month</p>
              </div>
            </section>

            {/* Interviews Scheduled */}
            <section className="border border-stone-300">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <h3 className="text-sm font-medium text-stone-600">Interviews This Week</h3>
                </div>
                <p className="text-3xl font-semibold text-stone-900">18</p>
                <p className="text-xs text-stone-500 mt-1">6 today</p>
              </div>
            </section>

            {/* Time to Hire */}
            <section className="border border-stone-300">
              <div className="px-6 py-6">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <h3 className="text-sm font-medium text-stone-600">Avg. Time to Hire</h3>
                </div>
                <p className="text-3xl font-semibold text-stone-900">21</p>
                <p className="text-xs text-stone-500 mt-1">days (↓ 3 from last month)</p>
              </div>
            </section>
          </div>

          {/* Main Content */}
          <div className="border border-stone-300">
            <div className="px-6 py-6 border-b border-stone-300">
              <h2 className="text-lg font-medium tracking-tight">Recent Activity</h2>
              <p className="text-sm text-stone-600 mt-1">Latest updates from your recruitment pipeline</p>
            </div>
            
            <div className="px-6 py-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 bg-stone-100 mb-4">
                  <TrendingUp className="h-6 w-6 text-stone-400" />
                </div>
                <p className="text-stone-600 mb-2">ATS integration coming soon</p>
                <p className="text-sm text-stone-500">
                  Connect your Ashby account to sync candidates and job postings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}