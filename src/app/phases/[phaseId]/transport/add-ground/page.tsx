'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useTripDateBounds, clampToTripBounds } from '@/hooks/useTripDateBounds';
import { useEmissionFactors } from '@/hooks/useEmissionFactors';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { TransportActivity, PhaseId } from '@/lib/types';
import { calculateRoutingDistance, Location } from '@/lib/locationService';
import { formatTruncated } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { FaCar } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';
import RouteLocationPicker from '@/components/forms/RouteLocationPicker';

// Lokasi tetap untuk fase perjalanan-antar-kota (Makkah ↔ Madinah).
// Pakai dropdown khusus, BUKAN RouteLocationPicker, karena pasangan kota fix
// dan auto-paired (pilih Makkah → Madinah otomatis di-set, dan sebaliknya).
const FIXED_LOCATIONS = {
  makkah: {
    displayName: 'Makkah',
    lat: 21.43018234639338,
    lon: 39.8252469518234,
    placeId: 1
  },
  madinah: {
    displayName: 'Madinah',
    lat: 24.467729816668832,
    lon: 39.602692780309404,
    placeId: 2
  }
};

export default function AddGroundTransportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();
  const { factors: emissionFactors } = useEmissionFactors();
  const { minDate, maxDate } = useTripDateBounds(tripId);

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const isFixedRoute = phaseId === 'perjalanan-antar-kota';

  const [formData, setFormData] = useState({
    type: 'mobil',
    date: typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : ''
  });

  useEffect(() => {
    if (!minDate && !maxDate) return;
    setFormData(prev => {
      const clamped = clampToTripBounds(prev.date, { minDate, maxDate });
      return clamped === prev.date ? prev : { ...prev, date: clamped };
    });
  }, [minDate, maxDate]);

  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Location | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Auto-pair Makkah ↔ Madinah for perjalanan-antar-kota phase
  useEffect(() => {
    if (!isFixedRoute || !selectedOrigin) return;
    if (selectedOrigin.displayName === 'Makkah') {
      setSelectedDestination(FIXED_LOCATIONS.madinah as Location);
    } else if (selectedOrigin.displayName === 'Madinah') {
      setSelectedDestination(FIXED_LOCATIONS.makkah as Location);
    }
  }, [selectedOrigin, isFixedRoute]);

  useEffect(() => {
    if (!isFixedRoute || !selectedDestination) return;
    if (selectedDestination.displayName === 'Makkah') {
      setSelectedOrigin(FIXED_LOCATIONS.madinah as Location);
    } else if (selectedDestination.displayName === 'Madinah') {
      setSelectedOrigin(FIXED_LOCATIONS.makkah as Location);
    }
  }, [selectedDestination, isFixedRoute]);

  // Calculate distance when both locations are selected (via OSRM routing API)
  useEffect(() => {
    const calculateDistance = async () => {
      if (selectedOrigin && selectedDestination) {
        setIsCalculating(true);
        const distance = await calculateRoutingDistance(
          selectedOrigin.lat,
          selectedOrigin.lon,
          selectedDestination.lat,
          selectedDestination.lon
        );
        setCalculatedDistance(distance);
        setIsCalculating(false);
      } else {
        setCalculatedDistance(null);
      }
    };

    calculateDistance();
  }, [selectedOrigin, selectedDestination]);

  // Memoized emission calculation that updates when factors load
  const estimatedEmission = useMemo(() => {
    if (!calculatedDistance || !emissionFactors) return 0;
    return calculatedDistance * ((emissionFactors[formData.type]) || 0);
  }, [calculatedDistance, emissionFactors, formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrigin || !selectedDestination || !calculatedDistance) {
      showWarning('Mohon pilih lokasi asal dan tujuan yang valid', { title: 'Data Belum Lengkap' });
      return;
    }

    const distance = calculatedDistance;
    const passengers = 1;
    const factor = (emissionFactors && emissionFactors[formData.type]) || 0;
    const emission = distance * factor;

    const newActivity: TransportActivity = {
      id: uuidv4(),
      type: formData.type,
      distance,
      passengers,
      date: formData.date,
      emission,
      origin: {
        name: selectedOrigin.displayName,
        lat: selectedOrigin.lat,
        lon: selectedOrigin.lon
      },
      destination: {
        name: selectedDestination.displayName,
        lat: selectedDestination.lat,
        lon: selectedDestination.lon
      }
    };

    const existingData = journey?.phases[phaseId]?.categories?.transport;
    const existingActivities = (existingData?.activities as TransportActivity[]) || [];
    const updatedActivities = [...existingActivities, newActivity];
    const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

    updateCategory(phaseId, 'transport', {
      completed: false,
      activities: updatedActivities,
      totalEmission,
      emission: totalEmission
    });

    const url = tripId ? `/phases/${phaseId}/transport?tripId=${tripId}` : `/phases/${phaseId}/transport`;
    router.push(url);
  };

  const handleCancel = () => {
    const url = tripId ? `/phases/${phaseId}/transport?tripId=${tripId}` : `/phases/${phaseId}/transport`;
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
              <FaCar className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tambah Transportasi Darat</h1>
              <p className="text-sm text-white/75">{phase.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
        {/* Transport Type — Ground Only */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jenis Kendaraan *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          >
            <option value="mobil">Mobil</option>
            <option value="mobil-listrik">Mobil Listrik</option>
            <option value="bus">Bus</option>
            <option value="bus-listrik">Bus Listrik</option>
            <option value="kereta">Kereta</option>
          </select>
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

        {/* Locations */}
        {isFixedRoute ? (
          <>
            {/* Origin (fixed Makkah/Madinah) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dari (Lokasi Asal) *
              </label>
              <select
                value={selectedOrigin?.displayName === 'Makkah' ? 'makkah' : selectedOrigin?.displayName === 'Madinah' ? 'madinah' : ''}
                onChange={(e) => {
                  if (e.target.value === 'makkah') {
                    setSelectedOrigin(FIXED_LOCATIONS.makkah as Location);
                  } else if (e.target.value === 'madinah') {
                    setSelectedOrigin(FIXED_LOCATIONS.madinah as Location);
                  } else {
                    setSelectedOrigin(null);
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                required
              >
                <option value="">-- Pilih Lokasi --</option>
                <option value="makkah">Makkah</option>
                <option value="madinah">Madinah</option>
              </select>
              {selectedOrigin && (
                <p className="text-xs text-green-600 mt-1">✓ Lokasi dipilih</p>
              )}
            </div>

            {/* Destination (fixed Makkah/Madinah) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Menuju (Lokasi Tujuan) *
              </label>
              <select
                value={selectedDestination?.displayName === 'Makkah' ? 'makkah' : selectedDestination?.displayName === 'Madinah' ? 'madinah' : ''}
                onChange={(e) => {
                  if (e.target.value === 'makkah') {
                    setSelectedDestination(FIXED_LOCATIONS.makkah as Location);
                  } else if (e.target.value === 'madinah') {
                    setSelectedDestination(FIXED_LOCATIONS.madinah as Location);
                  } else {
                    setSelectedDestination(null);
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                required
              >
                <option value="">-- Pilih Lokasi --</option>
                <option value="makkah">Makkah</option>
                <option value="madinah">Madinah</option>
              </select>
              {selectedDestination && (
                <p className="text-xs text-green-600 mt-1">✓ Lokasi dipilih</p>
              )}
            </div>
          </>
        ) : (
          <RouteLocationPicker
            origin={selectedOrigin}
            destination={selectedDestination}
            onOriginChange={setSelectedOrigin}
            onDestinationChange={setSelectedDestination}
          />
        )}

        {/* Calculated Distance Display */}
        {isCalculating && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <span className="inline-block w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-blue-700 font-medium">Menghitung jarak rute…</p>
          </div>
        )}
        {!isCalculating && calculatedDistance !== null && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700 font-medium mb-1">Jarak Rute Jalan</p>
            <p className="text-2xl font-bold text-blue-900">
              {calculatedDistance.toFixed(1)} km
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Estimasi emisi: {formatTruncated(estimatedEmission)} kg CO₂
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
