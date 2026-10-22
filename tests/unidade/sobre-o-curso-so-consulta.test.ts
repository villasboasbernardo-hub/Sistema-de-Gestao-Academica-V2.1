/**
 * `FR-007.1` · a aba "Sobre o Curso" é **só consulta**, e `carater`/`formula_mf` nunca são
 * interpretados.
 *
 * ⚠️ **A VARREDURA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1 do `CLAUDE.md`). O cabeçalho do próprio
 * `AbaSobre.tsx` explica que os dois campos não são interpretados — e uma varredura ingênua leria
 * essa frase como violação, ensinando a **apagar a documentação para ficar verde**. Já aconteceu
 * três vezes nesta base, na fatia (b) do Épico 4.
 *
 * ⚠️ **O QUE A NORMA PROÍBE É MODELAR, CALCULAR E INTERPRETAR** — `RNF-NORM-06`, `RF-AVAL-02`,
 * `RN-AVAL-01`. Exibir o texto que o currículo já traz não produz nota, média nem aprovação; o que
 * não pode existir é filtro, ordenação, comparação, alerta ou conta que **leia** esses campos.
 *
 * Origem: `FR-007`, `FR-007.1` da spec 009, `SC-001.1`, Q-01.
 */
import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "..", "..");

/** O código sem comentário — de bloco e de linha. É o que a regra 9.1.1 manda contar. */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const ler = (caminho: string) => semComentario(readFileSync(join(RAIZ, caminho), "utf8"));

/** Todo `.ts`/`.tsx` de `app/`, `lib/` e `components/`, sem os tipos gerados. */
function fontesDoProduto(diretorio = ""): string[] {
  const raizes = diretorio === "" ? ["app", "lib", "components"] : [diretorio];
  const achados: string[] = [];
  const andar = (relativo: string) => {
    for (const entrada of readdirSync(join(RAIZ, relativo), { withFileTypes: true })) {
      const caminho = `${relativo}/${entrada.name}`;
      if (entrada.isDirectory()) andar(caminho);
      else if (/\.tsx?$/.test(entrada.name) && caminho !== "lib/tipos/database.ts") {
        achados.push(caminho);
      }
    }
  };
  for (const r of raizes) andar(r);
  return achados;
}

const ABA = "app/(app)/cursos/[curso]/AbaSobre.tsx";
/*
 * Spec 022 (Bloco 7, FR-005.2, D-11): as regras de avaliação do currículo saíram de *Sobre o Curso* para o topo da aba
 * *Avaliações*, num arquivo PRÓPRIO — o único que exibe caráter e fórmula. As duas regras valem para os dois.
 */
const REGRAS = "app/(app)/cursos/[curso]/RegrasDeAvaliacao.tsx";

describe.each([ABA, REGRAS])("`FR-007` · nada em %s é editável", (arquivo) => {
  const codigo = ler(arquivo);

  it("⚠️ controle positivo: a varredura está lendo o arquivo certo, e ele não está vazio", () => {
    // Sem isto, um caminho errado faria todos os casos abaixo passarem por ausência.
    expect(codigo.length).toBeGreaterThan(500);
    expect(codigo).toMatch(/AbaSobre|RegrasDeAvaliacao/);
  });

  it("nenhum campo de entrada", () => {
    for (const proibido of ["<input", "<textarea", "<select", "<form"]) {
      expect(codigo, `${proibido} na aba de consulta`).not.toContain(proibido);
    }
  });

  it("nenhum manipulador de edição nem estado de formulário", () => {
    for (const proibido of ["onChange", "onSubmit", "useState", "useActionState", "formAction"]) {
      expect(codigo, `${proibido} na aba de consulta`).not.toContain(proibido);
    }
  });

  it("⚠️ e ela é servidor: um marcador de cliente aqui mandaria a grade inteira ao navegador", () => {
    expect(codigo).not.toMatch(/^\s*"use client";/m);
  });

  it("não chama Server Action nenhuma", () => {
    expect(codigo).not.toContain("@/lib/acoes/");
  });
});

