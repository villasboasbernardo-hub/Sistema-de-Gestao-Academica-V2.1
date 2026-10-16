"""A4.7 da spec 014 (PEND-014-6) — os 90 itens de avaliação do currículo que ficaram FORA da D-4.

Dois passos, e só o primeiro roda sem a palavra de Bernardo Villas Boas:

    # 1. a planilha de decisão (fora do git), uma linha por item, com a recomendação e a proposta já preenchidas
    python -X utf8 -m scripts.etl.decisao_a47 planilha --saida <pasta-da-rodada>/a47-decisao.xlsx

    # 2. com a planilha PREENCHIDA (coluna «decisão»), a migration de dado e o antes/depois — NÃO aplica nada
    python -X utf8 -m scripts.etl.decisao_a47 migration --planilha <...>/a47-decisao.xlsx \
        --sql supabase/migrations/<ts>_avaliacoes_do_curriculo_a47.sql --antes-depois <...>/a47-antes-depois.md

Decisão por linha: «aceito» (vale a proposta), «recuso» (o item não entra) ou «corrijo» (vale a proposta com o que
«valor corrigido» trouxer, no formato `instrumento=TG; aplicacao=3; vista=1; ue=2; destino=<código>; carregar=nao`).
Linha sem decisão faz o passo 2 PARAR, salvo `--parcial` (que a deixa de fora e diz quantas) ou
`--em-branco-aceito 1-26` (decisão de Bernardo Villas Boas, 16/10/2026: *"as linhas 1 a 26, em branco, valem como
'aceito' da proposta"*) — só a faixa NOMEADA vale «aceito»; linha em branco fora dela continua fazendo PARAR.

⚠️ A máquina não decide: a proposta é a recomendação de `medicoes/d4-fora-recomendacoes.md` escrita em colunas, e só
   entra o que Bernardo marcar. O arquivo SQL gerado NUNCA é editado à mão — rodar de novo dá o mesmo arquivo.
⚠️ A migration segue a forma da D-4 (`gerar_carga_de_avaliacoes_curriculo`): abstém-se em base sem cursos,
   idempotente pelo índice `avc_numero_unico`, procedência `spec014-A47:`, asserção da quantidade e evento em
   `migracao_log` só quando grava. Ela só ACRESCENTA itens: nenhuma CH, nome ou código de disciplina muda (D-CUR-1).
"""

from __future__ import annotations

import argparse
import csv
import re
import subprocess
import sys
from collections import OrderedDict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CSV = RAIZ / "scripts" / "etl" / "dados" / "avaliacoes_curriculo.csv"
RECOMENDACOES = RAIZ / "specs" / "014-atividades-e-avaliacoes" / "medicoes" / "d4-fora-recomendacoes.md"
CONTAINER = "supabase_db_ciaara-11-v2-1"

# data-model §3.2 (o mesmo de `gerar_carga_de_avaliacoes_curriculo`), mais a PT que a recomendação propõe acrescentar.
INSTRUMENTOS = {
    "PE": ("Prova Escrita", "prova"),
    "PM": ("Prova Mista", "prova"),
    "PP": ("Prova Prática", "prova"),
    "PO": ("Prova Oral", "prova"),
    "PD": ("Prova Discursiva", "prova"),
    "TG": ("Trabalho em Grupo", "trabalho"),
    "TI": ("Trabalho Individual", "trabalho"),
    "EC": ("Estudo de caso", "trabalho"),
    "PJ": ("Projeto", "trabalho"),
    "MN": ("Monografia", "trabalho"),
    "OD": ("Observação de Desempenho", "od"),
}
NOVOS = {"PT": ("Prova eletrônica", "prova")}
DECISOES = ("aceito", "recuso", "corrijo")
# A marca da D-9 (`20261016092315`) vale para TODO instrumento da lista (pgTAP 132): o novo nasce com ela. Vista
# obrigatória só em PM, PO e PE (decisão de Bernardo Villas Boas, 16/10/2026) — a PT não está entre eles.
VISTA_OBRIGATORIA = {"PM", "PO", "PE"}

