/**
 * `RN-DIST-01` · **a distribuição semanal da carga horária se calcula num lugar só** (`SC-018`, T018
 * da spec 013).
 *
 * > *"A distribuição da carga horária de uma matéria pelas semanas de sua janela de previsão
 * > (início/término) é calculada por uma única função compartilhada, reaproveitada simultaneamente
 * > pelo Diagrama de Alocação (fonte 2026), pelo bloco "Previsto" do Cronos e, indiretamente, pela
 * > situação semanal do Detalhe Semanal de Aula. **Não pode existir uma segunda implementação** desse
 * > cálculo em paralelo — qualquer ajuste futuro deve mudar essa função única, refletindo
 * > automaticamente nos três módulos."*
 * > — documento 04, `RN-DIST-01`, *Risco: Alto*
 *
 * ⚠️ **ELA É A GUARDA IRMÃ DE `andamento-unico.test.ts`, E ESTÁ NO MOLDE DELE DE PROPÓSITO.** Aquela
 * nasceu de um defeito que viveu na `main` por 23 dias — a tela decidindo *"em atraso"* por conta
 * própria —, e o que o fez durar não foi falta de regra: foi não haver nada a comparar, porque o
 * cálculo existia **uma** vez e por acidente estava no lugar errado. Aqui a regra é **nominal** e de
 * *Risco: Alto*, e o convite a copiar é concreto: o Épico 7 (Cronograma) e o Épico 6 (DSA) precisam
 * do **mesmo** previsto semanal, em telas diferentes, em datas diferentes.
 *
 * ⚠️ **O QUE ELA MEDE NÃO É «NÃO ESCREVA ISTO»: É «SÓ UM LUGAR CALCULA».** Qualquer arquivo pode
 * **importar**, **somar**, **exibir** e **comparar** o previsto semanal; o que ele não pode é
 * **reparti-lo** — e o que distingue as duas coisas são os dois sinais de `calculosEm`, abaixo, que
 * procuram quem **divide carga por semanas** e quem **manda o resto para a última semana**.
 *
 * ⚠️ **COM OS DOIS CONTROLES, porque varredura que não acha nada passa igual quando está cega**
 * (lição do `sem-convite-nem-envio-de-email.test.ts`): o **positivo** exige que a varredura enxergue
 * o repositório **e** reconheça o próprio `distribuicao-semanal.ts` como implementador — se ela
 * deixar de reconhecê-lo, não reconheceria cópia nenhuma; o **negativo** exige que quem apenas
 * **importa** do módulo **não** seja contado, que é o modo de falha que transformaria esta guarda em
 * estorvo e ensinaria a desligá-la.
 *
 * ⚠️ **E ELA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1 do `CLAUDE.md`: *"Uso mencionado não é uso"*).
 * O próprio `distribuicao-semanal.ts` cita a fórmula **em prosa** sete vezes para explicar por que o
 * resto vai na última semana, e os consumidores vão citá-la também — uma varredura ingênua leria a
 * explicação como a violação. Esta base já reprovou **três** verificações exatamente assim, e o modo
 * de falha é o pior de todos: ele ensina a **apagar a documentação** para ficar verde.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/**
 * O único lugar autorizado a calcular.
 *
 * ⚠️ **ELE MORA FORA DE `lib/dominio/dsa/` DE PROPÓSITO** — é de três módulos (Cronograma, Cronos e,
 * indiretamente, o DSA), e o endereço é o que o documento 04 fixa na linha da própria regra.
 */
const MODULO = "lib/dominio/distribuicao-semanal.ts";

/** Este arquivo sai da varredura: os padrões proibidos estão escritos nele, como amostra. */
const ESTE_ARQUIVO = "distribuicao-unica.test.ts";

const PASTAS = ["app", "lib", "components"] as const;
const EXTENSOES = /\.(ts|tsx)$/;

