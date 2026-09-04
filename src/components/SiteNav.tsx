import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import NavLinks from './NavLinks';
import { logout } from '@/app/actions/authActions';

export default async function SiteNav() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const sessionUser = session?.user;
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  const isAdmin = sessionUser ? adminEmails.includes(sessionUser.email || '') : false;

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
          <NavLinks isAdmin={isAdmin} />
          <div className="nav-actions">
            {sessionUser ? (
              <>
                <span className="nav-session-status">Hi, {sessionUser.email?.split('@')[0] ?? 'there'}</span>
                <form action={logout}>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} type="submit">
                    Logout
                  </button>
                </form>
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
