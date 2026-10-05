/**
 * `RN-DIST-01` e `RN-DIST-02` — **a função única** que distribui a carga horária de uma disciplina
 * pelas semanas da janela de previsão dela.
 *
 * > *"A distribuição da carga horária de uma matéria pelas semanas de sua janela de previsão
 * > (início/término) é calculada por uma única função compartilhada, reaproveitada simultaneamente
 * > pelo Diagrama de Alocação (fonte 2026), pelo bloco "Previsto" do Cronos e, indiretamente, pela
 * > situação semanal do Detalhe Semanal de Aula. **Não pode existir uma segunda implementação** desse
 * > cálculo em paralelo — qualquer ajuste futuro deve mudar essa função única, refletindo
 * > automaticamente nos três módulos."*
 * > — documento 04, `RN-DIST-01`, *Risco: Alto*
 *
 * > *"A regra de distribuição usa a carga horária semanal cadastrada da matéria quando existir, ou a
 * > carga horária total dividida pelo número de semanas da janela; a **última semana da janela sempre
 * > recebe o resto**, de forma que a soma da distribuição feche exatamente com a carga horária total
 * > da matéria — nunca perder nem sobrar tempo de aula por arredondamento."*
 * > — documento 04, `RN-DIST-02`, *Risco: Alto*
 *
 * ⚠️ **AS DUAS CITAÇÕES DIZEM "MATÉRIA" PORQUE SÃO LITERAIS** (regra 1: portar é reescrever na
 * sintaxe nova preservando o texto normativo). **No código a palavra é `disciplina`**, pela P-14 de
 * 10/08/2026 — e é por isso que nenhum identificador deste arquivo usa a outra.
 *
 * ---
 *
 * ⚠️ **POR QUE ESTE MÓDULO MORA FORA DE `lib/dominio/dsa/`.** Ele é de **três** módulos — o
 * Cronograma (fusão do Diagrama de Alocação com o Cronos, decisão D4) e, indiretamente, a situação
 * semanal do DSA. Pô-lo sob `dsa/` convidaria o **Épico 7** a escrever o dele, que é exatamente a
 * segunda implementação que a `RN-DIST-01` proíbe. O endereço é o que o documento 04 fixa na própria
 * linha da regra (linha 80: *"`lib/dominio/distribuicao-semanal.ts` (fonte única)"*).
 *
 * ⚠️ **A NUMERAÇÃO DA SEMANA ISO NÃO NASCE AQUI, E ISSO É DELIBERADO:** ela é `semanaIsoDe` de
 * `lib/dominio/carga-semanal.ts`, que existe desde a spec 006 (`FR-016`, 15/09/2026) e já é usada
 * pelo alerta de faixa do instrutor. Reescrever a numeração aqui seria a segunda implementação **na
 * parte que mais convida a copiar** — a conta de ano ISO e número de semana tem três arestas (a
 * semana 1 pela primeira quinta-feira, a semana 53, a virada do ano) e duas cópias dela divergiriam
 * na aresta, não no caso comum. O que este módulo acrescenta é a **distribuição**; a semana vem
 * pronta.
 *
 * ⚠️ **O RESTO VAI NA ÚLTIMA SEMANA — e isso foi MEDIDO em DOIS artefatos, não suposto:** (1) o
 * documento 04, `RN-DIST-02`, linha 247, citado acima com estas palavras: *"a última semana da janela
 * sempre recebe o resto"*; (2) o **comentário de catálogo** de `disciplinas.ch_semanal`, na migration
 * `20260829233423_cadastro_e_unidades_ensino.sql` (linhas 582–586), que diz *"A distribuição é
 * RN-DIST-01/02 (última semana recebe o resto) e tem implementação ÚNICA em `lib/dominio/`"*.
 *
 * ⚠️ **O PEDIDO DA TAREFA QUE ESCREVEU ESTE ARQUIVO MANDAVA O CONTRÁRIO — resto nas PRIMEIRAS
 * semanas, `[4, 3, 3]` para CH 10 em 3 semanas —, apoiado na decisão `A-1` de 25/09/2026. A `A-1` é
 * de `RN-MAT-05`: ela reparte a CH entre INSTRUTORES e põe o resto nos mais ANTIGOS**
 * (`lib/dominio/rateio-de-carga.ts`). **Aqui a repartição é entre SEMANAS, e quem a governa é outra
 * regra.** O que as duas compartilham, e está honrado, é *divisão inteira, nunca fração*. Inverter a
 * ponta muda uma regra do documento 04 e exige **autorização nominal de Bernardo Villas Boas**
 * (regra 1) — por isso ficou **registrado em vez de consertado**.
 *
 * ⚠️ **NUNCA PRODUZ FRAÇÃO, e o repositório já pagou por isso:** até a M5 da spec 010 a
 * `vw_instrutor_carga_prevista` dividia com `round(…, 2)` e **10 TA entre 3 devolviam 3,33 três
 * vezes, somando 9,99** — a CH não fechava e nenhuma asserção acusava. Aqui *a soma fechar* é o
 * **invariante nomeado** da `RN-DIST-02`, e está no Vitest com essa palavra.
 *
 * ⚠️ **`disciplinas.semanas` E `disciplinas.ch_semanal` NÃO SÃO ESTA CONTA, E A COMPARAÇÃO INGÊNUA
 * ACUSARIA ESTE MÓDULO.** As duas são `generated always` e contam **blocos de 7 dias a partir do
 * início** — `floor((termino − inicio) / 7) + 1`, medido na migration `20260829233423`, linhas
 * 509–527. Uma janela de quarta a terça seguinte são **7 dias**, logo **1** para a coluna e **2
 * semanas ISO** para este módulo, porque atravessa um domingo. ⚠️ **A diferença é de propósito**: o
 * DSA é lançado **por semana ISO** (`?semana=`, documento 25), então o previsto tem de ser por semana
 * ISO para poder ser comparado com o lançado. O próprio comentário da coluna avisa que ela é
 * *"média informativa, NÃO a distribuição semanal"*.
 *
 * ⚠️ **A PRIMEIRA METADE DA `RN-DIST-02` AINDA NÃO TEM COLUNA, e isso está dito para ninguém concluir
 * que ela foi esquecida:** *"a carga horária semanal cadastrada da matéria quando existir"* não existe
 * hoje — `disciplinas.ch_semanal` é **derivada**, não cadastrada (medido no catálogo, e o comentário
 * dela diz isso com essas palavras). Então vale a segunda metade: CH total ÷ número de semanas da
 * janela. No dia em que houver CH semanal **cadastrada**, ela entra **aqui**, nesta função, e a última
 * semana continua recebendo a diferença.
 *
 * ⚠️ **LISTA VAZIA É A AUSÊNCIA; ZERO DENTRO DA LISTA É PREVISTO MEDIDO** (`RN-DEG-01`). Janela
 * invertida, data impossível ou CH não positiva devolvem **lista vazia** — não há semana a prever, e
 * `length === 0` é observável por quem chama. Já uma semana **dentro** da janela com `ta: 0` é
 * afirmação legítima: a janela cobre aquela semana e a CH não alcança todas elas (CH 2 em 5 semanas).
 *
 * ⚠️ **DATA DE CALENDÁRIO É `string` `aaaa-mm-dd`, NUNCA `Date`** — a convenção da pasta inteira.
 * `new Date("2026-03-01")` é meia-noite **em UTC**, e em `America/Sao_Paulo` isso é 28/02: a semana
 * sairia trocada na virada do mês, sem erro nenhum.
 *
 * ⚠️ **TypeScript puro: sem `supabase`, sem `next`, sem `react`** (Princípio II, imposto por ESLint).
 * A janela e a CH chegam **por parâmetro**, e nenhum parâmetro normativo é literal aqui porque esta
 * regra não tem nenhum — os tetos são da `RN-DIST-03`, noutro módulo.
 */

