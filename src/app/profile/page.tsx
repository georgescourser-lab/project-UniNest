import Link from 'next/link';
import { getCurrentUser, logout } from '@/app/actions/authActions';
import { getFavorites } from '@/app/actions/favoriteActions';
import { verifyAgentAccess } from '@/app/actions/propertyActions';
import { getCloudDatabase } from '@/lib/cloudStore';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  const email = user.email || '';
  const displayName = user.user_metadata?.full_name || email.split('@')[0] || 'Student';
  const [favorites, { isVerified: isVerifiedAgent }, db] = await Promise.all([
    getFavorites(),
    verifyAgentAccess(email),
    getCloudDatabase(),
  ]);

  const clientEmailClean = email.toLowerCase().trim();
  const myInquiries = (db.inquiries || []).filter(
    (i) => (i.clientEmail || '').toLowerCase().trim() === clientEmailClean
  );

  return (
    <div className="container" style={{ paddingTop: '100px', paddingBottom: '4rem', maxWidth: '850px', margin: '0 auto' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Saved Listings</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{favorites.length}</div>
            <Link href="/favorites" style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>
              View Favorites &rarr;
            </Link>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Active Deals & Inquiries</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{myInquiries.length}</div>
            <a href="/marketplace.html#track" style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>
              Track Live Status &rarr;
            </a>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Marketplace</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginTop: '0.5rem' }}>Student Deals</div>
            <a href="/marketplace.html#sell" style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>
              Sell an Item &rarr;
            </a>
          </div>

          {isVerifiedAgent && (
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Verified Agent</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginTop: '0.5rem' }}>Vacant Houses</div>
              <Link href="/post-property" style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 600, display: 'inline-block', marginTop: '0.5rem' }}>
                + Post House &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Client Active Deals & Viewing Inquiries Stream */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                My Tracked Deals & Appointments
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Real-time status updates for your accompanied house viewings and marketplace item handovers.
              </p>
            </div>
            <a href="/marketplace.html#track" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>
              🔍 Open Live Tracker
            </a>
          </div>

          {myInquiries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myInquiries.map((inq) => {
                const isCompleted = (inq.status || '').toLowerCase() === 'completed';
                const isConfirmed = isCompleted || (inq.status || '').toLowerCase().includes('confirmed');
                const badgeBg = isCompleted ? '#dcfce7' : isConfirmed ? '#dbeafe' : '#fef3c7';
                const badgeColor = isCompleted ? '#15803d' : isConfirmed ? '#1d4ed8' : '#b45309';
                const badgeBorder = isCompleted ? '#86efac' : isConfirmed ? '#93c5fd' : '#fde68a';

                return (
                  <div key={inq.refCode} style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {inq.refCode}
                        </span>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a', marginLeft: '0.5rem' }}>
                          {inq.itemTitle}
                        </strong>
                        {inq.itemPrice && (
                          <span style={{ fontSize: '0.88rem', color: '#64748b', marginLeft: '0.4rem' }}>
                            ({inq.itemPrice})
                          </span>
                        )}
                      </div>
                      <span style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>
                        {inq.status || 'Pending Agent Review'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      <span><strong>Agent:</strong> {inq.agentName || 'Authorized UniNest Agent'}</span>
                      <span><strong>Requested Slot:</strong> {inq.preferredDate || 'Flexible'} ({inq.preferredTime || 'Daytime'})</span>
                      <span><strong>Hub / Location:</strong> {inq.preferredHub || 'Campus Area'}</span>
                    </div>

                    <div style={{ background: '#f8fafc', borderLeft: '3px solid #2563eb', padding: '0.65rem 0.85rem', borderRadius: '0 8px 8px 0', fontSize: '0.84rem', color: '#1e293b', marginBottom: '0.75rem' }}>
                      <strong>Agent Update:</strong> {inq.dealUpdate || 'Appointment received. Assigned campus agent will reach out to accompany inspection.'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <a href={`/marketplace.html#track?ref=${encodeURIComponent(inq.refCode)}`} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>
                        View Detailed Progress Stepper &rarr;
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</div>
              <h3 style={{ fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.35rem 0' }}>No Active Deals Yet</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
                When you request a marketplace item handover or book an accompanied house viewing, your active deals and agent updates appear here automatically.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/marketplace.html" className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                  Browse Marketplace
                </a>
                <Link href="/search" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                  Browse Student Houses
                </Link>
              </div>
            </div>
          )}
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
