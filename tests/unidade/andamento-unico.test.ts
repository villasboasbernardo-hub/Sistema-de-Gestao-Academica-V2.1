/**
 * `SC-006` · **o andamento da turma se calcula num lugar só** (`FR-031.2`, `RF-INI-01`).
 *
 * ⚠️ **ESTA GUARDA NASCEU DE UM DEFEITO QUE VIVEU NA `main` POR 23 DIAS.** O painel do `/inicio`
 * decidia *"em atraso"* por conta própria, com `previstos − executados < 0` — fórmula que dispara no
 * **excesso** e nunca no atraso —, enquanto a regra do `RF-INI-01` fala de **saldo de capacidade**:
 * dias úteis até o término vezes o TA/dia da modalidade da turma. Nenhum teste reprovava, porque não
 * havia nada a comparar: o cálculo existia **uma** vez, e por acidente estava na tela.
 *
 * ⚠️ **O QUE ELA MEDE NÃO É «NÃO ESCREVA ISTO»: É «SÓ UM LUGAR DECIDE».** Qualquer arquivo pode
 * **ler**, **repassar** e **contar** `emAtraso`; o que ele não pode é **decidi-lo** — e o que
 * distingue as duas coisas está escrito em `decideOVeredito`, abaixo.
 *
 * ⚠️ **COM CONTROLE POSITIVO, porque varredura que não acha nada passa igual quando está cega**
 * (lição do `sem-convite-nem-envio-de-email.test.ts`): os dois consumidores reais **têm** de importar
 * o módulo, e o módulo **tem** de atribuir o campo.
 *
 * ⚠️ **E ELA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1): este arquivo e os dois consumidores explicam
 * o defeito antigo citando a fórmula errada, e uma varredura ingênua leria a explicação como a
 * violação — o modo de falha que ensina a apagar a documentação para ficar verde.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/** O único lugar autorizado a decidir. */
const MODULO = "lib/dominio/andamento-da-turma.ts";

/** Este arquivo sai da varredura: os padrões proibidos estão escritos nele. */
const ESTE_ARQUIVO = "andamento-unico.test.ts";

const PASTAS = ["app", "lib", "components"] as const;
const EXTENSOES = /\.(ts|tsx)$/;

/**
 * Os dois consumidores que **têm** de importar o módulo — o controle positivo.
 *
 * ⚠️ **SÃO ESTES DOIS PORQUE SÃO OS DOIS LUGARES ONDE O VEREDITO APARECE NA TELA**: a tarja do
 * painel do Início e a seção Andamento da ficha da turma. Um terceiro consumidor é bem-vindo; o que
 * esta lista impede é um deles **deixar** de usar o módulo e voltar a decidir sozinho.
 */
const CONSUMIDORES = ["app/(app)/inicio/panorama.ts", "app/(app)/turmas/[turma]/page.tsx"] as const;

/** Toda escrita no nome do campo — anotação de tipo, repasse e decisão, as três. */
const ESCRITAS = /\bemAtraso\s*[:=]\s*([^,;\n]*)/g;

/**
 * O valor atribuído **decide** o veredito, em vez de repassá-lo?
 *
 * ⚠️ **ESTA FUNÇÃO SEPARA A GUARDA ÚTIL DA GUARDA CHATA, E ELA REPROVOU DUAS VEZES ANTES DE ACERTAR**
 * (04/10/2026, medido nas duas): o padrão inicial acusou `emAtraso: andamento.emAtraso` em
 * `panorama.ts` — que é **repasse** do módulo, exatamente o que esta fatia construiu — e depois
 * acusou `emAtraso: panorama.filter((t) => t.emAtraso).length` em `totaisDo`, que é **contagem** de
 * vereditos já decididos. ⚠️ **Uma guarda que reprova o conserto ensina a desligar a guarda**, e foi
 * por isso que o critério deixou de ser sintático e passou a ser o que de fato distingue os dois:
 *
 * | O valor… | Exemplo | Veredito |
 * |---|---|---|
 * | é o tipo | `readonly emAtraso: boolean` | declara, não calcula |
 * | só **lê** o campo de alguém | `andamento.emAtraso`, `panorama.filter((t) => t.emAtraso).length` | repassa ou conta |
 * | tem **comparação ou lógica** | `status === "ativa" && saldo < 0` | **decide** |
 * | não lê o campo de ninguém | `false`, `restante < 0` | **decide** |
 *
 * ⚠️ **A SETA DA FUNÇÃO ANÔNIMA É RETIRADA ANTES DA CONTA** — `=>` traz um `>` e um `=` que não são
 * comparação, e sem tirá-la toda contagem com `filter` seria lida como decisão.
 */
