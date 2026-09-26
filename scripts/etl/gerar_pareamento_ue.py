"""T018 — monta o candidato a `scripts/etl/dados/pareamento_ue.csv` e ACUSA o que nao pareou.

    python -m scripts.etl.gerar_pareamento_ue [<dir_curriculos>]

O QUE  : cruza o catalogo extraido dos curriculos (`unidades_ensino.json`) com as disciplinas do
         banco e escreve, uma linha por UE, o **destino**: qual `disciplinas.codigo` recebe aquela
         unidade. Escreve tambem as **exclusoes declaradas**, com motivo.

PARA QUE: a carga do PR 2 le este arquivo e **nao decide nada**. Toda decisao de pareamento mora
         aqui, revisada e versionada — e o gerador da carga **recusa** UE sem destino (D-B4:
         nenhuma UE nasce de digitacao ou inferencia).

⚠️ **O ARQUIVO GERADO E CANDIDATO, NAO VERDADE.** Ele vai para revisao humana antes de virar
   entrada da carga. O que este script garante e que **nada passa em silencio**: cada UE ou tem
   destino, ou aparece na lista de nao pareadas com o motivo da falha.

⚠️ **O PAREAMENTO E SEMPRE CURSO ↔ O PROPRIO CURRICULO, NUNCA CRUZADO** *(decisao P-2 de Bernardo
   Villas Boas, 25/09/2026)*. `C-Exp-MetocOf` (presencial) pareia com o curriculo de **2011**;
   `C-Exp-Metoc-OF-SP` (semipresencial) com o **SP de 2025**. Sao dois cursos, com dois curriculos.

⚠️ **AS DIVERGENCIAS DE CH NAO SAO CORRIGIDAS AQUI, NEM EM LUGAR NENHUM POR SCRIPT** *(P-1)*. A CH
   da UE entra **sem conversao** (1 TA = 1 hora, Q-12) e a CH da DISCIPLINA no banco **nao e
   tocada**; onde as duas divergem, a tela avisa (Q-06) e Bernardo corrige.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DADOS = RAIZ / "scripts" / "etl" / "dados"
SAIDA = DADOS / "pareamento_ue.csv"

# ---------------------------------------------------------------------------------
# 1. ARQUIVO DO CURRICULO → `cursos.codigo`
#
# ⚠️ **AS 8 QUE NAO BATEM ESTAO AQUI, E E POR ISSO QUE ESTE MAPA E EXPLICITO.** A sigla da
#    capa da DEnsM nao e `cursos.codigo` em 8 dos 24: `EST - QF - APHID` x `EST-QF-APHID`,
#    `C-EXP-METOC-OF` x `C-Exp-MetocOf`, e as demais com espaco, travessao ou caixa
#    diferente. Derivar a correspondencia por normalizacao acertaria hoje e erraria no dia em
#    que a DEnsM mudar a grafia de uma capa — e erraria em SILENCIO, carregando UE no curso
#    errado. Mapa a mao, conferido contra `cursos.codigo` na execucao.
MAPA_ARQUIVO_CURSO: dict[str, str] = {
    "2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf": "CAHO",
    "4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf": "C-Ap-FR",
    "c-ap-hn.pdf": "C-Ap-HN",
    "2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf": "C-ApA-AuxNav-PR-SP",
    "of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf": "C-ApA-OcOp-PR-SP",
    "2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf": "C-ApA-PCN-PR-EAD",
    "of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf": "C-ApA-PrevMe-PR-EAD",
    "c-esp-alh.pdf": "C-Esp-ALH",
    "c-esp-me.pdf": "C-Esp-ME",
    "c-esp-opap.pdf": "C-Esp-OpAP",
    "c-exp-agmag.pdf": "C-Exp-Ag-Mag",
    "c-exp-bati.pdf": "C-Exp-BATI",
    # ⚠️ Os dois METOC — cursos DIFERENTES, curriculos DIFERENTES (P-2).
    "c-exp-metocof_0.pdf": "C-Exp-MetocOf",                       # presencial, 2011
    "of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf": "C-Exp-Metoc-OF-SP",  # SP, 2025
    "c-exp-obs-me_0_0.pdf": "C-Exp-Obs-ME",
    "curriculo-ciaara-est-qf-aphid_presencial_mod2.pdf": "EST-QF-APHID",
    "marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf": "EST-QF-APOC",
    "curriculo-ciaara-est-qf-em2040phs.pdf": "EST-QF-EM2040PHS",
    "est-qf-mareflu.pdf": "EST-QF-MAREFLU",
    "est-qf-navflu-ead.pdf": "EST-QF-NAVFLU-EAD",
    "est-qf-pgrs100.pdf": "EST-QF-PGRS100",
    "curriculo-ciaara-est-qf-proc-mf-ead_mod3.pdf": "EST-QF-PROC-MF-EAD",
    # Os dois por competencias: nenhuma UE a parear (§4.4 da conferencia).
    "of10-82-2024-densm-ana-c-espc-fr.pdf": "C-Espc-FR",
    "of10-82-2024-densm-anb-c-espc-hn.pdf": "C-Espc-HN",
}

# ---------------------------------------------------------------------------------
# 2. OS DESDOBRAMENTOS — destino POR UE, nao por disciplina (N-3, confirmada com pagina)
#
# Uma disciplina do curriculo que o banco partiu em duas. O destino deixa de ser "a
# disciplina" e passa a ser "esta UE vai para aquela linha". Confirmado pela segunda
# verificacao da conferencia (§4.2), com pagina, e por isso ACEITO.
# ⚠️ As duas linhas do banco FICAM: o desdobramento e escolha do banco, nao do curriculo, e
#    Q-05 proibiu fundir.
# ⚠️ **A CHAVE E O ORDINAL QUE O EXTRATOR PRODUZ, NAO O DA CONFERENCIA.** A conferencia escreve
#    *"`CAHO` · `XXI - MATFIS - NIVELAMENTO...`"*, com a POSICAO e o CODIGO juntos; o extrator le o
#    `CODIGO:` do PDF, que e `MATFIS`. A primeira versao desta tabela usou `XXI`, a entrada **nunca
#    disparou**, e as DUAS UEs foram para a linha de MATEMATICA — 28 horas de FISICA na disciplina
#    errada, com `FIS` vazia. ⚠️ **E nenhuma contagem acusaria**: o CAHO continuava com 132 UEs, o
#    total continuava 587. Por isso existe a guarda `conferir_que_todas_dispararam()`, abaixo: uma
#    excecao declarada que nao casa e um no-op silencioso, e no-op silencioso e o defeito.
DESDOBRAMENTOS: dict[tuple[str, str], dict[int, str]] = {
    # CAHO · MATFIS (posicao XXI no quadro) 56 h -> MAT 28 (UE 1) + FIS 28 (UE 2).
    # Conferencia §4.2, p. 8 e 72-73.
    ("CAHO", "MATFIS"): {1: "1 - CAHO - MAT", 2: "2 - CAHO - FIS"},
    # C-Ap-HN · HN-2101-0621 126 h -> I 105 (UEs 1-6) + I-I 21 (UE 7, FISICA).
    # Conferencia §4.2, p. 6 e 8-9.
    ("C-Ap-HN", "HN-2101-0621"): {
        1: "23 - C-Ap-HN - I", 2: "23 - C-Ap-HN - I", 3: "23 - C-Ap-HN - I",
        4: "23 - C-Ap-HN - I", 5: "23 - C-Ap-HN - I", 6: "23 - C-Ap-HN - I",
        7: "24 - C-Ap-HN - I-I",
    },
}
# ⚠️ **OS QUATRO CODIGOS ACIMA FORAM CORRIGIDOS EM 26/09/2026, E A CONFERENCIA ESTAVA ERRADA.**
#    A tabela da N-3 escreve os destinos como `20 - CAHO - MAT`, `20 - CAHO - FIS`,
#    `41 - C-Ap-HN - I` e `41 - C-Ap-HN - I-I`. **Nenhum dos quatro existe.** Medido no retrato
#    das disciplinas: `1 - CAHO - MAT` (28), `2 - CAHO - FIS` (28), `23 - C-Ap-HN - I` (105) e
#    `24 - C-Ap-HN - I-I` (21) — o prefixo numerico e a linha do `ID_Grade` da v2.0, um por
#    disciplina, e nao se repete entre duas. O que a conferencia confirmou COM PAGINA foi
#    **qual UE vai para qual disciplina** (MAT × FIS, I × I-I); a grafia do codigo era
#    transcricao, e transcricao nao foi medida. Guardado por `conferir_destinos_no_banco()`.

# ---------------------------------------------------------------------------------
# 3. AS EXCLUSOES DECLARADAS — com motivo, porque silencio nao e declaracao
#
# Disciplina do BANCO que fica sem UE nesta carga. Cada uma tem um motivo escrito e a
# decisao que a sustenta. `sem_unidades_ensino = true` e o marcador no banco (D-B3).
EXCLUSOES: tuple[tuple[str, str, str], ...] = (
    ("C-ApA-AuxNav-PR-SP", "AMBIENTAÇÃO VIRTUAL",
     "AMBIENTACAO e FASE no curriculo, nao disciplina: aparece so na composicao da CH, nunca no "
     "quadro de disciplinas (conferencia §4.5). Sem UE por natureza. CH e duvida P-1."),
    ("C-ApA-OcOp-PR-SP", "AMBIENTAÇÃO VIRTUAL", "idem §4.5 — curriculo 10 h x banco 8."),
    ("C-ApA-PCN-PR-EAD", "AMBIENTAÇÃO VIRTUAL", "idem §4.5 — curriculo 5 h x banco 8."),
    ("C-ApA-PrevMe-PR-EAD", "AMBIENTAÇÃO VIRTUAL", "idem §4.5 — curriculo 5 h x banco 8."),
    ("C-Exp-Metoc-OF-SP", "AMBIENTAÇÃO VIRTUAL", "idem §4.5 — curriculo 8 h = banco 8."),
    ("C-Exp-Metoc-OF-SP", "EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA",
     "A linha carrega a sigla do OUTRO curso e a CH da `IV` do curriculo de 2011. O pareamento "
     "NUNCA e cruzado (P-2), e replicar a UE do presencial seria inferir (D-B4). Se a linha deve "
     "existir aqui, e com que CH, e CADASTRO: corrige-se na tela (P-1). Conferencia §4.6, "
     "PEND-5b-5."),
)

# Os dois cursos por competencias: TODAS as disciplinas ficam fora, e o curso inteiro muda de
# modelo. Nao ha `LISTA DE UNIDADES DE ENSINO` em 127 + 146 paginas (conferencia §4.4).
CURSOS_POR_COMPETENCIAS = ("C-Espc-FR", "C-Espc-HN")

# ---------------------------------------------------------------------------------
# 4. O APOC — transcrito de imagem (P-4)
#
# O PDF nao tem camada de texto; as 5 UEs foram lidas das imagens por dois leitores
# independentes, com legibilidade alta e nenhum numero ambiguo (conferencia §4.1). Elas entram
# nesta carga marcadas, e a assercao de soma exclui esta disciplina NOMINALMENTE, porque o
# proprio PDF diz 80 de UE contra 79 de CH ("TEMPO RESERVA 1 HORA") e nao diz de qual UE sai.
APOC_UES: tuple[tuple[int, str, int], ...] = (
    (1, "INTRODUÇÃO À OCEANOGRAFIA", 9),
    (2, "AQUISIÇÃO DE DADOS NOS MEIOS DA MB", 18),
    (3, "CORRENTOMETRIA", 9),
    (4, "ANÁLISE DOS DADOS", 20),
    (5, "ATIVIDADES PRÁTICAS", 24),
)
APOC_FUNDAMENTO = "Curriculo EST-QF-APOC — CIAARA, 2021 (transcrito de imagem)"


# ---------------------------------------------------------------------------------
# 5. PAREAMENTO POR GRAFIA — as dez que o nome nao casa, cada uma com a razao
#
# ⚠️ **ESTA TABELA EXISTE PARA QUE O CASAMENTO AUTOMATICO CONTINUE ESTRITO.** Afrouxar a
#    comparacao de nome para engolir `TFM.` = `TREINAMENTO FISICO MILITAR` fecharia estes dez
#    casos e abriria a porta para parear duas disciplinas parecidas de um curso grande — erro
#    que carrega UE na linha errada e nao aparece em contagem nenhuma. Aqui cada excecao e
#    NOMEADA e conferida por **ordinal + CH**, que e o que a torna verificavel.
# ⚠️ Todas as dez sao GRAFIA, e a conferencia §4.7 ja as previa: o banco perdeu a palavra
#    "FIM"/"FINAL" em tres nomes, abrevia em quatro (`TFM.`, `INFO.`, `ADM`, `METODOS DE
#    COMP.`) e, no `C-Esp-ALH`, dois nomes comecam com as mesmas 14 letras.
# ⚠️ E o `C-Esp-ALH` tem a duplicata viva `ALH-II` (achado A-2 do specify): duas linhas com o
#    MESMO `cod_disciplina`, uma delas devendo ser `ALH-III`. Por isso o casamento por NOME vem
#    antes do casamento por ordinal — por ordinal, aquelas duas seriam indistinguiveis.
PAREAMENTO_POR_GRAFIA: dict[tuple[str, str], tuple[str, str]] = {
    ("C-Ap-FR", "FR-2205-1014"): (
        "46 - C-Ap-FR - V",
        "banco abrevia: `OPERACOES E ADM DE AUXILIOS A NAVEGACAO`. CH 140 = 140."),
    ("C-Ap-FR", "FR-2210-0510"): (
        "40 - C-Ap-FR - X",
        "banco escreve `TFM.`; conferencia §4.7 confirma TFM = TREINAMENTO FISICO MILITAR. 40 = 40."),
    ("C-Ap-FR", "FR-2213-0820"): (
        "53 - C-Ap-FR - XIII",
        "banco PERDEU a palavra FIM: `PRATICA DE  DE CURSO EM MANUTENCAO...`. §4.7. 160 = 160."),
    ("C-Ap-HN", "HN-2102- 0150"): (
        "25 - C-Ap-HN - II",
        "banco abrevia: `INFO. APLICADA A HIDROGRAFIA`. §4.7 confirma, 51 h."),
    ("C-Ap-HN", "HN-2117-0506"): (
        "40 - C-Ap-HN - XVII",
        "banco escreve `TFM.`. §4.7. 40 = 40."),
    ("C-Esp-ALH", "VI"): (
        "99 - C-Esp-ALH - ALH-VI",
        "ordinal VI ↔ `ALH-VI` e CH 40 = 40. ⚠️ O nome saiu TRUNCADO da extracao "
        "(`AQUISICAO,`), e por isso o nome nao pode decidir aqui — quem decide e ordinal + CH. "
        "O nome da DISCIPLINA nao e carregado por esta migration (Q-13: nao renomear)."),
    ("C-Esp-ALH", "VIII"): (
        "101 - C-Esp-ALH - ALH-VIII",
        "ordinal VIII ↔ `ALH-VIII` e CH 60 = 60. As duas ALH comecam com as mesmas 14 letras "
        "(`AQUISICAO, PROCESSAMENTO E ANALISE DE DADOS DE ...`), e o casamento estrito recusou "
        "de proposito em vez de escolher uma."),
    ("C-Exp-Ag-Mag", "AGU-MAG-1"): (
        "83 - C-Exp-Ag-Mag - I",
        "o banco poe o ORDINAL DENTRO do nome: `METODOS DE COMP. AGU-MAG-1.`. CH 60 = 60."),
    ("C-Exp-Ag-Mag", "AGU-MAG-2"): (
        "84 - C-Exp-Ag-Mag - II",
        "idem: `METODOS DE COMP. AGU-MAG-2.` — e o curriculo chama de `PRATICA DE COMPENSACAO`, "
        "nome diferente. CH 80 = 80, e o sufixo do ordinal e o discriminador."),
    ("C-ApA-OcOp-PR-SP", "OCOPXSP"): (
        "149 - C-ApA-OcOp-PR-SP - X",
        "banco PERDEU a palavra FINAL: `TRABALHO DE  DE CURSO.`. CH 80 = 80."),
}


def normalizar(texto: str) -> str:
    """Nome comparavel: sem acento, sem pontuacao, caixa alta, espaco colapsado."""
    t = "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    ).upper()
    t = re.sub(r"\b(?:DE|DA|DO|DAS|DOS|E|A|O|AO|AOS|EM|COM)\b", " ", t)
    t = re.sub(r"[^A-Z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def carregar_disciplinas_do_banco(caminho: Path) -> dict[str, list[dict[str, str]]]:
    """As disciplinas por curso, do retrato `L|curso|codigo|cod_disciplina|nome|ch`."""
    por_curso: dict[str, list[dict[str, str]]] = {}
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        if not linha.startswith("L|"):
            continue
        _, curso, codigo, cod_disc, nome, ch = linha.split("|", 5)
        por_curso.setdefault(curso, []).append(
            {"codigo": codigo, "cod_disciplina": cod_disc, "nome": nome, "ch": ch}
        )
    return por_curso


def parear(nome_curriculo: str, ordinal: str, candidatas: list[dict[str, str]]) -> dict | None:
    """A disciplina do banco que corresponde a do curriculo — por nome, depois por ordinal.

    ⚠️ O nome vem PRIMEIRO de proposito: o ordinal do curriculo e o `cod_disciplina` do banco
    coincidem em muitos cursos e divergem em outros (o banco renumerou sufixos, §4.4), e nome
    normalizado errado e mais facil de ver na revisao do que ordinal errado.
    """
    alvo = normalizar(nome_curriculo)
    if alvo:
        exatas = [c for c in candidatas if normalizar(c["nome"]) == alvo]
        if len(exatas) == 1:
            return exatas[0]
        # Abreviacao: o banco escreve `INFO.` onde o curriculo escreve `INFORMATICA` (§4.7).
        contidas = [
            c for c in candidatas
            if normalizar(c["nome"]) and (
                alvo.startswith(normalizar(c["nome"])[:14])
                or normalizar(c["nome"]).startswith(alvo[:14])
            )
        ]
        if len(contidas) == 1:
            return contidas[0]
    por_ordinal = [c for c in candidatas if c["cod_disciplina"].strip() == ordinal.strip()]
    if len(por_ordinal) == 1:
        return por_ordinal[0]
    return None


def main(argv: list[str]) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    retrato = Path(argv[1]) if len(argv) > 1 else DADOS / "disciplinas-do-banco.txt"
    if not retrato.is_file():
        print(f"[NAO CONFERIDA] falta o retrato das disciplinas do banco em {retrato}")
        print("  gere com (SO LEITURA):")
        print('  supabase db query --linked "select \'L|\' || c.codigo || \'|\' || d.codigo ...');
        return 1
    catalogo = json.loads((DADOS / "unidades_ensino.json").read_text(encoding="utf-8"))
    banco = carregar_disciplinas_do_banco(retrato)

    faltando = [a for a in MAPA_ARQUIVO_CURSO if a not in {c["arquivo"] for c in catalogo}]
    sobrando = [c["arquivo"] for c in catalogo if c["arquivo"] not in MAPA_ARQUIVO_CURSO]
    cursos_ausentes = sorted({v for v in MAPA_ARQUIVO_CURSO.values()} - set(banco))
    for rotulo, lista in (("arquivo no mapa e nao no catalogo", faltando),
                          ("arquivo no catalogo e nao no mapa", sobrando),
                          ("curso do mapa que nao existe no banco", cursos_ausentes)):
        if lista:
            print(f"[NAO CONFERIDA] {rotulo}: {lista}")
            return 1
    print(f"mapa conferido: {len(MAPA_ARQUIVO_CURSO)} arquivos, {len(set(MAPA_ARQUIVO_CURSO.values()))} cursos\n")

    # ⚠️ GUARDA CONTRA NO-OP SILENCIOSO. Toda chave declarada em `DESDOBRAMENTOS` e em
    #    `PAREAMENTO_POR_GRAFIA` MUST casar com EXATAMENTE UMA disciplina do catalogo. Chave que
    #    nao casa nada e uma excecao que nunca acontece — e foi assim que a UE de FISICA do CAHO
    #    caiu na linha de MATEMATICA; chave que casa duas e uma escolha feita no escuro (os cinco
    #    METOC presenciais vem do extrator com ordinal `?`).
    chaves_do_catalogo: dict[tuple[str, str], int] = {}
    for c in catalogo:
        curso_c = MAPA_ARQUIVO_CURSO[c["arquivo"]]
        for d in c["disciplinas"]:
            if d["unidades"]:
                k = (curso_c, d["ordinal"])
                chaves_do_catalogo[k] = chaves_do_catalogo.get(k, 0) + 1
    for rotulo, tabela in (("DESDOBRAMENTOS", DESDOBRAMENTOS),
                           ("PAREAMENTO_POR_GRAFIA", PAREAMENTO_POR_GRAFIA)):
        for chave in tabela:
            quantas = chaves_do_catalogo.get(chave, 0)
            if quantas != 1:
                print(f"[NAO CONFERIDA] {rotulo}{chave} casa {quantas} disciplinas do catalogo, "
                      f"esperava exatamente 1 — excecao declarada que nao dispara e no-op silencioso")
                return 1
    print(f"guarda das excecoes: {len(DESDOBRAMENTOS)} desdobramentos e "
          f"{len(PAREAMENTO_POR_GRAFIA)} pareamentos por grafia, cada um casando 1 disciplina")

    # ⚠️ GUARDA DOS CODIGOS ESCRITOS A MAO, e ela nasceu de um erro real: os quatro destinos dos
    #    desdobramentos vieram transcritos da conferencia e **nenhum dos quatro existia** no banco
    #    (`20 - CAHO - MAT` por `1 - CAHO - MAT`, `41 - C-Ap-HN - I` por `23 - C-Ap-HN - I`). O
    #    gerador da carga resolve o destino por `disciplinas.codigo`, entao um codigo inexistente
    #    produziria ZERO linhas para aquela UE — carga silenciosamente incompleta.
    codigos_do_banco = {(curso, d["codigo"]) for curso, ds in banco.items() for d in ds}
    escritos_a_mao: list[tuple[str, str, str]] = [
        (curso, codigo, f"DESDOBRAMENTOS({curso}, {ordinal}) UE {ue}")
        for (curso, ordinal), mapa in DESDOBRAMENTOS.items()
        for ue, codigo in mapa.items()
    ] + [
        (curso, destino, f"PAREAMENTO_POR_GRAFIA({curso}, {ordinal})")
        for (curso, ordinal), (destino, _razao) in PAREAMENTO_POR_GRAFIA.items()
    ]
    inexistentes = [
        (onde, codigo) for curso, codigo, onde in escritos_a_mao
        if (curso, codigo) not in codigos_do_banco
    ]
    if inexistentes:
        print("[NAO CONFERIDA] codigo de destino escrito a mao que NAO existe no banco:")
        for onde, codigo in inexistentes:
            print(f"    {onde}: {codigo!r}")
        return 1
    print(f"guarda dos codigos: {len(escritos_a_mao)} destinos escritos a mao, todos existem "
          f"no banco, no curso certo\n")

    linhas: list[dict[str, object]] = []
    nao_pareadas: list[str] = []

    for c in catalogo:
        curso = MAPA_ARQUIVO_CURSO[c["arquivo"]]
        if curso in CURSOS_POR_COMPETENCIAS:
            continue
        for d in c["disciplinas"]:
            if not d["unidades"]:
                continue
            chave = (curso, d["ordinal"])
            destino_por_ue = DESDOBRAMENTOS.get(chave)
            por_grafia = PAREAMENTO_POR_GRAFIA.get(chave)
            alvo = None
            if not destino_por_ue and not por_grafia:
                alvo = parear(d["nome"], d["ordinal"], banco.get(curso, []))
                if alvo is None:
                    nao_pareadas.append(f"{curso} · {d['ordinal']} · {d['nome']}")
                    continue
            for u in d["unidades"]:
                if destino_por_ue:
                    codigo = destino_por_ue.get(u["numero_ue"])
                elif por_grafia:
                    codigo = por_grafia[0]
                else:
                    codigo = alvo["codigo"]  # type: ignore[index]
                if codigo is None:
                    nao_pareadas.append(
                        f"{curso} · {d['ordinal']} · UE {u['numero_ue']} sem destino no desdobramento")
                    continue
                linhas.append({
                    "arquivo": c["arquivo"],
                    "curso_codigo": curso,
                    "curriculo_ordinal": d["ordinal"],
                    "curriculo_disciplina": d["nome"],
                    "curriculo_ch_horas": d["ch_horas"] or "",
                    "numero_ue": u["numero_ue"],
                    "topico": u["topico"],
                    "ue_ch_horas": u["ch_prevista_horas"] if u["ch_prevista_horas"] is not None else "",
                    "destino_disciplina_codigo": codigo,
                    "fundamento_normativo": c["fundamento_normativo"] or "",
                    "fundamento_origem": c["fundamento_origem"],
                    "observacao": (
                        "desdobramento N-3 (conferencia §4.2)" if destino_por_ue
                        else f"pareado por grafia: {por_grafia[1]}" if por_grafia
                        else ""
                    ),
                    "motivo_da_exclusao": "",
                })

    # -- o APOC, transcrito de imagem ---------------------------------------------
    apoc = banco.get("EST-QF-APOC", [])
    if len(apoc) != 1:
        print(f"[NAO CONFERIDA] EST-QF-APOC tem {len(apoc)} disciplinas no banco, esperava 1")
        return 1
    for numero, topico, ch in APOC_UES:
        linhas.append({
            "arquivo": "marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf",
            "curso_codigo": "EST-QF-APOC",
            "curriculo_ordinal": "I",
            "curriculo_disciplina": "AQUISIÇÃO E PROCESSAMENTO DE DADOS OCEANOGRÁFICOS",
            "curriculo_ch_horas": 79,
            "numero_ue": numero,
            "topico": topico,
            "ue_ch_horas": ch,
            "destino_disciplina_codigo": apoc[0]["codigo"],
            "fundamento_normativo": APOC_FUNDAMENTO,
            "fundamento_origem": "transcrito_de_imagem",
            "observacao": "transcrito de imagem (P-4, conferencia §4.1); a soma 80 x CH 79 e "
                          "divergencia INTERNA do PDF (TEMPO RESERVA 1 HORA) — esta disciplina e "
                          "excluida NOMINALMENTE da assercao de soma",
            "motivo_da_exclusao": "",
        })

    # -- as exclusoes declaradas ---------------------------------------------------
    for curso, nome, motivo in EXCLUSOES:
        alvo = parear(nome, "", banco.get(curso, []))
        if alvo is None:
            print(f"[NAO CONFERIDA] exclusao declarada nao existe no banco: {curso} · {nome}")
            return 1
        # ⚠️ A linha excluida carrega o `disciplinas.codigo` do banco, e nao so o nome. A
        #    migration precisa de uma chave que nao se repita: `EFEITOS ATMOSFERICOS SOBRE A
        #    PROPAGACAO ELETROMAGNETICA / C-Exp-METOC-OF` existe com esse MESMO nome nos DOIS
        #    cursos METOC (medido: `89 - C-Exp-MetocOf - IV` e `89 - C-Exp-Metoc-OF-SP - IV`), e
        #    so a copia do SP e excluida — no presencial a disciplina e legitima e recebe 5 UEs.
        #    Casar por nome marcaria a errada, ou as duas.
        linhas.append({
            "arquivo": "", "curso_codigo": curso, "curriculo_ordinal": "",
            "curriculo_disciplina": alvo["nome"], "curriculo_ch_horas": "", "numero_ue": "",
            "topico": "", "ue_ch_horas": "", "destino_disciplina_codigo": alvo["codigo"],
            "fundamento_normativo": "", "fundamento_origem": "",
            "observacao": "sem_unidades_ensino = true", "motivo_da_exclusao": motivo,
        })
    for curso in CURSOS_POR_COMPETENCIAS:
        for d in banco.get(curso, []):
            linhas.append({
                "arquivo": "", "curso_codigo": curso, "curriculo_ordinal": d["cod_disciplina"],
                "curriculo_disciplina": d["nome"], "curriculo_ch_horas": "", "numero_ue": "",
                "topico": "", "ue_ch_horas": "", "destino_disciplina_codigo": d["codigo"],
                "fundamento_normativo": "", "fundamento_origem": "",
                "observacao": "curriculo_modelo = 'competencias'",
                "motivo_da_exclusao": "Curso por COMPETENCIAS: nenhuma `LISTA DE UNIDADES DE "
                                      "ENSINO` em 127 + 146 paginas (conferencia §4.4). O curso "
                                      "inteiro muda de modelo; nao e ausencia de dado.",
            })

    colunas = list(linhas[0].keys())
    with SAIDA.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=colunas, delimiter=";")
        w.writeheader()
        w.writerows(linhas)

    com_ue = [l for l in linhas if l["numero_ue"] != ""]
    excluidas = [l for l in linhas if l["motivo_da_exclusao"] != ""]
    print(f"{SAIDA.relative_to(RAIZ)}")
    print(f"  UEs com destino ........ {len(com_ue)}")
    print(f"  disciplinas de destino . {len({l['destino_disciplina_codigo'] for l in com_ue})}")
    print(f"  exclusoes declaradas ... {len(excluidas)}")
    for curso in sorted({str(l["curso_codigo"]) for l in com_ue}):
        n = sum(1 for l in com_ue if l["curso_codigo"] == curso)
        print(f"     {curso:24} {n:4} UEs")
    if nao_pareadas:
        print(f"\nX {len(nao_pareadas)} nao pareadas — o arquivo NAO esta pronto:")
        for x in nao_pareadas:
            print(f"    {x}")
        return 1
    print("\nNada ficou sem destino. O arquivo vai para revisao humana antes da carga.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
