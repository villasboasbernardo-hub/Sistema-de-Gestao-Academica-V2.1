/**
 * Onde cada coisa mora na planilha de contingência — `contracts/planilha.md` da spec 015.
 *
 * ⚠️ **UM LUGAR SÓ PARA OS ENDEREÇOS.** As fórmulas de uma aba apontam para colunas de outra; com os
 * números espalhados, mudar uma coluna quebraria uma fórmula longe dali, sem erro nenhum até alguém
 * abrir o arquivo. Aqui, cada coluna tem nome.
 */
import { TEXTO_DO_ESTUDO_INDIVIDUAL } from "../impressao";

export const ABA = {
  preenchimento: "PREENCHIMENTO",
  impressao: "IMPRESSÃO",
  catalogo: "BD DISCIPLINAS",
  horarios: "HORÁRIOS",
  controle: "CONTROLE",
  cronos: "CRONOS",
} as const;

/* ------------------------------------------------------------ PREENCHIMENTO */

/** As colunas da PREENCHIMENTO. Até `aviso` são as que o operador vê; o resto é apoio, oculto. */
export const P = {
  semana: 1,
  data: 2,
  dia: 3,
  ta: 4,
  horario: 5,
  cod: 6,
  item: 7,
  conteudo: 8,
  local: 9,
  te: 10,
  instrutor: 11,
  codigo: 12,
  conferencia: 13,
  tempos: 14,
  aviso: 15,
  /* apoio, por linha de TA */
  periodo: 16,
  chave: 17,
  disciplina: 18,
  tipo: 19,
  inicio: 20,
  contador: 21,
  posicao: 22,
  resto: 23,
  comprimento: 24,
  pe: 25,
  linha1: 26,
  linha2: 27,
  linha3: 28,
  texto: 29,
  disciplinaDaCh: 30,
  noPapel: 31,
  taOcupado: 32,
  /* 33, 36, 38 e 40 ficaram livres no Bloco 15 (spec 030): eram as contas da linha fixa do Estudo Individual. */
  semana_indice: 34,
  /* apoio, na primeira linha de cada dia */
  bloqueio: 35,
  ultimoTaFora: 37,
  temLancamento: 39,
  maxTaDoDia: 41,
  semPosicaoNoDia: 42,
  /* apoio, nas linhas sem posição */
  spDisciplinaDaCh: 43,
  spTempos: 44,
  spTexto: 45,
  /* apoio, no cabeçalho de cada semana */
  /** N da semana do curso, sem o limite (`formulaDaSemanaCorrida`) — o rótulo sai dele. */
  semanaCorrida: 46,
  chaveDaSemana: 47,
  fimDaSemana: 48,
} as const;

export const P_PRIMEIRA_COLUNA_DE_APOIO = P.periodo;
export const P_ULTIMA_COLUNA = P.fimDaSemana;
/** A linha dos títulos das colunas; o topo inteiro, até ela, fica congelado (`FR-005`). */
export const P_LINHA_DOS_TITULOS = 7;
export const P_PRIMEIRA_LINHA = 8;
/** O cabeçalho da semana: a linha da semana e as duas assinaturas. */
export const P_LINHAS_DO_CABECALHO = 3;

/** As colunas do CABEÇALHO DA SEMANA, nas mesmas colunas da aba. */
/*
 * ⚠️ **"SEMANA N DE T" NO LUGAR DO "Nº"** (spec 016, FR-009.5; D-COR-1): o rótulo da semana do curso
 * dispensa título — ele mesmo começa por "Semana" —, e mora na coluna do horário, larga o bastante,
 * com a do COD vazia à direita para o texto transbordar. Alunos foi para as duas colunas estreitas.
 */
export const PC = {
  rotulo: P.semana,
  segunda: P.data,
  rotuloDosAlunos: P.dia,
  alunos: P.ta,
  semanaDoCurso: P.horario,
  rotuloDoAlt: P.item,
  alt: P.conteudo,
  rotuloDoRelogio: P.local,
  relogio: P.te,
  descricaoDoRelogio: P.instrutor,
  /* as duas linhas de assinatura */
  rotuloDaAssinatura: P.semana,
  rotuloDoNome: P.item,
  nome: P.conteudo,
  rotuloDoPosto: P.te,
  posto: P.instrutor,
  rotuloDaFuncao: P.codigo,
  funcao: P.conferencia,
} as const;

/* ------------------------------------------------------------ BD DISCIPLINAS */

