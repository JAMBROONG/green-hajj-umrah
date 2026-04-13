'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS, CATEGORY_DEFINITIONS } from '@/lib/constants';
import { formatEmission } from '@/lib/utils';
import { TransportActivity, PhaseId } from '@/lib/types';
import { FaCar, FaBus, FaTrain, FaPlane, FaShip } from 'react-icons/fa';
import { MdElectricCar } from 'react-icons/md';
import { RiBusFill } from 'react-icons/ri';
import { IoArrowBack, IoAdd, IoCalendarOutline } from 'react-icons/io5';
import { MdEdit, MdDelete, MdInfoOutline } from 'react-icons/md';

export default function TransportListPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showConfirm } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const category = CATEGORY_DEFINITIONS.transport;
  const categoryData = journey?.phases[phaseId]?.categories?.transport;
  const activities = (categoryData?.activities as TransportActivity[]) || [];
  const totalEmission = categoryData?.totalEmission || 0;

  if (!phase) {
    return null;
  }

  const handleAddClick = () => {
    // Route to appropriate form based on phase transport type
    const transportType = phase.transportTypes;
    
    const baseUrl = transportType === 'airplane' 
      ? `/phases/${phaseId}/transport/add-airplane`
      : transportType === 'ground'
      ? `/phases/${phaseId}/transport/add-ground`
      : `/phases/${phaseId}/transport/add`;
    
    const url = tripId ? `${baseUrl}?tripId=${tripId}` : baseUrl;
    router.push(url);
  };

  const handleEditClick = (activityId: string) => {
    // Find the activity to determine its type
    const activity = activities.find(a => a.id === activityId);
    const isAirplane = activity && (activity.type === 'pesawat-ekonomi' || activity.type === 'pesawat-bisnis');
    
    // Route to appropriate edit form based on transport type
    const transportType = phase.transportTypes;
    
    let baseUrl: string;
    if (transportType === 'airplane') {
      baseUrl = `/phases/${phaseId}/transport/edit-airplane/${activityId}`;
    } else if (transportType === 'ground') {
      baseUrl = `/phases/${phaseId}/transport/edit-ground/${activityId}`;
    } else {
      // Mixed - route based on actual activity type
      baseUrl = isAirplane 
        ? `/phases/${phaseId}/transport/edit-airplane/${activityId}`
        : `/phases/${phaseId}/transport/edit/${activityId}`;
    }
    
    const url = tripId ? `${baseUrl}?tripId=${tripId}` : baseUrl;
    router.push(url);
  };

  const handleDeleteClick = (activityId: string) => {
    showConfirm(
      'Apakah Anda yakin ingin menghapus aktivitas ini?',
      () => {
        const updatedActivities = activities.filter(a => a.id !== activityId);
        const totalEmission = updatedActivities.reduce((sum, act) => sum + act.emission, 0);

        updateCategory(phaseId, 'transport', {
          completed: false,
          activities: updatedActivities,
          totalEmission,
          emission: totalEmission
        });
      },
      {
        title: 'Hapus Aktivitas',
        confirmText: 'Hapus',
        cancelText: 'Batal'
      }
    );
  };

  const handleDetailClick = (activityId: string) => {
    const url = tripId ? `/phases/${phaseId}/transport/detail/${activityId}?tripId=${tripId}` : `/phases/${phaseId}/transport/detail/${activityId}`;
    router.push(url);
  };

  const handleBackClick = () => {
    const url = tripId ? `/phases/${phaseId}?tripId=${tripId}` : `/phases/${phaseId}`;
    router.push(url);
  };

  // Get icon based on transport type
  const getPhaseTransportIcon = () => {
    const transportType = phase.transportTypes;
    if (transportType === 'airplane') {
      return <FaPlane className="text-3xl text-blue-400" />;
    } else if (transportType === 'ground') {
      return <FaCar className="text-3xl text-blue-400" />;
    } else {
      // Mixed - show car as default
      return <FaCar className="text-3xl text-blue-400" />;
    }
  };

  const getEmptyStateIcon = () => {
    const transportType = phase.transportTypes;
    if (transportType === 'airplane') {
      return <FaPlane className="text-6xl text-blue-300 mx-auto mb-4" />;
    } else if (transportType === 'ground') {
      return <FaCar className="text-6xl text-blue-300 mx-auto mb-4" />;
    } else {
      // Mixed
      return <FaCar className="text-6xl text-blue-300 mx-auto mb-4" />;
    }
  };

  const getTransportLabel = (type: string) => {
    const labels: Record<string, string> = {
      'mobil': 'Mobil',
      'mobil-listrik': 'Mobil Listrik',
      'bus': 'Bus',
      'bus-listrik': 'Bus Listrik',
      'kapal': 'Kapal',
      'kereta': 'Kereta',
      'pesawat-ekonomi': 'Pesawat Ekonomi',
      'pesawat-bisnis': 'Pesawat Bisnis'
    };
    return labels[type] || type;
  };

  const getTransportIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      'mobil': <FaCar className="text-xl text-blue-600" />,
      'mobil-listrik': <MdElectricCar className="text-xl text-green-600" />,
      'bus': <FaBus className="text-xl text-orange-600" />,
      'bus-listrik': <RiBusFill className="text-xl text-green-600" />,
      'kapal': <FaShip className="text-xl text-cyan-600" />,
      'kereta': <FaTrain className="text-xl text-purple-600" />,
      'pesawat-ekonomi': <FaPlane className="text-xl text-sky-600" />,
      'pesawat-bisnis': <FaPlane className="text-xl text-indigo-600" />
    };
    return icons[type] || <FaCar className="text-xl text-gray-600" />;
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
                {phase.transportTypes === 'airplane'
                  ? <FaPlane className="text-xl text-white/80" />
                  : <FaCar className="text-xl text-white/80" />}
              </div>
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="px-5 py-4 space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                {phase.transportTypes === 'airplane'
                  ? <FaPlane className="text-3xl text-blue-400" />
                  : <FaCar className="text-3xl text-blue-400" />}
              </div>
              <p className="text-gray-700 font-semibold mb-1">Belum Ada Aktivitas Transportasi</p>
              <p className="text-sm text-gray-500 mb-6">Catat perjalanan transportasi Anda selama ibadah</p>
              <button
                onClick={handleAddClick}
                className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
              >
                <IoAdd className="text-xl" /> Tambah Aktivitas
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
                    <div className="w-1.5 bg-blue-500 flex-shrink-0" />
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0 pr-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            {getTransportIcon(activity.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">
                              {getTransportLabel(activity.type)}
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
                              Jarak: <span className="font-medium">{activity.distance} km</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-bold text-primary">{formatEmission(activity.emission)}</p>
                          <p className="text-xs text-gray-500">kg CO₂e</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                        <button
                          onClick={() => handleDetailClick(activity.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition-colors"
                        >
                          <MdInfoOutline /> Detail
                        </button>
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
                <IoAdd className="text-xl" /> Tambah Aktivitas Lainnya
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
