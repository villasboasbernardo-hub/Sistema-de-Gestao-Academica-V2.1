/**
 * O perfil aparece em PORTUGUÊS em toda tela (`FR-005`, `SC-002` da spec 011).
 *
 * ⚠️ **O DEFEITO ERA VISÍVEL E NINGUÉM O VIA COMO DEFEITO.** Até 29/09/2026 o cabeçalho de toda tela
 * autenticada escrevia `encarregado_administracao_academica` — o identificador do banco, com
 * sublinhado —, e a lista de perfis do convite oferecia os nove assim. O projeto exige português em
 * **tudo** o que se lê, e o `snake_case` sem acento é restrição do motor, não tradução.
 *
 * ⚠️ **A VARREDURA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1). Este arquivo, `lib/dominio/perfis.ts` e
 * meia dúzia de cabeçalhos **citam** os valores crus para explicar por que os traduzem. Contar a
 * menção como uso ensinaria a apagar a documentação para ficar verde — que já aconteceu três vezes
 * nesta base, e foi o que originou a regra.
 *
 * ⚠️ **SÃO DUAS GUARDAS, E UMA NÃO SUBSTITUI A OUTRA — a primeira escrita tinha só a primeira, e ela
 * NÃO pegaria o defeito que originou esta fatia.** O cabeçalho escrevia `{perfil}`, e a lista de
 * usuários `{linha.perfil}`: **nenhum valor cru aparece no código**, porque o valor vem do banco em
 * tempo de execução. Uma varredura por literal fica verde sobre a tela errada.
 *   1. **literal** — valor do enum escrito à mão em `app/` ou `components/`; pega a lista chumbada;
 *   2. **renderização** — `{…perfil}` desenhado em JSX sem passar por `rotuloDoPerfil`; pega o que
 *      de fato estava quebrado.
 *
 * ⚠️ **E AS DUAS TÊM CONTROLE POSITIVO, porque as duas já mediram o vazio nesta sessão.** A de
 * literal acusou uma ROTA — `"/admin/usuarios"` contém `admin` — antes de exigir aspas; a de
 * renderização ficou **cega**, casando zero vez em 91 arquivos, porque um caractere de retrocesso
 * entrou no lugar da fronteira de palavra. Sem o controle positivo, a segunda teria passado por
 * guarda perfeita.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { perfisDeclarados, rotuloDoPerfil } from "@/lib/dominio/perfis";
import { Constants } from "@/lib/tipos/database";

const DIRETORIOS = ["app", "components"];

/**
 * Onde o valor cru é **lógica**, não texto de tela — e por quê.
 *
 * ⚠️ A distinção importa: comparar `perfil === "operador"` para decidir alcance é uso legítimo, e
 * proibi-lo mandaria escrever a decisão de outro jeito só para escapar da varredura. O que a
 * varredura protege é o que a pessoa **lê**.
 */
const ISENTOS: Readonly<Record<string, string>> = {
  "app/(app)/cursos/consulta.ts":
    "decide QUAIS perfis alcançam todos os cursos; os valores são condição, nunca texto de tela",
};

const VALORES_CRUS = Constants.public.Enums.perfil_usuario;

function arquivos(): string[] {
  const achados: string[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada);
      if (statSync(caminho).isDirectory()) percorrer(caminho);
      else if (/\.tsx?$/.test(entrada)) achados.push(caminho);
    }
  };
  for (const dir of DIRETORIOS) percorrer(resolve(process.cwd(), dir));
  return achados;
}

const comBarraNormal = (caminho: string) => relative(process.cwd(), caminho).replace(/\\/g, "/");

/** ⚠️ Sem comentário — regra 9.1.1. Uso mencionado não é uso. */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function usosCrus(): { readonly arquivo: string; readonly valor: string }[] {
  const achados: { arquivo: string; valor: string }[] = [];
  for (const caminho of arquivos()) {
    const arquivo = comBarraNormal(caminho);
    if (ISENTOS[arquivo]) continue;
    const codigo = semComentario(readFileSync(caminho, "utf8"));
    for (const valor of VALORES_CRUS) {
      // ⚠️ **ENTRE ASPAS, e isso corrigiu um falso positivo medido.** Com fronteira de palavra,
      //    `admin` casava dentro de `"/admin/usuarios"` — uma ROTA, que por acaso tem o nome do
      //    perfil — e a varredura acusava `app/(app)/admin/layout.tsx`, que não mostra perfil
      //    nenhum. Valor de enum escrito à mão é sempre literal de texto; rota é outra coisa.
      if (new RegExp(`["']${valor}["']`).test(codigo)) achados.push({ arquivo, valor });
    }
  }
  return achados;
}

