import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/NerdBusterHeaderLogo";
import { ApplicantProvider } from "../lib/contexts/ApplicantContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ApplicantProvider>
          <Navbar />
          {children}
        </ApplicantProvider>
      </body>
    </html>
  );
}
