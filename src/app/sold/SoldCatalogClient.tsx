"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { INITIAL_SOLD_LISTINGS, SoldListing } from '@/data/soldListings';

interface SoldCatalogClientProps {
  serverSoldHouses?: SoldListing[];
}

const CAMPUSES = ['All', 'KU', 'JKUAT', 'UoN', 'Strathmore', 'USIU', 'Daystar', 'MKU'];

export default function SoldCatalogClient({ serverSoldHouses = [] }: SoldCatalogClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'house' | 'item'>('all');
  const [selectedCampus, setSelectedCampus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientSoldItems, setClientSoldItems] = useState<SoldListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<SoldListing | null>(null);

  useEffect(() => {
    try {
      const mergedClient: SoldListing[] = [];

      // 1. Read explicitly marked sold items/houses from localStorage
      const rawSold = localStorage.getItem('uninest_sold_items');
      if (rawSold) {
        const parsed = JSON.parse(rawSold);
        if (Array.isArray(parsed)) {
          mergedClient.push(...parsed);
        }
      }

      // 2. Also check completed marketplace inquiries in localStorage
      const rawInquiries = localStorage.getItem('uninest_agent_inquiries');
      if (rawInquiries) {
        const inquiries = JSON.parse(rawInquiries);
        if (Array.isArray(inquiries)) {
          inquiries
            .filter((inq: any) => inq.status === 'Completed')
            .forEach((inq: any) => {
              const ref = inq.refCode || `UN-SOLD-${inq.itemId}`;
              if (!mergedClient.some((m) => m.listingRef === ref)) {
                mergedClient.push({
                  id: `inq-sold-${ref}`,
                  title: inq.itemTitle || 'Student Marketplace Item',
                  kind: 'item',
                  subCategory: 'Marketplace Deal',
                  price: inq.itemPrice || 'Completed Deal',
                  campus: inq.campus || 'Campus',
                  campusName: inq.campus || 'Campus Hub',
                  location: inq.preferredHub || 'Campus Handover Point',
                  image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
                  listingRef: ref,
                  agentName: inq.agentName || 'Verified UniNest Agent',
                  soldAt: 'Handover Completed',
                  description: inq.dealUpdate || 'Handover completed under UniNest agent supervision.',
                  amenitiesOrCondition: ['Agent Handover ✓'],
                });
              }
            });
        }
      }

      setClientSoldItems(mergedClient);
    } catch (e) {
      console.warn('Could not read local sold items:', e);
    }

    // Also fetch sold items from central cloud store so other devices see them
    fetch('/api/marketplace?status=sold')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          const mapped: SoldListing[] = data.items.map((item: any) => ({
            id: `cloud-sold-${item.listingRef || item.id}`,
            title: item.title,
            kind: 'item' as const,
            subCategory: item.category || 'Marketplace Item',
            price: item.price,
            campus: item.campus,
            campusName: item.campusName || item.campus,
            location: item.location,
            image: item.image,
            listingRef: item.listingRef || `UN-SOLD-${item.id}`,
            agentName: item.assignedAgentName || 'Verified UniNest Agent',
            soldAt: 'Sold',
            description: item.description,
            amenitiesOrCondition: [item.condition || 'Verified Listing'],
          }));
          setClientSoldItems((prev) => {
            const combined = [...mapped, ...prev];
            const seen = new Set<string>();
            return combined.filter((i) => {
              const k = i.listingRef || i.id;
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
          });
        }
      })
      .catch(() => {});
  }, []);

  const allSoldListings = useMemo(() => {
    const combined = [...serverSoldHouses, ...clientSoldItems, ...INITIAL_SOLD_LISTINGS];
    const seenRefs = new Set<string>();
    return combined.filter((entry) => {
      const key = entry.listingRef || entry.id;
      if (seenRefs.has(key)) return false;
      seenRefs.add(key);
      return true;
    });
  }, [serverSoldHouses, clientSoldItems]);

  const totalHousesSold = useMemo(
    () => allSoldListings.filter((i) => i.kind === 'house').length,
    [allSoldListings]
  );
  const totalItemsSold = useMemo(
    () => allSoldListings.filter((i) => i.kind === 'item').length,
    [allSoldListings]
  );

  const filteredListings = useMemo(() => {
    return allSoldListings.filter((item) => {
      if (activeTab !== 'all' && item.kind !== activeTab) return false;
      if (
        selectedCampus !== 'All' &&
        item.campus.toLowerCase() !== selectedCampus.toLowerCase() &&
        !item.location.toLowerCase().includes(selectedCampus.toLowerCase())
      ) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchLoc = item.location.toLowerCase().includes(q);
        const matchSub = item.subCategory.toLowerCase().includes(q);
        const matchRef = item.listingRef.toLowerCase().includes(q);
        const matchAgent = item.agentName.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchSub && !matchRef && !matchAgent) {
          return false;
        }
      }
      return true;
    });
  }, [allSoldListings, activeTab, selectedCampus, searchQuery]);

  return (
    <div style={{ paddingTop: '96px', paddingBottom: '5rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Hero Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '3.25rem 0',
          marginBottom: '2.5rem',
          borderBottom: '1px solid #334155',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '2rem',
            }}
          >
            <div style={{ maxWidth: '680px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '0.85rem',
                }}
              >
                <span>✓</span> Verified Completed Transactions Archive
              </div>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 700, marginBottom: '0.65rem', lineHeight: 1.2 }}>
                Sold Houses &amp; Marketplace Items
              </h1>
              <p style={{ color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
                Explore vacant houses successfully leased and second-hand student marketplace items sold through UniNest&apos;s verified campus agents.
              </p>
            </div>

            {/* Stats Counters */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(110px, 1fr))',
                gap: '0.85rem',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ffffff' }}>
                  {allSoldListings.length}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>Total Sold</div>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  borderLeft: '1px solid rgba(255,255,255,0.12)',
                  borderRight: '1px solid rgba(255,255,255,0.12)',
                  padding: '0 0.75rem',
                }}
              >
                <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#60a5fa' }}>{totalHousesSold}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>Houses Taken</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#34d399' }}>{totalItemsSold}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>Items Sold</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Filter Controls Bar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.15rem',
            }}
          >
            {/* Type Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  border: activeTab === 'all' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: activeTab === 'all' ? '#2563eb' : '#f8fafc',
                  color: activeTab === 'all' ? '#ffffff' : '#334155',
                }}
              >
                All Sold ({allSoldListings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('house')}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  border: activeTab === 'house' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: activeTab === 'house' ? '#2563eb' : '#f8fafc',
                  color: activeTab === 'house' ? '#ffffff' : '#334155',
                }}
              >
                🏠 Houses Sold / Taken ({totalHousesSold})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('item')}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  border: activeTab === 'item' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: activeTab === 'item' ? '#2563eb' : '#f8fafc',
                  color: activeTab === 'item' ? '#ffffff' : '#334155',
                }}
              >
                🛍️ Marketplace Items Sold ({totalItemsSold})
              </button>
            </div>

            {/* Search & Campus Filter */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: '1', maxWidth: '520px', justifyContent: 'flex-end' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sold house, item, ref, or agent..."
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '0.55rem 1rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9999px',
                  fontSize: '0.88rem',
                  background: '#f8fafc',
                  color: '#0f172a',
                }}
              />
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                style={{
                  padding: '0.55rem 1rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9999px',
                  fontSize: '0.88rem',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 500,
                }}
              >
                {CAMPUSES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Campuses' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              fontSize: '0.84rem',
              color: '#64748b',
            }}
          >
            <span>
              Showing <strong>{filteredListings.length}</strong> completed{' '}
              {filteredListings.length === 1 ? 'listing' : 'listings'}
            </span>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/search" style={{ color: '#2563eb', fontWeight: 600 }}>
                Browse Available Houses &rarr;
              </Link>
              <a href="/marketplace.html" style={{ color: '#2563eb', fontWeight: 600 }}>
                Browse Available Items &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Sold Cards Grid */}
        {filteredListings.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '4rem 1.5rem',
              textAlign: 'center',
              border: '1px dashed #cbd5e1',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.5rem' }}>
              No matching sold listings found
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
              Try clearing your search or switching the category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedCampus('All');
                setSearchQuery('');
              }}
              className="btn btn-secondary"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {filteredListings.map((item) => {
              const isHouse = item.kind === 'house';
              return (
                <div
                  key={item.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    {/* Image with SOLD Overlay Badge */}
                    <div style={{ position: 'relative', height: '210px', overflow: 'hidden', background: '#0f172a' }}>
                      <img
                        src={item.image}
                        alt={item.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: 'saturate(0.85)',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80';
                        }}
                      />

                      {/* Top Badges */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0.75rem',
                          left: '0.75rem',
                          right: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            background: isHouse ? '#1e40af' : '#0f766e',
                            color: '#ffffff',
                            padding: '0.28rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}
                        >
                          {isHouse ? `🏠 House • ${item.subCategory}` : `🛍️ Item • ${item.subCategory}`}
                        </span>

                        <span
                          style={{
                            background: '#dc2626',
                            color: '#ffffff',
                            padding: '0.28rem 0.8rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.45)',
                          }}
                        >
                          {isHouse ? 'SOLD / TAKEN ✓' : 'SOLD ✓'}
                        </span>
                      </div>

                      {/* Bottom Campus Pill */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '0.75rem',
                          left: '0.75rem',
                          background: 'rgba(15, 23, 42, 0.82)',
                          color: '#ffffff',
                          padding: '0.22rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        📍 {item.campus}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '1.25rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.4rem',
                          fontSize: '0.76rem',
                          color: '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        <span>Ref: {item.listingRef}</span>
                        <span style={{ color: '#16a34a' }}>{item.soldAt}</span>
                      </div>

                      <h3
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          marginBottom: '0.4rem',
                          lineHeight: 1.35,
                        }}
                      >
                        {item.title}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>{item.price}</span>
                        {item.originalPrice && (
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            {item.originalPrice}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.65rem' }}>
                        {item.location}
                      </div>

                      <p
                        style={{
                          fontSize: '0.84rem',
                          color: '#64748b',
                          lineHeight: 1.5,
                          marginBottom: '0.9rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.description}
                      </p>

                      {item.amenitiesOrCondition && item.amenitiesOrCondition.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          {item.amenitiesOrCondition.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#f1f5f9',
                                color: '#334155',
                                fontSize: '0.73rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div
                    style={{
                      padding: '0.85rem 1.25rem',
                      borderTop: '1px solid #f1f5f9',
                      background: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                      <span style={{ color: '#64748b' }}>Closed by: </span>
                      <strong style={{ color: '#0f172a' }}>{item.agentName}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedListing(item)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#1e293b',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Deal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedListing && (
        <div
          onClick={() => setSelectedListing(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '580px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ position: 'relative', height: '240px', background: '#0f172a' }}>
              <img
                src={selectedListing.image}
                alt={selectedListing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(15, 23, 42, 0.75)',
                  color: '#ffffff',
                  border: 'none',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
              <span
                style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '1rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                {selectedListing.kind === 'house' ? 'HOUSE SOLD / TAKEN ✓' : 'ITEM SOLD ✓'}
              </span>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
                Reference: {selectedListing.listingRef} • {selectedListing.soldAt}
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                {selectedListing.title}
              </h3>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2563eb', marginBottom: '1rem' }}>
                {selectedListing.price}
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.86rem',
                  color: '#334155',
                  marginBottom: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <strong>Category:</strong> {selectedListing.subCategory}
                </div>
                <div>
                  <strong>Campus:</strong> {selectedListing.campusName}
                </div>
                <div>
                  <strong>Location:</strong> {selectedListing.location}
                </div>
                <div>
                  <strong>Verified Agent:</strong> {selectedListing.agentName}
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {selectedListing.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Link
                  href={selectedListing.kind === 'house' ? '/search' : '/marketplace.html'}
                  className="btn btn-primary"
                  style={{ fontSize: '0.88rem', padding: '0.6rem 1.25rem' }}
                >
                  {selectedListing.kind === 'house' ? 'Find Similar Houses' : 'Browse Marketplace'}
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '0.6rem 1.15rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

