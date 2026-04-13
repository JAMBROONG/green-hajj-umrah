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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <FaArrowLeft className="text-base text-white" />
                </button>
                <div>
                  <h1 className="text-lg font-bold leading-tight">Perjalanan Saya</h1>
                  <p className="text-xs text-white/75">Rekam jejak karbon ibadahmu</p>
                </div>
              </div>
              <button
                onClick={handleNewTrip}
                disabled={hasOngoingTrip}
                title={hasOngoingTrip ? 'Selesaikan perjalanan yang sedang berlangsung terlebih dahulu' : 'Buat perjalanan baru'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                  hasOngoingTrip
                    ? 'bg-white/20 cursor-not-allowed opacity-50'
                    : 'bg-white/30 hover:bg-white/40'
                }`}
              >
                <FaPlus className="text-white text-base" />
              </button>
            </div>

            {/* Stats pill */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="text-center">
                <p className="text-xl font-bold">{trips.length}</p>
                <p className="text-[10px] text-white/75">Total</p>
              </div>
              <div className="w-px h-8 bg-white/25" />
              <div className="text-center">
                <p className="text-xl font-bold">{trips.filter(t => t.status === 'ongoing').length}</p>
                <p className="text-[10px] text-white/75">Berlangsung</p>
              </div>
              <div className="w-px h-8 bg-white/25" />
              <div className="text-center">
                <p className="text-xl font-bold">{trips.filter(t => t.status === 'completed').length}</p>
                <p className="text-[10px] text-white/75">Selesai</p>
              </div>
              <div className="w-px h-8 bg-white/25" />
              <div className="text-center">
                <p className="text-xl font-bold">
                  {(trips.reduce((s, t) => s + parseFloat(t.totalEmission.toString()), 0) / 1000).toFixed(1)}
                </p>
                <p className="text-[10px] text-white/75">Ton CO₂</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {hasOngoingTrip && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm">ℹ️</span>
              </div>
              <p className="text-sm text-blue-800">
                Ada perjalanan yang sedang berlangsung. Selesaikan terlebih dahulu sebelum membuat perjalanan baru.
              </p>
            </div>
          )}

          {trips.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <FaKaaba className="text-4xl text-emerald-400" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">Belum Ada Perjalanan</p>
              <p className="text-sm text-gray-500 mb-6">Mulai lacak jejak karbon perjalanan haji atau umrah Anda</p>
              <button
                onClick={handleNewTrip}
                className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
              >
                <FaPlus /> Buat Perjalanan Baru
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => {
                const statusColor: Record<string, string> = {
                  ongoing: 'bg-blue-500',
                  completed: 'bg-green-500',
                  cancelled: 'bg-gray-400',
                };
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
                const emissionTon = (parseFloat(trip.totalEmission.toString()) / 1000).toFixed(2);

                return (
                  <div
                    key={trip.id}
                    onClick={() => router.push(`/journeys/${trip.id}`)}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className="flex">
                      <div className={`w-1.5 flex-shrink-0 ${statusColor[trip.status] ?? 'bg-gray-400'}`} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                              {trip.type === 'haji'
                                ? <FaKaaba className="text-xl text-emerald-600" />
                                : <FaMosque className="text-xl text-emerald-600" />}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{trip.name}</h3>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                {trip.type}
                              </span>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${statusBg[trip.status]}`}>
                            {statusLabel[trip.status]}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <FaCalendarAlt className="text-gray-400" />
                            <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FaLeaf className="text-emerald-500 text-xs" />
                            <span className="text-xs font-bold text-emerald-600">{emissionTon} ton CO₂</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* New trip button at bottom */}
              {!hasOngoingTrip && (
                <button
                  onClick={handleNewTrip}
                  className="w-full py-4 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <FaPlus /> Buat Perjalanan Baru
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
