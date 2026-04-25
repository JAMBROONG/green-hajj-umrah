import { randomBytes } from 'node:crypto';

/**
 * Generate Midtrans order_id yang unik dan tidak predictable.
 *
 * Format: <prefix><timestamp36><random8>
 *   - prefix:    string pendek untuk identifikasi tipe transaksi (mis. CARBON, CSR)
 *   - timestamp: Date.now() di basis-36 (lebih pendek dari basis-10)
 *   - random:    8 char hex random kuat (4 byte = 32 bit entropi)
 *
 * Hasil contoh: CARBON1Z3XK2A89F2C4D81
 *
 * Kenapa tidak pakai cuma `${prefix}${Date.now()}`:
 *   - Predictable: attacker bisa tebak order_id kompetitor berdasarkan
 *     waktu transaksi (recon untuk endpoint debug yang nerima order_id).
 *   - Race condition: dua user checkout di milisecond yang sama → collision.
 *   - Midtrans menolak duplicate order_id, jadi UX-nya jadi error.
 *
 * Length cap: Midtrans order_id max 50 char. Format kita ~25 char, aman.
 */
export function generateOrderId(prefix: string): string {
  const safePrefix = prefix.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12);
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `${safePrefix}${timestamp}${random}`;
}