/**
 * **Sinal 1 — dividir carga horária por quantidade de semanas.** É a primeira metade da conta, e a
 * que ninguém consegue escrever sem estar reimplementando a regra.
 *
 * ⚠️ **AS DUAS PONTAS DA DIVISÃO SÃO CONFERIDAS, e é isso que separa a guarda útil da chata:**
 * procurar só `/ semanas` acusaria qualquer média por semana (a carga do instrutor, por exemplo), e
 * procurar só `carga /` acusaria toda divisão de CH que existir. O que caracteriza **esta** regra é a
 * conjunção: **carga em cima, semana embaixo**. Medido em 05/10/2026 sobre `app`, `lib` e
 * `components`: o sinal fecha em **um** arquivo, o módulo autorizado.
 *
 * ⚠️ **EMBAIXO A PALAVRA É EXIGIDA NO PLURAL, e a razão é um falso positivo que ainda não aconteceu:**
 * rótulo de tela em português escreve `h/semana` e `TA/semana` no **singular**, e a barra ali é
 * tipografia, não divisão. Quem **conta** semanas escreve `semanas.length`, `totalDeSemanas`,
 * `numeroDeSemanas` — sempre no plural. O sinal segue a contagem, não o rótulo.
 */
const DIVISAO =
  /([A-Za-z_$][\w$]*(?:\??\.[\w$]+|\[[^\]]*\])*)\s*\/\s*([A-Za-z_$][\w$]*(?:\??\.[\w$]+|\[[^\]]*\])*)/g;
const EM_CIMA_E_CARGA = /ch|carga|tempo|hora/i;
const EMBAIXO_E_SEMANA = /semanas/i;

/**
 * **Sinal 2 — o índice da última semana.** É a segunda metade da `RN-DIST-02` (*"a última semana da
 * janela sempre recebe o resto"*), e quem escreve `semanas.length - 1` está apontando para a semana
 * que recebe a diferença.
 *
 * ⚠️ **ELE EXISTE PORQUE A DIVISÃO PODE SER DISFARÇADA, A PONTA NÃO.** Uma segunda implementação que
 * acumulasse em laço em vez de dividir escaparia do sinal 1 — mas não escaparia de ter de decidir
 * **onde** cai o resto, que é justamente a aresta em que duas cópias divergem sem ninguém notar.
 */
const ULTIMA_SEMANA = /semanas?(?:\??\.length)\s*-\s*1/gi;

/** Comentário de bloco e de linha saem antes de qualquer contagem (regra 9.1.1). */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Os trechos em que o código **calcula** a distribuição, em vez de consumi-la.
 *
 * ⚠️ **IMPORTAR NÃO É SINAL, E NÃO PODE SER** — `lib/dominio/dsa/numero-do-dsa.ts` importa
 * `IdentidadeDaSemana` daqui e está **certo**; é o que a regra quer que todo mundo faça. O que esta
 * função procura é a **conta**, não a menção.
 */
function calculosEm(codigo: string): readonly string[] {
  const limpo = semComentario(codigo);

  const divisoes = [...limpo.matchAll(DIVISAO)]
    .filter((m) => EM_CIMA_E_CARGA.test(m[1] ?? "") && EMBAIXO_E_SEMANA.test(m[2] ?? ""))
    .map((m) => m[0].trim());

  const pontas = [...limpo.matchAll(ULTIMA_SEMANA)].map((m) => m[0].trim());

  return [...divisoes, ...pontas];
}

