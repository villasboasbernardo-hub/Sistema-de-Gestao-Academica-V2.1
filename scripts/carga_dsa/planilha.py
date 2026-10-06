"""Leitura da planilha de controle — PREENCHIMENTO e BD DISCIPLINAS — e montagem dos blocos.

O MODELO (medido em `C-EXP-METOC-OF T01_26.xlsx` e na planilha da turma piloto, 06/10/2026):

  PREENCHIMENTO   uma faixa de 60 linhas por semana; em cada dia, 9 linhas de TA.
                  B = data (numa das linhas do dia) · C = TA ("1º".."9º") · D = COD · E = U.E.
  BD DISCIPLINAS  o catalogo: A = COD · B = disciplina · C = Nº UE · E = topico · F = CH ·
                  G = local · H = T/E · I = instrutor.
  IMPRESSAO       o DSA assinado — formulas sobre o catalogo. NAO e lido: o que ele mostra sai
                  de PREENCHIMENTO + BD DISCIPLINAS, e as celulas digitadas a mao por cima das
                  formulas entram pelas DECISOES da turma, nunca por leitura cega.
  CRONOS          planejamento. ⚠️ NUNCA e lido por este modulo.

⚠️ LINHA DE TA E SO A QUE TEM "Nº" NA COLUNA C. O que alguem digitou em D/E numa linha de
   cabecalho nao e TA: fica fora dos blocos e volta em `ignoradas`, para ser visto e nao sumir.

⚠️ A DATA VEM DO VALOR CALCULADO PELO EXCEL (as celulas de data sao formulas `=B6+1`). Planilha
   salva sem valor em cache e RECUSADA: derivar a data por conta propria seria inventar o
   calendario que a planilha diz ter.

Modulo puro: nao conhece banco. Recebe caminho de arquivo, devolve dado.
"""

from __future__ import annotations

import csv
import re
import warnings
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import openpyxl

ABA_PREENCHIMENTO = "PREENCHIMENTO"
ABA_CATALOGO = "BD DISCIPLINAS"
ABA_CONTROLE = "CONTROLE"

_TA = re.compile(r"^\s*(\d{1,2})\s*[ºo°]\s*$")


class PlanilhaInvalida(Exception):
    """A planilha nao tem a forma do modelo. Nada foi lido pela metade."""


def texto(valor: object) -> str:
    """Celula como texto: sem espaco nas pontas, e `30.0` (numero do Excel) vira `30`."""
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return str(valor)
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    if isinstance(valor, (int, float)):
        return str(valor)
    return str(valor).strip()


@dataclass(frozen=True)
class LinhaDoCatalogo:
    """Uma linha de BD DISCIPLINAS, como esta escrita — a traducao e de quem resolve o bloco."""

    linha: int
    cod: str
    disciplina: str
    ue: str
    topico: str
    ch: int | None
    local: str
    tecnica: str
    instrutor: str
    # «CH CONCLUIDA»: quantos TA a PROPRIA planilha conta nesta chave (CONT.SE sobre o ESPELHO).
    ch_concluida: int | None = None

    @property
    def chave(self) -> tuple[str, str]:
        return (self.cod, self.ue)


@dataclass(frozen=True)
class LinhaDeTa:
    """Um TA preenchido: uma linha de PREENCHIMENTO."""

    linha: int
    data: date
    ta: int
    cod: str
    ue: str


@dataclass(frozen=True)
class Bloco:
    """TA consecutivos do mesmo dia com a mesma chave COD+UE."""

    linha: int  # a linha de PREENCHIMENTO em que o bloco comeca — e dela que sai o codigo
    data: date
    ta_inicial: int
    tempos: int
    cod: str
    ue: str

    @property
    def chave(self) -> tuple[str, str]:
        return (self.cod, self.ue)

    @property
    def ta_final(self) -> int:
        return self.ta_inicial + self.tempos - 1


