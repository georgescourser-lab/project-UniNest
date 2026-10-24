import Link from 'next/link';
import NavLinks from './NavLinks';
import { getCurrentUser, logout } from '@/app/actions/authActions';
import MobileMenuCloser from './MobileMenuCloser';

export default async function SiteNav() {
  const sessionUser = await getCurrentUser();
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  const isAdmin = sessionUser ? adminEmails.includes(sessionUser.email || '') : false;

  return (
    <nav className="navbar">
      <MobileMenuCloser />
      <div className="container nav-container">
        <input id="site-nav-toggle" className="nav-toggle" type="checkbox" />
        <Link href="/" className="logo">
          <img src="/images/logo.jpg" alt="UniNest Logo" style={{ height: '2rem', width: 'auto', borderRadius: '4px' }} />
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
          <NavLinks isLoggedIn={!!sessionUser} isAdmin={isAdmin} />
          <div className="nav-actions">
            <a href="/marketplace.html#sell" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}>+ Sell Item</a>
            <a href="/marketplace.html?portal=agent" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}>Agent Portal</a>
            {sessionUser ? (
              <>
                <span className="nav-session-status">Hi, {sessionUser.email?.split('@')[0] ?? 'there'}</span>
                <form action={logout}>
                  <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }} type="submit">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>Login</Link>
                <Link href="/signup" className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
