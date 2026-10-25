/**
 * A montagem da consulta da listagem de instrutores — **sem I/O, testável sem banco** (`RN-ANT-01`,
 * `FR-025` e `FR-028` da spec 006).
 *
 * Contrato: `specs/006-cadastro-de-instrutores/contracts/parametros-instrutores.md`
 *
 * ⚠️ ELA RECEBE O CONSTRUTOR E DEVOLVE O CONSTRUTOR. Quem executa é a página. Separar a montagem é o
 * que permite provar, em teste de unidade, o que a consulta pede ao banco — a primeira versão da
 * tarefa tentava observar isso pelo navegador, que nunca vê a consulta (análise H4).
 *
 * ⚠️ `ordem_antiguidade` É PEDIDA SEMPRE, E `ordem` NEM CHEGA AQUI COMO CRITÉRIO. A ordenação canônica
 * é a antiguidade, servida pelo banco; a coluna clicada reordena só a apresentação, na folha de
 * cliente. Trocar a coluna desta consulta quando `?ordem=nome` chegasse quebraria a `RN-ANT-01` —
 * *Risco: Alto* — sem que a tela parecesse errada.
 *
 * ⚠️ NENHUMA COLUNA DE IDENTIFICAÇÃO CIVIL. A leitura é de `vw_instrutores`, que não as tem, e a
 * lista abaixo não as pede. É o `R-10` da pesquisa: `select *` na TABELA falha com
 * `permission denied` e manda procurar a RLS, que não é a causa.
 *
 * ⚠️ VIVE AO LADO DA PÁGINA, COMO `inicio/panorama.ts`, porque é da tela. Não é regra de domínio.
 */
import { ehCapacitacaoDidatica } from "@/lib/dominio/capacitacao-didatica";
import { POSTOS_POR_CIRCULO } from "@/lib/dominio/circulo-hierarquico";

/**
 * O mínimo encadeável que a montagem usa. O construtor da interface de dados tem esses três métodos.
 *
 * ⚠️ A FUNÇÃO NÃO RESTRINGE O TIPO DE ENTRADA A ESTA FORMA, e é de propósito: conferir o construtor
 * tipado da interface de dados contra uma restrição genérica estoura a profundidade de instanciação
 * do TypeScript (TS2589, medido em 15/09/2026). Ela recebe o construtor, trabalha sobre esta forma e
 * devolve o mesmo tipo que recebeu — o que preserva a tipagem das linhas para quem executa. O
 * comportamento é provado por `tests/unidade/consulta-de-instrutores.test.ts`.
 */
export type Encadeavel = {
  eq(coluna: string, valor: string | boolean): Encadeavel;
  ilike(coluna: string, padrao: string): Encadeavel;
  in(coluna: string, valores: readonly string[]): Encadeavel;
  or(filtros: string): Encadeavel;
  is(coluna: string, valor: null): Encadeavel;
  contains(coluna: string, valores: readonly string[]): Encadeavel;
  order(coluna: string, opcoes: { ascending: boolean }): Encadeavel;
};

/** Os parâmetros do contrato, já degradados por `lerParametros`. */
export type ParametrosDaListagem = Readonly<
  Record<
    | "busca"
    | "om"
    | "categoria"
    | "capacitacao"
    | "regime"
    | "escolaridade"
    | "posto"
    | "circulo"
    | "curso"
    | "classificacao"
    | "habilitado"
    | "selecionado"
    | "situacao"
    | "ordem",
    string
  >
>;

/**
 * O valor reservado do filtro de capacitação que casa com o campo **vazio** (`FR-025` emendado em
 * 15/09/2026; spec 015 da v2.0, *"Sem capacitação didática"*).
 */
export const CAPACITACAO_NENHUMA = "nenhuma";

/** A listagem aberta sem recorte: só quem está ativo, como na v2.0. */
export const PARAMETROS_SEM_RECORTE: ParametrosDaListagem = {
  busca: "",
  om: "",
  categoria: "",
  capacitacao: "",
  regime: "",
  escolaridade: "",
  posto: "",
  circulo: "",
  curso: "",
  classificacao: "",
  habilitado: "",
  selecionado: "",
  situacao: "ativo",
  ordem: "",
};

/**
 * As colunas que a listagem lê. Nenhuma de identificação civil.
 *
 * ⚠️ `ordem_antiguidade` ESTÁ NA LISTA, e não só no `order`: a coluna de posto da tabela ordena por
 * ela quando alguém clica no cabeçalho, para que ordenar "por posto" continue sendo ordenar por
 * antiguidade — nunca alfabeticamente.
 *
 * ⚠️ UM LITERAL SÓ, SEM CONCATENAÇÃO. Com `+` o tipo vira `string`, e a interface de dados deixa de
 * saber quais colunas a consulta traz — as linhas chegam tipadas como erro.
 */
