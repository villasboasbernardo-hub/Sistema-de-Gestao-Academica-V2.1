/**
 * `SC-007` · **a palavra que a conversa usa não entra no produto** (Glossário 07, `D-NAV-4`).
 *
 * ⚠️ **O TERMO VARRIDO AQUI É O APELIDO INFORMAL DA FOLGA DE CAPACIDADE, e ele NÃO é normativo.** O
 * Glossário 07 é explícito: *Tempo Reserva (TR)* é a reserva de 10% da CHR, uma grandeza com
 * fundamento, e o indicador da tela chama-se **"Saldo de capacidade (TA)"**. O apelido descreve a
 * mesma ideia na conversa do dia a dia e **não** descreve nenhuma das duas com precisão — ele some
 * exatamente onde a imprecisão custa: schema, código, interface e documento.
 *
 * ⚠️ **ESTA GUARDA NÃO É ZELO DE ESTILO, E A RAZÃO É O QUE JÁ ACONTECEU NESTA BASE.** Termo informal
 * que entra no código vira **nome de coluna** e **rótulo de tela**, e depois sai de lá por migration
 * e por retreinamento de quem usa. O Épico 3 pagou isso com o perfil em `snake_case` aparecendo no
 * cabeçalho de **toda** tela; a diferença é que ali o defeito era visível e aqui ele seria aceito.
 *
 * ⚠️ **A VARREDURA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1), e isso é o oposto de uma concessão: a
 * palavra **precisa** poder ser escrita em comentário e em spec, porque é assim que se explica por
 * que ela não está no código. Varredura que conta a explicação como violação ensina a apagar a
 * explicação — foi o que três verificações do Épico 4 fizeram.
 *
 * ⚠️ **COM CONTROLE POSITIVO: o nome CERTO tem de existir na ficha.** Zero ocorrências do termo
 * errado é o mesmo resultado de uma varredura cega e de um sistema que não fala de capacidade
 * nenhuma — e os dois passariam sem o controle.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/** Este arquivo sai da própria varredura: o termo proibido está escrito nele. */
const ESTE_ARQUIVO = "vocabulario-proibido.test.ts";

const PASTAS = ["app", "lib", "components", "supabase", "tests"] as const;
const EXTENSOES = /\.(ts|tsx|sql|mjs|js)$/;

/**
 * O termo proibido, e o que escrever em vez dele.
 *
 * ⚠️ **ELE É MONTADO POR CONCATENAÇÃO DE PROPÓSITO.** Escrito inteiro, numa linha de código, ele
 * seria encontrado por qualquer busca que alguém fizesse no repositório procurando a violação — e o
 * primeiro resultado seria o arquivo que existe para impedi-la. Já aconteceu aqui: a varredura de
 * convite por e-mail precisou excluir a si mesma pelo nome.
 */
const PROIBIDO = "gord" + "ura";

/** O que o indicador se chama — e onde ele **tem** de aparecer. */
const CERTO = "Saldo de capacidade";
const ONDE_O_CERTO_VIVE = "app/(app)/turmas/[turma]/SecaoDeAndamento.tsx";

function semComentario(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*--.*$/gm, "");
}

function arquivosDe(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = resolve(caminho, nome);
    if (nome === "node_modules" || nome === ".next" || nome === "test-results") return [];
    if (statSync(completo).isDirectory()) return arquivosDe(relative(RAIZ, completo));
    return EXTENSOES.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

const TODOS = PASTAS.flatMap(arquivosDe).filter((a) => !a.endsWith(ESTE_ARQUIVO));

describe("`SC-007` · a varredura enxerga o repositório", () => {
  it("⚠️ CONTROLE · ela acha arquivos nas cinco pastas", () => {
    expect(TODOS.length, "a varredura não achou arquivo nenhum: ela está cega").toBeGreaterThan(
      100,
    );
    for (const pasta of PASTAS) {
      expect(
        TODOS.some((a) => a.startsWith(`${pasta}/`)),
        `nenhum arquivo em ${pasta}/: a pasta mudou de nome e a varredura emudeceu`,
      ).toBe(true);
    }
  });
});

describe("`SC-007` · o termo informal não aparece em código, schema nem tela", () => {
  it("⚠️ zero ocorrências fora de comentário", () => {
    const infratores = TODOS.filter((arquivo) =>
      semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8"))
        .toLowerCase()
        .includes(PROIBIDO),
    );

    expect(
      infratores,
      `o termo informal entrou no produto, em: ${infratores.join(", ")}. O Glossário 07 não o ` +
        `reconhece; o indicador chama-se "${CERTO} (TA)" e a reserva normativa é o Tempo ` +
        `Reserva (TR). Em comentário e em spec ele pode ficar — é lá que se explica por que ele ` +
        `não está no código.`,
    ).toEqual([]);
  });
});

describe("`SC-007` · CONTROLE POSITIVO · o nome certo está na ficha", () => {
  it(`"${CERTO}" aparece na seção Andamento`, () => {
    const codigo = readFileSync(resolve(RAIZ, ONDE_O_CERTO_VIVE), "utf8");
    expect(
      codigo.includes(CERTO),
      "o rótulo do indicador sumiu da ficha: ou ele foi renomeado, ou a seção saiu — e nos dois " +
        "casos a varredura acima passa a medir a ausência do assunto, não a ausência do termo errado",
    ).toBe(true);
  });
});
