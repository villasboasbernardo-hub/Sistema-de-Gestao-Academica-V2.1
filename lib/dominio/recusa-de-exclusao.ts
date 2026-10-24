/**
 * A frase da recusa `23503` (`registro_com_historico`) das exclusões do Bloco 10 — turma, linha do calendário, regime de
 * horário, item de avaliação do currículo e sala (spec 025, D-COR-6 e D-30).
 *
 * ⚠️ **A LISTA DO QUE PRENDE VEM DA MENSAGEM DO BANCO** (`turma_com_historico: a, b`): a recusa tem de dizer **o quê**,
 *    que é a única informação útil ali, e oferecer a saída — Arquivar a turma, Desativar os demais.
 * ⚠️ As de disciplina e UE continuam em `exclusao-de-disciplina.ts`; a de instrutor, em `exclusao-de-instrutor.ts`.
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase`.
 */
import { chavesDaRecusaDoFeriado, estadoDaExclusaoDoFeriado } from "./exclusao-de-feriado";
import {
  estadoDaExclusaoDaSala,
  estadoDaExclusaoDoItem,
  estadoDaExclusaoDoRegime,
} from "./exclusao-de-partes";
import { chavesDaRecusaDaTurma, estadoDaExclusaoDaTurma } from "./exclusao-de-turma";
import { chavesDaRecusa } from "./exclusao-permanente";

/** A frase, ou `null` quando a mensagem não é de nenhuma das cinco. */
export function recusaDeExclusao(mensagem: string): string | null {
  if (mensagem.includes("turma_com_historico:")) {
    const { detalhe } = estadoDaExclusaoDaTurma(chavesDaRecusaDaTurma(mensagem));
    return `A turma não pode ser excluída. ${detalhe ?? ""} Arquive em vez de excluir — nada se perde.`.replace(
      /\s+/g,
      " ",
    );
  }
  if (mensagem.includes("feriado_com_historico:")) {
    const { detalhe } = estadoDaExclusaoDoFeriado(chavesDaRecusaDoFeriado(mensagem));
    return `A linha do calendário não pode ser excluída. ${detalhe ?? ""} Desative em vez de excluir.`.replace(
      /\s+/g,
      " ",
    );
  }
  const casos = [
    ["regime_com_historico:", "O regime de horário", estadoDaExclusaoDoRegime],
    ["item_com_historico:", "O item de avaliação", estadoDaExclusaoDoItem],
    ["sala_com_historico:", "A sala", estadoDaExclusaoDaSala],
  ] as const;
  for (const [prefixo, nome, estado] of casos) {
    if (mensagem.includes(prefixo)) {
      const { detalhe } = estado(chavesDaRecusa(mensagem, prefixo));
      return `${nome} não pode ser excluído. ${detalhe ?? ""} Desative em vez de excluir.`
        .replace("A sala não pode ser excluído", "A sala não pode ser excluída")
        .replace(/\s+/g, " ");
    }
  }
  return null;
}