function calculosNoArquivo(arquivo: string): readonly string[] {
  return calculosEm(readFileSync(resolve(RAIZ, arquivo), "utf8"));
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

/** O consumidor real que **só** importa — e que, por isso, não pode ser contado. */
const SO_IMPORTA = "lib/dominio/dsa/numero-do-dsa.ts";

/** Uma segunda implementação plausível, escrita à mão, para provar que o reconhecedor reconhece. */
const COPIA_SINTETICA = `
  const semanas = semanasEntre(disciplina.previsao_inicio, disciplina.previsao_termino);
  const porSemana = Math.floor(disciplina.carga_horaria_tempos / semanas.length);
  const ultima = semanas.length - 1;
`;

/** Um consumidor sintético: importa, soma e exibe — e não calcula nada. */
const CONSUMO_SINTETICO = `
  import { distribuirPorSemana } from "@/lib/dominio/distribuicao-semanal";
  const previsto = distribuirPorSemana({ inicio, termino, chTempos });
  const total = previsto.reduce((soma, semana) => soma + semana.ta, 0);
  const media = total / diasUteis;
`;

describe("`RN-DIST-01` · CONTROLE POSITIVO · a varredura enxerga o repositório", () => {
  it("⚠️ ela acha arquivos, e acha o módulo entre eles", () => {
    expect(TODOS.length, "a varredura não achou arquivo nenhum: ela está cega").toBeGreaterThan(50);
    expect(
      TODOS,
      `${MODULO} saiu da varredura: ou foi renomeado, ou a lista de pastas encolheu`,
    ).toContain(MODULO);
  });

  it("⚠️ ela reconhece o módulo autorizado como implementador", () => {
    expect(
      calculosNoArquivo(MODULO).length,
      `${MODULO} parou de ser reconhecido como quem calcula. Se a varredura não enxerga a ` +
        "implementação de verdade, ela não enxergaria cópia nenhuma — o conserto é o padrão, não " +
        "o módulo",
    ).toBeGreaterThan(0);
  });

  it("⚠️ ela reconhece uma cópia escrita à mão", () => {
    expect(
      calculosEm(COPIA_SINTETICA).length,
      "o reconhecedor deixou de ver uma segunda implementação óbvia: carga dividida por " +
        "`semanas.length` mais o índice da última semana",
    ).toBeGreaterThan(0);
  });
});

describe("`RN-DIST-01` · CONTROLE NEGATIVO · quem só importa está certo", () => {
  it(`${SO_IMPORTA} importa do módulo e NÃO é contado`, () => {
    const codigo = semComentario(readFileSync(resolve(RAIZ, SO_IMPORTA), "utf8"));
    expect(
      /from "@\/lib\/dominio\/distribuicao-semanal"/.test(codigo),
      "o consumidor parou de importar do módulo — ou ele mudou de nome, ou passou a resolver a " +
        "semana por conta própria",
    ).toBe(true);
    expect(calculosNoArquivo(SO_IMPORTA)).toEqual([]);
  });

  it("⚠️ importar, somar e exibir não é calcular", () => {
    expect(
      calculosEm(CONSUMO_SINTETICO),
      "a varredura passou a acusar quem CONSUMA a distribuição. Guarda que reprova o conserto " +
        "ensina a desligar a guarda: o sinal confere as DUAS pontas da divisão (carga em cima, " +
        "semana embaixo) justamente para não pegar média por dia útil nem soma de previsto",
    ).toEqual([]);
  });
});

describe("`RN-DIST-01` · só `lib/dominio/distribuicao-semanal.ts` CALCULA a distribuição", () => {
  it("⚠️ nenhum outro arquivo reparte carga horária por semana", () => {
    const infratores = TODOS.filter((arquivo) => arquivo !== MODULO)
      .map((arquivo) => ({ arquivo, calculos: calculosNoArquivo(arquivo) }))
      .filter((r) => r.calculos.length > 0)
      .map((r) => `${r.arquivo} (${r.calculos.join(" | ")})`);

    expect(
      infratores,
      `estes arquivos calculam a distribuição semanal por conta própria, e a \`RN-DIST-01\` ` +
        `proíbe isso nominalmente: ${infratores.join(", ")}. ⚠️ O conserto é IMPORTAR de ` +
        `@/lib/dominio/distribuicao-semanal em vez de recalcular — \`distribuirPorSemana\` para a ` +
        `janela inteira, \`previstoDaSemana\` para uma semana só. O previsto do Cronograma, o do ` +
        `Cronos e a situação semanal do DSA têm de sair do MESMO lugar: duas cópias não divergem ` +
        `no caso comum, divergem na aresta (o resto da última semana), e aí ninguém descobre por quê.`,
    ).toEqual([]);
  });
});
