'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { formatCurrency, formatEmission } from '@/lib/utils';
import { IoArrowBack, IoLocationOutline, IoChevronForward, IoRemoveCircle, IoAddCircle } from 'react-icons/io5';

interface CarbonProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  location?: string;
  project_owner?: string;
  srn_series?: string;
  vintage?: string;
  is_active: boolean;
}

interface CarbonProductStandard {
  id: string;
  series: string;
  name: string;
  vintage: string;
  price: string | number;
  is_active: boolean;
  products: {
    product: CarbonProduct
  }[];
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

export default function CheckoutSeriesPage({ 
  params 
}: { 
  params: Promise<{ series: string }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { totalEmission } = useHajiJourney();
  
  const [standard, setStandard] = useState<CarbonProductStandard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState(Math.ceil(totalEmission / 1000) || 1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminFeePct, setAdminFeePct] = useState<number>(0);
  const [ppnPct] = useState<number>(11);

  // Detect when Midtrans redirects back
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const orderId = sp.get('order_id');
    const statusCode = sp.get('status_code');
    const transactionStatus = sp.get('transaction_status');
    if (orderId) {
      const redirectUrl = `/api/carbon-products/purchase/handle-redirect?order_id=${encodeURIComponent(orderId)}&status_code=${encodeURIComponent(statusCode || '')}&transaction_status=${encodeURIComponent(transactionStatus || '')}`;
      window.location.replace(redirectUrl);
    }
  }, []);

  // Set units when total emission is ready
  useEffect(() => {
    const calculatedUnits = Math.ceil(totalEmission / 1000);
    if (calculatedUnits > 0 && units === 1) {
      setUnits(calculatedUnits);
    }
  }, [totalEmission, units]);

  // Load Midtrans Snap JavaScript
  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    
    async function initSnap() {
      try {
        const res = await fetch('/api/carbon-products/config');
        if (!res.ok) return;
        const config = await res.json();
        
        if (!config.clientKey) return;
        
        script = document.createElement('script');
        script.src = config.isProduction 
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js';
        
        script.setAttribute('data-client-key', config.clientKey);
        document.head.appendChild(script);
        
        script.onload = () => {
          if (window.snap && typeof window.snap.setClientKey === 'function') {
            window.snap.setClientKey(config.clientKey);
          }
        };
      } catch (e) {
        console.error('Gagal mengambil konfigurasi Midtrans:', e);
      }
    }
    
    initSnap();
    
