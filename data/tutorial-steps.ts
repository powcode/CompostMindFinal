export interface TutorialStep {
  // Nomor urut langkah tutorial
  stepNumber: number;
  // Judul utama langkah
  title: string;
  // Deskripsi ringkas langkah
  desc: string;
  // Path lokasi gambar petunjuk
  image: string;
  // Ukuran asli gambar untuk menjaga rasio aspek yang proporsional
  width: number;
  height: number;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    title: 'Deteksi Bahan Makanan dalam Kondisi Utuh',
    desc: 'Letakkan objek secara horizontal atau vertikal tanpa miring dan beri jarak antar objek, lalu dekatkan kamera ke objek seperti contoh agar deteksi akurat. ',
    image: '/tutorial/step-1.jpeg',
    width: 899,
    height: 947,
  },
  {
    stepNumber: 2,
    title: 'Dekeksi Menggunakan Kamera',
    desc: 'Untuk memindai bahan sisa makanan atau bahan organik menggunakan fitur live camera di CompostMind, Anda cukup mengarahkan kamera perangkat ke arah objek dan pastikan posisinya masuk ke dalam area pemindaian, lalu klik tombol hijau di layar untuk memprosesnya.',
    image: '/tutorial/step-2.png',
    width: 727,
    height: 645,
  },
  {
    stepNumber: 3,
    title: 'Deteksi Menggunakan Upload Gambar',
    desc: 'Untuk menggunakan opsi unggah foto pada situs web CompostMind, Anda dapat mengklik tombol Upload, lalu pilih dan unggah gambar sisa makanan atau bahan organik dari perangkat Anda. Setelah gambar berhasil dimuat, klik tombol hijau bertuliskan Deteksi Sekarang untuk memulai proses identifikasi.  ',
    image: '/tutorial/step-3.png',
    width: 727,
    height: 645,
  },
  {
    stepNumber: 4,
    title: 'Periksa bahan yang terdeteksi dan sesuaikan jumlahnya ',
    desc: 'Setelah proses pemindaian live camera selesai, sistem akan menampilkan antarmuka pemeriksaan di mana pengguna dapat melihat jenis objek apa saja yang berhasil terdeteksi beserta jumlahnya. Pada tahap ini, pengguna diberikan kebebasan untuk menyesuaikan atau mengubah jumlah objek yang terdeteksi secara manual jika dirasa belum tepat. Selain itu, terdapat tiga pilihan tombol aksi utama pada bagian bawah layar: tombol Keluar apabila pengguna membatalkan dan tidak ingin menyimpan sesi, tombol Foto Ulang untuk mengulang proses pemindaian dari awal, serta tombol Simpan Sesi jika pengguna ingin melanjutkan proses pengomposan ke tahap berikutnya.   ',
    image: '/tutorial/step-4.png',
    width: 727,
    height: 645,
    
  },
  {
    stepNumber: 5,
    title: 'Sesuaikan Kondisi Bahan di Mode Pre-Composting',
    desc: 'Setelah menekan tombol Simpan Sesi, tampilan aplikasi akan beralih ke halaman penyesuaian kondisi bahan kompos. Pada halaman ini, pengguna diminta untuk memeriksa dan menyesuaikan kondisi fisik dari masing-masing bahan yang telah terdeteksi, dengan pilihan kategori yang tersedia meliputi Kulit (Peel) untuk bagian kulit buah atau sayur, Utuh (Whole) untuk bahan yang masih utuh, serta Busuk (Rotten) untuk bahan yang sudah mulai membusuk. Perlu dicatat bahwa bahan dengan kondisi Utuh (Whole) tidak akan dapat diproses lebih lanjut oleh sistem, sehingga Anda harus memastikan kondisi bahan diubah menjadi Rotten atau Peel agar proses pengomposan dapat dilanjutkan dengan lancar. ',
    image: '/tutorial/step-5.png',
    width: 727,
    height: 645,
  },
  {
    stepNumber: 6,
    title: 'Tanya CompostBot. ',
    desc: 'Anda dapat memanfaatkan fitur CompostBot apabila mengalami kebingungan selama proses pengomposan berlangsung. Pastikan setiap pertanyaan yang diajukan sesuai dengan topik pada sesi yang sedang dikerjakan, karena sistem dirancang untuk tidak merespons topik di luar konteks sesi tersebut.',
    image: '/tutorial/step-6.png',
    width: 727,
    height: 645,
  },
  {
    stepNumber: 7,
    title: 'Ikuti langkah-langkah   ',
    desc: 'Untuk melanjutkan tutorial penggunaan situs web CompostMind, setelah Anda melakukan penyesuaian kondisi bahan, Anda dapat mengikuti langkah-langkah selanjutnya hingga seluruh proses pengomposan selesai. Cukup ikuti instruksi yang tertera di setiap tahapan antarmuka aplikasi secara berurutan sampai sesi pengomposan Anda dinyatakan tuntas. ',
    image: '/tutorial/step-7.png',
    width: 727,
    height: 645,
  },
  {
    stepNumber: 8,
    title: 'Lihat riwayat pengomposan   ',
    desc: 'Anda dapat memantau progres pengomposan yang sedang berjalan atau melanjutkan kembali sesi sebelumnya yang belum diselesaikan sampai tuntas pada bagian Riwayat Sesi. Saat Anda mengklik salah satu daftar riwayat yang ada, sistem akan langsung membuka kembali sesi dari titik terakhir yang sebelumnya dikerjakan. ',
    image: '/tutorial/step-8.png',
    width: 727,
    height: 645,
  },
];
