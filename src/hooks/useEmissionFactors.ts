import { useEffect, useState } from 'react'

// Fallback hardcoded factors - matches database seed values
const FALLBACK_FACTORS = {
  'mobil': 0.16725,
  'mobil-listrik': 0,
  'bus': 0.10385,
  'bus-listrik': 0,
  'kereta': 0.03546,
  'pesawat-ekonomi': 0.10916,
  'pesawat-bisnis': 0.43663,
  'kapal': 0.1127,
}

interface EmissionFactors {
  [key: string]: number
}

export function useEmissionFactors() {
  const [factors, setFactors] = useState<EmissionFactors | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFactors = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/emission-factors/vehicles')

        console.log(`📡 API Response Status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ API Error (${response.status}):`, errorText)
          throw new Error(`API returned ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        console.log('🔍 Raw API response:', data)
        console.log('🔍 Factors from API:', data.factors)
        console.log('🔍 Factors keys:', Object.keys(data.factors || {}))
        
        setFactors(data.factors)
        setError(null)

        console.log('✅ Emission factors loaded:', Object.keys(data.factors).length, 'types')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('❌ Error loading emission factors:', errorMessage)
        console.warn('⚠️ Using fallback hardcoded factors')
        
        setError(errorMessage)
        // Fallback to hardcoded factors
        setFactors(FALLBACK_FACTORS)
      } finally {
        setLoading(false)
      }
    }

    fetchFactors()
  }, [])

  return { factors, loading, error }
}
