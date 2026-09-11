/**
 * A fronteira dos componentes CIAARA (`FR-019` a `FR-022`, `FR-003.2`, `SC-003`, `SC-007`).
 *
 * > *"Um componente de `components/ciaara/` **exibe**. Ele não busca dado, não decide regra e não
 * > escolhe cor."* — contrato de componentes da spec 007
 *
 * ⚠️ AS QUATRO PROIBIÇÕES TÊM PESO DIFERENTE, E SÓ TRÊS TINHAM PORTÃO. A cor já é barrada pelo
 * ESLint desde a fatia (a); a pureza de `lib/dominio/` idem, desde o Épico 0. O que faltava era o
 * portão do banco, o da regra `RN-` e o do marcador de cliente — este último é o erro que **não
 * aparece no `tsc`** e aparece no `next build`, quando já custou a tarde de alguém.
 *
 * ⚠️ A VARREDURA LÊ CÓDIGO, NÃO COMENTÁRIO. Vários componentes desta fatia explicam no cabeçalho
 * por que NÃO fazem essas coisas; uma varredura ingênua leria a explicação como violação e
 * ensinaria a apagar a documentação para ficar verde.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const DIRETORIOS = ["components/ciaara", "components/graficos"];

/**
 * As pastas onde a regra de **fronteira** vale, e elas são mais do que as do vocabulário.
 *
 * ⚠️ **A CASCA ENTROU EM 11/09/2026, E É ONDE A FRONTEIRA CUSTA MAIS CARO.** Um `"use client"` num
 * componente de vocabulário manda aquele componente para o navegador; um na casca manda **toda tela
 * do sistema**, porque ela envolve todas. O erro não aparece na checagem de tipos.
 *
 * ⚠️ **MAS A REGRA DE AMOSTRA NA VITRINE NÃO A ALCANÇA, e a distinção é do contrato.** O documento
 * 23 §3.1 descreve **vocabulário de domínio**; casca não é vocabulário. Exigir amostra de um
 * cabeçalho de aplicação numa vitrine de tokens seria pedir o exemplo errado da peça certa.
 */
const DIRETORIOS_DE_FRONTEIRA = [...DIRETORIOS, "components/casca"];

/** Lê os arquivos de componente das pastas dadas, com o código já sem comentários. */
function lerDe(diretorios: readonly string[]): { arquivo: string; codigo: string }[] {
  const achados: { arquivo: string; codigo: string }[] = [];
  for (const dir of diretorios) {
    const caminho = resolve(process.cwd(), dir);
    for (const nome of readdirSync(caminho).filter((f) => /\.tsx?$/.test(f))) {
      const fonte = readFileSync(resolve(caminho, nome), "utf8");
      achados.push({
        arquivo: `${dir}/${nome}`,
        codigo: fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " "),
      });
    }
  }
  return achados;
}

/** Os arquivos das pastas onde a fronteira vale — vocabulário **e** casca. */
const comFronteira = () => lerDe(DIRETORIOS_DE_FRONTEIRA);

/** Os arquivos de componente desta fatia, com o código já sem comentários. */
function componentes(): { arquivo: string; codigo: string }[] {
  return lerDe(DIRETORIOS);
}

describe("`SC-007` · zero componente acessa banco (`FR-019`)", () => {
  it("nenhum importa cliente de Supabase, tipos de banco ou Server Action", () => {
    const proibidos = ["@supabase/", "@/lib/supabase/", "@/lib/tipos/database", "@/lib/acoes/"];
    const violacoes = componentes().flatMap(({ arquivo, codigo }) =>
      proibidos.filter((p) => codigo.includes(p)).map((p) => `${arquivo} importa ${p}`),
    );
    expect(
      violacoes,
      `componente acessando banco: ${violacoes.join("; ")}. O componente recebe dado por ` +
        `propriedade e não conhece origem (Princípio XI).`,
    ).toEqual([]);
  });
});