export const COLUNAS_DA_LISTAGEM =
  "id, codigo, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra, categoria, om, regime_trabalho, nivel_escolaridade, capacitacoes_didaticas, capacitacao_didatica_a_corrigir, nip, status, antiguidade_declarada_num, ordem_antiguidade, habilitado, data_inicio_docencia_ciaara";

/**
 * Normaliza a busca como `app.normalizar_texto` normaliza `nome_normalizado`: sem acento, sem caixa,
 * espaços colapsados. Buscar "muller" precisa achar "Müller".
 */
function normalizar(texto: string): string {
  return (
    texto
      .normalize("NFD")
      // Depois do NFD, o acento é marca combinante separada da letra; `\p{M}` tira só as marcas.
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Escapa os curingas do `ilike`.
 *
 * ⚠️ `%` E `_` DIGITADOS SÃO LITERAIS. Sem o escape, quem busca "a_b" recebe "aXb" também, e quem
 * digita só "%" recebe a base inteira — o que parece funcionar e não é o que foi pedido.
 */
function escaparCuringas(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function montarConsultaDeInstrutores<C>(consulta: C, parametros: ParametrosDaListagem): C {
  let c = (consulta as unknown as Encadeavel).eq("status", parametros.situacao);

  if (parametros.om !== "") c = c.eq("om", parametros.om);
  if (parametros.categoria !== "") c = c.eq("categoria", parametros.categoria);
  if (parametros.regime !== "") c = c.eq("regime_trabalho", parametros.regime);
  if (parametros.escolaridade !== "") c = c.eq("nivel_escolaridade", parametros.escolaridade);
  /*
   * ⚠️ CAPACITAÇÃO É "CONTÉM", E NÃO "IGUAL". O instrutor tem mais de uma (`C-Exp-TE, Licenciatura`), e é por isso
   * que o gráfico de capacitação conta o mesmo instrutor em duas barras (`FR-026.4`). Filtrar por igualdade
   * esconderia quem tem duas.
   * ⚠️ SPEC 020 (Bloco 5): desde a lista fechada, "contém" é na LISTA (`capacitacoes_didaticas`); um valor fora dela
   *    — um link antigo, de quando o campo era texto — procura no texto que não casou, que ficou guardado.
   */
  const capacitacao = parametros.capacitacao.trim();
  if (capacitacao === CAPACITACAO_NENHUMA) {
    // "Nenhuma" é a lista vazia E nenhum texto a corrigir — a mesma regra do indicador e do gráfico (C-12).
    c = c.eq("capacitacoes_didaticas", "{}").is("capacitacao_didatica_a_corrigir", null);
  } else if (ehCapacitacaoDidatica(capacitacao)) {
    c = c.contains("capacitacoes_didaticas", [capacitacao]);
  } else if (capacitacao !== "") {
    c = c.ilike("capacitacao_didatica_a_corrigir", `%${escaparCuringas(capacitacao)}%`);
  }

  if (parametros.posto !== "") c = c.eq("posto_graduacao", parametros.posto);
  if (parametros.circulo === "oficiais" || parametros.circulo === "pracas") {
    c = c.in("posto_graduacao", POSTOS_POR_CIRCULO[parametros.circulo]);
  }

  /*
   * ⚠️ HABILITADO, CURSO E CLASSIFICAÇÃO SÃO COLUNAS DA VIEW (migration `20260915091717`), e não listas
   * de ids calculadas aqui. A primeira versão mandava `not in (...)` com 175 identificadores, e a
   * consulta falhou com a base real.
   * ⚠️ O SELECIONADO SAIU DAQUI (conferência do PR #90, 24/10/2026): ele TEM ANO — designado em turma do
   *    ano escolhido —, e a coluna `selecionado` da view vale para qualquer ano. A página o aplica sobre a
   *    lista lida, pelo ano (`filtrarPorSelecao`, `lib/dominio/selecao-no-ano.ts`); o habilitado não tem ano
   *    e continua predicado da consulta.
   */
  if (parametros.habilitado === "sim") c = c.eq("habilitado", true);
  if (parametros.habilitado === "nao") c = c.eq("habilitado", false);
  /*
   * ⚠️ CURSO E CLASSIFICAÇÃO SAÍRAM DAQUI (D-39 invertida, conferência de 24/10/2026): *"só pelas designações do ano
   *    escolhido"*. Os arranjos da view (`cursos_vinculados`, `classificacoes_vinculadas`) não têm ano; a página os
   *    aplica pelas designações do ano (`noRecorteDeCurso`, `lib/dominio/selecao-no-ano.ts`).
   */

  const busca = normalizar(parametros.busca);
  if (busca !== "") c = c.ilike("nome_normalizado", `%${escaparCuringas(busca)}%`);

  return c.order("ordem_antiguidade", { ascending: true }) as unknown as C;
}
