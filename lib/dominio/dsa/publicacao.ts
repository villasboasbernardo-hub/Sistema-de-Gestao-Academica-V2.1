/**
 * A situação da semana do DSA e o que se pode fazer nela — spec 024 (Bloco 9).
 *
 * > **RP-1.** Antes da primeira publicação, editar é livre; depois dela, toda mudança é uma alteração numerada, com
 * > justificativa.
 * > **RP-3.** Tela do DSA: mostra a situação da semana (em preenchimento, registrado, publicado, ALT N, ou *alteração em
 * > andamento*) e o **histórico**: original e alterações, com data, autor, justificativa e **Reimprimir** de cada uma.
 * > **RP-4.** Se algo de fora mudar uma semana publicada (…), o DSA avisa *"alterado desde a publicação"* e pede uma
 * > alteração para republicar. Nunca muda a versão publicada em silêncio.
 * > — `docs/correcoes/regras-da-publicacao-do-dsa.md`, Bernardo Villas Boas, 21 a 23/10/2026
 * > **RP-9. Salvar alteração.** Na semana **em alteração** (depois de *Fazer alteração*), a barra mostra **Salvar
 * > alteração** logo **antes** de *Publicar alteração*. Ele registra os rascunhos **como o Salvar** (RP-0): o que foi salvo
 * > **passa a contar** (…), e a alteração pode ser retomada depois (sair da tela não a perde). O **papel oficial continua
 * > sendo a última versão publicada** até *Publicar alteração* (…). O selo é **«Em alteração · salva»** quando houve um
 * > salvar nesta alteração **e não há rascunho novo**; com rascunho novo, volta a *«Em alteração»*, com o contador *N não
 * > salvos* (D-8). **Descartar rascunho** volta ao **último salvo** — o da alteração, não o publicado.
 * > — Bernardo Villas Boas, 28/10/2026 (Bloco 14, spec 029, `FR-003`)
 *
 * ⚠️ **A SITUAÇÃO É DERIVADA**: da trilha `dsa_eventos_da_semana` (só de acréscimo), do número de rascunhos da semana e
 *    de o documento de hoje diferir do retrato publicado. Nada aqui é guardado.
 * ⚠️ **QUEM DECIDE A TRAVA É O BANCO** (`app.semana_do_dsa_travada`, com a mesma regra): esta função decide o que a tela
 *    OFERECE; a recusa, se alguém tentar, vem do servidor.
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

import { ehLinhaFixaDoEstudoIndividual } from "./impressao";

export type TipoDeEvento =
  "salvo" | "rascunho_descartado" | "publicado" | "alteracao_iniciada" | "alteracao_publicada";

export type EventoDaSemana = {
  readonly tipo: TipoDeEvento;
  /** ISO, com hora. */
  readonly ocorridoEm: string;
  /** 0 na original; N na alteração; nulo nos demais. */
  readonly numero: number | null;
  readonly justificativa: string | null;
  /** O nome de quem fez, como a tela o mostra. */
  readonly autor: string | null;
  /** O «hoje» com que o retrato foi montado (só nas publicações). */
  readonly hoje: string | null;
};

export type Situacao = "em_preenchimento" | "registrado" | "publicado" | "alteracao_em_andamento";

export type VersaoPublicada = {
  readonly numero: number;
  readonly ocorridoEm: string;
  readonly autor: string | null;
  readonly justificativa: string | null;
};

