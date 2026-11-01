/**
 * Bloco 17 (spec 032) — a medição do saldo turma a turma, ANTES × DEPOIS da `RN-SALDO-01`, sobre a cópia do remoto
 * restaurada no banco LOCAL (`dado_do_remoto`). Lê os mesmos insumos do `/turmas` e chama as MESMAS funções da tela
 * (`paraLinhasDeTurma` e `comAndamento`): ANTES = sem os dias bloqueados do DSA (o cálculo da `main`); DEPOIS = com eles.
 * Só leitura. Uso: `npx tsx --conditions=react-server specs/032-…/medicao/medir-saldo.mts <url> <chave> <hoje>`.
 */
import { createClient } from "@supabase/supabase-js";

import { lerContagemPresencial } from "@/app/(app)/turmas/contagem-presencial";
import {
  COLUNAS_DA_LISTA_DE_TURMAS,
  comAndamento,
  paraLinhasDeTurma,
  type InsumosDoAndamentoDaLista,
} from "@/app/(app)/turmas/consulta";
import { lerRegimesDasSemanas } from "@/app/(app)/turmas/regimes-das-semanas";
import { lerDiasBloqueadosAFrente } from "@/app/(app)/turmas/dias-bloqueados";
import { COLUNAS_DA_ABRANGENCIA, linhasComAbrangencia } from "@/lib/calendario/abrangencia";

const [url, chave, hoje] = process.argv.slice(2) as [string, string, string];
const supabase = createClient(url, chave, { auth: { persistSession: false } });

const [turmasRes, cargas, executadas, regimes, feriados, presenciais, semanas, bloqueios] =
  await Promise.all([
    supabase.from("turmas").select(COLUNAS_DA_LISTA_DE_TURMAS),
    supabase.from("vw_carga_horaria_turma").select("turma_id, chr_curricular"),
    supabase.rpc("chd_da_turma_ate", { p_ate: hoje }),
    supabase.from("vw_cursos_regime_vigente").select("curso_id, regime_padrao_tempos, limite_diario_ead_horas"),
    supabase
      .from("feriados")
      .select(`data, ${COLUNAS_DA_ABRANGENCIA}`)
      .eq("impacto", "dia_inteiro")
      .eq("status", "ativo")
      .gte("data", hoje),
    lerContagemPresencial(supabase as never, hoje),
    lerRegimesDasSemanas(supabase as never, { hoje }),
    lerDiasBloqueadosAFrente(supabase as never, hoje),
  ]);
for (const r of [turmasRes, cargas, executadas, regimes, feriados]) if (r.error) throw r.error;

const linhas = paraLinhasDeTurma((turmasRes.data ?? []) as never);
const insumos: InsumosDoAndamentoDaLista = {
  cargas: cargas.data as never,
  executadas: executadas.data as never,
  regimes: regimes.data as never,
  feriadosDiaInteiro: linhasComAbrangencia<{ data: string }>(feriados.data as never),
  hoje,
  presenciais,
  semanasDasTurmas: semanas.porTurma,
};
const antes = comAndamento(linhas, insumos);
const depois = comAndamento(linhas, { ...insumos, diasBloqueados: bloqueios });

console.log(`hoje=${hoje} · dias bloqueados lidos (a partir de hoje): ${bloqueios.length}`);
console.log("turma\tsituacao\tsaldo_antes\tveredito_antes\tsaldo_depois\tsituacao_depois");
for (const [i, a] of antes.entries()) {
  const d = depois[i]!;
  if (a.saldo === null && d.saldo === null) continue;
  console.log(
    [a.codigo, a.status, a.saldo, a.emAtraso ? "em atraso" : "—", d.saldo, d.situacaoDoSaldo ?? "—"].join("\t"),
  );
}
