  'use client'

  import { use, useEffect, useState } from 'react'
  import { useRouter } from 'next/navigation'

  import StatusBar from '@/components/StatusBar'
  import BottomNav from '@/components/BottomNav'
  import { IoArrowBack, IoShareSocialOutline, IoDownloadOutline, IoOpenOutline } from 'react-icons/io5'
  import { FaLeaf } from 'react-icons/fa'
  import { formatCurrency } from '@/lib/utils'
  import { getImageUrl } from '@/lib/image-utils'

  interface Certificate {
    id: string
    co2_equivalent: number
    amount: number
    units: number
    certificate_id: string
    status: string
    purchase_date: string
    thank_you_certificate_url: string | null
    emission_reduction_certificate_url: string | null
    product_code: string | null
    product_name: string | null
    product_description: string | null
    project: string | null
    snap_token: string | null
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
                  <span>⏳</span>
                  <span>Sertifikat sedang diproses</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-screen viewer modal */}
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

  export default function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [cert, setCert] = useState<Certificate | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [isPayLoading, setIsPayLoading] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [shouldPoll, setShouldPoll] = useState(false)

    // Detect when Midtrans redirects back to THIS page after payment
    // (same behaviour as checkout page — Snap appends params to the current URL)
    useEffect(() => {
      if (typeof window === 'undefined') return
      const sp = new URLSearchParams(window.location.search)
      const orderId = sp.get('order_id')
      const statusCode = sp.get('status_code')
      const transactionStatus = sp.get('transaction_status')
      if (orderId) {
        const redirectUrl = `/api/carbon-products/purchase/handle-redirect?order_id=${encodeURIComponent(orderId)}&status_code=${encodeURIComponent(statusCode || '')}&transaction_status=${encodeURIComponent(transactionStatus || '')}`
        window.location.replace(redirectUrl)
        return
      }
      // Detect ?paid=1 — handle-redirect adds this to signal a fresh fetch is needed
      if (sp.get('paid') === '1') {
        // Clean the URL immediately so it's not shown to the user
        window.history.replaceState({}, '', `/certificates/${id}`)
        setShouldPoll(true)
      }
    }, [id])

    // Poll until status becomes confirmed/completed (avoids stale Next.js router cache)
    useEffect(() => {
      if (!shouldPoll) return
      let attempts = 0
      const MAX = 12
      let timer: ReturnType<typeof setTimeout>

      const poll = async () => {
        try {
          const res = await fetch(`/api/user/certificates/${id}`, { cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            setCert(data)
            setLoading(false)
            if (data.status === 'completed' || data.status === 'confirmed') {
              setShouldPoll(false)
              return
            }
          }
        } catch {}
        attempts++
        if (attempts < MAX) timer = setTimeout(poll, 1500)
        else setShouldPoll(false)
      }

      // First poll after a short delay to let DB commits settle
      timer = setTimeout(poll, 600)
      return () => clearTimeout(timer)
    }, [shouldPoll, id])

    // Load Midtrans Snap script so "Bayar Sekarang" works on pending orders
    useEffect(() => {
      const loadSnap = async () => {
        try {
          const configRes = await fetch('/api/carbon-products/config')
          if (!configRes.ok) return
          const config = await configRes.json()
          const src = config.isProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js'
          if (document.querySelector(`script[src="${src}"]`)) return
          const script = document.createElement('script')
          script.src = src
          script.async = true
          script.setAttribute('data-client-key', config.clientKey)
          document.head.appendChild(script)
        } catch {}
      }
      loadSnap()
    }, [])

    useEffect(() => {
      const fetchCert = async () => {
        try {
          const res = await fetch(`/api/user/certificates/${id}`, { cache: 'no-store' })
          if (res.status === 404) { setNotFound(true); return }
          if (!res.ok) throw new Error('Failed')
          const data = await res.json()
          console.log('[Certificate Detail] API response:', data)
          console.log('[Certificate Detail] thank_you_certificate_url:', data.thank_you_certificate_url)
          console.log('[Certificate Detail] emission_reduction_certificate_url:', data.emission_reduction_certificate_url)
          setCert(data)
        } catch {
          setNotFound(true)
        } finally {
          setLoading(false)
        }
      }
      fetchCert()
    }, [id])

    const handleRetryPayment = async () => {
      if (!cert) return
      if (!window.snap) {
        // Snap JS not loaded yet — fall back to checkout page
        if (cert.product_code) router.push(`/checkout/${cert.product_code}`)
        return
      }
      setIsPayLoading(true)
      try {
        // Always renew the token — stored tokens expire after ~24 hours
        const renewRes = await fetch('/api/carbon-products/purchase/renew-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchaseId: cert.id }),
        })
        if (!renewRes.ok) {
          const err = await renewRes.json()
          throw new Error(err.error || 'Gagal memperbarui token pembayaran')
        }
        const { snapToken } = await renewRes.json()

        window.snap.pay(snapToken, {
          onSuccess: async () => {
            try {
              await fetch('/api/carbon-products/purchase/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchaseId: cert.id }),
              })
            } catch {}
            router.replace(`/certificates/${cert.id}`)
          },
          onPending: () => { setIsPayLoading(false) },
          onError: () => { setIsPayLoading(false) },
          onClose: () => { setIsPayLoading(false) },
        })
      } catch (err) {
        console.error('Retry payment error:', err)
        setIsPayLoading(false)
        // Fall back to checkout page if something goes wrong
        if (cert.product_code) router.push(`/checkout/${cert.product_code}`)
      }
    }

    const handleCancelOrder = async () => {
      if (!cert) return
      setIsCancelling(true)
      try {
        const res = await fetch(`/api/user/certificates/${cert.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' }),
        })
        if (res.ok) {
          setCert(prev => prev ? { ...prev, status: 'failed' } : prev)
        }
      } finally {
        setIsCancelling(false)
        setShowCancelConfirm(false)
      }
    }

    if (loading) {
      return (
        <div className="app-container">
          <StatusBar />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-border rounded-full border-t-primary animate-spin mx-auto mb-4" />
              <p className="text-sm text-textMuted">Memuat sertifikat...</p>
            </div>
          </div>
          <BottomNav />
        </div>
      )
    }

    if (notFound || !cert) {
      return (
        <div className="app-container">
          <StatusBar />
          <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
            <div className="text-5xl mb-3">🌿</div>
            <h2 className="font-bold text-gray-900 mb-1">Sertifikat tidak ditemukan</h2>
            <p className="text-sm text-gray-500 mb-6">Data tidak dapat dimuat atau akses ditolak.</p>
            <button
              onClick={() => router.push('/profile?tab=certificates')}
              className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Kembali ke Profil
            </button>
          </div>
          <BottomNav />
        </div>
      )
    }

    const isConfirmed = cert.status === 'confirmed' || cert.status === 'completed'
    const isPending = cert.status === 'pending'
    const isFailed = cert.status === 'failed' || cert.status === 'cancelled'
    const statusLabel = isConfirmed ? 'Aktif' : isPending ? 'Menunggu Pembayaran' : 'Gagal'
    const statusClass = isConfirmed
      ? 'bg-green-100 text-green-700'
      : isPending
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700'

    return (
      <div className="app-container">
        <StatusBar />

        <div className="min-h-screen bg-gray-50 pb-24">
          {/* Header */}
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
                onClick={() => router.push('/profile?tab=certificates')}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors mb-4"
              >
                <IoArrowBack className="text-lg text-white" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <FaLeaf className="text-xl text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-tight">Sertifikat Karbon</h1>
                  <p className="text-sm text-white/75">{cert.product_name || 'Kredit Karbon'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Status Banner */}
            {isPending && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">💳</span>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Menunggu Pembayaran</p>
                    <p className="text-xs text-yellow-600 mt-0.5">Selesaikan pembayaran untuk mendapatkan sertifikat karbon Anda.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRetryPayment}
                    disabled={isPayLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold active:scale-95 transition disabled:opacity-60"
                  >
                    {isPayLoading ? (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    )}
                    Bayar Sekarang
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={isCancelling}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-semibold active:scale-95 transition disabled:opacity-60"
                  >
                    Batalkan Pesanan
                  </button>
                </div>
              </div>
            )}

            {isFailed && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">❌</span>
                <div>
                  <p className="text-sm font-semibold text-red-800">Pembelian Gagal / Dibatalkan</p>
                  <p className="text-xs text-red-600">Pesanan ini tidak dapat dilanjutkan.</p>
                </div>
              </div>
            )}

            {/* Detail Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex">
                <div className="w-1.5 flex-shrink-0 bg-green-500" />
                <div className="flex-1 p-4 space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="h-px bg-gray-100" />

                  {/* Product */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Produk</p>
                    <p className="text-xs font-semibold text-gray-900 text-right max-w-[60%]">{cert.product_name || '-'}</p>
                  </div>
                  {cert.project && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Proyek</p>
                      <p className="text-xs font-semibold text-gray-900 text-right max-w-[60%]">{cert.project}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Jumlah Offset</p>
                    <p className="text-xs font-bold text-primary">{cert.units || cert.co2_equivalent} tCO₂e</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Total Dibayar</p>
                    <p className="text-xs font-bold text-gray-900">{formatCurrency(Number(cert.amount))}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">Tanggal Pembelian</p>
                    <p className="text-xs font-semibold text-gray-900">
                      {new Date(cert.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">ID Sertifikat</p>
                    <p className="text-[10px] font-mono text-gray-500 text-right max-w-[55%] break-all">{cert.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificates Section */}
            {isConfirmed && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Dokumen Sertifikat</p>
                <CertCard
                  title="Sertifikat Ucapan Terima Kasih"
                  subtitle="Bukti partisipasi offset karbon Anda"
                  emoji="📜"
                  fileUrl={cert.thank_you_certificate_url}
                  fileName={`sertifikat-ucapan-${cert.product_code || cert.id}.jpg`}
                  accentClass="bg-blue-500"
                />
                <CertCard
                  title="Sertifikat Pengurangan Emisi"
                  subtitle="Bukti resmi kredit karbon yang dibeli"
                  emoji="🌍"
                  fileUrl={cert.emission_reduction_certificate_url}
                  fileName={`sertifikat-emisi-${cert.product_code || cert.id}.jpg`}
                  accentClass="bg-green-500"
                />
              </>
            )}
          </div>
        </div>

        <BottomNav />

        {/* Cancel confirmation bottom sheet */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCancelConfirm(false)} />
            <div className="relative w-full max-w-md bg-white rounded-t-3xl px-5 pt-5 pb-8 space-y-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-gray-900">Batalkan Pesanan?</p>
                <p className="text-sm text-gray-500">
                  Status pesanan akan menjadi <span className="font-semibold text-red-600">Gagal</span> dan tidak dapat diubah kembali.
                </p>
              </div>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="w-full py-3 rounded-2xl bg-red-600 text-white font-semibold text-sm active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isCancelling ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                Ya, Batalkan Pesanan
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm active:scale-95 transition"
              >
                Tidak, Kembali
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }