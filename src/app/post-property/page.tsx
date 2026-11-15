"use client";

import { useActionState, useEffect, useState } from 'react';
import { addProperty, getAgents, verifyAgentAccess } from '@/app/actions/propertyActions';
import { getCurrentUser } from '@/app/actions/authActions';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const FALLBACK_VERIFIED_EMAILS = ['georgescourser@gmail.com', 'oderocarilus@gmail.com'];

export default function PostPropertyPage() {
  const [state, formAction, pending] = useActionState(addProperty, null);
  const [agents, setAgents] = useState<any[]>([]);
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [verifiedAgent, setVerifiedAgent] = useState<any | null>(null);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);

  const [previewFiles, setPreviewFiles] = useState<string[]>([]);
  const [compressedImages, setCompressedImages] = useState<string[]>([]);
  const [compressingFiles, setCompressingFiles] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function checkAgentStatus() {
      try {
        const [agentsData, serverUser] = await Promise.all([
          getAgents().catch(() => []),
          getCurrentUser().catch(() => null),
        ]);

        if (cancelled) return;
        setAgents(agentsData);

        const resolvedEmail = (user?.email || serverUser?.email || '').trim().toLowerCase();
        if (!resolvedEmail) {
          if (!isLoading) {
            router.replace('/login?next=/post-property');
          }
          return;
        }

        setActiveEmail(resolvedEmail);

        const access = await verifyAgentAccess(resolvedEmail).catch(() => ({
          isVerified: FALLBACK_VERIFIED_EMAILS.includes(resolvedEmail),
          agent: null,
        }));

        if (cancelled) return;

        if (access.isVerified) {
          setVerifiedAgent(
            access.agent || {
              name: resolvedEmail.split('@')[0],
              email: resolvedEmail,
            }
          );
        } else {
          const matchedFromList = agentsData.find(
            (a: any) => a.email && a.email.trim().toLowerCase() === resolvedEmail
          );
          if (matchedFromList || FALLBACK_VERIFIED_EMAILS.includes(resolvedEmail)) {
            setVerifiedAgent(
              matchedFromList || {
                name: resolvedEmail.split('@')[0],
                email: resolvedEmail,
              }
            );
          } else {
            setVerifiedAgent(null);
          }
        }
      } finally {
        if (!cancelled) {
          setCheckingAccess(false);
        }
      }
    }

    if (!isLoading) {
      checkAgentStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [isLoading, user, router]);

  const compressImageFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = typeof event.target?.result === 'string' ? event.target.result : '';
        if (!rawDataUrl) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 1000;
            let width = img.width || 800;
            let height = img.height || 600;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', 0.8);
              resolve(compressed || rawDataUrl);
              return;
            }
          } catch {
            // Fall back to raw data URL
          }
          resolve(rawDataUrl);
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setPreviewFiles([]);
      setCompressedImages([]);
      return;
    }
    const selected = Array.from(files).slice(0, 6);
    const urls = selected.map((file) => URL.createObjectURL(file));
    setPreviewFiles(urls);
    setCompressingFiles(true);
    try {
      const dataUrls = await Promise.all(selected.map((file) => compressImageFileToDataUrl(file)));
      const validDataUrls = dataUrls.filter(Boolean);
      setCompressedImages(validDataUrls);
      if (validDataUrls.length > 0) {
        setPreviewFiles(validDataUrls);
      }
    } finally {
      setCompressingFiles(false);
    }
  };

  const parsedImageUrls = imageUrlInput
    .split(/[\n,]+/)
    .map(u => u.trim())
    .filter(u => u.startsWith('http://') || u.startsWith('https://'));

  if (isLoading || checkingAccess) {
    return (
      <main className="post-property-page container" style={{ paddingTop: '8rem', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>Verifying agent authorization...</p>
      </main>
    );
  }

  if (!verifiedAgent) {
    return (
      <main className="post-property-page container" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>
        <div
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            Verified Agents Only
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            Only verified UniNest campus agents are authorized to post vacant houses.
          </p>
          {activeEmail && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                fontSize: '0.88rem',
                color: '#334155',
                marginBottom: '1.5rem',
              }}
            >
              Signed in as: <strong>{activeEmail}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/search" className="btn btn-secondary">
              &larr; Back to Properties
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push('/login?next=/post-property');
              }}
              className="btn btn-primary"
            >
              Switch to Agent Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="post-property-page container">
      <div className="form-container">
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.88rem',
            color: '#166534',
          }}
        >
          <span>
            ✓ <strong>Verified Agent Portal:</strong> Signed in as{' '}
            <strong>{verifiedAgent.name || activeEmail}</strong> ({activeEmail})
          </span>
          <Link href="/search" style={{ color: '#15803d', fontWeight: 600, textDecoration: 'underline' }}>
            &larr; Back to Properties
          </Link>
        </div>

        <div className="form-header">
          <h1>Post a Vacant House</h1>
          <p>Fill out the details below to list a verified vacant house for students.</p>
        </div>

        <form action={formAction} className="post-form">
          <div className="form-section">
            <h2>Basic Information</h2>
            
            <label className="form-field">
              <span>Property Title <span className="required">*</span></span>
              <input 
                type="text" 
                name="title" 
                required 
              />
            </label>

            <label className="form-field">
              <span>Assign Verified Agent</span>
              <select name="agent_id" defaultValue={verifiedAgent?.id ? String(verifiedAgent.id) : ''}>
                <option value="">Select Agent...</option>
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
                <span>Monthly Rent (KSH) <span className="required">*</span></span>
                <input 
                  type="text" 
                  name="rent" 
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
                  required 
                />
              </label>

              <label className="form-field">
                <span>Distance to Campus</span>
                <input 
                  type="text" 
                  name="distance" 
                />
              </label>
            </div>

            <label className="form-field">
              <span>Description</span>
              <textarea 
                name="description" 
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
            <h2>Media & Photos</h2>
            <p className="helper-text">
              Add photos of your property. You can <strong>upload image files</strong> directly, paste <strong>image URLs</strong>, or provide both!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '1rem' }}>
                <label className="form-field" style={{ marginBottom: 0 }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    Upload Image Files
                  </span>
                  <input
                    type="hidden"
                    name="compressed_images_json"
                    value={compressedImages.length > 0 ? JSON.stringify(compressedImages) : ''}
                  />
                  <input 
                    type="file" 
                    name={compressedImages.length > 0 ? undefined : "images"} 
                    accept="image/png, image/jpeg, image/webp" 
                    multiple 
                    onChange={handleFileChange}
                    style={{ marginTop: '0.5rem' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                    {compressingFiles
                      ? 'Optimizing selected photos for fast upload...'
                      : 'Upload photos directly from your device (Max 50MB each).'}
                  </small>
                </label>
              </div>

              <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '1rem' }}>
                <label className="form-field" style={{ marginBottom: 0 }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    Image Web URL(s)
                  </span>
                  <textarea 
                    name="image_urls" 
                    rows={2}
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.35rem', display: 'block' }}>
                    Paste online image URLs (separated by new lines or commas).
                  </small>
                </label>
              </div>
            </div>

            {/* Photo Preview Strip */}
            {(previewFiles.length > 0 || parsedImageUrls.length > 0) && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
                  Selected Photos Preview ({previewFiles.length} file{previewFiles.length !== 1 ? 's' : ''}, {parsedImageUrls.length} web URL{parsedImageUrls.length !== 1 ? 's' : ''}):
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {previewFiles.map((url, idx) => (
                    <div key={`file-prev-${idx}`} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #94a3b8' }}>
                      <img src={url} alt="Uploaded file preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.62rem', textAlign: 'center', padding: '1px 0' }}>File</span>
                    </div>
                  ))}
                  {parsedImageUrls.map((url, idx) => (
                    <div key={`url-prev-${idx}`} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #3b82f6' }}>
                      <img src={url} alt="URL preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { const el = e.currentTarget.parentElement; if (el) el.style.display = 'none'; }} />
                      <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(37,99,235,0.8)', color: '#fff', fontSize: '0.62rem', textAlign: 'center', padding: '1px 0' }}>URL</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="form-field">
              <span>Videos (Optional Walkthroughs)</span>
              <input 
                type="file" 
                name="videos" 
                accept="video/mp4, video/webm, video/ogg" 
                multiple 
              />
              <small style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                Upload short MP4/WEBM property video clips (Max 50MB each).
              </small>
            </label>
          </div>

          {state?.error ? (
            <div className="form-error">
              <p>{state.error}</p>
            </div>
          ) : null}

          {state?.success ? (
            <div className="form-success">
              <p>House posted successfully!</p>
              <Link href="/search" className="btn btn-primary">View Properties</Link>
            </div>
          ) : (
            <div className="form-actions">
              <Link href="/search" className="btn btn-secondary">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={pending || compressingFiles}>
                {pending ? 'Posting...' : compressingFiles ? 'Preparing Photos...' : 'Post House'}
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
