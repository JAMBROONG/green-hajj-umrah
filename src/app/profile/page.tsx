'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import StatusBar from '@/components/StatusBar'
import BottomNav from '@/components/BottomNav'
import { useDialog } from '@/contexts/DialogContext'
import { FaSignOutAlt, FaUser, FaPhone, FaEnvelope, FaCalendar, FaEdit, FaLock } from 'react-icons/fa'

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
  startDate: string
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
  standard_series?: string
  standard_name?: string
  transaction_reference?: string
}

function ProfilePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const { showSuccess, showError } = useDialog()
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
  const [displayName, setDisplayName] = useState('')
  const [userAvatar, setUserAvatar] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showViewAvatar, setShowViewAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      setDisplayName(session?.user?.name || '')
      fetchUserData()
    }
  }, [status])

  // Load Midtrans Snap script for payment popup
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

    if (status === 'authenticated') {
      loadMidtrans()
    }
  }, [status])

  // Verify payment status when purchased ID is in URL
  // With polling retry if still pending
  useEffect(() => {
    if (purchasedId) {
      verifyPurchaseStatus(0, purchasedId)
    }
  }, [purchasedId])

  const verifyPurchaseStatus = async (retryCount: number = 0, purchaseIdOverride?: string) => {
    const maxRetries = 5
    const retryDelay = 2000 // 2 seconds between retries
    const verifyingPurchaseId = purchaseIdOverride || purchasedId

    try {
      console.log(`🔍 Verifying purchase status (attempt ${retryCount + 1}/${maxRetries}):`, verifyingPurchaseId)
      const verifyRes = await fetch('/api/carbon-products/purchase/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseId: verifyingPurchaseId }),
      })

      console.log('📊 Verify response status:', verifyRes.status)

      if (verifyRes.ok) {
        const verifyData = await verifyRes.json()
        console.log('✅ Verification result:', verifyData)
        
        // Refetch certificates to get updated status
        const certsRes = await fetch('/api/user/certificates')
        if (certsRes.ok) {
          const updatedCerts = await certsRes.json()
          console.log('📋 Updated certificates:', updatedCerts)
          setCertificates(updatedCerts)
          
          // Check if status is still pending
          const purchasedCert = updatedCerts.find((c: Certificate) => c.id === verifyingPurchaseId)
          if (purchasedCert && purchasedCert.status === 'pending' && retryCount < maxRetries) {
            console.log(`⏳ Status still pending, retrying in ${retryDelay}ms...`)
            setTimeout(() => verifyPurchaseStatus(retryCount + 1, purchaseIdOverride), retryDelay)
          } else if (purchasedCert) {
            console.log(`✅ Final status: ${purchasedCert.status}`)
            if (purchasedCert.status === 'confirmed' || purchasedCert.status === 'completed') {
              showSuccess('✅ Pembayaran berhasil! Sertifikat disimpan.')
            }
          }
        }
      } else {
        const errorData = await verifyRes.json()
        console.error('❌ Verify error:', verifyRes.status, errorData)
        
        // Retry if not a fatal error
        if (retryCount < maxRetries && (verifyRes.status === 500 || verifyRes.status === 503)) {
          console.log(`⏳ Server error, retrying in ${retryDelay}ms...`)
          setTimeout(() => verifyPurchaseStatus(retryCount + 1, purchaseIdOverride), retryDelay)
        }
      }
    } catch (error) {
      console.error('❌ Error verifying purchase:', error)
      
      // Retry on network error
      if (retryCount < maxRetries) {
        console.log(`⏳ Network error, retrying in ${retryDelay}ms...`)
        setTimeout(() => verifyPurchaseStatus(retryCount + 1, purchaseIdOverride), retryDelay)
      }
    }
  }

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Fetch profile to get phone number and name
      const profileRes = await fetch('/api/auth/profile')
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setUserPhone(profileData.profile?.metadata?.phone || '')
        setDisplayName(profileData.profile?.full_name || session?.user?.name || '')
        if (profileData.profile?.metadata?.avatar_url) {
          setUserAvatar(profileData.profile.metadata.avatar_url)
        }
      }
      
      // Fetch stats
      const statsRes = await fetch('/api/user/stats')
      if (statsRes.ok) {
        setStats(await statsRes.json())
      }

      // Fetch trips
      const tripsRes = await fetch('/api/trips')
      if (tripsRes.ok) {
        const data = await tripsRes.json()
        setTrips((data.trips || []).slice(0, 5))
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
      showError('Sertifikat belum tersedia')
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

  const handleContinuePayment = async (csr_activity_id: string, amount: number) => {
    try {
      const response = await fetch('/api/csr-activities/participate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csr_activity_id,
          type: 'donate',
          amount,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Gagal memulai pembayaran')
      }

      const data = await response.json()
      
      // Use Midtrans Snap popup (not redirect)
      if (data.snapToken && window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess: async function (result: MidtransSnapResponse) {
            console.log('✅ DONATION SUCCESS', result)
            showSuccess('✅ Donasi Berhasil!')

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
                showSuccess('✅ Status pembayaran diverifikasi!')
                
                // Wait a bit for DB to settle before refreshing
                await new Promise(resolve => setTimeout(resolve, 500))
              } else {
                const errorData = await verifyResponse.json()
                console.error('❌ Verify error:', { status: verifyResponse.status, error: errorData })
                showError(`Verifikasi: ${errorData.error || errorData.details || 'Unknown error'}`)
              }
            } catch (err) {
              console.error('❌ Error during verify:', err)
              showError(`Gagal verifikasi: ${err instanceof Error ? err.message : 'Error'}`)
            }

            // Refresh donations list multiple times with exponential backoff to ensure DB is updated
            let refreshAttempts = 0
            const maxRefreshAttempts = 5
            const refreshDonations = async () => {
              try {
                console.log(`📋 Refreshing donations (attempt ${refreshAttempts + 1}/${maxRefreshAttempts})...`)
                const donationsRes = await fetch('/api/user/csr-donations')
                if (donationsRes.ok) {
                  const updatedDonations = await donationsRes.json()
                  const targetDonation = updatedDonations.find((d: any) => d.id === data.id)
                  
                  console.log('✅ Donations refreshed:', {
                    count: updatedDonations.length,
                    targetDonation: {
                      id: targetDonation?.id,
                      status: targetDonation?.status,
                      amount: targetDonation?.amount,
                    },
                  })
                  
                  setDonations(updatedDonations)
                  
                  // Verify the specific donation was updated to confirmed
                  if (targetDonation?.status === 'confirmed') {
                    console.log('✅ Donation status confirmed in DB!')
                    showSuccess('✅ Donasi berhasil disimpan!')
                  } else if (refreshAttempts < maxRefreshAttempts - 1) {
                    refreshAttempts++
                    const delayMs = 500 * (refreshAttempts + 1) // Exponential backoff: 1s, 1.5s, 2s, 2.5s, 3s
                    console.log(`⏳ Status still ${targetDonation?.status || 'unknown'}, retrying in ${delayMs}ms...`)
                    await new Promise(resolve => setTimeout(resolve, delayMs))
                    await refreshDonations()
                  } else {
                    console.warn('⚠️ Max refresh attempts reached, status:', targetDonation?.status)
                    showError('Donation tersimpan tapi UI belum terupdate. Refresh halaman untuk melihat perubahan.')
                  }
                } else {
                  console.error('❌ Failed to fetch donations:', donationsRes.status)
                }
              } catch (err) {
                console.warn('⚠️ Failed to refresh donations:', err)
                if (refreshAttempts < maxRefreshAttempts - 1) {
                  refreshAttempts++
                  await new Promise(resolve => setTimeout(resolve, 500 * (refreshAttempts + 1)))
                  await refreshDonations()
                }
              }
            }
            
            await refreshDonations()

            fetchUserData()
          },
          onPending: function (result: MidtransSnapResponse) {
            console.log('⏳ Donation pending:', result)
            // Keep waiting for payment
          },
          onError: function (result: MidtransSnapResponse) {
            console.log('❌ Donation error:', result)
            showError('Donasi gagal. Silakan coba lagi.')
          },
          onClose: function () {
            console.log('❌ Donation cancelled by user')
          },
        })
      } else {
        throw new Error('Midtrans Snap tidak tersedia. Refresh halaman dan coba lagi.')
      }
    } catch (error) {
      console.error('Error:', error)
      showError(error instanceof Error ? error.message : 'Terjadi kesalahan')
    }
  }

  const handleOpenEditName = () => {
    setEditName(displayName || '')
    setShowEditNameModal(true)
  }

  const handleOpenEditPhone = () => {
    setEditPhone(userPhone || '')
    setShowEditPhoneModal(true)
  }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Ensure it's an image
      if (!file.type.startsWith('image/')) {
        showError('Pilih file gambar yang valid')
        return
      }

      setUploadingAvatar(true)
      
      try {
        // Read file and resize with canvas
        const base64Avatar = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const MAX_WIDTH = 256
              const MAX_HEIGHT = 256
              let width = img.width
              let height = img.height

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width
                  width = MAX_WIDTH
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height
                  height = MAX_HEIGHT
                }
              }

              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              ctx?.drawImage(img, 0, 0, width, height)
              
              // compress to webp or jpeg
              resolve(canvas.toDataURL('image/jpeg', 0.8))
            }
            img.onerror = (err) => reject(err)
          }
          reader.onerror = (err) => reject(err)
        })

        const response = await fetch('/api/auth/profile/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: base64Avatar }),
        })

        if (response.ok) {
          const data = await response.json()
          setUserAvatar(base64Avatar)
          showSuccess('Foto profil berhasil diperbarui')
        } else {
          const data = await response.json()
          showError(data.error || 'Gagal memperbarui foto profil')
        }
      } catch (error) {
        console.error('Error uploading avatar:', error)
        showError('Terjadi kesalahan saat mengunggah foto')
      } finally {
        setUploadingAvatar(false)
        // Reset input value so same file can be uploaded again if needed
        if (e.target) e.target.value = ''
      }
    }



  const handleSaveName = async () => {
    if (!editName.trim()) {
      showError('Nama tidak boleh kosong')
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
        const data = await response.json()
        // Update display name immediately from API response
        setDisplayName(data.profile?.full_name || editName.trim())
        showSuccess('Nama berhasil diperbarui')
        setShowEditNameModal(false)
      } else {
        showError('Gagal menyimpan nama')
      }
    } catch (error) {
      console.error('Error saving name:', error)
      showError('Terjadi kesalahan')
    } finally {
      setSavingName(false)
    }
  }

  const handleSavePhone = async () => {
    if (!editPhone.trim()) {
      showError('Nomor telepon tidak boleh kosong')
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
        // Update phone number immediately
        setUserPhone(editPhone.trim())
        showSuccess('Nomor telepon berhasil diperbarui')
        setShowEditPhoneModal(false)
      } else {
        showError('Gagal menyimpan nomor telepon')
      }
    } catch (error) {
      console.error('Error saving phone:', error)
      showError('Terjadi kesalahan')
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
              <div 
                className="w-16 h-16 bg-white/30 border-2 border-white/50 rounded-full flex items-center justify-center text-2xl font-bold cursor-pointer relative group overflow-hidden"
                onClick={() => setShowAvatarMenu(true)}
              >
                {uploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (displayName || session?.user?.name || 'U')[0].toUpperCase()
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <FaEdit className="text-white text-sm" />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
              />
              <div className="flex-1">
                <h1 className="text-xl font-bold">{displayName || session.user?.name || 'User'}</h1>
                <p className="text-white/80 text-sm">{session.user?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-base mb-0.5">✈️</div>
              <div className="text-2xl font-bold">{stats?.totalTrips || 0}</div>
              <div className="text-xs text-white/70">Perjalanan</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-base mb-0.5">🌿</div>
              <div className="text-2xl font-bold">{stats?.totalCSRDonations || 0}</div>
              <div className="text-xs text-white/70">Donasi CSR</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-base mb-0.5">📜</div>
              <div className="text-2xl font-bold">{stats?.totalCertificates || 0}</div>
              <div className="text-xs text-white/70">Sertifikat</div>
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
              {/* Net Carbon Balance — featured card */}
              {(() => {
                const netKg = (stats?.totalCO2Emitted || 0) - (stats?.totalCO2Offset || 0)
                const netTon = netKg / 1000
                const isNeutral = netKg <= 0
                return (
                  <div className={`rounded-2xl p-5 text-white ${
                    isNeutral
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                      : 'bg-gradient-to-br from-orange-500 to-red-500'
                  }`}>
                    <p className="text-sm text-white/80 mb-1">Net Carbon Balance</p>
                    <p className="text-4xl font-bold mb-3">{netTon.toFixed(3)} <span className="text-2xl font-normal">ton CO₂e</span></p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full">
                      <span>{isNeutral ? '✅' : '⚠️'}</span>
                      <span>{isNeutral ? 'Carbon Netral' : 'Perlu Offset Lebih'}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Emitted & Offset */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="text-2xl mb-2">🔴</div>
                  <p className="text-xs text-gray-500 mb-1">CO₂ Dihasilkan</p>
                  <p className="text-xl font-bold text-gray-900">{((stats?.totalCO2Emitted || 0) / 1000).toFixed(3)}</p>
                  <p className="text-xs text-gray-400">ton CO₂e</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="text-2xl mb-2">🟢</div>
                  <p className="text-xs text-gray-500 mb-1">CO₂ Dioffset</p>
                  <p className="text-xl font-bold text-gray-900">{((stats?.totalCO2Offset || 0) / 1000).toFixed(3)}</p>
                  <p className="text-xs text-gray-400">ton CO₂e</p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push('/carbon-market')}
                  className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-left hover:bg-primary/10 transition active:scale-95"
                >
                  <div className="text-2xl mb-2">🌿</div>
                  <p className="text-sm font-semibold text-primary">Beli Sertifikat</p>
                  <p className="text-xs text-gray-500">Offset karbon Anda</p>
                </button>
                <button
                  onClick={() => router.push('/csr-activities')}
                  className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left hover:bg-blue-100 transition active:scale-95"
                >
                  <div className="text-2xl mb-2">💚</div>
                  <p className="text-sm font-semibold text-blue-700">Donasi CSR</p>
                  <p className="text-xs text-gray-500">Berkontribusi nyata</p>
                </button>
              </div>
            </div>
          )}

          {/* Trips Tab */}
          {activeTab === 'trips' && (
            <div className="space-y-3">
              {trips.length > 0 ? (
                trips.map((trip) => (
                  <div key={trip.id} onClick={() => router.push(`/journeys/${trip.id}`)} className="bg-white border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-primary">
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
                      {new Date(trip.startDate).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">✈️</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Belum Ada Perjalanan</h3>
                  <p className="text-sm text-textMuted mb-5">Mulai perjalanan haji atau umrah dan lacak jejak karbon Anda</p>
                  <button
                    onClick={() => router.push('/')}
                    className="btn-primary text-sm px-6 py-2.5 rounded-full font-medium"
                  >
                    Ke Beranda
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CSR Donations Tab */}
          {activeTab === 'donations' && (
            <div className="space-y-3">
              {donations.length > 0 ? (
                donations.map((donation) => (
                  <div 
                    key={donation.id} 
                    onClick={() => router.push(`/csr-donations/${donation.id}`)}
                    className="bg-white border border-border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer hover:border-primary"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{donation.activity_title}</h3>
                        <p className="text-sm text-primary font-bold">{donation.amount > 0 ? `Rp ${donation.amount.toLocaleString('id-ID')}` : '(Donasi)'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ml-2 ${
                        donation.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : donation.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {donation.status === 'confirmed' ? 'Terkonfirmasi' : donation.status === 'cancelled' ? 'Dibatalkan' : 'Menunggu'}
                      </span>
                    </div>
                    <p className="text-xs text-textMuted">
                      {new Date(donation.created_at).toLocaleDateString('id-ID')}
                    </p>
                    {donation.status === 'confirmed' && (donation.thank_you_certificate_url || donation.participation_certificate_url) && (
                      <p className="text-xs text-primary font-medium mt-2">Sertifikat tersedia · Ketuk untuk lihat</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">💚</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Belum Ada Donasi CSR</h3>
                  <p className="text-sm text-textMuted mb-5">Dukung program lingkungan dan dapatkan sertifikat partisipasi</p>
                  <button
                    onClick={() => router.push('/csr-activities')}
                    className="btn-primary text-sm px-6 py-2.5 rounded-full font-medium"
                  >
                    Lihat Kegiatan CSR
                  </button>
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
                      onClick={() => router.push(`/certificates/${cert.id}`)}
                      className={`bg-white rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer hover:border-primary ${
                        isNewPurchase ? 'border-2 border-green-500 shadow-lg' : 'border border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{cert.standard_name || cert.standard_series || 'Sertifikat Karbon'}</h3>
                            {isNewPurchase && <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Baru!</span>}
                          </div>
                          <p className="text-sm text-gray-600">{cert.units || cert.co2_equivalent} tCO2e</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          cert.status === 'confirmed' || cert.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : cert.status === 'failed' || cert.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {cert.status === 'confirmed' || cert.status === 'completed'
                            ? 'Aktif'
                            : cert.status === 'failed' || cert.status === 'cancelled'
                            ? 'Gagal'
                            : 'Menunggu Pembayaran'}
                        </span>
                      </div>
                      <p className="text-xs text-textMuted">
                        Rp {cert.amount.toLocaleString('id-ID')} • {new Date(cert.purchase_date).toLocaleDateString('id-ID')}
                      </p>
                      {(cert.status === 'confirmed' || cert.status === 'completed') && (
                        <p className="text-xs text-primary font-medium mt-2">Sertifikat tersedia · Ketuk untuk lihat</p>
                      )}
                      {cert.status === 'pending' && (
                        <p className="text-xs text-yellow-600 font-medium mt-2">Belum dibayar · Ketuk untuk bayar</p>
                      )}
                      {(cert.status === 'failed' || cert.status === 'cancelled') && (
                        <p className="text-xs text-red-500 font-medium mt-2">Pesanan dibatalkan</p>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">🌿</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Belum Ada Sertifikat</h3>
                  <p className="text-sm text-textMuted mb-5">Beli kredit karbon untuk mengoffset emisi perjalanan Anda</p>
                  <button
                    onClick={() => router.push('/carbon-market')}
                    className="btn-primary text-sm px-6 py-2.5 rounded-full font-medium"
                  >
                    Beli Sertifikat Karbon
                  </button>
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
                    <p className="font-semibold text-gray-900">{displayName || '-'}</p>
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
                <button 
                  onClick={() => router.push('/settings/change-password')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FaLock className="w-4 h-4" />
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
                className="flex-1 px-4 py-2 btn-primary rounded-lg disabled:opacity-50"
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
              placeholder="Masukkan nomor telepon"
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
                className="flex-1 px-4 py-2 btn-primary rounded-lg disabled:opacity-50"
              >
                {savingPhone ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Options Modal */}
      {showAvatarMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5" onClick={() => setShowAvatarMenu(false)}>
          <div className="bg-white rounded-lg max-w-sm w-full p-4 space-y-2" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-2">Foto Profil</h2>
            <div className="flex flex-col gap-2">
              {userAvatar && (
                <button
                  onClick={() => {
                    setShowAvatarMenu(false);
                    setShowViewAvatar(true);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-gray-800 font-medium transition-colors"
                >
                  Lihat Foto
                </button>
              )}
              <button
                onClick={() => {
                  setShowAvatarMenu(false);
                  fileInputRef.current?.click();
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-gray-800 font-medium transition-colors"
              >
                {userAvatar ? 'Ganti Foto' : 'Upload Foto'}
              </button>
              <button
                onClick={() => setShowAvatarMenu(false)}
                className="w-full text-center px-4 py-3 mt-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Avatar Fullscreen Modal */}
      {showViewAvatar && userAvatar && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-5" onClick={() => setShowViewAvatar(false)}>
          <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
            <img src={userAvatar} alt="Profile Full" className="w-full h-full object-contain rounded-xl" />
          </div>
          <button 
            className="absolute top-5 right-5 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70"
            onClick={() => setShowViewAvatar(false)}
          >
            ✕
          </button>
        </div>
      )}

    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  )
}
