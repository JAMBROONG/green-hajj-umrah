'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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

  // Check payment config on mount
  useEffect(() => {
    const checkPaymentConfig = async () => {
      try {
        const response = await fetch('/api/payment-config/check')
        if (!response.ok) {
          throw new Error('Failed to check payment config')
        }
        const data = await response.json()
        setPaymentConfigured(data.configured)
      } catch (err) {
        console.error('Failed to check payment config:', err)
        setPaymentConfigured(false)
      }
    }

    checkPaymentConfig()
  }, [])

  useEffect(() => {
    // Only fetch activities if payment is configured
    if (!paymentConfigured) {
      setLoading(false)
      return
    }

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
  }, [selectedCategory, selectedStatus, paymentConfigured])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="app-container">
      <StatusBar />

      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border shadow-sm">
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

        {/* Filters */}
        {paymentConfigured ? (
        <div className="px-5 pt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-textDark mb-2">
              Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl bg-white text-sm text-textDark focus:border-primary focus:outline-none transition-colors"
            >
              <option value="all">Semua Kategori</option>
              <option value="reforestation">🌳 Penanaman Pohon</option>
              <option value="waste_management">♻️ Pengelolaan Sampah</option>
              <option value="energy_efficiency">⚡ Efisiensi Energi</option>
              <option value="water_conservation">💧 Konservasi Air</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-textDark mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl bg-white text-sm text-textDark focus:border-primary focus:outline-none transition-colors"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="upcoming">Akan Datang</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>
        ) : (
          <div className="px-5 pt-8 text-center">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm text-textMuted">Produk tidak tersedia</p>
          </div>
        )}

        {/* Loading State */}
        {paymentConfigured && loading && (
          <div className="px-5 pt-8 text-center">
            <div className="inline-block">
              <div className="w-8 h-8 border-4 border-border rounded-full border-t-primary animate-spin"></div>
            </div>
            <p className="mt-4 text-sm text-textMuted">Memuat kegiatan...</p>
          </div>
        )}

        {/* Activities Grid */}
        {paymentConfigured && !loading && activities.length > 0 && (
          <div className="px-5 pt-8 space-y-6 pb-6">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/csr-activities/${activity.id}`}
              >
                <div className="bg-white rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all mt-5">
                  {/* Image */}
                  {activity.image_url ? (
                    <div
                      className="w-full h-32 bg-gray-200 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${activity.image_url})`,
                      }}
                    ></div>
                  ) : (
                    <div className="w-full h-32 bg-primaryLight flex items-center justify-center text-3xl">
                      {categoryIcons[activity.category] || '🌍'}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    {/* Title */}
                    <h3 className="text-sm font-semibold text-textDark mb-1 line-clamp-2">
                      {activity.title}
                    </h3>

                    {/* Tenant & Category */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block px-2 py-1 bg-primaryLight rounded text-xs font-medium text-primary">
                        {activity.category.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
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
                    </div>

                    {/* Description */}
                    <p className="text-xs text-textMuted mb-3 line-clamp-2">
                      {activity.description}
                    </p>

                    {/* Location & Date */}
                    <div className="space-y-1 text-xs text-textMuted mb-3">
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span className="line-clamp-1">{activity.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>{formatDate(activity.start_date)}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 pt-3 border-t border-border">
                      <div className="flex-1">
                        <p className="text-xs text-textMuted mb-1">Peserta</p>
                        <p className="text-sm font-semibold text-textDark">
                          {activity.participants_count}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-textMuted mb-1">Durasi</p>
                        <p className="text-sm font-semibold text-textDark">
                          {activity.effort_hours}h
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && activities.length === 0 && (
          <div className="px-5 pt-8 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm text-textMuted">
              Tidak ada kegiatan CSR yang sesuai
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
