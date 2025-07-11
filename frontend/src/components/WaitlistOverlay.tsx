"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle } from "lucide-react";

interface WaitlistOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export default function WaitlistOverlay({ isOpen, onClose, initialEmail = "" }: WaitlistOverlayProps) {
  const [formData, setFormData] = useState({
    email: initialEmail,
    fullName: '',
    company: '',
    employees: '',
    industry: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const employeeOptions = [
    '1 employee',
    '2-10 employees',
    '11-50 employees',
    '51-100 employees',
    '101-250 employees',
    '251-500 employees',
    '501-1000 employees',
    '1000+ employees'
  ];

  const industryOptions = [
    'AI / Machine Learning',
    'Fintech (e.g. payments, banking, crypto)',
    'Healthtech (e.g. digital health, medtech, biotech)',
    'Edtech',
    'SaaS / Enterprise Software',
    'E-commerce & Marketplaces',
    'Dev Tools / Infrastructure',
    'Media & Content Tech (e.g. streaming, publishing, generative content)',
    'Cybersecurity',
    'Hardware / IoT / Robotics',
    'Other'
  ];

  useEffect(() => {
    if (initialEmail && initialEmail !== formData.email) {
      setFormData(prev => ({ ...prev, email: initialEmail }));
    }
  }, [initialEmail, formData.email]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // First, submit email to get record ID if we don't have one
      if (!recordId) {
        const emailResponse = await fetch('/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          setRecordId(emailData.id);
          
          // Then update with full details
          const detailsResponse = await fetch('/api/waitlist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              id: emailData.id,
              email: formData.email, 
              name: formData.fullName, 
              company: formData.company, 
              employees: formData.employees, 
              industry: formData.industry 
            }),
          });

          if (detailsResponse.ok) {
            setStep('success');
          } else {
            throw new Error('Failed to submit details');
          }
        } else {
          throw new Error('Failed to submit email');
        }
      } else {
        // Update existing record
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            id: recordId,
            email: formData.email, 
            name: formData.fullName, 
            company: formData.company, 
            employees: formData.employees, 
            industry: formData.industry 
          }),
        });

        if (response.ok) {
          setStep('success');
        } else {
          throw new Error('Failed to submit details');
        }
      }
    } catch (error) {
      console.error('Error submitting waitlist details:', error);
      // You might want to show an error message here
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      email: '',
      fullName: '',
      company: '',
      employees: '',
      industry: ''
    });
    setStep('form');
    setRecordId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        style={{ backdropFilter: 'blur(8px)' }}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-xl mx-auto max-h-[90vh] overflow-y-auto">
        {/* Glassmorphic container */}
        <div className="relative bg-white/15 backdrop-blur-lg rounded-2xl border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden" style={{ 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-colors"
          >
            <X className="size-5 text-white" />
          </button>

          {/* Content */}
          <div className="p-6">
            {step === 'success' ? (
              /* Success State */
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mb-6" />
                <h2 className="text-2xl font-medium text-white mb-2">Welcome to the waitlist!</h2>
                <p className="text-white/70 text-sm mb-6">Thanks for providing your details. We&apos;ll be in touch soon with early access to Unmask.</p>
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 text-base font-semibold text-white bg-black hover:bg-pink-500 hover:shadow-[0_0_20px_rgba(255,105,180,0.7)] transition-all duration-300 rounded-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Form State */
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-medium text-white mb-1">Tell us about yourself</h2>
                  <p className="text-white/70 text-sm">Help us understand your needs better</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Address */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all text-base"
                      style={{ 
                        minHeight: '40px',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                      placeholder="your.email@company.com"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1.5">
                      Full Name <span className="text-pink-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all text-base"
                      style={{ 
                        minHeight: '40px',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                      placeholder="Your full name"
                    />
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1.5">
                      Company Name <span className="text-pink-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 transition-all text-base"
                      style={{ 
                        minHeight: '40px',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                      placeholder="Your company name"
                    />
                  </div>

                  {/* Number of Employees */}
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1.5">
                      Number of Employees <span className="text-pink-400">*</span>
                    </label>
                    <select
                      required
                      value={formData.employees}
                      onChange={(e) => handleInputChange('employees', e.target.value)}
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
                          {option}
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
                      required
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
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
                      {isLoading ? "Submitting..." : "Join Waitlist"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}