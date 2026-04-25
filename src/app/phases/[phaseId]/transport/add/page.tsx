'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { useEmissionFactors } from '@/hooks/useEmissionFactors';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { TransportActivity, PhaseId } from '@/lib/types';
import { calculateRoutingDistance, Location } from '@/lib/locationService';
import { fetchAirports, toIndonesiaSelectOptions, getSaudiAirportOptions, calculateFlightDistanceKm, AirportSelectOption } from '@/lib/airportHelper';
import { fetchSeaports, toSeaportSelectOptions, calculateSeaportDistanceKm, SeaportSelectOption } from '@/lib/seaportHelper';
import { formatTruncated } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import Select from 'react-select';
import { FaCar } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';
import RouteLocationPicker from '@/components/forms/RouteLocationPicker';

export default function AddTransportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();
  const { factors: emissionFactors } = useEmissionFactors();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const canUseSeaTransport = phaseId === 'pra-keberangkatan';

  const [formData, setFormData] = useState({
    type: 'mobil',
    date: typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : ''
  });

  // Check if selected type is airplane
  const isAirplane = formData.type === 'pesawat-ekonomi' || formData.type === 'pesawat-bisnis';
  const isSeaTransport = formData.type === 'kapal';

  // Airport selection states (for airplanes)
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<AirportSelectOption | null>(null);
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState<AirportSelectOption | null>(null);
  const [groupedAirportOptions, setGroupedAirportOptions] = useState<{ label: string; options: AirportSelectOption[] }[]>([]);

  // Seaport selection states (for sea transport)
  const [selectedOriginSeaport, setSelectedOriginSeaport] = useState<SeaportSelectOption | null>(null);
  const [selectedDestinationSeaport, setSelectedDestinationSeaport] = useState<SeaportSelectOption | null>(null);
  const [seaportOptions, setSeaportOptions] = useState<SeaportSelectOption[]>([]);

  // Location search states (for ground transport).
  // Search/suggestion logic dipindah ke <RouteLocationPicker>.
  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Location | null>(null);
  const [groundDistance, setGroundDistance] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const loadAirportOptions = async () => {
      try {
        const indonesiaAirports = await fetchAirports({ country: 'Indonesia' });
        const saudiAirports = await fetchAirports({ country: 'Saudi Arabia' });
        const indonesiaOptions = toIndonesiaSelectOptions(indonesiaAirports);
        const saudiOptions = getSaudiAirportOptions(saudiAirports);

        setGroupedAirportOptions([
          { label: 'Indonesia', options: indonesiaOptions },
          { label: 'Saudi Arabia', options: saudiOptions }
        ]);
      } catch (error) {
        console.error('Failed to load airports:', error);
        // Fallback: try to load just Saudi Arabia
        try {
          const saudiAirports = await fetchAirports({ country: 'Saudi Arabia' });
          const saudiOptions = getSaudiAirportOptions(saudiAirports);
          setGroupedAirportOptions([{ label: 'Saudi Arabia', options: saudiOptions }]);
        } catch (innerError) {
          console.error('Failed to load Saudi airports:', innerError);
          setGroupedAirportOptions([]);
        }
      }
    };

    loadAirportOptions();
  }, []);

  useEffect(() => {
    const loadSeaportOptions = async () => {
      try {
        const seaports = await fetchSeaports();
        setSeaportOptions(toSeaportSelectOptions(seaports));
      } catch (error) {
        console.error('Failed to load seaports:', error);
        setSeaportOptions([]);
      }
    };

    loadSeaportOptions();
  }, []);

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
        setGroundDistance(distance);
        setIsCalculating(false);
      } else {
        setGroundDistance(null);
      }
    };

    calculateDistance();
  }, [selectedOrigin, selectedDestination]);

  const airplaneDistance = useMemo(() => {
    if (!selectedOriginAirport || !selectedDestinationAirport) return null;
    return calculateFlightDistanceKm(selectedOriginAirport, selectedDestinationAirport);
  }, [selectedOriginAirport, selectedDestinationAirport]);

  const seaDistance = useMemo(() => {
    if (!selectedOriginSeaport || !selectedDestinationSeaport) return null;
    return calculateSeaportDistanceKm(selectedOriginSeaport, selectedDestinationSeaport);
  }, [selectedOriginSeaport, selectedDestinationSeaport]);

  const calculatedDistance = isAirplane ? airplaneDistance : isSeaTransport ? seaDistance : groundDistance;

  // Memoized emission calculation that updates when factors load
  const estimatedEmission = useMemo(() => {
    if (!calculatedDistance || !emissionFactors) return 0;
    return calculatedDistance * ((emissionFactors[formData.type]) || 0);
  }, [calculatedDistance, emissionFactors, formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on transport type
    if (isAirplane) {
      if (!selectedOriginAirport || !selectedDestinationAirport || !calculatedDistance) {
        showWarning('Mohon pilih bandara asal dan tujuan', { title: 'Data Belum Lengkap' });
        return;
      }
    } else if (isSeaTransport) {
      if (!selectedOriginSeaport || !selectedDestinationSeaport || !calculatedDistance) {
        showWarning('Mohon pilih pelabuhan asal dan tujuan', { title: 'Data Belum Lengkap' });
        return;
      }
    } else {
      if (!selectedOrigin || !selectedDestination || !calculatedDistance) {
        showWarning('Mohon pilih lokasi asal dan tujuan yang valid', { title: 'Data Belum Lengkap' });
        return;
      }
    }

    const distance = calculatedDistance;
    const passengers = 1; // For individual use
    
    const factor = (emissionFactors && emissionFactors[formData.type]) || 0;
    const emission = distance * factor;

    const newActivity: TransportActivity = {
      id: uuidv4(),
      type: formData.type,
      distance,
      passengers,
      date: formData.date,
      emission,
      origin: isAirplane && selectedOriginAirport
        ? {
            name: selectedOriginAirport.name,
            lat: selectedOriginAirport.lat,
            lon: selectedOriginAirport.lon
          }
        : isSeaTransport && selectedOriginSeaport
        ? {
            name: selectedOriginSeaport.name,
            lat: selectedOriginSeaport.lat,
            lon: selectedOriginSeaport.lon
          }
        : selectedOrigin
        ? {
            name: selectedOrigin.displayName,
            lat: selectedOrigin.lat,
            lon: selectedOrigin.lon
          }
        : undefined,
      destination: isAirplane && selectedDestinationAirport
        ? {
            name: selectedDestinationAirport.name,
            lat: selectedDestinationAirport.lat,
            lon: selectedDestinationAirport.lon
          }
        : isSeaTransport && selectedDestinationSeaport
        ? {
            name: selectedDestinationSeaport.name,
            lat: selectedDestinationSeaport.lat,
            lon: selectedDestinationSeaport.lon
          }
        : selectedDestination
        ? {
            name: selectedDestination.displayName,
            lat: selectedDestination.lat,
            lon: selectedDestination.lon
          }
        : undefined
    };

    // Get existing activities
    const existingData = journey?.phases[phaseId]?.categories?.transport;
    const existingActivities = (existingData?.activities as TransportActivity[]) || [];
    
    // Add new activity
    const updatedActivities = [...existingActivities, newActivity];
    const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

    // Update category with new activities array
    updateCategory(phaseId, 'transport', {
      completed: false,
      activities: updatedActivities,
      totalEmission,
      // Keep legacy field for backward compatibility
      emission: totalEmission
    });

    // Show success message and navigate back
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
              <h1 className="text-xl font-bold">Tambah Transportasi</h1>
              <p className="text-sm text-white/75">{phase.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
        {/* Transport Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jenis Transportasi *
          </label>
          <select
            value={formData.type}
            onChange={(e) => {
              setFormData({ ...formData, type: e.target.value });
              // Reset selections when changing type
              setSelectedOrigin(null);
              setSelectedDestination(null);
              setSelectedOriginAirport(null);
              setSelectedDestinationAirport(null);
              setSelectedOriginSeaport(null);
              setSelectedDestinationSeaport(null);
              setGroundDistance(null);
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          >
            <option value="mobil">Mobil</option>
            <option value="mobil-listrik">Mobil Listrik</option>
            <option value="bus">Bus</option>
            <option value="bus-listrik">Bus Listrik</option>
            {canUseSeaTransport && <option value="kapal">Kapal</option>}
            <option value="kereta">Kereta</option>
            <option value="pesawat-ekonomi">Pesawat (Kelas Ekonomi)</option>
            <option value="pesawat-bisnis">Pesawat (Kelas Bisnis)</option>
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

        {/* Ground Transport — Origin + Destination dalam 1 RouteCard */}
        {!isAirplane && !isSeaTransport && (
          <RouteLocationPicker
            origin={selectedOrigin}
            destination={selectedDestination}
            onOriginChange={setSelectedOrigin}
            onDestinationChange={setSelectedDestination}
          />
        )}

        {/* Origin - Airport / Seaport selection */}
        {isAirplane ? (
          /* Airport Selection for Airplanes */
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dari (Bandara Asal) *
            </label>
            <Select
              value={selectedOriginAirport ? {
                value: selectedOriginAirport.value,
                label: selectedOriginAirport.label,
                country: selectedOriginAirport.country,
                name: selectedOriginAirport.name,
                lat: selectedOriginAirport.lat,
                lon: selectedOriginAirport.lon
              } : null}
              onChange={(option) => setSelectedOriginAirport(option as AirportSelectOption | null)}
              options={groupedAirportOptions}
              placeholder="Cari atau pilih bandara asal..."
              isClearable
              isSearchable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  padding: '0.5rem',
                  borderRadius: '0.75rem',
                  borderWidth: '2px',
                  borderColor: '#e5e7eb',
                  '&:hover': { borderColor: '#e5e7eb' },
                  '&:focus-within': { borderColor: '#10b981', boxShadow: 'none' }
                }),
                menu: (base) => ({
                  ...base,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                })
              }}
              required
            />
            {selectedOriginAirport && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {selectedOriginAirport.label}
              </p>
            )}
          </div>
        ) : isSeaTransport ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dari (Pelabuhan Asal) *
            </label>
            <Select
              instanceId={`seaport-origin-${phaseId}`}
              inputId={`seaport-origin-input-${phaseId}`}
              value={selectedOriginSeaport}
              onChange={(option) => setSelectedOriginSeaport(option as SeaportSelectOption | null)}
              options={seaportOptions}
              placeholder="Cari atau pilih pelabuhan asal..."
              isClearable
              isSearchable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  padding: '0.5rem',
                  borderRadius: '0.75rem',
                  borderWidth: '2px',
                  borderColor: '#e5e7eb',
                  '&:hover': { borderColor: '#e5e7eb' },
                  '&:focus-within': { borderColor: '#10b981', boxShadow: 'none' }
                }),
                menu: (base) => ({
                  ...base,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                })
              }}
              required
            />
            {selectedOriginSeaport && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Pelabuhan dipilih
              </p>
            )}
          </div>
        ) : null}

        {/* Destination - Airport / Seaport selection */}
        {isAirplane ? (
          /* Airport Selection for Airplanes */
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Menuju (Bandara Tujuan) *
            </label>
            <Select
              value={selectedDestinationAirport ? { 
                value: selectedDestinationAirport.value,
                label: selectedDestinationAirport.label,
                country: selectedDestinationAirport.country,
                name: selectedDestinationAirport.name,
                lat: selectedDestinationAirport.lat,
                lon: selectedDestinationAirport.lon
              } : null}
              onChange={(option) => setSelectedDestinationAirport(option as AirportSelectOption | null)}
              options={groupedAirportOptions}
              placeholder="Cari atau pilih bandara tujuan..."
              isClearable
              isSearchable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  padding: '0.5rem',
                  borderRadius: '0.75rem',
                  borderWidth: '2px',
                  borderColor: '#e5e7eb',
                  '&:hover': { borderColor: '#e5e7eb' },
                  '&:focus-within': { borderColor: '#10b981', boxShadow: 'none' }
                }),
                menu: (base) => ({
                  ...base,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                })
              }}
              required
            />
            {selectedDestinationAirport && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {selectedDestinationAirport.label}
              </p>
            )}
          </div>
        ) : isSeaTransport ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Menuju (Pelabuhan Tujuan) *
            </label>
            <Select
              instanceId={`seaport-destination-${phaseId}`}
              inputId={`seaport-destination-input-${phaseId}`}
              value={selectedDestinationSeaport}
              onChange={(option) => setSelectedDestinationSeaport(option as SeaportSelectOption | null)}
              options={seaportOptions}
              placeholder="Cari atau pilih pelabuhan tujuan..."
              isClearable
              isSearchable
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  padding: '0.5rem',
                  borderRadius: '0.75rem',
                  borderWidth: '2px',
                  borderColor: '#e5e7eb',
                  '&:hover': { borderColor: '#e5e7eb' },
                  '&:focus-within': { borderColor: '#10b981', boxShadow: 'none' }
                }),
                menu: (base) => ({
                  ...base,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                })
              }}
              required
            />
            {selectedDestinationSeaport && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Pelabuhan dipilih
              </p>
            )}
          </div>
        ) : null /* destination ground transport sudah di-render bersama origin di RouteLocationPicker */}

        {/* Calculated Distance Display */}
        {isCalculating && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <span className="inline-block w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-blue-700 font-medium">Menghitung jarak rute…</p>
          </div>
        )}
        {!isCalculating && calculatedDistance !== null && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700 font-medium mb-1">
              {isAirplane ? 'Jarak Terbang' : isSeaTransport ? 'Jarak Pelabuhan' : 'Jarak Rute Jalan'}
            </p>
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
