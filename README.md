
# RestaurAIlma 🎨✨

> "Para conservar a memória de quem nos trouxe até aqui. S2 Ilma."

**RestaurAIlma** é uma aplicação de ponta para restauração e manipulação de imagens, utilizando o poder dos modelos Gemini 2.5 Flash da Google. Projetada com foco em UX/UI minimalista e elegante, ela permite recuperar fotos antigas, colorir memórias e criar novas artes.

## 🚀 Funcionalidades Principais

- **🛡️ Restauração**: Repara danos físicos, remove riscos e limpa ruídos de fotos antigas.
- **🎨 Colorização**: Aplica cores naturais e realistas a fotos monocromáticas.
- **✨ Aprimoramento**: Melhora a nitidez e a definição de detalhes usando Super Resolution.
- **🧬 Mesclagem (Merge)**: Funde características de duas fotos diferentes em uma nova imagem única.
- **🖼️ Geração Criativa**: Gera imagens a partir de texto (1x, 2x ou 4x variações) com suporte a imagem de referência.
- **🤖 Concierge IA**: Um chat assistente integrado para tirar dúvidas sobre o processo de restauração.

## 🛠️ Stack Tecnológica

- **Frontend**: React 19 + Tailwind CSS
- **Iconografia**: Lucide React
- **IA/Engine**: Google Gemini API (`gemini-2.5-flash-image` & `gemini-3-flash-preview`)
- **Backend**: Vercel Serverless Functions (Node.js 20)
- **Segurança**: Arquitetura BFF que protege a API Key no lado do servidor.

## 📦 Deploy em 1 Minuto na Vercel

1. Clique em **New Project** no dashboard da Vercel.
2. Importe seu repositório do GitHub.
3. Configure as **Environment Variables**:
   - `API_KEY`: Sua chave do Google Gemini (obtenha em [ai.google.dev](https://ai.google.dev/)).
4. Clique em **Deploy**.

## 💻 Como Rodar Localmente

1. Clone o repositório.
2. Instale as dependências: `npm install`.
3. Configure o arquivo `.env` com sua `API_KEY`.
4. Inicie o servidor de desenvolvimento: `npm run dev`.

---
*Desenvolvido com carinho e tecnologia para preservar o que realmente importa.*
