'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBar from '@/components/StatusBar';
import { getImageUrl } from '@/lib/image-utils';
import Image from 'next/image';
import { IoArrowBack, IoLocationOutline, IoPersonOutline, IoCalendarOutline, IoDocumentTextOutline } from 'react-icons/io5';

interface CarbonProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  location?: string;
  map_url?: string;
  project_owner?: string;
  srn_series?: string;
  vintage?: string;
  is_active: boolean;
  standards: {
    standard: {
      series: string;
      name: string;
    }
  }[];
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [product, setProduct] = useState<CarbonProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch(`/api/carbon-products/${resolvedParams.id}`);
        if (!response.ok) throw new Error('Gagal memuat data proyek');
        
        const data = await response.json();
        setProduct(data);
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    }
    
    loadProduct();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="app-container flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="app-container flex flex-col items-center justify-center min-h-screen p-5 text-center">
        <p className="text-xl font-bold text-red-500 mb-2">Error</p>
        <p className="text-textMuted mb-4">{error || 'Proyek tidak ditemukan'}</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-primary text-white rounded-xl">
          Kembali
        </button>
      </div>
    );
  }

  // Get Map Embed URL safely
  let mapEmbedUrl = null;
  if (product.map_url) {
    if (product.map_url.includes('<iframe')) {
      // Extract src if they accidentally pasted the full iframe HTML
      const match = product.map_url.match(/src="([^"]+)"/);
      mapEmbedUrl = match ? match[1] : null;
    } else if (product.map_url.includes('output=embed') || product.map_url.includes('/maps/embed')) {
      // Already a proper embed URL
      mapEmbedUrl = product.map_url;
    } else if (product.map_url.includes('maps.google.com') || product.map_url.includes('google.com/maps')) {
      // Regular Google Maps link → convert to embeddable URL
      try {
        const url = new URL(product.map_url);
        const q = url.searchParams.get('q') || product.location || '';
        mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
      } catch {
        mapEmbedUrl = null;
      }
    }
  }

  return (
    <div className="app-container bg-bgLight pb-10">
      <StatusBar />
      
      {/* Header Back Button absolute to hover over image */}
      <button 
        onClick={() => router.back()} 
        className="absolute top-4 left-5 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-textDark z-10 shadow-sm"
      >
        <IoArrowBack className="text-xl" />
      </button>

      {/* Hero Image */}
      <div className="w-full h-64 bg-gray-200 relative">
        {product.image_url ? (
          <Image
            src={getImageUrl(product.image_url)}
            alt={product.name}
            fill
            priority
            sizes="430px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primaryLight text-6xl">
            🌿
          </div>
        )}
      </div>

      <div className="p-5 -mt-6 relative z-10">
        {/* Info Card */}
        <div className="bg-white rounded-2xl p-5 shadow-md border border-border mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            {product.standards?.map(({ standard }) => (
              <span key={standard.series} className="px-2 py-1 bg-primaryLight text-primary text-[10px] font-bold rounded-full">
                {standard.series}
              </span>
            ))}
            {product.is_active && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                Aktif
              </span>
            )}
          </div>
          
          <h1 className="text-xl font-bold text-textDark mb-4">{product.name}</h1>

          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4">
            {product.project_owner && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-textMuted flex-shrink-0">
                  <IoPersonOutline className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">Pemilik Proyek</p>
                  <p className="text-sm font-semibold">{product.project_owner}</p>
                </div>
              </div>
            )}
            
            {product.location && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-textMuted flex-shrink-0">
                  <IoLocationOutline className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">Lokasi</p>
                  <p className="text-sm font-semibold">{product.location}</p>
                </div>
              </div>
            )}

            {product.srn_series && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-textMuted flex-shrink-0">
                  <IoDocumentTextOutline className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">Nomor Registrasi (SRN)</p>
                  <p className="text-sm font-semibold">{product.srn_series}</p>
                </div>
              </div>
            )}

            {product.vintage && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-textMuted flex-shrink-0">
                  <IoCalendarOutline className="text-lg" />
                </div>
                <div>
                  <p className="text-[10px] text-textMuted">Tahun Vintage</p>
                  <p className="text-sm font-semibold">{product.vintage}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border mb-6">
          <h2 className="text-sm font-bold text-textDark mb-3">Tentang Proyek Ini</h2>
          <div className="text-sm text-textMuted leading-relaxed whitespace-pre-line">
            {product.description || 'Tidak ada deskripsi rinci untuk proyek ini.'}
          </div>
        </div>

        {/* Map Section */}
        {mapEmbedUrl ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border overflow-hidden">
            <h2 className="text-sm font-bold text-textDark mb-3">Lokasi Proyek</h2>
            <div className="w-full h-48 rounded-xl overflow-hidden bg-gray-100">
              <iframe 
                src={mapEmbedUrl} 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        ) : product.location ? (
          <div className="bg-gray-50 rounded-2xl p-5 border border-dashed border-gray-200 text-center">
             <IoLocationOutline className="text-2xl text-gray-400 mx-auto mb-2" />
             <p className="text-xs text-textMuted">Peta embed spesifik tidak tersedia.<br/>Lokasi terdaftar: <strong>{product.location}</strong></p>
          </div>
        ) : null}

      </div>
    </div>
  );
}
