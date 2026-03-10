'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS, TRANSPORT_FACTORS, AIRPORTS, AirportCode } from '@/lib/constants';
import { TransportActivity, PhaseId } from '@/lib/types';
import { searchLocations, calculateRoutingDistance, Location } from '@/lib/locationService';
import Select from 'react-select';
import { FaCar } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';

export default function EditTransportPage() {
  const params = useParams();
  const router = useRouter();
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const activityId = params.activityId as string;
  const { journey, updateCategory } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const categoryData = journey?.phases[phaseId]?.categories?.transport;
  const activities = (categoryData?.activities as TransportActivity[]) || [];
  const activity = activities.find(a => a.id === activityId);

  const [formData, setFormData] = useState({
    type: activity?.type || '',
    date: activity?.date || ''
  });

  // Location search states
  const [originQuery, setOriginQuery] = useState(activity?.origin?.name || '');
  const [destinationQuery, setDestinationQuery] = useState(activity?.destination?.name || '');
  const [originSuggestions, setOriginSuggestions] = useState<Location[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Location[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(
    activity?.origin ? {
      displayName: activity.origin.name,
      lat: activity.origin.lat,
      lon: activity.origin.lon,
      placeId: 0
    } : null
  );
  const [selectedDestination, setSelectedDestination] = useState<Location | null>(
    activity?.destination ? {
      displayName: activity.destination.name,
      lat: activity.destination.lat,
      lon: activity.destination.lon,
      placeId: 0
    } : null
  );
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(activity?.distance || null);
  const [isSearching, setIsSearching] = useState(false);

  // Check if transport type is airplane
  const isAirplane = formData.type === 'pesawat-ekonomi' || formData.type === 'pesawat-bisnis';
  
  // Airport selection states
  const [selectedOriginAirport, setSelectedOriginAirport] = useState<AirportCode | ''>('');
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState<AirportCode | ''>('');

  const originRef = useRef<HTMLDivElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);

  // Prepare airport options for react-select
  const airportOptions = Object.entries(AIRPORTS).map(([code, airport]) => ({
    value: code as AirportCode,
    label: `${airport.city} - ${airport.name}`,
    country: airport.country
  }));

  const indonesiaAirports = airportOptions.filter(option => option.country === 'Indonesia');
  const saudiAirports = airportOptions.filter(option => option.country === 'Saudi Arabia');

  const groupedAirportOptions = [
    { label: 'Indonesia', options: indonesiaAirports },
    { label: 'Saudi Arabia', options: saudiAirports }
  ];

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

  // Calculate distance - Haversine for airplanes, Routing API for ground transport
  useEffect(() => {
    const calculateDistance = async () => {
      // For airplanes: use Haversine formula with airport coordinates
      if (isAirplane && selectedOriginAirport && selectedDestinationAirport) {
        const origin = AIRPORTS[selectedOriginAirport];
        const dest = AIRPORTS[selectedDestinationAirport];
        
        // Haversine formula for great circle distance
        const R = 6371; // Earth's radius in km
        const dLat = (dest.lat - origin.lat) * Math.PI / 180;
        const dLon = (dest.lon - origin.lon) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(origin.lat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        setCalculatedDistance(Math.round(distance));
      } else if (isAirplane) {
        setCalculatedDistance(null);
      }
      // For ground transport: use routing API with location coordinates
      else if (!isAirplane && selectedOrigin && selectedDestination) {
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
  }, [isAirplane, selectedOriginAirport, selectedDestinationAirport, selectedOrigin, selectedDestination]);

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
      if (!selectedOriginAirport || !selectedDestinationAirport || !calculatedDistance) {
        showWarning('Mohon pilih bandara asal dan tujuan', { title: 'Data Belum Lengkap' });
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
    
    const factor = TRANSPORT_FACTORS[formData.type as keyof typeof TRANSPORT_FACTORS] || 0;
    const emission = distance * factor;

    const updatedActivity: TransportActivity = {
      ...activity!,
      type: formData.type,
      distance,
      passengers,
      date: formData.date,
      emission,
      origin: isAirplane && selectedOriginAirport
        ? {
            name: AIRPORTS[selectedOriginAirport].name,
            lat: AIRPORTS[selectedOriginAirport].lat,
            lon: AIRPORTS[selectedOriginAirport].lon
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
            name: AIRPORTS[selectedDestinationAirport].name,
            lat: AIRPORTS[selectedDestinationAirport].lat,
            lon: AIRPORTS[selectedDestinationAirport].lon
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

    router.push(`/phases/${phaseId}/transport`);
  };

  const handleCancel = () => {
    router.push(`/phases/${phaseId}/transport`);
  };

  if (!phase || !activity) {
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
            value={formData.type}
            onChange={(e) => {
              setFormData({ ...formData, type: e.target.value });
              // Reset all selections when transport type changes
              setSelectedOrigin(null);
              setSelectedDestination(null);
              setSelectedOriginAirport('');
              setSelectedDestinationAirport('');
              setCalculatedDistance(null);
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          >
            <option value="">-- Pilih Jenis Transportasi --</option>
            <option value="mobil">Mobil</option>
            <option value="mobil-listrik">Mobil Listrik</option>
            <option value="bus">Bus</option>
            <option value="bus-listrik">Bus Listrik</option>
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

        {/* Origin - Conditional based on transport type */}
        {isAirplane ? (
          /* Airport Selection for Airplanes */
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dari (Bandara Asal) *
            </label>
            <Select
              value={selectedOriginAirport ? { 
                value: selectedOriginAirport, 
                label: `${AIRPORTS[selectedOriginAirport].city} - ${AIRPORTS[selectedOriginAirport].name}`,
                country: AIRPORTS[selectedOriginAirport].country
              } : null}
              onChange={(option) => setSelectedOriginAirport(option?.value || '')}
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
                ✓ {AIRPORTS[selectedOriginAirport].city} - {AIRPORTS[selectedOriginAirport].name}
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
              value={selectedDestinationAirport ? { 
                value: selectedDestinationAirport, 
                label: `${AIRPORTS[selectedDestinationAirport].city} - ${AIRPORTS[selectedDestinationAirport].name}`,
                country: AIRPORTS[selectedDestinationAirport].country
              } : null}
              onChange={(option) => setSelectedDestinationAirport(option?.value || '')}
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
                ✓ {AIRPORTS[selectedDestinationAirport].city} - {AIRPORTS[selectedDestinationAirport].name}
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
        {((isAirplane && selectedOriginAirport && selectedDestinationAirport) || 
          (!isAirplane && selectedOrigin && selectedDestination)) && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700 font-medium mb-1">
              {isAirplane ? 'Jarak Terbang' : 'Jarak Rute Jalan'}
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
                {formData.type && (
                  <p className="text-xs text-blue-600 mt-1">
                    Estimasi emisi: {(calculatedDistance * (TRANSPORT_FACTORS[formData.type as keyof typeof TRANSPORT_FACTORS] || 0)).toFixed(2)} kg CO2e
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