describe("`FR-007.1` · `carater` e `formula_mf` são exibidos, nunca interpretados", () => {
  const codigo = ler(REGRAS);
  const CAMPOS = ["carater", "formulaMf"];

  it("controle positivo: os dois aparecem — a aba de fato os mostra", () => {
    for (const campo of CAMPOS) expect(codigo, `${campo} sumiu da aba`).toContain(campo);
  });

  it("⚠️ nenhuma linha que os cita compara, filtra, ordena ou conta", () => {
    const suspeitos = [
      "===",
      "!==",
      ".filter(",
      ".sort(",
      ".some(",
      ".every(",
      ".includes(",
      ".reduce(",
      "if (",
      "?",
    ];
    const violacoes: string[] = [];
    for (const linha of codigo.split(/\r?\n/)) {
      if (!CAMPOS.some((c) => linha.includes(c))) continue;
      // A declaração do tipo é legítima: `readonly carater: string | null;`
      if (/readonly \w+: string \| null;/.test(linha)) continue;
      if (suspeitos.some((s) => linha.includes(s))) violacoes.push(linha.trim());
    }
    expect(
      violacoes,
      `linha que INTERPRETA caráter ou fórmula: ${violacoes.join(" | ")}. ` +
        `A RNF-NORM-06 proíbe produzir, calcular ou armazenar nota, média e aprovação.`,
    ).toEqual([]);
  });
});

describe("⚠️ e o resto do sistema não lê esses campos", () => {
  /*
   * A lista de leitores autorizados é fechada, e curta de propósito: a aba que exibe e a página que
   * os busca no banco. Qualquer outro arquivo que os cite é, por construção, uma leitura nova — e
   * leitura nova desses dois campos é o que o `FR-007.1` existe para impedir.
   */
  const AUTORIZADOS = [REGRAS, "app/(app)/cursos/[curso]/page.tsx"];

  it("só os dois arquivos autorizados citam `carater` ou `formula_mf`", () => {
    const leitores = fontesDoProduto()
      .filter((f) => /\bcarater\b|\bformula_mf\b|\bformulaMf\b/.test(ler(f)))
      .filter((f) => !AUTORIZADOS.includes(f));
    expect(
      leitores,
      `leitura nova de caráter ou fórmula em: ${leitores.join(", ")}. ` +
        `Os campos são informativos (achado (k) do documento 05).`,
    ).toEqual([]);
  });

  it("⚠️ controle positivo: os dois autorizados de fato os citam", () => {
    // Sem isto, renomear os campos deixaria a varredura verde por ausência — e ela passaria a não
    // vigiar nada.
    for (const arquivo of AUTORIZADOS) {
      expect(ler(arquivo), `${arquivo} deixou de citar os campos`).toMatch(
        /\bcarater\b|\bformula_mf\b|\bformulaMf\b/,
      );
    }
  });
});

/*
 * Spec 014 (T184, SC-011, FR-062): as telas de avaliação NÃO tratam de nota, média nem aprovação — são de outra
 * divisão (`RNF-NORM-06`). A varredura cobra INTERPRETAÇÃO (identificador de código, sem comentário — regra
 * 9.1.1), não a palavra em texto de tela; e tem controle positivo, para não passar cega.
 */
describe("`FR-062` · as telas de avaliação não interpretam nota, média nem aprovação", () => {
  const TELAS = [
    "app/(app)/turmas/[turma]/AvaliacoesDaTurma.tsx",
    "app/(app)/turmas/[turma]/CardDeAvaliacoes.tsx",
    "app/(app)/turmas/[turma]/DefinirTempoArbitrado.tsx",
    "app/(app)/turmas/[turma]/AlertasDeVista.tsx",
    "app/(app)/turmas/[turma]/consulta-de-avaliacoes.ts",
    "app/(app)/cursos/[curso]/AbaAvaliacoes.tsx",
    "lib/dominio/avaliacoes/quadro-da-turma.ts",
    "lib/dominio/avaliacoes/contagem.ts",
    "lib/acoes/avaliacoes-do-curriculo.ts",
  ];
  const PROIBIDO =
    /\b(nota|notas|media_final|mediaFinal|formula_mf|formulaMf|aprovad[oa]s?|reprovad[oa]s?|carater)\w*\b/;

  it("controle positivo: o detector acusa uma interpretação plantada", () => {
    expect(PROIBIDO.test(semComentario("const aprovado = nota >= 5; // comentário"))).toBe(true);
    expect(PROIBIDO.test(semComentario("// aprovado só no comentário\nconst x = 1;"))).toBe(false);
  });

  it.each(TELAS)("%s existe e não interpreta nota, média nem aprovação", (arquivo) => {
    const codigo = ler(arquivo);
    expect(codigo.length).toBeGreaterThan(200);
    expect(codigo.match(PROIBIDO)?.[0] ?? null).toBeNull();
  });
});
