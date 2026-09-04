"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const linkClassName = (href: string) => pathname === href ? 'active' : '';

  return (
    <div className="nav-links">
      <Link href="/" className={linkClassName('/')}>Home</Link>
      <Link href="/search" className={linkClassName('/search')}>Properties</Link>
      {isAdmin && (
        <Link href="/post-property" className={linkClassName('/post-property')}>Post Property</Link>
      )}
      <Link href="/agents" className={linkClassName('/agents')}>Agents</Link>
    </div>
  );
}
