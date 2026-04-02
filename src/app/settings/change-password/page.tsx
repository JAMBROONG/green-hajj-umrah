'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaLock } from 'react-icons/fa';
import { useDialog } from '@/contexts/DialogContext';

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

    if (formData.currentPassword === formData.newPassword) {
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
        router.push('/settings');
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
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
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
            <h1 className="text-2xl font-bold text-gray-800">Ubah Password</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Lock Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <FaLock className="text-4xl text-emerald-600" />
            </div>
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Saat Ini *
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                placeholder="Masukkan password saat ini"
                className={`w-full px-4 py-3 border ${
                  errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({
                  ...prev,
                  current: !prev.current
                }))}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.current ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Baru *
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Masukkan password baru (min. 8 karakter)"
                className={`w-full px-4 py-3 border ${
                  errors.newPassword ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({
                  ...prev,
                  new: !prev.new
                }))}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.new ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konfirmasi Password *
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Konfirmasi password baru"
                className={`w-full px-4 py-3 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({
                  ...prev,
                  confirm: !prev.confirm
                }))}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.confirm ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Info Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 Password minimal 8 karakter. Gunakan kombinasi huruf, angka, dan simbol untuk keamanan lebih baik.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Memproses...' : 'Ubah Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