describe("`SC-007` · zero componente implementa regra `RN-` (`FR-020`)", () => {
  it("nenhum cita um identificador de regra como se a implementasse", () => {
    /*
     * ⚠️ O CRITÉRIO É IMPORTAR DE `lib/dominio/` E NÃO REESCREVER. Citar `RN-ANT-01` num
     * comentário é rastreabilidade e é exigida; escrever a regra no corpo é o que se proíbe. Por
     * isso a varredura roda sobre o CÓDIGO, onde um `RN-` só apareceria como nome de variável ou
     * como cadeia de texto — nenhum dos dois tem motivo honesto para existir num componente.
     */
    const violacoes = componentes()
      .filter(({ codigo }) => /RN-[A-Z]{2,}-\d{2}/.test(codigo))
      .map(({ arquivo }) => arquivo);
    expect(
      violacoes,
      `regra RN- escrita no CORPO de um componente: ${violacoes.join(", ")}. ` +
        `O componente exibe; quem decide é lib/dominio/.`,
    ).toEqual([]);
  });

  it("quem aplica regra a importa de `lib/dominio/` — controle positivo", () => {
    // Sem este caso, um repositório onde ninguém aplica regra nenhuma passaria no anterior, e a
    // fronteira pareceria respeitada por ausência de qualquer regra.
    const importam = componentes().filter(({ codigo }) => codigo.includes("@/lib/dominio/"));
    expect(
      importam.length,
      "nenhum componente importa lib/dominio/: ou a fatia não aplica regra, ou a varredura quebrou",
    ).toBeGreaterThan(0);
  });
});

