'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useDialog } from '@/contexts/DialogContext';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { PHASE_DEFINITIONS, CATEGORY_DEFINITIONS } from '@/lib/constants';
import { formatEmission } from '@/lib/utils';
import { PhaseId, CategoryId, HajiJourney } from '@/lib/types';
import { MdHome, MdFlight, MdMosque, MdPark, MdHotel, MdRestaurant, MdRecycling } from 'react-icons/md';
import { FaKaaba, FaBus, FaMountain, FaMoon, FaBullseye, FaRoad } from 'react-icons/fa';
import { IoArrowBack, IoChevronForward, IoCheckmarkDone } from 'react-icons/io5';

function getPhaseIcon(phaseId: string) {
  switch (phaseId) {
    case 'pra-keberangkatan': return <MdHome className="text-2xl text-teal-600" />;
    case 'keberangkatan': return <MdFlight className="text-2xl text-blue-500" />;
    case 'madinah': return <MdMosque className="text-2xl text-green-600" />;
    case 'makkah': return <FaKaaba className="text-2xl text-gray-900" />;
    case 'arafah': return <FaMountain className="text-2xl text-amber-700" />;
    case 'muzdalifah': return <FaMoon className="text-2xl text-yellow-400" />;
    case 'mina': return <FaBullseye className="text-2xl text-red-600" />;
    case 'rekreasi': return <MdPark className="text-2xl text-green-500" />;
    case 'perjalanan-antar-kota': return <FaRoad className="text-2xl text-orange-500" />;
    case 'kepulangan': return <MdFlight className="text-2xl text-blue-500 rotate-180" />;
    default: return <MdHome className="text-2xl text-teal-600" />;
  }
}

function getCategoryIcon(categoryId: string) {
  switch (categoryId) {
    case 'transport': return <FaBus className="text-2xl text-blue-600" />;
    case 'hotel': return <MdHotel className="text-2xl text-purple-600" />;
    case 'food': return <MdRestaurant className="text-2xl text-orange-600" />;
    case 'waste': return <MdRecycling className="text-2xl text-green-600" />;
    default: return <FaBus className="text-2xl text-blue-600" />;
  }
}

