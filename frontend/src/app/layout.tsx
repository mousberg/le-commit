    import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/NerdBusterHeaderLogo";
import { ApplicantProvider } from "../lib/contexts/ApplicantContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Unmask - Real time reference checking made easy",
  description: "Real-time interview anti-cheating agent for detecting inconsistencies",
};

export default function RootLayout({
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
        <ApplicantProvider>
          <Navbar />
          {/* Global header spacer for all pages */}
          <div className="h-24 w-full"></div>
          {children}
        </ApplicantProvider>
      </body>
    </html>
  );
}
