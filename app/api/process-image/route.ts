
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType, prompt, model } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API_KEY não configurada no servidor Vercel.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanData } },
          { text: `Restauração: ${prompt}. Mantenha feições originais e melhore a nitidez.` }
        ]
      },
      config: {
        systemInstruction: "Especialista em restauração fotográfica de memórias familiares.",
        temperature: 0.1
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    const textPart = parts?.find(p => p.text);

    if (imagePart?.inlineData?.data) {
      return NextResponse.json({
        base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
        model,
        description: textPart?.text || "Processado com sucesso."
      });
    }

    return NextResponse.json({ error: 'Nenhuma imagem gerada pela IA.' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
