
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'API_KEY ausente' }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: "Você é o Concierge da RestaurAIlma, um app de restauração de fotos. Seja gentil e ajude o usuário com dicas de restauração.",
      }
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
