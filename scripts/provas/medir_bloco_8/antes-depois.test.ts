/**
 * Spec 023 (Bloco 8), item 3 — o efeito de inativar o feriado de 28/10/2026 (`FER-000024`) na capacidade e no saldo
 * (`RN-EVT-02`), com a função REAL do sistema (`andamentoDaTurma`). Lê o JSON de `scripts/provas/medir_bloco_8.sql`:
 *
 *   DADOS_DA_MEDICAO=dados.json pnpm exec vitest run --config scripts/provas/medir_bloco_8/vitest.config.mjs --silent=false
 *
 * ⚠️ FORA DA SUÍTE (o `include` do projeto é `tests/`). ⚠️ "Com o 28/10" acrescenta a data à lista de feriados ativos;
 *    "sem", é a cópia como está (o `FER-000024` já inativo desde 22/10/2026 12:30 UTC).
 */
import { readFileSync } from "node:fs";
import { test } from "vitest";

import { andamentoDaTurma } from "@/lib/dominio/andamento-da-turma";
import { regimeEfetivo } from "@/lib/dominio/regime-da-turma";

type Turma = {
  codigo: string;
  status: string;
  modalidade: string;
  data_termino: string;
  prevista: number | null;
  executada: number;
  regime_padrao_tempos: number | null;
  limite_diario_ead_horas: number | null;
  regime_tempos: number | null;
};

test("o efeito do 28/10 no saldo", () => {
  const dados = JSON.parse(readFileSync(process.env.DADOS_DA_MEDICAO ?? "dados.json", "utf8")) as {
    hoje: string;
    feriados: string[];
    turmas: Turma[];
  };
  const sem = dados.feriados.filter((d) => d !== "2026-10-28");
  const com = [...sem, "2026-10-28"];
  const linhas = dados.turmas.map((t) => {
    const regime = regimeEfetivo(
      {
        regimePadraoTempos: t.regime_padrao_tempos,
        limiteDiarioEadHoras: t.limite_diario_ead_horas,
      },
      t.regime_tempos === null ? null : { regimeTempos: t.regime_tempos },
    );
    const turma = {
      status: t.status,
      modalidade: t.modalidade,
      dataTermino: t.data_termino,
      prevista: Number(t.prevista ?? 0),
      executada: Number(t.executada),
    };
    const a = andamentoDaTurma(turma, regime, com, dados.hoje);
    const b = andamentoDaTurma(turma, regime, sem, dados.hoje);
    return `| ${t.codigo} | ${a.diasUteis} → ${b.diasUteis} | ${a.capacidade} → ${b.capacidade} | ${a.saldo} → ${b.saldo} | ${a.emAtraso ? "sim" : "não"} → ${b.emAtraso ? "sim" : "não"} |`;
  });
  console.log(
    [
      `hoje = ${dados.hoje}`,
      "| Turma | Dias úteis (com 28/10 → sem) | Capacidade (TA) | Saldo (TA) | Em atraso |",
      "|---|---|---|---|---|",
      ...linhas,
    ].join("\n"),
  );
});
