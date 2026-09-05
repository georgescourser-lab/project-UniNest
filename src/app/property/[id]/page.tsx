import Link from 'next/link';
import ReviewForm from './ReviewForm';
import { getPrisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { deleteProperty } from '@/app/actions/propertyActions';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const prisma = getPrisma();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  const property = await prisma.properties.findUnique({
    where: { id: parseInt(id) },
    include: {
      agents: true,
      reviews: true
    }
  });

  if (!property) return <div className="container" style={{paddingTop: '120px'}}>Property not found</div>;



  return (
    <div className="property-detail-layout container">
      <Link href="/search" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>&larr; Back to Search</Link>
      <div className="property-img-carousel">
        {property.videos && property.videos.length > 0 && property.videos.map((vid: string, idx: number) => (
          <video key={`vid-${idx}`} src={vid} controls style={{width: '100%', maxHeight: '500px', objectFit: 'contain', backgroundColor: 'black', borderRadius: '8px'}} />
        ))}
        {property.images && property.images.length > 0 ? (
           property.images.map((img: string, idx: number) => (
             <img key={`img-${idx}`} src={img} alt={`${property.title} - ${idx}`} />
           ))
        ) : (
           (!property.videos || property.videos.length === 0) && <img src={property.image || '/images/property-2.svg'} alt={property.title || 'Property'} />
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

          {(property.images && property.images.length > 0 || property.videos && property.videos.length > 0) && (
            <div className="detail-section media-gallery-section" style={{ marginTop: '2rem' }}>
              <h3>Media Gallery</h3>
              
              {property.videos && property.videos.length > 0 && (
                <div className="videos-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Video Tours</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {property.videos.map((vid, idx) => (
                      <video key={idx} controls style={{ width: '100%', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <source src={vid} />
                        Your browser does not support the video tag.
                      </video>
                    ))}
                  </div>
                </div>
              )}

              {property.images && property.images.length > 0 && (
                <div className="images-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                  {property.images.map((img, idx) => (
                    <img key={idx} src={img} alt={`${property.title} - image ${idx + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="detail-section" style={{ marginTop: '2rem' }}>
            <h3>Amenities</h3>
            <div className="amenities-grid">
              {property.amenities && property.amenities.map((amenity: string, i: number) => (
                <div key={i} className="amenity">✔️ {amenity}</div>
              ))}
            </div>
          </div>

          <div className="detail-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: '1px', marginBottom: '1.5rem' }}>1 Available Unit</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>{property.id.toString().padStart(4, '0')}</span>
                <span className="text-muted">Available Now</span>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{property.rent}/mo</span>
                <a 
                  href={`https://wa.me/${property.agents?.whatsapp || ''}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-primary" 
                  style={{ backgroundColor: '#25D366', border: 'none', borderRadius: '24px', display: 'inline-block', textDecoration: 'none', color: '#fff' }}
                >
                  Call Agent
                </a>
              </div>
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
                <img src={property.agents.image || '/images/agent-1.svg'} alt={property.agents.name || 'Agent'} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', border: '3px solid var(--color-primary)' }} />
                <h4 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{property.agents.name}</h4>
                <div className="rating" style={{ marginBottom: '0.5rem', fontWeight: '500' }}>★ {property.agents.rating?.toString()} ({property.agents.reviews} reviews)</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{property.agents.listings_count} Active Listings</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  <a href={`https://wa.me/${property.agents.whatsapp}`} className="btn btn-primary" target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>Message on WhatsApp</a>
                  <a href={`mailto:${property.agents.email}`} className="btn btn-secondary" style={{ width: '100%' }}>Email Agent</a>
                  <button className="btn btn-secondary" style={{ width: '100%', backgroundColor: 'transparent' }}>Call Agent</button>
                </div>
              </>
            )}

            <form action={async () => {
              'use server';
              const res = await deleteProperty(property.id);
              if (res?.success) redirect('/search');
            }}>
              <button type="submit" className="btn btn-secondary" style={{backgroundColor: '#ef4444', color: 'white', marginTop: '2rem', width: '100%', borderColor: '#ef4444'}}>Delete Property</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