export type SituacaoDaSemana = {
  readonly situacao: Situacao;
  readonly rascunhos: number;
  readonly travada: boolean;
  /** A última versão publicada (0 = original), ou nulo. */
  readonly versaoVigente: number | null;
  readonly historico: readonly VersaoPublicada[];
  readonly podeSalvar: boolean;
  readonly podeDescartar: boolean;
  readonly podeGerarPrevia: boolean;
  readonly podePublicar: boolean;
  readonly podeFazerAlteracao: boolean;
  readonly podePublicarAlteracao: boolean;
  /**
   * RP-9 (spec 029): em alteração, sem rascunho, e houve um `salvo` DEPOIS do último `alteracao_iniciada` — a alteração
   * de agora está registrada (conta na CH) e ainda não publicada. O selo diz *«Em alteração · salva»* (D-8).
   * ⚠️ É SÓ O DO SELO: com rascunho novo ele fica falso, e o que foi salvo continua contando — a linha da D-25 lê
   *    `houveSalvoNestaAlteracao`.
   */
  readonly alteracaoSalva: boolean;
  /**
   * RP-9, D-25 (spec 029): houve um `salvo` DEPOIS do último `alteracao_iniciada` — COM ou SEM rascunho novo. O que foi
   * salvo nesta alteração já conta na CH e no andamento, e o papel continua o publicado até *Publicar alteração*: é
   * este sinal que mantém a linha *«Alteração salva…»* na tela enquanto houver o descompasso, mesmo com rascunho novo
   * (achado 5 da revisão do Bloco 14). O selo continua lendo `alteracaoSalva` (D-8).
   */
  readonly houveSalvoNestaAlteracao: boolean;
  /** RP-9: o *Salvar alteração* — sempre que a semana está em alteração, mesmo sem rascunho (D-23). */
  readonly podeSalvarAlteracao: boolean;
  /** RP-4: publicada, travada, e o documento de hoje difere do retrato. */
  readonly alteradoDesdeAPublicacao: boolean;
};

const ehPublicacao = (e: EventoDaSemana) =>
  e.tipo === "publicado" || e.tipo === "alteracao_publicada";

/**
 * @param eventos a trilha da semana, em qualquer ordem.
 * @param rascunhos quantos rascunhos a semana tem (`quantos_rascunhos_na_semana`).
 * @param documentoDifere o documento montado hoje (só o salvo) difere do retrato da versão vigente.
 */
export function situacaoDaSemana(
  eventos: readonly EventoDaSemana[],
  rascunhos: number,
  documentoDifere: boolean,
): SituacaoDaSemana {
  const ordem = [...eventos].sort((a, b) => a.ocorridoEm.localeCompare(b.ocorridoEm));
  const publicacoes = ordem.filter(ehPublicacao);
  const ultimoDeTrava = [...ordem]
    .reverse()
    .find((e) => ehPublicacao(e) || e.tipo === "alteracao_iniciada");
  const publicada = publicacoes.length > 0;
  const emAlteracao = ultimoDeTrava?.tipo === "alteracao_iniciada";
  const travada = publicada && !emAlteracao;
  /*
   * ⚠️ D-18: «registrado» é NÃO TER RASCUNHO, não ter o evento «salvo» — o que existe nasce salvo (RP-8), e uma semana com
   *    dado anterior ao Bloco 9 (ou vazia) já está toda registrada. «Em preenchimento» é ter rascunho por salvar.
   */
  const situacao: Situacao = emAlteracao
    ? "alteracao_em_andamento"
    : travada
      ? "publicado"
      : rascunhos === 0
        ? "registrado"
        : "em_preenchimento";
  /*
   * ⚠️ RP-9, D-24 (spec 029): o *Salvar alteração* grava o MESMO evento `salvo` do *Salvar minuta* — quem o distingue é a
   *    POSIÇÃO: só conta o `salvo` posterior ao `alteracao_iniciada` que abriu a alteração de agora (o `ultimoDeTrava`).
   *    O `salvo` de antes da publicação, ou o de uma ALT anterior, não faz esta alteração estar salva.
   * ⚠️ D-8: com rascunho novo depois do salvar, deixa de estar «salva» — o selo volta a *Em alteração*, com o contador.
   *    E D-29: *Descartar* grava `rascunho_descartado`, não um `salvo`; com o rascunho desfeito, volta a «salva».
   * ⚠️ D-25: o rascunho novo NÃO desfaz o que foi salvo — `houveSalvoNestaAlteracao` é o mesmo `salvo` sem a condição do
   *    rascunho, e é ele que diz à tela que a CH já não é a do papel. Os dois sinais são separados de propósito: com um
   *    só, ou o selo mentia («salva» com rascunho por salvar) ou a linha da D-25 sumia com o rascunho.
   */
  const inicioDaAlteracao = emAlteracao ? ultimoDeTrava : undefined;
  const houveSalvoNestaAlteracao =
    inicioDaAlteracao !== undefined &&
    ordem.some(
      (e) => e.tipo === "salvo" && e.ocorridoEm.localeCompare(inicioDaAlteracao.ocorridoEm) > 0,
    );
  const alteracaoSalva = houveSalvoNestaAlteracao && rascunhos === 0;

  const vigente = publicacoes.at(-1);
  return {
    situacao,
    rascunhos,
    travada,
    versaoVigente: vigente?.numero ?? null,
    historico: publicacoes.map((e) => ({
      numero: e.numero ?? 0,
      ocorridoEm: e.ocorridoEm,
      autor: e.autor,
      justificativa: e.justificativa,
    })),
    podeSalvar: !travada && !emAlteracao,
    podeDescartar: !travada && rascunhos > 0,
    podeGerarPrevia: !publicada && situacao === "registrado",
    podePublicar: !publicada && situacao === "registrado",
    podeFazerAlteracao: travada,
    podePublicarAlteracao: emAlteracao,
    alteracaoSalva,
    houveSalvoNestaAlteracao,
    /* D-23: o botão é o do Salvar, para a alteração — o *Salvar minuta* (`podeSalvar`) continua fora dela. */
    podeSalvarAlteracao: emAlteracao,
    alteradoDesdeAPublicacao: travada && documentoDifere,
  };
}

