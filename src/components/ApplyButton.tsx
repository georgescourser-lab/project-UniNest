'use client'

import { useState } from 'react'
import { applyForProperty } from '@/app/actions/applicationActions'
import { useRouter } from 'next/navigation'

export default function ApplyButton({ propertyId, initialHasApplied, userId }: { propertyId: number, initialHasApplied: boolean, userId: string | undefined }) {
  const [hasApplied, setHasApplied] = useState(initialHasApplied)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleApply = async () => {
    if (!userId) {
      router.push('/login')
      return
    }

    if (hasApplied) return

    setIsPending(true)

    try {
      const result = await applyForProperty(propertyId)
      if (result.error) {
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
