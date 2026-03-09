'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Select from 'react-select';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS, HOTELS_DATA, HOTEL_FACTORS } from '@/lib/constants';
import { HotelActivity, PhaseId, HotelStars } from '@/lib/types';
import { MdHotel } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';

export default function EditHotelPage() {
  const params = useParams();
  const router = useRouter();
  const { showWarning } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const activityId = params.activityId as string;
  const { journey, updateCategory } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const categoryData = journey?.phases[phaseId]?.categories?.hotel;
  const activities = (categoryData?.activities as HotelActivity[]) || [];
  const activity = activities.find(a => a.id === activityId);

  const [formData, setFormData] = useState({
    hotelId: activity?.hotelId || '',
    hotelName: activity?.hotelName || '',
    stars: activity?.stars || 3,
    checkIn: activity?.checkIn || '',
    checkOut: activity?.checkOut || '',
    nights: activity?.nights || 1
  });

  const hotelOptions = HOTELS_DATA.map(hotel => ({
    value: hotel.id,
    label: `${hotel.name} (${hotel.city}) - ${hotel.stars} bintang`,
    hotel: hotel
  }));

  type HotelOption = typeof hotelOptions[number];

  const handleHotelChange = (option: HotelOption | null) => {
    if (option) {
      setFormData({
        ...formData,
        hotelId: option.hotel.id,
        hotelName: option.hotel.name,
        stars: option.hotel.stars
      });
    }
  };

  const handleDateChange = (field: 'checkIn' | 'checkOut', value: string) => {
    const newData = { ...formData, [field]: value };
    
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

    const factor = HOTEL_FACTORS[formData.stars as keyof typeof HOTEL_FACTORS] || 15;
    const emission = formData.nights * factor;

    const updatedActivity: HotelActivity = {
      ...activity!,
      hotelId: formData.hotelId,
      hotelName: formData.hotelName,
      stars: formData.stars as HotelStars,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      nights: formData.nights,
      emission
    };

    const updatedActivities = activities.map(a => 
      a.id === activityId ? updatedActivity : a
    );
    const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

    updateCategory(phaseId, 'hotel', {
      completed: false,
      activities: updatedActivities,
      totalEmission,
      emission: totalEmission
    });

    router.push(`/phases/${phaseId}/hotel`);
  };

  const handleCancel = () => {
    router.push(`/phases/${phaseId}/hotel`);
  };

  if (!phase || !activity) {
    return null;
  }

  const selectedOption = hotelOptions.find(opt => opt.value === formData.hotelId);

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
          <MdHotel className="text-3xl text-purple-400" />
          <div>
            <h1 className="text-xl font-bold">Edit Hotel</h1>
            <p className="text-sm text-white/80">{phase.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Hotel Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pilih Hotel *
          </label>
          <Select
            options={hotelOptions}
            value={selectedOption}
            onChange={handleHotelChange}
            placeholder="Cari hotel..."
            className="react-select-container"
            classNamePrefix="react-select"
            isClearable
            isSearchable
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

        {/* Nights */}
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
              {(formData.nights * (HOTEL_FACTORS[formData.stars as keyof typeof HOTEL_FACTORS] || 15)).toFixed(2)} kg CO₂e
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