COLUNAS = [
    ("chave", "Chave (não editar)", 26),
    ("n", "#", 5),
    ("curso", "Curso", 18),
    ("disciplina", "Disciplina (PDF)", 40),
    ("instrumento_pdf", "Instrumento (PDF)", 12),
    ("numero", "Nº", 5),
    ("ta_aplicacao_pdf", "TA aplicação (PDF)", 10),
    ("ta_vista_pdf", "TA vista (PDF)", 9),
    ("ue_pdf", "UE (PDF)", 8),
    ("pagina", "Página do PDF", 40),
    ("por_que", "Por que ficou fora", 50),
    ("recomendacao", "Recomendação", 60),
    ("p_carregar", "Proposta: carregar?", 10),
    ("p_destino", "Proposta: disciplina no sistema", 34),
    ("p_instrumento", "Proposta: instrumento", 11),
    ("p_aplicacao", "Proposta: TA aplicação (sugerido)", 12),
    ("p_vista", "Proposta: TA vista (sugerido)", 11),
    ("p_ue", "Proposta: UE", 8),
    ("decisao", "decisão (aceito / recuso / corrijo)", 14),
    ("valor_corrigido", "valor corrigido", 40),
    ("observacao", "observação", 30),
]


def fora_da_d4(l: dict[str, str]) -> bool:
    """O complemento EXATO do filtro de `gerar_carga_de_avaliacoes_curriculo` (o que entrou na D-4)."""
    entra = ("conferir" not in (l.get("conferido") or "") and l.get("destino_disciplina_codigo")
             and l["instrumento"] in INSTRUMENTOS and l["fonte_arquivo"] and l["fonte_pagina"].isdigit())
    return not entra


def recomendacoes() -> list[dict[str, str]]:
    linhas = []
    for l in RECOMENDACOES.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\| (\d+) \|", l)
        if not m:
            continue
        c = [x.strip() for x in l.strip().strip("|").split(" | ")]
        linhas.append({"n": c[0], "curso": c[1], "destino": c[3].strip("`"), "pagina": c[7], "por_que": c[8],
                       "recomendacao": c[9]})
    return linhas


def total_do_conjunto(trecho: str) -> int | None:
    m = re.search(r"(\d+)\s*\([^)]*\)\s*TA", trecho)
    return int(m.group(1)) if m else None


def proposta(l: dict[str, str], rec: str, irmaos: list[dict[str, str]]) -> dict[str, object]:
    """A recomendação escrita em colunas. Só lê o que a linha e a recomendação dizem; nada é inferido além delas."""
    p: dict[str, object] = {
        "carregar": "sim",
        "destino": l["destino_disciplina_codigo"] or "",
        "instrumento": l["instrumento"],
        "aplicacao": int(l["ta_aplicacao"]) if l["ta_aplicacao"].isdigit() else None,
        "vista": int(l["ta_vista"]) if l["ta_vista"].isdigit() else None,
        "ue": int(l["ue_computada"]) if l["ue_computada"].isdigit() else None,
    }
    if "carregar como **TG**" in rec:
        p["instrumento"] = "TG"
    if "PT — Prova eletrônica" in rec:
        p["instrumento"] = "PT"
    if "nível da disciplina (sem UE)" in rec:
        p["ue"] = None
    if "vista de 1 TA" in rec or ("comum às provas" in l["conferido"] and p["vista"] is None):
        # a alínea comum vale para TODAS as provas da disciplina (a PT inclusive), não só para a linha que a cita
        p["vista"] = 1
    if "SEM tempo" in rec:
        p["aplicacao"] = None
        p["vista"] = None
    if "vista como **não definida**" in rec:
        p["vista"] = None
    if "dividir o tempo do conjunto" in rec:
        total = total_do_conjunto(l["trecho"])
        juntos = [x for x in irmaos if "itens declarados juntos" in x["conferido"]]
        if total is not None and juntos:
            k = juntos.index(l) if l in juntos else 0
            base, resto = divmod(total, len(juntos))
            p["aplicacao"] = base + (resto if k == 0 else 0)
    m = re.search(r"ligar à disciplina do banco pelo NOME: `([^`]+)`", rec)
    if m:
        p["destino"] = m.group(1)
    if "carregar UMA vez, na OPAP I" in rec and l["disciplina_cod"].strip().endswith("OPAP II"):
        p["carregar"] = "nao"
    if rec.startswith("não carregar item") or rec.startswith("conferir no PDF"):
        p["carregar"] = "nao"
    if p["instrumento"] not in INSTRUMENTOS and p["instrumento"] not in NOVOS:
        p["carregar"] = "nao"
    return p


