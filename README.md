
# RestaurAIlma 🎨✨

**RestaurAIlma** é uma aplicação avançada para restauração, colorização e reconstrução de imagens usando Inteligência Artificial (Google Gemini 2.5 Flash).

## 📂 Como enviar para o GitHub

Como este código foi gerado em ambiente Cloud (AI Studio), siga estes passos para criar seu repositório:

1. **Crie o Repositório**:
   - Vá no GitHub e crie um novo repositório vazio (público ou privado).

2. **Prepare os Arquivos**:
   - Crie uma pasta no seu computador chamada `restaurailma`.
   - Baixe/Copie os arquivos deste projeto mantendo a estrutura abaixo. **Ignore** arquivos como `index.html`, `index.tsx` e `App.tsx` que estão marcados como obsoletos.

   **Estrutura Correta:**
   ```
   /restaurailma
   ├── app/
   │   ├── api/
   │   │   ├── chat/
   │   │   ├── generate-image/
   │   │   ├── merge-images/
   │   │   └── process-image/
   │   ├── globals.css
   │   ├── layout.tsx
   │   └── page.tsx
   ├── components/ (Todos os componentes: Button.tsx, Uploader.tsx, etc)
   ├── hooks/ (useImageProcessing.ts)
   ├── services/ (geminiService.ts)
   ├── types.ts
   ├── next.config.js
   ├── package.json
   ├── postcss.config.mjs
   ├── tailwind.config.ts
   ├── tsconfig.json
   └── .gitignore
   ```

3. **Suba o Código**:
   - Abra o terminal na pasta `restaurailma`.
   - Rode:
     ```bash
     git init
     git add .
     git commit -m "Primeiro commit"
     git branch -M main
     git remote add origin SEU_LINK_DO_GITHUB_AQUI
     git push -u origin main
     ```

## 🚀 Funcionalidades

- **Reconstrução**: Preenche partes faltando da imagem (Inpainting via Prompt).
- **Restauração**: Remove riscos e danos físicos.
- **Colorização**: Colore fotos P&B.
- **Melhoria**: Aumenta nitidez e resolução.

## 🛠️ Stack

- Next.js 15
- React 19
- Tailwind CSS
- Google Gemini API
