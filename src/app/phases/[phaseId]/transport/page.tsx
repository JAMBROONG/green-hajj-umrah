'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const { showConfirm } = useDialog();
  const phaseId = params.phaseId as PhaseId;
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
    
    if (transportType === 'airplane') {
      router.push(`/phases/${phaseId}/transport/add-airplane`);
    } else if (transportType === 'ground') {
      router.push(`/phases/${phaseId}/transport/add-ground`);
    } else {
      // 'mixed' - show combined form
      router.push(`/phases/${phaseId}/transport/add`);
    }
  };

  const handleEditClick = (activityId: string) => {
    // Find the activity to determine its type
    const activity = activities.find(a => a.id === activityId);
    const isAirplane = activity && (activity.type === 'pesawat-ekonomi' || activity.type === 'pesawat-bisnis');
    
    // Route to appropriate edit form based on transport type
    const transportType = phase.transportTypes;
    
    if (transportType === 'airplane') {
      router.push(`/phases/${phaseId}/transport/edit-airplane/${activityId}`);
    } else if (transportType === 'ground') {
      router.push(`/phases/${phaseId}/transport/edit-ground/${activityId}`);
    } else {
      // Mixed - route based on actual activity type
      if (isAirplane) {
        router.push(`/phases/${phaseId}/transport/edit-airplane/${activityId}`);
      } else {
        router.push(`/phases/${phaseId}/transport/edit/${activityId}`);
      }
    }
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
    router.push(`/phases/${phaseId}/transport/detail/${activityId}`);
  };

  const handleBackClick = () => {
    router.push(`/phases/${phaseId}`);
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
          {getPhaseTransportIcon()}
          <div>
            <h1 className="text-xl font-bold">{category.name}</h1>
            <p className="text-sm text-white/80">{phase.name}</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white/10 rounded-xl backdrop-blur">
          <p className="text-sm text-white/80">Total Emisi</p>
          <p className="text-2xl font-bold">{formatEmission(totalEmission)}</p>
        </div>
      </div>

      {/* Activity List */}
      <div className="p-6 space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            {getEmptyStateIcon()}
            <p className="text-gray-500 mb-6">Belum ada aktivitas transportasi</p>
            <button
              onClick={handleAddClick}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 flex items-center gap-2 mx-auto"
            >
              <IoAdd className="text-xl" /> Tambah Aktivitas
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
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getTransportIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">
                        {getTransportLabel(activity.type)}
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
                        Jarak: {activity.distance} km
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatEmission(activity.emission)}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap justify-end">
                      <button
                        onClick={() => handleDetailClick(activity.id)}
                        className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                      >
                        <MdInfoOutline /> Detail
                      </button>
                      <span className="text-gray-300">|</span>
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
              <IoAdd className="text-xl" /> Tambah Aktivitas Lainnya
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
