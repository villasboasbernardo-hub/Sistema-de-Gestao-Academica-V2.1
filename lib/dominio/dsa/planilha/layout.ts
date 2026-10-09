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
  contaNoNumero: 31,
  noPapel: 32,
  taOcupado: 33,
  taOcupadoSemEi: 34,
  semana_indice: 35,
  /* apoio, na primeira linha de cada dia */
  bloqueio: 36,
  eiNoDia: 37,
  ultimoTaFora: 38,
  ultimoTa: 39,
  temLancamento: 40,
  slotDoEi: 41,
  maxTaDoDia: 42,
  semPosicaoNoDia: 43,
  /* apoio, nas linhas sem posição */
  spDisciplinaDaCh: 44,
  spTempos: 45,
  spTexto: 46,
  /* apoio, no cabeçalho de cada semana */
  temAula: 47,
  acumulado: 48,
  chaveDaSemana: 49,
  fimDaSemana: 50,
} as const;

export const P_PRIMEIRA_COLUNA_DE_APOIO = P.periodo;
export const P_ULTIMA_COLUNA = P.fimDaSemana;
/** A linha dos títulos das colunas; o topo inteiro, até ela, fica congelado (`FR-005`). */
export const P_LINHA_DOS_TITULOS = 7;
export const P_PRIMEIRA_LINHA = 8;
/** O cabeçalho da semana: a linha da semana e as duas assinaturas. */
export const P_LINHAS_DO_CABECALHO = 3;

/** As colunas do CABEÇALHO DA SEMANA, nas mesmas colunas da aba. */
export const PC = {
  rotulo: P.semana,
  segunda: P.data,
  rotuloDoNumero: P.dia,
  numero: P.ta,
  rotuloDosAlunos: P.horario,
  alunos: P.cod,
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
  contaNoNumero: 13,
  /* as listas, à direita */
  listaCod: 15,
  listaItem: 16,
  listaInstrutores: 17,
  siglasAvaliacao: 18,
  discCodigo: 20,
  discNome: 21,
  discCh: 22,
  tecSigla: 24,
  tecNome: 25,
  semRotulo: 27,
  dataInicio: 29,
  chaveInicio: 30,
  foraData: 32,
  foraDisciplina: 33,
  foraTempos: 34,
  foraSemanas: 35,
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
  bdContaNoNumero: "BD_CONTA_NO_NUMERO",
  listaCod: "LISTA_COD",
  listaItem: "LISTA_ITEM",
  listaInstrutores: "LISTA_INSTRUTORES",
  siglasAvaliacao: "SIGLAS_AVALIACAO",
  discCodigo: "DISC_CODIGO",
  discNome: "DISC_NOME",
  discCh: "DISC_CH",
  tecSigla: "TEC_SIGLA",
  tecNome: "TEC_NOME",
  listaSemanas: "LISTA_SEMANAS",
  dataInicio: "DATA_INICIO",
  chaveInicio: "CHAVE_INICIO",
  foraData: "FORA_DATA",
  foraDisciplina: "FORA_DISCIPLINA",
  foraTempos: "FORA_TEMPOS",
  foraSemanas: "FORA_SEMANAS",
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
