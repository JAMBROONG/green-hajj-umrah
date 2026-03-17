'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS, TRANSPORT_FACTORS } from '@/lib/constants';
import { TransportActivity, PhaseId } from '@/lib/types';
import { searchLocations, calculateRoutingDistance, Location } from '@/lib/locationService';
import { v4 as uuidv4 } from 'uuid';
import { FaCar } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';

// Fixed locations for perjalanan-antar-kota
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
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const { journey, updateCategory } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);

  const [formData, setFormData] = useState({
    type: 'mobil',
    date: new Date().toISOString().split('T')[0]
  });

  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<Location[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Location[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Location | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  // Search origin locations
  useEffect(() => {
    const searchOrigin = async () => {
      if (originQuery.length >= 3) {
        setIsSearching(true);
        const results = await searchLocations(originQuery);
        
        // Filter results for perjalanan-antar-kota phase
        let filtered = results;
        if (phaseId === 'perjalanan-antar-kota') {
          filtered = results.filter(loc => 
            loc.displayName.toLowerCase().includes('makkah') || 
            loc.displayName.toLowerCase().includes('madinah') ||
            loc.displayName.toLowerCase().includes('mecca') ||
            loc.displayName.toLowerCase().includes('medina')
          );
        }
        
        setOriginSuggestions(filtered);
        setIsSearching(false);
      } else {
        setOriginSuggestions([]);
      }
    };

    const debounce = setTimeout(searchOrigin, 300);
    return () => clearTimeout(debounce);
  }, [originQuery, phaseId]);

  // Search destination locations
  useEffect(() => {
    const searchDestination = async () => {
      if (destinationQuery.length >= 3) {
        setIsSearching(true);
        const results = await searchLocations(destinationQuery);
        
        // Filter results for perjalanan-antar-kota phase
        let filtered = results;
        if (phaseId === 'perjalanan-antar-kota') {
          filtered = results.filter(loc => 
            loc.displayName.toLowerCase().includes('makkah') || 
            loc.displayName.toLowerCase().includes('madinah') ||
            loc.displayName.toLowerCase().includes('mecca') ||
            loc.displayName.toLowerCase().includes('medina')
          );
        }
        
        setDestinationSuggestions(filtered);
        setIsSearching(false);
      } else {
        setDestinationSuggestions([]);
      }
    };

    const debounce = setTimeout(searchDestination, 300);
    return () => clearTimeout(debounce);
  }, [destinationQuery, phaseId]);

  // Calculate distance when both locations are selected
  useEffect(() => {
    const calculateDistance = async () => {
      if (selectedOrigin && selectedDestination) {
        setIsSearching(true);
        const distance = await calculateRoutingDistance(
          selectedOrigin.lat,
          selectedOrigin.lon,
          selectedDestination.lat,
          selectedDestination.lon
        );
        setCalculatedDistance(distance);
        setIsSearching(false);
      } else {
        setCalculatedDistance(null);
      }
    };

    calculateDistance();
  }, [selectedOrigin, selectedDestination]);

  // Auto-set destination based on origin for perjalanan-antar-kota phase
  useEffect(() => {
    if (phaseId === 'perjalanan-antar-kota' && selectedOrigin) {
      if (selectedOrigin.displayName === 'Makkah') {
        setSelectedDestination(FIXED_LOCATIONS.madinah as Location);
      } else if (selectedOrigin.displayName === 'Madinah') {
        setSelectedDestination(FIXED_LOCATIONS.makkah as Location);
      }
    }
  }, [selectedOrigin, phaseId]);

  // Auto-set origin based on destination for perjalanan-antar-kota phase
  useEffect(() => {
    if (phaseId === 'perjalanan-antar-kota' && selectedDestination) {
      if (selectedDestination.displayName === 'Makkah') {
        setSelectedOrigin(FIXED_LOCATIONS.madinah as Location);
      } else if (selectedDestination.displayName === 'Madinah') {
        setSelectedOrigin(FIXED_LOCATIONS.makkah as Location);
      }
    }
  }, [selectedDestination, phaseId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setOriginSuggestions([]);
      }
      if (destinationRef.current && !destinationRef.current.contains(event.target as Node)) {
        setDestinationSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOriginSelect = (location: Location) => {
    setSelectedOrigin(location);
    setOriginQuery(location.displayName);
    setOriginSuggestions([]);
  };

  const handleDestinationSelect = (location: Location) => {
    setSelectedDestination(location);
    setDestinationQuery(location.displayName);
    setDestinationSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrigin || !selectedDestination || !calculatedDistance) {
      showWarning('Mohon pilih lokasi asal dan tujuan yang valid', { title: 'Data Belum Lengkap' });
      return;
    }

    const distance = calculatedDistance;
    const passengers = 1;
    const factor = TRANSPORT_FACTORS[formData.type as keyof typeof TRANSPORT_FACTORS] || 0;
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

    router.push(`/phases/${phaseId}/transport`);
  };

  const handleCancel = () => {
    router.push(`/phases/${phaseId}/transport`);
  };

  if (!phase) {
    return null;
  }

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
            <FaCar className="text-3xl text-blue-400" />
            <div>
              <h1 className="text-xl font-bold">Tambah Transportasi Darat</h1>
              <p className="text-sm text-white/80">{phase.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Transport Type - Ground Only */}
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
              required
            />
          </div>

          {/* Origin Location */}
          <div ref={originRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dari (Lokasi Asal) *
            </label>
            {phaseId === 'perjalanan-antar-kota' ? (
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
            ) : (
              <>
                <input
                  type="text"
                  value={originQuery}
                  onChange={(e) => {
                    setOriginQuery(e.target.value);
                    setSelectedOrigin(null);
                  }}
                  placeholder="Cari lokasi asal..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  required
                />
                {isSearching && originQuery.length >= 3 && (
                  <div className="absolute right-4 top-11 text-gray-400">
                    <div className="animate-spin">⏳</div>
                  </div>
                )}
                {originSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {originSuggestions.map((location) => (
                      <button
                        key={location.placeId}
                        type="button"
                        onClick={() => handleOriginSelect(location)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {location.displayName}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {selectedOrigin && (
              <p className="text-xs text-green-600 mt-1">✓ Lokasi dipilih</p>
            )}
          </div>

          {/* Destination Location */}
          <div ref={destinationRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Menuju (Lokasi Tujuan) *
            </label>
            {phaseId === 'perjalanan-antar-kota' ? (
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
            ) : (
              <>
                <input
                  type="text"
                  value={destinationQuery}
                  onChange={(e) => {
                    setDestinationQuery(e.target.value);
                    setSelectedDestination(null);
                  }}
                  placeholder="Cari lokasi tujuan..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  required
                />
                {isSearching && destinationQuery.length >= 3 && (
                  <div className="absolute right-4 top-11 text-gray-400">
                    <div className="animate-spin">⏳</div>
                  </div>
                )}
                {destinationSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {destinationSuggestions.map((location) => (
                      <button
                        key={location.placeId}
                        type="button"
                        onClick={() => handleDestinationSelect(location)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {location.displayName}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedDestination && (
                  <p className="text-xs text-green-600 mt-1">✓ Lokasi dipilih</p>
                )}
              </>
            )}
          </div>

          {/* Calculated Distance Display */}
          {calculatedDistance !== null && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700 font-medium mb-1">
                Jarak Rute Jalan
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {calculatedDistance.toFixed(1)} km
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Estimasi emisi: {(calculatedDistance * (TRANSPORT_FACTORS[formData.type as keyof typeof TRANSPORT_FACTORS] || 0)).toFixed(2)} kg CO₂
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
