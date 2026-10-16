/**
 * A entrada de «juntar como sessão da mesma prova» (spec 014, decisão de Bernardo Villas Boas, 16/10/2026: *"na aba
 * Avaliações da turma a ação "juntar como sessão da mesma prova" (Encarregado/Admin, com trilha)"*).
 *
 * ⚠️ Só os dois identificadores: a turma, a disciplina e as datas o BANCO lê e confere
 *    (`public.juntar_como_sessao`) — mandar mais seria deixar o cliente dizer o que o banco já sabe.
 */
import { z } from "zod";

export const esquemaDeJuntarSessao = z
  .object({
    provaId: z.uuid({ error: "Escolha a prova." }),
    avaliacaoId: z.uuid({ error: "Avaliação inválida." }),
  })
  .refine((e) => e.provaId !== e.avaliacaoId, {
    message: "Escolha duas avaliações diferentes: a prova e a que vira sessão dela.",
    path: ["provaId"],
  });

export type EntradaDeJuntarSessao = z.infer<typeof esquemaDeJuntarSessao>;
