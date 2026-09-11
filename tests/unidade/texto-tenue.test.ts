/**
 * `--texto-tenue` nunca carrega dado, e agora isso é **verificável** (`FR-031`). *Fecha o `CHK013`.*
 *
 * > *"`--texto-tenue` nunca carrega dado."* — documento 23 §8.1
 *
 * ⚠️ O `CHK013` RECLAMAVA EXATAMENTE DISTO: a frase acima existia, e *"nada distinguia dica de dado
 * no código"*. Continuava verdade até 10/09/2026.
 *
 * ⚠️ A MÁQUINA NÃO SABE DISTINGUIR DICA DE DADO. Ela sabe exigir que **alguém tenha declarado qual
 * é qual** — e é só isso que este teste faz. **Ele não valida a frase; ele impede a omissão.** É o
 * mesmo mecanismo das isenções de contraste da fatia (a), que exigem `motivo` obrigatório: a
 * diferença entre uma isenção honesta e um limite afrouxado em silêncio está inteiramente no
 * registro.
 *
 * ⚠️ O TEXTO DECLARADO TEM DE SER ESTÁTICO — rótulo, dica, unidade, cabeçalho ou traço de campo,
 * **nunca valor vindo de propriedade**. Um dado vestido de dica é um dado que alguém deixa de ler.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const DIRETORIOS = ["components", "app"];

/** As palavras que uma declaração aceita — o vocabulário do que é estático. */
const O_QUE_VESTE =
  /veste:|rótulo|rotulo|dica|unidade|cabeçalho|cabecalho|traço|traco|desenho|placeholder|separador/i;

type Uso = { readonly arquivo: string; readonly linha: number; readonly texto: string };

function arquivos(): string[] {
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

/**
 * As duas formas em que o token **pinta** alguma coisa: o utilitário e a variável em CSS.
 *
 * ⚠️ AS DUAS CONTAM. Procurar só `--texto-tenue` deixaria passar `text-texto-tenue`, que é como ele
 * de fato aparece em quase todo componente — a mesma meia-verificação que a regra de cor teve até
 * 09/09/2026, quando proibia o literal e deixava a paleta padrão entrar.
 *
 * ⚠️ E **MENÇÃO EM PROSA NÃO É USO**. A primeira versão deste teste reprovou três vezes pelo motivo
 * errado: o cabeçalho do campo explicando a decisão do `FR-032`, um comentário dizendo para usar
 * `--texto-suave` em vez deste, e um título de seção da vitrine. Três frases **sobre** o token, e
 * nenhuma pintando nada. Um teste que confunde as duas coisas ensina a apagar a documentação para
 * ficar verde — exatamente o contrário do que o `FR-031` quer.
 */
const PINTA = /\b(?:text|bg|border|ring|fill|stroke)-texto-tenue\b|var\(--texto-tenue\)/;

/** Apaga o conteúdo dos comentários preservando as quebras de linha — os números não mudam. */
function semComentariosPreservandoLinhas(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (linha) => " ".repeat(linha.length));
}

function usos(): { declarados: Uso[]; semDeclaracao: Uso[] } {
  const declarados: Uso[] = [];
  const semDeclaracao: Uso[] = [];

  for (const caminho of arquivos()) {
    const bruto = readFileSync(caminho, "utf8");
    const linhas = bruto.split(/\r?\n/);
    const linhasSemComentario = semComentariosPreservandoLinhas(bruto).split(/\r?\n/);
    linhas.forEach((texto, i) => {
      if (!PINTA.test(linhasSemComentario[i] ?? "")) return;
      const uso: Uso = {
        arquivo: relative(RAIZ, caminho).replaceAll("\\", "/"),
        linha: i + 1,
        texto: texto.trim(),
      };
      /*
       * ⚠️ A DECLARAÇÃO É NA LINHA DE CIMA, e podem ser até três linhas acima: um comentário de
       * bloco de duas linhas é comum, e exigir exatamente uma linha transformaria a regra num
       * jogo de formatação em vez de numa exigência de registro.
       */
      const acima = linhas.slice(Math.max(0, i - 3), i).join(" ");
      const ehComentario = /\/\/|\/\*|\*/.test(acima);
      if (ehComentario && O_QUE_VESTE.test(acima)) declarados.push(uso);
      else semDeclaracao.push(uso);
    });
  }
  return { declarados, semDeclaracao };
}

describe("`FR-031` · todo uso de `--texto-tenue` declara o que ele veste", () => {
  it("nenhum uso fica sem declaração", () => {
    const { semDeclaracao } = usos();
    const lista = semDeclaracao.map((u) => `${u.arquivo}:${u.linha}`);
    expect(
      lista,
      `uso de --texto-tenue sem declarar o que veste: ${lista.join(", ")}. ` +
        `Escreva na linha acima o que ele pinta — rótulo, dica, unidade, cabeçalho ou traço de ` +
        `campo. Se for VALOR vindo de propriedade, o token está errado: use --texto-suave.`,
    ).toEqual([]);
  });

  it("controle positivo: há uso declarado de verdade", () => {
    // Sem este caso, um repositório que simplesmente não usa o token passaria, e a verificação
    // pareceria cumprida por ausência — que é a forma mais comum de um portão não valer nada.
    const { declarados } = usos();
    expect(
      declarados.length,
      "nenhum uso declarado de --texto-tenue: a varredura não está achando os utilitários",
    ).toBeGreaterThan(3);
  });

  it("o traço do campo é um uso legítimo, e está declarado (`FR-032`)", () => {
    // ⚠️ Ele não é texto, e é por isso que a regra fala em "o que ele veste" e não em "que texto
    // ele pinta". É a pendência B-2 da fatia (a) vencendo aqui.
    const { declarados } = usos();
    const noCampo = declarados.filter((u) => u.arquivo === "components/ui/input.tsx");
    expect(noCampo.length, "o campo perdeu o traço identificador do FR-032").toBeGreaterThan(0);
  });
});
