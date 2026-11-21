"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MobileMenuCloser() {
  const pathname = usePathname();

  useEffect(() => {
    const toggle = document.getElementById('site-nav-toggle') as HTMLInputElement;
    const button = document.querySelector('[aria-controls="site-navigation"]') as HTMLElement | null;
    if (!toggle) return;

    const syncMenu = () => {
      button?.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false');
    };

    toggle.checked = false;
    syncMenu();
    toggle.addEventListener('change', syncMenu);

    const closeOnLink = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('#site-navigation a')) {
        toggle.checked = false;
        syncMenu();
      }
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!toggle.checked) return;
      const nav = document.querySelector('.navbar');
      if (nav && !nav.contains(event.target as Node)) {
        toggle.checked = false;
        syncMenu();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        toggle.checked = false;
        syncMenu();
        button?.focus();
      }
    };

    document.addEventListener('click', closeOnLink);
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      toggle.removeEventListener('change', syncMenu);
      document.removeEventListener('click', closeOnLink);
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [pathname]);

  return null;
}
