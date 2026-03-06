'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { formatCurrency, generateTransactionId } from '@/lib/utils';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  
  const productId = searchParams.get('productId') || '';
  const productName = searchParams.get('productName') || '';
  const units = searchParams.get('units') || '0';
  const total = searchParams.get('total') || '0';
  const payment = searchParams.get('payment') || '';
  const trxId = generateTransactionId();

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-textDark">Pembayaran Berhasil</h1>
        </div>

        <div className="p-5 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 fade-in-item">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-textDark mb-2 fade-in-item" style={{ animationDelay: '0.1s' }}>
            Terima Kasih!
          </h2>
          <p className="text-sm text-textMuted mb-6 fade-in-item" style={{ animationDelay: '0.15s' }}>
            Pembelian kredit karbon Anda berhasil. Kontribusi Anda membantu pelestarian lingkungan.
          </p>

          {/* Transaction Details */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border text-left mb-5 fade-in-item" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-sm font-semibold text-textDark mb-3">Detail Transaksi</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-textMuted">Produk</span>
                <span className="font-medium text-textDark">{productId} - {productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Jumlah</span>
                <span className="font-medium text-textDark">{units} tCO2e</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted">Total</span>
                <span className="font-bold text-primary">{formatCurrency(Number(total))}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-textMuted">ID Transaksi</span>
                <span className="font-mono text-xs font-medium text-textDark">{trxId}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 fade-in-item" style={{ animationDelay: '0.25s' }}>
            <Link
              href="/certificate"
              className="block btn-primary w-full py-3 rounded-xl text-white font-semibold text-center"
            >
              Lihat Sertifikat
            </Link>
            <Link
              href="/"
              className="block w-full py-3 rounded-xl text-primary font-semibold text-center border-2 border-primary hover:bg-primaryLight transition-all"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
