'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { isAuthorizedForATS } from '@/lib/auth/ats-access';

export default function VerifyEmailPage() {
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    const checkEmailVerification = async () => {
      if (!user) {
        setVerifying(false);
        return;
      }

      try {
        // Check if user's email is already verified
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser?.email_confirmed_at) {
          // Email is verified, redirect to appropriate page
          const redirectPath = isAuthorizedForATS(currentUser.email)
            ? '/ats' 
            : '/board';
          router.push(redirectPath);
        } else {
          setVerifying(false);
        }
      } catch (error) {
        console.error('Error checking email verification:', error);
        setError('Failed to check verification status');
        setVerifying(false);
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkEmailVerification, 2000);
    
    // Initial check
    checkEmailVerification();

    return () => clearInterval(interval);
  }, [user, router, supabase.auth]);

  const resendVerificationEmail = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        setError(error.message);
      } else {
        setError(null);
        // Show success message
        alert('Verification email sent! Please check your inbox.');
      }
    } catch {
      setError('Failed to resend verification email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <Image src="/unmask-logo.svg" alt="Unmask" width={48} height={48} className="h-12" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Verify Your Email
          </h1>
        </div>

        {verifying ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking verification status...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
              <h3 className="font-semibold mb-1">Almost there!</h3>
              <p className="text-sm">
                We&apos;ve sent a verification email to your email address. 
                Please click the link in the email to verify your account.
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Once you&apos;ve clicked the verification link, this page will automatically redirect you.
              </p>
              
              <Button
                onClick={resendVerificationEmail}
                variant="outline"
                className="w-full"
                disabled={!user?.email}
              >
                Resend Verification Email
              </Button>

              <Button
                onClick={() => router.push('/login')}
                variant="ghost"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}