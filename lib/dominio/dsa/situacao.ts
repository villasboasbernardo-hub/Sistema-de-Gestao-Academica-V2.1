/**
 * A situação de cada disciplina na semana e a CH **acumulada até aquela semana** — `RF-DSA-05`.
 *
 * > *"O sistema deve apresentar, por matéria, a situação da semana (Aguardando Início, Em andamento,
 * > Concluída, Conflitou) e o quadro de carga horária acumulada até a semana selecionada."*
 * > — `RF-DSA-05`, documento 02 da Fase 1
 *
 * > *"A avaliação «correto/atenção» de uma semana de uma matéria compara o executado da própria
 * > semana contra o previsto da mesma semana (não apenas o total do curso inteiro) — a granularidade
 * > semanal da comparação é a regra, não apenas o agregado final."*
 * > — `RN-CRONOS-03`, documento 04
 *
 * > *"A execução real de uma turma é sempre calculada a partir da soma dos registros de aula
 * > efetivamente lançados — nunca da atribuição/planejamento de instrutor a matéria."*
 * > — `RN-CRONOS-01`, documento 04
 *
 * ⚠️ **O CORTE DO ACUMULADO É `ateODia`, E É ELE QUE FAZ A `RN-CRONOS-03` VALER.** Com a semana 20
 * selecionada, o quadro mostra o acumulado **até a 20** — não o total do curso. O módulo **não
 * conhece número de semana**: quem seleciona a semana entrega o **último dia dela**, porque semana
 * ISO é conta de calendário e já tem dono na pasta. Dois lugares convertendo semana em data dariam
 * duas respostas na virada do ano, que é exatamente onde ninguém confere.
 *
 * ⚠️ **A `RN-CRONOS-01` É HONRADA PELA FORMA DA ENTRADA, não por uma conta aqui:** o que chega é a
 * lista de **lançamentos**, e não existe campo de atribuição nem de planejamento neste módulo. Não
 * há como somar planejamento com o que ele recebe — o que é mais forte que lembrar de não somar.
 *
 * ⚠️ **`Q-2` — LANÇAMENTO COM DATA FUTURA CONTA, e isto é decisão registrada, não descuido**
 * (`FR-028.1`, decisão de Bernardo Villas Boas, 05/10/2026). A `RN-CRONOS-01` fala de *"lançado"* e
 * **não** de *"passado"*, e o pedido proíbe reinterpretá-la: **não há corte por `hoje` no cálculo**.
 * O que a tela faz é **marcar**, e é só para isso que `hoje` entra — produzindo o
 * `taLancadoAFrente`. ⚠️ **A alternativa descartada era cortar por `hoje`**, que mudaria em silêncio
 * o `chd_executada`, o andamento da turma e as turmas em alerta que o `/inicio` já publica.
 *
 * ⚠️ **COMPARAÇÃO DE DATA É LEXICOGRÁFICA SOBRE O TEXTO ISO, e é de propósito.** `aaaa-mm-dd` ordena
 * como texto exatamente como ordena no calendário, sem fuso e sem `Date`: `new Date("2026-03-01")` é
 * meia-noite **em UTC**, e em `America/Sao_Paulo` isso é 28/02 — a semana 20 passaria a incluir um
 * dia da 21 na virada. É a convenção da pasta inteira (ver `lib/formato/data.ts` e `bloco.ts`).
 * ⚠️ **Formato de data não é conferido aqui**: `blocoValido` o confere na gravação e a coluna é
 * `date` no banco. Texto fora do formato ordenaria por acidente, e o lugar de recusá-lo é a entrada.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II). O corte da semana,
 * `hoje` e os lançamentos chegam **por parâmetro**, que é o que permite provar as contas com casos
 * sintéticos, sem subir banco.
 */

import { percentualExecutado } from "@/lib/dominio/andamento-da-turma";

/**
 * As quatro situações do `RF-DSA-05`.
 *
 * ⚠️ **`conflitou` NÃO É UM QUINTO DEGRAU DE PROGRESSO: ela ATRAVESSA os outros três** — uma
 * disciplina pode estar concluída **e** ter conflitado. O requisito pede **uma** palavra por
 * disciplina, então a precedência fica escrita em `situacaoDaDisciplina`, e não deduzida na tela.
 */
export type SituacaoDaDisciplina = "aguardando_inicio" | "em_andamento" | "concluida" | "conflitou";

/** Um lançamento, no mínimo que a situação precisa saber dele. */
export type LancamentoParaSituacao = {
  /** `aaaa-mm-dd` — a data do lançamento, nunca `Date`. */
  readonly data: string;
  /** Tempos de aula consumidos. */
  readonly ta: number;
  /**
   * Se **este** lançamento está em conflito.
   *
   * ⚠️ **O CONFLITO É DECIDIDO ANTES DAQUI** (`RN-CONF-01`): sobreposição de instrutor é relação
   * entre lançamentos de **turmas diferentes**, e este módulo olha **uma** disciplina. Redecidi-lo
   * aqui seria o segundo lugar onde a `RN-CONF-01` vive.
   */
  readonly temConflito: boolean;
};

export type DisciplinaParaSituacao = {
  readonly disciplinaId: string;
  /** CH prevista da disciplina na turma, em TA. `0` em currículo por competências. */
  readonly chPrevistaTempos: number;
  readonly lancamentos: readonly LancamentoParaSituacao[];
};

