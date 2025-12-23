
import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { message } = req.body;
  const apiKey = process.env.API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API_KEY não configurada.' });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: "Você é o Concierge da RestaurAIlma. Ajude usuários a restaurar fotos. Seja breve e gentil. O app homenageia Ilma.",
      }
    });

    res.status(200).json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
