'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { useHajiJourney } from '@/hooks/useHajiJourney';
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

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);

  const [formData, setFormData] = useState({
    foodId: '',
    foodName: '',
    factor: 0,
    servings: 1,
    date: new Date().toISOString().split('T')[0]
  });
  const [foodOptions, setFoodOptions] = useState<FoodSelectOption[]>([]);

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
            value={formData.servings}
            onChange={(e) => setFormData({ ...formData, servings: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
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
