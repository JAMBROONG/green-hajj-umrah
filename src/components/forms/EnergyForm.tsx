'use client';

import { useState } from 'react';
import { HOTEL_FACTORS } from '@/lib/constants';
import { HotelStars, CategoryData } from '@/lib/types';
import { FaStar } from 'react-icons/fa';

interface EnergyFormProps {
  initialData: CategoryData;
  onSave: (data: CategoryData) => void;
}

export default function EnergyForm({ initialData, onSave }: EnergyFormProps) {
  const [hotelStars, setHotelStars] = useState<HotelStars>(
    (initialData.details?.hotelStars || 4) as HotelStars
  );
  const [days, setDays] = useState(initialData.details?.days || 1);

  // Calculate emission directly without useEffect
  const emission = Math.round(days * HOTEL_FACTORS[hotelStars]);

  const handleSave = () => {
    onSave({
      completed: true,
      totalEmission: emission,
      emission,
      activities: [],
      details: {
        hotelStars,
        days
      }
    });
  };

  const adjustDays = (delta: number) => {
    setDays(prev => Math.max(1, Math.min(30, prev + delta)));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-textDark mb-3">Pilih Bintang Hotel</label>
        <div className="grid grid-cols-3 gap-2">
          {([3, 4, 5] as HotelStars[]).map((stars) => (
            <button
              key={stars}
              onClick={() => setHotelStars(stars)}
              className={`p-3 rounded-xl border-2 transition-all ${
                hotelStars === stars ? 'selected' : 'border-border bg-white'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                <FaStar /> {stars}
              </div>
              <p className="text-xs text-textMuted">{stars === 3 ? 'Standar' : stars === 4 ? 'Comfort' : 'Luxury'}</p>
            </button>
          ))}
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
