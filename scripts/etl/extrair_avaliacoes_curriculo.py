"""Extrai dos currículos da DEnsM o quadro final (limites de AEC, TAD e TR) — spec 014.

Parte 1 (PR 1, FR-001.1, R-11, R-13): o QUADRO FINAL de cada currículo declara, em horas, as
ATIVIDADES EXTRACLASSE (AEC), o TEMPO RESERVA (TR) e, nos C-Espc, o TEMPO PARA ADMINISTRAÇÃO (TAD).
A saída é `scripts/etl/dados/limites_curriculo.csv`, uma linha por par declarado, com arquivo e
página. Horas = TA (premissa A-10, confirmada por Bernardo em 13/10/2026).

Parte 2 (PR 4, T126, FR-030, FR-037, R-13): as seções de AVALIAÇÃO DA APRENDIZAGEM de cada
disciplina, para `scripts/etl/dados/avaliacoes_curriculo.csv`, UMA LINHA POR ITEM (instrumento,
número, UE computada, UEs abordadas, TA de aplicação, TA de vista, arquivo e página). O texto é
prosa, com muitas grafias; o leitor é conservador: o que ele não lê com segurança sai com
`conferir: <motivo>` na coluna `conferido`, e NUNCA com número inventado. Ver `avaliacoes_do_pdf`.

Dois formatos reais, medidos em 14/10/2026 nos 24 PDFs:
    "ATIVIDADES EXTRACLASSE……… 110 HORAS"          (na mesma linha; às vezes "ATIVIDADE EXTRACLASSE")
    "ATIVIDADES EXTRACLASSE" | "(AEC)" | "80 TA"    (C-Espc: tabela, uma célula por linha)

Nada aqui grava em banco: a saída é CSV para revisão humana (coluna `conferido`), e a migration de
dado é GERADA do CSV revisado por `gerar_carga_de_limites.py`.

Uso:
    python -m scripts.etl.extrair_avaliacoes_curriculo limites <dir_curriculos> [<csv_saida>]
    python -m scripts.etl.extrair_avaliacoes_curriculo avaliacoes <dir_curriculos> [<csv_saida>]
"""

from __future__ import annotations

import csv
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.exit("PyMuPDF ausente. Instale com: pip install pymupdf")

RAIZ = Path(__file__).resolve().parents[2]
PAREAMENTO = RAIZ / "scripts" / "etl" / "dados" / "pareamento_ue.csv"
SAIDA_PADRAO = RAIZ / "scripts" / "etl" / "dados" / "limites_curriculo.csv"
SAIDA_AVALIACOES = RAIZ / "scripts" / "etl" / "dados" / "avaliacoes_curriculo.csv"

ROTULOS = {
    "AEC": re.compile(r"ATIVIDADES?\s+EXTRA\s*-?\s*CLASSES?"),
    "TR": re.compile(r"TEMPO\s+RESERVA"),
    "TAD": re.compile(r"TEMPO\s+PARA\s+(?:A\s+)?ADMINISTRACAO"),
}
RE_NA_LINHA = re.compile(r"[\.…\s]{2,}\s*0*(\d{1,4})\s*HORAS?\b")
RE_CELULA_TA = re.compile(r"^\s*0*(\d{1,4})\s*TA\s*$")


