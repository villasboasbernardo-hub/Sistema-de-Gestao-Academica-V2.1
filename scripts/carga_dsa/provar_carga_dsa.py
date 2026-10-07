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

from scripts.carga_dsa import planilha, plano

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

    print(f"\n{'TODAS AS PROVAS PASSARAM' if not FALHAS else f'{len(FALHAS)} PROVA(S) FALHARAM'}")
    return 1 if FALHAS else 0


if __name__ == "__main__":
    raise SystemExit(main())