export default function PhaseDetailPage({ params }: { params: Promise<{ phaseId: PhaseId }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripId = searchParams.get('tripId');
  
  const [isMarking, setIsMarking] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [tripStatus, setTripStatus] = useState<'ongoing' | 'completed' | 'cancelled' | null>(null);
  const { showSuccess, showError } = useDialog();

  // Fetch status trip — dipakai untuk hide tombol "Tandai Fase Selesai"
  // saat trip sudah selesai/cancelled (tidak ada gunanya tandai fase di
  // trip yang sudah berakhir). Lightweight fetch, sekali per mount.
  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    fetch(`/api/trips/${tripId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.trip?.status) {
          setTripStatus(data.trip.status);
        }
      })
      .catch(() => { /* fallback: tombol tetap tampil */ });
    return () => { cancelled = true; };
  }, [tripId]);

  // Redirect to journeys if no tripId
  useEffect(() => {
    if (!tripId) {
      router.replace('/journeys');
    }
  }, [tripId, router]);

  const { journey, isLoading, updateJourney } = useHajiJourney({ tripId: tripId || undefined });

  if (!tripId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Mengalihkan...</p>
        </div>
      </div>
    );
  }

  if (isLoading || !journey) {
    return (
      <div className="app-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-textMuted">Memuat data...</p>
        </div>
      </div>
    );
  }

  const phase = PHASE_DEFINITIONS.find(p => p.id === resolvedParams.phaseId);
  const phaseData = journey?.phases?.[resolvedParams.phaseId];

  if (!phase || !phaseData) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="p-5 text-center">
          <p className="text-textMuted">Fase tidak ditemukan</p>
          <Link href={`/journeys/${tripId}`} className="text-primary text-sm underline mt-2 inline-block">
            Kembali ke detail perjalanan
          </Link>
        </div>
      </div>
    );
  }

  const phaseEmission = Object.values(phaseData.categories).reduce(
    (sum, cat) => sum + ((cat?.totalEmission ?? cat?.emission) || 0), 
    0
  );

  const completedCategories = phase.categories.filter(catId => {
    const catData = phaseData.categories[catId as CategoryId];
    return catData?.completed || ((catData?.totalEmission ?? catData?.emission) || 0) > 0;
  }).length;
  const progress = (completedCategories / phase.categories.length) * 100;

  const handleMarkPhaseComplete = async (force: boolean = false) => {
    try {
      setIsMarking(true);
      const response = await fetch(`/api/trips/${tripId}/journey/mark-phase-complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseId: resolvedParams.phaseId, force }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.warning && !force) {
          // Show warning and ask user to confirm
          setMissingCategories(data.missingCategories);
          setShowWarning(true);
          setIsMarking(false);
          return;
        }

        // Success - update local journey data
        if (data.journey) {
          await updateJourney(data.journey.phases as unknown as HajiJourney);
        }

        console.log('✅ Phase marked as complete');
        if (data.tripCompleted) {
          showSuccess('🎉 Selamat! Semua fase selesai. Perjalanan Anda telah ditandai sebagai selesai!');
        } else {
          showSuccess('Fase telah ditandai sebagai selesai');
        }
        router.push(`/journeys/${tripId}`);
      } else {
        const errorMsg = data.details || data.error || 'Gagal menandai fase sebagai selesai';
        console.error('❌ API Error:', { status: response.status, error: data });
        showError(errorMsg);
      }
    } catch (error) {
      console.error('Error marking phase complete:', error);
      showError('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsMarking(false);
    }
  };

  const accentColor: Record<string, string> = {
    transport: 'bg-blue-500',
    hotel: 'bg-purple-500',
    food: 'bg-orange-400',
    waste: 'bg-green-500',
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
            <div className="flex items-center gap-3 mb-4">
              <Link
                href={`/journeys/${tripId}`}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <IoArrowBack className="text-lg text-white" />
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold leading-tight truncate">{phase.name}</h1>
                <p className="text-xs text-white/75 truncate">{phase.description}</p>
              </div>
            </div>

            {/* Emission Summary */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-white/75 mb-0.5">Total Emisi Fase</p>
                <p className="text-2xl font-bold">{formatEmission(phaseEmission, 'ton')}</p>
                <p className="text-xs text-white/75">Ton CO₂e</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                {getPhaseIcon(phase.id)}
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs text-white/75">Progress Pengisian</p>
                <p className="text-xs font-semibold text-white">{completedCategories}/{phase.categories.length}</p>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Mark as Complete Button — hide kalau trip sudah selesai/cancelled.
              Tidak ada gunanya tandai fase di trip yang sudah berakhir. */}
          {tripStatus === 'ongoing' && (
            <button
              onClick={() => handleMarkPhaseComplete(false)}
              disabled={isMarking}
              className="w-full btn-primary font-semibold py-3 rounded-xl mb-5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMarking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memproses...
                </>
              ) : (
                <>
                  <IoCheckmarkDone className="text-xl" />
                  Tandai Fase Selesai
                </>
              )}
            </button>
          )}

          {/* Categories */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kategori Emisi</p>
          <div className="space-y-3">
            {phase.categories.map((catId, index) => {
              const catDef = CATEGORY_DEFINITIONS[catId as CategoryId];
              const catData = phaseData.categories[catId as CategoryId];

              if (!catDef || !catData) return null;

              let description: string = catDef.description;
              if (catId === 'transport' && phase.transportTypes) {
                if (phase.transportTypes === 'airplane') {
                  description = 'Penerbangan (pesawat)';
                } else if (phase.transportTypes === 'ground') {
                  description = 'Kendaraan darat (bus, mobil, kereta)';
                } else if (phase.transportTypes === 'mixed') {
                  description = 'Semua jenis transportasi';
                }
              }

              const emission = (catData.totalEmission ?? catData.emission) || 0;
              const status = catData.completed ? 'completed' : (emission > 0 ? 'in-progress' : 'pending');
              const statusLabel = status === 'completed' ? 'Selesai' : (status === 'in-progress' ? 'Diisi' : 'Belum');
              const statusClass = status === 'completed'
                ? 'bg-green-100 text-green-700'
                : status === 'in-progress'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-500';

              return (
                <Link
                  key={catId}
                  href={`/phases/${resolvedParams.phaseId}/${catId}?tripId=${tripId}`}
                  className="block bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all fade-in-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-stretch">
                    <div className={`w-1.5 flex-shrink-0 ${accentColor[catId] ?? 'bg-primary'}`} />
                    <div className="flex-1 min-w-0 flex items-center gap-2.5 p-3 sm:p-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {getCategoryIcon(catId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 mb-0.5 truncate">{catDef.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{description}</p>
                        <p className="text-xs font-semibold text-primary mt-1 truncate">
                          {formatEmission(emission, 'kg')} kg CO₂e
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusClass}`}>
                          {statusLabel}
                        </span>
                        <IoChevronForward className="text-base text-gray-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Kategori Belum Lengkap</h3>
            <p className="text-xs text-gray-500 text-center mb-4">Kategori berikut belum diisi:</p>
            <ul className="mb-4 space-y-2 bg-gray-50 rounded-xl p-3">
              {missingCategories.map((cat, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0"></span>
                  {cat}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 text-center mb-5">
              Anda masih bisa menandai fase ini sebagai selesai. Lanjutkan?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  handleMarkPhaseComplete(true);
                }}
                disabled={isMarking}
                className="flex-1 px-4 py-2.5 btn-primary rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {isMarking ? 'Memproses...' : 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
