export const HAJJ_STAGES: Record<string, any> = {
  'pra-keberangkatan': { name: 'Pra-Keberangkatan', description: 'Persiapan ibadah sebelum berangkat', order: 1 },
  'keberangkatan': { name: 'Keberangkatan', description: 'Perjalanan menuju tanah suci', order: 2 },
  'madinah': { name: 'Madinah', description: 'Ziarah dan ibadah di Madinah', coords: { lat: 24.5236, lng: 39.5692, radius: 50 }, order: 3 },
  'perjalanan-antar-kota': { name: 'Perjalanan Antar Kota', description: 'Perjalanan dari Madinah menuju Makkah', order: 4 },
  'makkah': { name: 'Makkah', description: 'Tawaf dan ibadah awal di Makkah', coords: { lat: 21.4225, lng: 39.8262, radius: 60 }, order: 5 },
  'arafah': { name: 'Arafah', description: 'Wukuf di Padang Arafah (hari Arafah)', coords: { lat: 21.3589, lng: 39.9819, radius: 40 }, order: 6 },
  'muzdalifah': { name: 'Muzdalifah', description: 'Bermalam dan kumpul di Muzdalifah', coords: { lat: 21.3825, lng: 39.9747, radius: 30 }, order: 7 },
  'mina': { name: 'Mina (Tasyrik)', description: 'Lempar jumrah selama 2-3 hari Tasyrik', coords: { lat: 21.4210, lng: 39.8718, radius: 35 }, order: 8 },
  'rekreasi': { name: 'Perjalanan Tambahan / Rekreasi', description: 'Ziarah tambahan atau istiharah', order: 9 },
  'kepulangan': { name: 'Kepulangan', description: 'Perjalanan pulang ke negara asal', order: 10 }
};

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // Radius bumi dalam km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Jarak dalam km
}

export function detectCountryRegion(latitude: number, longitude: number) {
  if (latitude >= -11 && latitude <= 6 && longitude >= 95 && longitude <= 141) {
    return 'indonesia';
  }
  if (latitude >= 15 && latitude <= 32 && longitude >= 36 && longitude <= 56) {
    return 'saudi_arabia';
  }
  if (latitude >= 10 && latitude <= 40 && longitude >= 30 && longitude <= 70) {
    return 'middle_east';
  }
  return 'other';
}

export function analyzeHajjStage(latitude: number, longitude: number, tripStartDate?: string, tripEndDate?: string) {
  const region = detectCountryRegion(latitude, longitude);
  const now = new Date();
  
  let isBeforeStart = false;
  let isAfterEnd = false;

  if (tripStartDate) {
    const start = new Date(tripStartDate);
    start.setHours(0, 0, 0, 0);
    if (now < start) isBeforeStart = true;
  }

  if (tripEndDate) {
    const end = new Date(tripEndDate);
    end.setHours(23, 59, 59, 999);
    if (now > end) isAfterEnd = true;
  }

  // 1. Kombinasi Lokasi Indonesia + Tanggal
  if (region === 'indonesia') {
    // Jika di Indonesia tapi tanggal sudah lewat masa kepulangan, berarti sudah Pulang.
    if (isAfterEnd) {
      return { key: 'kepulangan', stage: HAJJ_STAGES['kepulangan'], distance: 0, isExact: true, isIndonesia: true };
    }
    // Default jika masih di Indonesia dan belum waktunya / sedang masa awal: Pra-Keberangkatan
    return { key: 'pra-keberangkatan', stage: HAJJ_STAGES['pra-keberangkatan'], distance: 0, isExact: true, isIndonesia: true };
  }

  // 2. Deteksi Titik Koordinat Khusus Ibadah (Di Saudi)
  let closestStage: any = null;
  let closestDistance = Infinity;

  for (const [key, stage] of Object.entries(HAJJ_STAGES)) {
    if (stage.coords) {
      const distance = calculateDistance(latitude, longitude, stage.coords.lat, stage.coords.lng);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestStage = { key, stage, distance };
      }
    }
  }

  // Jika masuk ke radius lokasi spesifik (Makkah, Madinah, dll), abaikan tanggal. Lokasi jadi prioritas!
  if (closestStage && closestDistance <= closestStage.stage.coords.radius) {
    return { ...closestStage, isExact: true };
  }

  // 3. Lokasi Transit Luar Negeri (Bukan Indonesia & Bukan Saudi)
  if (region === 'other' || region === 'middle_east') {
    if (isAfterEnd || (!isBeforeStart && closestDistance > 1000)) {
      return { key: 'kepulangan', stage: HAJJ_STAGES['kepulangan'], distance: 0, isExact: false, isOtherCountry: true };
    }
    return { key: 'keberangkatan', stage: HAJJ_STAGES['keberangkatan'], distance: 0, isExact: false, isOtherCountry: true };
  }

  // 4. Jika di Arab Saudi namun "ngegantung" jauh dari kotak radius tempat ibadah utama
  if (closestStage) {
    if (closestDistance > 200) {
      // Bedakan Kedatangan dan Kepulangan berdasarkan tanggal
      if (isAfterEnd) {
        return { key: 'kepulangan', stage: HAJJ_STAGES['kepulangan'], distance: closestDistance, isExact: false, isTransit: true };
      }
      return { key: 'keberangkatan', stage: HAJJ_STAGES['keberangkatan'], distance: closestDistance, isExact: false, isTransit: true };
    }
    return { ...closestStage, isExact: false };
  }

  return null;
}

