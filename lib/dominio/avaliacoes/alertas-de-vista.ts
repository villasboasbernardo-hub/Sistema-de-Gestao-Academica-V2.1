/**
 * Os alertas de vista — as atrasadas e as que vencem em breve (spec 014, FR-054, `RF-INI-04`, `RF-CURSO-06`).
 *
 * > *"uma vista de prova que ultrapasse 7 dias corridos após a aplicação sem ter sido registrada como realizada
 * > é marcada Atrasada."* — `RN-AVAL-01`, documento 04
 *
 * ⚠️ **QUEM DECIDE A SITUAÇÃO É `situacaoDaAvaliacao`** (R-8, ponto único): este módulo só filtra o que ela diz.
 *    «Atrasada» é a situação dela; «vence em breve» é a avaliação EM ANDAMENTO cujo prazo (aplicação + `prazoDias`)
 *    cai nos próximos `venceEmBreveDias` dias corridos (`avaliacao.vence_em_breve_dias`, A-5) — hoje incluído.
 * ⚠️ **SÓ ENTRA A PROVA LIGADA A ITEM DO CURRÍCULO** *(decisão de Bernardo Villas Boas, 14/10/2026)*: medido no ensaio da
 *    rodada da leva 2 (cópia `remoto-20261014-191624.sql`), das 44 vistas que o `/inicio` dava por atrasadas, **6** eram
 *    de prova ligada a item com tempo de vista — atrasadas de verdade — e **38** de prova SEM item, das quais não se
 *    sabe se o currículo prevê vista. Estas vão para a lista de erros de planilha; o alerta conta só as primeiras.
 *    A situação da avaliação (`situacaoDaAvaliacao`) NÃO muda: o quadro da turma continua mostrando a prova sem item.
 * ⚠️ **NUNCA BLOQUEIA** (`RN-DEG-02`): é aviso de tela.
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II).
 */
import { situacaoDaAvaliacao, type NaturezaDaAvaliacao } from "./situacao";

export type AvaliacaoParaAlerta = {
  id: string;
  turma: string;
  disciplina: string;
  tipo: string;
  natureza: NaturezaDaAvaliacao;
  estadoDoRegistro: string;
  aplicacao: string | null;
  sessoesDeVista: readonly string[];
  temItemDeVista: boolean;
  /** A avaliação aponta um item do currículo (`avaliacao_curriculo_id`). Sem item, não há alerta. */
  itemLigado: boolean;
};

export type AlertaDeVista = {
  id: string;
  turma: string;
  disciplina: string;
  tipo: string;
  aplicacao: string;
  tipoDoAlerta: "atrasada" | "vence_em_breve";
  /** A data-limite da vista (aplicação + prazo). */
  venceEm: string;
};

function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a!, m! - 1, d! + dias)).toISOString().slice(0, 10);
}

export function alertasDeVista(
  avaliacoes: readonly AvaliacaoParaAlerta[],
  parametros: { prazoDias: number; venceEmBreveDias: number; hoje: string },
): AlertaDeVista[] {
  const limiteDoBreve = somarDias(parametros.hoje, parametros.venceEmBreveDias);
  const alertas: AlertaDeVista[] = [];
  for (const a of avaliacoes) {
    if (a.natureza === "od" || a.aplicacao === null || !a.itemLigado) continue;
    const situacao = situacaoDaAvaliacao({
      natureza: a.natureza,
      estadoDoRegistro: a.estadoDoRegistro,
      aplicacao: a.aplicacao,
      sessoesDeVista: a.sessoesDeVista,
      temItemDeVista: a.temItemDeVista,
      prazoDias: parametros.prazoDias,
      hoje: parametros.hoje,
      terminoDaTurma: null,
    });
    const venceEm = somarDias(a.aplicacao, parametros.prazoDias);
    const base = {
      id: a.id,
      turma: a.turma,
      disciplina: a.disciplina,
      tipo: a.tipo,
      aplicacao: a.aplicacao,
      venceEm,
    };
    if (situacao === "atrasada") alertas.push({ ...base, tipoDoAlerta: "atrasada" });
    else if (situacao === "em_andamento" && venceEm <= limiteDoBreve) {
      alertas.push({ ...base, tipoDoAlerta: "vence_em_breve" });
    }
  }
  // Atrasadas primeiro; dentro de cada grupo, a que vence (ou venceu) antes.
  return alertas.sort(
    (x, y) =>
      Number(x.tipoDoAlerta !== "atrasada") - Number(y.tipoDoAlerta !== "atrasada") ||
      x.venceEm.localeCompare(y.venceEm) ||
      x.turma.localeCompare(y.turma),
  );
}
