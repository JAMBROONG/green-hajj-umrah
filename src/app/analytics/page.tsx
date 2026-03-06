'use client';

import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { 
  formatEmission, 
  getProgressPercent,
  getCompletedPhasesCount,
  getCategoryEmissions,
  getTopEmissions,
  getEmissionComparison
} from '@/lib/utils';
import { CATEGORY_DEFINITIONS } from '@/lib/constants';
import { HiLightBulb } from 'react-icons/hi';

export default function AnalyticsPage() {
  const { journey, isLoading, totalEmission } = useHajiJourney();

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

  const completedPhases = getCompletedPhasesCount(journey);
  const progressPercent = getProgressPercent(journey);
  const comparison = getEmissionComparison(journey);
  const categoryEmissions = getCategoryEmissions(journey);
  const phaseEmissions = getTopEmissions(journey, 8);

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-textDark">Analitik Emisi</h1>
        </div>

        <div className="p-5">
          {/* Summary Card */}
          <div className="bg-primary rounded-2xl p-5 text-white mb-5 fade-in-item">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs opacity-75 mb-1">Total Emisi</p>
                <p className="text-lg font-bold">{formatEmission(totalEmission, 'ton')} Ton</p>
              </div>
              <div>
                <p className="text-xs opacity-75 mb-1">Tahapan</p>
                <p className="text-lg font-bold">{completedPhases}/9</p>
              </div>
              <div>
                <p className="text-xs opacity-75 mb-1">Progress</p>
                <p className="text-lg font-bold">{Math.round(progressPercent)}%</p>
              </div>
            </div>
          </div>

          {/* Breakdown by Phase */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border mb-5 fade-in-item">
            <h3 className="text-sm font-semibold text-textDark mb-3">Emisi per Tahapan</h3>
            {phaseEmissions.length === 0 ? (
              <p className="text-sm text-textMuted">Belum ada data emisi</p>
            ) : (
              <div className="space-y-3">
                {phaseEmissions.map((item) => {
                  const maxEmission = Math.max(...phaseEmissions.map(p => p.emission));
                  const widthPercent = (item.emission / maxEmission) * 100;

                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-xs font-medium text-textDark">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-primary">
                          {formatEmission(item.emission, 'ton')} Ton
                        </span>
                      </div>
                      <div className="progress-bar h-2">
                        <div className="progress-fill" style={{ width: `${widthPercent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Breakdown by Category */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border mb-5 fade-in-item">
            <h3 className="text-sm font-semibold text-textDark mb-3">Emisi per Kategori</h3>
            {categoryEmissions.length === 0 ? (
              <p className="text-sm text-textMuted">Belum ada data emisi</p>
            ) : (
              <div className="space-y-3">
                {categoryEmissions.map(([catId, emission]) => {
                  const catDef = CATEGORY_DEFINITIONS[catId as keyof typeof CATEGORY_DEFINITIONS];
                  const maxEmission = Math.max(...categoryEmissions.map(([_, e]) => e));
                  const widthPercent = (emission / maxEmission) * 100;

                  return (
                    <div key={catId}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{catDef.icon}</span>
                          <span className="text-xs font-medium text-textDark">{catDef.name}</span>
                        </div>
                        <span className="text-xs font-bold text-primary">
                          {formatEmission(emission, 'ton')} Ton
                        </span>
                      </div>
                      <div className="progress-bar h-2">
                        <div className="progress-fill" style={{ width: `${widthPercent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comparison */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border fade-in-item">
            <h3 className="text-sm font-semibold text-textDark mb-3">Perbandingan</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-textMuted">Emisi Anda</span>
                <span className="text-sm font-bold text-textDark">
                  {formatEmission(comparison.yourEmission, 'ton')} Ton CO2e
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-textMuted">Rata-rata Jemaah</span>
                <span className="text-sm font-bold text-textDark">
                  {formatEmission(comparison.avgEmission, 'ton')} Ton CO2e
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-textMuted">Selisih</span>
                <span className={`text-sm font-bold ${comparison.isAboveAverage ? 'text-loss' : 'text-gain'}`}>
                  {comparison.isAboveAverage ? '+' : ''}
                  {formatEmission(comparison.difference, 'ton')} Ton CO2e
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-primaryLight rounded-xl p-4 mt-5 fade-in-item">
            <h3 className="text-sm font-semibold text-textDark mb-2 flex items-center gap-2">
              <HiLightBulb className="text-lg text-yellow-500" /> Rekomendasi
            </h3>
            <ul className="text-xs text-textMuted space-y-1.5 leading-relaxed">
              <li>• Gunakan transportasi massal untuk mengurangi emisi perjalanan</li>
              <li>• Pilih hotel dengan sertifikasi ramah lingkungan</li>
              <li>• Kurangi konsumsi daging merah, pilih alternatif rendah karbon</li>
              <li>• Gunakan botol minum dan tas belanja yang dapat dipakai ulang</li>
            </ul>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
