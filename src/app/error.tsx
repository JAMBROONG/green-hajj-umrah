'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-2">Terjadi Kesalahan</h1>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-xs">
        Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke beranda.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm text-center"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
