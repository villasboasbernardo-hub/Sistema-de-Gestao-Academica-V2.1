/**
 * A montagem da consulta do catálogo de cursos — **sem I/O, testável sem banco** (`FR-004`,
 * `FR-012`, `FR-047`).
 *
 * ⚠️ **ELA RECEBE O CONSTRUTOR E DEVOLVE O CONSTRUTOR.** Quem executa é a página. É o mesmo desenho
 * de `app/(app)/instrutores/consulta.ts`, e pelo mesmo motivo: o que a consulta pede ao banco não se
 * observa pelo navegador, que nunca a vê.
 *
 * ⚠️ **UMA CONSULTA PARA A TELA INTEIRA** (`FR-012`). Os cartões e os quatro indicadores saem das
 * **mesmas** linhas: se os indicadores tivessem consulta própria, haveria duas respostas para
 * "quantos cursos regulares há" — e elas divergiriam no dia em que um dos dois recortes mudasse.
 *
 * ⚠️ **VIVE AO LADO DA PÁGINA, e não em `lib/dominio/`.** Montar consulta é assunto de tela; regra de
 * domínio é `classificacoes-de-curso.ts` e `indicadores-do-catalogo.ts`, que não sabem que existe
 * banco.
 */
import { CONTRATO } from "@/lib/navegacao/contrato";

/**
 * O mínimo encadeável que a montagem usa.
 *
 * ⚠️ A FUNÇÃO NÃO RESTRINGE O TIPO DE ENTRADA A ESTA FORMA, e é de propósito: conferir o construtor
 * tipado da interface de dados contra uma restrição genérica estoura a profundidade de instanciação
 * do TypeScript (TS2589, medido em 15/09/2026 na spec 006). Ela recebe o construtor, trabalha sobre
 * esta forma e devolve o mesmo tipo que recebeu.
 */
export type Encadeavel = {
  eq(coluna: string, valor: string): Encadeavel;
  order(coluna: string, opcoes: { ascending: boolean }): Encadeavel;
};

/** Os três parâmetros do contrato, já degradados por `lerParametros`. */
export type ParametrosDoCatalogo = Readonly<
  Record<"classificacao" | "modalidade" | "situacao", string>
>;

/**
 * O catálogo aberto sem recorte: só quem está ativo, como em `/instrutores`.
 *
 * ⚠️ OS VALORES VÊM DO CONTRATO, e não de literais repetidos aqui. Um padrão escrito em dois lugares
 * é um padrão que muda num lugar só.
 */
export const PARAMETROS_SEM_RECORTE: ParametrosDoCatalogo = {
  classificacao: CONTRATO["/cursos"].parametros.classificacao.padrao,
  modalidade: CONTRATO["/cursos"].parametros.modalidade.padrao,
  situacao: CONTRATO["/cursos"].parametros.situacao.padrao,
};

/**
 * As colunas que a tela consome — as do cartão e as dos agregados, numa lista só.
 *
 * ⚠️ NUNCA `select *`. Com ele, uma coluna nova do schema apareceria no tipo das linhas sem que
 * ninguém tivesse decidido mostrá-la, e a primeira notícia seria a tela.
 */
export const COLUNAS_DO_CATALOGO =
  "id, codigo, nome_curso, classificacao, modalidade, proposito, duracao_dias, duracao_semanas, limite_turmas_ano, status";

/**
 * ⚠️ A ORDEM DENTRO DO GRUPO É A DA SIGLA, e o agrupamento é do componente. O banco devolve uma lista
 * ordenada por `codigo`; quem a parte nos cinco grupos, **na ordem do Glossário**, é
 * `CatalogoDeCursos.tsx`. Pedir cinco consultas ordenadas seria a consulta por grupo que o `FR-012`
 * proíbe, e ordenar por classificação aqui daria a ordem do `ENUM`, que não é a do Glossário.
 */
