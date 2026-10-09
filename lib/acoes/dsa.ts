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
import {
  motivoDoBloqueio,
  recusaDeAulaNoDia,
  type FeriadoDoCalendario,
} from "@/lib/dominio/dsa/dia-bloqueado";
import { recusaForaDaEtapa } from "@/lib/dominio/dsa/etapa-presencial";
import { avisoDoEmpurrao, empurrarEmCascata, ultimoTempoDoDia } from "@/lib/dominio/dsa/empurrar";
import type { Json } from "@/lib/tipos/database";
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import {
  esquemaDaAtualizacao,
  esquemaDaEdicao,
  esquemaDaExclusao,
  esquemaDoBloco,
  esquemaDoEstudoIndividualDaSemana,
  esquemaDoMovimento,
  type Atualizacao,
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
 * O veredito dos tetos para um lançamento de aula — **o único bloqueio de TETO do DSA**
 * (`RN-DIST-03` (a)). O outro bloqueio do DSA não é teto: é o dia bloqueado no calendário
 * (`RN-EVT-04`, `recusaDoCalendario`).
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
     * (a) é o único teto rígido do épico, e um bloqueio por conta errada é pior que bloqueio nenhum.
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
 * O porteiro do calendário (`RN-EVT-04`, decisão de Bernardo Villas Boas de 07/10/2026): aula não
 * entra em dia de feriado de dia inteiro **ativo**.
 *
 * ⚠️ **QUEM DECIDE QUAL DIA ESTÁ BLOQUEADO É `motivoDoBloqueio`** — a mesma função que pinta o dia na
 * grade. Aqui só se lê o calendário daquela data; o `status` vem junto e a função o confere, para
 * que o feriado inativado (regra 4) não recuse nada.
 *
 * ⚠️ **A SERVER ACTION É A DEFESA, NÃO A TELA.** A grade marca o dia e abre o formulário mesmo assim:
 * a recusa chega daqui, com a frase da decisão. Não há `CHECK` nem gatilho, de propósito — a carga das
 * planilhas e o histórico podem ter aula num dia que o calendário só bloqueou depois (ver a regra).
 */
async function recusaDoCalendario(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  data: string,
  dataAtual: string | null = null,
): Promise<string | null> {
  const { data: linhas } = await supabase
    .from("feriados")
    .select("data, descricao, impacto, status")
    .eq("data", data)
    .eq("status", "ativo");
  return recusaDeAulaNoDia({
    data,
    dataAtual,
    feriados: (linhas ?? []) as FeriadoDoCalendario[],
  });
}

/**
 * O porteiro da etapa presencial (`D-DSA-2`, decisão de Bernardo Villas Boas de 08/10/2026): turma
 * semipresencial não recebe lançamento em dia fora da etapa presencial cadastrada.
 *
 * ⚠️ **QUEM DECIDE É `recusaForaDaEtapa`** — a mesma função que faz a tela trocar a grade pela frase
 * *"Etapa a distância — sem DSA nesta semana"*. Aqui só se lê a turma.
 *
 * ⚠️ **SEM JANELA NÃO RECUSA** (`RN-DEG-01`): a decisão manda avisar e não bloquear, e quem avisa é a
 * tela. ⚠️ **E TURMA ILEGÍVEL TAMBÉM NÃO**: sem a linha não há modalidade, e a gravação seguinte é
 * quem esbarra na RLS — inventar uma recusa de etapa ali diria uma coisa falsa.
 */
async function recusaDaEtapa(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  turmaId: string | null,
  data: string,
): Promise<string | null> {
  if (turmaId === null) return null;
  const { data: turma } = await supabase
    .from("turmas")
    .select("modalidade, inicio_etapa_presencial, termino_etapa_presencial")
    .eq("id", turmaId)
    .maybeSingle();
  if (!turma) return null;
  return recusaForaDaEtapa(
    {
      modalidade: (turma.modalidade as string | null) ?? null,
      inicioEtapaPresencial: (turma.inicio_etapa_presencial as string | null) ?? null,
      terminoEtapaPresencial: (turma.termino_etapa_presencial as string | null) ?? null,
    },
    data,
  );
}

/** Uma operação de `public.gravar_lancamentos_em_transacao` — aplicada junto com as outras, ou nada. */
type Operacao = {
  readonly acao: "inserir" | "atualizar";
  readonly tabela: string;
  readonly id?: string;
  readonly campos: Record<string, string | number | null>;
};

const PALAVRA_DA_ORIGEM: Readonly<Record<string, string>> = {
  aula: "aula",
  avaliacao: "avaliação",
  vista_prova: "vista de prova",
  atividade_nao_letiva: "atividade",
};

/**
 * A cascata da `D-DSA-3` no dia — **quem decide é `empurrarEmCascata`**, em `lib/dominio/dsa/empurrar.ts`.
 * Aqui só se lê a ocupação da turma naquele dia, o regime e os códigos das disciplinas, e se traduz o
 * resultado em operações para a função transacional.
 *
 * ⚠️ **OS EMPURRADOS FICAM NO MESMO DIA, e por isso feriado, etapa presencial e teto semanal de TFM
 * não mudam para eles** — o dia é o mesmo do bloco (já conferido), e a semana é a mesma (a soma da
 * disciplina não muda). É o que a decisão chama de *"passa pelas mesmas regras do mover"*.
 *
 * ⚠️ **SÓ A OCUPAÇÃO DESTA TURMA** (`turma_id = …`): a atividade global vale para todas e não se empurra.
 */
async function cascataDaTurma(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  entrada: {
    readonly turmaId: string | null;
    readonly cursoId: string | null;
    readonly data: string;
    readonly taInicial: number;
    readonly tempos: number;
    readonly fatoId?: string;
  },
): Promise<
  | { readonly ok: true; readonly operacoes: readonly Operacao[]; readonly aviso: string | null }
  | { readonly ok: false; readonly mensagem: string }
> {
  if (entrada.turmaId === null) return { ok: true, operacoes: [], aviso: null };
  const [ocupacaoRes, regimeRes] = await Promise.all([
    supabase
      .from("vw_ocupacao_ta")
      .select("fato_id, origem, ta_inicial, tempos_consumidos, disciplina_id")
      .eq("turma_id", entrada.turmaId)
      .eq("data", entrada.data),
    entrada.cursoId === null
      ? Promise.resolve({ data: null })
      : supabase
          .from("vw_cursos_regime_vigente")
          .select("regime_padrao_tempos")
          .eq("curso_id", entrada.cursoId)
          .maybeSingle(),
  ]);
  const linhas = (
    (ocupacaoRes.data ?? []) as {
      fato_id: string;
      origem: string;
      ta_inicial: number | null;
      tempos_consumidos: number | null;
      disciplina_id: string | null;
    }[]
  ).filter((l) => l.ta_inicial !== null && l.fato_id !== entrada.fatoId);

  const ids = [
    ...new Set(linhas.map((l) => l.disciplina_id).filter((d): d is string => d !== null)),
  ];
  const { data: discs } =
    ids.length === 0
      ? { data: [] }
      : await supabase.from("disciplinas").select("id, cod_disciplina").in("id", ids);
  const codigo = new Map(
    ((discs ?? []) as { id: string; cod_disciplina: string }[]).map((d) => [
      d.id,
      d.cod_disciplina,
    ]),
  );
  const origemDe = new Map(linhas.map((l) => [l.fato_id, l.origem]));

  const resultado = empurrarEmCascata({
    bloco: {
      taInicial: entrada.taInicial,
      tempos: entrada.tempos,
      ...(entrada.fatoId === undefined ? {} : { fatoId: entrada.fatoId }),
    },
    doDia: linhas.map((l) => {
      const palavra = PALAVRA_DA_ORIGEM[l.origem] ?? "lançamento";
      const cod = l.disciplina_id === null ? undefined : codigo.get(l.disciplina_id);
      return {
        fatoId: l.fato_id,
        rotulo: cod === undefined ? palavra : `${palavra} de ${cod}`,
        taInicial: l.ta_inicial as number,
        tempos: l.tempos_consumidos ?? 1,
      };
    }),
    ultimoTempo: ultimoTempoDoDia(
      (regimeRes.data as { regime_padrao_tempos?: number | null } | null)?.regime_padrao_tempos ??
        null,
    ),
    data: entrada.data,
  });
  if (resultado.tipo === "recusa") return { ok: false, mensagem: resultado.mensagem };

  const operacoes: Operacao[] = resultado.empurrados.map((e) => {
    const origem = (origemDe.get(e.fatoId) ?? "aula") as OrigemDoFatoValidada;
    return {
      acao: "atualizar",
      tabela: TABELA_DA_ORIGEM[origem],
      id: e.fatoId,
      campos: origem === "vista_prova" ? { ta_inicial_vista: e.paraTa } : { ta_inicial: e.paraTa },
    };
  });
  return { ok: true, operacoes, aviso: avisoDoEmpurrao(resultado.empurrados, entrada.data) };
}

/** Aplica as operações numa transação só — devolve a frase da recusa, ou `true`. */
async function gravarEmTransacao(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  operacoes: readonly Operacao[],
  cursoId: string | null,
): Promise<true | string> {
  const { error } = await supabase.rpc("gravar_lancamentos_em_transacao", {
    p_operacoes: operacoes as unknown as Json,
  });
  if (error) {
    return traduzirRecusa(
      error as ErroDoBanco,
      await contextoDoCurso(supabase, cursoId, "lançamento"),
    );
  }
  return true;
}

/** Os alertas de sempre, mais o do empurrão (`D-DSA-3`), no formato que a tela lê. */
function comAviso(alertas: readonly string[], empurrao: string | null): readonly Aviso[] {
  return [...alertas, ...(empurrao === null ? [] : [empurrao])].map((texto, i) => ({
    codigo: `alerta-${i}`,
    texto,
  }));
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

  /*
   * ⚠️ **`D-DSA-2`: O DIA FORA DA ETAPA PRESENCIAL VEM ANTES DE TUDO, PARA TODO TIPO DE BLOCO.** A
   * semana da etapa a distância não tem DSA — nem aula, nem avaliação, nem atividade —, e a tela
   * que esconde a grade não é a defesa: esta ação é endpoint HTTP de fato.
   */
  const daEtapa = await recusaDaEtapa(supabase, bloco.turmaId, bloco.data);
  if (daEtapa !== null) return falha(daEtapa);

  /*
   * ⚠️ **`D-DSA-3`: O BLOCO NOVO EMPURRA OS SEGUINTES** (decisão de Bernardo Villas Boas, 08/10/2026,
   * no lugar do aviso de sobreposição). Não cabendo, recusa ANTES de gravar qualquer coisa; cabendo, o
   * lançamento e os empurrados vão numa transação só (`gravarBloco`).
   */
  const cascata = await cascataDaTurma(supabase, {
    turmaId: bloco.turmaId,
    cursoId: "cursoId" in bloco ? bloco.cursoId : null,
    data: bloco.data,
    taInicial: bloco.taInicial,
    tempos: bloco.tempos,
    ...(bloco.tipo === "vista_prova" ? { fatoId: bloco.avaliacaoId } : {}),
  });
  if (!cascata.ok) return falha(cascata.mensagem);
  const sobreposicao = cascata.aviso;

  /** Grava a linha — sozinha, ou junto com os empurrados numa transação. */
  const gravarBloco = async (
    tabela: string,
    linha: Record<string, string | number | null>,
    atualizarId?: string,
  ): Promise<string | null> => {
    if (cascata.operacoes.length === 0) {
      const { error } =
        atualizarId === undefined
          ? await supabase.from(tabela as "registros_aula").insert(linha as never)
          : await supabase
              .from(tabela as "avaliacoes")
              .update(linha as never)
              .eq("id", atualizarId);
      return error ? traduzirRecusa(error as ErroDoBanco) : null;
    }
    const principal: Operacao =
      atualizarId === undefined
        ? { acao: "inserir", tabela, campos: linha }
        : { acao: "atualizar", tabela, id: atualizarId, campos: linha };
    const gravado = await gravarEmTransacao(
      supabase,
      [principal, ...cascata.operacoes],
      "cursoId" in bloco ? bloco.cursoId : null,
    );
    return gravado === true ? null : gravado;
  };

  if (bloco.tipo === "aula") {
    /* ⚠️ `RN-EVT-04`: o dia vem antes de tudo — se o calendário o bloqueia, nada mais importa. */
    const doCalendario = await recusaDoCalendario(supabase, bloco.data);
    if (doCalendario !== null) return falha(doCalendario);

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
     * ⚠️ **O TETO DE TFM É O ÚNICO TETO QUE BLOQUEIA** (`RN-DIST-03` (a)), e ele é conferido
     * **antes** de gravar — como o dia bloqueado no calendário, acima (`RN-EVT-04`). Os demais — teto recomendado, dia além do regime, TA excepcional — são
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

    const erro = await gravarBloco("registros_aula", {
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
    if (erro !== null) return falha(erro);
    revalidar();
    return { ok: true, id, avisos: comAviso(veredito.alertas, sobreposicao) };
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

    const erro = await gravarBloco("avaliacoes", {
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
    if (erro !== null) return falha(erro);
    revalidar();
    return { ok: true, id, avisos: comAviso([], sobreposicao) };
  }

  if (bloco.tipo === "vista_prova") {
    /*
     * ⚠️ **A VISTA É `UPDATE` NA MESMA LINHA, NUNCA `INSERT`** (`RN-AVAL-02`): aplicação e vista são
     * o **mesmo fato**, e criar outra linha faria a CHD contar duas vezes.
     */
    const erro = await gravarBloco(
      "avaliacoes",
      {
        data_vista_prova: bloco.data,
        ta_inicial_vista: bloco.taInicial,
        tempos_consumidos_vista: bloco.tempos,
        local_vista: bloco.local,
      },
      bloco.avaliacaoId,
    );
    if (erro !== null) return falha(erro);
    revalidar();
    return { ok: true, id: bloco.avaliacaoId, avisos: comAviso([], sobreposicao) };
  }

  const erro = await gravarBloco("atividades_nao_letivas", {
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
    /* A disciplina OPCIONAL da AEC (item 1b, 08/10/2026); o banco confere que é do curso da turma. */
    disciplina_id: bloco.disciplinaId,
  });
  if (erro !== null) return falha(erro);
  revalidar();
  return { ok: true, id, avisos: comAviso([], sobreposicao) };
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
  const [ocupacaoRes, feriadosRes, eiRes, turmaRes] = await Promise.all([
    supabase
      .from("vw_ocupacao_ta")
      .select("data, ta_final")
      .eq("turma_id", turmaId)
      .gte("data", de)
      .lte("data", ate),
    supabase
      .from("feriados")
      .select("data, descricao, impacto, status")
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
    supabase
      .from("turmas")
      .select("modalidade, inicio_etapa_presencial, termino_etapa_presencial")
      .eq("id", turmaId)
      .maybeSingle(),
  ]);

  /* ⚠️ O dia bloqueado é o da MESMA função da grade e da recusa de aula (`RN-EVT-04`). */
  const feriados = (feriadosRes.data ?? []) as FeriadoDoCalendario[];
  /*
   * ⚠️ **E O DIA DA ETAPA A DISTÂNCIA TAMBÉM É PULADO** (`D-DSA-2`): a semana que a janela corta ao
   * meio tem DSA, mas o dia de fora não — pela mesma função que recusa o lançamento um a um.
   */
  const turmaDaEtapa = turmaRes.data
    ? {
        modalidade: (turmaRes.data.modalidade as string | null) ?? null,
        inicioEtapaPresencial: (turmaRes.data.inicio_etapa_presencial as string | null) ?? null,
        terminoEtapaPresencial: (turmaRes.data.termino_etapa_presencial as string | null) ?? null,
      }
    : null;
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
    if (motivoDoBloqueio(dia, feriados) !== null) {
      pulados.push(dia);
      continue;
    }
    if (turmaDaEtapa !== null && recusaForaDaEtapa(turmaDaEtapa, dia) !== null) {
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
 * ⚠️ **DESDE A `D-DSA-1` (08/10/2026) A ISENÇÃO DA `Q-1` É REGRA GERAL:** a linha que aponta a
 * disciplina na coluna não precisa de UE, em curso nenhum — é o que o `CHECK` emendado em
 * `20261008164612` aceita. A condição deixou de depender de `app.disciplina_sem_ue`, e a função
 * deixou de ler `disciplinas` e `cursos` para remontá-la. Sem UE **e** sem disciplina — o estado das
 * 1.566 linhas do ETL —, a catraca continua pedindo a unidade.
 */
function faltaAUnidadeDaCatraca(
  origem: OrigemDoFatoValidada,
  fato: FatoDoBanco,
  unidadeMandada: string | null,
): string | null {
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

  /*
   * ⚠️ **DESDE A `D-DSA-1` (08/10/2026) A LINHA QUE APONTA A DISCIPLINA NÃO PRECISA DE UE, em
   * disciplina NENHUMA** — a isenção da `Q-1` virou regra geral, e o `CHECK` passou a aceitar
   * `disciplina_id` com tópico em qualquer curso. Até ali esta função remontava a isenção lendo
   * `disciplinas` e `cursos`; as duas leituras saíram junto com a condição. Sem UE **e** sem
   * disciplina, a catraca continua pedindo a unidade.
   * ⚠️ Como a UE é nula aqui, `fato.disciplinaId` só pode ter vindo da COLUNA — é ela que o `CHECK` lê.
   */
  if (fato.disciplinaId !== null) return null;

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
 * **Atualizar** um fato de uma vez — o cartão único (ajuste 1 do PR #40, Bernardo Villas Boas,
 * 08/10/2026): dia, tempo, quantos tempos, disciplina/UE, tópico, quem ministra, técnica e local, com
 * **uma** Server Action e **uma** transação. `mover` (o arrastar) e `editar` delegam para cá.
 *
 * ⚠️ **É `UPDATE` DO MESMO REGISTRO** (critério 7): o `id` continua, `criado_por` intacto,
 * `editado_*` carimbado — e os empurrados da `D-DSA-3` também.
 *
 * ⚠️ **OS PORTEIROS, NA ORDEM:** dia bloqueado no calendário (`RN-EVT-04`, só aula) e etapa presencial
 * (`D-DSA-2`) quando o dia muda; a catraca da UE da linha histórica (`Q-1`); a habilitação de quem
 * ministra (`RN-INST-01`); o **teto de TFM** quando o tamanho, o dia ou a disciplina mudam — e isto é a
 * dúvida 2 do lote, que valia só no mover e passa a valer no editar; e a cascata (`D-DSA-3`) quando a
 * posição ou o tamanho mudam.
 *
 * ⚠️ **SÓ O QUE MUDOU DISPARA O TETO E A CASCATA**: editar o tópico de uma semana histórica que já
 * passa do teto não pode ser recusado por uma conta que ele não alterou.
 *
 * ⚠️ **CAMPO NÃO MANDADO NÃO É TOCADO.** `undefined` é *"não mandou"*; `null` é *"apague"*.
 */
async function aplicarAtualizacao(a: Atualizacao): Promise<ResultadoDoLancamento> {
  const supabase = await criarClienteDeServidor();
  const fato = await lerFato(supabase, a.origem, a.fatoId);
  if (fato === null) return falha("Não encontrei este lançamento.");

  const data = a.data ?? fato.data;
  const taInicial = a.taInicial ?? fato.taInicial;
  if (data === null || taInicial === null) {
    return falha("Escolha o dia e o tempo em que este lançamento começa.", "taInicial");
  }
  const tempos = a.tempos ?? fato.tempos ?? 1;
  const mudouDia = data !== fato.data;
  const mudouPosicao = mudouDia || taInicial !== fato.taInicial;
  const mudouTamanho = tempos !== fato.tempos;

  if (a.origem === "aula") {
    const doCalendario = await recusaDoCalendario(supabase, data, fato.data);
    if (doCalendario !== null) return falha(doCalendario);
  }
  if (mudouDia) {
    const daEtapa = await recusaDaEtapa(supabase, fato.turmaId, data);
    if (daEtapa !== null) return falha(daEtapa);
  }

  /* A disciplina mandada (aula sem UE, `D-DSA-1`) também satisfaz a catraca da linha histórica. */
  if (a.disciplinaId == null) {
    const pedeUnidade = faltaAUnidadeDaCatraca(a.origem, fato, a.unidadeEnsinoId ?? null);
    if (pedeUnidade !== null) return falha(pedeUnidade, "unidadeEnsinoId");
  }

  /* A disciplina da aula DEPOIS da atualização — a da UE nova, a da coluna nova, ou a de sempre. */
  let disciplinaId = fato.disciplinaId;
  if (a.origem === "aula" && a.unidadeEnsinoId != null) {
    const { data: ue } = await supabase
      .from("unidades_ensino")
      .select("disciplina_id")
      .eq("id", a.unidadeEnsinoId)
      .maybeSingle();
    disciplinaId = (ue as { disciplina_id?: string } | null)?.disciplina_id ?? disciplinaId;
  } else if (a.origem === "aula" && a.disciplinaId != null) {
    disciplinaId = a.disciplinaId;
  }
  const mudouDisciplina = disciplinaId !== fato.disciplinaId;

  if (a.instrutorId != null && disciplinaId !== null) {
    const atuacao: Atuacao = a.origem === "aula" ? "ministrar" : "avaliacao";
    const recusa = await conferirHabilitacao(supabase, atuacao, a.instrutorId, disciplinaId);
    if (recusa !== null) return falha(recusa, "instrutorId");
  }

  let alertas: readonly string[] = [];
  if (
    fato.turmaId !== null &&
    fato.cursoId !== null &&
    (mudouTamanho || mudouDia || mudouDisciplina)
  ) {
    const veredito = await vereditoDosTetos(supabase, {
      turmaId: fato.turmaId,
      cursoId: fato.cursoId,
      data,
      taInicial,
      tempos,
      disciplinaId,
      ignorarFatoId: a.fatoId,
    });
    const bloqueio = veredito.bloqueios[0];
    if (bloqueio !== undefined) return falha(bloqueio);
    alertas = veredito.alertas;
  }

  const cascata =
    mudouPosicao || mudouTamanho
      ? await cascataDaTurma(supabase, {
          turmaId: fato.turmaId,
          cursoId: fato.cursoId,
          data,
          taInicial,
          tempos,
          fatoId: a.fatoId,
        })
      : ({ ok: true, operacoes: [], aviso: null } as const);
  if (!cascata.ok) return falha(cascata.mensagem);

  /*
   * ⚠️ **OS NOMES DE COLUNA DIFEREM ENTRE AS TRÊS TABELAS, e mandar o errado dá `42703`.**
   * `atividades_nao_letivas` guarda `descricao` e não tem `metodologia`; `avaliacoes` guarda
   * `instrutor_responsavel_id`; e a **vista** usa `local_vista` e `tempos_consumidos_vista`.
   * ⚠️ **O `tempos` É SEMPRE ESCRITO quando a posição muda** — a catraca irmã
   * `reg_aula_tempos_so_nulo_no_historico` cobra o valor no instante em que a linha histórica é editada.
   */
  const campos: Record<string, string | number | null> = {
    ...(mudouPosicao || mudouTamanho || fato.tempos === null
      ? posicaoPara(a.origem, { data, taInicial, tempos })
      : {}),
  };
  if (a.local !== undefined) {
    campos[a.origem === "vista_prova" ? "local_vista" : "local"] = a.local;
  }
  if (a.origem === "aula") {
    if (a.unidadeEnsinoId !== undefined) {
      campos["unidade_ensino_id"] = a.unidadeEnsinoId;
      if (a.unidadeEnsinoId !== null) campos["disciplina_id"] = null;
    }
    if (a.disciplinaId !== undefined) {
      campos["disciplina_id"] = a.disciplinaId;
      if (a.disciplinaId !== null) campos["unidade_ensino_id"] = null;
    }
    if (a.conteudo !== undefined) campos["conteudo_resumo"] = a.conteudo;
    if (a.tecnica !== undefined) campos["metodologia"] = a.tecnica;
    if (a.instrutorId !== undefined) campos["instrutor_id"] = a.instrutorId;
  } else if (a.origem === "avaliacao") {
    if (a.conteudo !== undefined) campos["conteudo_resumo"] = a.conteudo;
    if (a.tecnica !== undefined) campos["metodologia"] = a.tecnica;
    if (a.instrutorId !== undefined) campos["instrutor_responsavel_id"] = a.instrutorId;
  } else if (a.origem === "atividade_nao_letiva") {
    if (a.conteudo !== undefined) campos["descricao"] = a.conteudo;
    if (a.instrutorId !== undefined) campos["instrutor_id"] = a.instrutorId;
  }

  if (Object.keys(campos).length === 0) {
    return falha("Nada mudou: nenhum campo foi alterado.");
  }

  const gravado =
    cascata.operacoes.length === 0
      ? await gravarNoFato(supabase, a.origem, a.fatoId, fato.cursoId, campos)
      : await gravarEmTransacao(
          supabase,
          [
            { acao: "atualizar", tabela: TABELA_DA_ORIGEM[a.origem], id: a.fatoId, campos },
            ...cascata.operacoes,
          ],
          fato.cursoId,
        );
  if (typeof gravado === "string") return falha(gravado);
  revalidar();
  return { ok: true, id: a.fatoId, avisos: comAviso(alertas, cascata.aviso) };
}

/** O cartão único: tudo de um lançamento, numa gravação só (ajuste 1 do PR #40). */
export async function atualizar(entrada: unknown): Promise<ResultadoDoLancamento> {
  const conferido = esquemaDaAtualizacao.safeParse(entrada);
  if (!conferido.success) {
    const { mensagem, campo } = primeira(conferido.error.issues);
    return falha(mensagem, campo);
  }
  return aplicarAtualizacao(conferido.data);
}

/**
 * **Mover** — o arrastar-e-soltar da grade (`RF-DSA-07`, `FR-030`). Delega ao núcleo de `atualizar`:
 * os mesmos porteiros, a mesma cascata, a mesma transação.
 */
export async function mover(entrada: unknown): Promise<ResultadoDoLancamento> {
  const conferido = esquemaDoMovimento.safeParse(entrada);
  if (!conferido.success) {
    const { mensagem, campo } = primeira(conferido.error.issues);
    return falha(mensagem, campo);
  }
  const m = conferido.data;
  return aplicarAtualizacao({
    fatoId: m.fatoId,
    origem: m.origem,
    data: m.data,
    taInicial: m.taInicial,
    ...(m.tempos === undefined ? {} : { tempos: m.tempos }),
    ...(m.unidadeEnsinoId === null ? {} : { unidadeEnsinoId: m.unidadeEnsinoId }),
  });
}

/** **Editar** sem mexer na posição (`FR-029`). Delega ao núcleo de `atualizar`. */
export async function editar(entrada: unknown): Promise<ResultadoDoLancamento> {
  const conferido = esquemaDaEdicao.safeParse(entrada);
  if (!conferido.success) {
    const { mensagem, campo } = primeira(conferido.error.issues);
    return falha(mensagem, campo);
  }
  return aplicarAtualizacao(conferido.data);
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
