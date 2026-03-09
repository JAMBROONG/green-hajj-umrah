'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PhasesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to journeys page since phases should be accessed through trips
    router.replace('/journeys');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Mengalihkan...</p>
      </div>
    </div>
  );
}

