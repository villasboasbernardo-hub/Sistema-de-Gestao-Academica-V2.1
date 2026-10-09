/**
 * `D-DSA-2` — a etapa presencial da turma semipresencial, e o DSA só dentro dela.
 *
 * > *"SEMIPRESENCIAL — DSA só na etapa presencial (regra nova). Hoje a turma semipresencial tem DSA
 * > em todas as semanas. Passa a ter dois campos na turma: início e término da etapa presencial
 * > (editáveis na ficha da turma, em «Editar turma», só para modalidade semipresencial). Semana fora
 * > dessa janela: a tela do DSA mostra «Etapa a distância — sem DSA nesta semana» e não deixa lançar;
 * > sem janela cadastrada: aviso pedindo para cadastrar, sem bloquear (RN-DEG-01)."*
 * > — comando de correções do DSA, decisão de Bernardo Villas Boas de 08/10/2026
 *
 * ⚠️ **UM LUGAR SÓ DIZ SE HÁ DSA NAQUELE DIA.** A tela (que troca a grade pela frase), a Server Action
 * (que recusa o lançamento) e o papel (`/print/dsa`) chamam estas funções. Escrita em três lugares, a
 * regra discordaria no primeiro dia em que um deles esquecesse a modalidade — é o que `dia-bloqueado.ts`
 * evita para o feriado, e este módulo copia a forma.
 *
 * ⚠️ **A SEMANA É "FORA" SÓ QUANDO NENHUM DIA DELA CAI NA JANELA.** A semana que a janela corta ao meio
 * tem DSA; o dia dela que fica fora é recusado um a um por `recusaForaDaEtapa` — a recusa é do DIA, e é
 * a mesma que a ação usa.
 *
 * ⚠️ **SÓ VALE PARA SEMIPRESENCIAL.** Presencial tem DSA em toda semana; EAD puro não tem DSA nenhum
 * (`Q-13`) e é tratado antes, pela página. O banco guarda a janela sem amarra à modalidade, de propósito
 * (ver a migration `20261008164612`): é aqui que a modalidade decide.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.** A turma chega por parâmetro, e as
 * datas são `aaaa-mm-dd` — comparação lexicográfica de data ISO é exata e não tem fuso.
 */
import { dataParaLeitura } from "@/lib/formato/data";

/** O que da turma importa para a etapa: a modalidade e as duas pontas da janela. */
export type TurmaParaEtapa = {
  readonly modalidade: string | null;
  readonly inicioEtapaPresencial: string | null;
  readonly terminoEtapaPresencial: string | null;
};

/** A janela cadastrada, já inteira — o banco exige as duas pontas juntas. */
export type JanelaDaEtapa = { readonly inicio: string; readonly termino: string };

/**
 * A situação da SEMANA diante da etapa presencial.
 *
 *  · `nao_se_aplica` — a turma não é semipresencial: o DSA segue como sempre;
 *  · `sem_janela`    — semipresencial SEM janela cadastrada: o DSA abre, com aviso (`RN-DEG-01`);
 *  · `dentro`        — ao menos um dia da semana cai na janela: há DSA;
 *  · `fora`          — nenhum dia cai na janela: "Etapa a distância — sem DSA nesta semana".
 */
export type SituacaoDaEtapa =
  | { readonly tipo: "nao_se_aplica" }
  | { readonly tipo: "sem_janela" }
  | { readonly tipo: "dentro"; readonly janela: JanelaDaEtapa }
  | { readonly tipo: "fora"; readonly janela: JanelaDaEtapa };

export const TEXTO_DA_ETAPA_A_DISTANCIA = "Etapa a distância — sem DSA nesta semana";

const soData = (valor: string): string => valor.slice(0, 10);

/** A janela, quando a turma é semipresencial e as duas pontas existem. */
export function janelaDaEtapa(turma: TurmaParaEtapa): JanelaDaEtapa | null {
  if (turma.modalidade !== "semipresencial") return null;
  if (!turma.inicioEtapaPresencial || !turma.terminoEtapaPresencial) return null;
  return {
    inicio: soData(turma.inicioEtapaPresencial),
    termino: soData(turma.terminoEtapaPresencial),
  };
}

/** A data cai na janela? Ambas as pontas inclusive — o primeiro e o último dia são presenciais. */
export function dataNaJanela(data: string, janela: JanelaDaEtapa): boolean {
  const d = soData(data);
  return d >= janela.inicio && d <= janela.termino;
}

/** A situação da semana inteira — ver o tipo. `dias` são as datas da semana aberta na tela. */
export function etapaDaSemana(turma: TurmaParaEtapa, dias: readonly string[]): SituacaoDaEtapa {
  if (turma.modalidade !== "semipresencial") return { tipo: "nao_se_aplica" };
  const janela = janelaDaEtapa(turma);
  if (janela === null) return { tipo: "sem_janela" };
  return dias.some((d) => dataNaJanela(d, janela))
    ? { tipo: "dentro", janela }
    : { tipo: "fora", janela };
}

/**
 * A frase da recusa de lançar (ou mover) NUM DIA fora da etapa presencial — ou `null` se o dia pode
 * receber lançamento.
 *
 * ⚠️ **SEM JANELA NÃO RECUSA** (`RN-DEG-01`): a decisão manda avisar e não bloquear. Só a janela
 * cadastrada, e o dia fora dela, recusam.
 */
export function recusaForaDaEtapa(turma: TurmaParaEtapa, data: string): string | null {
  const janela = janelaDaEtapa(turma);
  if (janela === null || dataNaJanela(data, janela)) return null;
  return (
    `Fora da etapa presencial (${dataParaLeitura(janela.inicio)} a ` +
    `${dataParaLeitura(janela.termino)}): este dia é da etapa a distância e não tem DSA. ` +
    `Para lançar, ajuste a etapa presencial na ficha da turma.`
  );
}

/**
 * Os dias da semana que ficam FORA da janela, numa semana que ela corta ao meio — o aviso da tela.
 * Vazio quando a situação não é `dentro` ou quando a semana está inteira na janela.
 */
export function diasForaDaEtapa(turma: TurmaParaEtapa, dias: readonly string[]): readonly string[] {
  const janela = janelaDaEtapa(turma);
  if (janela === null) return [];
  if (!dias.some((d) => dataNaJanela(d, janela))) return [];
  return dias.filter((d) => !dataNaJanela(d, janela));
}
