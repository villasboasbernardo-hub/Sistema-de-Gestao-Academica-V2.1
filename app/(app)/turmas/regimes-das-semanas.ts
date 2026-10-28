/**
 * O regime das semanas das turmas — o insumo do saldo pelo regime da semana (spec 029, Bloco 14, item 5, `FR-005`;
 * RD-3), num ponto único para os quatro leitores do andamento (Início, Avisos, `/turmas` e a ficha da turma).
 *
 * ⚠️ **UMA RODADA, SEM LAÇO**: duas leituras independentes, montadas em memória por turma.
 *    - `dsa_regime_da_semana` — o regime **gravado** com a semana ao salvar e o **«só esta semana»**, ativos, só **da
 *      semana ISO de hoje em diante**: a janela do saldo começa amanhã, então semana passada não entra em conta
 *      nenhuma. O filtro é `ano > X ou (ano = X e semana ≥ Y)` por causa da **virada do ano ISO** — `semana ≥ Y`
 *      sozinho esconderia as semanas do ano seguinte.
 *    - `turma_regime_vigencia` — o **«desta semana em diante»**, ativo, **INTEIRO**: ele NÃO pode ser cortado por
 *      data, porque o «desde» que vale na primeira semana da janela pode ter começado há meses (a resolução é o de
 *      maior segunda-feira ≤ a da semana, `regimeDaSemana`).
 *    As duas pelas páginas de `lerTodasAsPaginas`: o teto de 1.000 linhas do PostgREST corta a resposta **sem erro**, e
 *    `dsa_regime_da_semana` ganha uma linha por semana salva de cada turma.
 * ⚠️ **SEM `server-only`**: a leitura dos avisos importa este módulo e é chamada por teste de invariante sem servidor
 *    (o mesmo desenho de `contagem-presencial.ts`).
 * ⚠️ **A FALHA DEGRADA PARA «SEM EXCEÇÕES»** (`RN-DEG-01`): sem uma das duas leituras, o mapa sai **vazio**, e
 *    `andamentoDaTurma` faz a conta de antes do Bloco 14 — um TA/dia só, o de *Editar turma* (ou o do curso). É um
 *    número que já valeu e que a tela sabe mostrar; o lado inseguro seria somar metade das exceções.
 * ⚠️ **TURMA SEM EXCEÇÃO NÃO ENTRA NO MAPA** — e o leitor passa `undefined`, a mesma conta de antes (FR-005.3).
 * ⚠️ **A RLS PODE CALAR UMA DAS DUAS EM SILÊNCIO (gotcha 4), e a degradação é a mesma:** a policy de
 *    `dsa_regime_da_semana` exige `registros_aula.ler`, e o TA do «desde» chega pelo embed de `regimes_de_horario`,
 *    cuja policy exige `cursos.ler`. Perfil sem uma delas lê a lista vazia ou o regime nulo, sem erro. ⚠️ **O «desde»
 *    NOMEADO CUJO REGIME A SESSÃO NÃO VÊ NÃO VIRA «O DO CURSO»** — que seria um número inventado (o nulo do banco quer
 *    dizer «curso», o nulo do embed quer dizer «não vi») —: a turma inteira sai do mapa e fica na conta de antes. O
 *    retrato do «só esta semana» e do gravado está na própria linha, sem embed. No seed (`20260830000111`) os nove
 *    perfis têm as duas permissões; a matriz é dado e pode mudar pela tela.
 */
import type { ExcecoesDoRegime } from "@/lib/dominio/andamento-da-turma";
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import type { criarClienteDeServidor } from "@/lib/supabase/server";
import { contagemNaPrimeira, lerTodasAsPaginas } from "@/lib/supabase/paginacao";

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

type LinhaDoRegistro = {
  turma_id: string;
  ano: number;
  semana: number;
  origem: string;
  regime_de_horario_id: string | null;
  regime_tempos: number | null;
};

type LinhaDaVigencia = {
  turma_id: string;
  vigente_de: string;
  regime_de_horario_id: string | null;
  regime: { regime_tempos: number } | null;
};