def itens() -> list[dict[str, object]]:
    linhas = list(csv.DictReader(CSV.open(encoding="utf-8"), delimiter=";"))
    fora = [l for l in linhas if fora_da_d4(l)]
    recs = recomendacoes()
    if len(fora) != len(recs):
        raise SystemExit(f"o CSV tem {len(fora)} itens fora da D-4 e a lista de recomendações {len(recs)}: não alinho.")
    saida = []
    for l, r in zip(fora, recs, strict=True):
        if l["curso_codigo"] != r["curso"] or f"p. {l['fonte_pagina']}" not in r["pagina"]:
            raise SystemExit(f"desalinhado no item {r['n']}: CSV {l['curso_codigo']} p. {l['fonte_pagina']} × {r['curso']} {r['pagina']}")
        irmaos = [x for x in fora if x["destino_disciplina_codigo"] == l["destino_disciplina_codigo"]
                  and x["disciplina_cod"] == l["disciplina_cod"] and x["curso_codigo"] == l["curso_codigo"]]
        p = proposta(l, r["recomendacao"], irmaos)
        saida.append({
            "chave": f"{l['curso_codigo']}|{l['disciplina_cod']}|{l['ordem']}|{l['numero']}",
            "n": int(r["n"]),
            "curso": l["curso_codigo"],
            "disciplina": f"{l['disciplina_cod']} {l['disciplina_nome']}".strip(),
            "instrumento_pdf": l["instrumento"].replace("|", " ou "),
            "numero": int(l["numero"]) if l["numero"].isdigit() else None,
            "ta_aplicacao_pdf": int(l["ta_aplicacao"]) if l["ta_aplicacao"].isdigit() else None,
            "ta_vista_pdf": int(l["ta_vista"]) if l["ta_vista"].isdigit() else None,
            "ue_pdf": int(l["ue_computada"]) if l["ue_computada"].isdigit() else None,
            "pagina": f"{l['fonte_arquivo']} p. {l['fonte_pagina']}" if l["fonte_pagina"] else l["fonte_arquivo"],
            "por_que": r["por_que"],
            "recomendacao": r["recomendacao"].replace("**", ""),
            "p_carregar": p["carregar"],
            "p_destino": p["destino"],
            "p_instrumento": p["instrumento"],
            "p_aplicacao": p["aplicacao"],
            "p_vista": p["vista"],
            "p_ue": p["ue"],
            "decisao": None,
            "valor_corrigido": None,
            "observacao": None,
            "_linha": l,
        })
    # sem destino próprio: o da irmã (mesmo curso e disciplina do PDF) cuja recomendação liga pelo NOME
    for s in saida:
        if not s["p_destino"]:
            irmas = [x for x in saida if x["curso"] == s["curso"] and x["disciplina"] == s["disciplina"] and x["p_destino"]]
            if irmas:
                s["p_destino"] = irmas[0]["p_destino"]
    return saida


