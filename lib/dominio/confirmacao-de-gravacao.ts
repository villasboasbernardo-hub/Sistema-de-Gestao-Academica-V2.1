/**
 * `FR-018.1` — quais gravações confirmam antes de salvar.
 *
 * > *"Confirma **só o que é difícil de desfazer** (A-9, 17/09/2026) — 'confirmação em toda gravação
 * > treina a pessoa a clicar sem ler, e a confirmação falha exatamente quando importa'. A lista é
 * > **fechada**: 1. **desativar** e **reativar** curso; 2. **registrar** e **corrigir** vigência de
 * > regime; 3. **editar curso** quando muda a **sigla** (`FR-014.1`), muda a **classificação**
 * > (`FR-016.1`) ou baixa o **limite** abaixo da contagem de algum ano (`FR-030.1`); 4. **criar ou
 * > editar turma** quando passa do **limite** do ano (`FR-030`) ou quando a mudança de janela ou de
 * > curso **deixa vigência sem proteção** (`FR-021.8`); 5. **desativar sala em uso** (`FR-029.4`).
 * > **Nenhuma outra gravação confirma** — criar ou editar curso e turma fora desses casos,
 * > acrescentar e reativar sala, desativar sala sem turma. Quando uma gravação cai em mais de um
 * > caso, é **um** diálogo com todas as mensagens."*
 * > — `FR-018.1` da spec 009, decisão de Bernardo Villas Boas, 17/09/2026
 *
 * ⚠️ **ELE NÃO CALCULA NADA DO QUE DECIDE.** A contagem por ano vem de `limite-de-turmas.ts` e as
 * vigências que perdem proteção vêm de `protecao-de-vigencia.ts`, as duas já resolvidas pela leitura
 * da página. Se este módulo recalculasse, haveria **duas** respostas para "passou do limite?" — e a
 * do diálogo divergiria da do quadro, em silêncio.
 *
 * ⚠️ **A AUSÊNCIA É A RESPOSTA PADRÃO.** Contexto vazio significa "não há o que confirmar", nunca
 * "confirme por precaução": um diálogo a mais custa exatamente o que o A-9 decidiu evitar.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

import { mensagemDoDialogo, type AnoAcimaDoLimite } from "./limite-de-turmas";

/**
 * As escritas que passam por aqui — as mesmas do contrato de escritas §1. A lista é **fechada**.
 *
 * ⚠️ **ERAM 11 E PASSARAM A 18 em 29/09/2026**, com a fatia (b) das disciplinas. As sete novas são
 * todas do mesmo tipo: **difíceis de desfazer**. Excluir é permanente; desativar registro com
 * histórico tira da vista algo que continua existindo; e mexer em CH, em modo de atribuição ou em
 * instrutor com aula **recalcula a carga horária de gente** — que sai impressa na LIQ.
 */
export const TIPOS_DE_GRAVACAO = [
  "criar_curso",
  "editar_curso",
  "desativar_curso",
  "reativar_curso",
  "registrar_vigencia",
  "corrigir_vigencia",
  "criar_turma",
  "editar_turma",
  "acrescentar_sala",
  "desativar_sala",
  "reativar_sala",
  // ── Fatia (b) do Épico 5, 29/09/2026 — disciplinas e unidades de ensino ──────────────────────
  "excluir_disciplina",
  "excluir_unidade_ensino",
  "desativar_disciplina_com_historico",
  "desativar_unidade_com_historico",
  "alterar_ch_com_rateio",
  "alterar_modo_com_instrutores",
  "remover_instrutor_com_aula",
] as const;

export type TipoDeGravacao = (typeof TIPOS_DE_GRAVACAO)[number];

/*
 * ⚠️ O TIPO E A FRASE VÊM DE `limite-de-turmas.ts`, e não são reescritos aqui. Enquanto aquele módulo
 * não existia, esta fatia tinha uma cópia da mensagem — e duas cópias da mesma frase divergem no dia
 * em que alguém corrige uma. Quem calcula o limite é lá; aqui só se decide se confirma.
 */
