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


def ler(caminho: Path) -> Leitura:
    pasta = _abrir(caminho)
    catalogo, duplicadas = ler_catalogo(pasta)
    sigla, alunos, linhas, ignoradas = ler_preenchimento(pasta)
    blocos = montar_blocos(linhas)
    sem_catalogo = sorted({b.chave for b in blocos if b.chave not in catalogo})
    if sem_catalogo:
        raise PlanilhaInvalida(
            "PREENCHIMENTO usa chave(s) que o catalogo nao tem: "
            + ", ".join(f"{c}+{u}" for c, u in sem_catalogo)
        )
    return Leitura(
        sigla=sigla,
        alunos=alunos,
        catalogo=catalogo,
        linhas=linhas,
        blocos=blocos,
        ignoradas=ignoradas,
        duplicadas=duplicadas,
        controle=ler_controle(pasta),
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
