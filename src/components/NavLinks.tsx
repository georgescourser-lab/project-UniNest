"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks({ isLoggedIn = false, isAdmin = false }: { isLoggedIn?: boolean; isAdmin?: boolean }) {
  const pathname = usePathname();
  const linkClassName = (href: string) => pathname === href ? 'active' : '';

  return (
    <div className="nav-links">
      <Link href="/" className={linkClassName('/')}>Home</Link>
      <Link href="/search" className={linkClassName('/search')}>Properties</Link>
      <a href="/marketplace.html" className={linkClassName('/marketplace.html')}>Marketplace</a>
      {isLoggedIn && (
        <>
          <Link href="/post-property" className={linkClassName('/post-property')}>Post Property</Link>
          <Link href="/favorites" className={linkClassName('/favorites')}>Favorites</Link>
        </>
      )}
      <Link href="/agents" className={linkClassName('/agents')}>Agents</Link>
    </div>
  );
}
