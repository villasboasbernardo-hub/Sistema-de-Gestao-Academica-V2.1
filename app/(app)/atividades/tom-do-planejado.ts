/**
 * Bloco 18 (spec 033, RA-5 e RA-6) — o tom do selo da situação da AEC prevista e da APOINST, compartilhado entre a
 * ficha da turma, o acompanhamento do DSA e o módulo Atividades. Só tons que já existem (`STATUS`), ao lado do mapa das
 * avaliações (`turmas/[turma]/tom-da-situacao.ts`), no mesmo desenho: o cumprido é *executado*, o que anda é
 * *adiantado*, o que falta é *planejado* e o que passou do prazo é *atrasado*.
 *
 * ⚠️ Sem marcador de cliente: é dado, lido pelas folhas e pelo servidor.
 */
import type { SituacaoDaApoinst } from "@/lib/dominio/atividades/apoinst";
import type { SituacaoDaPrevista } from "@/lib/dominio/atividades/previstas";
import type { Tom } from "@/lib/design/vocabulario";

export const TOM_DA_SITUACAO_DA_PREVISTA: Readonly<Record<SituacaoDaPrevista, Tom>> = {
  a_cumprir: "planejado",
  em_andamento: "adiantado",
  cumprida: "executado",
  cumprida_a_mao: "executado",
};

export const TOM_DA_SITUACAO_DA_APOINST: Readonly<Record<SituacaoDaApoinst, Tom>> = {
  planejada: "planejado",
  em_andamento: "adiantado",
  concluida: "executado",
  atrasada: "atrasado",
};
