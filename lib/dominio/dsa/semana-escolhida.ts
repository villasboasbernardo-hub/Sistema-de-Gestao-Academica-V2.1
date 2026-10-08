/**
 * A semana que o DSA abre a partir de `?semana=&ano=` — e o aviso que diz **o que de fato aconteceu**
 * quando a URL pediu algo que não serve (`RN-DEG-01`, `RF-DSA-02`, `RF-NAV-04`).
 *
 * > **RN-DEG-01.** *"Sempre que uma funcionalidade depender de uma aba, coluna ou registro que ainda
 * > não existe (…), o sistema deve devolver um resultado vazio/neutro com aviso — nunca travar ou
 * > lançar um erro não tratado ao usuário final."*
 *
 * ⚠️ **O `0` DOS DOIS PARÂMETROS É SENTINELA, E É AQUI QUE ELE VIRA DATA.** O contrato declara
 * `padrao: 0` porque *"a semana corrente"* é dinâmica e não cabe num literal — ver a nota da rota em
 * `lib/navegacao/contrato.ts`. Zero não é semana ISO (1..53) nem ano.
 *
 * ⚠️ **O AVISO DIZ O QUE ACONTECEU, E A PRIMEIRA VERSÃO MENTIA** *(achado na conferência do PR #40,
 * 08/10/2026)*. `?semana=22&ano=2019` chegava com o ano descartado pelo contrato (a faixa é 2020 a
 * 2099), a tela abria a semana **22** do ano corrente — e o aviso terminava com *"Abrimos a semana
 * corrente"*, frase colada pela página a **qualquer** descarte. A pessoa procurava a semana corrente e
 * via outra. Agora o aviso inteiro nasce aqui, junto da escolha: quem decide a semana é quem a
 * descreve, e as duas coisas deixam de poder discordar.
 *
 * ⚠️ **O NÚMERO DE SEMANAS DO ANO SAI DE `semanasDoAnoIso`** — 52 ou 53, medido, e não um `52` escrito
 * à mão que esconderia a última semana de 2026 inteira. ⚠️ **E A FAIXA DO CONTRATO CHEGA POR
 * PARÂMETRO** (a mesma razão de `semana-pela-data.ts`): escrevê-la aqui seria a segunda fonte do
 * mesmo número.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */
import { semanaIsoDe, semanasDoAnoIso } from "@/lib/dominio/carga-semanal";

/** Um valor que o contrato de parâmetros descartou — a forma de `Descarte`, sem importá-la. */
export type ValorDescartado = { readonly parametro: string; readonly recebido: string };

/** As faixas que a URL aceita, com os nomes do descritor do contrato. */
export type FaixasDaSemana = {
  readonly semana: { readonly minimo: number; readonly maximo: number };
  readonly ano: { readonly minimo: number; readonly maximo: number };
};

export type SemanaEscolhida = {
  readonly ano: number;
  readonly numero: number;
  /** A frase inteira, já com a consequência — ou `null` quando a URL foi atendida como pedida. */
  readonly aviso: string | null;
};

/**
 * A semana a abrir.
 *
 * @example semanaEscolhida({ semana: 22, ano: 0, hoje: "2026-10-08",
 *   descartes: [{ parametro: "ano", recebido: "2019" }] })
 *   → { ano: 2026, numero: 22, aviso: "… Trocamos o ano pelo corrente, 2026, e mantivemos a semana 22." }
 */
export function semanaEscolhida(entrada: {
  readonly semana: number;
  readonly ano: number;
  /** `aaaa-mm-dd` no fuso da CIAARA-11. */
  readonly hoje: string;
  /** O que `lerParametros` descartou; só `semana` e `ano` interessam aqui. */
  readonly descartes?: readonly ValorDescartado[] | undefined;
  /** As faixas do contrato, para o aviso dizer qual é o valor aceito. */
  readonly faixas?: FaixasDaSemana | undefined;
}): SemanaEscolhida {
  const corrente = semanaIsoDe(entrada.hoje);
  const anoCorrente = corrente?.ano ?? 0;
  const semanaCorrente = corrente?.numero ?? 1;

  const descarteDe = (parametro: "semana" | "ano") =>
    (entrada.descartes ?? []).find((d) => d.parametro === parametro) ?? null;
  const semanaDescartada = descarteDe("semana");
  const anoDescartado = descarteDe("ano");

  const ano = entrada.ano === 0 ? anoCorrente : entrada.ano;
  const total = semanasDoAnoIso(ano);
  const semanaExiste = entrada.semana >= 1 && entrada.semana <= total;

  /*
   * ⚠️ **A ESCOLHA NÃO MUDOU — só o aviso.** Semana pedida e existente: ela. Semana ausente (ou
   * descartada, que chega como `0`): a corrente. Semana além do fim do ano: a corrente, se o ano é o
   * corrente, e a 1, se não é.
   */
  const numero =
    entrada.semana === 0
      ? semanaCorrente
      : semanaExiste
        ? entrada.semana
        : ano === anoCorrente
          ? semanaCorrente
          : 1;

  const motivos: string[] = [];
  if (semanaDescartada) {
    const faixa = entrada.faixas?.semana;
    motivos.push(
      `O valor "${semanaDescartada.recebido}" não serve para semana` +
        (faixa ? `: ela vai de ${faixa.minimo} a ${faixa.maximo}.` : "."),
    );
  }
  if (anoDescartado) {
    const faixa = entrada.faixas?.ano;
    motivos.push(
      `O valor "${anoDescartado.recebido}" não serve para ano` +
        (faixa ? `: ele vai de ${faixa.minimo} a ${faixa.maximo}.` : "."),
    );
  }
  if (entrada.semana !== 0 && !semanaExiste) {
    motivos.push(`O ano ISO de ${ano} tem ${total} semanas; a ${entrada.semana} não existe.`);
  }

  if (motivos.length === 0) return { ano, numero, aviso: null };

  const ehCorrente = ano === anoCorrente && numero === semanaCorrente;
  const aberta = ehCorrente ? "a semana corrente" : `a semana ${numero} de ${ano}`;
  /*
   * ⚠️ **O ANO TROCADO É DITO COMO TROCA**, e a semana mantida é dita como mantida: é o caso que a
   * conferência achou, e o único em que *"abrimos a semana corrente"* era falso e plausível ao mesmo
   * tempo.
   */
  const anoTrocado = anoDescartado !== null && entrada.ano === 0;
  const consequencia = anoTrocado
    ? semanaExiste
      ? `Trocamos o ano pelo corrente, ${ano}, e mantivemos a semana ${numero}.`
      : `Trocamos o ano pelo corrente, ${ano}, e abrimos ${aberta}.`
    : `Abrimos ${aberta}.`;

  return { ano, numero, aviso: `${motivos.join(" ")} ${consequencia}` };
}