/**
 * Casa `{ … perfil … }` **fora de posição de atributo** — o caractere anterior não é `=`.
 *
 * ⚠️ **NÃO BASTA EXIGIR `>` ANTES**, e a primeira escrita exigia. Com ela, `{nome} · {perfil}` —
 * exatamente o que o cabeçalho tinha — **não seria visto**: o `>` casa com `{nome}`, e o `{perfil}`
 * seguinte vem depois de um espaço. A propriedade que separa os dois casos é outra: `perfil={p}` é
 * PROPRIEDADE, e passar o valor adiante é o certo — quem traduz é quem desenha.
 *
 * ⚠️ **E O `$` SAI JUNTO COM O `=`, por um segundo falso positivo medido.** `${perfil}` dentro de
 * template literal não é JSX: em `/admin/permissoes` ele monta a CHAVE de um conjunto
 * (`${perfil}|${recurso}|${acao}`), que ninguém lê. Traduzir ali quebraria a busca.
 */
const RENDER_DE_PERFIL = /(^|[^=$])\{([^{}]*\bperfil\b[^{}]*)\}/gi;

/**
 * A expressão é **o próprio perfil**, e não algo calculado a partir dele?
 *
 * ⚠️ **A DISTINÇÃO NASCEU DE TRÊS FALSOS POSITIVOS MEDIDOS.** `{mensagemDeCursoNaoEncontrado(…,
 * usuario?.perfil)}` recebe o perfil para escolher a FRASE de recusa — o que se lê ali é a frase, em
 * português, e o perfil é argumento. Exigir `rotuloDoPerfil` dentro dela mandaria traduzir um valor
 * que ninguém mostra. O que se proíbe é desenhar o caminho cru: `{perfil}`, `{linha.perfil}`,
 * `{usuario.perfil}`.
 */
const EH_CAMINHO_CRU = /^[A-Za-z_$][\w$]*(?:\??\.[\w$]+)*$/;

function renderizacoesDePerfil(): { readonly arquivo: string; readonly expressao: string }[] {
  const achados: { arquivo: string; expressao: string }[] = [];
  for (const caminho of arquivos()) {
    const codigo = semComentario(readFileSync(caminho, "utf8"));
    for (const casamento of codigo.matchAll(RENDER_DE_PERFIL)) {
      achados.push({ arquivo: comBarraNormal(caminho), expressao: (casamento[2] ?? "").trim() });
    }
  }
  return achados;
}

describe("`FR-005` · o valor cru do enum não é escrito à mão numa tela", () => {
  it("a varredura acha arquivos — controle positivo, sem o qual ela mediria o vazio", () => {
    expect(arquivos().length, "a varredura não achou `app/` nem `components/`").toBeGreaterThan(40);
    expect(VALORES_CRUS.length, "o contrato gerado não trouxe os perfis").toBe(9);
  });

  it("nenhum arquivo de `app/` ou `components/` traz valor cru de perfil", () => {
    const violacoes = usosCrus().map((u) => `${u.arquivo} → ${u.valor}`);
    expect(
      violacoes,
      `perfil em \`snake_case\` fora do módulo de tradução: ${violacoes.join("; ")}. ` +
        `Use \`rotuloDoPerfil\` de \`lib/dominio/perfis.ts\`; se o uso for LÓGICA e não texto, ` +
        `declare o arquivo em ISENTOS com o motivo.`,
    ).toEqual([]);
  });

  it("⚠️ toda isenção existe de verdade e traz motivo — isenção órfã é porta aberta", () => {
    const existentes = new Set(arquivos().map(comBarraNormal));
    for (const [arquivo, motivo] of Object.entries(ISENTOS)) {
      expect(motivo.length, `isenção sem motivo: ${arquivo}`).toBeGreaterThan(20);
      expect(
        existentes.has(arquivo),
        `isenção aponta para arquivo que não existe mais: ${arquivo}`,
      ).toBe(true);
    }
  });
});

