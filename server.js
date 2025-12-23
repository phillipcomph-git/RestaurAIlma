import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// API Route para processar imagem
app.post('/api/process-image', async (req, res) => {
  try {
    const { base64Image, mimeType, prompt, model } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API_KEY não configurada no servidor.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanData } },
          { text: `Restauração de imagem: ${prompt}. Mantenha as feições originais, remova danos e melhore a nitidez.` }
        ]
      },
      config: {
        systemInstruction: "Especialista em restauração fotográfica. Recupere fotos, colora e remova falhas preservando a identidade original.",
        temperature: 0.2
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    const textPart = parts?.find(p => p.text);

    if (imagePart?.inlineData?.data) {
      return res.status(200).json({
        base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
        model: model,
        description: textPart?.text || "Processamento concluído."
      });
    }
    throw new Error("IA não gerou imagem.");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Servir SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
