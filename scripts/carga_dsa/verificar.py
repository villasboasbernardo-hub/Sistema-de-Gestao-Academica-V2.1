"""Verificacao automatica da sincronizacao — o controle de cada turma × o sistema.

    python -m scripts.carga_dsa.verificar --rodada <pasta> --destino local|remoto \
        --dsa-do-sistema <json> --hoje AAAA-MM-DD [--turmas "..."] --saida <pasta>

SAO QUATRO CONFERENCIAS, e todas so LEEM:

  (a) turma × disciplina   TA no sistema (LANCADO e EXECUTADO, lado a lado) × aba CONTROLE ×
                           BD DISCIPLINAS. O CONTROLE ja conta a semana corrente planejada, e o
                           «executado» do sistema exclui data futura (Q-2): comparar um com o outro
                           acusaria diferenca falsa, e por isso os dois numeros do sistema saem juntos.
  (b) turma × semana       o DSA que o SISTEMA monta × a aba IMPRESSAO, bloco a bloco (dia, horario,
                           disciplina, TA, UE/topico, local, tecnica, instrutor), e a CH acumulada do
                           rodape × o painel da planilha. Cada diferenca sai classificada:
                           SISTEMA · DADO · PLANILHA · DECISAO (diferenca que e escolha ja tomada).
  (c) conflitos            instrutor e sala em duas turmas no mesmo TA.
  (d) substituicao         linhas do ETL inativadas × linhas novas, por turma.

⚠️ O DSA DO SISTEMA CHEGA PRONTO, num JSON montado pelas MESMAS funcoes da grade e do `/print/dsa`
   (`lerSemanaDoDsa` → `documentoImpresso` → `tabelaDeCh`). Este modulo nao recalcula horario,
   rotulo nem CH: se recalculasse, estaria conferindo a planilha contra uma segunda implementacao.

⚠️ (b) SO RODA EM PLANILHA «ALINHADA» (a linha N da IMPRESSAO e a linha N do PREENCHIMENTO). Nas
   demais a conferencia e pulada e DITA — comparar contra a linha errada do documento seria pior.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import warnings
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import openpyxl

from scripts.carga_dsa import banco, planilha
from scripts.carga_dsa.banco import lit
from scripts.carga_dsa.plano import normalizar
from scripts.carga_dsa.resolver import slug

AQUI = Path(__file__).parent


def _sem_prefixo(topico: str) -> str:
    return re.sub(r"^\s*[0-9]+\s*[–-]\s*", "", " ".join(topico.split()))


def _pontas(horario: str) -> tuple[str, str]:
    achados = re.findall(r"[0-9]{2}:[0-9]{2}", horario)
    return (achados[0], achados[-1]) if achados else ("", "")


def painel_por_semana(caminho: Path) -> dict[str, dict[str, tuple[int | None, int | None]]]:
    """O painel de CH de cada semana do PREENCHIMENTO: semana ISO → cod → (prevista, cumprida)."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        aba = openpyxl.load_workbook(caminho, data_only=True)[planilha.ABA_PREENCHIMENTO]
    inicios = [r for r in range(1, aba.max_row + 1) if planilha.texto(aba.cell(r, 1).value).upper().startswith("SIGLA")]
    saida: dict[str, dict[str, tuple[int | None, int | None]]] = {}
    for i, r0 in enumerate(inicios):
        r1 = inicios[i + 1] if i + 1 < len(inicios) else aba.max_row + 1
        datas = [aba.cell(r, 2).value for r in range(r0, r1) if isinstance(aba.cell(r, 2).value, (datetime, date))]
        if not datas:
            continue
        ano, semana, _ = (datas[0].date() if isinstance(datas[0], datetime) else datas[0]).isocalendar()
        cabecalho = next(((r, c) for r in range(r0, r1) for c in range(8, 12)
                          if planilha.texto(aba.cell(r, c).value).upper() in ("CÓD.", "COD.")), None)
        if cabecalho is None:
            continue
        r, c = cabecalho
        painel = {}
        for rr in range(r + 1, r1):
            cod = planilha.texto(aba.cell(rr, c).value)
            if cod == "":
                continue
            numero = lambda v: int(v) if isinstance(v, (int, float)) else None  # noqa: E731
            painel[cod] = (numero(aba.cell(rr, c + 2).value), numero(aba.cell(rr, c + 3).value))
        saida[f"{ano}-{semana:02d}"] = painel
    return saida


