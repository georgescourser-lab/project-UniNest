import { Suspense } from 'react';
import AuthCard from '@/components/AuthCard';

export const metadata = {
  title: 'Sign up - UniNest',
  description: 'Create your UniNest account to search, save, and tour student accommodations.',
};

export default function SignupPage() {
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
        <AuthCard initialTab="signup" />
      </Suspense>
    </main>
  );
}
