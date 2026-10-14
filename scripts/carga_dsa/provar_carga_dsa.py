"""Prova que a leitura monta os blocos certos e que as recusas da carga do DSA PEGAM.

O QUE  : monta uma planilha SINTETICA do modelo (nomes ficticios), le, e confere bloco a bloco;
         depois arma um retrato de banco em memoria e confere cada recusa pelo caso que a
         discrimina — o instrutor homonimo em outro posto, o vinculo inativo, a UE que falta,
         o 7º TA de TFM.

PARA QUE: validacao que nunca foi vista recusando nao e validacao. Esta carga escreve fora da
         Server Action, entao o que ela nao recusar ninguem recusa: o banco, medido em
         05/10/2026, aceita instrutor nao habilitado.

COMO   : `python -m scripts.carga_dsa.provar_carga_dsa` — saida 0 = todas as provas passam.
         ⚠️ Nao toca em banco nenhum e nao le planilha real.
"""

from __future__ import annotations

import sys
import tempfile
from datetime import date, datetime
from pathlib import Path

import openpyxl

from scripts.carga_dsa import planilha, plano, sincronizar
from scripts.carga_dsa.resolver import resolver

FALHAS: list[str] = []


def conferir(nome: str, condicao: bool, detalhe: object = "") -> None:
    print(f"  {'ok ' if condicao else 'FALHOU'}  {nome}" + (f" — {detalhe}" if not condicao else ""))
    if not condicao:
        FALHAS.append(nome)


def planilha_sintetica(pasta: Path) -> Path:
    livro = openpyxl.Workbook()
    catalogo = livro.active
    catalogo.title = planilha.ABA_CATALOGO
    catalogo.append([None])
    catalogo.append(["CÓD", "DISCIPLINA", "Nº UE", "CONCATENADO", "UNIDADES DE ENSINO E TÓPICOS", "CH", "LOCAL", "T/E", "INSTRUTOR/PROFESSOR"])
    for linha in (
        ["I", "DISCIPLINA UM", 1.0, "I1", "1 – TOPICO DA PLANILHA", 3.0, "SALA 2", "EO", "CC (T) FULANO SILVA"],
        ["I", "DISCIPLINA UM", "PE1", "IPE1", "PROVA", 2.0, "SALA 2", "PM", "CC (T) FULANO SILVA"],
        ["I", "DISCIPLINA UM", "VP", "IVP", "VISTA", 1.0, "SALA 2", "EO", "CC (T) FULANO SILVA"],
        ["I", "DISCIPLINA UM", 9.0, "I9", "9 – UE QUE O BANCO NAO TEM", 1.0, "SALA 2", "EO", "CC (T) FULANO SILVA"],
        ["T", "TFM", 1.0, "T1", "1 – CORRIDA", 7.0, "SALA 2", "EO", "CC (T) FULANO SILVA"],
        ["AD", "ADMINISTRAÇÃO", 4.0, "AD4", "ESTUDO INDIVIDUAL", None, "LAB INFO", "EO", None],
        ["LP", "LICENÇA", 1.0, "LP1", "LICENÇA DE PAGAMENTO", 7.0, "--", "--", "--"],
        ["I", "REPETIDA", 1.0, "I1", "CHAVE REPETIDA — O PROCV NAO ENXERGA", 99.0, "X", "EO", "X"],
    ):
        catalogo.append(linha)

    folha = livro.create_sheet(planilha.ABA_PREENCHIMENTO)
    folha["A1"], folha["B1"] = "SIGLA DO CURSO:", "C-Exp-QUALQUER"
    folha["A2"], folha["B2"] = "Nº DE ALUNOS:", 6
    folha["B3"], folha["C3"], folha["D3"], folha["E3"] = "DATA", "TA", "LP", 1  # digitado no CABECALHO: nao e TA
    dias = {
        date(2026, 3, 2): {1: ("I", 1.0), 2: ("I", 1.0), 3: ("I", "PE1"), 4: ("I", "PE1"), 6: ("I", 1.0), 8: ("AD", 4.0)},
        date(2026, 3, 3): {n: ("T", 1.0) for n in range(1, 8)},
        date(2026, 3, 4): {1: ("I", "VP"), 2: ("I", 9.0)},
        date(2026, 3, 5): {n: ("LP", 1.0) for n in range(1, 8)},
    }
    r = 4
    for dia, tas in dias.items():
        for n in range(1, 10):
            folha.cell(r, 3, f"{n}º")
            if n == 3:
                folha.cell(r, 2, datetime(dia.year, dia.month, dia.day))
            if n in tas:
                folha.cell(r, 4, tas[n][0])
                folha.cell(r, 5, tas[n][1])
            r += 1
    controle = livro.create_sheet(planilha.ABA_CONTROLE)
    controle.append(["CÓD.", "DISCIPLINA", "CH. PREVISTA", "CH. CUMPRIDA"])
    controle.append(["I", "DISCIPLINA UM", 10.0, 7])  # 3 de aula + 1 na UE 9 + 2 de prova + 1 de vista
    controle.append(["T", "TFM", 40.0, 7])
    caminho = pasta / "sintetica.xlsx"
    livro.save(caminho)
    return caminho


