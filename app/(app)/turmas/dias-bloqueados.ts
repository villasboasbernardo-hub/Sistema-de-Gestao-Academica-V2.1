/**
 * Os dias bloqueados no DSA daqui para a frente — o dia parado e o TR bloqueante, da turma ou de todas (Bloco 17,
 * spec 032, `RN-SALDO-01`): eles não contam como dia útil no saldo. A regra de quais contam é de
 * `datasBloqueadasDaTurma` (`lib/dominio/andamento-da-turma.ts`); aqui só se lê.
 *
 * ⚠️ UMA LEITURA PARA TODAS AS TURMAS (duas consultas em paralelo), nunca uma por turma — o `/turmas` e o Início
 *    calculam o saldo de dezenas de turmas de uma vez.
 * ⚠️ SEM `server-only`, como `regimes-das-semanas.ts`: a leitura dos Avisos importa este módulo e é chamada por teste
 *    de invariante sem servidor.
 * ⚠️ DEGRADA PARA VAZIO (`RN-DEG-01`): sem a leitura, o saldo é o de antes (só o calendário tira dias), nunca exceção.
 */
import type { DiaBloqueado } from "@/lib/dominio/andamento-da-turma";
import type { criarClienteDeServidor } from "@/lib/supabase/server";

type Linha = { data: string; turma_id: string | null; ta_inicial: number | null };

export async function lerDiasBloqueadosAFrente(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  desde: string,
): Promise<DiaBloqueado[]> {
  const [parados, trs] = await Promise.all([
    supabase
      .from("dias_parados")
      .select("data, turma_id, ta_inicial")
      .eq("status", "ativo")
      .gte("data", desde),
    supabase
      .from("atividades_nao_letivas")
      .select("data, turma_id, ta_inicial")
      .eq("status", "ativo")
      .eq("salvo", true)
      .eq("bloqueia_aula", true)
      .gte("data", desde),
  ]);
  return [...((parados.data ?? []) as Linha[]), ...((trs.data ?? []) as Linha[])].map((l) => ({
    data: l.data,
    turmaId: l.turma_id,
    diaInteiro: l.ta_inicial === null,
  }));
}
