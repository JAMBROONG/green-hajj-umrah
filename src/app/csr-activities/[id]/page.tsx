'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import StatusBar from '@/components/StatusBar'
import BottomNav from '@/components/BottomNav'
import { FaArrowLeft } from 'react-icons/fa'

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
  registration_deadline: string
  participants_count: number
  effort_hours: number
  image_url: string | null
  contact_person: string
  contact_phone: string
  contact_email: string
  requirements?: any
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
        throw new Error('Failed to submit participation')
      }

      const data = await response.json()
      
      console.log('Participation response:', data)

      // Redirect to Midtrans payment page for donation payment
      if (data.snapUrl) {
        window.location.href = data.snapUrl
      } else if (data.snapToken) {
        // Alternative: use Snap popup
        window.location.href = `https://app.sandbox.midtrans.com/snap/v1/transactions/${data.snapToken}`
      } else {
        alert('✅ Donasi Anda berhasil terdaftar!')
        router.push('/csr-activities')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Terjadi kesalahan. Silakan coba lagi.')
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
              backgroundImage: `url(${activity.image_url})`,
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
              <span className="text-xs text-textMuted">📅 Tanggal Mulai</span>
              <span className="text-sm font-semibold text-textDark">
                {formatDate(activity.start_date)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-textMuted">⏰ Durasi</span>
              <span className="text-sm font-semibold text-textDark">
                {activity.effort_hours} jam
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-textMuted">👥 Peserta</span>
              <span className="text-sm font-semibold text-textDark">
                {activity.participants_count} orang
              </span>
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

          {/* Participation Form */}
          <div className="bg-white border border-border rounded-xl p-4 mb-8">
            <h3 className="text-sm font-bold text-textDark mb-4">Ikuti Kegiatan</h3>

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
                      min="10000"
                      step="10000"
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
