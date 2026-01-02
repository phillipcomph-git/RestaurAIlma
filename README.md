
# RestaurAIlma 🎨✨

**RestaurAIlma** é uma aplicação avançada para restauração, colorização e reconstrução de imagens usando Inteligência Artificial (Google Gemini 2.5 Flash).

## 🚀 Como Deployar na Vercel (Atualizado)

1. **GitHub**:
   - Suba todos os arquivos deste projeto para um repositório no GitHub.
   - **Atenção:** Certifique-se de que NÃO há chaves de API escritas no código (arquivo `services/geminiService.ts`).

2. **Vercel**:
   - Crie um novo projeto na Vercel e importe seu repositório.
   - A Vercel detectará que é **Next.js**.

3. **Configuração da Chave (Segurança)**:
   - Vá em **Settings > Environment Variables** no painel da Vercel.
   - Adicione apenas:
     - **Key:** `API_KEY`
     - **Value:** (Sua NOVA chave do Google Gemini)
   
   *Nota: Não use `NEXT_PUBLIC_API_KEY` na Vercel para evitar que o Google revogue sua chave por vazamento.*

## 📂 Estrutura Híbrida

- **Preview (AI Studio)**: Roda via `index.html` + Vite.
- **Produção (Vercel)**: Roda via `app/layout.tsx` + Next.js (Server-side API Routes).
