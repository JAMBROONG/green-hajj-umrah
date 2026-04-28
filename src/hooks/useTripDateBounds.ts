'use client'

import { useEffect, useState } from 'react'

/**
 * Convert ISO datetime / Date / string ke format `YYYY-MM-DD` untuk input
 * `<input type="date">` (HTML5 date input cuma nerima format ini).
 *
 * Pakai UTC supaya tidak ke-shift sehari di timezone non-UTC: server simpan
 * date-only sebagai midnight UTC; kalau di-parse local time, bisa "mundur"
 * sehari untuk timezone east-of-UTC saat dini hari.
 */
function toDateInputValue(value: unknown): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Clamp date string `YYYY-MM-DD` ke range [min, max]. String compare aman
 * untuk format ini (lexicographic == chronological).
 */
export function clampToTripBounds(
  date: string,
  bounds: { minDate: string; maxDate: string },
): string {
  if (!date) return bounds.minDate || bounds.maxDate || date
  if (bounds.minDate && date < bounds.minDate) return bounds.minDate
  if (bounds.maxDate && date > bounds.maxDate) return bounds.maxDate
  return date
}

export interface TripDateBounds {
  /** YYYY-MM-DD format atau '' kalau belum tersedia */
  minDate: string
  maxDate: string
  isLoading: boolean
}

/**
 * Fetch trip yang sedang dikerjakan dan expose batas tanggal `[minDate, maxDate]`
 * untuk dipakai sebagai `min`/`max` di `<input type="date">`. Memastikan
 * activity yang dimasukkan jemaah selalu dalam rentang trip — integritas data
 * terjaga (mis. tidak ada activity transport bertanggal SETELAH `endDate` trip).
 *
 * Hasil di-cache di hook lokal — tidak ada global cache, jadi tiap halaman
 * fetch sekali per mount. Cukup ringan karena `/api/trips/[id]` cepat.
 */
export function useTripDateBounds(
  tripId: string | null | undefined,
): TripDateBounds {
  const [state, setState] = useState<TripDateBounds>({
    minDate: '',
    maxDate: '',
    isLoading: true,
  })

  useEffect(() => {
    if (!tripId) {
      setState({ minDate: '', maxDate: '', isLoading: false })
      return
    }

    let cancelled = false
    setState((s) => ({ ...s, isLoading: true }))

    fetch(`/api/trips/${tripId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const trip = data?.trip
        if (!trip) {
          setState({ minDate: '', maxDate: '', isLoading: false })
          return
        }
        setState({
          minDate: toDateInputValue(trip.startDate),
          maxDate: toDateInputValue(trip.endDate),
          isLoading: false,
        })
      })
      .catch(() => {
        if (!cancelled) setState({ minDate: '', maxDate: '', isLoading: false })
      })

    return () => {
      cancelled = true
    }
  }, [tripId])

  return state
}