# ── passo 1: a planilha ──────────────────────────────────────────────────────────────────────────────────────────
def gerar_planilha(destino: Path) -> int:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation

    linhas = itens()
    wb = Workbook()
    ws = wb.active
    ws.title = "A4.7"
    ws.append([c[1] for c in COLUNAS])
    for i, (_, _, largura) in enumerate(COLUNAS, start=1):
        ws.column_dimensions[ws.cell(1, i).column_letter].width = largura
    cinza = PatternFill("solid", fgColor="EEEEEE")
    amarelo = PatternFill("solid", fgColor="FFF2CC")
    for c in ws[1]:
        c.font = Font(bold=True)
        c.alignment = Alignment(wrap_text=True, vertical="top")
    for l in linhas:
        ws.append([l[k] for k, _, _ in COLUNAS])
    editaveis = {"decisao", "valor_corrigido", "observacao"}
    for r in range(2, ws.max_row + 1):
        for i, (k, _, _) in enumerate(COLUNAS, start=1):
            cel = ws.cell(r, i)
            cel.alignment = Alignment(wrap_text=True, vertical="top")
            cel.fill = amarelo if k in editaveis else cinza if k == "chave" else PatternFill()
    col_dec = [i for i, c in enumerate(COLUNAS, start=1) if c[0] == "decisao"][0]
    letra = ws.cell(1, col_dec).column_letter
    dv = DataValidation(type="list", formula1='"aceito,recuso,corrijo"', allow_blank=True)
    dv.error = "Use aceito, recuso ou corrijo."
    ws.add_data_validation(dv)
    dv.add(f"{letra}2:{letra}{ws.max_row}")
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = ws.dimensions

    ajuda = wb.create_sheet("Como preencher")
    for linha in [
        "A4.7 da spec 014 — os 90 itens de avaliação do currículo que ficaram fora da D-4 (PEND-014-6).",
        "Preencha SÓ as colunas amarelas: «decisão», «valor corrigido» e, se quiser, «observação».",
        "aceito  → vale a proposta (colunas «Proposta: …»), que é a recomendação escrita em colunas.",
        "recuso  → o item não entra; a disciplina continua «tempo de avaliação não definido» para ele.",
        "corrijo → vale a proposta com o que «valor corrigido» disser, no formato:",
        "          instrumento=TG; aplicacao=3; vista=1; ue=2; destino=70 - C-Espc-FR - TFMFR-004; carregar=nao",
        "          (só as chaves que mudam; aplicacao= ou vista= vazio deixa o tempo «não definido»; ue= vazio, sem UE).",
        "Instrumentos aceitos: " + ", ".join(list(INSTRUMENTOS) + list(NOVOS)) + " (PT = Prova eletrônica, acrescentada à lista se usada).",
        "Não edite a coluna «Chave»: é por ela que o script casa a linha com o currículo.",
        "Depois: python -X utf8 -m scripts.etl.decisao_a47 migration --planilha <este arquivo> --sql <...> --antes-depois <...>",
        "O script GERA a migration e o antes/depois; nada é aplicado no banco sem a sua palavra.",
    ]:
        ajuda.append([linha])
    ajuda.column_dimensions["A"].width = 130
    destino.parent.mkdir(parents=True, exist_ok=True)
    wb.save(destino)
    por_rec: dict[str, int] = {}
    for l in linhas:
        chave = str(l["recomendacao"]).split(" (")[0][:60]
        por_rec[chave] = por_rec.get(chave, 0) + 1
    print(f"{len(linhas)} itens → {destino}")
    print(f"proposta «carregar»: sim {sum(l['p_carregar'] == 'sim' for l in linhas)}, não {sum(l['p_carregar'] == 'nao' for l in linhas)}")
    return 0


# ── passo 2: a migration e o antes/depois ───────────────────────────────────────────────────────────────────────
def lit(v: object) -> str:
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def ler_planilha(caminho: Path) -> list[dict[str, object]]:
    from openpyxl import load_workbook

    ws = load_workbook(caminho, data_only=True)["A4.7"]
    cab = [c.value for c in ws[1]]
    esperado = [c[1] for c in COLUNAS]
    if cab[: len(esperado)] != esperado:
        raise SystemExit("o cabeçalho da planilha mudou — use a gerada pelo passo 1.")
    chaves = [c[0] for c in COLUNAS]
    return [dict(zip(chaves, [c.value for c in row], strict=False)) for row in ws.iter_rows(min_row=2) if row[0].value]


def aplicar_correcao(p: dict[str, object], texto: str, n: object) -> dict[str, object]:
    q = dict(p)
    for parte in [x.strip() for x in texto.split(";") if x.strip()]:
        if "=" not in parte:
            raise SystemExit(f"item {n}: «valor corrigido» fora do formato chave=valor: {parte!r}")
        k, v = [x.strip() for x in parte.split("=", 1)]
        k = k.lower()
        if k in ("aplicacao", "vista", "ue"):
            if v != "" and not v.isdigit():
                raise SystemExit(f"item {n}: {k} tem de ser número ou vazio, veio {v!r}")
            q[k] = int(v) if v else None
        elif k == "instrumento":
            q[k] = v.upper()
        elif k == "destino":
            q[k] = v
        elif k == "carregar":
            q[k] = "nao" if v.lower() in ("nao", "não", "n") else "sim"
        else:
            raise SystemExit(f"item {n}: chave desconhecida em «valor corrigido»: {k!r}")
    return q


