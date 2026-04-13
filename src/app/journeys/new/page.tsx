'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaKaaba, FaMosque, FaArrowLeft } from 'react-icons/fa';
import { useDialog } from '@/contexts/DialogContext';
import { checkHajjPeriod, HajjPeriodCheckResult, HajjPeriod } from '@/lib/hajjPeriodHelper';
import { isHajjIncluded } from '@/lib/featureFlags';

interface HajjPeriodOption extends HajjPeriod {
  canRegister: boolean;
  isOpen: boolean;
}

export default function NewJourneyPage() {
  const router = useRouter();
  const { showError, showAlert } = useDialog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'umrah' as 'haji' | 'umrah',
    startDate: '',
    endDate: '',
    hajjPeriodYear: '' // Selected hajj period year
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hajjPeriodStatus, setHajjPeriodStatus] = useState<HajjPeriodCheckResult | null>(null);
  const [selectedHajjPeriod, setSelectedHajjPeriod] = useState<HajjPeriodOption | null>(null);
  const [isCheckingHajjPeriod, setIsCheckingHajjPeriod] = useState(false);

  // Normalize date to YYYY-MM-DD string (strips time/timezone)
  const toDateString = (date: string | Date): string => {
    if (!date) return '';
    const d = new Date(date);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Check hajj period on component mount
  useEffect(() => {
    const checkPeriod = async () => {
      const result = await checkHajjPeriod();
      setHajjPeriodStatus(result);
    };
    checkPeriod();
  }, []);

  // Fetch all available hajj periods when type is haji
  const fetchHajjPeriods = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/hajj-periods/all');
      if (response.ok) {
        const data = await response.json();
        
        // Auto-select first available period if any
        if (data.periods && data.periods.length > 0) {
          const firstPeriod = data.periods[0];
          setSelectedHajjPeriod(firstPeriod);
          setFormData(prev => ({ 
            ...prev, 
            hajjPeriodYear: firstPeriod.year.toString(),
            startDate: toDateString(firstPeriod.startDate),
            endDate: toDateString(firstPeriod.endDate)
          }));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error fetching hajj periods:', error);
      return false;
    }
  };

  const handleTypeSelection = async (type: 'haji' | 'umrah') => {
    // If selecting Haji, check period first and fetch all periods
    if (type === 'haji') {
      setIsCheckingHajjPeriod(true);
      const result = await checkHajjPeriod();
      setHajjPeriodStatus(result);
      
      const hasAvailablePeriod = await fetchHajjPeriods();
      setIsCheckingHajjPeriod(false);

      if (!result.canRegister || !hasAvailablePeriod) {
        showAlert(result.message, { title: 'Pendaftaran Haji Belum Dibuka' });
        return; // Don't change type
      }
    } else {
      // Reset hajj-related fields when switching to umrah
      setSelectedHajjPeriod(null);
      setFormData(prev => ({ 
        ...prev, 
        type,
        hajjPeriodYear: '',
        startDate: '',
        endDate: ''
      }));
      return;
    }
    
    setFormData(prev => ({ ...prev, type }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nama perjalanan wajib diisi';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Tanggal mulai wajib diisi';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'Tanggal selesai wajib diisi';
    }
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'Tanggal selesai harus setelah atau sama dengan tanggal mulai';
    }

    // Additional validation for Haji type
    if (formData.type === 'haji') {
      if (selectedHajjPeriod && formData.startDate && formData.endDate) {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        const periodStart = new Date(selectedHajjPeriod.startDate);
        const periodEnd = new Date(selectedHajjPeriod.endDate);

        if (startDate < periodStart || startDate > periodEnd) {
          newErrors.startDate = `Tanggal mulai harus dalam periode ${periodStart.toLocaleDateString('id-ID')} - ${periodEnd.toLocaleDateString('id-ID')}`;
        }
        if (endDate < periodStart || endDate > periodEnd) {
          newErrors.endDate = `Tanggal selesai harus dalam periode ${periodStart.toLocaleDateString('id-ID')} - ${periodEnd.toLocaleDateString('id-ID')}`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to the new trip's detail page
        router.push(`/journeys/${data.trip.id}`);
      } else {
        const error = await response.json();
        showError(error.error || 'Gagal membuat perjalanan');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Failed to create trip:', error);
      showError('Gagal membuat perjalanan. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaArrowLeft className="text-xl" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Buat Perjalanan Baru</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto px-6 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Perjalanan *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Umrah Ramadan 2026"
              className={`w-full px-4 py-3 border ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Jenis Perjalanan *
            </label>
            <div className={`grid ${isHajjIncluded ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              <button
                type="button"
                onClick={() => handleTypeSelection('umrah')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'umrah'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-300 hover:border-emerald-400'
                }`}
              >
                <FaMosque className={`text-3xl mb-2 ${
                  formData.type === 'umrah' ? 'text-emerald-600' : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  formData.type === 'umrah' ? 'text-emerald-600' : 'text-gray-600'
                }`}>
                  Umrah
                </span>
              </button>

              {isHajjIncluded && (
              <button
                type="button"
                onClick={() => handleTypeSelection('haji')}
                disabled={isCheckingHajjPeriod}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all relative ${
                  formData.type === 'haji'
                    ? 'border-emerald-600 bg-emerald-50'
                    : hajjPeriodStatus && !hajjPeriodStatus.canRegister
                    ? 'border-red-300 bg-red-50 opacity-60 cursor-not-allowed'
                    : 'border-gray-300 hover:border-emerald-400'
                } ${isCheckingHajjPeriod ? 'opacity-50 cursor-wait' : ''}`}
              >
                <FaKaaba className={`text-3xl mb-2 ${
                  formData.type === 'haji' 
                    ? 'text-emerald-600' 
                    : hajjPeriodStatus && !hajjPeriodStatus.canRegister
                    ? 'text-red-400'
                    : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  formData.type === 'haji' 
                    ? 'text-emerald-600' 
                    : hajjPeriodStatus && !hajjPeriodStatus.canRegister
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}>
                  Haji
                </span>
                {hajjPeriodStatus && !hajjPeriodStatus.canRegister && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    Tutup
                  </span>
                )}
              </button>
              )}
            </div>
            
            {/* Hajj Period Info */}
            {isHajjIncluded && hajjPeriodStatus && formData.type === 'haji' && hajjPeriodStatus.canRegister && (
              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700">
                  ℹ️ {hajjPeriodStatus.message}
                </p>
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Mulai *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              min={formData.type === 'haji' && selectedHajjPeriod ? toDateString(selectedHajjPeriod.startDate) : undefined}
              max={formData.type === 'haji' && selectedHajjPeriod ? toDateString(selectedHajjPeriod.endDate) : undefined}
              className={`w-full px-4 py-3 border ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
            )}
            {formData.type === 'haji' && selectedHajjPeriod && (
              <p className="mt-1 text-xs text-gray-500">
                Harus antara {new Date(toDateString(selectedHajjPeriod.startDate) + 'T00:00:00').toLocaleDateString('id-ID')} - {new Date(toDateString(selectedHajjPeriod.endDate) + 'T00:00:00').toLocaleDateString('id-ID')}
              </p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Selesai *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate || (formData.type === 'haji' && selectedHajjPeriod ? toDateString(selectedHajjPeriod.startDate) : undefined)}
              max={formData.type === 'haji' && selectedHajjPeriod ? toDateString(selectedHajjPeriod.endDate) : undefined}
              className={`w-full px-4 py-3 border ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
            {formData.startDate && (
              <p className="mt-1 text-xs text-gray-500">
                Tidak boleh lebih awal dari tanggal mulai
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Membuat...' : 'Buat Perjalanan'}
          </button>
        </form>
      </div>
    </div>
  );
}
