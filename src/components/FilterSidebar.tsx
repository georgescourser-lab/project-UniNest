'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent } from 'react'

export default function FilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentTypes = searchParams.getAll('type')
  const currentCampuses = searchParams.getAll('campus')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const params = new URLSearchParams()
    
    const types = formData.getAll('type')
    types.forEach(t => params.append('type', t as string))
    
    const campuses = formData.getAll('campus')
    campuses.forEach(c => params.append('campus', c as string))

    router.push(`/search?${params.toString()}`)
  }

  return (
    <aside className="filter-sidebar">
      <form onSubmit={handleSubmit}>
        <div className="filter-group">
          <h4>Property Type</h4>
          <label>
            <input type="checkbox" name="type" value="2 Bedroom" defaultChecked={currentTypes.includes('2 Bedroom')} /> 2 Bedroom
          </label>
          <label>
            <input type="checkbox" name="type" value="1 Bedroom" defaultChecked={currentTypes.includes('1 Bedroom')} /> 1 Bedroom
          </label>
          <label>
            <input type="checkbox" name="type" value="Studio" defaultChecked={currentTypes.includes('Studio')} /> Studio
          </label>
          <label>
            <input type="checkbox" name="type" value="Bedsitter" defaultChecked={currentTypes.includes('Bedsitter')} /> Bedsitter
          </label>
          <label>
            <input type="checkbox" name="type" value="Single Room" defaultChecked={currentTypes.includes('Single Room')} /> Single Room
          </label>
        </div>
        
        <div className="filter-group">
          <h4>Campus/Location</h4>
          <label>
            <input type="checkbox" name="campus" value="KU" defaultChecked={currentCampuses.includes('KU')} /> KU Main
          </label>
          <label>
            <input type="checkbox" name="campus" value="UoN" defaultChecked={currentCampuses.includes('UoN')} /> UoN
          </label>
          <label>
            <input type="checkbox" name="campus" value="JKUAT" defaultChecked={currentCampuses.includes('JKUAT')} /> JKUAT
          </label>
          <label>
            <input type="checkbox" name="campus" value="Strathmore" defaultChecked={currentCampuses.includes('Strathmore')} /> Strathmore
          </label>
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Apply Filters</button>
      </form>
    </aside>
  )
}
