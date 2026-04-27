'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IoMail, IoArrowBack } from 'react-icons/io5';
import { APP_NAME } from '@/lib/featureFlags';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          website,  // honeypot — server cek field ini harus kosong
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan.');
      } else {
        setSent(true);
        // Navigate to OTP page after short delay
        setTimeout(() => {
          router.push(`/auth/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        }, 1500);
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
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
        <div className="w-20 h-20 rounded-2xl bg-white shadow-2xl flex items-center justify-center p-2.5 ring-1 ring-black/5">
          <Image src="/logo.png" alt={APP_NAME} width={80} height={80} className="w-full h-full object-contain" priority />
        </div>
        <h1 className="text-2xl font-bold text-white drop-shadow-lg mt-5 tracking-tight text-center">
          Lupa Kata Sandi
        </h1>
        <p className="text-sm text-white/85 drop-shadow mt-1 text-center max-w-xs">
          Masukkan email Anda, kami akan mengirimkan kode OTP untuk reset
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10">
        {/* Back link */}
        <Link
          href="/auth/signin"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
        >
          <IoArrowBack /> Kembali ke login
        </Link>

        {sent ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <IoMail className="text-3xl text-green-600" />
            </div>
            <p className="text-gray-800 font-semibold mb-1">Email Terkirim!</p>
            <p className="text-sm text-gray-500">Mengalihkan ke halaman verifikasi OTP...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Alamat Email
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

            {/* Honeypot: user manusia tidak bakal isi (field hidden via CSS).
                Bot scraper biasanya auto-fill semua input → server-side reject.
                aria-hidden + tabIndex=-1 + autoComplete=off supaya screen
                reader & keyboard navigation skip field ini. */}
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              <label htmlFor="website">Leave this field empty</label>
              <input
                id="website"
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary font-bold py-3.5 rounded-xl text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengirim...
                </>
              ) : (
                'Kirim Kode OTP'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
