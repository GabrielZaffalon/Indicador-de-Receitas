import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "openai/gpt-oss-120b:free";

if (!API_KEY || API_KEY === "sua_chave_aqui") {
  console.error("Erro: configure OPENROUTER_API_KEY no arquivo .env.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/status", (req, res) => {
  res.json({ status: "Indicador de Receitas rodando", model: MODEL });
});

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chamarOpenRouter(systemPrompt, userPrompt, tentativas = 3) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-OpenRouter-Title": "Indicador de Receitas FIA ADS"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_completion_tokens: 900
      })
    });

    if (response.status === 429 && tentativa < tentativas) {
      await aguardar(tentativa * 2000);
      continue;
    }

    return response;
  }
}

app.post("/api/receitas", async (req, res) => {
  try {
    const { ingredientes, jaExibidas = [] } = req.body;

    if (!ingredientes || ingredientes.trim().length === 0) {
      return res.status(400).json({ erro: "Informe ao menos um ingrediente." });
    }
    if (ingredientes.length > 500) {
      return res.status(400).json({ erro: "Limite: 500 caracteres para os ingredientes." });
    }

    const systemPrompt = `Voce e um chef de cozinha experiente e didatico. Quando o usuario informar ingredientes, sugira uma receita que os utilize.

Responda SEMPRE neste formato:

## Nome da Receita

**Ingredientes necessarios:**
Liste todos os ingredientes com quantidade aproximada.

**Modo de preparo:**
Passo a passo numerado, claro e simples.

**Tempo estimado:** X minutos
**Dificuldade:** Facil / Medio / Dificil

Sugira apenas 1 receita. Priorize a que melhor aproveite os ingredientes informados. Seja objetivo e pratico.`;

    const exclusao = jaExibidas.length > 0
      ? ` Nao repita estas receitas que ja foram sugeridas: ${jaExibidas.join(", ")}.`
      : "";

    const userPrompt = `Tenho os seguintes ingredientes disponiveis: ${ingredientes}. Que receita posso fazer?${exclusao}`;

    const response = await chamarOpenRouter(systemPrompt, userPrompt);

    if (!response.ok) {
      const detalhe = await response.text();

      if (response.status === 429) {
        return res.status(502).json({
          erro: "O modelo gratuito esta sobrecarregado no momento. Aguarde um pouco e tente novamente.",
          status: response.status,
          detalhe
        });
      }

      return res.status(502).json({
        erro: "Erro ao consultar o OpenRouter.",
        status: response.status,
        detalhe
      });
    }

    const data = await response.json();
    const texto = data.choices?.[0]?.message?.content;

    if (!texto) {
      return res.status(502).json({ erro: "Resposta vazia ou inesperada da API." });
    }

    res.json({ modelo: MODEL, receitas: texto, uso: data.usage ?? null });
  } catch (error) {
    res.status(500).json({ erro: "Erro interno no servidor.", detalhe: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Indicador de Receitas rodando em http://localhost:${PORT}`);
});