/** O campo ALT do papel: em branco na original e antes de publicar (RP, ciclo); *"ALT N"* na alteração N. */
export function rotuloDoAlt(numero: number | null): string {
  return numero === null || numero === 0 ? "ALT —" : `ALT ${numero}`;
}

/** O texto curto da situação, para a tela. */
export const ROTULO_DA_SITUACAO: Readonly<Record<Situacao, string>> = {
  em_preenchimento: "Em preenchimento",
  registrado: "Registrado",
  publicado: "Publicado",
  alteracao_em_andamento: "Alteração em andamento",
};

function normalizado(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(normalizado);
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.keys(valor as Record<string, unknown>)
        .sort()
        .map((k) => [k, normalizado((valor as Record<string, unknown>)[k])]),
    );
  }
  return valor;
}

/**
 * O que o RP-4 compara de um papel: os campos de ORIGEM — a turma, a semana, o período, os alunos, as assinaturas e as
 * linhas de cada dia —, **sem a linha fixa do Estudo Individual** dos retratos antigos (Bloco 15, spec 030, D-10).
 *
 * ⚠️ **A GRADE E A LEGENDA SAÍRAM DA COMPARAÇÃO** porque derivam dos dias (e do relógio, que já está no horário de cada
 *    linha): a linha fixa que o papel desenhava até 29/10/2026 acrescentava cartão e faixa à grade e a sigla EI à
 *    legenda, e compará-las faria toda semana publicada com ela (4 originais e 1 ALT no remoto) acusar «alterado» sem
 *    mudança de dado. O retrato em si não muda: reimprimir continua idêntico.
 * ⚠️ **O EI LANÇADO CONTINUA CONTANDO** — a linha fixa se reconhece pela chave `ei-<data>`
 *    (`ehLinhaFixaDoEstudoIndividual`), e a do lançamento é o identificador do fato.
 */
export function conteudoComparavel<
  D extends {
    readonly curso: unknown;
    readonly semana: unknown;
    readonly semanaDoCurso: unknown;
    readonly primeiro: unknown;
    readonly ultimo: unknown;
    readonly alunos: unknown;
    readonly assinaturas: unknown;
    readonly dias: readonly { readonly linhas: readonly { readonly chave: string }[] }[];
  },
>(dados: D): unknown {
  return {
    curso: dados.curso,
    semana: dados.semana,
    semanaDoCurso: dados.semanaDoCurso,
    primeiro: dados.primeiro,
    ultimo: dados.ultimo,
    alunos: dados.alunos,
    assinaturas: dados.assinaturas,
    dias: dados.dias.map((dia) => ({
      ...dia,
      linhas: dia.linhas.filter((l) => !ehLinhaFixaDoEstudoIndividual(l)),
    })),
  };
}

/** Dois documentos são o mesmo papel? Pelo conteúdo, sem a ordem das chaves (D-8). */
export function documentosIguais(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizado(a)) === JSON.stringify(normalizado(b));
}