def faixa(texto: str | None) -> set[int]:
    """`1-26` ou `1-26,30` → os números de item (#) cuja linha EM BRANCO vale «aceito»."""
    if not texto:
        return set()
    nums: set[int] = set()
    for parte in texto.split(","):
        a, _, b = parte.strip().partition("-")
        nums.update(range(int(a), int(b or a) + 1))
    return nums


def decidir(planilha: Path, parcial: bool, em_branco_aceito: set[int] | None = None) -> tuple[list[dict[str, object]], dict[str, int]]:
    base = {str(l["chave"]): l for l in itens()}
    preenchidas = ler_planilha(planilha)
    conta = {"aceito": 0, "recuso": 0, "corrijo": 0, "sem decisão": 0, "proposta não carrega": 0,
             "em branco = aceito": 0}
    entram: list[dict[str, object]] = []
    for r in preenchidas:
        chave = str(r["chave"])
        if chave not in base:
            raise SystemExit(f"chave desconhecida na planilha: {chave!r}")
        b = base[chave]
        dec = (str(r["decisao"] or "").strip().lower())
        if dec == "" and em_branco_aceito and int(b["n"]) in em_branco_aceito:
            conta["em branco = aceito"] += 1
            dec = "aceito"
        if dec == "":
            conta["sem decisão"] += 1
            if not parcial:
                raise SystemExit(f"item {b['n']} sem decisão (use --parcial para deixá-lo de fora).")
            continue
        if dec not in DECISOES:
            raise SystemExit(f"item {b['n']}: decisão {dec!r} não é aceito/recuso/corrijo.")
        conta[dec] += 1
        if dec == "recuso":
            continue
        p = {"carregar": b["p_carregar"], "destino": b["p_destino"], "instrumento": b["p_instrumento"],
             "aplicacao": b["p_aplicacao"], "vista": b["p_vista"], "ue": b["p_ue"]}
        if dec == "corrijo":
            p = aplicar_correcao(p, str(r["valor_corrigido"] or ""), b["n"])
        if p["carregar"] != "sim":
            conta["proposta não carrega"] += 1
            continue
        if p["instrumento"] not in INSTRUMENTOS and p["instrumento"] not in NOVOS:
            raise SystemExit(f"item {b['n']}: instrumento {p['instrumento']!r} fora da lista.")
        if not p["destino"]:
            raise SystemExit(f"item {b['n']}: sem disciplina de destino no sistema.")
        l = b["_linha"]
        entram.append({"n": b["n"], "decisao": dec, "curso": b["curso"], "disciplina_pdf": b["disciplina"], **p,
                       "numero": b["numero"], "ordem": int(l["ordem"]), "ues_abordadas": l["ues_abordadas"] or None,
                       "fonte_arquivo": l["fonte_arquivo"], "fonte_pagina": int(l["fonte_pagina"]) if l["fonte_pagina"].isdigit() else None,
                       "observacao": r.get("observacao")})
    # a mesma (disciplina, instrumento, número) duas vezes violaria `avc_numero_unico`: diga antes de gerar
    vistos: dict[tuple[object, object, object], object] = {}
    for e in entram:
        k = (e["destino"], e["instrumento"], e["numero"])
        if k in vistos:
            raise SystemExit(f"itens {vistos[k]} e {e['n']}: a mesma disciplina, instrumento e número — corrija o número.")
        vistos[k] = e["n"]
        if e["fonte_pagina"] is None:
            raise SystemExit(f"item {e['n']}: sem página do PDF — origem currículo exige arquivo e página (avc_fonte_se_curriculo).")
    return entram, conta


