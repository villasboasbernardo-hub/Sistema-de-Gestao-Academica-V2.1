/**
 * A capacidade de uma semana do DSA, em TA — `RN-EVT-02`, `FR-007`, critério **6**.
 *
 * > *"Um evento global (feriado) só desconta capacidade de cálculo quando seu impacto está marcado
 * > como «Dia Inteiro»; impacto parcial ou informativo não desconta nada."*
 * > — `RN-EVT-02`, documento 04 da Fase 1
 *
 * ⚠️ **O COMENTÁRIO DO CATÁLOGO DIZ OUTRA COISA, e quem manda é a regra** (regra 1: portar é
 * preservar o comportamento, inclusive o que parecer errado). Medido em 05/10/2026 na migration
 * `20260829232840_fundacao_tipos_e_auditoria.sql`, linha 225, o `comment on type` de
 * `public.impacto_feriado` escreve *"`parcial` reduz"* — e a `RN-EVT-02` diz que **não desconta
 * nada**. Este módulo segue a **regra**, e a divergência de redação do comentário fica **reportada,
 * não consertada**.
 *
 * ⚠️ **`parcial` NÃO EXISTE NA ORIGEM, e por isso o caso dele é sintético por necessidade.** Medido
 * em `scripts/etl/dados/bruto/v20/Calendario_Feriados.csv` (26 linhas): **24 `Dia_Inteiro`**, **2
 * `Informativo`**, **zero `parcial`**. O enum do banco tem os três valores, então a regra tem de
 * valer para os três — o teste cobre o terceiro virando o impacto de uma linha real, que é também o
 * **caso que discrimina** (mesma semana, mesma data, só o impacto muda, e o veredito vira).
 *
 * ⚠️ **DESCONTO É POR DATA DISTINTA, NUNCA POR LINHA — e a origem tem data repetida.** Medido no
 * mesmo arquivo: **26 linhas em 25 datas distintas**, porque **16/02/2026 aparece duas vezes** —
 * `FER-000003` (*"Feriado nacional (carnaval)"*) e `FER-000022` (*"Licença administrativa
 * (C-Espc-HN 2026)"*). Contar por linha tiraria **dois** dias de uma semana que perdeu **um**, e a
 * grade mostraria capacidade a menos sem erro nenhum. É a mesma medição que `diasUteisEntre`
 * (`lib/dominio/andamento-da-turma.ts`) já honra.
 *
 * ⚠️ **ESTE MÓDULO TRANSPORTA A MARCAÇÃO, NÃO A CORRIGE** (`FR-003`, pendência **`D21`**). Duas
 * linhas da origem estão erradas e **descontam capacidade hoje**: *Nossa Senhora Aparecida* em
 * **12/11/2026** (o feriado nacional é 12/10) e *Dia do Servidor Público federal*, que é **ponto
 * facultativo**, marcado **`Dia_Inteiro`**. A correção é na planilha da v2.0, por Bernardo; se ela
 * entrasse aqui, o módulo passaria a decidir o que é feriado — que é dado, não regra.
 *
 * ⚠️ **QUEM NÃO ENTRA NA CONTA SÃO OS DIAS: eles chegam prontos, em `dias`.** Este módulo **não**
 * decide fim de semana, nem sábado aberto, nem recesso — ele desconta da lista que recebe. É o que
 * faz a semana de 6 dias funcionar sem nenhum ramo a mais, e o que mantém a decisão de *"a semana
 * tem sábado?"* num lugar só (a grade).
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.** Os dias, os feriados e o regime
 * chegam **por parâmetro**. E data de calendário é `string` `aaaa-mm-dd`, nunca `Date`:
 * `new Date("2026-03-01")` é meia-noite **em UTC**, e em `America/Sao_Paulo` isso é **28/02** — a
 * semana inteira andaria um dia para trás, sem erro (ver `lib/formato/data.ts`).
 */

/** O `public.impacto_feriado` do banco — ENUM nativo, `not null`, medido em 05/10/2026. */
export type ImpactoDeFeriado = "dia_inteiro" | "parcial" | "informativo";

/** Uma linha de `feriados` que cai na janela da semana. */
export type FeriadoDaSemana = {
  /** `aaaa-mm-dd`. */
  readonly data: string;
  readonly descricao: string;
  readonly impacto: ImpactoDeFeriado;
};

/** Um dia marcado na grade — bloqueado ou com aviso —, sempre **com o motivo**. */
export type DiaMarcado = {
  readonly data: string;
  readonly descricao: string;
};