describe("`FR-003.2` · nenhum desenho vetorial escrito à mão", () => {
  it("nenhum componente desenha o próprio ícone", () => {
    /*
     * ⚠️ TREZE COMPONENTES DESENHANDO O PRÓPRIO ÍCONE é a mesma divergência que a paleta veio
     * fechar, num vocabulário diferente. A biblioteca de ícones foi decidida em 10/09/2026
     * (`FR-003.1`), e a de gráficos traz as seis formas de marcador.
     */
    const violacoes = componentes()
      .filter(({ codigo }) => /<path\b|<polygon\b|<polyline\b|\bd="M/.test(codigo))
      .map(({ arquivo }) => arquivo);
    expect(
      violacoes,
      `desenho vetorial escrito à mão: ${violacoes.join(", ")}. ` +
        `Use um ícone de lucide-react, ou o marcador de forma da biblioteca de gráficos.`,
    ).toEqual([]);
  });

  it("controle positivo: os componentes de fato usam a biblioteca de ícones", () => {
    const usam = componentes().filter(({ codigo }) => codigo.includes("lucide-react"));
    expect(usam.length, "nenhum componente usa a biblioteca de ícones decidida").toBeGreaterThan(4);
  });
});

describe("`FR-021` · marcador de cliente só onde há interação", () => {
  /**
   * A lista do documento 23 §3.1 — quem **deve** levar `"use client"`.
   *
   * ⚠️ ELA É UMA LISTA FECHADA, E ESSA É A GRAÇA. Marcador por precaução contamina toda a subárvore
   * de importação: um deles no lugar errado manda a tabela de 177 linhas para o pacote do
   * navegador. Aqui, acrescentar um exige acrescentar o arquivo a esta lista — que é uma decisão
   * visível, não um `"use client"` digitado sem pensar.
   */
  const COM_INTERACAO = [
    "components/ciaara/badge-teto.tsx",
    "components/ciaara/dialogo-confirmacao.tsx",
    "components/ciaara/filtro-avancado.tsx",
    "components/ciaara/lista-navegavel.tsx",
    "components/ciaara/provedor-de-tema.tsx",
    "components/ciaara/seletor-instrutor.tsx",
    "components/casca/foco-ao-trocar-de-rota.tsx",
    "components/casca/painel-retratil.tsx",
    "components/casca/seletor-de-tema.tsx",
    "components/ciaara/seletor-turma.tsx",
    "components/ciaara/tabela-densa.tsx",
    "components/graficos/grafico-barras.tsx",
    "components/graficos/grafico-linha.tsx",
    "components/graficos/grafico-pizza.tsx",
    "components/graficos/moldura.tsx",
  ];

  const declaram = () =>
    comFronteira()
      .filter(({ codigo }) => /^\s*"use client";/m.test(codigo))
      .map(({ arquivo }) => arquivo)
      .sort();

  it("só os da lista declaram marcador de cliente", () => {
    const inesperados = declaram().filter((a) => !COM_INTERACAO.includes(a));
    expect(
      inesperados,
      `marcador de cliente fora da lista do documento 23 §3.1: ${inesperados.join(", ")}. ` +
        `Ele contamina toda a subárvore de importação, e o erro NÃO aparece no tsc — aparece no ` +
        `next build.`,
    ).toEqual([]);
  });

  it("todos os da lista declaram — a lista não envelhece em silêncio", () => {
    const faltando = COM_INTERACAO.filter((a) => !declaram().includes(a));
    expect(
      faltando,
      `a lista promete marcador de cliente que o arquivo não tem: ${faltando.join(", ")}. ` +
        `Ou o componente perdeu a interação, ou o arquivo mudou de nome.`,
    ).toEqual([]);
  });

  it("os que renderizam no servidor continuam sem marcador — e são a maioria", () => {
    // ⚠️ `NomeInstrutor` é o caso que importa: as rotas de impressão dos Épicos 10 e 11 vão
    // consumi-lo, e impressão é renderizada no servidor.
    const semMarcador = componentes()
      .filter(({ codigo }) => !/^\s*"use client";/m.test(codigo))
      .map(({ arquivo }) => arquivo);
    expect(semMarcador).toContain("components/ciaara/nome-instrutor.tsx");
    expect(semMarcador).toContain("components/ciaara/alerta-conformidade.tsx");
    expect(semMarcador).toContain("components/ciaara/card-kpi.tsx");
    expect(semMarcador.length).toBeGreaterThanOrEqual(6);
  });
});

describe("`SC-003` · a regra de cor continua em zero violações (`FR-022`)", () => {
  it("nenhum componente escreve cor à mão nem usa a paleta padrão", () => {
    /*
     * ⚠️ ESTA É A SEGUNDA METADE DE UM PORTÃO QUE JÁ EXISTE. O ESLint barra as duas formas desde a
     * fatia (a), e `tests/unidade/lint/regra-de-cor.test.ts` prova que a regra está ativa. O que
     * este caso acrescenta é a CONTAGEM que o `SC-003` promete: zero, medida sobre os componentes
     * desta fatia, e reportada com o arquivo.
     */
    const literal = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;
    const paleta =
      /\b(?:text|bg|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|accent|caret|divide|placeholder)-(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;
    const violacoes = componentes()
      .filter(({ codigo }) => literal.test(codigo) || paleta.test(codigo))
      .map(({ arquivo }) => arquivo);
    expect(
      violacoes,
      `cor fora do ponto único: ${violacoes.join(", ")}. ` +
        `Toda cor vem de app/globals.css, por token.`,
    ).toEqual([]);
  });
});

describe("`SC-001` · nenhum componente fica órfão da vitrine", () => {
  /**
   * ⚠️ A PROVA É O GRAFO DE IMPORTAÇÃO, e não a presença de um nome no texto da página. Um
   * componente que ninguém importa a partir de `app/estilo/` **não tem amostra** — e componente sem
   * amostra é componente que ninguém nota quando quebra. É a invariante I-5 da fatia (a),
   * estendida de token para componente.
   */
  function alcancaveisDaVitrine(): Set<string> {
    const vistos = new Set<string>();
    const fila = readdirSync(resolve(process.cwd(), "app/estilo"))
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => `app/estilo/${f}`);

    while (fila.length > 0) {
      const atual = fila.pop() as string;
      if (vistos.has(atual)) continue;
      vistos.add(atual);
      let fonte: string;
      try {
        fonte = readFileSync(resolve(process.cwd(), atual), "utf8");
      } catch {
        continue;
      }
      for (const achado of fonte.matchAll(/from "@\/((?:components|lib)\/[^"]+)"/g)) {
        const alvo = achado[1] as string;
        for (const extensao of [".tsx", ".ts"]) {
          try {
            readFileSync(resolve(process.cwd(), alvo + extensao), "utf8");
            fila.push(alvo + extensao);
            break;
          } catch {
            // caminho com outra extensão — tenta a próxima
          }
        }
      }
    }
    return vistos;
  }

  /**
   * Os que **não têm como** ter amostra — com o motivo, que é obrigatório.
   *
   * ⚠️ ISENÇÃO SEM MOTIVO ESCRITO É A MESMA COISA QUE INVARIANTE AFROUXADA EM SILÊNCIO. A diferença
   * entre as duas está inteiramente aqui, e é o mesmo mecanismo das isenções de contraste da fatia
   * (a). Nenhum dos dois é componente desta fatia: os dois vêm do Épico 3.
   */
  const SEM_AMOSTRA_POR_NATUREZA: readonly { arquivo: string; motivo: string }[] = [
    {
      arquivo: "components/ciaara/provedor-de-tema.tsx",
      motivo:
        "provedor de contexto, não desenha nada. Ele já envolve a vitrine inteira a partir de " +
        "app/layout.tsx — uma 'amostra' dele seria um segundo provedor dentro do primeiro",
    },
    {
      arquivo: "components/ciaara/SePodeVer.tsx",
      motivo:
        "porteiro de permissão: ele decide pela matriz de perfil, e a rota /estilo é SEM SESSÃO " +
        "por decisão de 10/09/2026. Exercitá-lo aqui exigiria uma sessão falsa, que provaria " +
        "menos que nada",
    },
  ];

  it("todo componente desta fatia é alcançável a partir de `/estilo`", () => {
    const alcancaveis = alcancaveisDaVitrine();
    const isentos = SEM_AMOSTRA_POR_NATUREZA.map((i) => i.arquivo);
    const orfaos = componentes()
      .map(({ arquivo }) => arquivo)
      .filter((a) => !a.endsWith("/tipos.ts"))
      .filter((a) => !isentos.includes(a))
      .filter((a) => !alcancaveis.has(a));
    expect(
      orfaos,
      `componentes sem amostra na vitrine: ${orfaos.join(", ")}. ` +
        `O FR-027 exige exemplo utilizável para cada um.`,
    ).toEqual([]);
  });

  it.each(SEM_AMOSTRA_POR_NATUREZA)("$arquivo está isento COM motivo escrito", (isento) => {
    expect(isento.motivo.length, `${isento.arquivo} isento sem motivo`).toBeGreaterThan(60);
  });

  it("a isenção não vira depósito: ela continua com dois itens, e os dois existem", () => {
    // ⚠️ Uma lista que cresce sem ninguém notar é o fim de qualquer invariante. Se um componente
    // novo precisar entrar aqui, este caso obriga a decisão a ser visível.
    expect(SEM_AMOSTRA_POR_NATUREZA).toHaveLength(2);
    const existentes = componentes().map(({ arquivo }) => arquivo);
    for (const i of SEM_AMOSTRA_POR_NATUREZA) {
      expect(existentes, `a isenção aponta para arquivo inexistente: ${i.arquivo}`).toContain(
        i.arquivo,
      );
    }
  });

  it("controle positivo: a travessia do grafo alcança bastante coisa", () => {
    expect(alcancaveisDaVitrine().size).toBeGreaterThan(10);
  });
});
