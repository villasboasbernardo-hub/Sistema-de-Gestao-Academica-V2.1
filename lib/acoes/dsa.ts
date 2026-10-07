"use server";

/**
 * Server Actions do DSA — **lançar** (`RF-DSA-04`, `RF-AVAL-04` a `06`, `RF-EXTRA-01`, `Q-1`, `Q-7`,
 * `Q-8` · PR 2) e **mover, editar e excluir** (`RF-DSA-07`, `FR-029` a `FR-032`, `Q-12` · PR 4).
 *
 * ⚠️ **`safeParse` NA PRIMEIRA LINHA, SEM EXCEÇÃO.** Server Action é endpoint HTTP de fato.
 *
 * ⚠️ **O `id` É GERADO ANTES E O `insert` VAI SEM `RETURNING`** (gotcha 4.1): `INSERT … RETURNING`
 * exige que a linha passe também pela policy de `SELECT`, e `app.alcanca_turma` é `STABLE` — ela
 * **não enxerga a linha recém-inserida dentro do mesmo comando**. A recusa chegaria como
 * *"new row violates row-level security policy"*, mensagem que aponta para a ESCRITA e faz procurar
 * permissão de criar, que estava certa o tempo todo.
 *
 * ⚠️ **O `codigo` TAMBÉM É GERADO AQUI, e isso é medido:** `registros_aula.codigo`,
 * `avaliacoes.codigo` e `atividades_nao_letivas.codigo` são `NOT NULL` **sem `DEFAULT`** (medido em
 * 05/10/2026) — ao contrário de `unidades_ensino`, que tem sequência. Quem grava tem de nomear.
 *
 * ⚠️ **E O PORTEIRO DE HABILITAÇÃO É A ÚNICA DEFESA — ver a nota de `conferirHabilitacao`.**
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  recusaPorAlcance,
  traduzirRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { podeAtuar, type Atuacao, type VinculoDeHabilitacao } from "@/lib/dominio/habilitacao";
import { avaliarODia, avaliarTetosDaSemana, type TetosDoDsa } from "@/lib/dominio/dsa/tetos";
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { slotDoEstudoIndividual } from "@/lib/dominio/dsa/horario-do-bloco";
import { camposDoEstudoIndividual } from "@/lib/dominio/dsa/rotulos";
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import {
  esquemaDaEdicao,
  esquemaDaExclusao,
  esquemaDoBloco,
  esquemaDoEstudoIndividualDaSemana,
  esquemaDoMovimento,
  type Bloco,
  type OrigemDoFatoValidada,
} from "@/lib/validacao/dsa";

/** Um aviso que **não** bloqueia (`RN-DEG-02`). */
export type Aviso = { readonly codigo: string; readonly texto: string };

export type ResultadoDoLancamento =
  | { readonly ok: true; readonly id: string; readonly avisos: readonly Aviso[] }
  | { readonly ok: false; readonly mensagem: string; readonly campo?: string };

const falha = (mensagem: string, campo?: string): ResultadoDoLancamento =>
  campo === undefined ? { ok: false, mensagem } : { ok: false, mensagem, campo };

/**
 * Revalida as **três** rotas que mostram o mesmo número.
 *
 * ⚠️ A ficha da turma e o `/inicio` leem a CH executada da mesma view que a grade; revalidar só o
 * DSA deixaria os outros dois com o número velho — e ninguém veria por quê.
 */
function revalidar(): void {
  revalidatePath(ROTA_DO_DSA, "page");
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  revalidatePath("/inicio");
}

const primeira = (
  issues: readonly { message: string; path: readonly (string | number | symbol)[] }[],
) => ({
  mensagem: issues[0]?.message ?? "Dados inválidos.",
  campo: issues[0]?.path?.[0] === undefined ? undefined : String(issues[0]?.path?.[0]),
});

/**
 * O porteiro da habilitação (`RN-INST-01`, *Risco: Alto* · `FR-017`).
 *
 * ⚠️ **A SERVER ACTION É A ÚNICA DEFESA, E ISSO FOI MEDIDO EM 05/10/2026.** Não existe FK para
 * `instrutor_disciplina` nem gatilho em `registros_aula`/`avaliacoes`: o **banco não recusa** um
 * instrutor não habilitado. Quem recusa é esta função — e por isso o teste negativo dela confere o
 * **valor no banco** depois da tentativa, não só a mensagem na tela.
 *
 * ⚠️ **E `podeAtuar()` JÁ EXISTIA COM ZERO CONSUMIDORES** (medido): `lib/dominio/habilitacao.ts` foi
 * escrito com teste e nunca foi chamado — a mesma forma de defeito que criou a spec 011
 * (`encerrarSessao()` com teste e nenhum botão). Aqui ele ganha o primeiro consumidor real.
 *
 * ⚠️ **A DELIMITAÇÃO É DO MÓDULO, não daqui:** `EXIGE_HABILITACAO` distingue `ministrar` e
 * `responsavel` (exigem) de `avaliacao` e `vista_de_prova` (não exigem) — a `RN-INST-01` cobra
 * habilitação para **ministrar**, e fiscalizar prova não é ministrar.
 */
async function conferirHabilitacao(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  atuacao: Atuacao,
  instrutorId: string,
  disciplinaId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("instrutor_disciplina")
    .select("instrutor_id, disciplina_id, status")
    .eq("instrutor_id", instrutorId)
    .eq("disciplina_id", disciplinaId);

  const vinculos: VinculoDeHabilitacao[] = (
    (data ?? []) as { instrutor_id: string; disciplina_id: string; status: string }[]
  ).map((v) => ({
    instrutorId: v.instrutor_id,
    disciplinaId: v.disciplina_id,
    status: v.status,
  }));

  if (podeAtuar(atuacao, instrutorId, disciplinaId, vinculos)) return null;

  /*
   * ⚠️ A frase **nomeia a habilitação que falta** e diz onde resolver. *"Instrutor não habilitado"*
   * sem o nome da disciplina manda a pessoa adivinhar qual vínculo criar.
   */
  const [{ data: instrutor }, { data: disciplina }] = await Promise.all([
    supabase.from("instrutores").select("nome_completo").eq("id", instrutorId).maybeSingle(),
    supabase
      .from("disciplinas")
      .select("cod_disciplina, nome_disciplina")
      .eq("id", disciplinaId)
      .maybeSingle(),
  ]);
  const nome = (instrutor as { nome_completo?: string } | null)?.nome_completo ?? "O instrutor";
  const d = disciplina as { cod_disciplina?: string; nome_disciplina?: string } | null;
  const qual = d ? `${d.cod_disciplina} — ${d.nome_disciplina}` : "nesta disciplina";
  return `${nome} não está habilitado em ${qual}. Habilite-o na ficha do instrutor.`;
}

