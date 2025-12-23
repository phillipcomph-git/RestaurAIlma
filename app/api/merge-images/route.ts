
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageA, mimeA, imageB, mimeB, prompt, count } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'API_KEY ausente.' }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    const dataA = imageA.includes(',') ? imageA.split(',')[1] : imageA;
    const dataB = imageB.includes(',') ? imageB.split(',')[1] : imageB;

    const results = [];
    // Processamos sequencialmente para evitar gargalos de memória na função serverless
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
        config: { systemInstruction: "Mescle as duas fotos de forma ultra-realista." }
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imgPart?.inlineData?.data) {
        results.push({
          base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
