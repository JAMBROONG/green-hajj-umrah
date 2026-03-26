'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { getGreeting, formatEmission, formatCurrency } from '@/lib/utils';
import { IoSettings } from 'react-icons/io5';
import { HiLightBulb } from 'react-icons/hi';
import { FaPlus, FaKaaba, FaMosque, FaLeaf, FaCalendarAlt } from 'react-icons/fa';
import { GiPlantSeed } from 'react-icons/gi';

interface Trip {
  id: string;
  name: string;
  type: 'haji' | 'umrah';
  startDate: string;
  endDate: string;
  totalEmission: number;
  status: 'ongoing' | 'completed' | 'cancelled';
}

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('Selamat pagi');
  const userName = session?.user?.name || 'Pengguna';

  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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

  const hasOngoingTrip = trips.some(trip => trip.status === 'ongoing');

  const handleNewTrip = () => {
    if (hasOngoingTrip) return;
    router.push('/journeys/new');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const totalEmission = trips.reduce((sum, trip) => sum + parseFloat(trip.totalEmission.toString()), 0);
  const ongoingTrips = trips.filter(trip => trip.status === 'ongoing');
  const completedTrips = trips.filter(trip => trip.status === 'completed');
  const totalTon = formatEmission(totalEmission, 'ton');
  const estimatedCost = Math.ceil(totalEmission / 1000) * 58800;

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
                {greeting}, {userName}
              </h1>
            </div>
            <button 
              onClick={() => router.push('/settings')}
              className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <IoSettings className="text-xl text-primary" />
            </button>
          </div>
        </div>

        {/* Total Emisi Summary */}
        <div className="px-5 pt-5">
          <div className="bg-primary rounded-2xl p-5 text-white shadow-lg fade-in-item">
            <p className="text-xs opacity-90 mb-1">Total jejak emisi CO2e</p>
            <h2 className="text-3xl font-bold mb-2 number-display">{totalTon} Ton CO2e</h2>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="opacity-75">{trips.length} perjalanan</span>
              <span className="opacity-75">{ongoingTrips.length} berlangsung</span>
            </div>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="px-5 pt-5 fade-in-item" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-textDark">Perjalanan Saya</h2>
            <button
              onClick={handleNewTrip}
              disabled={hasOngoingTrip}
              title={hasOngoingTrip ? 'Selesaikan perjalanan yang sedang berlangsung terlebih dahulu' : ''}
              className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors ${
                hasOngoingTrip
                  ? 'bg-gray-400 text-white opacity-60 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              <FaPlus className="text-xs" />
              <span>Baru</span>
            </button>
          </div>

          {trips.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-border text-center">
              <div className="text-gray-400 mb-3">
                <FaKaaba className="text-4xl mx-auto" />
              </div>
              <h3 className="text-sm font-semibold text-textDark mb-1">
                Belum Ada Perjalanan
              </h3>
              <p className="text-xs text-textMuted mb-4">
                Mulai lacak jejak karbon perjalanan Anda
              </p>
              <button
                onClick={handleNewTrip}
                disabled={hasOngoingTrip}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  hasOngoingTrip
                    ? 'bg-gray-400 text-white opacity-60 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                Buat Perjalanan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.slice(0, 3).map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => router.push(`/journeys/${trip.id}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-border hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {trip.type === 'haji' ? (
                        <FaKaaba className="text-xl text-emerald-600" />
                      ) : (
                        <FaMosque className="text-xl text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-textDark mb-1 truncate">
                        {trip.name}
                      </h3>
                      <div className="flex items-center text-xs text-textMuted mb-2">
                        <FaCalendarAlt className="mr-1" />
                        <span>{formatDate(trip.startDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          trip.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                          trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {trip.status === 'ongoing' ? 'Berlangsung' :
                           trip.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                        </span>
                        <div className="flex items-center text-xs">
                          <FaLeaf className="text-emerald-600 mr-1" />
                          <span className="font-medium text-textDark">
                            {parseFloat(trip.totalEmission.toString()).toFixed(2)} kg CO₂
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {trips.length > 3 && (
                <button
                  onClick={() => router.push('/journeys')}
                  className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Lihat Semua Perjalanan →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="px-5 pt-5 fade-in-item" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-sm font-semibold text-textDark mb-3">Statistik</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-border text-center">
              <div className="text-2xl font-bold text-primary">{trips.length}</div>
              <div className="text-xs text-textMuted mt-1">Total</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-border text-center">
              <div className="text-2xl font-bold text-blue-600">{ongoingTrips.length}</div>
              <div className="text-xs text-textMuted mt-1">Aktif</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-border text-center">
              <div className="text-2xl font-bold text-green-600">{completedTrips.length}</div>
              <div className="text-xs text-textMuted mt-1">Selesai</div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="px-5 pt-5 space-y-3">
          <Link href="/journeys" className="block w-full bg-white rounded-2xl p-4 shadow-sm border border-border hover:shadow-lg transition-all fade-in-item">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primaryLight flex items-center justify-center text-2xl">
                📝
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-textDark mb-0.5">Kelola Perjalanan</h3>
                <p className="text-xs text-textMuted">Lihat dan kelola semua perjalanan</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>

          <Link href="/csr-activities" className="block w-full bg-white rounded-2xl p-4 shadow-sm border border-border hover:shadow-lg transition-all fade-in-item">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <span className="text-2xl">🌱</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-textDark mb-0.5">Kegiatan CSR</h3>
                <p className="text-xs text-textMuted">
                  Kurangi emisi sambil berbuat baik
                </p>
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

