// Configuração PRÓPRIA da medição do Bloco 9 (spec 024) — fora da suíte (o `include` do projeto é `tests/`).
// Uso: DADOS_DA_MEDICAO=dados.json pnpm exec vitest run --config scripts/provas/medir_bloco_9/vitest.config.mjs --silent=false
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../../../", import.meta.url));

const configuracao = {
  root: raiz,
  resolve: { alias: { "@": raiz } },
  test: {
    include: ["scripts/provas/medir_bloco_9/antes-depois.test.ts"],
    environment: "node",
  },
};

export default configuracao;
