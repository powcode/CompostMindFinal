import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL_NAME = "gemini-3.5-flash-lite";

const model = genAI.getGenerativeModel({ 
  model: MODEL_NAME,
  generationConfig: {
    responseMimeType: "application/json",
  }
});

/**
 * FUNGSI SAKTI: Ekstrak JSON dari teks Gemini (Defense in Depth)
 */
function extractJsonFromString(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (jsonMatch && jsonMatch[0]) {
      try {
        console.log("⚠️ Gemini memberi teks tambahan. Berhasil diekstrak via Regex.");
        return JSON.parse(jsonMatch[0]);
      } catch {
        console.error("❌ Regex menemukan kurung siku, tapi isi dalamnya bukan JSON valid:", jsonMatch[0]);
        throw new Error("Format JSON di dalam markdown tidak valid.");
      }
    }

    console.error(" Teks asli dari Gemini tidak mengandung JSON Array:", text);
    throw new Error("Gemini tidak mengembalikan format Array JSON.");
  }
}

export interface ReferenceItem {
  title: string;
  url: string;
  source: string;
}

export const VERIFIED_GENERAL_REFERENCES: ReferenceItem[] = [
  {
    title: 'Composting At Home Guide',
    url: 'https://www.epa.gov/recycle/composting-home',
    source: 'U.S. Environmental Protection Agency'
  },
  {
    title: 'Home Composting & Organic Recycling Guide',
    url: 'https://www.rhs.org.uk/soil-composts-mulches/composting',
    source: 'Royal Horticultural Society'
  },
  {
    title: 'Panduan Pengelolaan Sampah Organik Nasional',
    url: 'https://sampahnasional.kemenlh.go.id',
    source: 'Kementerian Lingkungan Hidup RI'
  },
  {
    title: 'Pusat Edukasi & Pengurangan Sampah Organik 3R',
    url: 'https://info3r.kemenlh.go.id',
    source: 'Direktorat Pengurangan Sampah KLH'
  },
  {
    title: 'Cornell Composting Science & Management',
    url: 'http://compost.css.cornell.edu/',
    source: 'Cornell University'
  },
  {
    title: 'Panduan Pemanfaatan Pupuk Organik & Kompos',
    url: 'https://www.pertanian.go.id/',
    source: 'Kementerian Pertanian Republik Indonesia'
  }
];

function sanitizeReference(item: Record<string, unknown>, fallbackIndex = 0): ReferenceItem {
  const rawUrl = String(item.url ?? '').trim();
  const rawTitle = String(item.title ?? 'Panduan Kompos Terverifikasi').trim();
  const rawSource = String(item.source ?? 'Lembaga Pengomposan Terpercaya').trim();

  // Deteksi domain lama / link rusak yang sering 404
  if (
    !rawUrl ||
    rawUrl === '#' ||
    !rawUrl.startsWith('http') ||
    rawUrl.includes('menlhk.go.id') ||
    rawUrl.includes('/single_post/') ||
    rawUrl.includes('learningstore.extension')
  ) {
    const fallback = VERIFIED_GENERAL_REFERENCES[fallbackIndex % VERIFIED_GENERAL_REFERENCES.length];
    return {
      title: rawTitle && !rawTitle.includes('KLHK') ? rawTitle : fallback.title,
      url: fallback.url,
      source: fallback.source
    };
  }

  return {
    title: rawTitle,
    url: rawUrl,
    source: rawSource
  };
}

export function normalizeReferenceList(value: unknown): ReferenceItem[] {
  let parsed: ReferenceItem[] = [];

  if (Array.isArray(value)) {
    parsed = value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, idx) => sanitizeReference(item, idx));
  } else if (typeof value === 'string') {
    try {
      parsed = normalizeReferenceList(JSON.parse(value));
    } catch {
      parsed = [];
    }
  } else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.reference)) parsed = normalizeReferenceList(record.reference);
    else if (Array.isArray(record.references)) parsed = normalizeReferenceList(record.references);
  }

  // Deduplikasi berdasarkan URL
  const seenUrls = new Set<string>();
  const uniqueList: ReferenceItem[] = [];
  for (const item of parsed) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      uniqueList.push(item);
    }
  }

  // Jika referensi kurang dari 2 atau kosong, lengkapi otomatis dari bank referensi umum terverifikasi
  if (uniqueList.length < 2) {
    for (const fallback of VERIFIED_GENERAL_REFERENCES) {
      if (!seenUrls.has(fallback.url)) {
        seenUrls.add(fallback.url);
        uniqueList.push(fallback);
      }
      if (uniqueList.length >= 2) break;
    }
  }

  return uniqueList;
}

