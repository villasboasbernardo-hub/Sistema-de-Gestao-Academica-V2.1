/**
 * O modelo de uma pasta de trabalho, antes de virar `.xlsx` — e a avaliação de TODAS as suas
 * fórmulas (R-4 e R-5 da spec 015).
 *
 * ⚠️ **SEM DOMÍNIO NENHUM AQUI.** Isto não sabe o que é DSA: são abas, células, estilos, listas de
 * escolha, regras de cor e página. Quem sabe o que vai em cada célula é `lib/dominio/dsa/planilha/`.
 *
 * ⚠️ **O VALOR EM CACHE DE CADA FÓRMULA SAI DAQUI** (R-5): arquivo baixado costuma abrir no Excel em
 * Modo de Exibição Protegido, que não recalcula, e a pré-visualização do Drive também não. O valor
 * guardado é o que a árvore avalia — e a árvore é provada contra o domínio pela suíte e contra o
 * Excel de verdade pela prova de `scripts/provas/planilha_no_excel.ps1`.
 */
import { avaliar, ehErro, type Endereco, type Formula, type Valor } from "./formula";

/** Cor no formato do OOXML: `FFRRGGBB`. */
export type CorArgb = string;

export type Estilo = {
  readonly negrito?: boolean;
  readonly italico?: boolean;
  /** Corpo da letra, em pontos. */
  readonly tamanho?: number;
  readonly corDoTexto?: CorArgb;
  readonly fundo?: CorArgb;
  readonly horizontal?: "left" | "center" | "right";
  readonly vertical?: "top" | "center" | "bottom";
  readonly quebra?: boolean;
  readonly formato?: "data" | "inteiro";
  readonly borda?: {
    readonly superior?: boolean;
    readonly inferior?: boolean;
    readonly esquerda?: boolean;
    readonly direita?: boolean;
  };
};

export type Celula = {
  /** Constante. */
  readonly valor?: string | number | boolean | null;
  /** Data de calendário `aaaa-mm-dd`, gravada como número de série com o formato `dd/mm/yyyy`. */
  readonly data?: string;
  readonly formula?: Formula;
  readonly estilo?: Estilo;
};

export type EstiloCondicional = {
  readonly fundo?: CorArgb;
  readonly corDoTexto?: CorArgb;
  readonly negrito?: boolean;
};

/**
 * Uma regra de formatação condicional. A fórmula é escrita para a célula do CANTO SUPERIOR ESQUERDO
 * do intervalo — com referência relativa, ela anda junto, como no Excel.
 */
export type RegraCondicional = {
  readonly de: Endereco;
  readonly ate: Endereco;
  readonly formula: Formula;
  readonly estilo: EstiloCondicional;
};

/** Uma lista de escolha. ⚠️ Sempre AVISA e aceita valor de fora (`FR-019`): `showErrorMessage="0"`. */
export type Validacao = {
  readonly intervalos: readonly { readonly de: Endereco; readonly ate: Endereco }[];
  readonly fonte: Formula;
};

export type Aba = {
  readonly nome: string;
  readonly celulas: Map<number, Map<number, Celula>>;
  /** Largura da coluna, em caracteres. */
  readonly larguras: Map<number, number>;
  /** Altura da linha, em pontos. */
  readonly alturas: Map<number, number>;
  readonly colunasOcultas: Set<number>;
  readonly validacoes: Validacao[];
  readonly regras: RegraCondicional[];
  congelar?: { readonly linhas: number; readonly colunas: number };
  /** A primeira célula visível ao abrir — a semana inicial (`FR-022`). */
  topoVisivel?: Endereco;
  /** A4 paisagem, ajustada a 1 × 1 (`FR-022`). */
  pagina?: { readonly paisagem: boolean };
  areaDeImpressao?: { readonly de: Endereco; readonly ate: Endereco };
  semGrade?: boolean;
};

export type NomeDefinido = {
  readonly nome: string;
  readonly aba: string;
  readonly de: Endereco;
  readonly ate: Endereco;
};

export type Pasta = {
  readonly abas: Aba[];
  readonly nomes: NomeDefinido[];
  abaAtiva: number;
  readonly propriedades: {
    readonly titulo: string;
    readonly autor: string;
    /** Instante ISO da geração. */
    readonly criadaEm: string;
  };
  /**
   * O dia da geração (`aaaa-mm-dd`), que o avaliador usa como `TODAY()`. ⚠️ O programa de planilha
   * recalcula o `TODAY()` ao abrir; o cache só precisa dizer o que ele valia quando o arquivo nasceu.
   */
  readonly dataDeHoje?: string;
};

