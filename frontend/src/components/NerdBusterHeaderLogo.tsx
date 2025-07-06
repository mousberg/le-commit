import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";

export default function Navbar() {
  return (
    <nav className="w-full z-10 bg-white/60 backdrop-blur-md shadow-sm rounded-b-2xl px-6 py-3 flex items-center justify-between fixed top-0 left-0 custom-scrollbar">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Image src="/logo.svg" alt="ShadowCheck Logo" width={40} height={40} className="rounded-xl" />
        <span className="font-bold text-xl tracking-tight text-gray-900">ShadowCheck</span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-base font-medium text-gray-700">
        <Link href="#how-it-works" className="hover:text-primary transition-colors">How it works</Link>
        <Link href="#demo" className="hover:text-primary transition-colors">Demo</Link>
        <Link href="#testimonials" className="hover:text-primary transition-colors">Testimonials</Link>
      </div>
      <div className="ml-4">
        <Link href="/upload" target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="rounded-2xl shadow-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white px-6 py-2 text-base font-semibold">Try ShadowCheck</Button>
        </Link>
      </div>
    </nav>
  );
} 