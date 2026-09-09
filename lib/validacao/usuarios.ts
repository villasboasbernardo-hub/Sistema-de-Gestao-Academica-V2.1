/**
 * Validação de entrada das Server Actions de usuário.
 *
 * ⚠️ OS DOMÍNIOS VÊM DO CONTRATO DE TIPOS, NÃO DE LISTA ESCRITA À MÃO. `Constants` é gerado por
 * `pnpm db:tipos` a partir do banco; uma lista literal aqui seria a segunda fonte de verdade que o
 * FR-021 proíbe, e ela divergiria no dia em que alguém acrescentasse um perfil — a tela recusaria
 * um valor que o banco aceita, ou aceitaria um que ele recusa. O CI reprova se o contrato divergir
 * do schema, então esta lista não tem como envelhecer sem alguém saber.
 */
import { z } from "zod";

import { Constants } from "@/lib/tipos/database";

const PERFIS = Constants.public.Enums.perfil_usuario;
const ESCOPOS = Constants.public.Enums.escopo_curso;

/** E-mail normalizado: minúsculo e sem espaço. Duas contas que só diferem na caixa são uma só. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.")
  .max(254, "E-mail longo demais.");

export const esquemaDeConvite = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo.").max(200),
  email,
  perfil: z.enum(PERFIS, { message: "Perfil fora do domínio." }),
  escopoCurso: z.enum(ESCOPOS, { message: "Escopo fora do domínio." }),
  // Vínculos de curso: só fazem sentido para quem tem escopo restrito, mas a validação de
  // coerência é do banco (a policy) — aqui só se garante que são identificadores.
  cursos: z.array(z.string().uuid()).default([]),
});

export const esquemaDeReenvio = z.object({ usuarioId: z.string().uuid() });

export const esquemaDeDesativacao = z.object({ usuarioId: z.string().uuid() });

export const esquemaDeEdicao = z.object({
  usuarioId: z.string().uuid(),
  perfil: z.enum(PERFIS, { message: "Perfil fora do domínio." }),
  escopoCurso: z.enum(ESCOPOS, { message: "Escopo fora do domínio." }),
  cursos: z.array(z.string().uuid()).default([]),
});

export const esquemaDeRecuperacao = z.object({ email });

export type DadosDeConvite = z.infer<typeof esquemaDeConvite>;
export type DadosDeEdicao = z.infer<typeof esquemaDeEdicao>;
