'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { formatEmission, formatCurrency } from '@/lib/utils';
import { IoArrowBack } from 'react-icons/io5';
import { GiPlantSeed } from 'react-icons/gi';

interface CarbonProductStandard {
  id: string;
  series: string;
  name: string;
  vintage: string;
  price: string | number;
  is_active: boolean;
}

export default function CarbonMarketPage() {
  const { journey, isLoading, totalEmission } = useHajiJourney();
  const [standards, setStandards] = useState<CarbonProductStandard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandards = async () => {
      try {
        const response = await fetch('/api/carbon-product-standards');
        if (response.ok) {
          const data = await response.json();
          setStandards(data);
        }
      } catch (error) {
        console.error('Error fetching carbon standards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStandards();
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

  const totalTon = formatEmission(totalEmission, 'ton');
  const estimatedCost = Math.ceil(totalEmission / 1000) * 58800; // Will be dynamic per standard

  return (
    <div className="app-container">
      <StatusBar />

      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center hover:bg-primary/10 transition-colors">
              <IoArrowBack className="text-xl text-primary" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-textDark">Pasar Karbon IDX</h1>
              <p className="text-xs text-textMuted">Pilih Standar Produk Karbon</p>
            </div>
          </div>
        </div>

        <div className="px-5 pt-5 pb-6">
          {/* Emission Summary Banner */}
          <div className="bg-primary rounded-2xl p-4 mb-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <GiPlantSeed className="text-lg opacity-80" />
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Total Emisi Perjalanan</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold leading-none mb-0.5">{totalTon}</p>
                <p className="text-xs opacity-70">tCO2e perlu dioffset</p>
              </div>
            </div>
          </div>

          {/* Products */}
          <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">Daftar Standar Karbon</p>

          {loading ? (
            <div className="pt-10 text-center">
              <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-textMuted">Memuat standar...</p>
            </div>
          ) : standards.length === 0 ? (
            <div className="pt-10 text-center">
              <p className="text-3xl mb-3">🌿</p>
              <p className="text-sm font-semibold text-textDark mb-1">Belum ada standar</p>
              <p className="text-xs text-textMuted">Standar produk karbon belum tersedia saat ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {standards.map((standard) => {
                const priceNum = typeof standard.price === 'string' ? parseFloat(standard.price) : standard.price;
                const totalPrice = Math.ceil(totalEmission / 1000) * priceNum;

                return (
                  <Link key={standard.id} href={`/checkout/${standard.series}`}>
                    <div className="bg-white rounded-2xl border border-border p-4 flex flex-col active:scale-[0.98] transition-transform mt-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2.5 py-1 rounded-full bg-primaryLight text-primary text-[10px] font-bold">
                          {standard.series}
                        </span>
                        <span className="text-[10px] text-textMuted px-2 py-1 bg-gray-50 rounded-full border border-gray-100">
                          Vintage: {standard.vintage}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-semibold text-textDark mb-3">
                        {standard.name}
                      </h4>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div>
                          <p className="text-[10px] text-textMuted mb-0.5">Harga per tCO2e</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(priceNum)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-textMuted mb-0.5">Estimasi {totalTon} t</p>
                          <p className="text-sm font-bold text-textDark">{formatCurrency(totalPrice)}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
