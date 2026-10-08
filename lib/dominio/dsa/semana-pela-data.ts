/**
 * A semana do DSA **escolhida por uma data** — o campo de calendário da navegação da semana
 * (`RF-DSA-02`, `RF-NAV-04`, `FR-010` da spec 013).
 *
 * > *"ESCOLHER A SEMANA: além de 'Semana anterior' / 'Próxima semana' / 'Semana atual' (já existem
 * > em NavegacaoDaSemana.tsx), um campo de data com o calendário NATIVO do navegador (input
 * > type="date", lang pt-BR): escolhida uma data, abre o DSA da semana que a contém. A URL continua
 * > sendo a dona (?semana=&ano=). Sem pacote novo."*
 * > — decisão de **Bernardo Villas Boas**, **08/10/2026** (item 4 das correções do DSA, spec 013)
 *
 * ⚠️ **A SEMANA ISO NÃO NASCE AQUI** (ponto único): a ida (data → semana) é `semanaIsoDe` e a volta
 * (semana → datas) é `datasDaSemanaIso`, as duas de `lib/dominio/carga-semanal.ts`. Calcular semana
 * ISO num segundo lugar é o que a `RN-DIST-01` proíbe, e a virada do ano é justamente onde duas
 * contas discordariam. Este módulo só decide **se a data escolhida serve para navegar**.
 *
 * ⚠️ **O ANO DA URL É O ANO ISO, NÃO O DO CALENDÁRIO.** 01/01/2027 é da semana 53 de **2026**, e
 * 31/12/2029 é da semana 1 de **2030**. Ler o ano da própria data erraria nos dois sentidos:
 * `?semana=53&ano=2027` não existe (o ano ISO de 2027 tem 52 semanas), e `?semana=1&ano=2029` abre
 * uma semana **um ano inteiro antes** da data escolhida — sem erro nenhum na tela.
 *
 * ⚠️ **DOMINGO É O ÚLTIMO DIA DA SEMANA, NÃO O PRIMEIRO** (ISO 8601). O DSA mostra de segunda a
 * sábado, e o domingo escolhido abre a semana que ele **fecha**; pela convenção americana ele
 * abriria a seguinte.
 *
 * ⚠️ **TRÊS RECUSAS, E NENHUMA É EXCEÇÃO** (`RN-DEG-01`): devolvem `null`, e a tela simplesmente não
 * navega —
 *   · **campo apagado, ou data incompleta** — o navegador entrega `""` enquanto falta um pedaço;
 *   · **data que não existe no calendário** (`2026-02-30`) — `Date.UTC` a empurraria em silêncio
 *     para 02/03, e a tela abriria uma semana que ninguém escolheu. O navegador não produz essa
 *     cadeia; a função a recusa assim mesmo, porque o contrato dela é a cadeia, e não o navegador;
 *   · **ano ISO fora da faixa que a URL aceita.** ⚠️ **É ESTA QUE SEGURA A DIGITAÇÃO:** quem digita
 *     o ano `2026` tecla a tecla pode fazer o campo passar por `0002`, `0020` e `0202` — datas que o
 *     HTML considera **válidas** (ano de quatro dígitos, maior que zero). Sem a faixa, cada tecla
 *     abriria um ano diferente. ⚠️ **A sequência de valores durante a digitação é do navegador e NÃO
 *     foi medida aqui** — a ponta a ponta usa `fill`, que escreve a data inteira de uma vez; o que o
 *     teste de unidade prova é a recusa das três cadeias, não o que cada navegador entrega.
 *
 * ⚠️ **A FAIXA CHEGA POR PARÂMETRO**, e quem a dá é o contrato de parâmetros da rota
 * (`lib/navegacao/contrato.ts`: `ano` de 2020 a 2099, a mesma do `CHECK config_param_ano_valido`).
 * Escrevê-la aqui seria a segunda fonte do mesmo número — e a primeira a envelhecer.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por
 * ESLint). Data de calendário é `string` `aaaa-mm-dd`, nunca `Date` — a convenção da pasta inteira.
 */

import { datasDaSemanaIso, limitesDoAnoIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import type { IdentidadeDaSemana } from "@/lib/dominio/distribuicao-semanal";

/** Os anos que a URL aceita, com os nomes do descritor do contrato (`minimo`, `maximo`). */
export type FaixaDeAnos = { readonly minimo: number; readonly maximo: number };

/**
 * A semana ISO que contém a data escolhida — ou `null`, e então a tela **não** navega.
 *
 * @example semanaDaDataEscolhida("2026-04-08", { minimo: 2020, maximo: 2099 }) → { ano: 2026, numero: 15 }
 * @example semanaDaDataEscolhida("2027-01-01", { minimo: 2020, maximo: 2099 }) → { ano: 2026, numero: 53 }
 */
export function semanaDaDataEscolhida(data: string, anos: FaixaDeAnos): IdentidadeDaSemana | null {
  const valor = data.trim();
  const semana = semanaIsoDe(valor);
  if (semana === null) return null;
  /*
   * ⚠️ **A PROVA DE QUE A DATA EXISTE É ELA ESTAR ENTRE OS SETE DIAS DA SEMANA QUE A CONTÉM.** Uma
   * data inexistente rola para outro dia e cai numa semana cujos dias não a incluem. ⚠️ Conferir só
   * o intervalo `segunda ≤ data ≤ domingo` NÃO basta: `2026-04-31` rola para 01/05, e na comparação
   * de texto a cadeia fica entre `2026-04-27` e `2026-05-03` — passaria por data de verdade.
   */
  const seteDias = [...datasDaSemanaIso(semana.ano, semana.numero), semana.domingo];
  if (!seteDias.includes(valor)) return null;
  if (semana.ano < anos.minimo || semana.ano > anos.maximo) return null;
  return { ano: semana.ano, numero: semana.numero };
}

/**
 * As datas que o calendário do campo oferece (`min` e `max`) — **exatamente** as que levam a uma
 * semana que a URL aceita.
 *
 * ⚠️ **SÃO AS PONTAS DO ANO ISO, E NÃO 01/01 E 31/12.** O ano ISO de 2020 começa em **30/12/2019** e
 * o de 2099 termina em **03/01/2100**. Com as pontas do calendário, o calendário e a navegação
 * discordariam na virada: com a faixa começando em 2021, por exemplo, 01/01 a 03/01/2021 são da
 * semana 53 de **2020** — o calendário as ofereceria, e a navegação as recusaria sem dizer por quê.
 */
export function datasEscolhiveis(anos: FaixaDeAnos): {
  readonly primeira: string;
  readonly ultima: string;
} {
  return {
    primeira: limitesDoAnoIso(anos.minimo).inicio,
    ultima: limitesDoAnoIso(anos.maximo).fim,
  };
}