def planilha_da_leva_1(pasta: Path) -> Path:
    """Spec 014 (T107): licenca SO DESTA turma, Monitoria, Recepcao, palestra com responsavel que nao casa,
    e aula no mesmo dia da licenca. Nomes ficticios."""
    livro = openpyxl.Workbook()
    catalogo = livro.active
    catalogo.title = planilha.ABA_CATALOGO
    catalogo.append([None])
    catalogo.append(["CÓD", "DISCIPLINA", "Nº UE", "CONCATENADO", "UNIDADES DE ENSINO E TÓPICOS", "CH", "LOCAL", "T/E", "INSTRUTOR/PROFESSOR"])
    for linha in (
        ["I", "DISCIPLINA UM", 1.0, "I1", "1 – TOPICO DA PLANILHA", 3.0, "SALA 2", "EO", "CC (T) FULANO SILVA"],
        ["LA", "LICENÇA", 1.0, "LA1", "LICENÇA ADMINISTRATIVA DA TURMA", None, "--", "--", "--"],
        ["MO", "MONITORIA", 1.0, "MO1", "MONITORIA DE MATEMÁTICA", None, "SALA 2", "--", "CC (T) FULANO SILVA"],
        ["RE", "RECEPÇÃO", 1.0, "RE1", "RECEPÇÃO AOS ALUNOS", None, "SALA 2", "--", "CC (T) FULANO SILVA"],
        ["PA", "PALESTRA", 1.0, "PA1", "PALESTRA DE SEGURANÇA", None, "SALA 2", "--", "SR. CICRANO DE FORA"],
    ):
        catalogo.append(linha)
    folha = livro.create_sheet(planilha.ABA_PREENCHIMENTO)
    folha["A1"], folha["B1"] = "SIGLA DO CURSO:", "C-Exp-QUALQUER"
    folha["A2"], folha["B2"] = "Nº DE ALUNOS:", 6
    dias = {
        date(2026, 3, 9): {1: ("LA", 1.0), 2: ("LA", 1.0), 3: ("LA", 1.0), 4: ("LA", 1.0), 6: ("I", 1.0)},
        date(2026, 3, 10): {1: ("MO", 1.0), 2: ("RE", 1.0), 3: ("PA", 1.0), 4: ("I", 1.0), 5: ("I", 1.0)},
    }
    r = 4
    for dia, tas in dias.items():
        for n in range(1, 10):
            folha.cell(r, 3, f"{n}º")
            if n == 3:
                folha.cell(r, 2, datetime(dia.year, dia.month, dia.day))
            if n in tas:
                folha.cell(r, 4, tas[n][0])
                folha.cell(r, 5, tas[n][1])
            r += 1
    controle = livro.create_sheet(planilha.ABA_CONTROLE)
    controle.append(["CÓD.", "DISCIPLINA", "CH. PREVISTA", "CH. CUMPRIDA"])
    controle.append(["I", "DISCIPLINA UM", 12.0, 3])  # o curriculo diz 10: erro de planilha, sem mudar o catalogo
    caminho = pasta / "leva1.xlsx"
    livro.save(caminho)
    return caminho