/**
 * Os tetos, **lidos de `config_parametros`** (Princípio VII, `RNF-NORM-08`).
 *
 * ⚠️ **PARÂMETRO NORMATIVO É DADO, NUNCA CONSTANTE DE CÓDIGO.** O PR B os semeou como
 * `dsa.teto_tfm_semana` e `dsa.teto_recomendado_semana`; escrever `6` e `25` aqui faria dois
 * lugares para a mesma norma, e o dia em que ela mudasse a tela discordaria do banco.
 *
 * ⚠️ **AUSENTE, O TETO NÃO É INVENTADO: ele cala.** Um padrão escrito aqui transformaria "não
 * medi" em "o teto é 6" — e um bloqueio por número inventado é pior que bloqueio nenhum. Com o
 * parâmetro ausente o veredito sai neutro, e a semente da migration garante que ele exista.
 */
async function tetosDoBanco(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
): Promise<TetosDoDsa | null> {
  const { data } = await supabase
    .from("config_parametros")
    .select("chave, valor")
    .in("chave", ["dsa.teto_tfm_semana", "dsa.teto_recomendado_semana"])
    .eq("status", "ativo");
  const por = new Map(
    ((data ?? []) as { chave: string; valor: string }[]).map((p) => [p.chave, p.valor]),
  );
  const tfm = Number(por.get("dsa.teto_tfm_semana"));
  const recomendado = Number(por.get("dsa.teto_recomendado_semana"));
  if (!Number.isFinite(tfm) || !Number.isFinite(recomendado)) return null;
  return { tfmSemana: tfm, recomendadoSemana: recomendado };
}

/**
 * O veredito dos tetos para um lançamento de aula — **o único bloqueio do DSA** (`RN-DIST-03` (a)).
 *
 * ⚠️ **A CONTA INCLUI O QUE ESTÁ SENDO GRAVADO**, e o módulo puro diz isso no tipo
 * (*"TA já lançados nesta semana, **incluindo** o que está sendo gravado"*). Avaliar só o que já
 * existe deixaria passar exatamente o lançamento que estoura o teto.
 *
 * ⚠️ **ELE RODA ANTES DO `insert`**, porque o TFM **recusa**: gravar e depois avisar deixaria a
 * semana com 7 TA de TFM e um aviso — e a `RN-DIST-03` (a) é o único teto rígido do épico.
 */
async function vereditoDosTetos(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  entrada: {
    readonly turmaId: string;
    readonly cursoId: string;
    readonly data: string;
    readonly taInicial: number;
    readonly tempos: number;
    readonly disciplinaId: string | null;
    /**
     * O fato a **desconsiderar** na contagem — o próprio, quando se está MOVENDO.
     *
     * ⚠️ **SEM ELE, MOVER UM BLOCO DENTRO DA MESMA SEMANA CONTA O BLOCO DUAS VEZES**, e um TFM de
     * 6 TA movido de terça para quinta viraria 12 na conta: a ação recusaria o movimento com a
     * frase do teto, dizendo que a pessoa passou de um limite que ela não passou. A `RN-DIST-03`
     * (a) é o único bloqueio do épico, e um bloqueio por conta errada é pior que bloqueio nenhum.
     */
    readonly ignorarFatoId?: string;
  },
): Promise<{ readonly bloqueios: readonly string[]; readonly alertas: readonly string[] }> {
  const tetos = await tetosDoBanco(supabase);
  const semana = semanaIsoDe(entrada.data);
  if (tetos === null || semana === null) return { bloqueios: [], alertas: [] };

  const ocupacaoDaSemana = supabase
    .from("vw_ocupacao_ta")
    .select("data, disciplina_id, tempos_consumidos, ta_final")
    .eq("turma_id", entrada.turmaId)
    .gte("data", semana.segunda)
    .lte("data", semana.domingo);

  const [ocupacaoRes, discRes, regimeRes] = await Promise.all([
    entrada.ignorarFatoId === undefined
      ? ocupacaoDaSemana
      : ocupacaoDaSemana.neq("fato_id", entrada.ignorarFatoId),
    entrada.disciplinaId === null
      ? Promise.resolve({ data: null })
      : supabase
          .from("disciplinas")
          .select("nome_disciplina")
          .eq("id", entrada.disciplinaId)
          .maybeSingle(),
    supabase
      .from("vw_cursos_regime_vigente")
      .select("regime_padrao_tempos")
      .eq("curso_id", entrada.cursoId)
      .maybeSingle(),
  ]);

  const ocupacao = (ocupacaoRes.data ?? []) as {
    data: string;
    disciplina_id: string | null;
    tempos_consumidos: number | null;
    ta_final: number | null;
  }[];

  /* O que a disciplina já tem na semana, MAIS o que está entrando. */
  const jaNaSemana = ocupacao
    .filter((o) => entrada.disciplinaId !== null && o.disciplina_id === entrada.disciplinaId)
    .reduce((soma, o) => soma + (o.tempos_consumidos ?? 0), 0);
  const nome = (discRes.data as { nome_disciplina?: string } | null)?.nome_disciplina ?? "";

  const daSemana =
    nome === ""
      ? { bloqueios: [], alertas: [] }
      : avaliarTetosDaSemana([{ nome, taNaSemana: jaNaSemana + entrada.tempos }], tetos);

  /* O dia: o que já há nele, mais o que entra. */
  const noDia = ocupacao
    .filter((o) => o.data === entrada.data)
    .reduce((soma, o) => soma + (o.tempos_consumidos ?? 0), 0);
  const regime = (regimeRes.data as { regime_padrao_tempos?: number | null } | null)
    ?.regime_padrao_tempos;
  const doDia = avaliarODia({
    taLancadosNoDia: noDia + entrada.tempos,
    temposDoRegime: regime ?? null,
    /* O TA excepcional é o que passa dos tempos do regime — ele existe e é ALERTA. */
    usouExcepcional: regime != null && entrada.taInicial + entrada.tempos - 1 > regime,
  });

  return {
    bloqueios: [...daSemana.bloqueios, ...doDia.bloqueios],
    alertas: [...daSemana.alertas, ...doDia.alertas],
  };
}

