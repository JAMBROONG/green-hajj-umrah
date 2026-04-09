'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import StatusBar from '@/components/StatusBar'
import BottomNav from '@/components/BottomNav'
import { FaArrowLeft } from 'react-icons/fa'
import { getImageUrl } from '@/lib/image-utils'

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
  const { id: activityId } = use(params)
  const [activity, setActivity] = useState<CSRActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [donationAmount, setDonationAmount] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

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
        const response = await fetch(`/api/csr-activities/${activityId}`)
        if (!response.ok) {
          console.error('API response:', response.status, response.statusText)
          throw new Error('Failed to fetch activity')
        }
        const data = await response.json()
        console.log('Fetched activity:', data)
        setActivity(data)
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
      alert('Masukkan jumlah donasi')
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
          amount: parseFloat(donationAmount),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit donation')
      }

      const data = await response.json()

      console.log('Donation response:', data)

      // Use Midtrans Snap popup (not redirect)
      if (data.snapToken && window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess: async function (result: MidtransSnapResponse) {
            console.log('✅ DONATION SUCCESS', result)
            alert('✅ Donasi Berhasil!')

            let verifySuccess = false

            // Verify payment status with backend
            try {
              console.log('🔍 Verifying donation...', { participationId: data.id })
              const verifyResponse = await fetch('/api/csr-activities/participate/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ participationId: data.id }),
              })

              console.log('📡 Verify response status:', verifyResponse.status)

              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json()
                console.log('✅ Donation verified:', JSON.stringify(verifyData, null, 2))
                verifySuccess = true
                
                // Wait a bit for DB to settle
                await new Promise(resolve => setTimeout(resolve, 1000))
              } else {
                const errorData = await verifyResponse.json()
                console.error('❌ Verify error:', { status: verifyResponse.status, error: errorData })
              }
            } catch (err) {
              console.error('❌ Error during verify:', err)
            }

            // Redirect to profile with donation tab ONLY after verify
            console.log('🚀 Redirecting to profile...', { verifySuccess })
            router.push(`/profile?tab=donations&donated=${data.id}`)
          },
          onPending: function (result: MidtransSnapResponse) {
            console.log('⏳ Donation pending:', result)
            // Keep waiting for payment
          },
          onError: function (result: MidtransSnapResponse) {
            console.log('❌ Donation error:', result)
            alert('Donasi gagal. Silakan coba lagi.')
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
      alert(error instanceof Error ? error.message : 'Donation error occurred')
      setSubmitting(false)
    }
  }

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
            className="mt-6 px-6 py-2 bg-primary text-white rounded-xl text-sm font-semibold"
          >
            Kembali
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

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
          <div className="bg-primaryLight rounded-xl p-4 mb-6 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-textMuted">📍 Lokasi</span>
              <span className="text-sm font-semibold text-textDark">
                {activity.location}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-textMuted">📅 Tanggal Kegiatan</span>
              <span className="text-sm font-semibold text-textDark">
                {formatDate(activity.activity_date)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-textMuted">📋 Periode Pendaftaran</span>
              <span className="text-sm font-semibold text-textDark">
                {formatDate(activity.start_date)} s/d {formatDate(activity.end_date)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-textMuted">� Target Dukungan</span>
              <span className="text-sm font-semibold text-textDark">
                Rp {activity.target_donation_amount.toLocaleString('id-ID')}
              </span>
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
              <span>Rp {activity.total_donations_amount.toLocaleString('id-ID')}</span>
              <span>Rp {activity.target_donation_amount.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-textDark mb-2">Deskripsi</h3>
            <p className="text-sm text-textMuted leading-relaxed">
              {activity.description}
            </p>
          </div>

          {/* Contact Info */}
          <div className="bg-white border border-border rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-textDark mb-3">Kontak</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-xs text-textMuted min-w-fit">👤 PIC:</span>
                <span className="text-sm text-textDark">{activity.contact_person}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs text-textMuted min-w-fit">📞 Telepon:</span>
                <span className="text-sm text-primary font-medium">
                  {activity.contact_phone}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs text-textMuted min-w-fit">📧 Email:</span>
                <span className="text-sm text-primary font-medium">
                  {activity.contact_email}
                </span>
              </div>
            </div>
          </div>

          {/* Donation Section */}
          <div className="bg-white border border-border rounded-xl p-4 mb-8">
            <h3 className="text-sm font-bold text-textDark mb-2">Dukung Kegiatan Ini</h3>
            <p className="text-xs text-textMuted mb-4">
              Berkontribusi dengan donasi Anda untuk membantu mewujudkan kegiatan ini dan dampak positif bagi lingkungan.
            </p>

            <form onSubmit={handleDonate} className="space-y-4">
              {/* Donation Amount */}
              <div>
                  <label className="block text-xs font-semibold text-textDark mb-2">
                    Jumlah Donasi (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted">Rp</span>
                    <input
                      type="number"
                      min="1"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      placeholder="100000"
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
                            ? 'bg-primary text-white'
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
                    : 'bg-primary hover:bg-primary-dark active:scale-95'
                }`}
              >
                {submitting ? 'Memproses...' : 'Lanjut ke Pembayaran'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
