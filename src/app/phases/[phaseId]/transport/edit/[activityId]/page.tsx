'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useTripDateBounds } from '@/hooks/useTripDateBounds';
import { useDialog } from '@/contexts/DialogContext';
import { useEmissionFactors } from '@/hooks/useEmissionFactors';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { TransportActivity, PhaseId } from '@/lib/types';
import { calculateRoutingDistance, Location } from '@/lib/locationService';
import { fetchAirports, toIndonesiaSelectOptions, getSaudiAirportOptions, findAirportByName, calculateFlightDistanceKm, AirportSelectOption } from '@/lib/airportHelper';
import { fetchSeaports, toSeaportSelectOptions, findSeaportByName, calculateSeaportDistanceKm, SeaportSelectOption } from '@/lib/seaportHelper';
import Select from 'react-select';
import { FaCar } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';
import { formatTruncated } from '@/lib/utils';
import RouteLocationPicker from '@/components/forms/RouteLocationPicker';

export default function EditTransportPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const activityId = params.activityId as string;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();
  const { factors: emissionFactors } = useEmissionFactors();
  const { minDate, maxDate } = useTripDateBounds(tripId);

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const canUseSeaTransport = phaseId === 'pra-keberangkatan';
  const categoryData = journey?.phases[phaseId]?.categories?.transport;
  const activities = (categoryData?.activities as TransportActivity[]) || [];
  const activity = activities.find(a => a.id === activityId);

  const [formData, setFormData] = useState({
    type: activity?.type || '',
    date: activity?.date || ''
  });

  const selectedTransportType = formData.type || activity?.type || '';
  const selectedDate = formData.date || activity?.date || '';

  // Location search states (ground transport).
  // Search/suggestion logic dipindah ke <RouteLocationPicker>.
  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Location | null>(null);
  const [groundDistance, setGroundDistance] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Check if transport type is airplane
  const isAirplane = selectedTransportType === 'pesawat-ekonomi' || selectedTransportType === 'pesawat-bisnis';
  const isSeaTransport = selectedTransportType === 'kapal';
  
  // Airport selection states
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<AirportSelectOption | null | undefined>(undefined);
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState<AirportSelectOption | null | undefined>(undefined);
  const [groupedAirportOptions, setGroupedAirportOptions] = useState<{ label: string; options: AirportSelectOption[] }[]>([]);
  const [flatAirportOptions, setFlatAirportOptions] = useState<AirportSelectOption[]>([]);

  // Seaport selection states
  const [selectedOriginSeaport, setSelectedOriginSeaport] = useState<SeaportSelectOption | null | undefined>(undefined);
  const [selectedDestinationSeaport, setSelectedDestinationSeaport] = useState<SeaportSelectOption | null | undefined>(undefined);
  const [seaportOptions, setSeaportOptions] = useState<SeaportSelectOption[]>([]);

  const hasInitializedLocations = useRef(false);

  useEffect(() => {
    // Initialize origin/destination dari activity yang sedang di-edit.
    // RouteLocationPicker punya internal query state — kita cuma pass selected.
    if (activity && !hasInitializedLocations.current && (activity.origin || activity.destination)) {
      const initData = () => {
        if (activity.origin) {
          setSelectedOrigin({
            displayName: activity.origin.name,
            lat: activity.origin.lat,
            lon: activity.origin.lon,
            placeId: 0
          });
        }
        if (activity.destination) {
          setSelectedDestination({
            displayName: activity.destination.name,
            lat: activity.destination.lat,
            lon: activity.destination.lon,
            placeId: 0
          });
        }
        if (activity.distance) {
          setGroundDistance(activity.distance);
        }
        hasInitializedLocations.current = true;
      };

      requestAnimationFrame(initData);
    }
  }, [activity]);

  useEffect(() => {
    const loadAirportOptions = async () => {
      try {
        const indonesiaAirports = await fetchAirports({ country: 'Indonesia' });
        const saudiAirports = await fetchAirports({ country: 'Saudi Arabia' });
        const indonesiaOptions = toIndonesiaSelectOptions(indonesiaAirports);
        const saudiOptions = getSaudiAirportOptions(saudiAirports);
        const allOptions = [...indonesiaOptions, ...saudiOptions];

        setFlatAirportOptions(allOptions);
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
          setFlatAirportOptions(saudiOptions);
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

  const resolvedOriginAirport = useMemo(() => {
    if (selectedOriginAirport !== undefined) return selectedOriginAirport;
    if (!isAirplane) return null;
    return findAirportByName(flatAirportOptions, activity?.origin?.name);
  }, [selectedOriginAirport, flatAirportOptions, activity?.origin?.name, isAirplane]);

  const resolvedDestinationAirport = useMemo(() => {
    if (selectedDestinationAirport !== undefined) return selectedDestinationAirport;
    if (!isAirplane) return null;
    return findAirportByName(flatAirportOptions, activity?.destination?.name);
  }, [selectedDestinationAirport, flatAirportOptions, activity?.destination?.name, isAirplane]);

  const resolvedOriginSeaport = useMemo(() => {
    if (selectedOriginSeaport !== undefined) return selectedOriginSeaport;
    if (!isSeaTransport) return null;
    return findSeaportByName(seaportOptions, activity?.origin?.name);
  }, [selectedOriginSeaport, seaportOptions, activity?.origin?.name, isSeaTransport]);

  const resolvedDestinationSeaport = useMemo(() => {
    if (selectedDestinationSeaport !== undefined) return selectedDestinationSeaport;
    if (!isSeaTransport) return null;
    return findSeaportByName(seaportOptions, activity?.destination?.name);
  }, [selectedDestinationSeaport, seaportOptions, activity?.destination?.name, isSeaTransport]);

  // Calculate distance for ground transport only (via OSRM routing)
  useEffect(() => {
    const calculateDistance = async () => {
      if (!isAirplane && !isSeaTransport && selectedOrigin && selectedDestination) {
        setIsCalculating(true);
        const distance = await calculateRoutingDistance(
          selectedOrigin.lat,
          selectedOrigin.lon,
          selectedDestination.lat,
          selectedDestination.lon
        );
        setGroundDistance(distance);
        setIsCalculating(false);
      } else if (!isAirplane && !isSeaTransport) {
        setGroundDistance(null);
      }
    };

    calculateDistance();
  }, [isAirplane, isSeaTransport, selectedOrigin, selectedDestination]);

  const airplaneDistance = useMemo(() => {
    if (!isAirplane || !resolvedOriginAirport || !resolvedDestinationAirport) return null;
    return calculateFlightDistanceKm(resolvedOriginAirport, resolvedDestinationAirport);
  }, [isAirplane, resolvedOriginAirport, resolvedDestinationAirport]);

  const shouldUseStoredSeaDistance =
    isSeaTransport &&
    selectedOriginSeaport === undefined &&
    selectedDestinationSeaport === undefined;

  const seaDistance = useMemo(() => {
    if (!isSeaTransport) return null;

    if (shouldUseStoredSeaDistance) {
      return activity?.distance || null;
    }

    if (!resolvedOriginSeaport || !resolvedDestinationSeaport) return null;
    return calculateSeaportDistanceKm(resolvedOriginSeaport, resolvedDestinationSeaport);
  }, [
    isSeaTransport,
    shouldUseStoredSeaDistance,
    activity?.distance,
    resolvedOriginSeaport,
    resolvedDestinationSeaport
  ]);

  const calculatedDistance = isAirplane ? airplaneDistance : isSeaTransport ? seaDistance : groundDistance;

  // Memoized emission calculation that updates when factors load
  const estimatedEmission = useMemo(() => {
    if (!calculatedDistance || !emissionFactors) return 0;
    return calculatedDistance * ((emissionFactors[selectedTransportType]) || 0);
  }, [calculatedDistance, emissionFactors, selectedTransportType]);

  // (Click-outside + select handlers handled di dalam <RouteLocationPicker>)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on transport type
    if (isAirplane) {
      if (!resolvedOriginAirport || !resolvedDestinationAirport || !calculatedDistance) {
        showWarning('Mohon pilih bandara asal dan tujuan', { title: 'Data Belum Lengkap' });
        return;
      }
    } else if (isSeaTransport) {
      if (!resolvedOriginSeaport || !resolvedDestinationSeaport || !calculatedDistance) {
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
    
    const factor = (emissionFactors && emissionFactors[selectedTransportType]) || 0;
    const emission = distance * factor;

    const updatedActivity: TransportActivity = {
      ...activity!,
      type: selectedTransportType,
      distance,
      passengers,
      date: selectedDate,
      emission,
      origin: isAirplane && resolvedOriginAirport
        ? {
            name: resolvedOriginAirport.name,
            lat: resolvedOriginAirport.lat,
            lon: resolvedOriginAirport.lon
          }
        : isSeaTransport && resolvedOriginSeaport
        ? {
            name: resolvedOriginSeaport.name,
            lat: resolvedOriginSeaport.lat,
            lon: resolvedOriginSeaport.lon
          }
        : selectedOrigin
        ? {
            name: selectedOrigin.displayName,
            lat: selectedOrigin.lat,
            lon: selectedOrigin.lon
          }
        : undefined,
      destination: isAirplane && resolvedDestinationAirport
        ? {
            name: resolvedDestinationAirport.name,
            lat: resolvedDestinationAirport.lat,
            lon: resolvedDestinationAirport.lon
          }
        : isSeaTransport && resolvedDestinationSeaport
        ? {
            name: resolvedDestinationSeaport.name,
            lat: resolvedDestinationSeaport.lat,
            lon: resolvedDestinationSeaport.lon
          }
        : selectedDestination
        ? {
            name: selectedDestination.displayName,
            lat: selectedDestination.lat,
            lon: selectedDestination.lon
          }
        : undefined
    };

    // Update activities array
    const updatedActivities = activities.map(a => 
      a.id === activityId ? updatedActivity : a
    );
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

  if (!phase || !activity) {
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
              <h1 className="text-xl font-bold">Edit Transportasi</h1>
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
            value={selectedTransportType}
            onChange={(e) => {
              const newType = e.target.value;
              const oldType = selectedTransportType;

              // Hanya clear selection saat MODE berpindah (ground ↔ airplane
               // ↔ seaport). Kalau ground → ground (mis. mobil → mobil-listrik),
               // rute tetap dipertahankan supaya user tidak harus input ulang.
              const modeOf = (t: string): 'air' | 'sea' | 'ground' =>
                (t === 'pesawat-ekonomi' || t === 'pesawat-bisnis') ? 'air'
                : t === 'kapal' ? 'sea'
                : 'ground';

              const oldMode = modeOf(oldType);
              const newMode = modeOf(newType);

              setFormData({ ...formData, type: newType });

              if (oldMode !== newMode) {
                setSelectedOrigin(null);
                setSelectedDestination(null);
                setSelectedOriginAirport(null);
                setSelectedDestinationAirport(null);
                setSelectedOriginSeaport(null);
                setSelectedDestinationSeaport(null);
                setGroundDistance(null);
              }
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          >
            <option value="">-- Pilih Jenis Transportasi --</option>
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
            value={selectedDate}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            min={minDate || undefined}
            max={maxDate || undefined}
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
              value={resolvedOriginAirport || null}
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
            {resolvedOriginAirport && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {resolvedOriginAirport.label}
              </p>
            )}
          </div>
        ) : isSeaTransport ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dari (Pelabuhan Asal) *
            </label>
            <Select
              instanceId={`seaport-origin-edit-${phaseId}-${activityId}`}
              inputId={`seaport-origin-edit-input-${phaseId}-${activityId}`}
              value={resolvedOriginSeaport || null}
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
            {resolvedOriginSeaport && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Pelabuhan dipilih
              </p>
            )}
          </div>
        ) : null}

        {/* Destination - Airport / Seaport selection (ground transport sudah di RouteLocationPicker) */}
        {isAirplane ? (
           /* Airport Selection for Airplanes */
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Menuju (Bandara Tujuan) *
            </label>
            <Select
              value={resolvedDestinationAirport || null}
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
            {resolvedDestinationAirport && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {resolvedDestinationAirport.label}
              </p>
            )}
          </div>
        ) : isSeaTransport ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Menuju (Pelabuhan Tujuan) *
            </label>
            <Select
              instanceId={`seaport-destination-edit-${phaseId}-${activityId}`}
              inputId={`seaport-destination-edit-input-${phaseId}-${activityId}`}
              value={resolvedDestinationSeaport || null}
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
            {resolvedDestinationSeaport && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Pelabuhan dipilih
              </p>
            )}
          </div>
        ) : null}

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
            {selectedTransportType && (
              <p className="text-xs text-blue-600 mt-1">
                Estimasi emisi: {formatTruncated(estimatedEmission)} kg CO2e
              </p>
            )}
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
