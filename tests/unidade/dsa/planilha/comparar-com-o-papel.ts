/**
 * A IMPRESSÃO da planilha contra o papel do `/print/dsa` da mesma semana — a invariante I-P5 da
 * spec 015 (`FR-012`, `SC-003`). Devolve a lista de divergências; vazia é igual.
 *
 * ⚠️ **O QUE SE COMPARA É O CONTEÚDO, não a geometria** (`FR-012`): o cartão do papel vira células do
 * bloco pela distribuição da R-8 — título, conteúdo e pé —, que é apresentação e vale nas duas pontas.
 */
import type { CartaoDaGrade, GradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import type {
  DiaImpresso,
  ExecucaoDaDisciplina,
  ItemDaLegenda,
  LinhaImpressa,
} from "@/lib/dominio/dsa/impressao";
import { conteudoDoDia, type GeometriaDaImpressao } from "@/lib/dominio/dsa/planilha/impressao";

import type { ImpressaoLida } from "./leitura-da-pasta";

export type PapelDaSemana = {
  readonly numero: number | null;
  readonly alunos: number | null;
  readonly dias: readonly DiaImpresso[];
  readonly grade: GradeDoPapel | null;
  readonly quadroDeCh: readonly ExecucaoDaDisciplina[];
  readonly legenda: readonly ItemDaLegenda[];
  readonly assinaturas: {
    readonly esquerda: {
      readonly nome: string;
      readonly posto: string;
      readonly funcao: string;
    } | null;
    readonly direita: {
      readonly nome: string;
      readonly posto: string;
      readonly funcao: string;
    } | null;
  };
};

export function textosDoCartao(
  linha: LinhaImpressa,
  ta: number,
  estudo: boolean,
  nomes: ReadonlyMap<string, string>,
): string[] {
  const linhas = [
    ...(linha.disciplina === ""
      ? []
      : [`${linha.disciplina} ${nomes.get(linha.disciplina) ?? ""}`]),
    `${linha.conteudo}${estudo ? " *" : ""}`,
    [linha.instrutor, `${ta} TA`, linha.local, linha.te].filter((x) => x !== "").join(" · "),
  ];
  if (ta >= linhas.length) return [...linhas, ...Array<string>(ta - linhas.length).fill("")];
  return [...linhas.slice(0, ta - 1), linhas.slice(ta - 1).join("\n")];
}

function tasDoCartao(grade: GradeDoPapel, c: CartaoDaGrade): number[] {
  return grade.faixas
    .slice(c.faixaInicial, c.faixaFinal + 1)
    .flatMap((f) => (f.tipo === "tempo" ? [f.numero] : []));
}

export function divergenciasDoPapel(
  lida: ImpressaoLida,
  g: GeometriaDaImpressao,
  papel: PapelDaSemana,
): string[] {
  const erros: string[] = [];
  const confere = (onde: string, obtido: string, esperado: string) => {
    if (obtido !== esperado)
      erros.push(`${onde}: ${JSON.stringify(obtido)} ≠ ${JSON.stringify(esperado)}`);
  };
  const nomes = new Map(papel.quadroDeCh.map((d) => [d.codigo, d.nome] as const));

  /* Os cartões. */
  const esperado = new Map<string, { texto: string; tipo: string | null }>();
  if (papel.grade !== null) {
    for (const c of papel.grade.cartoes) {
      const tas = tasDoCartao(papel.grade, c);
      textosDoCartao(c.linha, c.ta, c.tipo === "estudo", nomes).forEach((texto, i) => {
        esperado.set(`${c.coluna}|${tas[i]}`, { texto, tipo: c.tipo });
      });
    }
  } else {
    papel.dias.forEach((dia, d) => {
      for (const l of dia.linhas) {
        if (l.taInicial === null) continue;
        const n = Math.max(1, l.tempos ?? 1);
        textosDoCartao(l, n, l.estudoIndividual, nomes).forEach((texto, i) => {
          esperado.set(`${d}|${(l.taInicial as number) + i}`, { texto, tipo: null });
        });
      }
    });
  }
  const dias = papel.grade?.colunas.length ?? papel.dias.length;
  for (let d = 0; d < Math.min(dias, g.dias); d += 1) {
    for (let t = 1; t <= g.tempos; t += 1) {
      const e = esperado.get(`${d}|${t}`);
      confere(`célula ${d}/${t}`, lida.celula(d, t), e?.texto ?? "");
      if (e?.tipo) confere(`tipo ${d}/${t}`, lida.espelho(d, t).replace(/[01]\*?$/, ""), e.tipo);
    }
  }
  /* A coluna que o papel não tem (o sábado sem lançamento, na turma com sábado no ano) sai vazia. */
  for (let d = dias; d < g.dias; d += 1) {
    for (let t = 1; t <= g.tempos; t += 1)
      confere(`coluna a mais ${d}/${t}`, lida.celula(d, t), "");
  }

  /* A régua e os dias. */
  if (papel.grade !== null) {
    const faixas = papel.grade.faixas;
    faixas.forEach((f, i) => {
      if (f.tipo !== "tempo") return;
      confere(`régua ${f.numero}`, lida.regua(f.numero), `${f.numero}º\n${f.inicio}–${f.fim}`);
      const entre = faixas[i + 1];
      if (entre === undefined) return;
      confere(
        `entre ${f.numero}`,
        lida.separador(f.numero),
        entre.tipo === "almoco"
          ? `Almoço ${entre.inicio}–${entre.fim}`
          : entre.tipo === "intervalo"
            ? `${entre.minutos} min`
            : "",
      );
    });
    const tempos = faixas.filter((f) => f.tipo === "tempo").length;
    for (let t = tempos + 1; t <= g.tempos; t += 1) confere(`régua além ${t}`, lida.regua(t), "");
    papel.grade.colunas.forEach((c, d) =>
      confere(
        `dia ${d}`,
        lida.cabecalhoDoDia(d),
        `${c.sigla} ${c.diaMes}${c.bloqueio ? `\n${c.bloqueio}` : ""}`,
      ),
    );
  }

  /* O rodapé, o número, os alunos e as assinaturas. */
  const linhas = Array.from({ length: g.linhasDoRodape }, (_, i) => g.rodape + 1 + i);
  const ch = linhas
    .map((l) =>
      [lida.texto(l, 1), lida.texto(l, 3), lida.texto(l, 5), lida.texto(l, 7)].join(" | "),
    )
    .filter((x) => !x.startsWith(" |"));
  confere(
    "CH do rodapé",
    ch.join("\n"),
    papel.quadroDeCh.map((d) => [d.codigo, d.nome, d.prevista, d.cumprida].join(" | ")).join("\n"),
  );
  const legenda = linhas
    .map((l) => `${lida.texto(l, 9)} — ${lida.texto(l, 11)}`)
    .filter((x) => !x.startsWith(" —"));
  confere(
    "legenda",
    legenda.join("\n"),
    papel.legenda.map((i) => `${i.sigla} — ${i.nome}`).join("\n"),
  );
  confere("nº do DSA", lida.texto(6, conteudoDoDia(2)), `DSA Nº ${papel.numero ?? "—"}`);
  confere("alunos", lida.texto(6, conteudoDoDia(4)), `ALT — · Alunos ${papel.alunos ?? "—"}`);
  (["esquerda", "direita"] as const).forEach((lado, i) => {
    const c = i === 0 ? conteudoDoDia(0) : conteudoDoDia(3);
    const r = papel.assinaturas[lado];
    confere(`assinatura ${lado} — nome`, lida.texto(g.assinaturas + 1, c), r?.nome ?? "");
    confere(`assinatura ${lado} — posto`, lida.texto(g.assinaturas + 2, c), r?.posto ?? "");
    confere(`assinatura ${lado} — função`, lida.texto(g.assinaturas + 3, c), r?.funcao ?? "");
  });
  return erros;
}
