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

/**
 * O NOME de outra conta (`FR-040`), em esquema próprio.
 *
 * ⚠️ **SEPARADO DE `esquemaDeEdicao` DE PROPÓSITO, porque são duas ações de auditoria distintas** —
 * `editar_nome` e `editar_perfil` (`FR-047`). Um esquema só mandaria sempre os dois campos, e a
 * trilha passaria a registrar troca de perfil em toda correção de grafia de nome.
 *
 * ⚠️ **É `nome_exibicao`, NÃO `nome`** — a mesma distinção do próprio cadastro: `nome` é o que o
 * convite gravou e costuma ser o nome de registro; `nome_exibicao` é como a pessoa aparece na tela.
 */
export const esquemaDeEdicaoDeNome = z.object({
  usuarioId: z.string().uuid(),
  nomeExibicao: z
    .string({ error: "Informe o nome de exibição." })
    .trim()
    .min(2, "O nome de exibição precisa ter pelo menos 2 caracteres.")
    .max(120, "O nome de exibição passou de 120 caracteres."),
});

/** Redefinir a senha de outra conta (`FR-033`). Só o alvo — a senha é gerada no servidor. */
export const esquemaDeRedefinicao = z.object({ usuarioId: z.string().uuid() });

export const esquemaDeRecuperacao = z.object({ email });

export type DadosDeConvite = z.infer<typeof esquemaDeConvite>;
export type DadosDeEdicao = z.infer<typeof esquemaDeEdicao>;
export type DadosDeEdicaoDeNome = z.infer<typeof esquemaDeEdicaoDeNome>;