export type CapacidadeDaSemana = {
  /** Os dias recebidos **menos** as datas distintas bloqueadas. */
  readonly diasUteis: number;
  /** `diasUteis × temposPorDia`. */
  readonly ta: number;
  /** As datas bloqueadas, com a descrição — a grade mostra o dia bloqueado com o motivo. */
  readonly bloqueios: readonly DiaMarcado[];
  /** Os feriados que NÃO bloqueiam — a grade mostra como aviso. */
  readonly avisos: readonly DiaMarcado[];
};

/**
 * Os 10 primeiros caracteres de uma data — o `aaaa-mm-dd` dentro de um texto maior.
 *
 * ⚠️ **ISTO EXISTE POR UMA MEDIÇÃO, NÃO POR ZELO:** a coluna `feriados.data` é `date` e chega
 * `aaaa-mm-dd`, mas a **origem** da v2.0 guarda `2026-02-16 00:00:00` (medido no
 * `Calendario_Feriados.csv`). Comparar os textos inteiros faria um carimbo de hora **nunca casar
 * com o dia**, em silêncio — a semana sairia sem bloqueio nenhum, que é a forma de falha caro do
 * gotcha 4: nada acusa, e a grade parece certa.
 */
function soData(valor: string): string {
  return valor.slice(0, 10);
}

/**
 * A capacidade da semana.
 *
 * ⚠️ **`temposPorDia` AUSENTE DEVOLVE `null`, NUNCA ZERO** (`RN-DEG-01`). Zero TA se leria como
 * *"a semana não cabe nada"*, que é uma afirmação sobre a turma — e sem regime não se mediu nada. É
 * a mesma precedência de `capacidadeDiaria` em `andamento-da-turma.ts`.
 *
 * ⚠️ **ZERO E NEGATIVO TAMBÉM VALEM "SEM DADO", e o zero é medido:** `regime_padrao_tempos` é **0**
 * em regime EAD por `CHECK` desde 08/09/2026, então aceitá-lo daria capacidade zero — e, com ela, a
 * semana inteira bloqueada de fato — a toda turma presencial de curso EAD.
 *
 * ⚠️ **FERIADO FORA DA SEMANA É IGNORADO, e nem vira aviso.** A janela é a lista `dias`: avisar
 * sobre um dia que não está na grade é ruído que ninguém consegue localizar na tela.
 *
 * ⚠️ **DATA BLOQUEADA NÃO APARECE TAMBÉM EM `avisos`.** O bloqueio já mostra o dia com o motivo, e
 * a mesma data nas duas listas diria *"bloqueado"* e *"não bloqueia"* ao mesmo tempo.
 *
 * ⚠️ **SEGUNDA LINHA NA MESMA DATA NÃO ACRESCENTA ENTRADA EM `bloqueios`** — uma entrada ali
 * significa **um dia fora da conta**, e o dia só sai uma vez (ver a nota do 16/02 no cabeçalho).
 * Fica a descrição da **primeira** linha daquela data, na ordem em que ela chegou.
 */
export function capacidadeDaSemana(entrada: {
  /** As datas da semana, ISO, na ordem. */
  readonly dias: readonly string[];
  readonly feriados: readonly FeriadoDaSemana[];
  /** `null` quando não há regime. */
  readonly temposPorDia: number | null;
}): CapacidadeDaSemana | null {
  const { temposPorDia } = entrada;
  if (temposPorDia === null || !Number.isFinite(temposPorDia) || temposPorDia <= 0) return null;

  // Data repetida em `dias` também contaria duas vezes; a semana é um conjunto de dias.
  const diasDaSemana: string[] = [];
  for (const dia of entrada.dias) {
    const data = soData(dia);
    if (!diasDaSemana.includes(data)) diasDaSemana.push(data);
  }

  const bloqueadas = new Map<string, string>();
  const avisadas: DiaMarcado[] = [];

  for (const feriado of entrada.feriados) {
    const data = soData(feriado.data);
    if (!diasDaSemana.includes(data)) continue;

    if (feriado.impacto === "dia_inteiro") {
      if (!bloqueadas.has(data)) bloqueadas.set(data, feriado.descricao);
      continue;
    }

    avisadas.push({ data, descricao: feriado.descricao });
  }

  /*
   * As duas listas saem na ordem dos **dias**, não na ordem em que os feriados chegaram: é a ordem
   * em que a grade os desenha, e ela não deve depender de como a consulta ordenou as linhas.
   */
  const bloqueios: DiaMarcado[] = [];
  const avisos: DiaMarcado[] = [];
  for (const data of diasDaSemana) {
    const descricao = bloqueadas.get(data);
    if (descricao !== undefined) {
      bloqueios.push({ data, descricao });
      continue;
    }
    for (const aviso of avisadas) {
      if (aviso.data === data) avisos.push(aviso);
    }
  }

  const diasUteis = diasDaSemana.length - bloqueios.length;

  return {
    diasUteis,
    ta: diasUteis * temposPorDia,
    bloqueios,
    avisos,
  };
}
