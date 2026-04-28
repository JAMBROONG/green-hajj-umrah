'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import StatusBar from '@/components/StatusBar'
import BottomNav from '@/components/BottomNav'
import { useDialog } from '@/contexts/DialogContext'
import { FaSignOutAlt, FaUser, FaPhone, FaEnvelope, FaCalendar, FaEdit, FaLock, FaTrash, FaChevronRight, FaArrowLeft, FaLeaf } from 'react-icons/fa'
import Cropper, { Area } from 'react-easy-crop'

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

/**
 * Extract cropped region dari image src (base64/blob), kompres ke JPEG
 * dengan auto-step-down kalau hasil masih > target size.
 *
 * Strategi:
 *   1. Mulai dari 512×512 quality 0.85
 *   2. Kalau base64 result > MAX_BASE64_CHARS, turunkan quality ke 0.75 → 0.6 → 0.45
 *   3. Kalau masih kebesaran, turunkan dimensi ke 384×384 lalu 256×256
 *   4. Akhirnya, kalau benar-benar gak muat: throw error supaya UI bisa kasih
 *      pesan jelas (alih-alih server reject dengan pesan tech)
 *
 * Margin: pakai 240KB sebagai cap (safe under server's 256KB limit, kasih
 * ruang untuk JSON wrapper, header, dll).
 */
const MAX_BASE64_CHARS = 240_000

