import "server-only";

/**
 * A matriz de permissões, lida do banco — a MESMA que as policies consultam.
 *
 * ⚠️ NENHUMA LISTA DE PERFIS OU DE RECURSOS ESCRITA AQUI. Seria a segunda fonte de verdade que o
 * FR-021 proíbe, e ela divergiria da primeira no dia em que alguém alterasse `perfil_permissao` —
 * a tela continuaria escondendo o que o banco passou a permitir, ou oferecendo o que ele passou a
 * negar. Os tipos vêm do contrato gerado (`lib/tipos/database.ts`), não de constantes.
 *
 * ⚠️ ISTO NÃO É A PROTEÇÃO. É a cortesia de não oferecer o que vai falhar. Quem protege é a RLS,
 * e o FR-022 exige que a ação invocada por fora da tela seja negada pelo banco — provado em
 * teste separado. Uma tela que confia nesta função e um banco sem policy é um sistema aberto.
 *
 * A leitura de `perfil_permissao` é aberta a qualquer sessão autenticada por decisão do documento
 * 22 §6.4: a interface precisa saber quais botões oferecer, e a matriz não contém dado sensível —
 * contém a definição pública das regras.
 */
import { criarClienteDeServidor } from "@/lib/supabase/server";

export type Permissoes = ReadonlySet<string>;

const chave = (recurso: string, acao: string) => `${recurso}:${acao}`;

/**
 * Carrega as permissões do perfil informado. Chamada UMA VEZ por requisição, no layout de `(app)`.
 *
 * Perfil nulo (sem sessão, sem linha, ou conta inativa) devolve conjunto vazio: nada é oferecido.
 * Falha de leitura devolve o mesmo — degradar para "nada oferecido" é seguro, degradar para "tudo
 * oferecido" seria oferecer o que o banco vai negar (RN-DEG-01).
 */
export async function permissoesDoPerfil(perfil: string | null): Promise<Permissoes> {
  if (!perfil) return new Set<string>();

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("perfil_permissao")
    .select("recurso, acao, permitido")
    .eq("perfil", perfil)
    .eq("permitido", true);

  if (error || !data) return new Set<string>();
  return new Set(data.map((l) => chave(l.recurso, l.acao)));
}

/** `pode('instrutores', 'editar')` — o mesmo par que `app.pode()` avalia no banco. */
export function pode(permissoes: Permissoes, recurso: string, acao: string): boolean {
  return permissoes.has(chave(recurso, acao));
}
