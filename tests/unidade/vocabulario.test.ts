/**
 * Invariantes do vocabulário visual (`FR-001` a `FR-003`, `SC-002`, `SC-010`).
 *
 * ⚠️ ESTAS SÃO AS INVARIANTES DESTA FATIA, e fazem aqui o papel que o pgTAP e a RLS fizeram nos
 * Épicos 1 a 3: dizem o que NÃO PODE acontecer, e reprovam quando acontece. Uma fatia sem regra de
 * negócio e sem banco continua tendo o que provar.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { claro, escuro, exposicao, papeisDeCor } from "@/lib/design/ler-globals";
import { PAPEIS, RECONCILIACAO, VOCABULARIO_SHADCN } from "@/lib/design/vocabulario";

describe("I-1 · todo papel existe nos DOIS temas", () => {
  it("nenhum papel do tema claro falta no noturno", () => {
    const faltando = [...papeisDeCor(claro()).keys()].filter((n) => !escuro().has(n));
    expect(
      faltando,
      `papéis declarados só no tema claro — congelariam no escuro: ${faltando.join(", ")}`,
    ).toEqual([]);
  });

  it("nenhum papel do noturno falta no claro", () => {
    const faltando = [...papeisDeCor(escuro()).keys()].filter((n) => !claro().has(n));
    expect(faltando, `papéis declarados só no noturno: ${faltando.join(", ")}`).toEqual([]);
  });
});

describe("I-1b · o arquivo e a lista fechada não divergem", () => {
  it("todo papel da lista existe no ponto único", () => {
    const noArquivo = claro();
    const ausentes = PAPEIS.filter((n) => !noArquivo.has(n));
    expect(
      ausentes,
      `a lista de tests/unidade/vocabulario.fixture.ts promete papéis que app/globals.css não ` +
        `declara: ${ausentes.join(", ")}`,
    ).toEqual([]);
  });

  it("todo papel do ponto único está na lista — senão entraria sem ser auditado", () => {
    const sobrando = [...papeisDeCor(claro()).keys()].filter((n) => !PAPEIS.includes(n));
    expect(
      sobrando,
      `app/globals.css declara papéis que a lista não conhece, e por isso NÃO SÃO AUDITADOS: ` +
        `${sobrando.join(", ")}. Acrescente-os a vocabulario.fixture.ts e à vitrine.`,
    ).toEqual([]);
  });

  it("todo papel é exposto como utilitário — senão não chega a nenhuma tela", () => {
    const exposto = exposicao();
    const naoExpostos = PAPEIS.filter((n) => !exposto.has(`color-${n}`));
    expect(
      naoExpostos,
      `papéis sem \`--color-…\` no bloco de exposição: ${naoExpostos.join(", ")}. ` +
        `Sem isso o utilitário não existe, e quem precisar da cor vai escrevê-la à mão.`,
    ).toEqual([]);
  });
});

describe("I-4 · nenhuma variável de terceiro sem par (`SC-010`)", () => {
  it("toda variável do de-para aponta para um papel que existe", () => {
    const papeis = new Set(PAPEIS);
    const orfas = Object.entries(RECONCILIACAO)
      .filter(([, destino]) => !papeis.has(destino))
      .map(([origem, destino]) => `${origem} → ${destino}`);
    expect(orfas, `o de-para aponta para papel inexistente: ${orfas.join(", ")}`).toEqual([]);
  });

  it("toda variável do de-para está DECLARADA no ponto único, apontando para o papel certo", () => {
    // ⚠️ O teste anterior prova que o de-para é coerente consigo mesmo. Este prova que ele foi
    // APLICADO: sem isto, a tabela poderia estar perfeita e o CSS não a seguir — que é o caso em
    // que passam a existir dois pontos únicos de verdade e nada acusa erro.
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    const erradas = Object.entries(RECONCILIACAO)
      .filter(([variavel, papel]) => !css.includes(`--${variavel}: var(--${papel});`))
      .map(([v, p]) => `--${v} deveria apontar para var(--${p})`);
    expect(erradas, `o de-para não foi aplicado em app/globals.css: ${erradas.join("; ")}`).toEqual(
      [],
    );
  });

  it("`destructive` aponta para conflito, NÃO para atrasado", () => {
    // ⚠️ Vermelho é conflito, que exige ação; amarelo é aviso de atraso. Trocar os dois não
    // acusaria erro nenhum e faria um botão de desativar parecer aviso de atraso.
    expect(RECONCILIACAO["destructive"]).toBe("conflito-tinta");
  });
});

/**
 * ⚠️ A DIREÇÃO QUE FALTAVA, e ela é a que pega defeito (`FR-002`, `SC-004`, fatia (b)).
 *
 * O bloco I-4 acima prova que todo par DECLARADO aponta para um papel que existe. Sozinho, ele não
 * impede um primitivo novo de usar uma variável que ninguém declarou — e essa é a falha de
 * verdade: a variável não resolve, a cor sai transparente, e nada acusa erro. A tela só fica um
 * pouco errada, num tema só, e a pessoa que percebe não sabe dizer o quê.
 *
 * ⚠️ MEDIDO NA FATIA (b): os dez primitivos novos usam as MESMAS 18 variáveis que a fatia (a) já
 * reconciliara. Zero novas. Por isso a reconciliação não cresceu — o que cresceu foi isto aqui.
 */
