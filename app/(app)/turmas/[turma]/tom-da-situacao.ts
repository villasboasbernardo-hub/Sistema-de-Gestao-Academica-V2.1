/**
 * O tom de cada situação de avaliação — a aba Avaliações da ficha da turma e a do acompanhamento do DSA (Bloco 16,
 * ajuste D) usam o mesmo, para a mesma situação ter a mesma cor nas duas. Só os tons que já existem
 * (`lib/design/vocabulario.ts`); o texto do selo é quem distingue (`RNF-USA-05`).
 */
import type { SituacaoDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";

export const TOM_DA_SITUACAO_DA_AVALIACAO: Readonly<
  Record<
    SituacaoDaAvaliacao,
    "executado" | "planejado" | "atrasado" | "conflito" | "adiantado" | "inativo"
  >
> = {
  concluida: "executado",
  em_andamento: "adiantado",
  pendente: "planejado",
  atrasada: "atrasado",
  sem_correspondencia: "conflito",
  /* Bloco 16 (ajuste D): só pelo ajuste manual — o tom de quem saiu da conta. */
  cancelada: "inativo",
};
