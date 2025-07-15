'use client';

import { usePathname } from 'next/navigation';
import Navbar from './HeaderLogo';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on board routes
  if (pathname?.startsWith('/board')) {
    return null;
  }
  
  return <Navbar />;
}