'use client';

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col items-center justify-center py-12">
        <Image
          src="/logo.svg"
          alt="le-commit"
          width={120}
          height={120}
          className="mb-8"
        />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          LeCommit
        </h1>
        <p className="text-xl text-gray-600 text-center max-w-2xl">
          AI-powered hiring validation platform for the Raise Summit Hackathon
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Info */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                🕵️‍♂️ What We Do
              </h2>
              <p className="text-gray-600 mb-4">
                LeCommit helps hiring managers detect potentially fraudulent engineering candidates 
                through automated AI-powered reference calling.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>🤖 AI-powered reference calling with ElevenLabs</li>
                <li>📞 Professional conversations via Twilio</li>
                <li>📊 Instant credibility scoring and analysis</li>
                <li>🚩 Automated red flag detection</li>
                <li>📋 Complete transcripts and insights</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                🛠️ Tech Stack
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>• Next.js + React</div>
                <div>• Tailwind CSS</div>
                <div>• ElevenLabs AI</div>
                <div>• Twilio Voice</div>
                <div>• TypeScript</div>
                <div>• Conversational AI</div>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold mb-3 text-purple-800">
                📖 Feature Documentation
              </h3>
              <p className="text-purple-700 text-sm mb-3">
                Comprehensive technical documentation with architecture diagrams and implementation details.
              </p>
              <Link 
                href="/docs/REFERENCE_CALLING_FEATURE.md" 
                target="_blank"
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                📄 View Technical Docs →
              </Link>
            </div>
          </div>

          {/* Right Column - Features */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                🚀 Features
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    🤖 AI Reference Calling
                  </h3>
                  <p className="text-blue-700 text-sm mb-3">
                    ElevenLabs Conversational AI automatically calls and interviews candidate references with natural conversation flow
                  </p>
                  <Link href="/call">
                    <Button className="w-full">
                      Try AI Reference Calling
                    </Button>
                  </Link>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">
                    🔍 CV Analysis
                  </h3>
                  <p className="text-green-700 text-sm mb-3">
                    Deep analysis of candidate resumes and timelines
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-800 mb-2">
                    📊 Advanced Analytics
                  </h3>
                  <p className="text-orange-700 text-sm mb-3">
                    AI-powered scoring system with detailed credibility analysis
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to validate your candidates?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start with AI-powered reference checking to build trust in your hiring process
          </p>
          <div className="space-x-4">
            <Link href="/call">
              <Button size="lg" className="px-8">
                🚀 Start AI Reference Calls
              </Button>
            </Link>
            <Link href="/docs/REFERENCE_CALLING_FEATURE.md" target="_blank">
              <Button variant="outline" size="lg" className="px-8">
                📖 Read Documentation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}