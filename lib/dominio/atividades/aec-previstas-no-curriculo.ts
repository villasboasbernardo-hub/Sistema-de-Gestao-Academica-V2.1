/**
 * RA-2 (Bloco 18, spec 033) — as AEC PREVISTAS como o CURRÍCULO as cadastra: a linha lida do banco, a ordem da lista, os
 * tipos e as disciplinas que a AEC prevista aceita, e o texto de cada campo. Serve à edição (*Editar curso → Currículo →
 * Atividades e limites*) e à consulta (a aba *Atividades* da página do curso e a consulta da aba *Currículo*).
 *
 * > *"RA-2 AEC previstas pertencem ao CURRÍCULO (RC-1): nome, tipo, TA previstos, disciplina opcional, obrigatória
 * > sim/não. Editadas na aba Atividades de Editar curso → Currículo. Correção em currículo em uso segue RC-6."*
 * > — Bernardo Villas Boas, 03/11/2026 (`docs/correcoes/regras-de-atividades.md`)
 *
 * ⚠️ **O TA VAZIO É «NÃO DEFINIDO», NUNCA ZERO** (`RN-DEG-01`; item 6 da conferência do passo 0): o currículo que não diz
 *    quantos TA a palestra tem não ganha um número inventado.
 * ⚠️ **O TIPO É DO CATÁLOGO E DE CLASSIFICAÇÃO AEC** — o banco recusa o resto (`aec_prevista_tipo_sem_aec`). O tipo
 *    desativado sai da escolha, MENOS o que a linha já tem: editar outro campo não pode trocar o tipo por falta de opção
 *    (a troca seria correção RC-6 que ninguém pediu). A disciplina segue a mesma regra.
 * ⚠️ **A SITUAÇÃO NA TURMA (a cumprir, cumprida) NÃO MORA AQUI** — é de `previstas.ts` (RA-3, RA-5). Aqui só o que o
 *    currículo diz.
 * ⚠️ **O RÓTULO DO TIPO, NUNCA O VALOR** (FR-001.2): «Atividade Extraclasse», e não «Atividade Extracurricular».
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { categoriaPeloTipo, type TipoDeAtividade } from "@/lib/dominio/categoria-pelo-tipo";
import { compararCodigoNatural } from "@/lib/dominio/ordem-natural";

import { rotuloDoTipo } from "./grupos";

/** A disciplina citada pela AEC prevista, ou oferecida na escolha. */
export type DisciplinaDaAecPrevista = {
  readonly id: string;
  /** O código do currículo (`VIII`), e não o `DIS-NNNNNN`. */
  readonly cod: string;
  readonly nome: string;
  /** Só na escolha: a disciplina inativa só aparece quando é a que a linha já tem. */
  readonly ativa?: boolean;
};

/** A AEC prevista do currículo, como a tela a mostra. */
export type AecPrevistaDoCurriculo = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly tipoId: string;
  readonly tipoRotulo: string;
  /** Nulo = o currículo não diz («não definido»). */
  readonly taPrevistos: number | null;
  readonly disciplina: DisciplinaDaAecPrevista | null;
  readonly obrigatoria: boolean;
  readonly fonteArquivo: string | null;
  readonly fontePagina: string | null;
  readonly observacao: string | null;
  readonly ativa: boolean;
  readonly ordem: number;
};

/** A linha de `aec_previstas_curriculo` com o tipo e a disciplina embutidos (a leitura da tela). */
export type LinhaDaAecPrevistaNoBanco = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly tipo_atividade_id: string;
  readonly ta_previstos: number | null;
  readonly obrigatoria: boolean;
  readonly ordem: number | null;
  readonly fonte_arquivo: string | null;
  readonly fonte_pagina: string | null;
  readonly observacao: string | null;
  readonly status: string;
  readonly tipo: { readonly valor: string; readonly rotulo_exibicao: string | null } | null;
  readonly disciplina: {
    readonly id: string;
    readonly cod_disciplina: string | null;
    readonly nome_disciplina: string | null;
  } | null;
};

const textoOuNulo = (v: string | null | undefined): string | null => {
  const t = v?.trim() ?? "";
  return t === "" ? null : t;
};

