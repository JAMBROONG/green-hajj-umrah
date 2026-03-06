'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { CARBON_PRODUCTS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { CarbonProductId, PaymentMethod } from '@/lib/types';

export default function CheckoutPage({ 
  params 
}: { 
  params: Promise<{ productId: CarbonProductId }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { totalEmission } = useHajiJourney();
  
  const [units, setUnits] = useState(Math.ceil(totalEmission / 1000));
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const product = CARBON_PRODUCTS[resolvedParams.productId];
  
  if (!product) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="p-5 text-center">
          <p className="text-textMuted">Produk tidak ditemukan</p>
          <Link href="/carbon-market" className="text-primary text-sm underline mt-2 inline-block">
            Kembali ke Pasar Karbon
          </Link>
        </div>
      </div>
    );
  }

  const total = product.price * units;

  const paymentMethods: { id: PaymentMethod; name: string; icon: string }[] = [
    { id: 'gopay', name: 'GoPay', icon: '💚' },
    { id: 'ovo', name: 'OVO', icon: '💜' },
    { id: 'dana', name: 'DANA', icon: '💙' },
    { id: 'bca', name: 'BCA Virtual Account', icon: '🏦' },
    { id: 'mandiri', name: 'Mandiri VA', icon: '🏦' },
    { id: 'bni', name: 'BNI VA', icon: '🏦' }
  ];

  const adjustUnits = (delta: number) => {
    setUnits(prev => Math.max(1, Math.min(100, prev + delta)));
  };

  const handlePayment = () => {
    if (!selectedPayment) return;
    
    setIsProcessing(true);
    
    setTimeout(() => {
      const searchParams = new URLSearchParams({
        productId: resolvedParams.productId,
        productName: product.name,
        units: units.toString(),
        total: total.toString(),
        payment: selectedPayment
      });
      
      router.push(`/success?${searchParams.toString()}`);
    }, 1500);
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
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${product.colorClass}`}>
                  {resolvedParams.productId}
                </span>
                <p className="text-xs text-textMuted">Proyek: {product.project}</p>
              </div>
              <h3 className="text-base font-bold text-textDark mb-1">{product.name}</h3>
              <p className="text-sm text-primary font-semibold">{formatCurrency(product.price)} / tCO2e</p>
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

          {/* Payment Method */}
          <p className="text-sm font-medium text-textDark mb-3">Pilih metode pembayaran:</p>
          <div className="space-y-2 mb-5">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedPayment(method.id)}
                className={`payment-method w-full bg-white rounded-xl p-4 border-2 transition-all text-left ${
                  selectedPayment === method.id ? 'selected' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{method.icon}</span>
                  <span className="text-sm font-medium text-textDark">{method.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Checkout Button */}
          <button
            onClick={handlePayment}
            disabled={!selectedPayment || isProcessing}
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