export async function lerRegimesDasSemanas(
  supabase: Cliente,
  entrada: {
    /** O dia de São Paulo (`hojeNaCiaara()`): as semanas guardadas contam da semana ISO dele em diante. */
    readonly hoje: string;
    /** A ficha lê só a turma dela; os outros três leitores, todas as que a sessão alcança. */
    readonly turmaId?: string;
  },
): Promise<ReadonlyMap<string, ExcecoesDoRegime>> {
  const atual = semanaIsoDe(entrada.hoje);
  if (atual === null) return new Map();
  const { turmaId } = entrada;

  const [registrosRes, vigenciasRes] = await Promise.all([
    lerTodasAsPaginas((f) => {
      let consulta = supabase
        .from("dsa_regime_da_semana")
        .select(
          "turma_id, ano, semana, origem, regime_de_horario_id, regime_tempos",
          contagemNaPrimeira(f),
        )
        .eq("status", "ativo")
        .or(`ano.gt.${atual.ano},and(ano.eq.${atual.ano},semana.gte.${atual.numero})`);
      if (turmaId !== undefined) consulta = consulta.eq("turma_id", turmaId);
      /* Ordem total: uma linha ativa por turma e semana ISO (`dsa_regime_da_semana_uma_ativa`). */
      return consulta.order("turma_id").order("ano").order("semana").range(f.de, f.ate);
    }),
    lerTodasAsPaginas((f) => {
      let consulta = supabase
        .from("turma_regime_vigencia")
        .select(
          "turma_id, vigente_de, regime_de_horario_id, regime:regimes_de_horario(regime_tempos)",
          contagemNaPrimeira(f),
        )
        .eq("status", "ativo");
      if (turmaId !== undefined) consulta = consulta.eq("turma_id", turmaId);
      /* Ordem total: uma vigência ativa por turma e segunda-feira (`turma_regime_vigencia_uma_ativa_por_data`). */
      return consulta.order("turma_id").order("vigente_de").range(f.de, f.ate);
    }),
  ]);
  if (registrosRes.error || vigenciasRes.error) return new Map();

  type Excecoes = {
    registros: ExcecoesDoRegime["registros"][number][];
    vigencias: ExcecoesDoRegime["vigencias"][number][];
  };
  const porTurma = new Map<string, Excecoes>();
  const daTurma = (id: string): Excecoes => {
    const ja = porTurma.get(id);
    if (ja !== undefined) return ja;
    const nova: Excecoes = { registros: [], vigencias: [] };
    porTurma.set(id, nova);
    return nova;
  };
  /* As turmas cujo «desde» nomeado chegou sem o regime: ficam de fora, na conta de antes (ver o cabeçalho). */
  const semRegimeVisivel = new Set<string>();

  for (const r of (registrosRes.data ?? []) as LinhaDoRegistro[]) {
    daTurma(r.turma_id).registros.push({
      ano: Number(r.ano),
      semana: Number(r.semana),
      origem: r.origem === "gravado" ? "gravado" : "so_esta_semana",
      /* Regime nulo = o do curso: a linha sem regime nomeado não tem retrato (`dsa_regime_retrato_do_nomeado`). */
      tempos:
        r.regime_de_horario_id === null || r.regime_tempos === null
          ? null
          : Number(r.regime_tempos),
    });
  }
  for (const v of (vigenciasRes.data ?? []) as unknown as LinhaDaVigencia[]) {
    const regime = v.regime ?? null;
    if (v.regime_de_horario_id !== null && regime === null) {
      semRegimeVisivel.add(v.turma_id);
      continue;
    }
    daTurma(v.turma_id).vigencias.push({
      vigenteDe: v.vigente_de,
      /* Regime nulo = o do curso («desde» sem regime nomeado). */
      tempos: regime === null ? null : Number(regime.regime_tempos),
    });
  }
  for (const id of semRegimeVisivel) porTurma.delete(id);
  return porTurma;
}
