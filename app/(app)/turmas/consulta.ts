/**
 * O filtro e o recorte da lista de turmas — **TypeScript puro** (`FR-012`, `FR-013` da spec 012).
 *
 * ⚠️ **SEM `server-only` E SEM CLIENTE DE BANCO, e isso é o desenho de `app/(app)/instrutores/consulta.ts`
 * — copiado de propósito.** A página cria o cliente e passa o construtor; este módulo só **monta o
 * predicado** e **traduz a linha**. É o que permite ao teste de unidade exercitar o filtro com um
 * duplo que anota as chamadas, sem subir banco nenhum — e é onde os defeitos de filtro moram: coluna
 * errada, valor não escapado, ordem esquecida.
 *
 * ⚠️ **QUEM RECORTA POR PERFIL É O BANCO, NUNCA ESTE MÓDULO.** A policy `turmas_ler` exige
 * `app.pode('turmas','ler')` **e** `app.alcanca_curso(curso_id)`; um perfil de escopo estreito recebe
 * lista parcial **sem erro** (gotcha 4), e é por isso que a página distingue *"não há"* de *"você não
 * vê"* pelo alcance declarado, e não pelo tamanho da lista.
 */

/**
 * O mínimo que o encadeável do PostgREST precisa expor para esta montagem.
 *
 * ⚠️ Declarar o mínimo — e não o tipo do cliente — é o que permite ao teste passar um duplo.
 */
export type Encadeavel = {
  eq(coluna: string, valor: string | number): Encadeavel;
  ilike(coluna: string, padrao: string): Encadeavel;
  order(coluna: string, opcoes: { ascending: boolean }): Encadeavel;
};

export type ParametrosDaListaDeTurmas = {
  readonly curso: string;
  readonly ano: string;
  readonly situacao: string;
  readonly busca: string;
};

/**
 * ⚠️ **O CURSO VEM NO MESMO `select`, por embed do PostgREST** (`SC-008`). Buscar o nome do curso
 * linha a linha seriam 28 idas ao banco para desenhar 28 linhas, e a convenção de código proíbe
 * `await` em laço em `app/**` justamente por isso. O `!inner` é o que faz o filtro por sigla do curso
 * valer como predicado, em vez de devolver linha com curso nulo.
 */
export const COLUNAS_DA_LISTA_DE_TURMAS =
  "id, codigo, turma, ano_letivo, status, modalidade, data_inicio, data_termino, alunos, " +
  "cursos!inner(codigo, nome_curso)";

/** O `%` e o `_` do `ilike` são curingas: escapá-los é o que faz a busca procurar o texto digitado. */
function escaparCuringas(texto: string): string {
  return texto.replace(/[%_\\]/g, (c) => `\\${c}`);
}

/**
 * Aplica os quatro filtros e a ordem.
 *
 * ⚠️ **A ORDEM É ANO DECRESCENTE E CÓDIGO CRESCENTE, e ela não é de domínio** — é apresentação: o ano
 * corrente primeiro, porque é onde o trabalho está. Nada aqui ordena por antiguidade, que é assunto de
 * instrutor e tem ponto único próprio.
 *
 * ⚠️ **`ano` CHEGA COMO TEXTO E SÓ FILTRA SE FOR NÚMERO.** Texto que não é ano — `?ano=abc`, de um
 * link velho ou de um endereço digitado — é **ignorado**, e a lista sai inteira em vez de vazia: é a
 * degradação que o `RN-DEG-01` manda. O contrário (mandar `NaN` ao banco) devolveria **zero linhas sem
 * erro**, e a tela diria *"nenhuma turma neste recorte"* com o banco cheio.
 */
export function montarConsultaDeTurmas<C>(consulta: C, parametros: ParametrosDaListaDeTurmas): C {
  let c = consulta as unknown as Encadeavel;

  if (parametros.curso !== "") c = c.eq("cursos.codigo", parametros.curso);

  const ano = Number.parseInt(parametros.ano, 10);
  if (parametros.ano !== "" && String(ano) === parametros.ano.trim()) {
    c = c.eq("ano_letivo", ano);
  }

  if (parametros.situacao !== "") c = c.eq("status", parametros.situacao);

  const busca = parametros.busca.trim();
  if (busca !== "") c = c.ilike("codigo", `%${escaparCuringas(busca)}%`);

  return c.order("ano_letivo", { ascending: false }).order("codigo", {
    ascending: true,
  }) as unknown as C;
}

/** A linha como o banco a entrega. */
export type LinhaBrutaDeTurma = {
  readonly id: string;
  readonly codigo: string;
  readonly turma: string | null;
  readonly ano_letivo: number;
  readonly status: string;
  readonly modalidade: string;
  readonly data_inicio: string | null;
  readonly data_termino: string | null;
  readonly alunos: number | null;
  readonly cursos: { readonly codigo: string; readonly nome_curso: string } | null;
};

/** A linha como a tela a desenha. */
export type TurmaNaLista = {
  readonly id: string;
  readonly codigo: string;
  readonly rotulo: string | null;
  readonly ano: number;
  readonly status: string;
  readonly modalidade: string;
  readonly dataInicio: string | null;
  readonly dataTermino: string | null;
  readonly alunos: number | null;
  readonly cursoCodigo: string;
  readonly cursoNome: string;
};

export type OpcaoDeCurso = { readonly codigo: string; readonly nome: string };

/**
 * ⚠️ **O TRAÇO NO LUGAR DO CURSO AUSENTE NÃO DEVERIA ACONTECER — e é por isso que ele existe.** O
 * `!inner` garante o curso; se um dia a junção mudar, a célula diz *"—"* em vez de a tela estourar
 * (`RN-DEG-01`).
 */
export function paraLinhasDeTurma(brutas: readonly LinhaBrutaDeTurma[]): readonly TurmaNaLista[] {
  return brutas.map((t) => ({
    id: t.id,
    codigo: t.codigo,
    rotulo: t.turma,
    ano: t.ano_letivo,
    status: t.status,
    modalidade: t.modalidade,
    dataInicio: t.data_inicio,
    dataTermino: t.data_termino,
    alunos: t.alunos,
    cursoCodigo: t.cursos?.codigo ?? "—",
    cursoNome: t.cursos?.nome_curso ?? "—",
  }));
}

/**
 * Os anos que existem, do mais recente para o mais antigo.
 *
 * ⚠️ **ELES SAEM DO UNIVERSO QUE O PERFIL ALCANÇA, NUNCA DO RECORTE.** Derivá-los das linhas
 * filtradas faria o filtro **encolher as próprias opções**: escolher 2026 apagaria 2025 da lista, e
 * não haveria como voltar sem limpar tudo.
 */
export function anosDistintos(
  brutas: readonly { readonly ano_letivo: number }[],
): readonly number[] {
  return [...new Set(brutas.map((t) => t.ano_letivo))].sort((a, b) => b - a);
}
