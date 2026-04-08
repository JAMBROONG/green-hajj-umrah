'use client'

import { useEffect, useState } from 'react'
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
  const [selectedDonation, setSelectedDonation] = useState<CSRDonation | null>(null)
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)
  const [showEditNameModal, setShowEditNameModal] = useState(false)
  const [showEditPhoneModal, setShowEditPhoneModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingPhone, setSavingPhone] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const [displayName, setDisplayName] = useState('')

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

            // Close modal and refresh stats
            setSelectedDonation(null)
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

  const handleOpenCertificateModal = async (certificateId: string) => {
    try {
      // Refetch fresh certificate data from server
      const response = await fetch('/api/user/carbon-certificates')
      if (response.ok) {
        const certificates = await response.json()
        const freshCertificate = certificates.find((c: { id: string }) => c.id === certificateId)
        if (freshCertificate) {
          console.log('✅ Certificate data refreshed:', {
            id: freshCertificate.id,
            thankYouUrl: freshCertificate.thank_you_certificate_url ? 'exists' : 'missing',
            emissionUrl: freshCertificate.emission_reduction_certificate_url ? 'exists' : 'missing',
          })
          setSelectedCertificate(freshCertificate)
        } else {
          // Fallback if not found
          const localCert = certificates.find((c: { id: string }) => c.id === certificateId)
          setSelectedCertificate(localCert)
        }
      }
    } catch (err) {
      console.error('Error fetching certificate:', err)
    }
  }

  const handleContinuePaymentCertificate = async (purchaseId: string) => {
    try {
      const response = await fetch('/api/carbon-products/purchase/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchaseId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Gagal melanjutkan pembayaran')
      }

      const data = await response.json()
      
      // Use Midtrans Snap popup (not redirect)
      if (data.snapToken && window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess: async function (result: MidtransSnapResponse) {
            console.log('✅ CARBON CERTIFICATE PURCHASE SUCCESS', result)
            showSuccess('✅ Pembelian Sertifikat Karbon Berhasil!')

            // Verify payment status with backend
            try {
              console.log('🔍 Verifying carbon purchase...', { purchaseId })
              const verifyResponse = await fetch('/api/carbon-products/purchase/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ purchaseId }),
              })

              console.log('📡 Verify response status:', verifyResponse.status)

              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json()
                console.log('✅ Carbon purchase verified:', JSON.stringify(verifyData, null, 2))
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

            // Refresh certificates list with exponential backoff
            let refreshAttempts = 0
            const maxRefreshAttempts = 5
            const refreshCertificates = async () => {
              try {
                console.log(`📋 Refreshing certificates (attempt ${refreshAttempts + 1}/${maxRefreshAttempts})...`)
                const certificatesRes = await fetch('/api/user/carbon-certificates')
                if (certificatesRes.ok) {
                  const updatedCertificates = await certificatesRes.json()
                  const targetCertificate = updatedCertificates.find((c: { id: string }) => c.id === purchaseId)
                  
                  console.log('✅ Certificates refreshed:', {
                    count: updatedCertificates.length,
                    targetCertificate: {
                      id: targetCertificate?.id,
                      status: targetCertificate?.status,
                      amount: targetCertificate?.amount,
                    },
                  })
                  
                  if (targetCertificate?.status === 'confirmed' || targetCertificate?.status === 'completed') {
                    console.log('✅ Certificate status confirmed in DB!')
                    showSuccess('✅ Sertifikat karbon berhasil disimpan!')
                  } else if (refreshAttempts < maxRefreshAttempts - 1) {
                    refreshAttempts++
                    const delayMs = 500 * (refreshAttempts + 1) // Exponential backoff: 1s, 1.5s, 2s, 2.5s, 3s
                    console.log(`⏳ Status still ${targetCertificate?.status || 'unknown'}, retrying in ${delayMs}ms...`)
                    await new Promise(resolve => setTimeout(resolve, delayMs))
                    await refreshCertificates()
                  } else {
                    console.warn('⚠️ Max refresh attempts reached, status:', targetCertificate?.status)
                    showError('Sertifikat tersimpan tapi UI belum terupdate. Refresh halaman untuk melihat perubahan.')
                  }
                } else {
                  console.error('❌ Failed to fetch certificates:', certificatesRes.status)
                }
              } catch (err) {
                console.warn('⚠️ Failed to refresh certificates:', err)
                if (refreshAttempts < maxRefreshAttempts - 1) {
                  refreshAttempts++
                  await new Promise(resolve => setTimeout(resolve, 500 * (refreshAttempts + 1)))
                  await refreshCertificates()
                }
              }
            }
            
            await refreshCertificates()

            // Close modal and refresh stats
            setSelectedCertificate(null)
            fetchUserData()
          },
          onPending: function (result: MidtransSnapResponse) {
            console.log('⏳ CARBON CERTIFICATE PURCHASE PENDING', result)
            showSuccess('⏳ Pembayaran sertifikat karbon sedang diproses...')
          },
          onError: function (result: MidtransSnapResponse) {
            console.error('❌ CARBON CERTIFICATE PURCHASE ERROR', result)
            showError('❌ Pembayaran sertifikat karbon gagal. Silakan coba lagi.')
            setSelectedCertificate(null)
          },
          onClose: function () {
            console.log('❌ CARBON CERTIFICATE PURCHASE POPUP CLOSED')
            showError('Anda menutup popup pembayaran')
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
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <FaUser className="text-2xl" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{displayName || session.user?.name || 'User'}</h1>
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
                  <div 
                    key={donation.id} 
                    onClick={() => setSelectedDonation(donation)}
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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadCertificate(donation.thank_you_certificate_url!, `sertifikat-ucapan-csr-${donation.id}.pdf`)
                            }}
                            className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                          >
                            Unduh Sertifikat Ucapan Terima Kasih
                          </button>
                        )}
                        {donation.participation_certificate_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadCertificate(donation.participation_certificate_url!, `sertifikat-partisipasi-csr-${donation.id}.pdf`)
                            }}
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
                      onClick={() => handleOpenCertificateModal(cert.id)}
                      className={`bg-white rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer hover:border-primary ${
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
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadCertificate(cert.thank_you_certificate_url!, `sertifikat-ucapan-${cert.product_code || cert.id}.pdf`)
                              }}
                              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                            >
                              📥 Unduh Sertifikat Ucapan Terima Kasih
                            </button>
                          ) : (
                            <div className="text-xs text-textMuted">Sertifikat Ucapan Terima Kasih akan tersedia segera</div>
                          )}
                          {cert.emission_reduction_certificate_url ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadCertificate(cert.emission_reduction_certificate_url!, `sertifikat-emisi-${cert.product_code || cert.id}.pdf`)
                              }}
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
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {savingPhone ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSR Donation Detail Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detail Donasi CSR</h2>
              <button onClick={() => setSelectedDonation(null)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-textMuted mb-1">Kegiatan</p>
                <p className="font-semibold text-gray-900">{selectedDonation.activity_title}</p>
              </div>
              
              <div>
                <p className="text-xs text-textMuted mb-1">Jumlah Donasi</p>
                <p className="text-lg font-bold text-primary">{selectedDonation.amount > 0 ? `Rp ${selectedDonation.amount.toLocaleString('id-ID')}` : '(Donasi)'}</p>
              </div>
              
              <div>
                <p className="text-xs text-textMuted mb-1">Status</p>
                <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${
                  selectedDonation.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedDonation.status === 'confirmed' ? 'Terkonfirmasi' : 'Menunggu'}
                </span>
              </div>
              
              <div>
                <p className="text-xs text-textMuted mb-1">Tanggal Donasi</p>
                <p className="text-gray-900">{new Date(selectedDonation.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            
            {selectedDonation.status === 'confirmed' && (
              <div className="space-y-2 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-textDark mb-3">📄 Unduh Sertifikat</p>
                {selectedDonation.thank_you_certificate_url && (
                  <button
                    onClick={() => {
                      handleDownloadCertificate(selectedDonation.thank_you_certificate_url!, `sertifikat-ucapan-csr-${selectedDonation.id}.pdf`)
                    }}
                    className="w-full text-sm bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition font-medium flex items-center justify-center gap-2"
                  >
                    <span>📥</span>
                    <span>Unduh Sertifikat Ucapan Terima Kasih</span>
                  </button>
                )}
                {selectedDonation.participation_certificate_url && (
                  <button
                    onClick={() => {
                      handleDownloadCertificate(selectedDonation.participation_certificate_url!, `sertifikat-partisipasi-csr-${selectedDonation.id}.pdf`)
                    }}
                    className="w-full text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition font-medium flex items-center justify-center gap-2"
                  >
                    <span>📥</span>
                    <span>Unduh Sertifikat Partisipasi</span>
                  </button>
                )}
                {!selectedDonation.thank_you_certificate_url && !selectedDonation.participation_certificate_url && (
                  <p className="text-xs text-textMuted italic">Sertifikat akan tersedia setelah verifikasi resmi</p>
                )}
              </div>
            )}

            {selectedDonation.status === 'pending' && (
              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => {
                    setSelectedDonation(null)
                    handleContinuePayment(selectedDonation.csr_activity_id, selectedDonation.amount)
                  }}
                  className="w-full text-sm bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition font-semibold"
                >
                  💳 Lanjutkan Pembayaran
                </button>
              </div>
            )}
            
            <button
              onClick={() => setSelectedDonation(null)}
              className="w-full text-sm px-4 py-2 border border-border rounded-lg hover:bg-gray-50 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Certificate Detail Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Detail Sertifikat Karbon</h2>
              <button onClick={() => setSelectedCertificate(null)} className="text-2xl text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-textMuted mb-1">Produk</p>
                <p className="font-semibold text-gray-900">{selectedCertificate.product_name || 'Sertifikat Karbon'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-textMuted mb-1">Jumlah</p>
                  <p className="font-semibold text-gray-900">{selectedCertificate.units || selectedCertificate.co2_equivalent} tCO2e</p>
                </div>
                <div>
                  <p className="text-xs text-textMuted mb-1">Harga</p>
                  <p className="font-semibold text-primary">Rp {selectedCertificate.amount.toLocaleString('id-ID')}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-textMuted mb-1">Status</p>
                <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${
                  selectedCertificate.status === 'confirmed' || selectedCertificate.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedCertificate.status === 'confirmed' || selectedCertificate.status === 'completed' ? 'Aktif' : 'Menunggu'}
                </span>
              </div>
              
              <div>
                <p className="text-xs text-textMuted mb-1">Tanggal Pembelian</p>
                <p className="text-gray-900">{new Date(selectedCertificate.purchase_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            
            {(selectedCertificate.status === 'confirmed' || selectedCertificate.status === 'completed') ? (
              <div className="space-y-2 pt-4 border-t border-border">
                {selectedCertificate.thank_you_certificate_url ? (
                  <button
                    onClick={() => {
                      handleDownloadCertificate(selectedCertificate.thank_you_certificate_url!, `sertifikat-ucapan-${selectedCertificate.product_code || selectedCertificate.id}.pdf`)
                    }}
                    className="w-full text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                  >
                    📥 Unduh Sertifikat Ucapan Terima Kasih
                  </button>
                ) : (
                  <div className="text-xs text-textMuted bg-gray-50 p-3 rounded text-center">Sertifikat Ucapan Terima Kasih akan tersedia segera</div>
                )}
                {selectedCertificate.emission_reduction_certificate_url ? (
                  <button
                    onClick={() => {
                      handleDownloadCertificate(selectedCertificate.emission_reduction_certificate_url!, `sertifikat-emisi-${selectedCertificate.product_code || selectedCertificate.id}.pdf`)
                    }}
                    className="w-full text-sm bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition"
                  >
                    📥 Unduh Sertifikat Emisi
                  </button>
                ) : (
                  <div className="text-xs text-textMuted bg-gray-50 p-3 rounded text-center">Sertifikat Emisi sedang diproses</div>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="text-xs text-yellow-600 bg-yellow-50 p-3 rounded text-center">
                  ⏳ Pembayaran Anda sedang diproses. Sertifikat akan tersedia setelah konfirmasi.
                </div>
                <button
                  onClick={() => {
                    setSelectedCertificate(null)
                    handleContinuePaymentCertificate(selectedCertificate.id)
                  }}
                  className="w-full text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition font-semibold"
                >
                  💳 Lanjutkan Pembayaran
                </button>
              </div>
            )}
            
            <button
              onClick={() => setSelectedCertificate(null)}
              className="w-full text-sm px-4 py-2 border border-border rounded-lg hover:bg-gray-50 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