    return () => {
      // Cleanup script if component unmounts
      if (script && document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Load standard data + service setting (admin fee per tenant user)
  useEffect(() => {
    async function loadData() {
      try {
        const [stdRes, settingRes] = await Promise.all([
          fetch(`/api/carbon-product-standards/${resolvedParams.series}`),
          fetch('/api/service-setting/me'),
        ]);

        if (!stdRes.ok) throw new Error('Gagal memuat detail standar');
        const data = await stdRes.json();
        setStandard(data);

        if (settingRes.ok) {
          const s = await settingRes.json();
          setAdminFeePct(typeof s.idx_admin_fee_pct === 'number' ? s.idx_admin_fee_pct : 0);
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan sistem');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [resolvedParams.series]);

  const handleCheckout = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Create transaction in our backend
      const response = await fetch('/api/carbon-products/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standard_series: standard.series,
          units,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pembayaran gagal diproses');
      }

      if (!data.snapToken) {
        throw new Error('Token pembayaran tidak valid');
      }

      // Open Midtrans Snap UI
      if (window.snap && typeof window.snap.pay === 'function') {
        window.snap.pay(data.snapToken, {
          onSuccess: function(result) {
            router.push(`/certificates/${data.id}?status=success`);
          },
          onPending: function(result) {
            router.push(`/certificates/${data.id}?status=pending`);
          },
          onError: function(result) {
            setError('Pembayaran gagal atau dibatalkan.');
            setIsProcessing(false);
          },
          onClose: function() {
            setError('Pembayaran ditutup tanpa diselesaikan.');
            setIsProcessing(false);
          }
        });
      } else {
        // Fallback to URL redirect if snap.js is not loaded
        window.location.href = data.snapUrl;
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses pembayaran');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!standard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-5 text-center">
        <p className="text-xl font-bold text-red-500 mb-2">Error</p>
        <p className="text-textMuted mb-4">{error || 'Standar tidak ditemukan'}</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-primary text-white rounded-xl">
          Kembali
        </button>
      </div>
    );
  }

  const unitPrice = typeof standard.price === 'string' ? parseFloat(standard.price) : standard.price;
  const subtotal = unitPrice * units;
  const adminFee = subtotal * (adminFeePct / 100);
  const ppnBase  = subtotal + adminFee;
  const ppn      = ppnBase * (ppnPct / 100);
  const totalPrice = subtotal + adminFee + ppn;
  const totalEmissionTon = formatEmission(totalEmission, 'ton');

  return (
    <div className="app-container">
      <StatusBar />
      
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-border sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center text-primary">
          <IoArrowBack className="text-xl" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-textDark">Detail & Checkout</h1>
          <p className="text-xs text-textMuted">Tinjau produk & rincian biaya</p>
        </div>
      </div>

      <div className="px-4 py-4 pb-32 space-y-4">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
            <span>⚠️</span>
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Standard detail card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-stretch">
            <div className="w-1.5 flex-shrink-0 bg-primary" />
            <div className="flex-1 min-w-0 p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-primaryLight text-primary text-[10px] font-bold uppercase tracking-wide">
                  {standard.series}
                </span>
                <span className="text-[10px] text-gray-500">Vintage {standard.vintage}</span>
              </div>
              <h2 className="text-sm font-bold text-gray-900 leading-snug">{standard.name}</h2>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Harga per tCO₂e</span>
                <span className="text-base font-bold text-primary">{formatCurrency(unitPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Allocation info — explain where the money goes (IDX Carbon) */}
        <div>
          <div className="flex items-start gap-2 mb-2 px-1">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Dana Anda Akan Dialokasikan</p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                Pembelian kredit karbon ini disalurkan melalui bursa IDX Carbon ke salah satu proyek pengurangan emisi di bawah ini.
              </p>
            </div>
            {standard.products?.length > 0 && (
              <span className="text-[10px] text-gray-400 whitespace-nowrap pt-0.5">{standard.products.length} proyek</span>
            )}
          </div>

          {standard.products && standard.products.length > 0 ? (
            <div className="space-y-2">
              {standard.products.map(({ product }) => (
                <Link
                  key={product.id}
                  href={`/carbon-market/project/${product.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="flex items-center p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 leading-snug break-words">{product.name}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                        <IoLocationOutline className="flex-shrink-0" />
                        <span className="truncate">{product.location || 'Lokasi tidak diketahui'}</span>
                      </div>
                    </div>
                    <IoChevronForward className="text-base text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-5 rounded-xl border border-dashed border-gray-200 text-center">
              <p className="text-xs text-gray-500">Belum ada proyek yang terdaftar di standar ini.</p>
            </div>
          )}
        </div>

        {/* Units selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-semibold text-gray-900">Jumlah Unit</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Kewajiban offset Anda: {totalEmissionTon} tCO₂e</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUnits(Math.max(1, units - 1))}
                disabled={units <= 1}
                className="text-primary disabled:text-gray-300 active:scale-90 transition-transform"
                aria-label="Kurangi"
              >
                <IoRemoveCircle className="text-3xl" />
              </button>
              <span className="text-xl font-bold min-w-[2.5rem] text-center tabular-nums">{units}</span>
              <button
                onClick={() => setUnits(units + 1)}
                className="text-primary active:scale-90 transition-transform"
                aria-label="Tambah"
              >
                <IoAddCircle className="text-3xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rincian Pembayaran</p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">
                Subtotal
                <span className="text-[10px] text-gray-400 ml-1 tabular-nums">{units} × {formatCurrency(unitPrice)}</span>
              </span>
              <span className="font-medium text-gray-900 tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">
                Biaya Admin
                <span className="text-[10px] text-gray-400 ml-1">{adminFeePct.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%</span>
              </span>
              <span className="font-medium text-gray-900 tabular-nums">{formatCurrency(adminFee)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">
                PPN
                <span className="text-[10px] text-gray-400 ml-1">{ppnPct}%</span>
              </span>
              <span className="font-medium text-gray-900 tabular-nums">{formatCurrency(ppn)}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-dashed border-gray-200 flex justify-between items-baseline">
            <span className="text-sm font-bold text-gray-900">Total Pembayaran</span>
            <span className="text-xl font-bold text-primary tabular-nums">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 px-5">
        <button
          onClick={handleCheckout}
          disabled={isProcessing || !standard.products || standard.products.length === 0}
          className={`w-full py-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 ${
            isProcessing || !standard.products || standard.products.length === 0 ? 'bg-gray-400' : 'bg-primary hover:bg-primaryDark'
          } transition-colors`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Memproses...</span>
            </>
          ) : (
            `Bayar ${formatCurrency(totalPrice)}`
          )}
        </button>
      </div>
    </div>
  );
}
