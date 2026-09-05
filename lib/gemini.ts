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
function extractJsonFromString(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch && jsonMatch[0]) {
      try {
        console.log("⚠️ Gemini memberi teks tambahan. Berhasil diekstrak via Regex.");
        return JSON.parse(jsonMatch[0]);
      } catch (regexError) {
        console.error("❌ Regex menemukan kurung siku, tapi isi dalamnya bukan JSON valid:", jsonMatch[0]);
        throw new Error("Format JSON di dalam markdown tidak valid.");
      }
    }
    
    console.error(" Teks asli dari Gemini tidak mengandung JSON Array:", text);
    throw new Error("Gemini tidak mengembalikan format Array JSON.");
  }
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
   - LANGKAH PERTAMA WAJIB: Instruksikan user untuk MENGONSUMSI atau memisahkan bagian utuh tersebut.
   - DILARANG mengomposkan makanan utuh yang masih layak makan!
2. HANYA hasilkan instruksi pengomposan untuk bahan [PEEL] atau [ROTTEN].
3. DILARANG KERAS menyarankan pengomposan daging, susu, minyak, atau makanan berminyak.
4. SETIAP langkah WAJIB punya "expected_output" berupa deskripsi sensorik (warna, tekstur, bau).
5. Buat langkah-langkah dalam urutan logis: pemisahan, pencacahan, pencampuran, penyusunan, penyiraman, aerasi, dan pemantauan.
6. Jika bahan banyak, sertakan langkah tambahan untuk penyusunan kompos, rasio bahan, dan pengecekan kelembapan.
7. Output HARUS raw JSON Array tanpa markdown atau teks pembuka.
8. Jangan buat output pendek hanya 2-4 langkah; ini harus tutorial yang sangat detail dan terukur.

[Format Output Wajib]
[
  {
    "title": "Pemisahan dan Konsumsi Bahan Utuh",
    "instruction": "Apel masih utuh segar. Makanlah terlebih dahulu atau pisahkan bagian yang layak dimakan. Ambil kulit dan sisa buah yang tidak layak dimakan untuk kompos.",
    "expected_output": "Bahan utuh telah dipisahkan, menyisakan kulit dan sisa buah yang siap diolah menjadi kompos."
  },
  {
    "title": "Cacah Kulit Buah",
    "instruction": "Potong kulit apel menjadi potongan 2-3 cm agar cepat terurai, hindari potongan terlalu besar karena memperlambat proses composting.",
    "expected_output": "Potongan kulit rata, berukuran kecil, dengan aroma segar dan tanpa bau busuk yang menyengat."
  },
  {
    "title": "Persiapkan Media Kompos",
    "instruction": "Siapkan ember atau wadah kompos dengan lapisan serasah atau ranting halus sebagai dasar, lalu letakkan bahan hijau dan cokelat secara bergantian.",
    "expected_output": "Dasar kompos terlihat porous, lembap, dan siap menampung bahan aktif."
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
      if (!step.title || !step.instruction || !step.expected_output) {
        throw new Error(`Step tidak lengkap: ${JSON.stringify(step)}`);
      }
    }

    if (steps.length < 4) {
      throw new Error(`Gemini menghasilkan langkah terlalu sedikit (${steps.length}). Dibutuhkan minimal 4 langkah agar tutorial tetap detail.`);
    }

    return steps;
  } catch (error: any) {
    console.error(" FATAL ERROR DI GEMINI PARSER:", error.message);
    throw new Error("Gemini gagal menghasilkan format langkah yang valid. Cek terminal untuk detail.");
  }
}

/**
 * Fungsi untuk CompostBot Chat
 */
