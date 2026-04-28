'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useTripDateBounds, clampToTripBounds } from '@/hooks/useTripDateBounds';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { fetchFoodEmissionFactors, toFoodSelectOptions, FoodSelectOption } from '@/lib/foodHelper';
import { FoodActivity, PhaseId } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { MdRestaurant } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';

export default function AddFoodPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();
  const { minDate, maxDate } = useTripDateBounds(tripId);

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);

  const [formData, setFormData] = useState({
    foodId: '',
    foodName: '',
    factor: 0,
    servings: 0,                                  // mulai blank — bukan paksa 1, biar user gak harus block-and-delete
    date: new Date().toISOString().split('T')[0]
  });
  const [foodOptions, setFoodOptions] = useState<FoodSelectOption[]>([]);

  // Saat trip date bounds load, clamp tanggal ke range trip kalau di luar.
  // Default `new Date()` bisa jatuh sebelum minDate (trip future) atau setelah
  // maxDate (trip lampau). Clamp menjamin user mulai dengan tanggal valid.
  useEffect(() => {
    if (!minDate && !maxDate) return;
    setFormData(prev => {
      const clamped = clampToTripBounds(prev.date, { minDate, maxDate });
      return clamped === prev.date ? prev : { ...prev, date: clamped };
    });
  }, [minDate, maxDate]);

  useEffect(() => {
    const loadFoodOptions = async () => {
      try {
        const items = await fetchFoodEmissionFactors();
        setFoodOptions(toFoodSelectOptions(items));
      } catch (error) {
        console.error('Failed to load food emission factors:', error);
      }
    };

    loadFoodOptions();
  }, []);

  const handleFoodChange = (option: FoodSelectOption | null) => {
    if (option) {
      setFormData({
        ...formData,
        foodId: option.value,
        foodName: option.label,
        factor: option.factor
      });
    } else {
      setFormData({
        ...formData,
        foodId: '',
        foodName: '',
        factor: 0
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.foodId) {
      showWarning('Pilih jenis makanan terlebih dahulu', { title: 'Data Belum Lengkap' });
      return;
    }

    if (formData.servings < 1) {
      showWarning('Jumlah porsi minimal 1', { title: 'Data Belum Lengkap' });
      return;
    }

    const emission = formData.servings * formData.factor;

    const newActivity: FoodActivity = {
      id: uuidv4(),
      foodId: formData.foodId,
      foodName: formData.foodName,
      servings: formData.servings,
      date: formData.date,
      emission
    };

    // Get existing activities
    const existingData = journey?.phases[phaseId]?.categories?.food;
    const existingActivities = (existingData?.activities as FoodActivity[]) || [];
    
    // Add new activity
    const updatedActivities = [...existingActivities, newActivity];
    const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

    // Update category with new activities array
    updateCategory(phaseId, 'food', {
      completed: false,
      activities: updatedActivities,
      totalEmission,
      // Keep legacy field for backward compatibility
      emission: totalEmission
    });

    // Navigate back
    const url = tripId ? `/phases/${phaseId}/food?tripId=${tripId}` : `/phases/${phaseId}/food`;
    router.push(url);
  };

  const handleCancel = () => {
    const url = tripId ? `/phases/${phaseId}/food?tripId=${tripId}` : `/phases/${phaseId}/food`;
    router.push(url);
  };

  if (!phase) {
    return null;
  }

  return (
    <div className="app-container">
      <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div
        className="text-white shadow-lg"
        style={{ backgroundImage: "url('/bg-menu.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="px-5 pt-5 pb-5">
          <button
            onClick={handleCancel}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors mb-4"
          >
            <IoArrowBack className="text-base text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <MdRestaurant className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tambah Konsumsi</h1>
              <p className="text-sm text-white/75">{phase.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
        {/* Food Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Jenis Makanan *
          </label>
          <Select
            instanceId={`food-select-${phaseId}`}
            inputId={`food-select-input-${phaseId}`}
            options={foodOptions}
            onChange={(option) => handleFoodChange(option as FoodSelectOption | null)}
            placeholder="Cari makanan..."
            className="react-select-container"
            classNamePrefix="react-select"
            isClearable
            isSearchable
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: '0.75rem',
                borderWidth: '2px',
                borderColor: '#e5e7eb',
                padding: '0.25rem',
                '&:hover': {
                  borderColor: '#0D6E4F'
                }
              }),
              menu: (base) => ({
                ...base,
                borderRadius: '0.75rem',
                overflow: 'hidden'
              })
            }}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tanggal *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            min={minDate || undefined}
            max={maxDate || undefined}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Servings */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jumlah Porsi *
          </label>
          <input
            type="number"
            min="1"
            max="10"
            step="1"
            // Tampilkan kosong saat 0 supaya user bisa langsung ketik tanpa
            // harus block-and-delete angka default — masalahnya dulu auto-fix
            // ke 1 yang bikin user gak bisa hapus dulu sebelum ketik baru.
            value={formData.servings || ''}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') {
                setFormData({ ...formData, servings: 0 })
                return
              }
              const num = parseInt(raw, 10)
              if (Number.isNaN(num)) return
              setFormData({ ...formData, servings: Math.min(10, Math.max(0, num)) })
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            placeholder="1 - 10"
            required
          />
        </div>

        {/* Preview Emission */}
        {formData.foodId && (
          <div className="p-4 bg-primaryLight rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Estimasi Emisi</p>
            <p className="text-2xl font-bold text-primary">
              {(formData.servings * formData.factor).toFixed(2)} kg CO₂e
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formData.factor} kg CO₂e per porsi × {formData.servings} porsi
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="flex-1 py-3 btn-primary rounded-xl font-semibold"
          >
            Simpan
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
