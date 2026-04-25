'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import StatusBar from '@/components/StatusBar'
import BottomNav from '@/components/BottomNav'
import { IoArrowBack, IoShareSocialOutline, IoDownloadOutline, IoOpenOutline, IoLocationOutline, IoCalendarOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { MdVolunteerActivism } from 'react-icons/md'
import { FaLeaf, FaRecycle, FaBolt, FaTint } from 'react-icons/fa'
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

interface CSRDonation {
  id: string
  csr_activity_id: string
  type: string
  amount: number
  status: string
  created_at: string
  activity_title: string
  activity_description: string
  activity_category: string
  activity_location: string
  activity_image_url: string | null
  activity_date: string | null
  thank_you_certificate_url: string | null
  participation_certificate_url: string | null
  snap_token: string | null
  breakdown: {
    donation: number
    csr_admin_fee: number
    csr_admin_fee_pct: number
    total: number
  } | null
}

const categoryLabels: Record<string, string> = {
  reforestation: 'Penanaman Pohon',
  waste_management: 'Pengelolaan Limbah',
  energy_efficiency: 'Efisiensi Energi',
  water_conservation: 'Konservasi Air',
}

const categoryIcons: Record<string, React.ReactNode> = {
  reforestation: <FaLeaf className="text-green-500 text-lg" />,
  waste_management: <FaRecycle className="text-teal-500 text-lg" />,
  energy_efficiency: <FaBolt className="text-yellow-500 text-lg" />,
  water_conservation: <FaTint className="text-blue-500 text-lg" />,
}

function CertCard({
  title,
  subtitle,
  emoji,
  fileUrl,
  fileName,
  accentClass,
}: {
  title: string
  subtitle: string
  emoji: string
  fileUrl: string | null
  fileName: string
  accentClass: string
}) {
  const resolvedUrl = fileUrl ? getImageUrl(fileUrl) : null
  const [showViewer, setShowViewer] = useState(false)
  const isImage = resolvedUrl ? /\.(jpe?g|png|webp|gif)$/i.test(resolvedUrl) : false
  const viewerUrl = resolvedUrl
    ? `/api/download?url=${encodeURIComponent(resolvedUrl)}&filename=${encodeURIComponent(fileName)}&inline=1`
    : null

  const handleDownload = () => {
    if (!resolvedUrl) return
    const proxyUrl = `/api/download?url=${encodeURIComponent(resolvedUrl)}&filename=${encodeURIComponent(fileName)}`
    const a = document.createElement('a')
    a.href = proxyUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="flex">
          <div className={`w-1.5 flex-shrink-0 ${accentClass}`} />
          <div className="flex-1 p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 leading-snug">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
              </div>
            </div>

            {resolvedUrl ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowViewer(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition active:scale-95"
                >
                  <IoOpenOutline className="text-base" />
                  Buka
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/20 transition active:scale-95"
                >
                  <IoDownloadOutline className="text-base" />
                  Unduh
                </button>
                <button
                  onClick={async () => {
                    if (navigator.share) {
                      try { await navigator.share({ title, url: resolvedUrl }) } catch {}
                    } else {
                      await navigator.clipboard.writeText(resolvedUrl)
                    }
                  }}
                  className="w-10 flex items-center justify-center py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition active:scale-95"
                >
                  <IoShareSocialOutline className="text-base" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-yellow-50 rounded-xl px-3 py-2.5 text-xs text-yellow-700">
                <span>?</span>
                <span>Sertifikat sedang diproses oleh admin</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showViewer && resolvedUrl && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ touchAction: 'none' }}>
          <div className="flex items-center gap-3 px-4 py-3 bg-black/70 flex-shrink-0">
            <button
              onClick={() => setShowViewer(false)}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-lg flex-shrink-0"
            >
              ✕
            </button>
            <p className="text-white text-sm font-semibold truncate flex-1">{title}</p>
            <button
              onClick={handleDownload}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0"
            >
              <IoDownloadOutline className="text-lg" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center bg-black">
            {isImage ? (
              <img src={resolvedUrl} alt={title} className="max-w-full max-h-full object-contain" />
            ) : (
              <iframe src={viewerUrl ?? resolvedUrl} className="w-full h-full border-0" title={title} />
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function CSRDonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [donation, setDonation] = useState<CSRDonation | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCancelSheet, setShowCancelSheet] = useState(false)
  const [shouldPoll, setShouldPoll] = useState(false)
  const pollCountRef = useRef(0)
  // Track status sebelumnya untuk detect transition pending → confirmed.
  // Kalau berubah dari pending ke confirmed (entah via polling, sync global,
  // atau visibility refetch), tampilkan modal sukses sekali.
  const prevStatusRef = useRef<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Load Midtrans Snap script
  useEffect(() => {
    const loadMidtrans = async () => {
      try {
        const configRes = await fetch('/api/payment-config/check')
        if (!configRes.ok) return
        const config = await configRes.json()
        const clientKey = config.clientKey
        if (!clientKey) return
        const scriptSrc = config.isProduction
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js'
        const script = document.createElement('script')
        script.src = scriptSrc
        script.async = true
        script.setAttribute('data-client-key', clientKey)
        document.head.appendChild(script)
        return () => { if (document.head.contains(script)) document.head.removeChild(script) }
      } catch { /* ignore */ }
    }
    loadMidtrans()
  }, [])

  // Detect Midtrans redirect-back params in URL (appended by some payment methods)
  useEffect(() => {
    const orderId = searchParams.get('order_id')
    const transactionStatus = searchParams.get('transaction_status')
    if (orderId && transactionStatus) {
      const verifyUrl = `/api/csr-activities/participate/verify`
      // Redirect via verify — but we don't have participationId here, so just reload with paid=1 signal
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('order_id')
      newUrl.searchParams.delete('transaction_status')
      newUrl.searchParams.delete('status_code')
      newUrl.searchParams.set('paid', '1')
      window.location.replace(newUrl.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // paid=1 → start polling for confirmed status
  useEffect(() => {
    const paid = searchParams.get('paid')
    if (paid === '1') {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('paid')
      window.history.replaceState({}, '', newUrl.toString())
      setShouldPoll(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDonation = async (noCache = false) => {
    const res = await fetch(`/api/user/csr-donations/${id}`, noCache ? { cache: 'no-store' } : {})
    if (res.status === 404) { setNotFound(true); return null }
    if (!res.ok) throw new Error('Failed')
    return res.json() as Promise<CSRDonation>
  }

  // Initial load
  useEffect(() => {
    fetchDonation()
      .then(data => { if (data) setDonation(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Listen ke event 'pending-payments-synced' dari <PendingPaymentSyncer> global.
  // Saat global syncer detect ada update payment (mis. user balik ke tab dari
  // m-banking, atau setelah throttle 30s), refetch data donasi ini supaya
  // status terbaru reflect tanpa perlu reload.
  useEffect(() => {
    const handler = async () => {
      try {
        const data = await fetchDonation(true)
        if (data) setDonation(data)
      } catch { /* ignore */ }
    }
    window.addEventListener('pending-payments-synced', handler)
    return () => window.removeEventListener('pending-payments-synced', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Detect transition pending → confirmed/completed → trigger success modal.
  // Inisialisasi prevStatusRef saat data pertama load — kalau awalnya sudah
  // confirmed (user revisit halaman), tidak perlu spam modal. Hanya transition
  // murni dari pending ke confirmed yang trigger modal.
  useEffect(() => {
    if (!donation) return
    const prev = prevStatusRef.current
    const curr = donation.status

    // Inisialisasi snapshot status awal — modal tidak fire saat first load
    if (prev === null) {
      prevStatusRef.current = curr
      return
    }

    if (prev !== curr) {
      const wasPending = prev === 'pending'
      const isNowConfirmed = curr === 'confirmed' || curr === 'completed'
      if (wasPending && isNowConfirmed) {
        setShowSuccessModal(true)
        // Stop polling jika masih jalan — sudah confirmed
        setShouldPoll(false)
      }
      prevStatusRef.current = curr
    }
  }, [donation])

  // Polling after paid=1
  useEffect(() => {
    if (!shouldPoll) return
    const interval = setInterval(async () => {
      pollCountRef.current += 1
      try {
        const data = await fetchDonation(true)
        if (data) {
          setDonation(data)
          if (data.status === 'confirmed' || data.status === 'completed') {
            setShouldPoll(false)
            clearInterval(interval)
            return
          }
        }
      } catch { /* ignore */ }
      if (pollCountRef.current >= 12) {
        setShouldPoll(false)
        clearInterval(interval)
      }
    }, 1500)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll])

  const handleRetryPayment = async () => {
    if (!donation || isProcessing) return
    setIsProcessing(true)
    try {
      // Renew token first
      const renewRes = await fetch('/api/csr-activities/participate/renew-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participationId: donation.id }),
      })
      const renewData = await renewRes.json()
      const snapToken = renewRes.ok ? renewData.snapToken : donation.snap_token

      if (!snapToken || !window.snap) {
        setIsProcessing(false)
        return
      }

      window.snap.pay(snapToken, {
        onSuccess: async () => {
          try {
            await fetch('/api/csr-activities/participate/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ participationId: donation.id }),
            })
          } catch { /* ignore */ }
          setShouldPoll(true)
          setIsProcessing(false)
        },
        onPending: () => { setIsProcessing(false) },
        onError: () => { setIsProcessing(false) },
        onClose: () => { setIsProcessing(false) },
      })
    } catch {
      setIsProcessing(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!donation) return
    try {
      await fetch(`/api/user/csr-donations/${donation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      setDonation(prev => prev ? { ...prev, status: 'cancelled' } : prev)
    } catch { /* ignore */ }
    setShowCancelSheet(false)
  }

  if (loading) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-border rounded-full border-t-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-textMuted">Memuat detail donasi...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (notFound || !donation) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
          <div className="text-5xl mb-3">💚</div>
          <h2 className="font-bold text-gray-900 mb-1">Donasi tidak ditemukan</h2>
          <p className="text-sm text-gray-500 mb-6">Data tidak dapat dimuat atau akses ditolak.</p>
          <button
            onClick={() => router.push('/profile?tab=donations')}
            className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
          >
            Kembali ke Profil
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  const isConfirmed = donation.status === 'confirmed' || donation.status === 'completed'
  const isPending = donation.status === 'pending'

  const statusLabel = isConfirmed ? 'Terkonfirmasi' : isPending ? 'Menunggu Pembayaran' : 'Dibatalkan'
  const categoryLabel = categoryLabels[donation.activity_category] || donation.activity_category
  const categoryIcon = categoryIcons[donation.activity_category] || <MdVolunteerActivism className="text-primary text-lg" />

  return (
    <div className="app-container">
      <StatusBar />

      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Navigation header */}
        <div
          className="text-white"
          style={{
            backgroundImage: "url('/bg-menu.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="px-5 pt-5 pb-5">
            <button
              onClick={() => router.push('/profile?tab=donations')}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors mb-4"
            >
              <IoArrowBack className="text-lg text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <MdVolunteerActivism className="text-2xl text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold leading-tight">Detail Donasi CSR</h1>
                <p className="text-sm text-white/75 leading-snug line-clamp-2">{donation.activity_title}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity image (separate, below nav) */}
        {donation.activity_image_url && (
          <div
            className="w-full h-36 bg-cover bg-center"
            style={{ backgroundImage: `url(${getImageUrl(donation.activity_image_url)})` }}
          />
        )}

        <div className="px-5 py-4 space-y-3">

          {/* Status banner */}
          {isConfirmed ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Donasi Terkonfirmasi</p>
                <p className="text-xs text-green-600">Terima kasih atas kontribusi Anda!</p>
              </div>
            </div>
          ) : isPending ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">⏳</span>
              <div>
                <p className="text-sm font-semibold text-yellow-800">Menunggu Pembayaran</p>
                <p className="text-xs text-yellow-600">Selesaikan pembayaran untuk mendapatkan sertifikat</p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-xl">❌</span>
              <div>
                <p className="text-sm font-semibold text-red-800">Donasi Dibatalkan</p>
                <p className="text-xs text-red-600">Pesanan ini tidak lagi aktif</p>
              </div>
            </div>
          )}

          {/* Amount hero card */}
          <div className={`rounded-2xl p-5 text-white ${
            isConfirmed
              ? 'bg-gradient-to-br from-primary to-primary/80'
              : isPending
              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
          }`}>
            <p className="text-xs text-white/75 mb-1">Jumlah Donasi</p>
            <p className="text-3xl font-bold">
              {donation.amount > 0
                ? `Rp ${donation.amount.toLocaleString('id-ID')}`
                : '—'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20">
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Pending payment actions */}
          {isPending && (
            <div className="flex gap-3">
              <button
                onClick={handleRetryPayment}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition active:scale-95 disabled:opacity-60"
              >
                {isProcessing ? 'Membuka...' : 'Bayar Sekarang'}
              </button>
              <button
                onClick={() => setShowCancelSheet(true)}
                className="flex-1 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition active:scale-95"
              >
                Batalkan Pesanan
              </button>
            </div>
          )}

          {/* Detail rows */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex">
              <div className="w-1.5 flex-shrink-0 bg-teal-500" />
              <div className="flex-1 divide-y divide-gray-50">

                <div className="flex items-start gap-3 p-4">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {categoryIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Kegiatan</p>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{donation.activity_title}</p>
                    {categoryLabel && (
                      <span className="inline-block mt-1 text-[10px] font-medium bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                        {categoryLabel}
                      </span>
                    )}
                  </div>
                </div>

                {donation.activity_location && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <IoLocationOutline className="text-gray-500 text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Lokasi</p>
                      <p className="text-sm font-medium text-gray-900">{donation.activity_location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <IoCalendarOutline className="text-gray-500 text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Tanggal Donasi</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(donation.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">ID Transaksi</p>
                  <p className="text-[11px] font-mono text-gray-500 break-all">{donation.id}</p>
                </div>

                {/* Rincian Biaya Breakdown */}
                {donation.breakdown && (
                  <div className="px-4 py-3 bg-gray-50">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Rincian Biaya</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Donasi</span>
                        <span>Rp {donation.breakdown.donation.toLocaleString('id-ID')}</span>
                      </div>
                      {donation.breakdown.csr_admin_fee > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Biaya Layanan ({donation.breakdown.csr_admin_fee_pct.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%)</span>
                          <span>Rp {donation.breakdown.csr_admin_fee.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-primary">Rp {donation.breakdown.total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Certificate */}
          {isConfirmed && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Dokumen Sertifikat</p>
              {donation.thank_you_certificate_url ? (
                <CertCard
                  title="Sertifikat"
                  subtitle="Bukti partisipasi & apresiasi kontribusi Anda"
                  emoji="🏅"
                  fileUrl={donation.thank_you_certificate_url}
                  fileName={`sertifikat-csr-${donation.id}.jpg`}
                  accentClass="bg-green-500"
                />
              ) : (
                <div className="bg-gray-50 rounded-2xl px-4 py-4 text-center">
                  <p className="text-xs text-gray-500">Sertifikat sedang disiapkan dan akan segera tersedia.</p>
                </div>
              )}
            </>
          )}

          {/* View Activity Button */}
          <button
            onClick={() => router.push(`/csr-activities/${donation.csr_activity_id}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/5 transition active:scale-95"
          >
            Lihat Detail Kegiatan →
          </button>

        </div>
      </div>

      {/* ── Success modal: pembayaran berhasil terdeteksi ──────────────────
          Tampil saat status berubah pending → confirmed (entah via polling
          internal halaman atau global PendingPaymentSyncer). Modal ini cuma
          sekali — kalau user dismiss atau auto-close, tidak muncul lagi
          kecuali ada transition pending → confirmed lagi (yang dalam praktek
          tidak terjadi). */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-5 pointer-events-none">
          <div
            className="absolute inset-0 bg-black/50 pointer-events-auto"
            onClick={() => setShowSuccessModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm bg-white rounded-3xl px-6 pt-8 pb-6 shadow-2xl pointer-events-auto"
            style={{ animation: 'success-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {/* Animated checkmark */}
            <div className="flex justify-center mb-4">
              <div
                className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center"
                style={{ animation: 'check-bounce 480ms ease-out' }}
              >
                <IoCheckmarkCircle className="text-6xl text-emerald-500" />
              </div>
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-gray-900">Pembayaran Berhasil!</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Donasi Anda telah dikonfirmasi. Sertifikat partisipasi sedang dibuat dan akan tersedia di halaman ini sebentar lagi.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full mt-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition active:scale-95"
            >
              Lihat Detail Donasi
            </button>
          </div>

          {/* Inline keyframes — biar tidak konflik dengan utility lain */}
          <style jsx>{`
            @keyframes success-pop {
              0%   { transform: scale(0.85); opacity: 0; }
              60%  { transform: scale(1.04); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes check-bounce {
              0%   { transform: scale(0); }
              60%  { transform: scale(1.15); }
              100% { transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* Cancel confirmation bottom sheet */}
      {showCancelSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelSheet(false)} />
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-8 space-y-4">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
            <div className="text-center">
              <p className="text-2xl mb-2">⚠️</p>
              <h3 className="font-bold text-gray-900 mb-1">Batalkan Pesanan?</h3>
              <p className="text-sm text-gray-500">Pesanan yang dibatalkan tidak dapat dipulihkan. Anda dapat membuat donasi baru kapan saja.</p>
            </div>
            <button
              onClick={handleCancelOrder}
              className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition active:scale-95"
            >
              Ya, Batalkan
            </button>
            <button
              onClick={() => setShowCancelSheet(false)}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition active:scale-95"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}