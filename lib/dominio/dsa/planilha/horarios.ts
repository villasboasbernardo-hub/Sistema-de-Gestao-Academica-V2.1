/**
 * A aba HORÁRIOS da planilha de contingência — `FR-009` e `contracts/planilha.md` §5 da spec 015.
 *
 * > *"Os horários MUST ser, para cada semana, o relógio da vigência que cobre a data dela — início e
 * > fim de cada TA, incluído o excepcional, com o intervalo do almoço —, o mesmo do `/print/dsa`.
 * > Semana sem vigência MUST sair com os TA numerados, sem horário, e aviso."* — `FR-009`
 *
 * > *"O catálogo de horários por tempo de aula […] é ancorado no início do dia […] e é
 * > deliberadamente diferente do modelo das planilhas legadas por curso (que ancoravam no fim do dia).
 * > Uma reescrita não deve «corrigir» isso portando o modelo antigo."* — `RN-CONF-02`
 *
 * ⚠️ **O RELÓGIO NÃO NASCE AQUI.** Cada semana chega com o `Relogio` que `relogioDaSemana` resolveu
 * para ela; esta aba só o escreve. Um relógio por conteúdo distinto — duas semanas com o mesmo
 * relógio apontam para o mesmo bloco.
 *
 * ⚠️ **NÃO HÁ A COLUNA "quantidade de TA → horário até o fim do dia"** das planilhas de hoje: é o
 * modelo ancorado no fim do dia que a `RN-CONF-02` proíbe portar.
 */
import { minutosEntre, TA_MAXIMO, type Relogio } from "../horario-do-bloco";
import { definir, novaAba, type Aba, type NomeDefinido } from "../../../planilha/pasta";

import { ABA, H, H_LINHA_DOS_TITULOS, H_PRIMEIRA_LINHA, NOME } from "./layout";
import type { RelogioDaPlanilha } from "./tipos";

/** O aviso da semana sem relógio (`FR-009`, `RN-DEG-01`). */
export const AVISO_SEMANA_SEM_RELOGIO =
  "semana(s) sem regime de curso vigente: os TA saem numerados, sem horário. Cadastre a vigência na edição do curso.";

const identidadeDo = (r: Relogio) =>
  JSON.stringify([
    r.origem,
    r.temposDoRegime,
    r.tempos.map((t) => [t.numero, t.inicio, t.fim, t.periodo, t.tipo]),
  ]);

/**
 * Os relógios distintos do período, na ordem em que aparecem, e o id de cada semana — `null` na
 * semana sem relógio.
 */
export function relogiosDaPasta(
  semanas: readonly { readonly seisDias: readonly string[]; readonly relogio: Relogio | null }[],
): {
  readonly relogios: readonly RelogioDaPlanilha[];
  readonly idDaSemana: readonly (string | null)[];
} {
  const porIdentidade = new Map<
    string,
    { id: string; relogio: Relogio; de: string; ate: string }
  >();
  const idDaSemana = semanas.map((s) => {
    if (s.relogio === null) return null;
    const chave = identidadeDo(s.relogio);
    const de = s.seisDias[0] ?? "";
    const ate = s.seisDias[s.seisDias.length - 1] ?? de;
    const existente = porIdentidade.get(chave);
    if (existente !== undefined) {
      if (de < existente.de) existente.de = de;
      if (ate > existente.ate) existente.ate = ate;
      return existente.id;
    }
    const id = `R${porIdentidade.size + 1}`;
    porIdentidade.set(chave, { id, relogio: s.relogio, de, ate });
    return id;
  });
  return { relogios: [...porIdentidade.values()], idDaSemana };
}

/**
 * Quantos TA cada dia tem na entrada — a grade não muda de tamanho entre semanas (`data-model.md`
 * §4). É o maior relógio do período, **cortado** no regime + 1 (o lugar do Estudo Individual depois
 * de um dia cheio) ou no último TA que o sistema já ocupou, o que for maior: um relógio derivado do
 * regime chega com os 12 tempos do teto, e 12 linhas por dia num curso de 8 TA seriam 4 linhas vazias
 * em todo dia do ano.
 */
export function temposDaGrade(entrada: {
  readonly relogios: readonly Relogio[];
  /** O maior TA ocupado no papel de qualquer semana, Estudo Individual incluído. */
  readonly ultimoOcupado: number;
}): number {
  if (entrada.relogios.length === 0) return TA_MAXIMO;
  const maior = Math.max(...entrada.relogios.map((r) => r.tempos.length));
  const regime = Math.max(...entrada.relogios.map((r) => r.temposDoRegime));
  return Math.max(1, Math.min(maior, TA_MAXIMO, Math.max(regime + 1, entrada.ultimoOcupado)));
}

const PERIODO = { manha: "manhã", tarde: "tarde" } as const;

export function descricaoDoRelogio(r: RelogioDaPlanilha): string {
  const doRegime = r.relogio.tempos.filter((t) => t.numero <= r.relogio.temposDoRegime);
  const primeiro = doRegime[0] ?? r.relogio.tempos[0];
  const ultimo = doRegime[doRegime.length - 1] ?? r.relogio.tempos[r.relogio.tempos.length - 1];
  const origem = r.relogio.origem === "catalogo" ? "catálogo de horários" : "regime do curso";
  const faixa = primeiro && ultimo ? ` (${primeiro.inicio}–${ultimo.fim})` : "";
  return `${r.id} — ${origem}, ${r.relogio.temposDoRegime} TA${faixa}`;
}

