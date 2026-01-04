# RestaurAIlma 🎨✨

> "Para conservar a memória de quem nos trouxe até aqui. S2 Ilma."

**RestaurAIlma** é uma aplicação Fullstack Next.js para restauração e manipulação de imagens, utilizando o poder dos modelos Gemini 2.5 Flash da Google.

## 🚀 Funcionalidades

- **Restauração**: Repara danos físicos e ruídos.
- **Colorização**: Aplica cores em fotos P&B.
- **Mesclagem**: Funde duas fotos em uma.
- **Concierge IA**: Chat assistente integrado.
- **Multi-idioma**: Suporte a PT, EN, ES, CN.

## 📦 Como fazer Deploy (GitHub + Vercel)

Este projeto já está configurado para Next.js. Siga os passos abaixo para colocar no ar:

### Passo 1: GitHub
1. Crie um novo repositório no [GitHub](https://github.com/new).
2. No seu terminal, envie os arquivos:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - RestaurAIlma"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

### Passo 2: Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login.
2. Clique em **"Add New..."** -> **"Project"**.
3. Importe o repositório do GitHub que você acabou de criar.
4. Nas configurações do projeto (Configure Project), vá em **Environment Variables**:
   - **Key:** `API_KEY`
   - **Value:** Sua chave da API do Google Gemini (Obtenha em [aistudio.google.com](https://aistudio.google.com/)).
5. Clique em **Deploy**.

### Importante
- A aplicação utiliza **Server-Side Functions** (`/api/...`) para proteger sua chave de API. A chave nunca é exposta ao navegador.
- Se o deploy falhar por falta de dependências, a Vercel instalará automaticamente com base no `package.json`.

## 💻 Rodando Localmente

1. `npm install`
2. Crie um arquivo `.env.local` na raiz:
   ```env
   API_KEY=sua_chave_aqui
   ```
3. `npm run dev`

---
*Desenvolvido com carinho e tecnologia.*