/**
 * Fungsi untuk generate step-by-step tutorial kompos
 */
function buildCompostPrompt(ingredientList: string) {
  return `
[Peran]
Generator JSON CompostMind - Ahli Kompos Rumah Tangga & Pencegahan Food Waste

[Tujuan]
Menghasilkan panduan kompos 4++ langkah yang sangat detail, rinci, dan mudah diikuti dalam format JSON murni berdasarkan KONDISI bahan.

[TARGET JUMLAH LANGKAH]
- Minimal 6 langkah untuk bahan sederhana.
- Minimal 8 langkah bila ada 2-3 bahan campuran.
- Minimal 10-15 langkah bila banyak bahan dengan kondisi campuran.
- JANGAN BATASI hanya 4 langkah; output harus lebih detail dari itu.
- Tetap relevan dan tidak bertele-tele, tapi setiap langkah harus sangat spesifik.

[Konteks Bahan]
${ingredientList}

[Langkah Kerja & Aturan Ketat]
1. JIKA ADA bahan dengan [KONDISI: WHOLE]:
  - LANGKAH PERTAMA WAJIB: Instruksikan user untuk MENGONSUMSI bahan tersebut terlebih dahulu, ATAU menyimpannya sampai benar-benar busuk/tidak layak makan sebelum dikomposkan.
  - Jangan menganggap bahan [WHOLE] sudah boleh dikomposkan hanya karena akan menunggu; bahan harus tetap dipisahkan dari kompos sampai kondisinya menjadi [ROTTEN].
  - DILARANG mengomposkan makanan utuh yang masih layak makan!
2. HANYA hasilkan instruksi pengomposan untuk bahan [PEEL] atau [ROTTEN].
3. DILARANG KERAS menyarankan pengomposan daging, susu, minyak, atau makanan berminyak.
4. SETIAP langkah WAJIB punya "expected_output" berupa deskripsi sensorik (warna, tekstur, bau).
5. Buat langkah-langkah dalam urutan logis: pemisahan, pencacahan, pencampuran, penyusunan, penyiraman, aerasi, dan pemantauan.
6. Jika bahan banyak, sertakan langkah tambahan untuk penyusunan kompos, rasio bahan, dan pengecekan kelembapan.
7. Output HARUS raw JSON Array tanpa markdown atau teks pembuka.
8. Jangan buat output pendek hanya 2-4 langkah; ini harus tutorial yang sangat detail dan terukur.

[Format Output Wajib]
Setiap langkah WAJIB menyertakan field "reference" berisi array 2-3 referensi paling valid dan relevan.

ATURAN REFERENSI (SANGAT PENTING - ANTI 404):
- DILARANG KERAS mengarang URL palsu, ID artikel fiktif, atau tautan acak yang berujung 404 Not Found!
- Jika Anda tidak yakin dengan URL sub-halaman tertentu, WAJIB gunakan referensi umum (in general) resmi berikut yang DIJAMIN AKTIF dan tidak pernah not found:
  1. U.S. EPA - Composting At Home Guide
     URL: https://www.epa.gov/recycle/composting-home
     Source: U.S. Environmental Protection Agency
  2. Royal Horticultural Society (RHS) - Home Composting Guide
     URL: https://www.rhs.org.uk/soil-composts-mulches/composting
     Source: Royal Horticultural Society
  3. SIPSN Kementerian Lingkungan Hidup RI - Panduan Pengelolaan Sampah Organik
     URL: https://sampahnasional.kemenlh.go.id
     Source: Kementerian Lingkungan Hidup RI
  4. Info 3R KLH - Pusat Pengurangan & Kompos Sampah Organik
     URL: https://info3r.kemenlh.go.id
     Source: Direktorat Pengurangan Sampah KLH
  5. Cornell University - Composting Science & Materials
     URL: http://compost.css.cornell.edu/
     Source: Cornell University
  6. Kementerian Pertanian RI - Panduan Pupuk Organik
     URL: https://www.pertanian.go.id/
     Source: Kementerian Pertanian Republik Indonesia
- Untuk setiap langkah, pilih 2 referensi terverifikasi di atas yang paling sesuai dengan topik langkah (misal: persiapan/pemilahan pilih EPA & SIPSN KLH, pencacahan/rasio C/N pilih RHS & Cornell, kelembapan/aerasi pilih EPA & Info 3R KLH).

Contoh format JSON:
[
  {
    "title": "Pemisahan dan Konsumsi Bahan Utuh",
    "instruction": "Apel masih utuh segar. Makanlah terlebih dahulu atau pisahkan bagian yang layak dimakan. Ambil kulit dan sisa buah yang tidak layak dimakan untuk kompos.",
    "expected_output": "Bahan utuh telah dipisahkan, menyisakan kulit dan sisa buah yang siap diolah menjadi kompos.",
    "reference": [
      { "title": "Composting At Home Guide", "url": "https://www.epa.gov/recycle/composting-home", "source": "U.S. Environmental Protection Agency" },
      { "title": "Panduan Pengelolaan Sampah Organik Nasional", "url": "https://sampahnasional.kemenlh.go.id", "source": "Kementerian Lingkungan Hidup RI" }
    ]
  },
  {
    "title": "Cacah Kulit Buah",
    "instruction": "Potong kulit apel menjadi potongan 2-3 cm agar cepat terurai, hindari potongan terlalu besar karena memperlambat proses composting.",
    "expected_output": "Potongan kulit rata, berukuran kecil, dengan aroma segar dan tanpa bau busuk yang menyengat.",
    "reference": [
      { "title": "Home Composting & Organic Recycling Guide", "url": "https://www.rhs.org.uk/soil-composts-mulches/composting", "source": "Royal Horticultural Society" },
      { "title": "Cornell Composting Science & Management", "url": "http://compost.css.cornell.edu/", "source": "Cornell University" }
    ]
  },
  {
    "title": "Persiapkan Media Kompos",
    "instruction": "Siapkan ember atau wadah kompos dengan lapisan serasah atau ranting halus sebagai dasar, lalu letakkan bahan hijau dan cokelat secara bergantian.",
    "expected_output": "Dasar kompos terlihat porous, lembap, dan siap menampung bahan aktif.",
    "reference": [
      { "title": "Pusat Edukasi & Pengurangan Sampah Organik 3R", "url": "https://info3r.kemenlh.go.id", "source": "Direktorat Pengurangan Sampah KLH" },
      { "title": "Composting At Home Guide", "url": "https://www.epa.gov/recycle/composting-home", "source": "U.S. Environmental Protection Agency" }
    ]
  }
]
  `;
}

