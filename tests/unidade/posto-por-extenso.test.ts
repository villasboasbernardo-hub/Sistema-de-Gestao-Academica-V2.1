/**
 * `RF-DSA-06` · item 7 das correções de 08/10/2026 — o posto/graduação **por extenso** na assinatura
 * do DSA, com o quadro entre parênteses (decisão de Bernardo Villas Boas).
 *
 * ⚠️ **OS VALORES ESPERADOS ESTÃO ESCRITOS À MÃO, e é de propósito.** Um teste que calculasse o
 * esperado pelo próprio mapa provaria que o mapa é igual a si mesmo.
 *
 * ⚠️ **HÁ DUAS GUARDAS ALÉM DOS CASOS:** o por extenso tem de ser o MESMO de
 * `config_listas.escala_antiguidade` (a semente da migration `20260829235410`), menos o `SCNS`, que é
 * exceção nominal; e nenhum outro arquivo de `app/`, `lib/` e `components/` pode escrever um posto
 * por extenso — o mapeamento é **um só**. As duas varreduras leem **código sem comentário** (regra
 * 9.1.1) e têm controle positivo.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { POSTOS_POR_CIRCULO } from "@/lib/dominio/circulo-hierarquico";
import { POSTOS_CIVIS } from "@/lib/dominio/militar-ou-civil";
import { nomeParaDsa } from "@/lib/dominio/nome-instrutor";
import {
  POSTOS_POR_EXTENSO,
  postoParaAssinatura,
  postoPorExtenso,
  quadroEntreParenteses,
} from "@/lib/dominio/posto-por-extenso";

/** A escala inteira, por extenso — oficiais, praça especial, praças e civis. */
const ESPERADO = [
  ["AE", "Almirante de Esquadra"],
  ["VA", "Vice-Almirante"],
  ["CA", "Contra-Almirante"],
  ["CMG", "Capitão de Mar e Guerra"],
  ["CF", "Capitão de Fragata"],
  ["CC", "Capitão de Corveta"],
  ["CT", "Capitão-Tenente"],
  ["1ºTen", "Primeiro-Tenente"],
  ["2ºTen", "Segundo-Tenente"],
  ["GM", "Guarda-Marinha"],
  ["SO", "Suboficial"],
  ["1ºSG", "Primeiro-Sargento"],
  ["2ºSG", "Segundo-Sargento"],
  ["3ºSG", "Terceiro-Sargento"],
  ["CB", "Cabo"],
  ["MN", "Marinheiro"],
  ["SD", "Soldado"],
  ["SC", "Servidor Civil"],
  ["SCNS", "Servidor Civil"],
] as const;

describe("o mapeamento — a escala da Marinha, por extenso", () => {
  it.each(ESPERADO)("%s → %s", (sigla, extenso) => {
    expect(postoPorExtenso(sigla)).toBe(extenso);
  });

  it("⚠️ o mapa tem exatamente as siglas da tabela acima — sigla nova exige caso novo", () => {
    expect(Object.keys(POSTOS_POR_EXTENSO).sort()).toEqual(ESPERADO.map(([s]) => s).sort());
  });
});

describe("as variações de grafia que a base tem casam a MESMA entrada", () => {
  it.each(["1ºTEN", "1ºTen", "1º Ten", "1° TEN", "1TEN", "1T", " 1ºten ", "1o Ten"])(
    "%j → Primeiro-Tenente",
    (grafia) => {
      expect(postoPorExtenso(grafia)).toBe("Primeiro-Tenente");
    },
  );

  it.each(["2ºSG", "2º SG", "2°SG", "2SG", "2ºsg"])("%j → Segundo-Sargento", (grafia) => {
    expect(postoPorExtenso(grafia)).toBe("Segundo-Sargento");
  });

  it("caixa e espaço em volta não importam", () => {
    expect(postoPorExtenso("  cmg ")).toBe("Capitão de Mar e Guerra");
    expect(postoPorExtenso("2t")).toBe("Segundo-Tenente");
  });
});

