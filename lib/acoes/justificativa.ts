/**
 * RC-6 — a justificativa da correção VIAJA no cabeçalho `x-justificativa-de-correcao` da gravação, que o PostgREST
 * expõe ao banco (`request.headers`) e o gatilho `app.guardar_curriculo_em_uso` lê (`app.justificativa_de_correcao()`).
 *
 * ⚠️ POR QUE O CABEÇALHO (D-26, revista no PR 2): toda tela de edição do currículo já grava pelo seu caminho, com a RLS
 *    dela; mandar a justificativa junto, em vez de trocar cada gravação por uma função, não muda quem pode gravar nem o
 *    que é gravado — só acrescenta o motivo.
 * ⚠️ BASE64 DO TEXTO EM UTF-8: cabeçalho HTTP não leva acento, e "correção" é a primeira palavra de muita justificativa.
 * ⚠️ Sem `"use server"`: não é ação, é ajudante das ações (nenhum componente o importa).
 */
import "server-only";

export const CABECALHO_DA_JUSTIFICATIVA = "x-justificativa-de-correcao";

/** Põe a justificativa na gravação, quando há uma. Sem ela, a consulta volta igual. */
export function comJustificativa<T>(consulta: T, justificativa: string | null | undefined): T {
  if (!justificativa) return consulta;
  return (consulta as unknown as { setHeader(nome: string, valor: string): T }).setHeader(
    CABECALHO_DA_JUSTIFICATIVA,
    Buffer.from(justificativa, "utf8").toString("base64"),
  );
}

/** O banco recusou porque a correção do currículo em uso precisa de justificativa (o trio, sem ela). */
export function pedeJustificativa(
  erro: { readonly hint?: string | null } | null | undefined,
): boolean {
  return erro?.hint === "justificativa_obrigatoria";
}
