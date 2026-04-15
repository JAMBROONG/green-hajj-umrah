'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { APP_NAME } from '@/lib/featureFlags';

export default function AgreementPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/accept-terms', { method: 'POST' });
      if (!res.ok) throw new Error('Gagal menyimpan persetujuan');
      router.replace('/');
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      {/* Top area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-5 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-800 text-center mb-2">
          Sebelum Melanjutkan
        </h1>
        <p className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
          Untuk menggunakan <strong>{APP_NAME}</strong>, Anda perlu menyetujui
          Syarat &amp; Ketentuan dan Kebijakan Privasi kami.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-7 pb-10">
        {/* Summary */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Data Anda Aman</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Kami hanya mengumpulkan data yang diperlukan untuk menghitung jejak karbon
                perjalanan Anda dan memproses transaksi.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Pembayaran Aman</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Kredit karbon dan donasi CSR diproses melalui Midtrans, gateway pembayaran
                terpercaya berstandar PCI-DSS.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Estimasi, Bukan Pengukuran Pasti</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Angka emisi yang dihitung adalah estimasi berdasarkan faktor emisi standar,
                bukan pengukuran aktual.
              </p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5 text-xs text-gray-500 text-center">
          Baca selengkapnya:{' '}
          <Link href="/legal/terms" target="_blank" className="text-emerald-600 font-semibold underline">
            Syarat &amp; Ketentuan
          </Link>
          {' '}&amp;{' '}
          <Link href="/legal/privacy-policy" target="_blank" className="text-emerald-600 font-semibold underline">
            Kebijakan Privasi
          </Link>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            Saya telah membaca dan menyetujui{' '}
            <Link href="/legal/terms" target="_blank" className="text-emerald-600 font-semibold underline">
              Syarat &amp; Ketentuan
            </Link>{' '}
            serta{' '}
            <Link href="/legal/privacy-policy" target="_blank" className="text-emerald-600 font-semibold underline">
              Kebijakan Privasi
            </Link>{' '}
            Green Hajj &amp; Umrah.
          </span>
        </label>

        {error && (
          <p className="text-xs text-red-600 mb-3 text-center">{error}</p>
        )}

        <button
          onClick={handleAccept}
          disabled={!agreed || loading}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </>
          ) : (
            'Setuju & Mulai Gunakan Aplikasi'
          )}
        </button>
      </div>
    </div>
  );
}
