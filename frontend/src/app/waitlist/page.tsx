"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, ArrowLeft } from "lucide-react";

function WaitlistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [employees, setEmployees] = useState("");
  const [industry, setIndustry] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      const decodedEmail = decodeURIComponent(emailParam);
      setEmail(decodedEmail);
      
      // Submit email to API on arrival
      submitEmailToWaitlist(decodedEmail);
    } else {
      // Redirect back to root if no email provided
      router.push("/");
    }
  }, [searchParams, router]);

  const submitEmailToWaitlist = async (emailAddress: string) => {
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailAddress }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecordId(data.id);
      } else {
        console.error('Failed to submit email to waitlist');
      }
    } catch (error) {
      console.error('Error submitting email to waitlist:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recordId) {
      console.error('No record ID available for update');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: recordId,
          email, 
          name, 
          company, 
          employees, 
          industry 
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        throw new Error('Failed to submit details');
      }
    } catch (error) {
      console.error('Error submitting waitlist details:', error);
      // You might want to show an error message here
    } finally {
      setIsLoading(false);
    }
  };

  const employeeOptions = [
    "1",
    "2-10",
    "11-50",
    "51-100",
    "101-250",
    "251-500",
    "501-1000",
    "1000+"
  ];

  const industryOptions = [
    "AI / Machine Learning",
    "Fintech (e.g. payments, banking, crypto)",
    "Healthtech (e.g. digital health, medtech, biotech)",
    "Edtech",
    "SaaS / Enterprise Software",
    "E-commerce & Marketplaces",
    "Dev Tools / Infrastructure",
    "Media & Content Tech (e.g. streaming, publishing, generative content)",
    "Cybersecurity",
    "Hardware / IoT / Robotics",
    "Other"
  ];

  return (
    <main className="flex flex-col items-center w-full min-h-screen bg-gradient-to-t from-pink-100 to-pink-200 px-4 relative overflow-hidden">
      {/* Background gradient blob */}
      <div 
        aria-hidden="true" 
        className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 overflow-hidden blur-3xl"
      >
        <div 
          style={{
            clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
          }} 
          className="relative left-1/2 aspect-[1155/678] w-96 -translate-x-1/2 bg-gradient-to-tr from-pink-500 to-pink-600 opacity-30 sm:w-[36rem] md:w-[72rem] animate-pulse"
        />
      </div>

      {/* Header */}
      <header className="w-full max-w-4xl pt-8 pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center text-gray-700 hover:text-gray-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <section className="w-full max-w-lg mt-8 mb-12 relative z-10">
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-8" style={{ 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          {isInitializing ? (
            <div className="flex flex-col items-center text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-4"></div>
              <p className="text-white/80">Setting up your waitlist entry...</p>
            </div>
          ) : isSubmitted ? (
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">
                Welcome to the waitlist!
              </h2>
              <p className="text-white/80 mb-6">
                Thanks for providing your details. We&apos;ll be in touch soon with early access to Unmask.
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-8 py-3 text-base font-semibold text-white bg-black hover:bg-pink-500 hover:shadow-[0_0_20px_rgba(255,105,180,0.7)] transition-all duration-300 rounded-lg"
              >
                Back to Home
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-medium text-white mb-2">
                  Tell us about yourself
                </h1>
                <p className="text-white/70">
                  Help us understand your needs better
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all text-base"
                    style={{ 
                      minHeight: '40px',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1.5">
                    Full Name <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all text-base"
                    style={{ 
                      minHeight: '40px',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1.5">
                    Company Name <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    placeholder="Your company name"
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all text-base"
                    style={{ 
                      minHeight: '40px',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>

                {/* Number of Employees */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1.5">
                    Number of Employees <span className="text-pink-400">*</span>
                  </label>
                  <select
                    value={employees}
                    onChange={(e) => setEmployees(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all appearance-none text-base"
                    style={{ 
                      minHeight: '40px',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  >
                    <option value="" className="bg-zinc-900 text-white">Select company size</option>
                    {employeeOptions.map((option) => (
                      <option key={option} value={option} className="bg-zinc-900 text-white">
                        {option} {option === "1" ? "employee" : "employees"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1.5">
                    Industry <span className="text-pink-400">*</span>
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all appearance-none text-base"
                    style={{ 
                      minHeight: '40px',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  >
                    <option value="" className="bg-zinc-900 text-white">Select your industry</option>
                    {industryOptions.map((option) => (
                      <option key={option} value={option} className="bg-zinc-900 text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-6 py-2.5 text-base font-semibold text-white bg-black hover:bg-pink-500 hover:shadow-[0_0_20px_rgba(255,105,180,0.7)] transition-all duration-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      minHeight: '44px',
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  >
                    {isLoading ? "Submitting..." : "Complete Registration"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function WaitlistDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <WaitlistContent />
    </Suspense>
  );
}