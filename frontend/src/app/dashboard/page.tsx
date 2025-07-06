'use client';

import { Button } from "../../components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const handleReferenceCheck = () => {
    router.push('/reference');
  };

  return (
    <main className="flex flex-col items-center w-full min-h-screen pt-32 pb-12 px-4 bg-gradient-to-b from-white via-slate-50 to-white">
      <section className="w-full max-w-6xl mx-auto">
        {/* Header with candidate info and score */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            {/* Left side - Candidate name */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">John Doe</h1>
              <p className="text-lg text-gray-600">Senior Software Engineer</p>
            </div>
            
            {/* Right side - Social links and CV */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-4">
                <a href="#" className="text-blue-600 hover:text-blue-800 underline">LinkedIn Profile</a>
                <a href="#" className="text-gray-800 hover:text-gray-600 underline">GitHub Profile</a>
                <a href="#" className="text-emerald-600 hover:text-emerald-800 underline">Download CV</a>
              </div>
            </div>
            
            {/* Overall score */}
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-600 mb-1">85%</div>
              <div className="text-sm text-gray-500">Trust Score</div>
            </div>
          </div>
        </div>

        {/* Two columns: Potential and Questions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Potential column */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Potential</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                <span className="font-medium text-gray-800">Technical Skills</span>
                <span className="text-emerald-600 font-semibold">High</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <span className="font-medium text-gray-800">Communication</span>
                <span className="text-blue-600 font-semibold">Medium</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                <span className="font-medium text-gray-800">Leadership</span>
                <span className="text-yellow-600 font-semibold">Medium</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <span className="font-medium text-gray-800">Cultural Fit</span>
                <span className="text-purple-600 font-semibold">High</span>
              </div>
            </div>
          </div>

          {/* Questions column */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Questions to Ask</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-gray-800 font-medium mb-2">Technical Experience</p>
                <p className="text-gray-600 text-sm">&quot;Can you walk me through your experience with React and Node.js?&quot;</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-gray-800 font-medium mb-2">Team Collaboration</p>
                <p className="text-gray-600 text-sm">&quot;How do you handle conflicts in a development team?&quot;</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-gray-800 font-medium mb-2">Problem Solving</p>
                <p className="text-gray-600 text-sm">&quot;Describe a challenging bug you recently solved.&quot;</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-gray-800 font-medium mb-2">Career Goals</p>
                <p className="text-gray-600 text-sm">&quot;Where do you see yourself in 3 years?&quot;</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signal Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Signal Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <div className="text-2xl font-bold text-emerald-600 mb-2">✅</div>
              <h3 className="font-semibold text-gray-800 mb-1">Positive Signals</h3>
              <p className="text-sm text-gray-600">Strong GitHub activity, consistent work history</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-xl">
              <div className="text-2xl font-bold text-yellow-600 mb-2">⚠️</div>
              <h3 className="font-semibold text-gray-800 mb-1">Caution Areas</h3>
              <p className="text-sm text-gray-600">Limited leadership experience, short tenures</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 mb-2">❓</div>
              <h3 className="font-semibold text-gray-800 mb-1">Need Verification</h3>
              <p className="text-sm text-gray-600">Reference checks, technical assessment</p>
            </div>
          </div>
        </div>

        {/* Call to Action - Reference Check */}
        <div className="bg-gradient-to-r from-emerald-400 to-blue-400 rounded-2xl shadow-sm p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <h2 className="text-2xl font-bold text-white">Ready to proceed with reference check?</h2>
          </div>
          <p className="text-white/90 mb-6 text-lg">Get detailed insights from previous employers and colleagues</p>
          <Button onClick={handleReferenceCheck} size="lg" className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-3 text-xl font-semibold rounded-2xl">
            Start Reference Check
          </Button>
        </div>
      </section>
    </main>
  );
} 