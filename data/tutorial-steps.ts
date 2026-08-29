export interface TutorialStep {
  // Nomor urut langkah tutorial
  stepNumber: number;
  // Judul utama langkah
  title: string;
  // Deskripsi ringkas langkah
  desc: string;
  // Path lokasi gambar petunjuk
  image: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: 1,
    title: 'Deteksi Bahan Makanan dalam Kondisi Utuh',
    desc: 'Arahkan kamera ke sisa makanan. AI akan mengenali jenis dan kondisi bahan secara otomatis.',
    image: '/tutorial/step-1.jpeg',
  },
  {
    stepNumber: 2,
    title: 'Atur Kondisi Bahan',
    desc: 'Tandai apakah bahan masih utuh, kulit, atau busuk. Ini menentukan langkah composting yang tepat.',
    image: '/tutorial/step-2.jpg',
  },
  {
    stepNumber: 3,
    title: 'Ikuti Panduan Kompos',
    desc: 'Dapatkan instruksi langkah demi langkah dari AI Gemini untuk mengolah bahan menjadi kompos berkualitas.',
    image: '/tutorial/step-3.jpg',
  },
];
