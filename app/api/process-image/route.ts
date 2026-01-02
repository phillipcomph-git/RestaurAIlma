
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.image) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const { image, mimeType, prompt, model } = body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'Servidor não configurado (API Key).' }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    
    // Remove cabeçalho se existir
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    
    // Prompt otimizado para velocidade: direto e curto
    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } },
          { text: `Restaure esta imagem. ${prompt}` }
        ]
      },
      config: {
        temperature: 0.3, // Baixa criatividade para focar na correção rápida
      }
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'Sem resultado da IA.' }, { status: 422 });
    }

    const imgPart = candidates[0].content.parts.find(p => p.inlineData);
    
    if (imgPart?.inlineData?.data) {
      return NextResponse.json([{
        base64: `data:${imgPart.inlineData.mimeType || 'image/jpeg'};base64,${imgPart.inlineData.data}`,
        model: model,
        description: "Imagem processada com sucesso."
      }]);
    }

    return NextResponse.json({ error: 'A IA não retornou imagem.' }, { status: 422 });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Erro no servidor." }, { status: 500 });
  }
}
