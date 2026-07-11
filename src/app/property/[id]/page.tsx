import Link from 'next/link';
import ReviewForm from './ReviewForm';

export const dynamic = 'force-dynamic';

const mockProperties: Record<number, any> = {
  1: {
    id: 1,
    title: 'Cozy Bedsitter',
    type: 'Bedsitter',
    rent: '5,000',
    location: 'Near JKUAT',
    distance: '0.5km',
    image: '/images/property-1.svg',
    images: ['/images/property-1.svg', '/images/property-2.svg'],
    amenities: ['WiFi', 'Water', 'Electric', 'Furnished'],
    description: 'Comfortable bedsitter with excellent access to campus. Newly renovated with modern fixtures.',
    agents: { id: 1, name: 'Jane Kariuki', whatsapp: '254712345678', email: 'jane@uninest.com' },
    reviews: [
      { id: 1, client_name: 'Alex K.', rating: 5, comment: 'Great location and very affordable!', created_at: new Date('2026-06-15') },
      { id: 2, client_name: 'Sam M.', rating: 4, comment: 'Good amenities, responsive landlord', created_at: new Date('2026-06-10') }
    ]
  },
  2: {
    id: 2,
    title: 'Modern 1-Bedroom',
    type: '1-Bedroom',
    rent: '8,000',
    location: 'Off-Campus',
    distance: '1km',
    image: '/images/property-2.svg',
    images: ['/images/property-2.svg'],
    amenities: ['WiFi', 'Water', 'Electric', 'Furnished', 'Kitchen'],
    description: 'Spacious 1-bedroom apartment with modern amenities and excellent ventilation.',
    agents: { id: 2, name: 'David Omondi', whatsapp: '254723456789', email: 'david@uninest.com' },
    reviews: [
      { id: 3, client_name: 'Lisa T.', rating: 5, comment: 'Perfect for students, very quiet', created_at: new Date('2026-06-12') }
    ]
  },
  3: {
    id: 3,
    title: 'Shared 2-Bedroom',
    type: '2-Bedroom',
    rent: '6,500',
    location: 'Near UON',
    distance: '0.3km',
    image: '/images/property-3.svg',
    images: ['/images/property-3.svg'],
    amenities: ['WiFi', 'Water', 'Electric', 'Balcony', 'Living Room'],
    description: 'Great shared apartment for students. Well-maintained and close to campus.',
    agents: { id: 3, name: 'Mary Mwangi', whatsapp: '254734567890', email: 'mary@uninest.com' },
    reviews: []
  },
  4: {
    id: 4,
    title: 'Premium Bedsitter',
    type: 'Bedsitter',
    rent: '7,000',
    location: 'Campus Area',
    distance: '0.2km',
    image: '/images/property-4.svg',
    images: ['/images/property-4.svg'],
    amenities: ['WiFi', 'Water', 'Electric', 'Furnished', 'TV', 'Air Conditioning'],
    description: 'Luxury bedsitter with premium features and contemporary design.',
    agents: { id: 4, name: 'Samuel Kipchoge', whatsapp: '254745678901', email: 'samuel@uninest.com' },
    reviews: [
      { id: 4, client_name: 'John D.', rating: 5, comment: 'Exactly what I was looking for!', created_at: new Date('2026-06-18') }
    ]
  }
};

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = mockProperties[parseInt(id)];

  if (!property) return <div className="container" style={{paddingTop: '120px'}}>Property not found</div>;

  return (
    <div className="property-detail-layout container">
      <Link href="/search" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>&larr; Back to Search</Link>
      <div className="property-img-carousel">
        {property.images && property.images.length > 0 ? (
           property.images.map((img: string, idx: number) => (
             <img key={idx} src={img} alt={`${property.title} - ${idx}`} />
           ))
        ) : (
           <img src={property.image || '/images/property-2.svg'} alt={property.title || 'Property'} />
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
              {property.amenities && property.amenities.map((amenity: string, i: number) => (
                <div key={i} className="amenity">✔️ {amenity}</div>
              ))}
            </div>
          </div>

          <div className="detail-section reviews-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
            <h3>Client Reviews</h3>
            
            {property.reviews && property.reviews.length > 0 ? (
              <div className="reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
                {property.reviews.map((review: any) => (
                  <div key={review.id} className="review-card" style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div className="review-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{review.client_name}</strong>
                      <span style={{ color: '#fbbf24' }}>{'⭐'.repeat(review.rating)}</span>
                    </div>
                    <p style={{ margin: 0, color: '#4b5563' }}>{review.comment}</p>
                    <small style={{ color: '#9ca3af', display: 'block', marginTop: '0.5rem' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ marginTop: '1rem' }}>No reviews yet. Be the first to review this property!</p>
            )}

            <ReviewForm propertyId={property.id} />
          </div>
        </div>

        <aside>
          <div className="agent-contact-card">
            <h3 style={{fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '1rem'}}>{property.rent}<span>/mo</span></h3>
            
            {property.agents && (
              <>
                <img src={property.agents.image || '/images/agent-1.svg'} alt={property.agents.name || 'Agent'} />
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
