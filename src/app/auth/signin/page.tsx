'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IoMail, IoLockClosed, IoEye, IoEyeOff } from 'react-icons/io5';

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
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('📥 Sign in result:', result);

      if (result?.error) {
        setError('Anda tidak memiliki izin akses aplikasi ini. Hanya jemaah yang dapat menggunakan aplikasi ini.');
        console.error('❌ Login failed:', result.error);
      } else {
        console.log('✅ Login successful, redirecting...');
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
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Green Hajj & Umrah
          </h1>
          <p className="text-gray-600">Masuk ke akun Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <IoMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="nama@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <IoLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* Debug Panel */}
        <div className="mt-6 border-t pt-6">
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            🔧 Debug: {showDebug ? 'Hide' : 'Show'} Users ({debugUsers.length})
          </button>

          {showDebug && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs max-h-96 overflow-y-auto">
              <div className="font-semibold mb-3 text-gray-900">Database Users:</div>
              {/* Jemaah Section Only */}
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="font-bold text-green-900 mb-2">
                  🕌 JEMAAH (User/Jamaah)
                </div>
                <div className="text-xs text-green-700 mb-3 italic">
                  Hanya jemaah yang dapat login di aplikasi ini
                </div>
                {debugUsers.map((user) => (
                  <div key={user.id} className="bg-white p-2 rounded mb-2 last:mb-0">
                    <div className="font-medium text-gray-900">
                      {user.full_name || 'No Name'}
                    </div>
                    <div className="text-gray-600">📧 {user.email}</div>
                    <div className="text-gray-500 text-[10px]">
                      Company: {user.tenant_id?.substring(0, 8)}...
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(user.email);
                        setPassword('password');
                      }}
                      className="mt-1 text-green-600 hover:underline font-medium"
                    >
                      → Login sebagai Jemaah ini
                    </button>
                  </div>
                ))}
              </div>

              <div className="text-center text-gray-500 text-[10px] pt-2 border-t">
                Password semua akun: <span className="font-mono bg-gray-200 px-1 rounded">password</span>
              </div>

              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                <div className="text-[10px] text-yellow-800">
                  ⚠️ <strong>Admin</strong> dan <strong>Company</strong> tidak bisa login di aplikasi ini.
                  <br />Gunakan aplikasi Admin Panel untuk role tersebut.

                  <div className="text-center text-gray-500 text-[10px] pt-2 border-t">
                    All passwords: <span className="font-mono bg-gray-200 px-1 rounded">password</span>
                  </div>
                </div>
              </div> 
            </div>
          )}
        </div>
      </div>
    </div>  
  );
}
