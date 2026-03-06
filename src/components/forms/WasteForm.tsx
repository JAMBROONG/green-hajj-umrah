'use client';

import { useState, useEffect } from 'react';
import { WASTE_FACTOR } from '@/lib/constants';
import { CategoryData } from '@/lib/types';
import { HiLightBulb } from 'react-icons/hi';

interface WasteFormProps {
  initialData: CategoryData;
  onSave: (data: CategoryData) => void;
}

export default function WasteForm({ initialData, onSave }: WasteFormProps) {
  const [weight, setWeight] = useState(initialData.details?.weight || 5);
  const [emission, setEmission] = useState(0);

  useEffect(() => {
    setEmission(Math.round(weight * WASTE_FACTOR));
  }, [weight]);

  const handleSave = () => {
    onSave({
      completed: true,
      totalEmission: emission,
      emission,
      activities: [],
      details: {
        weight
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="slider-container">
        <label className="block text-sm font-medium text-textDark mb-2">
          Estimasi Limbah: <span className="text-primary font-bold">{weight} kg</span>
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-textMuted mt-1">
          <span>1 kg</span>
          <span>50 kg</span>
        </div>
      </div>

      <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
        <p className="text-sm text-yellow-900 leading-relaxed flex items-start gap-2">
          <HiLightBulb className="text-lg flex-shrink-0 mt-0.5" /> <span><span className="font-medium">Tips:</span> Kurangi sampah plastik dengan membawa botol minum dan tas belanja sendiri.</span>
        </p>
      </div>

      <div className="bg-primaryLight rounded-xl p-4 border border-primary/20">
        <p className="text-xs text-textMuted mb-1">Estimasi Emisi CO2e</p>
        <p className="text-2xl font-bold text-primary">{(emission / 1000).toFixed(3)} Ton CO2e</p>
      </div>

      <button onClick={handleSave} className="btn-primary w-full py-3 rounded-xl text-white font-semibold">
        Simpan Data
      </button>
    </div>
  );
}