export type { AnoAcimaDoLimite } from "./limite-de-turmas";

export type ContextoDaGravacao = {
  /** A sigla do curso, para os títulos que o nomeiam. */
  readonly sigla?: string;
  /** A data a partir da qual a vigência vale. */
  readonly vigenteDe?: string;

  /** Edição de curso: as duas siglas. Iguais = não houve troca. */
  readonly siglaAntiga?: string;
  readonly siglaNova?: string;
  /** Quantas turmas ficam com a sigla antiga no código, e uma delas como exemplo (`FR-014.2`). */
  readonly turmasComSiglaAntiga?: number;
  readonly exemploDeTurmaAntiga?: string;

  /** Edição de curso: as duas classificações. Iguais = não houve mudança. */
  readonly classificacaoAntiga?: string;
  readonly classificacaoNova?: string;

  /** Já resolvido por `limite-de-turmas.ts`. Vazio = dentro do limite. */
  readonly anosAcimaDoLimite?: readonly AnoAcimaDoLimite[];
  /** Já resolvido e já redigido por `protecao-de-vigencia.ts`. Vazio = nenhuma perde proteção. */
  readonly vigenciasDesprotegidas?: readonly string[];

  /** Sala: o nome e as turmas que a referenciam. Vazio = não está em uso. */
  readonly sala?: string;
  readonly turmasQueUsamASala?: readonly string[];

  // ── Fatia (b) — disciplinas e unidades de ensino ─────────────────────────────────────────────
  /** O nome do que está sendo mexido, para o diálogo nomeá-lo. */
  readonly nome?: string;
  /** O código digitável, quando a confirmação exige digitá-lo (`FR-021`). */
  readonly codigo?: string;
  /** Quantas turmas usam a disciplina — o que a desativação tira da vista. */
  readonly turmasQueUsam?: number;
  /** Quantas UEs a disciplina tem, quando a desativação as arrasta junto. */
  readonly unidadesAtivas?: number;
  /** CH antiga e nova, quando a mudança refaz o rateio. */
  readonly chAntiga?: number;
  readonly chNova?: number;
  /** Modo antigo e novo, quando a mudança refaz o rateio. */
  readonly modoAntigo?: string;
  readonly modoNovo?: string;
  /** Quantos instrutores têm a CH recalculada pela mudança. */
  readonly instrutoresAfetados?: number;
  /** Quantas aulas o instrutor que se quer remover já lançou nesta turma-disciplina. */
  readonly aulasLancadas?: number;
};

export type Confirmacao =
  | { readonly confirma: false }
  | {
      readonly confirma: true;
      readonly titulo: string;
      /** Uma por motivo. Dois motivos, **um** diálogo com as duas (`SC-002.3`). */
      readonly mensagens: readonly string[];
      readonly rotuloConfirmar: string;
    };

const NAO: Confirmacao = { confirma: false };

/**
 * A frase da troca de sigla — **com todas as letras** (`FR-014.2`).
 *
 * ⚠️ ELA É LONGA DE PROPÓSITO. A troca deixa as turmas antigas com a sigla velha no código, e esse
 * código **sai impresso no DSA**: quem confirma sem saber disso descobre meses depois, num papel.
 */
function mensagemDaSigla(antiga: string, nova: string, contexto: ContextoDaGravacao): string {
  const n = contexto.turmasComSiglaAntiga ?? 0;
  const exemplo = contexto.exemploDeTurmaAntiga;
  const comExemplo = exemplo ? ` — como em ${exemplo} —` : "";
  return (
    `Trocar a sigla de ${antiga} para ${nova}: os links antigos deste curso deixam de funcionar. ` +
    `As turmas já criadas (${n}) continuam com ${antiga} no código${comExemplo}, porque o código é ` +
    `carimbado na criação e sai impresso no DSA. As turmas criadas daqui em diante usam ${nova}. ` +
    `A troca fica registrada na auditoria.`
  );
}