function decideOVeredito(valor: string): boolean {
  const limpo = valor.trim();
  if (limpo === "boolean") return false;

  const semLeituras = limpo.replace(/[A-Za-z_$][\w$]*\??\.emAtraso/g, "").replaceAll("=>", "");
  if (/[<>!]|&&|\|\|/.test(semLeituras)) return true;

  return !limpo.includes(".emAtraso");
}

/** Os lugares onde o arquivo DECIDE o veredito, em vez de repassá-lo. */
function decisoesEm(arquivo: string): string[] {
  const codigo = semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8"));
  return [...codigo.matchAll(ESCRITAS)]
    .map((m) => m[1] ?? "")
    .filter((valor) => decideOVeredito(valor))
    .map((valor) => valor.trim());
}

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

const TODOS = PASTAS.flatMap(arquivosDe).filter((a) => !a.endsWith(ESTE_ARQUIVO));

describe("`SC-006` · a varredura enxerga o repositório", () => {
  it("⚠️ CONTROLE · ela acha arquivos, e acha o módulo entre eles", () => {
    expect(TODOS.length, "a varredura não achou arquivo nenhum: ela está cega").toBeGreaterThan(50);
    expect(TODOS).toContain(MODULO);
  });
});

describe("`SC-006` · só `lib/dominio/andamento-da-turma.ts` ATRIBUI `emAtraso`", () => {
  it("o módulo decide — e a decisão olha o `status` da turma", () => {
    const decisoes = decisoesEm(MODULO);
    expect(
      decisoes.length,
      "o módulo deixou de decidir `emAtraso`: ou ele foi renomeado, ou a regra mudou de lugar",
    ).toBeGreaterThan(0);
    expect(
      decisoes.some((d) => d.includes("status")),
      'a decisão parou de olhar o `status`, e o `RF-INI-01` escreve "em ANDAMENTO com saldo ' +
        'negativo": sem ele, turma concluída e cancelada passam a aparecer na região de alertas',
    ).toBe(true);
  });

  it("⚠️ e NENHUM outro arquivo decide — repassar é permitido, decidir não", () => {
    const infratores = TODOS.filter((arquivo) => arquivo !== MODULO)
      .map((arquivo) => ({ arquivo, decisoes: decisoesEm(arquivo) }))
      .filter((r) => r.decisoes.length > 0)
      .map((r) => `${r.arquivo} (${r.decisoes.join(" | ")})`);

    expect(
      infratores,
      `estes arquivos decidem "em atraso" por conta própria, e é exatamente o defeito do painel ` +
        `antigo: ${infratores.join(", ")}. O veredito sai de ${MODULO}, que lê término, feriado e ` +
        `TA/dia — quem recalcula aqui vai esquecer um dos três.`,
    ).toEqual([]);
  });
});

describe("`SC-006` · CONTROLE POSITIVO · os dois consumidores importam o módulo", () => {
  it.each(CONSUMIDORES)("%s importa `andamento-da-turma`", (arquivo) => {
    const codigo = semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8"));
    expect(
      /from "@\/lib\/dominio\/andamento-da-turma"/.test(codigo),
      "o consumidor parou de importar o módulo: ou ele deixou de mostrar o veredito, ou voltou a " +
        "calculá-lo por outro nome — e a varredura acima só pega o nome `emAtraso`",
    ).toBe(true);
  });
});
