"use client";

import { useActionState, useEffect, useState } from 'react';
import { addProperty, getAgents } from '@/app/actions/propertyActions';
import Link from 'next/link';

export default function PostPropertyPage() {
  const [state, formAction, pending] = useActionState(addProperty, null);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    getAgents().then(setAgents).catch(console.error);
  }, []);

  return (
    <main className="post-property-page container">
      <div className="form-container">
        <div className="form-header">
          <h1>List Your Property</h1>
          <p>Fill out the details below to reach thousands of students instantly.</p>
        </div>

        <form action={formAction} className="post-form">
          <div className="form-section">
            <h2>Basic Information</h2>
            
            <label className="form-field">
              <span>Property Title <span className="required">*</span></span>
              <input 
                type="text" 
                name="title" 
                placeholder="e.g. Modern Studio near Campus" 
                required 
              />
            </label>

            <label className="form-field">
              <span>Assign Agent</span>
              <select name="agent_id">
                <option value="">No Agent Assigned</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name} (WhatsApp: {agent.whatsapp})</option>
                ))}
              </select>
            </label>

            <div className="form-row">
              <label className="form-field">
                <span>Property Type <span className="required">*</span></span>
                <select name="type" required>
                  <option value="">Select a type...</option>
                  <option value="2 Bedroom">2 Bedroom</option>
                  <option value="1 Bedroom">1 Bedroom</option>
                  <option value="Studio">Studio</option>
                  <option value="Bedsitter">Bedsitter</option>
                  <option value="Single Room">Single Room</option>
                </select>
              </label>

              <label className="form-field">
                <span>Monthly Rent ($) <span className="required">*</span></span>
                <input 
                  type="text" 
                  name="rent" 
                  placeholder="e.g. $1200" 
                  required 
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>Location & Details</h2>

            <div className="form-row">
              <label className="form-field">
                <span>Location <span className="required">*</span></span>
                <input 
                  type="text" 
                  name="location" 
                  placeholder="e.g. Downtown, near North Gate" 
                  required 
                />
              </label>

              <label className="form-field">
                <span>Distance to Campus</span>
                <input 
                  type="text" 
                  name="distance" 
                  placeholder="e.g. 5 min walk" 
                />
              </label>
            </div>

            <label className="form-field">
              <span>Description</span>
              <textarea 
                name="description" 
                placeholder="Describe the property and its best features..." 
                rows={5}
              ></textarea>
            </label>
          </div>

          <div className="form-section">
            <h2>Amenities</h2>
            <div className="amenities-grid">
              {['WiFi Included', 'Furnished', 'Laundry on-site', 'Air Conditioning', 'Gym', 'Parking', 'Pet Friendly'].map(amenity => (
                <label key={amenity} className="checkbox-label">
                  <input type="checkbox" name="amenities" value={amenity} />
                  <span>{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Media</h2>
            <p className="helper-text">Upload high-quality images and videos of your property (Max 50MB each).</p>
            <label className="form-field">
              <span>Images <span className="required">*</span></span>
              <input 
                type="file" 
                name="images" 
                accept="image/png, image/jpeg, image/webp" 
                multiple 
                required
              />
            </label>
            <label className="form-field">
              <span>Videos (Optional)</span>
              <input 
                type="file" 
                name="videos" 
                accept="video/mp4, video/webm, video/ogg" 
                multiple 
              />
            </label>
          </div>

          {state?.error ? (
            <div className="form-error">
              <p>{state.error}</p>
            </div>
          ) : null}

          {state?.success ? (
            <div className="form-success">
              <p>Property listed successfully!</p>
              <Link href="/search" className="btn btn-primary">View Listings</Link>
            </div>
          ) : (
            <div className="form-actions">
              <Link href="/" className="btn btn-secondary">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending ? 'Posting...' : 'Post Property'}
              </button>
            </div>
          )}
        </form>
      </div>

      <style jsx>{`
        .post-property-page {
          padding-top: 6rem;
          padding-bottom: 4rem;
        }
        .form-container {
          max-width: 800px;
          margin: 0 auto;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 2.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .form-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .form-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .form-header p {
          color: var(--text-muted);
        }
        .form-section {
          margin-bottom: 2.5rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .form-section:last-of-type {
          border-bottom: none;
        }
        .form-section h2 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .form-field span {
          font-weight: 500;
          font-size: 0.95rem;
        }
        .required {
          color: #ef4444;
        }
        .form-field input[type="text"],
        .form-field input[type="number"],
        .form-field select,
        .form-field textarea {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: inherit;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .form-row {
            grid-template-columns: 1fr 1fr;
          }
        }
        .amenities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .checkbox-label input[type="checkbox"] {
          width: 1.2rem;
          height: 1.2rem;
          cursor: pointer;
        }
        .helper-text {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .form-error {
          padding: 1rem;
          background: #fef2f2;
          color: #ef4444;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .form-success {
          padding: 2rem;
          text-align: center;
          background: #f0fdf4;
          color: #16a34a;
          border-radius: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
      `}</style>
    </main>
  );
}
