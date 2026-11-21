'use client'

import { useActionState, useState, useEffect } from 'react'
import { submitPropertyInquiry, InquiryState } from '@/app/actions/inquiryActions'
import { getCurrentUser, syncUserSession } from '@/app/actions/authActions'
import { useAuth, getStoredUser } from '@/context/AuthContext'

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

  const { user: authUser, requireAuth } = useAuth()
  const [currentUser, setCurrentUser] = useState<any>(user || authUser)
  const [clientName, setClientName] = useState<string>(
    user?.user_metadata?.full_name || user?.name || authUser?.name || ''
  )
  const [clientEmail, setClientEmail] = useState<string>(
    user?.email || authUser?.email || ''
  )
  const [clientPhone, setClientPhone] = useState<string>('')
  const [preferredDate, setPreferredDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [preferredTime, setPreferredTime] = useState<string>('Morning (9:00 AM - 12:00 PM)')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    const resolved = authUser || getStoredUser() || user
    if (resolved) {
      setCurrentUser(resolved)
      const nameVal =
        resolved.name ||
        resolved.user_metadata?.full_name ||
        resolved.user_metadata?.display_name ||
        (resolved.email ? resolved.email.split('@')[0] : '')
      if (nameVal) setClientName((prev) => prev || nameVal)
      if (resolved.email) setClientEmail((prev) => prev || resolved.email)
      syncUserSession({
        id: resolved.id,
        email: resolved.email,
        name: nameVal,
      }).catch(() => {})
    } else {
      getCurrentUser().then((u) => {
        if (u) {
          setCurrentUser(u)
          const nameVal = u.user_metadata?.full_name || u.name || (u.email ? u.email.split('@')[0] : '')
          if (nameVal) setClientName((prev) => prev || nameVal)
          if (u.email) setClientEmail((prev) => prev || u.email)
        }
      }).catch(() => {})
    }
  }, [authUser, user])

  // Sync successful property inquiry into localStorage so client can track it & verified agents see it in Agent Portal
  useEffect(() => {
    if (state?.success && state?.refCode) {
      try {
        const STORAGE_KEY_INQUIRIES = 'uninest_agent_inquiries'
        const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES)
        const list = stored ? JSON.parse(stored) : []
        if (!list.some((i: any) => i.refCode === state.refCode)) {
          list.unshift({
            refCode: state.refCode,
            createdAt: new Date().toISOString(),
            itemId: propertyId,
            itemTitle: propertyTitle || 'Student Property Viewing',
            itemPrice: 'Property Viewing',
            campus: 'Campus Area',
            clientName,
            clientPhone,
            clientEmail,
            preferredDate,
            preferredTime,
            preferredHub: 'On-Site Accompanied Viewing',
            notes,
            status: 'Pending Agent Review',
            agentName: 'Authorized UniNest Agent',
            agentNotes: 'Property viewing inquiry received.',
            dealUpdate: state.message || `Your appointment request (${state.refCode}) is registered with the supervising agent.`,
          })
          localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(list))
        }
      } catch (e) {}
    }
  }, [state, propertyId, propertyTitle, clientName, clientPhone, clientEmail, preferredDate, preferredTime, notes])

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    const active = currentUser || authUser || getStoredUser()
    if (!active) {
      e.preventDefault()
      await requireAuth(() => {}, `/property/${propertyId}`)
    }
  }

  const activeUser = currentUser || authUser

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.82rem', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px dashed #86efac', display: 'inline-block' }}>
              Inquiry Ref: <strong>{state.refCode}</strong>
            </div>
            <a
              href={`/marketplace.html?track=deal&ref=${encodeURIComponent(state.refCode || '')}`}
              style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803d', textDecoration: 'underline' }}
            >
              Track Viewing Status &rarr;
            </a>
          </div>
        </div>
      )}

      {!state?.success && (
        <form action={formAction} onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="authenticatedUserId" value={activeUser?.id || ''} />
          <input type="hidden" name="authenticatedUserEmail" value={activeUser?.email || ''} />
          <input type="hidden" name="authenticatedUserName" value={activeUser?.name || activeUser?.user_metadata?.full_name || ''} />

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
              Your Name *
            </label>
            <input
              type="text"
              name="clientName"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
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
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
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
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
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
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' }}>
                Time Window *
              </label>
              <select
                name="preferredTime"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
