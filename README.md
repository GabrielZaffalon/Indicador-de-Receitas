# Indicador de Receitas

Aplicação web que recebe ingredientes informados pelo usuário e utiliza um modelo de linguagem (LLM) via OpenRouter para sugerir receitas detalhadas com modo de preparo, tempo estimado e nível de dificuldade.

Desenvolvida como atividade prática da disciplina **Inteligência Artificial — ADS**.

**Autor:** Gabriel Zaffalon Ferreira Rocha
**Instituição:** SENAC RS — UNISENAC Pelotas
**Ano:** 2026

---

## Como funciona

A aplicação é dividida em duas partes que se comunicam:

```
Usuário (navegador)
      │
      │  digita ingredientes e clica em "Buscar Receitas"
      ▼
Frontend (public/index.html)
      │
      │  POST /api/receitas  →  { ingredientes, jaExibidas }
      ▼
Back-end (server.js — Node.js + Express)
      │
      │  monta o prompt e envia para o OpenRouter
      │  POST https://openrouter.ai/api/v1/chat/completions
      ▼
OpenRouter API
      │
      │  encaminha para o modelo LLM configurado
      ▼
Modelo de linguagem (meta-llama/llama-3.1-8b-instruct:free)
      │
      │  gera a receita e retorna o texto
      ▼
Back-end recebe a resposta e repassa para o frontend
      │
      ▼
Frontend converte o markdown em HTML e exibe para o usuário
```

### Por que usar um back-end?

A chave da API do OpenRouter **nunca pode ficar exposta no navegador**. Se a chamada fosse feita direto do `index.html`, qualquer pessoa que abrisse o DevTools conseguiria ver e roubar a chave. Com o Express no meio, a chave fica no servidor (no arquivo `.env`) e o navegador só conversa com a API local.

### O que é o OpenRouter?

O OpenRouter é um serviço que centraliza o acesso a vários modelos de linguagem (LLMs) de diferentes provedores — OpenAI, Meta, Mistral, Google, entre outros — por meio de uma única API padronizada. Isso permite trocar de modelo apenas mudando uma linha no código, sem precisar reescrever a lógica de chamada.

### O que é um prompt de sistema?

Quando enviamos uma mensagem ao modelo, podemos incluir dois tipos de instrução:

- **System prompt** (`role: "system"`): define o comportamento da IA — quem ela é, como deve responder e qual formato deve seguir. O usuário não vê esse texto.
- **User prompt** (`role: "user"`): a mensagem que vem do usuário, neste caso os ingredientes informados.

Neste projeto, o system prompt instrui o modelo a atuar como chef de cozinha, responder em formato markdown estruturado e evitar repetir receitas já exibidas.

### Como receitas repetidas são evitadas?

O frontend mantém um array `jaExibidas` que guarda o nome de cada receita retornada. Ao clicar em "Sugerir outra receita", esse array é enviado junto na requisição. O back-end então acrescenta ao user prompt uma instrução como:

> "Não repita estas receitas que já foram sugeridas: Frango ao molho, Arroz de forno."

O modelo, ao receber essa instrução, escolhe uma receita diferente. Ao iniciar uma nova busca com ingredientes novos, o array é zerado.

---

## Estrutura do projeto

```
sugestao-de-receitas/
├── server.js          # Servidor Express: recebe requisições e chama o OpenRouter
├── package.json       # Dependências e script de inicialização
├── .env               # Chave da API (não deve ser compartilhado)
└── public/
    ├── index.html     # Interface do usuário
    └── style.css      # Estilização da interface
```

### Descrição de cada arquivo

**`server.js`**
Contém o servidor Node.js com Express. Define duas rotas:
- `GET /api/status` — verifica se o servidor está rodando.
- `POST /api/receitas` — recebe os ingredientes, valida a entrada, monta o prompt, chama o OpenRouter e retorna a receita gerada.

**`package.json`**
Define as dependências do projeto (`express`, `cors`, `dotenv`) e o script `start` que executa `node server.js`.

**`.env`**
Arquivo de variáveis de ambiente. Guarda a chave da API do OpenRouter na variável `OPENROUTER_API_KEY`. Este arquivo não deve ser enviado para repositórios públicos.

**`public/index.html`**
Interface web servida pelo Express. Contém:
- O campo de ingredientes com sistema de tags (adicionar/remover por Enter ou vírgula).
- O botão "Buscar Receitas" que dispara a primeira requisição.
- O botão "Sugerir outra receita" que reaparece após cada resposta.
- A animação de loading exibida durante a chamada à API.
- A função `mdParaHtml()` que converte o markdown retornado pela IA em HTML formatado.

**`public/style.css`**
Toda a estilização da interface, incluindo o spinner de loading animado via `@keyframes`.

---

## Pré-requisitos

- [Node.js](https://nodejs.org) versão 18 ou superior
- Conta gratuita no [OpenRouter](https://openrouter.ai)

---

## Instalação e configuração

### 1. Obter a chave de API

1. Acesse [openrouter.ai](https://openrouter.ai) e crie uma conta
2. Vá em **Keys** no menu lateral
3. Clique em **Create Key** e copie a chave gerada (começa com `sk-or-v1-...`)

### 2. Configurar o arquivo `.env`

Abra o arquivo `.env` na raiz do projeto e substitua o valor pela sua chave:

```
OPENROUTER_API_KEY=sk-or-v1-suachaveaqui
```

Regras importantes:
- Sem aspas ao redor do valor
- Sem espaços antes ou depois do `=`
- O nome da variável deve ser exatamente `OPENROUTER_API_KEY`

### 3. Instalar as dependências

No terminal, dentro da pasta do projeto:

```bash
npm install
```

Esse comando lê o `package.json` e instala os pacotes `express`, `cors` e `dotenv` na pasta `node_modules`.

### 4. Iniciar o servidor

```bash
npm start
```

O terminal deve exibir:

```
Indicador de Receitas rodando em http://localhost:3000
```

### 5. Acessar no navegador

Abra o endereço abaixo no navegador:

```
http://localhost:3000
```

---

## Como usar

1. Digite um ingrediente no campo e pressione **Enter** ou **vírgula** para adicioná-lo como tag
2. Repita para cada ingrediente que desejar incluir
3. Para remover um ingrediente, clique no **×** ao lado da tag
4. Clique em **Buscar Receitas** — uma animação de loading aparecerá enquanto a IA processa
5. A receita sugerida será exibida com ingredientes, modo de preparo, tempo e dificuldade
6. Clique em **Sugerir outra receita** para receber uma sugestão diferente com os mesmos ingredientes

---

## Solução de problemas

| Erro | Causa | Solução |
|------|-------|---------|
| `Erro: configure OPENROUTER_API_KEY` | Arquivo `.env` ausente ou variável com nome errado | Verifique o arquivo `.env` na raiz do projeto |
| `Erro 401` | Chave de API inválida ou expirada | Gere uma nova chave em openrouter.ai/keys |
| `Erro 429` | Limite de requisições do modelo gratuito atingido | Aguarde alguns minutos e tente novamente |
| `Erro ao conectar com o servidor local` | O servidor não está rodando | Execute `npm start` no terminal |
| Resposta vazia | Falha temporária na API | Tente novamente em alguns instantes |
