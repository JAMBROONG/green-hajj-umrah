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
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleBackClick}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <IoArrowBack className="text-lg text-white" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold leading-tight">{category.name}</h1>
                <p className="text-xs text-white/75 truncate">{phase.name}</p>
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/75 mb-0.5">Total Emisi Karbon</p>
                <p className="text-2xl font-bold">{formatEmission(totalEmission)}</p>
                <p className="text-xs text-white/75">kg CO₂e</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MdRecycling className="text-2xl text-white/80" />
              </div>
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="px-5 py-4 space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <MdRecycling className="text-4xl text-green-400" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">Belum Ada Data Limbah</p>
              <p className="text-sm text-gray-500 mb-6">Catat limbah yang Anda hasilkan selama perjalanan</p>
              <button
                onClick={handleAddClick}
                className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
              >
                <IoAdd className="text-xl" /> Tambah Limbah
              </button>
            </div>
          ) : (
            <>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100"
                >
                  <div className="flex">
                    <div className="w-1.5 bg-green-500 flex-shrink-0" />
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 pr-3">
                          <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">
                            Limbah {getWasteLabel(activity.type)}
                          </h3>
                          {activity.date && (
                            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                              <IoCalendarOutline className="text-gray-400" />
                              {new Date(activity.date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                          <p className="text-xs text-gray-600">
                            Jumlah: <span className="font-medium">{activity.amount} kg</span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-bold text-primary">{formatEmission(activity.emission)}</p>
                          <p className="text-xs text-gray-500">kg CO₂e</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                        <button
                          onClick={() => handleEditClick(activity.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <MdEdit /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(activity.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
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
                className="w-full py-4 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 mt-2"
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
