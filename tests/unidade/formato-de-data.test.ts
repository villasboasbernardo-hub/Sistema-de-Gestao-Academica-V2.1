/**
 * **Data na tela sai de um lugar só, e no formato brasileiro** (`DD/MM/AAAA`).
 *
 * *(decisão de Bernardo Villas Boas, 05/10/2026, na conferência da spec 012: dia e mês com dois
 * dígitos, ano com quatro, separador barra, em TODA exibição — tela, tabela, aviso e mensagem.)*
 *
 * ⚠️ **O QUE ESTA GUARDA PROTEGE NÃO É O FORMATO: É O NÚMERO DE DONOS DELE.** Quando a decisão foi
 * tomada, o repositório tinha **três** formatadores de data — `dataParaLeitura` em `lib/formato/`,
 * um inline em `TabelaDeTurmas.tsx` e o par `diaMes`/`diaMesAno` em `lib/dominio/alertas-instrutor.ts`
 * — e o mais perigoso dos três era o que **já acertava o formato**: um segundo dono que produz o
 * mesmo resultado não reprova em teste nenhum, e só diverge no dia em que um dos dois muda. É o
 * caminho que o botão de limpar filtros percorreu antes de virar componente.
 *
 * ⚠️ **E ELA GUARDA UM DEFEITO DE FUSO QUE JÁ EXISTIA:** `new Date(x).toLocaleDateString("pt-BR")`
 * **sem** `timeZone` usa o fuso do PROCESSO — `America/Sao_Paulo` nesta máquina e **UTC na Vercel**.
 * As duas telas de conta mostravam, para um acesso às 22h de Brasília, a data do dia seguinte **só no
 * preview**: verde na máquina de quem programa, errado para quem usa. Por isso a formatação de
 * instante também mora no ponto único, com o fuso declarado.
 *
 * ⚠️ **O QUE ELA NÃO MEDE, e está declarado:** ela não varre JSX procurando data ISO exibida. Fazê-lo
 * exigiria distinguir, por análise de texto, **exibição** de **valor** — e o mesmo campo aparece nas
 * duas naturezas no mesmo arquivo, a quinze linhas de distância (`PainelDePeriodo.tsx`). Uma
 * varredura que errasse esse lado faria um `<input type="date">` abrir **vazio** e gravar nulo sobre
 * a janela existente. O que ela mede é o que não tem ambiguidade: **quem formata**.
 *
 * ⚠️ **LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1): este arquivo e `lib/formato/data.ts` citam
 * `toLocaleDateString` em prosa, para explicar por que ele não deve voltar.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  dataIlegivel,
  dataParaLeitura,
  instanteComHoraParaLeitura,
  instanteParaLeitura,
} from "@/lib/formato/data";

const RAIZ = process.cwd();

/** O ponto único. Ele é o único isento das varreduras abaixo — é lá que o formato mora. */
const PONTO_UNICO = "lib/formato/data.ts";

/** Este arquivo sai da varredura: os padrões proibidos estão escritos nele. */
const ESTE_ARQUIVO = "formato-de-data.test.ts";

const PASTAS = ["app", "lib", "components"] as const;
const EXTENSOES = /\.(ts|tsx)$/;

/**
 * Os jeitos de formatar data que **não** podem existir fora do ponto único.
 *
 * ⚠️ **`toLocaleString` SOZINHO NÃO ENTRA, e a razão é medida:** ele é o formatador de **número** em
 * pelo menos dois módulos (`alertas-instrutor.ts` escreve horas com
 * `maximumFractionDigits`), e proibi-lo reprovaria código correto. O que se proíbe é ele **sobre um
 * `Date`** — que é a forma do defeito de fuso.
 */
const PROIBIDOS: readonly { readonly padrao: RegExp; readonly porque: string }[] = [
  {
    padrao: /\.toLocaleDateString\s*\(/,
    porque:
      "formata data fora do ponto único; sem `timeZone` ele usa o fuso do processo (UTC na Vercel)",
  },
  {
    padrao: /\.toLocaleTimeString\s*\(/,
    porque: "formata hora fora do ponto único, com o mesmo risco de fuso",
  },
  {
    padrao: /new Date\([^)]*\)\s*\.toLocaleString\s*\(/,
    porque: "é `toLocaleString` sobre um instante — formatação de data fora do ponto único",
  },
  {
    padrao: /\.slice\(\s*8\s*,\s*10\s*\)/,
    porque: "é o dia recortado de uma data ISO à mão — o formato montado por conta própria",
  },
  {
    padrao: /\.slice\(\s*5\s*,\s*7\s*\)/,
    porque: "é o mês recortado de uma data ISO à mão",
  },
  {
    padrao: /\$\{[^}]{1,40}\}\/\$\{[^}]{1,40}\}\/\$\{[^}]{1,40}\}/,
    porque: "é uma data de três pedaços montada em template — `DD/MM/AAAA` escrito à mão",
  },
];