export function montarConsultaDeCursos<C>(consulta: C, parametros: ParametrosDoCatalogo): C {
  let c = (consulta as unknown as Encadeavel).eq("status", parametros.situacao);

  if (parametros.classificacao !== "") c = c.eq("classificacao", parametros.classificacao);
  if (parametros.modalidade !== "") c = c.eq("modalidade", parametros.modalidade);

  return c.order("codigo", { ascending: true }) as unknown as C;
}

/**
 * Os perfis que a RLS **não** recorta — os que enxergam o catálogo inteiro.
 *
 * ⚠️ **ESTA LISTA ESPELHA `app.cursos_do_usuario()`, E O BANCO CONTINUA SENDO QUEM DECIDE.** Ela não
 * concede nem nega nada: serve só para escolher **qual frase** o estado vazio mostra. Quem filtra é
 * a policy, e ela não consulta esta constante.
 *
 * ⚠️ **E O ERRO POSSÍVEL É ASSIMÉTRICO, de propósito.** Errar para "recortado" faz a tela dizer
 * *"você não vê"* onde caberia *"ainda não existe"* — impreciso, mas honesto. Errar para "todos"
 * faria afirmar *"não há curso cadastrado"* a quem simplesmente não alcança nenhum. Perfil novo que
 * esta lista não conheça cai no primeiro caso, porque a lista é fechada e o padrão é o recorte.
 */
const PERFIS_DE_ALCANCE_TOTAL: readonly string[] = [
  "admin",
  "chefe_departamento_ensino",
  "visualizacao",
  "encarregado_administracao_academica",
  "ajudante_administracao_academica",
  "encarregado_orientacao_pedagogica",
  "ajudante_orientacao_pedagogica",
];

/**
 * O alcance do perfil sobre o catálogo — o que permite distinguir *"você não vê"* de *"ainda não
 * existe"*.
 *
 * ⚠️ `operador` COM ESCOPO `geral` ALCANÇA TUDO; com qualquer outro escopo, só a classificação dele.
 * `encarregado_curso` alcança **os cursos pelos quais responde**, e nunca o catálogo inteiro.
 */
export function alcanceDoPerfil(
  perfil: string | null | undefined,
  escopoCurso: string | null | undefined,
): "todos" | "recortado" {
  if (!perfil) return "recortado";
  if (PERFIS_DE_ALCANCE_TOTAL.includes(perfil)) return "todos";
  if (perfil === "operador" && escopoCurso === "geral") return "todos";
  return "recortado";
}

/** Qual dos três vazios do `FR-047` a tela está mostrando. `null` = não está vazia. */
export type MotivoDoCatalogoVazio = "nao-ha" | "nao-ve" | "ainda-nao-existe";

export type LeituraDoVazio = {
  readonly cursosMostrados: number;
  /** Algum parâmetro diferente do padrão do contrato. */
  readonly haRecorte: boolean;
  /** `todos` para quem a RLS não recorta; `recortado` para o Operador de escopo estreito. */
  readonly alcanceDoPerfil: "todos" | "recortado";
};

/**
 * Distingue *"não há"*, *"você não vê"* e *"ainda não existe no sistema"* (`FR-047`).
 *
 * ⚠️ **NÃO SABER NÃO PODE VIRAR AFIRMAÇÃO.** Para um perfil de alcance recortado, a tela vazia sem
 * filtro **não** autoriza dizer "não há curso cadastrado": a consulta dele não enxerga o que está
 * fora do escopo dele. Dizer-lhe que não há é afirmar sobre o que não foi medido.
 *
 * ⚠️ **E É POR ISSO QUE ELE NÃO CONSULTA O BANCO DE NOVO.** A tentação é pedir a contagem total sem
 * RLS para saber se "há dado". Isso seria `service_role` por requisição de tela — o uso que o BRIEF
 * §3 não autoriza —, e ainda contaria o que a pessoa não pode ver para lhe dizer que existe.
 */
export function motivoDoVazio(leitura: LeituraDoVazio): MotivoDoCatalogoVazio | null {
  if (leitura.cursosMostrados > 0) return null;
  if (leitura.haRecorte) return "nao-ha";
  return leitura.alcanceDoPerfil === "recortado" ? "nao-ve" : "ainda-nao-existe";
}
