'use client';

import Image from "next/image";
import ReferenceCallForm from "@/components/ReferenceCallForm";
import Link from "next/link";

export default function CallPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex flex-col items-center justify-center py-12">
        <Link href="/" className="mb-8 hover:opacity-80 transition-opacity">
          <Image
            src="/icon.png"
            alt="le-commit"
            width={100}
            height={100}
          />
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Reference Calling
        </h1>
        <p className="text-xl text-gray-600 text-center max-w-2xl">
          Automated AI-powered reference checking for candidate validation
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Info */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                📞 How It Works
              </h2>
              <p className="text-gray-600 mb-4">
                Our AI-powered system automatically calls candidate references and conducts
                professional interviews to validate their background and experience.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">1.</span>
                  <span>Enter reference contact details</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">2.</span>
                  <span>AI generates professional call script</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">3.</span>
                  <span>System calls and records conversation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">4.</span>
                  <span>AI analyzes response for credibility</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">5.</span>
                  <span>Receive detailed analysis report</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">
                🤖 AI Features
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Natural conversation flow</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Automatic transcription</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Sentiment analysis</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Credibility scoring</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Red flag detection</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">
                🔒 Privacy & Compliance
              </h3>
              <p className="text-blue-700 text-sm">
                All calls are recorded with consent and stored securely.
                We comply with GDPR and employment verification regulations.
              </p>
            </div>
          </div>

          {/* Right Column - Reference Call Form */}
          <div>
            <ReferenceCallForm
              onCallInitiated={(callSid) => {
                console.log('Reference call initiated:', callSid);
                // You could add a toast notification here
              }}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="text-center py-8">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