@dataclass(frozen=True)
class CelulaIgnorada:
    """Conteudo em D/E fora de linha de TA — relatado, nunca carregado."""

    celula: str
    valor: str


@dataclass
class Leitura:
    sigla: str
    alunos: str
    catalogo: dict[tuple[str, str], LinhaDoCatalogo]
    linhas: list[LinhaDeTa]
    blocos: list[Bloco]
    ignoradas: list[CelulaIgnorada] = field(default_factory=list)
    # Chaves repetidas no catalogo: valeu a primeira linha, como no PROCV da planilha.
    duplicadas: list[LinhaDoCatalogo] = field(default_factory=list)
    # A aba CONTROLE: COD da disciplina → (CH prevista, CH cumprida), como a planilha as calcula.
    controle: dict[str, tuple[int | None, int | None]] = field(default_factory=dict)
    # Chaves usadas no PREENCHIMENTO que o catalogo nao tem: na IMPRESSAO da planilha saem como
    # erro de PROCV. O bloco nao e carregado e vai para a lista de erros de planilha.
    sem_catalogo: list[tuple[str, str]] = field(default_factory=list)
    # A sigla de cada cabecalho de semana do PREENCHIMENTO, para a lista de erros de planilha.
    siglas: list[str] = field(default_factory=list)
    # A IMPRESSAO, linha a linha (o DSA assinado), e as celulas DIGITADAS por cima das formulas.
    impressao: dict[int, dict[str, str]] = field(default_factory=dict)
    digitadas: dict[int, dict[str, str]] = field(default_factory=dict)
    impressao_alinhada: bool = False
    # A aba HORARIOS: as tabelas de consulta de horario, de onde sai o relogio do curso (relogio.py).
    horarios: list = field(default_factory=list)
    # Curso regular: o Estudo Individual que a IMPRESSAO imprime por dia (nao vem do PREENCHIMENTO) e os
    # dias em que a IMPRESSAO e o PREENCHIMENTO nao tem o mesmo numero de blocos.
    impressao_ei: dict = field(default_factory=dict)
    # A aba DATAS AVALIACOES dos regulares: qual vista e de qual prova, com as datas (e insumo do Epico 8).
    datas_avaliacoes: list = field(default_factory=list)
    dias_desalinhados: list = field(default_factory=list)


def _abrir(caminho: Path):
    if not caminho.is_file():
        raise PlanilhaInvalida(f"arquivo nao encontrado: {caminho}")
    with warnings.catch_warnings():
        # O modelo traz tabelas dinamicas com relacionamento que o openpyxl avisa e ignora.
        warnings.simplefilter("ignore")
        return openpyxl.load_workbook(caminho, data_only=True)


def ler_catalogo(pasta) -> tuple[dict[tuple[str, str], LinhaDoCatalogo], list[LinhaDoCatalogo]]:
    if ABA_CATALOGO not in pasta.sheetnames:
        raise PlanilhaInvalida(f"a planilha nao tem a aba «{ABA_CATALOGO}»")
    aba = pasta[ABA_CATALOGO]

    cabecalho = None
    for r in range(1, min(aba.max_row, 15) + 1):
        if texto(aba.cell(r, 1).value).upper() in ("CÓD", "COD"):
            cabecalho = r
            break
    if cabecalho is None:
        raise PlanilhaInvalida(f"«{ABA_CATALOGO}»: nao achei o cabecalho «CÓD» na coluna A")

    catalogo: dict[tuple[str, str], LinhaDoCatalogo] = {}
    duplicadas: list[LinhaDoCatalogo] = []
    for r in range(cabecalho + 1, aba.max_row + 1):
        cod, ue = texto(aba.cell(r, 1).value), texto(aba.cell(r, 3).value)
        if cod == "" or ue == "":
            continue
        ch_bruta = aba.cell(r, 6).value
        linha = LinhaDoCatalogo(
            linha=r,
            cod=cod,
            disciplina=texto(aba.cell(r, 2).value),
            ue=ue,
            topico=texto(aba.cell(r, 5).value),
            ch=int(ch_bruta) if isinstance(ch_bruta, (int, float)) else None,
            local=texto(aba.cell(r, 7).value),
            tecnica=texto(aba.cell(r, 8).value),
            instrutor=texto(aba.cell(r, 9).value),
            ch_concluida=(
                int(aba.cell(r, 10).value) if isinstance(aba.cell(r, 10).value, (int, float)) else None
            ),
        )
        if linha.chave in catalogo:
            # O PROCV da planilha so enxerga a PRIMEIRA ocorrencia: a leitura faz o mesmo, e a
            # repetida volta como aviso — quem decide se ela importa e quem confere.
            duplicadas.append(linha)
            continue
        catalogo[linha.chave] = linha
    return catalogo, duplicadas


