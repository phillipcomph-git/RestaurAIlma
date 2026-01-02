
# RestaurAIlma 🎨✨

**RestaurAIlma** é uma aplicação avançada para restauração, colorização e reconstrução de imagens usando Inteligência Artificial (Google Gemini 2.5 Flash).

## 🚀 Como Deployar na Vercel

1. **GitHub**:
   - Suba todos os arquivos deste projeto para um repositório no GitHub.
   - **Atenção:** Não suba chaves de API reais no código (no arquivo `geminiService.ts`). Use variáveis de ambiente.

2. **Vercel**:
   - Crie um novo projeto na Vercel e importe seu repositório.
   - A Vercel detectará que é **Next.js**. As configurações de build padrão funcionam.

3. **Configuração da Chave (Importante)**:
   - Vá em **Settings > Environment Variables** no painel da Vercel.
   - Adicione uma nova variável:
     - **Key:** `NEXT_PUBLIC_API_KEY`
     - **Value:** (Sua chave do Google Gemini aqui)
   
   *Sem o prefixo `NEXT_PUBLIC_`, o aplicativo não funcionará no navegador.*

## 📂 Estrutura Híbrida

- **Preview (AI Studio)**: Roda via `index.html` + Vite.
- **Produção (Vercel)**: Roda via `app/layout.tsx` + Next.js.
