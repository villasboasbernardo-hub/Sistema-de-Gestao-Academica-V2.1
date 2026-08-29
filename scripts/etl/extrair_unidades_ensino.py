"""Extrai as Unidades de Ensino (UE) dos currículos oficiais da DEnsM.

Contexto
--------
Decisao UE-1, rota (b) (Bernardo, 26/08/2026): `registros_aula` nasce no grao de
Unidade de Ensino. A UE nao existe em nenhuma aba da v2.0 — ela vive nos curriculos
aprovados pela Diretoria de Ensino da Marinha, em PDF, um por curso/estagio.
Este script e a fonte de povoamento de `unidades_ensino` no Epico 1/2.

Estrutura reconhecida no curriculo
----------------------------------
    CODIGO: I                              CARGA HORARIA: 45 HORAS
    DISCIPLINA: INFORMATICA APLICADA A HIDROGRAFIA
    ...
    2) LISTA DE UNIDADES DE ENSINO
    1 - SISTEMAS COMPUTACIONAIS...................... 10 HORAS
    1.1 - Arquitetura e sistema operacional;
    1.2 - Comunicacao e sincronia; e
    2 - EDITOR DE TEXTO, PLANILHA E APLICATIVO GRAFICO....... 8 HORAS
    ...
    3) DIRETRIZES ESPECIFICAS

O numero da UE, o topico e a CH saem da linha de titulo; as linhas `N.M -` sao as
subunidades (SUE), guardadas como detalhamento do topico.

Nada aqui grava em banco. A saida e CSV + JSON para conferencia humana antes da carga
— Principio VI: a mudanca e validada por invariante, nao por confianca no parser.

Uso:
    python scripts/etl/extrair_unidades_ensino.py <dir_curriculos> <dir_saida>
"""

from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from dataclasses import dataclass, asdict, field
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.exit("PyMuPDF ausente. Instale com: pip install pymupdf")


# ---------------------------------------------------------------------------------
# Padroes. Toleram as variacoes reais encontradas nos 24 curriculos:
#   "LISTA DE UNIDADES", "LISTA DAS UNIDADES", "LISTAS DE UNIDADES", "LISTA DE UNIDADE"
#   numeracao de secao "2)" ou "b)"
# ---------------------------------------------------------------------------------
RE_LISTA_UE = re.compile(
    r"^\s*(?:\d+|[a-z])\s*[)\-.]\s*LISTAS?\s+D[AE]S?\s+UNIDADES?\s+DE\s+ENSINO",
    re.IGNORECASE,
)

# Fim do bloco de UE: a proxima secao de mesmo nivel ("3) DIRETRIZES", "c) AVALIACAO")
RE_FIM_BLOCO = re.compile(
    r"^\s*(?:\d+|[a-z])\s*[)\-.]\s*(?:DIRETRIZES|AVALIA|OBJETIVO|REFERENCIA|REFERÊNCIA"
    r"|RECURSO|BIBLIOGRAF|METODOLOGIA|TÉCNICA|TECNICA|CARGA)",
    re.IGNORECASE,
)

RE_CODIGO_DISC = re.compile(r"^\s*CÓDIGO\s*:\s*(.+?)\s*$", re.IGNORECASE)
RE_CH_INLINE = re.compile(r"CARGA\s+HORÁRIA\s*(?:\(TA\))?\s*:\s*(\d+)", re.IGNORECASE)
RE_DISCIPLINA = re.compile(
    r"^\s*DISCIPLINA\s*([IVXLC]+)?\s*:\s*(.*)$", re.IGNORECASE
)

# Subunidade (SUE) — SEMPRE antes da UE, senao "1.1 - x" vira UE numero 1.
# Cobre "1.1 - x", "1.1. x" e o nivel extra "1.6.1 - x".
# O tail e opcional: a subunidade tambem quebra em duas linhas ("2.8 -" / texto).
RE_SUE = re.compile(r"^\s*(\d{1,2})\.(\d{1,2})(?:\.\d{1,2})?\s*[-–—.]\s*(.*)$")

