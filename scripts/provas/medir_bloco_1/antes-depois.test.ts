/**
 * O antes × depois da M1 e da M2 (spec 016, PR 3) — T088 e T107. Lê o JSON de `scripts/provas/medir_bloco_1.sql` e
 * imprime as tabelas de `specs/016-correcoes-bloco-1/contracts/migrations.md`, com as funções REAIS de `lib/dominio/`.
 *
 *   DADOS_DA_MEDICAO=dados.json pnpm exec vitest run --config scripts/provas/medir_bloco_1/vitest.config.mjs --silent=false
 *
 * ⚠️ FORA DA SUÍTE: o `include` do Vitest do projeto é `tests/`; esta configuração é própria, e só roda à mão.
 * ⚠️ O "ANTES" DO ANDAMENTO É A REGRA ANTIGA, EXATA: `andamentoDaTurma` passou a contar os dias úteis de AMANHÃ
 *    (D-COR-2, FR-014.2), e o `hoje` só entra ali. Chamá-la com a VÉSPERA conta de hoje — a conta de antes.
 * ⚠️ O "ANTES" DA CH PREVISTA É A REGRA ANTIGA DA VIEW: ano e janela só de `disciplinas.previsao_*`, sem média de
 *    reserva. O "depois" é a M2 com a média de reserva da `RN-DIST-02` (`mediaSemanalDaAtribuicao`).
 */
import { readFileSync } from "node:fs";
import { test } from "vitest";

import { andamentoDaTurma } from "@/lib/dominio/andamento-da-turma";
import { situarNaFaixa, type FaixaDoRegime } from "@/lib/dominio/carga-horaria";
import { cargaPorSemana, semanasDoAno, type CargaDaSemana } from "@/lib/dominio/carga-semanal";
import { mediaSemanalDaAtribuicao } from "@/lib/dominio/media-semanal";

/**
 * A regra da época desta medição (17/10/2026): fora da faixa dos DOIS lados. Desde a spec 022 (Bloco 7, item 11) o
 * aviso é só acima (`semanasAcimaDaFaixa`), e esta cópia existe para a medição da spec 016 continuar reproduzível.
 */
function semanasForaDaFaixa(cargas: readonly CargaDaSemana[], faixa: FaixaDoRegime | null) {
  if (faixa === null) return [];
  return cargas.flatMap((c) => {
    const situacao = situarNaFaixa(c.carga, faixa);
    return situacao === "dentro" ? [] : [{ ...c, situacao }];
  });
}

type Turma = {
  codigo: string;
  status: string;
  modalidade: string | null;
  data_termino: string | null;
  prevista: number | null;
  total: number;
  ate_hoje: number;
  regime_padrao_tempos: number | null;
  limite_diario_ead_horas: number | null;
};
type Disciplina = {
  turma_codigo: string;
  cod_disciplina: string;
  ch: number;
  total: number;
  ate_hoje: number;
};
type Atribuicao = {
  instrutor: string;
  turma_codigo: string;
  tempos: number;
  media: number | null;
  antes_ano: number | null;
  antes_ini: string | null;
  antes_fim: string | null;
  depois_ini: string | null;
  depois_fim: string | null;
  origem: string | null;
};
type Faixa = { instrutor_codigo: string; minimo: number | null; maximo: number | null };
type Dados = {
  hoje: string;
  turmas: Turma[];
  disciplinas: Disciplina[];
  atribuicoes: Atribuicao[];
  faixas: Faixa[];
  feriados: string[];
};

const n = (v: number | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

function vespera(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d - 1)).toISOString().slice(0, 10);
}

function resumoDaFaixa(l: readonly { situacao: string }[]): string {
  const acima = l.filter((s) => s.situacao === "acima").length;
  const abaixo = l.filter((s) => s.situacao === "abaixo").length;
  return `${l.length} (${acima} acima, ${abaixo} abaixo)`;
}

