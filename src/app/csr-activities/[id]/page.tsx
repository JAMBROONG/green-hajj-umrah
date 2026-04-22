'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import StatusBar from '@/components/StatusBar'
import BottomNav from '@/components/BottomNav'
import { useDialog } from '@/contexts/DialogContext'
import { FaArrowLeft, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { getImageUrl } from '@/lib/image-utils'
import Image from 'next/image'

interface MidtransSnapResponse {
  transaction_status: string
  transaction_id: string
  [key: string]: unknown
}

declare global {
  interface Window {
    snap: {
      setClientKey: (key: string) => void
      pay: (token: string, callbacks: {
        onSuccess?: (result: MidtransSnapResponse) => void
        onPending?: (result: MidtransSnapResponse) => void
        onError?: (result: MidtransSnapResponse) => void
        onClose?: () => void
      }) => void
    }
  }
}

interface CSRActivity {
  id: string
  tenant_id: string
  title: string
  description: string
  category: string
  location: string
  status: string
  start_date: string
  end_date: string
  activity_date: string
  total_donations_amount: number
  target_donation_amount: number
  image_url: string | null
  contact_person: string
  contact_phone: string
  contact_email: string
  incentives?: any
  created_at: string
  updated_at: string
  tenant: {
    id: string
    name: string
    slug: string
  }
}

interface CsrActivityUpdate {
  id: string
  csr_activity_id: string
  title: string
  description: string
  photos: string[]
  created_at: string
}

const categoryIcons: Record<string, string> = {
  reforestation: '🌳',
  waste_management: '♻️',
  energy_efficiency: '⚡',
  water_conservation: '💧',
}

const categoryLabels: Record<string, string> = {
  reforestation: 'Penanaman Pohon',
  waste_management: 'Pengelolaan Sampah',
  energy_efficiency: 'Efisiensi Energi',
  water_conservation: 'Konservasi Air',
}

const statusTexts: Record<string, string> = {
  active: 'Aktif',
  upcoming: 'Akan Datang',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default function CSRActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id: activityId } = use(params)
  const [activity, setActivity] = useState<CSRActivity | null>(null)
  const [updates, setUpdates] = useState<CsrActivityUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [donationAmount, setDonationAmount] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [activeSlides, setActiveSlides] = useState<Record<string, number>>({})
  const { showError } = useDialog()

  // Fallback: handle Midtrans redirect-back to this page (redirect-based payment methods)
  // This happens when callbacks.finish isn't respected or for old transactions without it set.
  useEffect(() => {
    const orderId = searchParams.get('order_id')
    if (!orderId) return
    // Clean the URL first
    window.history.replaceState({}, '', window.location.pathname)
    // Look up user's donations and find the one for this activity
    fetch('/api/user/csr-donations')
      .then(res => res.ok ? res.json() : [])
      .then((donations: Array<{ id: string; csr_activity_id: string }>) => {
        const match = donations.find(d => d.csr_activity_id === activityId)
        if (match) router.replace(`/csr-donations/${match.id}`)
      })
      .catch(() => { /* ignore */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load Midtrans Snap script
  useEffect(() => {
    const loadMidtrans = async () => {
      try {
        const configResponse = await fetch('/api/payment-config/check')
        if (!configResponse.ok) {
          console.warn('Failed to fetch Midtrans config')
          return
        }

        const config = await configResponse.json()
        const clientKey = config.clientKey
        const isProduction = config.isProduction || false

        // Load Midtrans Snap script
        const scriptSrc = isProduction
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js'

        const script = document.createElement('script')
        script.src = scriptSrc
        script.async = true
        script.setAttribute('data-client-key', clientKey)
        document.head.appendChild(script)

        return () => {
          if (document.head.contains(script)) {
            document.head.removeChild(script)
          }
        }
      } catch (error) {
        console.warn('Failed to load Midtrans Snap:', error)
      }
    }

    loadMidtrans()
  }, [])

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true)
        const [actRes, updRes] = await Promise.all([
          fetch(`/api/csr-activities/${activityId}`),
          fetch(`/api/csr-activities/${activityId}/updates`),
        ])
        if (!actRes.ok) {
          console.error('API response:', actRes.status, actRes.statusText)
          throw new Error('Failed to fetch activity')
        }
        const data = await actRes.json()
        console.log('Fetched activity:', data)
        setActivity(data)
        if (updRes.ok) {
          setUpdates(await updRes.json())
        }
      } catch (err) {
        console.error('Error fetching activity:', err)
      } finally {
        setLoading(false)
      }
    }

    if (activityId) {
      fetchActivity()
    }
  }, [activityId])

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!donationAmount) {
      showError('Masukkan jumlah donasi')
      return
    }

    const amount = parseFloat(donationAmount)
    if (amount < 1) {
      showError('Minimal donasi adalah Rp 1')
      return
    }
    if (amount > 5000000) {
      showError('Maksimal donasi adalah Rp 5.000.000 per transaksi')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/csr-activities/participate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csr_activity_id: activityId,
          type: 'donate',
          amount,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || errData.details || 'Failed to submit donation')
      }

      const data = await response.json()

      console.log('Donation response:', data)

      // Use Midtrans Snap popup (not redirect)
      if (data.snapToken && window.snap) {
        window.snap.pay(data.snapToken, {
                onSuccess: async function (result: MidtransSnapResponse) {
            console.log('✅ DONATION SUCCESS', result)

            // Verify payment status with backend
            try {
              const verifyResponse = await fetch('/api/csr-activities/participate/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participationId: data.id }),
              })
              if (verifyResponse.ok) {
                console.log('✅ Donation verified')
                // Wait briefly for DB to settle
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            } catch (err) {
              console.error('❌ Error during verify:', err)
            }

            // Redirect to CSR donation detail page
            router.push(`/csr-donations/${data.id}`)
          },
          onPending: function (result: MidtransSnapResponse) {
            console.log('⏳ Donation pending:', result)
            // Keep waiting for payment
          },
          onError: function (result: MidtransSnapResponse) {
            console.log('❌ Donation error:', result)
            setSubmitting(false)
          },
          onClose: function () {
            console.log('❌ Donation cancelled by user')
            setSubmitting(false)
          },
        })
      } else {
        throw new Error('Midtrans Snap not available')
      }
    } catch (error) {
      console.error('Donation error:', error)
      showError(error instanceof Error ? error.message : 'Gagal memproses donasi')
      setSubmitting(false)
    }
  }

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="page pb-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-border rounded-full border-t-primary animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-textMuted">Memuat detail kegiatan...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="page pb-24 px-5 pt-8 text-center">
          <p className="text-3xl mb-3">❌</p>
          <p className="text-sm text-textMuted">Kegiatan tidak ditemukan</p>
          <button
            onClick={() => router.back()}
            className="mt-6 px-6 py-2 btn-primary rounded-xl text-sm font-semibold"
          >
            Kembali
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const donationStatus = (() => {
    if (activity.status === 'completed') return 'completed'
    if (activity.status === 'cancelled') return 'cancelled'
    const now = new Date()
    const start = new Date(activity.start_date)
    const end = new Date(activity.end_date)
    end.setHours(23, 59, 59, 999)
    if (now < start) return 'not_started'
    if (now > end) return 'period_ended'
    return 'open'
  })()

  return (
    <div className="app-container">
      <StatusBar />

      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center hover:bg-primary/10 transition-colors"
            >
              <FaArrowLeft className="text-primary" />
            </button>
            <h1 className="text-lg font-bold text-textDark">Detail Kegiatan</h1>
          </div>
        </div>

        {/* Activity Image */}
        {activity.image_url ? (
          <div
            className="w-full h-48 bg-gray-200 bg-cover bg-center"
            style={{
              backgroundImage: `url(${getImageUrl(activity.image_url)})`,
            }}
          ></div>
        ) : (
          <div className="w-full h-48 bg-primaryLight flex items-center justify-center text-6xl">
            {categoryIcons[activity.category] || '🌍'}
          </div>
        )}

        {/* Content */}
        <div className="px-5 pt-6">
          {/* Title & Status */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-textDark mb-3">
              {activity.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-3 py-1.5 bg-primaryLight rounded-lg text-xs font-semibold text-primary">
                {categoryLabels[activity.category] || activity.category}
              </span>
              <span
                className={`inline-block px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  activity.status === 'active'
                    ? 'bg-green-100 text-gain'
                    : activity.status === 'upcoming'
                    ? 'bg-blue-100 text-blue-700'
                    : activity.status === 'completed'
                    ? 'bg-gray-100 text-textMuted'
                    : 'bg-red-100 text-loss'
                }`}
              >
                {statusTexts[activity.status]}
              </span>
              <span className="text-xs text-textMuted font-medium">
                oleh {activity.tenant.name}
              </span>
            </div>
          </div>

          {/* Key Info */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-primaryLight rounded-xl p-3 col-span-2">
              <p className="text-xs text-textMuted mb-1">📍 Lokasi</p>
              <p className="text-sm font-semibold text-textDark">{activity.location}</p>
            </div>
            <div className="bg-primaryLight rounded-xl p-3">
              <p className="text-xs text-textMuted mb-1">📅 Tanggal Kegiatan</p>
              <p className="text-sm font-semibold text-textDark">{formatDate(activity.activity_date)}</p>
            </div>
            <div className="bg-primaryLight rounded-xl p-3">
              <p className="text-xs text-textMuted mb-1">🎯 Target Dukungan</p>
              <p className="text-sm font-semibold text-textDark">{formatRupiah(activity.target_donation_amount)}</p>
            </div>
            <div className="bg-primaryLight rounded-xl p-3 col-span-2">
              <p className="text-xs text-textMuted mb-1">📋 Periode Donasi</p>
              <p className="text-sm font-semibold text-textDark">{formatDate(activity.start_date)} — {formatDate(activity.end_date)}</p>
            </div>
          </div>

          {/* Donation Progress */}
          <div className="bg-white border border-border rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-textDark">Progress Donasi</span>
              <span className="text-xs text-primary font-bold">
                {Math.round((activity.total_donations_amount / activity.target_donation_amount) * 100)}%
              </span>
            </div>
            <div className="w-full bg-border rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-primary h-2 transition-all duration-300"
                style={{
                  width: `${Math.min((activity.total_donations_amount / activity.target_donation_amount) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-textMuted">
              <span>{formatRupiah(activity.total_donations_amount)}</span>
              <span>{formatRupiah(activity.target_donation_amount)}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-textDark mb-2">Deskripsi</h3>
            <p className="text-sm text-textMuted leading-relaxed">
              {activity.description}
            </p>
          </div>

          {/* Updates / News */}
          {updates.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-textDark mb-3">📰 Berita & Update Terbaru</h3>
              <div className="space-y-4">
                {updates.map((update) => {
                  const photos: string[] = Array.isArray(update.photos) ? update.photos : []
                  const slide = activeSlides[update.id] ?? 0
                  return (
                    <div key={update.id} className="bg-white border border-border rounded-xl overflow-hidden">
                      {/* Photo slider */}
                      {photos.length > 0 && (
                        <div className="relative w-full h-48 bg-gray-100">
                          <Image
                            src={getImageUrl(photos[slide])}
                            alt={`${update.title} foto ${slide + 1}`}
                            fill
                            sizes="430px"
                            className="object-cover"
                          />
                          {photos.length > 1 && (
                            <>
                              <button
                                onClick={() => setActiveSlides(prev => ({ ...prev, [update.id]: (slide - 1 + photos.length) % photos.length }))}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition"
                              >
                                <FaChevronLeft className="text-xs" />
                              </button>
                              <button
                                onClick={() => setActiveSlides(prev => ({ ...prev, [update.id]: (slide + 1) % photos.length }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition"
                              >
                                <FaChevronRight className="text-xs" />
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {photos.map((_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setActiveSlides(prev => ({ ...prev, [update.id]: i }))}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === slide ? 'bg-white w-3' : 'bg-white/50'}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <div className="p-4">
                        <p className="text-xs text-textMuted mb-1">
                          {new Date(update.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <h4 className="text-sm font-bold text-textDark mb-2">{update.title}</h4>
                        <p className="text-sm text-textMuted leading-relaxed whitespace-pre-line">{update.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-white border border-border rounded-xl p-4 mb-6">            <p className="text-xs font-bold text-textDark mb-3">Kontak</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-primaryLight flex items-center justify-center text-sm flex-none">👤</span>
                <span className="text-sm text-textDark">{activity.contact_person}</span>
              </div>
              <a href={`tel:${activity.contact_phone}`} className="flex items-center gap-3 group">
                <span className="w-7 h-7 rounded-full bg-primaryLight flex items-center justify-center text-sm flex-none">📞</span>
                <span className="text-sm text-primary font-medium group-active:underline">{activity.contact_phone}</span>
              </a>
              <a href={`mailto:${activity.contact_email}`} className="flex items-center gap-3 group">
                <span className="w-7 h-7 rounded-full bg-primaryLight flex items-center justify-center text-sm flex-none">📧</span>
                <span className="text-sm text-primary font-medium truncate group-active:underline">{activity.contact_email}</span>
              </a>
            </div>
          </div>

          {/* Donation Section */}
          {donationStatus !== 'open' ? (
            <div className="bg-gray-50 border border-border rounded-xl p-5 mb-8 text-center">
              <p className="text-2xl mb-2">
                {donationStatus === 'not_started' ? '🕐'
                  : donationStatus === 'period_ended' ? '⏰'
                  : donationStatus === 'completed' ? '✅'
                  : '❌'}
              </p>
              <p className="text-sm font-semibold text-textDark mb-1">
                {donationStatus === 'not_started' ? 'Belum Masuk Periode Donasi'
                  : donationStatus === 'period_ended' ? 'Periode Donasi Telah Berakhir'
                  : donationStatus === 'completed' ? 'Kegiatan Telah Selesai'
                  : 'Kegiatan Dibatalkan'}
              </p>
              <p className="text-xs text-textMuted">
                {donationStatus === 'not_started'
                  ? `Donasi dibuka mulai ${formatDate(activity.start_date)}`
                  : donationStatus === 'period_ended'
                  ? `Periode donasi berakhir pada ${formatDate(activity.end_date)}`
                  : donationStatus === 'completed'
                  ? 'Terima kasih atas dukungan semua pihak untuk kegiatan ini.'
                  : 'Kegiatan ini telah dibatalkan dan tidak menerima donasi.'}
              </p>
            </div>
          ) : (
          <div className="bg-white border border-border rounded-xl p-4 mb-8">
            <h3 className="text-sm font-bold text-textDark mb-2">Dukung Kegiatan Ini</h3>
            <p className="text-xs text-textMuted mb-4">
              Berkontribusi dengan donasi Anda untuk membantu mewujudkan kegiatan ini dan dampak positif bagi lingkungan.
            </p>

            <form onSubmit={handleDonate} className="space-y-4">
              {/* Donation Amount */}
              <div>
                  <label className="block text-xs font-semibold text-textDark mb-1">
                    Jumlah Donasi
                  </label>
                  <p className="text-[11px] text-textMuted mb-2">Min Rp 1 · Maks Rp 5.000.000</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted text-sm">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={donationAmount ? Number(donationAmount).toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '')
                        if (raw === '' || parseInt(raw) <= 5000000) {
                          setDonationAmount(raw)
                        }
                      }}
                      placeholder="100.000"
                      className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-white text-sm text-textDark focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Quick Amount Selection */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[100000, 250000, 500000, 1000000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setDonationAmount(amount.toString())}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
                          donationAmount === amount.toString()
                            ? 'btn-primary'
                            : 'bg-primaryLight text-primary border border-primary'
                        }`}
                      >
                        {(amount / 1000).toFixed(0)}K
                      </button>
                    ))}
                  </div>
                </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !donationAmount}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all mt-6 ${
                  submitting || !donationAmount
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'btn-primary active:scale-95'
                }`}
              >
                {submitting ? 'Memproses...' : 'Lanjut ke Pembayaran'}
              </button>
            </form>
          </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
