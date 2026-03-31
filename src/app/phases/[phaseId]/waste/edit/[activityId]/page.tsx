'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { WasteActivity, PhaseId } from '@/lib/types';
import { fetchWasteEmissionFactors, toWasteSelectOptions, WasteSelectOption } from '@/lib/wasteHelper';
import Select from 'react-select';
import { MdRecycling } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';

export default function EditWastePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phaseId = params.phaseId as PhaseId;
  const activityId = params.activityId as string;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();
  const hasInitialized = useRef(false);

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const categoryData = journey?.phases[phaseId]?.categories?.waste;
  const activities = (categoryData?.activities as WasteActivity[]) || [];
  const activity = activities.find(a => a.id === activityId);
  const [wasteOptions, setWasteOptions] = useState<WasteSelectOption[]>([]);

  const [formData, setFormData] = useState({
    type: '',
    factor: 0,
    amount: '',
    date: ''
  });

  useEffect(() => {
    const loadWasteOptions = async () => {
      try {
        const items = await fetchWasteEmissionFactors();
        setWasteOptions(toWasteSelectOptions(items));
      } catch (error) {
        console.error('Failed to load waste emission factors:', error);
      }
    };

    loadWasteOptions();
  }, []);

  useEffect(() => {
    if (activity && !hasInitialized.current) {
      const formState = {
        type: activity.type || '',
        factor: activity && activity.amount > 0 ? activity.emission / activity.amount : 0,
        amount: activity.amount.toString() || '',
        date: activity.date || ''
      };
      // Update form with activity data from journey hook
      // This is the correct pattern for initializing form state from async/loaded data 
      // @see https://react.dev/learn/you-might-not-need-an-effect#initializing-state-from-props
      setFormData(formState);
      hasInitialized.current = true;
    }
  }, [activity]);

  const selectedWasteOption = wasteOptions.find((opt) => opt.value === formData.type) || null;

  const displayedWasteOption: WasteSelectOption | null = selectedWasteOption ||
    (formData.type
      ? {
          value: formData.type,
          label: formData.type,
          factor: formData.factor,
          factorName: 'kg CO2e/tonne',
          source: null,
          unit: 'tonne'
        }
      : null);

  const handleWasteChange = (option: WasteSelectOption | null) => {
    if (option) {
      setFormData({
        ...formData,
        type: option.value,
        factor: option.factor
      });
    } else {
      setFormData({
        ...formData,
        type: '',
        factor: 0
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type) {
      return;
    }

    const amount = parseFloat(formData.amount);
    const factor = selectedWasteOption?.factor ?? formData.factor;
    const emission = (amount / 1000) * factor;

    const updatedActivity: WasteActivity = {
      ...activity!,
      type: formData.type,
      amount,
      date: formData.date,
      emission
    };

    const updatedActivities = activities.map(a => 
      a.id === activityId ? updatedActivity : a
    );
    const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

    updateCategory(phaseId, 'waste', {
      completed: false,
      activities: updatedActivities,
      totalEmission,
      emission: totalEmission
    });

    const url = tripId ? `/phases/${phaseId}/waste?tripId=${tripId}` : `/phases/${phaseId}/waste`;
    router.push(url);
  };

  const handleCancel = () => {
    const url = tripId ? `/phases/${phaseId}/waste?tripId=${tripId}` : `/phases/${phaseId}/waste`;
    router.push(url);
  };

  if (!phase || !activity) {
    return null;
  }

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
          <MdRecycling className="text-3xl text-green-400" />
          <div>
            <h1 className="text-xl font-bold">Edit Limbah</h1>
            <p className="text-sm text-white/80">{phase.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Waste Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jenis Limbah *
          </label>
          <Select
            instanceId={`waste-select-edit-${phaseId}-${activityId}`}
            inputId={`waste-select-edit-input-${phaseId}-${activityId}`}
            options={wasteOptions}
            value={displayedWasteOption}
            onChange={(option) => handleWasteChange(option as WasteSelectOption | null)}
            placeholder="Pilih jenis limbah..."
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

        {/* Amount */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jumlah (kg) *
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="50"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: (Math.min(50, Math.max(0, parseFloat(e.target.value) || 0))).toString() })}
            placeholder="Masukkan jumlah dalam kg"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Preview Emission */}
        {formData.amount && (
          <div className="p-4 bg-primaryLight rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Estimasi Emisi</p>
            <p className="text-2xl font-bold text-primary">
              {((parseFloat(formData.amount) / 1000) * (selectedWasteOption?.factor ?? formData.factor)).toFixed(2)} kg CO₂e
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(selectedWasteOption?.factor ?? formData.factor)} kg CO₂e per tonne limbah × ({formData.amount} kg ÷ 1000)
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
