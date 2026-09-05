'use client'

import { useState } from 'react'
import { toggleFavorite } from '@/app/actions/favoriteActions'
import { useRouter } from 'next/navigation'

export default function FavoriteButton({ propertyId, initialIsFavorite, userId }: { propertyId: number, initialIsFavorite: boolean, userId: string | undefined }) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if button is inside a Link
    
    if (!userId) {
      router.push('/login')
      return
    }

    // Optimistic update
    setIsFavorite(!isFavorite)
    setIsPending(true)

    try {
      const result = await toggleFavorite(propertyId)
      if (result.error) {
        // Revert on error
        setIsFavorite(isFavorite)
        alert(result.error)
      } else {
        // Ensure state matches server
        setIsFavorite(result.isFavorite ?? false)
      }
    } catch (err) {
      // Revert on error
      setIsFavorite(isFavorite)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`favorite-btn ${isFavorite ? 'active' : ''}`}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: 'rgba(255, 255, 255, 0.9)',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        zIndex: 10,
        transition: 'all 0.2s ease',
        transform: isPending ? 'scale(0.9)' : 'scale(1)',
      }}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        width="22" 
        height="22"
        fill={isFavorite ? '#ef4444' : 'none'} 
        stroke={isFavorite ? '#ef4444' : 'currentColor'} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{
          transition: 'all 0.2s ease'
        }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    </button>
  )
}
