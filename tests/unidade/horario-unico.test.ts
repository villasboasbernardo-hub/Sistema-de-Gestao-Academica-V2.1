/**
 * `RF-HOR-06` · **o relógio do Tempo de Aula se calcula num lugar só** (`RN-CONF-02`, `SC-011`).
 *
 * > *"O Detalhe Semanal de Aula deve exibir, para cada tempo de aula, o **horário de início e de
 * > término**, além de indicação visual dos intervalos e da janela de almoço."*
 * > — `RF-HOR-06`, documento 02 da Fase 1
 *
 * ⚠️ **É A MESMA PROTEÇÃO QUE A `RN-ANT-01` TEM PARA A ANTIGUIDADE E A `SC-006` PARA O ANDAMENTO:
 * PONTO ÚNICO.** Um segundo cálculo de horário não daria erro nenhum — ele divergiria em **minutos**,
 * e o DSA **impresso** sairia com hora errada. E o papel é o produto: não há tela que acuse.
 *
 * ⚠️ **E A DIVERGÊNCIA JÁ ESTÁ MEDIDA NA BASE, o que torna o risco concreto:** há **duas** fontes de
 * relógio — o regime do curso e o catálogo `horarios_tempos_aula` — e elas **não concordam** (as
 * cinco configurações do catálogo começam 08:00; as grades reais da operação, 07:50 e 08:10). A
 * precedência entre as duas mora em `relogioDaSemana`, e quem calculasse horário por fora estaria
 * **escolhendo uma fonte sem saber que escolhia**.
 *
 * ⚠️ **O QUE ELA MEDE NÃO É «NÃO ESCREVA HORA»: É «SÓ UM LUGAR CALCULA».** Ler, repassar, exibir e
 * contar o que o módulo devolveu é **certo**, e **quem apenas importa de
 * `@/lib/dominio/dsa/horario-do-bloco` nunca é contado**. O que a varredura procura é **aritmética de
 * horário**: somar duração ou intervalo a uma hora, converter `HH:MM` em minutos, montar `HH:MM` com
 * `padStart`, ou usar `Date`/`Intl` como relógio.
 *
 * ⚠️ **COM CONTROLE POSITIVO E CONTROLE NEGATIVO, e os dois por motivo medido neste projeto:** sem o
 * positivo, uma varredura cega — caminho trocado, regex que nunca casa — passaria igual a uma que
 * funciona (lição do `sem-convite-nem-envio-de-email.test.ts`); sem o negativo, uma guarda que acusa
 * o consumidor legítimo **ensina a desligar a guarda** (lição do `decideOVeredito` do
 * `andamento-unico.test.ts`, que reprovou duas vezes antes de acertar).
 *
 * ⚠️ **ELA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1): este arquivo e o módulo escrevem `* 60`,
 * `padStart` e `12:00` em prosa o tempo todo, e uma varredura ingênua leria a explicação como a
 * violação — o modo de falha que ensina a apagar a documentação para ficar verde.
 *
 * ⚠️ **`tests/` FICA FORA DA VARREDURA, de propósito.** O que vive lá é **valor medido escrito à
 * mão** — `tests/unidade/dsa/relogio-real.ts` declara `07:50-08:35` porque foi assim que a planilha
 * foi medida. Um teste que **calculasse** a hora esperada não provaria nada, e isso é matéria de
 * revisão, não de varredura: proibir hora literal em teste é proibir exatamente a prova que serve.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/** O único lugar autorizado a calcular horário de TA. */
const MODULO = "lib/dominio/dsa/horario-do-bloco.ts";

/**
 * Isento **nominal**: ele formata **data** e **instante** (`timestamptz`), nunca horário de TA.
 *
 * ⚠️ **A ISENÇÃO CARREGA PESO, e há um caso que a exige:** `instanteComHoraParaLeitura` pede
 * `hour: "2-digit"` ao `Intl` para escrever o *último acesso* de uma conta — uso legítimo de `Date`,
 * porque o valor **é** um instante. O controle do fim do arquivo prova que é só isso que o acusaria.
 */
