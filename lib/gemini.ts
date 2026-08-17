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
    
    console.error("❌ Teks asli dari Gemini tidak mengandung JSON Array:", text);
    throw new Error("Gemini tidak mengembalikan format Array JSON.");
  }
}

/**
 * Fungsi untuk generate step-by-step tutorial kompos
 */
export async function generateCompostSteps(ingredients: { name: string, quantity: number, condition?: string }[]) {
  const ingredientList = ingredients.map(i => `- ${i.quantity}x ${i.name} [${i.condition || 'whole'}]`).join("\n");

  const prompt = `
    [Peran]
    Generator JSON CompostMind - Ahli Kompos Rumah Tangga & Pencegahan Food Waste

    [Tujuan]
    Menghasilkan panduan kompos 3-5 langkah dalam format JSON murni.

    [Konteks]
    User skala rumah tangga kecil dengan bahan kompos: 
    ${ingredientList}

    [Langkah Kerja & Aturan Ketat]
    1. Jika ADA bahan dengan kondisi [whole], BERIKAN INSTRUKSI KETAT untuk MENGONSUMSINYA TERLEBIH DAHULU. DILARANG membuat langkah pengomposan langsung untuk makanan utuh yang masih layak makan!
    2. HANYA hasilkan instruksi pengomposan untuk bahan berkondisi [peel] (kulit/sisa) atau [rotten] (busuk).
    3. DILARANG SANGAT menyarankan pengomposan daging, produk susu, minyak, atau makanan dimasak terlepas dari kondisinya.
    4. Setiap langkah praktis dengan alat minimal.
    5. SETIAP langkah WAJIB punya "expected_output" — deskripsi sensorik (warna, tekstur, bau, kondisi visual) hasil yang BENAR setelah langkah selesai.
    6. Output RAW JSON Array tanpa markdown.

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
        "title": "Konsumsi / Pisahkan Bahan Utuh",
        "instruction": "Apel masih utuh segar. Silakan makan atau olah terlebih dahulu. Ambil kulit atau sisanya saja untuk dikomposkan.",
        "expected_output": "Buah utuh telah dikonsumsi/dipisahkan, menyisakan kulit atau bagian sisa/busuk yang siap diolah."
      },
      {
        "title": "Cacah Kulit Buah",
        "instruction": "Potong kulit pisang dan sisa buah menjadi ukuran 2-3 cm.",
        "expected_output": "Cacahan kulit buah berukuran seragam 2-3 cm, aroma khas buah segar tanpa bau busuk tajam."
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
  contextIngredients: { name: string, quantity: number, condition?: string }[],
  currentStepContext?: { title: string, instruction: string } | null
) {
  let contextString = `Bahan kompos saat ini: ${contextIngredients.map(i => `${i.quantity}x ${i.name} [${i.condition || 'whole'}]`).join(", ")}.`;
  
  if (currentStepContext) {
    contextString += `\nUser sedang berada di langkah: "${currentStepContext.title}". Instruksi: "${currentStepContext.instruction}".`;
  }

  const chatModel = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `
Kamu adalah CompostBot, asisten AI ramah untuk aplikasi CompostMind.
${contextString}

Aturan Penting:
1. Dorong pengguna untuk mengonsumsi makanan yang masih utuh (kondisi 'whole') daripada dibuang.
2. Jawab pertanyaan user dengan singkat, padat, jelas dalam Bahasa Indonesia (Maksimal 3 kalimat).

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