def gerar_sql(entram: list[dict[str, object]], conta: dict[str, int]) -> str:
    novos = sorted({str(e["instrumento"]) for e in entram} & set(NOVOS))
    out: list[str] = []
    p = out.append
    p("-- =================================================================================")
    p("-- Spec 014 · A4.7 (PEND-014-6) — os itens de avaliação do currículo que ficaram fora da D-4, DECIDIDOS")
    p("-- GERADA por `python -m scripts.etl.decisao_a47 migration` a partir da planilha preenchida por Bernardo")
    p("-- Villas Boas. NÃO editar à mão.")
    p("--")
    p(f"-- Decisões: aceito {conta['aceito']} · corrijo {conta['corrijo']} · recuso {conta['recuso']} · sem decisão {conta['sem decisão']}"
      f" · proposta que não carrega {conta['proposta não carrega']}. ENTRAM {len(entram)} itens.")
    if conta["em branco = aceito"]:
        p(f"-- Dos «aceito», {conta['em branco = aceito']} vieram de linha EM BRANCO que vale «aceito» da proposta por decisão de")
        p("-- Bernardo Villas Boas (16/10/2026: \"as linhas 1 a 26, em branco, valem como 'aceito' da proposta\").")
    p("-- Só ACRESCENTA itens em `avaliacoes_curriculo` (origem currículo, arquivo e página): nenhuma CH, nome ou código")
    p("-- de disciplina muda (D-CUR-1). Abstém-se em base sem cursos; idempotente; evento em `migracao_log` só quando grava.")
    p("-- Reversão: os itens com a procedência `spec014-A47:` ficam `inativo` (nada é apagado, regra 4).")
    p("-- =================================================================================")
    p("")
    if novos:
        p("-- 1. instrumento novo na lista (domínio operacional: `config_listas`, nunca ENUM)")
        p("insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, metadados)")
        p("values")
        p(",\n".join(f"  ('instrumentos_avaliacao', {lit(s)}, {lit(NOVOS[s][0])}, {20 + i}, jsonb_build_object('natureza', {lit(NOVOS[s][1])}, 'vista_obrigatoria', {'true' if s in VISTA_OBRIGATORIA else 'false'}))"
                     for i, s in enumerate(novos)))
        p("on conflict (lista, valor) do nothing;")
        p("")
    p("-- 2. os itens")
    p("do $$")
    p("declare")
    p("  v_inseridos integer;")
    p("  v_ativos integer;")
    p("begin")
    p("  if not exists (select 1 from public.cursos) then")
    p("    raise notice 'A4.7 (spec 014): base sem cursos — a migration se abstém.';")
    p("    return;")
    p("  end if;")
    p("")
    if not entram:
        p("  raise notice 'A4.7 (spec 014): nenhuma linha aceita — nada a gravar.';")
        p("end;")
        p("$$;")
        return "\n".join(out) + "\n"
    p("  with dado (item_a47, disciplina, ordem, instrumento, numero, ue, ues_abordadas, ta_aplicacao, ta_vista, fonte_arquivo, fonte_pagina) as (values")
    p(",\n".join(
        f"    ({e['n']}, {lit(e['destino'])}, {e['ordem']}, {lit(e['instrumento'])}, {e['numero']}, "
        f"{'null' if e['ue'] is None else e['ue']}::smallint, {lit(e['ues_abordadas'])}, "
        f"{'null' if e['aplicacao'] is None else e['aplicacao']}::smallint, {'null' if e['vista'] is None else e['vista']}::smallint, "
        f"{lit(e['fonte_arquivo'])}, {e['fonte_pagina']})"
        for e in entram))
    p("  ), ins as (")
    p("    insert into public.avaliacoes_curriculo (disciplina_id, curso_id, ordem, instrumento_id, numero, unidade_ensino_id,")
    p("                                             origem_ue, ues_abordadas, ta_aplicacao, origem_ta_aplicacao, ta_vista,")
    p("                                             origem_ta_vista, origem_item, fonte_arquivo, fonte_pagina, origem_migracao_v1)")
    p("    select d.id, d.curso_id, x.ordem, i.id, x.numero, u.id, case when u.id is not null then 'curriculo' end,")
    p("           x.ues_abordadas, x.ta_aplicacao, case when x.ta_aplicacao is not null then 'curriculo' end, x.ta_vista,")
    p("           case when x.ta_vista is not null then 'curriculo' end, 'curriculo', x.fonte_arquivo, x.fonte_pagina,")
    p("           'spec014-A47:item ' || x.item_a47 || ':' || x.fonte_arquivo")
    p("      from dado x")
    p("      join public.disciplinas d on d.codigo = x.disciplina and d.status = 'ativo'")
    p("      join public.config_listas i on i.lista = 'instrumentos_avaliacao' and i.valor = x.instrumento")
    p("      left join public.unidades_ensino u on u.disciplina_id = d.id and u.numero_ue = x.ue and u.status = 'ativo'")
    p("    on conflict (disciplina_id, instrumento_id, numero) where status = 'ativo' do nothing")
    p("    returning 1")
    p("  )")
    p("  select count(*) into v_inseridos from ins;")
    p("")
    p("  select count(*) into v_ativos from public.avaliacoes_curriculo where status = 'ativo' and origem_migracao_v1 like 'spec014-A47:%';")
    p(f"  if v_ativos <> {len(entram)} then")
    p(f"    raise exception 'A4.7 (spec 014): esperava {len(entram)} itens ativos com a procedência, há %% (disciplina sem destino, UE inexistente ou item que já existe?)', v_ativos;".replace("%%", "%"))
    p("  end if;")
    p("  if exists (select 1 from public.avaliacoes_curriculo a where a.status = 'ativo' and a.origem_migracao_v1 like 'spec014-A47:%'")
    p("              and a.unidade_ensino_id is null and exists (select 1 from (values")
    p(",\n".join(f"                ({e['n']}, {e['ue']})" for e in entram if e["ue"] is not None) or "                (0, 0)")
    p("              ) q(n, ue) where a.origem_migracao_v1 like 'spec014-A47:item ' || q.n || ':%')) then")
    p("    raise exception 'A4.7 (spec 014): item com UE decidida entrou sem a UE — a UE não existe na disciplina de destino.';")
    p("  end if;")
    p("  if exists (select 1 from public.avaliacoes_curriculo a join public.disciplinas d on d.id = a.disciplina_id")
    p("              where a.status = 'ativo' group by d.id, d.carga_horaria_tempos")
    p("             having sum(coalesce(a.ta_aplicacao, 0) + coalesce(a.ta_vista, 0)) > d.carga_horaria_tempos) then")
    p("    raise exception 'A4.7 (spec 014): há disciplina com avaliação do currículo acima da CH (FR-031.2).';")
    p("  end if;")
    p("  if v_inseridos > 0 then")
    p("    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,")
    p("                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)")
    p("    values ('MLOG-014-A47-' || to_char(now(), 'YYYYMMDDHH24MISS'), 'curriculo_densm', 'a47-decisao.xlsx',")
    p("            'avaliacoes_curriculo', 'por disciplina', 'adicionado'::public.acao_migracao, 'A4.7 (spec 014, PEND-014-6)',")
    p(f"            null, v_inseridos || ' itens', 'Itens fora da D-4 decididos por Bernardo Villas Boas ({len(entram)} entram).');")
    p("  end if;")
    p("  raise notice 'A4.7 (spec 014): % item(ns) inserido(s); % ativo(s) com a procedência.', v_inseridos, v_ativos;")
    p("end;")
    p("$$;")
    return "\n".join(out) + "\n"