def conferir_semanas(turma: str, leitura: planilha.Leitura, plano: dict, dsa: dict, decisoes: dict) -> tuple[list[dict], Counter]:
    """(b) bloco a bloco: a IMPRESSAO da planilha × a linha que o sistema imprime no mesmo dia e TA."""
    locais = {normalizar(k): normalizar(v) for k, v in decisoes.get("locais", {}).items()}
    do_sistema: dict[tuple[str, int], dict] = {}
    bloqueados: dict[str, str] = {}
    for semana in dsa["semanas"].values():
        for dia in semana["dias"]:
            if dia["bloqueio"]:
                bloqueados[dia["data"]] = dia["bloqueio"]
            for linha in dia["linhas"]:
                if linha["taInicial"] is not None and not linha["chave"].startswith("ei-"):
                    do_sistema[(dia["data"], linha["taInicial"])] = linha
    codigo_por_linha = {}
    for grupo in ("aulas", "avaliacoes", "atividades"):
        for l in plano[grupo]:
            codigo_por_linha[int(re.search(r"-L([0-9]+)-", l["codigo"]).group(1))] = (grupo, l)
    vistas = {(a["data_vista_prova"], a["ta_inicial_vista"]) for a in plano["avaliacoes"] if a["data_vista_prova"]}
    calendario = {c["data"] for c in plano["calendario"]}
    instrutor_do_texto = plano.get("instrutores", {})

    diferencas: list[dict] = []
    classes: Counter = Counter()

    def dif(bloco, classe: str, campo: str, texto: str) -> None:
        diferencas.append({"turma": turma, "data": bloco.data.isoformat(), "linha": bloco.linha, "chave": f"{bloco.cod}+{bloco.ue}",
                           "ta": bloco.tempos, "classe": classe, "campo": campo, "diferenca": texto})
        classes[(classe, campo, re.sub(r"«[^»]*»", "«…»", texto))] += 1

    iguais = 0
    for bloco in leitura.blocos:
        esperado = leitura.impressao.get(bloco.linha)
        dia = bloco.data.isoformat()
        linha = do_sistema.get((dia, bloco.ta_inicial))
        antes = len(diferencas)
        if dia in calendario:
            if dia not in bloqueados:
                dif(bloco, "DADO", "calendario", "dia parado de todas as turmas, mas o sistema nao o mostra bloqueado")
            continue
        if linha is None:
            carregado = bloco.linha in codigo_por_linha or (dia, bloco.ta_inicial) in vistas
            dif(bloco, "SISTEMA" if carregado else "DADO", "bloco",
                "esta carregado e o sistema nao o imprime" if carregado else "nao foi carregado: aguarda decisao de cadastro (ver pendencias)")
            continue
        if esperado is None:
            continue
        if dia in bloqueados:
            dif(bloco, "DADO", "calendario", f"o calendario do banco marca o dia inteiro («{bloqueados[dia]}») e a turma teve expediente")

        ini_p, fim_p = _pontas(esperado["horario"])
        trechos = linha["trechos"]
        ini_s, fim_s = (trechos[0]["inicio"], trechos[-1]["fim"]) if trechos else ("", "")
        if (ini_p, fim_p) != (ini_s, fim_s):
            # O relogio do sistema e o da aba HORARIOS (decisao de 06/10/2026, item 3): o que diverge na
            # IMPRESSAO e erro de planilha — pontual, ou estavel a partir de uma semana (candidato a
            # vigencia nova, apontado no resumo por semana).
            if (ini_p, fim_p) == ("", ""):
                dif(bloco, "PLANILHA", "horario", f"sem horario na IMPRESSAO; pela tabela HORARIOS e «{ini_s} às {fim_s}»")
            else:
                dif(bloco, "PLANILHA", "horario", f"IMPRESSAO «{esperado['horario']}» × tabela HORARIOS «{ini_s} às {fim_s}»")
        elif len(trechos) > 1:
            dif(bloco, "PLANILHA", "horario", "horario continuo atravessando o almoco; o sistema quebra em dois trechos")

        if esperado["disciplina"] != linha["disciplina"]:
            if linha["disciplina"] == "":
                dif(bloco, "PLANILHA", "disciplina", f"codigo interno da planilha («{esperado['disciplina']}»); atividade nao letiva nao tem disciplina no sistema")
            else:
                dif(bloco, "DECISAO", "disciplina", f"a planilha lanca sob «{esperado['disciplina']}» e o de-para aponta «{linha['disciplina']}»")
        if esperado["ta"] != str(linha["tempos"]):
            digitado = "ta" in leitura.digitadas.get(bloco.linha, {})
            # O horario impresso (inicio-fim) diz quantos TA o bloco ocupa; se ele fecha com o sistema e o
            # numero impresso nao, a contradicao e da propria IMPRESSAO (medido no C-Exp-BATI, 10/03: «1» TA
            # num bloco impresso «14:45 as 16:20», que sao dois TA de 45 min).
            horario_fecha = (ini_p, fim_p) == (ini_s, fim_s) and bloco.tempos == linha["tempos"]
            dif(bloco, "PLANILHA" if (digitado or horario_fecha) else "SISTEMA", "TA",
                f"«{esperado['ta']}» × «{linha['tempos']}»" + (" — numero digitado na IMPRESSAO por cima da formula" if digitado
                else " — o horario impresso e o PREENCHIMENTO dao o numero do sistema; o numero impresso contradiz os dois" if horario_fecha else ""))

        topico_p, topico_s = normalizar(_sem_prefixo(esperado["topico"])), normalizar(linha["conteudo"])
        if topico_p != topico_s:
            if linha["conteudo"].startswith("VISTA DE PROVA"):
                pass  # o rotulo da vista e do sistema, por decisao; a referencia da prova nao existe na planilha
            elif (dia, bloco.ta_inicial) in vistas:
                dif(bloco, "SISTEMA", "topico", "vista de prova sem o rotulo «VISTA DE PROVA»")
            elif linha["estudoIndividual"]:
                pass
            elif bloco.linha in codigo_por_linha and codigo_por_linha[bloco.linha][0] == "aulas" and codigo_por_linha[bloco.linha][1].get("ue"):
                dif(bloco, "DADO", "topico", f"topico da planilha difere do catalogo de UE do banco («{_sem_prefixo(esperado['topico'])}» × «{linha['conteudo']}»)")
            else:
                dif(bloco, "SISTEMA", "topico", f"«{_sem_prefixo(esperado['topico'])}» × «{linha['conteudo']}»")

        local_p = locais.get(normalizar(esperado["local"]), normalizar(esperado["local"]))
        if esperado["local"].strip() in ("", "-", "--", "---"):
            local_p = ""
        if local_p != normalizar(linha["local"]):
            dif(bloco, "DECISAO" if bloco.linha in codigo_por_linha and codigo_por_linha[bloco.linha][1].get("local") else "SISTEMA",
                "local", f"«{' '.join(esperado['local'].split())}» × «{linha['local']}»")

        te_p = esperado["te"].strip()
        te_p = "" if te_p in ("-", "--", "---") else te_p
        if te_p != linha["te"]:
            if "/" in te_p and te_p.split("/")[0].strip().upper() == linha["te"].upper():
                dif(bloco, "DECISAO", "T/E", f"«{te_p}» traz duas tecnicas; valeu a primeira («{linha['te']}»)")
            elif linha["estudoIndividual"]:
                dif(bloco, "DECISAO", "T/E", f"Estudo Individual: «{te_p}» na planilha, «EI» no sistema")
            elif linha["disciplina"] == "":
                dif(bloco, "DECISAO", "T/E", f"atividade nao letiva: «{te_p}» na planilha, vazio no sistema")
            elif linha["conteudo"].startswith("VISTA DE PROVA"):
                dif(bloco, "DECISAO", "T/E", f"vista de prova: «{te_p}» na planilha, «EO» no sistema")
            elif f"L{bloco.linha}.te" in decisoes.get("celulas_digitadas_nao_adotadas", {}):
                dif(bloco, "DECISAO", "T/E", f"«{te_p}» digitado na IMPRESSAO e recusado por decisao; vale «{linha['te']}»")
            else:
                dif(bloco, "SISTEMA", "T/E", f"«{te_p}» × «{linha['te']}»")

        instr_p = " ".join(esperado["instrutor"].split())
        instr_p = "" if instr_p in ("-", "--", "---") else instr_p
        if normalizar(instr_p) != normalizar(linha["instrutor"]):
            sem_fiscal = " ".join(re.sub(r"\(\s*FISCAL\s*\)", "", instr_p, flags=re.IGNORECASE).split())
            primeiro = sem_fiscal.split("/")[0].strip()
            if linha["estudoIndividual"] or (instr_p == "" and linha["instrutor"] == ""):
                pass
            elif "(FISCAL)" in instr_p.upper() and "(FISCAL)" not in linha["instrutor"].upper():
                dif(bloco, "SISTEMA", "instrutor", "a aplicacao da prova imprime o responsavel, e a planilha imprime o FISCAL")
            elif primeiro in instrutor_do_texto or sem_fiscal in instrutor_do_texto:
                # «CT (RM2-T) FULANA (EN)»: a OM entre parenteses DEPOIS do nome nao e nome — sai antes de comparar.
                sem_om = re.sub(r"\s*\([^)]*\)\s*$", "", sem_fiscal if "/" not in sem_fiscal else primeiro)
                tokens_p = normalizar(sem_om).split()
                tokens_s = normalizar(re.sub(r"\(\s*FISCAL\s*\)", "", linha["instrutor"], flags=re.IGNORECASE)).split()
                if "/" in sem_fiscal:
                    dif(bloco, "DECISAO", "instrutor", f"dois instrutores na planilha («{instr_p}»); o primeiro e o instrutor e o segundo vai nas observacoes")
                elif normalizar(primeiro) in {normalizar(k) for k in decisoes.get("instrutor_por_texto", {})}:
                    dif(bloco, "DECISAO", "instrutor", f"«{instr_p}» na planilha nao e pessoa; por decisao (D3) a aula leva o instrutor «{linha['instrutor']}» e a observacao «(conforme DSA)»")
                elif tokens_p and tokens_s and tokens_p[-1] == tokens_s[-1]:
                    dif(bloco, "DADO", "instrutor", f"posto/especialidade escritos de outra forma («{instr_p}» × «{linha['instrutor']}»)")
                elif tokens_p and set(tokens_p[1:]) <= set(tokens_s):
                    dif(bloco, "DADO", "instrutor", f"o cadastro nao tem nome de guerra: o sistema imprime o nome completo («{instr_p}» × «{linha['instrutor']}»)")
                else:
                    dif(bloco, "SISTEMA", "instrutor", f"«{instr_p}» na planilha × «{linha['instrutor']}» no sistema")
            elif linha["instrutor"] == "" and (decisoes.get("chaves", {}).get(f"{bloco.cod}+{bloco.ue}") or {}).get("responsavel") == "em_branco":
                dif(bloco, "DECISAO", "instrutor", f"«{instr_p}» na planilha; em branco no sistema, por decisao")
            elif linha["instrutor"] == "":
                dif(bloco, "SISTEMA", "instrutor", f"«{instr_p}» na planilha e vazio no sistema")
            else:
                dif(bloco, "DADO", "instrutor", f"«{instr_p}» × «{linha['instrutor']}»")
        if len(diferencas) == antes:
            iguais += 1
    classes[("=", "blocos sem diferenca", "")] = iguais
    return diferencas, classes