const ISENTOS: readonly string[] = ["lib/formato/data.ts"];

/** Este arquivo sai da varredura: todos os padrões proibidos estão escritos nele. */
const ESTE_ARQUIVO = "horario-unico.test.ts";

const PASTAS = ["app", "lib", "components"] as const;
const EXTENSOES = /\.(ts|tsx)$/;

/**
 * Os campos de `curso_regime_historico` que **só** existem para construir o relógio.
 *
 * Mencioná-los é normal — o formulário de vigência os edita e a seção de regime os exibe. O que a
 * guarda procura é vê-los **somados** a uma hora.
 */
const CAMPOS_DO_RELOGIO =
  "taDuracaoMin|ta_duracao_min|intervaloManhaMin|intervalo_manha_min|intervaloTardeMin|intervalo_tarde_min";

/**
 * Soma ou subtração em que um desses campos é operando — `cursor + regime.taDuracaoMin`.
 *
 * ⚠️ **O ESPAÇO EM VOLTA DO OPERADOR É EXIGIDO, e é ele que separa a soma do nome com hífen.** O
 * repositório é formatado por `prettier`, que impõe espaço em torno de operador binário; já
 * `"algo-ta_duracao_min"` dentro de uma string **não** tem espaço. Sem essa exigência, um atributo
 * hifenizado seria acusado de fazer conta — e guarda que acusa string não sobrevive à primeira tela.
 */
const SOMA_DE_DURACAO = new RegExp(
  `[\\w$)\\]]\\s+[+-]=?\\s+(?:[\\w$.?]+\\.)?(?:${CAMPOS_DO_RELOGIO})\\b` +
    `|\\b(?:[\\w$.?]+\\.)?(?:${CAMPOS_DO_RELOGIO})\\b\\s+[+-]=?\\s+(?![$"'\`])[\\w$(]`,
  "g",
);

