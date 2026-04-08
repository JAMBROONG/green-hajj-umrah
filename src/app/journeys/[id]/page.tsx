'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaKaaba, FaMosque, FaCalendarAlt, FaLeaf, FaEdit, FaTrash, FaRoad } from 'react-icons/fa';
import { MdHome, MdFlight, MdMosque as MdMasjid, MdPark } from 'react-icons/md';
import { FaMountain, FaMoon, FaBullseye } from 'react-icons/fa';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
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
}

// Helper function to get phase icon
const getPhaseIcon = (phaseId: string) => {
  switch (phaseId) {
    case 'pra-keberangkatan':
      return <MdHome className="text-2xl text-teal-600" />;
    case 'keberangkatan':
      return <MdFlight className="text-2xl text-blue-500" />;
    case 'madinah':
      return <MdMasjid className="text-2xl text-green-600" />;
    case 'makkah':
      return <FaKaaba className="text-2xl text-gray-900" />;
    case 'arafah':
      return <FaMountain className="text-2xl text-amber-700" />;
    case 'muzdalifah':
      return <FaMoon className="text-2xl text-yellow-400" />;
    case 'mina':
      return <FaBullseye className="text-2xl text-red-600" />;
    case 'rekreasi':
      return <MdPark className="text-2xl text-green-500" />;
    case 'perjalanan-antar-kota':
      return <FaRoad className="text-2xl text-orange-500" />;
    case 'kepulangan':
      return <MdFlight className="text-2xl text-blue-500 rotate-180" />;
    default:
      return <MdHome className="text-2xl text-teal-600" />;
  }
};

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = use(params);
  const router = useRouter();
  const { showConfirm, showError, showAlert } = useDialog();
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
    showConfirm(
      'Apakah Anda yakin ingin menghapus perjalanan ini?',
      async () => {
        try {
          const response = await fetch(`/api/trips/${tripId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            router.push('/journeys');
          } else {
            showError('Gagal menghapus perjalanan');
          }
        } catch (error) {
          console.error('Failed to delete trip:', error);
          showError('Gagal menghapus perjalanan');
        }
      },
      {
        title: 'Hapus Perjalanan',
        confirmText: 'Hapus',
        cancelText: 'Batal'
      }
    );
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
        <div className="bg-white px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push('/journeys')}
              className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <FaArrowLeft className="text-lg text-textDark" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/journeys/${tripId}/edit`)}
                className="p-2 text-textMuted hover:text-primary transition-colors"
              >
                <FaEdit className="text-lg" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-textMuted hover:text-red-600 transition-colors"
              >
                <FaTrash className="text-lg" />
              </button>
            </div>
          </div>

          {/* Trip Info */}
          <div className="flex items-center gap-3 mb-2">
            {trip.type === 'haji' ? (
              <FaKaaba className="text-3xl text-primary" />
            ) : (
              <FaMosque className="text-3xl text-primary" />
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">{trip.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-primaryLight text-primary text-xs rounded font-medium uppercase">
                  {trip.type}
                </span>
                {getStatusBadge(trip.status)}
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-center text-xs text-textMuted mb-3">
            <FaCalendarAlt className="mr-2" />
            <span>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </span>
          </div>

          {/* Emission Summary */}
          <div className="bg-primaryLight rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center">
              <FaLeaf className="text-primary mr-2" />
              <span className="text-sm text-textMuted">Total Emisi:</span>
            </div>
            <span className="font-bold text-primary text-base">
              {(totalEmission / 1000).toFixed(2)} ton CO₂
            </span>
          </div>
        </div>

        {/* Phases */}
        <div className="p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-textDark mb-1">Fase Perjalanan</h2>
            <p className="text-xs text-textMuted">
              {getCompletedPhasesCount()} dari {PHASE_DEFINITIONS.filter(p => (p.type as readonly string[]).includes(trip.type)).length} fase selesai
            </p>
          </div>

          <div className="space-y-3">
          {PHASE_DEFINITIONS
            .filter(phaseDef => (phaseDef.type as readonly string[]).includes(trip.type))
            .map((phaseDef) => {
            const phaseId = phaseDef.id;
            const phaseData = journey.phases[phaseId as keyof typeof journey.phases];
            const isCompleted = phaseData?.completed || false;
            
            // Calculate phase emission from all categories
            const phaseEmission = phaseData?.categories 
              ? Object.values(phaseData.categories).reduce(
                  (sum, cat) => sum + ((cat?.totalEmission ?? cat?.emission) || 0), 
                  0
                )
              : 0;

            return (
                <Link
                  key={phaseId}
                  href={`/phases/${phaseId}?tripId=${tripId}`}
                  className="block bg-white rounded-2xl p-4 border-2 border-border hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isCompleted ? 'bg-primaryLight' : 'bg-bgMain'
                    }`}>
                      {getPhaseIcon(phaseId)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-sm ${
                        isCompleted ? 'text-textDark' : 'text-textMuted'
                      }`}>
                        {phaseDef.name}
                      </h3>
                      <p className="text-xs text-textMuted">{phaseDef.description}</p>
                      <p className={`text-xs font-medium mt-1 ${
                        phaseEmission > 0 ? 'text-primary' : 'text-textMuted'
                      }`}>
                        {(phaseEmission / 1000).toFixed(2)} ton CO₂
                      </p>
                    </div>

                    {isCompleted && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
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

      <BottomNav />
    </div>
  );
}