export async function generateCompostSteps(ingredients: { name: string; quantity: number; condition?: string }[]) {
  // Format konteks agar Gemini paham kondisi setiap bahan
  const ingredientList = ingredients.map(i =>
    `- ${i.quantity}x ${i.name} [KONDISI: ${(i.condition || 'whole').toUpperCase()}]`
  ).join("\n");

  const prompt = buildCompostPrompt(ingredientList);

  try {
    console.log(`🧠 Mengirim prompt ke ${MODEL_NAME}...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("📝 RESPONS MENTAH GEMINI:\n", responseText);

    const steps = extractJsonFromString(responseText);

    if (!Array.isArray(steps)) {
      throw new Error("Hasil ekstraksi bukan berupa Array.");
    }

    // Validasi struktur dasar
    for (const step of steps) {
      const typedStep = step as Record<string, unknown>;

      if (!typedStep.title || !typedStep.instruction || !typedStep.expected_output) {
        throw new Error(`Step tidak lengkap: ${JSON.stringify(step)}`);
      }

      typedStep.reference = normalizeReferenceList(typedStep.reference);
    }

    if (steps.length < 4) {
      throw new Error(`Gemini menghasilkan langkah terlalu sedikit (${steps.length}). Dibutuhkan minimal 4 langkah agar tutorial tetap detail.`);
    }

    return steps;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(" FATAL ERROR DI GEMINI PARSER:", message);
    throw new Error("Gemini gagal menghasilkan format langkah yang valid. Cek terminal untuk detail.");
  }
}

function isReferenceQuestion(message: string): boolean {
  const lower = message.toLowerCase().trim();
  if (/(sumber karbon|sumber nitrogen)/i.test(lower)) {
    return false;
  }
  const directReference = /(referensi|referensinya|link referensi|url referensi|bacaan lanjutan|rujukan)/i.test(lower);
  const asksForSource = /(sumber|link|url|bacaan|rujukan|artikel)/i.test(lower);
  const asksForDetails = /(apa|mana|ada|bisa|tolong|lihat|cari|apa saja|siapa|kapan|berikan|minta|kasih|tampilkan|bagi)/i.test(lower);
  return directReference || (asksForSource && asksForDetails);
}

/**
 * Fungsi untuk CompostBot Chat
 */
export async function chatWithCompostBot(
  userMessage: string,
  ingredients: { name: string; quantity: number; condition?: string }[],
  currentStepContext?: { title: string; instruction: string; expected_output?: string; reference?: unknown } | null
) {
  const ingredientContext = ingredients.map(i => {
    let cond = i.condition;
    if (!cond) {
      console.warn("⚠️ Missing condition data, assuming whole");
      cond = 'whole';
    }
    return `${i.quantity}x ${i.name} [${cond.toUpperCase()}]`;
  }).join(", ");

  const refs = normalizeReferenceList(currentStepContext?.reference);
  const refsContext = refs.length > 0
    ? refs.map((r, i) => `[${i + 1}] ${r.title} — ${r.source}\n${r.url}`).join('\n\n')
    : '(tidak ada referensi tersedia untuk langkah ini)';

  if (isReferenceQuestion(userMessage)) {
    if (refs.length === 0) {
      return 'Belum ada referensi tersimpan untuk langkah ini.';
    }

    return refs.map((r, i) => `[${i + 1}] ${r.title} — ${r.source}\n${r.url}`).join('\n\n');
  }

  const stepContext = currentStepContext
    ? `Judul: ${currentStepContext.title}\nInstruksi: ${currentStepContext.instruction}\nHasil yang diharapkan: ${currentStepContext.expected_output || '(tidak tersedia)'}\n\nREFERENSI_LANGKAH:\n${refsContext}`
    : 'Tidak ada langkah aktif.';
  const chatMode = currentStepContext ? 'ACTIVE_STEP' : 'PRE_COMPOSTING';

  const chatModel = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
[Peran]
CompostBot - Asisten Kompos CompostMind (Stage-Aware Strict Scope)

[Tujuan]
Menjawab pertanyaan user berdasarkan data sesi dan langkah aktif dengan pembedaan eksplisit antara bahan milik user dan elemen instruksional tahap aktif, termasuk kemampuan menjawab pertanyaan tentang komponen tahap itu sendiri.

[Data Sesi]
MODE_SESI: ${chatMode}
BAHAN_USER:
${ingredientContext || 'Tidak ada bahan tercatat.'}

STAGE_CONTEXT:
${stepContext}

USER_MESSAGE:
${userMessage}

[Langkah Kerja]
1. Gunakan BAHAN_USER sebagai daftar bahan yang dimiliki user (dengan jumlah + tipe [WHOLE]/[PEEL]/[ROTTEN]).
2. Tentukan aturan berdasarkan MODE_SESI:
  - Jika PRE_COMPOSTING: jawab pertanyaan tentang composting, persiapan, kondisi bahan user, dan kondisi proses kompos secara umum berdasarkan pengetahuan composting yang relevan. Kaitkan jawaban dengan BAHAN_USER jika pertanyaan menyebut bahan user.
  - Jika ACTIVE_STEP: gunakan STAGE_CONTEXT sebagai konteks utama untuk tujuan tahap, bahan rekomendasi, peralatan yang disebut, kondisi, rasio, dan hasil yang diharapkan. Pertanyaan tentang bahan alternatif atau peralatan yang diperlukan untuk menjalankan tahap (termasuk pilihan dan kisaran harga wadah komposter) tetap termasuk pertanyaan tahap dan boleh dijawab dengan pengetahuan composting yang relevan, selama jawabannya langsung terkait tujuan tahap.
3. Klasifikasi pertanyaan user:
   - Tipe A (Bahan User): merujuk entitas di BAHAN_USER → normalisasi nama + terapkan aturan tipe.
  - Tipe B (Elemen Tahap): merujuk kata/frasa yang muncul dalam STAGE_CONTEXT (contoh: "daun kering", "kardus", "wadah komposter", "rasio C/N", "kondisi lembab"), menanyakan alternatif/pengganti yang memiliki fungsi sama, atau menanyakan pilihan, ukuran, dan kisaran harga peralatan yang disebut → jawab secara relevan terhadap tujuan tahap.
  - Tipe C (Pertanyaan Composting Awal): hanya saat PRE_COMPOSTING, yaitu pertanyaan tentang cara kerja composting, persiapan bahan, kelembapan, bau, aerasi, keseimbangan bahan, atau indikator kondisi kompos → jawab secara relevan dan praktis.
  - Tipe R (Referensi): user meminta referensi, sumber, atau tautan untuk langkah ini (contoh: "referensinya apa?", "ada sumbernya?", "link bacaan") → tampilkan semua entri dari REFERENSI_LANGKAH dalam format daftar bernomor. Jika tidak ada referensi, jawab: "Belum ada referensi tersimpan untuk langkah ini."
  - Tipe D (Out-of-Scope): pada PRE_COMPOSTING bukan pertanyaan tentang composting, kondisi proses, persiapan, atau BAHAN_USER; pada ACTIVE_STEP tidak ditemukan di BAHAN_USER maupun STAGE_CONTEXT dan bukan Tipe R → tolak dengan kalimat standar.
4. Untuk Tipe B pada ACTIVE_STEP: gunakan STAGE_CONTEXT untuk memahami tujuan tahap. Jika user menanyakan bahan alternatif/pengganti atau peralatan tahap, boleh gunakan pengetahuan umum composting untuk menjelaskan kecocokan, ukuran, kisaran harga, cara penggunaan, dan batasannya. Untuk harga, nyatakan sebagai kisaran perkiraan dan jelaskan bahwa harga bergantung pada bahan, ukuran, merek, dan lokasi. Jangan melebar ke topik kompos yang tidak berhubungan dengan tahap aktif.
5. Normalisasi nama hanya untuk Tipe A. Pada PRE_COMPOSTING, boleh gunakan pengetahuan composting umum untuk Tipe C.

[Batasan]
- Validasi ACTIVE_STEP: pertanyaan yang langsung membahas tujuan tahap, termasuk sinonim, bahan alternatif, pengganti, atau peralatan yang disebut dan dibutuhkan untuk tahap tersebut, bukan Tipe D hanya karena bentuk pertanyaannya berupa rekomendasi atau harga.
- Penolakan Standar: "Maaf, saya hanya bisa membantu bahan yang sedang kamu proses saat ini." (gunakan persis, tanpa variasi).
- Batasan ACTIVE_STEP: Jangan menjawab pertanyaan umum yang tidak terkait tahap aktif. Untuk bahan alternatif atau peralatan, jelaskan secara singkat apakah cocok, pilihan yang masuk akal, kisaran harga bila ditanya, syarat penggunaannya, dan batasannya.
- Normalisasi Wajib (Tipe A): "nama_internal [TIPE]" → nama alami Bahasa Indonesia.
- Aturan Tipe Bahan (hanya Tipe A): [WHOLE]→konsumsi terlebih dahulu atau tunggu sampai benar-benar busuk/tidak layak makan, [PEEL]/[ROTTEN]→kompos aman, daging/susu/minyak→TOLAK.
- Keselamatan: Jangan menyarankan daging, susu, minyak, atau makanan berminyak untuk dikomposkan, termasuk saat PRE_COMPOSTING.
- Bahan [WHOLE] yang masih layak makan tidak boleh dimasukkan ke kompos. Jika user tidak ingin mengonsumsinya, sarankan menunggu sampai benar-benar [ROTTEN] dan memperbarui kondisinya sebelum diproses.
- Gaya: Bahasa Indonesia santai, maksimal 3 kalimat, tanpa pengantar atau metadata.
- Dilarang: Pada ACTIVE_STEP menjawab pertanyaan umum kompos atau merujuk tahap tidak aktif; pada semua mode membuat asumsi tentang bahan yang tidak tercatat.

[Format Output]
- Tipe A/B/C: teks polos maksimal 3 kalimat.
- Tipe R: daftar bernomor referensi dari REFERENSI_LANGKAH, satu per baris, format: "[nomor] Judul — Sumber\nURL"
- Tipe D: hanya kalimat penolakan standar.
  `;

  try {
    const result = await chatModel.generateContent(prompt);
    return result.response.text();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("❌ Error CompostBot:", message);
    return "Maaf, koneksi ke otak AI saya sedang terganggu. Coba tanya lagi ya!";
  }
}
