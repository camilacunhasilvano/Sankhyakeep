/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy initialization function for Gemini SDK to prevent crashes on startup if key is missing
let aiInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Chave do Gemini API não configurada no servidor. Por favor, adicione GEMINI_API_KEY nas Configurações.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Refactor note text endpoint using gemini-3.5-flash
app.post("/api/gemini/refactor", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid note text" });
    }

    const ai = getGenAI();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `The following is a personal note where text, paragraphs, or lines are clumped together or lack proper structure.
Reformat the text by placing logical paragraphs and sequential items/lines on separate lines and paragraphs using Markdown.
CRITICAL MANDATES:
1. Do NOT summarize, sanitize, synthesize, or change the writing style.
2. Absolutely do NOT omit any original details, words, email addresses, numbers, or details. Keep EVERY piece of content exactly as provided, just formatted with proper spacing and paragraph linebreaks.
3. Keep the original language of the note (portuguese).
4. Output ONLY the properly formatted Markdown note content, with no introductory, conversational, or concluding text from you. Do not wrap the output in markdown code blocks (\`\`\`).

Original note text to format:
\n\n${text}`,
    });

    res.json({ refactoredText: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: error.message || "Erro desconhecido ao chamar a API do Gemini." });
  }
});

// Start server
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.log("[Server] Running in DEVELOPMENT mode using Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Bulletproof developmental fallback serving for SPA deep routing
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(
          path.resolve(process.cwd(), 'index.html'),
          'utf-8'
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("[Server] Running in PRODUCTION mode serving compiled assets...");
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    
    console.log(`[Production Diagnostic] distPath of static assets: ${distPath}`);
    console.log(`[Production Diagnostic] indexPath exists: ${fs.existsSync(indexPath)}`);
    
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Error: Page not found. Static bundle (index.html) is missing from dist folder.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