import { semanaIsoDe, type SemanaIso } from "./carga-semanal";

/**
 * A semana ISO é **a de `carga-semanal.ts`**, reexportada só para quem consome a distribuição não
 * precisar de dois imports. ⚠️ **É o MESMO tipo, não uma cópia** — um segundo `SemanaIso` com
 * `{ ano, semana }` em vez de `{ ano, numero, segunda, domingo }` deixaria duas formas da mesma coisa
 * em `lib/dominio/`, e trocar uma pela outra não daria erro em toda chamada.
 */
export type { SemanaIso };

/** A janela de previsão de uma disciplina — `previsao_inicio` e `previsao_termino`, `aaaa-mm-dd`. */
export type JanelaPrevista = {
  readonly inicio: string;
  readonly termino: string;
};

/** A janela mais a CH a distribuir. `chTempos` é `disciplinas.carga_horaria_tempos`, em TA. */
export type JanelaDaDisciplina = JanelaPrevista & {
  readonly chTempos: number;
};

/** Uma semana da janela com o que está previsto nela, em TA. Nunca fração. */
export type PrevistoNaSemana = SemanaIso & {
  readonly ta: number;
};

/**
 * O par que identifica uma semana — o bastante para perguntar pelo previsto dela.
 *
 * ⚠️ **NÃO É `SemanaIso` INTEIRA DE PROPÓSITO:** quem tem o número da semana na URL (`?semana=`) não
 * tem a segunda nem o domingo em mão, e exigi-los faria a tela montar um objeto pela metade só para
 * poder perguntar.
 */
export type IdentidadeDaSemana = Pick<SemanaIso, "ano" | "numero">;

const FORMATO_DE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const UMA_SEMANA = 7 * 86_400_000;

/** A data `aaaa-mm-dd` de um instante de meia-noite UTC. */
function dataIso(instante: number): string {
  return new Date(instante).toISOString().slice(0, 10);
}

