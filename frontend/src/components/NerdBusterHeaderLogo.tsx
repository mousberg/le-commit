"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`w-full z-50 fixed top-0 left-0 transition-all duration-400 ease-out ${
      isScrolled ? 'px-2 py-1' : 'px-0 py-0'
    }`}>
      <nav className={`mx-auto flex items-center justify-between transition-all duration-400 ease-out will-change-transform ${
        isScrolled
          ? 'max-w-6xl bg-white/90 backdrop-blur-md shadow-xl rounded-2xl px-8 py-2 border border-gray-200/20'
          : 'w-full bg-white/95 backdrop-blur-sm shadow-sm rounded-none px-8 py-3 border-0'
      }`}>
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="/unmask-logo-blue.svg"
            alt="Unmask"
            width={isScrolled ? 120 : 140}
            height={isScrolled ? 30 : 35}
            className="transition-all duration-400 ease-out"
            priority
          />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-base font-medium text-gray-700">
          <Link href="/#how-it-works" className="hover:text-gray-900 transition-colors">How it works</Link>
          <Link href="/#demo" className="hover:text-gray-900 transition-colors">Demo</Link>
          <Link href="/#testimonials" className="hover:text-gray-900 transition-colors">Testimonials</Link>
        </div>
        <div className="ml-4">
          <Link href="/">
            <Button size="sm" className="rounded-2xl shadow-md bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-6 py-2.5 text-base font-semibold transition-all hover:shadow-lg hover:scale-105">
              Join Waitlist
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
