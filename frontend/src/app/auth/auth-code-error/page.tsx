import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md p-8 space-y-6 text-center">
        <div className="space-y-2">
          <div className="flex justify-center mb-6">
            <img src="/unmask-logo.svg" alt="Unmask" className="h-12" />
          </div>
          <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
          <p className="text-gray-600">
            Something went wrong during the authentication process. This could be due to:
          </p>
          <ul className="text-sm text-gray-600 text-left space-y-1 mt-4">
            <li>• Invalid or expired authentication code</li>
            <li>• Network connectivity issues</li>
            <li>• Third-party authentication service problems</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/login">
              Try Again
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              Back to Homepage
            </Link>
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          If this problem persists, please contact our support team.
        </p>
      </Card>
    </div>
  );
}