
import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { imageA, mimeA, imageB, mimeB, prompt, count } = req.body;
  const apiKey = process.env.API_KEY;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const results = [];

    const dataA = imageA.includes(',') ? imageA.split(',')[1] : imageA;
    const dataB = imageB.includes(',') ? imageB.split(',')[1] : imageB;

    for (let i = 0; i < (count || 1); i++) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: mimeA, data: dataA } },
            { inlineData: { mimeType: mimeB, data: dataB } },
            { text: prompt }
          ]
        },
        config: { systemInstruction: "Mescle as duas imagens de forma realista." }
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
