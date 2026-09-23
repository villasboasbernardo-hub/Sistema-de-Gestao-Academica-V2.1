/**
 * `FR-033` — existe **exatamente um** construtor de seletor de turma, e ele **não** ordena.
 *
 * > *"MUST haver **um único** construtor de seletor de turma na aplicação — o de
 * > `components/ciaara/seletor-turma.tsx` —, verificado por teste, como já se faz para o de
 * > instrutor (`FR-011` da spec 007). Ele **não** ordena por regra de domínio: quem chama ordena."*
 * > — `FR-033` da spec 009
 *
 * ⚠️ **AS DUAS METADES, E A SEGUNDA É O ESPELHO DA DO INSTRUTOR.** Lá o ponto único **tem** de
 * ordenar, porque a `RN-ANT-01` é de *Risco: Alto* e vale por construção. Aqui é o contrário: a
 * ordem é do `FR-035` e mora em `lib/dominio/seletor-de-turma.ts`, porque a página do curso e as
 * telas futuras podem precisar de ordens diferentes. Um seletor que ordenasse sozinho esconderia
 * essa escolha.
 *
 * ⚠️ **A VARREDURA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1). O cabeçalho de `seletor-instrutor.tsx`
 * fala de turma, e o deste arquivo fala o tempo todo — uma varredura ingênua leria a documentação
 * como violação e ensinaria a apagá-la para ficar verde.
 *
 * Origem: `FR-033`, `FR-033.1` da spec 009, `SC-004`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const DIRETORIOS = ["app", "components", "lib"];

/** O arquivo que TEM o direito de construir um seletor de turma. */
const CANONICO = "components/ciaara/seletor-turma.tsx";

/** Sinais de que um arquivo **constrói** uma escolha — não de que consome a pronta. */
const SINAIS_DE_CONSTRUCAO = [
  'role="combobox"',
  'role="listbox"',
  "<select",
  "SelectTrigger",
  "SelectContent",
];

/**
 * O sinal de que a escolha é **de turma**: uma lista de turmas virando opção.
 *
 * ⚠️ **"O ARQUIVO CITA TURMA" NÃO BASTA, e isso foi medido em 23/09/2026.** A primeira versão desta
 * varredura usava `/turma/i`, e acusou `app/(app)/cursos/FormularioDeCurso.tsx` — que tem `<select>`
 * de **classificação** e **modalidade**, e cita "turma" só no rótulo *"Limite de turmas por ano"*.
 * Uma guarda que reprova o arquivo errado ensina a contorná-la, e o ponto único deixa de valer.
 *
 * ⚠️ **E A TABELA DA ABA GRADE TAMBÉM ITERA `turmas`** — em `<tr>`, não em `<option>`. A janela de 300
 * caracteres entre o `.map(` e a opção é o que separa "lista de turmas" de "escolha de turma".
 */
const OPCOES_DE_TURMA =
  /turmas?\s*(?:\.filter\([^)]*\))?\s*\.map\([\s\S]{0,300}?(?:<option|SelectItem)/i;

function arquivosDeCodigo(): string[] {
  const achados: string[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada);
      if (statSync(caminho).isDirectory()) percorrer(caminho);
      else if (/\.tsx?$/.test(entrada)) achados.push(caminho);
    }
  };
  for (const d of DIRETORIOS) percorrer(resolve(RAIZ, d));
  return achados;
}

/** O código sem comentários — a varredura mede o que o arquivo FAZ, não o que ele diz. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function construtoresDeSeletorDeTurma(): string[] {
  return arquivosDeCodigo()
    .filter((caminho) => {
      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      return OPCOES_DE_TURMA.test(codigo) && SINAIS_DE_CONSTRUCAO.some((s) => codigo.includes(s));
    })
    .map((caminho) => relative(RAIZ, caminho).replaceAll("\\", "/"));
}

describe("`SC-004` · exatamente um construtor de seletor de turma", () => {
  it("a contagem é um, e é o canônico", () => {
    const achados = construtoresDeSeletorDeTurma();
    expect(
      achados,
      `construtores de seletor de turma no repositório: ${achados.join(", ")}. ` +
        `Um segundo construtor devolve o "esquecer numa tela nova" que o ponto único elimina — ` +
        `e nesta fatia ele já custaria o rótulo do FR-034 e a ordem do FR-035. Use ${CANONICO}.`,
    ).toEqual([CANONICO]);
  });

  it("controle positivo: a varredura enxerga arquivos de verdade", () => {
    // Sem isto, um caminho errado faria o caso acima reprovar por lista vazia — ou, pior, passar.
    expect(arquivosDeCodigo().length, "a varredura não achou código nenhum").toBeGreaterThan(20);
  });

  it("⚠️ controle positivo: o canônico de fato constrói — não é só um nome de arquivo", () => {
    const codigo = semComentarios(readFileSync(resolve(RAIZ, CANONICO), "utf8"));
    expect(SINAIS_DE_CONSTRUCAO.some((s) => codigo.includes(s))).toBe(true);
    expect(OPCOES_DE_TURMA.test(codigo), "o canônico deixou de virar turmas em opções").toBe(true);
  });

  it("⚠️ e a varredura NÃO confunde outras escolhas com a de turma", () => {
    // `FormularioDeCurso.tsx` tem `<select>` de classificação e de modalidade, e cita "turma" no
    // rótulo do limite. `AbaGrade.tsx` itera `turmas` — em `<tr>`, não em `<option>`.
    for (const arquivo of [
      "app/(app)/cursos/FormularioDeCurso.tsx",
      "app/(app)/cursos/[curso]/AbaGrade.tsx",
    ]) {
      const codigo = semComentarios(readFileSync(resolve(RAIZ, arquivo), "utf8"));
      expect(OPCOES_DE_TURMA.test(codigo), `${arquivo} foi lido como seletor de turma`).toBe(false);
    }
  });
});

describe("`FR-033` · o único construtor NÃO ordena — quem chama ordena", () => {
  const codigo = semComentarios(readFileSync(resolve(RAIZ, CANONICO), "utf8"));

  it("ele não importa a ordenação de turma", () => {
    expect(
      codigo,
      "o seletor passou a ordenar sozinho: a ordem do FR-035 é escolha de quem chama, e " +
        "escondê-la aqui a tornaria invisível para a tela que precisar de outra.",
    ).not.toContain("ordenarTurmasParaSeletor");
  });

  it("⚠️ e nenhuma ordenação escrita à mão dentro dele", () => {
    expect(codigo).not.toMatch(/\.sort\(/);
  });
});

describe("`FR-035` · quem chama ordena, e a página do curso chama", () => {
  const aba = semComentarios(
    readFileSync(resolve(RAIZ, "app/(app)/cursos/[curso]/AbaGrade.tsx"), "utf8"),
  );

  it("a aba Grade aplica a ordem do domínio", () => {
    expect(aba).toContain("ordenarTurmasParaSeletor");
  });

  it("⚠️ e o rótulo vem do domínio, nunca montado na tela", () => {
    expect(aba).toContain("rotuloDaTurma");
    expect(aba, "a aba passou a montar o rótulo à mão").not.toMatch(/rotulo:\s*`\$\{/);
  });
});
