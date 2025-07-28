"use client";

import Link from "next/link";
import UserAccountDropdown from "./UserAccountDropdown";

export default function CenteredLogo() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-4 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Empty div for left side to maintain center alignment */}
      <div className="w-[200px]"></div>
      
      {/* Centered Logo */}
      <Link href="/" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo-full.svg"
          alt="Unmask"
          className="h-10 w-auto"
        />
      </Link>
      
      {/* User Account Dropdown */}
      <div className="w-[200px] flex justify-end">
        <UserAccountDropdown />
      </div>
    </div>
  );
}