'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IoArrowBack, IoShieldCheckmark } from 'react-icons/io5';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setError('Masukkan 6 digit kode OTP.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpString }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kode OTP salah.');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        router.push(
          `/auth/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.resetToken)}`
        );
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      setError('Gagal mengirim ulang. Coba lagi.');
    } finally {
      setResending(false);
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
      {/* Logo area */}
      <div className="flex-1 flex flex-col items-center justify-end pb-8">
        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
          <IoShieldCheckmark className="text-4xl text-white" />
        </div>
        <h1 className="text-xl font-bold text-white drop-shadow-lg">Verifikasi OTP</h1>
        <p className="text-sm text-white/75 mt-1 drop-shadow text-center px-10">
          Kode dikirim ke{' '}
          <span className="font-semibold text-white">{email}</span>
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10">
        <Link
          href="/auth/forgot-password"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
        >
          <IoArrowBack /> Ganti email
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
              Masukkan 6 Digit Kode OTP
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                    border-gray-200 bg-gray-50
                    focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white
                    caret-transparent"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length < 6}
            className="w-full btn-primary font-bold py-3.5 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memverifikasi...
              </>
            ) : (
              'Verifikasi OTP'
            )}
          </button>
        </form>

        <div className="text-center mt-5">
          <p className="text-sm text-gray-500">
            Tidak menerima kode?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="text-primary font-semibold hover:underline disabled:text-gray-400 disabled:no-underline transition-colors"
            >
              {resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : resending ? 'Mengirim...' : 'Kirim ulang'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpContent />
    </Suspense>
  );
}
