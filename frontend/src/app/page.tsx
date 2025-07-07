"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, Zap, Target, Phone, Eye } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col items-center w-full pt-32 pb-12 px-4 bg-gradient-to-b from-white via-slate-50 to-white min-h-screen">
      {/* Hero Section */}
      <section className="w-full max-w-4xl text-center mb-24">
        <div className="mb-8">
          <Shield className="h-20 w-20 mx-auto mb-6 text-gray-800" />
          <h1 className="text-6xl font-bold mb-6 text-gray-900">Trust your hiring process again.</h1>
          <p className="text-xl text-gray-700 mb-8">ShadowCheck helps you verify candidate skills with real-world validation, so you can hire with confidence and speed.</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <Link href="/setup">
            <Button size="lg" className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-8 py-3 text-xl font-semibold">
              <Eye className="w-5 h-5 mr-2" />
              Live Interview Mode
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="lg" variant="outline" className="rounded-2xl shadow-sm border-2 border-gray-300 text-gray-700 px-8 py-3 text-xl font-semibold hover:bg-gray-50">
              <Phone className="w-5 h-5 mr-2" />
              Reference Checking
            </Button>
          </Link>
        </div>
      </section>

      {/* Dual Features */}
      <section className="w-full max-w-6xl mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* NerdBuster - Live Interview */}
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-200">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-br from-red-400 to-orange-400 p-4 rounded-full w-fit mx-auto mb-4">
                <Eye className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">NerdBuster</h2>
              <p className="text-lg text-gray-600">Real-time anti-cheating for live interviews</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Live Detection</h3>
                  <p className="text-sm text-gray-600">Real-time transcript analysis with instant lie detection</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Smart Prompts</h3>
                  <p className="text-sm text-gray-600">AI-generated follow-up questions to catch inconsistencies</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Credibility Scoring</h3>
                  <p className="text-sm text-gray-600">Dynamic scoring based on response analysis</p>
                </div>
              </div>
            </div>

            <Link href="/setup">
              <Button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-3 rounded-xl font-semibold">
                Start Live Interview
              </Button>
            </Link>
          </div>

          {/* ShadowCheck - Reference Calling */}
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-200">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-br from-emerald-400 to-blue-400 p-4 rounded-full w-fit mx-auto mb-4">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">ShadowCheck</h2>
              <p className="text-lg text-gray-600">AI-powered reference verification</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-emerald-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Automated Calls</h3>
                  <p className="text-sm text-gray-600">AI conducts professional reference checks automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Verify Background</h3>
                  <p className="text-sm text-gray-600">Cross-reference claims with employment history</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-emerald-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Trust Score</h3>
                  <p className="text-sm text-gray-600">Get instant, reliable candidate credibility ratings</p>
                </div>
              </div>
            </div>

            <Link href="/upload">
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white py-3 rounded-xl font-semibold">
                Check References
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="w-full max-w-2xl mb-24 flex flex-col items-center">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900">What our users say</h2>
        <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center border border-gray-200">
          <div className="mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-blue-400 rounded-full flex items-center justify-center text-white text-lg font-bold">
              AP
            </div>
          </div>
          <blockquote className="text-lg text-gray-700 italic mb-2 text-center">
            &ldquo;ShadowCheck let us see real skills, not just resumes. We hired with confidence and saved hours on interviews.&rdquo;
          </blockquote>
          <span className="text-base text-gray-500">— Alex P., Tech Lead</span>
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
