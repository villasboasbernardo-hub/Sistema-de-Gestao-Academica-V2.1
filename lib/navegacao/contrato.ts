/**
 * O contrato de parâmetros da URL — **fechado, tipado, e num lugar só** (`FR-001` a `FR-005`).
 *
 * Contrato humano: `specs/008-shell-e-estado-na-url/contracts/parametros.md` · documento 25 §1.3
 *
 * ⚠️ ELE EXISTE PORQUE A TABELA SOZINHA NÃO BASTAVA. O documento 25 §1.3 se autodenomina *"contrato
 * único do sistema"* desde a Fase 2, e **nenhum requisito o citava** — então uma tela nova podia
 * inventar parâmetro sem violar requisito nenhum. É o `CHK001`.
 *
 * ⚠️ AS DUAS METADES RESOLVEM COISAS DIFERENTES, e nenhuma sozinha serve: o documento dá a leitura
 * humana e a rastreabilidade até o `RF-` de origem; **este arquivo faz o parâmetro fora do contrato
 * não compilar**. Os dois, ou nenhum.
 *
 * ⚠️ NENHUM PARÂMETRO DE PAGINAÇÃO, e a ausência é recusa declarada (`FR-037.1`): o contrato não a
 * tem em nenhuma rota, e a fatia (b) decidiu por medição que a tabela renderiza todas as linhas.
 * Reabrir isso exige medição na mão, não um parâmetro reservado por via das dúvidas.
 */

/** Se a mudança empilha uma entrada de histórico ou substitui a atual (documento 25 §1.6). */
export type Historico = "empilha" | "substitui";

/** Os quatro tipos, e só eles. Não há tipo livre — é isso que permite validar num lugar só. */
export type TipoDeParametro = "texto" | "inteiro" | "escolha" | "lista";

/**
 * O limite de frequência da busca, em milissegundos (`FR-005`).
 *
 * ⚠️ ELE VIVIA NUM EXEMPLO DE CÓDIGO do documento 25 §1.5, não numa regra — e valor que mora em
 * exemplo é valor que a próxima tela escolhe de novo.
 */
export const LIMITE_DE_FREQUENCIA_MS = 300;

type Base = {
  /** Como aparece na URL: `snake_case` curto. */
  readonly nome: string;
  readonly historico: Historico;
  /**
   * Alimenta consulta no servidor?
   *
   * ⚠️ **É O CAMPO CUJO ERRO É SILENCIOSO** (`FR-004.1`). Desligado num filtro, a URL fica certa, o
   * histórico funciona, o link compartilhado abre — **e o número na tela fica velho**.
   */
  readonly avisaServidor: boolean;
  readonly limiteDeFrequenciaMs?: number;
};

export type Parametro =
  | (Base & { readonly tipo: "texto"; readonly padrao: string })
  | (Base & {
      readonly tipo: "inteiro";
      readonly padrao: number;
      readonly minimo: number;
      readonly maximo: number;
    })
  | (Base & {
      readonly tipo: "escolha";
      readonly padrao: string;
      readonly opcoes: readonly string[];
    })
  | (Base & {
      readonly tipo: "lista";
      readonly padrao: readonly string[];
      readonly opcoes: readonly string[];
    });

export type ContratoDeRota = {
  readonly rota: string;
  /**
   * O `RF-` que justifica a rota existir.
   *
   * ⚠️ NÃO É ENFEITE: é o Princípio VIII no tipo. Parâmetro que ninguém consegue rastrear até um
   * requisito é parâmetro que alguém acrescentou sem decidir.
   */
  readonly origem: string;
  readonly parametros: Readonly<Record<string, Parametro>>;
};

/** As classificações de curso (`RF-INI-02`). Valores do domínio, não do banco. */
export const CLASSIFICACOES = ["expedito", "especial", "regular"] as const;

/** As modalidades (`RF-INI-02`), literais do requisito. */
export const MODALIDADES = ["presencial", "ead", "semipresencial"] as const;

/**
 * O contrato.
 *
 * ⚠️ SÓ AS ROTAS QUE ESTA FATIA ENTREGA. As demais do documento 25 §1.3 entram com as suas telas,
 * nos Épicos 5 a 9 — declarar parâmetro de tela que não existe é declarar o que ninguém confere.
 *
 * ⚠️ A ROTA DE IMPRESSÃO HERDA OS PARÂMETROS DA TELA DE ORIGEM, sem tradução (`FR-035`). Fica
 * **reservado** aqui; as rotas são dos Épicos 10 e 11, e o contrato precisa já saber disso para elas
 * não inventarem parâmetro próprio.
 */
export const CONTRATO = {
  "/inicio": {
    rota: "/inicio",
    origem: "RF-INI-02",
    parametros: {
      classificacao: {
        nome: "classificacao",
        tipo: "escolha",
        padrao: "",
        opcoes: CLASSIFICACOES,
        historico: "empilha",
        avisaServidor: true,
      },
      /*
       * ⚠️ `modalidade` ENTROU POR EMENDA ao documento 25 §1.3, em 11/09/2026. A tabela de lá
       * listava só `classificacao`, e o `RF-INI-02` — que é **[PRESERVADO]** — escreve
       * `?classificacao=&modalidade=` na própria nota de mecanismo. Não era o requisito que estava
       * errado: era a tabela que estava incompleta.
       */
      modalidade: {
        nome: "modalidade",
        tipo: "escolha",
        padrao: "",
        opcoes: MODALIDADES,
        historico: "empilha",
        avisaServidor: true,
      },
    },
  },
  "/estilo": {
    rota: "/estilo",
    origem: "RF-DS-01",
    // ⚠️ Vazio de propósito, e é declaração e não omissão: a vitrine não recorta nada.
    parametros: {},
  },
} as const satisfies Record<string, ContratoDeRota>;

/** As rotas que o contrato conhece. */
export type Rota = keyof typeof CONTRATO;

/**
 * Os parâmetros que uma rota aceita.
 *
 * ⚠️ É ISTO QUE FAZ O `FR-001` VALER: pedir um parâmetro fora do contrato da rota **não compila**.
 * A tabela do documento 25 nunca conseguiu isso, e é por isso que ela não bastava.
 */
export type ParametroDe<R extends Rota> = keyof (typeof CONTRATO)[R]["parametros"] & string;

/** O descritor de um parâmetro, para quem precisa da política e não só do valor. */
export function descritor<R extends Rota>(rota: R, nome: ParametroDe<R>): Parametro {
  return (CONTRATO[rota].parametros as Readonly<Record<string, Parametro>>)[nome] as Parametro;
}

/** Todos os descritores de uma rota, na ordem em que foram declarados. */
export function parametrosDaRota<R extends Rota>(rota: R): readonly Parametro[] {
  return Object.values(CONTRATO[rota].parametros as Readonly<Record<string, Parametro>>);
}
