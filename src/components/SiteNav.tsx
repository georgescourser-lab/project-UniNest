"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const linkClassName = (href: string) => pathname === href ? 'active' : '';

  return (
    <nav className="navbar">
      <div className={`container nav-container ${isOpen ? 'mobile-menu-open' : ''}`}>
        <Link href="/" className="logo" onClick={() => setIsOpen(false)}>
          UniNest
        </Link>
        <button
          className="mobile-menu-btn"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="nav-links">
          <Link href="/" className={linkClassName('/')} onClick={() => setIsOpen(false)}>Home</Link>
          <Link href="/search" className={linkClassName('/search')} onClick={() => setIsOpen(false)}>Properties</Link>
          <Link href="/agents" className={linkClassName('/agents')} onClick={() => setIsOpen(false)}>Agents</Link>
        </div>
        <div className="nav-actions">
          <Link href="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setIsOpen(false)}>Login</Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => setIsOpen(false)}>Sign Up</Link>
        </div>
      </div>
    </nav>
  );
}