/**
 * Meia-noite UTC de uma data `aaaa-mm-dd`, ou `null` quando o texto não é uma data **que existe**.
 *
 * ⚠️ **A CONFERÊNCIA DE IDA E VOLTA É O QUE PEGA `2026-02-30`.** `Date.UTC(2026, 1, 30)` não dá erro:
 * ele **rola** para 02/03/2026, e uma janela que começasse num dia inexistente passaria a valer por
 * outra semana sem nada acusar. Comparar a data reformatada com a recebida recusa a rolagem — e
 * recusa também `0000-01-01`, que o legado de dois dígitos do `Date` manda para 1900.
 *
 * ⚠️ **ISTO NÃO É A NUMERAÇÃO ISO, e a distinção importa:** aqui só se soma dia. Quem numera a semana
 * é `semanaIsoDe`, e numerar em dois lugares é o que a `RN-DIST-01` proíbe.
 */
function diaUtc(data: string): number | null {
  const casado = FORMATO_DE_DATA.exec(data);
  if (casado === null) return null;

  const instante = Date.UTC(Number(casado[1]), Number(casado[2]) - 1, Number(casado[3]));
  if (!Number.isFinite(instante)) return null;

  return dataIso(instante) === data ? instante : null;
}

/**
 * As semanas ISO que a janela cobre, em ordem cronológica — **vazia** se a janela não for janela.
 *
 * Uma semana entra quando a segunda-feira dela cai dentro da janela, mais a semana do próprio início.
 * É o mesmo critério de `cargaPorSemana` em `carga-semanal.ts` (*"uma janela cobre a semana quando tem
 * ao menos um dia dentro dela"*) — e tem de ser o mesmo, senão o previsto do Cronos e o alerta de
 * faixa do instrutor passariam a discordar sobre **quais** semanas existem.
 */
export function semanasDaJanela(janela: JanelaPrevista): readonly SemanaIso[] {
  const inicio = diaUtc(janela.inicio);
  const termino = diaUtc(janela.termino);
  if (inicio === null || termino === null || termino < inicio) return [];

  const primeira = semanaIsoDe(janela.inicio);
  if (primeira === null) return [];

  const segundaDaPrimeira = diaUtc(primeira.segunda);
  if (segundaDaPrimeira === null) return [];

  const semanas: SemanaIso[] = [primeira];
  for (let segunda = segundaDaPrimeira + UMA_SEMANA; segunda <= termino; segunda += UMA_SEMANA) {
    const semana = semanaIsoDe(dataIso(segunda));
    if (semana === null) break;
    semanas.push(semana);
  }

  return semanas;
}

/**
 * A distribuição da CH pelas semanas da janela — **a função única** da `RN-DIST-01`.
 *
 * ⚠️ **DIVISÃO INTEIRA, E A ÚLTIMA SEMANA RECEBE O RESTO** (`RN-DIST-02`). CH 10 em 3 semanas sai
 * `[3, 3, 4]`, e a soma fecha em 10.
 *
 * ⚠️ **O documento 04 chama a função de `distribuirCargaHorariaPorSemana`** na nota de implementação;
 * o nome curto ficou porque o argumento `parametros` que a nota previa **não existe** — esta regra não
 * tem parâmetro normativo —, e um terceiro argumento vazio seria copiado em toda chamada.
 *
 * ⚠️ **CH FRACIONÁRIA É TRUNCADA, e a soma fecha com o truncado.** Não é defeito escondido: a coluna é
 * `integer not null` (medido na migration `20260829233423`, linha 480), então fração só chega aqui por
 * engano de quem chama — e truncar mantém a invariante da `RN-DIST-02` em vez de devolver TA que
 * ninguém consegue lançar.
 */
export function distribuirPorSemana(janela: JanelaDaDisciplina): readonly PrevistoNaSemana[] {
  const ch = Math.trunc(Number(janela.chTempos));
  if (!Number.isFinite(ch) || ch <= 0) return [];

  const semanas = semanasDaJanela(janela);
  if (semanas.length === 0) return [];

  const porSemana = Math.floor(ch / semanas.length);
  const resto = ch - porSemana * semanas.length;
  const ultima = semanas.length - 1;

  return semanas.map((semana, indice) => ({
    ...semana,
    ta: indice === ultima ? porSemana + resto : porSemana,
  }));
}

/**
 * O previsto de **uma** semana — `0` fora da janela.
 *
 * ⚠️ **ZERO AQUI É MEDIDO, NÃO INVENTADO** (`RN-DEG-01`): a janela existe, a semana não está nela, e o
 * previsto da disciplina naquela semana **é** zero. O que seria ausência — janela inválida — já
 * devolve lista vazia em `distribuirPorSemana`, e quem precisa distinguir *"não há janela"* de *"a
 * janela não cobre esta semana"* pergunta àquela função, que é a única que sabe a diferença.
 */
export function previstoDaSemana(janela: JanelaDaDisciplina, semana: IdentidadeDaSemana): number {
  const achada = distribuirPorSemana(janela).find(
    (previsto) => previsto.ano === semana.ano && previsto.numero === semana.numero,
  );
  return achada?.ta ?? 0;
}
