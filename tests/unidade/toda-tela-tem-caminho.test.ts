/**
 * **Tela sem caminho clicável até ela é tela não entregue** (`SC-003`, `RF-NAV-02`).
 *
 * ⚠️ **ESTA VARREDURA NASCEU DE DOIS DEFEITOS REAIS, achados na conferência de Bernardo em
 * 24/09/2026 e não por teste nenhum:** `/cursos/novo` **não tinha link nenhum** na aplicação — só se
 * chegava digitando o endereço —, e a única entrada de `/cursos/[curso]/editar` era um link chamado
 * *"histórico e correção"*, que ninguém lê como *"editar curso"*.
 *
 * ⚠️ **A CAUSA FOI A SUÍTE, e é o que esta varredura corrige.** Os percursos de ponta a ponta
 * chegavam às telas com `page.goto` — o que prova que a tela **funciona** e não prova que alguém a
 * **alcança**. Uma tela alcançável só por digitação está, para quem usa, tão entregue quanto uma que
 * não existe.
 *
 * ⚠️ **O QUE ELA MEDE É ESTÁTICO, E É DE PROPÓSITO:** que exista, em outra tela, um `href` que leve
 * até a rota. O percurso de clique de verdade é dos casos de ponta a ponta; aqui se pega o defeito
 * **antes**, e para toda rota de uma vez — que é o que faltava quando as duas passaram.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FORA_DO_MENU, MENU } from "@/lib/navegacao/menu";

const RAIZ = process.cwd();

/**
 * As rotas que não precisam de link porque **não são telas do sistema**.
 *
 * ⚠️ Cada uma com o motivo, e nenhuma "por ora": a raiz redireciona, as de autenticação são
 * alcançadas **sem sessão**, e `/estilo` é a vitrine, deixada fora do grupo autenticado pelo
 * `FR-038`.
 */
const NAO_SAO_TELAS_DO_SISTEMA: Readonly<Record<string, string>> = {
  "/": "redireciona para /inicio ou /login — não é destino, é desvio",
  "/login": "alcançada sem sessão, pelo proxy",
  "/convite": "alcançada pelo link do e-mail de convite",
  "/recuperar-senha": "alcançada a partir de /login",
  "/estilo": "a vitrine, fora do grupo autenticado (`FR-038`)",
  "/sem-configuracao": "o desvio de ambiente incompleto — ninguém navega até ela",
};

function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function arquivosDe(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = join(caminho, nome);
    if (statSync(completo).isDirectory()) return arquivosDe(relative(RAIZ, completo));
    return /\.tsx?$/.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

/** A rota que um `page.tsx` serve, no formato do Next: `/cursos/[curso]/editar`. */
function rotaDoArquivo(caminho: string): string {
  const rota = caminho
    .replace(/^app/, "")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/\([^)]+\)/g, "");
  return rota === "" ? "/" : rota;
}

/** Todas as rotas de página que existem no repositório. */
function rotasDeTela(): string[] {
  return arquivosDe("app")
    .filter((c) => c.endsWith("/page.tsx"))
    .map(rotaDoArquivo)
    .sort();
}

/**
 * Todo destino que aparece escrito em código, normalizado para o formato de rota.
 *
 * ⚠️ **ELA LÊ OS AJUDANTES DE NAVEGAÇÃO TAMBÉM, e não só o JSX.** `enderecoDaTurma()` e
 * `enderecoDaNovaTurma()` montam o caminho em `lib/navegacao/`; uma varredura que olhasse apenas
 * `href=` concluiria que `/turmas/[turma]` não tem link — e mandaria alguém "consertar" o que já
 * estava certo.
 */