/** O ícone do selo — a tela traduz para o desenho; o domínio só diz qual (RD-5). */
export type IconeDoSelo = "salvo" | "preenchimento" | "carimbo" | "alteracao";

/**
 * O selo da situação da semana: ícone e palavra, sem o texto "Situação da semana" (RD-5, Bloco 11).
 *
 * > *"situação da semana só como selo (ícone + palavra): Registrado / Em preenchimento / Publicado / ALT N"* — Bernardo
 * > Villas Boas, 26/10/2026 (`docs/correcoes/regras-do-dsa-lancamento.md`, RD-5)
 *
 * ⚠️ **PUBLICADO OU ALT N**: a semana publicada mostra *Publicado* na original e *ALT N* na alteração N publicada.
 * ⚠️ **EM ALTERAÇÃO** (D-20): durante a alteração em andamento o selo diz *Em alteração* — os quatro do pedido não
 *    nomeiam esse estado, e mostrar *Publicado* esconderia que há mudança por publicar.
 * ⚠️ **EM ALTERAÇÃO · SALVA** (RP-9 e D-8 da spec 029): depois de *Salvar alteração*, sem rascunho novo — com o MESMO
 *    ícone (e o mesmo tom, na tela) da alteração, porque ela continua por publicar. `alteracaoSalva` só qualifica a
 *    alteração em andamento; nos outros selos não muda nada.
 */
export function seloDaSituacao(
  situacao: Situacao,
  versaoVigente: number | null,
  alteracaoSalva = false,
): { readonly icone: IconeDoSelo; readonly palavra: string } {
  switch (situacao) {
    case "em_preenchimento":
      return { icone: "preenchimento", palavra: "Em preenchimento" };
    case "registrado":
      return { icone: "salvo", palavra: "Registrado" };
    case "publicado":
      return {
        icone: "carimbo",
        palavra:
          versaoVigente === null || versaoVigente === 0 ? "Publicado" : `ALT ${versaoVigente}`,
      };
    case "alteracao_em_andamento":
      return {
        icone: "alteracao",
        palavra: alteracaoSalva ? "Em alteração · salva" : "Em alteração",
      };
  }
}

/**
 * A versão que vale de cada turma: a ÚLTIMA publicada (original ou ALT mais recente) — nunca rascunho nem salvo (RD-7).
 *
 * > *"o Início mostra só DSA PUBLICADO: a última versão publicada da semana (original ou ALT mais recente), nunca
 * > rascunho nem salvo."* — Bernardo Villas Boas, 26/10/2026 (RD-7)
 *
 * ⚠️ **DURANTE A ALTERAÇÃO**, a última publicada continua a valer — a alteração só vale quando publicada (RP-1), mesmo
 *    depois de *Salvar alteração* (RP-9, spec 029): o `salvo` não é publicação, e o papel do Início não muda com ele.
 * ⚠️ **A ORDEM DAS TURMAS É A DA ENTRADA** (a primeira aparição): quem chama decide a ordem do carrossel.
 */
export function versaoVigentePorTurma<R>(
  eventos: readonly {
    readonly turmaId: string;
    readonly tipo: string;
    readonly numero: number | null;
    readonly ocorridoEm: string;
    readonly retrato: R;
  }[],
): readonly {
  readonly turmaId: string;
  readonly numero: number;
  readonly ocorridoEm: string;
  readonly retrato: R;
}[] {
  const ordem: string[] = [];
  const vigente = new Map<
    string,
    { turmaId: string; numero: number; ocorridoEm: string; retrato: R }
  >();
  for (const e of eventos) {
    if (e.tipo !== "publicado" && e.tipo !== "alteracao_publicada") continue;
    const atual = vigente.get(e.turmaId);
    if (atual === undefined) ordem.push(e.turmaId);
    if (atual === undefined || e.ocorridoEm.localeCompare(atual.ocorridoEm) > 0) {
      vigente.set(e.turmaId, {
        turmaId: e.turmaId,
        numero: e.numero ?? 0,
        ocorridoEm: e.ocorridoEm,
        retrato: e.retrato,
      });
    }
  }
  return ordem.map((t) => vigente.get(t)).filter((v) => v !== undefined);
}
