'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * useUserCarbonStats
 *
 * Hook reuse data dari /api/user/stats — sumber tunggal kebenaran (single
 * source of truth) untuk perhitungan emisi & carbon offset jemaah.
 *
 * Profile pakai logic ini untuk tampilkan "Net Carbon Balance" (warna hijau
 * kalau sudah neutral). Carbon-market & checkout HARUS pakai logic yang sama
 * supaya tidak men-suruh user beli kredit yang sebenarnya sudah cukup.
 *
 * Returned values (semua dalam kg CO₂e — kalau perlu ton, divide 1000):
 *   - totalEmittedKg : total emisi semua trip jemaah (dari DB)
 *   - totalOffsetKg  : total kredit karbon yang sudah dibeli & confirmed/completed
 *   - netEmissionKg  : sisa emisi yang BELUM di-offset (tidak negatif — minimum 0)
 *   - rawNetKg       : netEmittedKg - totalOffsetKg (bisa negatif kalau over-offset)
 *   - isNeutral      : true kalau totalOffsetKg >= totalEmittedKg
 *   - isLoading      : sedang fetch
 *   - error          : error dari API
 *   - refetch()      : trigger ulang fetch (mis. setelah purchase baru)
 */
export interface UserCarbonStats {
  totalEmittedKg: number;
  totalOffsetKg: number;
  netEmissionKg: number;
  rawNetKg: number;
  isNeutral: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserCarbonStats(): UserCarbonStats {
  const [totalEmittedKg, setTotalEmittedKg] = useState(0);
  const [totalOffsetKg, setTotalOffsetKg] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/stats', { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 401) {
          // User belum login — keep zeros, tidak error
          setTotalEmittedKg(0);
          setTotalOffsetKg(0);
          return;
        }
        throw new Error(`Failed to fetch stats (HTTP ${res.status})`);
      }
      const data = await res.json();
      setTotalEmittedKg(typeof data.totalCO2Emitted === 'number' ? data.totalCO2Emitted : 0);
      setTotalOffsetKg(typeof data.totalCO2Offset === 'number' ? data.totalCO2Offset : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Re-fetch saat global syncer detect ada update payment (carbon offset bertambah)
  useEffect(() => {
    const handler = () => fetchStats();
    window.addEventListener('pending-payments-synced', handler);
    return () => window.removeEventListener('pending-payments-synced', handler);
  }, [fetchStats]);

  const rawNetKg = totalEmittedKg - totalOffsetKg;
  const netEmissionKg = Math.max(0, rawNetKg);
  const isNeutral = totalEmittedKg > 0 && totalOffsetKg >= totalEmittedKg;

  return {
    totalEmittedKg,
    totalOffsetKg,
    netEmissionKg,
    rawNetKg,
    isNeutral,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
