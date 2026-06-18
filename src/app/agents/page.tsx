import { prisma } from '@/lib/prisma';

export default async function AgentsPage() {
  const agents = await prisma.agents.findMany();

  return (
    <div className="container" style={{ paddingTop: '120px', paddingBottom: '4rem' }}>
      <h1 className="section-title">Verified Agents</h1>
      <p className="section-subtitle">Connect with trusted agents specializing in student accommodation</p>
      
      <div className="agents-grid">
        {agents.map((agent) => (
          <div key={agent.id} className="agent-card">
            <img src={agent.image || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80'} alt={agent.name || 'Agent'} />
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
