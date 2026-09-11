/**
 * As três recusas desta fatia, **contadas** (`FR-011`, `FR-011.1`, `FR-037.1`, `SC-020`, `SC-022`).
 *
 * ⚠️ **RECUSA SEM CONTAGEM É INTENÇÃO.** Ela sobrevive até o dia em que alguém acrescenta o
 * parâmetro, instala o pacote ou cria o contêiner — e ninguém percebe, porque não havia nada
 * conferindo. As três aqui são zeros medidos, não promessas.
 *
 * ⚠️ **O RISCO TEM NOME NO PRÓPRIO BACKLOG DO ÉPICO 4:** *"o gerenciador de estado virar o `AppState`
 * disfarçado"*. O `AppState` da v2.0 era um objeto global onde toda tela guardava contexto; o
 * caminho mais curto para recriá-lo aqui **não instala nada** — é um contêiner de contexto —, e por
 * não instalar nada nenhum portão de dependência o pegaria.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CONTRATO, parametrosDaRota, type Rota } from "@/lib/navegacao/contrato";

const RAIZ = process.cwd();
const DIRETORIOS = ["app", "components", "lib"];

function fontes(): { arquivo: string; codigo: string }[] {
  const achados: { arquivo: string; codigo: string }[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada);
      if (statSync(caminho).isDirectory()) percorrer(caminho);
      else if (/\.tsx?$/.test(entrada)) {
        const bruto = readFileSync(caminho, "utf8");
        achados.push({
          arquivo: relative(RAIZ, caminho).replaceAll("\\", "/"),
          // ⚠️ Menção em prosa não é uso: os cabeçalhos deste projeto explicam justamente por que
          // estas coisas NÃO existem, e contá-las seria punir a documentação.
          codigo: bruto.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " "),
        });
      }
    }
  };
  for (const d of DIRETORIOS) percorrer(resolve(RAIZ, d));
  return achados;
}

describe("`SC-022` · zero contêiner de contexto como fonte de verdade de navegação", () => {
  /**
   * A **única** exceção, e ela é a prova da distinção, não uma brecha nela.
   *
   * ⚠️ O contêiner da lista navegável guarda **qual célula tem o foco do teclado** — coordenada de
   * `linha:coluna` dentro de uma grade. Isso é mecânica de interface: não recorta dado, não
   * identifica registro e **não faz sentido num link que se manda para outra pessoa**, que é a
   * pergunta do `FR-010`. Mandá-lo para a URL seria o erro oposto ao que esta fatia corrige.
   *
   * ⚠️ **E A MEDIÇÃO CORRIGIU UMA SUPOSIÇÃO MINHA.** Este caso nasceu isentando o provedor de tema,
   * que eu presumia usar contêiner próprio — ele não usa, porque delega à biblioteca de tema. O
   * controle positivo abaixo é o que expôs o engano: ele exige que a varredura encontre o contêiner
   * que sabemos existir, e reprovou quando eu nomeei o arquivo errado.
   */
  const ISENTOS = ["components/ciaara/lista-navegavel.tsx"];

  it("nenhum `createContext` novo entrou para guardar recorte, identidade ou página", () => {
    const criadores = fontes()
      .filter(({ codigo }) => /createContext\s*[<(]/.test(codigo))
      .map(({ arquivo }) => arquivo)
      .filter((a) => !ISENTOS.includes(a));

    expect(
      criadores,
      `contêiner de contexto novo: ${criadores.join(", ")}. Se ele guarda recorte, identidade ou ` +
        `posição, é o AppState voltando — e a fonte de verdade é a URL (documento 25 §3.3).`,
    ).toEqual([]);
  });

  it("controle positivo: a varredura acha o contêiner que sabemos existir", () => {
    // Sem isto, uma varredura quebrada passaria por "zero contêineres" e o portão não valeria nada.
    const todos = fontes().filter(({ codigo }) => /createContext\s*[<(]/.test(codigo));
    expect(
      todos.map((t) => t.arquivo),
      "a varredura não encontrou nem o contêiner que sabemos existir",
    ).toContain(ISENTOS[0]);
  });
});

describe("`SC-020` · zero parâmetro de paginação no contrato (`FR-037.1`)", () => {
  it("nenhuma rota declara página, tamanho de página ou deslocamento", () => {
    /*
     * ⚠️ A RECUSA É DECLARADA, e vem de medição: a fatia (b) decidiu que a tabela densa renderiza
     * **todas** as linhas, porque os volumes reais não pedem janela de visão e porque renderização
     * parcial briga com o alcance por teclado. Reabrir isso exige medição na mão — não um parâmetro
     * reservado por via das dúvidas, que é como a decisão se desfaz sem ninguém decidir.
     */
    const proibidos = ["pagina", "page", "por_pagina", "tamanho", "offset", "limite", "cursor"];
    const achados = (Object.keys(CONTRATO) as Rota[]).flatMap((r) =>
      parametrosDaRota(r)
        .filter((p) => proibidos.includes(p.nome))
        .map((p) => `${r}:${p.nome}`),
    );
    expect(achados, `paginação entrou no contrato: ${achados.join(", ")}`).toEqual([]);
  });
});

describe("`FR-011` · zero gerenciador de estado global sem consumidor medido", () => {
  const DEPENDENCIAS = JSON.parse(readFileSync(resolve(RAIZ, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  it("nenhum pacote de estado global está instalado", () => {
    /*
     * ⚠️ **INSTALAR ANTES DE PRECISAR É COMO O `AppState` VOLTA.** A fatia (b) mediu isto de outro
     * jeito: a lista de instalação encolheu de catorze pacotes para dois, porque o que já estava
     * instalado cobria sete primitivos. Aqui o número a manter é **zero**.
     *
     * ⚠️ E a decisão não é contra a ferramenta: o documento 25 admite estado efêmero de interface
     * fora da URL. É contra instalar **sem consumidor legítimo medido**.
     */
    const suspeitos = ["zustand", "jotai", "redux", "@reduxjs/toolkit", "recoil", "mobx", "valtio"];
    const todas = { ...DEPENDENCIAS.dependencies, ...DEPENDENCIAS.devDependencies };
    const instalados = suspeitos.filter((s) => s in todas);

    expect(
      instalados,
      `gerenciador de estado instalado sem consumidor: ${instalados.join(", ")}. ` +
        `Quando houver um consumidor medido, esta lista muda junto com a medição.`,
    ).toEqual([]);
  });
});