function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function arquivosDe(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = resolve(caminho, nome);
    if (nome === "node_modules" || nome === ".next") return [];
    if (statSync(completo).isDirectory()) return arquivosDe(relative(RAIZ, completo));
    return EXTENSOES.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

const TODOS = PASTAS.flatMap(arquivosDe).filter(
  (a) => !a.endsWith(ESTE_ARQUIVO) && a !== PONTO_UNICO,
);

describe("`FR-034` · o ponto único existe e devolve o formato brasileiro", () => {
  it("data de calendário vira `DD/MM/AAAA`, sem passar por `Date`", () => {
    expect(dataParaLeitura("2026-12-15")).toBe("15/12/2026");
    // ⚠️ O CASO QUE JUSTIFICA A CONVERSÃO DE TEXTO: por `Date`, isto daria 28/02 em São Paulo.
    expect(dataParaLeitura("2021-03-01")).toBe("01/03/2021");
    expect(dataParaLeitura("2026-01-05")).toBe("05/01/2026");
  });

  it("⚠️ o que não é data devolve traço, e o traço é RECONHECÍVEL por quem interpola", () => {
    for (const ruim of ["", "   ", "amanhã", "15/12/2026", "2026-13-99x", null, undefined]) {
      expect(dataParaLeitura(ruim)).toBe("—");
      expect(dataIlegivel(dataParaLeitura(ruim))).toBe(true);
    }
    expect(dataIlegivel(dataParaLeitura("2026-12-15"))).toBe(false);
  });

  it("⚠️ instante é formatado NO FUSO DA CIAARA-11, e não no fuso do processo", () => {
    /*
     * CONTA: 2026-10-03T02:11:09Z é 23h11 do dia **02/10** em São Paulo (UTC−3). Um formatador sem
     *        `timeZone` rodando em UTC — a Vercel — diria 03/10. É o defeito que existia nas duas
     *        telas de conta, e o que este caso trava.
     */
    expect(instanteParaLeitura("2026-10-03T02:11:09.123Z")).toBe("02/10/2026");
    expect(instanteComHoraParaLeitura("2026-10-03T02:11:09.123Z")).toBe("02/10/2026, 23:11");
    expect(instanteParaLeitura(null)).toBe("—");
    expect(instanteComHoraParaLeitura("nunca")).toBe("—");
  });

  it("⚠️ trocar as duas funções é SILENCIOSO, e erra para lados diferentes", () => {
    /*
     * ⚠️ **ESTE CASO FOI ESCRITO ERRADO NA PRIMEIRA REDAÇÃO, E A MEDIÇÃO O CORRIGIU** — fica
     *    registrado porque o erro é a lição. Eu esperava `03/10/2026` da segunda linha.
     *
     * | Troca | O que sai | Por quê |
     * |---|---|---|
     * | `timestamptz` na função de CALENDÁRIO | `"—"` | não casa a regex `AAAA-MM-DD` |
     * | data de CALENDÁRIO na função de instante | **o dia ANTERIOR** | `new Date("2026-10-03")` é meia-noite em UTC, que em São Paulo é 02/10 às 21h |
     *
     * ⚠️ **O segundo é o pior dos dois**: devolve uma data plausível, um dia atrás, sem erro nenhum.
     *    É exatamente o defeito que o cabeçalho de `lib/formato/data.ts` descreve e que a conversão
     *    de texto para texto existe para impedir.
     */
    expect(dataParaLeitura("2026-10-03T02:11:09.123Z")).toBe("—");
    expect(instanteParaLeitura("2026-10-03")).toBe("02/10/2026");
  });
});

describe("`FR-034` · ninguém formata data por conta própria", () => {
  it.each(PROIBIDOS)("⚠️ nenhum arquivo usa o padrão que $porque", ({ padrao }) => {
    const infratores = TODOS.filter((arquivo) =>
      padrao.test(semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8"))),
    );

    expect(
      infratores,
      `estes arquivos formatam data fora de \`${PONTO_UNICO}\`: ${infratores.join(", ")}. ` +
        `Use \`dataParaLeitura\` para coluna \`date\` e \`instanteParaLeitura\` / ` +
        `\`instanteComHoraParaLeitura\` para \`timestamptz\`. ⚠️ **O que NÃO resolve é acertar o ` +
        `formato aqui também**: dois donos do mesmo formato é exatamente o defeito que esta guarda ` +
        `existe para impedir, e ele não aparece enquanto os dois concordam.`,
    ).toEqual([]);
  });

  it("⚠️ CONTROLE POSITIVO · o ponto único é de fato CONSUMIDO, e em vários lugares", () => {
    /*
     * Sem este caso, apagar toda exibição de data deixaria a varredura verde — e a guarda estaria
     * medindo a ausência do assunto, não a ausência do defeito.
     */
    const consumidores = TODOS.filter((arquivo) =>
      /from "@\/lib\/formato\/data"/.test(readFileSync(resolve(RAIZ, arquivo), "utf8")),
    );

    expect(
      consumidores.length,
      `só ${consumidores.length} arquivo(s) importam o formatador — ele tinha 11 consumidores em ` +
        "05/10/2026, em `app/` e em `lib/dominio/`. Queda brusca significa que alguém voltou a " +
        "formatar por conta própria por um caminho que a varredura acima não conhece.",
    ).toBeGreaterThanOrEqual(8);

    // ⚠️ E em DOIS andares: a tela e o domínio. Só um dos dois é sinal de que o outro regrediu.
    expect(consumidores.some((a) => a.startsWith("app/"))).toBe(true);
    expect(consumidores.some((a) => a.startsWith("lib/dominio/"))).toBe(true);
  });
});
