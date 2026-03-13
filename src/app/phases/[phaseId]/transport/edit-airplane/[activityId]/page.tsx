'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS, TRANSPORT_FACTORS, AIRPORTS, AirportCode } from '@/lib/constants';
import { TransportActivity, PhaseId } from '@/lib/types';
import Select from 'react-select';
import { FaPlane } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';

export default function EditAirplaneTransportPage() {
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
    type: activity?.type || 'pesawat-ekonomi',
    date: activity?.date || ''
  });

  const [selectedOriginAirport, setSelectedOriginAirport] = useState<AirportCode | ''>('');
  const [selectedDestinationAirport, setSelectedDestinationAirport] = useState<AirportCode | ''>('');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(activity?.distance || null);

  // Find airport codes from activity origin/destination
  useEffect(() => {
    if (activity?.origin) {
      const originCode = Object.entries(AIRPORTS).find(([_, airport]) => 
        airport.name === activity.origin?.name
      )?.[0] as AirportCode | undefined;
      if (originCode) setSelectedOriginAirport(originCode);
    }
    if (activity?.destination) {
      const destCode = Object.entries(AIRPORTS).find(([_, airport]) => 
        airport.name === activity.destination?.name
      )?.[0] as AirportCode | undefined;
      if (destCode) setSelectedDestinationAirport(destCode);
    }
  }, [activity]);

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

  // Calculate distance when both airports are selected
  useEffect(() => {
    if (selectedOriginAirport && selectedDestinationAirport) {
      const origin = AIRPORTS[selectedOriginAirport];
      const destination = AIRPORTS[selectedDestinationAirport];
      
      // Calculate great circle distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (destination.lat - origin.lat) * Math.PI / 180;
      const dLon = (destination.lon - origin.lon) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      setCalculatedDistance(Math.round(distance));
    } else {
      setCalculatedDistance(null);
    }
  }, [selectedOriginAirport, selectedDestinationAirport]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOriginAirport || !selectedDestinationAirport || !calculatedDistance) {
      showWarning('Mohon pilih bandara asal dan tujuan', { title: 'Data Belum Lengkap' });
      return;
    }

    const distance = calculatedDistance;
    const passengers = 1;
    const factor = TRANSPORT_FACTORS[formData.type as keyof typeof TRANSPORT_FACTORS] || 0;
    const emission = distance * factor;

    const updatedActivity: TransportActivity = {
      ...activity!,
      type: formData.type,
      distance,
      passengers,
      date: formData.date,
      emission,
      origin: {
        name: AIRPORTS[selectedOriginAirport].name,
        lat: AIRPORTS[selectedOriginAirport].lat,
        lon: AIRPORTS[selectedOriginAirport].lon
      },
      destination: {
        name: AIRPORTS[selectedDestinationAirport].name,
        lat: AIRPORTS[selectedDestinationAirport].lat,
        lon: AIRPORTS[selectedDestinationAirport].lon
      }
    };

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
            <FaPlane className="text-3xl text-blue-400" />
            <div>
              <h1 className="text-xl font-bold">Edit Penerbangan</h1>
              <p className="text-sm text-white/80">{phase.name}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Transport Type - Airplane Only */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kelas Penerbangan *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
              required
            >
              <option value="pesawat-ekonomi">Kelas Ekonomi</option>
              <option value="pesawat-bisnis">Kelas Bisnis</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tanggal Penerbangan *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
              required
            />
          </div>

          {/* Origin Airport */}
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

          {/* Destination Airport */}
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

          {/* Calculated Distance Display */}
          {calculatedDistance !== null && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700 font-medium mb-1">
                Jarak Terbang
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
