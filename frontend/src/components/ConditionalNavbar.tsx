'use client';

import { usePathname } from 'next/navigation';
import Navbar from './NerdBusterHeaderLogo';
import CenteredLogo from './CenteredLogo';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on board routes
  if (pathname?.startsWith('/board')) {
    return null;
  }
  
  // Show centered logo on ATS route
  if (pathname === '/ats') {
    return <CenteredLogo />;
  }
  
  if (pathname === '/blog') {
    return <Navbar scrollThreshold={40} />;
  }

  if (pathname?.startsWith('/blog/')) {
    return <Navbar scrollThreshold={20} />;
  }

  // Show regular navbar everywhere else
  return <Navbar />;
}