"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, Zap, Target, Phone, Eye } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col items-center w-full pt-12 pb-12 px-4 bg-gradient-to-b from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="w-full max-w-6xl text-center">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-10 text-gray-900 leading-tight">Trust your hiring process again.</h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-16 max-w-4xl mx-auto leading-relaxed">Unmask helps you verify candidate skills with real-world validation, so you can hire with confidence and speed.</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-8 mb-20">
          <Link href="/setup">
            <Button size="lg" className="rounded-2xl shadow-md bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-10 py-4 text-lg font-semibold transition-all hover:shadow-lg hover:scale-105">
              <Eye className="w-5 h-5 mr-3" />
              Live Interview Mode
            </Button>
          </Link>
          <Link href="/board">
            <Button size="lg" variant="outline" className="rounded-2xl shadow-md border-2 border-gray-300 text-gray-700 px-10 py-4 text-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all hover:shadow-lg hover:scale-105">
              <Phone className="w-5 h-5 mr-3" />
              Reference Checking
            </Button>
          </Link>
        </div>
      </section>

      {/* Dual Features */}
      <section className="w-full max-w-7xl mb-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* NerdBuster - Live Interview */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-12 border border-gray-200/50 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="text-center mb-10">
              <div className="bg-gradient-to-br from-red-500 to-orange-500 p-5 rounded-2xl w-fit mx-auto mb-6 shadow-lg">
                <Eye className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">NerdBuster</h2>
              <p className="text-xl text-gray-600">Real-time anti-cheating for live interviews</p>
            </div>

            <div className="space-y-6 mb-8">
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

          {/* Unmask - Reference Calling */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-12 border border-gray-200/50 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="text-center mb-10">
              <div className="bg-gradient-to-br from-emerald-500 to-blue-500 p-5 rounded-2xl w-fit mx-auto mb-6 shadow-lg">
                <Phone className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">Unmask</h2>
              <p className="text-xl text-gray-600">AI-powered reference verification</p>
            </div>

            <div className="space-y-6 mb-8">
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

            <Link href="/board">
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white py-3 rounded-xl font-semibold">
                Check References
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="w-full max-w-3xl mb-32 flex flex-col items-center">
        <h2 className="text-3xl font-semibold text-center mb-8 text-gray-900">What our users say</h2>
        <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center border border-gray-200">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
              AP
            </div>
          </div>
          <blockquote className="text-xl text-gray-700 italic mb-4 text-center">
            &ldquo;Unmask let us see real skills, not just resumes. We hired with confidence and saved hours on interviews.&rdquo;
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
