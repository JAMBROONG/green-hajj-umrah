"use client";

import { FaHeadset } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function FloatingHelpdesk() {
  const { data: session } = useSession();
  const [tenantPhone, setTenantPhone] = useState<string | null>(null);

  useEffect(() => {
    // Ambil nomor telpon secara fresh dari API (agar tidak perlu logout-login jika data admin/tenant di-update)
    const fetchTenantInfo = async () => {
      if (!session?.user?.tenantId) return;

      try {
        const res = await fetch(`/api/tenants/${session.user.tenantId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.tenant?.phone) {
            setTenantPhone(data.tenant.phone);
            return;
          }
        }
      } catch (err) {
        console.error("Gagal mengambil info tenant bantuan:", err);
      }

      // Fallback ke data session jika fetch DB gagal & properti phone ada di session
      const phoneFromSession = (session.user as any).tenant?.phone;
      if (phoneFromSession) setTenantPhone(phoneFromSession);
    };

    fetchTenantInfo();
  }, [session]);

  // Jangan tampilkan jika tidak ada user yang login
  if (!session?.user) return null;

  const handleClick = () => {
    if (!tenantPhone) {
      alert("Maaf, nomor telepon bantuan untuk travel ini belum tersedia.");
      return;
    }

    // Format nomor telepon ke format WhatsApp (ganti 0 di depan dengan 62 dan hapus simbol)
    let formattedPhone = tenantPhone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.substring(1);
    }

    // Buka WhatsApp di tab baru
    const waUrl = `https://wa.me/${formattedPhone}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform hover:scale-110 hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-300"
      aria-label="Bantuan dan Bantuan Pelanggan"
    >
      <FaHeadset className="h-5 w-5" />
    </button>
  );
}
