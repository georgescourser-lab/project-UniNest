"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type SessionUser = {
  email?: string | null;
};

export default function SiteNav() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const pathname = usePathname();

  const linkClassName = (href: string) => pathname === href ? 'active' : '';

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setSessionUser(data.session?.user ?? null);
      setIsLoadingSession(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSessionUser(nextSession?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSessionUser(null);
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <input id="site-nav-toggle" className="nav-toggle" type="checkbox" />
        <Link href="/" className="logo">
          UniNest
        </Link>
        <label className="mobile-menu-btn" htmlFor="site-nav-toggle" aria-label="Toggle menu" aria-controls="site-navigation">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </label>
        <div id="site-navigation" className="nav-menu">
          <div className="nav-links">
            <Link href="/" className={linkClassName('/')}>Home</Link>
            <Link href="/search" className={linkClassName('/search')}>Properties</Link>
            <Link href="/agents" className={linkClassName('/agents')}>Agents</Link>
          </div>
          <div className="nav-actions">
            {isLoadingSession ? (
              <span className="nav-session-status">Checking session...</span>
            ) : sessionUser ? (
              <>
                <span className="nav-session-status">Hi, {sessionUser.email?.split('@')[0] ?? 'there'}</span>
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handleLogout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Login</Link>
                <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
