import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { UserProfileProvider } from "@/lib/contexts/UserProfileContext";
import { GoogleTagManager } from '@next/third-parties/google'

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
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-KGC954TB" />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <UserProfileProvider>
            <ConditionalNavbar />
            {children}
          </UserProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
