'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { useDialog } from '@/contexts/DialogContext';
import { PHASE_DEFINITIONS } from '@/lib/constants';
import { formatEmission } from '@/lib/utils';
import { TransportActivity, PhaseId } from '@/lib/types';
import { FaCar, FaBus, FaTrain, FaPlane, FaShip } from 'react-icons/fa';
import { MdElectricCar } from 'react-icons/md';
import { RiBusFill } from 'react-icons/ri';
import { IoArrowBack, IoMapOutline } from 'react-icons/io5';
import { MdEdit, MdDelete } from 'react-icons/md';

export default function TransportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showConfirm } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const activityId = params.activityId as string;
  const tripId = searchParams.get('tripId');
  const { journey, updateCategory } = useHajiJourney();

  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  const categoryData = journey?.phases[phaseId]?.categories?.transport;
  const activities = (categoryData?.activities as TransportActivity[]) || [];
  const activity = activities.find(a => a.id === activityId);

  if (!phase || !activity) {
    return null;
  }

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
      'mobil': <FaCar className="text-3xl text-blue-600" />,
      'mobil-listrik': <MdElectricCar className="text-3xl text-green-600" />,
      'bus': <FaBus className="text-3xl text-orange-600" />,
      'bus-listrik': <RiBusFill className="text-3xl text-green-600" />,
      'kapal': <FaShip className="text-3xl text-cyan-600" />,
      'kereta': <FaTrain className="text-3xl text-purple-600" />,
      'pesawat-ekonomi': <FaPlane className="text-3xl text-sky-600" />,
      'pesawat-bisnis': <FaPlane className="text-3xl text-indigo-600" />
    };
    return icons[type] || <FaCar className="text-3xl text-gray-600" />;
  };

  const handleEditClick = () => {
    const isAirplane = activity.type === 'pesawat-ekonomi' || activity.type === 'pesawat-bisnis';
    
    const baseUrl = isAirplane 
      ? `/phases/${phaseId}/transport/edit-airplane/${activityId}`
      : `/phases/${phaseId}/transport/edit/${activityId}`;
    
    const url = tripId ? `${baseUrl}?tripId=${tripId}` : baseUrl;
    router.push(url);
  };

  const handleDeleteClick = () => {
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

        const url = tripId ? `/phases/${phaseId}/transport?tripId=${tripId}` : `/phases/${phaseId}/transport`;
        router.push(url);
      },
      {
        title: 'Hapus Aktivitas',
        confirmText: 'Hapus',
        cancelText: 'Batal'
      }
    );
  };

  const handleBackClick = () => {
    const tripId = searchParams.get('tripId');
    const url = tripId ? `/phases/${phaseId}/transport?tripId=${tripId}` : `/phases/${phaseId}/transport`;
    router.push(url);
  };

  return (
    <div className="app-container">
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div
          className="text-white shadow-lg"
          style={{ backgroundImage: "url('/bg-menu.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="px-5 pt-5 pb-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBackClick}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <IoArrowBack className="text-base text-white" />
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleEditClick}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  title="Edit"
                >
                  <MdEdit className="text-sm text-white" />
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-9 h-9 rounded-full bg-red-500/40 hover:bg-red-500/60 flex items-center justify-center transition-colors"
                  title="Hapus"
                >
                  <MdDelete className="text-sm text-white" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                {getTransportIcon(activity.type)}
              </div>
              <div>
                <h1 className="text-xl font-bold">Detail Transportasi</h1>
                <p className="text-sm text-white/75">{phase.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Content */}
        <div className="px-5 py-4 space-y-3">
          {/* Transport Type */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="flex">
              <div className="w-1.5 bg-blue-500 flex-shrink-0" />
              <div className="flex-1 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  {getTransportIcon(activity.type)}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Jenis Transportasi</p>
                  <p className="font-bold text-gray-900">{getTransportLabel(activity.type)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Date */}
          {activity.date && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="flex">
                <div className="w-1.5 bg-purple-400 flex-shrink-0" />
                <div className="flex-1 p-4">
                  <p className="text-xs text-gray-400 mb-0.5">Tanggal</p>
                  <p className="font-bold text-gray-900">
                    {new Date(activity.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Route */}
          {(activity.origin || activity.destination) && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="flex">
                <div className="w-1.5 bg-teal-500 flex-shrink-0" />
                <div className="flex-1 p-4 space-y-3">
                  {activity.origin && (
                    <div className="flex items-start gap-2">
                      <IoMapOutline className="text-lg text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Dari</p>
                        <p className="font-semibold text-gray-900 text-sm">{activity.origin.name}</p>
                      </div>
                    </div>
                  )}
                  {activity.origin && activity.destination && <div className="border-t border-gray-100" />}
                  {activity.destination && (
                    <div className="flex items-start gap-2">
                      <IoMapOutline className="text-lg text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Menuju</p>
                        <p className="font-semibold text-gray-900 text-sm">{activity.destination.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Distance */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="flex">
              <div className="w-1.5 bg-orange-400 flex-shrink-0" />
              <div className="flex-1 p-4">
                <p className="text-xs text-gray-400 mb-0.5">Jarak Perjalanan</p>
                <p className="font-bold text-gray-900">{activity.distance} km</p>
              </div>
            </div>
          </div>

          {/* Emission */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="flex">
              <div className="w-1.5 bg-green-500 flex-shrink-0" />
              <div className="flex-1 p-4">
                <p className="text-xs text-gray-400 mb-1">Total Emisi CO₂e</p>
                <p className="text-2xl font-bold text-primary">{formatEmission(activity.emission)}</p>
                <p className="text-xs text-gray-400 mt-0.5">kg CO₂e</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
