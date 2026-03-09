'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaKaaba, FaMosque, FaLeaf, FaCalendarAlt, FaArrowLeft } from 'react-icons/fa';

interface Trip {
  id: string;
  name: string;
  type: 'haji' | 'umrah';
  startDate: string;
  endDate: string;
  totalEmission: number;
  status: 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
}

export default function JourneysPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const response = await fetch('/api/trips');
      if (response.ok) {
        const data = await response.json();
        setTrips(data.trips);
      }
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ongoing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      ongoing: 'Berlangsung',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getTripIcon = (type: string) => {
    return type === 'haji' ? (
      <FaKaaba className="text-2xl text-emerald-600" />
    ) : (
      <FaMosque className="text-2xl text-emerald-600" />
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat perjalanan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <FaArrowLeft className="text-xl" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Perjalanan Saya</h1>
            </div>
            <button
              onClick={() => router.push('/journeys/new')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full shadow-lg transition-all"
            >
              <FaPlus className="text-xl" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 py-6">
        {trips.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-gray-400 mb-4">
              <FaKaaba className="text-6xl mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Belum Ada Perjalanan
            </h3>
            <p className="text-gray-600 mb-6">
              Mulai lacak jejak karbon perjalanan haji atau umrah Anda
            </p>
            <button
              onClick={() => router.push('/journeys/new')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Buat Perjalanan Baru
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => router.push(`/journeys/${trip.id}`)}
                className="bg-white rounded-xl shadow-md p-5 cursor-pointer hover:shadow-lg transition-all"
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    {getTripIcon(trip.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg truncate">
                          {trip.name}
                        </h3>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded font-medium uppercase">
                          {trip.type}
                        </span>
                      </div>
                      {getStatusBadge(trip.status)}
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <FaCalendarAlt className="mr-2" />
                      <span>
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </span>
                    </div>

                    {/* Emission */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm">
                        <FaLeaf className="text-emerald-600 mr-2" />
                        <span className="text-gray-600">Total Emisi:</span>
                      </div>
                      <span className="font-semibold text-emerald-600">
                        {parseFloat(trip.totalEmission.toString()).toFixed(2)} kg CO₂
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
