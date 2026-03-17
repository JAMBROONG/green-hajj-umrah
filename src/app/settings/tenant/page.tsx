'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaBuilding } from 'react-icons/fa';
import { useDialog } from '@/contexts/DialogContext';

export default function EditTenantPage() {
  const router = useRouter();
  const { showSuccess, showError } = useDialog();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTenant = async () => {
    try {
      const response = await fetch('/api/auth/profile');
      if (response.ok) {
        const data = await response.json();
        const profile = data.profile;
        
        if (profile.tenant) {
          setTenantName(profile.tenant.name || '');
        } else {
          showError('Organisasi tidak ditemukan');
          router.push('/settings');
        }
      } else {
        showError('Gagal memuat organisasi');
        router.push('/settings');
      }
    } catch (error) {
      console.error('Failed to load tenant:', error);
      showError('Gagal memuat organisasi');
      router.push('/settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!tenantName.trim()) {
      newErrors.tenantName = 'Nama organisasi wajib diisi';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName.trim(),
        }),
      });

      if (response.ok) {
        showSuccess('Organisasi berhasil diperbarui');
        router.push('/settings');
      } else {
        const error = await response.json();
        showError(error.error || 'Gagal menyimpan organisasi');
      }
    } catch (error) {
      console.error('Failed to update tenant:', error);
      showError('Gagal menyimpan organisasi. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat organisasi...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-800">Edit Organisasi</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Organization Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <FaBuilding className="text-4xl text-emerald-600" />
            </div>
          </div>

          {/* Tenant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Organisasi *
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => {
                setTenantName(e.target.value);
                setErrors({ ...errors, tenantName: '' });
              }}
              placeholder="Masukkan nama organisasi"
              className={`w-full px-4 py-3 border ${
                errors.tenantName ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
            {errors.tenantName && (
              <p className="mt-1 text-sm text-red-600">{errors.tenantName}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Nama organisasi akan digunakan sebagai identitas utama pada aplikasi
            </p>
          </div>

          {/* Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800">
              ℹ️ Perubahan nama organisasi akan berlaku untuk semua anggota organisasi
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
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
