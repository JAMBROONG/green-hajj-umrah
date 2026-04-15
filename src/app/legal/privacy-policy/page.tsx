import Link from 'next/link';
import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/featureFlags';

export const metadata: Metadata = {
  title: `Kebijakan Privasi — ${APP_NAME}`,
};

export default function PrivacyPolicyPage() {
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
          <h1 className="text-base font-bold text-gray-800">Kebijakan Privasi</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 pb-16 space-y-6 text-sm text-gray-700 leading-relaxed">
        <div className="bg-emerald-50 rounded-xl p-4 text-xs text-emerald-700">
          <strong>Terakhir diperbarui:</strong> April 2026 &nbsp;·&nbsp;
          <strong>Berlaku untuk:</strong> Aplikasi {APP_NAME}
        </div>

        <p>
          BATS Consulting (&quot;kami&quot;, &quot;milik kami&quot;) mengoperasikan aplikasi
          <strong> {APP_NAME}</strong> sebagai layanan perhitungan jejak karbon perjalanan
          ibadah haji dan umrah. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan,
          dan melindungi informasi pribadi Anda.
        </p>

        {/* Section 1 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">1. Informasi yang Kami Kumpulkan</h2>

          <h3 className="font-semibold text-gray-800 mb-1">a. Data Akun</h3>
          <ul className="list-disc list-inside space-y-1 mb-3 text-gray-600">
            <li>Nama lengkap</li>
            <li>Alamat email (digunakan sebagai identifikasi unik)</li>
            <li>Kata sandi (disimpan dalam bentuk terenkripsi menggunakan bcrypt, tidak pernah dibaca oleh kami)</li>
            <li>Nomor telepon (opsional, disimpan di metadata akun)</li>
            <li>Organisasi/perusahaan pengelola perjalanan yang menaungi Anda</li>
          </ul>

          <h3 className="font-semibold text-gray-800 mb-1">b. Data Perjalanan Ibadah</h3>
          <p className="mb-2 text-gray-600">Informasi yang Anda masukkan secara aktif untuk menghitung jejak karbon:</p>
          <ul className="list-disc list-inside space-y-1 mb-3 text-gray-600">
            <li>Transportasi: jenis kendaraan, rute, estimasi jarak</li>
            <li>Akomodasi: nama hotel, kategori, durasi menginap</li>
            <li>Konsumsi makanan: jenis dan jumlah porsi</li>
            <li>Pengelolaan limbah: estimasi volume sampah</li>
            <li>Total emisi CO₂e per tahapan dan kategori perjalanan</li>
            <li>Tanggal mulai dan selesai perjalanan</li>
          </ul>

          <h3 className="font-semibold text-gray-800 mb-1">c. Data Transaksi</h3>
          <ul className="list-disc list-inside space-y-1 mb-3 text-gray-600">
            <li>Pembelian kredit karbon: produk, jumlah unit, total harga, referensi transaksi</li>
            <li>Donasi CSR: jumlah donasi, metode pembayaran, referensi transaksi</li>
            <li>Status pembayaran dan URL sertifikat yang diterbitkan</li>
          </ul>

          <h3 className="font-semibold text-gray-800 mb-1">d. Data Teknis (Otomatis)</h3>
          <ul className="list-disc list-inside space-y-1 mb-3 text-gray-600">
            <li>Alamat IP perangkat saat login</li>
            <li>Informasi browser/aplikasi (user agent)</li>
            <li>Waktu aktivitas terakhir</li>
          </ul>

          <h3 className="font-semibold text-gray-800 mb-1">e. Penyimpanan Lokal Perangkat</h3>
          <p className="text-gray-600">
            Aplikasi menggunakan <em>localStorage</em> di perangkat Anda untuk menyimpan sementara
            data perjalanan yang sedang diisi. Data ini tidak dikirim ke server sampai Anda menyimpannya,
            dan dapat dihapus dengan menghapus data aplikasi di perangkat Anda.
          </p>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">2. Bagaimana Kami Menggunakan Informasi Anda</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Menyediakan layanan kalkulator emisi karbon perjalanan ibadah</li>
            <li>Memverifikasi identitas pengguna dan mengelola sesi login</li>
            <li>Menghitung dan menyimpan estimasi jejak karbon perjalanan Anda</li>
            <li>Memproses pembayaran kredit karbon dan donasi CSR melalui Midtrans</li>
            <li>Menerbitkan dan mengirimkan sertifikat karbon dalam format PDF</li>
            <li>Mengirimkan kode OTP dan tautan reset kata sandi melalui email</li>
            <li>Memberikan laporan emisi kepada perusahaan pengelola perjalanan Anda</li>
            <li>Meningkatkan kualitas dan performa aplikasi</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">3. Layanan Pihak Ketiga</h2>
          <p className="mb-3 text-gray-600">Kami menggunakan layanan pihak ketiga berikut:</p>

          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-800">Midtrans (Pembayaran)</p>
              <p className="text-gray-600 text-xs mt-1">
                Memproses pembayaran kredit karbon dan donasi CSR. Data transaksi dikirimkan ke
                Midtrans sesuai standar PCI-DSS. Kebijakan privasi Midtrans berlaku untuk data transaksi Anda.
                <br />
                <a href="https://midtrans.com/privacy-policy" target="_blank" rel="noopener noreferrer"
                  className="text-emerald-600 underline">midtrans.com/privacy-policy</a>
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-800">OpenStreetMap &amp; Nominatim (Pencarian Lokasi)</p>
              <p className="text-gray-600 text-xs mt-1">
                Digunakan untuk pencarian nama bandara dan lokasi. Permintaan pencarian dikirimkan
                ke server OpenStreetMap tanpa informasi identitas Anda.
                <br />
                <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer"
                  className="text-emerald-600 underline">osmfoundation.org</a>
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-800">OSRM (Kalkulasi Rute)</p>
              <p className="text-gray-600 text-xs mt-1">
                Menghitung estimasi jarak perjalanan darat. Data yang dikirimkan hanya titik koordinat
                asal dan tujuan, tanpa informasi identitas.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-800">Gmail (Pengiriman Email)</p>
              <p className="text-gray-600 text-xs mt-1">
                Digunakan untuk mengirimkan email OTP dan tautan reset kata sandi. Kami tidak
                menyimpan isi email setelah pengiriman.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">4. Berbagi Data</h2>
          <p className="text-gray-600">
            Kami <strong>tidak menjual</strong> data pribadi Anda kepada pihak ketiga. Data Anda
            dapat dibagikan kepada:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-600">
            <li>Perusahaan pengelola perjalanan yang menaungi akun Anda (laporan emisi aggregat)</li>
            <li>Penyedia layanan pihak ketiga yang disebutkan di atas, sebatas untuk kebutuhan operasional</li>
            <li>Pihak berwenang jika diwajibkan oleh hukum yang berlaku di Indonesia</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">5. Keamanan Data</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Kata sandi disimpan menggunakan enkripsi bcrypt (tidak dapat dibaca oleh kami)</li>
            <li>Seluruh komunikasi data menggunakan HTTPS/TLS</li>
            <li>Akses ke data pengguna dibatasi berdasarkan peran (role-based access control)</li>
            <li>Token autentikasi menggunakan standar JWT</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">6. Retensi Data</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Data akun aktif disimpan selama akun masih aktif</li>
            <li>Setelah penghapusan akun, data dihapus dalam waktu 30 hari</li>
            <li>Data transaksi dapat disimpan lebih lama sesuai kewajiban perpajakan dan hukum Indonesia</li>
            <li>Log teknis (IP, user agent) disimpan selama sesi berlangsung</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">7. Hak Anda atas Data</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>Akses:</strong> Anda dapat melihat data profil di halaman Profil</li>
            <li><strong>Koreksi:</strong> Perbarui nama dan informasi akun melalui menu Edit Profil</li>
            <li><strong>Penghapusan:</strong> Hapus akun dan seluruh data melalui menu Pengaturan &rarr; Hapus Akun</li>
            <li><strong>Pertanyaan lebih lanjut:</strong> Hubungi kami di alamat email di bawah ini</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">8. Anak-anak</h2>
          <p className="text-gray-600">
            Aplikasi ini ditujukan untuk jemaah haji dan umrah yang merupakan orang dewasa.
            Kami tidak secara sengaja mengumpulkan data dari anak-anak di bawah 17 tahun.
            Jika Anda mengetahui bahwa anak di bawah umur telah mendaftarkan akun,
            segera hubungi kami untuk penghapusan data.
          </p>
        </section>

        {/* Section 9 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">9. Perubahan Kebijakan</h2>
          <p className="text-gray-600">
            Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan material
            akan diberitahukan melalui aplikasi. Penggunaan berkelanjutan setelah pemberitahuan
            dianggap sebagai persetujuan terhadap perubahan.
          </p>
        </section>

        {/* Section 10 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">10. Kontak</h2>
          <p className="text-gray-600">
            Untuk pertanyaan terkait privasi atau permintaan data, hubungi kami di:
          </p>
          <div className="bg-emerald-50 rounded-xl p-4 mt-2">
            <p className="font-semibold text-gray-800">BATS Consulting</p>
            <p className="text-gray-600 text-xs mt-1">Email: privacy@bats-consulting.com</p>
            <p className="text-gray-600 text-xs">Website: https://bats-consulting.com</p>
          </div>
        </section>

        <div className="pt-4 border-t border-gray-100 text-center">
          <Link href="/legal/terms" className="text-emerald-600 text-xs underline">
            Baca Syarat &amp; Ketentuan
          </Link>
        </div>
      </div>
    </div>
  );
}
