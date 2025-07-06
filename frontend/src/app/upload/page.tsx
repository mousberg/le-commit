'use client';

import { Button } from "../../components/ui/button";
import { useRef } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkedinInputRef = useRef<HTMLInputElement>(null);
  const githubInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = () => {
    // In a real app, you would handle form submission here
    // For now, just navigate to dashboard
    router.push('/dashboard');
  };

  return (
    <main className="flex flex-col items-center w-full min-h-screen pt-32 pb-12 px-4 bg-gradient-to-b from-white via-slate-50 to-white">
      <section className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-10 flex flex-col gap-10">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">Upload Candidate Information</h1>
        <div className="flex flex-col gap-8">
          {/* CV Upload */}
          <div className="flex flex-col items-center gap-3 bg-slate-50 rounded-xl p-6 shadow-xs">
            <label className="text-lg font-medium text-gray-800 mb-2">Upload CV</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>
          {/* LinkedIn Profile Upload */}
          <div className="flex flex-col items-center gap-3 bg-slate-50 rounded-xl p-6 shadow-xs">
            <label className="text-lg font-medium text-gray-800 mb-2">Upload LinkedIn Profile</label>
            <input
              ref={linkedinInputRef}
              type="file"
              accept=".pdf,.html,.txt"
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>
          {/* GitHub Profile Upload */}
          <div className="flex flex-col items-center gap-3 bg-slate-50 rounded-xl p-6 shadow-xs">
            <label className="text-lg font-medium text-gray-800 mb-2">Upload GitHub Profile</label>
            <input
              ref={githubInputRef}
              type="file"
              accept=".pdf,.html,.txt"
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>
        </div>
        <Button onClick={handleSubmit} size="lg" className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-8 py-3 text-xl font-semibold mt-6">Analyse Profile</Button>
      </section>
    </main>
  );
} 