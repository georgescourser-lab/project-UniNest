"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MobileMenuCloser() {
  const pathname = usePathname();

  useEffect(() => {
    const toggle = document.getElementById('site-nav-toggle') as HTMLInputElement;
    const button = document.querySelector('[aria-controls="site-navigation"]') as HTMLElement | null;
    const menu = document.getElementById('site-navigation');
    if (!toggle || !button) return;

    const syncMenu = () => {
      button?.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false');
      button?.setAttribute('aria-pressed', toggle.checked ? 'true' : 'false');
      menu?.setAttribute('aria-hidden', toggle.checked ? 'false' : 'true');
      menu?.classList.toggle('mobile-menu-open', toggle.checked);
    };

    const toggleMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      toggle.checked = !toggle.checked;
      syncMenu();
    };

    toggle.checked = false;
    syncMenu();
    toggle.addEventListener('change', syncMenu);
    button.addEventListener('click', toggleMenu);

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
      button.removeEventListener('click', toggleMenu);
      document.removeEventListener('click', closeOnLink);
      document.removeEventListener('click', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [pathname]);

  return null;
}
