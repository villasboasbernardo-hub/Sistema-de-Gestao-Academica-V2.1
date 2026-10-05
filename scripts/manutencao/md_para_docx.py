"""
Converte um subconjunto de Markdown em .docx, usando SO a biblioteca padrao do Python.

EXISTE PORQUE pandoc, LibreOffice e python-docx ESTAO AUSENTES nesta maquina (medido em
05/10/2026) e a restricao de Bernardo e "nao adicionar pacote ao projeto". Ele escreve o OOXML
diretamente: [Content_Types].xml, _rels/.rels, word/document.xml, word/styles.xml e docProps.

NUMERO DE LISTA VAI COMO TEXTO, de proposito. Numeracao automatica do Word exigiria
word/numbering.xml, e o guia CITA os numeros dos passos entre secoes ("siga os passos 1 a 28") --
numeracao automatica renumeraria e as remissoes passariam a apontar para o passo errado.

Subconjunto coberto: # ## ### , paragrafo, bullet, numerado, citacao, bloco de codigo,
tabela de pipes, regua, negrito e monoespacado.
"""

import re
import sys
import zipfile
from xml.sax.saxutils import escape

NS = (
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
)

MONO = '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/>'


def corridas(texto):
    """Texto com negrito e monoespacado -> lista de <w:r>."""
    saida = []
    partes = re.split(r"(\*\*.+?\*\*|`[^`]+`)", texto)
    for parte in partes:
        if parte == "":
            continue
        props = []
        conteudo = parte
        if parte.startswith("**") and parte.endswith("**") and len(parte) > 4:
            props.append("<w:b/>")
            conteudo = parte[2:-2]
        elif parte.startswith("`") and parte.endswith("`") and len(parte) > 2:
            props.append(MONO)
            conteudo = parte[1:-1]
        rpr = "<w:rPr>" + "".join(props) + "</w:rPr>" if props else ""
        saida.append(
            "<w:r>" + rpr + '<w:t xml:space="preserve">' + escape(conteudo) + "</w:t></w:r>"
        )
    if not saida:
        return '<w:r><w:t xml:space="preserve"></w:t></w:r>'
    return "".join(saida)


def paragrafo(texto, estilo=None, extra_ppr="", mono=False):
    props = []
    if estilo:
        props.append('<w:pStyle w:val="' + estilo + '"/>')
    if extra_ppr:
        props.append(extra_ppr)
    ppr = "<w:pPr>" + "".join(props) + "</w:pPr>" if props else ""
    if mono:
        corpo = (
            "<w:r><w:rPr>" + MONO + '</w:rPr><w:t xml:space="preserve">'
            + escape(texto) + "</w:t></w:r>"
        )
    else:
        corpo = corridas(texto)
    return "<w:p>" + ppr + corpo + "</w:p>"


# Recuo pendente: o numero ou o marcador fica na margem e o texto alinha depois dele.
PENDENTE = '<w:ind w:left="397" w:hanging="397"/>'
REGUA = (
    '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr>'
    '<w:spacing w:before="240" w:after="240"/>'
)
CITACAO = (
    '<w:ind w:left="340"/>'
    '<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="7F7F7F"/></w:pBdr>'
    '<w:spacing w:before="120" w:after="120"/>'
)
CODIGO = (
    '<w:spacing w:after="0" w:line="240" w:lineRule="auto"/>'
    '<w:ind w:left="280"/>'
    '<w:shd w:val="clear" w:fill="F4F4F4"/>'
)


def celula(texto, cabecalho, largura):
    sombra = '<w:shd w:val="clear" w:fill="EFEFEF"/>' if cabecalho else ""
    if cabecalho:
        corpo = (
            "<w:r><w:rPr><w:b/></w:rPr>"
            + '<w:t xml:space="preserve">'
            + escape(re.sub(r"\*\*|`", "", texto))
            + "</w:t></w:r>"
        )
    else:
        corpo = corridas(texto)
    return (
        '<w:tc><w:tcPr><w:tcW w:w="' + str(largura) + '" w:type="dxa"/>' + sombra + "</w:tcPr>"
        + '<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>' + corpo + "</w:p></w:tc>"
    )


