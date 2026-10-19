'use client'

import { useState } from 'react'
import { applyForProperty } from '@/app/actions/applicationActions'
import { useRouter } from 'next/navigation'

export default function ApplyButton({ propertyId, initialHasApplied, userId }: { propertyId: number, initialHasApplied: boolean, userId: string | undefined }) {
  const [hasApplied, setHasApplied] = useState(initialHasApplied)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleApply = async () => {
    if (hasApplied) return

    setIsPending(true)

    try {
      const result = await applyForProperty(propertyId)
      if (result.error) {
        const hasClientCookie = typeof document !== 'undefined' && (document.cookie.includes('uninest_user_client') || document.cookie.includes('uninest_user_session'));
        if (result.error.toLowerCase().includes('logged in') && !userId && !hasClientCookie) {
          router.push(`/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : `/property/${propertyId}`)}`)
          return
        }
        if (result.error.toLowerCase().includes('already applied')) {
          setHasApplied(true)
          return
        }
        alert(result.error)
      }
      if (result.hasApplied) {
        setHasApplied(true)
      }
    } catch (err) {
      alert('An error occurred. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  if (hasApplied) {
    return (
      <button 
        disabled
        className="btn" 
        style={{ backgroundColor: '#e5e7eb', color: '#6b7280', border: 'none', borderRadius: '24px', cursor: 'not-allowed' }}
      >
        Applied (Pending)
      </button>
    )
  }

  return (
    <button 
      onClick={handleApply}
      disabled={isPending}
      className="btn btn-primary" 
      style={{ backgroundColor: '#2f4f4f', border: 'none', borderRadius: '24px', opacity: isPending ? 0.7 : 1 }}
    >
      {isPending ? 'Applying...' : 'Apply Now'}
    </button>
  )
}
