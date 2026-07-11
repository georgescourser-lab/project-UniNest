export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const agents = [
    {
      id: 1,
      name: 'Jane Kariuki',
      image: '/images/agent-1.svg',
      rating: 4.8,
      reviews: 124,
      listings_count: 45,
      whatsapp: '254712345678',
      email: 'jane@uninest.com'
    },
    {
      id: 2,
      name: 'David Omondi',
      image: '/images/agent-2.svg',
      rating: 4.6,
      reviews: 98,
      listings_count: 32,
      whatsapp: '254723456789',
      email: 'david@uninest.com'
    },
    {
      id: 3,
      name: 'Mary Mwangi',
      image: '/images/agent-3.svg',
      rating: 4.9,
      reviews: 156,
      listings_count: 58,
      whatsapp: '254734567890',
      email: 'mary@uninest.com'
    },
    {
      id: 4,
      name: 'Samuel Kipchoge',
      image: '/images/agent-4.svg',
      rating: 4.7,
      reviews: 112,
      listings_count: 41,
      whatsapp: '254745678901',
      email: 'samuel@uninest.com'
    }
  ];

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