/** A linha lida do banco, na forma da tela. */
export function aecPrevistaDoBanco(linha: LinhaDaAecPrevistaNoBanco): AecPrevistaDoCurriculo {
  return {
    id: linha.id,
    codigo: linha.codigo,
    nome: linha.nome,
    tipoId: linha.tipo_atividade_id,
    tipoRotulo: linha.tipo
      ? rotuloDoTipo({ valor: linha.tipo.valor, rotulo: linha.tipo.rotulo_exibicao })
      : "tipo não encontrado",
    taPrevistos: linha.ta_previstos === null ? null : Number(linha.ta_previstos),
    disciplina: linha.disciplina
      ? {
          id: linha.disciplina.id,
          cod: linha.disciplina.cod_disciplina ?? "",
          nome: linha.disciplina.nome_disciplina ?? "",
        }
      : null,
    obrigatoria: linha.obrigatoria,
    fonteArquivo: textoOuNulo(linha.fonte_arquivo),
    fontePagina: textoOuNulo(linha.fonte_pagina),
    observacao: textoOuNulo(linha.observacao),
    ativa: linha.status === "ativo",
    ordem: linha.ordem ?? 0,
  };
}

/** A ordem da lista: as ativas primeiro; dentro, a ordem do currículo e, no empate, o nome. */
export function emOrdemDoCurriculo(
  lista: readonly AecPrevistaDoCurriculo[],
): AecPrevistaDoCurriculo[] {
  return [...lista].sort(
    (a, b) =>
      Number(b.ativa) - Number(a.ativa) ||
      a.ordem - b.ordem ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

/** A próxima posição na ordem do currículo: depois da última, inclusive das desativadas (nada muda de lugar). */
export function proximaOrdem(ordens: readonly (number | null)[]): number {
  return ordens.reduce<number>((m, o) => Math.max(m, o ?? 0), 0) + 1;
}

/** «4 TA», ou «não definido» quando o currículo não diz. */
export function textoDosTaPrevistos(ta: number | null): string {
  return ta === null ? "não definido" : `${ta} TA`;
}

/** «Arquivo, p. A-74», só o arquivo, só a página, ou nulo. */
export function textoDaFonte(arquivo: string | null, pagina: string | null): string | null {
  if (arquivo && pagina) return `${arquivo}, p. ${pagina}`;
  if (arquivo) return arquivo;
  if (pagina) return `p. ${pagina}`;
  return null;
}

/** «VIII — Auxílios à Navegação», a forma das outras telas do curso. */
export function textoDaDisciplina(d: DisciplinaDaAecPrevista): string {
  return d.cod ? `${d.cod} — ${d.nome}` : d.nome;
}

export const ROTULO_DA_OBRIGATORIA: Readonly<Record<"sim" | "nao", string>> = {
  sim: "Sim",
  nao: "Não",
};

/** O tipo que a AEC prevista aceita, como a escolha o oferece. */
export type TipoParaAecPrevista = {
  readonly id: string;
  readonly rotulo: string;
  readonly ativo: boolean;
};

/**
 * Os tipos de classificação AEC do catálogo (ativos e desativados), pelo rótulo e na ordem do catálogo. Tipo de aula,
 * de TAD, de TR, de Estudo Individual ou de Apoio Individualizado fica fora — o banco o recusaria.
 */
export function tiposDeAec(
  tipos: readonly (TipoDeAtividade & { readonly rotulo_exibicao?: string | null })[],
): TipoParaAecPrevista[] {
  return tipos
    .filter((t) => categoriaPeloTipo(t) === "AEC")
    .map((t) => ({
      id: t.id,
      rotulo: rotuloDoTipo({ valor: t.valor, rotulo: t.rotulo_exibicao ?? null }),
      ativo: t.ativo,
    }));
}

/** O que a escolha do tipo oferece: os ativos e, se for o caso, o que a linha já tem. */
export function opcoesDeTipo(
  tipos: readonly TipoParaAecPrevista[],
  atualId: string | null,
): TipoParaAecPrevista[] {
  return tipos.filter((t) => t.ativo || t.id === atualId);
}

/**
 * O que a escolha da disciplina oferece: as ativas do currículo, em ordem natural do código (romano pelo valor), e a da
 * linha quando ela não está entre elas (inativa) — para editar outro campo sem tirar a disciplina.
 */
export function opcoesDeDisciplina(
  disciplinas: readonly DisciplinaDaAecPrevista[],
  atual: DisciplinaDaAecPrevista | null,
): DisciplinaDaAecPrevista[] {
  const oferecidas = disciplinas.filter((d) => d.ativa !== false || d.id === atual?.id);
  if (atual && !oferecidas.some((d) => d.id === atual.id)) {
    oferecidas.push({ ...atual, ativa: false });
  }
  return oferecidas.sort((a, b) => compararCodigoNatural(a.cod, b.cod));
}