export async function chatWithCompostBot(
  userMessage: string, 
  ingredients: { name: string; quantity: number; condition?: string }[],
  currentStepContext?: { title: string; instruction: string; expected_output?: string } | null
) {
  const ingredientContext = ingredients.map(i => {
    let cond = i.condition;
    if (!cond) {
      console.warn("⚠️ Missing condition data, assuming whole");
      cond = 'whole';
    }
    return `${i.quantity}x ${i.name} [${cond.toUpperCase()}]`;
  }).join(", ");

  const stepContext = currentStepContext
    ? `Judul: ${currentStepContext.title}\nInstruksi: ${currentStepContext.instruction}\nHasil yang diharapkan: ${currentStepContext.expected_output || '(tidak tersedia)'}`
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
  - Jika ACTIVE_STEP: gunakan STAGE_CONTEXT sebagai satu-satunya sumber untuk elemen tahap, termasuk bahan rekomendasi, kondisi, rasio, dan hasil yang diharapkan.
3. Klasifikasi pertanyaan user:
   - Tipe A (Bahan User): merujuk entitas di BAHAN_USER → normalisasi nama + terapkan aturan tipe.
   - Tipe B (Elemen Tahap): merujuk kata/frasa yang muncul dalam STAGE_CONTEXT (contoh: "daun kering", "kardus", "rasio C/N", "kondisi lembab") → jawab berdasarkan informasi eksplisit di STAGE_CONTEXT.
  - Tipe C (Pertanyaan Composting Awal): hanya saat PRE_COMPOSTING, yaitu pertanyaan tentang cara kerja composting, persiapan bahan, kelembapan, bau, aerasi, keseimbangan bahan, atau indikator kondisi kompos → jawab secara relevan dan praktis.
  - Tipe D (Out-of-Scope): pada PRE_COMPOSTING bukan pertanyaan tentang composting, kondisi proses, persiapan, atau BAHAN_USER; pada ACTIVE_STEP tidak ditemukan di BAHAN_USER maupun STAGE_CONTEXT → tolak dengan kalimat standar.
4. Untuk Tipe B pada ACTIVE_STEP: gunakan HANYA informasi yang tertulis literal di STAGE_CONTEXT; dilarang inferensi atau pengetahuan eksternal tentang kompos.
5. Normalisasi nama hanya untuk Tipe A. Pada PRE_COMPOSTING, boleh gunakan pengetahuan composting umum untuk Tipe C.

[Batasan]
- Validasi Literal ACTIVE_STEP: Pertanyaan Tipe B hanya boleh dijawab jika kata kunci/frasa tersebut muncul SECARA EKSPLISIT di STAGE_CONTEXT. Sinonim atau konsep implisit = Tipe D.
- Penolakan Standar: "Maaf, saya hanya bisa membantu bahan yang sedang kamu proses saat ini." (gunakan persis, tanpa variasi).
- Dilarang Menambah Informasi ACTIVE_STEP: Tidak boleh menjelaskan elemen tahap di luar yang tertulis, meskipun benar secara teknis kompos.
- Normalisasi Wajib (Tipe A): "nama_internal [TIPE]" → nama alami Bahasa Indonesia.
- Aturan Tipe Bahan (hanya Tipe A): [WHOLE]→konsumsi, [PEEL]/[ROTTEN]→kompos aman, daging/susu/minyak→TOLAK.
- Keselamatan: Jangan menyarankan daging, susu, minyak, atau makanan berminyak untuk dikomposkan, termasuk saat PRE_COMPOSTING.
- Gaya: Bahasa Indonesia santai, maksimal 3 kalimat, tanpa pengantar atau metadata.
- Dilarang: Pada ACTIVE_STEP menjawab pertanyaan umum kompos atau merujuk tahap tidak aktif; pada semua mode membuat asumsi tentang bahan yang tidak tercatat.

[Format Output]
Respons teks polos maksimal 3 kalimat sesuai klasifikasi tipe. Jika Tipe D, output hanya kalimat penolakan standar.
  `;

  try {
    const result = await chatModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("❌ Error CompostBot:", error.message);
    return "Maaf, koneksi ke otak AI saya sedang terganggu. Coba tanya lagi ya!";
  }
}
