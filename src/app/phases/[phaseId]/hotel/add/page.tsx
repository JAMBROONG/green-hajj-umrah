'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { HotelActivity, PhaseId, HotelStars } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { MdHotel } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';

interface Hotel {
  id: number;
  name: string;
  factor_emission: number;
  factor_emission_name: string;
  address: string;
  country_code: string;
}

export default function AddHotelPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);

  const [formData, setFormData] = useState({
    hotelId: '',
    hotelName: '',
    stars: 3,
    checkIn: '',
    checkOut: '',
    nights: 1
  });

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch hotels from API
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setLoading(true);
        console.log('🏨 Fetching hotels from /api/hotels');
        const response = await fetch('/api/hotels');
        console.log('📡 Hotels response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Hotels fetch error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch hotels');
        }
        
        const result = await response.json();
        console.log('✅ Hotels fetched:', result.data);
        setHotels(result.data || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch hotels';
        console.error('🔴 Hotels error:', message);
        setError(message);
        setHotels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, []);

  // Convert hotels data to react-select options
  const hotelOptions = hotels.map(hotel => ({
    value: hotel.id.toString(),
    label: `${hotel.name} - ${hotel.address}`,
    hotel: hotel
  }));

  type HotelOption = typeof hotelOptions[number];

  // Convert factor_emission to stars (3, 4, or 5)
  const getStarsFromFactor = (factor: number): HotelStars => {
    if (factor >= 50) return 5;
    if (factor >= 35) return 4;
    return 3;
  };

  const handleHotelChange = (option: HotelOption | null) => {
    if (option) {
      const stars = getStarsFromFactor(option.hotel.factor_emission);
      setFormData({
        ...formData,
        hotelId: option.hotel.id.toString(),
        hotelName: option.hotel.name,
        stars: stars
      });
    }
  };

  const handleDateChange = (field: 'checkIn' | 'checkOut', value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Calculate nights if both dates are set
    if (newData.checkIn && newData.checkOut) {
      const checkIn = new Date(newData.checkIn);
      const checkOut = new Date(newData.checkOut);
      const diffTime = checkOut.getTime() - checkIn.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      newData.nights = diffDays > 0 ? diffDays : 1;
    }
    
    setFormData(newData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hotelId) {
      showWarning('Pilih hotel terlebih dahulu', { title: 'Data Belum Lengkap' });
      return;
    }

    // Get the selected hotel to get its factor_emission
    const selectedHotel = hotels.find(h => h.id.toString() === formData.hotelId);
    const factor = selectedHotel?.factor_emission || 25; // Default to 25 if not found
    const emission = formData.nights * Number(factor);

    const newActivity: HotelActivity = {
      id: uuidv4(),
      hotelId: formData.hotelId,
      hotelName: formData.hotelName,
      stars: formData.stars as HotelStars,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      nights: formData.nights,
      emission
    };

    // Get existing activities
    const existingData = journey?.phases[phaseId]?.categories?.hotel;
    const existingActivities = (existingData?.activities as HotelActivity[]) || [];
    
    // Add new activity
    const updatedActivities = [...existingActivities, newActivity];
    const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

    // Update category with new activities array
    updateCategory(phaseId, 'hotel', {
      completed: false,
      activities: updatedActivities,
      totalEmission,
      // Keep legacy field for backward compatibility
      emission: totalEmission
    });

    // Navigate back
    const url = tripId ? `/phases/${phaseId}/hotel?tripId=${tripId}` : `/phases/${phaseId}/hotel`;
    router.push(url);
  };

  const handleCancel = () => {
    const url = tripId ? `/phases/${phaseId}/hotel?tripId=${tripId}` : `/phases/${phaseId}/hotel`;
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
              <MdHotel className="text-2xl text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tambah Hotel</h1>
              <p className="text-sm text-white/75">{phase.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            ⚠️ {error}
          </div>
        )}

        {/* Hotel Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Hotel *
          </label>
          <Select
            instanceId={`hotel-select-${phaseId}`}
            inputId={`hotel-select-input-${phaseId}`}
            options={hotelOptions}
            onChange={handleHotelChange}
            placeholder={loading ? "Memuat hotel..." : "Cari hotel..."}
            className="react-select-container"
            classNamePrefix="react-select"
            isClearable
            isSearchable
            isDisabled={loading}
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: '0.75rem',
                borderWidth: '2px',
                borderColor: '#e5e7eb',
                padding: '0.25rem',
                '&:hover': {
                  borderColor: '#0D6E4F'
                }
              }),
              menu: (base) => ({
                ...base,
                borderRadius: '0.75rem',
                overflow: 'hidden'
              })
            }}
          />
        </div>

        {/* Check-in Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tanggal Check-in *
          </label>
          <input
            type="date"
            value={formData.checkIn}
            onChange={(e) => handleDateChange('checkIn', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Check-out Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tanggal Check-out *
          </label>
          <input
            type="date"
            value={formData.checkOut}
            onChange={(e) => handleDateChange('checkOut', e.target.value)}
            min={formData.checkIn}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            required
          />
        </div>

        {/* Nights (auto-calculated) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Jumlah Malam
          </label>
          <input
            type="number"
            value={formData.nights}
            readOnly
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600"
          />
          <p className="text-sm text-gray-500 mt-1">
            Otomatis dihitung dari tanggal check-in dan check-out
          </p>
        </div>

        {/* Preview Emission */}
        {formData.hotelId && (
          <div className="p-4 bg-primaryLight rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Estimasi Emisi</p>
            <p className="text-2xl font-bold text-primary">
              {(() => {
                const hotel = hotels.find(h => h.id.toString() === formData.hotelId);
                const factor = hotel?.factor_emission || 25;
                return (formData.nights * Number(factor)).toFixed(2);
              })()} kg CO₂e
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
