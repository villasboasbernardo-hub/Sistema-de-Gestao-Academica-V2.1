/**
 * Validação de entrada das Server Actions de sala (`FR-029.5`, `FR-029.6`).
 *
 * ⚠️ **NATUREZA OBRIGATÓRIA, SEM PADRÃO** (`FR-029.6`). Física e ambiente virtual mudam a leitura de
 * toda regra que olha para a sala; deixar uma delas como padrão silencioso gravaria escolha que
 * ninguém fez. O `CHECK` `config_listas_sala_com_natureza` é quem garante por qualquer caminho.
 *
 * ⚠️ **NÃO HÁ CAMPO DE RENOMEAR, E ISSO É DECISÃO** (`FR-029.5`). O nome da sala é o valor gravado em
 * `turmas.sala_alocada` — renomeá-lo deixaria as turmas apontando para um nome que não existe mais.
 * Sala errada se **desativa** e se acrescenta outra; o histórico fica de pé.
 */
import { z } from "zod";

export const NATUREZAS_DE_SALA = ["fisica", "virtual"] as const;

const nome = z
  .string({ error: "Nome da sala é obrigatório." })
  .trim()
  .min(1, "Nome da sala é obrigatório.");

export const esquemaDeSala = z.object({
  valor: nome,
  natureza: z.enum(NATUREZAS_DE_SALA, {
    error: "Informe se a sala é física ou ambiente virtual.",
  }),
});

/** O que desativar e reativar precisam, e nada mais. */
export const esquemaDeSituacaoDaSala = z.object({ valor: nome });

export type SalaParaGravar = z.infer<typeof esquemaDeSala>;
