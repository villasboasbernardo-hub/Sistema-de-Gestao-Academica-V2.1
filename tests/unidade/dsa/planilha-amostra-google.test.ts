/**
 * A amostra da conferência no Google Planilhas — T053 da spec 015 (`DP-4`, R-12).
 *
 * ⚠️ **POR QUE UMA AMOSTRA, E NÃO O ARQUIVO DE 50 SEMANAS:** nesta máquina não há sincronização do
 * Google Drive, e o conector só recebe o arquivo DENTRO da chamada, em base64 — 1,26 MB não cabem. A
 * amostra tem UMA semana e um regime de 2 TA (a grade fica com 3 por dia), e exercita cada PADRÃO de
 * fórmula da pasta: o bloco que atravessa o almoço, a mesma chave com códigos diferentes, a avaliação
 * PM, o Estudo Individual fixo e o lançado, o feriado de dia inteiro, a aula sem UE e a sem posição.
 * O volume se prova no Excel, com o arquivo inteiro (T052).
 *
 * ⚠️ **DADO SINTÉTICO** — a turma de teste de `planilha/sintetico.ts`; o arquivo sai para a pasta
 * temporária da máquina, nunca para o repositório.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { relogioDoRegime, type Relogio } from "@/lib/dominio/dsa/horario-do-bloco";
import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import { letrasDaColuna } from "@/lib/planilha/formula";
import { escreverXlsx } from "@/lib/planilha/ooxml";
import { calcularCaches, celulasComErro, chaveDaCelula } from "@/lib/planilha/pasta";

import { divergenciasDoPapel } from "./planilha/comparar-com-o-papel";
import { lerImpressao, precalcular } from "./planilha/leitura-da-pasta";
import {
  DISCIPLINAS,
  insumoSintetico,
  numeroDaSemana,
  papelDaSemana,
  type Lancamento,
  type SemanaSintetica,
} from "./planilha/sintetico";
import { legendaDeTecnicas, tabelaDeCh } from "@/lib/dominio/dsa/impressao";
import { TECNICAS } from "./planilha/sintetico";

export const PASTA_DA_AMOSTRA = join(tmpdir(), "ciaara-planilha-google");

const CURTO = relogioDoRegime({
  regimeTempos: 2,
  taDuracaoMin: 45,
  intervaloManhaMin: 5,
  intervaloTardeMin: 5,
  horaInicioManha: "11:00",
  horaInicioTarde: "13:00",
  configuracaoHorarioId: null,
}) as Relogio;

const aula = (
  id: string,
  dia: number,
  ta: number | null,
  tempos: number,
  disciplina: string,
  ue: number | null,
): Lancamento => ({
  id,
  dia,
  ta: ta as number,
  tempos,
  origem: "aula",
  disciplina,
  ...(ue === null ? {} : { ue }),
  conteudo: ue === null ? "Aula sem UE" : `Tópico ${disciplina}-${ue}`,
  tecnica: ue === null ? null : "Aula expositiva",
  instrutor: "CT Instrutor Alfa",
  local: "Sala 1",
});

const SEMANA: SemanaSintetica = {
  numero: 15,
  relogio: CURTO,
  feriados: [{ dia: 2, descricao: "Feriado de teste" }],
  lancamentos: [
    aula("g1", 0, 1, 2, "I", 1),
    aula("g2", 1, 1, 1, "I", 2),
    aula("g3", 1, 2, 1, "I", 2),
    {
      id: "g4",
      dia: 2,
      ta: 1,
      tempos: 1,
      origem: "avaliacao",
      disciplina: "I",
      conteudo: "Prova",
      tecnica: "Prova mista",
      instrutor: "CT Instrutor Alfa",
      local: "Sala 1",
      tipoAvaliacao: "Prova",
    },
    aula("g5", 3, 1, 2, "II", null),
    {
      id: "g6",
      dia: 4,
      ta: 1,
      tempos: 1,
      origem: "atividade_nao_letiva",
      disciplina: null,
      conteudo: "Estudo individual",
      tecnica: null,
      instrutor: null,
      local: "Biblioteca",
      categoria: "Estudo_Individual",
    },
    {
      id: "g7",
      dia: 4,
      ta: 2,
      tempos: 1,
      origem: "atividade_nao_letiva",
      disciplina: null,
      conteudo: "Atividade de teste",
      tecnica: null,
      instrutor: null,
      local: null,
      categoria: "TAD",
    },
    aula("g8", 0, null, 2, "IX", 1),
  ],
};

describe("T053 · a amostra do Google Planilhas", () => {
  it("monta sem erro, bate com o papel e sai para a pasta temporária", () => {
    const base = insumoSintetico({ temSabado: false });
    const primeira = base.semanas.find((s) => s.semana.numero === 15);
    if (primeira === undefined) throw new Error("a semana 15 sumiu da turma sintética");
    const { dias } = papelDaSemana(SEMANA, true);
    const fatos = new Map(base.fatos);
    for (const l of SEMANA.lancamentos) {
      fatos.set(`${l.id}|${primeira.seisDias[l.dia]}|${l.ta ?? "-"}`, {
        origem: l.origem,
        codigo: `COD-${l.id}`,
        disciplinaCodigo: l.disciplina,
        unidadeNumero: l.ue ?? null,
        tipoAvaliacao: l.tipoAvaliacao ?? null,
        categoria: l.categoria ?? null,
      });
    }
    const insumo = {
      ...base,
      fatos,
      semanas: [
        {
          ...primeira,
          relogio: CURTO,
          dias,
          semPosicao: [
            {
              fatoId: "g8",
              data: primeira.seisDias[0] as string,
              taInicial: null,
              tempos: 2,
              disciplina: "IX",
              conteudo: "Tópico IX-1",
              local: "Sala 1",
              te: "AE",
              instrutor: "CT Instrutor Alfa",
              motivo: "sem TA no sistema",
            },
          ],
        },
      ],
      semanaInicial: 0,
    };
    const { pasta, impressao: g } = montarPlanilhaComGeometria(insumo);
    const caches = calcularCaches(pasta);
    expect(celulasComErro(caches)).toEqual([]);
    expect(g.tempos).toBe(3);

    /* A amostra é o papel do sistema — a mesma prova do arquivo inteiro. */
    const { dias: doPapel, grade } = papelDaSemana(SEMANA, false);
    const execucao = DISCIPLINAS.map((d) => ({
      codigo: d.codigo,
      nome: d.nome,
      prevista: d.chPrevista,
      cumprida: SEMANA.lancamentos
        .filter(
          (l) => l.ta !== null && l.disciplina === d.codigo && l.origem !== "atividade_nao_letiva",
        )
        .reduce((n, l) => n + l.tempos, 0),
    }));
    const lida = lerImpressao(pasta, g, primeira.rotulo, precalcular(pasta));
    expect(
      divergenciasDoPapel(lida, g, {
        numero: numeroDaSemana(15),
        alunos: 12,
        dias: doPapel,
        grade,
        quadroDeCh: tabelaDeCh(doPapel, execucao),
        legenda: legendaDeTecnicas(doPapel, TECNICAS),
        assinaturas: primeira.assinaturas,
      }),
    ).toEqual([]);

    const arquivo = escreverXlsx(pasta);
    mkdirSync(PASTA_DA_AMOSTRA, { recursive: true });
    writeFileSync(join(PASTA_DA_AMOSTRA, "planilha.xlsx"), arquivo);
    writeFileSync(join(PASTA_DA_AMOSTRA, "planilha.b64"), Buffer.from(arquivo).toString("base64"));
    const abas = pasta.abas.map((a) => ({
      nome: a.nome,
      celulas: [...a.celulas].flatMap(([linha, cs]) =>
        [...cs]
          .filter(([, c]) => c.formula !== undefined)
          .map(([coluna]) => [
            `${letrasDaColuna(coluna)}${linha}`,
            caches.get(chaveDaCelula(a.nome, linha, coluna)) ?? null,
          ]),
      ),
    }));
    writeFileSync(join(PASTA_DA_AMOSTRA, "gabarito.json"), JSON.stringify({ abas }));
    expect(arquivo.length).toBeLessThan(40_000);
  });
});