def ler_preenchimento(pasta) -> tuple[str, str, list[LinhaDeTa], list[CelulaIgnorada]]:
    if ABA_PREENCHIMENTO not in pasta.sheetnames:
        raise PlanilhaInvalida(f"a planilha nao tem a aba «{ABA_PREENCHIMENTO}»")
    aba = pasta[ABA_PREENCHIMENTO]

    sigla = texto(aba.cell(1, 2).value)
    alunos = texto(aba.cell(2, 2).value)

    # Passo 1: os dias. Um dia comeca em toda linha de TA cujo numero NAO continua o anterior.
    dias: list[list[int]] = []
    anterior = None
    for r in range(1, aba.max_row + 1):
        casa = _TA.match(texto(aba.cell(r, 3).value))
        if not casa:
            anterior = None
            continue
        n = int(casa.group(1))
        if anterior is None or n != anterior + 1:
            dias.append([])
        dias[-1].append(r)
        anterior = n

    linhas: list[LinhaDeTa] = []
    linhas_de_ta: set[int] = set()
    for linhas_do_dia in dias:
        linhas_de_ta.update(linhas_do_dia)
        preenchidas = [
            r
            for r in linhas_do_dia
            if texto(aba.cell(r, 4).value) != "" or texto(aba.cell(r, 5).value) != ""
        ]
        datas = [
            aba.cell(r, 2).value
            for r in linhas_do_dia
            if isinstance(aba.cell(r, 2).value, (datetime, date))
        ]
        if not preenchidas:
            continue
        if len(datas) != 1:
            raise PlanilhaInvalida(
                f"«{ABA_PREENCHIMENTO}»: o dia das linhas {linhas_do_dia[0]}–{linhas_do_dia[-1]} tem "
                f"{len(datas)} data(s) na coluna B. Se forem formulas sem valor, abra e salve a "
                "planilha no Excel: a data nao e derivada aqui."
            )
        dia = datas[0].date() if isinstance(datas[0], datetime) else datas[0]
        for r in preenchidas:
            cod, ue = texto(aba.cell(r, 4).value), texto(aba.cell(r, 5).value)
            if cod == "" or ue == "":
                raise PlanilhaInvalida(
                    f"«{ABA_PREENCHIMENTO}»: linha {r} tem COD «{cod}» e U.E. «{ue}» — a chave e as "
                    "duas colunas juntas"
                )
            ta = int(_TA.match(texto(aba.cell(r, 3).value)).group(1))  # type: ignore[union-attr]
            linhas.append(LinhaDeTa(linha=r, data=dia, ta=ta, cod=cod, ue=ue))

    ignoradas: list[CelulaIgnorada] = []
    for r in range(1, aba.max_row + 1):
        if r in linhas_de_ta:
            continue
        # A linha de cabecalho de cada semana traz os rotulos «CÓD» e «U.E.»: nao sao conteudo.
        if texto(aba.cell(r, 3).value).upper() == "TA":
            rotulos = {4: ("CÓD", "COD"), 5: ("U.E.", "UE")}
        else:
            rotulos = {}
        for c, letra in ((4, "D"), (5, "E")):
            valor = texto(aba.cell(r, c).value)
            if valor != "" and valor.upper() not in rotulos.get(c, ()):
                ignoradas.append(CelulaIgnorada(celula=f"{letra}{r}", valor=valor))

    return sigla, alunos, linhas, ignoradas


