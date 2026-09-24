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

describe("`FR-007` · nada na aba é editável", () => {
  const codigo = ler(ABA);

  it("⚠️ controle positivo: a varredura está lendo o arquivo certo, e ele não está vazio", () => {
    // Sem isto, um caminho errado faria todos os casos abaixo passarem por ausência.
    expect(codigo.length).toBeGreaterThan(500);
    expect(codigo).toContain("AbaSobre");
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
  const codigo = ler(ABA);
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
  const AUTORIZADOS = [ABA, "app/(app)/cursos/[curso]/page.tsx"];

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