/** A disciplina de um bloco de aula: a da UE quando há UE, a da coluna quando não há. */
async function disciplinaDoBloco(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  bloco: Extract<Bloco, { tipo: "aula" }>,
): Promise<string | null> {
  if (bloco.disciplinaId !== null) return bloco.disciplinaId;
  if (bloco.unidadeEnsinoId === null) return null;
  const { data } = await supabase
    .from("unidades_ensino")
    .select("disciplina_id")
    .eq("id", bloco.unidadeEnsinoId)
    .maybeSingle();
  return (data as { disciplina_id?: string } | null)?.disciplina_id ?? null;
}

/**
 * Grava um bloco (`RF-DSA-04`).
 *
 * ⚠️ **ELA É O CONTRATO DO ÉPICO 12:** o motor de prévia produz `Bloco` por função pura e chama
 * **esta** função. Nada aqui lê formulário.
 */
export async function lancar(entrada: unknown): Promise<ResultadoDoLancamento> {
  const conferido = esquemaDoBloco.safeParse(entrada);
  if (!conferido.success) {
    const { mensagem, campo } = primeira(conferido.error.issues);
    return falha(mensagem, campo);
  }
  const bloco = conferido.data;
  const supabase = await criarClienteDeServidor();
  const id = randomUUID();
  const marca = `DSA-${Date.now().toString(36).toUpperCase()}`;

  if (bloco.tipo === "aula") {
    const disciplinaId = await disciplinaDoBloco(supabase, bloco);
    if (disciplinaId === null) return falha("Não identifiquei a disciplina da aula.");
    const recusa = await conferirHabilitacao(
      supabase,
      "ministrar",
      bloco.instrutorId,
      disciplinaId,
    );
    if (recusa !== null) return falha(recusa, "instrutorId");

    /*
     * ⚠️ **O TETO DE TFM É O ÚNICO BLOQUEIO DO ÉPICO** (`RN-DIST-03` (a)), e ele é conferido
     * **antes** de gravar. Os demais — teto recomendado, dia além do regime, TA excepcional — são
     * ALERTA, e acompanham a gravação (`RN-DEG-02`): transformá-los em impedimento mudaria a regra.
     */
    const veredito = await vereditoDosTetos(supabase, {
      turmaId: bloco.turmaId,
      cursoId: bloco.cursoId,
      data: bloco.data,
      taInicial: bloco.taInicial,
      tempos: bloco.tempos,
      disciplinaId,
    });
    const bloqueio = veredito.bloqueios[0];
    if (bloqueio !== undefined) return falha(bloqueio);

    const { error } = await supabase.from("registros_aula").insert({
      id,
      codigo: `${marca}-A`,
      data: bloco.data,
      turma_id: bloco.turmaId,
      curso_id: bloco.cursoId,
      unidade_ensino_id: bloco.unidadeEnsinoId,
      disciplina_id: bloco.disciplinaId,
      instrutor_id: bloco.instrutorId,
      ta_inicial: bloco.taInicial,
      tempos_consumidos: bloco.tempos,
      conteudo_resumo: bloco.conteudo,
      metodologia: bloco.tecnica,
      local: bloco.local,
    });
    if (error) return falha(traduzirRecusa(error as ErroDoBanco));
    revalidar();
    return {
      ok: true,
      id,
      avisos: veredito.alertas.map((texto, i) => ({ codigo: `alerta-${i}`, texto })),
    };
  }

  if (bloco.tipo === "avaliacao") {
    /*
     * ⚠️ **A AVALIAÇÃO NÃO EXIGE HABILITAÇÃO, e isso é a `RN-INST-01` delimitada** — está em
     * `EXIGE_HABILITACAO`, no módulo puro. Chamar o porteiro aqui seria endurecer a regra; não
     * chamá-lo e não dizer por quê seria esquecê-la. Ele é chamado, e devolve `null` por decisão.
     */
    const recusa = await conferirHabilitacao(
      supabase,
      "avaliacao",
      bloco.instrutorId,
      bloco.disciplinaId,
    );
    if (recusa !== null) return falha(recusa, "instrutorId");

    const { error } = await supabase.from("avaliacoes").insert({
      id,
      codigo: `${marca}-V`,
      turma_id: bloco.turmaId,
      curso_id: bloco.cursoId,
      disciplina_id: bloco.disciplinaId,
      tipo_avaliacao: bloco.tipoAvaliacao,
      data_avaliacao: bloco.data,
      ta_inicial: bloco.taInicial,
      tempos_consumidos: bloco.tempos,
      instrutor_responsavel_id: bloco.instrutorId,
      fiscal_id: bloco.fiscalId,
      nome_fiscal_externo: bloco.nomeFiscalExterno,
      conteudo_resumo: bloco.conteudo,
      metodologia: bloco.tecnica,
      local: bloco.local,
    });
    if (error) return falha(traduzirRecusa(error as ErroDoBanco));
    revalidar();
    return { ok: true, id, avisos: [] };
  }

  if (bloco.tipo === "vista_prova") {
    /*
     * ⚠️ **A VISTA É `UPDATE` NA MESMA LINHA, NUNCA `INSERT`** (`RN-AVAL-02`): aplicação e vista são
     * o **mesmo fato**, e criar outra linha faria a CHD contar duas vezes.
     */
    const { error } = await supabase
      .from("avaliacoes")
      .update({
        data_vista_prova: bloco.data,
        ta_inicial_vista: bloco.taInicial,
        tempos_consumidos_vista: bloco.tempos,
        local_vista: bloco.local,
      })
      .eq("id", bloco.avaliacaoId);
    if (error) return falha(traduzirRecusa(error as ErroDoBanco));
    revalidar();
    return { ok: true, id: bloco.avaliacaoId, avisos: [] };
  }

  const { error } = await supabase.from("atividades_nao_letivas").insert({
    id,
    codigo: `${marca}-N`,
    categoria_normativa: bloco.categoria,
    escopo: bloco.turmaId === null ? "global" : "turma",
    turma_id: bloco.turmaId,
    data: bloco.data,
    subtipo: bloco.subtipo,
    descricao: bloco.descricao,
    ta_inicial: bloco.taInicial,
    tempos_consumidos: bloco.tempos,
    local: bloco.local,
    instrutor_id: bloco.instrutorId,
    responsavel_externo: bloco.responsavelExterno,
  });
  if (error) return falha(traduzirRecusa(error as ErroDoBanco));
  revalidar();
  return { ok: true, id, avisos: [] };
}