test("antes × depois da M1 e da M2", () => {
  const bruto = readFileSync(process.env.DADOS_DA_MEDICAO as string, "utf8");
  const d = JSON.parse(bruto.slice(bruto.indexOf("{"))) as Dados;
  const hoje = d.hoje;
  const ano = Number(hoje.slice(0, 4));
  const saida: string[] = [];

  saida.push(`### M1 — andamento por turma (hoje ${hoje})`);
  saida.push("turma | status | executada | % | dias úteis | saldo (TA) | em atraso");
  for (const t of d.turmas) {
    const regime = {
      regimePadraoTempos: n(t.regime_padrao_tempos),
      limiteDiarioEadHoras: n(t.limite_diario_ead_horas),
    };
    const base = {
      status: t.status,
      modalidade: t.modalidade ?? "",
      dataTermino: t.data_termino,
      prevista: Number(t.prevista ?? 0),
    };
    const a = andamentoDaTurma(
      { ...base, executada: Number(t.total) },
      regime,
      d.feriados,
      vespera(hoje),
    );
    const b = andamentoDaTurma(
      { ...base, executada: Number(t.ate_hoje) },
      regime,
      d.feriados,
      hoje,
    );
    const mudou =
      a.executada !== b.executada ||
      a.saldo !== b.saldo ||
      a.diasUteis !== b.diasUteis ||
      a.emAtraso !== b.emAtraso;
    if (!mudou && t.status !== "ativa") continue;
    saida.push(
      `${t.codigo} | ${t.status} | ${a.executada} → ${b.executada} | ${a.percentual} → ${b.percentual} | ` +
        `${a.diasUteis} → ${b.diasUteis} | ${a.saldo} → ${b.saldo} | ${a.emAtraso} → ${b.emAtraso}`,
    );
  }

  saida.push("", "### M1 — disciplinas da turma cuja execução muda (antes → até hoje)");
  let iguais = 0;
  for (const x of d.disciplinas) {
    if (Number(x.total) === Number(x.ate_hoje)) {
      iguais += 1;
      continue;
    }
    saida.push(`${x.turma_codigo} | ${x.cod_disciplina} | CH ${x.ch} | ${x.total} → ${x.ate_hoje}`);
  }
  saida.push(`(linhas com execução que não mudam: ${iguais})`);

  saida.push("", `### M2 — CH prevista de ${ano} e semanas fora da faixa, por instrutor`);
  saida.push(
    "instrutor | previsto antes → depois | fora da faixa antes → depois | de onde vem a janela nova",
  );
  const porInstrutor = new Map<string, Atribuicao[]>();
  for (const a of d.atribuicoes)
    porInstrutor.set(a.instrutor, [...(porInstrutor.get(a.instrutor) ?? []), a]);
  const faixas = new Map(d.faixas.map((f) => [f.instrutor_codigo, f] as const));
  for (const [codigo, lista] of [...porInstrutor.entries()].sort(
    ([x], [y]) => Number(x) - Number(y),
  )) {
    const f = faixas.get(codigo);
    const faixa =
      f && f.minimo !== null && f.maximo !== null
        ? { minimo: Number(f.minimo), maximo: Number(f.maximo) }
        : null;

    const antesPrevisto = lista
      .filter((a) => a.antes_ano === ano)
      .reduce((s, a) => s + Number(a.tempos), 0);
    const antesFora = semanasForaDaFaixa(
      semanasDoAno(
        cargaPorSemana(
          lista.map((a) => ({
            inicio: a.antes_ini,
            termino: a.antes_fim,
            mediaSemanal: n(a.media),
          })),
        ),
        ano,
      ),
      faixa,
    );

    const depois = lista.map((a) => ({
      ...a,
      anoDepois: a.depois_ini ? Number(a.depois_ini.slice(0, 4)) : null,
      mediaDepois: mediaSemanalDaAtribuicao({
        mediaCadastrada: n(a.media),
        tempos: Number(a.tempos),
        inicio: a.depois_ini,
        termino: a.depois_fim,
      }),
    }));
    const depoisPrevisto = depois
      .filter((a) => a.anoDepois === ano)
      .reduce((s, a) => s + Number(a.tempos), 0);
    const depoisFora = semanasForaDaFaixa(
      semanasDoAno(
        cargaPorSemana(
          depois.map((a) => ({
            inicio: a.depois_ini,
            termino: a.depois_fim,
            mediaSemanal: a.mediaDepois,
          })),
        ),
        ano,
      ),
      faixa,
    );

    if (antesPrevisto === depoisPrevisto && antesFora.length === depoisFora.length) continue;
    const origens = [
      ...new Set(depois.filter((a) => a.antes_ano === null).map((a) => a.origem)),
    ].join(", ");
    saida.push(
      `${codigo} | ${antesPrevisto} → ${depoisPrevisto} | ${resumoDaFaixa(antesFora)} → ${resumoDaFaixa(depoisFora)} | ${origens}`,
    );
  }

  saida.push("", `### M2 — a origem da janela nas ${d.atribuicoes.length} atribuições (depois)`);
  const contagem = new Map<string, number>();
  for (const a of d.atribuicoes)
    contagem.set(String(a.origem), (contagem.get(String(a.origem)) ?? 0) + 1);
  saida.push([...contagem.entries()].map(([k, v]) => `${k}: ${v}`).join(" · "));
  const mudam = d.atribuicoes.filter(
    (a) => a.antes_ini !== a.depois_ini || a.antes_fim !== a.depois_fim,
  );
  saida.push(
    `atribuições cuja janela muda: ${mudam.length} (sem ano antes: ${mudam.filter((a) => a.antes_ano === null).length})`,
  );
  saida.push(
    `linhas com ano nulo: antes ${d.atribuicoes.filter((a) => a.antes_ano === null).length} → depois ${
      d.atribuicoes.filter((a) => a.depois_ini === null).length
    }`,
  );

  console.log(saida.join("\n"));
});
