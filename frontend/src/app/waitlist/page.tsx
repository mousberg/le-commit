"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ArrowLeft } from "lucide-react";
import Image from "next/image";

export default function WaitlistDetailsPage() {
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
      // Redirect back to landing if no email provided
      router.push("/landing");
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
    <main className="flex flex-col items-center w-full min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 px-4">
      {/* Header */}
      <header className="w-full max-w-4xl pt-8 pb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/landing")}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to landing
          </button>
          <Image
            src="/unmask-logo-blue.svg"
            alt="Unmask"
            width={140}
            height={32}
            className="h-8 w-auto"
          />
        </div>
      </header>

      {/* Main Content */}
      <section className="w-full max-w-md mt-8 mb-12">
        <div className="bg-white/80 rounded-2xl shadow-lg p-8">
          {isInitializing ? (
            <div className="flex flex-col items-center text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Setting up your waitlist entry...</p>
            </div>
          ) : isSubmitted ? (
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to the waitlist!
              </h2>
              <p className="text-gray-600 mb-6">
                Thanks for providing your details. We&apos;ll be in touch soon with early access to Unmask.
              </p>
              <Button
                onClick={() => router.push("/landing")}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8 py-3 rounded-2xl font-semibold"
              >
                Back to Home
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Tell us about yourself
                </h1>
                <p className="text-gray-600">
                  Help us understand your needs better
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    readOnly
                    className="bg-gray-50 border-gray-200"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <Input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    placeholder="Your company name"
                  />
                </div>

                {/* Number of Employees */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Employees *
                  </label>
                  <select
                    value={employees}
                    onChange={(e) => setEmployees(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select company size</option>
                    {employeeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option} employees
                      </option>
                    ))}
                  </select>
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select your industry</option>
                    {industryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-2xl shadow-md bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-10 py-4 text-lg font-semibold transition-all hover:shadow-lg hover:scale-105"
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Complete Registration"}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}