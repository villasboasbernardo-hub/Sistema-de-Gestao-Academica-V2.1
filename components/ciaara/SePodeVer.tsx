/**
 * Mostra o filho apenas se a matriz permitir o par (recurso, ação).
 *
 * ⚠️ ISTO NÃO É A PROTEÇÃO, E O NOME NÃO DEVE SUGERIR QUE SEJA. É a cortesia de não oferecer o
 * que vai falhar. Quem protege é a RLS: o FR-022 exige que a ação invocada por fora da tela seja
 * negada **pelo banco**, e isso é provado em teste separado do teste que verifica a ocultação.
 * Uma tela que confia neste componente e um banco sem policy é um sistema aberto.
 *
 * ⚠️ OCULTA, NÃO DESABILITA (FR-020). Botão desabilitado ensina que a função existe e que a
 * pessoa não a tem — informação que ela não precisa, e que num sistema com nove perfis vira
 * ruído em toda tela. `RF-AUTH-04` diz "ocultos automaticamente", não "desabilitados".
 *
 * ⚠️ As permissões chegam por parâmetro, vindas de `lib/autorizacao/matriz.ts`, carregadas UMA VEZ
 * por requisição no layout de `(app)`. Este componente não consulta nada: se consultasse, cada
 * botão da tela produziria uma ida ao banco.
 */
import { pode, type Permissoes } from "@/lib/autorizacao/matriz";

export function SePodeVer({
  permissoes,
  recurso,
  acao,
  children,
}: {
  readonly permissoes: Permissoes;
  readonly recurso: string;
  readonly acao: "ler" | "criar" | "editar" | "desativar";
  readonly children: React.ReactNode;
}) {
  if (!pode(permissoes, recurso, acao)) return null;
  return <>{children}</>;
}