describe("⚠️ A SEGUNDA GUARDA · nenhum JSX desenha o perfil sem traduzir", () => {
  it("⚠️ controle positivo: a varredura ACHA as renderizações que existem", () => {
    // ⚠️ **ESTE CASO JÁ PEGOU A GUARDA CEGA**, nesta mesma sessão: com a expressão quebrada ela
    //    casava ZERO vez, e o caso de violação abaixo ficava verde por não achar nada — o modo de
    //    falha mais tranquilizador que existe numa varredura.
    expect(
      renderizacoesDePerfil().length,
      "a varredura não achou NENHUM `{…perfil}` desenhado — ela está medindo o vazio",
    ).toBeGreaterThan(0);
  });

  it("nenhum caminho cru de perfil é desenhado — todo perfil à vista passa por `rotuloDoPerfil`", () => {
    const violacoes = renderizacoesDePerfil()
      .filter((r) => EH_CAMINHO_CRU.test(r.expressao) && /\bperfil$/i.test(r.expressao))
      .map((r) => `${r.arquivo} → {${r.expressao}}`);
    expect(
      violacoes,
      `perfil desenhado sem tradução: ${violacoes.join("; ")}. Era exatamente isto no cabeçalho ` +
        `de toda tela e na lista de usuários até 29/09/2026 — e nenhum valor cru aparecia no código.`,
    ).toEqual([]);
  });
});

describe("⚠️ O CASO QUE DISCRIMINA · a tradução traduz, e é um módulo só", () => {
  it("os nove perfis têm rótulo diferente do valor cru", () => {
    // ⚠️ Sem este caso, um `rotuloDoPerfil` que devolvesse a entrada faria as duas guardas acima
    //    ficarem verdes — nenhum `snake_case` no código, e `snake_case` na tela. É o veredito que
    //    vira quando a tradução deixa de traduzir.
    const naoTraduzidos = perfisDeclarados().filter((p) => rotuloDoPerfil(p) === p);
    expect(naoTraduzidos, `rótulo igual ao valor cru: ${naoTraduzidos.join(", ")}`).toEqual([]);
  });

  it("⚠️ a tradução mora em UM arquivo — três cópias divergiriam na primeira mudança", () => {
    /*
     * ⚠️ **A PRIMEIRA ESCRITA DESTA GUARDA ERA LARGA DEMAIS, e o rebase de 29/09/2026 mostrou.** Ela
     * acusava qualquer arquivo com `rotulo: "…"` que mencionasse a palavra *perfil* em qualquer
     * lugar — e a `main` trouxe dois assim, os dois inocentes: `GradeDeDisciplinas.tsx` tem rótulos
     * de **filtro** e a palavra aparece uma vez, e `FichaEmLeitura.tsx` o mesmo. **Guarda que acusa
     * quem não fez nada ensina a desligá-la.**
     *
     * ⚠️ **O QUE UMA SEGUNDA TABELA DE RÓTULOS DE PERFIL NECESSARIAMENTE TEM é um VALOR DO ENUM como
     * chave** — não dá para traduzir `encarregado_administracao_academica` sem escrevê-lo. Então a
     * condição precisa é: rótulo declarado **E** valor cru do enum no mesmo arquivo.
     */
    const comTraducao = arquivos()
      .filter((caminho) => {
        const codigo = semComentario(readFileSync(caminho, "utf8"));
        const declaraRotulo = /rotulo\s*:\s*"/.test(codigo);
        const temValorCru = VALORES_CRUS.some((v) => new RegExp(`["']${v}["']`).test(codigo));
        return declaraRotulo && temValorCru;
      })
      .map(comBarraNormal);
    expect(
      comTraducao,
      "apareceu uma segunda tabela de rótulos de perfil fora de `lib/dominio/perfis.ts`",
    ).toEqual([]);
  });

  it("⚠️ controle positivo: a guarda PEGA uma segunda tabela — com fonte sintética", () => {
    /*
     * Sem isto, a condição estreitada acima poderia deixar de pegar qualquer coisa, e o caso
     * anterior passaria por guarda perfeita. Aqui a tabela sintética tem as duas metades.
     */
    const sintetico = `const R = { "${VALORES_CRUS[0]}": { rotulo: "Um rótulo qualquer" } };`;
    const declaraRotulo = /rotulo\s*:\s*"/.test(sintetico);
    const temValorCru = VALORES_CRUS.some((v) => new RegExp(`["']${v}["']`).test(sintetico));
    expect(declaraRotulo && temValorCru, "a guarda não pegaria uma segunda tabela").toBe(true);
  });
});
