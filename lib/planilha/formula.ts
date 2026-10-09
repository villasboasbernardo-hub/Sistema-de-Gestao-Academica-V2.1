/**
 * A fórmula da planilha de contingência como ÁRVORE TIPADA — R-4 da spec 015.
 *
 * > *"funciona no Excel e no Google Planilhas; só funções comuns aos dois."* (`Q-4`) ·
 * > *"Excel 2007 em diante."* (`DP-2`) — Bernardo Villas Boas, 09/10/2026
 *
 * ⚠️ **NENHUMA FÓRMULA É TEXTO LIVRE.** O gerador monta árvores com um conjunto FECHADO de nós, e cada
 * nó sabe duas coisas: **se escrever** (o texto que vai no OOXML — em inglês e com vírgula, como o
 * formato exige; cada programa mostra no idioma dele) e **se avaliar** (o valor que o Excel daria).
 * As duas metades juntas são o que deixa a suíte comparar a fórmula com a função do domínio que ela
 * reexpressa (`DP-1`), sem abrir programa nenhum.
 *
 * ⚠️ **O VOCABULÁRIO É O DO EXCEL 2007**, e todas existem também no Google Planilhas. Ficam FORA, de
 * propósito:
 * - `TEXT` — o código de formato muda com o idioma do Excel (`"aaaa"` em português, `"yyyy"` no
 *   Google), e a data sairia errada só numa das máquinas;
 * - `INDIRECT` e `OFFSET` — recalculam a cada edição e escondem a referência;
 * - qualquer função que o arquivo exija com o prefixo `_xlfn.` (`XLOOKUP`, `IFS`, `CONCAT`,
 *   `TEXTJOIN`, `FILTER`…) — não existem no Excel 2007;
 * - `TODAY` — fora do PR 1 (o PR 2 a acrescenta para a data de referência da CONTROLE).
 *
 * ⚠️ **TRÊS ARMADILHAS DO EXCEL QUE A ÁRVORE EVITA, e o avaliador reproduz:**
 * 1. referência a célula VAZIA, sozinha, mostra **0** no Excel e vazio no Google — por isso toda busca
 *    de texto termina em `&""`, e a suíte reprova fórmula cujo resultado seja vazio puro;
 * 2. número concatenado vira texto no formato do idioma (`1,5` no Excel em português) — só inteiro
 *    passa por `&`;
 * 3. `MATCH` e `COUNTIF` tratam `*`, `?` e `~` como curinga — nenhuma chave da planilha os contém, e
 *    `chaveSemCuringa` recusa na montagem.
 */

export type ErroDaFormula = {
  readonly erro: "#N/A" | "#VALUE!" | "#REF!" | "#DIV/0!" | "#NUM!";
};

/** O valor de uma célula: número, texto, lógico, vazio (`null`) ou erro. */
export type Valor = number | string | boolean | null | ErroDaFormula;

export function ehErro(valor: unknown): valor is ErroDaFormula {
  return typeof valor === "object" && valor !== null && "erro" in valor;
}

export type Endereco = { readonly linha: number; readonly coluna: number };

export const FUNCOES = [
  "IF",
  "IFERROR",
  "AND",
  "OR",
  "NOT",
  "INDEX",
  "MATCH",
  "COUNTIF",
  "COUNTIFS",
  "SUMIFS",
  "SUM",
  "MAX",
  "MIN",
  "LEN",
  "CHAR",
  "DAY",
  "MONTH",
  "YEAR",
  "RIGHT",
  "ISNUMBER",
  "MOD",
  /* PR 2: a data de referência da CONTROLE (*adotado*, item 8 das tasks). Excel 2007 e Google têm. */
  "TODAY",
] as const;
export type NomeDaFuncao = (typeof FUNCOES)[number];

export type Operador = "&" | "=" | "<>" | "<" | "<=" | ">" | ">=" | "+" | "-" | "*" | "/";

export type Formula =
  | { readonly tipo: "numero"; readonly valor: number }
  | { readonly tipo: "texto"; readonly valor: string }
  | { readonly tipo: "logico"; readonly valor: boolean }
  | {
      readonly tipo: "ref";
      /** Sem aba: a aba da célula que contém a fórmula. */
      readonly aba?: string;
      readonly linha: number;
      readonly coluna: number;
      readonly fixaLinha: boolean;
      readonly fixaColuna: boolean;
    }
  | {
      readonly tipo: "intervalo";
      readonly aba?: string;
      readonly de: Endereco;
      readonly ate: Endereco;
    }
  | { readonly tipo: "nome"; readonly nome: string }
  | { readonly tipo: "op"; readonly op: Operador; readonly a: Formula; readonly b: Formula }
  | { readonly tipo: "funcao"; readonly nome: NomeDaFuncao; readonly args: readonly Formula[] };

