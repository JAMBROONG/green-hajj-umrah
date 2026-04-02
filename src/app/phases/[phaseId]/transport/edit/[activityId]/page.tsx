'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { useEmissionFactors } from '@/hooks/useEmissionFactors';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { TransportActivity, PhaseId } from '@/lib/types';
import { searchLocations, calculateRoutingDistance, Location } from '@/lib/locationService';
import { fetchAirports, toIndonesiaSelectOptions, getSaudiAirportOptions, findAirportByName, calculateFlightDistanceKm, AirportSelectOption } from '@/lib/airportHelper';
import { fetchSeaports, toSeaportSelectOptions, findSeaportByName, calculateSeaportDistanceKm, SeaportSelectOption } from '@/lib/seaportHelper';
import Select from 'react-select';
import { FaCar } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';
import { formatTruncated } from '@/lib/utils';

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

  // Location search states
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<Location[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Location[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Location | null>(null);
  const [groundDistance, setGroundDistance] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

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

  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);
  const hasInitializedLocations = useRef(false);

  useEffect(() => {
    // Initialize origin and destination from activity data when activity is available
    // This pattern initializes the form with existing activity data
    if (activity && !hasInitializedLocations.current && (activity.origin || activity.destination)) {
      const initData = () => {
        if (activity.origin) {
          setOriginQuery(activity.origin.name);
          setSelectedOrigin({
            displayName: activity.origin.name,
            lat: activity.origin.lat,
            lon: activity.origin.lon,
            placeId: 0
          });
        }
        if (activity.destination) {
          setDestinationQuery(activity.destination.name);
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
      
      // Use requestAnimationFrame to defer state updates to avoid cascading renders
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

  // Search origin locations
  useEffect(() => {
    const searchOrigin = async () => {
      if (originQuery.length >= 3 && !selectedOrigin) {
        setIsSearching(true);
        const results = await searchLocations(originQuery);
        setOriginSuggestions(results);
        setIsSearching(false);
      } else {
        setOriginSuggestions([]);
      }
    };

    const debounce = setTimeout(searchOrigin, 300);
    return () => clearTimeout(debounce);
  }, [originQuery, selectedOrigin]);

  // Search destination locations
  useEffect(() => {
    const searchDestination = async () => {
      if (destinationQuery.length >= 3 && !selectedDestination) {
        setIsSearching(true);
        const results = await searchLocations(destinationQuery);
        setDestinationSuggestions(results);
        setIsSearching(false);
      } else {
        setDestinationSuggestions([]);
      }
    };

    const debounce = setTimeout(searchDestination, 300);
    return () => clearTimeout(debounce);
  }, [destinationQuery, selectedDestination]);

  // Calculate distance for ground transport only
  useEffect(() => {
    const calculateDistance = async () => {
      if (!isAirplane && !isSeaTransport && selectedOrigin && selectedDestination) {
        setIsSearching(true);
        const distance = await calculateRoutingDistance(
          selectedOrigin.lat,
          selectedOrigin.lon,
          selectedDestination.lat,
          selectedDestination.lon
        );
        setGroundDistance(distance);
        setIsSearching(false);
      } else {
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
          <FaCar className="text-3xl text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">Edit Transportasi</h1>
            <p className="text-sm text-white/80">{phase.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Transport Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jenis Transportasi *
          </label>
          <select
            value={selectedTransportType}
            onChange={(e) => {
              setFormData({ ...formData, type: e.target.value });
              // Reset all selections when transport type changes
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
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Origin - Conditional based on transport type */}
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
        ) : (
          /* Location Search for Ground Transport */
          <div className="relative" ref={originRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dari (Lokasi Asal) *
            </label>
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
            {selectedOrigin && (
              <p className="text-xs text-green-600 mt-1">✓ Lokasi dipilih</p>
            )}
          </div>
        )}

        {/* Destination - Conditional based on transport type */}
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
        ) : (
          /* Location Search for Ground Transport */
          <div className="relative" ref={destinationRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Menuju (Lokasi Tujuan) *
            </label>
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
          </div>
        )}

        {/* Calculated Distance Display */}
        {calculatedDistance !== null && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700 font-medium mb-1">
              {isAirplane ? 'Jarak Terbang' : isSeaTransport ? 'Jarak Pelabuhan' : 'Jarak Rute Jalan'}
            </p>
            {isSearching ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin text-blue-600">⏳</div>
                <p className="text-lg text-blue-700">Menghitung rute...</p>
              </div>
            ) : calculatedDistance !== null ? (
              <>
                <p className="text-2xl font-bold text-blue-900">
                  {calculatedDistance.toFixed(1)} km
                </p>
                {selectedTransportType && (
                  <p className="text-xs text-blue-600 mt-1">
                    Estimasi emisi: {formatTruncated(estimatedEmission)} kg CO2e
                  </p>
                )}
              </>
            ) : null}
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