def ler_datas_avaliacoes(pasta) -> list[dict]:
    """A aba DATAS AVALIACOES (ou CONTROLE DATAS AVALIACOES) dos cursos regulares: por avaliacao, a chave da
    prova, a chave da vista e as duas datas. E a tabela da propria planilha que diz QUAL vista e de QUAL
    prova — vale mais que qualquer regra por numero. Tambem e insumo do Epico 8 (prazo de 7 dias)."""
    aba = next((n for n in pasta.sheetnames if "DATAS AVALIA" in n.upper()), None)
    if aba is None:
        return []
    ws = pasta[aba]
    colunas: dict[str, int] = {}
    linhas: list[dict] = []
    for r in range(1, ws.max_row + 1):
        rotulos = {texto(ws.cell(r, c).value).upper(): c for c in range(1, min(ws.max_column, 12) + 1)}
        if not colunas:
            if "CHAVE AVALIAÇÃO" in rotulos or "CHAVE AVALIACAO" in rotulos:
                for rot, c in rotulos.items():
                    if rot.startswith("CÓD") or rot.startswith("COD"):
                        colunas["cod"] = c
                    elif rot.startswith("TIPO DE AVALIA"):
                        colunas["tipo"] = c
                    elif rot.startswith("CHAVE AVALIA"):
                        colunas["chave_prova"] = c
                    elif rot.startswith("CHAVE VISTA"):
                        colunas["chave_vista"] = c
                    elif rot.startswith("DATA DA AVALIA"):
                        colunas["data_prova"] = c
                    elif rot.startswith("DATA DA VISTA"):
                        colunas["data_vista"] = c
                    elif rot.startswith("SITUA"):
                        colunas["situacao"] = c
            continue
        cod = texto(ws.cell(r, colunas.get("cod", 0)).value) if "cod" in colunas else ""
        if not cod:
            continue
        def como_data(c):
            v = ws.cell(r, c).value if c else None
            return v.date() if isinstance(v, datetime) else v if isinstance(v, date) else None
        linhas.append({
            "cod": cod,
            "tipo": texto(ws.cell(r, colunas["tipo"]).value) if "tipo" in colunas else "",
            "chave_prova": texto(ws.cell(r, colunas["chave_prova"]).value),
            "chave_vista": texto(ws.cell(r, colunas["chave_vista"]).value) if "chave_vista" in colunas else "",
            "data_prova": como_data(colunas.get("data_prova")),
            "data_vista": como_data(colunas.get("data_vista")),
            "situacao": texto(ws.cell(r, colunas["situacao"]).value) if "situacao" in colunas else "",
        })
    return linhas


def ler_controle(pasta) -> dict[str, tuple[int | None, int | None]]:
    """A aba CONTROLE: por disciplina, a CH prevista e a CH cumprida que a PROPRIA planilha conta.

    E a segunda contagem, independente da leitura dos blocos: a planilha soma as linhas do
    ESPELHO por codigo de disciplina. Se o plano nao fechar com ela, a leitura errou — ou a
    planilha tem linha que este modulo nao viu.
    """
    if ABA_CONTROLE not in pasta.sheetnames:
        raise PlanilhaInvalida(f"a planilha nao tem a aba «{ABA_CONTROLE}»")
    aba = pasta[ABA_CONTROLE]

    def numero(valor: object) -> int | None:
        return int(valor) if isinstance(valor, (int, float)) else None

    controle: dict[str, tuple[int | None, int | None]] = {}
    for r in range(2, aba.max_row + 1):
        cod = texto(aba.cell(r, 1).value)
        if cod == "":
            continue
        controle[cod] = (numero(aba.cell(r, 3).value), numero(aba.cell(r, 4).value))
    return controle


