'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { fetchFoodEmissionFactors, toFoodSelectOptions, FoodSelectOption } from '@/lib/foodHelper';
import { FoodActivity, PhaseId } from '@/lib/types';
import { MdRestaurant } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';

const LEGACY_FOOD_LOOKUP: Record<string, { label: string; factor: number }> = {
  'nasi-ayam': { label: 'Nasi dengan Ayam', factor: 1.2 },
  'nasi-kambing': { label: 'Nasi dengan Kambing', factor: 3.5 },
  'nasi-ikan': { label: 'Nasi dengan Ikan', factor: 1.5 },
  'kebab': { label: 'Kebab/Shawarma', factor: 2.8 },
  'mandi-rice': { label: 'Mandi Rice', factor: 3.0 },
  'kabsa': { label: 'Kabsa (Saudi Traditional)', factor: 3.2 },
  'biryani': { label: 'Biryani', factor: 2.5 },
  'salad': { label: 'Salad/Sayuran', factor: 0.5 },
  'roti-hummus': { label: 'Roti dengan Hummus', factor: 0.8 },
  'sup-lentil': { label: 'Sup Lentil', factor: 0.6 },
  'falafel': { label: 'Falafel', factor: 0.7 },
  'dates-fruits': { label: 'Kurma & Buah-buahan', factor: 0.3 },
  'vegan': { label: 'Makanan vegan', factor: 0.39 },
  'vegetarian': { label: 'Makanan vegetarian', factor: 0.51 },
  'ikan-berlemak': { label: 'Makan dengan ikan berlemak', factor: 1.11 },
  'ayam': { label: 'Makan dengan ayam', factor: 1.58 },
  'ikan-putih': { label: 'Makan dengan ikan putih', factor: 1.98 },
  'daging-sapi': { label: 'Makan dengan daging sapi', factor: 7.26 }
};

const normalizeText = (value: string | undefined) => (value || '').trim().toLowerCase();

type FoodFormData = {
  foodId: string;
  foodName: string;
  factor: number;
  servings: number;
  date: string;
};

const createInitialFormData = (activity: FoodActivity): FoodFormData => ({
  foodId: activity.foodId || '',
  foodName: activity.foodName || '',
  factor: activity.servings > 0 ? activity.emission / activity.servings : 0,
  servings: activity.servings || 1,
  date: activity.date || ''
});

export default function EditFoodPage() {
  const params = useParams();
  const phaseId = params.phaseId as PhaseId;
  const activityId = params.activityId as string;
  const { journey } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const categoryData = journey?.phases[phaseId]?.categories?.food;
  const activities = (categoryData?.activities as FoodActivity[]) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!phase || !activity) {
    return null;
  }

  return (
    <EditFoodForm
      key={activity.id}
      phaseId={phaseId}
      activityId={activityId}
      phaseName={phase.name}
      activity={activity}
      activities={activities}
    />
  );
}

type EditFoodFormProps = {
  phaseId: PhaseId;
  activityId: string;
  phaseName: string;
  activity: FoodActivity;
  activities: FoodActivity[];
};

function EditFoodForm({ phaseId, activityId, phaseName, activity, activities }: EditFoodFormProps) {
  const router = useRouter();
  const { showWarning } = useDialog();
  const { updateCategory } = useHajiJourney();
  const [foodOptions, setFoodOptions] = useState<FoodSelectOption[]>([]);
  const [formData, setFormData] = useState<FoodFormData>(() => createInitialFormData(activity));

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

  const normalizedFoodName = normalizeText(formData.foodName);

  const selectedOption =
    foodOptions.find(opt => opt.value === formData.foodId) ||
    (normalizedFoodName
      ? foodOptions.find(opt => normalizeText(opt.label) === normalizedFoodName)
      : undefined) ||
    (normalizedFoodName.length >= 3
      ? foodOptions.find(opt => normalizeText(opt.label).includes(normalizedFoodName))
      : undefined) ||
    (formData.factor > 0
      ? foodOptions.find(opt => Math.abs(opt.factor - formData.factor) < 0.0001)
      : undefined) ||
    null;

  const legacyFood = LEGACY_FOOD_LOOKUP[formData.foodId];

  const displayedSelectedOption: FoodSelectOption | null = selectedOption || (
    (formData.foodName || legacyFood?.label)
      ? {
          value: formData.foodId || 'legacy-food',
          label: formData.foodName || legacyFood?.label || '',
          factor: formData.factor || legacyFood?.factor || 0,
          factorName: 'kg CO₂e/porsi'
        }
      : null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveFoodId = selectedOption?.value || formData.foodId;
    const effectiveFoodName = selectedOption?.label || formData.foodName || legacyFood?.label || '';
    const effectiveFactor = (selectedOption?.factor ?? formData.factor) || legacyFood?.factor || 0;

    if (!effectiveFoodId) {
      showWarning('Pilih jenis makanan terlebih dahulu', { title: 'Data Belum Lengkap' });
      return;
    }

    const emission = formData.servings * effectiveFactor;

    const updatedActivity: FoodActivity = {
      ...activity!,
      foodId: effectiveFoodId,
      foodName: effectiveFoodName,
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

    const url = tripId ? `/phases/${phaseId}/food?tripId=${tripId}` : `/phases/${phaseId}/food`;
    router.push(url);
  };

  const handleCancel = () => {
    const url = tripId ? `/phases/${phaseId}/food?tripId=${tripId}` : `/phases/${phaseId}/food`;
    router.push(url);
  };

  return (
    <div className="app-container">
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-white pb-24">
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
            <p className="text-sm text-white/80">{phaseName}</p>
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
            instanceId={`food-select-${phaseId}-${activityId}`}
            inputId={`food-select-input-${phaseId}-${activityId}`}
            options={foodOptions}
            value={displayedSelectedOption}
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
              {(formData.servings * (selectedOption?.factor ?? formData.factor)).toFixed(2)} kg CO₂e
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(selectedOption?.factor ?? formData.factor)} kg CO₂e per porsi × {formData.servings} porsi
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
