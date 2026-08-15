import { GoogleGenerativeAI } from "@google/generative-ai";

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ==========================================
// UPDATE MODEL KE GEMINI 3.6 FLASH
// ==========================================
const MODEL_NAME = "gemini-3.5-flash-lite";

const model = genAI.getGenerativeModel({ 
  model: MODEL_NAME,
  generationConfig: {
    // Gemini 3.x sangat patuh dengan responseMimeType JSON
    responseMimeType: "application/json",
  }
});

/**
 * FUNGSI SAKTI: Ekstrak JSON dari teks Gemini (Defense in Depth)
 */
function extractJsonFromString(text: string): any {
  try {
    // 1. Coba parse langsung
    return JSON.parse(text);
  } catch (e) {
    // 2. Fallback: Cari pola array JSON [...] menggunakan Regex
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch && jsonMatch[0]) {
      try {
        console.log("⚠️ Gemini 3.6 memberi teks tambahan. Berhasil diekstrak via Regex.");
        return JSON.parse(jsonMatch[0]);
      } catch (regexError) {
        console.error("❌ Regex menemukan kurung siku, tapi isi dalamnya bukan JSON valid:", jsonMatch[0]);
        throw new Error("Format JSON di dalam markdown tidak valid.");
      }
    }
    
    console.error("❌ Teks asli dari Gemini tidak mengandung JSON Array sama sekali:", text);
    throw new Error("Gemini tidak mengembalikan format Array JSON.");
  }
}

/**
 * Fungsi untuk generate step-by-step tutorial kompos
 */
export async function generateCompostSteps(ingredients: { name: string, quantity: number }[]) {
  const ingredientList = ingredients.map(i => `- ${i.quantity}x ${i.name}`).join("\n");

  // Prompt dioptimalkan untuk Gemini 3.x (Lebih natural tapi tetap tegas soal format)
  const prompt = `
    Kamu adalah generator JSON untuk aplikasi CompostMind.
    
    User memiliki bahan kompos berikut:
    ${ingredientList}

    Tugasmu: Buatkan panduan 3 sampai 5 langkah cara mengomposkan bahan tersebut.
    
    ATURAN OUTPUT (SANGAT PENTING):
    1. Output HARUS berupa raw JSON Array of Objects.
    2. Setiap object HANYA boleh punya 2 key: "title" (string) dan "instruction" (string).
    3. DILARANG KERAS menggunakan markdown block seperti \`\`\`json.
    4. DILARANG menambahkan teks pembuka/penutup. Langsung mulai dengan '[' dan akhiri dengan ']'.
  `;

  try {
    console.log(`🧠 Mengirim prompt ke ${MODEL_NAME}...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log("📝 RESPONS MENTAH GEMINI 3.6:\n", responseText); 
    
    const steps = extractJsonFromString(responseText);
    
    if (!Array.isArray(steps)) {
      throw new Error("Hasil ekstraksi bukan berupa Array.");
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

  // Gunakan model 3.6 flash juga untuk chat, tapi tanpa paksaan JSON output
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