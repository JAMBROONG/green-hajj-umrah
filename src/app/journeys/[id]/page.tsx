'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaKaaba, FaMosque, FaCalendarAlt, FaLeaf, FaEdit, FaTrash } from 'react-icons/fa';
import { MdHome, MdFlight, MdMosque as MdMasjid, MdPark } from 'react-icons/md';
import { FaMountain, FaMoon, FaBullseye } from 'react-icons/fa';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { useHajiJourney } from '@/hooks/useHajiJourney';

interface Trip {
  id: string;
  name: string;
  type: 'haji' | 'umrah';
  startDate: string;
  endDate: string;
  totalEmission: number;
  status: 'ongoing' | 'completed' | 'cancelled';
}

// Helper function to get phase icon
const getPhaseIcon = (phaseId: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    'pra-keberangkatan': <MdHome className="text-2xl text-teal-600" />,
    'penerbangan-pergi': <MdFlight className="text-2xl text-blue-500" />,
    'madinah': <MdMasjid className="text-2xl text-green-600" />,
    'makkah': <FaKaaba className="text-2xl text-gray-900" />,
    'arafah': <FaMountain className="text-2xl text-amber-700" />,
    'muzdalifah': <FaMoon className="text-2xl text-yellow-400" />,
    'mina': <FaBullseye className="text-2xl text-red-600" />,
    'rekreasi': <MdPark className="text-2xl text-green-500" />,
    'pulang': <MdFlight className="text-2xl text-blue-500 rotate-180" />
  };
  return iconMap[phaseId] || <MdHome className="text-2xl text-teal-600" />;
};

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { journey, isLoading: journeyLoading, totalEmission } = useHajiJourney({ tripId });

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}`);
      if (response.ok) {
        const data = await response.json();
        setTrip(data.trip);
      } else {
        router.push('/journeys');
      }
    } catch (error) {
      console.error('Failed to load trip:', error);
      router.push('/journeys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus perjalanan ini?')) {
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/journeys');
      } else {
        alert('Gagal menghapus perjalanan');
      }
    } catch (error) {
      console.error('Failed to delete trip:', error);
      alert('Gagal menghapus perjalanan');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
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
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getCompletedPhasesCount = () => {
    if (!journey) return 0;
    return Object.values(journey.phases).filter(phase => phase.completed).length;
  };

  if (isLoading || journeyLoading || !trip || !journey) {
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
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push('/journeys')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaArrowLeft className="text-xl" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => alert('Edit feature coming soon')}
                className="p-2 text-gray-600 hover:text-emerald-600 transition-colors"
              >
                <FaEdit className="text-lg" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <FaTrash className="text-lg" />
              </button>
            </div>
          </div>

          {/* Trip Info */}
          <div className="flex items-center gap-3 mb-2">
            {trip.type === 'haji' ? (
              <FaKaaba className="text-3xl text-emerald-600" />
            ) : (
              <FaMosque className="text-3xl text-emerald-600" />
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">{trip.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded font-medium uppercase">
                  {trip.type}
                </span>
                {getStatusBadge(trip.status)}
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <FaCalendarAlt className="mr-2" />
            <span>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </span>
          </div>

          {/* Emission Summary */}
          <div className="bg-emerald-50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center">
              <FaLeaf className="text-emerald-600 mr-2" />
              <span className="text-sm text-gray-600">Total Emisi:</span>
            </div>
            <span className="font-bold text-emerald-600 text-lg">
              {totalEmission.toFixed(2)} kg CO₂
            </span>
          </div>
        </div>
      </div>

      {/* Phases */}
      <div className="max-w-md mx-auto px-6 py-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Fase Perjalanan</h2>
          <p className="text-sm text-gray-600">
            {getCompletedPhasesCount()} dari {Object.keys(PHASE_DEFINITIONS).length} fase selesai
          </p>
        </div>

        <div className="space-y-3">
          {Object.entries(PHASE_DEFINITIONS).map(([phaseId, phaseDef]) => {
            const phaseData = journey.phases[phaseId as keyof typeof journey.phases];
            const isCompleted = phaseData?.completed || false;

            return (
              <Link
                key={phaseId}
                href={`/phases/${phaseId}?tripId=${tripId}`}
                className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    {getPhaseIcon(phaseId)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${
                      isCompleted ? 'text-gray-800' : 'text-gray-600'
                    }`}>
                      {phaseDef.name}
                    </h3>
                    <p className="text-sm text-gray-500">{phaseDef.description}</p>
                  </div>

                  {isCompleted && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