function mensagemDaClassificacao(antiga: string, nova: string): string {
  return (
    `Mudar a classificação de ${antiga} para ${nova}: os Operadores do escopo ${antiga} deixam de ` +
    `alcançar este curso, e os do escopo ${nova} passam a alcançá-lo.`
  );
}

/** Os motivos de uma edição de curso, na ordem em que o diálogo os mostra. */
function motivosDaEdicaoDeCurso(contexto: ContextoDaGravacao): string[] {
  const mensagens: string[] = [];

  const { siglaAntiga, siglaNova } = contexto;
  if (siglaAntiga && siglaNova && siglaAntiga !== siglaNova) {
    mensagens.push(mensagemDaSigla(siglaAntiga, siglaNova, contexto));
  }

  const { classificacaoAntiga, classificacaoNova } = contexto;
  if (classificacaoAntiga && classificacaoNova && classificacaoAntiga !== classificacaoNova) {
    mensagens.push(mensagemDaClassificacao(classificacaoAntiga, classificacaoNova));
  }

  for (const ano of contexto.anosAcimaDoLimite ?? []) mensagens.push(mensagemDoDialogo(ano));

  return mensagens;
}

/** Os motivos de uma gravação de turma — limite e proteção de vigência, **num diálogo só**. */
function motivosDaGravacaoDeTurma(contexto: ContextoDaGravacao): string[] {
  const mensagens = (contexto.anosAcimaDoLimite ?? []).map(mensagemDoDialogo);
  const vigencias = contexto.vigenciasDesprotegidas ?? [];
  if (vigencias.length > 0) {
    mensagens.push(
      `Com esta janela, deixam de estar protegidas: ${vigencias.join("; ")}. ` +
        `Elas poderão ser corrigidas.`,
    );
  }
  return mensagens;
}

/**
 * Decide se a gravação confirma e o que o diálogo diz.
 *
 * ⚠️ **O `switch` É EXAUSTIVO SOBRE A LISTA FECHADA.** Acrescentar uma escrita a `TIPOS_DE_GRAVACAO`
 * sem decidir aqui não compila — que é o ponto: a decisão de confirmar ou não é do `FR-018.1`, e não
 * pode ser tomada por omissão.
 */
