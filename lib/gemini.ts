import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ==========================================
// PERBAIKAN: NAMA MODEL YANG PASTI ADA DI GOOGLE
// ==========================================
// Pilih salah satu:
// - "gemini-1.5-flash"     ← Paling stabil, cepat, murah (REKOMENDASI)
// - "gemini-2.0-flash"     ← Generasi baru, lebih pintar
// - "gemini-1.5-pro"       ← Lebih pintar lagi tapi lebih lambat
const MODEL_NAME = "gemini-3.5-flash-lite"; // ✅ GANTI KE INI

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
    
    console.error("❌ Teks asli dari Gemini tidak mengandung JSON Array:", text);
    throw new Error("Gemini tidak mengembalikan format Array JSON.");
  }
}

/**
 * Fungsi untuk generate step-by-step tutorial kompos
 */
export async function generateCompostSteps(ingredients: { name: string, quantity: number }[]) {
  const ingredientList = ingredients.map(i => `- ${i.quantity}x ${i.name}`).join("\n");

  // Prompt Anda yang sudah BAGUS, dipertahankan 100%
  const prompt = `
    [Peran]
    Generator JSON CompostMind - Ahli Kompos Rumah Tangga

    [Tujuan]
    Menghasilkan panduan kompos 3-5 langkah dalam format JSON murni.

    [Konteks]
    User skala rumah tangga kecil dengan bahan kompos: 
    ${ingredientList}

    [Langkah Kerja]
    1. Analisis bahan dan kuantitas.
    2. Buat 3-5 langkah logis (rasio C:N, ukuran, dekomposisi).
    3. Setiap langkah praktis, alat minimal.
    4. SETIAP langkah WAJIB punya "expected_output" — deskripsi sensorik (warna, tekstur, bau, kondisi visual) hasil yang BENAR setelah langkah selesai. Ini untuk verifikasi user.
    5. Output raw JSON Array.

    [Batasan]
    - WAJIB raw JSON Array, bukan markdown.
    - Setiap object WAJIB punya 3 key: "title", "instruction", "expected_output".
    - "expected_output" HARUS deskriptif sensorik, BUKAN kalimat kosong atau generic.
    - DILARANG markdown code block.
    - DILARANG teks sebelum '[' atau setelah ']'.

    [Format Output]
    PENTING: Ikuti struktur ini PERSIS. Jangan hilangkan expected_output.
    [
      {
        "title": "Cacah Bahan",
        "instruction": "Potong 5 apel menjadi potongan 2-3 cm pakai pisau dapur.",
        "expected_output": "Potongan apel seragam 2-3 cm, warna putih kekuningan segar, belum kecoklatan. Tidak ada potongan yang terlalu besar (>3 cm)."
      },
      {
        "title": "Campur dengan Daun Kering",
        "instruction": "Aduk potongan apel dengan daun kering rasio 1:2 di ember.",
        "expected_output": "Campuran coklat-hijau seimbang, tekstur lembab seperti spons diperas — tidak becek, tidak berdebu. Bau earthy ringan, tidak busuk."
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

    // Validasi struktur setiap step (bonus safety check)
    for (const step of steps) {
      if (!step.title || !step.instruction) {
        throw new Error(`Step tidak lengkap: ${JSON.stringify(step)}`);
      }
    }

    return steps;
  } catch (error: any) {
    console.error("🚨 FATAL ERROR DI GEMINI PARSER:", error.message);
    throw new Error("Gemini gagal menghasilkan format langkah yang valid. Cek terminal untuk detail.");
  }
}

/**
 * Fungsi untuk CompostBot Chat
 */
export async function chatWithCompostBot(
  userMessage: string, 
  contextIngredients: { name: string, quantity: number }[],
  currentStepContext?: { title: string, instruction: string } | null
) {
  let contextString = `Bahan kompos saat ini: ${contextIngredients.map(i => `${i.quantity}x ${i.name}`).join(", ")}.`;
  
  if (currentStepContext) {
    contextString += `\nUser sedang berada di langkah: "${currentStepContext.title}". Instruksi: "${currentStepContext.instruction}".`;
  }

  const chatModel = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
Kamu adalah CompostBot, asisten AI ramah untuk aplikasi CompostMind.
${contextString}

Jawab pertanyaan user dengan singkat, padat, jelas dalam Bahasa Indonesia (Maksimal 3 kalimat).
Pertanyaan user: "${userMessage}"
  `;

  try {
    const result = await chatModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("❌ Error CompostBot:", error.message);
    return "Maaf, koneksi ke otak AI saya sedang terganggu. Coba lagi nanti ya!";
  }
}