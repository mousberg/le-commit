"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Target, Phone } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col items-center w-full pt-12 pb-12 px-4 bg-gradient-to-b from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="w-full max-w-6xl text-center">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-10 text-gray-900 leading-tight">Trust your hiring process, again.</h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-16 max-w-4xl mx-auto leading-relaxed">
          Instant checks across CVs, LinkedIn, GitHub, and calls to expose red flags and protect your hiring pipeline.
          </p>
        </div>
        {/* Only one CTA here now */}
        <div className="flex justify-center mb-20">
          <Link href="/board">
            <Button size="lg" className="rounded-2xl shadow-md bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-10 py-4 text-lg font-semibold transition-all hover:shadow-lg hover:scale-105">
              Start Unmask
            </Button>
          </Link>
        </div>
      </section>

      {/* How Unmask Works Section */}
      <section className="w-full max-w-5xl mb-5">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How Unmask Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center p-6 bg-white/80 rounded-2xl shadow border">
            <Shield className="w-10 h-10 text-emerald-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">User Info Check</h3>
            <p className="text-gray-600">
              Upload a CV, LinkedIn, and GitHub. Unmask flags timeline gaps, fake profiles, and missing signals.
            </p>
          </div>
          {/* Step 2 */}
          <div className="flex flex-col items-center text-center p-6 bg-white/80 rounded-2xl shadow border">
            <Phone className="w-10 h-10 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Reference Call Automation</h3>
            <p className="text-gray-600">
              Add past references — Unmask automates the call, transcribes responses, and checks them against the candidate&apos;s story.
            </p>
          </div>
          {/* Step 3 */}
          <div className="flex flex-col items-center text-center p-6 bg-white/80 rounded-2xl shadow border">
            <Zap className="w-10 h-10 text-yellow-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Live Interview Feedback</h3>
            <p className="text-gray-600">
              Get real-time prompts and live transcripts during calls. Unmask highlights inconsistencies and suggests questions on the spot.
            </p>
          </div>
          {/* Step 4 */}
          <div className="flex flex-col items-center text-center p-6 bg-white/80 rounded-2xl shadow border">
            <Target className="w-10 h-10 text-emerald-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Candidate Authenticity Score</h3>
            <p className="text-gray-600">
              See a full profile with flags, suggested follow-ups, and a credibility score — all in one clear dashboard.
            </p>
          </div>
        </div>
        {/* CTA after flow */}
        <div className="flex justify-center my-16">
          <Link href="/board">
            <Button size="lg" className="rounded-2xl shadow-md bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-10 py-4 text-lg font-semibold transition-all hover:shadow-lg hover:scale-105">
              Start Unmask
            </Button>
          </Link>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="w-full max-w-4xl mb-24 mx-auto px-4">
        <div className="flex flex-col items-center w-full bg-white/0 rounded-3xl p-0 mt-0">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 mt-0 text-center">Trust who you hire, without wasting time.</h2>
          <p className="text-lg text-gray-700 text-center max-w-2xl">
            Unmask delivers fast, automated screening across CVs, LinkedIn, GitHub, and references—surfacing inconsistencies in minutes, not days. It guides hiring managers with targeted questions, scores, and context, all in a plug-and-play experience that skips the HR vendor complexity.
          </p>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="w-full max-w-6xl mb-16 flex flex-col items-center">
        <h2 className="text-3xl font-semibold text-center mb-4 text-gray-900">What our users say</h2>
        <div className="w-full bg-white/0 rounded-3xl p-4 md:p-6 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Existing testimonial (updated) */}
            <div className="bg-white/0 rounded-2xl p-12 flex flex-col items-center w-full max-w-xs md:max-w-sm lg:max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  AP
                </div>
              </div>
              <blockquote className="text-xl text-gray-700 italic mb-4 text-center">
                &ldquo;We caught a duplicate applicant before the first call. That would&apos;ve cost us weeks.&rdquo;
              </blockquote>
              <span className="text-base text-gray-500">— Alex P., Tech Lead</span>
            </div>
            {/* New YC founder testimonial */}
            <div className="bg-white/0 rounded-2xl p-12 flex flex-col items-center w-full max-w-xs md:max-w-sm lg:max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  JL
                </div>
              </div>
              <blockquote className="text-xl text-gray-700 italic mb-4 text-center">
                &ldquo;Unmask is a game-changer for fast, high-stakes hiring. We caught things we&apos;d never have found with traditional reference checks.&rdquo;
              </blockquote>
              <span className="text-base text-gray-500">— Jamie L., YC Founder</span>
            </div>
            {/* New testimonial from Chloe M. */}
            <div className="bg-white/0 rounded-2xl p-12 flex flex-col items-center w-full max-w-xs md:max-w-sm lg:max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  CM
                </div>
              </div>
              <blockquote className="text-xl text-gray-700 italic mb-4 text-center">
                &ldquo;We run all candidates through Unmask before screening. It&apos;s like a truth filter.&rdquo;
              </blockquote>
              <span className="text-base text-gray-500">— Chloe M., Hiring Manager</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-3xl mx-auto text-center text-sm text-gray-400 pt-8 border-t border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 pb-2">
          <span>Built for <span className="font-medium text-gray-800">RAISE YOUR HACK 2025</span> • Vultr Track</span>
          <span>
            <a href="https://github.com/le-commit" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-500">GitHub</a>
          </span>
        </div>
      </footer>
    </main>
  );
}
