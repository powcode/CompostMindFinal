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
export async function generateCompostSteps(ingredients: { name: string; quantity: number; condition?: string }[]) {
  // Format konteks agar Gemini paham kondisi setiap bahan
  const ingredientList = ingredients.map(i => 
    `- ${i.quantity}x ${i.name} [KONDISI: ${(i.condition || 'whole').toUpperCase()}]`
  ).join("\n");

  const prompt = `
[Peran]
Generator JSON CompostMind - Ahli Kompos Rumah Tangga & Pencegahan Food Waste

[Tujuan]
Menghasilkan panduan kompos 3-5 langkah dalam format JSON murni berdasarkan KONDISI bahan.

[Konteks Bahan]
${ingredientList}

[Langkah Kerja & Aturan Ketat]
1. JIKA ADA bahan dengan [KONDISI: WHOLE]: 
   - LANGKAH PERTAMA WAJIB: Instruksikan user untuk MENGONSUMSI atau memisahkan bagian utuh tersebut.
   - DILARANG mengomposkan makanan utuh yang masih layak makan!
2. HANYA hasilkan instruksi pengomposan untuk bahan [PEEL] atau [ROTTEN].
3. DILARANG KERAS menyarankan pengomposan daging, susu, minyak, atau makanan berminyak.
4. SETIAP langkah WAJIB punya "expected_output" berupa deskripsi sensorik (warna, tekstur, bau).
5. Output HARUS raw JSON Array tanpa markdown atau teks pembuka.

[Format Output Wajib]
[
  {
    "title": "Konsumsi / Pisahkan Bahan Utuh",
    "instruction": "Apel masih utuh segar. Silakan makan terlebih dahulu. Ambil kulit/sisanya saja untuk dikompos.",
    "expected_output": "Buah utuh telah dikonsumsi, menyisakan kulit/sisa yang siap diolah."
  },
  {
    "title": "Cacah Kulit Buah",
    "instruction": "Potong kulit pisang menjadi ukuran 2-3 cm.",
    "expected_output": "Cacahan seragam 2-3 cm, aroma buah segar tanpa bau busuk tajam."
  }
]
  `;

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
  currentStepContext?: { title: string; instruction: string } | null
) {
  let contextString = `Bahan kompos saat ini: ${ingredients.map(i => {
    let cond = i.condition;
    if (!cond) {
      console.warn("⚠️ Missing condition data, assuming whole");
      cond = 'whole';
    }
    return `${i.quantity}x ${i.name} [${cond.toUpperCase()}]`;
  }).join(", ")}.`;
  
  if (currentStepContext) {
    contextString += `\nUser sedang di langkah: "${currentStepContext.title}".`;
  }

  const chatModel = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
[PERAN] Kamu adalah CompostBot, asisten ramah CompostMind.

[KONTEKS]
${contextString}

[ATURAN RESPON]
1. JIKA ada bahan [WHOLE]: Dorong user untuk mengonsumsinya dulu, jangan dikompos!
2. JIKA ada bahan [PEEL]/[ROTTEN]: Bantu user mengomposkannya dengan aman.
3. DILARANG mengomposkan daging, susu, minyak.
4. Bahasa Indonesia santai, maksimal 3 kalimat.

[Pertanyaan User] "${userMessage}"
  `;

  try {
    const result = await chatModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("❌ Error CompostBot:", error.message);
    return "Maaf, koneksi ke otak AI saya sedang terganggu. Coba tanya lagi ya!";
  }
}