describe("`RN-DEG-01` · o desconhecido sai COMO VEIO, e o ausente sai vazio", () => {
  it.each(["XPTO", "Almirante", "SO-ME", "2ºSG-FR"])("%j não é conhecido: sai como veio", (s) => {
    expect(postoPorExtenso(s)).toBe(s);
  });

  it("⚠️ desconhecido NUNCA vira vazio — só é aparado", () => {
    expect(postoPorExtenso("  QQ  ")).toBe("QQ");
  });

  it("ausente sai vazio, sem `null` nem `undefined` escritos", () => {
    expect(postoPorExtenso(null)).toBe("");
    expect(postoPorExtenso(undefined)).toBe("");
    expect(postoPorExtenso("   ")).toBe("");
    expect(postoParaAssinatura(null, null)).toBe("");
  });
});

describe("o quadro entre parênteses CONTINUA", () => {
  it("o quadro escrito junto do posto continua, como veio", () => {
    expect(postoPorExtenso("1ºTen (RM2-T)")).toBe("Primeiro-Tenente (RM2-T)");
    expect(postoPorExtenso("CC (T)")).toBe("Capitão de Corveta (T)");
    expect(postoPorExtenso("XPTO (RM2-T)")).toBe("XPTO (RM2-T)");
  });

  it.each([
    ["FR", "(FR)"],
    ["-HN", "(HN)"],
    ["(T)", "(T)"],
    ["(RM2-T)", "(RM2-T)"],
    ["RM2-T", "(RM2-T)"],
    [" ( RM1-MT ) ", "(RM1-MT)"],
  ])("especialidade %j → %j — nunca parêntese em dobro", (especialidade, quadro) => {
    expect(quadroEntreParenteses(especialidade)).toBe(quadro);
  });

  it.each([null, undefined, "", "   ", "-", "()"])("especialidade %j não vira quadro", (vazia) => {
    expect(quadroEntreParenteses(vazia)).toBe("");
  });

  it.each([
    ["1ºTEN", "(RM2-T)", "Primeiro-Tenente (RM2-T)"],
    ["1ºTen", "RM2-T", "Primeiro-Tenente (RM2-T)"],
    ["CC", null, "Capitão de Corveta"],
    ["CC", "", "Capitão de Corveta"],
    ["2ºSG", "FR", "Segundo-Sargento (FR)"],
    ["2ºSG", "-HN", "Segundo-Sargento (HN)"],
    ["SC", "NS", "Servidor Civil (NS)"],
    ["XPTO", "FR", "XPTO (FR)"],
  ])("a linha da assinatura de %j com %j é %j", (posto, especialidade, linha) => {
    expect(postoParaAssinatura(posto, especialidade)).toBe(linha);
  });

  it("⚠️ o quadro que já veio no campo do posto não sai duas vezes", () => {
    expect(postoParaAssinatura("1ºTen (RM2-T)", "(RM2-T)")).toBe("Primeiro-Tenente (RM2-T)");
  });
});

describe("o que já existia sobre posto, e a guarda contra divergir dele", () => {
  it("todo posto dos dois círculos e todo civil tem por extenso", () => {
    const siglas = [...POSTOS_POR_CIRCULO.oficiais, ...POSTOS_POR_CIRCULO.pracas, ...POSTOS_CIVIS];
    expect(siglas.length, "as listas de posto vieram vazias: a guarda está cega").toBe(12);
    for (const sigla of siglas) {
      expect(postoPorExtenso(sigla), `${sigla} ficou sem por extenso`).not.toBe(sigla);
    }
  });

  /*
   * ⚠️ **O BANCO JÁ TINHA O POR EXTENSO DE 14 POSTOS**, em `rotulo_exibicao` da lista
   * `escala_antiguidade`. O mapa TS é o que a decisão pediu; esta guarda impede que as duas listas
   * divirjam sem ninguém ver. A fonte lida é a MIGRATION (as mesmas 14 linhas foram medidas na cópia
   * datada do remoto `remoto-20261007-155824.sql`).
   */
  it("⚠️ o por extenso é o MESMO de `config_listas.escala_antiguidade` — menos o SCNS", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260829235410_configuracao_calendario_e_matriz.sql",
      ),
      "utf8",
    ).replace(/--[^\n]*/g, "");
    const linhas = [...sql.matchAll(/\('escala_antiguidade',\s*'([^']+)',\s*'([^']+)'/g)];
    expect(linhas.length, "a semente da escala não foi achada: a guarda está cega").toBe(14);

    for (const [, valor = "", rotulo = ""] of linhas) {
      if (valor === "SCNS") {
        /*
         * ⚠️ **A EXCEÇÃO NOMINAL CARREGA PESO**: o banco diz "não Sigiloso" e o mapa segue o rótulo
         * da v2.0. Se o banco for corrigido, este caso reprova — e é a exceção que tem de sair.
         */
        expect(rotulo).toBe("Servidor Civil não Sigiloso");
        expect(postoPorExtenso(valor)).toBe("Servidor Civil");
        continue;
      }
      expect(postoPorExtenso(valor), `o banco e o mapa divergem em ${valor}`).toBe(rotulo);
    }
  });
});