export function novaAba(nome: string): Aba {
  return {
    nome,
    celulas: new Map(),
    larguras: new Map(),
    alturas: new Map(),
    colunasOcultas: new Set(),
    validacoes: [],
    regras: [],
  };
}

export function definir(aba: Aba, linha: number, coluna: number, celula: Celula): void {
  if (linha < 1 || coluna < 1) throw new Error(`endereço inválido: ${linha},${coluna}`);
  let daLinha = aba.celulas.get(linha);
  if (daLinha === undefined) {
    daLinha = new Map();
    aba.celulas.set(linha, daLinha);
  }
  daLinha.set(coluna, celula);
}

export function celulaEm(aba: Aba, linha: number, coluna: number): Celula | undefined {
  return aba.celulas.get(linha)?.get(coluna);
}

/** Dias desde 30/12/1899 — o zero do Excel para as datas depois de 01/03/1900 (R-13). */
export function serieDaData(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return Math.round(
    (Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1) - Date.UTC(1899, 11, 30)) / 86_400_000,
  );
}

export type Avaliador = {
  readonly valorDe: (aba: string, linha: number, coluna: number) => Valor;
};

/**
 * Avalia a pasta inteira sob demanda, com memória e detecção de ciclo. `substituicoes` troca o valor
 * de células constantes sem reconstruir a pasta — é como a suíte põe o seletor da IMPRESSÃO em cada
 * semana (I-P5) e muda um item do catálogo (I-P11).
 */
export function avaliador(
  pasta: Pasta,
  substituicoes: ReadonlyMap<string, Valor> = new Map(),
  /**
   * Valores já calculados que não dependem do que se substituiu — a suíte avalia a IMPRESSÃO semana
   * a semana sem recalcular a PREENCHIMENTO inteira a cada uma.
   */
  conhecidos: ReadonlyMap<string, Valor> = new Map(),
): Avaliador {
  const porNome = new Map(pasta.abas.map((a) => [a.nome, a]));
  const nomes = new Map(pasta.nomes.map((n) => [n.nome, n]));
  const memoria = new Map<string, Valor>(conhecidos);
  const hoje = pasta.dataDeHoje === undefined ? undefined : serieDaData(pasta.dataDeHoje);
  const emCurso = new Set<string>();

  const valorDe = (nomeDaAba: string, linha: number, coluna: number): Valor => {
    const chave = `${nomeDaAba}!${linha},${coluna}`;
    const trocado = substituicoes.get(chave);
    if (trocado !== undefined) return trocado;
    const guardado = memoria.get(chave);
    if (guardado !== undefined) return guardado;
    const aba = porNome.get(nomeDaAba);
    if (aba === undefined) return { erro: "#REF!" };
    const celula = celulaEm(aba, linha, coluna);
    let valor: Valor;
    if (celula === undefined) valor = null;
    else if (celula.formula !== undefined) {
      if (emCurso.has(chave)) throw new Error(`referência circular em ${chave}`);
      emCurso.add(chave);
      valor = avaliar(celula.formula, {
        aba: nomeDaAba,
        valorDe,
        nome: (n) => nomes.get(n),
        ...(hoje === undefined ? {} : { hoje }),
      });
      emCurso.delete(chave);
    } else if (celula.data !== undefined) valor = serieDaData(celula.data);
    else valor = celula.valor ?? null;
    memoria.set(chave, valor);
    return valor;
  };
  return { valorDe };
}

/** A chave de substituição de uma célula, no formato que `avaliador` entende. */
export const chaveDaCelula = (aba: string, linha: number, coluna: number) =>
  `${aba}!${linha},${coluna}`;

/** Todas as células de fórmula da pasta, com o valor avaliado — o cache do arquivo. */
export function calcularCaches(pasta: Pasta): Map<string, Valor> {
  const { valorDe } = avaliador(pasta);
  const caches = new Map<string, Valor>();
  for (const aba of pasta.abas) {
    for (const [linha, celulas] of aba.celulas) {
      for (const [coluna, celula] of celulas) {
        if (celula.formula === undefined) continue;
        caches.set(chaveDaCelula(aba.nome, linha, coluna), valorDe(aba.nome, linha, coluna));
      }
    }
  }
  return caches;
}

/** As células cujo cache é erro — o `FR-023` exige zero. */
export function celulasComErro(caches: ReadonlyMap<string, Valor>): string[] {
  return [...caches].filter(([, v]) => ehErro(v)).map(([chave]) => chave);
}
