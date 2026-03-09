'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-border z-50 shadow-lg">
      <div className="max-w-[430px] mx-auto px-5 py-2 flex justify-around">
        <Link 
          href="/" 
          className={`nav-item flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all ${isActive('/') && !pathname.includes('/phases') && !pathname.includes('/journeys') && !pathname.includes('/carbon-market') && !pathname.includes('/analytics') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-xs">Beranda</span>
        </Link>

        <Link 
          href="/journeys" 
          className={`nav-item flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all ${isActive('/journeys') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-xs">Perjalanan</span>
        </Link>

        <Link 
          href="/phases" 
          className={`nav-item flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all ${isActive('/phases') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10H3M21 6H3M21 14H3M21 18H3" />
          </svg>
          <span className="text-xs">Tahapan</span>
        </Link>

        <Link 
          href="/carbon-market" 
          className={`nav-item flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all ${isActive('/carbon-market') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12M6 12h12" />
          </svg>
          <span className="text-xs">Pasar Karbon</span>
        </Link>

        <Link 
          href="/analytics" 
          className={`nav-item flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all ${isActive('/analytics') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
          <span className="text-xs">Analitik</span>
        </Link>
      </div>
    </nav>
  );
}