export type ResultadoDoEstudoIndividual =
  | { readonly ok: true; readonly criados: number; readonly pulados: readonly string[] }
  | { readonly ok: false; readonly mensagem: string };

/**
 * O Estudo Individual da semana, **em um clique** (`Q-7`, `D-4`, `D-11`).
 *
 * ⚠️ **ELE OCUPA O SLOT SEGUINTE AO ÚLTIMO TA LANÇADO NAQUELE DIA**, e dura **um** TA, com horário
 * derivado pela mesma regra do relógio — decisão de Bernardo Villas Boas de 05/10/2026, que
 * substituiu a ideia de uma exceção `9x50` no catálogo. Dia vazio recebe o slot 1.
 *
 * ⚠️ **IDEMPOTENTE: dia que já tem Estudo Individual é PULADO, e o nome dele volta na resposta.**
 * Sem isso, clicar duas vezes criaria dois EI por dia — e a tela não teria como dizer que não fez
 * nada. Os pulados são informação, não silêncio.
 *
 * ⚠️ **E O DIA DE FERIADO `dia_inteiro` NÃO RECEBE EI** (`RN-EVT-02`): não há aula, então não há
 * estudo individual a lançar. Impacto parcial ou informativo **recebe**, porque não bloqueia.
 */
export async function lancarEstudoIndividualDaSemana(
  entrada: unknown,
): Promise<ResultadoDoEstudoIndividual> {
  const conferido = esquemaDoEstudoIndividualDaSemana.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, mensagem: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { turmaId, ano, semana } = conferido.data;
  const supabase = await criarClienteDeServidor();

  const dias = datasDaSemanaIso(ano, semana);
  const uteis = dias.slice(0, 5);
  const de = uteis[0];
  const ate = uteis[uteis.length - 1];
  if (de === undefined || ate === undefined) {
    return { ok: false, mensagem: "Não identifiquei a semana." };
  }

  /* ⚠️ Uma rodada só: nenhum `await` dentro de laço. */
  const [ocupacaoRes, feriadosRes, eiRes] = await Promise.all([
    supabase
      .from("vw_ocupacao_ta")
      .select("data, ta_final")
      .eq("turma_id", turmaId)
      .gte("data", de)
      .lte("data", ate),
    supabase
      .from("feriados")
      .select("data, impacto")
      .eq("impacto", "dia_inteiro")
      /* ⚠️ Só o feriado ATIVO bloqueia (regra 4) — o inativado deixava o dia sem Estudo Individual. */
      .eq("status", "ativo")
      .gte("data", de)
      .lte("data", ate),
    supabase
      .from("atividades_nao_letivas")
      .select("data")
      .eq("turma_id", turmaId)
      .eq("categoria_normativa", "Estudo_Individual")
      .eq("status", "ativo")
      .gte("data", de)
      .lte("data", ate),
  ]);

  const bloqueados = new Set(((feriadosRes.data ?? []) as { data: string }[]).map((f) => f.data));
  const jaTem = new Set(((eiRes.data ?? []) as { data: string }[]).map((e) => e.data));

  const ultimoTaDoDia = new Map<string, number>();
  for (const o of (ocupacaoRes.data ?? []) as { data: string; ta_final: number | null }[]) {
    if (o.ta_final === null) continue;
    const atual = ultimoTaDoDia.get(o.data) ?? 0;
    if (o.ta_final > atual) ultimoTaDoDia.set(o.data, o.ta_final);
  }

  const marca = `DSA-${Date.now().toString(36).toUpperCase()}`;
  const linhas: Record<string, unknown>[] = [];
  const pulados: string[] = [];
  for (const dia of uteis) {
    if (bloqueados.has(dia)) {
      pulados.push(dia);
      continue;
    }
    if (jaTem.has(dia)) {
      pulados.push(dia);
      continue;
    }
    const slot = slotDoEstudoIndividual(ultimoTaDoDia.get(dia) ?? null);
    if (slot === null) {
      pulados.push(dia);
      continue;
    }
    linhas.push({
      id: randomUUID(),
      codigo: `${marca}-EI-${dia}`,
      turma_id: turmaId,
      /* ⚠️ O local é sempre a Biblioteca (decisão de 07/10/2026) — pela função pura, nunca escrito aqui. */
      ...camposDoEstudoIndividual(dia, slot),
    });
  }

  if (linhas.length > 0) {
    /*
     * ⚠️ **UM `insert` COM TODAS AS LINHAS — e isso É a transação.** Cada requisição do PostgREST é
     * uma transação própria, então um `insert` de cinco linhas entra inteiro ou não entra: cinco
     * chamadas separadas deixariam a semana meio lançada se a terceira falhasse.
     */
    const { error } = await supabase.from("atividades_nao_letivas").insert(linhas);
    if (error) return { ok: false, mensagem: traduzirRecusa(error as ErroDoBanco) };
  }
  revalidar();
  return { ok: true, criados: linhas.length, pulados };
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 * PR 4 — MOVER, EDITAR E EXCLUIR (`RF-DSA-07`, `FR-029` a `FR-032`, `Q-1`, `Q-12`, critério 7)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * O retrato do fato antes de mexer nele — **lido pela ORIGEM, nunca procurado nas três tabelas**.
 *
 * ⚠️ **TRÊS TABELAS, E A VISTA É A MESMA LINHA DA AVALIAÇÃO** (`RN-AVAL-02`): aplicação e vista são
 * o **mesmo fato**, em quatro colunas diferentes. Procurar o `fatoId` por tentativa custaria três
 * consultas e daria o veredito errado no dia em que dois identificadores coincidissem.
 *
 * ⚠️ **`origem_migracao_v1` E `editado_em` VÊM JUNTOS, e é por eles que a catraca se antecipa**: a
 * `reg_aula_ue_so_nula_no_historico` aceita UE nula **só** em linha migrada e **nunca editada**.
 */
type FatoDoBanco = {
  readonly data: string | null;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  readonly turmaId: string | null;
  readonly cursoId: string | null;
  readonly disciplinaId: string | null;
  readonly unidadeEnsinoId: string | null;
  readonly herdado: boolean;
};

async function lerFato(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  origem: OrigemDoFatoValidada,
  fatoId: string,
): Promise<FatoDoBanco | null> {
  if (origem === "aula") {
    const { data } = await supabase
      .from("registros_aula")
      .select(
        "data, ta_inicial, tempos_consumidos, turma_id, curso_id, disciplina_id, unidade_ensino_id, origem_migracao_v1, editado_em",
      )
      .eq("id", fatoId)
      .maybeSingle();
    if (!data) return null;
    const l = data as {
      data: string;
      ta_inicial: number | null;
      tempos_consumidos: number | null;
      turma_id: string | null;
      curso_id: string | null;
      disciplina_id: string | null;
      unidade_ensino_id: string | null;
      origem_migracao_v1: string | null;
      editado_em: string | null;
    };
    /*
     * ⚠️ **A DISCIPLINA DE UMA AULA COM UE NÃO ESTÁ NA COLUNA `disciplina_id` — ELA ESTÁ NA UE, e a
     * primeira escrita disto não resolvia isso: o PORTEIRO DA HABILITAÇÃO FICAVA INERTE.** O
     * `CHECK reg_aula_ue_xor_disciplina` proíbe as duas juntas (*"uma fonte só"*), então **toda**
     * aula normal tem `disciplina_id` **nulo** — e com ele nulo o `editar` pulava
     * `conferirHabilitacao` e deixava trocar por quem não é habilitado.
     * ⚠️ **QUEM PEGOU FOI O CASO NEGATIVO DA PONTA A PONTA**, que esperava a frase de recusa e não
     * achou nenhuma: a troca tinha sido **gravada**. O banco não recusa — não há FK nem gatilho de
     * habilitação (medido) —, então a Server Action era a única defesa e estava desligada
     * justamente no caminho comum. É a mesma resolução que `disciplinaDoBloco` faz no `lancar`.
     */
    let disciplinaId = l.disciplina_id;
    if (disciplinaId === null && l.unidade_ensino_id !== null) {
      const { data: ue } = await supabase
        .from("unidades_ensino")
        .select("disciplina_id")
        .eq("id", l.unidade_ensino_id)
        .maybeSingle();
      disciplinaId = (ue as { disciplina_id?: string } | null)?.disciplina_id ?? null;
    }

    return {
      data: l.data,
      taInicial: l.ta_inicial,
      tempos: l.tempos_consumidos,
      turmaId: l.turma_id,
      cursoId: l.curso_id,
      disciplinaId,
      unidadeEnsinoId: l.unidade_ensino_id,
      herdado: l.origem_migracao_v1 !== null && l.editado_em === null,
    };
  }

  if (origem === "avaliacao" || origem === "vista_prova") {
    const { data } = await supabase
      .from("avaliacoes")
      .select(
        "data_avaliacao, data_vista_prova, ta_inicial, ta_inicial_vista, tempos_consumidos, tempos_consumidos_vista, turma_id, curso_id, disciplina_id, origem_migracao_v1, editado_em",
      )
      .eq("id", fatoId)
      .maybeSingle();
    if (!data) return null;
    const l = data as {
      data_avaliacao: string;
      data_vista_prova: string | null;
      ta_inicial: number | null;
      ta_inicial_vista: number | null;
      tempos_consumidos: number | null;
      tempos_consumidos_vista: number | null;
      turma_id: string | null;
      curso_id: string | null;
      disciplina_id: string | null;
      origem_migracao_v1: string | null;
      editado_em: string | null;
    };
    const ehVista = origem === "vista_prova";
    return {
      data: ehVista ? l.data_vista_prova : l.data_avaliacao,
      taInicial: ehVista ? l.ta_inicial_vista : l.ta_inicial,
      tempos: ehVista ? l.tempos_consumidos_vista : l.tempos_consumidos,
      turmaId: l.turma_id,
      cursoId: l.curso_id,
      disciplinaId: l.disciplina_id,
      unidadeEnsinoId: null,
      herdado: l.origem_migracao_v1 !== null && l.editado_em === null,
    };
  }

  const { data } = await supabase
    .from("atividades_nao_letivas")
    .select("data, ta_inicial, tempos_consumidos, turma_id, origem_migracao_v1, editado_em")
    .eq("id", fatoId)
    .maybeSingle();
  if (!data) return null;
  const l = data as {
    data: string;
    ta_inicial: number | null;
    tempos_consumidos: number | null;
    turma_id: string | null;
    origem_migracao_v1: string | null;
    editado_em: string | null;
  };
  return {
    data: l.data,
    taInicial: l.ta_inicial,
    tempos: l.tempos_consumidos,
    turmaId: l.turma_id,
    /* ⚠️ Atividade não letiva **não tem** `curso_id` nem disciplina: ela é de turma ou global. */
    cursoId: null,
    disciplinaId: null,
    unidadeEnsinoId: null,
    herdado: l.origem_migracao_v1 !== null && l.editado_em === null,
  };
}

/**
 * O contexto da recusa por alcance — o que faz a frase dizer **curso fora de oferta** (`FR-032`).
 *
 * ⚠️ **SEM ELE, A RECUSA DE RLS CHEGA COMO «o seu perfil não pode fazer esta alteração neste
 * curso», que é a frase ERRADA quando o problema é o CURSO estar inativo.** `recusaPorAlcance` já
 * sabe dizer a certa — ela só precisa saber que o curso está inativo e qual é a sigla. Deixar o
 * `42501` cru chegar à tela é o que o `FR-032` proíbe nominalmente.
 */
async function contextoDoCurso(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  cursoId: string | null,
  oQueNaoRecebe: string,
): Promise<{ cursoInativo?: boolean; sigla?: string; oQueNaoRecebe: string }> {
  if (cursoId === null) return { oQueNaoRecebe };
  const { data } = await supabase
    .from("cursos")
    .select("codigo, status")
    .eq("id", cursoId)
    .maybeSingle();
  const c = data as { codigo?: string; status?: string } | null;
  if (!c?.codigo) return { oQueNaoRecebe };
  return { cursoInativo: c.status !== "ativo", sigla: c.codigo, oQueNaoRecebe };
}

/**
 * A segunda metade da `Q-1`: **mover ou editar linha histórica sem UE pede a UE no mesmo ato**
 * (`FR-028`).
 *
 * > *"A Unidade de Ensino só pode ser nula em linha MIGRADA e NUNCA EDITADA, ou em disciplina
 * > ISENTA de UE."*
 * > — `comment on constraint reg_aula_ue_so_nula_no_historico`, migration `20261005181116`
 *
 * ⚠️ **MOVER É EDITAR, E O GATILHO CARIMBA `editado_em`.** No instante em que a linha migrada se
 * move, ela **deixa de ser "nunca editada"** e o `CHECK` passa a cobrar a UE — a gravação seria
 * recusada com `23514`, que na tela é *"o banco recusou: um campo não atende à regra"*. A ação
 * antecipa isso e **pede a unidade**, com a frase que diz o que fazer.
 *
 * ⚠️ **E A ISENÇÃO DA `Q-1` CONTINUA VALENDO:** disciplina marcada `sem_unidades_ensino` (ou curso
 * por competências) **não** precisa de UE, e a condição é a mesma que o `CHECK` usa. ⚠️ **A função
 * `app.disciplina_sem_ue` vive no schema `app`, que o PostgREST NÃO expõe** (medido na spec 011:
 * `PGRST202`, que se lê como *"a função não existe"* e significa *"não é alcançável pela interface
 * de dados"*), então a condição é remontada com uma leitura de `disciplinas` e `cursos` — o **mesmo**
 * dado, e o banco continua sendo quem impõe.
 */
async function faltaAUnidadeDaCatraca(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  origem: OrigemDoFatoValidada,
  fato: FatoDoBanco,
  unidadeMandada: string | null,
): Promise<string | null> {
  /*
   * ⚠️ **A CATRACA É DE `registros_aula`, E SÓ DELA — e a primeira escrita disto a aplicava às
   * QUATRO origens, com uma recusa falsa.** `avaliacoes` e `atividades_nao_letivas` **não têm**
   * coluna de unidade de ensino, e `lerFato` devolve `unidadeEnsinoId: null` para elas por
   * construção. Sem este porteiro, **posicionar uma AVALIAÇÃO herdada** da faixa "Sem posição" era
   * recusado com a frase da `UE-1` — um pedido impossível (não há campo a preencher) sobre uma
   * regra que não se aplica.
   * ⚠️ **Quem pegou foi o percurso da `Q-12`**, cujo primeiro item da faixa é justamente a
   * avaliação herdada; e ele só nomeou a causa depois de a espera passar a imprimir a frase da
   * recusa em vez de um `Expected: 0, Received: 1`.
   */
  if (origem !== "aula") return null;
  if (fato.unidadeEnsinoId !== null || unidadeMandada !== null) return null;
  if (!fato.herdado) return null;

  if (fato.disciplinaId !== null) {
    const { data } = await supabase
      .from("disciplinas")
      .select("sem_unidades_ensino, curso_id")
      .eq("id", fato.disciplinaId)
      .maybeSingle();
    const d = data as { sem_unidades_ensino?: boolean | null; curso_id?: string } | null;
    if (d?.sem_unidades_ensino === true) return null;
    if (d?.curso_id) {
      const { data: curso } = await supabase
        .from("cursos")
        .select("curriculo_modelo")
        .eq("id", d.curso_id)
        .maybeSingle();
      if ((curso as { curriculo_modelo?: string } | null)?.curriculo_modelo === "competencias") {
        return null;
      }
    }
  }

  return (
    "Esta aula veio da migração sem unidade de ensino, e mexer nela passa a exigi-la " +
    "(decisão UE-1). Escolha a unidade de ensino no mesmo ato."
  );
}

/** As colunas de posição de cada origem — é só aqui que a vista difere da aplicação. */
function posicaoPara(
  origem: OrigemDoFatoValidada,
  movimento: { data: string; taInicial: number; tempos?: number | undefined },
): Record<string, string | number> {
  if (origem === "vista_prova") {
    return {
      data_vista_prova: movimento.data,
      ta_inicial_vista: movimento.taInicial,
      ...(movimento.tempos === undefined ? {} : { tempos_consumidos_vista: movimento.tempos }),
    };
  }
  const coluna = origem === "avaliacao" ? "data_avaliacao" : "data";
  return {
    [coluna]: movimento.data,
    ta_inicial: movimento.taInicial,
    ...(movimento.tempos === undefined ? {} : { tempos_consumidos: movimento.tempos }),
  };
}

/** A tabela de cada origem. A vista divide a linha com a aplicação (`RN-AVAL-02`). */
const TABELA_DA_ORIGEM: Readonly<Record<OrigemDoFatoValidada, string>> = {
  aula: "registros_aula",
  avaliacao: "avaliacoes",
  vista_prova: "avaliacoes",
  atividade_nao_letiva: "atividades_nao_letivas",
};

/**
 * O `UPDATE`, com as **duas** recusas tratadas — devolve a mensagem quando falha, `true` quando grava.
 *
 * ⚠️ **AS DUAS SÃO DIFERENTES E AS DUAS CHEGAM COMO «nada aconteceu»:** o erro do banco vem com
 * código e vira frase por `traduzirRecusa`; a policy de `UPDATE` cujo `USING` não casa responde
 * **sucesso com zero linhas**. Tratar só a primeira faria a tela dizer *"movido"* sobre uma grade
 * que não mudou — e é exatamente a forma do defeito da spec 011, em que a falha ficou invisível e
 * duas conferências seguidas procuraram no lugar errado.
 *
 * ⚠️ **`UPDATE … RETURNING` AQUI É SEGURO, ao contrário do `INSERT`** (gotcha 4.1): o problema de lá
 * é que `app.alcanca_turma` é `STABLE` e **não enxerga a linha recém-inserida** dentro do mesmo
 * comando. A linha que se atualiza **já existe** antes do comando, então a policy de `SELECT` a
 * alcança — e é justamente por isso que a lista vazia aqui significa **recusa**, não invisibilidade.
 */
async function gravarNoFato(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  origem: OrigemDoFatoValidada,
  fatoId: string,
  cursoId: string | null,
  campos: Record<string, string | number | null>,
): Promise<true | string> {
  const { data, error } = await supabase
    .from(TABELA_DA_ORIGEM[origem])
    .update(campos)
    .eq("id", fatoId)
    .select("id");

  if (error) {
    return traduzirRecusa(
      error as ErroDoBanco,
      await contextoDoCurso(supabase, cursoId, "lançamento"),
    );
  }
  if ((data ?? []).length === 0) {
    return recusaPorAlcance(await contextoDoCurso(supabase, cursoId, "lançamento"));
  }
  return true;
}

/**
 * **Mover** um fato para outro dia e/ou outro Tempo de Aula (`RF-DSA-07`, `FR-030`, critério **7**).
 *
 * ⚠️ **É `UPDATE` DO MESMO REGISTRO, e é isso que o critério 7 cobra:** *"o `id` continua o mesmo,
 * `criado_por` intacto, `editado_*` carimbado"*. Excluir e recriar daria um identificador novo,
 * perderia `criado_por` e **quebraria a vista de prova**, que é a mesma linha da avaliação.
 *
 * ⚠️ **O TETO DE TFM VALE TAMBÉM NO MOVER** (`FR-024`, `RN-DIST-03` (a)): mover 6 TA de TFM para uma
 * semana que já tem 4 estouraria o teto **sem passar por `lancar`**. É o único bloqueio do épico, e
 * ele não tem porta de serviço.
 *
 * ⚠️ **E O PRÓPRIO BLOCO SAI DA CONTA DO TETO** — ver a nota de `ignorarFatoId`: sem isso, mover
 * dentro da mesma semana contaria o bloco duas vezes e a ação recusaria dizendo que a pessoa passou
 * de um limite que ela não passou.
 */
export async function mover(entrada: unknown): Promise<ResultadoDoLancamento> {
  const conferido = esquemaDoMovimento.safeParse(entrada);
  if (!conferido.success) {
    const { mensagem, campo } = primeira(conferido.error.issues);
    return falha(mensagem, campo);
  }
  const movimento = conferido.data;
  const supabase = await criarClienteDeServidor();

  const fato = await lerFato(supabase, movimento.origem, movimento.fatoId);
  if (fato === null) return falha("Não encontrei este lançamento.");

  const pedeUnidade = await faltaAUnidadeDaCatraca(
    supabase,
    movimento.origem,
    fato,
    movimento.unidadeEnsinoId,
  );
  if (pedeUnidade !== null) return falha(pedeUnidade, "unidadeEnsinoId");

  /*
   * ⚠️ **O `tempos` É SEMPRE ESCRITO, E ISSO FOI CORRIGIDO POR MEDIÇÃO — há uma SEGUNDA catraca no
   * histórico, irmã da da UE.** `reg_aula_tempos_so_nulo_no_historico` aceita `tempos_consumidos`
   * nulo **só** em linha migrada e nunca editada; posicionar um lançamento da faixa "Sem posição"
   * carimba `editado_em`, e o `CHECK` passa a cobrar o valor. Sem escrever o tempo, o movimento era
   * recusado com `23514` **exatamente no caso que a `Q-12` criou** — o do histórico sem posição.
   * ⚠️ **E escrever `fato.tempos` quando nada muda é inofensivo** (é o mesmo valor); o `1` só entra
   * onde não havia duração nenhuma, que é o mínimo honesto para um lançamento que ganha lugar.
   */
  const posicao: Record<string, string | number | null> = {
    ...posicaoPara(movimento.origem, {
      ...movimento,
      tempos: movimento.tempos ?? fato.tempos ?? 1,
    }),
    ...(movimento.unidadeEnsinoId === null ? {} : { unidade_ensino_id: movimento.unidadeEnsinoId }),
  };

  /*
   * ⚠️ **ATIVIDADE GLOBAL NÃO TEM TURMA NEM CURSO, logo não há teto DE TURMA a avaliar** — e isso
   * não é isenção: a `RN-DIST-03` fala da carga **da turma** na semana, e uma atividade que vale
   * para todas não pertence a nenhuma. Ela continua passando pelas duas recusas de `gravarNoFato`.
   */
  if (fato.turmaId === null || fato.cursoId === null) {
    const alterado = await gravarNoFato(
      supabase,
      movimento.origem,
      movimento.fatoId,
      fato.cursoId,
      posicao,
    );
    if (typeof alterado === "string") return falha(alterado);
    revalidar();
    return { ok: true, id: movimento.fatoId, avisos: [] };
  }

  const veredito = await vereditoDosTetos(supabase, {
    turmaId: fato.turmaId,
    cursoId: fato.cursoId,
    data: movimento.data,
    taInicial: movimento.taInicial,
    tempos: movimento.tempos ?? fato.tempos ?? 1,
    disciplinaId: fato.disciplinaId,
    ignorarFatoId: movimento.fatoId,
  });
  const bloqueio = veredito.bloqueios[0];
  if (bloqueio !== undefined) return falha(bloqueio);

  const alterado = await gravarNoFato(
    supabase,
    movimento.origem,
    movimento.fatoId,
    fato.cursoId,
    posicao,
  );
  if (typeof alterado === "string") return falha(alterado);
  revalidar();
  return {
    ok: true,
    id: movimento.fatoId,
    avisos: veredito.alertas.map((texto, i) => ({ codigo: `alerta-${i}`, texto })),
  };
}

/**
 * **Editar** um fato pela grade — sem tocar o catálogo (`FR-029`, `SC-012`).
 *
 * ⚠️ **O QUE ELE NÃO TOCA É O QUE IMPORTA: O CATÁLOGO.** O `D-4` da planilha é exatamente isto —
 * *"instrutor, local e técnica são atributo DO ITEM do catálogo, não do lançamento: trocar o
 * instrutor de uma UE reescreve todo DSA passado"*. Aqui cada campo é **da linha**, e editar um
 * lançamento de março não muda nenhum outro.
 *
 * ⚠️ **A TROCA DE INSTRUTOR PASSA PELO PORTEIRO DE HABILITAÇÃO** (`RN-INST-01`, *Risco: Alto*). Sem
 * isto haveria **uma porta lateral**: lançar com quem é habilitado e depois trocar por quem não é.
 * A Server Action é a **única** defesa — não há FK nem gatilho, medido —, e `editar` é o segundo
 * lugar por onde um instrutor entra numa aula.
 *
 * ⚠️ **CAMPO NÃO MANDADO NÃO É TOCADO.** `undefined` é *"não mandou"* e `null` é *"apague"*: um
 * esquema que confundisse os dois apagaria o que a tela não enviou — o defeito medido na spec 011,
 * em que um campo fora da tela mandando `null` apagava o vínculo a cada gravação.
 */
export async function editar(entrada: unknown): Promise<ResultadoDoLancamento> {
  const conferido = esquemaDaEdicao.safeParse(entrada);
  if (!conferido.success) {
    const { mensagem, campo } = primeira(conferido.error.issues);
    return falha(mensagem, campo);
  }
  const edicao = conferido.data;
  const supabase = await criarClienteDeServidor();

  const fato = await lerFato(supabase, edicao.origem, edicao.fatoId);
  if (fato === null) return falha("Não encontrei este lançamento.");

  const pedeUnidade = await faltaAUnidadeDaCatraca(
    supabase,
    edicao.origem,
    fato,
    edicao.unidadeEnsinoId ?? null,
  );
  if (pedeUnidade !== null) return falha(pedeUnidade, "unidadeEnsinoId");

  if (edicao.instrutorId != null && fato.disciplinaId !== null) {
    const atuacao: Atuacao = edicao.origem === "aula" ? "ministrar" : "avaliacao";
    const recusa = await conferirHabilitacao(
      supabase,
      atuacao,
      edicao.instrutorId,
      fato.disciplinaId,
    );
    if (recusa !== null) return falha(recusa, "instrutorId");
  }

  /*
   * ⚠️ **OS NOMES DE COLUNA DIFEREM ENTRE AS TRÊS TABELAS, e mandar o errado dá `42703`** —
   * *"coluna não existe"* —, que na tela se lê como defeito do sistema.
   * `atividades_nao_letivas` guarda `descricao` (não `conteudo_resumo`) e não tem `metodologia`;
   * `avaliacoes` guarda `instrutor_responsavel_id` (não `instrutor_id`); e a **vista** usa
   * `local_vista` e `tempos_consumidos_vista`, porque divide a linha com a aplicação.
   */
  const campos: Record<string, string | number | null> = {};
  if (edicao.local !== undefined) {
    campos[edicao.origem === "vista_prova" ? "local_vista" : "local"] = edicao.local;
  }
  if (edicao.tempos !== undefined) {
    campos[edicao.origem === "vista_prova" ? "tempos_consumidos_vista" : "tempos_consumidos"] =
      edicao.tempos;
  }
  if (edicao.unidadeEnsinoId !== undefined && edicao.origem === "aula") {
    campos["unidade_ensino_id"] = edicao.unidadeEnsinoId;
  }
  if (edicao.origem === "aula") {
    if (edicao.conteudo !== undefined) campos["conteudo_resumo"] = edicao.conteudo;
    if (edicao.tecnica !== undefined) campos["metodologia"] = edicao.tecnica;
    if (edicao.instrutorId !== undefined) campos["instrutor_id"] = edicao.instrutorId;
  } else if (edicao.origem === "avaliacao") {
    if (edicao.conteudo !== undefined) campos["conteudo_resumo"] = edicao.conteudo;
    if (edicao.tecnica !== undefined) campos["metodologia"] = edicao.tecnica;
    if (edicao.instrutorId !== undefined) campos["instrutor_responsavel_id"] = edicao.instrutorId;
  } else if (edicao.origem === "atividade_nao_letiva") {
    if (edicao.conteudo !== undefined) campos["descricao"] = edicao.conteudo;
    if (edicao.instrutorId !== undefined) campos["instrutor_id"] = edicao.instrutorId;
  }

  if (Object.keys(campos).length === 0) {
    return falha("Nada mudou: nenhum campo foi alterado.");
  }

  const alterado = await gravarNoFato(supabase, edicao.origem, edicao.fatoId, fato.cursoId, campos);
  if (typeof alterado === "string") return falha(alterado);
  revalidar();
  return { ok: true, id: edicao.fatoId, avisos: [] };
}

/**
 * **Excluir** um fato — e a exclusão é **lógica** (regra 4, `FR-031`).
 *
 * ⚠️ **ZERO `DELETE`, E A GUARDA CONTA ISSO NO CATÁLOGO INTEIRO.** A asserção de pgTAP que conta
 * `pg_policy.polcmd = 'd'` segue em **zero**, e a regra 4 diz que *"PR que acrescenta `for delete`
 * é rejeitado sem discussão"*. Aqui o que muda é a coluna de situação.
 *
 * ⚠️ **AVALIAÇÃO USA `cancelada`, NÃO `inativo`, e isso não é inconsistência:** `avaliacoes.status`
 * é um ENUM próprio (`status_avaliacao`), medido no tipo gerado — mandar `inativo` ali daria
 * `22P02`, *valor inválido para o enum*.
 *
 * ⚠️ **E EXCLUIR A VISTA NÃO CANCELA A AVALIAÇÃO:** aplicação e vista são o **mesmo fato**
 * (`RN-AVAL-02`), então *"excluir a vista"* é **apagar a segunda data**, não cancelar a prova que
 * já aconteceu. Cancelar a linha inteira apagaria da CHD uma avaliação que foi aplicada.
 */
export async function excluir(entrada: unknown): Promise<ResultadoDoLancamento> {
  const conferido = esquemaDaExclusao.safeParse(entrada);
  if (!conferido.success) {
    const { mensagem, campo } = primeira(conferido.error.issues);
    return falha(mensagem, campo);
  }
  const { fatoId, origem } = conferido.data;
  const supabase = await criarClienteDeServidor();

  const fato = await lerFato(supabase, origem, fatoId);
  if (fato === null) return falha("Não encontrei este lançamento.");

  const campos: Record<string, string | number | null> =
    origem === "vista_prova"
      ? {
          data_vista_prova: null,
          ta_inicial_vista: null,
          tempos_consumidos_vista: null,
          local_vista: null,
        }
      : origem === "avaliacao"
        ? { status: "cancelada" }
        : { status: "inativo" };

  const alterado = await gravarNoFato(supabase, origem, fatoId, fato.cursoId, campos);
  if (typeof alterado === "string") return falha(alterado);
  revalidar();
  return { ok: true, id: fatoId, avisos: [] };
}
