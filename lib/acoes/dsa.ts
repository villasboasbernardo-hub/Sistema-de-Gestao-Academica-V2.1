"use server";

/**
 * Server Actions do DSA — **lançar** (`RF-DSA-04`, `RF-AVAL-04` a `06`, `RF-EXTRA-01`, `Q-1`, `Q-7`,
 * `Q-8` · spec 013, PR 2). Editar, mover e excluir são do PR 4.
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

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { podeAtuar, type Atuacao, type VinculoDeHabilitacao } from "@/lib/dominio/habilitacao";
import { avaliarODia, avaliarTetosDaSemana, type TetosDoDsa } from "@/lib/dominio/dsa/tetos";
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { slotDoEstudoIndividual } from "@/lib/dominio/dsa/horario-do-bloco";
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import { esquemaDoBloco, esquemaDoEstudoIndividualDaSemana, type Bloco } from "@/lib/validacao/dsa";

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
  },
): Promise<{ readonly bloqueios: readonly string[]; readonly alertas: readonly string[] }> {
  const tetos = await tetosDoBanco(supabase);
  const semana = semanaIsoDe(entrada.data);
  if (tetos === null || semana === null) return { bloqueios: [], alertas: [] };

  const [ocupacaoRes, discRes, regimeRes] = await Promise.all([
    supabase
      .from("vw_ocupacao_ta")
      .select("data, disciplina_id, tempos_consumidos, ta_final")
      .eq("turma_id", entrada.turmaId)
      .gte("data", semana.segunda)
      .lte("data", semana.domingo),
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
      categoria_normativa: "Estudo_Individual",
      escopo: "turma",
      turma_id: turmaId,
      data: dia,
      subtipo: "Estudo Individual",
      descricao: "ESTUDO INDIVIDUAL",
      ta_inicial: slot,
      tempos_consumidos: 1,
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
