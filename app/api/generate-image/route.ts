
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { prompt, count, aspectRatio, baseImage } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 });

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
        config: { 
          imageConfig: { aspectRatio: aspectRatio || "1:1" },
          temperature: 0.8
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imgPart?.inlineData?.data) {
        results.push({
          base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
          model: 'gemini-2.5-flash-image'
        });
      }
    }
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
