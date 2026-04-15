'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M3 3l18 18M12 18.01V18" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-2">Tidak Ada Koneksi</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
        Anda sedang offline. Pastikan perangkat Anda terhubung ke internet, lalu coba lagi.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
      >
        Coba Lagi
      </button>
    </div>
  );
}
