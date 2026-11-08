import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/app/actions/authActions';
import { verifyAgentAccess } from '@/app/actions/propertyActions';
import PostHouseButton from '@/components/PostHouseButton';

const FALLBACK_AGENTS = [
  {
    id: 1,
    name: 'George Scourser',
    email: 'georgescourser@gmail.com',
    image: '/images/agent-george.jpg',
    rating: 5.0,
    reviews: 24,
    listings_count: 8,
  },
  {
    id: 2,
    name: 'Odero Carilus',
    email: 'oderocarilus@gmail.com',
    image: '/images/odero.jpg',
    rating: 5.0,
    reviews: 19,
    listings_count: 12,
  },
];

export default async function AgentsPage() {
  const supabase = await createClient();
  const [user, { data: agentsData }] = await Promise.all([
    getCurrentUser(),
    supabase.from('agents').select('*').order('name', { ascending: true }),
  ]);

  const { isVerified: isVerifiedAgent } = await verifyAgentAccess(user?.email);
  const agents = agentsData && agentsData.length > 0 ? agentsData : FALLBACK_AGENTS;
  const verifiedAgentEmails = Array.from(
    new Set([
      'georgescourser@gmail.com',
      'oderocarilus@gmail.com',
      ...agents.map((a: any) => a.email).filter(Boolean),
    ])
  );

  return (
    <div className="container" style={{ paddingTop: '120px', paddingBottom: '4rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}
      >
        <div>
          <h1 className="section-title" style={{ marginBottom: '0.25rem', textAlign: 'left' }}>
            Verified Agents
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0, textAlign: 'left' }}>
            Connect with trusted agents specializing in student accommodation
          </p>
        </div>
        <PostHouseButton
          serverUserEmail={user?.email || null}
          serverIsVerifiedAgent={isVerifiedAgent}
          verifiedAgentEmails={verifiedAgentEmails}
        />
      </div>

      <div className="agents-grid">
        {agents.map((agent: any) => (
          <div key={agent.id} className="agent-card">
            <img
              src={
                agent.image ||
                (agent.name?.toLowerCase().includes('odero') ? '/images/odero.jpg' : '/images/agent-george.jpg')
              }
              alt={agent.name || 'Agent'}
            />
            <h3>{agent.name}</h3>
            <div className="agent-stats">
              <span>★ {agent.rating?.toString() || '5.0'} ({agent.reviews ?? 0} reviews)</span>
              <span>{agent.listings_count ?? 0} Listings</span>
            </div>
            <a href="/search" className="btn btn-primary" style={{ textAlign: 'center' }}>
              View Agent Listings
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
