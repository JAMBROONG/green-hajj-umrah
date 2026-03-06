'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { 
  getGreeting, 
  formatEmission, 
  getProgressPercent,
  getCompletedPhasesCount,
  getTopEmissions,
  formatCurrency
} from '@/lib/utils';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { IoSettings } from 'react-icons/io5';
import { HiLightBulb } from 'react-icons/hi';
import { MdHome, MdFlight, MdMosque, MdPark } from 'react-icons/md';
import { FaKaaba, FaMountain, FaMoon, FaBullseye } from 'react-icons/fa';
import { GiPlantSeed } from 'react-icons/gi';

// Helper function to get phase icon
const getPhaseIcon = (phaseId: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    'pra-keberangkatan': <MdHome className="text-2xl text-teal-600" />,
    'penerbangan-pergi': <MdFlight className="text-2xl text-blue-500" />,
    'madinah': <MdMosque className="text-2xl text-green-600" />,
    'makkah': <FaKaaba className="text-2xl text-gray-900" />,
    'arafah': <FaMountain className="text-2xl text-amber-700" />,
    'muzdalifah': <FaMoon className="text-2xl text-yellow-400" />,
    'mina': <FaBullseye className="text-2xl text-red-600" />,
    'rekreasi': <MdPark className="text-2xl text-green-500" />,
    'pulang': <MdFlight className="text-2xl text-blue-500 rotate-180" />
  };
  return iconMap[phaseId] || <MdHome className="text-2xl text-teal-600" />;
};

export default function Home() {
  const { journey, isLoading, totalEmission } = useHajiJourney();
  const [greeting, setGreeting] = useState('Selamat pagi');

  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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

  const progressPercent = getProgressPercent(journey);
  const completedPhasesCount = getCompletedPhasesCount(journey);
  const topEmissions = getTopEmissions(journey, 3);
  const totalTon = formatEmission(totalEmission, 'ton');
  const estimatedCost = Math.ceil(totalEmission / 1000) * 58800;

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-textMuted mb-0.5">Green Haj & Umrah</p>
              <h1 id="greetingText" className="text-lg font-bold text-textDark">
                {greeting}, Brian Pramudita
              </h1>
            </div>
            <button className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center hover:bg-primary/20 transition-colors">
              <IoSettings className="text-xl text-primary" />
            </button>
          </div>
        </div>

        {/* Total Emisi Summary */}
        <div className="px-5 pt-5">
          <div className="bg-primary rounded-2xl p-5 text-white shadow-lg fade-in-item">
            <p className="text-xs opacity-90 mb-1">Total jejak emisi CO2e</p>
            <h2 className="text-3xl font-bold mb-2 number-display">{totalTon} Ton CO2e</h2>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="text-xs opacity-75 mt-2">Target: 4.0 Ton CO2e</p>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="px-5 pt-5 fade-in-item" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-textDark">Progress Tahapan</h2>
            <span className="text-xs font-medium px-2 py-1 bg-primaryLight text-primary rounded-full">
              {completedPhasesCount}/9 Tahapan
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border hover:shadow-lg transition-all">
            <div id="phaseProgressList" className="space-y-3">
              {PHASE_DEFINITIONS.slice(0, 4).map((phase) => {
                const phaseData = journey.phases[phase.id];
                if (!phaseData) return null;
                
                const phaseEmission = Object.values(phaseData.categories).reduce((sum, cat) => sum + (cat?.emission || 0), 0);
                const status = phaseData.completed ? 'completed' : (phaseEmission > 0 ? 'in-progress' : 'pending');
                const statusText = status === 'completed' ? 'Selesai' : (status === 'in-progress' ? 'Proses' : 'Belum');

                return (
                  <div key={phase.id} className="flex items-center gap-3">
                    {getPhaseIcon(phase.id)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-textDark">{phase.name}</p>
                      <p className="text-xs text-textMuted">{formatEmission(phaseEmission, 'ton')} Ton CO2e</p>
                    </div>
                    <span className={`phase-badge ${status}`}>{statusText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Emisi by Phase */}
        <div className="px-5 pt-5 fade-in-item" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-sm font-semibold text-textDark mb-3">Emisi CO2e Tertinggi</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border hover:shadow-lg transition-all">
            {topEmissions.length === 0 ? (
              <p className="text-sm text-textMuted">Belum ada data emisi</p>
            ) : (
              <div className="space-y-3">
                {topEmissions.map((item, index) => {
                  const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : '🥉');
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xl">{medal}</span>
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-textDark">{item.name}</p>
                        <p className="text-xs text-textMuted">{formatEmission(item.emission, 'ton')} Ton CO2e</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Cards */}
        <div className="px-5 pt-5 space-y-3">
          <Link href="/phases" className="block w-full bg-white rounded-2xl p-4 shadow-sm border border-border hover:shadow-lg transition-all fade-in-item">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primaryLight flex items-center justify-center text-2xl">
                📝
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-textDark mb-0.5">Isi Data Emisi</h3>
                <p className="text-xs text-textMuted">Lengkapi data emisi per tahapan</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>

          <Link href="/carbon-market" className="block w-full bg-white rounded-2xl p-4 shadow-sm border border-border hover:shadow-lg transition-all fade-in-item">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <GiPlantSeed className="text-2xl text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-textDark mb-0.5">Offset Karbon</h3>
                <p className="text-xs text-textMuted">
                  Beli {formatEmission(totalEmission, 'ton')} tCO2e ~ {formatCurrency(estimatedCost)}
                </p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Tips */}
        <div className="px-5 pt-5 pb-5 fade-in-item" style={{ animationDelay: '0.3s' }}>
          <div className="bg-primary rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <HiLightBulb className="text-xl text-yellow-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">Tips Mengurangi Emisi</h3>
                <p className="text-xs opacity-90 leading-relaxed">
                  Gunakan transportasi bersama, bawa botol minum sendiri, dan pilih menu rendah karbon untuk mengurangi jejak emisi Anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