def tabela(linhas):
    if not linhas:
        return ""
    colunas = max(len(linha) for linha in linhas)
    largura = 9360 // colunas
    bordas = "".join(
        "<w:" + lado + ' w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>'
        for lado in ("top", "left", "bottom", "right", "insideH", "insideV")
    )
    corpo = []
    for i, linha in enumerate(linhas):
        celulas = [celula(c, i == 0, largura) for c in linha]
        celulas += [celula("", i == 0, largura)] * (colunas - len(linha))
        marca = "<w:trPr><w:tblHeader/></w:trPr>" if i == 0 else ""
        corpo.append("<w:tr>" + marca + "".join(celulas) + "</w:tr>")
    return (
        '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/>'
        + "<w:tblBorders>" + bordas + "</w:tblBorders></w:tblPr>"
        + "".join(corpo)
        + "</w:tbl>"
        + paragrafo("")
    )


def converter(markdown):
    blocos = []
    estado = {"paragrafo": [], "item": None, "citacao": [], "tabela": []}
    em_codigo = False

    def fechar_paragrafo():
        if estado["paragrafo"]:
            blocos.append(paragrafo(" ".join(estado["paragrafo"])))
            estado["paragrafo"] = []

    def fechar_item():
        if estado["item"]:
            marcador, texto = estado["item"]
            blocos.append(
                paragrafo(
                    marcador + "\t" + texto,
                    extra_ppr=PENDENTE + '<w:spacing w:after="80"/>',
                )
            )
            estado["item"] = None

    def fechar_citacao():
        if estado["citacao"]:
            blocos.append(paragrafo(" ".join(estado["citacao"]), extra_ppr=CITACAO))
            estado["citacao"] = []

    def fechar_tabela():
        if estado["tabela"]:
            blocos.append(tabela(estado["tabela"]))
            estado["tabela"] = []

    def fechar_tudo():
        fechar_paragrafo()
        fechar_item()
        fechar_citacao()
        fechar_tabela()

    for linha in markdown.splitlines():
        if linha.strip().startswith("```"):
            if em_codigo:
                em_codigo = False
            else:
                fechar_tudo()
                em_codigo = True
            continue

        if em_codigo:
            blocos.append(paragrafo(linha, mono=True, extra_ppr=CODIGO))
            continue

        nua = linha.strip()

        if nua == "":
            fechar_tudo()
            continue

        if re.fullmatch(r"-{3,}", nua):
            fechar_tudo()
            blocos.append(paragrafo("", extra_ppr=REGUA))
            continue

        cabecalho = re.match(r"^(#{1,3})\s+(.*)$", nua)
        if cabecalho:
            fechar_tudo()
            nivel = len(cabecalho.group(1))
            estilo = "Title" if nivel == 1 else "Heading" + str(nivel - 1)
            blocos.append(paragrafo(cabecalho.group(2), estilo=estilo))
            continue

        if nua.startswith("|"):
            fechar_paragrafo()
            fechar_item()
            fechar_citacao()
            celulas = [c.strip() for c in nua.strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c) for c in celulas):
                continue
            estado["tabela"].append(celulas)
            continue
        fechar_tabela()

        if nua.startswith("> "):
            fechar_paragrafo()
            fechar_item()
            estado["citacao"].append(nua[2:])
            continue
        if nua == ">":
            estado["citacao"].append("")
            continue
        fechar_citacao()

        marcado = re.match(r"^(\d+)\.\s+(.*)$", nua)
        if marcado:
            fechar_paragrafo()
            fechar_item()
            estado["item"] = (marcado.group(1) + ".", marcado.group(2))
            continue

        if nua.startswith("- "):
            fechar_paragrafo()
            fechar_item()
            estado["item"] = ("•", nua[2:])
            continue

        # Continuacao: linha recuada logo abaixo de um item da lista.
        if linha[:1] in (" ", "\t") and estado["item"]:
            estado["item"] = (estado["item"][0], estado["item"][1] + " " + nua)
            continue

        fechar_item()
        estado["paragrafo"].append(nua)

    fechar_tudo()
    return "".join(blocos)