/** A aba HORÁRIOS e os nomes que a PREENCHIMENTO e a IMPRESSÃO buscam nela. */
export function abaDeHorarios(relogios: readonly RelogioDaPlanilha[]): {
  readonly aba: Aba;
  readonly nomes: readonly NomeDefinido[];
} {
  const aba = novaAba(ABA.horarios);
  definir(aba, 1, 1, {
    valor:
      "O relógio de cada semana, como o sistema o resolve. Um bloco por relógio; a PREENCHIMENTO busca o horário de cada TA pela chave relógio|TA.",
    estilo: { negrito: true },
  });
  const titulos: readonly [number, string][] = [
    [H.relogio, "Relógio"],
    [H.de, "Semanas de"],
    [H.ate, "até"],
    [H.origem, "Origem"],
    [H.ta, "TA"],
    [H.inicio, "Início"],
    [H.fim, "Fim"],
    [H.periodo, "Período"],
    [H.excepcional, "Excepcional"],
    [H.horario, "Horário"],
    [H.chave, "Chave"],
    [H.intervalo, "APOIO — intervalo até o próximo TA (min)"],
    [H.relId, "Relógio"],
    [H.relTempos, "TA no relógio"],
    [H.relRegime, "TA do regime"],
    [H.relDescricao, "Descrição"],
  ];
  for (const [coluna, texto] of titulos) {
    definir(aba, H_LINHA_DOS_TITULOS, coluna, { valor: texto, estilo: { negrito: true } });
  }

  let linha = H_PRIMEIRA_LINHA;
  for (const r of relogios) {
    const ordenados = [...r.relogio.tempos].sort((a, b) => a.numero - b.numero);
    for (const [i, t] of ordenados.entries()) {
      const proximo = ordenados[i + 1];
      definir(aba, linha, H.relogio, { valor: r.id });
      definir(aba, linha, H.de, { data: r.de });
      definir(aba, linha, H.ate, { data: r.ate });
      definir(aba, linha, H.origem, {
        valor: r.relogio.origem === "catalogo" ? "catálogo" : "regime",
      });
      definir(aba, linha, H.ta, { valor: t.numero });
      definir(aba, linha, H.inicio, { valor: t.inicio });
      definir(aba, linha, H.fim, { valor: t.fim });
      definir(aba, linha, H.periodo, { valor: PERIODO[t.periodo] });
      definir(aba, linha, H.excepcional, {
        valor: t.tipo === "excepcional" || t.numero > r.relogio.temposDoRegime ? "sim" : "",
      });
      definir(aba, linha, H.horario, { valor: `${t.inicio}–${t.fim}` });
      definir(aba, linha, H.chave, { valor: `${r.id}|${t.numero}` });
      /* ⚠️ O intervalo é o de `minutosEntre`, o mesmo que `gradeDoPapel` desenha — nunca uma conta daqui. */
      if (proximo !== undefined) {
        definir(aba, linha, H.intervalo, { valor: minutosEntre(t.fim, proximo.inicio) });
      }
      linha += 1;
    }
  }
  const ultima = Math.max(H_PRIMEIRA_LINHA, linha - 1);

  relogios.forEach((r, i) => {
    const l = H_PRIMEIRA_LINHA + i;
    definir(aba, l, H.relId, { valor: r.id });
    definir(aba, l, H.relTempos, { valor: r.relogio.tempos.length });
    definir(aba, l, H.relRegime, { valor: r.relogio.temposDoRegime });
    definir(aba, l, H.relDescricao, { valor: descricaoDoRelogio(r) });
  });
  const ultimoRelogio = H_PRIMEIRA_LINHA + Math.max(0, relogios.length - 1);

  for (const [coluna, largura] of [
    [H.relogio, 8],
    [H.de, 11],
    [H.ate, 11],
    [H.origem, 10],
    [H.ta, 5],
    [H.inicio, 7],
    [H.fim, 7],
    [H.periodo, 8],
    [H.excepcional, 11],
    [H.horario, 13],
    [H.chave, 8],
    [H.relDescricao, 48],
  ] as const) {
    aba.larguras.set(coluna, largura);
  }
  aba.colunasOcultas.add(H.intervalo);
  aba.congelar = { linhas: H_LINHA_DOS_TITULOS, colunas: 0 };

  const faixa = (n: string, coluna: number, ate = ultima): NomeDefinido => ({
    nome: n,
    aba: ABA.horarios,
    de: { linha: H_PRIMEIRA_LINHA, coluna },
    ate: { linha: ate, coluna },
  });
  return {
    aba,
    nomes: [
      faixa(NOME.hChave, H.chave),
      faixa(NOME.hHorario, H.horario),
      faixa(NOME.hPeriodo, H.periodo),
      faixa(NOME.hInicio, H.inicio),
      faixa(NOME.hFim, H.fim),
      faixa(NOME.hIntervalo, H.intervalo),
      faixa(NOME.hRelId, H.relId, ultimoRelogio),
      faixa(NOME.hRelTempos, H.relTempos, ultimoRelogio),
      faixa(NOME.hRelRegime, H.relRegime, ultimoRelogio),
      faixa(NOME.hRelDescricao, H.relDescricao, ultimoRelogio),
    ],
  };
}
