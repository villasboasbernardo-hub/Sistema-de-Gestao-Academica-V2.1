/**
 * A IMPRESSÃO da planilha de contingência contra o papel do sistema — `FR-012`, `FR-017`, `FR-022`,
 * `FR-024`, `SC-003`, `SC-005` e as reexpressões da `DP-1` (I-P5, I-P10, I-P12) da spec 015.
 *
 * ⚠️ **O ESPERADO SAI DO DOMÍNIO, nunca de uma segunda conta**: `montarSemana` → `documentoImpresso`
 * → `gradeDoPapel` para a grade, `tabelaDeCh` e `legendaDeTecnicas` para o rodapé, `numeroDoDsa` para
 * o número. A planilha chega ao mesmo resultado por fórmula, a partir da entrada.
 */
import { describe, expect, it } from "vitest";

import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import type { CartaoDaGrade } from "@/lib/dominio/dsa/grade-do-papel";
import { TEXTO_DO_ESTUDO_FIXO } from "@/lib/dominio/dsa/planilha/impressao";
import { celulasComErro, calcularCaches } from "@/lib/planilha/pasta";

import { lerImpressao, precalcular } from "./planilha/leitura-da-pasta";
import {
  DISCIPLINAS,
  SEMANAS,
  insumoSintetico,
  numeroDaSemana,
  papelDaSemana,
  rodapeDaSemana,
} from "./planilha/sintetico";

const insumo = insumoSintetico();
const { pasta, impressao: g } = montarPlanilhaComGeometria(insumo);
const conhecidos = precalcular(pasta);
const NOMES = new Map<string, string>(DISCIPLINAS.map((d) => [d.codigo, d.nome]));

/** O texto de cada célula de um cartão, pela distribuição da R-8 — a mesma regra das duas pontas. */
function textosDoCartao(c: CartaoDaGrade): string[] {
  const l = c.linha;
  const linhas = [
    ...(l.disciplina === "" ? [] : [`${l.disciplina} ${NOMES.get(l.disciplina) ?? ""}`]),
    `${l.conteudo}${c.tipo === "estudo" ? " *" : ""}`,
    [l.instrutor, `${c.ta} TA`, l.local, l.te].filter((x) => x !== "").join(" · "),
  ];
  const n = c.ta;
  if (n >= linhas.length) return [...linhas, ...Array<string>(n - linhas.length).fill("")];
  return [...linhas.slice(0, n - 1), linhas.slice(n - 1).join("\n")];
}

const SIGLAS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

describe("I-P2 · nenhuma fórmula com erro, em semana nenhuma", () => {
  it("o arquivo como gerado", () => {
    expect(celulasComErro(calcularCaches(pasta))).toEqual([]);
  });
});

