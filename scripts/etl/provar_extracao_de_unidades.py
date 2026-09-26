"""T017 — a prova do extrator de Unidades de Ensino sobre os 24 curriculos REAIS.

    python -m scripts.etl.provar_extracao_de_unidades [<dir_curriculos>]

O QUE  : roda `extrair_unidades_ensino.processar` nos 24 PDFs da DEnsM e confere, um a um, o
         que a T017 acrescentou — o **fundamento normativo** de toda UE e a **translineacao com
         hifen** — mais a invariante que ja existia (soma das UE = CH da disciplina).

PARA QUE: as UEs vem dos curriculos oficiais e **nada aqui nasce de digitacao ou inferencia**
         (D-B4). Um extrator que erra o fundamento carrega 582 linhas sem procedencia; um que
         erra a translineacao carrega `AEROFOTOGRA METRIA` como topico e ninguem percebe,
         porque o numero de UEs e a CH continuam certos.

⚠️ **ELA NAO RODA NO CI, E ISSO E PROPOSITAL.** Os PDFs vivem em `SIS11/Curriculos/`, **fora do
   repositorio** (decisao UE-PUB versionou o CATALOGO extraido, nao os PDFs). Sem eles a prova
   **pula com mensagem**, em vez de reprovar — reprovar no CI por falta de material seria
   defeito da verificacao, nao do codigo.

⚠️ **NENHUM NUMERO AQUI FOI ESCRITO POR ANTECIPACAO** (regra 9.3). Todos foram medidos nos 24
   curriculos em 26/09/2026, antes de esta prova existir, e estao ao lado do artefato que os
   produziu (regra 9.2).
"""

from __future__ import annotations

import sys
from pathlib import Path

from scripts.etl.extrair_unidades_ensino import (
    RE_LISTA_UE,
    juntar_translineacao,
    processar,
)

PADRAO = Path(__file__).resolve().parents[2].parent / "SIS11" / "Curriculos"

# ---------------------------------------------------------------------------------
# O que foi MEDIDO em 26/09/2026, contra os 24 PDFs de `SIS11/Curriculos/`
# ---------------------------------------------------------------------------------
CURRICULOS = 24
COM_OFICIO = 15          # trazem "Of no N-N/AAAA" no proprio texto
PELA_CAPA = 8            # sem Oficio; fundamento montado da capa (orgao + ano)
SEM_TEXTO = 1            # EST-QF-APOC: PDF digitalizado, sem camada de texto
DISCIPLINAS_COM_UE = 135
UNIDADES = 582
SEM_UE = 3               # APOC (sem texto) + os dois cursos por competencias

# Os dois topicos do `C-Ap-HN` que a translineacao partia. ⚠️ Eles sao o caso que
# DISCRIMINA: antes da correcao saiam `PRATI CAS` e `AEROFOTOGRA METRIA`, com a palavra
# cortada por um espaco, e o numero de UEs e a CH ficavam CERTOS — o defeito nao aparecia
# em contagem nenhuma.
TOPICOS_INTEIROS = (
    ("c-ap-hn.pdf", "PRÁTICAS DE SEGURANÇA"),
    ("c-ap-hn.pdf", "AEROFOTOGRAMETRIA E BATIMETRIA"),
)

# ⚠️ O CONTROLE DA ESCOPAGEM. Estes compostos vivem FORA do bloco de UE e MUST NOT ser
#    colados: se a regra da translineacao escapar do recorte, `Primeiro-` + `Tenente` vira
#    `PrimeiroTenente`. Sao 856 translineacoes no texto inteiro contra 14 dentro do bloco.
COMPOSTOS_QUE_FICAM = ("Primeiro-", "técnico-", "didático-", "basear-", "dados-do-")


def pular(motivo: str) -> int:
    print(f"PULADA: {motivo}")
    print("        Esta prova precisa dos PDFs da DEnsM, que vivem FORA do repositorio.")
    return 0