def psql(sql: str) -> list[list[str]]:
    r = subprocess.run(["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-At", "-F", "\t", "-v", "ON_ERROR_STOP=1"],
                       input=sql, capture_output=True, text=True, encoding="utf-8", check=True)
    return [l.split("\t") for l in r.stdout.splitlines() if l]


def antes_depois(entram: list[dict[str, object]], conta: dict[str, int]) -> str:
    """O previsto de avaliação de cada disciplina tocada: o banco LOCAL hoje (só leitura) e o que a migration soma."""
    destinos = sorted({str(e["destino"]) for e in entram})
    linhas = ["# A4.7 — antes/depois (gerado; não aplicado)", "",
              f"Decisões: aceito {conta['aceito']} (dos quais {conta['em branco = aceito']} em branco, que valem «aceito» por decisão "
              f"de Bernardo Villas Boas de 16/10/2026) · corrijo {conta['corrijo']} · recuso {conta['recuso']} · sem decisão "
              f"{conta['sem decisão']} · proposta que não carrega {conta['proposta não carrega']}. **Entram {len(entram)} itens.**", "",
              "*Antes* = o banco **local** no momento da geração (só leitura); *depois* = antes + os itens desta migration.", ""]
    if not destinos:
        return "\n".join(linhas + ["Nada entra."]) + "\n"
    valores = ",".join(lit(d) for d in destinos)
    dados = psql(f"""
select d.codigo, c.codigo, d.carga_horaria_tempos,
       count(a.id) filter (where a.status = 'ativo'),
       coalesce(sum(coalesce(a.ta_aplicacao,0) + coalesce(a.ta_vista,0)) filter (where a.status = 'ativo'), 0),
       count(a.id) filter (where a.status = 'ativo' and a.ta_aplicacao is null)
  from public.disciplinas d join public.cursos c on c.id = d.curso_id
  left join public.avaliacoes_curriculo a on a.disciplina_id = d.id
 where d.codigo in ({valores}) and d.status = 'ativo'
 group by 1, 2, 3 order by 2, 1;""")
    achadas = {r[0]: r for r in dados}
    linhas += ["| Curso | Disciplina (sistema) | CH | itens antes → depois | TA de avaliação antes → depois | sem tempo antes → depois | itens A4.7 |",
               "|---|---|---:|---|---|---|---|"]
    for d in destinos:
        es = [e for e in entram if e["destino"] == d]
        soma = sum(int(e["aplicacao"] or 0) + int(e["vista"] or 0) for e in es)
        sem = sum(1 for e in es if e["aplicacao"] is None)
        if d not in achadas:
            linhas.append(f"| ? | `{d}` | — | ⚠️ disciplina NÃO existe no banco local | — | — | {', '.join(str(e['n']) for e in es)} |")
            continue
        _, curso, ch, n, ta, st = achadas[d]
        depois_ta = int(ta) + soma
        alerta = " ⚠️ acima da CH" if ch and depois_ta > int(ch) else ""
        linhas.append(f"| {curso} | `{d}` | {ch} | {n} → {int(n) + len(es)} | {ta} → {depois_ta}{alerta} | {st} → {int(st) + sem} | "
                      f"{', '.join(str(e['n']) for e in es)} |")
    linhas += ["", "## Os itens que entram", "", "| # | decisão | disciplina | instrumento | nº | UE | TA aplicação | TA vista |",
               "|---:|---|---|---|---:|---:|---:|---:|"]
    for e in entram:
        linhas.append(f"| {e['n']} | {e['decisao']} | `{e['destino']}` | {e['instrumento']} | {e['numero']} | {e['ue'] or '—'} | "
                      f"{'não definido' if e['aplicacao'] is None else e['aplicacao']} | {'—' if e['vista'] is None else e['vista']} |")
    return "\n".join(linhas) + "\n"


