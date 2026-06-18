import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function Home() {
  // Fetch featured listings dynamically using Prisma
  const properties = await prisma.properties.findMany({
    take: 4,
    // Assuming we just want 4 properties for the featured section
  });

  return (
    <>
      <section className="hero">
        <div className="container hero-container">
          <div className="hero-content animate-fade-in-up">
            <h1>Find your perfect <br/><span>Student Nest</span></h1>
            <p>Browse verified bedsitters and apartments near your campus. Connect directly with agents and secure your next home without the hassle.</p>
            <div className="search-bar-wrapper">
              <form id="home-search-form" style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="search-input-group">
                  <select id="search-type" name="type">
                    <option value="Any">Property Type</option>
                    <option value="Bedsitter">Bedsitter</option>
                    <option value="1-Bedroom">1-Bedroom</option>
                    <option value="2-Bedroom">2-Bedroom</option>
                  </select>
                </div>
                {/* NEW CAMPUS DROPDOWN */}
                <div className="search-input-group">
                  <select id="search-campus" name="campus">
                    <option value="Any">Any Campus</option>
                    <option value="KU">KU Main Campus</option>
                    <option value="UoN">UoN Main</option>
                    <option value="JKUAT">JKUAT Juja</option>
                    <option value="Strathmore">Strathmore</option>
                  </select>
                </div>
                <div className="search-input-group">
                  <input type="text" id="search-location" name="location" placeholder="Specific Area..." />
                </div>
                <button type="submit" className="btn btn-primary search-btn">Search</button>
              </form>
            </div>
          </div>
          <div className="hero-image animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Modern Student Living" />
          </div>
        </div>
      </section>

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
              <h3>3. Contact Agent</h3>
              <p>Connect instantly via WhatsApp or Email to arrange a viewing.</p>
            </div>
          </div>
        </div>
      </section>

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
                <div className="property-image">
                  <img src={property.image || (property.images && property.images[0]) || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80'} alt={property.title || 'Property'} />
                  <div className="property-badges">
                    <span className="badge badge-primary">{property.type}</span>
                  </div>
                </div>
                <div className="property-content">
                  <div className="property-price">{property.rent}<span>/month</span></div>
                  <h3 className="property-title">{property.title}</h3>
                  <div className="property-location">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    {property.location}
                  </div>
                  <div className="property-amenities">
                    <div className="amenity">
                       {property.amenities && property.amenities.slice(0,2).join(' • ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {properties.length === 0 && (
              <p>No featured listings found.</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
