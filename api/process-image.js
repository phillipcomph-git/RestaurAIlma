export default async (req, res) => {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    
    const { base64Image, mimeType, promptInstruction, modelPreference } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'base64Image é obrigatório' });
    }
    if (!mimeType) {
      return res.status(400).json({ error: 'mimeType é obrigatório' });
    }
    if (!promptInstruction) {
      return res.status(400).json({ error: 'promptInstruction é obrigatório' });
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_GENAI_API_KEY não configurada');
      return res.status(500).json({
        error: 'Configuração de API inválida. Verifique as variáveis de ambiente.',
        status: 'error',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Limpar base64 se necessário
    const cleanedBase64 = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    const response = await ai.models.generateContent({
      model: modelPreference || 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanedBase64 } },
          { text: promptInstruction },
        ],
      },
      config: {
        systemInstruction:
          'Você é um especialista em restauração fotográfica. Sua missão é recuperar fotos antigas.',
        temperature: 0.2,
        imageConfig: { aspectRatio: '1:1' },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return res.status(500).json({
        error: 'A IA não retornou resultados válidos.',
        status: 'error',
      });
    }

    const content = candidates[0].content;
    const parts = content?.parts;

    if (!parts || parts.length === 0) {
      return res.status(500).json({
        error: 'Nenhuma parte de conteúdo foi retornada.',
        status: 'error',
      });
    }

    const imagePart = parts.find((part) => part.inlineData);
    const textPart = parts.find((part) => part.text);

    if (!imagePart || !imagePart.inlineData) {
      return res.status(500).json({
        error: 'A IA não gerou uma imagem válida.',
        status: 'error',
      });
    }

    return res.status(200).json({
      base64: imagePart.inlineData.data,
      description: textPart?.text || 'Imagem processada com sucesso.',
      status: 'success',
    });
  } catch (error) {
    console.error('Erro ao processar imagem:', error);

    if (error.message?.includes('API_KEY')) {
      return res.status(500).json({
        error: 'Configuração de API inválida.',
        status: 'error',
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Limite de requisições atingido. Tente novamente em alguns segundos.',
        status: 'error',
      });
    }

    return res.status(500).json({
      error: error.message || 'Erro ao processar imagem',
      status: 'error',
    });
  }
};
