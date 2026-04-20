'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaKaaba, FaMosque, FaEdit, FaTrash, FaRoad } from 'react-icons/fa';
import { MdHome, MdFlight, MdMosque as MdMasjid, MdPark } from 'react-icons/md';
import { FaMountain, FaMoon, FaBullseye } from 'react-icons/fa';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { checkCurrentStageAlert } from '@/lib/geo-stage';
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
  const dialogContext = useDialog();
  const { showConfirm, showError, showAlert } = dialogContext;
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

  const completedCount = getCompletedPhasesCount();
  const applicablePhases = PHASE_DEFINITIONS.filter(p => (p.type as readonly string[]).includes(trip.type));
  const totalPhases = applicablePhases.length;
  const progressPct = totalPhases > 0 ? (completedCount / totalPhases) * 100 : 0;

  const statusBg: Record<string, string> = {
    ongoing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  const statusLabel: Record<string, string> = {
    ongoing: 'Berlangsung',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };

  return (
    <div className="app-container">
      <StatusBar />

      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div
          className="text-white shadow-lg"
          style={{
            backgroundImage: "url('/bg-menu.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="px-5 pt-5 pb-4">
            {/* Top row: back + actions */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.push('/journeys')}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <FaArrowLeft className="text-base text-white" />
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/journeys/${tripId}/edit`)}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  title="Edit perjalanan"
                >
                  <FaEdit className="text-sm text-white" />
                </button>
                <button
                  onClick={handleDelete}
                  className="w-9 h-9 rounded-full bg-red-500/40 hover:bg-red-500/60 flex items-center justify-center transition-colors"
                  title="Hapus perjalanan"
                >
                  <FaTrash className="text-sm text-white" />
                </button>
              </div>
            </div>

            {/* Trip identity */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                {trip.type === 'haji'
                  ? <FaKaaba className="text-2xl text-white" />
                  : <FaMosque className="text-2xl text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold leading-tight truncate">{trip.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                    {trip.type}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBg[trip.status]}`}>
                    {statusLabel[trip.status]}
                  </span>
                </div>
              </div>
            </div>

            {/* Date + Emission */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-white/75 mb-0.5">Total Emisi Karbon</p>
                <p className="text-2xl font-bold">{(totalEmission / 1000).toFixed(2)}</p>
                <p className="text-xs text-white/75">Ton CO₂e</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/75 mb-0.5">Periode</p>
                <p className="text-sm font-semibold">{formatDate(trip.startDate)}</p>
                <p className="text-xs text-white/60">s/d {formatDate(trip.endDate)}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs text-white/75">Progress Fase</p>
                <p className="text-xs font-semibold text-white">{completedCount}/{totalPhases} selesai</p>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Phase Helper Card */}
        <div className="px-5 pt-3">
          <div className="bg-[#2D2D2D] rounded-2xl p-4 shadow-md">
            <h3 className="text-[15px] font-medium mb-3 text-white">
              Tidak tahu sedang di tahapan mana?
            </h3>
            <button 
              onClick={() => checkCurrentStageAlert(dialogContext, (phaseId) => {
                router.push(`/phases/${phaseId}?tripId=${tripId}`);
              }, trip.startDate, trip.endDate)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 bg-transparent hover:bg-white/10 transition-colors text-sm font-semibold text-white tracking-wide"
            >
              <span className="text-base text-pink-500">📍</span>
              Saya sedang di tahapan mana sekarang?
            </button>
          </div>
        </div>

        {/* Phases list */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Fase Perjalanan</p>

          <div className="space-y-3">
            {applicablePhases.map((phaseDef, index) => {
              const phaseId = phaseDef.id;
              const phaseData = journey.phases[phaseId as keyof typeof journey.phases];
              const isCompleted = phaseData?.completed || false;
              const hasData = phaseData?.categories
                ? Object.values(phaseData.categories).some(cat => ((cat?.totalEmission ?? cat?.emission) || 0) > 0)
                : false;

              const phaseEmission = phaseData?.categories
                ? Object.values(phaseData.categories).reduce(
                    (sum, cat) => sum + ((cat?.totalEmission ?? cat?.emission) || 0),
                    0
                  )
                : 0;

              const accentColor = isCompleted
                ? 'bg-green-500'
                : hasData
                ? 'bg-blue-400'
                : 'bg-gray-200';

              const statusPill = isCompleted
                ? 'bg-green-100 text-green-700'
                : hasData
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500';

              const statusPillLabel = isCompleted ? 'Selesai' : hasData ? 'Diisi' : 'Belum';

              return (
                <Link
                  key={phaseId}
                  href={`/phases/${phaseId}?tripId=${tripId}`}
                  className="block bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all fade-in-item active:scale-[0.99]"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div className="flex">
                    <div className={`w-1.5 flex-shrink-0 ${accentColor}`} />
                    <div className="flex-1 flex items-center gap-3 p-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCompleted ? 'bg-green-50' : hasData ? 'bg-blue-50' : 'bg-gray-50'
                      }`}>
                        {getPhaseIcon(phaseId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight mb-0.5">{phaseDef.name}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{phaseDef.description}</p>
                        <p className={`text-xs font-semibold mt-1 ${phaseEmission > 0 ? 'text-primary' : 'text-gray-400'}`}>
                          {(phaseEmission / 1000).toFixed(3)} ton CO₂e
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">  
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusPill}`}>
                          {statusPillLabel}
                        </span>
                        {isCompleted && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
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