/* ------------------------------------------------------------------ montar */

export const num = (valor: number): Formula => ({ tipo: "numero", valor });
export const txt = (valor: string): Formula => ({ tipo: "texto", valor });
export const bool = (valor: boolean): Formula => ({ tipo: "logico", valor });

/** Referência a uma célula. Sem opção: relativa e na própria aba. */
export function ref(
  linha: number,
  coluna: number,
  opcoes: {
    readonly aba?: string;
    readonly fixa?: boolean;
    readonly fixaLinha?: boolean;
    readonly fixaColuna?: boolean;
  } = {},
): Formula {
  return {
    tipo: "ref",
    ...(opcoes.aba === undefined ? {} : { aba: opcoes.aba }),
    linha,
    coluna,
    fixaLinha: opcoes.fixa === true || opcoes.fixaLinha === true,
    fixaColuna: opcoes.fixa === true || opcoes.fixaColuna === true,
  };
}

/** Intervalo — sempre absoluto: ele é a tabela onde se busca, nunca a linha da fórmula. */
export function intervalo(de: Endereco, ate: Endereco, aba?: string): Formula {
  return { tipo: "intervalo", ...(aba === undefined ? {} : { aba }), de, ate };
}

export const nome = (n: string): Formula => ({ tipo: "nome", nome: n });
export const op = (a: Formula, operador: Operador, b: Formula): Formula => ({
  tipo: "op",
  op: operador,
  a,
  b,
});

export function fn(nomeDaFuncao: NomeDaFuncao, ...args: Formula[]): Formula {
  if (!(FUNCOES as readonly string[]).includes(nomeDaFuncao)) {
    throw new Error(`função fora do vocabulário da planilha: ${String(nomeDaFuncao)}`);
  }
  return { tipo: "funcao", nome: nomeDaFuncao, args };
}

/** Concatenação de várias partes, da esquerda para a direita. */
export function concat(...partes: Formula[]): Formula {
  const [primeira, ...resto] = partes;
  if (primeira === undefined) return txt("");
  return resto.reduce<Formula>((acumulado, parte) => op(acumulado, "&", parte), primeira);
}

/** Recusa chave com curinga de `MATCH`/`COUNTIF` — elas casariam com o que não são. */
export function chaveSemCuringa(chave: string): string {
  if (/[*?~]/.test(chave)) throw new Error(`chave com curinga do MATCH: ${chave}`);
  return chave;
}

/* ------------------------------------------------------------------ escrever */

