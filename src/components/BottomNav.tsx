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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 shadow-xl"
      style={{ backgroundImage: "url('/bg-menu.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="max-w-[430px] mx-auto flex justify-around items-stretch">
        <Link
          href="/"
          className={`nav-item flex flex-col items-center gap-1 py-2 px-2 flex-1 transition-all ${isActive('/') && !pathname.includes('/journeys') && !pathname.includes('/carbon-market') && !pathname.includes('/profile') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[10px] whitespace-nowrap">Beranda</span>
        </Link>

        <div className="w-px bg-white/25 my-3" />

        <Link
          href="/journeys"
          className={`nav-item flex flex-col items-center gap-1 py-2 px-2 flex-1 transition-all ${isActive('/journeys') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-[10px] whitespace-nowrap">Perjalanan</span>
        </Link>

        <div className="w-px bg-white/25 my-3" />

        <Link
          href="/carbon-market"
          className={`nav-item flex flex-col items-center gap-1 py-2 px-2 flex-1 transition-all ${isActive('/carbon-market') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12M6 12h12" />
          </svg>
          <span className="text-[10px] whitespace-nowrap">Pasar Karbon</span>
        </Link>

        <div className="w-px bg-white/25 my-3" />

        <Link
          href="/profile"
          className={`nav-item flex flex-col items-center gap-1 py-2 px-2 flex-1 transition-all ${isActive('/profile') ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[10px] whitespace-nowrap">Saya</span>
        </Link>
      </div>
    </nav>
  );
}
