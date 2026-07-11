export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const agents = [
    {
      id: 1,
      name: 'Jane Kariuki',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
      rating: 4.8,
      reviews: 124,
      listings_count: 45,
      whatsapp: '254712345678',
      email: 'jane@uninest.com'
    },
    {
      id: 2,
      name: 'David Omondi',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
      rating: 4.6,
      reviews: 98,
      listings_count: 32,
      whatsapp: '254723456789',
      email: 'david@uninest.com'
    },
    {
      id: 3,
      name: 'Mary Mwangi',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
      rating: 4.9,
      reviews: 156,
      listings_count: 58,
      whatsapp: '254734567890',
      email: 'mary@uninest.com'
    },
    {
      id: 4,
      name: 'Samuel Kipchoge',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
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
