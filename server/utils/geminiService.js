// server/utils/geminiService.js
// ============================================================================
// THE BRAIN: GOOGLE GEMINI 2.0 FLASH AI AGENT (ACADEMIC SECRETARY)
// ============================================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager, FileState } = require("@google/generative-ai/server");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const os = require("os");

// 1. Initialize Gemini Clients
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GEMINI_API_KEY);

/**
 * Main AI Agent Function
 * @param {string} videoUrl - The public Supabase URL of the lesson video
 * @param {string} studentLevel - The proficiency level (A1, B2, etc.)
 */
async function analyzeLesson(videoUrl, studentLevel) {
  let tempFilePath = null;
  
  try {
    // A. DOWNLOAD VIDEO TO TEMP STORAGE (Required for Gemini File API upload)
    console.log("📥 Downloading video for AI analysis...");
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error(`Video download failed: ${response.statusText}`);
    
    const buffer = await response.buffer();
    tempFilePath = path.join(os.tmpdir(), `lesson-${Date.now()}.mp4`);
    fs.writeFileSync(tempFilePath, buffer);

    // B. UPLOAD TO GEMINI FILE API
    console.log("🚀 Uploading to Gemini File API...");
    const uploadResponse = await fileManager.uploadFile(tempFilePath, {
      mimeType: "video/mp4",
      displayName: "Lesson Recording",
    });

    // C. WAIT FOR PROCESSING (Gemini must index the video/audio)
    let file = await fileManager.getFile(uploadResponse.file.name);
    while (file.state === FileState.PROCESSING) {
      process.stdout.write(".");
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s
      file = await fileManager.getFile(uploadResponse.file.name);
    }

    if (file.state === FileState.FAILED) throw new Error("AI Video processing failed.");
    console.log("\n✅ Video ready for inference.");

    // D. EXECUTE SOPHISTICATED LEVEL-AWARE PROMPT
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" } // Force Structured JSON
    });

    const prompt = `
      ### SYSTEM PERSONA
      You are the "Lernitt Academic Secretary," an elite linguistic analyst. 
      Analyze this language lesson for a student at the [${studentLevel}] proficiency level.

      ### LEVEL-SPECIFIC GUIDELINES
      - IF LEVEL IS A1-A2: Use extremely simple language. Provide keyword translations.
      - IF LEVEL IS B1-B2: Use clear, standard English. Explain idioms with simple synonyms.
      - IF LEVEL IS C1-C2: Use professional/academic tone. Focus on high-level nuance and register.

      ### TASK INSTRUCTIONS
      1. THEME: Identify the primary theme (e.g. Business, Coffee Ordering).
      2. SUMMARY: Write 3-4 sentences summarizing the progress.
      3. VOCABULARY VAULT: Extract 5-10 words/idioms. Include the EXACT MM:SS timestamp.
      4. GRAMMAR LOG: Find 3-5 specific "Student Error" vs "Tutor Correction" moments.
      5. DEEP DIVE: Provide one expert tip and 3 alternative high-level phrasings.
      6. ANALYTICS: Estimate Student Talk Time % and a Fluency Score (1-10).

      ### JSON SCHEMA (REQUIRED)
      Return exactly this structure:
      {
        "theme": "string",
        "summary": "string",
        "vocabulary": [{"word": "string", "timestamp": "string", "definition": "string", "example": "string"}],
        "grammarLog": [{"error": "string", "correction": "string", "rule": "string"}],
        "deepDive": {"topic": "string", "expertTip": "string", "alternativePhrasing": ["string"]},
        "analytics": {"studentTalkTime": number, "fluencyScore": number}
      }
    `;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri,
        },
      },
      { text: prompt },
    ]);

    const aiResponse = JSON.parse(result.response.text());

    // E. CLEANUP (Delete temp file from local server)
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    
    return aiResponse;

  } catch (error) {
    console.error("❌ Gemini Service Error:", error);
    if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    throw error;
  }
}

module.exports = { analyzeLesson };
