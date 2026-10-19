'use client'

import { useActionState, useState, useEffect } from 'react'
import { submitPropertyInquiry, InquiryState } from '@/app/actions/inquiryActions'
import { getCurrentUser } from '@/app/actions/authActions'

import Link from 'next/link'

export default function PropertyInquiryForm({ 
  propertyId, 
  propertyTitle,
  user
}: { 
  propertyId: number; 
  propertyTitle: string;
  user?: any;
}) {
  const [state, formAction, isPending] = useActionState<InquiryState, FormData>(
    submitPropertyInquiry,
    {} as InquiryState
  )

  const [currentUser, setCurrentUser] = useState<any>(user)

  useEffect(() => {
    if (!currentUser) {
      getCurrentUser().then((u) => {
        if (u) setCurrentUser(u)
      }).catch(() => {})
    }
  }, [currentUser])



  return (
    <div className="inquiry-form-card" style={{ marginTop: '1.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Agent-Controlled Viewing
        </span>
        <h3 style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '1.25rem', color: '#0f172a' }}>
          Request House Viewing
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
          An authorized UniNest agent coordinates and accompanies all viewings. Landlord contact details are kept private.
        </p>
      </div>

      {state?.error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {state.error}
        </div>
      )}

      {state?.success && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', padding: '1.25rem', borderRadius: '8px', color: '#166534', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem' }}>✓ Viewing Request Registered</div>
          <p style={{ fontSize: '0.88rem', margin: '0 0 0.75rem 0' }}>{state.message}</p>
          <div style={{ fontSize: '0.82rem', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px dashed #86efac', display: 'inline-block' }}>
            Inquiry Ref: <strong>{state.refCode}</strong>
          </div>
        </div>
      )}

      {!state?.success && (
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <input type="hidden" name="propertyId" value={propertyId} />

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
              Your Name *
            </label>
            <input
              type="text"
              name="clientName"
              required
              defaultValue={currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.display_name || ''}
              placeholder="e.g. Cynthia Mwangi"
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                name="clientPhone"
                required
                placeholder="0712 345 678"
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
                Email (Updates)
              </label>
              <input
                type="email"
                name="clientEmail"
                defaultValue={currentUser?.email || user?.email || ''}
                placeholder="student@campus.ac.ke"
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
                Preferred Date *
              </label>
              <input
                type="date"
                name="preferredDate"
                required
                defaultValue={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
                Time Window *
              </label>
              <select
                name="preferredTime"
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="Morning (9:00 AM - 12:00 PM)">Morning (9 AM - 12 PM)</option>
                <option value="Afternoon (1:00 PM - 4:00 PM)">Afternoon (1 PM - 4 PM)</option>
                <option value="Evening (4:00 PM - 6:00 PM)">Evening (4 PM - 6 PM)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
              Special Notes / Move-in Date
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="e.g. Planning to move in next semester; need viewing with roommate."
              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontWeight: 600, marginTop: '0.5rem' }}
          >
            {isPending ? 'Routing to Agent...' : 'Submit Viewing Request'}
          </button>
        </form>
      )}
    </div>
  )
}
