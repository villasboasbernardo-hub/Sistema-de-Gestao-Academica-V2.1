/**
 * A situação de execução de cada avaliação — calculada na LEITURA, nunca gravada (D-AA-11, FR-050).
 *
 * > *"A avaliação passa a ser acompanhada somente por situação de execução: Concluída, Em andamento,
 * > Pendente, Atrasada ou Sem correspondência; uma vista de prova que ultrapasse 7 dias corridos após a
 * > aplicação sem ter sido registrada como realizada é marcada Atrasada."*
 * > — `RN-AVAL-01`, documento 04
 *
 * As regras são as da FR-051 da spec 014:
 *
 * | Situação | Quando |
 * |---|---|
 * | concluída | aplicada, e com vista registrada ou sem item de vista no currículo |
 * | em andamento | aplicada, sem vista, dentro do prazo |
 * | atrasada | aplicada, sem vista, há MAIS DE `prazoDias` dias corridos — o 8º dia é atrasada; o 7º, não |
 * | pendente | item do currículo ou avaliação agendada ainda não aplicada |
 * | OD | pendente antes do 1º lançamento da disciplina; em andamento enquanto ela corre; concluída quando ela conclui (Q-17) |
 * | sem correspondência | item do currículo sem lançamento ligado depois do término do curso da turma |
 *
 * ⚠️ **O PRAZO CONTA DA APLICAÇÃO REGISTRADA, NÃO DA DATA PREVISTA** (FR-052). A data prevista é exibida e
 * não entra aqui — por isso este módulo nem a recebe.
 * ⚠️ **NA PROVA EM N SESSÕES, O PRAZO CONTA DA ÚLTIMA** (`RN-AV-12` da spec 014, emenda de 15/10/2026: *"UMA prova com
 * N sessões de aplicação, não N provas"*; leitura de 16/10/2026): a prova só termina na última sessão, e contar da
 * 1ª acusaria atraso numa prova ainda em aplicação. A 1ª sessão ainda à frente continua «pendente».
 *
 * ⚠️ **ESTE É O ÚNICO LUGAR QUE DECIDE A SITUAÇÃO** (R-8). `app.fn_status_vista` é ESPELHO desta função para
 * a view e para o pgTAP cruzado, e cobre só prova e trabalho; a OD vive só aqui. A tabela de casos única é
 * `tests/unidade/dados/situacao-da-avaliacao.json`, lida pelo Vitest e pela prova cruzada contra o banco.
 *
 * ⚠️ **A CONCLUSÃO DA DISCIPLINA, PARA A OD, CHEGA PRONTA** — pelo mesmo critério do painel da disciplina
 * (`lib/dominio/dsa/situacao.ts`), recebido por parâmetro. Dois critérios de "disciplina concluída" dariam
 * dois vereditos na mesma tela.
 *
 * ⚠️ **COMPARAÇÃO DE DATA SOBRE O TEXTO ISO** (`aaaa-mm-dd`), sem `Date` local: `new Date("2026-03-01")` é
 * meia-noite em UTC, e em `America/Sao_Paulo` isso é o dia anterior. A conta de dias corridos usa
 * `Date.UTC`, que não tem fuso. `hoje` chega por parâmetro (`hojeNaCiaara()` na tela).
 *
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II).
 */

/**
 * ⚠️ **`cancelada` SÓ NASCE DO AJUSTE MANUAL** (Bloco 16, spec 031, ajuste D de 31/10/2026): `situacaoDaAvaliacao` nunca
 *    a devolve — a avaliação cancelada no registro sai da conta (`null`). Quem a escreve é quem lança o DSA, com
 *    justificativa, em `ajustes_de_avaliacao`, e ela vale na linha (`comAjustes`).
 */
export type SituacaoDaAvaliacao =
  "pendente" | "em_andamento" | "concluida" | "atrasada" | "sem_correspondencia" | "cancelada";

/** A natureza do instrumento (`config_listas.instrumentos_avaliacao.metadados.natureza`). */
export type NaturezaDaAvaliacao = "prova" | "trabalho" | "od";

export type EntradaDaSituacao = {
  natureza: NaturezaDaAvaliacao;
  /** Estado de REGISTRO (`avaliacoes.status`). Cancelada e substituída ficam fora: devolvem `null`. */
  estadoDoRegistro?: string | null;
  /** Data ISO da aplicação lançada no DSA; `null` = não há lançamento ligado ao item. */
  aplicacao: string | null;
  /** Datas ISO das sessões de vista ATIVAS da avaliação. */
  sessoesDeVista: readonly string[];
  /** Datas ISO das sessões de aplicação 2..N ATIVAS (`sessoes_de_aplicacao`, RN-AV-12). Sem elas, só a 1ª. */
  sessoesDeAplicacao?: readonly string[];
  /** O currículo (ou o ajuste da turma) prevê tempo de vista para o item. */
  temItemDeVista: boolean;
  /** `config_parametros`: prazo de vista em dias corridos (7). */
  prazoDias: number;
  hoje: string;
  /** Término do curso da turma (ISO). Sem ele, o item sem lançamento fica pendente (`RN-DEG-01`). */
  terminoDaTurma: string | null;
  /** Só para a OD: a disciplina já teve lançamento na turma. */
  disciplinaIniciada?: boolean;
  /** Só para a OD: a disciplina está concluída pelo critério do painel da disciplina. */
  disciplinaConcluida?: boolean;
};

/** Estados de registro que tiram a avaliação de toda conta (lista NEGATIVA aqui só porque é saída). */
const FORA_DA_CONTA = new Set(["cancelada", "substituida_pela_planilha"]);

function diasCorridos(de: string, ate: string): number {
  const [a, b, c] = de.split("-").map(Number);
  const [d, e, f] = ate.split("-").map(Number);
  return Math.round((Date.UTC(d!, e! - 1, f!) - Date.UTC(a!, b! - 1, c!)) / 86_400_000);
}

export function situacaoDaAvaliacao(entrada: EntradaDaSituacao): SituacaoDaAvaliacao | null {
  if (entrada.estadoDoRegistro && FORA_DA_CONTA.has(entrada.estadoDoRegistro)) return null;

  if (entrada.natureza === "od") {
    if (entrada.disciplinaConcluida) return "concluida";
    return entrada.disciplinaIniciada ? "em_andamento" : "pendente";
  }

  // Avaliação agendada à frente ainda não foi aplicada: é pendente (FR-051).
  if (entrada.aplicacao === null || entrada.aplicacao > entrada.hoje) {
    if (
      entrada.aplicacao === null &&
      entrada.terminoDaTurma !== null &&
      entrada.hoje > entrada.terminoDaTurma
    ) {
      return "sem_correspondencia";
    }
    return "pendente";
  }

  if (!entrada.temItemDeVista || entrada.sessoesDeVista.length > 0) return "concluida";
  // RN-AV-12: a prova termina na ÚLTIMA sessão de aplicação (texto ISO: a maior é a mais tardia).
  const fim = (entrada.sessoesDeAplicacao ?? []).reduce(
    (maior, data) => (data > maior ? data : maior),
    entrada.aplicacao,
  );
  return diasCorridos(fim, entrada.hoje) > entrada.prazoDias ? "atrasada" : "em_andamento";
}

/** Rótulo de tela de cada situação. */
export const ROTULO_DA_SITUACAO: Record<SituacaoDaAvaliacao, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
  sem_correspondencia: "Sem correspondência",
  cancelada: "Cancelada",
};
