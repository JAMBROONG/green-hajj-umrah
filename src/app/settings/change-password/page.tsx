'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDialog } from '@/contexts/DialogContext';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { showSuccess, showError } = useDialog();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Password saat ini wajib diisi';
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'Password baru wajib diisi';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password minimal 8 karakter';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password tidak cocok';
    }

    if (formData.currentPassword === formData.newPassword && formData.newPassword) {
      newErrors.newPassword = 'Password baru tidak boleh sama dengan password saat ini';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        showSuccess('Password berhasil diubah');
        router.back();
      } else {
        const error = await response.json();
        showError(error.error || 'Gagal mengubah password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      showError('Gagal mengubah password. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="app-container">
      <StatusBar />

      <div className="page pb-32">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white pt-6 pb-6 px-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
            >
              <FaArrowLeft className="text-white text-sm" />
            </button>
            <h1 className="text-xl font-bold">Ubah Password</h1>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-6 space-y-5">
          {/* Icon card */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FaLock className="text-primary text-xl" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Keamanan Akun</p>
              <p className="text-sm text-textMuted">Gunakan kombinasi huruf, angka, dan simbol untuk keamanan lebih baik</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password Saat Ini
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className={`w-full px-4 py-3 border ${
                    errors.currentPassword ? 'border-red-400' : 'border-border'
                  } rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12 text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-gray-700 transition"
                >
                  {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.currentPassword}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password Baru
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Min. 8 karakter"
                  className={`w-full px-4 py-3 border ${
                    errors.newPassword ? 'border-red-400' : 'border-border'
                  } rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12 text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-gray-700 transition"
                >
                  {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Ulangi password baru"
                  className={`w-full px-4 py-3 border ${
                    errors.confirmPassword ? 'border-red-400' : 'border-border'
                  } rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12 text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-gray-700 transition"
                >
                  {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 border border-border rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 btn-primary rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
