'use client';

import { use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { PHASE_DEFINITIONS, CATEGORY_DEFINITIONS } from '@/lib/constants';
import { formatEmission } from '@/lib/utils';
import { PhaseId, CategoryId } from '@/lib/types';
import { MdHome, MdFlight, MdMosque, MdPark, MdHotel, MdRestaurant, MdRecycling } from 'react-icons/md';
import { FaKaaba, FaBus, FaMountain, FaMoon, FaBullseye } from 'react-icons/fa';
import { IoArrowBack, IoChevronForward } from 'react-icons/io5';

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

  // Redirect to journeys if no tripId
  useEffect(() => {
    if (!tripId) {
      router.replace('/journeys');
    }
  }, [tripId, router]);

  const { journey, isLoading } = useHajiJourney({ tripId: tripId || undefined });

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
  const phaseData = journey.phases[resolvedParams.phaseId];

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

  const completedCategories = phase.categories.filter(
    cat => phaseData.categories[cat as CategoryId]?.completed
  ).length;
  const progress = (completedCategories / phase.categories.length) * 100;

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border flex items-center gap-3">
          <Link href={`/journeys/${tripId}`} className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center">
            <IoArrowBack className="text-xl" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-textDark">{phase.name}</h1>
            <p className="text-xs text-textMuted">{phase.description}</p>
          </div>
        </div>

        <div className="p-5">
          {/* Phase Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primaryLight flex items-center justify-center">
                {getPhaseIcon(phase.id)}
              </div>
              <div className="flex-1">
                <p className="text-xs text-textMuted mb-0.5">Total Emisi Fase</p>
                <h2 className="text-xl font-bold text-textDark number-display">
                  {formatEmission(phaseEmission, 'ton')} Ton CO2e
                </h2>
              </div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-xs text-textMuted mt-2">
              {completedCategories} dari {phase.categories.length} kategori telah diisi
            </p>
          </div>

          {/* Categories */}
          <h3 className="text-sm font-semibold text-textDark mb-3">Kategori Emisi CO2e</h3>
          <div className="space-y-3">
            {phase.categories.map((catId, index) => {
              const catDef = CATEGORY_DEFINITIONS[catId as CategoryId];
              const catData = phaseData.categories[catId as CategoryId];
              
              if (!catDef || !catData) return null;

              const status = catData.completed ? 'completed' : (((catData.totalEmission ?? catData.emission) || 0) > 0 ? 'in-progress' : 'pending');
              const statusText = status === 'completed' ? 'Selesai' : (status === 'in-progress' ? 'Diisi' : 'Belum');

              return (
                <Link
                  key={catId}
                  href={`/phases/${resolvedParams.phaseId}/${catId}?tripId=${tripId}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm border border-border hover:shadow-lg transition-all fade-in-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="category-icon bg-primaryLight">
                      {getCategoryIcon(catId)}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-textDark mb-0.5">{catDef.name}</h4>
                      <p className="text-xs text-textMuted mb-1">{catDef.description}</p>
                      <p className="text-xs font-medium text-primary">
                        {formatEmission((catData.totalEmission ?? catData.emission) || 0, 'ton')} Ton CO2e
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`phase-badge ${status}`}>{statusText}</span>
                      <IoChevronForward className="text-xl text-textMuted" />
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