export const B = {
  chave: 1,
  cod: 2,
  item: 3,
  tipo: 4,
  disciplina: 5,
  nome: 6,
  conteudo: 7,
  chPrevista: 8,
  local: 9,
  te: 10,
  instrutor: 11,
  disciplinaDaCh: 12,
  /* as listas, à direita */
  listaCod: 14,
  listaItem: 15,
  listaInstrutores: 16,
  siglasAvaliacao: 17,
  discCodigo: 19,
  discNome: 20,
  discCh: 21,
  tecSigla: 23,
  tecNome: 24,
  semRotulo: 26,
  /* a janela da turma e a duração do curso — a semana do curso sai daqui (FR-009.5) */
  dataInicio: 28,
  dataTermino: 29,
  duracaoDoCurso: 30,
  semanasDaTurma: 31,
  totalDoCurso: 32,
  foraData: 34,
  foraDisciplina: 35,
  foraTempos: 36,
  /* spec 017 (FR-007): o nome da disciplina no cartão, ao lado das listas do rodapé */
  discNomeDsa: 38,
} as const;
export const B_LINHA_DOS_TITULOS = 2;
export const B_PRIMEIRA_LINHA = 3;

/* ------------------------------------------------------------ HORÁRIOS */

export const H = {
  relogio: 1,
  de: 2,
  ate: 3,
  origem: 4,
  ta: 5,
  inicio: 6,
  fim: 7,
  periodo: 8,
  excepcional: 9,
  horario: 10,
  chave: 11,
  intervalo: 12,
  /* um por relógio, à direita */
  relId: 15,
  relTempos: 16,
  relRegime: 17,
  relDescricao: 18,
} as const;
export const H_LINHA_DOS_TITULOS = 2;
export const H_PRIMEIRA_LINHA = 3;

/* ------------------------------------------------------------ CONTROLE (PR 2) */

export const C = {
  cod: 1,
  disciplina: 2,
  prevista: 3,
  lancada: 4,
  restante: 5,
  situacao: 6,
  retrato: 7,
} as const;
/** A data de referência da CONTROLE: `TODAY()`, editável (`FR-025`). */
export const C_REFERENCIA = { linha: 2, coluna: 2 } as const;
export const C_LINHA_DOS_TITULOS = 3;
export const C_PRIMEIRA_LINHA = 4;

/* ------------------------------------------------------------ CRONOS (PR 2) */

export const K = {
  cod: 1,
  disciplina: 2,
  prevista: 3,
  primeiraSemana: 4,
} as const;
export const K_LINHA_DOS_TITULOS = 2;
export const K_LINHA_DAS_DATAS = 3;
export const K_PRIMEIRA_LINHA = 4;

/* ------------------------------------------------------------ nomes definidos */

export const NOME = {
  bdChave: "BD_CHAVE",
  bdDisciplina: "BD_DISCIPLINA",
  bdConteudo: "BD_CONTEUDO",
  bdLocal: "BD_LOCAL",
  bdTe: "BD_TE",
  bdInstrutor: "BD_INSTRUTOR",
  bdDisciplinaDaCh: "BD_DISCIPLINA_DA_CH",
  listaCod: "LISTA_COD",
  listaItem: "LISTA_ITEM",
  listaInstrutores: "LISTA_INSTRUTORES",
  siglasAvaliacao: "SIGLAS_AVALIACAO",
  discCodigo: "DISC_CODIGO",
  discNome: "DISC_NOME",
  discNomeDsa: "DISC_NOME_DSA",
  discCh: "DISC_CH",
  tecSigla: "TEC_SIGLA",
  tecNome: "TEC_NOME",
  listaSemanas: "LISTA_SEMANAS",
  dataInicio: "DATA_INICIO",
  dataTermino: "DATA_TERMINO",
  duracaoDoCurso: "DURACAO_DO_CURSO",
  semanasDaTurma: "SEMANAS_DA_TURMA",
  totalDoCurso: "TOTAL_DE_SEMANAS",
  foraData: "FORA_DATA",
  foraDisciplina: "FORA_DISCIPLINA",
  foraTempos: "FORA_TEMPOS",
  hChave: "H_CHAVE",
  hHorario: "H_HORARIO",
  hPeriodo: "H_PERIODO",
  hInicio: "H_INICIO",
  hFim: "H_FIM",
  hIntervalo: "H_INTERVALO",
  hRelId: "H_RELOGIO",
  hRelTempos: "H_RELOGIO_TEMPOS",
  hRelRegime: "H_RELOGIO_REGIME",
  hRelDescricao: "H_RELOGIO_DESCRICAO",
} as const;

/* ------------------------------------------------------------ o vocabulário da entrada */

/** As categorias que entram no COD sem disciplina — o vocabulário do sistema (`FR-021`). */
export const CATEGORIA_NO_COD = {
  AEC: "AEC",
  TAD: "TAD",
  TR: "TR",
  Estudo_Individual: "Estudo Individual",
} as const;
export const CATEGORIAS = Object.values(CATEGORIA_NO_COD);

/** Os itens que não são número de UE. */
export const ITEM = {
  semUe: "SEM UE",
  vista: "VISTA",
  aec: "AEC",
  nenhum: "—",
} as const;

export const TEXTO_CHAVE_SEM_PAR = "chave não existe no catálogo";

/** O texto da linha fixa de Estudo Individual no cartão — o mesmo do papel, com o asterisco. */
export const CONTEUDO_DO_ESTUDO_NO_CARTAO = `${TEXTO_DO_ESTUDO_INDIVIDUAL} *`;
