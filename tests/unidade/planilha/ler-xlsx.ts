/**
 * O leitor de TESTE do `.xlsx` da planilha de contingência (T016 da spec 015).
 *
 * ⚠️ **ELE SÓ LÊ O QUE O PRÓPRIO ESCRITOR GERA** — XML que nós escrevemos, numa forma conhecida. Não é
 * um leitor de planilha geral, e não precisa ser: o que se confere aqui é o pacote que o sistema monta.
 * Os programas de verdade (Excel e Google Planilhas) são conferidos à parte (R-12).
 */
import * as zlib from "node:zlib";

/** Reabre um ZIP pelo diretório central, devolvendo cada entrada descomprimida, na ordem. */
export function lerZip(zip: Uint8Array): Map<string, Uint8Array> {
  const visao = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let fimDoDiretorio = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (visao.getUint32(i, true) === 0x06054b50) {
      fimDoDiretorio = i;
      break;
    }
  }
  if (fimDoDiretorio < 0) throw new Error("ZIP sem registro de fim do diretório central");
  const total = visao.getUint16(fimDoDiretorio + 10, true);
  let p = visao.getUint32(fimDoDiretorio + 16, true);
  const entradas = new Map<string, Uint8Array>();
  for (let n = 0; n < total; n++) {
    if (visao.getUint32(p, true) !== 0x02014b50) throw new Error("diretório central quebrado");
    const metodo = visao.getUint16(p + 10, true);
    const tamanhoComprimido = visao.getUint32(p + 20, true);
    const tamanhoNome = visao.getUint16(p + 28, true);
    const tamanhoExtra = visao.getUint16(p + 30, true);
    const tamanhoComentario = visao.getUint16(p + 32, true);
    const deslocamento = visao.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + tamanhoNome));
    const nomeLocal = visao.getUint16(deslocamento + 26, true);
    const extraLocal = visao.getUint16(deslocamento + 28, true);
    const inicio = deslocamento + 30 + nomeLocal + extraLocal;
    const bruto = zip.subarray(inicio, inicio + tamanhoComprimido);
    entradas.set(nome, metodo === 8 ? new Uint8Array(zlib.inflateRawSync(bruto)) : bruto);
    p += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }
  return entradas;
}

/** Confere que o XML abre e fecha cada elemento na ordem — o mínimo de "bem formado". */
export function xmlBemFormado(xml: string): boolean {
  const pilha: string[] = [];
  const marca = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  const semDeclaracao = xml.replace(/^<\?xml[^>]*\?>/, "");
  let posicao = 0;
  for (const m of semDeclaracao.matchAll(marca)) {
    const antes = semDeclaracao.slice(posicao, m.index);
    if (antes.includes("<")) return false;
    posicao = (m.index ?? 0) + m[0].length;
    const [, fecha, nome, , autoFecha] = m;
    if (autoFecha === "/") continue;
    if (fecha === "/") {
      if (pilha.pop() !== nome) return false;
    } else {
      pilha.push(nome as string);
    }
  }
  return pilha.length === 0 && !semDeclaracao.slice(posicao).includes("<");
}

const desfazerEscape = (t: string) =>
  t
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");

export type CelulaLida = {
  readonly referencia: string;
  readonly estilo: number;
  readonly tipo: string | null;
  readonly formula: string | null;
  /** O valor guardado: o da constante, ou o valor em cache da fórmula. */
  readonly valor: string | number | boolean | null;
};

export type AbaLida = {
  readonly nome: string;
  readonly xml: string;
  readonly celulas: Map<string, CelulaLida>;
};

export type PastaLida = {
  readonly partes: Map<string, string>;
  readonly abas: AbaLida[];
  readonly nomesDefinidos: Map<string, string>;
  readonly cadeias: string[];
};

/** Reabre o `.xlsx` inteiro: partes, abas, células com fórmula e cache, nomes definidos. */
export function lerXlsx(arquivo: Uint8Array): PastaLida {
  const binarias = lerZip(arquivo);
  const partes = new Map<string, string>();
  for (const [nome, bytes] of binarias) partes.set(nome, new TextDecoder().decode(bytes));

  const cadeias = [...(partes.get("xl/sharedStrings.xml") ?? "").matchAll(/<si>(.*?)<\/si>/gs)].map(
    (m) =>
      desfazerEscape([...(m[1] ?? "").matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join("")),
  );

  const workbook = partes.get("xl/workbook.xml") ?? "";
  const relacoes = partes.get("xl/_rels/workbook.xml.rels") ?? "";
  const alvoDe = new Map(
    [...relacoes.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [
      m[1] as string,
      m[2] as string,
    ]),
  );
  const abas: AbaLida[] = [];
  for (const m of workbook.matchAll(/<sheet name="([^"]+)" sheetId="\d+" r:id="([^"]+)"\/>/g)) {
    const nome = desfazerEscape(m[1] as string);
    const xml = partes.get(`xl/${alvoDe.get(m[2] as string)}`) ?? "";
    const celulas = new Map<string, CelulaLida>();
    for (const c of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
      const atributos = c[2] ?? "";
      const corpo = c[3] ?? "";
      const tipo = /\bt="([^"]+)"/.exec(atributos)?.[1] ?? null;
      const estilo = Number(/\bs="(\d+)"/.exec(atributos)?.[1] ?? 0);
      const formula = /<f>(.*?)<\/f>/s.exec(corpo)?.[1];
      const v = /<v>(.*?)<\/v>/s.exec(corpo)?.[1];
      const isTexto = /<is><t[^>]*>(.*?)<\/t><\/is>/s.exec(corpo)?.[1];
      let valor: string | number | boolean | null = null;
      if (tipo === "s" && v !== undefined) valor = cadeias[Number(v)] ?? null;
      else if (tipo === "str" && v !== undefined) valor = desfazerEscape(v);
      else if (tipo === "inlineStr" && isTexto !== undefined) valor = desfazerEscape(isTexto);
      else if (tipo === "b" && v !== undefined) valor = v === "1";
      else if (tipo === "e" && v !== undefined) valor = desfazerEscape(v);
      else if (v !== undefined) valor = Number(v);
      celulas.set(c[1] as string, {
        referencia: c[1] as string,
        estilo,
        tipo,
        formula: formula === undefined ? null : desfazerEscape(formula),
        valor,
      });
    }
    abas.push({ nome, xml, celulas });
  }

  const nomesDefinidos = new Map(
    [...workbook.matchAll(/<definedName name="([^"]+)"[^>]*>(.*?)<\/definedName>/gs)].map((m) => [
      m[1] as string,
      desfazerEscape(m[2] as string),
    ]),
  );
  return { partes, abas, nomesDefinidos, cadeias };
}

/** A aba pelo nome, ou erro — para o teste não seguir com `undefined`. */
export function aba(pasta: PastaLida, nome: string): AbaLida {
  const achada = pasta.abas.find((a) => a.nome === nome);
  if (!achada) throw new Error(`a pasta não tem a aba ${nome}`);
  return achada;
}
