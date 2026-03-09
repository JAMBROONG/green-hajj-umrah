'use client';

import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaLeaf, FaHeart } from 'react-icons/fa';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaArrowLeft className="text-xl" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Tentang Aplikasi</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {/* App Logo */}
        <div className="bg-white rounded-xl shadow-md p-8 text-center mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaLeaf className="text-4xl text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Green Haj & Umrah</h2>
          <p className="text-sm text-gray-600 mb-4">
            Aplikasi Pelacak Jejak Karbon Perjalanan Ibadah
          </p>
          <div className="inline-block px-4 py-2 bg-emerald-50 rounded-full">
            <span className="text-sm font-medium text-emerald-700">Versi 1.0.0</span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Tentang</h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Green Haj & Umrah adalah aplikasi yang membantu jamaah haji dan umrah untuk
            melacak jejak karbon selama perjalanan ibadah mereka. Dengan mengetahui
            emisi karbon yang dihasilkan, jamaah dapat mengambil langkah untuk
            mengurangi dampak lingkungan dan melakukan offset karbon.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs text-emerald-600">✓</span>
              </div>
              <p className="text-sm text-gray-600">
                Lacak emisi dari transportasi, akomodasi, makanan, dan aktivitas lainnya
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs text-emerald-600">✓</span>
              </div>
              <p className="text-sm text-gray-600">
                Dapatkan saran untuk mengurangi jejak karbon Anda
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs text-emerald-600">✓</span>
              </div>
              <p className="text-sm text-gray-600">
                Offset emisi melalui program reboisasi dan energi terbarukan
              </p>
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Dibuat dengan</h3>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <FaHeart className="text-red-500" />
            <span>Untuk jamaah haji dan umrah yang peduli lingkungan</span>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Teknologi</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Next.js 15 - React Framework</p>
            <p>• PostgreSQL - Database</p>
            <p>• Prisma - ORM</p>
            <p>• NextAuth.js - Authentication</p>
            <p>• Tailwind CSS - Styling</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2026 Green Haj & Umrah. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
