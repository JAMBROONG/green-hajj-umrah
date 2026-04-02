'use client';

import { useState } from 'react';
import { FLIGHT_EMISSION_PERGI, FLIGHT_EMISSION_PULANG } from '@/lib/constants';
import { useEmissionFactors } from '@/hooks/useEmissionFactors';
import { VehicleType, CategoryData } from '@/lib/types';
import { MdFlight, MdDirectionsBus, MdDirectionsCar, MdTrain } from 'react-icons/md';

interface TransportFormProps {
  phaseId: string;
  initialData: CategoryData;
  onSave: (data: CategoryData) => void;
}

export default function TransportForm({ phaseId, initialData, onSave }: TransportFormProps) {
  const isFlight = phaseId === 'keberangkatan' || phaseId === 'kepulangan';
  const { factors: emissionFactors } = useEmissionFactors();
  
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    (initialData.details?.vehicleType || 'bus') as VehicleType
  );
  const [distance, setDistance] = useState(initialData.details?.distance || 50);

  // Calculate emission directly without useEffect
  const emission = isFlight
    ? (phaseId === 'keberangkatan' ? FLIGHT_EMISSION_PERGI : FLIGHT_EMISSION_PULANG)
    : Math.round(distance * ((emissionFactors && emissionFactors[vehicleType]) || 0));

  const handleSave = () => {
    onSave({
      completed: true,
      totalEmission: emission,
      emission,
      activities: [],
      details: {
        vehicleType: isFlight ? undefined : vehicleType,
        distance: isFlight ? undefined : distance
      }
    });
  };

  if (isFlight) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-900 mb-2 font-medium flex items-center gap-2">
            <MdFlight className="text-lg" /> Penerbangan {phaseId === 'keberangkatan' ? 'Indonesia → Arab Saudi' : 'Arab Saudi → Indonesia'}
          </p>
          <p className="text-xs text-blue-700">
            Emisi telah dihitung berdasarkan rata-rata penerbangan jarak jauh.
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-border">
          <p className="text-xs text-textMuted mb-1">Estimasi Emisi CO2e</p>
          <p className="text-2xl font-bold text-primary">{(emission / 1000).toFixed(3)} Ton CO2e</p>
        </div>

        <button onClick={handleSave} className="btn-primary w-full py-3 rounded-xl text-white font-semibold">
          Simpan Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-textDark mb-3">Pilih Jenis Kendaraan</label>
        <div className="grid grid-cols-3 gap-2">
          {(['bus', 'mobil', 'kereta'] as VehicleType[]).map((type) => (
            <button
              key={type}
              onClick={() => setVehicleType(type)}
              className={`p-3 rounded-xl border-2 transition-all ${
                vehicleType === type ? 'selected' : 'border-border bg-white'
              }`}
            >
              <div className="text-2xl mb-1">
                {type === 'bus' ? <MdDirectionsBus /> : type === 'mobil' ? <MdDirectionsCar /> : <MdTrain />}
              </div>
              <p className="text-xs font-medium text-textDark capitalize">{type}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="slider-container">
        <label className="block text-sm font-medium text-textDark mb-2">
          Jarak Tempuh: <span className="text-primary font-bold">{distance} km</span>
        </label>
        <input
          type="range"
          min="10"
          max="500"
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-textMuted mt-1">
          <span>10 km</span>
          <span>500 km</span>
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