def main() -> int:
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    a = argparse.ArgumentParser(description="Confere o sistema contra as planilhas de controle da rodada.")
    a.add_argument("--rodada", required=True, type=Path)
    a.add_argument("--destino", required=True, choices=sorted(banco.DESTINOS))
    a.add_argument("--dsa-do-sistema", required=True, type=Path)
    a.add_argument("--planos", required=True, type=Path, help="pasta com os plano-<turma>.json da sincronizacao")
    a.add_argument("--hoje", required=True)
    a.add_argument("--turmas", required=True)
    a.add_argument("--saida", required=True, type=Path)
    arg = a.parse_args()

    fontes = {f["turma"]: f for f in json.loads((AQUI / "fontes.json").read_text(encoding="utf-8"))["turmas"]}
    manifesto = {m["planilha_id"]: m for m in json.loads((arg.rodada / "manifesto.json").read_text(encoding="utf-8"))}
    dsa = json.loads(arg.dsa_do_sistema.read_text(encoding="utf-8"))
    arg.saida.mkdir(parents=True, exist_ok=True)
    todas: list[dict] = []
    relatorio: list[str] = []

    for turma in [t.strip() for t in arg.turmas.split(",")]:
        fonte = fontes[turma]
        caminho = arg.rodada / manifesto[fonte["planilha_id"]]["arquivo"]
        leitura = planilha.ler(caminho)
        decisoes = json.loads((AQUI / fonte["decisoes"]).read_text(encoding="utf-8"))
        plano = json.loads((arg.planos / f"plano-{slug(turma)}.json").read_text(encoding="utf-8"))
        relatorio.append(f"\n## {turma}\n")

        # (a) turma × disciplina
        linhas = banco.consultar(arg.destino, f"""
            select d.cod_disciplina as cod, d.carga_horaria_tempos as ch,
                   coalesce(sum(o.tempos_consumidos), 0) as lancado,
                   coalesce(sum(o.tempos_consumidos) filter (where o.data <= {lit(arg.hoje)}::date), 0) as executado
              from public.disciplinas d
              left join public.vw_ocupacao_ta o on o.disciplina_id = d.id
                   and o.turma_id = (select id from public.turmas where codigo = {lit(turma)})
             where d.curso_id = (select curso_id from public.turmas where codigo = {lit(turma)}) and d.status = 'ativo'
             group by 1, 2 order by 1""")
        do_banco = {l["cod"]: l for l in linhas}
        do_catalogo: dict[str, list[int]] = {}
        for (cod, _ue), linha in leitura.catalogo.items():
            soma = do_catalogo.setdefault(cod, [0, 0])
            soma[0] += linha.ch or 0
            soma[1] += linha.ch_concluida or 0
        # O CONTROLE conta pelo codigo DA PLANILHA; quando ha de-para de disciplina (MetocOf: I+8..12 → IV),
        # a comparacao honesta e por esse codigo — e o que o plano guarda em `cod_planilha`.
        pela_planilha: dict[str, int] = {}
        for a in plano.get("aulas", []) + plano.get("avaliacoes", []):
            cod_p = a.get("cod_planilha") or a.get("disciplina")
            pela_planilha[cod_p] = pela_planilha.get(cod_p, 0) + int(a.get("tempos_consumidos") or 0) + int(a.get("tempos_consumidos_vista") or 0)
        relatorio.append("### (a) Carga horária por disciplina\n")
        relatorio.append("| Disc. | CH do banco | Sistema: lançado | Sistema: executado até hoje | Lançado pelo cód. da planilha | CONTROLE: prevista | CONTROLE: cumprida | BD DISCIPLINAS: prevista | BD DISCIPLINAS: concluída | Lançado (cód. planilha) − CONTROLE |")
        relatorio.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
        romano = {s: i for i, s in enumerate("I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI XXII".split())}
        soma_dif = 0
        mapa_disc = decisoes.get("disciplinas", {})
        for cod in sorted(set(do_banco) | set(leitura.controle), key=lambda c: (romano.get(c, 99), c)):
            if cod not in do_banco and mapa_disc.get(cod, cod) not in do_banco:
                continue  # AD, FE, PL, TR… no CONTROLE do CAHO sao atividade, nao disciplina
            b = do_banco.get(cod, {"ch": None, "lancado": 0, "executado": 0})
            prev, cump = leitura.controle.get(cod, (None, None))
            cat = do_catalogo.get(cod, [None, None])
            lanc_p = pela_planilha.get(cod, 0)
            diferenca = None if cump is None else lanc_p - cump
            soma_dif += abs(diferenca or 0)
            relatorio.append(f"| {cod} | {b['ch']} | {b['lancado']} | {b['executado']} | {lanc_p} | {prev} | {cump} | {cat[0]} | {cat[1]} | {'' if diferenca is None else f'{diferenca:+d}' if diferenca else '0'} |")
        relatorio.append(f"\nSoma das diferenças absolutas (lançado − CONTROLE): **{soma_dif} TA**.\n")

        # (b) turma × semana
        if not leitura.impressao_alinhada:
            relatorio.append("### (b) DSA × IMPRESSÃO\n\n⚠️ **Não conferido**: a aba IMPRESSÃO desta planilha não é alinhada com o PREENCHIMENTO.\n")
        else:
            diferencas, classes = conferir_semanas(turma, leitura, plano, dsa[turma], decisoes)
            todas.extend(diferencas)
            sem_dif = classes.pop(("=", "blocos sem diferenca", ""), 0)
            relatorio.append(f"### (b) DSA do sistema × IMPRESSÃO — {len(leitura.blocos)} blocos, {sem_dif} sem diferença nenhuma\n")
            relatorio.append("| Classe | Campo | Diferença | Blocos |")
            relatorio.append("| --- | --- | --- | ---: |")
            for (classe, campo, texto), n in sorted(classes.items(), key=lambda x: (x[0][0], -x[1])):
                relatorio.append(f"| {classe} | {campo} | {texto} | {n} |")
            # Relogio por semana (item 3e da decisao de 06/10/2026): divergencia pontual e erro de planilha;
            # a que se repete, estavel, a partir de uma semana, e candidata a vigencia nova — listada aqui.
            por_semana: dict[str, Counter] = {}
            for d in diferencas:
                if d["campo"] == "horario" and "IMPRESSAO «" in d["diferenca"]:
                    semana = date.fromisoformat(d["data"]).isocalendar()
                    por_semana.setdefault(f"{semana[0]}-{semana[1]:02d}", Counter())[d["diferenca"]] += 1
            if por_semana:
                relatorio.append(f"\nHorário da IMPRESSÃO ≠ tabela HORÁRIOS, por semana ({len(por_semana)} semana(s)):")
                for semana, c in sorted(por_semana.items()):
                    relatorio.append(f"- semana {semana}: {sum(c.values())} bloco(s) — " + "; ".join(f"{k} ({v}×)" for k, v in c.most_common(3)))
            painel = painel_por_semana(caminho)
            divergem = []
            for chave_da_semana, semana in sorted(dsa[turma]["semanas"].items()):
                for d in semana["quadro"]:
                    esperado = painel.get(chave_da_semana, {}).get(d["codigo"])
                    if esperado is not None and esperado[1] is not None and esperado[1] != d["cumprida"]:
                        divergem.append(f"semana {chave_da_semana} · {d['codigo']}: sistema {d['cumprida']} × painel da planilha {esperado[1]}")
            semanas_com_quadro = sum(1 for s in dsa[turma]["semanas"].values() if s["quadro"])
            relatorio.append(f"\nCH acumulada do rodapé × painel da planilha: {semanas_com_quadro} semanas com rodapé, **{len(divergem)} divergência(s)**.")
            relatorio.extend(f"- {d}" for d in divergem[:40])
            if len(divergem) > 40:
                relatorio.append(f"- … e mais {len(divergem) - 40}")
            relatorio.append("")

        # (d) substituicao
        d = banco.consultar(arg.destino, f"""
            with t as (select id from public.turmas where codigo = {lit(turma)})
            select (select count(*) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'inativo') as etl_aulas_inativas,
                   (select count(*) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'ativo') as etl_aulas_ativas,
                   (select count(*) from public.avaliacoes where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'cancelada') as etl_aval_canceladas,
                   (select count(*) from public.avaliacoes where turma_id = (select id from t) and origem_migracao_v1 is not null and status <> 'cancelada') as etl_aval_ativas,
                   (select count(*) from public.atividades_nao_letivas where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'inativo') as etl_ativ_inativas,
                   (select count(*) from public.atividades_nao_letivas where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'ativo') as etl_ativ_ativas,
                   (select count(*) from public.registros_aula where turma_id = (select id from t) and codigo like 'DSAP-%' and status = 'ativo') as novas_aulas,
                   (select count(*) from public.avaliacoes where turma_id = (select id from t) and codigo like 'DSAP-%' and status <> 'cancelada') as novas_aval,
                   (select count(*) from public.atividades_nao_letivas where turma_id = (select id from t) and codigo like 'DSAP-%' and status = 'ativo') as novas_ativ""")[0]
        relatorio.append("### (d) Substituição\n")
        relatorio.append(f"ETL inativado: {d['etl_aulas_inativas']} aulas, {d['etl_aval_canceladas']} avaliações, {d['etl_ativ_inativas']} atividades "
                         f"(ainda ativos: {d['etl_aulas_ativas']}, {d['etl_aval_ativas']}, {d['etl_ativ_ativas']}). "
                         f"Da planilha: {d['novas_aulas']} aulas, {d['novas_aval']} avaliações, {d['novas_ativ']} atividades.\n")

    # (c) conflitos entre turmas
    conflitos = banco.consultar(arg.destino, """
        select a.data, ta.codigo as turma_a, tb.codigo as turma_b, a.ta_inicial as a_ini, a.ta_final as a_fim,
               b.ta_inicial as b_ini, b.ta_final as b_fim,
               case when a.instrutor_id is not null and a.instrutor_id = b.instrutor_id then 'instrutor ' || i.codigo else 'sala ' || a.local end as motivo
          from public.vw_ocupacao_ta a
          join public.vw_ocupacao_ta b on b.data = a.data and a.turma_id < b.turma_id
               and not a.herdado and not b.herdado  -- a posicao herdada do ETL e sentinela, nao TA
               and a.ta_inicial <= b.ta_final and b.ta_inicial <= a.ta_final
               and ((a.instrutor_id is not null and a.instrutor_id = b.instrutor_id)
                 or (a.local is not null and b.local is not null and app.normalizar_texto(a.local) = app.normalizar_texto(b.local)))
          join public.turmas ta on ta.id = a.turma_id join public.turmas tb on tb.id = b.turma_id
          left join public.instrutores i on i.id = a.instrutor_id
         where a.data between '2026-01-01' and '2026-12-31'
         order by 1, 2, 3, 4""")
    relatorio.append("\n## (c) Conflitos entre turmas — mesmo dia, TA sobrepostos\n")
    por_motivo = Counter((c["turma_a"], c["turma_b"], c["motivo"]) for c in conflitos)
    relatorio.append(f"{len(conflitos)} sobreposição(ões).\n")
    if conflitos:
        relatorio.append("| Turma | Turma | Motivo | Ocorrências | Datas |")
        relatorio.append("| --- | --- | --- | ---: | --- |")
        for (ta, tb, motivo), n in sorted(por_motivo.items(), key=lambda x: -x[1]):
            datas = sorted({c["data"][8:10] + "/" + c["data"][5:7] for c in conflitos if (c["turma_a"], c["turma_b"], c["motivo"]) == (ta, tb, motivo)})
            relatorio.append(f"| {ta} | {tb} | {motivo} | {n} | {', '.join(datas[:12])}{' …' if len(datas) > 12 else ''} |")

    (arg.saida / "verificacao.md").write_text("# Verificação automática — sistema × planilhas de controle\n" + "\n".join(relatorio) + "\n", encoding="utf-8")
    (arg.saida / "diferencas-bloco-a-bloco.json").write_text(json.dumps(todas, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\n".join(relatorio))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
