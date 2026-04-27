import type { NextRequest } from 'next/server';

/**
 * Lightweight bot mitigation tanpa external dep (CAPTCHA).
 *
 * Threat model: bot script yang spam endpoint auth (forgot-password, signup,
 * verify-otp). Goal: tambah cost untuk attacker, tidak menggantikan CAPTCHA
 * sungguhan tapi cukup untuk mitigate trivial scraper.
 *
 * Tiga sinyal:
 *   1. Honeypot field — form di UI menyertakan input hidden bernama
 *      `website`/`phone_alt`. User normal tidak isi (CSS hidden), bot
 *      isi otomatis. Kalau filled → mark sebagai bot.
 *   2. User-Agent — bot generik sering pakai UA seperti `python-requests`,
 *      `curl`, `Go-http-client`, atau kosong.
 *   3. Origin/Referer — request browser legitimate selalu kirim Origin.
 *      Kalau tidak ada Origin pada POST → suspicious.
 *
 * Skor 0-3: 0 = legit, 3 = sangat suspicious. Caller bebas pilih threshold
 * (mis. forgot-password block kalau score ≥ 2).
 */

const KNOWN_BOT_UA = [
  'python-requests',
  'python-urllib',
  'curl/',
  'wget/',
  'go-http-client',
  'okhttp/',
  'java/',
  'apache-httpclient',
  'libwww-perl',
  'httpie/',
  'postmanruntime',
  'insomnia/',
  'axios/',
];

export interface BotSignals {
  score: number;
  reasons: string[];
  isBot: boolean;
}

export interface CheckBotInput {
  request: NextRequest;
  honeypot?: unknown;
  /** Threshold score di atas mana request dianggap bot (default: 2) */
  threshold?: number;
}

export function checkBot({ request, honeypot, threshold = 2 }: CheckBotInput): BotSignals {
  const reasons: string[] = [];
  let score = 0;

  // 1. Honeypot — kalau filled, bot. Bot biasanya isi semua input.
  if (honeypot !== undefined && honeypot !== null && honeypot !== '') {
    score += 3; // Honeypot sangat strong indicator
    reasons.push('honeypot_filled');
  }

  // 2. User-Agent
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  if (!ua) {
    score += 2;
    reasons.push('no_user_agent');
  } else if (KNOWN_BOT_UA.some((b) => ua.includes(b))) {
    score += 2;
    reasons.push('bot_user_agent');
  }

  // 3. Origin / Referer untuk POST
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    if (!origin && !referer) {
      score += 1;
      reasons.push('missing_origin_referer');
    }
  }

  return {
    score,
    reasons,
    isBot: score >= threshold,
  };
}
