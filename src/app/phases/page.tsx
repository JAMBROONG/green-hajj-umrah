'use client';

import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { formatEmission } from '@/lib/utils';
import { PhaseId } from '@/lib/types';
import { MdHome, MdFlight, MdMosque, MdPark } from 'react-icons/md';
import { FaKaaba, FaMountain, FaMoon, FaBullseye } from 'react-icons/fa';
import { IoArrowBack, IoChevronForward } from 'react-icons/io5';

function getPhaseIcon(phaseId: string) {
  switch (phaseId) {
    case 'pra-keberangkatan': return <MdHome className="text-3xl text-teal-600" />;
    case 'penerbangan-pergi': return <MdFlight className="text-3xl text-blue-500" />;
    case 'madinah': return <MdMosque className="text-3xl text-green-600" />;
    case 'makkah': return <FaKaaba className="text-3xl text-gray-900" />;
    case 'arafah': return <FaMountain className="text-3xl text-amber-700" />;
    case 'muzdalifah': return <FaMoon className="text-3xl text-yellow-400" />;
    case 'mina': return <FaBullseye className="text-3xl text-red-600" />;
    case 'rekreasi': return <MdPark className="text-3xl text-green-500" />;
    case 'pulang': return <MdFlight className="text-3xl text-blue-500 rotate-180" />;
    default: return <MdHome className="text-3xl text-teal-600" />;
  }
}

export default function PhasesPage() {
  const { journey, isLoading } = useHajiJourney();

  if (isLoading) {
    return (
      <div className="app-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-textMuted">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!journey || !journey.phases) {
    return (
      <div className="app-container flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-textMuted">Data perjalanan tidak tersedia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center">
            <IoArrowBack className="text-xl" />
          </Link>
          <h1 className="text-lg font-bold text-textDark">Tahapan Perjalanan Haji</h1>
        </div>

        {/* Info Card */}
        <div className="p-5">
          <div className="bg-primaryLight rounded-xl p-4 mb-5">
            <p className="text-sm text-textDark leading-relaxed">
              Lengkapi data emisi untuk setiap tahapan perjalanan ibadah Anda. Data ini akan membantu menghitung total jejak karbon.
            </p>
          </div>

          {/* Phase List */}
          <div className="space-y-3">
            {PHASE_DEFINITIONS.map((phase, index) => {
              const phaseData = journey?.phases?.[phase.id as PhaseId];
              if (!phaseData || !phaseData.categories) return null;

              const phaseEmission = Object.values(phaseData.categories).reduce(
                (sum, cat) => sum + (cat?.emission || cat?.totalEmission || 0), 
                0
              );
              
              const completedCategories = phase.categories.filter(
                cat => phaseData.categories[cat]?.completed
              ).length;
              const totalCategories = phase.categories.length;
              const status = phaseData.completed ? 'completed' : (phaseEmission > 0 ? 'in-progress' : '');

              return (
                <Link
                  key={phase.id}
                  href={`/phases/${phase.id}`}
                  className={`block phase-card bg-white rounded-2xl p-4 border-2 border-border ${status} fade-in-item`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-primaryLight flex items-center justify-center flex-shrink-0">
                      {getPhaseIcon(phase.id)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-textDark mb-1">{phase.name}</h3>
                      <p className="text-xs text-textMuted mb-2">{phase.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-primary">
                          {formatEmission(phaseEmission, 'ton')} Ton CO2e
                        </span>
                        <span className="text-xs text-textMuted">
                          {completedCategories}/{totalCategories} kategori
                        </span>
                      </div>
                    </div>
                    <IoChevronForward className="text-xl text-textMuted" />
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
