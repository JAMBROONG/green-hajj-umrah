'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

/**
 * PendingPaymentSyncer — global background syncer untuk pending payments.
 *
 * Component ini di-mount sekali di Providers (root). Tugasnya: hit endpoint
 * `/api/user/sync-pending-payments` yang akan query Midtrans status API
 * untuk SEMUA pending transaksi user (carbon + CSR), lalu update DB +
 * generate sertifikat kalau ada yang sudah settled.
 *
 * Trigger:
 *   1. Saat session berubah ke 'authenticated' (user login / buka aplikasi)
 *   2. Saat tab kembali visible (user balik dari m-banking / app lain)
 *   3. Throttle: minimal 30 detik antar sync supaya tidak spam endpoint
 *
 * Behaviour:
 *   - Fire-and-forget — error tidak ditampilkan ke user (silent best-effort)
 *   - Pakai sessionStorage untuk dedup antar navigation di tab yang sama
 *   - Kalau ada update, broadcast custom event 'pending-payments-synced' supaya
 *     halaman yang relevant (profile/certificates) bisa refresh data-nya
 *
 * Skenario yang di-handle:
 *   - Jemaah klik bayar → dapat VA → close browser
 *   - Jemaah / orang lain bayar via m-banking
 *   - Jemaah buka app lagi (via shortcut, link, dll)
 *   - Component ini fire → Midtrans status query → 'settlement' detected
 *   - DB update: status 'pending' → 'completed'/'confirmed', cert generated
 *   - Halaman /profile / /certificates auto-refresh via event broadcast
 */

const THROTTLE_MS = 30_000; // minimal 30 detik antar sync

export default function PendingPaymentSyncer() {
  const { status } = useSession();
  const lastSyncAtRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const sync = async () => {
      const now = Date.now();
      if (inFlightRef.current) return;                 // jangan double-fire
      if (now - lastSyncAtRef.current < THROTTLE_MS) return; // throttle

      inFlightRef.current = true;
      lastSyncAtRef.current = now;

      try {
        const res = await fetch('/api/user/sync-pending-payments', {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (!res.ok) return;

        const data = await res.json().catch(() => null);
        if (!data) return;

        // Kalau ada pending yang ter-update, broadcast event supaya halaman
        // /profile, /certificates/[id], /csr-donations/[id] bisa refresh.
        if (Array.isArray(data.updated) && data.updated.length > 0) {
          window.dispatchEvent(
            new CustomEvent('pending-payments-synced', { detail: data.updated })
          );
          // Log informatif (bisa dihapus setelah stabil)
          console.log('[Syncer] Updated pending payments:', data.updated);
        }
      } catch (err) {
        // Silent fail — sync optional, user tidak perlu tahu kalau gagal
        console.warn('[Syncer] sync-pending-payments failed (non-blocking):', err);
      } finally {
        inFlightRef.current = false;
      }
    };

    // 1) Fire saat authenticated detected (mount / login)
    sync();

    // 2) Fire saat tab balik visible — user balik dari m-banking, browser, dll
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 3) Fire saat window kembali fokus (untuk PWA/desktop)
    const handleFocus = () => sync();
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [status]);

  return null;
}
