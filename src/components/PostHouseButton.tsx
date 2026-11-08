"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface PostHouseButtonProps {
  serverUserEmail?: string | null;
  serverIsVerifiedAgent?: boolean;
  verifiedAgentEmails?: string[];
}

const DEFAULT_VERIFIED_EMAILS = [
  'georgescourser@gmail.com',
  'oderocarilus@gmail.com',
];

export default function PostHouseButton({
  serverUserEmail = null,
  serverIsVerifiedAgent = false,
  verifiedAgentEmails = DEFAULT_VERIFIED_EMAILS,
}: PostHouseButtonProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [modalState, setModalState] = useState<'closed' | 'unauthenticated' | 'unauthorized'>('closed');

  useEffect(() => {
    setMounted(true);
  }, []);

  const clientEmail = mounted ? user?.email : null;
  const activeEmail = (clientEmail || serverUserEmail || '').trim().toLowerCase();
  const normalizedAllowed = verifiedAgentEmails.map((e) => e.trim().toLowerCase());
  const isVerifiedAgent =
    serverIsVerifiedAgent || (mounted && Boolean(activeEmail) && normalizedAllowed.includes(activeEmail));

  const handlePostHouseClick = () => {
    if (!activeEmail) {
      setModalState('unauthenticated');
      return;
    }

    if (!isVerifiedAgent) {
      setModalState('unauthorized');
      return;
    }

    router.push('/post-property');
  };

  const handleSwitchToAgentAccount = async () => {
    setModalState('closed');
    await logout();
    router.push('/login?next=/post-property');
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePostHouseClick}
        className="btn btn-primary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.65rem 1.35rem',
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.92rem',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          cursor: 'pointer',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
        <span>+ Post House</span>
        {isVerifiedAgent && (
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.22)',
              color: '#ffffff',
              fontSize: '0.72rem',
              padding: '0.15rem 0.55rem',
              borderRadius: '9999px',
              fontWeight: 700,
            }}
          >
            Verified Agent ✓
          </span>
        )}
      </button>

      {modalState !== 'closed' && (
        <div
          onClick={() => setModalState('closed')}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setModalState('closed')}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#f1f5f9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontSize: '1.25rem',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &times;
            </button>

            {modalState === 'unauthenticated' ? (
              <>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Verified Agent Sign-In Required
                </h3>
                <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                  Only <strong>verified UniNest agents</strong> are permitted to post vacant houses on the platform. Please log in with your authorized agent account to continue.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setModalState('closed')}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                  <Link
                    href="/login?next=/post-property"
                    className="btn btn-primary"
                    style={{ padding: '0.65rem 1.35rem', fontSize: '0.9rem' }}
                  >
                    Log In as Verified Agent
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Verified Agents Only
                </h3>
                <p style={{ fontSize: '0.92rem', color: '#64748b', lineHeight: 1.55, marginBottom: '1rem' }}>
                  To protect students from unverified listings and rental scams, <strong>only verified UniNest agents</strong> are allowed to post vacant houses.
                </p>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem',
                    color: '#334155',
                    marginBottom: '1.5rem',
                  }}
                >
                  Signed in as: <strong>{activeEmail}</strong>
                  <div style={{ color: '#dc2626', fontWeight: 600, marginTop: '0.2rem', fontSize: '0.8rem' }}>
                    Account is not registered as a verified campus agent
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href="/agents"
                    onClick={() => setModalState('closed')}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1.15rem', fontSize: '0.88rem' }}
                  >
                    Contact an Agent
                  </Link>
                  <button
                    type="button"
                    onClick={handleSwitchToAgentAccount}
                    className="btn btn-primary"
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
                  >
                    Switch to Agent Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