export type QuadroDaDisciplina = {
  readonly disciplinaId: string;
  readonly situacao: SituacaoDaDisciplina;
  readonly chPrevista: number;
  /** Soma dos TA lançados com data **menor ou igual** ao último dia da semana selecionada. */
  readonly chAcumulada: number;
  /** `max(prevista − acumulada, 0)`. **Nunca negativa**: excesso não é "restante negativo". */
  readonly chRestante: number;
  /** `round(100 · acumulada / prevista)`; **`null`** quando a prevista é 0 — nunca `0 %`. */
  readonly percentual: number | null;
  /**
   * Os TA que estão **dentro do acumulado** e com data **posterior a hoje** (`Q-2`).
   *
   * ⚠️ **É SEMPRE UM SUBCONJUNTO DE `chAcumulada`, nunca um número à parte** — lançamento depois do
   * corte da semana não entra no acumulado e **também não** é marcado aqui. Contá-lo faria a tela
   * marcar como "à frente" um TA que o número ao lado dele não inclui.
   */
  readonly taLancadoAFrente: number;
};

/**
 * A situação de uma disciplina, na precedência do `RF-DSA-05`.
 *
 * ⚠️ **A ORDEM DOS QUATRO DEGRAUS É A REGRA, e cada um tem razão:**
 * 1. **`aguardando_inicio`** — nenhum lançamento até o corte. Vem primeiro porque é **ausência de
 *    dado**, e não um progresso de 0 % (`RN-DEG-01`): a disciplina pode nem ter começado.
 * 2. **`conflitou`** — algum lançamento até o corte em conflito. **Vence as outras**, porque é o que
 *    exige ação de quem olha; esconder conflito atrás de *"Concluída"* é o pior dos dois erros.
 * 3. **`concluida`** — acumulada `>=` prevista.
 * 4. **`em_andamento`** — o resto.
 *
 * ⚠️ **Ela é exportada para que o controle negativo do teste consiga isolar a precedência** — a
 * mesma entrada sem conflito tem de dar `concluida`, e sem isso *"conflitou vence"* não se observa.
 */
export function situacaoDaDisciplina(entrada: {
  readonly temLancamento: boolean;
  readonly temConflito: boolean;
  readonly chPrevista: number;
  readonly chAcumulada: number;
}): SituacaoDaDisciplina {
  if (!entrada.temLancamento) return "aguardando_inicio";
  if (entrada.temConflito) return "conflitou";
  if (entrada.chAcumulada >= entrada.chPrevista) return "concluida";
  return "em_andamento";
}

/**
 * O quadro de uma disciplina na semana selecionada.
 *
 * ⚠️ **`ateODia` CORTA O CÁLCULO; `hoje` SÓ MARCA.** São dois parâmetros porque são duas perguntas
 * diferentes, e trocar um pelo outro é o defeito que a `Q-2` recusou: com `hoje` cortando, o
 * acumulado da semana corrente mudaria de valor **sozinho**, da noite para o dia.
 *
 * ⚠️ **LANÇAMENTO DO PRÓPRIO DIA NÃO É "À FRENTE"** — a comparação é `data > hoje`, estrita. Aula
 * lançada para hoje acontece hoje; marcá-la como futura acusaria quem está em dia.
 *
 * ⚠️ **COM `chPrevista` ZERO, QUALQUER LANÇAMENTO DÁ `concluida`** — é consequência direta de
 * `acumulada >= prevista`, e acontece nos **dois** cursos por competências da base real
 * (`C-Espc-HN` e `C-Espc-FR`). O que diz à tela que não há denominador é o `percentual` **`null`**,
 * e por isso ele não é `0`: `0 %` ali seria afirmação sobre execução, e não ausência de medida
 * (`RN-DEG-01`).
 */
export function quadroDaDisciplina(entrada: {
  readonly disciplina: DisciplinaParaSituacao;
  /** O último dia da semana selecionada, `aaaa-mm-dd` — o corte do **acumulado**. */
  readonly ateODia: string;
  /** Hoje, `aaaa-mm-dd` — só para **marcar** o lançado à frente; não corta o cálculo. */
  readonly hoje: string;
}): QuadroDaDisciplina {
  const { disciplina, ateODia, hoje } = entrada;

  /*
   * `Number(…) || 0` é o padrão da pasta (ver `andamento-da-turma.ts`): a entrada vem do PostgREST,
   * onde `numeric` chega como texto e a ausência chega como `null`.
   */
  const chPrevista = Number(disciplina.chPrevistaTempos) || 0;

  let chAcumulada = 0;
  let taLancadoAFrente = 0;
  let temLancamento = false;
  let temConflito = false;

  for (const lancamento of disciplina.lancamentos) {
    // O corte da semana (`RN-CRONOS-03`) — e o ÚNICO corte que existe neste módulo (`Q-2`).
    if (lancamento.data > ateODia) continue;

    const ta = Number(lancamento.ta) || 0;
    temLancamento = true;
    chAcumulada += ta;
    if (lancamento.temConflito) temConflito = true;
    if (lancamento.data > hoje) taLancadoAFrente += ta;
  }

  return {
    disciplinaId: disciplina.disciplinaId,
    situacao: situacaoDaDisciplina({ temLancamento, temConflito, chPrevista, chAcumulada }),
    chPrevista,
    chAcumulada,
    chRestante: Math.max(chPrevista - chAcumulada, 0),
    /*
     * ⚠️ **A FÓRMULA DO PERCENTUAL É IMPORTADA, NÃO REESCRITA.** `percentualExecutado` já é o ponto
     * único dos três grãos — a turma, a disciplina da grade e o painel do `/inicio` —, e o cabeçalho
     * dela diz por quê: a conta é de uma linha, e é por isso mesmo que uma quarta cópia passaria sem
     * ninguém notar até o dia em que uma delas arredondasse para o outro lado.
     */
    percentual: percentualExecutado(chPrevista, chAcumulada),
    taLancadoAFrente,
  };
}
