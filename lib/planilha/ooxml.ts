/**
 * O escritor do `.xlsx` — partes OOXML montadas à mão e empacotadas pelo ZIP próprio (R-1 da spec
 * 015, `Q-2`: *"sem pacote novo"*).
 *
 * ⚠️ **SÓ O SUBCONJUNTO QUE A PLANILHA USA**, escrito na ordem que o esquema do `CT_Worksheet` exige
 * (`sheetPr`, `sheetViews`, `sheetFormatPr`, `cols`, `sheetData`, `conditionalFormatting`,
 * `dataValidations`, `printOptions`, `pageMargins`, `pageSetup`) — fora de ordem, o Excel pede para
 * "reparar" o arquivo.
 *
 * ⚠️ **NENHUMA MESCLA E NENHUMA PROTEÇÃO, POR CONSTRUÇÃO** (`Q-6`, `FR-020`): este escritor não sabe
 * escrever `mergeCell` nem `sheetProtection`. Não é regra lembrada; é coisa que não existe aqui.
 *
 * ⚠️ **AS CORES SÓ CHEGAM PELO MODELO** — vêm de `lib/planilha/cores.ts`, a exceção nominal à regra de
 * cor (dúvida 1 do analyze, 09/10/2026). Este arquivo não declara cor nenhuma.
 */
import { COR_DA_BORDA } from "./cores";
import { enderecoA1, escrever, ehErro, type Endereco, type Valor } from "./formula";
import {
  calcularCaches,
  chaveDaCelula,
  serieDaData,
  type Aba,
  type Estilo,
  type EstiloCondicional,
  type Pasta,
} from "./pasta";
import { montarZip } from "./zip";

/** O que o XML não aceita: caracteres de controle (menos tab, quebra e retorno). */
const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function escaparXml(texto: string): string {
  return texto
    .replace(CONTROLE, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const intervaloA1 = (de: Endereco, ate: Endereco) =>
  de.linha === ate.linha && de.coluna === ate.coluna
    ? enderecoA1(de.linha, de.coluna)
    : `${enderecoA1(de.linha, de.coluna)}:${enderecoA1(ate.linha, ate.coluna)}`;

const abaCitada = (nome: string) => `'${nome.replaceAll("'", "''")}'`;

/* ------------------------------------------------------------------ estilos */

const FORMATO_DE_DATA = 164;
const FONTE_PADRAO = "Arial";
const TAMANHO_PADRAO = 9;

type TabelaDeEstilos = {
  readonly indice: (estilo: Estilo | undefined, ehData: boolean) => number;
  readonly dxf: (estilo: EstiloCondicional) => number;
  readonly xml: () => string;
};

function tabelaDeEstilos(): TabelaDeEstilos {
  const fontes: string[] = [
    `<font><sz val="${TAMANHO_PADRAO}"/><name val="${FONTE_PADRAO}"/></font>`,
  ];
  const fundos: string[] = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ];
  const bordas: string[] = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  const xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const dxfs: string[] = [];
  const porChave = new Map<string, number>();

  const indiceDe = (lista: string[], xml: string) => {
    const achado = lista.indexOf(xml);
    if (achado >= 0) return achado;
    lista.push(xml);
    return lista.length - 1;
  };

  const xmlDaFonte = (e: Estilo | EstiloCondicional, comNome: boolean) =>
    `<font>${e.negrito ? "<b/>" : ""}${"italico" in e && e.italico ? "<i/>" : ""}${
      comNome ? `<sz val="${("tamanho" in e && e.tamanho) || TAMANHO_PADRAO}"/>` : ""
    }${e.corDoTexto ? `<color rgb="${e.corDoTexto}"/>` : ""}${
      comNome ? `<name val="${FONTE_PADRAO}"/>` : ""
    }</font>`;

  const lado = (ligado: boolean | undefined, nome: string) =>
    ligado ? `<${nome} style="thin"><color rgb="${COR_DA_BORDA}"/></${nome}>` : `<${nome}/>`;

  return {
    indice(estilo, ehData) {
      const e = estilo ?? {};
      const chave = JSON.stringify([e, ehData]);
      const guardado = porChave.get(chave);
      if (guardado !== undefined) return guardado;
      const fonte = indiceDe(fontes, xmlDaFonte(e, true));
      const fundo = e.fundo
        ? indiceDe(
            fundos,
            `<fill><patternFill patternType="solid"><fgColor rgb="${e.fundo}"/><bgColor indexed="64"/></patternFill></fill>`,
          )
        : 0;
      const borda = e.borda
        ? indiceDe(
            bordas,
            `<border>${lado(e.borda.esquerda, "left")}${lado(e.borda.direita, "right")}${lado(
              e.borda.superior,
              "top",
            )}${lado(e.borda.inferior, "bottom")}<diagonal/></border>`,
          )
        : 0;
      const formato =
        ehData || e.formato === "data" ? FORMATO_DE_DATA : e.formato === "inteiro" ? 1 : 0;
      const alinhar = e.horizontal || e.vertical || e.quebra;
      const alinhamento = alinhar
        ? `<alignment${e.horizontal ? ` horizontal="${e.horizontal}"` : ""}${
            e.vertical ? ` vertical="${e.vertical}"` : ""
          }${e.quebra ? ' wrapText="1"' : ""}/>`
        : "";
      xfs.push(
        `<xf numFmtId="${formato}" fontId="${fonte}" fillId="${fundo}" borderId="${borda}" xfId="0"${
          formato ? ' applyNumberFormat="1"' : ""
        }${fonte ? ' applyFont="1"' : ""}${fundo ? ' applyFill="1"' : ""}${borda ? ' applyBorder="1"' : ""}${
          alinhar ? ' applyAlignment="1">' + alinhamento + "</xf>" : "/>"
        }`,
      );
      const indice = xfs.length - 1;
      porChave.set(chave, indice);
      return indice;
    },
    dxf(estilo) {
      const fonte = estilo.negrito || estilo.corDoTexto ? xmlDaFonte(estilo, false) : "";
      const fundo = estilo.fundo
        ? `<fill><patternFill patternType="solid"><bgColor rgb="${estilo.fundo}"/></patternFill></fill>`
        : "";
      return indiceDe(dxfs, `<dxf>${fonte}${fundo}</dxf>`);
    },
    xml() {
      return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        `<numFmts count="1"><numFmt numFmtId="${FORMATO_DE_DATA}" formatCode="dd/mm/yyyy"/></numFmts>` +
        `<fonts count="${fontes.length}">${fontes.join("")}</fonts>` +
        `<fills count="${fundos.length}">${fundos.join("")}</fills>` +
        `<borders count="${bordas.length}">${bordas.join("")}</borders>` +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        `<cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>` +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        `<dxfs count="${dxfs.length}">${dxfs.join("")}</dxfs>` +
        "</styleSheet>"
      );
    },
  };
}

