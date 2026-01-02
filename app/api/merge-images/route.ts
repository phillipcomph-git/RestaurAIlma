
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { imageA, mimeA, imageB, mimeB, prompt } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'API_KEY ausente.' }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    const dataA = imageA.includes(',') ? imageA.split(',')[1] : imageA;
    const dataB = imageB.includes(',') ? imageB.split(',')[1] : imageB;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeA, data: dataA } },
          { inlineData: { mimeType: mimeB, data: dataB } },
          { text: `FUSÃO: ${prompt}. Crie uma única imagem composta realista.` }
        ]
      },
      config: { temperature: 0.4 }
    });

    const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imgPart?.inlineData?.data) {
      return NextResponse.json([{
        base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
      }]);
    }

    return NextResponse.json({ error: 'Falha na fusão das imagens.' }, { status: 422 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
