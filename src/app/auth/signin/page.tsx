'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { IoMail, IoLockClosed, IoEye, IoEyeOff } from 'react-icons/io5';
import { APP_NAME } from '@/lib/featureFlags';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugUsers, setDebugUsers] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [demoLoadingId, setDemoLoadingId] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    if (!isDev) return;
    // Endpoint /api/debug/users sudah filter role='jemaah' + tenant aktif
    // di server-side, jadi tidak perlu filter ulang di client.
    fetch('/api/debug/users')
      .then(res => (res.ok ? res.json() : { success: false }))
      .then(data => {
        if (data.success) setDebugUsers(data.users || []);
      })
      .catch(err => console.error('Debug fetch error:', err));
  }, [isDev]);

  // One-click login sebagai jemaah tertentu (dev only). Memakai provider
  // `demo` di NextAuth yang hanya ter-register saat NODE_ENV=development.
  const handleDemoLogin = async (userId: string) => {
    if (!isDev || demoLoadingId) return;
    setError('');
    setDemoLoadingId(userId);
    try {
      const result = await signIn('demo', { userId, redirect: false });
      if (result?.error) {
        setError('Gagal login sebagai user ini. User mungkin sudah tidak aktif.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Terjadi kesalahan saat demo login.');
    } finally {
      setDemoLoadingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🚀 Attempting login with:', email);

    try {
      // Pre-check: tenant status + IP rate limit
      const tenantCheck = await fetch('/api/auth/check-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then(r => r.json()).catch(() => ({ status: 'ok' }));

      if (tenantCheck.status === 'frozen') {
        setError('Akun Anda dibekukan sementara. Silakan hubungi administrator untuk informasi lebih lanjut.');
        setLoading(false);
        return;
      }

      if (tenantCheck.status === 'rate_limited') {
        setError(tenantCheck.message || 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa menit.');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'TOO_MANY_ATTEMPTS') {
          setError('Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.');
        } else {
          setError('Email atau kata sandi tidak sesuai. Periksa kembali data Anda.');
        }
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      console.error('💥 Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.15) 100%), url('/BG Mobile Login.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Logo + title area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-24 h-24 rounded-2xl bg-white shadow-2xl flex items-center justify-center p-3 ring-1 ring-black/5">
          <Image
            src="/logo-transparent.png"
            alt={APP_NAME}
            width={96}
            height={96}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-white drop-shadow-lg mt-5 tracking-tight text-center">
          {APP_NAME}
        </h1>
        <p className="text-sm text-white/85 drop-shadow mt-1 text-center">
          Jejak Karbon Perjalanan Ibadahmu
        </p>
      </div>

      {/* Form card — bottom sheet style */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <IoMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="nama@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <IoLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <IoEyeOff size={18} /> : <IoEye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary font-bold py-3.5 rounded-xl text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          <Link href="/auth/forgot-password" className="text-primary font-semibold hover:underline">
            Lupa kata sandi?
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
          Dengan masuk, Anda menyetujui{' '}
          <Link href="/legal/terms" className="text-primary underline">Syarat &amp; Ketentuan</Link>
          {' '}dan{' '}
          <Link href="/legal/privacy-policy" className="text-primary underline">Kebijakan Privasi</Link>
          {' '}kami.
        </p>
        
        {isDev && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
            >
              <span className="flex items-center gap-1.5">
                <span>🔧</span>
                <span className="font-semibold uppercase tracking-wider">Quick Login (Dev)</span>
                <span className="text-gray-300">· {debugUsers.length} jemaah</span>
              </span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showDebug ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDebug && (
              <div className="mt-3 max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {debugUsers.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-6">
                    Tidak ada jemaah terdaftar.<br />
                    Pastikan database sudah di-seed.
                  </div>
                ) : (
                  debugUsers.map((user) => {
                    const initials = (user.full_name || user.email || '?')
                      .trim().charAt(0).toUpperCase();
                    const tenantName = user.tenant?.name || '—';
                    const isLoading = demoLoadingId === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleDemoLogin(user.id)}
                        disabled={!!demoLoadingId}
                        className="w-full flex items-center gap-2.5 p-2.5 bg-white border border-gray-200 hover:border-primary/40 hover:bg-primaryLight rounded-xl transition group disabled:opacity-60 disabled:cursor-not-allowed text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primaryDark flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-900 truncate">
                            {user.full_name || '(tanpa nama)'}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate">
                            {user.email}
                          </div>
                          <div className="text-[9px] text-primary font-medium uppercase tracking-wider truncate mt-0.5">
                            {tenantName}
                          </div>
                        </div>
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-primary flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}

                <p className="text-[10px] text-gray-400 text-center pt-2">
                  ⚡ Sekali klik langsung login · hanya jemaah di tenant aktif
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