export function checkCurrentStageAlert(dialogContext?: any, onRedirectAction?: (phaseId: string) => void, tripStartDate?: string, tripEndDate?: string) {
  const displayAlert = (msg: string, title?: string, isError: boolean = false, phaseId?: string) => {
    if (dialogContext) {
      if (phaseId && onRedirectAction) {
        dialogContext.showConfirm(msg, () => onRedirectAction(phaseId), { 
          title: title || 'Tahapan Anda Saat Ini', 
          type: 'info',
          confirmText: 'Buka Tahapan'
        });
      } else {
        dialogContext.showAlert(msg, { title: title || (isError ? 'Gagal' : 'Lokasi Anda'), type: isError ? 'error' : 'info' });
      }
    } else {
      alert(msg);
    }
  };

  if (!navigator.geolocation) {
    displayAlert('Browser Anda tidak mendukung geolokasi. Silahkan check pengaturan browser/device Anda.', 'Error', true);
    return;
  }

  // Menampilkan state loading jika menggunakan custom alert
  if (dialogContext) {
    dialogContext.showAlert('Sedang mendeteksi lokasi Anda, mohon tunggu sebentar...', { title: 'Mendeteksi Lokasi', type: 'info' });
  }

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const stageAnalysis = analyzeHajjStage(latitude, longitude, tripStartDate, tripEndDate);

      let analysisMessage = `Titik Koordinat: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}\n\n`;

      if (stageAnalysis) {
        const stageName = stageAnalysis.stage.name;
        analysisMessage += `Kemungkinan Kamu sedang berada di tahapan ${stageName}`;
        displayAlert(analysisMessage, 'Tahapan Anda Saat Ini', false, stageAnalysis.key);
      } else {
        analysisMessage += `Sistem tidak dapat menentukan tahapan secara spesifik berdasarkan koordinat ini.`;
        displayAlert(analysisMessage, 'Tahapan Anda Saat Ini', false);
      }
    },
    function (error) {
      let errorMsg = '';
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = 'Anda belum memberikan izin akses lokasi. Silahkan izinkan geolokasi di pengaturan browser Anda dan coba lagi.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMsg = 'GPS atau sensor lokasi perangkat Anda tidak tersedia / mati.';
      } else {
        errorMsg = 'Terjadi kesalahan teknis: ' + error.message;
      }
      displayAlert(errorMsg, 'Gagal Mendeteksi', true);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}