ABA_IMPRESSAO = "IMPRESSÃO"

# Os rotulos do cabecalho da IMPRESSAO → o campo. A coluna do nº de TA nao tem rotulo proprio:
# e a vizinha a direita de DISCIPLINA.
_ROTULOS_DA_IMPRESSAO = {
    "HORÁRIO": "horario",
    "DISCIPLINA": "disciplina",
    "UNIDADES DE ENSINO E TÓPICOS": "topico",
    "LOCAL": "local",
    "T/E": "te",
    "INSTRUTOR/PROFESSOR": "instrutor",
}


def ler_impressao(caminho: Path, pasta, blocos: list[Bloco]):
    """A aba IMPRESSAO (o DSA assinado) nas linhas dos blocos, e o que foi DIGITADO nela.

    ⚠️ SO VALE PARA PLANILHA «ALINHADA»: aquela em que a linha N da IMPRESSAO e a linha N do
       PREENCHIMENTO. A conferencia e feita aqui — o bloco que comeca na linha N tem de aparecer
       na IMPRESSAO, na mesma linha, com o mesmo codigo e o mesmo nº de TA. Planilha que nao
       alinha devolve `alinhada = False` e nada mais: adivinhar a correspondencia seria comparar
       o sistema com a linha errada do documento.

    ⚠️ «DIGITADA» = celula de dado sem formula onde o modelo tem formula (PROCV sobre o catalogo).
       E o operador corrigindo o DSA a mao: vale como o documento assinado, e vai para a lista.
    """
    if ABA_IMPRESSAO not in pasta.sheetnames:
        return {}, {}, False
    aba = pasta[ABA_IMPRESSAO]
    colunas: dict[str, int] = {}
    for r in range(1, min(aba.max_row, 12) + 1):
        rotulos = {texto(aba.cell(r, c).value).upper(): c for c in range(1, aba.max_column + 1)}
        if "HORÁRIO" in rotulos:
            colunas = {campo: rotulos[rot] for rot, campo in _ROTULOS_DA_IMPRESSAO.items() if rot in rotulos}
            break
    if set(colunas) != set(_ROTULOS_DA_IMPRESSAO.values()):
        return {}, {}, False
    colunas["ta"] = colunas["disciplina"] + 1

    impressao: dict[int, dict[str, str]] = {}
    casam = 0
    for b in blocos:
        if b.linha > aba.max_row:
            continue
        linha = {campo: texto(aba.cell(b.linha, c).value) for campo, c in colunas.items()}
        impressao[b.linha] = linha
        if linha["disciplina"] == b.cod and linha["ta"] == str(b.tempos):
            casam += 1
    alinhada = bool(blocos) and casam >= 0.9 * len(blocos)
    if not alinhada:
        return {}, {}, False

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        formulas = openpyxl.load_workbook(caminho, data_only=False)[ABA_IMPRESSAO]
    digitadas: dict[int, dict[str, str]] = {}
    for b in blocos:
        # `ta` e so LISTADO: quem conta TA e o PREENCHIMENTO, e um numero digitado na IMPRESSAO
        # que discorda dele e erro de planilha (e desloca o painel de CH da semana em diante).
        for campo in ("topico", "local", "te", "instrutor", "ta"):
            bruto = formulas.cell(b.linha, colunas[campo]).value
            if bruto is None or (isinstance(bruto, str) and (bruto.startswith("=") or bruto.strip() == "")):
                continue
            digitadas.setdefault(b.linha, {})[campo] = texto(bruto)
    return impressao, digitadas, True


