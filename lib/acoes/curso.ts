"use server";

/**
 * Server Actions de curso (`FR-013`, `FR-014.1`, `FR-016`, `FR-017`, `FR-042`).
 *
 * ⚠️ **SERVER ACTION É ENDPOINT HTTP DE FATO.** `safeParse` na primeira linha de cada uma, sem
 * exceção — quem chama pode ser a tela ou pode ser `curl`.
 *
 * ⚠️ **NENHUMA DELAS USA `service_role`.** Quem decide se a escrita passa é a RLS e o gatilho; esta
 * camada recusa cedo e **traduz** (Princípio XI).
 *
 * ⚠️ **CRIAR CURSO VAI PELA RPC, E É O ÚNICO CAMINHO** (`FR-019.5`). Um `insert into cursos` solto é
 * recusado no `COMMIT` pelo gatilho adiado, com a chave `curso_sem_regime`: curso e vigência `padrao`
 * só existem **juntos**, e duas escritas separadas a partir da aplicação **não são uma transação**.
 *
 * ⚠️ **`UPDATE` BARRADO PELO `USING` DA POLICY NÃO DÁ ERRO NENHUM** — o motor atualiza zero linhas e
 * responde sucesso (gotcha nº 4 do `CLAUDE.md`, do lado da escrita). Por isso toda edição pede a linha
 * de volta e trata **zero linhas como recusa**.
 *
 * ⚠️ **A SITUAÇÃO VIAJA SOZINHA** (`FR-017.4`, `FR-017.7`): `desativarCurso` e `reativarCurso` mandam
 * **só** `status`. O gatilho decide por valor e aceitaria a linha inteira; mandar só a coluna é o que
 * impede uma edição de viajar junto por engano.
 *
 * ⚠️ **A AUDITORIA DA TROCA DE SIGLA É DO BANCO**, por gatilho, em `curso_sigla_historico` — nenhum
 * caminho de edição a esquece (`FR-014.1`). E a troca **não** cascateia para o código das turmas
 * (`FR-014.2`): elas ficam com a sigla antiga, que é o que sai impresso no DSA.
 */
import { revalidatePath } from "next/cache";

import {
  recusaPorAlcance,
  traduzirRecusa,
  type ContextoDaRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDeCriacaoDeCurso,
  esquemaDeEdicaoDeCurso,
  esquemaDeSituacaoDoCurso,
} from "@/lib/validacao/curso";

export type ResultadoDeCurso =
  { readonly ok: true; readonly sigla: string } | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDeCurso => ({ ok: false, erro });

/** A primeira mensagem do Zod — a que diz qual campo falta. */
function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

/** Revalida as duas telas que mostram o curso: o catálogo e a página dele. */
function revalidar(sigla: string): void {
  revalidatePath("/cursos");
  revalidatePath(`/cursos/${sigla}`);
}

/**
 * A situação do curso, lida **antes** de traduzir uma recusa de alcance.
 *
 * ⚠️ **A NEGATIVA DA RLS NÃO DIZ O MOTIVO, E A MESMA NEGATIVA TEM DUAS CAUSAS** — curso inativo e
 * curso fora do escopo chegam iguais. A situação é legível no escopo (`FR-017.1`), e é ela que
 * distingue. Sem esta leitura, quem esbarra num curso inativo recebe "o seu perfil não pode" e vai
 * procurar permissão que já tem.
 */
async function contextoDaSigla(sigla: string, oQueNaoRecebe: string): Promise<ContextoDaRecusa> {
  const supabase = await criarClienteDeServidor();
  const { data } = await supabase.from("cursos").select("status").eq("codigo", sigla).maybeSingle();
  return { sigla, oQueNaoRecebe, cursoInativo: data?.status === "inativo" };
}

/** Cria o curso e a vigência `padrao` dele, numa transação só (`FR-013`, `FR-019.5`). */
export async function criarCurso(entrada: unknown): Promise<ResultadoDeCurso> {
  const conferido = esquemaDeCriacaoDeCurso.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { regime, ...curso } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("criar_curso_com_regime", {
    p_curso: curso,
    p_regime: regime,
  });

  if (error) {
    return falha(traduzirRecusa(error as ErroDoBanco, { sigla: curso.codigo }));
  }

  revalidar(curso.codigo);
  return { ok: true, sigla: curso.codigo };
}

/**
 * Edita o curso. **Sem `status`**, e pedindo a linha de volta.
 *
 * ⚠️ **O DESTINO É A SIGLA NOVA** quando ela muda (`FR-016.1`): quem acabou de renomear o curso não
 * pode cair numa página que não existe mais. Quem devolve a sigla é esta ação.
 */
export async function editarCurso(siglaAtual: string, entrada: unknown): Promise<ResultadoDeCurso> {
  const conferido = esquemaDeEdicaoDeCurso.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("cursos")
    .update(conferido.data)
    .eq("codigo", siglaAtual)
    .select("codigo");

  if (error) {
    const contexto = await contextoDaSigla(siglaAtual, "alterações");
    return falha(
      traduzirRecusa(error as ErroDoBanco, { ...contexto, sigla: conferido.data.codigo }),
    );
  }

  /*
   * ⚠️ ZERO LINHAS É RECUSA, e não sucesso vazio. Sem isto, a tela diria "salvo" e a pessoa
   * descobriria depois que nada mudou.
   */
  if (!data || data.length === 0) {
    return falha(recusaPorAlcance(await contextoDaSigla(siglaAtual, "alterações")));
  }

  revalidar(siglaAtual);
  revalidar(conferido.data.codigo);
  return { ok: true, sigla: conferido.data.codigo };
}

/** Muda só a situação do curso — o que as duas ações abaixo compartilham. */
async function mudarSituacao(
  entrada: unknown,
  situacao: "ativo" | "inativo",
  oQueNaoRecebe: string,
): Promise<ResultadoDeCurso> {
  const conferido = esquemaDeSituacaoDoCurso.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { sigla } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("cursos")
    .update({ status: situacao })
    .eq("codigo", sigla)
    .select("codigo");

  if (error) {
    return falha(traduzirRecusa(error as ErroDoBanco, await contextoDaSigla(sigla, oQueNaoRecebe)));
  }
  if (!data || data.length === 0) {
    return falha(recusaPorAlcance(await contextoDaSigla(sigla, oQueNaoRecebe)));
  }

  revalidar(sigla);
  return { ok: true, sigla };
}

/** Tira o curso de oferta (`FR-017`, `FR-017.4`). Nada é apagado — é exclusão lógica. */
export async function desativarCurso(entrada: unknown): Promise<ResultadoDeCurso> {
  return mudarSituacao(entrada, "inativo", "desativação");
}

/** Devolve o curso à oferta (`FR-017.7`). */
export async function reativarCurso(entrada: unknown): Promise<ResultadoDeCurso> {
  return mudarSituacao(entrada, "ativo", "reativação");
}