describe.each(SEMANAS.map((s) => [s.numero, s] as const))("semana %i", (_, s) => {
  const comSabado = s.lancamentos.some((l) => l.dia === 5);
  const papel = papelDaSemana(s, comSabado);
  const rotulo = insumo.semanas.find((x) => x.semana.numero === s.numero)?.rotulo ?? "";
  const lida = lerImpressao(pasta, g, rotulo, conhecidos);

  it("I-P12 · o seletor escolhe exatamente esta semana", () => {
    expect(lida.texto(6, 5)).toBe(`Semana ${s.numero}/2026`);
  });

  it("FR-012 · os cartões: posição, texto e tipo — o de `gradeDoPapel` (I-P5, I-P10)", () => {
    const grade = papel.grade;
    expect(grade).not.toBeNull();
    if (grade === null) return;
    const esperado = new Map<string, { texto: string; tipo: string }>();
    for (const c of grade.cartoes) {
      const tas = grade.faixas
        .slice(c.faixaInicial, c.faixaFinal + 1)
        .filter((f) => f.tipo === "tempo")
        .map((f) => (f as { numero: number }).numero);
      textosDoCartao(c).forEach((texto, i) => {
        esperado.set(`${c.coluna}|${tas[i]}`, { texto, tipo: c.tipo });
      });
    }
    for (let d = 0; d < grade.colunas.length; d += 1) {
      for (let t = 1; t <= g.tempos; t += 1) {
        const e = esperado.get(`${d}|${t}`);
        expect.soft(lida.celula(d, t), `${SIGLAS[d]} ${t}º TA`).toBe(e?.texto ?? "");
        expect
          .soft(lida.espelho(d, t).replace(/[01]\*?$/, ""), `tipo ${SIGLAS[d]} ${t}º`)
          .toBe(e?.tipo ?? "");
      }
    }
  });

  it("R-7 · bloco vizinho do mesmo tipo tem outro tom, e o título vai na primeira célula", () => {
    const grade = papel.grade;
    if (grade === null) return;
    for (const c of grade.cartoes) {
      const primeiro = (grade.faixas[c.faixaInicial] as { numero: number }).numero;
      expect
        .soft(lida.espelho(c.coluna, primeiro).endsWith("*"), `início ${c.linha.chave}`)
        .toBe(true);
    }
  });

  it("FR-009 · a régua: cada TA com o horário, e o intervalo ou o almoço entre eles", () => {
    const grade = papel.grade;
    if (grade === null) return;
    const tempos = grade.faixas.filter((f) => f.tipo === "tempo");
    tempos.forEach((f, i) => {
      if (f.tipo !== "tempo") return;
      expect.soft(lida.regua(f.numero)).toBe(`${f.numero}º\n${f.inicio}–${f.fim}`);
      const entre = grade.faixas[grade.faixas.indexOf(f) + 1];
      if (i === tempos.length - 1 || entre === undefined) return;
      expect
        .soft(lida.separador(f.numero))
        .toBe(
          entre.tipo === "almoco"
            ? `Almoço ${entre.inicio}–${entre.fim}`
            : entre.tipo === "intervalo"
              ? `${entre.minutos} min`
              : "",
        );
    });
    for (let t = tempos.length + 1; t <= g.tempos; t += 1) expect.soft(lida.regua(t)).toBe("");
  });

  it("os dias do cabeçalho, com o feriado de dia inteiro", () => {
    const grade = papel.grade;
    if (grade === null) return;
    grade.colunas.forEach((c, d) => {
      expect
        .soft(lida.cabecalhoDoDia(d))
        .toBe(`${c.sigla} ${c.diaMes}${c.bloqueio ? `\n${c.bloqueio}` : ""}`);
    });
  });

  it("FR-024 · a CH e a legenda só da semana, com a cumprida até o fim dela (I-P10)", () => {
    const { ch, legenda } = rodapeDaSemana(s);
    const linhas = Array.from({ length: g.linhasDoRodape }, (_, i) => g.rodape + 1 + i);
    const daPlanilha = linhas
      .map((l) => ({
        codigo: lida.texto(l, 1),
        nome: lida.texto(l, 3),
        prevista: lida.texto(l, 5),
        cumprida: lida.texto(l, 7),
      }))
      .filter((x) => x.codigo !== "");
    expect(daPlanilha).toEqual(
      ch.map((d) => ({
        codigo: d.codigo,
        nome: d.nome,
        prevista: String(d.prevista),
        cumprida: String(d.cumprida),
      })),
    );
    const tecnicas = linhas
      .map((l) => ({ sigla: lida.texto(l, 9), nome: lida.texto(l, 11) }))
      .filter((x) => x.sigla !== "");
    expect(tecnicas).toEqual(legenda.map((i) => ({ sigla: i.sigla, nome: i.nome })));
  });

  it("FR-007 · o nº do DSA é o de `numeroDoDsa`", () => {
    const n = numeroDaSemana(s.numero);
    expect(lida.texto(6, 7)).toBe(`DSA Nº ${n ?? "—"}`);
  });

  it("o Estudo Individual fixo no TA seguinte ao último lançado (`slotDoEstudoIndividual`)", () => {
    const grade = papel.grade;
    if (grade === null) return;
    for (const c of grade.cartoes.filter((x) => x.linha.chave.startsWith("ei-"))) {
      const ta = (grade.faixas[c.faixaInicial] as { numero: number }).numero;
      expect.soft(lida.slot(c.coluna)).toBe(ta);
      expect.soft(lida.celula(c.coluna, ta)).toBe(TEXTO_DO_ESTUDO_FIXO);
    }
  });
});

describe("FR-013 · o que não tem lugar na grade sai abaixo dela", () => {
  it("a aula sem TA da semana 17", () => {
    const rotulo = insumo.semanas.find((x) => x.semana.numero === 17)?.rotulo ?? "";
    const lida = lerImpressao(pasta, g, rotulo, conhecidos);
    expect(lida.texto(g.listaSemPosicao + 1, 1)).toContain("Tópico II-1");
    expect(lida.texto(g.listaSemPosicao + 1, 1)).toContain("2 TA");
  });
});

describe("`DP-3` · turma sem sábado no ano: o sábado lançado offline vai para a lista", () => {
  it("sem coluna de sábado, a lista do sábado existe", () => {
    const sem = montarPlanilhaComGeometria(insumoSintetico({ temSabado: false }));
    expect(sem.impressao.dias).toBe(5);
    expect(sem.impressao.listaDoSabado).not.toBeNull();
    const rotulo = insumo.semanas.find((x) => x.semana.numero === 17)?.rotulo ?? "";
    const lida = lerImpressao(sem.pasta, sem.impressao, rotulo, precalcular(sem.pasta));
    expect(lida.texto((sem.impressao.listaDoSabado as number) + 1, 1)).toMatch(
      /^SÁB .* · 1º TA · I Navegação de teste/,
    );
  });
});