def planilha_da_leva_2(pasta: Path) -> Path:
    """Spec 014, PR 6 (T223): duas provas mistas e uma de recuperacao, a vista da PM 1 em DUAS sessoes, o fiscal e o
    2º instrutor. Nomes ficticios."""
    livro = openpyxl.Workbook()
    catalogo = livro.active
    catalogo.title = planilha.ABA_CATALOGO
    catalogo.append([None])
    catalogo.append(["CÓD", "DISCIPLINA", "Nº UE", "CONCATENADO", "UNIDADES DE ENSINO E TÓPICOS", "CH", "LOCAL", "T/E", "INSTRUTOR/PROFESSOR"])
    for linha in (
        ["I", "DISCIPLINA UM", 1.0, "I1", "1 – TOPICO DA PLANILHA", 3.0, "SALA 2", "EO", "CC (T) FULANO SILVA"],
        ["I", "DISCIPLINA UM", "PM1", "IPM1", "PROVA MISTA 1", 3.0, "SALA 2", "PM", "CC (T) FULANO SILVA / SR. AUXILIAR DE FORA"],
        ["I", "DISCIPLINA UM", "PM2", "IPM2", "PROVA MISTA 2", 2.0, "SALA 2", "PM", "CC (T) FULANO SILVA (FISCAL)"],
        ["I", "DISCIPLINA UM", "RECON", "IRECON", "PROVA DE RECUPERACAO", 1.0, "SALA 2", "PM", "CC (T) FULANO SILVA"],
        ["I", "DISCIPLINA UM", "VP1", "IVP1", "VISTA DA PROVA", 1.0, "SALA 2", "EO", "CC (T) FULANO SILVA"],
    ):
        catalogo.append(linha)
    folha = livro.create_sheet(planilha.ABA_PREENCHIMENTO)
    folha["A1"], folha["B1"] = "SIGLA DO CURSO:", "C-Exp-QUALQUER"
    folha["A2"], folha["B2"] = "Nº DE ALUNOS:", 6
    dias = {
        date(2026, 4, 6): {1: ("I", 1.0), 2: ("I", 1.0), 3: ("I", 1.0), 4: ("I", "PM1"), 5: ("I", "PM1"), 6: ("I", "PM1")},
        date(2026, 4, 7): {1: ("I", "VP1")},
        date(2026, 4, 8): {1: ("I", "VP1"), 3: ("I", "PM2"), 4: ("I", "PM2")},
        date(2026, 4, 9): {1: ("I", "RECON")},
    }
    r = 4
    for dia, tas in dias.items():
        for n in range(1, 10):
            folha.cell(r, 3, f"{n}º")
            if n == 3:
                folha.cell(r, 2, datetime(dia.year, dia.month, dia.day))
            if n in tas:
                folha.cell(r, 4, tas[n][0])
                folha.cell(r, 5, tas[n][1])
            r += 1
    controle = livro.create_sheet(planilha.ABA_CONTROLE)
    controle.append(["CÓD.", "DISCIPLINA", "CH. PREVISTA", "CH. CUMPRIDA"])
    controle.append(["I", "DISCIPLINA UM", 10.0, 11])  # 3 de aula + 3 PM1 + 2 vistas + 2 PM2 + 1 RECON
    caminho = pasta / "leva2.xlsx"
    livro.save(caminho)
    return caminho


ITENS_DA_LEVA_2 = [
    {"id": "av-1", "disciplina_id": "d-1", "numero": 1, "instrumento": "PM", "instrumento_nome": "Prova Mista",
     "ta_aplicacao": 2, "origem_ta_aplicacao": "curriculo", "ta_vista": 1, "origem_ta_vista": "curriculo"},
    {"id": "av-2", "disciplina_id": "d-1", "numero": 2, "instrumento": "PM", "instrumento_nome": "Prova Mista",
     "ta_aplicacao": None, "origem_ta_aplicacao": None, "ta_vista": None, "origem_ta_vista": None},
]


def retrato(habilitado: str = "ativo") -> dict:
    """O banco em memoria. Dois «FULANO SILVA» em postos diferentes: o caso que discrimina."""
    return {
        "turma": {"id": "t-1", "codigo": "TURMA SINTETICA 2026", "curso_id": "c-1", "curso": "C-Exp-QUALQUER"},
        "autor": {"codigo": "USR-X", "auth_user_id": "a-1", "status": "ativo"},
        "disciplinas": [
            {"id": "d-1", "cod": "I", "nome": "DISCIPLINA UM", "ch": 10},
            {"id": "d-t", "cod": "T", "nome": "Treinamento Físico Militar", "ch": 40},
        ],
        "ues": [
            {"id": "u-1", "codigo": "UE-1", "disciplina_id": "d-1", "numero": 1, "topico": "TOPICO DO CATALOGO DO BANCO", "ch": 3},
            {"id": "u-t", "codigo": "UE-T", "disciplina_id": "d-t", "numero": 1, "topico": "CORRIDA", "ch": 40},
        ],
        "instrutores": [
            {"id": "i-cc", "codigo": "1", "posto": "CC", "esp": "(T)", "nome": "FULANO DE TAL SILVA SOUZA", "guerra": None},
            {"id": "i-sg", "codigo": "2", "posto": "3ºSG", "esp": "-GC", "nome": "FULANO SILVA PEREIRA", "guerra": None},
        ],
        "habilitacoes": [
            {"instrutor_id": "i-cc", "disciplina_id": "d-1", "status": habilitado},
            {"instrutor_id": "i-cc", "disciplina_id": "d-t", "status": "ativo"},
        ],
        "metodologias": [{"valor": "Exposição Oral", "sigla": "EO"}, {"valor": "Prova Mista", "sigla": "PM"}],
        "tipos_atividade": [{"valor": "Estudo Individual", "categoria": "Estudo_Individual"}],
        "tipos_avaliacao": ["Prova Escrita"],
        "salas": [],
        "tetos": {"dsa.teto_tfm_semana": "6", "dsa.teto_recomendado_semana": "25"},
        "feriados": [],
        "da_turma": [],
        "codigos": {"registros_aula": [], "avaliacoes": [], "atividades_nao_letivas": []},
        "de_outras_turmas": [],
    }


