
import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { prompt, count, aspectRatio, baseImage } = req.body;
  const apiKey = process.env.API_KEY;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const results = [];

    for (let i = 0; i < (count || 1); i++) {
      const parts: any[] = [{ text: prompt }];
      if (baseImage) {
        const data = baseImage.data.includes(',') ? baseImage.data.split(',')[1] : baseImage.data;
        parts.push({ inlineData: { mimeType: baseImage.mimeType, data } });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { imageConfig: { aspectRatio: aspectRatio || "1:1" } }
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imgPart?.inlineData?.data) {
        results.push({
          base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
          model: 'gemini-2.5-flash-image'
        });
      }
    }
    res.status(200).json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
