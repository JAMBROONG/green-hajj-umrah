'use client';

import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { generateTransactionId } from '@/lib/utils';

export default function CertificatePage() {
  const certNumber = generateTransactionId();
  const currentDate = new Date().toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

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
          <h1 className="text-lg font-bold text-textDark">Sertifikat Karbon</h1>
        </div>

        <div className="p-5">
          {/* BPKH & BATS Consulting Certificate */}
          <div className="mb-4 fade-in-item">
            <div className="bg-primary rounded-2xl p-5 text-white shadow-lg">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">🏅</span>
                </div>
                <h2 className="text-lg font-bold mb-1">Sertifikat Partisipasi</h2>
                <p className="text-xs opacity-90">Program Green Haj & Umrah</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                <div className="text-center mb-3">
                  <p className="text-xs opacity-75 mb-1">Diberikan kepada</p>
                  <p className="text-lg font-bold">Brian Pramudita</p>
                </div>
                <div className="text-center mb-3">
                  <p className="text-xs opacity-75 mb-1">Telah berpartisipasi dalam</p>
                  <p className="text-sm font-semibold">Program Perhitungan & Offset Emisi CO2e</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
                  <div className="text-center">
                    <p className="text-xs opacity-75 mb-1">No. Sertifikat</p>
                    <p className="text-xs font-mono font-semibold">{certNumber}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs opacity-75 mb-1">Tanggal</p>
                    <p className="text-xs font-semibold">{currentDate}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs opacity-75 mb-1">Dikeluarkan oleh</p>
                  <p className="text-sm font-bold">BPKH</p>
                  <p className="text-xs opacity-75">Badan Pengelola Keuangan Haji</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs opacity-75 mb-1">Didukung oleh</p>
                  <p className="text-sm font-bold">BATS Consulting</p>
                  <p className="text-xs opacity-75">Technology Partner</p>
                </div>
              </div>
            </div>
          </div>

          {/* IDX Carbon Certificate (Review Status) */}
          <div className="mt-6 fade-in-item" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-sm font-semibold text-textDark mb-3">Sertifikat IDX Carbon</h3>
            <div className="bg-white rounded-2xl p-5 border-2 border-dashed border-border text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">⏳</span>
              </div>
              <h4 className="text-sm font-semibold text-textDark mb-2">
                Dalam Review
              </h4>
              <p className="text-xs text-textMuted mb-4 leading-relaxed">
                Sertifikat kredit karbon dari IDX akan tersedia setelah transaksi pembelian kredit karbon Anda diverifikasi.
              </p>
              <Link
                href="/carbon-market"
                className="inline-block btn-primary px-6 py-2 rounded-lg text-white text-sm font-semibold"
              >
                Beli Kredit Karbon
              </Link>
            </div>
          </div>

          {/* Info Footer */}
          <div className="mt-5 bg-blue-50 rounded-xl p-4 border border-blue-200 fade-in-item" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-start gap-2">
              <span className="text-lg">ℹ️</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-900 mb-1">Tentang Sertifikat</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Sertifikat ini membuktikan partisipasi Anda dalam program Green Haj & Umrah untuk mengurangi jejak karbon perjalanan ibadah.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