ESTILOS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    "<w:styles " + NS + ">"
    "<w:docDefaults><w:rPrDefault><w:rPr>"
    '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/>'
    "</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>"
    '<w:spacing w:after="140" w:line="276" w:lineRule="auto"/>'
    "</w:pPr></w:pPrDefault></w:docDefaults>"
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
    '<w:name w:val="Normal"/></w:style>'
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/>'
    '<w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="240"/>'
    '<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="1F3864"/></w:pBdr></w:pPr>'
    '<w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="44"/></w:rPr></w:style>'
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>'
    '<w:basedOn w:val="Normal"/><w:pPr><w:keepNext/>'
    '<w:spacing w:before="360" w:after="140"/><w:outlineLvl w:val="0"/></w:pPr>'
    '<w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="32"/></w:rPr></w:style>'
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>'
    '<w:basedOn w:val="Normal"/><w:pPr><w:keepNext/>'
    '<w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr>'
    '<w:rPr><w:b/><w:color w:val="2E5496"/><w:sz w:val="26"/></w:rPr></w:style>'
    "</w:styles>"
)

TIPOS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" '
    'ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-'
    'officedocument.wordprocessingml.document.main+xml"/>'
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-'
    'officedocument.wordprocessingml.styles+xml"/>'
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-'
    'package.core-properties+xml"/>'
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-'
    'officedocument.extended-properties+xml"/>'
    "</Types>"
)

RAIZ = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="' + RAIZ + '/officeDocument" Target="word/document.xml"/>'
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/'
    'relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    '<Relationship Id="rId3" Type="' + RAIZ + '/extended-properties" Target="docProps/app.xml"/>'
    "</Relationships>"
)

RELS_DOC = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="' + RAIZ + '/styles" Target="styles.xml"/>'
    "</Relationships>"
)

CORE = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    "<cp:coreProperties"
    ' xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"'
    ' xmlns:dc="http://purl.org/dc/elements/1.1/"'
    ' xmlns:dcterms="http://purl.org/dc/terms/"'
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    "<dc:title>Guia de testes do CIAARA-11</dc:title>"
    "<dc:creator>CIAARA-11 - Divisao de Administracao Academica</dc:creator>"
    "<cp:lastModifiedBy>CIAARA-11</cp:lastModifiedBy>"
    '<dcterms:created xsi:type="dcterms:W3CDTF">2026-10-05T00:00:00Z</dcterms:created>'
    '<dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-05T00:00:00Z</dcterms:modified>'
    "</cp:coreProperties>"
)

APP = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/'
    'extended-properties">'
    "<Application>CIAARA-11 md_para_docx</Application>"
    "</Properties>"
)

SECAO = (
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"'
    ' w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>'
)


def main(entrada, saida):
    with open(entrada, encoding="utf-8") as arquivo:
        markdown = arquivo.read()

    documento = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        "<w:document " + NS + "><w:body>" + converter(markdown) + SECAO + "</w:body></w:document>"
    )

    with zipfile.ZipFile(saida, "w", zipfile.ZIP_DEFLATED) as pacote:
        pacote.writestr("[Content_Types].xml", TIPOS)
        pacote.writestr("_rels/.rels", RELS)
        pacote.writestr("word/document.xml", documento)
        pacote.writestr("word/_rels/document.xml.rels", RELS_DOC)
        pacote.writestr("word/styles.xml", ESTILOS)
        pacote.writestr("docProps/core.xml", CORE)
        pacote.writestr("docProps/app.xml", APP)

    print("escrito: " + saida)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
