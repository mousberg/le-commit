"use client";

import Link from "next/link";

export default function CenteredLogo() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center items-center py-4 bg-white/95 backdrop-blur-md shadow-sm">
      <Link href="/" className="flex items-center">
        <img
          src="/Logo-full.svg"
          alt="Unmask"
          className="h-10 w-auto"
        />
      </Link>
    </div>
  );
}