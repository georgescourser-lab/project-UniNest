"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks({ isLoggedIn = false, isAdmin = false }: { isLoggedIn?: boolean; isAdmin?: boolean }) {
  const pathname = usePathname();
  const linkClassName = (href: string) => {
    if (href === '/' && pathname === '/') return 'active';
    if (href !== '/' && pathname?.startsWith(href)) return 'active';
    return '';
  };

  return (
    <div className="nav-links">
      <Link href="/" className={linkClassName('/')}>Home</Link>
      <Link href="/search" className={linkClassName('/search')}>Properties</Link>
      <Link href="/agents" className={linkClassName('/agents')}>Agents</Link>
      <a href="/marketplace.html" className={pathname?.startsWith('/marketplace') ? 'active' : ''}>Marketplace</a>
    </div>
  );
}
