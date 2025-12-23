
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60; // Estende o tempo de execução para 60 segundos

export async function POST(req: NextRequest) {
  try {
    const { base64Image, mimeType, prompt, model } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Chave de API (API_KEY) não configurada no ambiente da Vercel.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanData } },
          { text: `Restauração Profissional: ${prompt}. Recupere detalhes, remova ruído e melhore a nitidez preservando a identidade original.` }
        ]
      },
      config: {
        systemInstruction: "Você é um mestre em restauração fotográfica. Sua missão é recuperar fotos antigas, colorir e remover danos físicos mantendo a fidelidade das pessoas.",
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
        description: textPart?.text || "Imagem processada com sucesso."
      });
    }

    return NextResponse.json({ error: 'A IA não conseguiu gerar a imagem processada.' }, { status: 500 });
  } catch (error: any) {
    console.error("Erro na API Route:", error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor de imagem.' }, { status: 500 });
  }
}