DECISOES = {
    "turma": "TURMA SINTETICA 2026",
    "locais": {"SALA 2": "Sala 02", "LAB INFO": "Laboratório de Informática"},
    "tipo_avaliacao": "Prova Escrita",
    "padrao_ue_de_avaliacao": "PE[0-9]+",
    "padrao_ue_de_vista": "VP",
    "chaves": {"AD+4": {"tipo": "estudo_individual"}, "LP+1": {"tipo": "calendario", "descricao": "Licença"}},
    "vistas": [{"disciplina": "I", "data": "2026-03-04", "da_prova_de": "2026-03-02"}],
}


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    with tempfile.TemporaryDirectory() as pasta:
        leitura = planilha.ler(planilha_sintetica(Path(pasta)))

    print("LEITURA")
    blocos = [(b.data.isoformat(), b.ta_inicial, b.tempos, b.cod, b.ue) for b in leitura.blocos]
    conferir("TA consecutivos com a mesma chave viram UM bloco", ("2026-03-02", 1, 2, "I", "1") in blocos, blocos)
    conferir("buraco no meio abre bloco novo", ("2026-03-02", 6, 1, "I", "1") in blocos, blocos)
    conferir("chave diferente abre bloco novo", ("2026-03-02", 3, 2, "I", "PE1") in blocos, blocos)
    conferir("o bloco guarda a LINHA em que comeca", leitura.blocos[0].linha == 4, leitura.blocos[0].linha)
    conferir("digitado no cabecalho NAO e TA e volta em `ignoradas`",
             [(c.celula, c.valor) for c in leitura.ignoradas] == [("D3", "LP"), ("E3", "1")], leitura.ignoradas)
    conferir("chave repetida no catalogo: vale a primeira, como no PROCV",
             leitura.catalogo[("I", "1")].ch == 3 and len(leitura.duplicadas) == 1, leitura.duplicadas)

    print("INSTRUTOR — posto + nome de guerra, nunca pedaco do nome")
    lido = plano.ler_instrutor("CC (T) FULANO SILVA (FISCAL)")
    achados = plano.casar_instrutor(lido, retrato()["instrutores"])
    conferir("dois «FULANO SILVA»: o posto decide, e casa exatamente um", [a["codigo"] for a in achados] == ["1"], achados)
    sem_posto = [i for i in retrato()["instrutores"] if all(p in plano.normalizar(i["nome"]).split() for p in lido.guerra.split())]
    conferir("controle: SEM o posto os dois casariam (o teste discrimina)", len(sem_posto) == 2, sem_posto)
    conferir("«SO-ME (RM1) BELTRANO» → posto SO, especialidade ME RM1",
             (plano.ler_instrutor("SO-ME (RM1) BELTRANO").posto, plano.ler_instrutor("SO-ME (RM1) BELTRANO").especialidade) == ("SO", "ME RM1"))

    print("RN-INST-01 — habilitacao")
    conferir("ministrar sem vinculo: recusa", not plano.pode_atuar("ministrar", "i-sg", "d-1", retrato()["habilitacoes"]))
    conferir("ministrar com vinculo INATIVO: recusa", not plano.pode_atuar("ministrar", "i-cc", "d-1", retrato("inativo")["habilitacoes"]))
    conferir("avaliacao NAO exige habilitacao", plano.pode_atuar("avaliacao", "i-sg", "d-1", []))

    print("O PLANO")
    p = plano.montar(leitura, retrato(), DECISOES, "sintetica.xlsx", "2026-03-10")
    recusas = "\n".join(p.recusas)
    conferir("UE que o banco nao tem: recusa, e nao cria", "UE 9 da disciplina I NAO existe" in recusas, recusas)
    conferir("7 TA de TFM numa semana: recusa (RN-DIST-03)", "teto de TFM" in recusas, recusas)
    conferir("UE × CH do catalogo da planilha: a UE 9, que nao entrou, nao fecha — recusa",
             "UE I+9: lancado 0 TA" in recusas, recusas)
    conferir("disciplina × CONTROLE: I soma 6 no plano e a planilha conta 7 — recusa",
             "disciplina I: o plano soma 6 TA" in recusas, recusas)
    conferir("controle positivo: T fecha com a UE (7) e com o CONTROLE (7), e nao e acusada",
             "UE T+1" not in recusas and "disciplina T:" not in recusas, recusas)
    conferir("so essas quatro recusas", len(p.recusas) == 4, p.recusas)
    conferir("o titulo da prova vem da planilha", p.avaliacoes[0]["conteudo_resumo"] == "PROVA", p.avaliacoes[0])
    andamento = plano.montar(leitura, retrato(), {**DECISOES, "turma_em_andamento": True}, "s.xlsx", "2026-03-10")
    conferir("turma em andamento: UE abaixo da CH vira alerta, nao recusa",
             not any(r.startswith("UE I+9") for r in andamento.recusas) and any("UE I+9" in x for x in andamento.alertas))
    conferir("o topico gravado e o do BANCO, nunca o da planilha",
             {a["conteudo_resumo"] for a in p.aulas if a["disciplina"] == "I"} == {"TOPICO DO CATALOGO DO BANCO"})
    conferir("a vista vai na MESMA linha da avaliacao (RN-AVAL-02)",
             len(p.avaliacoes) == 1 and p.avaliacoes[0]["data_vista_prova"] == "2026-03-04", p.avaliacoes)
    conferir("dia de calendario NAO vira lancamento", [c["data"] for c in p.calendario] == ["2026-03-05"] and
             not any(a["data"] == "2026-03-05" for a in p.atividades))
    conferir("codigo deterministico, derivado da linha", p.aulas[0]["codigo"] == "DSAP-TURMA-SINTETICA-2026-L004-A", p.aulas[0]["codigo"])

    p_inativo = plano.montar(leitura, retrato("inativo"), DECISOES, "sintetica.xlsx", "2026-03-10")
    conferir("instrutor com vinculo inativo: as aulas dele sao recusadas",
             sum("nao esta habilitado" in r for r in p_inativo.recusas) == 2, p_inativo.recusas)

    seis = retrato()
    seis["tetos"]["dsa.teto_tfm_semana"] = "7"
    conferir("o teto vem do PARAMETRO: com 7 no banco, os mesmos 7 TA passam",
             not any("teto de TFM" in r for r in plano.montar(leitura, seis, DECISOES, "s.xlsx", "2026-03-10").recusas))

    print("A TRANSACAO")
    ensaio, gravar = plano.sql(p, DECISOES, ensaio=True), plano.sql(p, DECISOES, ensaio=False)
    conferir("o ensaio termina levantando a sentinela", plano.SENTINELA_DO_ENSAIO in ensaio and "raise exception" in ensaio)
    conferir("a gravacao NAO levanta a sentinela", plano.SENTINELA_DO_ENSAIO not in gravar)
    conferir("nenhuma linha nasce com procedencia de ETL (seria «herdada» na grade)", "origem_migracao_v1" not in gravar)
    conferir("toda insercao e idempotente pelo codigo", gravar.count("on conflict (codigo) do nothing") == 3, gravar.count("on conflict"))

    print("SPEC 014 — LEVA 1 (resolver da sincronizacao)")
    with tempfile.TemporaryDirectory() as pasta:
        leva1 = planilha.ler(planilha_da_leva_1(Path(pasta)))
    ref = retrato()
    ref["tipos_atividade"] = [
        {"valor": "Estudo Individual", "categoria": "Estudo_Individual"},
        {"valor": "Monitoria", "categoria": "Apoio_Individualizado"},
        {"valor": "Recepção aos alunos", "categoria": "TAD"},
        {"valor": "Palestra", "categoria": "AEC"},
    ]
    dec = {"turma": "TURMA SINTETICA 2026", "locais": {"SALA 2": "Sala 02"}, "chaves": {}}
    res = resolver(leva1, ref, dec, "leva1.xlsx", set(), False)
    conferir("FR-024 · licenca SO DESTA turma vira dia parado previsto, tipo LA, codigo …-P",
             [(d["data"], d["ta_inicial"], d["tempos"], d["tipo_parada"], d["prevista"], d["codigo"][-6:]) for d in res.dias_parados]
             == [("2026-03-09", 1, 4, "LA", True, "L004-P")], res.dias_parados)
    conferir("FR-024 · e NAO vira TAD (era o que inflava o TAD, D-AA-12)",
             not any(a["data"] == "2026-03-09" and a["categoria_normativa"] == "TAD" for a in res.atividades), res.atividades)
    conferir("FR-024 · dia GLOBAL continua calendario (feriados), nao dia parado",
             [c["data"] for c in resolver(leva1, ref, dec, "l.xlsx", {"2026-03-09"}, True).calendario] == ["2026-03-09"])
    cat = {a["subtipo"]: a["categoria_normativa"] for a in res.atividades}
    conferir("FR-021 · MONITORIA vira Apoio Individualizado", cat.get("Monitoria") == "Apoio_Individualizado", cat)
    conferir("FR-021 · RECEPCAO e TAD com o tipo «Recepção aos alunos»", cat.get("Recepção aos alunos") == "TAD", cat)
    conferir("FR-016 · responsavel que nao casa vira PENDENCIA do lote, e a palestra nao e gravada",
             any(pp.tipo == "responsavel_sem_decisao" and "CICRANO" in pp.detalhe for pp in res.pendencias)
             and "Palestra" not in cat, [pp.detalhe for pp in res.pendencias])
    provisorio = resolver(leva1, ref, dec, "l.xlsx", set(), True)
    conferir("A3.2 · a pendencia de responsavel trava SO A LINHA: nao bloqueia a turma, e a palestra fica fora ate no local",
             not any(a["subtipo"] == "Palestra" for a in provisorio.atividades)
             and any(pp.tipo == "responsavel_sem_decisao" and not pp.bloqueia for pp in provisorio.pendencias)
             and not any(pp.tipo == "responsavel_sem_decisao" and pp.bloqueia for pp in res.pendencias)
             and bool(res.aulas))
    aceito = resolver(leva1, ref, {**dec, "responsavel_externo_aceito": ["SR. CICRANO DE FORA"]}, "l.xlsx", set(), True)
    conferir("FR-016 · com a decisao no lote, entra como externo",
             any(a["responsavel_externo"] == "SR. CICRANO DE FORA" for a in aceito.atividades), aceito.atividades)
    conferir("§11-B · aula no dia que a planilha marca parado: erro de planilha, e a aula ENTRA",
             any("marca parado" in e["diverge"] for e in res.erros_tabelados)
             and any(a["data"] == "2026-03-09" for a in res.aulas), res.erros_tabelados)
    conferir("§11-B · CH da disciplina: planilha 12, curriculo 10 — erro de planilha",
             any(e["diverge"] == "CH da disciplina" and e["planilha"].startswith("12") and e["curriculo"].startswith("10")
                 for e in res.erros_tabelados), res.erros_tabelados)
    conferir("o plano e deterministico (duas resolucoes, a mesma impressao digital)",
             res.impressao_digital() == resolver(leva1, ref, dec, "leva1.xlsx", set(), False).impressao_digital())
    sql = sincronizar.sql_da_turma(res, True, "Nacional", ensaio=False)
    conferir("o dia parado e gravado em `dias_parados`, com `on conflict (codigo)`",
             "insert into public.dias_parados" in sql and sql.count("on conflict (codigo)") >= 2)
    conferir("a linha TAD antiga da mesma linha (…-N) sai com a marca de reclassificacao",
             sincronizar.MARCA_DE_RECLASSIFICACAO in sql and "L004-N" in sql)
    conferir("feriado pelo DEFAULT `FER-`, nunca `max + 1` (E-2)", "max(substring(codigo from '^FER-" not in sql)
    dif = sincronizar.diferencas(res, {"aulas": [], "avaliacoes": [], "atividades": [], "dias_parados": []})
    conferir("diferencas conhece `dias_parados`", bool(dif.get("dias_parados", {}).get("novas")), dif.get("dias_parados"))
    vazia = {c: None for c in sincronizar.CAMPOS["avaliacoes"]}
    falsa = type(res)(turma=res.turma, autor=res.autor, titulo="x")
    falsa.avaliacoes.append({**vazia, "codigo": "X"})
    conferir("FR-049 · `cancelada_na_tela` nao conta como reativada (zero mudanca na 2ª rodada)",
             not sincronizar.diferencas(falsa, {"aulas": [], "avaliacoes": [{**vazia, "codigo": "X", "status": "cancelada_na_tela"}],
                                                "atividades": [], "dias_parados": []})["avaliacoes"]["reativadas"])
    conferir("controle: a cancelada pela CARGA (inativo) volta como reativada",
             sincronizar.diferencas(falsa, {"aulas": [], "avaliacoes": [{**vazia, "codigo": "X", "status": "inativo"}],
                                            "atividades": [], "dias_parados": []})["avaliacoes"]["reativadas"] == ["X"])

    print("A SISTEMA VENCE (A3.3 virada por turma, A3.4 edicao da tela vence)")
    vazio_aula = {c: None for c in sincronizar.CAMPOS["aulas"]}

    def plano_de(*aulas):
        r = type(res)(turma=res.turma, autor=res.autor, titulo="x")
        r.aulas.extend({**vazio_aula, "observacoes": "", "unidade_ensino_id": None, "disciplina_id": None, "instrutor_id": None, **a} for a in aulas)
        return r

    def ref_com(*atuais, de_tela=()):
        return {"atuais": {"aulas": [{**vazio_aula, "status": "ativo", "na_tela": False, **a} for a in atuais],
                           "avaliacoes": [], "atividades": [], "dias_parados": []},
                "de_tela_linhas": list(de_tela)}

    r = plano_de({"codigo": "A", "data": "2026-10-09", "ta_inicial": 1, "tempos_consumidos": 2},
              {"codigo": "B", "data": "2026-10-13", "ta_inicial": 1, "tempos_consumidos": 2})
    rf = ref_com({"codigo": "C", "data": "2026-10-14", "ta_inicial": 3, "tempos_consumidos": 1})
    prot, _d = sincronizar.proteger(r, rf, "2026-10-13")
    conferir("A3.3 · a linha da planilha NA data da virada sai do plano; a de antes fica",
             [a["codigo"] for a in r.aulas] == ["A"], r.aulas)
    conferir("A3.3 · a linha do banco depois da virada fica protegida e nao «sai»",
             "C" in prot["aulas"] and sincronizar.diferencas(r, rf["atuais"], prot)["aulas"]["saem"] == [], prot)
    conferir("controle: SEM virada, a mesma linha do banco «sai»",
             sincronizar.diferencas(r, rf["atuais"])["aulas"]["saem"] == ["C"])
    sql = sincronizar.sql_da_turma(r, False, None, ensaio=False, virada="2026-10-13", protegidas=prot)
    conferir("A3.3 · o SQL so inativa ETL e linha que saiu ANTES da virada, e nunca a protegida",
             sql.count("< '2026-10-13'::date") >= 4 and "array['C']::text[]" in sql)

    r = plano_de({"codigo": "E", "data": "2026-10-05", "ta_inicial": 1, "tempos_consumidos": 5, "local": "Sala 01"})
    rf = ref_com({"codigo": "E", "data": "2026-10-05", "ta_inicial": 1, "tempos_consumidos": 4, "local": "EAD", "na_tela": True})
    prot, div = sincronizar.proteger(r, rf, None)
    conferir("A3.4 · a linha editada na tela sai do plano (nao e desfeita) e vai para «planilha diverge do sistema»",
             r.aulas == [] and "E" in prot["aulas"] and len(div) == 1 and "tempos_consumidos" in div[0]["campos"], div)
    dif = sincronizar.diferencas(r, rf["atuais"], prot)["aulas"]
    conferir("A3.4 · e a rodada da zero mudanca sobre ela", not any(dif.values()), dif)
    r = plano_de({"codigo": "E", "data": "2026-10-05", "ta_inicial": 1, "tempos_consumidos": 5, "local": "Sala 01"})
    rf2 = ref_com({"codigo": "E", "data": "2026-10-05", "ta_inicial": 1, "tempos_consumidos": 4, "local": "EAD", "na_tela": False})
    sincronizar.proteger(r, rf2, None)
    conferir("controle: a MESMA linha sem edicao da tela e atualizada pela planilha",
             sincronizar.diferencas(r, rf2["atuais"])["aulas"]["mudadas"] != [])

    r = plano_de({"codigo": "F", "data": "2026-10-06", "ta_inicial": 3, "tempos_consumidos": 2},
              {"codigo": "G", "data": "2026-10-06", "ta_inicial": 5, "tempos_consumidos": 2})
    prot, div = sincronizar.proteger(r, ref_com(de_tela=[{"tabela": "aulas", "codigo": "DSA-X", "data": "2026-10-06", "ta_inicial": 4, "tempos": 1}]), None)
    conferir("A3.4 · o lancamento NASCIDO na tela fica; a linha da planilha no mesmo tempo sai e e listada, a vizinha entra",
             [a["codigo"] for a in r.aulas] == ["G"] and div and "DSA-X" in div[0]["motivo"], (r.aulas, div))

    r = plano_de()
    r.pendentes = {"P-N"}
    vazio_ativ = {c: None for c in sincronizar.CAMPOS["atividades"]}
    rf = {"atuais": {"aulas": [], "avaliacoes": [], "dias_parados": [],
                     "atividades": [{**vazio_ativ, "codigo": "P-N", "data": "2026-10-05", "status": "ativo", "na_tela": False},
                                    {**vazio_ativ, "codigo": "Q-N", "data": "2026-10-05", "status": "ativo", "na_tela": False}]},
          "de_tela_linhas": []}
    prot, _d = sincronizar.proteger(r, rf, None)
    conferir("A3.2 · a linha que ficou fora por pendencia de responsavel e JA esta no banco nao «sai»; a que saiu da planilha sai",
             sincronizar.diferencas(r, rf["atuais"], prot)["atividades"]["saem"] == ["Q-N"], prot)

    conferir("A3.2 · proposta de classificacao do responsavel (entidade · pessoa · palestrante)",
             sincronizar.classificar_responsavel("CIAARA-10", set()) == "entidade"
             and sincronizar.classificar_responsavel("1ºTEN FULANO", {"FULANO"}).startswith("pessoa cadastrada")
             and sincronizar.classificar_responsavel("SR. CICRANO DE FORA", set()) == "palestrante externo")

    print("SPEC 014 — LEVA 2 (o item, as sessoes, os papeis e as sugestoes)")
    with tempfile.TemporaryDirectory() as pasta:
        leva2 = planilha.ler(planilha_da_leva_2(Path(pasta)))
    ref2 = retrato()
    ref2["tipos_avaliacao"] = ["Prova Escrita", "Prova Mista"]
    ref2["itens_curriculo"] = ITENS_DA_LEVA_2
    ref2["ajustes"] = []
    dec2 = {"turma": "TURMA SINTETICA 2026", "locais": {"SALA 2": "Sala 02"}, "chaves": {},
            "padrao_ue_de_avaliacao": "PM[0-9]+|RECON", "padrao_ue_de_vista": "VP[0-9]*",
            "tipo_avaliacao_por_tecnica": {"PM": "Prova Mista"}, "vista_extra_como_aec": True}
    res2 = resolver(leva2, ref2, dec2, "leva2.xlsx", set(), True)
    prova = {a["chave_ue"]: a for a in res2.avaliacoes}
    conferir("FR-039 · a PM 1 da planilha aponta o item do curriculo (instrumento e numero)",
             prova.get("PM1", {}).get("avaliacao_curriculo_id") == "av-1", res2.avaliacoes)
    conferir("FR-039 · a PM 2 aponta o item 2", prova.get("PM2", {}).get("avaliacao_curriculo_id") == "av-2")
    conferir("FR-036.1 · TA da PM 1 (3) diferente do curriculo (2): erro de planilha, e a prova entra com o da planilha",
             any("TA de prova diferente" in e and "PM 1" in e for e in res2.erros_de_planilha)
             and prova["PM1"]["tempos_consumidos"] == 3, res2.erros_de_planilha)
    conferir("FR-036.1 · a linha RECON entra SEM item e vai para a lista",
             prova.get("RECON", {}).get("avaliacao_curriculo_id") is None
             and any("RECON" in e for e in res2.erros_de_planilha), res2.erros_de_planilha)
    sessoes = prova["PM1"]["sessoes"]
    conferir("FR-042 · a vista da PM 1 em DUAS sessoes, numeradas 1 e 2, cada uma no seu dia",
             [(v["numero"], v["data"]) for v in sessoes] == [(1, "2026-04-07"), (2, "2026-04-08")], sessoes)
    conferir("FR-042 · e nenhuma AEC «vista_extra_como_aec» (a chave fica sem efeito)",
             not any("VISTA DE PROVA" in (a.get("descricao") or "") for a in res2.atividades), res2.atividades)
    conferir("T226 · as colunas de vista unica ficam NULAS (a vista e sessao)",
             all(a["data_vista_prova"] is None for a in res2.avaliacoes))
    conferir("FR-045 · «(FISCAL)» preenche o fiscal, e o fiscal nao vira o aplicador",
             prova["PM2"]["fiscal"] == "1" and prova["PM2"]["instrutor"] != "1", prova["PM2"])
    conferir("FR-046 · «A / B» guarda o 2º como veio quando nao casa com o cadastro",
             prova["PM1"]["outros_instrutores"] == ["SR. AUXILIAR DE FORA"], prova["PM1"]["outros_instrutores"])
    conferir("FR-031.8 · o curriculo mudo sobre a PM 2: o tempo da planilha vira SUGESTAO para a turma",
             [(g["avaliacao_curriculo_id"], g["ta_aplicacao"]) for g in res2.sugestoes] == [("av-2", 2)], res2.sugestoes)
    confirmado = {**ref2, "ajustes": [{"avaliacao_curriculo_id": "av-2", "origem": "arbitrado", "confirmado": True, "status": "ativo"}]}
    conferir("FR-031.8 · com o arbitrado confirmado, nenhuma sugestao (a confirmada nao e tocada)",
             resolver(leva2, confirmado, dec2, "l.xlsx", set(), True).sugestoes == [])
    sql2 = sincronizar.sql_da_turma(res2, False, None, ensaio=False)
    conferir("T226 · o SQL grava as sessoes em `vistas_de_avaliacao`, por codigo, e as sugestoes no ajuste da turma",
             "insert into public.vistas_de_avaliacao" in sql2 and "'sugestao_planilha'" in sql2 and "-S'" in sql2)
    atuais = {"aulas": [], "atividades": [], "dias_parados": [],
              "avaliacoes": [{**a, "instrutor": a["instrutor"], "status": "ativo", "na_tela": False} for a in res2.avaliacoes]}
    dif2 = sincronizar.diferencas(res2, atuais)["avaliacoes"]
    conferir("duas rodadas: o mesmo plano sobre o que ja esta no banco da ZERO mudanca", not any(dif2.values()), dif2)
    outra = [{**a, "sessoes": a["sessoes"][:1]} if a["chave_ue"] == "PM1" else a for a in atuais["avaliacoes"]]
    conferir("controle: faltando a sessao 2 no banco, a PM 1 muda (o teste discrimina)",
             sincronizar.diferencas(res2, {**atuais, "avaliacoes": outra})["avaliacoes"]["mudadas"] != [])

    print(f"\n{'TODAS AS PROVAS PASSARAM' if not FALHAS else f'{len(FALHAS)} PROVA(S) FALHARAM'}")
    return 1 if FALHAS else 0


if __name__ == "__main__":
    raise SystemExit(main())
