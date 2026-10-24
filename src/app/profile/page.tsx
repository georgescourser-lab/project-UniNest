import Link from 'next/link';
import { getCurrentUser, logout } from '@/app/actions/authActions';
import { getFavorites } from '@/app/actions/favoriteActions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  const email = user.email || '';
  const displayName = user.user_metadata?.full_name || email.split('@')[0] || 'Student';
  const favorites = await getFavorites();

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '4rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#2563eb',
            color: '#ffffff',
            fontSize: '1.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
          }}>
            {(displayName.charAt(0) || 'U').toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{displayName}</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0.25rem 0 0' }}>{email}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Saved Listings</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{favorites.length}</div>
            <Link href="/favorites" style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>
              View Favorites &rarr;
            </Link>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Marketplace</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginTop: '0.5rem' }}>Student Deals</div>
            <a href="/marketplace.html#sell" style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>
              Sell an Item &rarr;
            </a>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Host & Agents</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginTop: '0.5rem' }}>List Space</div>
            <Link href="/post-property" style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>
              Post Property &rarr;
            </Link>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/search" className="btn btn-secondary" style={{ fontSize: '0.9rem', padding: '0.5rem 1.25rem' }}>
            Browse Properties
          </Link>
          <form action={logout}>
            <button className="btn btn-primary" type="submit" style={{ fontSize: '0.9rem', padding: '0.5rem 1.25rem', background: '#ef4444' }}>
              Log Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
