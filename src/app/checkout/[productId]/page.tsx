'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { formatCurrency } from '@/lib/utils';

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
        script.onload = () => {
          if (window.snap && clientKey) {
            window.snap.setClientKey(clientKey);
          }
        };
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
        <div className="p-5 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primaryLight border-t-primary rounded-full mx-auto"></div>
          <p className="text-textMuted mt-3">Memuat produk...</p>
        </div>
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="p-5 text-center">
          <p className="text-textMuted">{error || 'Produk tidak ditemukan'}</p>
          <Link href="/carbon-market" className="text-primary text-sm underline mt-2 inline-block">
            Kembali ke Pasar Karbon
          </Link>
        </div>
      </div>
    );
  }

  const total = (typeof product.price === 'string' ? parseInt(product.price) : product.price) * units;

  const adjustUnits = (delta: number) => {
    setUnits(prev => Math.max(1, Math.min(100, prev + delta)));
  };

  const handlePayment = async () => {
    if (!product) return;
    
    setIsProcessing(true);
    
    try {
      // Call API to create Midtrans transaction
      const response = await fetch('/api/carbon-products/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_code: product.product_code,
          units: units,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process payment');
      }

      const data = await response.json();
      console.log('Payment response:', data);

      // Use Midtrans Snap to open payment window
      if (data.snapToken && window.snap) {
        window.snap.pay(data.snapToken, {
          onSuccess: function(result: MidtransSnapResponse) {
            console.log('✅ Payment success:', result);
            // Payment successful, redirect to transaction detail
            router.push(`/profile?tab=certificates&purchased=${data.id}`);
          },
          onPending: function(result: MidtransSnapResponse) {
            console.log('⏳ Payment pending:', result);
            // Keep waiting for payment
          },
          onError: function(result: MidtransSnapResponse) {
            console.log('❌ Payment error:', result);
            alert('Pembayaran gagal. Silakan coba lagi.');
            setIsProcessing(false);
          },
          onClose: function() {
            console.log('❌ Payment cancelled by user');
            setIsProcessing(false);
          }
        });
      } else {
        throw new Error('Midtrans Snap not available');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(error instanceof Error ? error.message : 'Payment error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border flex items-center gap-3">
          <Link href="/carbon-market" className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-textDark">Checkout Karbon</h1>
        </div>

        <div className="p-5">
          {/* Product Info */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border mb-4 hover-lift fade-in-item">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${product.color_class}`}>
                  {product.product_code}
                </span>
                <p className="text-xs text-textMuted">Proyek: {product.project}</p>
              </div>
              <h3 className="text-base font-bold text-textDark mb-1">{product.name}</h3>
                <p className="text-sm text-primary font-semibold">{formatCurrency(typeof product.price === 'string' ? parseInt(product.price) : product.price)} / tCO2e</p>
            </div>
          </div>

          {/* Purchase Calculator */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border mb-4 fade-in-item">
            <label className="block text-sm font-medium text-textDark mb-3">
              Jumlah Kredit Karbon (tCO2e)
            </label>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => adjustUnits(-1)}
                className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center text-primary font-bold"
              >
                −
              </button>
              <input
                type="number"
                value={units}
                onChange={(e) => setUnits(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-center font-bold text-textDark"
                min="1"
                max="100"
              />
              <button
                onClick={() => adjustUnits(1)}
                className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center text-primary font-bold"
              >
                +
              </button>
            </div>
            
            <div className="bg-primaryLight rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-textMuted mb-0.5">Total Pembayaran</p>
                <p className="text-2xl font-bold text-primary number-display">{formatCurrency(total)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-textMuted mb-0.5">CO2 Offset</p>
                <p className="text-lg font-semibold text-textDark">{units} tCO2e</p>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="btn-primary w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50"
          >
            {isProcessing ? 'Memproses...' : 'Beli Sekarang'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
