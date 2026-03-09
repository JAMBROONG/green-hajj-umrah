'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaKaaba, FaMosque, FaLeaf, FaCalendarAlt, FaArrowLeft } from 'react-icons/fa';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';

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
      <div className="app-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-textMuted">Memuat perjalanan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <FaArrowLeft className="text-lg text-textDark" />
              </button>
              <h1 className="text-lg font-bold text-textDark">Perjalanan Saya</h1>
            </div>
            <button
              onClick={() => router.push('/journeys/new')}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
            >
              <FaPlus className="text-lg" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
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
                        <h3 className="font-semibold text-gray-800 text-base truncate">
                          {trip.name}
                        </h3>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-medium uppercase">
                          {trip.type}
                        </span>
                      </div>
                      {getStatusBadge(trip.status)}
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center text-xs text-gray-600 mb-3">
                      <FaCalendarAlt className="mr-2" />
                      <span>
                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      </span>
                    </div>

                    {/* Emission */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs">
                        <FaLeaf className="text-emerald-600 mr-2" />
                        <span className="text-gray-600">Total Emisi:</span>
                      </div>
                      <span className="font-semibold text-emerald-600 text-xs">
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

      <BottomNav />
    </div>
  );
}
