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
import { MdEdit, MdDelete, MdInfoOutline } from 'react-icons/md';

export default function TransportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showConfirm } = useDialog();
  const phaseId = params.phaseId as PhaseId;
  const activityId = params.activityId as string;
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
    
    if (isAirplane) {
      router.push(`/phases/${phaseId}/transport/edit-airplane/${activityId}`);
    } else {
      router.push(`/phases/${phaseId}/transport/edit/${activityId}`);
    }
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

        router.push(`/phases/${phaseId}/transport`);
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
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-white pb-24">
        {/* Header */}
        <div className="bg-primary text-white p-6 rounded-b-3xl shadow-lg">
          <button
            onClick={handleBackClick}
            className="mb-4 text-white/80 hover:text-white flex items-center gap-2"
          >
            <IoArrowBack className="text-xl" /> Kembali
          </button>
          <div className="flex items-center gap-3">
            {getTransportIcon(activity.type)}
            <div>
              <h1 className="text-xl font-bold">Detail Transportasi</h1>
              <p className="text-sm text-white/80">{phase.name}</p>
            </div>
          </div>
        </div>

        {/* Detail Content */}
        <div className="p-6 space-y-4">
          {/* Transport Type Card */}
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl">
                {getTransportIcon(activity.type)}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Jenis Transportasi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getTransportLabel(activity.type)}
                </p>
              </div>
            </div>
          </div>

          {/* Date Card */}
          {activity.date && (
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-2">Tanggal</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(activity.date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Distance Card */}
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 mb-2">Jarak Perjalanan</p>
            <p className="text-lg font-semibold text-gray-900">
              {activity.distance} km
            </p>
          </div>

          {/* Origin Card */}
          {activity.origin && (
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <IoMapOutline className="text-xl text-green-600 mt-1 shrink-0" />
                <div>
                  <p className="text-sm text-gray-500 mb-1">Asal</p>
                  <p className="text-base font-semibold text-gray-900">
                    {activity.origin.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Lat: {activity.origin.lat.toFixed(4)}, Lon: {activity.origin.lon.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Destination Card */}
          {activity.destination && (
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <IoMapOutline className="text-xl text-red-600 mt-1 shrink-0" />
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tujuan</p>
                  <p className="text-base font-semibold text-gray-900">
                    {activity.destination.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Lat: {activity.destination.lat.toFixed(4)}, Lon: {activity.destination.lon.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Emission Card */}
          <div className="bg-linear-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MdInfoOutline className="text-2xl text-green-600" />
              <p className="text-sm text-green-700 font-semibold">Total Emisi CO₂e</p>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatEmission(activity.emission)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleEditClick}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
            >
              <MdEdit className="text-xl" /> Edit
            </button>
            <button
              onClick={handleDeleteClick}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
            >
              <MdDelete className="text-xl" /> Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
