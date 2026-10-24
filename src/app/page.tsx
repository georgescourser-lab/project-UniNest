import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/app/actions/authActions';
import { getFavorites } from '@/app/actions/favoriteActions';
import FavoriteButton from '@/components/FavoriteButton';
import { FALLBACK_PROPERTIES } from '@/data/fallbackProperties';
import HomeMarketplaceShowcase from '@/components/HomeMarketplaceShowcase';

export default async function Home() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const userFavorites = user ? await getFavorites() : [];
  const favoriteIds = new Set(userFavorites.map((f: any) => f.property_id));

  // Fetch featured properties via Supabase REST API instead of Prisma to avoid port timeouts
  const { data: propertiesData } = await supabase
    .from('properties')
    .select('*')
    .order('id', { ascending: false })
    .limit(6);
    
  const properties = (propertiesData && propertiesData.length > 0) ? propertiesData : FALLBACK_PROPERTIES;

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-content animate-fade-in-up">
            <h1>Find your perfect <br/><span>Student Nest</span></h1>
            <p>Browse verified bedsitters and apartments near your campus. Connect directly with agents and secure your next home without the hassle.</p>
            <div className="search-bar-wrapper">
              <form
                action="/search"
                method="GET"
                id="home-search-form"
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  background: '#fff',
                  padding: '10px',
                  borderRadius: '50px',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <div className="search-input-group" style={{ flex: 1, borderRight: '1px solid var(--color-gray-light)', padding: '0 10px' }}>
                  <select name="type" id="search-type" style={{ width: '100%', padding: '10px 0' }}>
                    <option value="Any">Property Type</option>
                    <option value="Bedsitter">Bedsitter</option>
                    <option value="1-Bedroom">1-Bedroom</option>
                    <option value="2-Bedroom">2-Bedroom</option>
                  </select>
                </div>
                <div className="search-input-group" style={{ flex: 1.5, borderRight: '1px solid var(--color-gray-light)', padding: '0 10px' }}>
                  <select name="location" id="search-location" style={{ width: '100%', padding: '10px 0' }}>
                    <option value="">Select Campus</option>
                    <option value="UoN">University of Nairobi (UoN)</option>
                    <option value="KU">Kenyatta University (KU)</option>
                    <option value="JKUAT">JKUAT</option>
                    <option value="Strathmore">Strathmore University</option>
                    <option value="USIU">USIU</option>
                    <option value="Daystar">Daystar University</option>
                    <option value="Moi">Moi University</option>
                    <option value="Egerton">Egerton University</option>
                    <option value="MKU">Mount Kenya University (MKU)</option>
                    <option value="Other">Don't see your campus?</option>
                  </select>
                </div>
                <div className="search-input-group" style={{ flex: 1, padding: '0 10px' }}>
                  <select name="budget" id="search-budget" style={{ width: '100%', padding: '10px 0' }}>
                    <option value="">Budget</option>
                    <option value="0-5000">Ksh 0 - 5,000</option>
                    <option value="5000-10000">Ksh 5,000 - 10,000</option>
                    <option value="10000-15000">Ksh 10,000 - 15,000</option>
                    <option value="15000+">Ksh 15,000+</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary search-btn" style={{ padding: '10px 20px', marginLeft: '10px' }}>
                  Search
                </button>
              </form>
            </div>
          </div>
          <div className="hero-image animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <img src="/images/hero-bg.jpg" alt="Modern Student Living in Kenya" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Your journey to the perfect student house in 3 simple steps</p>

          <div className="steps-container">
            <div className="step-card animate-fade-in-up">
              <h3>1. Search & Filter</h3>
              <p>Find properties that match your budget, location, and specific needs.</p>
            </div>
            <div className="step-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h3>2. Compare Options</h3>
              <p>View photos, check amenities, and save your favourite listings.</p>
            </div>
            <div className="step-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h3>3. Request Viewing</h3>
              <p>Submit an inquiry to an authorized agent who coordinates an accompanied in-person viewing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties Section (Carousel) */}
      <section className="section" style={{ backgroundColor: 'var(--color-white)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
            <div>
              <h2 className="section-title" style={{ marginBottom: 0, textAlign: 'left' }}>Featured Listings</h2>
              <p className="section-subtitle" style={{ marginBottom: 0, textAlign: 'left', marginTop: '0.5rem' }}>Swipe to explore hand-picked properties</p>
            </div>
            <Link href="/search" className="btn btn-secondary">View All</Link>
          </div>

          <div className="carousel-container" id="featured-listings">
            {properties.map((property) => (
              <div key={property.id} className="property-card carousel-item">
                <div className="property-image" style={{ position: 'relative', display: 'block' }}>
                  <Link href={`/property/${property.id}`} style={{ display: 'block', height: '100%' }}>
                    <img
                      src={property.image || (property.images && property.images[0]) || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80'}
                      alt={property.title || 'Property'}
                    />
                  </Link>
                  <div className="property-badges">
                    <span className="badge badge-primary">{property.type}</span>
                  </div>
                  <FavoriteButton propertyId={property.id} userId={user?.id} initialIsFavorite={favoriteIds.has(property.id)} />
                </div>
                <Link href={`/property/${property.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="property-content">
                    <div className="property-price">{property.rent}<span> / month</span></div>
                    <h3 className="property-title">{property.title}</h3>
                    <div className="property-location">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'text-bottom' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      {property.location}
                    </div>
                    <div className="property-amenities">
                      <div className="amenity">
                         {property.amenities && property.amenities.slice(0,2).join(' • ')}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
            {properties.length === 0 && (
              <p>No featured listings found.</p>
            )}
          </div>
        </div>
      </section>

      {/* Student Second-Hand Marketplace Showcase */}
      <HomeMarketplaceShowcase />

      {/* FAQ Section */}
      <section id="faq" className="section" style={{ backgroundColor: 'var(--color-primary-light)', padding: '4rem 0' }}>
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Common questions about renting with UniNest</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-dark)' }}>Are there viewing fees?</h4>
              <p style={{ color: 'var(--color-gray)', fontSize: '0.95rem' }}>No! Viewing properties with verified UniNest agents is completely free. Please be cautious of anyone asking for upfront viewing fees.</p>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-dark)' }}>How do viewings work?</h4>
              <p style={{ color: 'var(--color-gray)', fontSize: '0.95rem' }}>Once you find a property you like, click &quot;Schedule Agent Viewing&quot;. An authorized UniNest agent will review your requested time slot and accompany your in-person viewing safely.</p>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-dark)' }}>How are deposits handled?</h4>
              <p style={{ color: 'var(--color-gray)', fontSize: '0.95rem' }}>Most landlords require a deposit equal to one month&apos;s rent. Never pay a deposit before viewing the property and signing a lease agreement.</p>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-dark)' }}>How do I avoid scams?</h4>
              <p style={{ color: 'var(--color-gray)', fontSize: '0.95rem' }}>We verify our agents, but you should always insist on meeting at the property. Never send money before a viewing and always request a valid receipt.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