describe("⚠️ só a ASSINATURA muda: a coluna de instrutor continua com a sigla", () => {
  /* O caso que discrimina: se `nomeParaDsa` passasse a usar o mapa, ele reprovaria aqui. */
  it("`nomeParaDsa` mantém a abreviatura — `1ºTEN`, e não `Primeiro-Tenente`", () => {
    const nome = nomeParaDsa({
      id: "INS-SINTETICO",
      pg: "1ºTEN",
      especialidade: "(RM2-T)",
      nomeCompleto: "Fulano Sintetico De Tal",
      nomeDeGuerra: "Sintetico",
    });
    expect(nome).toBe("1ºTEN (RM2-T) Sintetico");
    expect(nome).not.toContain("Primeiro-Tenente");
  });
});

/* ── A guarda do mapeamento ÚNICO ───────────────────────────────────────────────────────────── */

const MODULO = "lib/dominio/posto-por-extenso.ts";

/** Os nomes que só podem existir no módulo — os genéricos (`Cabo`, `Soldado`…) ficam fora. */
const DISTINTIVOS = [...new Set(Object.values(POSTOS_POR_EXTENSO))].filter(
  (nome) => !["Cabo", "Marinheiro", "Soldado"].includes(nome),
);

/** Tira bloco de comentário e `//…`, preservando `https://` (regra 9.1.1). */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function nomesNoCodigo(fonte: string): readonly string[] {
  const codigo = semComentario(fonte);
  return DISTINTIVOS.filter((nome) => codigo.includes(nome));
}

function arquivosDe(pasta: string): string[] {
  const caminho = resolve(process.cwd(), pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = resolve(caminho, nome);
    if (nome === "node_modules" || nome === ".next") return [];
    if (statSync(completo).isDirectory()) return arquivosDe(relative(process.cwd(), completo));
    return /\.(ts|tsx)$/.test(nome)
      ? [relative(process.cwd(), completo).replaceAll("\\", "/")]
      : [];
  });
}

describe("⚠️ o mapeamento é UM SÓ — nenhum outro arquivo escreve posto por extenso", () => {
  const TODOS = ["app", "lib", "components"].flatMap(arquivosDe);

  it("CONTROLE · a varredura acha o módulo, e acha os nomes nele", () => {
    expect(TODOS, "a varredura não achou o módulo: ela está cega").toContain(MODULO);
    expect(nomesNoCodigo(readFileSync(resolve(process.cwd(), MODULO), "utf8")).length).toBe(
      DISTINTIVOS.length,
    );
  });

  it("CONTROLE NEGATIVO · o nome só em comentário NÃO é contado", () => {
    expect(
      nomesNoCodigo("/* Primeiro-Tenente (RM2-T) */\n// Capitão de Corveta\nconst x = 1;"),
    ).toEqual([]);
  });

  it("nenhum arquivo fora do módulo escreve um posto por extenso", () => {
    const infratores = TODOS.filter((arquivo) => arquivo !== MODULO)
      .map((arquivo) => ({
        arquivo,
        nomes: nomesNoCodigo(readFileSync(resolve(process.cwd(), arquivo), "utf8")),
      }))
      .filter((registro) => registro.nomes.length > 0)
      .map((registro) => `${registro.arquivo} → ${registro.nomes.join(", ")}`);
    expect(
      infratores,
      `estes arquivos escrevem posto por extenso por conta própria:\n  ${infratores.join("\n  ")}\n` +
        `O conserto é importar de @/lib/dominio/posto-por-extenso — postoPorExtenso ou ` +
        `postoParaAssinatura. Uma segunda lista diverge na primeira grafia nova.`,
    ).toEqual([]);
  });
});
