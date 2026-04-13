'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StatusBar from '@/components/StatusBar'
import BottomNav from '@/components/BottomNav'
import { getImageUrl } from '@/lib/image-utils'
import { FaArrowLeft, FaLeaf, FaRecycle, FaBolt, FaTint, FaGlobe } from 'react-icons/fa'

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

const categoryIconComponents: Record<string, React.ReactNode> = {
  reforestation: <FaLeaf className="text-green-500" size={36} />,
  waste_management: <FaRecycle className="text-teal-500" size={36} />,
  energy_efficiency: <FaBolt className="text-yellow-500" size={36} />,
  water_conservation: <FaTint className="text-blue-500" size={36} />,
}

const categoryBgColors: Record<string, string> = {
  reforestation: 'bg-green-50',
  waste_management: 'bg-teal-50',
  energy_efficiency: 'bg-yellow-50',
  water_conservation: 'bg-blue-50',
}

const categoryLabels: Record<string, string> = {
  reforestation: 'Pohon',
  waste_management: 'Sampah',
  energy_efficiency: 'Energi',
  water_conservation: 'Air',
}

const statusTexts: Record<string, string> = {
  active: 'Aktif',
  upcoming: 'Akan Datang',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export default function CSRActivitiesPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<CSRActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [paymentConfigured, setPaymentConfigured] = useState<boolean | null>(null)

  // Check payment config on mount (for donation features)
  useEffect(() => {
    const checkPaymentConfig = async () => {
      try {
        const response = await fetch('/api/payment-config/check')
        if (!response.ok) {
          setPaymentConfigured(false)
          return
        }
        const data = await response.json()
        setPaymentConfigured(data.configured)
      } catch {
        // Silently fail - payment config is optional
        setPaymentConfigured(false)
      }
    }

    checkPaymentConfig()
  }, [])

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()

        if (selectedCategory !== 'all') {
          params.append('category', selectedCategory)
        }

        if (selectedStatus !== 'all') {
          params.append('status', selectedStatus)
        }

        // Backend auto-filters by user's tenant_id from session
        const response = await fetch(`/api/csr-activities?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch activities')
        }

        const data = await response.json()
        setActivities(data)
      } catch (err) {
        console.error('Failed to fetch CSR activities:', err)
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [selectedCategory, selectedStatus])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const categories = [
    { value: 'all', label: 'Semua', icon: '🌐' },
    { value: 'reforestation', label: 'Pohon', icon: '🌳' },
    { value: 'waste_management', label: 'Sampah', icon: '♻️' },
    { value: 'energy_efficiency', label: 'Energi', icon: '⚡' },
    { value: 'water_conservation', label: 'Air', icon: '💧' },
  ]

  const statuses = [
    { value: 'all', label: 'Semua' },
    { value: 'active', label: 'Aktif' },
    { value: 'upcoming', label: 'Akan Datang' },
    { value: 'completed', label: 'Selesai' },
    { value: 'cancelled', label: 'Dibatalkan' },
  ]

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
            <div>
              <h1 className="text-lg font-bold text-textDark">Kegiatan CSR</h1>
              <p className="text-xs text-textMuted">Kurangi emisi sambil berbuat baik</p>
            </div>
          </div>
        </div>

        {/* Payment not configured */}
        {paymentConfigured === false && (
          <div className="px-5 pt-16 text-center">
            <p className="text-4xl mb-3">⚙️</p>
            <p className="text-sm font-semibold text-textDark mb-1">Fitur Belum Tersedia</p>
            <p className="text-xs text-textMuted">Konfigurasi pembayaran belum diatur</p>
          </div>
        )}

        {paymentConfigured && (
          <>
            {/* Category Filter Pills */}
            <div className="pt-4 pb-1 border-b border-border">
              <div
                className="flex gap-2 overflow-x-auto px-5 pb-3"
                style={{ scrollbarWidth: 'none' }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedCategory === cat.value
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-gray-100 text-textMuted'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Status Filter Pills */}
              <div
                className="flex gap-2 overflow-x-auto px-5 pb-3"
                style={{ scrollbarWidth: 'none' }}
              >
                {statuses.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSelectedStatus(s.value)}
                    className={`flex-none px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                      selectedStatus === s.value
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-textMuted border-border'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="pt-16 text-center">
                <div className="w-8 h-8 border-4 border-border rounded-full border-t-primary animate-spin mx-auto"></div>
                <p className="mt-4 text-sm text-textMuted">Memuat kegiatan...</p>
              </div>
            )}

            {/* Activities List */}
            {!loading && activities.length > 0 && (
              <div className="px-5 pt-3 space-y-3 pb-6">
                {activities.map((activity) => {
                  const progressPct = Math.min(
                    Math.round((activity.total_donations_amount / activity.target_donation_amount) * 100),
                    100
                  )
                  const isInactive = activity.status === 'completed' || activity.status === 'cancelled'
                  return (
                    <Link key={activity.id} href={`/csr-activities/${activity.id}`}>
                      <div className="bg-white rounded-2xl border border-border overflow-hidden flex active:scale-[0.98] transition-transform mt-3">
                        {/* Image */}
                        <div className={`w-[108px] flex-none self-stretch relative overflow-hidden ${activity.image_url ? '' : (categoryBgColors[activity.category] ?? 'bg-primaryLight')}`}>
                          {activity.image_url ? (
                            <img
                              src={getImageUrl(activity.image_url)}
                              alt={activity.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              {categoryIconComponents[activity.category] ?? <FaGlobe className="text-primary" size={36} />}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                          {/* Badges */}
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 bg-primaryLight rounded-full text-[10px] font-semibold text-primary leading-tight">
                              {categoryIcons[activity.category]} {categoryLabels[activity.category] ?? activity.category.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold leading-tight ${
                                activity.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : activity.status === 'upcoming'
                                  ? 'bg-blue-100 text-blue-700'
                                  : activity.status === 'completed'
                                  ? 'bg-gray-100 text-textMuted'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {statusTexts[activity.status]}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-semibold text-textDark leading-snug line-clamp-2 mb-1">
                            {activity.title}
                          </h3>

                          {/* Location */}
                          <p className="text-[11px] text-textMuted line-clamp-1 mb-2">
                            📍 {activity.location}
                          </p>

                          {/* Progress bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isInactive ? 'bg-gray-300' : 'bg-primary'}`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold flex-none ${isInactive ? 'text-textMuted' : 'text-primary'}`}>
                              {progressPct}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading && activities.length === 0 && (
              <div className="px-5 pt-16 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-sm font-semibold text-textDark mb-1">Tidak ada kegiatan</p>
                <p className="text-xs text-textMuted">Coba ubah filter kategori atau status</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
