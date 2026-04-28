'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useTripDateBounds, clampToTripBounds } from '@/hooks/useTripDateBounds';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { WasteActivity, PhaseId } from '@/lib/types';
import { fetchWasteEmissionFactors, toWasteSelectOptions, WasteSelectOption } from '@/lib/wasteHelper';
import { v4 as uuidv4 } from 'uuid';
import Select from 'react-select';
import { MdRecycling } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';

export default function AddWastePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phaseId = params.phaseId as PhaseId;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();
  const { minDate, maxDate } = useTripDateBounds(tripId);

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);

  const [formData, setFormData] = useState({
    type: '',
    factor: 0,
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [wasteOptions, setWasteOptions] = useState<WasteSelectOption[]>([]);

  useEffect(() => {
    if (!minDate && !maxDate) return;
    setFormData(prev => {
      const clamped = clampToTripBounds(prev.date, { minDate, maxDate });
      return clamped === prev.date ? prev : { ...prev, date: clamped };
    });
  }, [minDate, maxDate]);

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

  const selectedWasteOption = wasteOptions.find((opt) => opt.value === formData.type) || null;

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

    const newActivity: WasteActivity = {
      id: uuidv4(),
      type: formData.type,
      amount,
      date: formData.date,
      emission
    };

    // Get existing activities
    const existingData = journey?.phases[phaseId]?.categories?.waste;
    const existingActivities = (existingData?.activities as WasteActivity[]) || [];
    
    // Add new activity
    const updatedActivities = [...existingActivities, newActivity];
    const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

    // Update category with new activities array
    updateCategory(phaseId, 'waste', {
      completed: false,
      activities: updatedActivities,
      totalEmission,
      // Keep legacy field for backward compatibility
      emission: totalEmission
    });

    // Navigate back
    const url = tripId ? `/phases/${phaseId}/waste?tripId=${tripId}` : `/phases/${phaseId}/waste`;
    router.push(url);
  };

  const handleCancel = () => {
    const url = tripId ? `/phases/${phaseId}/waste?tripId=${tripId}` : `/phases/${phaseId}/waste`;
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
              <MdRecycling className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tambah Limbah</h1>
              <p className="text-sm text-white/75">{phase.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
        {/* Waste Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jenis Limbah *
          </label>
          <Select
            instanceId={`waste-select-${phaseId}`}
            inputId={`waste-select-input-${phaseId}`}
            options={wasteOptions}
            value={selectedWasteOption}
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
            min={minDate || undefined}
            max={maxDate || undefined}
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
