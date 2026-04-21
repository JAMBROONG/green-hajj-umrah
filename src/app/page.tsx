'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { getGreeting, formatEmission, formatCurrency } from '@/lib/utils';
import { checkCurrentStageAlert } from '@/lib/geo-stage';
import { HiLightBulb } from 'react-icons/hi';
import { useDialog } from '@/contexts/DialogContext';
import { FaPlus, FaKaaba, FaMosque, FaLeaf, FaCalendarAlt, FaMapMarkerAlt, FaCheckCircle } from 'react-icons/fa';
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
  const dialogContext = useDialog();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('Selamat pagi');
  const [userStats, setUserStats] = useState<{ totalCO2Emitted: number; totalCO2Offset: number } | null>(null);
  const userName = session?.user?.name || 'Pengguna';
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadTrips();
    loadUserStats();

    // Meminta akses lokasi sejak awal halaman beranda dimuat
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => console.log('Lokasi diizinkan:', pos.coords),
        (err) => console.warn('Akses lokasi ditolak atau error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  useEffect(() => {
    // Load avatar if user session is ready
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/profile');
        if (res.ok) {
          const data = await res.json();
          setUserAvatar(data.profile?.metadata?.avatar_url || null);
        }
      } catch (err) {
        console.error('Failed to load avatar:', err);
      }
    };
    
    if (session?.user) {
      fetchProfile();
    }
  }, [session?.user]);

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        setUserStats(await response.json());
      }
    } catch {
      // silently ignore
    }
  };

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
        {/* Hero — bg-home.png covers greeting + summary card, fades to white at bottom */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            backgroundImage: "url('/bg-home.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          {/* Dark overlay top→mid for text legibility */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 55%, rgba(255,255,255,0) 100%)',
            }}
          />
          {/* Fade to white at the bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 0%, #ffffff 100%)' }}
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Greeting */}
            <div className="px-5 pt-10 pb-4 flex justify-between items-start">
              <div>
                <p className="text-xs text-white/80 mb-0.5 drop-shadow">Green Haj &amp; Umrah</p>
                <h1 id="greetingText" className="text-2xl font-bold text-white drop-shadow">
                  {greeting},<br />{userName}
                </h1>
              </div>
              <Link 
                href="/profile?tab=account" 
                className="relative w-12 h-12 rounded-full border-2 border-white/50 bg-white/20 flex flex-shrink-0 items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-white/80 transition-transform active:scale-95 shadow-md mt-1"
                aria-label="Profil Akun"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-lg font-bold drop-shadow-md">
                    {(userName || 'U')[0].toUpperCase()}
                  </span>
                )}
              </Link>
            </div>

            {/* Total Emisi Summary — sits on top of hero bg */}
            <div className="px-5 pb-8 fade-in-item">
              <div
                className="relative rounded-2xl overflow-hidden text-white shadow-xl"
                style={{ backgroundImage: "url('/bg-quote.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                {/* Gold glow overlay — bottom-right */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 60% 60% at 95% 110%, rgba(234,179,8,0.45) 0%, transparent 70%)' }}
                />
                <div className="relative z-10">
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FaLeaf className="text-green-300 text-xs" />
                      <p className="text-xs text-white/80">Total jejak emisi CO2e</p>
                    </div>
                    <h2 className="text-3xl font-bold number-display drop-shadow">{totalTon} Ton CO₂e</h2>
                  </div>
                  <div className="mx-5 border-t border-yellow-400/40" />
                  <div className="px-5 py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <FaMapMarkerAlt className="text-yellow-300 text-xs" />
                      <span className="text-white/90 text-xs">{trips.length} Perjalanan</span>
                    </div>
                    <div className="w-px h-4 bg-yellow-400/50" />
                    <div className="flex items-center gap-1.5">
                      <FaCheckCircle className="text-yellow-300 text-xs" />
                      <span className="text-white/90 text-xs">{ongoingTrips.length} Berlangsung</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carbon Offset Nudge */}
        {userStats && (() => {
          const net = (userStats.totalCO2Emitted || 0) - (userStats.totalCO2Offset || 0);
          const isNeutral = net <= 0;
          return (
            <div className="px-5 pt-4 pb-1 fade-in-item" style={{ animationDelay: '0.08s' }}>
              <div
                className={`rounded-2xl overflow-hidden shadow-md ${
                  isNeutral
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                    : 'bg-gradient-to-br from-orange-500 to-red-500'
                }`}
              >
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-white/80 mb-0.5">
                        {isNeutral ? '🌿 Status Karbon Anda' : '⚠️ Perlu Offset Karbon'}
                      </p>
                      {isNeutral ? (
                        <p className="text-lg font-bold text-white leading-tight">Selamat, Anda sudah Carbon Netral!</p>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-white leading-tight">
                            {(net / 1000).toFixed(2)} <span className="text-base font-normal">ton CO₂e</span>
                          </p>
                          <p className="text-xs text-white/80 mt-0.5">masih perlu dioffset</p>
                        </>
                      )}
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <FaLeaf className="text-white text-lg" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  {!isNeutral && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-white/75 mb-1">
                        <span>Sudah dioffset: {((userStats.totalCO2Offset || 0) / 1000).toFixed(2)} ton</span>
                        <span>Total: {((userStats.totalCO2Emitted || 0) / 1000).toFixed(2)} ton</span>
                      </div>
                      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((userStats.totalCO2Offset || 0) / Math.max(userStats.totalCO2Emitted, 1)) * 100).toFixed(1)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={() => router.push('/carbon-market')}
                  className="w-full flex items-center justify-between px-5 py-3 bg-black/15 hover:bg-black/25 transition-colors"
                >
                  <span className="text-xs font-semibold text-white">
                    {isNeutral ? 'Beli lebih banyak kredit karbon' : 'Beli Carbon Kredit Sekarang'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Phase Progress */}
        <div className="px-5 pt-5 fade-in-item" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-textDark">Perjalanan Saya</h2>
            <button
              onClick={handleNewTrip}
              disabled={hasOngoingTrip}
              title={hasOngoingTrip ? 'Selesaikan perjalanan yang sedang berlangsung terlebih dahulu' : ''}
              className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 transition-all ${
                hasOngoingTrip
                  ? 'bg-gray-400 text-white opacity-60 cursor-not-allowed'
                  : 'text-white'
              }`}
              style={hasOngoingTrip ? {} : { background: 'linear-gradient(135deg, #0a5c42 0%, #1a9668 100%)' }}
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
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                  hasOngoingTrip
                    ? 'bg-gray-400 text-white opacity-60 cursor-not-allowed'
                    : 'text-white'
                }`}
                style={hasOngoingTrip ? {} : { background: 'linear-gradient(135deg, #0a5c42 0%, #1a9668 100%)' }}
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
                            {(parseFloat(trip.totalEmission.toString()) / 1000).toFixed(2)} ton CO₂e
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

        {/* Phase Helper Card */}
        <div className="px-5 pt-6 pb-2 fade-in-item" style={{ animationDelay: '0.2s' }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-5 shadow-sm">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-teal-500/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <span className="text-3xl mb-2">🧭</span>
              <h3 className="text-gray-800 font-bold mb-1">
                Bingung sedang di tahapan mana?
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Biar kami yang bantu arahkan tahapan Anda saat ini.
              </p>
              
              <button 
                onClick={() => {
                  const ongoing = trips.find(t => t.status === 'ongoing');
                  checkCurrentStageAlert(dialogContext, (phaseId) => {
                    if (ongoing) {
                      router.push(`/phases/${phaseId}?tripId=${ongoing.id}`);
                    } else {
                      router.push('/journeys');
                    }
                  }, ongoing?.startDate, ongoing?.endDate);
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all font-semibold"
              >
                Cek Tahapan Saya
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="px-5 pt-5 space-y-3">
          <h2 className="text-sm font-semibold text-textDark mb-1">Fitur Utama</h2>
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
 
      </div>

      <BottomNav />
    </div>
  );
}

