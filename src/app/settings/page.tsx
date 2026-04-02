'use client';

import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { FaArrowLeft, FaUser, FaSignOutAlt, FaBuilding, FaInfo, FaLock } from 'react-icons/fa';
import { IoSettings } from 'react-icons/io5';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

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
            <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <FaUser className="text-3xl text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800 text-lg">
                {session?.user?.name || 'User'}
              </h2>
              <p className="text-sm text-gray-600">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-4">
          {/* Account Settings */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <IoSettings className="text-emerald-600" />
                Akun
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              <button
                onClick={() => router.push('/settings/profile')}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FaUser className="text-gray-400" />
                  <span className="text-gray-700">Edit Profil</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>
              <button
                onClick={() => router.push('/settings/change-password')}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FaLock className="text-gray-400" />
                  <span className="text-gray-700">Ubah Password</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>
              <button
                onClick={() => router.push('/settings/tenant')}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FaBuilding className="text-gray-400" />
                  <span className="text-gray-700">Organisasi</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FaInfo className="text-emerald-600" />
                Tentang
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              <button
                onClick={() => router.push('/settings/about')}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FaInfo className="text-gray-400" />
                  <span className="text-gray-700">Tentang Aplikasi</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-500">Versi 1.0.0</p>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full bg-white rounded-xl shadow-md px-5 py-4 flex items-center justify-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
          >
            <FaSignOutAlt className="text-xl" />
            <span className="font-semibold">Keluar</span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Green Haj & Umrah
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Lacak jejak karbon perjalanan ibadah Anda
          </p>
        </div>
      </div>
    </div>
  );
}