def normalizar(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().upper()


@dataclass(frozen=True)
class Limite:
    arquivo: str
    curso_codigo: str
    categoria: str
    tempos: int
    pagina: int


# Os dois C-Espc são currículos por COMPETÊNCIA, sem UE, e por isso não aparecem em `pareamento_ue.csv`
# (CLAUDE.md, catálogo de UEs: "2 currículos sem UE por natureza"). O par vem nominal.
SEM_UE = {
    "of10-82-2024-densm-ana-c-espc-fr.pdf": "C-Espc-FR",
    "of10-82-2024-densm-anb-c-espc-hn.pdf": "C-Espc-HN",
}


def curso_por_arquivo() -> dict[str, str]:
    """O par arquivo → curso já revisado na carga das UEs (spec 010), mais os dois C-Espc."""
    mapa: dict[str, str] = dict(SEM_UE)
    with PAREAMENTO.open(encoding="utf-8") as f:
        for linha in csv.DictReader(f, delimiter=";"):
            if linha["arquivo"] and linha["curso_codigo"]:
                mapa.setdefault(linha["arquivo"], linha["curso_codigo"])
    return mapa


def limites_do_pdf(caminho: Path, curso: str) -> list[Limite]:
    achados: dict[str, Limite] = {}
    doc = fitz.open(caminho)
    for indice, pagina in enumerate(doc):
        linhas = pagina.get_text().split("\n")
        for j, linha in enumerate(linhas):
            n = normalizar(linha)
            # O rótulo do TAD na tabela dos C-Espc quebra em duas linhas: "TEMPO PARA" / "ADMINISTRAÇÃO".
            if j > 0 and n.strip().startswith("ADMINISTRACAO") and normalizar(linhas[j - 1]).strip().endswith("TEMPO PARA"):
                n = "TEMPO PARA " + n
            for categoria, padrao in ROTULOS.items():
                if categoria in achados or not padrao.search(n):
                    continue
                m = RE_NA_LINHA.search(n[padrao.search(n).end():])
                if m:
                    achados[categoria] = Limite(caminho.name, curso, categoria, int(m.group(1)), indice + 1)
                    continue
                # Formato de tabela (C-Espc): "(SIGLA)" e "N TA" nas linhas seguintes.
                seguintes = [normalizar(x) for x in linhas[j + 1 : j + 4]]
                if any(f"({categoria})" in s for s in seguintes):
                    for s in seguintes:
                        c = RE_CELULA_TA.match(s)
                        if c:
                            achados[categoria] = Limite(caminho.name, curso, categoria, int(c.group(1)), indice + 1)
                            break
    return sorted(achados.values(), key=lambda x: ("AEC", "TAD", "TR").index(x.categoria))


def extrair_limites(dir_pdf: Path) -> list[Limite]:
    mapa = curso_por_arquivo()
    saida: list[Limite] = []
    for pdf in sorted(dir_pdf.glob("*.pdf")):
        curso = mapa.get(pdf.name)
        if curso is None:
            print(f"  (sem curso no pareamento: {pdf.name})", file=sys.stderr)
            continue
        saida.extend(limites_do_pdf(pdf, curso))
    return saida


def gravar(limites: list[Limite], destino: Path) -> None:
    with destino.open("w", encoding="utf-8", newline="\n") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\n")
        w.writerow(["curso_codigo", "categoria", "tempos", "fonte_arquivo", "fonte_pagina", "conferido"])
        for x in sorted(limites, key=lambda x: (x.curso_codigo, x.categoria)):
            w.writerow([x.curso_codigo, x.categoria, x.tempos, x.arquivo, x.pagina, ""])


# =================================================================================================
# PARTE 2 — as avaliações de cada disciplina (PR 4, T126)
#
# Formatos reais, medidos em 14/10/2026 nos 24 PDFs (texto do PyMuPDF):
#   "4) AVALIAÇÃO DA APRENDIZAGEM" ... "5) RECURSOS INSTRUCIONAIS"     (a maioria; "d)" no PGRS100)
#   "Avaliação da Aprendizagem:" ... "CH DA" / "AVALIAÇÃO" / "5"      (C-Espc, por competência)
# Cada item é "1 (uma) PM referente às UE 1 e 2. Serão utilizados 2 (dois) TA para a aplicação e
# 1 (um) TA para a realização dos comentários e vista da prova, debitados da UE 2", em alíneas
# ("a)", "I -", "1)") ou numa frase só. Variações que o leitor trata, todas vistas no texto:
#   "1 (TA)" e "1 (um) para a realização dos comentários" (sem a palavra TA) — CAHO, C-Ap-FR III;
#   "três (03) TA", "(dois) 02 TA", "dois 2 TA" — C-Exp-MetocOf, C-Esp-ALH;
#   "duração de 2 (duas) horas" — horas = TA (premissa A-10, a mesma da parte 1);
#   "P1: PM referente…" (sem quantidade, com rótulo) — CAHO;
#   "com duração de 2 TA cada" na abertura, valendo para cada prova — C-Esp-ALH.
# O que fica com `conferir` (lista fechada, ver `motivos` em `_ler_secao`): instrumento ambíguo
# ("TI ou TG"), instrumento fora da lista da §3.2 ("PT", prova eletrônica), mais de um item na mesma
# frase ("2 (duas) PP … 4 TA"), tempo em alínea separada, vista comum a várias provas, UE computada
# em mais de um lugar, prova comum a duas disciplinas e texto sem item reconhecível.
# =================================================================================================

INSTRUMENTOS: list[tuple[str, str]] = [
    # (padrão sobre o texto NORMALIZADO, sigla) — a ordem importa: o nome composto vem antes.
    (r"TI\s+OU\s+TG", "TI|TG"),
    (r"TRABALHO\s+INDIVIDUAL\s*\(TI\)\s+OU\s+TRABALHO\s+EM\s+GRUPO\s*\(TG\)", "TI|TG"),
    (r"PROVAS?\s+ESCRITAS?\s+MISTAS?(?:\s*\(PM\))?", "PM"),
    (r"PROVAS?\s+MISTAS?(?:\s*\(PM\))?", "PM"),
    (r"PROVAS?\s+ESCRITAS?\s+OBJETIVAS?(?:\s*\(PE\))?", "PE"),
    (r"PROVAS?\s+ESCRITAS?(?:\s*\(PE\))?", "PE"),
    (r"PROVAS?\s+PRATICAS?(?:\s*\(PP\))?", "PP"),
    (r"PROVAS?\s+ORA(?:L|IS)(?:\s*\(PO\))?", "PO"),
    (r"PROVAS?\s+DISCURSIVAS?(?:\s*\(PD\))?", "PD"),
    (r"PROVAS?\s+ELETRONICAS?(?:\s*\(?PT\)?)?", "PT"),
    (r"TRABALHOS?\s+EM\s+GRUPO(?:\s*\(TG\))?", "TG"),
    (r"TRABALHOS?\s+INDIVIDUA(?:L|IS)(?:\s*\(TI\))?", "TI"),
    (r"ESTUDOS?\s+DE\s+CASO(?:\s*\(EC\))?", "EC"),
    (r"PROJETO\s+DE\s+PESQUISA", "PJ"),
    (r"MONOGRAFIAS?", "MN"),
    (r"OBSERVACA?O\s+D[EO]\s+DESEMPENHO(?:\s*\(OD\))?", "OD"),
    (r"(?:PM|PE|PP|PO|PD|PT|TG|TI|EC|PJ|MN|OD)\b", ""),  # sigla solta: a sigla é o próprio texto
]
SIGLAS_VALIDAS = {"PE", "PM", "PP", "PO", "PD", "TG", "TI", "EC", "PJ", "MN", "OD"}  # data-model §3.2
_RE_INSTR = "|".join(f"(?:{p})" for p, _ in INSTRUMENTOS)
_QTD_PALAVRA = {"UM": 1, "UMA": 1, "DOIS": 2, "DUAS": 2, "TRES": 3, "QUATRO": 4}
RE_ITEM_COM_QTD = re.compile(
    rf"(?:\b(\d{{1,2}})\s*\((?:UM|UMA|DOIS|DUAS|TRES|QUATRO)\)|\b(UMA?|DUAS|DOIS|TRES)\b"
    rf"|\((UMA?|DUAS|DOIS)\))\s*(?P<instr>{_RE_INSTR})"  # "(uma) PP" sem o algarismo: C-Espc-FR PSFFR-014
)
# Sem quantidade, só em dois contextos seguros: o rótulo da alínea ("P1: PM", "T - 1 (um) TI",
# "T1: projeto de pesquisa") e "por meio de OD".
RE_ITEM_ROTULO = re.compile(rf"^\s*(?:[A-Z]{{1,2}}\d?)\s*[:\-–]\s*(?P<instr>{_RE_INSTR})")
RE_ITEM_POR_MEIO = re.compile(rf"POR\s+MEIO\s+DE\s+(?P<instr>OD\b|OBSERVACA?O\s+D[EO]\s+DESEMPENHO(?:\s*\(OD\))?)")

RE_INICIO_SECAO = re.compile(r"^\s*(?:\d+|[a-z])\s*[)\-.]\s*AVALIA[CÇ][AÃ]O\s+DA\s+APRENDIZAGEM\s*$", re.I)
RE_INICIO_SECAO_ESPC = re.compile(r"^\s*AVALIA[CÇ][AÃ]O\s+DA\s+APRENDIZAGEM\s*:", re.I)
RE_FIM_SECAO = re.compile(
    r"^\s*(?:(?:\d+|[a-z])\s*[)\-.]\s*(?:RECURSOS?|REFER|BIBLIO|DIRETRIZ|OBJETIV|LISTA|CONTE|T[EÉ]CNICA|METODOLOG)"
    r"|REQUISITOS\s+E\s+QUANTITATIVOS?|CH\s+DA\s*$|CORRIDA\s+DE\s)",
    re.I,
)
RE_ENUMERADOR = re.compile(r"^\s*(?:[a-z]\)|[IVX]{1,4}\s*[-–]\s|\d{1,2}\))")
RE_RUIDO_AV = re.compile(r"^\s*(?:Continua[çc][ãa]o do anexo|-\s*[A-Z]?-?\d+\s+de\s+\d+\s*-)", re.I)

# Cabeçalho de disciplina — os três formatos (ver a parte de UEs em `extrair_unidades_ensino.py`).
RE_CAB_CODIGO = re.compile(r"^\s*C[OÓ]DIGO\s*:\s*(.*?)\s*(?:CARGA\s+HOR[AÁ]RIA.*)?$", re.I)
RE_CAB_DISCIPLINA = re.compile(r"^\s*DISCIPLINA\s*[IVXLC]*\s*:\s*(.*)$", re.I)
RE_CAB_SIGLA = re.compile(r"^\s*SIGLA\s*:\s*(\S.*?)\s*$", re.I)
RE_CAB_PLANO = re.compile(r"^\s*PLANO\s+DA\s+DISCIPLINA\s+(.+?)\s*$", re.I)
RE_CH = re.compile(r"CARGA\s+HOR[AÁ]RIA\s*:\s*(\d+)", re.I)

# Menção a tempo: "2 (dois) TA", "1 (TA)", "três (03) TA", "(dois) 02 TA", "dois 2 TA", "2 (duas) horas",
# e o "1 (um) para a realização dos comentários" sem a palavra TA.
_EXT = r"\((?:UM|UMA|DOIS|DUAS|TRES|QUATRO|CINCO|SEIS|SETE|OITO|NOVE|DEZ|QUARENTA|[A-Z ]{2,20})\)"
RE_TEMPO = re.compile(
    rf"(?:\b(\d{{1,2}})\s*(?:{_EXT})?\s*(?:\(TA\)|TA\b|HORAS?\b)"
    rf"|{_EXT}\s*0?(\d{{1,2}})\s*TA\b"
    rf"|\b[A-Z]{{2,8}}\s*\(0?(\d{{1,2}})\)\s*TA\b"
    rf"|\b[A-Z]{{3,8}}\s+(\d{{1,2}})\s*TA\b"
    rf"|\b(\d{{1,2}})\s*{_EXT}\s*(?=PARA\s+A\s+REALIZACAO\s+DOS\s+COMENTARIOS))"
)
RE_UE_COMPUTADA = re.compile(
    r"(?:COMPUTAD|DEBITAD)\w*\s+(?:N|D)[AO]S?\s+(?:UNIDADE\s+DE\s+ENSINO\s*\(UE\)|UE)\s*(\d{1,2})(\s+DA\s+DISCIPLINA\s+[IVX]+)?"
)
RE_UES_ABORDADAS = re.compile(
    r"(?:REFERENTES?|ABORDANDO|SOBRE)\s+(?:A|AS|AOS?)?\s*"
    r"(TODA\s+(?:A\s+)?DISCIPLINA|TODAS\s+AS\s+(?:UE|UNIDADES\s+DE\s+ENSINO)|TODO\s+O\s+CONTEUDO\s+DA\s+DISCIPLINA"
    r"|INDICADORES\s+(?:DO\s+)?\d+(?:[.,]\d+)?(?:\s*(?:,|E|A|DO|E\s+DO)?\s+(?:DO\s+)?\d+(?:[.,]\d+)?|\s*,\s*\d+(?:[.,]\d+)?)*|DISCIPLINAS\s+OPAP\s+I\s+E\s+II"
    r"|(?:UNIDADE\s+DE\s+ENSINO\s*\()?UES?\)?\s*\d{1,2}(?:\s*(?:,|E|A|OU)\s*\d{1,2})*)"
)
RE_TA_CADA = re.compile(r"DURACAO\s+DE\s+(\d{1,2})\s*TA\s+CADA")
RE_FREQUENCIA = re.compile(r"NAO\s+INFRINGIR\s+OS\s+REQUISITOS\s+DE\s+FREQUENCIA")


# Regra de vista que o currículo escreve UMA vez, na sinopse geral, e não repete na disciplina. O leitor não
# a aplica sozinho (seria número fora da seção da disciplina); ela vai para a conferência.
# Medido em 14/10/2026: `c-esp-alh.pdf`, p. 4, alínea g) — "Será destinado 1 TA para a realização dos
# comentários e vista de prova".
NOTA_GERAL_DE_VISTA = {
    "c-esp-alh.pdf": "a sinopse geral (p. 4, alínea g) destina 1 TA de comentários e vista por prova; a disciplina não repete",
}


@dataclass
class ItemAvaliacao:
    curso_codigo: str
    disciplina_cod: str
    disciplina_nome: str
    ordem: int
    instrumento: str
    numero: int
    ue_computada: str
    ues_abordadas: str
    ta_aplicacao: int | None
    ta_vista: int | None
    arquivo: str
    pagina: int
    trecho: str
    conferido: str = ""


@dataclass
class DisciplinaAvaliada:
    """Uma disciplina do currículo, com a CH do cabeçalho e, nos C-Espc, a CH DA AVALIAÇÃO."""

    codigo: str
    nome: str
    ch: int | None
    ch_avaliacao: int | None = None
    linhas_secao: list[tuple[int, str]] | None = None   # (página, linha) da seção de avaliação
    so_frequencia: bool = False
    do_plano: bool = False    # C-Espc: nasceu de "PLANO DA DISCIPLINA"
    codigo_sumario: str = ""  # C-Espc: o código que o SUMÁRIO dá ao mesmo nome, para conferir com o do plano


def _limpo(texto: str) -> str:
    texto = texto.replace("…", " ")
    texto = re.sub(r"[.·]{3,}", " ", texto)
    return re.sub(r"\s+", " ", texto).strip(" .;-–—")


def _sigla_de(trecho_instr: str) -> str:
    for padrao, sigla in INSTRUMENTOS:
        if re.fullmatch(padrao, trecho_instr.strip()):
            return sigla or trecho_instr.strip()
    return trecho_instr.strip()


def disciplinas_do_pdf(caminho: Path) -> list[DisciplinaAvaliada]:
    """Percorre o PDF e devolve as disciplinas, cada uma com as linhas da sua seção de avaliação."""
    doc = fitz.open(caminho)
    linhas: list[tuple[int, str]] = []
    for indice, pagina in enumerate(doc):
        for linha in pagina.get_text().split("\n"):
            if linha.strip() and not RE_RUIDO_AV.match(linha):
                linhas.append((indice + 1, linha.rstrip()))
    doc.close()

    saida: list[DisciplinaAvaliada] = []
    atual: DisciplinaAvaliada | None = None
    codigo_pendente: str | None = None
    ch_pendente: int | None = None
    dentro = False
    i = 0
    while i < len(linhas):
        pagina, bruta = linhas[i]
        linha = bruta.strip()

        if dentro and atual is not None:
            if re.match(r"^\s*CH\s+DA\s*$", linha, re.I):
                # C-Espc: a célula "CH DA" / "AVALIAÇÃO" / "<n>" é da tabela e pode cair NO MEIO do texto
                # da avaliação (quebra de página, C-Espc-HN OCEANOGRAFIA): registra o número e segue lendo.
                salto = 1
                for k, (_, prox) in enumerate(linhas[i + 1 : i + 4], start=1):
                    if re.fullmatch(r"\s*\d{1,3}\s*", prox):
                        atual.ch_avaliacao = int(prox)
                        salto = k + 1
                        break
                i += salto
                continue
            if RE_FIM_SECAO.match(linha) or RE_CAB_CODIGO.match(linha) or RE_CAB_DISCIPLINA.match(linha) \
                    or RE_CAB_PLANO.match(linha):
                dentro = False
            else:
                assert atual.linhas_secao is not None
                atual.linhas_secao.append((pagina, linha))
                i += 1
                continue

        m = RE_CAB_PLANO.match(linha)
        if m:  # C-Espc
            atual = DisciplinaAvaliada(codigo="", nome=_limpo(m.group(1)), ch=None, do_plano=True)
            saida.append(atual)
            i += 1
            continue
        if atual is not None and re.match(r"^\s*C[OÓ]DIGO\s+DA\s+DISCIPLINA\s*$", linha, re.I) and i + 1 < len(linhas):
            prox = _limpo(linhas[i + 1][1])
            if re.search(r"CARGA\s+HOR", prox, re.I):  # a célula do código veio vazia (C-Espc-HN, TOPOGRAFIA)
                i += 1
                continue
            atual.codigo = atual.codigo or prox
            i += 2
            continue
        if atual is not None and re.match(r"^\s*CARGA\s+HOR[AÁ]RIA\s*\(TA\)\s*$", linha, re.I) and i + 1 < len(linhas):
            if re.fullmatch(r"\s*\d{1,3}\s*", linhas[i + 1][1]) and atual.ch is None:
                atual.ch = int(linhas[i + 1][1])
            i += 2
            continue

        m = RE_CAB_CODIGO.match(linha)
        if m:
            codigo = re.sub(r"\s*-\s*", "-", _limpo(m.group(1)))  # "HN-2102- 0150" → "HN-2102-0150"
            mch = RE_CH.search(linha)
            ch = int(mch.group(1)) if mch else None
            # Obs-ME põe DISCIPLINA antes de CÓDIGO: o cabeçalho é da disciplina corrente.
            if atual is not None and not atual.codigo and atual.linhas_secao == []:
                atual.codigo = codigo
                atual.ch = atual.ch if atual.ch is not None else ch
            else:
                codigo_pendente, ch_pendente = codigo, ch
            i += 1
            continue

        mch = RE_CH.search(linha)
        if mch and not re.search(r"TOTAL|REAL", linha, re.I):
            if codigo_pendente is not None and ch_pendente is None:
                ch_pendente = int(mch.group(1))
            elif atual is not None and atual.ch is None and atual.linhas_secao == []:
                atual.ch = int(mch.group(1))

        m = RE_CAB_DISCIPLINA.match(linha)
        if m:
            nome = _limpo(re.sub(r"\b(?:ATUALIZAD[OA]|CRIAD[OA])\s+EM\s+\d{4}.*$", "", m.group(1), flags=re.I))
            if not nome and i + 1 < len(linhas):
                nome = _limpo(linhas[i + 1][1])
            atual = DisciplinaAvaliada(codigo=codigo_pendente or "", nome=nome, ch=ch_pendente, linhas_secao=[])
            saida.append(atual)
            codigo_pendente, ch_pendente = None, None
            i += 1
            continue

        m = RE_CAB_SIGLA.match(linha)
        if m and atual is not None and not atual.codigo and atual.linhas_secao == []:
            atual.codigo = re.sub(r"\s+", "", m.group(1)).upper()  # C-Exp-MetocOf: "METOC - I" → "METOC-I"

        if atual is not None and (RE_INICIO_SECAO.match(linha) or RE_INICIO_SECAO_ESPC.match(linha)):
            if atual.linhas_secao:  # a mesma disciplina não tem duas seções; se tiver, a 2ª é ruído
                i += 1
                continue
            atual.linhas_secao = []
            resto = RE_INICIO_SECAO_ESPC.sub("", linha).strip() if RE_INICIO_SECAO_ESPC.match(linha) else ""
            atual.linhas_secao.append((pagina, resto or "<inicio>"))
            dentro = True
        i += 1
    # C-Espc: o SUMÁRIO lista "CÓDIGO - NOME……"; serve para preencher o código que o plano deixou vazio
    # e para conferir o que o plano traz.
    sumario: dict[str, str] = {}
    for _, l in linhas[:150]:
        ms = re.match(r"^\s*([A-Z]{2,}[A-Z0-9]*-\d{3,4}(?:-\d{3,4})?)\s*-\s*(.+?)[\s.…]*$", l)
        if ms:
            sumario[normalizar(_limpo(ms.group(2)))] = ms.group(1)
    for d in saida:
        nome = re.sub(r"^DE\s+", "", normalizar(d.nome))
        if d.do_plano and nome in sumario:
            d.codigo_sumario = sumario[nome]
            d.codigo = d.codigo or sumario[nome]
    for d in saida:
        if d.linhas_secao is None:
            d.linhas_secao = []
        d.linhas_secao = [x for x in d.linhas_secao if x[1] != "<inicio>"] or (
            [(d.linhas_secao[0][0], "")] if d.linhas_secao else []
        )
    return saida


def _tempos(texto: str) -> list[tuple[int, str, int, int]]:
    """Cada menção a tempo: (valor, papel 'aplicacao'|'vista'|'misto', início, fim)."""
    achados = [(int(next(g for g in m.groups() if g)), m.start(), m.end()) for m in RE_TEMPO.finditer(texto)]
    saida = []
    for k, (valor, ini, fim) in enumerate(achados):
        janela = texto[fim : (achados[k + 1][1] if k + 1 < len(achados) else fim + 90)][:90]
        tem_aplic = re.search(r"APLICA|ELABORA|APRESENTA", janela)
        tem_vista = re.search(r"COMENTARIO|VISTA", janela)
        papel = "misto" if tem_aplic and tem_vista else ("vista" if tem_vista else "aplicacao")
        saida.append((valor, papel, ini, fim))
    return saida


def _ues(texto: str) -> str:
    m = RE_UES_ABORDADAS.search(texto)
    if not m:
        return ""
    v = re.sub(r"\s+", " ", m.group(1)).strip(" .,")
    v = re.sub(r"^(?:UNIDADE DE ENSINO \()?UES?\)?\s*(?=\d)", "UE ", v).lower()
    v = re.sub(r"\bue\b", "UE", v)
    return re.sub(r"\bopap i e ii\b", "OPAP I e II", v)


def _ler_secao(curso: str, disc: DisciplinaAvaliada, arquivo: str) -> list[ItemAvaliacao]:
    linhas = disc.linhas_secao or []
    texto_todo = normalizar(" ".join(l for _, l in linhas))
    if RE_FREQUENCIA.search(texto_todo):
        disc.so_frequencia = True
        return []

    # Alíneas: o bloco 0 é a abertura ("média aritmética de 2 (duas) PM…"), que RESUME e não é item
    # quando há alíneas com item.
    blocos: list[list[tuple[int, str]]] = [[]]
    for pagina, linha in linhas:
        if RE_ENUMERADOR.match(linha) and blocos[-1]:
            blocos.append([])
        blocos[-1].append((pagina, linha))

    def itens_do_bloco(bloco: list[tuple[int, str]], abertura: bool) -> list[tuple[str, int, int, str, int]]:
        """(sigla, quantidade, posição, texto normalizado do bloco, página) de cada item do bloco."""
        texto = normalizar(" ".join(l for _, l in bloco))
        texto_sem_enum = re.sub(RE_ENUMERADOR.pattern, "", texto, count=1, flags=re.I).strip() if not abertura else texto
        achados = []
        for m in RE_ITEM_COM_QTD.finditer(texto_sem_enum):
            # "média aritmética entre as 2 (duas) PP" retoma itens já contados (C-Ap-FR, TFM)
            if re.search(r"(?:ENTRE\s+(?:AS|OS)|\bD[AO]S|\bN[AO]S)\s*$", texto_sem_enum[: m.start()]):
                continue
            qtd = int(m.group(1)) if m.group(1) else _QTD_PALAVRA[m.group(2) or m.group(3)]
            achados.append((_sigla_de(m.group("instr")), qtd, m.start(), texto_sem_enum))
        if not achados:
            m = RE_ITEM_ROTULO.match(texto_sem_enum) or RE_ITEM_POR_MEIO.search(texto_sem_enum)
            if m:
                achados.append((_sigla_de(m.group("instr")), 1, m.start(), texto_sem_enum))
        return [(s, q, p, t, bloco[0][0]) for s, q, p, t in achados]

    com_item = [(b, itens_do_bloco(b, k == 0)) for k, b in enumerate(blocos)]
    usar_abertura = not any(itens for k, (_, itens) in enumerate(com_item) if k > 0)

    brutos: list[dict] = []          # um por item, antes da numeração
    soltos: list[tuple[str, list]] = []  # blocos sem item com tempo: (texto, tempos)
    for k, (bloco, itens) in enumerate(com_item):
        if k == 0 and not usar_abertura:
            continue
        texto_bloco = normalizar(" ".join(l for _, l in bloco))
        if not itens:
            ts = _tempos(texto_bloco)
            if ts:
                soltos.append((texto_bloco, ts))
                if brutos and not any(p in ("vista", "misto") for _, p, _, _ in ts):
                    # tempo de aplicação em sub-alínea ("I - 1 (um) TA da UE 3") pertence ao item anterior
                    anterior = brutos[-1]
                    anterior["aplic_partes"] += [v for v, _, _, _ in ts]
                    anterior["motivos"].append("tempo distribuído em sub-alíneas: " + _limpo(texto_bloco)[:80])
                    soltos.pop()
            continue
        for j, (sigla, qtd, pos, texto, pagina) in enumerate(itens):
            fim = itens[j + 1][2] if j + 1 < len(itens) else len(texto)
            trecho = texto[pos:fim]
            ts = _tempos(trecho)
            motivos: list[str] = []
            aplic = [v for v, p, _, _ in ts if p in ("aplicacao", "misto")]
            vista = [v for v, p, _, _ in ts if p == "vista"]
            if any(p == "misto" for _, p, _, _ in ts):
                motivos.append("aplicação e comentários no mesmo tempo")
            ues_comp = [(m.group(1), m.group(2)) for m in RE_UE_COMPUTADA.finditer(trecho)]
            ue = ues_comp[0][0] if ues_comp else ""
            if len({u for u, _ in ues_comp}) > 1:
                motivos.append("tempo computado em mais de uma UE: " + ", ".join(sorted({u for u, _ in ues_comp})))
            if any(outra for _, outra in ues_comp):
                motivos.append("computado em UE de outra disciplina")
            if "DISCIPLINAS OPAP" in trecho:
                motivos.append("a mesma prova vale para OPAP I e II; não contar duas vezes")
            if sigla == "TI|TG":
                motivos.append("instrumento ambíguo: TI ou TG")
            elif sigla not in SIGLAS_VALIDAS:
                motivos.append(f"instrumento {sigla} fora da lista da §3.2")
            if "ATIVIDADES EXTRACLASSE" in trecho:
                motivos.append("elaboração com a CH das atividades extraclasse")
            for n in range(qtd):
                brutos.append({
                    "sigla": sigla, "pagina": pagina, "ues": _ues(trecho), "ue": ue,
                    "aplic_partes": aplic if qtd == 1 else [], "vista_partes": vista if qtd == 1 else [],
                    "motivos": motivos + ([f"{qtd} itens declarados juntos, com o tempo para o conjunto"] if qtd > 1 else []),
                    "trecho": _limpo(" ".join(l for _, l in bloco))[:240],
                })

    # Sem item reconhecível, mas há texto: uma linha só, para a revisão humana (nunca número inventado).
    if not brutos and texto_todo.strip():
        if re.search(r"RELATORIO", texto_todo):
            sigla, motivo = "TI", "relatório individual com conceito, sem TA; decidir se é item"
        elif re.search(r"ENTREGA\s+DO\s+PROJETO", texto_todo):
            sigla, motivo = "PJ", "entrega de projeto no AVA, sem TA"
        elif re.search(r"ENTREGA\s+DO\s+TRABALHO", texto_todo):
            sigla, motivo = "TI", "entrega de trabalho no AVA, sem TA; individual ou em grupo não dito"
        elif re.search(r"OBSERVAC(?:AO|OES)\s+D[EO]\s+DESEMPENHO|\bOD\b", texto_todo):
            sigla, motivo = "OD", ""
        else:
            sigla, motivo = "", "texto sem item reconhecível"
        brutos.append({
            "sigla": sigla, "pagina": linhas[0][0], "ues": "", "ue": "", "aplic_partes": [], "vista_partes": [],
            "motivos": [motivo] if motivo else [], "trecho": _limpo(" ".join(l for _, l in linhas))[:240],
        })

    # Tempo em alínea separada, sem instrumento: a vista ("c) Será utilizado 1 (um) TA para … vista").
    for texto_bloco, ts in soltos:
        vistas = [v for v, p, _, _ in ts if p in ("vista", "misto")]
        if len(brutos) == 1 and vistas and not brutos[0]["vista_partes"]:
            brutos[0]["vista_partes"] = vistas
            mu = RE_UE_COMPUTADA.search(texto_bloco)
            if mu and not brutos[0]["ue"]:
                brutos[0]["ue"] = mu.group(1)
        else:
            rotulo = "vista em alínea separada, comum às provas" if vistas else "tempo em alínea separada"
            for b in brutos:
                b["motivos"].append(f"{rotulo}: " + _limpo(texto_bloco)[:90])

    # "com duração de 2 TA cada" (C-Esp-ALH)
    m_cada = RE_TA_CADA.search(texto_todo)
    if m_cada:
        for b in brutos:
            if not b["aplic_partes"]:
                b["aplic_partes"] = [int(m_cada.group(1))]
    if "SERA ALOCADO TEMPO" in texto_todo:
        for b in brutos:
            b["motivos"].append("o currículo aloca tempo de vista sem dar o número")

    nota = NOTA_GERAL_DE_VISTA.get(arquivo)
    if nota:
        for b in brutos:
            if not b["vista_partes"]:
                b["motivos"].append(nota)

    if disc.codigo_sumario and disc.codigo_sumario != disc.codigo:
        for b in brutos:
            b["motivos"].append(f"código no plano {disc.codigo} × no sumário {disc.codigo_sumario}")

    itens: list[ItemAvaliacao] = []
    por_sigla: dict[str, int] = {}
    for ordem, b in enumerate(brutos, start=1):
        por_sigla[b["sigla"]] = por_sigla.get(b["sigla"], 0) + 1
        aplic = sum(b["aplic_partes"]) if b["aplic_partes"] else None
        vista = sum(b["vista_partes"]) if b["vista_partes"] else None
        if len(b["aplic_partes"]) > 1 and not any("sub-alíneas" in x for x in b["motivos"]):
            b["motivos"].append("aplicação em partes: " + " + ".join(map(str, b["aplic_partes"])))
        if len(b["vista_partes"]) > 1:
            b["motivos"].append("vista em partes: " + " + ".join(map(str, b["vista_partes"])))
        motivos = list(dict.fromkeys(m for m in b["motivos"] if m))
        itens.append(ItemAvaliacao(
            curso_codigo=curso, disciplina_cod=disc.codigo, disciplina_nome=disc.nome, ordem=ordem,
            instrumento=b["sigla"], numero=por_sigla[b["sigla"]], ue_computada=b["ue"], ues_abordadas=b["ues"],
            ta_aplicacao=aplic, ta_vista=vista, arquivo=arquivo, pagina=b["pagina"], trecho=b["trecho"],
            conferido=("conferir: " + "; ".join(motivos)) if motivos else "",
        ))
    # C-Espc: a CH DA AVALIAÇÃO é o total da disciplina; o que não fecha com ela vai para conferência.
    if disc.ch_avaliacao is not None:
        soma = sum((x.ta_aplicacao or 0) + (x.ta_vista or 0) for x in itens)
        if soma != disc.ch_avaliacao:
            for x in itens:
                extra = f"CH DA AVALIAÇÃO {disc.ch_avaliacao} × soma dos itens {soma}"
                x.conferido = (x.conferido + "; " + extra) if x.conferido else "conferir: " + extra
    return itens


# EST-QF-APOC: o PDF não tem camada de texto (CLAUDE.md, catálogo de UEs: as 5 UEs foram transcritas
# de imagem, P-4). A avaliação NÃO foi transcrita: sai uma linha por disciplina, sem número.
DIGITALIZADOS = {"marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf"}


def disciplinas_do_pareamento(curso: str) -> list[tuple[str, str]]:
    vistos: dict[tuple[str, str], None] = {}
    with PAREAMENTO.open(encoding="utf-8") as f:
        for linha in csv.DictReader(f, delimiter=";"):
            if linha["curso_codigo"] == curso and linha["curriculo_disciplina"]:
                vistos[(linha["curriculo_ordinal"], linha["curriculo_disciplina"])] = None
    return list(vistos)


def avaliacoes_do_pdf(caminho: Path, curso: str) -> tuple[list[ItemAvaliacao], list[DisciplinaAvaliada]]:
    if caminho.name in DIGITALIZADOS:
        itens = [
            ItemAvaliacao(curso, cod, nome, 1, "", 1, "", "", None, None, caminho.name, 1, "",
                          "conferir: PDF digitalizado, sem camada de texto; transcrever da imagem (P-4)")
            for cod, nome in disciplinas_do_pareamento(curso)
        ]
        return itens, []
    discs = [d for d in disciplinas_do_pdf(caminho) if d.linhas_secao]
    itens: list[ItemAvaliacao] = []
    for d in discs:
        itens.extend(_ler_secao(curso, d, caminho.name))
    return itens, discs


def extrair_avaliacoes(dir_pdf: Path) -> tuple[list[ItemAvaliacao], dict[str, list[DisciplinaAvaliada]]]:
    mapa = curso_por_arquivo()
    itens: list[ItemAvaliacao] = []
    por_curso: dict[str, list[DisciplinaAvaliada]] = {}
    for pdf in sorted(dir_pdf.glob("*.pdf")):
        curso = mapa.get(pdf.name)
        if curso is None:
            print(f"  (sem curso no pareamento: {pdf.name})", file=sys.stderr)
            continue
        novos, discs = avaliacoes_do_pdf(pdf, curso)
        itens.extend(novos)
        por_curso[curso] = discs
    return itens, por_curso


COLUNAS_AVALIACOES = [
    "curso_codigo", "disciplina_cod", "disciplina_nome", "ordem", "instrumento", "numero", "ue_computada",
    "ues_abordadas", "ta_aplicacao", "ta_vista", "origem", "fonte_arquivo", "fonte_pagina", "trecho", "conferido",
]


def gravar_avaliacoes(itens: list[ItemAvaliacao], destino: Path) -> None:
    with destino.open("w", encoding="utf-8", newline="\n") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\n")
        w.writerow(COLUNAS_AVALIACOES)
        for x in itens:  # na ordem do PDF: curso (arquivo), disciplina, ordem
            w.writerow([
                x.curso_codigo, x.disciplina_cod, x.disciplina_nome, x.ordem, x.instrumento, x.numero,
                x.ue_computada, x.ues_abordadas, "" if x.ta_aplicacao is None else x.ta_aplicacao,
                "" if x.ta_vista is None else x.ta_vista, "curriculo", x.arquivo, x.pagina, x.trecho, x.conferido,
            ])


def main(argv: list[str]) -> int:
    if len(argv) < 3 or argv[1] not in ("limites", "avaliacoes"):
        print(__doc__)
        return 2
    if argv[1] == "avaliacoes":
        destino = Path(argv[3]) if len(argv) > 3 else SAIDA_AVALIACOES
        itens, _ = extrair_avaliacoes(Path(argv[2]))
        gravar_avaliacoes(itens, destino)
        conferir = sum(1 for x in itens if x.conferido.startswith("conferir"))
        print(f"{len(itens)} itens em {len({x.curso_codigo for x in itens})} cursos "
              f"({conferir} com 'conferir') -> {destino}")
        return 0
    destino = Path(argv[3]) if len(argv) > 3 else SAIDA_PADRAO
    limites = extrair_limites(Path(argv[2]))
    gravar(limites, destino)
    print(f"{len(limites)} limites em {len({x.curso_codigo for x in limites})} cursos -> {destino}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
