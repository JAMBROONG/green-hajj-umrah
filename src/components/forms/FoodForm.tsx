'use client';

import { useState } from 'react';
import { FOOD_FACTORS } from '@/lib/constants';
import { FoodType, CategoryData } from '@/lib/types';

interface FoodFormProps {
  initialData: CategoryData;
  onSave: (data: CategoryData) => void;
}

export default function FoodForm({ initialData, onSave }: FoodFormProps) {
  const [foodType, setFoodType] = useState<FoodType>(
    (initialData.details?.foodType || 'nasi-ayam') as FoodType
  );
  const [meals, setMeals] = useState(initialData.details?.meals || 3);
  const [days, setDays] = useState(initialData.details?.days || 1);

  // Calculate emission directly without useEffect
  const emission = Math.round(meals * days * FOOD_FACTORS[foodType]);

  const handleSave = () => {
    onSave({
      completed: true,
      totalEmission: emission,
      emission,
      activities: [],
      details: {
        foodType,
        meals,
        days
      }
    });
  };

  const adjustMeals = (delta: number) => {
    setMeals(prev => Math.max(1, Math.min(5, prev + delta)));
  };

  const adjustDays = (delta: number) => {
    setDays(prev => Math.max(1, Math.min(30, prev + delta)));
  };

  const foodOptions: { type: FoodType; label: string; icon: string }[] = [
    { type: 'nasi-ayam', label: 'Nasi & Ayam', icon: '🍗' },
    { type: 'daging-sapi', label: 'Daging Sapi', icon: '🥩' },
    { type: 'ikan', label: 'Ikan', icon: '🐟' },
    { type: 'vegetarian', label: 'Vegetarian', icon: '🥗' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-textDark mb-3">Pilih Jenis Makanan</label>
        <div className="grid grid-cols-2 gap-2">
          {foodOptions.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setFoodType(type)}
              className={`p-3 rounded-xl border-2 transition-all ${
                foodType === type ? 'selected' : 'border-border bg-white'
              }`}
            >
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xs font-medium text-textDark">{label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-textDark mb-2">Makan per Hari</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => adjustMeals(-1)}
            className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center text-primary font-bold"
          >
            −
          </button>
          <input
            type="number"
            value={meals}
            onChange={(e) => setMeals(Math.max(1, Math.min(5, Number(e.target.value))))}
            className="flex-1 px-4 py-2 border border-border rounded-xl text-center font-bold text-textDark"
            min="1"
            max="5"
          />
          <button
            onClick={() => adjustMeals(1)}
            className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center text-primary font-bold"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-textDark mb-2">Jumlah Hari</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => adjustDays(-1)}
            className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center text-primary font-bold"
          >
            −
          </button>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value))))}
            className="flex-1 px-4 py-2 border border-border rounded-xl text-center font-bold text-textDark"
            min="1"
            max="30"
          />
          <button
            onClick={() => adjustDays(1)}
            className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center text-primary font-bold"
          >
            +
          </button>
        </div>
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