/** `HH:MM` → minutos: `h * 60 + m`, ou quebrar a hora no dois-pontos. */
const CONVERSAO_PARA_MINUTOS = /\*\s*60\s*[+-]|\.split\(\s*["']:["']\s*\)/g;

/** Dois dígitos com zero à esquerda… */
const PAD_DOIS_DIGITOS = /padStart\(\s*2\s*,\s*["']0["']\s*\)/;

/** …**unidos por dois-pontos**, que é o que distingue montar `HH:MM` de alinhar um número. */
const SEPARADOR_DE_HORA = /\}\s*:|:\s*\$\{|["']:["']/;

/**
 * `Date`/`Intl` usados como relógio.
 *
 * ⚠️ **ESTE PADRÃO EXISTE PORQUE O SEGUNDO CÁLCULO NÃO PRECISA SER ARITMÉTICO:** quem não quisesse
 * somar minutos chegaria à mesma hora errada por `setMinutes` ou por `toLocaleTimeString`. Medido em
 * 05/10/2026: **nenhuma** ocorrência em `app/`, `lib/` e `components/` fora do isento.
 */
const DATE_COMO_RELOGIO =
  /\.(?:getHours|getMinutes|setHours|setMinutes|toLocaleTimeString)\(|timeStyle|hour:\s*["']2-digit["']/g;

type Padrao = {
  readonly nome: string;
  /** Os trechos do código em que o padrão aparece. */
  readonly achar: (codigo: string) => readonly string[];
};

function porRegex(expressao: RegExp): (codigo: string) => readonly string[] {
  return (codigo) => [...codigo.matchAll(expressao)].map((casamento) => casamento[0].trim());
}

/** A montagem é por LINHA: `padStart` e o dois-pontos têm de estar na mesma expressão. */
function montagemDeHora(codigo: string): readonly string[] {
  return codigo
    .split("\n")
    .filter((linha) => PAD_DOIS_DIGITOS.test(linha) && SEPARADOR_DE_HORA.test(linha))
    .map((linha) => linha.trim());
}

const PADROES: readonly Padrao[] = [
  { nome: "soma duração ou intervalo de TA a uma hora", achar: porRegex(SOMA_DE_DURACAO) },
  { nome: "converte HH:MM em minutos", achar: porRegex(CONVERSAO_PARA_MINUTOS) },
  { nome: "monta HH:MM com padStart", achar: montagemDeHora },
  { nome: "usa `Date`/`Intl` como relógio", achar: porRegex(DATE_COMO_RELOGIO) },
];

type Achado = { readonly padrao: string; readonly trecho: string };

/** Tira bloco de comentário e `//…`, preservando `https://` — a regra governa o código executável. */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function aritmeticaNoCodigo(fonte: string): readonly Achado[] {
  const codigo = semComentario(fonte);
  return PADROES.flatMap((padrao) =>
    padrao.achar(codigo).map((trecho) => ({ padrao: padrao.nome, trecho })),
  );
}

function aritmeticaEm(arquivo: string): readonly Achado[] {
  return aritmeticaNoCodigo(readFileSync(resolve(RAIZ, arquivo), "utf8"));
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

const TODOS = PASTAS.flatMap(arquivosDe).filter((arquivo) => !arquivo.endsWith(ESTE_ARQUIVO));

/** As formas reais de calcular horário — se uma delas deixar de casar, a guarda está cega. */
const AMOSTRAS_QUE_CALCULAM = [
  ["soma de duração", "const fim = cursor + regime.taDuracaoMin;"],
  ["soma de intervalo", "cursor = fim + regime.intervaloTardeMin;"],
  ["conversão para minutos", "const minutos = Number(hora) * 60 + Number(minuto);"],
  [
    "montagem de HH:MM",
    'const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;',
  ],
  ["Date como relógio", "const fim = new Date(inicio);\nfim.setMinutes(fim.getMinutes() + 45);"],
] as const;

/** As formas LEGÍTIMAS — e cada uma existe hoje, em arquivo real, por isso não são hipóteses. */
const AMOSTRAS_LEGITIMAS = [
  [
    "só importa e usa",
    'import { trechosDoBloco } from "@/lib/dominio/dsa/horario-do-bloco";\n' +
      "const trechos = trechosDoBloco(relogio, 3, 4);",
  ],
  ["exibe o campo", 'const linha = { nome: "TA", valor: `${v.taDuracaoMin} min` };'],
  ["repassa o campo", "taDuracaoMin: Number(v.ta_duracao_min),"],
  [
    "valida o formato da hora",
    'hora_inicio_manha: z.string().regex(/^\\d{2}:\\d{2}(:\\d{2})?$/, "Hora inválida."),',
  ],
  [
    "escreve prosa sobre o assunto",
    '// aqui se somaria cursor + regime.taDuracaoMin e se montaria HH:MM com padStart(2, "0")',
  ],
] as const;

describe("`RF-HOR-06` · a varredura enxerga o repositório", () => {
  it("⚠️ CONTROLE · ela acha arquivos, e acha o módulo entre eles", () => {
    expect(TODOS.length, "a varredura não achou arquivo nenhum: ela está cega").toBeGreaterThan(50);
    expect(TODOS).toContain(MODULO);
  });
});

describe("`RF-HOR-06` · CONTROLE POSITIVO · cada padrão casa a forma que existe para pegar", () => {
  it.each(AMOSTRAS_QUE_CALCULAM)("%s é aritmética de horário", (_nome, amostra) => {
    expect(
      aritmeticaNoCodigo(amostra).length,
      `esta forma de calcular horário deixou de ser reconhecida: ${amostra}`,
    ).toBeGreaterThan(0);
  });
});

describe("`RF-HOR-06` · CONTROLE NEGATIVO · ler, exibir e importar NÃO é calcular", () => {
  it.each(AMOSTRAS_LEGITIMAS)("%s não é acusado", (_nome, amostra) => {
    expect(
      aritmeticaNoCodigo(amostra),
      "a guarda acusou o uso legítimo, e guarda que reprova o conserto ensina a desligar a guarda",
    ).toEqual([]);
  });
});

describe("`RF-HOR-06` · só `lib/dominio/dsa/horario-do-bloco.ts` calcula horário de TA", () => {
  it("o módulo calcula — e monta a hora com os dois dígitos", () => {
    const achados = aritmeticaEm(MODULO);
    expect(
      achados.length,
      "o módulo deixou de calcular horário: ou ele foi renomeado, ou o relógio mudou de lugar — e " +
        "neste segundo caso é esta constante que tem de mudar, não a guarda",
    ).toBeGreaterThan(1);
    expect(
      achados.some((achado) => achado.padrao.includes("padStart")),
      "o módulo parou de montar HH:MM: é a assinatura de quem PRODUZ horário, e sem ela a " +
        "varredura pode estar procurando uma forma que ninguém usa mais",
    ).toBe(true);
  });

  it("⚠️ e NENHUM outro arquivo calcula — importar, ler e exibir é permitido", () => {
    const infratores = TODOS.filter((arquivo) => arquivo !== MODULO && !ISENTOS.includes(arquivo))
      .map((arquivo) => ({ arquivo, achados: aritmeticaEm(arquivo) }))
      .filter((registro) => registro.achados.length > 0)
      .map(
        (registro) =>
          `${registro.arquivo} → ${registro.achados
            .map((achado) => `${achado.padrao}: ${achado.trecho}`)
            .join(" | ")}`,
      );

    expect(
      infratores,
      `estes arquivos calculam horário de TA por conta própria:\n  ${infratores.join("\n  ")}\n` +
        `O conserto é importar de @/lib/dominio/dsa/horario-do-bloco — relogioDaSemana, ` +
        `tempoDeAula ou trechosDoBloco — e usar o que ele devolve. Um segundo cálculo não dá erro: ` +
        `ele diverge em minutos, e o DSA impresso sai com hora errada. Se o relógio precisar mudar ` +
        `de casa, mude ${MODULO} e a constante desta guarda.`,
    ).toEqual([]);
  });
});

/**
 * ⚠️ **ESTES TRÊS SÃO O CONTROLE NEGATIVO EM CÓDIGO REAL, não em amostra.** Eles leem, convertem e
 * exibem `ta_duracao_min` e os dois intervalos — é o formulário de vigência do curso e a seção que o
 * mostra — e **nenhum** deles pode ser acusado. A primeira asserção é o controle do controle: se o
 * arquivo deixar de mencionar o campo, ele parou de ser a prova que esta lista promete.
 */
const CONSUMIDORES_LEGITIMOS = [
  "app/(app)/cursos/[curso]/editar/consulta.ts",
  "app/(app)/cursos/[curso]/editar/SecaoDeRegime.tsx",
  "lib/dominio/vigencia-de-regime.ts",
] as const;

describe("`RF-HOR-06` · CONTROLE NEGATIVO em código real · quem só lê o regime não é contado", () => {
  it.each(CONSUMIDORES_LEGITIMOS)("%s lê os campos do relógio e não calcula", (arquivo) => {
    const codigo = semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8"));
    expect(
      /taDuracaoMin|ta_duracao_min/.test(codigo),
      "este arquivo deixou de mencionar a duração do TA: ele não serve mais de controle negativo",
    ).toBe(true);
    expect(aritmeticaEm(arquivo)).toEqual([]);
  });
});

describe("`RF-HOR-06` · a isenção de `lib/formato/data.ts` é nominal, e carrega peso", () => {
  it("⚠️ ela SERIA acusada, e por formatar instante — nunca por somar TA", () => {
    const isento = ISENTOS[0] ?? "";
    const achados = aritmeticaEm(isento);
    expect(
      achados.length,
      "o isento deixou de ser acusado: a isenção virou inútil e esconderia uma violação futura",
    ).toBeGreaterThan(0);
    expect(
      achados.every((achado) => achado.padrao.includes("Date")),
      `o isento passou a fazer aritmética de horário de TA, e não é para isso que ele existe: ` +
        `${achados.map((achado) => `${achado.padrao}: ${achado.trecho}`).join(" | ")}`,
    ).toBe(true);
  });
});
