"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MobileMenuCloser() {
  const pathname = usePathname();

  useEffect(() => {
    const toggle = document.getElementById('site-nav-toggle') as HTMLInputElement;
    if (toggle) {
      toggle.checked = false;
    }
  }, [pathname]);

  return null;
}
