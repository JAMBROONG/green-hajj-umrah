'use client';

import { SessionProvider } from 'next-auth/react';
import { DialogProvider } from '@/contexts/DialogContext';
import PendingPaymentSyncer from '@/components/PendingPaymentSyncer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DialogProvider>
        {/* Global syncer — fire `/api/user/sync-pending-payments` saat user
            authenticated dan tab kembali visible. Update status pending
            (carbon + CSR) tanpa user harus stay di halaman tertentu. */}
        <PendingPaymentSyncer />
        {children}
      </DialogProvider>
    </SessionProvider>
  );
}