export function letrasDaColuna(coluna: number): string {
  let s = "";
  for (let n = coluna; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

export function enderecoA1(linha: number, coluna: number, fixa = false): string {
  const d = fixa ? "$" : "";
  return `${d}${letrasDaColuna(coluna)}${d}${linha}`;
}

const prefixoDaAba = (aba?: string) => (aba === undefined ? "" : `'${aba.replaceAll("'", "''")}'!`);

function escreverNumero(valor: number): string {
  if (!Number.isFinite(valor)) throw new Error(`número inválido numa fórmula: ${valor}`);
  return String(valor);
}

/** O texto da fórmula, sem o `=` inicial — é assim que o OOXML a guarda em `<f>`. */
export function escrever(f: Formula): string {
  switch (f.tipo) {
    case "numero":
      return escreverNumero(f.valor);
    case "texto":
      return `"${f.valor.replaceAll('"', '""')}"`;
    case "logico":
      return f.valor ? "TRUE" : "FALSE";
    case "ref":
      return `${prefixoDaAba(f.aba)}${f.fixaColuna ? "$" : ""}${letrasDaColuna(f.coluna)}${
        f.fixaLinha ? "$" : ""
      }${f.linha}`;
    case "intervalo":
      return `${prefixoDaAba(f.aba)}${enderecoA1(f.de.linha, f.de.coluna, true)}:${enderecoA1(
        f.ate.linha,
        f.ate.coluna,
        true,
      )}`;
    case "nome":
      return f.nome;
    case "op":
      return `(${escrever(f.a)}${f.op}${escrever(f.b)})`;
    case "funcao":
      return `${f.nome}(${f.args.map(escrever).join(",")})`;
  }
}

/* ------------------------------------------------------------------ avaliar */

export type ContextoDeAvaliacao = {
  /** O `TODAY()` da avaliação, como número de série — vem do modelo, para o cache não depender do dia. */
  readonly hoje?: number;
  /** A aba da célula que contém a fórmula — onde a referência sem aba é resolvida. */
  readonly aba: string;
  readonly valorDe: (aba: string, linha: number, coluna: number) => Valor;
  readonly nome: (
    nome: string,
  ) => { readonly aba: string; readonly de: Endereco; readonly ate: Endereco } | undefined;
};

type Intervalo = { readonly aba: string; readonly de: Endereco; readonly ate: Endereco };

const VALOR: ErroDaFormula = { erro: "#VALUE!" };
const NA: ErroDaFormula = { erro: "#N/A" };
const REF: ErroDaFormula = { erro: "#REF!" };
const DIV0: ErroDaFormula = { erro: "#DIV/0!" };

const ehNumerico = (t: string) => /^-?\d+(\.\d+)?$/.test(t.trim());

function comoNumero(v: Valor): number | ErroDaFormula {
  if (ehErro(v)) return v;
  if (v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return ehNumerico(v) ? Number(v) : VALOR;
}

function comoTexto(v: Valor): string | ErroDaFormula {
  if (ehErro(v)) return v;
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}

function comoLogico(v: Valor): boolean | ErroDaFormula {
  if (ehErro(v)) return v;
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const t = v.trim().toUpperCase();
  if (t === "TRUE") return true;
  if (t === "FALSE") return false;
  return VALOR;
}

/** A ordem do Excel entre tipos diferentes: número < texto < lógico. */
const ordemDoTipo = (v: number | string | boolean) =>
  typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2;

function comparar(a: Valor, b: Valor): number | ErroDaFormula {
  if (ehErro(a)) return a;
  if (ehErro(b)) return b;
  /* Vazio vira o "zero" do tipo do outro lado. */
  const x: number | string | boolean =
    a === null ? (typeof b === "number" ? 0 : typeof b === "boolean" ? false : "") : a;
  const y: number | string | boolean =
    b === null ? (typeof x === "number" ? 0 : typeof x === "boolean" ? false : "") : b;
  if (ordemDoTipo(x) !== ordemDoTipo(y)) return ordemDoTipo(x) - ordemDoTipo(y);
  if (typeof x === "string" && typeof y === "string") {
    const p = x.toUpperCase();
    const q = y.toUpperCase();
    return p === q ? 0 : p < q ? -1 : 1;
  }
  const p = Number(x);
  const q = Number(y);
  return p === q ? 0 : p < q ? -1 : 1;
}

function resolverIntervalo(f: Formula, ctx: ContextoDeAvaliacao): Intervalo | ErroDaFormula {
  if (f.tipo === "intervalo") return { aba: f.aba ?? ctx.aba, de: f.de, ate: f.ate };
  if (f.tipo === "nome") return ctx.nome(f.nome) ?? { erro: "#REF!" };
  if (f.tipo === "ref") {
    const e = { linha: f.linha, coluna: f.coluna };
    return { aba: f.aba ?? ctx.aba, de: e, ate: e };
  }
  return VALOR;
}

function* celulasDe(i: Intervalo, ctx: ContextoDeAvaliacao): Generator<Valor> {
  for (let linha = i.de.linha; linha <= i.ate.linha; linha++) {
    for (let coluna = i.de.coluna; coluna <= i.ate.coluna; coluna++) {
      yield ctx.valorDe(i.aba, linha, coluna);
    }
  }
}

/** O critério de `COUNTIF`, `COUNTIFS` e `SUMIFS` — igualdade e comparação numérica. */
function criterio(c: Valor): ((v: Valor) => boolean) | ErroDaFormula {
  if (ehErro(c)) return c;
  if (typeof c === "number")
    return (v) =>
      typeof v === "number" ? v === c : typeof v === "string" && ehNumerico(v) && Number(v) === c;
  if (typeof c === "boolean") return (v) => v === c;
  const texto = c ?? "";
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/s.exec(texto);
  const operador = m?.[1] ?? "";
  const resto = m?.[2] ?? "";
  if (/[*?~]/.test(resto)) throw new Error(`critério com curinga, fora do vocabulário: ${texto}`);
  if (operador === "" || operador === "=") {
    if (resto === "") return (v) => v === null || v === "";
    if (ehNumerico(resto)) {
      const n = Number(resto);
      return (v) =>
        typeof v === "number" ? v === n : typeof v === "string" && v.trim() === resto.trim();
    }
    const alvo = resto.toUpperCase();
    return (v) => typeof v === "string" && v.toUpperCase() === alvo;
  }
  if (!ehNumerico(resto))
    throw new Error(`critério de comparação não numérico, fora do vocabulário: ${texto}`);
  const n = Number(resto);
  const teste: Record<string, (x: number) => boolean> = {
    "<": (x) => x < n,
    ">": (x) => x > n,
    "<=": (x) => x <= n,
    ">=": (x) => x >= n,
    "<>": (x) => x !== n,
  };
  const t = teste[operador] as (x: number) => boolean;
  return (v) =>
    operador === "<>" ? !(typeof v === "number" && v === n) : typeof v === "number" && t(v);
}

function dataDaSerie(serie: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(serie) * 86_400_000);
}

function avaliarFuncao(f: Extract<Formula, { tipo: "funcao" }>, ctx: ContextoDeAvaliacao): Valor {
  const a = f.args;
  const v = (i: number): Valor => (a[i] === undefined ? null : avaliar(a[i] as Formula, ctx));
  switch (f.nome) {
    case "IF": {
      const c = comoLogico(v(0));
      if (ehErro(c)) return c;
      if (c) return v(1);
      return a[2] === undefined ? false : v(2);
    }
    case "IFERROR": {
      const x = v(0);
      return ehErro(x) ? v(1) : x;
    }
    case "AND":
    case "OR": {
      const valores = a.map((_, i) => comoLogico(v(i)));
      const erro = valores.find(ehErro);
      if (erro) return erro;
      return f.nome === "AND" ? valores.every((x) => x === true) : valores.some((x) => x === true);
    }
    case "NOT": {
      const c = comoLogico(v(0));
      return ehErro(c) ? c : !c;
    }
    case "INDEX": {
      const i = resolverIntervalo(a[0] as Formula, ctx);
      if (ehErro(i)) return i;
      const linhas = i.ate.linha - i.de.linha + 1;
      const colunas = i.ate.coluna - i.de.coluna + 1;
      const r = comoNumero(v(1));
      if (ehErro(r)) return r;
      const c = a[2] === undefined ? 1 : comoNumero(v(2));
      if (ehErro(c)) return c;
      /* Intervalo de uma linha só: o primeiro índice anda pelas colunas. */
      const [linha, coluna] = linhas === 1 && a[2] === undefined ? [1, r] : [r, c];
      if (linha < 1 || coluna < 1 || linha > linhas || coluna > colunas) return REF;
      return ctx.valorDe(
        i.aba,
        i.de.linha + Math.floor(linha) - 1,
        i.de.coluna + Math.floor(coluna) - 1,
      );
    }
    case "MATCH": {
      const alvo = v(0);
      if (ehErro(alvo)) return alvo;
      if (typeof alvo === "string" && /[*?~]/.test(alvo)) {
        throw new Error(`MATCH com curinga, fora do vocabulário: ${alvo}`);
      }
      const i = resolverIntervalo(a[1] as Formula, ctx);
      if (ehErro(i)) return i;
      const tipo = comoNumero(v(2));
      if (tipo !== 0) throw new Error("MATCH só com correspondência exata (0) no vocabulário");
      let posicao = 0;
      for (const celula of celulasDe(i, ctx)) {
        posicao++;
        if (celula === null || ehErro(celula)) continue;
        if (typeof celula !== typeof alvo) continue;
        if (comparar(celula, alvo) === 0) return posicao;
      }
      return NA;
    }
    case "COUNTIF":
    case "COUNTIFS":
    case "SUMIFS": {
      const comSoma = f.nome === "SUMIFS";
      const pares: [Intervalo, (x: Valor) => boolean][] = [];
      for (let k = comSoma ? 1 : 0; k < a.length; k += 2) {
        const i = resolverIntervalo(a[k] as Formula, ctx);
        if (ehErro(i)) return i;
        const teste = criterio(v(k + 1));
        if (ehErro(teste)) return teste;
        pares.push([i, teste]);
      }
      const soma = comSoma ? resolverIntervalo(a[0] as Formula, ctx) : null;
      if (soma !== null && ehErro(soma)) return soma;
      const [primeiro] = pares;
      if (primeiro === undefined) return VALOR;
      const tamanho =
        (primeiro[0].ate.linha - primeiro[0].de.linha + 1) *
        (primeiro[0].ate.coluna - primeiro[0].de.coluna + 1);
      const colunas = pares.map(([i]) => [...celulasDe(i, ctx)]);
      if (colunas.some((c) => c.length !== tamanho)) return VALOR;
      const valoresDaSoma = soma === null ? [] : [...celulasDe(soma, ctx)];
      let total = 0;
      for (let n = 0; n < tamanho; n++) {
        if (!pares.every(([, teste], k) => teste((colunas[k] as Valor[])[n] ?? null))) continue;
        if (!comSoma) total++;
        else {
          const x = valoresDaSoma[n] ?? null;
          if (typeof x === "number") total += x;
        }
      }
      return total;
    }
    case "SUM":
    case "MAX":
    case "MIN": {
      const numeros: number[] = [];
      for (const arg of a) {
        if (arg.tipo === "intervalo" || arg.tipo === "nome") {
          const i = resolverIntervalo(arg, ctx);
          if (ehErro(i)) return i;
          for (const celula of celulasDe(i, ctx)) {
            if (ehErro(celula)) return celula;
            if (typeof celula === "number") numeros.push(celula);
          }
        } else {
          const n = comoNumero(avaliar(arg, ctx));
          if (ehErro(n)) return n;
          numeros.push(n);
        }
      }
      if (f.nome === "SUM") return numeros.reduce((s, n) => s + n, 0);
      if (numeros.length === 0) return 0;
      return f.nome === "MAX" ? Math.max(...numeros) : Math.min(...numeros);
    }
    case "LEN": {
      const t = comoTexto(v(0));
      return ehErro(t) ? t : t.length;
    }
    case "CHAR": {
      const n = comoNumero(v(0));
      return ehErro(n) ? n : String.fromCharCode(Math.floor(n));
    }
    case "DAY":
    case "MONTH":
    case "YEAR": {
      const n = comoNumero(v(0));
      if (ehErro(n)) return n;
      const d = dataDaSerie(n);
      return f.nome === "DAY"
        ? d.getUTCDate()
        : f.nome === "MONTH"
          ? d.getUTCMonth() + 1
          : d.getUTCFullYear();
    }
    case "RIGHT": {
      const t = comoTexto(v(0));
      if (ehErro(t)) return t;
      const n = a[1] === undefined ? 1 : comoNumero(v(1));
      if (ehErro(n)) return n;
      return n <= 0 ? "" : t.slice(-Math.floor(n));
    }
    case "ISNUMBER":
      return typeof v(0) === "number";
    case "TODAY":
      return ctx.hoje ?? NA;
    case "MOD": {
      const n = comoNumero(v(0));
      if (ehErro(n)) return n;
      const d = comoNumero(v(1));
      if (ehErro(d)) return d;
      if (d === 0) return DIV0;
      /* O resto do Excel tem o sinal do divisor. */
      return n - d * Math.floor(n / d);
    }
  }
}

/** O valor que o Excel calcularia para a árvore, no contexto da célula. */
export function avaliar(f: Formula, ctx: ContextoDeAvaliacao): Valor {
  switch (f.tipo) {
    case "numero":
    case "texto":
    case "logico":
      return f.valor;
    case "ref":
      return ctx.valorDe(f.aba ?? ctx.aba, f.linha, f.coluna);
    case "intervalo":
    case "nome":
      /* Intervalo solto não tem valor de célula — só dentro de função. */
      return VALOR;
    case "op": {
      const a = avaliar(f.a, ctx);
      const b = avaliar(f.b, ctx);
      if (f.op === "&") {
        const x = comoTexto(a);
        if (ehErro(x)) return x;
        const y = comoTexto(b);
        return ehErro(y) ? y : x + y;
      }
      if (["=", "<>", "<", "<=", ">", ">="].includes(f.op)) {
        const c = comparar(a, b);
        if (ehErro(c)) return c;
        if (f.op === "=") {
          if (a !== null && b !== null && typeof a !== typeof b) return false;
          return c === 0;
        }
        if (f.op === "<>") {
          if (a !== null && b !== null && typeof a !== typeof b) return true;
          return c !== 0;
        }
        return f.op === "<" ? c < 0 : f.op === "<=" ? c <= 0 : f.op === ">" ? c > 0 : c >= 0;
      }
      const x = comoNumero(a);
      if (ehErro(x)) return x;
      const y = comoNumero(b);
      if (ehErro(y)) return y;
      if (f.op === "+") return x + y;
      if (f.op === "-") return x - y;
      if (f.op === "*") return x * y;
      return y === 0 ? DIV0 : x / y;
    }
    case "funcao":
      return avaliarFuncao(f, ctx);
  }
}
