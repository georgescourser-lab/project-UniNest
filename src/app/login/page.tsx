import { Suspense } from 'react';
import AuthCard from '@/components/AuthCard';

export const metadata = {
  title: 'Log in or sign up - UniNest',
  description: 'Log in or create your UniNest account to search, save, and tour student accommodations.',
};

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 80px)',
        padding: '5rem 1rem 3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}
    >
      <Suspense fallback={<div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Loading...</div>}>
        <AuthCard initialTab="signin" />
      </Suspense>
    </main>
  );
}