const DIRETORIO_PRIMITIVOS = resolve(process.cwd(), "components/ui");

/** Prefixos de utilitário do Tailwind que pintam alguma coisa. */
const PREFIXOS_DE_COR =
  "(?:bg|text|border|ring|fill|stroke|placeholder|decoration|outline|divide|from|via|to|caret|shadow)";

function variaveisDeTerceiroEmUso(): Map<string, string[]> {
  const emUso = new Map<string, string[]>();
  for (const arquivo of readdirSync(DIRETORIO_PRIMITIVOS).filter((f) => f.endsWith(".tsx"))) {
    const fonte = readFileSync(resolve(DIRETORIO_PRIMITIVOS, arquivo), "utf8");
    for (const nome of VOCABULARIO_SHADCN) {
      const utilitario = new RegExp(`\\b${PREFIXOS_DE_COR}-${nome}(?![a-z0-9-])`);
      if (utilitario.test(fonte) || fonte.includes(`var(--${nome})`)) {
        emUso.set(nome, [...(emUso.get(nome) ?? []), arquivo]);
      }
    }
  }
  return emUso;
}

describe("I-4b · nenhum primitivo traz o PRÓPRIO vocabulário de cor (`FR-002`)", () => {
  it("toda variável de terceiro usada em components/ui/ está no de-para", () => {
    const emUso = variaveisDeTerceiroEmUso();
    const semPar = [...emUso]
      .filter(([nome]) => !(nome in RECONCILIACAO))
      .map(([nome, arquivos]) => `--${nome} (em ${arquivos.join(", ")})`);
    expect(
      semPar,
      `variáveis de terceiro SEM par com token CIAARA: ${semPar.join("; ")}. ` +
        `Elas não resolvem para cor nenhuma — a tela sai errada e nada acusa erro. ` +
        `Acrescente o par em RECONCILIACAO e aplique-o em app/globals.css.`,
    ).toEqual([]);
  });

  it("o controle positivo: a varredura ENXERGA as variáveis que estão lá", () => {
    // ⚠️ Sem este caso, uma varredura quebrada — expressão errada, diretório errado — passaria no
    // caso acima por não encontrar nada, e a invariante estaria desligada em silêncio. É a mesma
    // lição do controle positivo do Radix em `dependencias.test.ts`.
    const emUso = variaveisDeTerceiroEmUso();
    expect(
      emUso.size,
      "a varredura de components/ui/ não achou variável de terceiro NENHUMA: ela está quebrada",
    ).toBeGreaterThanOrEqual(15);
  });

  it("nenhuma variável do de-para deixou de ter dono — o de-para não cresce sozinho", () => {
    // ⚠️ O sentido inverso, e ele é barato: par declarado que nenhum componente usa é par morto,
    // e par morto envelhece sem ninguém conferir. Não reprova — avisa, listando.
    const emUso = new Set(variaveisDeTerceiroEmUso().keys());
    const semDono = Object.keys(RECONCILIACAO).filter((n) => !emUso.has(n));
    expect(
      semDono.length,
      `pares declarados que nenhum primitivo usa: ${semDono.join(", ")}`,
    ).toBeLessThanOrEqual(2);
  });
});
