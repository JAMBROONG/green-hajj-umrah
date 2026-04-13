import { MetadataRoute } from 'next'
import { APP_NAME, isHajjIncluded } from '@/lib/featureFlags'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: 'Green Umrah',
    description: isHajjIncluded
      ? 'Aplikasi Perhitungan Emisi Ibadah Hajj dan Umrah'
      : 'Aplikasi Perhitungan Emisi Ibadah Umrah',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#10b981',
  }
}
