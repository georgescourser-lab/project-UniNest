'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, checkIsVerifiedAgent } from '@/context/AuthContext';

interface SiteNavClientProps {
  serverUser: {
    id: string;
    email?: string;
    name?: string;
  } | null;
  serverIsVerifiedAgent: boolean;
}

export default function SiteNavClient({
  serverUser,
  serverIsVerifiedAgent,
}: SiteNavClientProps) {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeUser = mounted ? user || serverUser : serverUser;
  const activeEmail = activeUser?.email || '';
  const isVerifiedAgent =
    serverIsVerifiedAgent || (mounted && checkIsVerifiedAgent(activeEmail));
  const displayName =
    (activeUser as any)?.name ||
    (activeUser as any)?.user_metadata?.full_name ||
    (activeEmail ? activeEmail.split('@')[0] : 'Account');

  return (
    <div className="nav-actions">
      <a href="/marketplace.html#sell" className="btn-nav-outline">
        + List Item
      </a>

      {activeUser ? (
        <>
          {isVerifiedAgent ? (
            <>
              <Link href="/post-property" className="btn-nav-outline">
                + Post House
              </Link>
              <a href="/marketplace.html?portal=agent" className="btn-nav-outline">
                Agent Portal
              </a>
            </>
          ) : (
            <a href="/marketplace.html#track" className="btn-nav-outline">
              Track Deal
            </a>
          )}
          <Link href="/profile" className="btn-nav-outline">
            {displayName}
            {isVerifiedAgent ? ' ✓' : ''}
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="btn-nav-solid"
          >
            Sign Out
          </button>
        </>
      ) : (
        <Link href="/login" className="btn-nav-solid">
          Sign in with Google
        </Link>
      )}
    </div>
  );
}

