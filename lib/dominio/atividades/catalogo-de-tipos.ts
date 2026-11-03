/**
 * RA-1 (Bloco 18, spec 033) — o CATÁLOGO de tipos de atividade como a Administração o mostra e o edita (FR-001.3 e
 * FR-001.4).
 *
 * > *"Catálogo de tipos de atividade (lista do sistema, Admin edita): Palestra · Visita · APOINST/Prática · Desportiva ·
 * > Cerimônia · Monitoria · DeCAT · Reforço · Outra. Cada tipo tem classificação PADRÃO (AEC/TAD/TR), que o operador
 * > pode trocar no lançamento."* — Bernardo Villas Boas, 03/11/2026 (RA-1)
 *
 * ⚠️ **O CATÁLOGO É A LISTA `tipos_atividade` DE `config_listas`**, e mostra só os tipos DE ATIVIDADE — os que têm
 *    categoria (`categoriaPeloTipo`, o mesmo filtro do formulário do DSA). Os de uso `aula` (Aula, Avaliação, Vista…) e
 *    os sem categoria nenhuma não são atividade e não aparecem.
 * ⚠️ **SÓ AEC, TAD E TR SE EDITAM AQUI** (decisão 2 da conferência do passo 0): o Estudo Individual e o Apoio
 *    Individualizado (Monitoria, Português para Estrangeiros, BDA, BDF) aparecem SÓ PARA LER — a classificação deles
 *    fica fora da CHT e não é escolha do catálogo.
 * ⚠️ **TROCAR A CLASSIFICAÇÃO PADRÃO RECATEGORIZA OS LANÇAMENTOS ATIVOS QUE SEGUEM O TIPO** — é o gatilho de sempre
 *    (`app.recategorizar_pelo_tipo`, D-AA-3 da spec 014), que desde a M2 do Bloco 18 PULA a linha em que o operador
 *    escolheu AEC, TAD ou TR no «Conta como». O diálogo diz QUANTOS mudam antes de gravar; quem decide é o banco.
 * ⚠️ **NÃO HÁ EXCLUSÃO** (regra 4; nenhuma exceção nominal cobre `tipos_atividade`): o ícone fica indisponível, com o
 *    motivo — *"tem registros"* quando há lançamento, *"sem exceção à regra 4"* quando não há.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  aceitaContaComo,
  categoriaPeloTipo,
  contaComoDoBanco,
  ROTULO_DA_CATEGORIA_DE_ATIVIDADE,
  type CategoriaDeAtividade,
  type TipoDeAtividade,
} from "@/lib/dominio/categoria-pelo-tipo";

import { rotuloDoTipo } from "./grupos";

/** As classificações que o catálogo escolhe — os componentes da CHT (`RN-EVT-01`). */
export const CLASSIFICACOES_DO_CATALOGO = ["AEC", "TAD", "TR"] as const;
export type ClassificacaoDoCatalogo = (typeof CLASSIFICACOES_DO_CATALOGO)[number];

/** Uma linha de `config_listas` da lista `tipos_atividade`, como o banco a devolve. */
export type LinhaDoCatalogo = {
  readonly id: string;
  readonly valor: string;
  readonly rotulo: string | null;
  readonly ativo: boolean;
  readonly ordem: number;
  readonly metadados: TipoDeAtividade["metadados"];
};

export type TipoDoCatalogo = {
  readonly id: string;
  /** A chave gravada — o que o gatilho, a sincronização e o ETL casam. Não muda. */
  readonly valor: string;
  /** O nome na tela (`rotulo_exibicao`, senão o valor). */
  readonly rotulo: string;
  /** O rótulo é outro que a chave (ex.: o rótulo novo da decisão 4)? A tela mostra a chave ao lado. */
  readonly chaveDiferente: boolean;
  readonly ativo: boolean;
  readonly ordem: number;
  readonly categoria: CategoriaDeAtividade;
  /** AEC, TAD ou TR: o catálogo edita a classificação. Estudo Individual e Apoio Individualizado: só leitura. */
  readonly editavel: boolean;
};

/** A classificação é uma das que o catálogo escolhe? */
export function ehClassificacaoDoCatalogo(
  valor: string | null | undefined,
): valor is ClassificacaoDoCatalogo {
  return (CLASSIFICACOES_DO_CATALOGO as readonly string[]).includes(valor ?? "");
}

