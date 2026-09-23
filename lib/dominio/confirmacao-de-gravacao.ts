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

/** As 11 escritas da fatia — as mesmas do contrato de escritas §1. A lista é fechada. */
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

    // ⚠️ AS TRÊS QUE NUNCA CONFIRMAM, escritas uma a uma em vez de caírem num `default`. Um
    //    `default` aceitaria calado uma escrita nova — e a decisão de não confirmar é tão do
    //    `FR-018.1` quanto a de confirmar.
    case "criar_curso":
    case "acrescentar_sala":
    case "reativar_sala":
      return NAO;
  }
}
