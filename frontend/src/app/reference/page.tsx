'use client';

import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useRouter } from "next/navigation";

export default function ReferencePage() {
  const router = useRouter();

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <main className="flex flex-col items-center w-full min-h-screen pt-32 pb-12 px-4 bg-gradient-to-b from-white via-slate-50 to-white">
      <section className="w-full max-w-4xl mx-auto">
        {/* Header with candidate name and back button */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            {/* Left side - Candidate name */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">John Doe</h1>
              <p className="text-lg text-gray-600">Senior Software Engineer</p>
            </div>
            
            {/* Right side - Back button */}
            <div>
              <Button 
                onClick={handleBackToDashboard}
                variant="outline" 
                size="lg" 
                className="rounded-2xl shadow-sm px-6 py-2 text-base font-semibold"
              >
                ← Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Reference Input Form */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Add Reference Contacts</h2>
          <div className="space-y-6">
            {/* Reference 1 */}
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Reference 1</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ref1-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <Input 
                    id="ref1-name" 
                    type="text" 
                    placeholder="Enter referee name" 
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="ref1-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input 
                    id="ref1-phone" 
                    type="tel" 
                    placeholder="+1 (555) 123-4567" 
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Reference 2 */}
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Reference 2</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ref2-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <Input 
                    id="ref2-name" 
                    type="text" 
                    placeholder="Enter referee name" 
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="ref2-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input 
                    id="ref2-phone" 
                    type="tel" 
                    placeholder="+1 (555) 123-4567" 
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Reference 3 */}
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Reference 3</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ref3-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <Input 
                    id="ref3-name" 
                    type="text" 
                    placeholder="Enter referee name" 
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="ref3-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input 
                    id="ref3-phone" 
                    type="tel" 
                    placeholder="+1 (555) 123-4567" 
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 text-center">
            <Button 
              size="lg" 
              className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-8 py-3 text-xl font-semibold"
            >
              Start Reference Check
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
} 