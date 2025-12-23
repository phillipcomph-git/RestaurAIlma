# RestaurAIlma 🎨✨

Uma ferramenta avançada de restauração de imagens movida por IA (Gemini 2.5 Flash), desenvolvida em homenagem à memória de Ilma.

## ✨ Funcionalidades

- **Restauração Completa**: Remoção de ruídos, riscos e rasgos em fotos antigas.
- **Colorização Inteligente**: Transforme fotos P&B em coloridas com tons naturais.
- **Aprimoramento de Qualidade**: Upscale e melhoria de nitidez via IA.
- **Mesclagem de Pessoas (Merge)**: Fusão criativa entre duas imagens.
- **Geração de Arte**: Criação de novas imagens a partir de texto com referências visuais.
- **Concierge IA**: Chat assistente para ajudar no processo de restauração.

## 🛠️ Tecnologias

- **Frontend**: React 19, Tailwind CSS, Lucide React.
- **IA**: Google Gemini API (modelos `gemini-2.5-flash-image` e `gemini-3-flash-preview`).
- **Backend**: Vercel Serverless Functions (Node.js).
- **Arquitetura**: Fallback inteligente entre execução local (AI Studio) e remota (Vercel API Routes).

## 🚀 Como fazer o Deploy (Vercel)

1. Faça o fork ou upload deste código para um repositório no GitHub.
2. No dashboard da **Vercel**, importe o projeto.
3. Vá em **Settings > Environment Variables**.
4. Adicione a chave `API_KEY` com o valor da sua API Key do Google Gemini (obtenha em [ai.google.dev](https://ai.google.dev/)).
5. Clique em **Deploy**.

## 💻 Desenvolvimento Local

O projeto foi configurado para funcionar diretamente no navegador usando módulos ES6. Para rodar localmente:

1. Clone o repositório.
2. Instale as dependências: `npm install`.
3. Certifique-se de que a variável de ambiente `API_KEY` esteja disponível ou configurada nas API Routes.

---
*Homenagem: "Para conservar a memória de quem nos trouxe até aqui. S2 Ilma."*
