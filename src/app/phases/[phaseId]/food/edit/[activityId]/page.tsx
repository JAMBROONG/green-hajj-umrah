'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Select from 'react-select';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS, FOODS_DATA } from '@/lib/constants';
import { FoodActivity, PhaseId } from '@/lib/types';
import { MdRestaurant } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';

export default function EditFoodPage() {
  const params = useParams();
  const router = useRouter();
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const activityId = params.activityId as string;
  const { journey, updateCategory } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const categoryData = journey?.phases[phaseId]?.categories?.food;
  const activities = (categoryData?.activities as FoodActivity[]) || [];
  const activity = activities.find(a => a.id === activityId);

  const food = activity ? FOODS_DATA.find(f => f.id === activity.foodId) : undefined;
  const [formData, setFormData] = useState({
    foodId: activity?.foodId || '',
    foodName: activity?.foodName || '',
    factor: food?.factor || 0,
    servings: activity?.servings || 1,
    date: activity?.date || ''
  });

  const foodOptions = FOODS_DATA.map(food => ({
    value: food.id,
    label: food.name,
    food: food
  }));

  type FoodOption = typeof foodOptions[number];

  const handleFoodChange = (option: FoodOption | null) => {
    if (option) {
      setFormData({
        ...formData,
        foodId: option.food.id,
        foodName: option.food.name,
        factor: option.food.factor
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

    const updatedActivity: FoodActivity = {
      ...activity!,
      foodId: formData.foodId,
      foodName: formData.foodName,
      servings: formData.servings,
      date: formData.date,
      emission
    };

    const updatedActivities = activities.map(a => 
      a.id === activityId ? updatedActivity : a
    );
    const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

    updateCategory(phaseId, 'food', {
      completed: false,
      activities: updatedActivities,
      totalEmission,
      emission: totalEmission
    });

    router.push(`/phases/${phaseId}/food`);
  };

  const handleCancel = () => {
    router.push(`/phases/${phaseId}/food`);
  };

  if (!phase || !activity) {
    return null;
  }

  const selectedOption = foodOptions.find(opt => opt.value === formData.foodId);

  return (
    <div className="app-container">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
      {/* Header */}
      <div className="bg-primary text-white p-6 rounded-b-3xl shadow-lg">
        <button
          onClick={handleCancel}
          className="mb-4 text-white/80 hover:text-white flex items-center gap-2"
        >
          <IoArrowBack className="text-xl" /> Kembali
        </button>
        <div className="flex items-center gap-3">
          <MdRestaurant className="text-3xl text-orange-400" />
          <div>
            <h1 className="text-xl font-bold">Edit Konsumsi</h1>
            <p className="text-sm text-white/80">{phase.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Food Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Jenis Makanan *
          </label>
          <Select
            options={foodOptions}
            value={selectedOption}
            onChange={handleFoodChange}
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
            step="1"
            value={formData.servings}
            onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
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
            className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90"
          >
            Simpan
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