def main(argv: list[str]) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    diretorio = Path(argv[1]) if len(argv) > 1 else PADRAO
    if not diretorio.is_dir():
        return pular(f"{diretorio} nao existe")
    pdfs = sorted(diretorio.glob("*.pdf"))
    if not pdfs:
        return pular(f"{diretorio} nao tem PDF nenhum")

    print(f"lendo {len(pdfs)} curriculos de {diretorio}\n")
    curriculos = [processar(p) for p in pdfs]
    problemas: list[str] = []

    def conferir(rotulo: str, obtido: object, esperado: object) -> None:
        ok = obtido == esperado
        print(f"  {'OK' if ok else 'X '} {rotulo}: {obtido}" + ("" if ok else f" (esperado {esperado})"))
        if not ok:
            problemas.append(f"{rotulo}: {obtido}, esperado {esperado}")

    # -- P1 — o inventario ---------------------------------------------------------
    print("P1 · o inventario dos curriculos")
    conferir("curriculos lidos", len(curriculos), CURRICULOS)
    conferir("disciplinas com UE",
             sum(1 for c in curriculos for d in c.disciplinas if d.unidades), DISCIPLINAS_COM_UE)
    conferir("unidades de ensino", sum(len(d.unidades) for c in curriculos for d in c.disciplinas),
             UNIDADES)
    conferir("curriculos sem UE", sum(1 for c in curriculos if not any(d.unidades for d in c.disciplinas)),
             SEM_UE)

    # -- P2 — o fundamento normativo, por origem -----------------------------------
    print("\nP2 · o fundamento normativo (FR-064, N-1)")
    por_origem = {o: [c for c in curriculos if c.fundamento_origem == o]
                  for o in ("oficio", "capa", "sem_texto")}
    conferir("com Oficio no texto", len(por_origem["oficio"]), COM_OFICIO)
    conferir("montado da capa", len(por_origem["capa"]), PELA_CAPA)
    conferir("sem camada de texto", len(por_origem["sem_texto"]), SEM_TEXTO)

    # Toda UE carregavel MUST ter fundamento — e a condicao que a migration do PR 2 exige.
    sem_fundamento = [
        f"{c.arquivo}/{d.ordinal}"
        for c in curriculos if c.fundamento_normativo is None
        for d in c.disciplinas if d.unidades
    ]
    conferir("UEs extraidas SEM fundamento", len(sem_fundamento), 0)
    if sem_fundamento:
        problemas.append("ha UE sem fundamento: " + ", ".join(sem_fundamento[:5]))

    # A forma do fundamento, para que ninguem confunda as duas origens.
    for c in por_origem["oficio"][:1] + por_origem["capa"][:1]:
        print(f"     exemplo ({c.fundamento_origem}): {c.fundamento_normativo}")
    formas_erradas = [
        c.arquivo for c in por_origem["oficio"] if not (c.fundamento_normativo or "").startswith("Of no ")
    ] + [
        c.arquivo for c in por_origem["capa"] if not (c.fundamento_normativo or "").startswith("Curriculo ")
    ]
    conferir("fundamentos fora da forma declarada", len(formas_erradas), 0)

    # -- P3 — a translineacao, e o caso que discrimina -----------------------------
    print("\nP3 · a translineacao com hifen (o caso que discrimina)")
    topicos = {
        (c.arquivo, u.topico)
        for c in curriculos for d in c.disciplinas for u in d.unidades
    }
    for arquivo, pedaco in TOPICOS_INTEIROS:
        inteiro = any(a == arquivo and pedaco in t for a, t in topicos)
        print(f"  {'OK' if inteiro else 'X '} {arquivo}: {pedaco!r} sai inteiro")
        if not inteiro:
            problemas.append(f"topico partido em {arquivo}: {pedaco}")

    # ⚠️ E a prova de que a regra NAO escapou do bloco de UE: desligada a juncao, os dois
    #    topicos voltam a sair partidos. Sem esta metade, a assercao acima passaria mesmo
    #    que o PDF simplesmente nao tivesse translineacao nenhuma.
    import scripts.etl.extrair_unidades_ensino as extrator

    original = extrator.juntar_translineacao
    extrator.juntar_translineacao = lambda linhas: linhas
    try:
        sem_juncao = processar(diretorio / TOPICOS_INTEIROS[0][0])
    finally:
        extrator.juntar_translineacao = original
    topicos_sem = {u.topico for d in sem_juncao.disciplinas for u in d.unidades}
    voltaram_a_partir = sum(
        1 for _, pedaco in TOPICOS_INTEIROS if not any(pedaco in t for t in topicos_sem)
    )
    conferir("topicos que voltam a partir com a juncao DESLIGADA", voltaram_a_partir,
             len(TOPICOS_INTEIROS))

    # E o controle da escopagem: composto legitimo, fora do bloco, fica como esta.
    print("\n  controle da escopagem — composto legitimo fora do bloco de UE:")
    import fitz

    doc = fitz.open(diretorio / "c-ap-hn.pdf")
    linhas_brutas = "\n".join(doc[i].get_text() for i in range(doc.page_count)).splitlines()
    doc.close()
    juntadas = "\n".join(juntar_translineacao([l.rstrip() for l in linhas_brutas]))
    for composto in COMPOSTOS_QUE_FICAM:
        no_bruto = composto in "\n".join(linhas_brutas)
        colado = composto.replace("-", "") in juntadas and composto not in juntadas
        if not no_bruto:
            continue
        print(f"    {'OK' if not colado else 'X '} {composto!r} nao foi colado")
        if colado:
            problemas.append(f"a juncao escapou do bloco e colou {composto!r}")

    # -- P4 — a invariante da CH ---------------------------------------------------
    print("\nP4 · a invariante: soma das UE == CH da disciplina")
    fecham = divergem = 0
    for c in curriculos:
        for d in c.disciplinas:
            if not d.unidades or d.ch_horas is None:
                continue
            if any(u.ch_prevista_horas is None for u in d.unidades):
                divergem += 1
                problemas.append(f"UE sem CH em {c.arquivo}/{d.ordinal}")
                continue
            soma = sum(u.ch_prevista_horas or 0 for u in d.unidades)
            if soma == d.ch_horas:
                fecham += 1
            else:
                divergem += 1
                problemas.append(f"{c.arquivo}/{d.ordinal}: UEs somam {soma}, CH {d.ch_horas}")
    conferir("disciplinas em que a soma fecha", fecham, DISCIPLINAS_COM_UE)
    conferir("disciplinas em que divergem", divergem, 0)

    print(f"\n{'=' * 78}")
    if problemas:
        for p in problemas[:20]:
            print(f"X {p}")
        print("\nNAO PROVADA: o extrator divergiu no que esta acima.")
        return 1
    print("PROVADA: fundamento em toda UE (15 por Oficio, 8 pela capa, 1 sem texto),")
    print("         translineacao colada SO dentro do bloco de UE, e a invariante em 135/135.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