def gerar_migration(planilha: Path, sql: Path, relatorio: Path, parcial: bool, em_branco_aceito: set[int]) -> int:
    entram, conta = decidir(planilha, parcial, em_branco_aceito)
    sql.parent.mkdir(parents=True, exist_ok=True)
    sql.write_text(gerar_sql(entram, conta), encoding="utf-8", newline="\n")
    relatorio.parent.mkdir(parents=True, exist_ok=True)
    relatorio.write_text(antes_depois(entram, conta), encoding="utf-8", newline="\n")
    print(f"decisões: {conta}; entram {len(entram)}")
    print(f"migration → {sql}\nantes/depois → {relatorio}\n⚠️ NADA foi aplicado: aplicar é decisão de Bernardo, pelo rito.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="passo", required=True)
    a = sub.add_parser("planilha")
    a.add_argument("--saida", required=True, type=Path)
    b = sub.add_parser("migration")
    b.add_argument("--planilha", required=True, type=Path)
    b.add_argument("--sql", required=True, type=Path)
    b.add_argument("--antes-depois", required=True, type=Path)
    b.add_argument("--parcial", action="store_true", help="deixa de fora a linha sem decisão, em vez de parar")
    b.add_argument("--em-branco-aceito", default=None,
                   help="faixa de itens (#) cuja linha EM BRANCO vale «aceito», por decisão nominal (ex.: 1-26)")
    args = ap.parse_args()
    if args.passo == "planilha":
        return gerar_planilha(args.saida)
    return gerar_migration(args.planilha, args.sql, args.antes_depois, args.parcial, faixa(args.em_branco_aceito))


if __name__ == "__main__":
    sys.exit(main())