def ler_impressao_paginada(caminho: Path, pasta, blocos: list[Bloco]):
    """A IMPRESSAO dos cursos regulares: UMA PAGINA POR SEMANA, e as linhas nao se alinham com o PREENCHIMENTO.

    Cada pagina tem cabecalho («DIA | HORARIO | DISCIPLINA … | LOCAL | T/E | INSTRUTOR/PROFESSOR»), os dias
    em sequencia e o rodape («Gerado em:»). O dia NAO tem fronteira explicita: a data e a sigla do dia
    (SEG…SAB) ficam numa celula no meio das linhas do dia. A fronteira que vale e o relogio — quando o
    horario de inicio de uma linha e MENOR que o da anterior, comecou outro dia; a linha sem horario
    (o Estudo Individual «---» de alguns cursos) continua o dia em curso. As datas da pagina sao
    atribuidas aos dias na ordem em que aparecem, e a pagina so vale se os dois numeros batem.

    O alinhamento com o PREENCHIMENTO e POR DIA: os blocos do dia (em ordem de TA) e as linhas de
    bloco da IMPRESSAO (em ordem de horario) casam posicao a posicao quando as contagens sao iguais;
    o dia em que nao sao vai para `dias_desalinhados`, e seus blocos ficam sem `esperado`.

    Devolve (impressao por linha do PREENCHIMENTO, digitadas, alinhada, ei_por_dia, dias_desalinhados, paginas_invalidas).
    """
    vazio = ({}, {}, False, {}, [], [])
    if ABA_IMPRESSAO not in pasta.sheetnames:
        return vazio
    aba = pasta[ABA_IMPRESSAO]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        formulas = openpyxl.load_workbook(caminho, data_only=False)[ABA_IMPRESSAO]

    def ler_linha(r: int, colunas: dict[str, int]) -> dict[str, str]:
        return {campo: texto(aba.cell(r, c).value) for campo, c in colunas.items()}

    def inicio_em_minutos(horario: str) -> int | None:
        m = re.search(r"(\d{1,2}):(\d{2})", horario)
        return None if m is None else int(m.group(1)) * 60 + int(m.group(2))

    por_dia: dict[date, list[tuple[int, dict[str, str]]]] = {}
    ei_por_dia: dict[date, dict[str, str]] = {}
    colunas: dict[str, int] = {}
    pagina_rows: list[tuple[int, dict[str, str] | None]] = []
    datas_da_pagina: list[tuple[int, date]] = []
    paginas_invalidas: list[str] = []

    LINHAS_POR_DIA = 9  # o modelo da IMPRESSAO reserva nove linhas por dia, em toda pagina (medido nas cinco planilhas)

    def fechar_pagina() -> None:
        """Fecha a pagina: cada dia ocupa NOVE linhas do modelo, e a data fica dentro das nove do seu dia."""
        if not pagina_rows:
            return
        primeira = pagina_rows[0][0] if pagina_rows[0][1] is None else pagina_rows[0][0]
        por_faixa: dict[int, list[tuple[int, dict[str, str]]]] = {}
        for r, linha in pagina_rows:
            if linha is None:
                continue
            por_faixa.setdefault((r - primeira) // LINHAS_POR_DIA, []).append((r, linha))
        datas_por_faixa = {(r - primeira) // LINHAS_POR_DIA: d for r, d in datas_da_pagina}
        for faixa, linhas in por_faixa.items():
            data_do_dia = datas_por_faixa.get(faixa)
            if data_do_dia is None:
                paginas_invalidas.append(f"linhas {linhas[0][0]}-{linhas[-1][0]} da IMPRESSAO sem data no seu bloco de {LINHAS_POR_DIA} linhas")
                continue
            for r, linha in linhas:
                eh_ei = linha["disciplina"] == "" and "ESTUDO" in linha["topico"].upper()
                if eh_ei:
                    ei_por_dia[data_do_dia] = {**linha, "linha_impressao": str(r)}
                else:
                    por_dia.setdefault(data_do_dia, []).append((r, linha))
        pagina_rows.clear()
        datas_da_pagina.clear()

    for r in range(1, aba.max_row + 1):
        rotulos = {texto(aba.cell(r, c).value).upper(): c for c in range(1, aba.max_column + 1)}
        if "HORÁRIO" in rotulos and "DISCIPLINA" in rotulos:
            fechar_pagina()
            colunas = {campo: rotulos[rot] for rot, campo in _ROTULOS_DA_IMPRESSAO.items() if rot in rotulos}
            colunas["ta"] = colunas["disciplina"] + 1
            pagina_rows.append((r + 1, None))  # marca a primeira linha da pagina
            continue
        if not colunas:
            continue
        a1 = aba.cell(r, 1).value
        if isinstance(a1, datetime):
            datas_da_pagina.append((r, a1.date()))
        elif isinstance(a1, date):
            datas_da_pagina.append((r, a1))
        if texto(a1).upper().startswith("GERADO EM"):
            fechar_pagina()
            colunas = {}
            continue
        linha = ler_linha(r, colunas)
        if linha["disciplina"] or (linha["horario"] and linha["topico"]) or "ESTUDO" in linha["topico"].upper():
            pagina_rows.append((r, linha))
    fechar_pagina()

    blocos_por_dia: dict[date, list[Bloco]] = {}
    for b in blocos:
        blocos_por_dia.setdefault(b.data, []).append(b)
    impressao: dict[int, dict[str, str]] = {}
    digitadas: dict[int, dict[str, str]] = {}
    desalinhados: list[tuple[date, int, int]] = []
    for dia_, bs in blocos_por_dia.items():
        linhas = por_dia.get(dia_, [])
        bs = sorted(bs, key=lambda b: b.ta_inicial)
        if len(linhas) != len(bs):
            desalinhados.append((dia_, len(linhas), len(bs)))
            continue
        for b, (r, linha) in zip(bs, linhas):
            impressao[b.linha] = {**linha, "linha_impressao": str(r)}
    # As celulas digitadas sao lidas pelas colunas do cabecalho MAIS PROXIMO acima da linha.
    cabecalhos: list[tuple[int, dict[str, int]]] = []
    for r in range(1, aba.max_row + 1):
        rotulos = {texto(aba.cell(r, c).value).upper(): c for c in range(1, aba.max_column + 1)}
        if "HORÁRIO" in rotulos and "DISCIPLINA" in rotulos:
            cols = {campo: rotulos[rot] for rot, campo in _ROTULOS_DA_IMPRESSAO.items() if rot in rotulos}
            cols["ta"] = cols["disciplina"] + 1
            cabecalhos.append((r, cols))
    for linha_preench, linha in impressao.items():
        r = int(linha["linha_impressao"])
        cols = next((c for rr, c in reversed(cabecalhos) if rr < r), None)
        if cols is None:
            continue
        for campo in ("topico", "local", "te", "instrutor", "ta"):
            bruto = formulas.cell(r, cols[campo]).value
            if bruto is None or (isinstance(bruto, str) and (bruto.startswith("=") or bruto.strip() == "")):
                continue
            digitadas.setdefault(linha_preench, {})[campo] = texto(bruto)
    alinhada = bool(blocos) and len(impressao) >= 0.9 * len(blocos)
    return impressao, digitadas, alinhada, ei_por_dia, desalinhados, paginas_invalidas


def montar_blocos(linhas: list[LinhaDeTa]) -> list[Bloco]:
    """Agrupa TA CONSECUTIVOS do mesmo dia com a mesma chave. Buraco no meio abre bloco novo."""
    blocos: list[Bloco] = []
    for l in sorted(linhas, key=lambda x: (x.data, x.ta)):
        ultimo = blocos[-1] if blocos else None
        if (
            ultimo is not None
            and ultimo.data == l.data
            and ultimo.chave == (l.cod, l.ue)
            and ultimo.ta_final + 1 == l.ta
        ):
            blocos[-1] = Bloco(
                linha=ultimo.linha,
                data=ultimo.data,
                ta_inicial=ultimo.ta_inicial,
                tempos=ultimo.tempos + 1,
                cod=ultimo.cod,
                ue=ultimo.ue,
            )
        else:
            blocos.append(Bloco(linha=l.linha, data=l.data, ta_inicial=l.ta, tempos=1, cod=l.cod, ue=l.ue))
    return blocos


def ler_horarios(pasta) -> list:
    """As tabelas da aba HORARIOS (a planilha nem sempre acentua o nome)."""
    from scripts.carga_dsa import relogio

    aba = next((n for n in pasta.sheetnames if n.strip().upper().startswith(("HORÁRIO", "HORARIO"))), None)
    return [] if aba is None else relogio.ler_tabelas(pasta[aba])


def ler(caminho: Path) -> Leitura:
    pasta = _abrir(caminho)
    catalogo, duplicadas = ler_catalogo(pasta)
    sigla, alunos, linhas, ignoradas = ler_preenchimento(pasta)
    blocos = montar_blocos(linhas)
    sem_catalogo = sorted({b.chave for b in blocos if b.chave not in catalogo})
    aba = pasta[ABA_PREENCHIMENTO]
    siglas = [
        texto(aba.cell(r, 2).value)
        for r in range(1, aba.max_row + 1)
        if texto(aba.cell(r, 1).value).upper().startswith("SIGLA")
    ]
    impressao, digitadas, alinhada = ler_impressao(caminho, pasta, blocos)
    ei_por_dia: dict = {}
    dias_desalinhados: list = []
    if not alinhada:
        # Planilha de curso regular: uma pagina por semana, alinhamento por dia.
        impressao, digitadas, alinhada, ei_por_dia, dias_desalinhados, paginas = ler_impressao_paginada(caminho, pasta, blocos)
        dias_desalinhados = dias_desalinhados + [(p, 0, 0) for p in paginas]
    return Leitura(
        sigla=sigla,
        alunos=alunos,
        catalogo=catalogo,
        linhas=linhas,
        blocos=blocos,
        ignoradas=ignoradas,
        duplicadas=duplicadas,
        controle=ler_controle(pasta),
        sem_catalogo=sem_catalogo,
        siglas=siglas,
        impressao=impressao,
        digitadas=digitadas,
        horarios=ler_horarios(pasta),
        impressao_ei=ei_por_dia,
        datas_avaliacoes=ler_datas_avaliacoes(pasta),
        dias_desalinhados=dias_desalinhados,
        impressao_alinhada=alinhada,
    )


# ─────────────────────────────────────────────────────────────────────────────────────────────
# O GABARITO — a segunda leitura, independente. A extracao tem de bater 1:1 ANTES de escrever.
# ─────────────────────────────────────────────────────────────────────────────────────────────


def ler_csv(caminho: Path) -> list[dict[str, str]]:
    """Le o CSV do gabarito sem supor separador nem codificacao (Excel grava `;` e cp1252)."""
    bruto = caminho.read_bytes()
    for codificacao in ("utf-8-sig", "cp1252"):
        try:
            conteudo = bruto.decode(codificacao)
            break
        except UnicodeDecodeError:
            continue
    else:  # pragma: no cover - cp1252 decodifica qualquer byte
        raise PlanilhaInvalida(f"nao consegui decodificar {caminho}")
    primeira = conteudo.splitlines()[0] if conteudo else ""
    separador = ";" if primeira.count(";") > primeira.count(",") else ","
    return [
        {(k or "").strip(): (v or "").strip() for k, v in linha.items()}
        for linha in csv.DictReader(conteudo.splitlines(), delimiter=separador)
    ]
