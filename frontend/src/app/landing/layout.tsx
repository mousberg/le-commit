import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Unmask - Trust your hiring process, again",
  description: "Instant checks across CVs, LinkedIn, GitHub, and calls to expose red flags and protect your hiring pipeline.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-inter antialiased`}
        style={{ letterSpacing: '-0.025em' }}
      >
        {/* Simple header for landing page */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <img
                  src="/unmask-logo-blue.svg"
                  alt="Unmask"
                  className="h-8 w-auto"
                />
              </div>
              <div className="flex items-center space-x-4">
                {/* Login removed - app is behind waitlist */}
              </div>
            </div>
          </div>
        </header>
        
        {/* Header spacer */}
        <div className="h-16 w-full"></div>
        
        {children}
      </body>
    </html>
  );
}