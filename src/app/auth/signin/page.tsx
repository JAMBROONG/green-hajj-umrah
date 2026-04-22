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

  useEffect(() => {
    // Load debug users on mount - only jemaah
    fetch('/api/debug/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Filter only jemaah users
          const jemaahOnly = data.users.filter((u: any) => u.role === 'jemaah');
          setDebugUsers(jemaahOnly);
        }
      })
      .catch(err => console.error('Debug fetch error:', err));
  }, []);

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
        backgroundImage: "url('/BG Mobile Login.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Logo area — takes upper ~55% of screen */}
      <div className="flex-1 flex flex-col items-center justify-end pb-8">
        <Image
          src="/logo.png"
          alt={APP_NAME}
          width={144}
          height={144}
          className="w-36 h-auto drop-shadow-xl"
        />
        <h1 className="text-2xl font-bold text-white drop-shadow-lg mt-3 tracking-wide">
          {APP_NAME}
        </h1>
        <p className="text-sm text-white/80 mt-1 drop-shadow">Jejak Karbon Perjalanan Ibadahmu</p>
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

        {/* Debug Panel — only in development */}
        {process.env.NODE_ENV !== 'production' && <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            🔧 Debug: {showDebug ? 'Hide' : 'Show'} Users ({debugUsers.length})
          </button>

          {showDebug && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs max-h-80 overflow-y-auto space-y-2">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                {debugUsers.map((user) => (
                  <div key={user.id} className="bg-white p-2 rounded-lg mb-2 last:mb-0">
                    <div className="font-semibold text-gray-900">{user.full_name || 'No Name'}</div>
                    <div className="text-gray-500">📧 {user.email}</div>
                    <button
                      type="button"
                      onClick={() => { setEmail(user.email); setPassword('password'); }}
                      className="mt-1 text-green-600 hover:underline font-medium text-[11px]"
                    >
                      → Login sebagai ini
                    </button>
                  </div>
                ))} 
              </div> 
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}
