'use client'

import { useRef, useState } from 'react'
import { addReview } from '@/app/actions/reviewActions'

export default function ReviewForm({ propertyId }: { propertyId: number }) {
  const ref = useRef<HTMLFormElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    try {
      await addReview(formData)
      ref.current?.reset()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="review-form-container" style={{ marginTop: '2rem', padding: '2rem', backgroundColor: 'var(--color-surface)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Add a Review</h3>
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
      <form ref={ref} action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="hidden" name="property_id" value={propertyId} />
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Your Name</label>
          <input type="text" name="client_name" required className="form-control" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} placeholder="Enter your name" />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Rating</label>
          <select name="rating" required className="form-control" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }}>
            <option value="5">5 - Excellent (⭐⭐⭐⭐⭐)</option>
            <option value="4">4 - Good (⭐⭐⭐⭐)</option>
            <option value="3">3 - Average (⭐⭐⭐)</option>
            <option value="2">2 - Poor (⭐⭐)</option>
            <option value="1">1 - Terrible (⭐)</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Your Review</label>
          <textarea name="comment" required className="form-control" rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc' }} placeholder="Share your experience with this property..."></textarea>
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ alignSelf: 'flex-start', marginTop: '0.5rem', padding: '0.75rem 2rem' }}>
          {pending ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}
