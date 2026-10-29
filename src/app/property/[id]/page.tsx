import Link from 'next/link';
import PropertyInquiryForm from './PropertyInquiryForm';
import FavoriteButton from '@/components/FavoriteButton';
import { notFound, redirect } from 'next/navigation';
import { deleteProperty } from '@/app/actions/propertyActions';
import { getCurrentUser } from '@/app/actions/authActions';
import { createClient } from '@/utils/supabase/server';
import { FALLBACK_PROPERTIES } from '@/data/fallbackProperties';

import { getFavorites } from '@/app/actions/favoriteActions';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const propertyIdNum = parseInt(id);
  const supabase = await createClient();
  const user = await getCurrentUser();
  
  const { data: propertyData } = await supabase
    .from('properties')
    .select(`
      *,
      agents (*),
      reviews (*)
    `)
    .eq('id', propertyIdNum)
    .maybeSingle();

  let isFavorite = false;
  if (user) {
    const userFavorites = await getFavorites();
    isFavorite = userFavorites.some((f: any) => f.property_id === propertyIdNum);
  }

  const verifiedAgentEmails = ['georgescourser@gmail.com', 'oderocarilus@gmail.com'];
  const isAdmin = user ? verifiedAgentEmails.includes((user.email || '').trim().toLowerCase()) : false;

  let property = propertyData;
  if (!property) {
    property = FALLBACK_PROPERTIES.find(p => p.id === parseInt(id));
  }

  if (!property) return <div className="container" style={{paddingTop: '120px'}}>Property not found</div>;



  return (
    <div className="property-detail-layout container">
      <Link href="/search" className="btn btn-secondary" style={{ marginBottom: '1rem' }}>&larr; Back to Search</Link>
      <div className="property-img-carousel" style={{ position: 'relative' }}>
        <FavoriteButton propertyId={property.id} userId={user?.id} initialIsFavorite={isFavorite} />
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
                    {property.videos.map((vid: string, idx: number) => (
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
                  {property.images.map((img: string, idx: number) => (
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
                  href="#inquiry-section" 
                  className="btn btn-primary" 
                  style={{ borderRadius: '24px', display: 'inline-block', textDecoration: 'none', color: '#fff' }}
                >
                  Request Viewing
                </a>
              </div>
            </div>
          </div>

          {/* Agent Accompanied Viewing & Handover Guarantee */}
          <div className="detail-section" style={{ marginTop: '2.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#0f172a' }}>🔒 Verified Agent Accompaniment Guarantee</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              To protect students from rental scams and deposit theft, all viewings and lease handovers are arranged and attended by an authorized UniNest agent. Landlord direct contacts and tenant inquiries are protected under our privacy shield.
            </p>
          </div>
        </div>

        <aside id="inquiry-section">
          <div className="agent-contact-card">
            <h3 style={{fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '0.5rem'}}>{property.rent}<span>/mo</span></h3>
            
            {property.agents && (
              <>
                <img src={property.agents.image || '/images/agent-1.svg'} alt={property.agents.name || 'Agent'} style={{ width: '85px', height: '85px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem auto', border: '3px solid var(--color-primary)' }} />
                <h4 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{property.agents.name}</h4>
                <div style={{ color: '#2563eb', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>Authorized UniNest Campus Partner</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>{property.agents.listings_count} Active Verified Listings</div>
              </>
            )}

            {/* Agent-Controlled Appointment Request Form */}
            <PropertyInquiryForm propertyId={property.id} propertyTitle={property.title || 'Property'} user={user} />

            {isAdmin && (
              <form action={async () => {
                'use server';
                const res = await deleteProperty(property.id);
                if (res?.success) redirect('/search');
              }}>
                <button type="submit" className="btn btn-secondary" style={{backgroundColor: '#ef4444', color: 'white', marginTop: '1.5rem', width: '100%', borderColor: '#ef4444'}}>Delete Property</button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
