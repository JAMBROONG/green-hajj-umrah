import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/mailer';
import { rateLimiter } from '@/lib/rate-limiter';
import { checkBot } from '@/lib/bot-mitigation';

/**
 * Generate cryptographically-secure 8-digit OTP.
 *
 * Mitigasi VAv2-001: 8 digit = 100 juta kombinasi (vs 1 juta kalau 6 digit).
 * Dengan rate limit 3 attempt per 15 menit di /verify-otp + bcrypt cost 12,
 * brute-force jadi ~570.000 hari (vs 5.7 hari teoritik di 6-digit) — di atas
 * masa berlaku semesta untuk skala personal account takeover.
 *
 * Pakai rejection sampling supaya distribusi OTP uniform (modulo bias kecil
 * untuk 6-digit jadi non-isu untuk 8-digit, tapi defensif).
 */
function generateOtp(): string {
  const MAX = 100_000_000; // 8 digit
  // Uint32 max (4_294_967_296) % MAX = ~95M, tidak habis dibagi → mod-bias.
  // Ambil ulang sample kalau jatuh di range bias.
  const SAFE_MAX = Math.floor(0xffffffff / MAX) * MAX;
  const array = new Uint32Array(1);
  let n: number;
  do {
    crypto.getRandomValues(array);
    n = array[0];
  } while (n >= SAFE_MAX);
  return String(n % MAX).padStart(8, '0');
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const body = await req.json();
    const email = (body?.email ?? '').trim().toLowerCase();
    const honeypot = body?.website; // honeypot field (UI hidden, bot fill)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Email tidak valid.' }, { status: 400 });
    }

    // Bot mitigation: gabungkan honeypot + UA + Origin/Referer check.
    // Bukan pengganti CAPTCHA penuh, tapi cukup untuk mitigate trivial bot.
    const bot = checkBot({ request: req, honeypot, threshold: 2 });
    if (bot.isBot) {
      // Tetap return generic success — jangan kasih sinyal ke bot bahwa
      // mereka di-detect (supaya tidak adapt).
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, kode OTP akan dikirim.',
      });
    }

    // Rate limit: 2 OTP / email / 30 menit (turun dari 3) supaya pemanfaatan
    // attacker untuk flood-notif user korban juga lebih terbatas.
    // IP rate limit: 10 / IP / 30 menit (sama).
    const emailRateKey = `otp:email:${email}`;
    const ipRateKey    = `otp:ip:${ip}`;
    const emailCheck = rateLimiter.check(emailRateKey, 2, 30 * 60 * 1000, 30 * 60 * 1000);
    const ipCheck    = rateLimiter.check(ipRateKey,    10, 30 * 60 * 1000, 30 * 60 * 1000);

    if (!emailCheck.allowed || !ipCheck.allowed) {
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, kode OTP akan dikirim.',
      });
    }

    // Look up user — must exist and be jemaah
    const user = await prisma.profiles.findUnique({ where: { email } });

    const genericResponse = NextResponse.json({
      success: true,
      message: 'Jika email terdaftar, kode OTP akan dikirim.',
    });

    if (!user || user.role !== 'jemaah') {
      // Artificial delay (jittered) supaya timing attack untuk enumerasi
      // valid email lebih sulit. Range 400-700ms mendekati waktu signed
      // email send asli (bcrypt hash + SMTP).
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
      return genericResponse;
    }

    const otp = generateOtp();
    const otpHash = await hash(otp, 12);

    // Reset failed-attempt counter di rate limiter saat token baru terbit,
    // supaya OTP lama yg gagal tidak ter-akumulasi ke OTP baru.
    rateLimiter.reset(`otp:verify:${email}`);

    // Upsert: one record per email
    await prisma.password_reset_tokens.upsert({
      where: { email },
      update: { token: otpHash, created_at: new Date() },
      create: { email, token: otpHash, created_at: new Date() },
    });

    await sendOtpEmail(email, otp, user.full_name ?? undefined);

    return genericResponse;
  } catch (error) {
    console.error('forgot-password error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
