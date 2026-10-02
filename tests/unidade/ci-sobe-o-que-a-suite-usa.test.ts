/**
 * `SC-005` · **o CI sobe todo serviço do Supabase que o código usa** — e a lista de exclusões do
 * `supabase start` não pode envelhecer em silêncio.
 *
 * > *"Verde em `verificar:tudo` seguido de vermelho no CI é **defeito da verificação**, não azar —
 * > vira tarefa de correção."* — `CLAUDE.md`, seção dos dois comandos
 *
 * ⚠️ **ESTA GUARDA NASCEU DE UM DEFEITO MEDIDO, em 29/09/2026.** O bloco `banco` do CI subia o
 * stack com `-x …,storage-api,…`, sob um passo chamado *"sem o que os testes nao usam"*. A frase
 * era verdadeira quando foi escrita e **deixou de ser** na spec 011, que trouxe o primeiro
 * consumidor de Storage do repositório: `tests/invariantes/rls/avatar-no-storage.test.ts`. Dez dos
 * onze casos reprovaram no CI com `name resolution failed` e `503` — **verde na máquina, vermelho
 * no CI, sobre o mesmo commit**, e a mensagem se lê como defeito da aplicação quando é ausência de
 * contêiner.
 *
 * ⚠️ **O QUE ELA MEDE, e é a metade que pega defeito:** ela NÃO exige que todo serviço suba. Ela
 * exige que **serviço usado pelo código não esteja excluído** — quem não é usado continua fora, que
 * é o propósito da lista (cada imagem a menos é uma puxada a menos do registro).
 *
 * ⚠️ **E ela lê o código SEM COMENTÁRIO** (regra 9.1.1): a frase que explica por que o Storage não
 * era usado não pode contar como uso dele.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const FLUXO = resolve(RAIZ, ".github/workflows/ci.yml");

/** Onde o código que o bloco `banco` exercita mora — as suítes e a aplicação que a e2e dirige. */
const DIRETORIOS = ["tests", "lib", "app", "components"];

/**
 * ⚠️ **ESTE ARQUIVO SAI DA PRÓPRIA VARREDURA, e não é conveniência.** Os controles positivos abaixo
 * escrevem `.storage.from(` como texto sintético; sem esta exclusão a guarda se contaria como
 * consumidora de Storage e passaria a exigir o contêiner **mesmo que nenhum código o usasse** —
 * ficaria verde por se olhar no espelho. Medido: com ele dentro, a lista de consumidores dava 4 em
 * vez de 3.
 */
const ESTE_ARQUIVO = "ci-sobe-o-que-a-suite-usa.test.ts";

/**
 * Serviço do stack → como se reconhece um uso dele no código.
 *
 * Os três padrões são os mesmos da varredura que montou a lista de exclusões em 23/09/2026, e
 * medidos de novo em 29/09/2026: `.storage` aparece em **3** arquivos (`avatar-no-storage.test.ts`,
 * `lib/acoes/perfil.ts`, `lib/supabase/avatar.ts`), `.channel(` em **0** e `functions.invoke` em
 * **0**.
 */
const SERVICOS: readonly { readonly nome: string; readonly usa: RegExp }[] = [
  { nome: "storage-api", usa: /\.storage\s*\n?\s*\./ },
  { nome: "realtime", usa: /\.channel\s*\(/ },
  { nome: "edge-runtime", usa: /functions\s*\.\s*invoke\s*\(/ },
];

/** O código sem comentários — a varredura mede o que o arquivo FAZ, não o que ele diz (regra 9.1.1). */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function arquivosDeCodigo(): string[] {
  const achados: string[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      if (entrada === "node_modules" || entrada === ESTE_ARQUIVO) continue;
      const caminho = join(dir, entrada);
      if (statSync(caminho).isDirectory()) percorrer(caminho);
      else if (/\.tsx?$/.test(entrada)) achados.push(caminho);
    }
  };
  for (const d of DIRETORIOS) percorrer(resolve(RAIZ, d));
  return achados;
}

/** A lista de exclusões do `supabase start`, lida do fluxo do CI. */
function excluidosNoCi(): readonly string[] {
  const fluxo = readFileSync(FLUXO, "utf8");
  const linha = /^\s*-x\s+([a-z0-9,-]+)\s*$/m.exec(fluxo);
  // Sem esta asserção a guarda ficaria CEGA: um `-x` renomeado devolveria lista vazia, e lista
  // vazia passa em tudo. É o mesmo modo de falha da primeira versão de `toda-tela-tem-caminho`.
  expect(linha, `não achei a linha \`-x …\` do \`supabase start\` em ${FLUXO}`).not.toBeNull();
  return linha![1]!.split(",");
}

describe("o CI sobe todo serviço do Supabase que o código usa", () => {
  const fontes = arquivosDeCodigo().map((caminho) => ({
    caminho,
    codigo: semComentarios(readFileSync(caminho, "utf8")),
  }));

  it("a lista de exclusões do `supabase start` é legível, e não está vazia", () => {
    const excluidos = excluidosNoCi();
    expect(excluidos.length).toBeGreaterThan(0);
    expect(excluidos).toContain("studio");
  });

  for (const servico of SERVICOS) {
    it(`\`${servico.nome}\`: se o código usa, o CI não exclui`, () => {
      const usam = fontes.filter((f) => servico.usa.test(f.codigo)).map((f) => f.caminho);
      if (usam.length === 0) return; // ninguém usa: continuar excluído é o que se quer.
      expect(
        excluidosNoCi(),
        `${usam.length} arquivo(s) falam com \`${servico.nome}\` — ${usam.join(", ")} —, e o bloco ` +
          "`banco` do CI o exclui do `supabase start`. Sem o contêiner no ar a suíte reprova com " +
          "`name resolution failed`/`503`, que se lê como defeito da aplicação. Tire-o do `-x` em " +
          ".github/workflows/ci.yml.",
      ).not.toContain(servico.nome);
    });
  }

  // ── Controles positivos: sem eles, uma varredura que não casa com nada passaria calada. ──
  it("o detector reconhece um uso de Storage escrito à mão", () => {
    const sintetico = semComentarios(`const r = await cliente.storage.from("avatares").list();`);
    expect(SERVICOS.find((s) => s.nome === "storage-api")!.usa.test(sintetico)).toBe(true);
  });

  it("uso MENCIONADO em comentário não conta como uso (regra 9.1.1)", () => {
    const sintetico = semComentarios(
      `// este módulo não fala com .storage.from() de propósito\nexport const nada = 1;`,
    );
    expect(SERVICOS.find((s) => s.nome === "storage-api")!.usa.test(sintetico)).toBe(false);
  });
});
