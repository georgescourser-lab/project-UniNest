import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const prisma = getPrisma();
  const agents = await prisma.agents.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="container" style={{ paddingTop: '120px', paddingBottom: '4rem' }}>
      <h1 className="section-title">Verified Agents</h1>
      <p className="section-subtitle">Connect with trusted agents specializing in student accommodation</p>
      
      <div className="agents-grid">
        {agents.map((agent) => (
          <div key={agent.id} className="agent-card">
            <img src={agent.image || '/images/agent-1.svg'} alt={agent.name || 'Agent'} />
            <h3>{agent.name}</h3>
            <div className="agent-stats">
              <span>★ {agent.rating?.toString()} ({agent.reviews} reviews)</span>
              <span>{agent.listings_count} Listings</span>
            </div>
            <a href={`https://wa.me/${agent.whatsapp}`} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