# Titulo de UE numerado. Duas grafias reais: "1 - MAGNETISMO" e "1. ACUSTICA".
# O ponto so vale como separador quando NAO for seguido de digito — senao "2.8 - x"
# seria lido como UE numero 2 de topico "8 - x" (achado em C-Exp-Obs-ME).
_SEP_UE = r"(?:[-–—]|\.(?!\d))"
RE_UE = re.compile(
    rf"^\s*(\d{{1,2}})\s*{_SEP_UE}\s*(.+?)[\s.…]*?(\d{{1,3}})\s*HORAS?\b", re.IGNORECASE
)
RE_UE_SEM_CH = re.compile(rf"^\s*(\d{{1,2}})\s*{_SEP_UE}\s*(\S.*?)\s*$")

# Curriculos que nao numeram a UE (est-qf-pgrs100): "- CONCEITOS....2 HORAS".
# O discriminador contra a subunidade e a presenca de "N HORAS" na propria linha.
RE_UE_SEM_NUMERO = re.compile(
    r"^\s*[-–—]\s*(.+?)[\s.…]*?(\d{1,3})\s*HORAS?\b", re.IGNORECASE
)
RE_SUE_SEM_NUMERO = re.compile(r"^\s*[-–—]\s*(\S.*?)\s*$")

RE_SO_CH = re.compile(r"^[\s.…]*(\d{1,3})\s*HORAS?\b", re.IGNORECASE)

# Ruido de paginacao do PDF
RE_RUIDO = re.compile(
    r"^\s*(?:Continuação do anexo|Anexo do Of|-\s*[A-Z]?-?\d+\s+de\s+\d+\s*-"
    r"|ATUALIZADO EM|MARINHA DO BRASIL|DIRETORIA DE ENSINO|--- PAG)",
    re.IGNORECASE,
)


@dataclass
class UnidadeEnsino:
    numero_ue: int
    topico: str
    ch_prevista_horas: int | None
    subunidades: list[str] = field(default_factory=list)


@dataclass
class Disciplina:
    ordinal: str                      # "I", "AGU-MAG-1"...
    nome: str
    ch_horas: int | None
    unidades: list[UnidadeEnsino] = field(default_factory=list)


@dataclass
class Curriculo:
    arquivo: str
    curso_sigla: str | None
    paginas: int
    disciplinas: list[Disciplina] = field(default_factory=list)
    observacao: str | None = None     # motivo de nao ter UE, quando for o caso


def limpar(texto: str) -> str:
    """Colapsa espacos e remove pontilhado de preenchimento."""
    texto = texto.replace("…", " ")
    texto = re.sub(r"[.·]{3,}", " ", texto)
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip(" .;-–—")


