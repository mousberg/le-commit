'use client';

import Image from "next/image";
import Link from "next/link";
import { Button } from "../components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-col items-center w-full pt-32 pb-12 px-4 bg-gradient-to-b from-white via-slate-50 to-white min-h-screen">
      {/* Hero Section */}
      <section className="w-full max-w-3xl text-center mb-24">
        <h1 className="text-5xl font-bold mb-6 text-gray-900">Trust your hiring process again.</h1>
        <p className="text-xl text-gray-700 mb-8">ShadowCheck helps you verify candidate skills with real-world coding tasks, so you can hire with confidence and speed.</p>
        <Link href="/app">
          <Button size="lg" className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-8 py-3 text-xl font-semibold">Try ShadowCheck</Button>
        </Link>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="w-full max-w-4xl mb-24">
        <h2 className="text-2xl font-semibold text-center mb-10 text-gray-900">How it works</h2>
        <div className="flex flex-col md:flex-row justify-center items-stretch gap-8">
          {/* Step 1: Upload candidate info */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="mb-4">
              <span className="inline-block bg-gradient-to-br from-emerald-400 to-blue-400 p-3 rounded-full">
                {/* Upload icon */}
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="16" width="16" height="4" rx="2" fill="#fff" fillOpacity=".2"/></svg>
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload candidate info</h3>
            <p className="text-base text-gray-600">Start by entering or uploading your candidate&apos;s details.</p>
          </div>
          {/* Step 2: Validate reference check */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="mb-4">
              <span className="inline-block bg-gradient-to-br from-emerald-400 to-blue-400 p-3 rounded-full">
                {/* Shield/Check icon */}
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M12 3l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V7l7-4z" fill="#fff" fillOpacity=".8"/><path d="M9.5 12.5l2 2 3-3" stroke="#16b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Validate reference check</h3>
            <p className="text-base text-gray-600">We contact references and verify the candidate&apos;s background for you.</p>
          </div>
          {/* Step 3: Get trust score */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center transition-transform hover:-translate-y-1 hover:shadow-md">
            <div className="mb-4">
              <span className="inline-block bg-gradient-to-br from-emerald-400 to-blue-400 p-3 rounded-full">
                {/* Gauge/Star icon */}
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" fillOpacity=".8"/><path d="M12 6v6l4 2" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 17.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z" stroke="#3b82f6" strokeWidth="2"/></svg>
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get trust score</h3>
            <p className="text-base text-gray-600">Receive an instant, easy-to-understand trust score for your candidate.</p>
          </div>
        </div>
      </section>

      {/* Live Demo/GIF Placeholder */}
      <section id="demo" className="w-full max-w-3xl mb-24 flex flex-col items-center">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900">Live Demo</h2>
        <div className="w-full h-64 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl flex items-center justify-center text-gray-400 text-xl font-medium border border-dashed border-emerald-200">
          [Demo GIF or interactive preview coming soon]
        </div>
      </section>

      {/* Testimonial/Use Case */}
      <section id="testimonials" className="w-full max-w-2xl mb-24 flex flex-col items-center">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900">What our users say</h2>
        <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center">
          <div className="mb-4">
            <Image src="/avatar.png" alt="User avatar" width={56} height={56} className="rounded-full" />
          </div>
          <blockquote className="text-lg text-gray-700 italic mb-2">&quot;ShadowCheck let us see real skills, not just resumes. We hired with confidence and saved hours on interviews.&quot;</blockquote>
          <span className="text-base text-gray-500">— Alex P., Tech Lead</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-3xl mx-auto text-center text-sm text-gray-400 pt-8 border-t border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 pb-2">
          <span>Contact: <a href="mailto:hello@shadowcheck.com" className="underline hover:text-emerald-500">hello@shadowcheck.com</a></span>
          <span>
            <a href="https://github.com/le-commit" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-500">GitHub</a>
          </span>
          <span>Built at Hackathon 2025</span>
        </div>
      </footer>
    </main>
  );
}