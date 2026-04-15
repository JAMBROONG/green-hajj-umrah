import Link from 'next/link';
import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/featureFlags';

export const metadata: Metadata = {
  title: `Syarat & Ketentuan — ${APP_NAME}`,
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link href="/settings" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-800">Syarat &amp; Ketentuan</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 pb-16 space-y-6 text-sm text-gray-700 leading-relaxed">
        <div className="bg-emerald-50 rounded-xl p-4 text-xs text-emerald-700">
          <strong>Terakhir diperbarui:</strong> April 2026 &nbsp;·&nbsp;
          <strong>Versi:</strong> 1.0
        </div>

        <p>
          Selamat datang di <strong>{APP_NAME}</strong>, layanan yang disediakan oleh
          <strong> BATS Consulting</strong>. Dengan mengakses atau menggunakan aplikasi ini, Anda
          menyatakan telah membaca, memahami, dan menyetujui Syarat &amp; Ketentuan ini secara
          menyeluruh.
        </p>

        {/* Section 1 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Deskripsi Layanan</h2>
          <p className="text-gray-600">
            {APP_NAME} adalah aplikasi berbasis web yang memungkinkan jemaah haji dan umrah
            untuk menghitung estimasi jejak karbon perjalanan ibadah mereka, memantau konsumsi energi
            selama perjalanan, serta mengambil tindakan nyata melalui pembelian kredit karbon dan
            partisipasi dalam program CSR (Corporate Social Responsibility).
          </p>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">2. Kelayakan Pengguna</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Anda harus berusia minimal 17 tahun untuk menggunakan aplikasi ini</li>
            <li>Akun Anda dibuat dan dikelola oleh perusahaan penyelenggara perjalanan haji/umrah yang terdaftar</li>
            <li>Anda bertanggung jawab menjaga kerahasiaan kata sandi akun Anda</li>
            <li>Satu akun hanya boleh digunakan oleh satu orang</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. Pengelolaan Akun</h2>
          <p className="text-gray-600">
            Akun Anda terkait dengan perusahaan pengelola perjalanan (tenant) yang mendaftarkan Anda.
            Perusahaan pengelola memiliki wewenang untuk menonaktifkan akun Anda jika terdapat
            pelanggaran atau berakhirnya kerja sama. Kami tidak bertanggung jawab atas tindakan
            pengelolaan akun yang dilakukan oleh perusahaan pengelola perjalanan Anda.
          </p>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">4. Produk Kredit Karbon</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              Kredit karbon yang tersedia merupakan produk dari Pasar Karbon Indonesia (IDX Carbon)
              dan merupakan aset lingkungan nyata yang terverifikasi
            </li>
            <li>
              Kredit karbon <strong>bukan merupakan instrumen investasi finansial</strong> dan nilainya
              tidak dijamin akan meningkat
            </li>
            <li>
              Setelah pembayaran dikonfirmasi, sertifikat karbon diterbitkan dan tidak dapat dibatalkan
            </li>
            <li>
              Harga tercantum dalam Rupiah Indonesia (IDR) dan sudah termasuk biaya layanan
            </li>
            <li>
              Kami tidak menerima pengembalian dana untuk kredit karbon yang telah dikonfirmasi,
              kecuali terdapat kesalahan teknis dari pihak kami yang dapat dibuktikan
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">5. Donasi CSR</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              Donasi CSR bersifat <strong>sukarela</strong> dan merupakan kontribusi Anda terhadap
              program sosial dan lingkungan yang dikelola oleh perusahaan pengelola perjalanan
            </li>
            <li>Dana donasi disalurkan langsung ke program CSR yang bersangkutan</li>
            <li>
              Donasi yang telah dikonfirmasi <strong>tidak dapat dikembalikan</strong>
            </li>
            <li>Anda akan menerima sertifikat partisipasi digital setelah donasi dikonfirmasi</li>
            <li>
              Donasi ini bukan produk keuangan dan tidak memberikan keuntungan finansial kepada donatur
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">6. Pembayaran</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Pembayaran diproses melalui <strong>Midtrans</strong>, penyedia layanan pembayaran terpercaya</li>
            <li>Kami menerima berbagai metode pembayaran sesuai yang tersedia di Midtrans</li>
            <li>Transaksi yang gagal atau dibatalkan tidak akan mendebet rekening Anda</li>
            <li>Bukti transaksi tersimpan di dalam aplikasi dan dapat diakses pada halaman sertifikat</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">7. Estimasi Emisi &amp; Disclaimer</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs mb-2">
            Penting untuk dipahami bahwa seluruh angka emisi yang ditampilkan dalam aplikasi ini
            adalah <strong>estimasi</strong>, bukan pengukuran aktual.
          </div>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              Perhitungan menggunakan faktor emisi standar yang bersumber dari data ilmiah yang
              diakui, namun nilai sebenarnya dapat berbeda berdasarkan kondisi aktual perjalanan
            </li>
            <li>
              Kami tidak menjamin keakuratan mutlak dari hasil perhitungan emisi
            </li>
            <li>
              Aplikasi ini berfungsi sebagai alat edukasi dan estimasi, bukan sebagai instrumen
              audit emisi resmi
            </li>
          </ul>
        </section>

        {/* Section 8 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">8. Larangan Penggunaan</h2>
          <p className="text-gray-600 mb-2">Anda dilarang untuk:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Memasukkan data palsu atau menyesatkan ke dalam sistem</li>
            <li>Menggunakan aplikasi untuk tujuan komersial tanpa izin tertulis dari kami</li>
            <li>Mencoba mengakses data pengguna lain atau melanggar keamanan sistem</li>
            <li>Mereproduksi, mendistribusikan, atau memodifikasi konten aplikasi tanpa izin</li>
            <li>Menggunakan aplikasi dengan cara yang melanggar hukum yang berlaku di Indonesia</li>
          </ul>
        </section>

        {/* Section 9 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">9. Kekayaan Intelektual</h2>
          <p className="text-gray-600">
            Seluruh konten, desain, logo, dan teknologi dalam aplikasi ini merupakan milik
            BATS Consulting dan dilindungi oleh hukum hak cipta Indonesia. Tidak ada lisensi atau
            hak yang diberikan kepada Anda untuk menggunakan kekayaan intelektual kami di luar
            penggunaan normal aplikasi.
          </p>
        </section>

        {/* Section 10 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">10. Batasan Tanggung Jawab</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Kami tidak bertanggung jawab atas kerugian yang timbul akibat ketidakakuratan estimasi emisi</li>
            <li>Kami tidak menjamin ketersediaan layanan secara terus-menerus tanpa gangguan</li>
            <li>
              Tanggung jawab kami terbatas pada nilai transaksi yang dilakukan dalam aplikasi ini
            </li>
            <li>
              Kami tidak bertanggung jawab atas tindakan perusahaan pengelola perjalanan terkait
              pengelolaan akun jemaah
            </li>
          </ul>
        </section>

        {/* Section 11 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">11. Penghentian Layanan</h2>
          <p className="text-gray-600">
            Kami berhak untuk menangguhkan atau menghentikan akses Anda ke aplikasi jika Anda
            melanggar Syarat &amp; Ketentuan ini. Penghentian tidak menghilangkan kewajiban Anda
            yang telah timbul sebelumnya.
          </p>
        </section>

        {/* Section 12 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">12. Perubahan Syarat</h2>
          <p className="text-gray-600">
            Kami dapat memperbarui Syarat &amp; Ketentuan ini sewaktu-waktu. Pengguna akan
            diberitahukan melalui aplikasi. Penggunaan berkelanjutan setelah pemberitahuan dianggap
            sebagai persetujuan terhadap perubahan.
          </p>
        </section>

        {/* Section 13 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">13. Hukum yang Berlaku</h2>
          <p className="text-gray-600">
            Syarat &amp; Ketentuan ini tunduk pada dan ditafsirkan sesuai dengan hukum Republik
            Indonesia. Setiap sengketa diselesaikan melalui musyawarah mufakat, atau jika tidak
            tercapai, melalui Pengadilan Negeri yang berwenang di Indonesia.
          </p>
        </section>

        {/* Section 14 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">14. Kontak</h2>
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="font-semibold text-gray-800">BATS Consulting</p>
            <p className="text-gray-600 text-xs mt-1">Email: legal@bats-consulting.com</p>
            <p className="text-gray-600 text-xs">Website: https://bats-consulting.com</p>
          </div>
        </section>

        <div className="pt-4 border-t border-gray-100 text-center">
          <Link href="/legal/privacy-policy" className="text-emerald-600 text-xs underline">
            Baca Kebijakan Privasi
          </Link>
        </div>
      </div>
    </div>
  );
}
