import Link from 'next/link';
import NavLinks from './NavLinks';
import { getCurrentUser, isVerifiedAgentEmail } from '@/app/actions/authActions';
import MobileMenuCloser from './MobileMenuCloser';
import SiteNavClient from './SiteNavClient';

export default async function SiteNav() {
  const sessionUser = await getCurrentUser();
  const isVerifiedAgent = await isVerifiedAgentEmail(sessionUser?.email);

  return (
    <nav className="navbar">
      <MobileMenuCloser />
      <div className="container nav-container">
        <input id="site-nav-toggle" className="nav-toggle" type="checkbox" />
        <Link href="/" className="logo">
          <img src="/images/logo.jpg" alt="UniNest Logo" style={{ height: '24px', width: 'auto', borderRadius: '4px' }} />
          UniNest
        </Link>
        <label className="mobile-menu-btn" htmlFor="site-nav-toggle" role="button" tabIndex={0} aria-label="Toggle menu" aria-controls="site-navigation" aria-expanded="false">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </label>
        <div id="site-navigation" className="nav-menu">
          <NavLinks isLoggedIn={!!sessionUser} isAdmin={isVerifiedAgent} />
          <SiteNavClient
            serverUser={
              sessionUser
                ? {
                    id: sessionUser.id,
                    email: sessionUser.email,
                    name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0],
                  }
                : null
            }
            serverIsVerifiedAgent={isVerifiedAgent}
          />
        </div>
      </div>
    </nav>
  );
}
