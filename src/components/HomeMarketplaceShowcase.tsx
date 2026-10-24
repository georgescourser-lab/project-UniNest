'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MARKETPLACE_ITEMS, MarketplaceItem } from '@/data/marketplaceItems';

const CATEGORIES = ['All', 'Appliances', 'Furniture', 'Academic', 'Kitchen', 'Bedding'];

export default function HomeMarketplaceShowcase() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  const filteredItems = (activeCategory === 'All'
    ? MARKETPLACE_ITEMS
    : MARKETPLACE_ITEMS.filter((item) => item.category.toLowerCase() === activeCategory.toLowerCase())
  ).slice(0, 4);

  const getConditionClass = (cond: string) => {
    const c = cond.toLowerCase();
    if (c.includes('like new')) return 'condition-like-new';
    if (c.includes('gently used')) return 'condition-gently-used';
    return 'condition-good';
  };

  return (
    <section id="marketplace-showcase" className="section" style={{ backgroundColor: '#f8fafc', borderTop: '1px solid var(--color-gray-light)', padding: '4.5rem 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#e0f2fe', color: '#0284c7', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <span>🎓</span> Peer-to-Peer Student Deals
            </div>
            <h2 className="section-title" style={{ marginBottom: 0, textAlign: 'left' }}>
              Student Second-Hand Marketplace
            </h2>
            <p className="section-subtitle" style={{ marginBottom: 0, textAlign: 'left', marginTop: '0.5rem' }}>
              Furnish your dorm or bedsitter for less. Shop pre-loved appliances and furniture directly from fellow students.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a href="/marketplace.html#sell" className="btn btn-secondary" style={{ fontSize: '0.9rem' }}>+ Post Item</a>
            <a href="/marketplace.html" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>View All Marketplace</a>
          </div>
        </div>

        {/* Quick Category Pills */}
        <div className="marketplace-category-pills" style={{ marginBottom: '2rem' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`marketplace-pill home-market-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'All' ? 'All Items' : cat === 'Kitchen' ? 'Kitchen & Gas' : cat}
            </button>
          ))}
        </div>

        {/* Marketplace Cards Grid */}
        <div className="marketplace-grid" id="homepage-marketplace-items">
          {filteredItems.map((item) => (
            <div key={item.id} className="marketplace-card animate-fade-in-up">
              <div className="marketplace-img-wrap">
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80';
                  }}
                />
                <div className="marketplace-badges-row">
                  <span className={`condition-badge ${getConditionClass(item.condition)}`}>
                    {item.condition}
                  </span>
                  <span className="campus-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                    {item.campus}
                  </span>
                </div>
              </div>
              <div className="marketplace-card-content">
                <div className="marketplace-meta-row">
                  <span className="marketplace-category-tag">{item.category}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                    Ref: {item.listingRef}
                  </span>
                </div>
                <h3 className="marketplace-card-title" title={item.title}>{item.title}</h3>
                
                <div className="marketplace-price-box">
                  <span className="marketplace-price">{item.price}</span>
                  {item.originalPrice && <span className="marketplace-original-price">{item.originalPrice}</span>}
                  {item.originalPrice && <span className="marketplace-discount-tag">Save</span>}
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--color-gray)', marginBottom: '0.85rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description}
                </p>

                <div className="marketplace-card-footer">
                  <div className="marketplace-seller-info" title="Inspected by UniNest Agent • Safe accompanied handover">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>Agent Verified ✓</span>
                  </div>
                  <div className="marketplace-card-actions">
                    <button type="button" className="btn-marketplace-quickview" onClick={() => setSelectedItem(item)}>
                      Details
                    </button>
                    <a href={`/marketplace.html?inspect=${item.id}`} className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, borderRadius: 'var(--border-radius-sm)', textDecoration: 'none' }}>
                      Book Inspection
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem', gridColumn: '1 / -1' }}>
              No items listed in this category yet.
            </p>
          )}
        </div>
      </div>

      {/* Quick View Modal */}
      {selectedItem && (
        <div className="uni-modal-overlay open" onClick={() => setSelectedItem(null)}>
          <div className="uni-modal-dialog" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div className="uni-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="marketplace-category-tag">{selectedItem.category}</span>
                <span className={`condition-badge ${getConditionClass(selectedItem.condition)}`}>
                  {selectedItem.condition}
                </span>
              </div>
              <button type="button" className="uni-modal-close-btn" onClick={() => setSelectedItem(null)} aria-label="Close modal">
                &times;
              </button>
            </div>
            <div className="uni-modal-body">
              <div style={{ marginBottom: '1.25rem', borderRadius: '12px', overflow: 'hidden', background: '#0f172a', maxHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={selectedItem.image} alt={selectedItem.title} style={{ width: '100%', height: '320px', objectFit: 'cover' }} />
              </div>
              
              <h3 style={{ fontSize: '1.4rem', color: 'var(--color-dark)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {selectedItem.title}
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
                <span className="marketplace-price" style={{ fontSize: '1.6rem' }}>{selectedItem.price}</span>
                {selectedItem.originalPrice && <span className="marketplace-original-price" style={{ fontSize: '1rem' }}>{selectedItem.originalPrice}</span>}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem', color: 'var(--color-dark-muted)' }}>
                <div><strong>Campus:</strong> {selectedItem.campusName}</div>
                <div><strong>Handover Hub:</strong> {selectedItem.location}</div>
                <div><strong>Verified Agent:</strong> <span style={{ color: '#2563eb', fontWeight: 600 }}>{selectedItem.agentName || 'UniNest Partner Agent'}</span></div>
                <div><strong>Posted:</strong> {selectedItem.postedAt}</div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--color-dark)' }}>Item Description:</h4>
                <p style={{ color: 'var(--color-gray)', fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {selectedItem.description}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a
                  href={`/marketplace.html?inspect=${selectedItem.id}`}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Book Agent Inspection
                </a>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)} style={{ padding: '0.85rem 1.25rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