/** O nome da classificação na tela («AEC», …, «Estudo Individual»). */
export function rotuloDaClassificacao(categoria: CategoriaDeAtividade): string {
  return ROTULO_DA_CATEGORIA_DE_ATIVIDADE[categoria];
}

/** Os tipos DE ATIVIDADE do catálogo, na ordem da lista (e, no empate, pelo nome). */
export function tiposDoCatalogo(linhas: readonly LinhaDoCatalogo[]): TipoDoCatalogo[] {
  return linhas
    .flatMap((l): TipoDoCatalogo[] => {
      const categoria = categoriaPeloTipo({
        id: l.id,
        valor: l.valor,
        ativo: l.ativo,
        metadados: l.metadados,
      });
      if (categoria === null) return [];
      const rotulo = rotuloDoTipo({ valor: l.valor, rotulo: l.rotulo });
      return [
        {
          id: l.id,
          valor: l.valor,
          rotulo,
          chaveDiferente: rotulo !== l.valor,
          ativo: l.ativo,
          ordem: l.ordem,
          categoria,
          editavel: aceitaContaComo(categoria),
        },
      ];
    })
    .sort((a, b) => a.ordem - b.ordem || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

/** Os lançamentos ATIVOS e SALVOS de um tipo, pelo que cada um faz quando a classificação padrão muda. */
export type ContagemDoTipo = {
  readonly total: number;
  /** «Conta como» vazio: seguem a classificação do tipo — são os que o gatilho recategoriza. */
  readonly seguemOTipo: number;
  /** «Conta como» TA da disciplina: contam na CHD e continuam contando, qualquer que seja a classificação. */
  readonly taDaDisciplina: number;
  /** «Conta como» AEC, TAD ou TR escolhido no lançamento: o gatilho os pula. */
  readonly comEscolha: number;
};

const ZERO: ContagemDoTipo = { total: 0, seguemOTipo: 0, taDaDisciplina: 0, comEscolha: 0 };

/** A contagem de cada tipo, a partir dos lançamentos (ativos e salvos, filtrados por quem lê). */
export function contagemPorTipo(
  lancamentos: readonly { readonly tipoId: string | null; readonly contaComo: string | null }[],
): ReadonlyMap<string, ContagemDoTipo> {
  const mapa = new Map<string, ContagemDoTipo>();
  for (const l of lancamentos) {
    if (l.tipoId === null) continue;
    const atual = mapa.get(l.tipoId) ?? ZERO;
    const como = contaComoDoBanco(l.contaComo);
    mapa.set(l.tipoId, {
      total: atual.total + 1,
      seguemOTipo: atual.seguemOTipo + (como === null ? 1 : 0),
      taDaDisciplina: atual.taDaDisciplina + (como === "CHD" ? 1 : 0),
      comEscolha: atual.comEscolha + (como !== null && como !== "CHD" ? 1 : 0),
    });
  }
  return mapa;
}

/** A contagem do tipo, ou zero quando ele não tem lançamento. */
export function contagemDoTipo(
  contagens: ReadonlyMap<string, ContagemDoTipo>,
  tipoId: string,
): ContagemDoTipo {
  return contagens.get(tipoId) ?? ZERO;
}

export type EfeitoDaTroca = {
  /** Os que passam a contar na classificação nova (os que seguem o tipo). */
  readonly mudam: number;
  /** Os de «TA da disciplina»: a categoria gravada segue o tipo, mas eles continuam contando na CHD. */
  readonly taDaDisciplina: number;
  /** Os de «Conta como» escolhido: ficam como estão. */
  readonly ficamPelaEscolha: number;
};

/**
 * O que a troca da classificação padrão faz com os lançamentos — o espelho de `app.recategorizar_pelo_tipo`: as linhas
 * ativas do tipo com «Conta como» vazio ou «TA da disciplina» recebem a categoria nova; as com AEC/TAD/TR escolhido não.
 * `null` quando a classificação não muda (o gatilho não roda).
 */
export function efeitoDaTroca(
  atual: CategoriaDeAtividade,
  nova: ClassificacaoDoCatalogo,
  contagem: ContagemDoTipo,
): EfeitoDaTroca | null {
  if (atual === nova) return null;
  return {
    mudam: contagem.seguemOTipo,
    taDaDisciplina: contagem.taDaDisciplina,
    ficamPelaEscolha: contagem.comEscolha,
  };
}

const lancamentos = (n: number) => `${n} ${n === 1 ? "lançamento" : "lançamentos"}`;

/** A frase do diálogo de *Editar* — o número antes de gravar (FR-001.3). */
export function fraseDoEfeito(
  atual: CategoriaDeAtividade,
  nova: ClassificacaoDoCatalogo,
  contagem: ContagemDoTipo | null,
): string {
  if (atual === nova) return "A classificação não muda: nenhum lançamento é tocado.";
  if (contagem === null) {
    return (
      `Não foi possível contar agora os lançamentos deste tipo. Ao gravar, os ativos que seguem o tipo passam de ` +
      `${rotuloDaClassificacao(atual)} para ${nova}.`
    );
  }
  const efeito = efeitoDaTroca(atual, nova, contagem);
  if (efeito === null || efeito.mudam + efeito.taDaDisciplina + efeito.ficamPelaEscolha === 0) {
    return "Nenhum lançamento muda de categoria: este tipo não tem lançamento ativo.";
  }
  const partes = [
    efeito.mudam === 0
      ? `Nenhum lançamento passa de ${rotuloDaClassificacao(atual)} para ${nova}.`
      : `${lancamentos(efeito.mudam)} ${efeito.mudam === 1 ? "passa" : "passam"} de ${rotuloDaClassificacao(atual)} ` +
        `para ${nova}.`,
  ];
  if (efeito.taDaDisciplina > 0) {
    partes.push(
      `${lancamentos(efeito.taDaDisciplina)} com «Conta como» TA da disciplina ${efeito.taDaDisciplina === 1 ? "continua" : "continuam"} na CHD.`,
    );
  }
  if (efeito.ficamPelaEscolha > 0) {
    partes.push(
      `${lancamentos(efeito.ficamPelaEscolha)} com «Conta como» escolhido no lançamento ${efeito.ficamPelaEscolha === 1 ? "fica" : "ficam"} como ${efeito.ficamPelaEscolha === 1 ? "está" : "estão"}.`,
    );
  }
  return partes.join(" ");
}

/** A dica do *Excluir* indisponível (FR-001.4; regra 4, sem exceção nominal para o catálogo). */
export const DICA_DO_EXCLUIR_COM_LANCAMENTO = "tem registros: use Desativar";
export const DICA_DO_EXCLUIR_SEM_LANCAMENTO = "sem exceção à regra 4: use Desativar";

/** `null` quando a contagem não pôde ser lida — e aí a dica não afirma que não há registro. */
export function dicaDoExcluirDoTipo(lancamentosDoTipo: number | null): string {
  return lancamentosDoTipo !== null && lancamentosDoTipo > 0
    ? DICA_DO_EXCLUIR_COM_LANCAMENTO
    : DICA_DO_EXCLUIR_SEM_LANCAMENTO;
}

/** O maior valor de `ordem` (smallint no banco). */
const ORDEM_MAXIMA = 32_767;

/** A ordem do tipo novo: depois de todos os da lista — inserir no meio reordenaria a lista de todo mundo. */
export function proximaOrdem(ordens: readonly number[]): number {
  const maior = ordens.reduce((m, o) => (Number.isFinite(o) && o > m ? o : m), 0);
  return Math.min(maior + 1, ORDEM_MAXIMA);
}

/** O nome comparável: sem acento, sem caixa e sem espaço repetido. */
function comparavel(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O tipo que já existe com o mesmo nome (pela chave ou pelo rótulo), ou `null`. A `UNIQUE (lista, valor)` do banco só
 * pega a grafia idêntica; «palestra» ao lado de «Palestra» seria um segundo tipo com a mesma cara.
 */
export function tipoComOMesmoNome<
  T extends { readonly valor: string; readonly rotulo: string | null },
>(nome: string, tipos: readonly T[]): T | null {
  const alvo = comparavel(nome);
  return (
    tipos.find(
      (t) => comparavel(t.valor) === alvo || (t.rotulo !== null && comparavel(t.rotulo) === alvo),
    ) ?? null
  );
}
