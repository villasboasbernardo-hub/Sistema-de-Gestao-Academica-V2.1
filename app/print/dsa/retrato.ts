/**
 * O RETRATO da semana do DSA — spec 024 (Bloco 9, RP-1 a RP-4): o documento que o papel imprime, montado só com o
 * SALVO (RP-8), num ponto único para a publicação (o que se grava), a impressão (o que se reimprime) e a tela (o aviso
 * *"alterado desde a publicação"*).
 *
 * ⚠️ **O RETRATO GUARDA O `hoje` COM QUE FOI MONTADO**: o documento de hoje se compara com ele montado no MESMO dia, e
 *    a passagem do tempo não vira *"alterado"*.
 * ⚠️ **A COMPARAÇÃO DO RP-4 É DO CONTEÚDO DA SEMANA** (D-8): cabeçalho, dias, grade, assinaturas e legenda. O quadro de
 *    CH é o ACUMULADO até a semana (`RN-CRONOS-03`) e muda com o lançamento de semanas anteriores — compará-lo acusaria
 *    "alterado" toda vez que outra semana fosse preenchida.
 */
import "server-only";

import type { criarClienteDeServidor } from "@/lib/supabase/server";

import { COLUNAS_DA_TURMA_DO_DSA } from "../../(app)/turmas/[turma]/dsa/consulta";
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "../../(app)/turmas/[turma]/dsa/leitura";
import { montarDocumentoDoDsa, type DadosDoDocumento } from "./documento";

export type RetratoDaSemana = {
  /** O «hoje» com que o documento foi montado. */
  readonly hoje: string;
  readonly dados: DadosDoDocumento;
};

/** O documento da semana, só com o salvo, como o papel o imprime. `null` se a turma não é alcançada. */
export async function montarRetratoDaSemana(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  entrada: {
    readonly turmaId: string;
    readonly ano: number;
    readonly numero: number;
    readonly hoje: string;
  },
): Promise<RetratoDaSemana | null> {
  const { data: turma } = await supabase
    .from("turmas")
    .select(COLUNAS_DA_TURMA_DO_DSA)
    .eq("id", entrada.turmaId)
    .maybeSingle();
  if (!turma) return null;
  const linha = turma as unknown as {
    codigo: string;
    curso_id: string;
    data_inicio: string | null;
    data_termino: string | null;
    alunos: number | null;
  };
  const [lida, extras] = await Promise.all([
    lerSemanaDoDsa(supabase, {
      turmaId: entrada.turmaId,
      cursoId: linha.curso_id,
      ano: entrada.ano,
      numero: entrada.numero,
      sabadoPedido: false,
      hoje: entrada.hoje,
    }),
    lerExtrasDaImpressao(supabase, { turmaId: entrada.turmaId, cursoId: linha.curso_id }),
  ]);
  return {
    hoje: entrada.hoje,
    dados: montarDocumentoDoDsa({
      codigoDaTurma: linha.codigo,
      turma: linha,
      cursoId: linha.curso_id,
      escolha: { ano: entrada.ano, numero: entrada.numero },
      lida,
      extras,
      hoje: entrada.hoje,
    }),
  };
}

/** O que o RP-4 compara: o conteúdo da semana, sem o quadro acumulado nem a contagem «à frente» (D-8). */
export function conteudoDaSemana(dados: DadosDoDocumento): unknown {
  return {
    curso: dados.curso,
    semana: dados.semana,
    semanaDoCurso: dados.semanaDoCurso,
    primeiro: dados.primeiro,
    ultimo: dados.ultimo,
    alunos: dados.alunos,
    dias: dados.dias,
    grade: dados.grade,
    legenda: dados.legenda,
    assinaturas: dados.assinaturas,
  };
}
