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
        <div className="bg-white px-5 py-4 border-b border-border flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-bgMain flex items-center justify-center">
            <IoArrowBack className="text-xl" />
          </Link>
          <h1 className="text-lg font-bold text-textDark">Pasar Karbon IDX</h1>
        </div>

        <div className="p-5">
          {/* Info Card */}
          <div className="bg-primaryLight rounded-xl p-4 mb-5 fade-in-item">
            <h3 className="text-sm font-semibold text-textDark mb-2 flex items-center gap-2">
              <GiPlantSeed className="text-lg text-green-600" /> Offset Jejak Karbon Anda
            </h3>
            <p className="text-xs text-textMuted leading-relaxed mb-3">
              Netralisir emisi CO2e dari perjalanan ibadah Anda dengan membeli kredit karbon terverifikasi dari IDX Carbon.
            </p>
          </div>

          {/* Emission Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border mb-4 fade-in-item hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-textMuted mb-1">Total Emisi</p>
                <p className="text-xl font-bold text-textDark">{totalTon} Ton CO2e</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-textMuted mb-1">Est. Biaya Offset</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(estimatedCost)}</p>
              </div>
            </div>
          </div>

          {/* Products */}
          <h3 className="text-sm font-semibold text-textDark mb-3">Produk IDX Carbon</h3>
          <div className="space-y-3">
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-textMuted">Memuat produk...</p>
              </div>
            ) : products.length > 0 ? (
              products.map((product, index) => {
                const totalPrice = Math.ceil(totalEmission / 1000) * (typeof product.price === 'string' ? parseInt(product.price) : product.price);

                return (
                  <Link
                    key={product.id}
                    href={`/checkout/${product.product_code}`}
                    className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-lg transition-all fade-in-item"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Product Image */}
                    {product.image_url ? (
                      <div
                        className="w-full h-32 bg-gray-200 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${getImageUrl(product.image_url)})`,
                        }}
                      ></div>
                    ) : (
                      <div className="w-full h-32 bg-primaryLight flex items-center justify-center text-3xl">
                        🌱
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${product.color_class || 'bg-gray-100 text-gray-700'}`}>
                              {product.product_code}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-textDark mb-1">
                            {product.name}
                          </h4>
                          <p className="text-xs text-textMuted mb-2">
                            Proyek: {product.project}
                          </p>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div>
                          <p className="text-xs text-textMuted">Harga/tCO2e</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(typeof product.price === 'string' ? parseInt(product.price) : product.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-textMuted">Total (≈{totalTon} tCO2e)</p>
                          <p className="text-sm font-bold text-textDark">{formatCurrency(totalPrice)}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-textMuted">Tidak ada produk tersedia</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
