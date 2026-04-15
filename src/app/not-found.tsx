import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
        <span className="text-4xl">🕌</span>
      </div>

      <h1 className="text-6xl font-bold text-emerald-600 mb-3">404</h1>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
        Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>

      <Link
        href="/"
        className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