function destinosEscritos(): { readonly rota: string; readonly onde: string }[] {
  const achados: { rota: string; onde: string }[] = [];
  const pastas = ["app", "components", "lib/navegacao"];

  /*
   * ⚠️ **AS CONSTANTES DE CAMINHO SÃO RESOLVIDAS ANTES, e sem isto a varredura acusa o que está
   *    certo.** `enderecoDaTurma` monta `` `${RAIZ_DE_TURMAS}/${encodeURIComponent(codigo)}` ``, e
   *    uma normalização ingênua transforma isso em `[param]/[param]` — que não casa com
   *    `/turmas/[param]`. Medido em 24/09/2026: sem este passo, `/turmas/[turma]` e
   *    `/cursos/[curso]/turmas/nova` apareciam como órfãs **tendo link**, e o conserto teria sido
   *    acrescentar um link que já existia.
   */
  const constantes = new Map<string, string>();
  for (const pasta of pastas) {
    for (const arquivo of arquivosDe(pasta)) {
      const codigo = semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8"));
      for (const achado of codigo.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*"(\/[^"]*)"/g)) {
        constantes.set(achado[1] as string, achado[2] as string);
      }
    }
  }
  const resolverConstantes = (texto: string) =>
    texto.replace(
      /\$\{([A-Z_][A-Z0-9_]*)\}/g,
      (inteiro, nome: string) => constantes.get(nome) ?? inteiro,
    );

  for (const pasta of pastas) {
    for (const arquivo of arquivosDe(pasta)) {
      /*
       * ⚠️ **O CONTRATO DE ROTAS DECLARA, NÃO NAVEGA — e sem esta exceção a varredura fica CEGA.**
       *    `lib/navegacao/contrato.ts` tem **toda** rota do sistema como chave, para tipar os
       *    parâmetros de URL. Lê-las como links faria cada tela parecer alcançável, e a varredura
       *    aprovaria um repositório sem link nenhum. Medido em 24/09/2026, com defeito deliberado:
       *    com o contrato dentro da conta, apagar o botão "Novo curso" **não** era acusado.
       *    É a mesma exceção que `endereco-de-turma-unico.test.ts` já declara, pelo mesmo motivo.
       */
      if (arquivo === "lib/navegacao/contrato.ts") continue;
      /*
       * ⚠️ AS CONSTANTES SÃO RESOLVIDAS NO CÓDIGO INTEIRO, **antes** de extrair as strings — e não
       *    em cada achado. O template `` `${RAIZ_DE_TURMAS}/…` `` **começa** por `${`, então um
       *    extrator que exige `/` no início nem chega a vê-lo: resolver depois seria resolver o que
       *    já tinha sido descartado.
       */
      const codigo = resolverConstantes(
        semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8")),
      );
      /*
       * Caminhos literais e caminhos montados com interpolação. O `${…}` vira `[param]`, que é
       * como o Next escreve o segmento dinâmico — assim `/cursos/${sigla}/editar` casa com
       * `/cursos/[curso]/editar` sem que a varredura precise saber o nome do parâmetro.
       */
      for (const achado of codigo.matchAll(/["'`](\/[^"'`\s]*)["'`]/g)) {
        const bruto = achado[1];
        if (!bruto || bruto.includes("://")) continue;
        const normalizado = bruto
          .replace(/\$\{[^}]*\}/g, "[param]")
          .replace(/\?.*$/, "")
          .replace(/\/$/, "");
        if (normalizado) achados.push({ rota: normalizado, onde: arquivo });
      }
    }
  }
  return achados;
}

/** A rota, com todo segmento dinâmico virando `[param]` — o formato em que as duas se comparam. */
const normalizar = (rota: string) => rota.replace(/\[[^\]]+\]/g, "[param]");

describe("`SC-003` · toda tela do sistema tem caminho clicável até ela", () => {
  const doMenu = new Set(MENU.map((e) => normalizar(e.rota)));
  const reservadas = new Set(FORA_DO_MENU.map((e) => normalizar(e.rota)));

  it("há telas para varrer — controle positivo", () => {
    expect(rotasDeTela().length, "a varredura não achou rota nenhuma").toBeGreaterThan(10);
  });

  it("⚠️ nenhuma rota é alcançável SÓ digitando o endereço", () => {
    const destinos = destinosEscritos();
    const orfas: string[] = [];

    for (const rota of rotasDeTela()) {
      if (rota in NAO_SAO_TELAS_DO_SISTEMA) continue;
      const alvo = normalizar(rota);
      if (doMenu.has(alvo)) continue;

      /*
       * ⚠️ O LINK TEM DE ESTAR EM OUTRO ARQUIVO. Um `href` que a própria página escreve para si
       *    mesma — a paginação, o link "voltar ao topo" — não é caminho de chegada.
       */
      const arquivoDaPropriaRota = `app/(app)${rota}/page.tsx`;
      const temLink = destinos.some(
        (d) => normalizar(d.rota) === alvo && d.onde !== arquivoDaPropriaRota,
      );
      if (!temLink) orfas.push(rota);
    }

    expect(
      orfas,
      `rota sem caminho clicável: ${orfas.join(", ")}. Tela alcançável só por digitação é tela ` +
        `não entregue — ponha um link para ela em outra tela, com a mesma permissão da página.`,
    ).toEqual([]);
  });

  it("⚠️ e a varredura PEGA uma órfã — controle positivo com rota inventada", () => {
    const destinos = destinosEscritos();
    const inventada = "/cursos/inexistente-nesta-arvore";
    expect(destinos.some((d) => normalizar(d.rota) === inventada)).toBe(false);
  });

  it("as duas rotas que a conferência de 24/09/2026 achou órfãs têm link agora", () => {
    const destinos = destinosEscritos();
    for (const [rota, onde] of [
      ["/cursos/novo", "app/(app)/cursos/page.tsx"],
      ["/cursos/[param]/editar", "app/(app)/cursos/[curso]/CabecalhoDoCurso.tsx"],
    ] as const) {
      expect(
        destinos.some((d) => normalizar(d.rota) === rota && d.onde === onde),
        `${rota} deixou de ter link em ${onde}`,
      ).toBe(true);
    }
  });

  it("⚠️ e as reservadas do `FORA_DO_MENU` continuam SEM tela — elas não são exceção, são ausência", () => {
    const existentes = new Set(rotasDeTela().map(normalizar));
    const indevidas = [...reservadas].filter((r) => existentes.has(r));
    expect(
      indevidas,
      `rota reservada ganhou tela sem sair de FORA_DO_MENU: ${indevidas.join(", ")}`,
    ).toEqual([]);
  });
});
