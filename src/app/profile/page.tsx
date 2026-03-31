'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import StatusBar from '@/components/StatusBar'
import BottomNav from '@/components/BottomNav'
import { FaSignOutAlt, FaUser, FaPhone, FaEnvelope, FaCalendar, FaEdit } from 'react-icons/fa'

interface UserStats {
  totalTrips: number
  totalCSRDonations: number
  totalCertificates: number
  totalCO2Offset: number
  totalCO2Emitted: number
}

interface Trip {
  id: string
  name: string
  type: string
  start_date: string
  status: string
}

interface CSRDonation {
  id: string
  csr_activity_id: string
  type: string
  amount: number
  status: string
  created_at: string
  activity_title: string
  thank_you_certificate_url?: string
  participation_certificate_url?: string
}

interface Certificate {
  id: string
  co2_equivalent: number
  amount: number
  units?: number
  certificate_id: string
  status: string
  purchase_date: string
  thank_you_certificate_url?: string
  emission_reduction_certificate_url?: string
  product_code?: string
  product_name?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [donations, setDonations] = useState<CSRDonation[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trips' | 'donations' | 'certificates' | 'account'>(() => {
    const tabParam = searchParams?.get('tab') as any
    return (tabParam === 'certificates' || tabParam === 'donations' || tabParam === 'trips' || tabParam === 'account') 
      ? tabParam 
      : 'dashboard'
  })
  const [purchasedId, setPurchasedId] = useState<string | null>(() => {
    return searchParams?.get('purchased') || null
  })
  const [showEditNameModal, setShowEditNameModal] = useState(false)
  const [showEditPhoneModal, setShowEditPhoneModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingPhone, setSavingPhone] = useState(false)
  const [userPhone, setUserPhone] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchUserData()
    }
  }, [status])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Fetch profile to get phone number
      const profileRes = await fetch('/api/auth/profile')
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setUserPhone(profileData.profile?.metadata?.phone || '')
      }
      
      // Fetch stats
      const statsRes = await fetch('/api/user/stats')
      if (statsRes.ok) {
        setStats(await statsRes.json())
      }

      // Fetch trips
      const tripsRes = await fetch('/api/journeys')
      if (tripsRes.ok) {
        const data = await tripsRes.json()
        setTrips(data.slice(0, 5))
      }

      // Fetch CSR donations
      const donationsRes = await fetch('/api/user/csr-donations')
      if (donationsRes.ok) {
        setDonations(await donationsRes.json())
      }

      // Fetch certificates
      const certsRes = await fetch('/api/user/certificates')
      if (certsRes.ok) {
        setCertificates(await certsRes.json())
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCertificate = (fileUrl: string, fileName: string) => {
    if (!fileUrl) {
      alert('Sertifikat belum tersedia')
      return
    }
    
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName || 'certificate.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth/signin' })
  }

  const handleOpenEditName = () => {
    setEditName(session?.user?.name || '')
    setShowEditNameModal(true)
  }

  const handleOpenEditPhone = () => {
    setEditPhone(userPhone || '')
    setShowEditPhoneModal(true)
  }

  const handleSaveName = async () => {
    if (!editName.trim()) {
      alert('Nama tidak boleh kosong')
      return
    }

    setSavingName(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: editName.trim() }),
      })

      if (response.ok) {
        alert('Nama berhasil diperbarui')
        setShowEditNameModal(false)
        // Refresh session
        router.refresh()
      } else {
        alert('Gagal menyimpan nama')
      }
    } catch (error) {
      console.error('Error saving name:', error)
      alert('Terjadi kesalahan')
    } finally {
      setSavingName(false)
    }
  }

  const handleSavePhone = async () => {
    if (!editPhone.trim()) {
      alert('Nomor telepon tidak boleh kosong')
      return
    }

    setSavingPhone(true)
    try {
      const response = await fetch('/api/user/profile/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: editPhone.trim() }),
      })

      if (response.ok) {
        alert('Nomor telepon berhasil diperbarui')
        setUserPhone(editPhone.trim())
        setShowEditPhoneModal(false)
      } else {
        alert('Gagal menyimpan nomor telepon')
      }
    } catch (error) {
      console.error('Error saving phone:', error)
      alert('Terjadi kesalahan')
    } finally {
      setSavingPhone(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="page pb-24 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-border rounded-full border-t-primary animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-textMuted">Memuat profil...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-32">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white pt-6 pb-8 px-5">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <FaUser className="text-2xl" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{session.user?.name || 'User'}</h1>
                <p className="text-white/80 text-sm">{session.user?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats?.totalTrips || 0}</div>
              <div className="text-xs text-white/80">Perjalanan</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats?.totalCSRDonations || 0}</div>
              <div className="text-xs text-white/80">CSR</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats?.totalCertificates || 0}</div>
              <div className="text-xs text-white/80">Sertifikat</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="sticky top-0 bg-white border-b border-border z-40">
          <div className="flex gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'trips', label: 'Perjalanan' },
                { id: 'donations', label: 'CSR' },
                { id: 'certificates', label: 'Sertifikat' },
                { id: 'account', label: 'Akun' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-textMuted hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5 py-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total CO2 Emitted</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalCO2Emitted.toFixed(2) || '0'} kg</p>
                  </div>
                  <div className="text-4xl">🔴</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total CO2 Offset</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalCO2Offset.toFixed(2) || '0'} kg</p>
                  </div>
                  <div className="text-4xl">🟢</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Carbon Footprint</p>
                    <p className="text-2xl font-bold text-gray-900">{((stats?.totalCO2Emitted || 0) - (stats?.totalCO2Offset || 0)).toFixed(2)} kg</p>
                  </div>
                  <div className="text-4xl">📊</div>
                </div>
              </div>
            </div>
          )}

          {/* Trips Tab */}
          {activeTab === 'trips' && (
            <div className="space-y-3">
              {trips.length > 0 ? (
                trips.map((trip) => (
                  <div key={trip.id} className="bg-white border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{trip.name}</h3>
                        <p className="text-sm text-textMuted">{trip.type === 'hajj' ? 'Haji' : 'Umrah'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        trip.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : trip.status === 'ongoing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {trip.status === 'completed' ? 'Selesai' : trip.status === 'ongoing' ? 'Sedang Berjalan' : 'Akan Datang'}
                      </span>
                    </div>
                    <p className="text-xs text-textMuted flex items-center gap-1">
                      <FaCalendar className="w-3 h-3" />
                      {new Date(trip.start_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-textMuted">Belum ada riwayat perjalanan</p>
                </div>
              )}
            </div>
          )}

          {/* CSR Donations Tab */}
          {activeTab === 'donations' && (
            <div className="space-y-3">
              {donations.length > 0 ? (
                donations.map((donation) => (
                  <div key={donation.id} className="bg-white border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{donation.activity_title}</h3>
                        <p className="text-sm text-primary font-bold">{donation.amount > 0 ? `Rp ${donation.amount.toLocaleString('id-ID')}` : 'Volunteer'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ml-2 ${
                        donation.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {donation.status === 'confirmed' ? 'Terkonfirmasi' : 'Menunggu'}
                      </span>
                    </div>
                    <p className="text-xs text-textMuted mb-3">
                      {new Date(donation.created_at).toLocaleDateString('id-ID')}
                    </p>
                    
                    {donation.status === 'confirmed' && (
                      <div className="flex gap-2 flex-wrap">
                        {donation.thank_you_certificate_url && (
                          <button
                            onClick={() => handleDownloadCertificate(donation.thank_you_certificate_url!, `sertifikat-ucapan-csr-${donation.id}.pdf`)}
                            className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                          >
                            Unduh Say Thank You
                          </button>
                        )}
                        {donation.participation_certificate_url && (
                          <button
                            onClick={() => handleDownloadCertificate(donation.participation_certificate_url!, `sertifikat-partisipasi-csr-${donation.id}.pdf`)}
                            className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90 transition"
                          >
                            Unduh Sertifikat Partisipasi
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-textMuted">Belum ada donasi CSR</p>
                </div>
              )}
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div className="space-y-3">
              {certificates.length > 0 ? (
                certificates.map((cert) => {
                  const isNewPurchase = purchasedId === cert.id
                  
                  return (
                    <div 
                      key={cert.id} 
                      className={`bg-white rounded-lg p-4 hover:shadow-md transition-shadow ${
                        isNewPurchase ? 'border-2 border-green-500 shadow-lg' : 'border border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{cert.product_name || 'Sertifikat Karbon'}</h3>
                            {isNewPurchase && <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Baru!</span>}
                          </div>
                          <p className="text-sm text-gray-600">{cert.units || cert.co2_equivalent} tCO2e</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          cert.status === 'confirmed' || cert.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {cert.status === 'confirmed' || cert.status === 'completed' ? 'Aktif' : 'Menunggu'}
                        </span>
                      </div>
                      <p className="text-xs text-textMuted mb-3">
                        Rp {cert.amount.toLocaleString('id-ID')} • {new Date(cert.purchase_date).toLocaleDateString('id-ID')}
                      </p>
                      
                      {(cert.status === 'confirmed' || cert.status === 'completed') ? (
                        <div className="flex gap-2 flex-wrap">
                          {cert.thank_you_certificate_url ? (
                            <button
                              onClick={() => handleDownloadCertificate(cert.thank_you_certificate_url!, `sertifikat-ucapan-${cert.product_code || cert.id}.pdf`)}
                              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                            >
                              📥 Unduh Say Thank You
                            </button>
                          ) : (
                            <div className="text-xs text-textMuted">Sertifikat Say Thank You akan tersedia segera</div>
                          )}
                          {cert.emission_reduction_certificate_url ? (
                            <button
                              onClick={() => handleDownloadCertificate(cert.emission_reduction_certificate_url!, `sertifikat-emisi-${cert.product_code || cert.id}.pdf`)}
                              className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary/90 transition"
                            >
                              📥 Unduh Sertifikat Emisi
                            </button>
                          ) : (
                            <div className="text-xs text-textMuted">Sertifikat Emisi sedang diproses</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded flex items-center gap-2">
                          <span>⏳</span>
                          <span>Pembayaran Anda sedang diproses. Sertifikat akan tersedia setelah konfirmasi.</span>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-textMuted">Belum ada sertifikat karbon</p>
                </div>
              )}
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="bg-white border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <FaUser className="text-primary text-lg" />
                  <div className="flex-1">
                    <p className="text-xs text-textMuted">Nama Lengkap</p>
                    <p className="font-semibold text-gray-900">{session.user?.name || '-'}</p>
                  </div>
                  <button 
                    onClick={handleOpenEditName}
                    className="text-primary hover:text-primary/80 transition"
                  >
                    <FaEdit />
                  </button>
                </div>

                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <FaEnvelope className="text-primary text-lg" />
                  <div className="flex-1">
                    <p className="text-xs text-textMuted">Email</p>
                    <p className="font-semibold text-gray-900 break-all">{session.user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FaPhone className="text-primary text-lg" />
                  <div className="flex-1">
                    <p className="text-xs text-textMuted">Nomor Telepon</p>
                    <p className="font-semibold text-gray-900">{userPhone || '-'}</p>
                  </div>
                  <button 
                    onClick={handleOpenEditPhone}
                    className="text-primary hover:text-primary/80 transition"
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>

              {/* Account Actions */}
              <div className="space-y-2">
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-lg transition-colors">
                  Ubah Password
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Edit Nama Lengkap</h2>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Masukkan nama lengkap"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditNameModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-gray-900 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {savingName ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Phone Modal */}
      {showEditPhoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Edit Nomor Telepon</h2>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="Masukkan nomor telepon (misal: +62 821-1234-5678)"
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditPhoneModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-gray-900 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {savingPhone ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