def sem_acento(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def extrair_sigla(linhas: list[str]) -> str | None:
    """A sigla aparece como '(C-Exp-AgMag)' na capa ou apos 'SIGLA:'."""
    for i, linha in enumerate(linhas[:80]):
        if re.match(r"^\s*SIGLA\s*:", linha, re.IGNORECASE):
            resto = re.sub(r"^\s*SIGLA\s*:\s*", "", linha, flags=re.IGNORECASE).strip()
            if resto:
                return resto
            if i + 1 < len(linhas):
                return linhas[i + 1].strip()
    for linha in linhas[:40]:
        m = re.match(r"^\s*\(([A-Za-z][\w\-]{2,})\)\s*$", linha.strip())
        if m:
            return m.group(1)
    return None


def processar(caminho: Path) -> Curriculo:
    doc = fitz.open(caminho)
    texto = "\n".join(doc[i].get_text() for i in range(doc.page_count))
    paginas = doc.page_count
    doc.close()

    linhas = [l.rstrip() for l in texto.splitlines()]
    curriculo = Curriculo(
        arquivo=caminho.name, curso_sigla=extrair_sigla(linhas), paginas=paginas
    )

    if not texto.strip():
        curriculo.observacao = (
            "PDF sem camada de texto (digitalizado). Exige OCR ou transcricao manual."
        )
        return curriculo

    disciplina_atual: Disciplina | None = None
    ordinal_pendente: str | None = None
    ch_pendente: int | None = None
    dentro_da_lista = False
    ue_atual: UnidadeEnsino | None = None
    sue_pendente = False

    for i, bruta in enumerate(linhas):
        linha = bruta.strip()
        if not linha or RE_RUIDO.match(linha):
            continue

        # --- cabecalho da disciplina -------------------------------------------
        m = RE_CODIGO_DISC.match(linha)
        if m:
            resto = m.group(1)
            ch_lida: int | None = None
            mch = RE_CH_INLINE.search(resto)
            if mch:
                ch_lida = int(mch.group(1))
                resto = RE_CH_INLINE.sub("", resto)
            ordinal = limpar(re.sub(r"\bHORAS?\b", "", resto, flags=re.IGNORECASE)) or None

            # Alguns curriculos invertem a ordem e poem DISCIPLINA: antes de CODIGO:.
            # Nesse caso o cabecalho pertence a disciplina corrente, nao a proxima —
            # sem isto ela herda a CH da disciplina anterior (achado em C-Exp-Obs-ME).
            if (
                disciplina_atual is not None
                and not disciplina_atual.unidades
                and disciplina_atual.ch_horas is None
            ):
                disciplina_atual.ch_horas = ch_lida
                if ordinal:
                    disciplina_atual.ordinal = ordinal
            else:
                ordinal_pendente, ch_pendente = ordinal, ch_lida
            dentro_da_lista = False
            ue_atual = None
            continue

        # "CARGA HORARIA: N HORAS" numa linha propria, logo abaixo de "CODIGO:"
        mch = RE_CH_INLINE.search(linha)
        if mch:
            if ordinal_pendente is not None and ch_pendente is None:
                ch_pendente = int(mch.group(1))
                continue
            if (
                disciplina_atual is not None
                and disciplina_atual.ch_horas is None
                and not disciplina_atual.unidades
            ):
                disciplina_atual.ch_horas = int(mch.group(1))
                continue

        m = RE_DISCIPLINA.match(linha)
        if m:
            # O carimbo "ATUALIZADO EM 2011" costuma vir colado ao nome na mesma linha.
            nome = limpar(
                re.sub(
                    r"\b(?:ATUALIZAD[OA]|CRIAD[OA])\s+EM\s+\d{4}.*$",
                    "",
                    m.group(2),
                    flags=re.IGNORECASE,
                )
            )
            # "DISCIPLINA:" com o nome na linha seguinte
            if not nome:
                for prox in linhas[i + 1 : i + 4]:
                    prox = prox.strip()
                    if prox and not RE_RUIDO.match(prox):
                        nome = limpar(prox)
                        break
            disciplina_atual = Disciplina(
                ordinal=ordinal_pendente or (m.group(1) or "").strip() or "?",
                nome=nome,
                ch_horas=ch_pendente,
            )
            curriculo.disciplinas.append(disciplina_atual)
            ordinal_pendente, ch_pendente = None, None
            dentro_da_lista = False
            ue_atual = None
            continue

        # --- bloco de unidades de ensino ---------------------------------------
        if RE_LISTA_UE.match(linha):
            if disciplina_atual is None:
                disciplina_atual = Disciplina(ordinal="?", nome="(nao identificada)", ch_horas=None)
                curriculo.disciplinas.append(disciplina_atual)
            dentro_da_lista = True
            ue_atual = None
            continue

        if not dentro_da_lista:
            continue

        # Fim do bloco — mas uma UE cujo titulo comeca por uma dessas palavras nao e
        # fim de bloco. "8 - TECNICA DA OBSERVACAO DA ONDA... 1 HORA" casava com
        # `TECNICA` e truncava a lista em C-Exp-Metoc-OF-SP. O discriminador e a CH:
        # cabecalho de secao nunca carrega "N HORAS".
        if RE_FIM_BLOCO.match(linha) and not RE_UE.match(linha):
            dentro_da_lista = False
            ue_atual = None
            continue

        assert disciplina_atual is not None

        def nova_ue(numero: int, topico: str, ch: int | None) -> UnidadeEnsino:
            u = UnidadeEnsino(numero_ue=numero, topico=topico, ch_prevista_horas=ch)
            disciplina_atual.unidades.append(u)  # type: ignore[union-attr]
            return u

        # A subunidade e testada PRIMEIRO: "1.1 - x" nao pode virar UE numero 1.
        m = RE_SUE.match(linha)
        if m:
            texto = limpar(m.group(3))
            if ue_atual is not None:
                ue_atual.subunidades.append(texto)
            # "2.8 -" sem texto: a descricao veio na linha de baixo.
            sue_pendente = ue_atual is not None and not texto
            continue

        # Completa a subunidade cuja descricao caiu na linha seguinte.
        if sue_pendente and ue_atual is not None and ue_atual.subunidades:
            ue_atual.subunidades[-1] = limpar(linha)
            sue_pendente = False
            continue

        m = RE_UE.match(linha)
        if m:
            ue_atual = nova_ue(int(m.group(1)), limpar(m.group(2)), int(m.group(3)))
            continue

        # UE nao numerada, com CH na propria linha: numeracao passa a ser posicional.
        m = RE_UE_SEM_NUMERO.match(linha)
        if m:
            ue_atual = nova_ue(
                len(disciplina_atual.unidades) + 1, limpar(m.group(1)), int(m.group(2))
            )
            continue

        # CH que caiu na linha seguinte ao titulo
        m = RE_SO_CH.match(linha)
        if m and ue_atual is not None and ue_atual.ch_prevista_horas is None:
            ue_atual.ch_prevista_horas = int(m.group(1))
            continue

        # Titulo de UE numerado cuja CH nao veio na mesma linha
        m = RE_UE_SEM_CH.match(linha)
        if m:
            ue_atual = nova_ue(int(m.group(1)), limpar(m.group(2)), None)
            continue

        # Subunidade nao numerada ("- Visao geral da producao grafica;")
        m = RE_SUE_SEM_NUMERO.match(linha)
        if m and ue_atual is not None:
            ue_atual.subunidades.append(limpar(m.group(1)))
            continue

        # Continuacao do titulo da UE quebrado em duas linhas. A CH costuma vir
        # justamente na segunda linha ("...PROBLEMAS" / "PRATICOS......28 HORAS").
        if ue_atual is not None and ue_atual.ch_prevista_horas is None and len(linha) < 160:
            mch = re.search(r"[\s.…]*(\d{1,3})\s*HORAS?\b", linha, re.IGNORECASE)
            if mch:
                ue_atual.ch_prevista_horas = int(mch.group(1))
                linha = linha[: mch.start()]
            ue_atual.topico = limpar(f"{ue_atual.topico} {linha}")

    if not any(d.unidades for d in curriculo.disciplinas):
        curriculo.observacao = (
            "Nenhuma 'LISTA DE UNIDADES DE ENSINO' encontrada. "
            "Curriculo provavelmente no modelo por competencias "
            "(COMPETENCIA TECNICA / INDICADORES), que nao declara UE."
        )
    return curriculo


def main(dir_pdf: Path, dir_saida: Path) -> int:
    dir_saida.mkdir(parents=True, exist_ok=True)
    curriculos = [processar(p) for p in sorted(dir_pdf.glob("*.pdf"))]

    with (dir_saida / "unidades_ensino.json").open("w", encoding="utf-8") as fh:
        json.dump([asdict(c) for c in curriculos], fh, ensure_ascii=False, indent=2)

    with (dir_saida / "unidades_ensino.csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow([
            "arquivo", "curso_sigla", "disciplina_ordinal", "disciplina_nome",
            "disciplina_ch_horas", "numero_ue", "topico", "ue_ch_horas",
            "qtd_subunidades", "subunidades",
        ])
        for c in curriculos:
            for d in c.disciplinas:
                for u in d.unidades:
                    w.writerow([
                        c.arquivo, c.curso_sigla or "", d.ordinal, d.nome,
                        d.ch_horas or "", u.numero_ue, u.topico,
                        u.ch_prevista_horas if u.ch_prevista_horas is not None else "",
                        len(u.subunidades), " | ".join(u.subunidades),
                    ])

    # ----------------------------------------------------------------- relatorio
    total_ue = sum(len(d.unidades) for c in curriculos for d in c.disciplinas)
    total_disc = sum(len(c.disciplinas) for c in curriculos)
    print(f"{'ARQUIVO':<58} {'SIGLA':<14} {'DISC':>4} {'UE':>4}  OBSERVACAO")
    print("-" * 118)
    for c in curriculos:
        n_ue = sum(len(d.unidades) for d in c.disciplinas)
        obs = "" if not c.observacao else c.observacao[:38]
        print(f"{c.arquivo[:57]:<58} {(c.curso_sigla or '?')[:13]:<14} "
              f"{len(c.disciplinas):>4} {n_ue:>4}  {obs}")
    print("-" * 118)
    print(f"{'TOTAL':<58} {'':<14} {total_disc:>4} {total_ue:>4}")

    sem_ue = [c for c in curriculos if not any(d.unidades for d in c.disciplinas)]
    if sem_ue:
        print(f"\n{len(sem_ue)} curriculo(s) sem UE extraida:")
        for c in sem_ue:
            print(f"  - {c.arquivo}: {c.observacao}")

    sem_ch = [
        (c.arquivo, d.nome, u.numero_ue)
        for c in curriculos for d in c.disciplinas for u in d.unidades
        if u.ch_prevista_horas is None
    ]
    if sem_ch:
        print(f"\n{len(sem_ch)} UE sem carga horaria reconhecida (conferir a mao):")
        for arq, disc, num in sem_ch[:25]:
            print(f"  - {arq} | {disc} | UE {num}")

    # --------------------------------------------------------------- invariante
    # A soma da CH das UE deve fechar com a CH declarada da disciplina. E a unica
    # prova disponivel de que o parser leu o curriculo certo — e, quando NAO fecha,
    # e achado do curriculo a reportar, nunca a "corrigir" no dado (Principio II).
    fecha = divergem = incompleta = 0
    divergencias = []
    for c in curriculos:
        for d in c.disciplinas:
            if not d.unidades or d.ch_horas is None:
                continue
            if any(u.ch_prevista_horas is None for u in d.unidades):
                incompleta += 1
                continue
            soma = sum(u.ch_prevista_horas or 0 for u in d.unidades)
            if soma == d.ch_horas:
                fecha += 1
            else:
                divergem += 1
                divergencias.append(
                    (c.curso_sigla or "?", d.ordinal, d.nome, d.ch_horas, soma, len(d.unidades))
                )

    print("\n--- Invariante: soma das UE == CH da disciplina ---")
    print(f"  fecham exatamente        : {fecha}")
    print(f"  divergem                 : {divergem}")
    print(f"  UE sem CH (nao aferivel) : {incompleta}")
    for sigla, ordinal, nome, decl, soma, n in divergencias:
        print(f"  ! {sigla:<14} {ordinal:<12} {nome[:40]:<42} "
              f"declarada={decl:>4}  soma={soma:>4}  ({n} UE)")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    raise SystemExit(main(Path(sys.argv[1]), Path(sys.argv[2])))
