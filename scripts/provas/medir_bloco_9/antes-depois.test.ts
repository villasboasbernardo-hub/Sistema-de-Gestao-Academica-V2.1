/**
 * Spec 024 (Bloco 9, item 2; SC-007) — o andamento das turmas EAD e semipresenciais ANTES (a regra até o Bloco 8: a EAD
 * pelo limite diário em horas, a semipresencial pelo curso inteiro) × DEPOIS (`contagemDaTurma` + `andamentoDaTurma`).
 *
 *   DADOS_DA_MEDICAO=dados.json pnpm exec vitest run --config scripts/provas/medir_bloco_9/vitest.config.mjs --silent=false
 *
 * ⚠️ FORA DA SUÍTE. ⚠️ O "antes" da EAD é a conta antiga, exata: capacidade = dias úteis de amanhã até o término × o
 *    limite diário em horas (`capacidadeDiaria`), saldo = capacidade − restante.
 */
import { readFileSync } from "node:fs";
import { test } from "vitest";

import {
  andamentoDaTurma,
  capacidadeDiaria,
  contagemDaTurma,
  diaSeguinte,
  diasUteisEntre,
} from "@/lib/dominio/andamento-da-turma";
import { regimeEfetivo } from "@/lib/dominio/regime-da-turma";

type Turma = {
  codigo: string;
  status: string;
  modalidade: string;
  data_termino: string | null;
  inicio_etapa_presencial: string | null;
  termino_etapa_presencial: string | null;
  prevista: number | null;
  executada: number;
  disciplinas_presenciais: number;
  ch_presencial: number;
  executada_na_etapa: number;
  regime_padrao_tempos: number | null;
  limite_diario_ead_horas: number | null;
  regime_tempos: number | null;
};

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));

test("o antes e o depois das EAD e semipresenciais", () => {
  const dados = JSON.parse(readFileSync(process.env.DADOS_DA_MEDICAO ?? "dados.json", "utf8")) as {
    hoje: string;
    feriados: string[];
    turmas: Turma[];
  };
  const linhas = dados.turmas.map((t) => {
    const regime = regimeEfetivo(
      {
        regimePadraoTempos: t.regime_padrao_tempos,
        limiteDiarioEadHoras: t.limite_diario_ead_horas,
      },
      t.regime_tempos === null ? null : { regimeTempos: t.regime_tempos },
    );
    const prevista = Number(t.prevista ?? 0);
    const executada = Number(t.executada);
    // ANTES: a regra até o Bloco 8.
    const restante = Math.max(prevista - executada, 0);
    const cap = capacidadeDiaria(t.modalidade, regime);
    const dias = t.data_termino
      ? diasUteisEntre(diaSeguinte(dados.hoje), t.data_termino, dados.feriados)
      : null;
    const saldoAntes = cap === null || dias === null ? null : dias * cap - restante;
    const atrasoAntes = t.status === "ativa" && saldoAntes !== null && saldoAntes < 0;
    // DEPOIS: a regra do Bloco 9.
    const contagem = contagemDaTurma(
      { modalidade: t.modalidade, prevista, executada, dataTermino: t.data_termino },
      {
        disciplinasMarcadas: Number(t.disciplinas_presenciais),
        chPresencial: Number(t.ch_presencial),
        executadaNaEtapa: Number(t.executada_na_etapa),
        inicioEtapa: t.inicio_etapa_presencial,
        terminoEtapa: t.termino_etapa_presencial,
      },
    );
    const depois = andamentoDaTurma(
      {
        status: t.status,
        modalidade: t.modalidade,
        dataTermino: contagem.dataTermino,
        inicioDaCapacidade: contagem.inicioDaCapacidade,
        prevista: contagem.prevista,
        executada: contagem.executada,
      },
      regime,
      dados.feriados,
      dados.hoje,
    );
    return `| ${t.codigo} | ${t.modalidade} | ${t.status} | ${prevista}/${executada} → ${depois.situacaoDaCapacidade === "controle_da_dead" ? "—" : `${depois.prevista}/${depois.executada}`} | ${fmt(saldoAntes)} → ${fmt(depois.saldo)} | ${atrasoAntes ? "sim" : "não"} → ${depois.emAtraso ? "sim" : "não"} | ${contagem.aviso ?? (depois.situacaoDaCapacidade === "controle_da_dead" ? "controle da DEaD" : "—")} |`;
  });
  console.log(
    [
      `hoje = ${dados.hoje}`,
      "| Turma | Modalidade | Situação | Prevista/executada (antes → depois) | Saldo (TA) | Em atraso | Aviso |",
      "|---|---|---|---|---|---|---|",
      ...linhas,
    ].join("\n"),
  );
});
