import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = await prisma.properties.findUnique({
    where: { id: parseInt(params.id) },
    include: { agents: true }
  });

  if (!property) return <div className="container" style={{paddingTop: '120px'}}>Property not found</div>;

  return (
    <div className="property-detail-layout container">
      <Link href="/search" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>&larr; Back to Search</Link>
      <div className="property-img-carousel">
        {property.images && property.images.length > 0 ? (
           property.images.map((img, idx) => (
             <img key={idx} src={img} alt={`${property.title} - ${idx}`} />
           ))
        ) : (
           <img src={property.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'} alt={property.title || 'Property'} />
        )}
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <h1>{property.title}</h1>
          <div className="detail-meta">
            <span>{property.type}</span>
            <span>{property.location}</span>
            <span>{property.distance}</span>
          </div>

          <div className="detail-section">
            <h3>Description</h3>
            <p className="text-muted">{property.description}</p>
          </div>

          <div className="detail-section">
            <h3>Amenities</h3>
            <div className="amenities-grid">
              {property.amenities && property.amenities.map((amenity, i) => (
                <div key={i} className="amenity">✔️ {amenity}</div>
              ))}
            </div>
          </div>
        </div>

        <aside>
          <div className="agent-contact-card">
            <h3 style={{fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '1rem'}}>{property.rent}<span>/mo</span></h3>
            
            {property.agents && (
              <>
                <img src={property.agents.image || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80'} alt={property.agents.name || 'Agent'} />
                <h4>{property.agents.name}</h4>
                <div className="rating">★ {property.agents.rating?.toString()} ({property.agents.reviews} reviews)</div>
                <a href={`https://wa.me/${property.agents.whatsapp}`} className="btn btn-primary" target="_blank" rel="noopener noreferrer">Message on WhatsApp</a>
                <button className="btn btn-secondary" style={{marginTop: '0.5rem'}}>Call Agent</button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
