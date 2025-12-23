
import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64Image, mimeType, prompt, model } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API_KEY não configurada no servidor.' });

  try {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
