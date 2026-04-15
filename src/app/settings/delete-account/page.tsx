'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { FaArrowLeft, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { IoEye, IoEyeOff } from 'react-icons/io5';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState<'confirm' | 'password'>('confirm');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!password.trim()) {
      setError('Masukkan kata sandi untuk mengkonfirmasi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal menghapus akun. Silakan coba lagi.');
        setLoading(false);
        return;
      }

      // Sign out and redirect
      await signOut({ redirect: false });
      router.replace('/auth/signin?deleted=true');
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
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
            <h1 className="text-xl font-bold text-gray-800">Hapus Akun</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        {/* Warning Card */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <FaExclamationTriangle className="text-red-600 text-xl" />
            </div>
            <h2 className="text-base font-bold text-red-800">Peringatan Penting</h2>
          </div>
          <p className="text-sm text-red-700 leading-relaxed mb-3">
            Tindakan ini <strong>tidak dapat dibatalkan</strong>. Seluruh data berikut akan
            dihapus secara permanen:
          </p>
          <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
            <li>Semua data perjalanan dan perhitungan emisi</li>
            <li>Riwayat pembelian kredit karbon</li>
            <li>Riwayat donasi CSR</li>
            <li>Sertifikat yang telah diterbitkan</li>
            <li>Profil dan informasi akun</li>
          </ul>
        </div>

        {step === 'confirm' ? (
          /* Step 1: Confirmation */
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-2">Apakah Anda yakin?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Jika Anda yakin ingin menghapus akun, klik tombol di bawah untuk melanjutkan
              ke langkah konfirmasi.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep('password')}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm"
              >
                Ya, Saya Ingin Menghapus Akun
              </button>
              <button
                onClick={() => router.back()}
                className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm"
              >
                Batal, Kembali ke Pengaturan
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Password Confirmation */
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h3 className="font-bold text-gray-800 mb-2">Konfirmasi Kata Sandi</h3>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Masukkan kata sandi Anda untuk mengkonfirmasi penghapusan akun.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
                  placeholder="Masukkan kata sandi Anda"
                  className="w-full pr-12 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 mb-4">{error}</p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                disabled={loading || !password.trim()}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <FaTrash />
                    Hapus Akun Permanen
                  </>
                )}
              </button>
              <button
                onClick={() => { setStep('confirm'); setError(''); setPassword(''); }}
                className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm"
              >
                Kembali
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