async function getCroppedAvatar(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })

  // Coba beberapa kombinasi (size, quality) sampai dapat hasil di bawah cap.
  // Step-down yang masuk akal — bukan loop sampai infinity.
  const attempts: Array<{ size: number; quality: number }> = [
    { size: 512, quality: 0.85 },
    { size: 512, quality: 0.75 },
    { size: 384, quality: 0.8 },
    { size: 384, quality: 0.65 },
    { size: 256, quality: 0.8 },
    { size: 256, quality: 0.6 },
  ]

  for (const { size, quality } of attempts) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')

    // Image smoothing high → hasil lebih halus saat downscale
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, size, size
    )

    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MAX_BASE64_CHARS) {
      return dataUrl
    }
  }

  throw new Error('Foto tidak bisa dikompres ke ukuran yang sesuai. Coba pakai foto lain.')
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

  // Crop modal state — diisi saat user pilih file, dibersihkan saat batal/selesai.
  // cropImageSrc = base64 file mentah dari user, jadi user bisa adjust crop area
  // sebelum upload (tidak langsung kirim ke server seperti dulu).
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

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

  // Re-fetch user data saat global PendingPaymentSyncer detect ada update.
  // Event di-dispatch oleh <PendingPaymentSyncer /> di Providers setelah
  // Midtrans status query mengkonfirmasi pembayaran (status: pending → confirmed).
  useEffect(() => {
    const handler = () => {
      console.log('[Profile] pending-payments-synced — refreshing data')
      fetchUserData()
    }
    window.addEventListener('pending-payments-synced', handler)
    return () => window.removeEventListener('pending-payments-synced', handler)
  }, [])

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
    link.download = fileName || 'certificate.jpg'
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

  // Step 1 — user pilih file dari device. Baca jadi base64, lalu open crop modal.
  // Tidak langsung upload supaya user bisa atur posisi & zoom dulu.
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Pilih file gambar yang valid')
      return
    }

    // Cap raw input size — 10MB. File lebih besar biasanya foto kamera RAW,
    // tidak masuk akal untuk avatar dan menghabiskan memori browser.
    if (file.size > 10 * 1024 * 1024) {
      showError('Ukuran file maksimal 10 MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setCropImageSrc(ev.target?.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
    }
    reader.onerror = () => showError('Gagal membaca file')
    reader.readAsDataURL(file)

    // Reset input value supaya kalau user pilih file yang sama lagi, onChange tetap fire.
    if (e.target) e.target.value = ''
  }

  // Callback dari react-easy-crop saat user selesai geser/zoom — kasih kita
  // koordinat pixel area yang ingin dipotong (bukan yang ditampilkan).
  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  // Step 2 — extract cropped region pakai canvas, kompres ke JPEG 0.85, kirim.
  // Output: 512×512 (cukup tajam di retina, tapi base64-nya ~30-80KB saja —
  // jauh lebih kecil dari foto original yang sering 2-5 MB).
  const handleConfirmCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return

    setUploadingAvatar(true)
    try {
      const cropped = await getCroppedAvatar(cropImageSrc, croppedAreaPixels)

      const response = await fetch('/api/auth/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: cropped }),
      })

      if (response.ok) {
        setUserAvatar(cropped)
        showSuccess('Foto profil berhasil diperbarui')
        setCropImageSrc(null)
      } else {
        const data = await response.json()
        showError(data.error || 'Gagal memperbarui foto profil')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      showError('Terjadi kesalahan saat menyimpan foto')
    } finally {
      setUploadingAvatar(false)
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

      <div className="min-h-screen bg-gray-50 pb-32">
        {/* Header — pakai bg-menu.png seperti /journeys, tampilan clean & solid */}
        <div
          className="text-white shadow-md"
          style={{
            backgroundImage: "url('/bg-menu.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="px-5 pt-5 pb-6">
            {/* Top row: back button + title */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => router.push('/')}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Kembali ke beranda"
              >
                <FaArrowLeft className="text-base text-white" />
              </button>
              <div>
                <h1 className="text-lg font-bold leading-tight">Profil Saya</h1>
                <p className="text-xs text-white/75">Kelola akun &amp; aktivitas Anda</p>
              </div>
            </div>

            {/* Avatar + name */}
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-16 h-16 bg-white/25 border-2 border-white/40 rounded-full flex items-center justify-center text-2xl font-bold cursor-pointer relative group overflow-hidden flex-shrink-0"
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
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{displayName || session.user?.name || 'User'}</p>
                <p className="text-white/80 text-xs truncate">{session.user?.email}</p>
              </div>
            </div>

            {/* Stats pill — 3 angka di satu baris, glass background */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xl font-bold tabular-nums">{stats?.totalTrips || 0}</p>
                <p className="text-[10px] text-white/80 font-medium tracking-wide uppercase">Perjalanan</p>
              </div>
              <div className="w-px h-8 bg-white/25" />
              <div className="text-center flex-1">
                <p className="text-xl font-bold tabular-nums">{stats?.totalCSRDonations || 0}</p>
                <p className="text-[10px] text-white/80 font-medium tracking-wide uppercase">Donasi CSR</p>
              </div>
              <div className="w-px h-8 bg-white/25" />
              <div className="text-center flex-1">
                <p className="text-xl font-bold tabular-nums">{stats?.totalCertificates || 0}</p>
                <p className="text-[10px] text-white/80 font-medium tracking-wide uppercase">Sertifikat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation — sticky, simpel, single accent */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
          <div className="flex gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'dashboard', label: 'Ringkasan' },
                { id: 'trips', label: 'Perjalanan' },
                { id: 'donations', label: 'CSR' },
                { id: 'certificates', label: 'Sertifikat' },
                { id: 'account', label: 'Akun' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-5 py-5">
          {/* Dashboard / Ringkasan Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-3">
              {/* Net Carbon Balance — single white card with subtle accent */}
              {(() => {
                const netKg = (stats?.totalCO2Emitted || 0) - (stats?.totalCO2Offset || 0)
                const netTon = netKg / 1000
                const isNeutral = netKg <= 0
                return (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Carbon Balance</p>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        isNeutral ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isNeutral ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {isNeutral ? 'Carbon Netral' : 'Perlu Offset'}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 tabular-nums">{netTon.toFixed(3)}</p>
                    <p className="text-xs text-gray-500 mt-1">ton CO₂e</p>
                  </div>
                )
              })()}

              {/* Emitted vs Offset — vertical list, no big colored backgrounds */}
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">CO₂ Dihasilkan</p>
                      <p className="text-xs text-gray-500">Total emisi perjalanan</p>
                    </div>
                  </div>
                  <p className="text-base font-bold text-gray-900 tabular-nums">
                    {((stats?.totalCO2Emitted || 0) / 1000).toFixed(3)}
                    <span className="text-xs font-normal text-gray-500 ml-1">ton</span>
                  </p>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">CO₂ Dioffset</p>
                      <p className="text-xs text-gray-500">Total kontribusi netralisasi</p>
                    </div>
                  </div>
                  <p className="text-base font-bold text-gray-900 tabular-nums">
                    {((stats?.totalCO2Offset || 0) / 1000).toFixed(3)}
                    <span className="text-xs font-normal text-gray-500 ml-1">ton</span>
                  </p>
                </div>
              </div>

              {/* Quick Actions — vertical list pattern */}
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                <button
                  onClick={() => router.push('/carbon-market')}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FaLeaf className="text-primary text-sm" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Beli Sertifikat Karbon</p>
                    <p className="text-xs text-gray-500">Offset emisi Anda</p>
                  </div>
                  <FaChevronRight className="text-gray-300 text-xs" />
                </button>
                <button
                  onClick={() => router.push('/csr-activities')}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FaLeaf className="text-primary text-sm" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Donasi CSR</p>
                    <p className="text-xs text-gray-500">Berkontribusi nyata</p>
                  </div>
                  <FaChevronRight className="text-gray-300 text-xs" />
                </button>
              </div>
            </div>
          )}

          {/* Trips Tab — vertical list */}
          {activeTab === 'trips' && (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {trips.length > 0 ? (
                trips.map((trip) => (
                  <button
                    key={trip.id}
                    onClick={() => router.push(`/journeys/${trip.id}`)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FaCalendar className="text-primary text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{trip.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          trip.status === 'completed' ? 'bg-emerald-50 text-emerald-700'
                            : trip.status === 'ongoing' ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {trip.status === 'completed' ? 'Selesai' : trip.status === 'ongoing' ? 'Berjalan' : 'Akan Datang'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {trip.type === 'hajj' ? 'Haji' : 'Umrah'} · {new Date(trip.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <FaChevronRight className="text-gray-300 text-xs flex-shrink-0" />
                  </button>
                ))
              ) : (
                <div className="text-center py-12 px-5">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <FaCalendar className="text-gray-400 text-xl" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Belum Ada Perjalanan</h3>
                  <p className="text-sm text-gray-500 mb-5">Mulai perjalanan haji atau umrah dan lacak jejak karbon Anda</p>
                  <button
                    onClick={() => router.push('/journeys')}
                    className="btn-primary text-sm px-6 py-2.5 rounded-lg font-medium"
                  >
                    Buat Perjalanan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CSR Donations Tab — vertical list */}
          {activeTab === 'donations' && (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {donations.length > 0 ? (
                donations.map((donation) => (
                  <button
                    key={donation.id}
                    onClick={() => router.push(`/csr-donations/${donation.id}`)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FaLeaf className="text-primary text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{donation.activity_title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          donation.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700'
                            : donation.status === 'cancelled' ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {donation.status === 'confirmed' ? 'Berhasil' : donation.status === 'cancelled' ? 'Batal' : 'Menunggu'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {donation.amount > 0 ? `Rp ${donation.amount.toLocaleString('id-ID')}` : '(Donasi)'} · {new Date(donation.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <FaChevronRight className="text-gray-300 text-xs flex-shrink-0" />
                  </button>
                ))
              ) : (
                <div className="text-center py-12 px-5">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <FaLeaf className="text-gray-400 text-xl" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Belum Ada Donasi CSR</h3>
                  <p className="text-sm text-gray-500 mb-5">Dukung program lingkungan dan dapatkan sertifikat partisipasi</p>
                  <button
                    onClick={() => router.push('/csr-activities')}
                    className="btn-primary text-sm px-6 py-2.5 rounded-lg font-medium"
                  >
                    Lihat Kegiatan CSR
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Certificates Tab — vertical list */}
          {activeTab === 'certificates' && (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {certificates.length > 0 ? (
                certificates.map((cert) => {
                  const isNewPurchase = purchasedId === cert.id
                  const isActive = cert.status === 'confirmed' || cert.status === 'completed'
                  const isFailed = cert.status === 'failed' || cert.status === 'cancelled'

                  return (
                    <button
                      key={cert.id}
                      onClick={() => router.push(`/certificates/${cert.id}`)}
                      className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left ${isNewPurchase ? 'bg-emerald-50/40' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FaLeaf className="text-primary text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {cert.standard_name || cert.standard_series || 'Sertifikat Karbon'}
                          </p>
                          {isNewPurchase && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500 text-white flex-shrink-0">Baru</span>
                          )}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            isActive ? 'bg-emerald-50 text-emerald-700'
                              : isFailed ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {isActive ? 'Aktif' : isFailed ? 'Gagal' : 'Menunggu'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {cert.units || cert.co2_equivalent} tCO₂e · Rp {cert.amount.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <FaChevronRight className="text-gray-300 text-xs flex-shrink-0" />
                    </button>
                  )
                })
              ) : (
                <div className="text-center py-12 px-5">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <FaLeaf className="text-gray-400 text-xl" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">Belum Ada Sertifikat</h3>
                  <p className="text-sm text-gray-500 mb-5">Beli kredit karbon untuk mengoffset emisi perjalanan Anda</p>
                  <button
                    onClick={() => router.push('/carbon-market')}
                    className="btn-primary text-sm px-6 py-2.5 rounded-lg font-medium"
                  >
                    Beli Sertifikat Karbon
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Account Tab — vertical list pattern (Gojek/Shopee style) */}
          {activeTab === 'account' && (
            <div className="space-y-3">
              {/* Profile Info — list with edit icons */}
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                <button
                  onClick={handleOpenEditName}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-gray-500 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-500">Nama Lengkap</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName || '-'}</p>
                  </div>
                  <FaChevronRight className="text-gray-300 text-xs flex-shrink-0" />
                </button>

                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FaEnvelope className="text-gray-500 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 truncate break-all">{session.user?.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleOpenEditPhone}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FaPhone className="text-gray-500 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-500">Nomor Telepon</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{userPhone || '-'}</p>
                  </div>
                  <FaChevronRight className="text-gray-300 text-xs flex-shrink-0" />
                </button>
              </div>

              {/* Security Section */}
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                <button
                  onClick={() => router.push('/settings/change-password')}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FaLock className="text-gray-500 text-sm" />
                  </div>
                  <p className="flex-1 text-sm font-medium text-gray-900">Ubah Password</p>
                  <FaChevronRight className="text-gray-300 text-xs flex-shrink-0" />
                </button>
              </div>

              {/* Danger Zone — logout + delete account */}
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FaSignOutAlt className="text-gray-500 text-sm" />
                  </div>
                  <p className="flex-1 text-sm font-medium text-gray-900">Keluar</p>
                  <FaChevronRight className="text-gray-300 text-xs flex-shrink-0" />
                </button>
                <button
                  onClick={() => router.push('/settings/delete-account')}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50/50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FaTrash className="text-red-500 text-sm" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-600">Hapus Akun</p>
                    <p className="text-[11px] text-gray-500">Hapus akun &amp; semua data secara permanen</p>
                  </div>
                  <FaChevronRight className="text-gray-300 text-xs flex-shrink-0" />
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

      {/* Crop Avatar Modal — IG/WA-style: full-screen dark, minimal chrome.
          Image fills viewport. Bottom controls floating semi-transparent
          supaya tidak makan luas crop area. */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top header — dark transparent, white text. Sama style dengan
              IG story editor / WA media editor. */}
          <div className="absolute top-0 inset-x-0 z-10 px-4 pt-3 pb-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setCropImageSrc(null)}
              disabled={uploadingAvatar}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white disabled:opacity-50 transition"
              aria-label="Batal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <p className="text-white text-sm font-semibold tracking-wide">Atur Foto</p>

            <button
              onClick={handleConfirmCrop}
              disabled={uploadingAvatar || !croppedAreaPixels}
              className="px-4 h-10 rounded-full bg-white text-gray-900 text-sm font-bold disabled:opacity-50 transition active:scale-95"
            >
              {uploadingAvatar ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                  Menyimpan
                </span>
              ) : 'Selesai'}
            </button>
          </div>

          {/* Crop area — fills viewport behind header & footer */}
          <div className="absolute inset-0 bg-black">
            <Cropper
              image={cropImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Bottom: zoom slider — floating semi-transparent, minimal
              footprint. Mobile users biasanya pakai pinch, desktop users
              pakai slider ini. */}
          <div className="absolute bottom-0 inset-x-0 z-10 px-6 pb-8 pt-12 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-3 max-w-md mx-auto">
              <svg className="w-5 h-5 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
              </svg>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={uploadingAvatar}
                className="flex-1 accent-white disabled:opacity-50 h-1"
                aria-label="Zoom"
              />
              <svg className="w-6 h-6 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="12" cy="12" r="6" />
              </svg>
            </div>
          </div>
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