/* ------------------------------------------------------------------ cadeias */

function tabelaDeCadeias() {
  const indice = new Map<string, number>();
  const lista: string[] = [];
  let usos = 0;
  return {
    de(texto: string) {
      usos++;
      const achado = indice.get(texto);
      if (achado !== undefined) return achado;
      lista.push(texto);
      indice.set(texto, lista.length - 1);
      return lista.length - 1;
    },
    xml() {
      return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${usos}" uniqueCount="${lista.length}">` +
        lista.map((t) => `<si><t xml:space="preserve">${escaparXml(t)}</t></si>`).join("") +
        "</sst>"
      );
    },
  };
}

/* ------------------------------------------------------------------ aba */

function xmlDaAba(
  aba: Aba,
  indiceDaAba: number,
  ativa: boolean,
  estilos: TabelaDeEstilos,
  cadeias: ReturnType<typeof tabelaDeCadeias>,
  caches: ReadonlyMap<string, Valor>,
): string {
  const partes: string[] = [];
  partes.push(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
  );
  if (aba.pagina) partes.push('<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');

  const topo = aba.topoVisivel;
  const congelar = aba.congelar;
  let visao = `<sheetView workbookViewId="0"${ativa ? ' tabSelected="1"' : ""}${
    aba.semGrade ? ' showGridLines="0"' : ""
  }`;
  if (congelar && (congelar.linhas > 0 || congelar.colunas > 0)) {
    const primeira = topo ?? { linha: congelar.linhas + 1, coluna: congelar.colunas + 1 };
    const painel =
      congelar.linhas > 0 && congelar.colunas > 0
        ? "bottomRight"
        : congelar.linhas > 0
          ? "bottomLeft"
          : "topRight";
    visao +=
      `><pane${congelar.colunas > 0 ? ` xSplit="${congelar.colunas}"` : ""}${
        congelar.linhas > 0 ? ` ySplit="${congelar.linhas}"` : ""
      } topLeftCell="${enderecoA1(primeira.linha, primeira.coluna)}" activePane="${painel}" state="frozen"/>` +
      `<selection pane="${painel}" activeCell="${enderecoA1(primeira.linha, primeira.coluna)}" sqref="${enderecoA1(
        primeira.linha,
        primeira.coluna,
      )}"/></sheetView>`;
  } else if (topo) {
    visao += ` topLeftCell="${enderecoA1(topo.linha, topo.coluna)}"/>`;
  } else {
    visao += "/>";
  }
  partes.push(`<sheetViews>${visao}</sheetViews>`);
  partes.push(`<sheetFormatPr defaultRowHeight="12"/>`);

  const colunas = new Set([...aba.larguras.keys(), ...aba.colunasOcultas]);
  if (colunas.size > 0) {
    partes.push(
      `<cols>${[...colunas]
        .sort((a, b) => a - b)
        .map((c) => {
          const largura = aba.larguras.get(c) ?? 9;
          return `<col min="${c}" max="${c}" width="${largura}" customWidth="1"${
            aba.colunasOcultas.has(c) ? ' hidden="1"' : ""
          }/>`;
        })
        .join("")}</cols>`,
    );
  }

  partes.push("<sheetData>");
  const linhas = new Set([...aba.celulas.keys(), ...aba.alturas.keys()]);
  for (const linha of [...linhas].sort((a, b) => a - b)) {
    const altura = aba.alturas.get(linha);
    partes.push(
      `<row r="${linha}"${altura === undefined ? "" : ` ht="${altura}" customHeight="1"`}>`,
    );
    const daLinha = aba.celulas.get(linha);
    for (const coluna of [...(daLinha?.keys() ?? [])].sort((a, b) => a - b)) {
      const celula = daLinha?.get(coluna);
      if (celula === undefined) continue;
      const ref = enderecoA1(linha, coluna);
      const s = estilos.indice(celula.estilo, celula.data !== undefined);
      const atributoS = s === 0 ? "" : ` s="${s}"`;
      if (celula.formula !== undefined) {
        const cache = caches.get(chaveDaCelula(aba.nome, linha, coluna)) ?? null;
        const f = `<f>${escaparXml(escrever(celula.formula))}</f>`;
        if (ehErro(cache))
          partes.push(`<c r="${ref}"${atributoS} t="e">${f}<v>${cache.erro}</v></c>`);
        else if (typeof cache === "number")
          partes.push(`<c r="${ref}"${atributoS}>${f}<v>${cache}</v></c>`);
        else if (typeof cache === "boolean")
          partes.push(`<c r="${ref}"${atributoS} t="b">${f}<v>${cache ? 1 : 0}</v></c>`);
        else
          partes.push(
            `<c r="${ref}"${atributoS} t="str">${f}<v>${escaparXml(cache ?? "")}</v></c>`,
          );
      } else if (celula.data !== undefined) {
        partes.push(`<c r="${ref}"${atributoS}><v>${serieDaData(celula.data)}</v></c>`);
      } else if (typeof celula.valor === "number") {
        partes.push(`<c r="${ref}"${atributoS}><v>${celula.valor}</v></c>`);
      } else if (typeof celula.valor === "boolean") {
        partes.push(`<c r="${ref}"${atributoS} t="b"><v>${celula.valor ? 1 : 0}</v></c>`);
      } else if (typeof celula.valor === "string" && celula.valor !== "") {
        partes.push(`<c r="${ref}"${atributoS} t="s"><v>${cadeias.de(celula.valor)}</v></c>`);
      } else {
        partes.push(`<c r="${ref}"${atributoS}/>`);
      }
    }
    partes.push("</row>");
  }
  partes.push("</sheetData>");

  aba.regras.forEach((regra, i) => {
    partes.push(
      `<conditionalFormatting sqref="${intervaloA1(regra.de, regra.ate)}"><cfRule type="expression" dxfId="${estilos.dxf(
        regra.estilo,
      )}" priority="${i + 1}"><formula>${escaparXml(escrever(regra.formula))}</formula></cfRule></conditionalFormatting>`,
    );
  });

  if (aba.validacoes.length > 0) {
    partes.push(
      `<dataValidations count="${aba.validacoes.length}">${aba.validacoes
        .map(
          (v) =>
            `<dataValidation type="list" allowBlank="1" showErrorMessage="0" showInputMessage="0" sqref="${v.intervalos
              .map((i) => intervaloA1(i.de, i.ate))
              .join(" ")}"><formula1>${escaparXml(escrever(v.fonte))}</formula1></dataValidation>`,
        )
        .join("")}</dataValidations>`,
    );
  }

  if (aba.pagina) {
    partes.push(
      '<printOptions horizontalCentered="1"/>' +
        '<pageMargins left="0.25" right="0.25" top="0.3" bottom="0.3" header="0.1" footer="0.1"/>' +
        `<pageSetup paperSize="9" orientation="${aba.pagina.paisagem ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="1"/>`,
    );
  }
  partes.push("</worksheet>");
  void indiceDaAba;
  return partes.join("");
}

