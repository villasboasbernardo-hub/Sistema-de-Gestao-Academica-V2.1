/**
 * A fronteira da casca — **onde ela custa mais caro** (`FR-019`, `FR-036`).
 *
 * ⚠️ **UM `"use client"` NUM COMPONENTE DE VOCABULÁRIO MANDA AQUELE COMPONENTE PARA O NAVEGADOR; UM
 * NA CASCA MANDA TODA TELA DO SISTEMA**, porque ela envolve todas. É a mesma regra dos componentes,
 * com uma ordem de grandeza a mais de consequência — e o erro **não aparece na checagem de tipos**.
 *
 * ⚠️ **A LISTA É FECHADA, E ESSA É A GRAÇA.** Acrescentar um marcador exige acrescentar o arquivo
 * aqui, o que é decisão visível — não um `"use client"` digitado sem pensar no topo de um arquivo.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const PASTA = "components/casca";

/**
 * Os três que **podem** levar marcador de cliente, e o que cada um justifica.
 *
 * ⚠️ `FocoAoTrocarDeRota` ENTROU DEPOIS DO CONTRATO, e a adição é declarada: ela nasceu de uma
 * medição — sem ela, navegar pelo menu deixava o foco preso na entrada clicada.
 */
const COM_INTERACAO: Readonly<Record<string, string>> = {
  "painel-retratil.tsx": "abrir e fechar o menu em tela estreita — estado efêmero de interface",
  "foco-ao-trocar-de-rota.tsx": "mover o foco ao trocar de rota — não existe no servidor",
  "seletor-de-tema.tsx": "escolher e lembrar o tema — leitura e escrita no navegador",
};

function arquivos(): { arquivo: string; codigo: string; bruto: string }[] {
  const caminho = resolve(process.cwd(), PASTA);
  return readdirSync(caminho)
    .filter((n) => /\.tsx?$/.test(n))
    .map((nome) => {
      const bruto = readFileSync(resolve(caminho, nome), "utf8");
      return {
        arquivo: nome,
        bruto,
        // ⚠️ Sem comentários: o cabeçalho de cada arquivo FALA de banco e de marcador de cliente, e
        // um teste que confunda menção com uso ensina a apagar a documentação para ficar verde.
        codigo: bruto.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " "),
      };
    });
}

describe("`FR-036` · a casca enquadra, e não busca dado", () => {
  it("há arquivo de casca para testar — controle positivo", () => {
    expect(arquivos().length, "a varredura não achou a pasta da casca").toBeGreaterThan(4);
  });

  it("nenhum componente de casca importa banco, tipos de banco ou Server Action", () => {
    const proibidos = ["@supabase/", "@/lib/supabase/", "@/lib/acoes/"];
    const violacoes = arquivos().flatMap(({ arquivo, codigo }) =>
      proibidos.filter((p) => codigo.includes(p)).map((p) => `${arquivo} importa ${p}`),
    );
    expect(
      violacoes,
      `a casca passou a buscar dado: ${violacoes.join(", ")}. Usuário e permissões chegam prontos ` +
        `do layout — uma consulta aqui roda em toda tela do sistema.`,
    ).toEqual([]);
  });

  it("⚠️ nenhum componente de casca implementa regra `RN-`", () => {
    /*
     * Regra de domínio na casca é regra que aparece em toda tela e não tem teste de unidade próprio
     * — e o BRIEF proíbe regra de negócio implementada apenas na interface. A citação de um `RN-` em
     * comentário é legítima; o que este caso barra é o identificador no **código**.
     */
    const violacoes = arquivos()
      .filter(({ codigo }) => /\bRN-[A-Z0-9]/.test(codigo))
      .map(({ arquivo }) => arquivo);
    expect(violacoes, `regra de domínio entrou na casca: ${violacoes.join(", ")}`).toEqual([]);
  });
});

describe("`FR-019` · marcador de cliente só onde o contrato declara", () => {
  const declaram = () =>
    arquivos()
      .filter(({ codigo }) => /^\s*"use client";/m.test(codigo))
      .map(({ arquivo }) => arquivo)
      .sort();

  it("os que levam marcador são exatamente os declarados", () => {
    expect(declaram()).toEqual(Object.keys(COM_INTERACAO).sort());
  });

  it("cada marcador tem justificativa escrita", () => {
    // Sem isto a lista viraria um lugar para acrescentar arquivo sem pensar — que é exatamente o
    // que ela existe para impedir.
    for (const [arquivo, motivo] of Object.entries(COM_INTERACAO)) {
      expect(motivo.length, `${arquivo} sem motivo`).toBeGreaterThan(20);
    }
  });

  it("⚠️ os três que enquadram NÃO levam marcador, e é o caso que importa", () => {
    /*
     * `CascaDoApp` envolve toda tela do sistema. Um marcador nele mandaria o catálogo inteiro para o
     * pacote do navegador — e a tela ficaria idêntica, que é por que ninguém notaria.
     */
    for (const nome of ["casca-do-app.tsx", "cabecalho-do-app.tsx", "navegacao-lateral.tsx"]) {
      expect(declaram(), `${nome} passou a levar marcador de cliente`).not.toContain(nome);
    }
  });
});
