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
          <img src="/images/logo.jpg" alt="UniNest Logo" style={{ height: '24px', width: 'auto', borderRadius: '4px' }} />
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
            <a href="/marketplace.html#sell" className="btn-nav-outline">+ List Item</a>
            <a href="/marketplace.html?portal=agent" className="btn-nav-outline">Agent Portal</a>
            {sessionUser ? (
              <>
                <Link href="/profile" className="btn-nav-outline">
                  {sessionUser.email?.split('@')[0] ?? 'Account'}
                </Link>
                <form action={logout} style={{ display: 'inline', margin: 0 }}>
                  <button className="btn-nav-solid" type="submit">
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-nav-outline">Log In</Link>
                <Link href="/signup" className="btn-nav-solid">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
