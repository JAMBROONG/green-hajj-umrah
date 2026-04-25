/**
 * Safe logger — log non-sensitive info di semua environment, tetapi
 * sembunyikan payload detail di production.
 *
 * Kenapa perlu:
 *   - `console.log(payload)` mencetak full request body / Midtrans response
 *     ke stdout. Di production, log ini terkumpul di log aggregator
 *     (CloudWatch, Logtail, Sentry) dan bisa terekspos saat audit / breach.
 *   - PII (email, nama, phone, transaction_id) tidak boleh tertulis di log
 *     produksi tanpa dasar legal.
 *
 * Penggunaan:
 *   import { devLog, devError, devWarn } from '@/lib/safe-logger'
 *
 *   devLog('Midtrans payload', payload)  // hanya tampil di NODE_ENV !== 'production'
 *
 *   // Untuk error yang harus tetap kelihatan di production, pakai console.error
 *   // langsung tapi tanpa data payload — cukup error.message + context tanpa PII.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

export function devLog(...args: unknown[]): void {
  if (!IS_PROD) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]): void {
  if (!IS_PROD) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

export function devError(...args: unknown[]): void {
  if (!IS_PROD) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}

/**
 * Mask string sensitif untuk audit log produksi.
 * Cocok untuk email, phone, transaction_id, dll.
 */
export function maskSensitive(value: string | null | undefined, keepStart = 2, keepEnd = 2): string {
  if (!value) return '';
  if (value.length <= keepStart + keepEnd) return '***';
  return value.slice(0, keepStart) + '***' + value.slice(-keepEnd);
}