export function confirmacaoDaGravacao(
  tipo: TipoDeGravacao,
  contexto: ContextoDaGravacao = {},
): Confirmacao {
  switch (tipo) {
    case "desativar_curso":
      return {
        confirma: true,
        titulo: contexto.sigla ? `Desativar o curso ${contexto.sigla}?` : "Desativar este curso?",
        mensagens: [
          "O curso sai de oferta: não recebe turma nova nem lançamento novo.",
          "As turmas já criadas continuam consultáveis, e nada é apagado — a desativação é reversível.",
        ],
        rotuloConfirmar: "Desativar",
      };

    case "reativar_curso":
      return {
        confirma: true,
        titulo: contexto.sigla ? `Reativar o curso ${contexto.sigla}?` : "Reativar este curso?",
        mensagens: ["O curso volta a receber turma e lançamento."],
        rotuloConfirmar: "Reativar",
      };

    case "registrar_vigencia":
      return {
        confirma: true,
        titulo: contexto.vigenteDe
          ? `Registrar a vigência a partir de ${contexto.vigenteDe}?`
          : "Registrar esta vigência?",
        mensagens: [
          contexto.vigenteDe
            ? `O regime passa a valer a partir de ${contexto.vigenteDe}.`
            : "O regime passa a valer a partir da data informada.",
          "Depois que houver lançamento nesta vigência, ela não poderá mais ser corrigida: mudar o " +
            "regime passa a exigir uma vigência nova.",
        ],
        rotuloConfirmar: "Registrar",
      };

    case "corrigir_vigencia":
      return {
        confirma: true,
        titulo: "Corrigir esta vigência?",
        mensagens: [
          "A vigência atual é cancelada e a nova a substitui.",
          "A cancelada continua no histórico, marcada com o motivo e a data — nada é apagado.",
        ],
        rotuloConfirmar: "Corrigir",
      };

    case "editar_curso": {
      const mensagens = motivosDaEdicaoDeCurso(contexto);
      if (mensagens.length === 0) return NAO;
      return {
        confirma: true,
        titulo: "Salvar estas alterações no curso?",
        mensagens,
        rotuloConfirmar: "Salvar",
      };
    }

    case "criar_turma":
    case "editar_turma": {
      const mensagens = motivosDaGravacaoDeTurma(contexto);
      if (mensagens.length === 0) return NAO;
      return {
        confirma: true,
        titulo: tipo === "criar_turma" ? "Criar esta turma?" : "Salvar esta turma?",
        mensagens,
        rotuloConfirmar: "Salvar",
      };
    }

    case "desativar_sala": {
      const turmas = contexto.turmasQueUsamASala ?? [];
      if (turmas.length === 0) return NAO;
      const sala = contexto.sala ?? "Esta sala";
      return {
        confirma: true,
        titulo: `Desativar ${sala}?`,
        mensagens: [
          `${sala} é usada por ${turmas.length} turma(s): ${turmas.join(", ")}.`,
          "Elas continuam com a sala registrada; ela apenas deixa de aparecer para turmas novas.",
        ],
        rotuloConfirmar: "Desativar",
      };
    }

    // ══════════════════════════════════════════════════════════════════════════════════════════
    // Fatia (b) — disciplinas e unidades de ensino (`FR-015`, `FR-022`, `FR-063`, D-B1, D-B3)
    // ══════════════════════════════════════════════════════════════════════════════════════════

    // ⚠️ **AS DUAS EXCLUSÕES SÃO AS ÚNICAS IRREVERSÍVEIS DO SISTEMA INTEIRO**, e por isso são as
    //    únicas que pedem o **código digitado** além do clique. Tudo o mais que confirma aqui é
    //    desfazível; estas não.
    case "excluir_disciplina":
    case "excluir_unidade_ensino": {
      const eDisciplina = tipo === "excluir_disciplina";
      const oQue = eDisciplina ? "a disciplina" : "a unidade de ensino";
      const nome = contexto.nome ?? (eDisciplina ? "esta disciplina" : "esta unidade");
      const mensagens = [
        `Excluir ${oQue} ${nome} é PERMANENTE: a linha sai do banco e não há como desfazer.`,
        "Fica um rastro de quem excluiu, o quê e quando — mas o registro não volta.",
      ];
      if (eDisciplina && (contexto.unidadesAtivas ?? 0) > 0) {
        // Não deveria acontecer: a UE é impedimento. A frase existe para o dia em que a ordem
        // mudar e alguém ver o aviso antes de a recusa do banco chegar.
        mensagens.push(
          `Esta disciplina tem ${contexto.unidadesAtivas} unidade(s) de ensino — o banco vai recusar.`,
        );
      }
      if (contexto.codigo) {
        mensagens.push(`Para confirmar, digite o código ${contexto.codigo}.`);
      }
      return { confirma: true, titulo: `Excluir ${nome}?`, mensagens, rotuloConfirmar: "Excluir" };
    }

    // ⚠️ **DESATIVAR SÓ CONFIRMA QUANDO HÁ HISTÓRICO.** Desativar um cadastro criado hoje, sem turma
    //    nenhuma, é desfazível e barato — confirmar ali é o clique a mais que o A-9 decidiu evitar.
    case "desativar_disciplina_com_historico": {
      const turmas = contexto.turmasQueUsam ?? 0;
      if (turmas === 0) return NAO;
      const nome = contexto.nome ?? "esta disciplina";
      return {
        confirma: true,
        titulo: `Desativar ${nome}?`,
        mensagens: [
          `${nome} está em ${turmas} turma(s). Elas continuam com a disciplina e com o que já foi ` +
            `lançado — nada é apagado.`,
          "Ela deixa de aparecer para atribuição nova e para turmas novas. A desativação é reversível.",
        ],
        rotuloConfirmar: "Desativar",
      };
    }

    case "desativar_unidade_com_historico": {
      const aulas = contexto.aulasLancadas ?? 0;
      if (aulas === 0) return NAO;
      const nome = contexto.nome ?? "esta unidade";
      return {
        confirma: true,
        titulo: `Desativar ${nome}?`,
        mensagens: [
          `${nome} já tem ${aulas} aula(s) lançada(s). Elas continuam apontando para ela — nada é apagado.`,
          "Ela sai da soma da carga horária da disciplina e deixa de aparecer para lançamento novo.",
        ],
        rotuloConfirmar: "Desativar",
      };
    }

    // ⚠️ **AS TRÊS ABAIXO CONFIRMAM PORQUE RECALCULAM A CH DE GENTE**, e a CH do instrutor sai
    //    impressa na LIQ e na ficha de docentes. Quem muda a CH de uma disciplina raramente pensa
    //    que está mexendo na carga de três pessoas — o diálogo existe para dizer isso **antes**.
    case "alterar_ch_com_rateio": {
      const afetados = contexto.instrutoresAfetados ?? 0;
      if (afetados === 0) return NAO;
      const { chAntiga, chNova } = contexto;
      const mudanca =
        chAntiga !== undefined && chNova !== undefined
          ? `de ${chAntiga} para ${chNova} tempos`
          : "da carga horária";
      return {
        confirma: true,
        titulo: "Alterar a carga horária desta disciplina?",
        mensagens: [
          `A mudança ${mudanca} refaz o rateio de ${afetados} instrutor(es) nas turmas em que ela está.`,
          "A carga horária prevista de cada um é recalculada — ela sai impressa na LIQ e na ficha de docentes.",
        ],
        rotuloConfirmar: "Alterar",
      };
    }

    case "alterar_modo_com_instrutores": {
      const afetados = contexto.instrutoresAfetados ?? 0;
      if (afetados === 0) return NAO;
      const { modoAntigo, modoNovo } = contexto;
      const mudanca =
        modoAntigo && modoNovo ? `de ${modoAntigo} para ${modoNovo}` : "do modo de atribuição";
      return {
        confirma: true,
        titulo: "Alterar o modo de atribuição?",
        mensagens: [
          `A mudança ${mudanca} refaz o rateio de ${afetados} instrutor(es).`,
          "No modo simultâneo cada instrutor acumula a carga horária INTEGRAL; no dividido, eles a repartem.",
        ],
        rotuloConfirmar: "Alterar",
      };
    }

    case "remover_instrutor_com_aula": {
      const aulas = contexto.aulasLancadas ?? 0;
      if (aulas === 0) return NAO;
      const nome = contexto.nome ?? "este instrutor";
      return {
        confirma: true,
        titulo: `Remover ${nome} desta disciplina?`,
        mensagens: [
          `${nome} já lançou ${aulas} aula(s) nesta turma. As aulas continuam registradas em nome ` +
            `dele — nada é apagado.`,
          "O que muda é a carga horária PREVISTA: ela é redistribuída entre quem ficar.",
        ],
        rotuloConfirmar: "Remover",
      };
    }

    // ⚠️ AS TRÊS QUE NUNCA CONFIRMAM, escritas uma a uma em vez de caírem num `default`. Um
    //    `default` aceitaria calado uma escrita nova — e a decisão de não confirmar é tão do
    //    `FR-018.1` quanto a de confirmar.
    case "criar_curso":
    case "acrescentar_sala":
    case "reativar_sala":
      return NAO;
  }
}