/* ------------------------------------------------------------------ pasta */

/** A pasta inteira como `.xlsx`, com o valor em cache de toda fórmula (R-5). */
export function escreverXlsx(pasta: Pasta): Uint8Array {
  const caches = calcularCaches(pasta);
  const estilos = tabelaDeEstilos();
  const cadeias = tabelaDeCadeias();
  const abas = pasta.abas.map((aba, i) =>
    xmlDaAba(aba, i, i === pasta.abaAtiva, estilos, cadeias, caches),
  );

  const nomes = [
    ...pasta.nomes.map(
      (n) =>
        `<definedName name="${escaparXml(n.nome)}">${escaparXml(
          `${abaCitada(n.aba)}!${enderecoA1(n.de.linha, n.de.coluna, true)}:${enderecoA1(
            n.ate.linha,
            n.ate.coluna,
            true,
          )}`,
        )}</definedName>`,
    ),
    ...pasta.abas.flatMap((aba, i) =>
      aba.areaDeImpressao
        ? [
            `<definedName name="_xlnm.Print_Area" localSheetId="${i}">${escaparXml(
              `${abaCitada(aba.nome)}!${enderecoA1(
                aba.areaDeImpressao.de.linha,
                aba.areaDeImpressao.de.coluna,
                true,
              )}:${enderecoA1(aba.areaDeImpressao.ate.linha, aba.areaDeImpressao.ate.coluna, true)}`,
            )}</definedName>`,
          ]
        : [],
    ),
  ];

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<bookViews><workbookView activeTab="${pasta.abaAtiva}"/></bookViews>` +
    `<sheets>${pasta.abas
      .map((a, i) => `<sheet name="${escaparXml(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets>` +
    (nomes.length > 0 ? `<definedNames>${nomes.join("")}</definedNames>` : "") +
    '<calcPr calcId="124519" fullCalcOnLoad="1"/>' +
    "</workbook>";

  const relacoesDaPasta =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    pasta.abas
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `<Relationship Id="rId${pasta.abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId${pasta.abas.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
    "</Relationships>";

  const tipos =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    pasta.abas
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("") +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    "</Types>";

  const relacoes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    "</Relationships>";

  const instante = pasta.propriedades.criadaEm.replace(/\.\d+Z$/, "Z");
  const nucleo =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${escaparXml(pasta.propriedades.titulo)}</dc:title>` +
    `<dc:creator>${escaparXml(pasta.propriedades.autor)}</dc:creator>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${instante}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${instante}</dcterms:modified>` +
    "</cp:coreProperties>";
  const aplicacao =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>SIS11 — CIAARA-11</Application></Properties>';

  return montarZip([
    { caminho: "[Content_Types].xml", conteudo: tipos },
    { caminho: "_rels/.rels", conteudo: relacoes },
    { caminho: "docProps/core.xml", conteudo: nucleo },
    { caminho: "docProps/app.xml", conteudo: aplicacao },
    { caminho: "xl/workbook.xml", conteudo: workbook },
    { caminho: "xl/_rels/workbook.xml.rels", conteudo: relacoesDaPasta },
    ...abas.map((xml, i) => ({ caminho: `xl/worksheets/sheet${i + 1}.xml`, conteudo: xml })),
    { caminho: "xl/styles.xml", conteudo: estilos.xml() },
    { caminho: "xl/sharedStrings.xml", conteudo: cadeias.xml() },
  ]);
}
