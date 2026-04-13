'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';
import { useHajiJourney } from '@/hooks/useHajiJourney';
import { formatEmission, formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-utils';
import { IoArrowBack } from 'react-icons/io5';
import { GiPlantSeed } from 'react-icons/gi';

interface CarbonProduct {
  id: string;
  product_code: string;
  name: string;
  description?: string;
  price: number | string;
  project: string;
  category?: string;
  image_url?: string;
  color_class?: string;
  is_active: boolean;
}

export default function CarbonMarketPage() {
  const { journey, isLoading, totalEmission } = useHajiJourney();
  const [products, setProducts] = useState<CarbonProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/carbon-products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Error fetching carbon products:', error);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

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

  const totalTon = formatEmission(totalEmission, 'ton');
  const estimatedCost = Math.ceil(totalEmission / 1000) * 58800;

  return (
    <div className="app-container">
      <StatusBar />

      <div className="page pb-24">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-border shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center hover:bg-primary/10 transition-colors">
              <IoArrowBack className="text-xl text-primary" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-textDark">Pasar Karbon IDX</h1>
              <p className="text-xs text-textMuted">Offset jejak karbon ibadah Anda</p>
            </div>
          </div>
        </div>

        <div className="px-5 pt-5 pb-6">
          {/* Emission Summary Banner */}
          <div className="bg-primary rounded-2xl p-4 mb-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <GiPlantSeed className="text-lg opacity-80" />
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">Total Emisi Perjalanan</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold leading-none mb-0.5">{totalTon}</p>
                <p className="text-xs opacity-70">tCO2e perlu dioffset</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70 mb-0.5">Estimasi biaya</p>
                <p className="text-lg font-bold">{formatCurrency(estimatedCost)}</p>
              </div>
            </div>
          </div>

          {/* Products */}
          <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">Pilih Produk IDX Carbon</p>

          {productsLoading ? (
            <div className="pt-10 text-center">
              <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-textMuted">Memuat produk...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="pt-10 text-center">
              <p className="text-3xl mb-3">🌿</p>
              <p className="text-sm font-semibold text-textDark mb-1">Belum ada produk</p>
              <p className="text-xs text-textMuted">Produk karbon belum tersedia saat ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const priceNum = typeof product.price === 'string' ? parseInt(product.price) : product.price;
                const totalPrice = Math.ceil(totalEmission / 1000) * priceNum;

                return (
                  <Link key={product.id} href={`/checkout/${product.product_code}`}>
                    <div className="bg-white rounded-2xl border border-border overflow-hidden flex active:scale-[0.98] transition-transform mt-3">
                      {/* Thumbnail */}
                      <div className="w-[108px] flex-none self-stretch relative bg-primaryLight overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-4xl">
                            🌱
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                        {/* Badge */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold leading-tight ${product.color_class || 'bg-primaryLight text-primary'}`}>
                            {product.product_code}
                          </span>
                          {product.category && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-textMuted leading-tight">
                              {product.category}
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <h4 className="text-sm font-semibold text-textDark leading-snug line-clamp-2 mb-1">
                          {product.name}
                        </h4>

                        {/* Project */}
                        <p className="text-[11px] text-textMuted line-clamp-1 mb-2">
                          🏭 {product.project}
                        </p>

                        {/* Price row */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-textMuted">Per tCO2e</p>
                            <p className="text-xs font-bold text-primary">{formatCurrency(priceNum)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-textMuted">Total ≈{totalTon} t</p>
                            <p className="text-xs font-bold text-textDark">{formatCurrency(totalPrice)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
