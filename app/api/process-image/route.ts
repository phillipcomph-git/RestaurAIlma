
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60; // Define o máximo permitido pelo Vercel
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { image, mimeType, prompt, model } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Configure a variável API_KEY no painel do Vercel.' }, { status: 500 });
    }

    if (!image) {
      return NextResponse.json({ error: 'Nenhuma imagem fornecida.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Limpeza rigorosa do base64
    const base64Data = image.split(',')[1] || image;

    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } },
          { text: `Aja como um restaurador de fotos. Instrução: ${prompt}. Retorne APENAS a imagem processada. Remova falhas, ruídos e melhore a nitidez.` }
        ]
      },
      config: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
      }
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'A IA não conseguiu processar esta imagem (possível restrição de conteúdo).' }, { status: 400 });
    }

    const imgPart = candidates[0].content.parts.find(p => p.inlineData);
    
    if (imgPart?.inlineData?.data) {
      return NextResponse.json({
        base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
        model: model || 'gemini-2.5-flash-image'
      });
    }

    // Caso a IA retorne apenas texto (ex: erro ou recusa)
    const textPart = candidates[0].content.parts.find(p => p.text);
    return NextResponse.json({ error: textPart?.text || 'A IA não retornou uma imagem editada.' }, { status: 422 });

  } catch (error: any) {
    console.error("Erro Crítico na API:", error);
    return NextResponse.json({ error: `Erro no servidor: ${error.message}` }, { status: 500 });
  }
}
