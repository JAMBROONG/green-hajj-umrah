'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { formatCurrency, formatEmission } from '@/lib/utils';
import { IoArrowBack, IoMapOutline, IoLocationOutline } from 'react-icons/io5';

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

  // Load standard data
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/carbon-product-standards/${resolvedParams.series}`);
        if (!response.ok) {
          throw new Error('Gagal memuat detail standar');
        }
        const data = await response.json();
        setStandard(data);
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
  const totalPrice = unitPrice * units;
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

      <div className="p-5 pb-32">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-2xl mb-5 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <p className="flex-1 mt-0.5">{error}</p>
          </div>
        )}

        {/* Standard Detail summary */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm mb-5">
          <div className="flex justify-between items-start mb-3">
            <span className="px-2.5 py-1 rounded-full bg-primaryLight text-primary text-[10px] font-bold">
              {standard.series}
            </span>
            <span className="text-[10px] text-textMuted px-2 py-1 bg-gray-50 rounded-full border border-gray-100">
              Vintage: {standard.vintage}
            </span>
          </div>
          <h2 className="text-lg font-bold text-textDark mb-1">{standard.name}</h2>
          <p className="text-xs text-textMuted mb-4">Nilai pasar karbon Standar Nasional</p>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-textMuted">Harga Satuan (tCO2e)</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(unitPrice)}</span>
          </div>
        </div>

        {/* Pick Product Section */}
        <h3 className="text-sm font-bold text-textDark mb-3">Terkait dengan Proyek Karbon:</h3>
        {standard.products && standard.products.length > 0 ? (
          <div className="space-y-3 mb-6">
            {standard.products.map(({ product }) => (
              <div 
                key={product.id}
                className="flex gap-3 p-4 rounded-2xl border bg-white border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-textDark mb-1">{product.name}</h4>
                  <div className="flex items-center gap-1 text-[10px] text-textMuted mb-2">
                    <IoLocationOutline />
                    <span>{product.location || 'Lokasi tidak diketahui'}</span>
                  </div>
                  <p className="text-xs text-textMuted line-clamp-2 mb-3">
                    {product.description || 'Tidak ada deskripsi proyek.'}
                  </p>
                  
                  {/* Link to Detail Project */}
                  <Link href={`/carbon-market/project/${product.id}`} className="inline-flex py-1.5 px-3 bg-white text-primary border border-primary/20 rounded-lg text-[10px] font-bold items-center gap-1.5 hover:bg-gray-50 transition-colors">
                    Lihat Detail Proyek <span className="text-lg">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200 text-center mb-6">
            <p className="text-sm text-textMuted">Gagal memuat produk, belum ada produk yang terikat ke standar ini.</p>
          </div>
        )}

        {/* Calculation */}
        <h3 className="text-sm font-bold text-textDark mb-3">Rincian Pembayaran</h3>
        <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-textMuted">Kewajiban Offset Anda</span>
            <span className="text-sm font-semibold">{totalEmissionTon} tCO2e</span>
          </div>

          <div className="flex justify-between items-center py-4 border-y border-border mb-4">
            <span className="text-sm text-textDark">Jumlah Unit Dibeli</span>
            <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-200">
              <button 
                onClick={() => setUnits(Math.max(1, units - 1))}
                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold active:scale-95"
              >-</button>
              <span className="text-lg font-bold min-w-[2rem] text-center">{units}</span>
              <button 
                onClick={() => setUnits(units + 1)}
                className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold active:scale-95"
              >+</button>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-textDark">Total Pembayaran</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(totalPrice)}</span>
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
