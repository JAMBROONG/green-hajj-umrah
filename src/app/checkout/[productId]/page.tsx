'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';

interface CarbonProduct {
  id: string;
  product_code: string;
  name: string;
  description: string;
  price: string | number;
  project: string;
  category: string;
  image_url: string;
  color_class: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MidtransSnapResponse {
  transaction_status: string
  transaction_id: string
  [key: string]: unknown
}

// Extend window to include snap
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

export default function CheckoutPage({ 
  params 
}: { 
  params: Promise<{ productId: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { totalEmission } = useHajiJourney();
  
  const [product, setProduct] = useState<CarbonProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState(Math.ceil(totalEmission / 1000));
  const [isProcessing, setIsProcessing] = useState(false);

  // Detect when Midtrans redirects back to this page (some payment methods
  // ignore finish_redirect_url and append params to the current page URL instead).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const orderId = sp.get('order_id');
    const statusCode = sp.get('status_code');
    const transactionStatus = sp.get('transaction_status');
    if (orderId) {
      // Forward to our handle-redirect route which verifies status,
      // generates the certificate, and redirects to /certificates/{id}
      const redirectUrl = `/api/carbon-products/purchase/handle-redirect?order_id=${encodeURIComponent(orderId)}&status_code=${encodeURIComponent(statusCode || '')}&transaction_status=${encodeURIComponent(transactionStatus || '')}`;
      window.location.replace(redirectUrl);
    }
  }, []);

  // Load Midtrans Snap JavaScript and set Client Key
  useEffect(() => {
    const loadMidtrans = async () => {
      try {
        // Get payment config to know if production or sandbox
        const configResponse = await fetch('/api/carbon-products/config');
        if (!configResponse.ok) {
          console.warn('Failed to fetch Midtrans config');
          return;
        }
        
        const config = await configResponse.json();
        const isProduction = config.isProduction;
        const clientKey = config.clientKey;

        // Load Midtrans Snap script
        const scriptSrc = isProduction
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js';

        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.setAttribute('data-client-key', clientKey);
        document.head.appendChild(script);

        return () => {
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        };
      } catch (error) {
        console.warn('Failed to load Midtrans Snap:', error);
      }
    };

    loadMidtrans();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/carbon-products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const products: CarbonProduct[] = await response.json();
        const foundProduct = products.find(p => p.product_code === resolvedParams.productId);
        
        if (!foundProduct) {
          setError('Produk tidak ditemukan');
          setProduct(null);
        } else {
          setProduct(foundProduct);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat produk');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [resolvedParams.productId]);
  
  if (loading) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-textMuted">Memuat produk...</p>
        </div>
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-5 text-center">
          <p className="text-textMuted">{error || 'Produk tidak ditemukan'}</p>
          <Link href="/carbon-market" className="text-sm font-semibold text-primary underline underline-offset-2">
            Kembali ke Pasar Karbon
          </Link>
        </div>
      </div>
    );
  }

  const priceNum = typeof product.price === 'string' ? parseInt(product.price) : product.price;
  const total = priceNum * units;
  const maxUnits = Math.max(1, Math.floor(5000000 / priceNum));
  const progressPct = Math.min(100, (units / maxUnits) * 100);

  const adjustUnits = (delta: number) => {
    setUnits(prev => Math.max(1, Math.min(maxUnits, prev + delta)));
  };

  const handlePayment = async () => {
    if (!product) return;
    setIsProcessing(true);
    try {
      if (priceNum * units > 5000000) throw new Error('Total pembayaran melebihi batas Rp 5.000.000. Kurangi jumlah unit.');

      const response = await fetch('/api/carbon-products/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_code: product.product_code, units }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process payment');
      }
      const data = await response.json();

      if (data.snapToken && window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess: async function(result: MidtransSnapResponse) {
            console.log('Payment success', result);
            try {
              await fetch('/api/carbon-products/purchase/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchaseId: data.id }),
              });
            } catch { /* non-blocking */ }
            router.push(`/certificates/${data.id}`);
          },
          onPending: function(result: MidtransSnapResponse) { console.log('Pending:', result); },
          onError: function(result: MidtransSnapResponse) { console.log('Error:', result); setIsProcessing(false); },
          onClose: function() { setIsProcessing(false); },
        });
      } else {
        throw new Error('Midtrans Snap not available');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setIsProcessing(false);
    }
  };

  const imageUrl = product.image_url ? getImageUrl(product.image_url) : null;

  return (
    <div className="app-container">
      <StatusBar />

      {/* Scrollable content — extra bottom padding so the sticky bar never covers content */}
      <div className="page pb-32">

        {/* ── Hero image ─────────────────────────────────── */}
        <div className="relative">
          {imageUrl ? (
            <div
              className="w-full h-52 bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : (
            <div className="w-full h-52 bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
              <span className="text-7xl">🌱</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/40 pointer-events-none" />

          {/* Back button */}
          <Link
            href="/carbon-market"
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Category badge */}
          <span className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white border border-white/20">
            {product.category}
          </span>

          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pointer-events-none">
            <p className="text-[10px] font-bold text-white/70 tracking-widest uppercase mb-0.5">{product.product_code}</p>
            <h1 className="text-lg font-bold text-white leading-tight drop-shadow">{product.name}</h1>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-3">

          {/* ── Project & price ───────────────────────────── */}
          <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-medium">Proyek</p>
                <p className="text-xs font-semibold text-gray-800 truncate">{product.project}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-[10px] text-gray-400 font-medium">Harga per unit</p>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(priceNum)}<span className="text-[10px] font-normal text-gray-400">/tCO2e</span>
              </p>
            </div>
          </div>

          {/* ── Description ──────────────────────────────── */}
          {product.description && (
            <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Tentang Proyek</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* ── What you get ─────────────────────────────── */}
          <div className="bg-gradient-to-br from-primary/5 to-emerald-50 rounded-2xl px-4 py-3 border border-primary/10">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wide mb-2.5">Yang Anda Dapatkan</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-700">Sertifikat Kredit Karbon resmi (PDF)</p>
              </div>
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-700">Bukti pengurangan emisi terverifikasi</p>
              </div>
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-700">Kontribusi nyata terhadap lingkungan</p>
              </div>
            </div>
          </div>

          {/* ── Quantity selector ────────────────────────── */}
          <div className="bg-white rounded-2xl px-4 py-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-gray-900">Jumlah Unit</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Maks. {maxUnits} unit · batas Rp 5.000.000</p>
              </div>
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                {units} tCO2e
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => adjustUnits(-1)}
                disabled={units <= 1}
                className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xl disabled:opacity-30 active:scale-95 transition"
              >
                -
              </button>
              <input
                type="number"
                value={units}
                onChange={(e) => setUnits(Math.max(1, Math.min(maxUnits, Number(e.target.value) || 1)))}
                className="flex-1 h-11 border border-gray-200 rounded-xl text-center text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                min="1"
                max={maxUnits}
              />
              <button
                onClick={() => adjustUnits(1)}
                disabled={units >= maxUnits}
                className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl disabled:opacity-30 active:scale-95 transition"
              >
                +
              </button>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* ── Order summary ────────────────────────────── */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Ringkasan Pembelian</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{formatCurrency(priceNum)} x {units} unit</span>
                <span className="font-semibold text-gray-800">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">CO2 yang dioffset</span>
                <span className="font-semibold text-primary">{units} tCO2e</span>
              </div>
            </div>
            <div className="bg-primary/5 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Total</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>
          </div>

          {/* ── Payment disclosure ───────────────────────── */}
          <div className="bg-blue-50 rounded-2xl px-4 py-3 border border-blue-100 text-xs text-blue-700 space-y-1.5">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                Pembayaran diproses melalui <strong>Midtrans</strong>, gateway pembayaran berstandar PCI-DSS.
                Carbon credit dari <strong>IDX Carbon Market</strong> adalah aset lingkungan nyata yang terverifikasi,
                bukan instrumen investasi finansial.
              </p>
            </div>
            <p>
              Dengan melanjutkan, Anda menyetujui{' '}
              <Link href="/legal/terms" className="underline font-semibold">Syarat &amp; Ketentuan</Link>
              {' '}dan <strong>tidak ada pengembalian dana</strong> setelah pembayaran dikonfirmasi.
            </p>
          </div>

        </div>
      </div>

      {/* ── Sticky checkout bar — sits above BottomNav ── */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 py-3 z-40 shadow-lg">
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full py-3.5 rounded-2xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/25 disabled:opacity-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Beli Sekarang &mdash; {formatCurrency(total)}</span>
            </>
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
