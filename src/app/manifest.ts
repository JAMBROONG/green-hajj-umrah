import { MetadataRoute } from 'next'
import { APP_NAME, isHajjIncluded } from '@/lib/featureFlags'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: 'GreenHajj',
    description: isHajjIncluded
      ? 'Aplikasi Perhitungan Jejak Karbon Perjalanan Ibadah Hajj dan Umrah'
      : 'Aplikasi Perhitungan Jejak Karbon Perjalanan Ibadah Umrah',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#10b981',
    orientation: 'portrait',
    lang: 'id',
    scope: '/',
    categories: ['lifestyle', 'travel'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
