import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";
import { APP_NAME, isHajjIncluded } from "@/lib/featureFlags";

export const metadata: Metadata = {
  title: `${APP_NAME} - Kalkulator Emisi CO2e`,
  description: isHajjIncluded
    ? "Aplikasi Perhitungan Emisi Ibadah Hajj dan Umrah"
    : "Aplikasi Perhitungan Emisi Ibadah Umrah",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
