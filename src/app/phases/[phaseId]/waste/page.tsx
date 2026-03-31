'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS, CATEGORY_DEFINITIONS } from '@/lib/constants';
import { formatEmission } from '@/lib/utils';
import { WasteActivity, PhaseId } from '@/lib/types';
import { IoArrowBack, IoAdd, IoCalendarOutline } from 'react-icons/io5';
import { MdRecycling, MdEdit, MdDelete } from 'react-icons/md';

export default function WasteListPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showConfirm } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const category = CATEGORY_DEFINITIONS.waste;
  const categoryData = journey?.phases[phaseId]?.categories?.waste;
  const activities = (categoryData?.activities as WasteActivity[]) || [];
  const totalEmission = categoryData?.totalEmission || 0;

  if (!phase) {
    return null;
  }

  const handleAddClick = () => {
    const url = tripId ? `/phases/${phaseId}/waste/add?tripId=${tripId}` : `/phases/${phaseId}/waste/add`;
    router.push(url);
  };

  const handleEditClick = (activityId: string) => {
    const url = tripId ? `/phases/${phaseId}/waste/edit/${activityId}?tripId=${tripId}` : `/phases/${phaseId}/waste/edit/${activityId}`;
    router.push(url);
  };

  const handleDeleteClick = (activityId: string) => {
    showConfirm(
      'Apakah Anda yakin ingin menghapus data limbah ini?',
      () => {
        const updatedActivities = activities.filter(a => a.id !== activityId);
        const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

        updateCategory(phaseId, 'waste', {
          completed: false,
          activities: updatedActivities,
          totalEmission,
          emission: totalEmission
        });
      },
      {
        title: 'Hapus Data Limbah',
        confirmText: 'Hapus',
        cancelText: 'Batal'
      }
    );
  };

  const handleBackClick = () => {
    const url = tripId ? `/phases/${phaseId}?tripId=${tripId}` : `/phases/${phaseId}`;
    router.push(url);
  };

  const getWasteLabel = (type: string) => {
    const legacyLabels: Record<string, string> = {
      plastic: 'Plastik',
      organic: 'Organik',
      other: 'Lainnya',
      'Food and Drink': 'Makanan dan Minuman'
    };

    return legacyLabels[type] || type;
  };

  return (
    <div className="app-container">
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-white pb-24">
      {/* Header */}
      <div className="bg-primary text-white p-6 rounded-b-3xl shadow-lg">
        <button
          onClick={handleBackClick}
          className="mb-4 text-white/80 hover:text-white flex items-center gap-2"
        >
          <IoArrowBack className="text-xl" /> Kembali
        </button>
        <div className="flex items-center gap-3 mb-2">
          <MdRecycling className="text-3xl text-green-400" />
          <div>
            <h1 className="text-xl font-bold">{category.name}</h1>
            <p className="text-sm text-white/80">{phase.name}</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white/10 rounded-xl backdrop-blur">
          <p className="text-sm text-white/80">Total Emisi</p>
          <p className="text-2xl font-bold">{formatEmission(totalEmission)} kg co2e</p>
        </div>
      </div>

      {/* Activity List */}
      <div className="p-6 space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <MdRecycling className="text-6xl text-green-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">Belum ada data limbah</p>
            <button
              onClick={handleAddClick}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 flex items-center gap-2 mx-auto"
            >
              <IoAdd className="text-xl" /> Tambah Limbah
            </button>
          </div>
        ) : (
          <>
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      Limbah {getWasteLabel(activity.type)}
                    </h3>
                    {activity.date && (
                      <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                        <IoCalendarOutline /> {new Date(activity.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      Jumlah: {activity.amount} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatEmission(activity.emission)} kg co2e
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleEditClick(activity.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <MdEdit /> Edit
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleDeleteClick(activity.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                      >
                        <MdDelete /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add Button */}
            <button
              onClick={handleAddClick}
              className="w-full py-4 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
            >
              <IoAdd className="text-xl" /> Tambah Limbah Lainnya
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
