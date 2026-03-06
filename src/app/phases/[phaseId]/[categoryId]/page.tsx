'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import Toast from '@/components/Toast';
import TransportForm from '@/components/forms/TransportForm';
import EnergyForm from '@/components/forms/EnergyForm';
import FoodForm from '@/components/forms/FoodForm';
import WasteForm from '@/components/forms/WasteForm';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { PHASE_DEFINITIONS, CATEGORY_DEFINITIONS } from '@/lib/constants';
import { PhaseId, CategoryId, CategoryData } from '@/lib/types';

export default function CategoryInputPage({ 
  params 
}: { 
  params: Promise<{ phaseId: PhaseId; categoryId: CategoryId }> 
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { journey, isLoading, updateCategory } = useHajiJourney();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
  const category = CATEGORY_DEFINITIONS[resolvedParams.categoryId];
  const phaseData = journey.phases[resolvedParams.phaseId];
  
  if (!phase || !category || !phaseData) {
    return (
      <div className="app-container">
        <StatusBar />
        <div className="p-5 text-center">
          <p className="text-textMuted">Data tidak ditemukan</p>
          <Link href="/phases" className="text-primary text-sm underline mt-2 inline-block">
            Kembali ke daftar tahapan
          </Link>
        </div>
      </div>
    );
  }

  const categoryData = phaseData.categories[resolvedParams.categoryId] || {
    completed: false,
    emission: 0,
    totalEmission: 0,
    activities: [],
    details: {}
  };

  const handleSave = (data: CategoryData) => {
    updateCategory(resolvedParams.phaseId, resolvedParams.categoryId, data);
    setToastMessage('Data berhasil disimpan!');
    setShowToast(true);
    
    setTimeout(() => {
      router.push(`/phases/${resolvedParams.phaseId}`);
    }, 1000);
  };

  const renderForm = () => {
    switch (resolvedParams.categoryId) {
      case 'transport':
        return (
          <TransportForm
            phaseId={resolvedParams.phaseId}
            initialData={categoryData}
            onSave={handleSave}
          />
        );
      case 'hotel':
        return <EnergyForm initialData={categoryData} onSave={handleSave} />;
      case 'food':
        return <FoodForm initialData={categoryData} onSave={handleSave} />;
      case 'waste':
        return <WasteForm initialData={categoryData} onSave={handleSave} />;
      default:
        return <p className="text-textMuted">Form tidak tersedia</p>;
    }
  };

  return (
    <div className="app-container">
      <StatusBar />
      
      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border flex items-center gap-3">
          <Link 
            href={`/phases/${resolvedParams.phaseId}`} 
            className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <p className="text-xs text-textMuted">{phase.name}</p>
            <h1 className="text-lg font-bold text-textDark">{category.name}</h1>
          </div>
        </div>

        {/* Form */}
        <div className="p-5">
          {renderForm()}
        </div>
      </div>

      <BottomNav />
      <Toast message={toastMessage} isVisible={showToast} onHide={() => setShowToast(false)} />
    </div>
  );
}
