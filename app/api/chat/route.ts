
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'API_KEY não configurada.' }, { status: 500 });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: "Você é o Concierge da RestaurAIlma, um app de restauração de fotos em homenagem à Ilma. Ajude os usuários a usarem as ferramentas de restauração, colorização e merge. Seja breve e gentil.",
      }
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
