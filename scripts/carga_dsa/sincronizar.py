"""Sincronizacao das turmas com as planilhas de controle — o comando unico da VIRADA-1.

    python -m scripts.carga_dsa.sincronizar --rodada planilhas-de-origem/rodadas/<carimbo> \
        --destino local|remoto --autor <codigo> [--autor-local <codigo>] \
        [--turmas "CAHO 2026,C-Ap-HN 2026"] [--provisorio] [--gravar]

A FONTE E A PLANILHA, e o sistema e espelho *(decisao de Bernardo Villas Boas, 06/10/2026)*: uma
planilha por turma (`fontes.json`), exportada do Drive para a pasta da RODADA, com data e hora no
nome — todo resultado sai de uma exportacao que fica guardada, e por isso se reproduz.

O QUE UMA RODADA FAZ, por turma, numa transacao so:
  1. SUBSTITUI, NAO SOMA — o que veio do ETL sai por exclusao LOGICA, com a marca
     «[SUBSTITUIDO PELA PLANILHA DE CONTROLE]». Em `avaliacoes`, que nao tem ativo/inativo, a forma
     e `status = substituida_pela_planilha`, com o status anterior em `status_anterior` e na marca
     (spec 014, FR-047, desde a D-7). Nada e apagado (regra 4).
  2. INSERE o que e novo, ATUALIZA o que mudou e INATIVA o que saiu da planilha. O codigo de cada
     linha e derivado da turma e da LINHA da planilha em que o bloco comeca: a mesma celula da o
     mesmo codigo em toda rodada.
  3. Rodar de novo, sem a planilha mudar, da ZERO mudanca — e o programa confere isso.

⚠️ `--provisorio` SO EXISTE CONTRA O LOCAL. Ele carrega o que da para carregar sem cadastro novo
   (aula de instrutor sem habilitacao, por exemplo) para a verificacao andar, e lista o resto. Contra
   o remoto, qualquer pendencia que bloqueia PARA a turma inteira: cadastro so entra pelo lote de
   decisoes aprovado.

⚠️ O QUE A TELA FEZ VENCE A PLANILHA *(decisoes A3.3 e A3.4 de Bernardo Villas Boas, 14/10/2026)*:
   - VIRADA POR TURMA: `fontes.json` pode trazer `virada` (AAAA-MM-DD) na turma. Dali em diante o SISTEMA
     e a fonte dela: a rodada so cobre as datas ANTERIORES, e nao toca em nada da virada para frente.
   - A linha da planilha EDITADA NA TELA (`editado_por` preenchido — so a sessao o carimba; a carga roda
     sem sessao) e a avaliacao CANCELADA na tela nao sao desfeitas: saem do plano e vao para a lista
     «planilha diverge do sistema», na pasta da rodada (fora do git), para os operadores.
   - O lancamento NASCIDO na tela fica como esta; a linha da planilha no mesmo tempo sai do plano e vai
     para a mesma lista. Ele ja NAO para a turma.
   - A pendencia de responsavel (A3.2) trava SO A LINHA: ela fica fora e listada, o resto entra.

SAIDA: 0 passou · 2 planilha ou rodada · 3 pendencia que bloqueia · 4 recusa do banco ·
5 a conferencia apos a escrita divergiu · 6 o plano do remoto nao e o do local ·
7 o catalogo (CH de disciplina ou UE) mudou durante a execucao (spec 014, SC-008).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

from scripts.carga_dsa import banco, planilha, relogio
from scripts.carga_dsa.banco import lit
from scripts.carga_dsa.resolver import MARCA_DE_DEMAIS, Pendencia, Resolvido, classificar_pela_descricao, normalizar, resolver, slug

AQUI = Path(__file__).parent
MARCA_DO_ETL = "[SUBSTITUIDO PELA PLANILHA DE CONTROLE]"
MARCA_DE_SAIDA = "[SAIU DA PLANILHA DE CONTROLE]"
# Spec 014 (FR-022, D-3 do plan): a linha TAD que era dia parado sai com esta marca e entra em `dias_parados`.
MARCA_DE_RECLASSIFICACAO = "[RECLASSIFICADO PELA SPEC 014]"
SENTINELA = "ENSAIO_DESFEITO"

# Os campos COMPARADOS de cada tabela, em chaves naturais. `observacoes` fica de fora de proposito:
# guarda a procedencia de quando a linha entrou, e so e regravada quando outro campo muda.
CAMPOS = {
    "aulas": ("data", "ta_inicial", "tempos_consumidos", "ue", "disciplina_sem_ue", "instrutor", "metodologia", "local", "conteudo_resumo", "demais",
              "outros_instrutores"),
    # Spec 014 (PR 6): a vista e SESSAO (`sessoes`, comparada pela lista normalizada); o item do curriculo e o 2º
    # instrutor entram na comparacao. As colunas de vista unica sairam: a sincronizacao as grava nulas.
    # Emenda de 15/10/2026 (desenho aprovado em 16/10/2026): as sessoes de APLICACAO 2..N (`aplicacoes`, RN-AV-12) e o
    # instrumento gravado da prova sem item (A2) tambem.
    "avaliacoes": ("disciplina", "tipo_avaliacao", "data_avaliacao", "ta_inicial", "tempos_consumidos", "instrutor", "fiscal",
                   "nome_fiscal_externo", "metodologia", "local", "conteudo_resumo", "item", "ues_abordadas", "outros_instrutores", "sessoes",
                   "aplicacoes", "instrumento_gravado"),
    "atividades": ("categoria_normativa", "data", "subtipo", "descricao", "ta_inicial", "tempos_consumidos", "local", "instrutor", "responsavel_externo"),
    "dias_parados": ("data", "ta_inicial", "tempos", "tipo_parada", "motivo", "prevista"),
}


def _demais(linha: dict) -> str:
    return linha["observacoes"].split(MARCA_DE_DEMAIS, 1)[1] if MARCA_DE_DEMAIS in linha.get("observacoes", "") else ""


DATA_DE = {"aulas": "data", "avaliacoes": "data_avaliacao", "atividades": "data", "dias_parados": "data"}
TABELA_DE = {"aulas": "registros_aula", "avaliacoes": "avaliacoes", "atividades": "atividades_nao_letivas", "dias_parados": "dias_parados"}


CAMPOS_DA_SESSAO = ("codigo", "numero", "data", "ta_inicial", "tempos_consumidos", "local", "conduz", "conduz_nome_externo")
CAMPOS_DA_APLICACAO = ("codigo", "numero", "data", "ta_inicial", "tempos_consumidos", "local")


def _sessoes(valor: object, campos: tuple[str, ...] = CAMPOS_DA_SESSAO) -> list[tuple] | None:
    """As sessoes (de vista ou de aplicacao) como lista comparavel: as do banco e as do plano, com as mesmas chaves."""
    if not valor:
        return None
    return sorted(tuple(str(v.get(c))[:10] if c == "data" and v.get(c) else (str(v.get(c)) if v.get(c) is not None else None)
                        for c in campos) for v in valor)  # type: ignore[union-attr]


def _comparavel(campo: str, valor: object) -> object:
    if campo == "sessoes":
        return _sessoes(valor)
    if campo == "aplicacoes":
        return _sessoes(valor, CAMPOS_DA_APLICACAO)
    if campo == "outros_instrutores":
        return sorted(str(x) for x in valor) or None if isinstance(valor, list) else (valor or None)
    return valor or None


def _campos_que_diferem(nome: str, atual: dict, linha: dict) -> list[tuple[str, object, object]]:
    esperado = {**linha, "demais": _demais(linha)} if nome == "aulas" else linha
    return [(c, atual.get(c), esperado.get(c)) for c in CAMPOS[nome]
            if _comparavel(c, atual.get(c)) != _comparavel(c, esperado.get(c))]


def _faixa(data: object, ta: object, tempos: object) -> tuple[str, int, int]:
    """(dia, primeiro TA, ultimo TA); sem TA, o dia inteiro."""
    if ta is None:
        return str(data)[:10], 1, 99
    return str(data)[:10], int(ta), int(ta) + max(int(tempos or 1), 1) - 1


def proteger(res: Resolvido, ref: dict, virada: str | None) -> tuple[dict[str, set[str]], list[dict]]:
    """Decisoes A3.3 e A3.4 (Bernardo Villas Boas, 14/10/2026): o que a sincronizacao NAO toca.

    Tira do plano, NO LUGAR, o que e da virada para frente, o que foi editado ou cancelado na tela e o que
    cai no mesmo tempo de um lancamento nascido na tela. Devolve, por tabela, os codigos que o banco ja
    tem e que a rodada nao pode atualizar nem inativar, e a lista «planilha diverge do sistema».
    """
    atuais = ref["atuais"]
    planos = {"aulas": res.aulas, "avaliacoes": res.avaliacoes, "atividades": res.atividades, "dias_parados": res.dias_parados}
    protegidas: dict[str, set[str]] = {nome: set() for nome in planos}
    diverge: list[dict] = []

    def anotar(nome: str, codigo: str, data: object, motivo: str, campos: list | None = None) -> None:
        diverge.append({"tabela": TABELA_DE[nome], "codigo": codigo, "data": str(data)[:10], "motivo": motivo,
                        "campos": "; ".join(f"{c}: sistema «{a}» × planilha «{n}»" for c, a, n in (campos or []))})

    # 1. A virada: da data para frente o sistema e a fonte; nada da planilha entra, nada do banco sai.
    if virada:
        for nome, plano in planos.items():
            plano[:] = [l for l in plano if str(l[DATA_DE[nome]])[:10] < virada]
            protegidas[nome] |= {a["codigo"] for a in atuais.get(nome, []) if str(a[DATA_DE[nome]])[:10] >= virada}
        ja = {a["codigo"] for a in atuais.get("avaliacoes", [])}
        for a in list(res.avaliacoes):
            # As sessoes de vista E as de aplicacao (RN-AV-12): o que cai da virada em diante e do sistema.
            depois = [v for chave in ("sessoes", "aplicacoes") for v in a.get(chave, []) if str(v["data"])[:10] >= virada]
            if depois:
                if a["codigo"] in ja:  # prova antes, sessao depois: a linha ja existe e fica com o sistema
                    protegidas["avaliacoes"].add(a["codigo"])
                    res.avaliacoes.remove(a)
                else:  # prova nova antes da virada: entra so com as sessoes de antes; as de depois sao do sistema
                    for chave in ("sessoes", "aplicacoes"):
                        a[chave] = [v for v in a.get(chave, []) if str(v["data"])[:10] < virada]

    # 1b. A linha que ficou FORA por pendencia de responsavel (A3.2) e ja esta no banco: intocada ate a decisao.
    protegidas["atividades"] |= {a["codigo"] for a in atuais.get("atividades", []) if a["codigo"] in getattr(res, "pendentes", set())}

    # 2. Editada na tela (A3.4) ou avaliacao cancelada na tela (FR-049): vence a planilha.
    for nome, plano in planos.items():
        por_codigo = {a["codigo"]: a for a in atuais.get(nome, [])}
        protegidas[nome] |= {c for c, a in por_codigo.items() if a.get("na_tela") or a.get("status") == "cancelada_na_tela"}
        for linha in list(plano):
            atual = por_codigo.get(linha["codigo"])
            if atual is None or linha["codigo"] not in protegidas[nome]:
                continue
            plano.remove(linha)
            if atual.get("status") == "cancelada_na_tela":
                anotar(nome, linha["codigo"], linha[DATA_DE[nome]], "a planilha tem a avaliacao; o sistema a CANCELOU na tela")
            elif atual.get("status") != "ativo":
                anotar(nome, linha["codigo"], linha[DATA_DE[nome]], "a planilha tem a linha; o sistema a INATIVOU na tela")
            else:
                campos = _campos_que_diferem(nome, atual, linha)
                if campos:
                    anotar(nome, linha["codigo"], linha[DATA_DE[nome]], "linha EDITADA na tela; o sistema manteve o valor dele", campos)

    # 3. O dia parado cuja linha TAD antiga (…-N) foi editada na tela: a TAD fica, o dia parado nao entra.
    for d in list(res.dias_parados):
        if d["codigo"][:-1] + "N" in protegidas["atividades"]:
            res.dias_parados.remove(d)
            anotar("dias_parados", d["codigo"], d["data"], "a planilha marca o dia parado; a linha da atividade foi editada na tela e fica")

    # 4. Lancamento NASCIDO na tela antes da virada: a linha da planilha no mesmo tempo sai do plano.
    ocupado = [(_faixa(l["data"], l["ta_inicial"], l["tempos"]), l["codigo"]) for l in ref.get("de_tela_linhas", []) if l.get("data")]
    if ocupado:
        for nome, plano in planos.items():
            for linha in list(plano):
                if nome == "dias_parados":
                    faixas = [_faixa(linha["data"], linha["ta_inicial"], linha["tempos"])]
                elif nome == "avaliacoes":
                    faixas = [_faixa(linha["data_avaliacao"], linha["ta_inicial"], linha["tempos_consumidos"])]
                    faixas += [_faixa(v["data"], v["ta_inicial"], v["tempos_consumidos"])
                               for chave in ("sessoes", "aplicacoes") for v in linha.get(chave, [])]
                else:
                    faixas = [_faixa(linha["data"], linha["ta_inicial"], linha["tempos_consumidos"])]
                choque = [c for (dia, i, f), c in ocupado for (d2, i2, f2) in faixas if dia == d2 and i <= f2 and i2 <= f]
                if choque:
                    plano.remove(linha)
                    protegidas[nome].add(linha["codigo"])
                    anotar(nome, linha["codigo"], linha[DATA_DE[nome]],
                           f"no mesmo tempo ha lancamento feito na tela ({', '.join(sorted(set(choque)))}); fica o do sistema")
    return protegidas, diverge


def diferencas(res: Resolvido, atuais: dict, protegidas: dict[str, set[str]] | None = None) -> dict:
    """Plano × o que ja esta no banco: novas, mudadas (campo a campo), reativadas e as que saem.

    `protegidas` (A3.3/A3.4): o que a rodada nao toca nunca entra em «saem»."""
    protegidas = protegidas or {}
    saida = {}
    for nome, plano in (("aulas", res.aulas), ("avaliacoes", res.avaliacoes), ("atividades", res.atividades),
                        ("dias_parados", res.dias_parados)):
        por_codigo = {a["codigo"]: a for a in atuais.get(nome, [])}
        novas, mudadas, reativadas = [], [], []
        for linha in plano:
            atual = por_codigo.get(linha["codigo"])
            if atual is None:
                novas.append(linha["codigo"])
                continue
            campos = _campos_que_diferem(nome, atual, linha)
            if campos:
                mudadas.append((linha["codigo"], campos))
            elif atual["status"] == "cancelada_na_tela":
                # Spec 014, FR-049 e D-AA-10: a cancelada pela TELA continua cancelada — nao e reativada.
                continue
            elif atual["status"] != "ativo":
                reativadas.append(linha["codigo"])
        do_plano = {l["codigo"] for l in plano}
        saem = sorted(c for c, a in por_codigo.items()
                      if c not in do_plano and a["status"] == "ativo" and c not in protegidas.get(nome, set()))
        saida[nome] = {"novas": novas, "mudadas": mudadas, "reativadas": reativadas, "saem": saem}
    return saida


def _valores(linhas: list[list[object]]) -> str:
    return ",\n    ".join("(" + ", ".join(lit(v) for v in linha) + ")" for linha in linhas)


def plano_do_relogio(leitura: planilha.Leitura, ref: dict, res: Resolvido, titulo_da_planilha: str, decisao: dict | None = None) -> list[dict]:
    """Para cada vigencia ativa do curso no periodo da turma: o que muda para o relogio ser o da aba HORARIOS.

    Decisao de Bernardo Villas Boas, 06/10/2026 (item 3 do lote da onda 1): a fonte do relogio e a aba
    HORARIOS; o Estudo Individual e o tempo seguinte ao ultimo TA, com o horario desse tempo na tabela.
    A celula da tabela que nao reconstroi com os cinco campos vai para a lista de erros de planilha.
    """
    planos: list[dict] = []
    for vig in ref.get("vigencias", []):
        regime, criterio = relogio.escolher(leitura.horarios, vig)
        if regime is None:
            planos.append({"vigencia": vig, "novo": None, "criterio": criterio, "erros": []})
            continue
        # D1 (06/10/2026): o EI fora da tabela HORARIOS vive num catalogo de horario que a decisao nomeia;
        # a vigencia passa a apontar para ele, e o catalogo e conferido contra a tabela nos tempos dela.
        catalogo_id = None
        # `catalogo` e um codigo (vale para toda vigencia) ou um dicionario por tipo_regime (`{"excecao": "CFG-G"}`):
        # nos cursos regulares a padrao e a excecao convivem, e o DSA usa a excecao quando as duas cobrem o dia.
        pedido = decisao.get("catalogo") if decisao else None
        if isinstance(pedido, dict):
            pedido = pedido.get(vig["tipo_regime"])
        if pedido:
            cat = ref.get("catalogos", {}).get(pedido)
            if cat is None:
                res.pendencias.append(Pendencia("catalogo_ausente", res.turma["codigo"], f"o catalogo {pedido} (D1) nao existe no destino: rode o preparo antes", 0, True, pedido))
                planos.append({"vigencia": vig, "novo": None, "criterio": f"catalogo {pedido} ausente no destino", "erros": []})
                continue
            catalogo_id = cat["id"]
            for e in relogio.conferir_catalogo(cat["tempos"], regime):
                res.erros_de_planilha.append(f"catalogo {pedido} x aba HORARIOS: {e}")
        novo = relogio.correcao(vig, regime, catalogo_id)
        erros = [f"aba HORARIOS, tempo {t} x {q} TA: «{p}» na planilha; pelos cinco campos do relogio seria «{r}»" for t, q, p, r in regime.erros]
        for e in erros:
            if e not in res.erros_de_planilha:
                res.erros_de_planilha.append(e)
        if novo is not None:
            novo["motivo"] = (
                f"Relogio lido da aba HORARIOS da planilha de controle «{titulo_da_planilha}» ({criterio}). "
                f"Substitui {vig['codigo']} ({str(vig['hora_inicio_manha'])[:5]}, {vig['intervalo_manha_min']}/{vig['intervalo_tarde_min']} min, "
                f"{str(vig['hora_inicio_tarde'])[:5]}, {vig['regime_tempos']}x{vig['ta_duracao_min']} min"
                + (", com catalogo" if vig.get("configuracao_horario_id") else "")
                + "), cancelada com os lancamentos do ETL ja inativados. "
                "Decisao de Bernardo Villas Boas, 06/10/2026 (VIRADA-1, lote da onda 1, item 3)."
            )
        planos.append({"vigencia": vig, "novo": novo, "criterio": criterio, "erros": erros})
    return planos


def sql_do_relogio(res: Resolvido, planos: list[dict], ensaio: bool) -> str:
    """Entre inativar o ETL e carregar a planilha: cancela a vigencia e registra a certa, desde o inicio.

    ⚠️ NO ENSAIO NAO SE REGISTRA — `registrar_vigencia_regime` consome `REG-` da sequencia, e sequencia
       nao obedece a `ROLLBACK` (gotcha 6). O ensaio prova o que importa: que, com o ETL inativado,
       nada mais trava a vigencia (emenda da RN-2027-09, migration 20261006210242).
    """
    c = lit(res.turma["curso_id"]) + "::uuid"
    p: list[str] = []
    for plano in planos:
        vig, novo = plano["vigencia"], plano["novo"]
        if novo is None:
            continue
        corpo = dict(novo)
        corpo.update({
            "tipo_regime": vig["tipo_regime"], "vigente_de": vig["vigente_de"], "vigente_ate": vig["vigente_ate"],
            "limite_diario_ead_horas": vig["limite_diario_ead_horas"], "fundamento_curricular": vig["fundamento_curricular"],
        })
        v = lit(vig["id"]) + "::uuid"
        de = lit(vig["vigente_de"]) + "::date"
        p.append(f"""
  perform 1 from public.curso_regime_historico where id = {v} and status = 'ativo'
     and ta_duracao_min = {int(vig['ta_duracao_min'])} and regime_tempos = {int(vig['regime_tempos'])}
     and hora_inicio_manha = {lit(str(vig['hora_inicio_manha'])[:5])}::time and hora_inicio_tarde = {lit(str(vig['hora_inicio_tarde'])[:5])}::time;
  if not found then raise exception 'A vigencia % nao esta mais como o plano a leu: pare e confira.', {lit(vig['codigo'])}; end if;
  if exists (select 1 from app.lancamentos_que_travam_vigencia({v}, {de})) then
    raise exception 'A vigencia % ainda tem lancamento ativo que a trava depois de inativar o ETL: %', {lit(vig['codigo'])},
      (select tipo || ' ' || data || ' ' || coalesce(turma, '') || ' (' || total || ')' from app.lancamentos_que_travam_vigencia({v}, {de}));
  end if;""")
        if not ensaio:
            p.append(f"""
  update public.curso_regime_historico set status = 'cancelado' where id = {v};
  perform public.registrar_vigencia_regime({c}, {lit(json.dumps(corpo, default=str))}::jsonb);""")
        p.append("\n  r := r + 1;")
    return "".join(p)


def sql_da_turma(res: Resolvido, incluir_calendario: bool, abrangencia: str | None, ensaio: bool, relogios: list[dict] | None = None,
                 virada: str | None = None, protegidas: dict[str, set[str]] | None = None) -> str:
    """Um bloco `DO` por turma — atomico. No ensaio ele termina levantando a sentinela.

    ⚠️ NENHUM CODIGO SAI DE SEQUENCIA (gotcha 6: sequencia nao obedece a `ROLLBACK`): o ensaio nao
       consome numero. A unica excecao e `feriados.codigo`, que desde a spec 014 (E-2) sai do DEFAULT
       `FER-` — o ensaio pode consumir um numero da sequencia, o que so deixa buraco, nunca colisao.
    """
    t, c, autor = lit(res.turma["id"]) + "::uuid", lit(res.turma["curso_id"]) + "::uuid", lit(res.autor["auth_user_id"]) + "::uuid"
    prefixo = f"DSAP-{slug(res.turma['codigo'])}-L"
    p: list[str] = []
    # A3.3: o ETL so sai ANTES da virada; da virada para frente nada e tocado.
    antes = (lambda col: f" and {col} < {lit(virada)}::date") if virada else (lambda col: "")  # noqa: E731
    protegidas = protegidas or {}
    intocadas = lambda nome: "array[" + ", ".join(lit(x) for x in sorted(protegidas.get(nome, set()))) + "]::text[]"  # noqa: E731

    # 1. substituir, nao somar
    p.append(f"""
  update public.registros_aula set status = 'inativo', observacoes = concat_ws(' ', {lit(MARCA_DO_ETL)}, observacoes)
   where turma_id = {t} and origem_migracao_v1 is not null and status = 'ativo'{antes('data')};
  get diagnostics n := row_count; k := k || jsonb_build_object('etl_aulas', n);
  update public.atividades_nao_letivas set status = 'inativo', observacoes = concat_ws(' ', {lit(MARCA_DO_ETL)}, observacoes)
   where turma_id = {t} and origem_migracao_v1 is not null and status = 'ativo'{antes('data')};
  get diagnostics n := row_count; k := k || jsonb_build_object('etl_atividades', n);
  -- Spec 014 (FR-047, D-7): a avaliacao do ETL substituida pela planilha vai para o estado proprio, com o
  -- status anterior guardado — nunca mais `cancelada`, que e o que a TELA faz (FR-049).
  update public.avaliacoes set observacoes = concat_ws(' ', {lit(MARCA_DO_ETL)} || ' (status anterior: ' || status::text || ')', observacoes),
         status_anterior = status, status = 'substituida_pela_planilha'
   where turma_id = {t} and origem_migracao_v1 is not null and status in ('pendente', 'em_andamento', 'concluida', 'atrasada'){antes('data_avaliacao')};
  get diagnostics n := row_count; k := k || jsonb_build_object('etl_avaliacoes', n);""")

    # 1b. o relogio do curso: com o ETL ja fora do caminho e antes de a planilha entrar (ordem do item 3b)
    p.append(sql_do_relogio(res, relogios or [], ensaio))
    p.append("  k := k || jsonb_build_object('relogio_corrigido', r);")

    # 2. inserir o novo e atualizar o que mudou
    if res.aulas:
        p.append(f"""
  with dados(codigo, data, ue, disciplina, instrutor, ta, tempos, conteudo, metodologia, local, obs, outros) as (values
    {_valores([[a["codigo"], a["data"], a["unidade_ensino_id"], a["disciplina_id"], a["instrutor_id"], a["ta_inicial"], a["tempos_consumidos"], a["conteudo_resumo"], a["metodologia"], a["local"], a["observacoes"], ",".join(a.get("outros_instrutores") or [])] for a in res.aulas])}
  ), gravadas as (
    insert into public.registros_aula as r
      (codigo, data, turma_id, curso_id, unidade_ensino_id, disciplina_id, instrutor_id, ta_inicial,
       tempos_consumidos, conteudo_resumo, metodologia, local, observacoes, outros_instrutores, criado_por)
    select d.codigo, d.data::date, {t}, {c}, d.ue::uuid, d.disciplina::uuid, d.instrutor::uuid, d.ta::smallint,
           d.tempos::smallint, d.conteudo, d.metodologia, d.local, d.obs,
           coalesce(string_to_array(nullif(d.outros, ''), ','), '{{}}'::text[]), {autor}
      from dados d
    on conflict (codigo) do update set
       data = excluded.data, unidade_ensino_id = excluded.unidade_ensino_id, disciplina_id = excluded.disciplina_id,
       instrutor_id = excluded.instrutor_id, ta_inicial = excluded.ta_inicial, tempos_consumidos = excluded.tempos_consumidos,
       conteudo_resumo = excluded.conteudo_resumo, metodologia = excluded.metodologia, local = excluded.local,
       observacoes = excluded.observacoes, outros_instrutores = excluded.outros_instrutores, status = 'ativo'
     where (r.data, r.unidade_ensino_id, r.disciplina_id, r.instrutor_id, r.ta_inicial, r.tempos_consumidos,
            r.conteudo_resumo, r.metodologia, r.local, r.status::text,
            split_part(coalesce(r.observacoes, ''), {lit(MARCA_DE_DEMAIS)}, 2), r.outros_instrutores)
       is distinct from
           (excluded.data, excluded.unidade_ensino_id, excluded.disciplina_id, excluded.instrutor_id, excluded.ta_inicial,
            excluded.tempos_consumidos, excluded.conteudo_resumo, excluded.metodologia, excluded.local, 'ativo',
            split_part(coalesce(excluded.observacoes, ''), {lit(MARCA_DE_DEMAIS)}, 2), excluded.outros_instrutores)
    returning (xmax = 0) as nova
  ) select count(*) filter (where nova), count(*) filter (where not nova) into n, m from gravadas;
  k := k || jsonb_build_object('aulas_novas', n, 'aulas_atualizadas', m);""")

    if res.avaliacoes:
        p.append(f"""
  with dados(codigo, disciplina, tipo, data, ta, tempos, instrutor, fiscal, fiscal_externo, conteudo, metodologia, local,
             item, ues, outros, obs, instrumento) as (values
    {_valores([[a["codigo"], a["disciplina_id"], a["tipo_avaliacao"], a["data_avaliacao"], a["ta_inicial"], a["tempos_consumidos"], a["instrutor_responsavel_id"], a["fiscal_id"], a["nome_fiscal_externo"], a["conteudo_resumo"], a["metodologia"], a["local"], a.get("avaliacao_curriculo_id"), a.get("ues_abordadas"), ",".join(a.get("outros_instrutores") or []), a["observacoes"], a.get("instrumento_gravado")] for a in res.avaliacoes])}
  ), gravadas as (
    -- Spec 014 (PR 6): as colunas de vista unica vao NULAS (a vista e sessao, gravada abaixo); na linha que as tinha,
    -- o espelho da E-5 inativa a sessao 1 espelhada, e a sessao da planilha a substitui com o codigo `…-S`.
    insert into public.avaliacoes as r
      (codigo, turma_id, curso_id, disciplina_id, tipo_avaliacao, data_avaliacao, ta_inicial, tempos_consumidos,
       instrutor_responsavel_id, fiscal_id, nome_fiscal_externo, conteudo_resumo, metodologia, local,
       data_vista_prova, ta_inicial_vista, tempos_consumidos_vista, local_vista, avaliacao_curriculo_id, ues_abordadas,
       outros_instrutores, observacoes, instrumento_id, criado_por)
    select d.codigo, {t}, {c}, d.disciplina::uuid, d.tipo, d.data::date, d.ta::smallint, d.tempos::smallint,
           d.instrutor::uuid, d.fiscal::uuid, d.fiscal_externo, d.conteudo, d.metodologia, d.local,
           null, null, null, null, d.item::uuid, d.ues, coalesce(string_to_array(nullif(d.outros, ''), ','), '{{}}'::text[]),
           d.obs, l.id, {autor}
      from dados d
      -- A2 (16/10/2026): o instrumento da prova SEM item, pelo valor da lista; com item, o plano manda nulo.
      left join public.config_listas l on l.lista = 'instrumentos_avaliacao' and l.valor = d.instrumento
    on conflict (codigo) do update set
       disciplina_id = excluded.disciplina_id, tipo_avaliacao = excluded.tipo_avaliacao, data_avaliacao = excluded.data_avaliacao,
       ta_inicial = excluded.ta_inicial, tempos_consumidos = excluded.tempos_consumidos,
       instrutor_responsavel_id = excluded.instrutor_responsavel_id, fiscal_id = excluded.fiscal_id,
       nome_fiscal_externo = excluded.nome_fiscal_externo, conteudo_resumo = excluded.conteudo_resumo,
       metodologia = excluded.metodologia, local = excluded.local, data_vista_prova = null,
       ta_inicial_vista = null, tempos_consumidos_vista = null, local_vista = null,
       avaliacao_curriculo_id = excluded.avaliacao_curriculo_id, ues_abordadas = excluded.ues_abordadas,
       outros_instrutores = excluded.outros_instrutores, instrumento_id = excluded.instrumento_id,
       observacoes = excluded.observacoes,
       -- Spec 014 (FR-049, D-AA-10): so volta a `pendente` a que a PROPRIA sincronizacao tirou; a cancelada
       -- pela tela continua cancelada (era o defeito da `DSAP-C-EXP-OBS-ME-2026-L206-V`).
       status = case when r.status = 'cancelada' and coalesce(r.observacoes, '') like {lit('%' + MARCA_DE_SAIDA + '%')}
                     then 'pendente' else r.status end
     where (r.disciplina_id, r.tipo_avaliacao, r.data_avaliacao, r.ta_inicial, r.tempos_consumidos, r.instrutor_responsavel_id,
            r.fiscal_id, r.nome_fiscal_externo, r.conteudo_resumo, r.metodologia, r.local, r.data_vista_prova,
            r.ta_inicial_vista, r.tempos_consumidos_vista, r.local_vista, r.avaliacao_curriculo_id, r.ues_abordadas, r.outros_instrutores,
            r.instrumento_id, r.status = 'cancelada' and coalesce(r.observacoes, '') like {lit('%' + MARCA_DE_SAIDA + '%')})
       is distinct from
           (excluded.disciplina_id, excluded.tipo_avaliacao, excluded.data_avaliacao, excluded.ta_inicial, excluded.tempos_consumidos,
            excluded.instrutor_responsavel_id, excluded.fiscal_id, excluded.nome_fiscal_externo, excluded.conteudo_resumo,
            excluded.metodologia, excluded.local, null::date, null::smallint, null::smallint, null::text,
            excluded.avaliacao_curriculo_id, excluded.ues_abordadas, excluded.outros_instrutores, excluded.instrumento_id, false)
    returning (xmax = 0) as nova
  ) select count(*) filter (where nova), count(*) filter (where not nova) into n, m from gravadas;
  k := k || jsonb_build_object('avaliacoes_novas', n, 'avaliacoes_atualizadas', m);""")

    # 2b. as SESSOES de vista (spec 014, FR-041, FR-042, T226): primeiro sai a sessao ATIVA de avaliacao da planilha que
    #     nao esta no plano (inclusive a sessao 1 que o espelho da E-5 criou com codigo proprio); depois entram/mudam as
    #     da planilha, pelo codigo `…-S`. A avaliacao protegida (virada, tela) nao e tocada.
    sessoes = [(a["codigo"], v) for a in res.avaliacoes for v in a.get("sessoes", [])]
    p.append(f"""
  update public.vistas_de_avaliacao s set status = 'inativo'
    from public.avaliacoes a
   where a.id = s.avaliacao_id and a.turma_id = {t} and a.codigo like {lit(prefixo + '%')} and s.status = 'ativo'
     and not (s.codigo = any (array[{", ".join(lit(v["codigo"]) for _c, v in sessoes)}]::text[]))
     and not (a.codigo = any ({intocadas('avaliacoes')})){antes('a.data_avaliacao')};
  get diagnostics n := row_count; k := k || jsonb_build_object('sessoes_que_sairam', n);""")
    if sessoes:
        p.append(f"""
  with dados(avaliacao, codigo, numero, data, ta, tempos, local, conduz, conduz_externo) as (values
    {_valores([[c, v["codigo"], v["numero"], v["data"], v["ta_inicial"], v["tempos_consumidos"], v["local"], v["conduz"], v["conduz_nome_externo"]] for c, v in sessoes])}
  ), gravadas as (
    insert into public.vistas_de_avaliacao as r
      (codigo, avaliacao_id, numero, data, ta_inicial, tempos_consumidos, local, conduz_instrutor_id, conduz_nome_externo, criado_por)
    select d.codigo, a.id, d.numero::smallint, d.data::date, d.ta::smallint, d.tempos::smallint, d.local, i.id, d.conduz_externo, {autor}
      from dados d join public.avaliacoes a on a.codigo = d.avaliacao
      left join public.instrutores i on i.codigo::text = d.conduz
    on conflict (codigo) do update set
       avaliacao_id = excluded.avaliacao_id, numero = excluded.numero, data = excluded.data, ta_inicial = excluded.ta_inicial,
       tempos_consumidos = excluded.tempos_consumidos, local = excluded.local, conduz_instrutor_id = excluded.conduz_instrutor_id,
       conduz_nome_externo = excluded.conduz_nome_externo, status = 'ativo'
     where (r.avaliacao_id, r.numero, r.data, r.ta_inicial, r.tempos_consumidos, r.local, r.conduz_instrutor_id,
            r.conduz_nome_externo, r.status::text)
       is distinct from
           (excluded.avaliacao_id, excluded.numero, excluded.data, excluded.ta_inicial, excluded.tempos_consumidos,
            excluded.local, excluded.conduz_instrutor_id, excluded.conduz_nome_externo, 'ativo')
    returning (xmax = 0) as nova
  ) select count(*) filter (where nova), count(*) filter (where not nova) into n, m from gravadas;
  k := k || jsonb_build_object('sessoes_novas', n, 'sessoes_atualizadas', m);""")

    # 2b'. as SESSOES DE APLICACAO 2..N (RN-AV-12, desenho aprovado em 16/10/2026): o mesmo molde das de vista, por
    #      codigo `…-SA`. So as da PLANILHA (codigo DSAP-) sao tocadas: a sessao nascida na tela (SAP-, o DSA ou «juntar
    #      como sessao») fica como esta. Primeiro sai a que nao esta no plano OU mudou de prova ou de numero (o indice
    #      unico (avaliacao, numero) e por linha ativa: renumerar sem tirar antes colidiria no meio do comando).
    aplicacoes = [(a["codigo"], v) for a in res.avaliacoes for v in a.get("aplicacoes", [])]
    p.append(f"""
  with plano(codigo, avaliacao, numero) as (values
    {_valores([[v["codigo"], c, v["numero"]] for c, v in aplicacoes]) if aplicacoes else "(null::text, null::text, null::int)"}
  )
  update public.sessoes_de_aplicacao s set status = 'inativo'
    from public.avaliacoes a
   where a.id = s.avaliacao_id and a.turma_id = {t} and a.codigo like {lit(prefixo + '%')} and s.status = 'ativo'
     and s.codigo like {lit(prefixo + '%')}
     and not exists (select 1 from plano x where x.codigo = s.codigo and x.avaliacao = a.codigo and x.numero = s.numero)
     and not (a.codigo = any ({intocadas('avaliacoes')})){antes('a.data_avaliacao')};
  get diagnostics n := row_count; k := k || jsonb_build_object('aplicacoes_que_sairam', n);""")
    if aplicacoes:
        p.append(f"""
  with dados(avaliacao, codigo, numero, data, ta, tempos, local) as (values
    {_valores([[c, v["codigo"], v["numero"], v["data"], v["ta_inicial"], v["tempos_consumidos"], v["local"]] for c, v in aplicacoes])}
  ), gravadas as (
    insert into public.sessoes_de_aplicacao as r
      (codigo, avaliacao_id, numero, data, ta_inicial, tempos_consumidos, local, criado_por)
    select d.codigo, a.id, d.numero::smallint, d.data::date, d.ta::smallint, d.tempos::smallint, d.local, {autor}
      from dados d join public.avaliacoes a on a.codigo = d.avaliacao
    on conflict (codigo) do update set
       avaliacao_id = excluded.avaliacao_id, numero = excluded.numero, data = excluded.data, ta_inicial = excluded.ta_inicial,
       tempos_consumidos = excluded.tempos_consumidos, local = excluded.local, status = 'ativo'
     where (r.avaliacao_id, r.numero, r.data, r.ta_inicial, r.tempos_consumidos, r.local, r.status::text)
       is distinct from
           (excluded.avaliacao_id, excluded.numero, excluded.data, excluded.ta_inicial, excluded.tempos_consumidos,
            excluded.local, 'ativo')
    returning (xmax = 0) as nova
  ) select count(*) filter (where nova), count(*) filter (where not nova) into n, m from gravadas;
  k := k || jsonb_build_object('aplicacoes_novas', n, 'aplicacoes_atualizadas', m);""")

    # 2c. as SUGESTOES da planilha (spec 014, FR-031.8, T227): so onde nao ha ajuste ativo, ou o ajuste e sugestao ainda
    #     nao confirmada; o arbitrado e a sugestao confirmada nunca sao tocados.
    if getattr(res, "sugestoes", None):
        p.append(f"""
  with dados(item, ta, vista) as (values
    {_valores([[g["avaliacao_curriculo_id"], g["ta_aplicacao"], g["ta_vista"]] for g in res.sugestoes])}
  ), novas as (
    insert into public.avaliacoes_curriculo_turma (avaliacao_curriculo_id, turma_id, ta_aplicacao, ta_vista, origem, criado_por)
    select d.item::uuid, {t}, d.ta::smallint, d.vista::smallint, 'sugestao_planilha', {autor}
      from dados d
     where not exists (select 1 from public.avaliacoes_curriculo_turma x
                        where x.avaliacao_curriculo_id = d.item::uuid and x.turma_id = {t} and x.status = 'ativo')
    returning 1
  ), mudadas as (
    update public.avaliacoes_curriculo_turma x set ta_aplicacao = d.ta::smallint, ta_vista = d.vista::smallint
      from dados d
     where x.avaliacao_curriculo_id = d.item::uuid and x.turma_id = {t} and x.status = 'ativo'
       and x.origem = 'sugestao_planilha' and x.confirmado_em is null
       and (x.ta_aplicacao, x.ta_vista) is distinct from (d.ta::smallint, d.vista::smallint)
    returning 1
  ) select (select count(*) from novas), (select count(*) from mudadas) into n, m;
  k := k || jsonb_build_object('sugestoes_novas', n, 'sugestoes_atualizadas', m);""")

    if res.atividades:
        p.append(f"""
  with dados(codigo, categoria, data, subtipo, descricao, ta, tempos, local, instrutor, externo, obs) as (values
    {_valores([[a["codigo"], a["categoria_normativa"], a["data"], a["subtipo"], a["descricao"], a["ta_inicial"], a["tempos_consumidos"], a["local"], a["instrutor_id"], a["responsavel_externo"], a["observacoes"]] for a in res.atividades])}
  ), gravadas as (
    insert into public.atividades_nao_letivas as r
      (codigo, categoria_normativa, escopo, turma_id, data, subtipo, descricao, ta_inicial, tempos_consumidos,
       local, instrutor_id, responsavel_externo, observacoes, criado_por)
    select d.codigo, d.categoria::public.categoria_normativa, 'turma', {t}, d.data::date, d.subtipo, d.descricao,
           d.ta::smallint, d.tempos::smallint, d.local, d.instrutor::uuid, d.externo, d.obs, {autor}
      from dados d
    on conflict (codigo) do update set
       categoria_normativa = excluded.categoria_normativa, data = excluded.data, subtipo = excluded.subtipo,
       descricao = excluded.descricao, ta_inicial = excluded.ta_inicial, tempos_consumidos = excluded.tempos_consumidos,
       local = excluded.local, instrutor_id = excluded.instrutor_id, responsavel_externo = excluded.responsavel_externo,
       observacoes = excluded.observacoes, status = 'ativo'
     where (r.categoria_normativa, r.data, r.subtipo, r.descricao, r.ta_inicial, r.tempos_consumidos, r.local,
            r.instrutor_id, r.responsavel_externo, r.status::text)
       is distinct from
           (excluded.categoria_normativa, excluded.data, excluded.subtipo, excluded.descricao, excluded.ta_inicial,
            excluded.tempos_consumidos, excluded.local, excluded.instrutor_id, excluded.responsavel_externo, 'ativo')
    returning (xmax = 0) as nova
  ) select count(*) filter (where nova), count(*) filter (where not nova) into n, m from gravadas;
  k := k || jsonb_build_object('atividades_novas', n, 'atividades_atualizadas', m);""")

    if res.dias_parados:
        p.append(f"""
  with dados(codigo, data, ta, tempos, tipo, motivo, prevista) as (values
    {_valores([[d["codigo"], d["data"], d["ta_inicial"], d["tempos"], d["tipo_parada"], d["motivo"], d["prevista"]] for d in res.dias_parados])}
  ), gravadas as (
    insert into public.dias_parados as r (codigo, turma_id, data, ta_inicial, tempos, tipo_parada_id, motivo, prevista, criado_por)
    select d.codigo, {t}, d.data::date, d.ta::smallint, d.tempos::smallint, c.id, d.motivo, d.prevista::boolean, {autor}
      from dados d join public.config_listas c on c.lista = 'tipos_parada' and c.valor = d.tipo
    on conflict (codigo) do update set
       data = excluded.data, ta_inicial = excluded.ta_inicial, tempos = excluded.tempos,
       tipo_parada_id = excluded.tipo_parada_id, motivo = excluded.motivo, prevista = excluded.prevista, status = 'ativo'
     where (r.data, r.ta_inicial, r.tempos, r.tipo_parada_id, r.motivo, r.prevista, r.status::text)
       is distinct from
           (excluded.data, excluded.ta_inicial, excluded.tempos, excluded.tipo_parada_id, excluded.motivo, excluded.prevista, 'ativo')
    returning (xmax = 0) as nova
  ) select count(*) filter (where nova), count(*) filter (where not nova) into n, m from gravadas;
  if (select count(*) from (values {', '.join('(' + lit(d['tipo_parada']) + ')' for d in res.dias_parados)}) as v(tipo)
       where not exists (select 1 from public.config_listas c where c.lista = 'tipos_parada' and c.valor = v.tipo)) > 0 then
    raise exception 'Tipo de parada fora de config_listas.tipos_parada no plano da turma.';
  end if;
  k := k || jsonb_build_object('dias_parados_novos', n, 'dias_parados_atualizados', m);""")

    # 3. inativar o que saiu da planilha
    codigos = res.codigos()
    # Spec 014 (FR-022): a atividade TAD da mesma linha que agora e dia parado sai com a marca de reclassificacao.
    reclassificadas = [c[:-1] + "N" for c in codigos["dias_parados"]]
    if reclassificadas:
        p.append(f"""
  update public.atividades_nao_letivas set status = 'inativo', observacoes = concat_ws(' ', {lit(MARCA_DE_RECLASSIFICACAO)}, observacoes)
   where turma_id = {t} and status = 'ativo' and codigo = any (array[{", ".join(lit(x) for x in reclassificadas)}]::text[])
     and not (codigo = any ({intocadas('atividades')}));
  get diagnostics n := row_count; k := k || jsonb_build_object('reclassificadas_para_dia_parado', n);""")
    for tabela, nome, chave, comando in (
        ("registros_aula", "aulas", "aulas_que_sairam", "status = 'inativo'"),
        ("atividades_nao_letivas", "atividades", "atividades_que_sairam", "status = 'inativo'"),
        ("avaliacoes", "avaliacoes", "avaliacoes_que_sairam", "status = 'cancelada'"),
    ):
        ativa = "status <> 'cancelada'" if tabela == "avaliacoes" else "status = 'ativo'"
        lista = "array[" + ", ".join(lit(x) for x in codigos[tabela]) + "]::text[]"
        p.append(f"""
  update public.{tabela} set {comando}, observacoes = concat_ws(' ', {lit(MARCA_DE_SAIDA)}, observacoes)
   where turma_id = {t} and codigo like {lit(prefixo + '%')} and {ativa} and not (codigo = any ({lista}))
     and not (codigo = any ({intocadas(nome)})){antes('data_avaliacao' if tabela == 'avaliacoes' else 'data')};
  get diagnostics n := row_count; k := k || jsonb_build_object({lit(chave)}, n);""")
    lista_p = "array[" + ", ".join(lit(x) for x in codigos["dias_parados"]) + "]::text[]"
    p.append(f"""
  update public.dias_parados set status = 'inativo'
   where turma_id = {t} and codigo like {lit(prefixo + '%')} and status = 'ativo' and not (codigo = any ({lista_p}))
     and not (codigo = any ({intocadas('dias_parados')})){antes('data')};
  get diagnostics n := row_count; k := k || jsonb_build_object('dias_parados_que_sairam', n);""")

    # 4. o calendario global: so o dia que parou TODAS as turmas, e so se ainda nao estiver la
    if incluir_calendario:
        for dia in res.calendario:
            p.append(f"""
  if not exists (select 1 from public.feriados where data = {lit(dia["data"])}::date and impacto = 'dia_inteiro' and status = 'ativo') then
    -- Spec 014 (E-2): o codigo sai do DEFAULT `FER-` da sequencia, nunca de `max + 1`.
    insert into public.feriados (ano, data, descricao, impacto, abrangencia, criado_por)
    values (extract(year from {lit(dia["data"])}::date)::smallint, {lit(dia["data"])}::date, {lit(dia["descricao"])}, 'dia_inteiro',
            {lit(abrangencia)}, {autor});
    f := f + 1;
  end if;""")
    p.append("  k := k || jsonb_build_object('feriados_novos', f);")

    fim = f"  raise exception '{SENTINELA} %', k::text;" if ensaio else "  null;"
    return (
        "do $carga$\ndeclare\n  n int := 0; m int := 0; f int := 0; r int := 0; k jsonb := '{}'::jsonb;\nbegin\n"
        f"  perform 1 from public.turmas where id = {t} and codigo = {lit(res.turma['codigo'])};\n"
        "  if not found then raise exception 'A turma do plano nao e a do destino.'; end if;\n"
        + "\n".join(p) + "\n\n" + fim + "\nend $carga$;\n"
    )


def dias_parados_de(leitura: planilha.Leitura, decisoes: dict) -> tuple[set[str], set[str]]:
    """(dias com lancamento, dias em que a turma PAROU o expediente) — pelo catalogo, sem banco."""
    chaves = decisoes.get("chaves", {})
    por_dia: dict[str, list[str]] = {}
    for b in leitura.blocos:
        linha = leitura.catalogo.get(b.chave)
        regra = chaves.get(f"{b.cod}+{b.ue}") or chaves.get(b.cod)
        tipo = "letivo"
        if regra is not None:
            tipo = regra["tipo"]
        elif linha is not None:
            achado = classificar_pela_descricao(linha.disciplina, linha.topico)
            if achado is not None and achado[0] in ("dia_parado", "estudo_individual"):
                tipo = achado[0]
        por_dia.setdefault(b.data.isoformat(), []).append(tipo)
    parados = {d for d, tipos in por_dia.items() if any(t in ("dia_parado", "calendario") for t in tipos)
               and all(t in ("dia_parado", "calendario", "estudo_individual") for t in tipos)}
    return set(por_dia), parados


def dias_globais_de(leituras: dict[str, planilha.Leitura], decisoes: dict[str, dict]) -> tuple[set[str], dict[str, dict]]:
    """O dia e GLOBAL quando parou TODAS as turmas que tinham planilha cobrindo aquele dia."""
    quadro: dict[str, dict] = {}
    por_turma = {t: dias_parados_de(l, decisoes[t]) for t, l in leituras.items()}
    periodo = {t: (min(com), max(com)) for t, (com, _p) in por_turma.items() if com}
    for dia in sorted({d for _c, parados in por_turma.values() for d in parados}):
        cobrem = sorted(t for t, (ini, fim) in periodo.items() if ini <= dia <= fim)
        pararam = sorted(t for t in cobrem if dia in por_turma[t][1])
        quadro[dia] = {"cobrem": cobrem, "pararam": pararam, "global": bool(cobrem) and cobrem == pararam}
    return {d for d, q in quadro.items() if q["global"]}, quadro


def _celula(texto: object) -> str:
    return " ".join(str(texto).split()).replace("|", "/")


def escrever_erros_de_planilha(pasta: Path, por_turma: list[tuple[str, Resolvido]]) -> Path:
    """FR-036.1 (spec 014, §11-B): `erros-de-planilha.md` na pasta da RODADA (fora do git), uma tabela
    por turma — disciplina · o que diverge · planilha · curriculo · o que o sistema fez. Os erros antigos,
    em texto livre, entram na coluna «o que diverge»."""
    linhas = [
        "# Erros de planilha — rodada " + pasta.name, "",
        "> Gerado por `python -m scripts.carga_dsa.sincronizar`. O lancamento entra como FATO mesmo quando a",
        "> planilha diverge (a planilha manda); o catalogo NUNCA muda por rodada (D-CUR-1). Corrigir na planilha.", "",
    ]
    for turma, res in por_turma:
        linhas += [f"## {turma}", "", "| disciplina | o que diverge | planilha | curriculo | o que o sistema fez |", "|---|---|---|---|---|"]
        for e in res.erros_tabelados:
            linhas.append("| " + " | ".join(_celula(e[c]) for c in ("disciplina", "diverge", "planilha", "curriculo", "fez")) + " |")
        for texto in res.erros_de_planilha:
            linhas.append(f"| — | {_celula(texto)} | — | — | registrado; a carga seguiu |")
        # Emenda de 15/10/2026 (RN-AV-12, RN-AV-14): o que NAO e erro de planilha, mas o operador precisa saber.
        for texto in getattr(res, "informativos", []):
            linhas.append(f"| — | {_celula(texto)} | — | — | {INFORMACAO} |")
        if not res.erros_tabelados and not res.erros_de_planilha and not getattr(res, "informativos", []):
            linhas.append("| — | nenhum erro | — | — | — |")
        linhas.append("")
    arquivo = pasta / "erros-de-planilha.md"
    arquivo.write_text("\n".join(linhas), encoding="utf-8", newline="\n")
    return arquivo


INFORMACAO = "informacao — nao e erro de planilha"


def escrever_provas_sem_casar(pasta: Path, por_turma: list[tuple[str, Resolvido]]) -> Path:
    """RN-AV-10 (emenda de 15/10/2026): a prova que nao casou com item do curriculo, com o COD, a descricao e os
    itens da disciplina LADO A LADO, para Bernardo decidir. Fora do git (a pasta da rodada)."""
    linhas = [
        "# Provas que nao casam com o curriculo — rodada " + pasta.name, "",
        "> Gerado por `python -m scripts.carga_dsa.sincronizar` (RN-AV-10: o COD da prova decide; a descricao so",
        "> desempata). Cada linha entrou como FATO, sem avaliacao do curriculo. Decidir: qual item ela cumpre, ou nenhum.", "",
        "| turma | disciplina | COD | data | TA | descricao | itens do curriculo da disciplina | por que nao casou |",
        "|---|---|---|---|---|---|---|---|",
    ]
    total = 0
    for turma, res in por_turma:
        # So o que ficou no plano: a virada (`proteger`) tira as provas da data dela em diante, e elas nao «entraram».
        no_plano = {a["codigo"] for a in res.avaliacoes}
        for x in getattr(res, "provas_sem_casar", []):
            if x.get("codigo") not in no_plano:
                continue
            total += 1
            linhas.append("| " + " | ".join(_celula(str(v)) for v in (
                turma, x["disciplina"], x["cod"], x["data"], x["ta"], x["descricao"] or "—", ", ".join(x["itens"]), x["motivo"])) + " |")
    linhas += ["", f"Total: {total} prova(s)."]
    arquivo = pasta / "provas-sem-casar.md"
    arquivo.write_text("\n".join(linhas), encoding="utf-8", newline="\n")
    return arquivo


def escrever_divergencias(pasta: Path, por_turma: list[tuple[str, list[dict]]], viradas: dict[str, str | None]) -> Path:
    """A3.4 (14/10/2026): a lista «planilha diverge do sistema», para os operadores. Fora do git — o
    valor de um campo pode trazer nome de pessoa. O que esta aqui o SISTEMA manteve; corrige-se na planilha
    (ou na tela, se a planilha estiver certa)."""
    linhas = [
        "# Planilha diverge do sistema — rodada " + pasta.name, "",
        "> Gerado por `python -m scripts.carga_dsa.sincronizar`. Regra (A3.4, 14/10/2026): a linha editada na tela",
        "> e o lancamento feito na tela VENCEM a planilha; a sincronizacao nunca os desfaz. Da data de virada da",
        "> turma em diante (A3.3), o sistema e a fonte e a rodada nao toca em nada.", "",
    ]
    for turma, lista in por_turma:
        virada = viradas.get(turma)
        linhas += [f"## {turma}" + (f" — virada em {virada}" if virada else ""), "",
                   "| tabela | codigo | data | por que o sistema manteve | campos (sistema × planilha) |", "|---|---|---|---|---|"]
        for d in lista:
            linhas.append("| " + " | ".join(_celula(d[c]) or "—" for c in ("tabela", "codigo", "data", "motivo", "campos")) + " |")
        if not lista:
            linhas.append("| — | — | — | nenhuma divergencia | — |")
        linhas.append("")
    arquivo = pasta / "planilha-diverge-do-sistema.md"
    arquivo.write_text("\n".join(linhas), encoding="utf-8", newline="\n")
    return arquivo


# Postos e graduacoes da MB, como aparecem no texto livre da planilha (para a PROPOSTA de classificacao).
_POSTO = re.compile(r"\b(ALTE|CALTE|VALTE|CMG|CF|CC|CT|1[ºO°]?\s*TEN|2[ºO°]?\s*TEN|TEN|GM|SO|[123][ºO°]?\s*SG|SG|CB|MN|SD|CAP|MAJ|CEL)\b")
_ENTIDADE = re.compile(r"\b(CIAA|CIAARA|CAPELANIA|CAPELAO|DIVISAO|DEPARTAMENTO|SECAO|SETOR|COMANDO|DHN|DPC|DENSM|MARINHA|HOSPITAL|POLICLINICA|"
                       r"BIBLIOTECA|ESCOLA|CENTRO|BASE|GRUPAMENTO|SERVICO|OM|EQUIPE|BANDA|PREFEITURA|UNIVERSIDADE|CLUBE)\b|-\d+\b")


def classificar_responsavel(texto: str, guerras: set[str]) -> str:
    """Proposta (A3.2), nunca aplicada sozinha: pessoa cadastrada provavel · entidade · palestrante externo."""
    t = normalizar(texto)
    if not re.search(r"[A-Z]", t):
        return "sem responsavel (so tracos) — proposta: deixar em branco"
    if _ENTIDADE.search(t) and not _POSTO.search(t):
        return "entidade"
    if _POSTO.search(t):
        palavras = set(re.findall(r"[A-Z]{3,}", t))
        if palavras & guerras:
            return "pessoa cadastrada provavel (casar pelo codigo)"
        return "pessoa (militar) fora do cadastro provavel — palestrante externo ou cadastrar"
    return "palestrante externo"


def escrever_pendencias_de_responsavel(pasta: Path, resolvidos: list[tuple[str, Resolvido]], guerras: set[str] | None = None) -> Path:
    """A3.2 (14/10/2026): a lista dos textos de responsavel sem decisao, com a classificacao PROPOSTA, para
    Bernardo revisar. Fora do git (o texto e nome de pessoa). Nada aqui e aplicado sem o OK dele."""
    por_texto: dict[str, dict] = {}
    for turma, res in resolvidos:
        guerras = guerras if guerras is not None else set()
        guerras |= getattr(res, "nomes_de_guerra", set())
        for pd in res.pendencias:
            # RN-RESP-1 (15/10/2026): a atividade nao gera mais `responsavel_sem_decisao`; o que sobra de pendencia de
            # responsavel e o texto fora do cadastro na AULA (bloqueia) e no APLICADOR da prova (aviso).
            if pd.tipo not in ("responsavel_sem_decisao", "instrutor_nao_casado") or "«" not in pd.detalhe:
                continue
            texto = pd.detalhe.split("«", 1)[1].split("»", 1)[0]
            if pd.tipo == "instrutor_nao_casado":
                texto += " (aplicador de prova)" if "responsavel de avaliacao" in pd.detalhe else " (aula)"
            item = por_texto.setdefault(texto, {"turmas": set(), "ta": 0})
            item["turmas"].add(turma)
            item["ta"] += pd.ta
    linhas = [
        "# Pendencias do lote — responsavel que nao casa com o cadastro (spec 014, FR-016, A3.2)", "",
        "> Fora do git: os textos podem ter nome de pessoa. A LINHA fica fora da rodada ate a decisao; o resto da",
        "> turma entra (A3.2, 14/10/2026). A coluna «proposta» e so PROPOSTA: nada e aplicado sem o OK de Bernardo.",
        f"> Rodada `{pasta.name}`.", "",
        "| # | texto da planilha | turmas | TA | proposta |", "|---|---|---|---|---|",
    ]
    for n, (texto, item) in enumerate(sorted(por_texto.items()), 1):
        linhas.append(f"| {n} | {_celula(texto)} | {', '.join(sorted(item['turmas']))} | {item['ta']} | {classificar_responsavel(texto, guerras or set())} |")
    linhas.append("")
    linhas.append(f"Total: {len(por_texto)} texto(s), {sum(i['ta'] for i in por_texto.values())} TA.")
    # RN-RESP-1 (emenda de 15/10/2026): a atividade aceita responsavel de nome livre — o texto que nao casa com o
    # cadastro foi GRAVADO como esta (`responsavel_externo`), sem pendencia. A lista fica para conferencia.
    livres: dict[str, dict] = {}
    for turma, res in resolvidos:
        for x in getattr(res, "responsavel_livre", []):
            item = livres.setdefault(x["texto"], {"turmas": set(), "ta": 0, "linhas": []})
            item["turmas"].add(turma)
            item["ta"] += x["tempos"]
            item["linhas"].append((turma, x))
    linhas += [
        "", "## Responsavel de nome livre gravado (RN-RESP-1, 15/10/2026)", "",
        "> A linha e ATIVIDADE (palestra, AEC, apoio, TAD, TR), nao aula: entrou com o texto como responsavel, sem",
        "> cadastro e sem alerta. A coluna «aula de disciplina com EO?» diz se a CHAVE da linha e de uma disciplina do",
        "> curso E a tecnica do catalogo e EO — so esses pediriam instrutor habilitado se fossem aula.", "",
        "| # | texto | turmas | TA | linhas (turma · data · chave · tipo/subtipo · T/E) | aula de disciplina com EO? |",
        "|---|---|---|---|---|---|",
    ]
    for n, (texto, item) in enumerate(sorted(livres.items()), 1):
        detalhe = "; ".join(f"{t} · {x['data']} · {x['chave']} · {x['tipo']}/{x['subtipo']} · {x['tecnica'] or '—'}" for t, x in item["linhas"])
        eo = sum(1 for _, x in item["linhas"] if x["cod_e_disciplina"] and x["tecnica"] == "EO")
        linhas.append(f"| {n} | {_celula(texto)} | {', '.join(sorted(item['turmas']))} | {item['ta']} | {_celula(detalhe)} | "
                      f"{'SIM — ' + str(eo) + ' linha(s)' if eo else 'nao'} |")
    linhas += ["", f"Total: {len(livres)} texto(s), {sum(i['ta'] for i in livres.values())} TA gravados como nome livre."]
    arquivo = pasta / "pendencias-de-responsavel.md"
    arquivo.write_text("\n".join(linhas), encoding="utf-8", newline="\n")
    return arquivo


def titulo(texto: str) -> None:
    print(f"\n── {texto} " + "─" * max(0, 96 - len(texto)))


def relatar(res: Resolvido, leitura: planilha.Leitura, ref: dict, dif: dict) -> None:
    ta = lambda linhas, campo="tempos_consumidos": sum(l[campo] or 0 for l in linhas)  # noqa: E731
    # Spec 014 (PR 6): a vista e SESSAO — as sessoes de todas as provas.
    vistas = [v for a in res.avaliacoes for v in a.get("sessoes", [])]
    aplicacoes = [v for a in res.avaliacoes for v in a.get("aplicacoes", [])]
    ei = [a for a in res.atividades if a["categoria_normativa"] == "Estudo_Individual"]
    outras = [a for a in res.atividades if a["categoria_normativa"] != "Estudo_Individual"]
    print(f"  planilha: {len(leitura.blocos)} blocos em {len(leitura.linhas)} TA · siglas do cabecalho: {sorted(set(leitura.siglas))} · alunos: {leitura.alunos}")
    print(f"  banco:    alunos {ref['turma'].get('alunos')} · sala {ref['turma'].get('sala_alocada')} · situacao {ref['turma'].get('status')}")
    print(f"  aulas {len(res.aulas)} ({ta(res.aulas)} TA) · avaliacoes {len(res.avaliacoes)} ({ta(res.avaliacoes)} TA) · "
          f"sessoes de aplicacao 2..N {len(aplicacoes)} ({ta(aplicacoes)} TA) · vistas {len(vistas)} "
          f"({ta(vistas)} TA) · EI {len(ei)} ({ta(ei)} TA) · outras atividades {len(outras)} ({ta(outras)} TA) · "
          f"dias de calendario {len(res.calendario)}")
    print(f"  ETL ativo a substituir: {ref['etl']['aulas']} aulas ({ref['etl']['aulas_ta']} TA), {ref['etl']['avaliacoes']} avaliacoes, {ref['etl']['atividades']} atividades · lancado na tela: {ref['etl']['de_tela']}")
    for nome, d in dif.items():
        print(f"  {nome:<11} novas {len(d['novas']):4d} · mudadas {len(d['mudadas']):3d} · reativadas {len(d['reativadas']):3d} · saem {len(d['saem']):3d}")
        for codigo, campos in d["mudadas"][:40]:
            print(f"      mudou {codigo}: " + "; ".join(f"{c}: «{a}» → «{n}»" for c, a, n in campos))
        for codigo in d["saem"][:40]:
            print(f"      saiu  {codigo}")
    por_tipo: dict[str, list] = {}
    for p in res.pendencias:
        por_tipo.setdefault(p.tipo + (" [BLOQUEIA]" if p.bloqueia else ""), []).append(p)
    for tipo, lista in sorted(por_tipo.items()):
        agrupadas: dict[str, int] = {}
        for p in lista:
            agrupadas[p.detalhe] = agrupadas.get(p.detalhe, 0) + p.ta
        print(f"  pendencia · {tipo}: {len(lista)} bloco(s), {sum(p.ta for p in lista)} TA")
        for detalhe, soma in sorted(agrupadas.items())[:25]:
            print(f"      {detalhe} — {soma} TA")
    print(f"  impressao digital do plano: {res.impressao_digital()}")


def main() -> int:
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    a = argparse.ArgumentParser(description="Sincroniza as turmas com as planilhas de controle da rodada.")
    a.add_argument("--rodada", required=True, type=Path, help="pasta da exportacao (com manifesto.json)")
    a.add_argument("--destino", required=True, choices=sorted(banco.DESTINOS))
    a.add_argument("--autor", required=True)
    a.add_argument("--autor-local")
    a.add_argument("--turmas", help="codigos separados por virgula; sem isto, todas as de fontes.json")
    a.add_argument("--provisorio", action="store_true", help="so contra o local: carrega o que da e lista o resto")
    a.add_argument("--gravar", action="store_true", help="sem isto, so ensaia")
    a.add_argument("--adiar", default="", help="tipos de pendencia que NAO bloqueiam (o que eles cobrem fica FORA e e listado): "
                   "decisao nominal, ex. pessoa fora do cadastro e UE ausente que aguardam resposta")
    a.add_argument("--relatorio", type=Path, help="pasta onde gravar o plano de cada turma (JSON, sem nomes)")
    arg = a.parse_args()

    if arg.provisorio and arg.destino != "local":
        print("[RECUSADO] --provisorio so existe contra o banco local.")
        return 2
    fontes = json.loads((AQUI / "fontes.json").read_text(encoding="utf-8"))
    try:
        manifesto = {m["planilha_id"]: m for m in json.loads((arg.rodada / "manifesto.json").read_text(encoding="utf-8"))}
    except OSError as erro:
        print(f"[RODADA] sem manifesto.json em {arg.rodada}: {erro}")
        return 2
    pedidas = [t.strip() for t in arg.turmas.split(",")] if arg.turmas else [f["turma"] for f in fontes["turmas"]]
    fora = [t for t in pedidas if t not in {f["turma"] for f in fontes["turmas"]}]
    if fora:
        print(f"[RECUSADO] turma fora de fontes.json nao e tocada: {fora}")
        return 2

    # Le TODAS as fontes da rodada: o calendario global depende de todas, nao so das pedidas.
    leituras: dict[str, planilha.Leitura] = {}
    decisoes: dict[str, dict] = {}
    titulos: dict[str, str] = {}
    # A3.3 (14/10/2026): a data a partir da qual o SISTEMA e a fonte da turma — versionada em fontes.json.
    viradas: dict[str, str | None] = {f["turma"]: f.get("virada") for f in fontes["turmas"]}
    for fonte in fontes["turmas"]:
        m = manifesto.get(fonte["planilha_id"])
        if m is None:
            print(f"[RODADA] a planilha de {fonte['turma']} ({fonte['planilha_id']}) nao esta na rodada.")
            return 2
        try:
            leituras[fonte["turma"]] = planilha.ler(arg.rodada / m["arquivo"])
        except planilha.PlanilhaInvalida as erro:
            print(f"[PLANILHA] {fonte['turma']}: {erro}")
            return 2
        decisoes[fonte["turma"]] = json.loads((AQUI / fonte["decisoes"]).read_text(encoding="utf-8"))
        # Regras que valem para TODA turma (fontes.json, `regras_globais`): hoje, o desempate de instrutor por codigo.
        for chave, valor in fontes.get("regras_globais", {}).items():
            decisoes[fonte["turma"]].setdefault(chave, valor)
        titulos[fonte["turma"]] = m["titulo_no_drive"]
    globais, quadro = dias_globais_de(leituras, decisoes)

    print(f"rodada: {arg.rodada.name} · destino: {arg.destino} · modo: {'GRAVAR' if arg.gravar else 'ensaio'}{' · PROVISORIO' if arg.provisorio else ''}")
    titulo("Dias parados: global (todas as turmas com planilha no dia) ou so de algumas")
    for dia, q in quadro.items():
        print(f"  {dia} {'GLOBAL ' if q['global'] else 'parcial'} pararam {len(q['pararam'])} de {len(q['cobrem'])}" + ("" if q["global"] else f" — seguiram: {sorted(set(q['cobrem']) - set(q['pararam']))}"))

    # O calendario global so fica com o que parou TODAS as turmas. O que esta la «por curso» e
    # proposta do lote; no modo provisorio (local) ela e aplicada, para a verificacao nao acusar
    # como bloqueado um dia em que a turma teve expediente.
    cobertura = sorted(d for l in leituras.values() for d in (min(b.data for b in l.blocos).isoformat(), max(b.data for b in l.blocos).isoformat()))
    por_curso = banco.consultar(arg.destino, f"""
        select codigo, data, descricao from public.feriados
         where status = 'ativo' and impacto = 'dia_inteiro' and data between {lit(cobertura[0])}::date and {lit(cobertura[-1])}::date
           and not (data = any (array[{', '.join(lit(d) for d in sorted(globais)) or "null"}]::date[])) order by data""")
    titulo("Calendario global: dias que estao la e NAO pararam todas as turmas (proposta: inativar)")
    for f in por_curso:
        q = quadro.get(f["data"])
        print(f"  {f['codigo']} {f['data']} «{f['descricao']}» — " + (f"pararam {q['pararam']}" if q else "nenhuma turma parou nesse dia"))
    # So o dia APROVADO nominalmente sai do calendario (fontes.json, `calendario_global.inativar`): a
    # proposta e impressa para todos; a exclusao logica alcanca a lista e nada alem dela.
    aprovados = set(fontes.get("calendario_global", {}).get("inativar", []))
    inativar = [f for f in por_curso if str(f["data"])[:10] in aprovados]
    sem_decisao = [f for f in por_curso if str(f["data"])[:10] not in aprovados]
    if sem_decisao:
        print(f"  [LOTE] {len(sem_decisao)} dia(s) sem decisao nominal: ficam como estao — {[str(f['data'])[:10] for f in sem_decisao]}")
    if inativar and arg.gravar:
        banco.consultar(arg.destino, "update public.feriados set status = 'inativo' where codigo = any (array["
                        + ", ".join(lit(f["codigo"]) for f in inativar) + "]::text[])")
        print(f"  {len(inativar)} dia(s) inativado(s) no calendario global (decisao de 06/10/2026, item 7): {[str(f['data'])[:10] for f in inativar]}")

    veredito = 0
    resumo = []
    resolvidos: list[tuple[str, Resolvido]] = []
    divergencias: list[tuple[str, list[dict]]] = []
    # Spec 014 (SC-008, D-CUR-1): o retrato do catalogo ANTES da primeira escrita desta execucao.
    catalogo_antes = banco.retrato_do_catalogo(arg.destino)
    for turma in pedidas:
        leitura, dec = leituras[turma], decisoes[turma]
        virada = viradas.get(turma)
        titulo(f"{turma} ← «{titulos[turma]}»" + (f" · VIRADA em {virada}: so as datas anteriores" if virada else ""))
        de, ate = min(b.data for b in leitura.blocos).isoformat(), max(b.data for b in leitura.blocos).isoformat()
        try:
            ref = banco.referencia(arg.destino, turma, arg.autor, de, ate, virada)
        except banco.RecusaDoBanco as erro:
            print(f"  [BANCO] {erro}")
            return 4
        res = resolver(leitura, ref, dec, titulos[turma], globais, arg.provisorio)
        protegidas, diverge = proteger(res, ref, virada)
        res.nomes_de_guerra = {normalizar(i["guerra"]) for i in ref["instrutores"] if i.get("guerra")}  # type: ignore[attr-defined]
        resolvidos.append((turma, res))
        divergencias.append((turma, diverge))
        relogios = plano_do_relogio(leitura, ref, res, titulos[turma], dec.get("relogio"))
        dif = diferencas(res, ref["atuais"], protegidas)
        relatar(res, leitura, ref, dif)
        intocadas = sum(len(v) for v in protegidas.values())
        if intocadas or diverge:
            print(f"  [A SISTEMA VENCE] {intocadas} linha(s) do banco que a rodada nao toca · {len(diverge)} divergencia(s) planilha × sistema")
        for plano in relogios:
            vig = plano["vigencia"]
            atual = (f"{vig['codigo']} {vig['tipo_regime']} {str(vig['hora_inicio_manha'])[:5]} {vig['intervalo_manha_min']}/{vig['intervalo_tarde_min']}"
                     f" {str(vig['hora_inicio_tarde'])[:5]} {vig['regime_tempos']}x{vig['ta_duracao_min']}" + (" +catalogo" if vig.get("configuracao_horario_id") else ""))
            if plano["novo"] is None:
                print(f"  relogio: {atual} — " + ("ja e o da aba HORARIOS" if plano["criterio"].startswith(("tabela", "a unica", "2 ", "3 ")) else plano["criterio"]))
            else:
                n_ = plano["novo"]
                print(f"  relogio: {atual} → {n_['hora_inicio_manha']} {n_['intervalo_manha_min']}/{n_['intervalo_tarde_min']} {n_['hora_inicio_tarde']}"
                      f" {n_['regime_tempos']}x{n_['ta_duracao_min']} {'+catalogo' if n_.get('configuracao_horario_id') else 'sem catalogo'} ({plano['criterio']})")
            for e in plano["erros"]:
                print(f"    erro de planilha: {e}")
        if arg.relatorio is not None:
            arg.relatorio.mkdir(parents=True, exist_ok=True)
            sem_id = lambda linhas: [{k: v for k, v in l.items() if not k.endswith("_id") and not k.startswith("_")} for l in linhas]  # noqa: E731
            (arg.relatorio / f"plano-{slug(turma)}.json").write_text(json.dumps({
                "informativos": res.informativos, "sessoes_de_aplicacao": res.sessoes_de_aplicacao,
                "provas_sem_casar": res.provas_sem_casar,
                "turma": turma, "aulas": sem_id(res.aulas), "avaliacoes": sem_id(res.avaliacoes), "atividades": sem_id(res.atividades),
                "calendario": res.calendario, "pendencias": [p.__dict__ for p in res.pendencias], "alertas": res.alertas,
                "erros_de_planilha": res.erros_de_planilha, "classificadas": res.classificadas,
                "digitadas_adotadas": res.digitadas_adotadas, "insumo_epico_8": res.insumo_epico_8,
                "instrutores": {k: v["codigo"] for k, v in res.instrutores.items()},
                "impressao_digital": res.impressao_digital(), "diferencas": dif, "etl": ref["etl"],
                "relogio": [{"vigencia": p["vigencia"]["codigo"], "novo": p["novo"], "criterio": p["criterio"]} for p in relogios],
            }, ensure_ascii=False, indent=1, default=str), encoding="utf-8")

        # `--adiar`: pendencia decidida como «fica fora ate a resposta» (06/10/2026, onda 2) — o bloco nao entra,
        # o resto da turma entra, e o plano (com essas pendencias) continua tendo de ser identico ao do local.
        adiadas = {t.strip() for t in arg.adiar.split(",") if t.strip()}
        bloqueiam = [p for p in res.pendencias if p.bloqueia and p.tipo not in adiadas]
        if adiadas and any(p.tipo in adiadas for p in res.pendencias):
            print(f"  [ADIADO] {sum(p.ta for p in res.pendencias if p.tipo in adiadas)} TA ficam fora por decisao: {sorted({p.tipo for p in res.pendencias if p.tipo in adiadas})}")
        if ref["etl"]["de_tela"] or ref["etl"].get("de_tela_depois_da_virada"):
            # A3.3/A3.4: o lancamento da tela ja nao para a turma — fica como esta, e o que a planilha tem
            # no mesmo tempo vai para a lista de divergencias.
            print(f"  [TELA] {ref['etl']['de_tela']} lancamento(s) feito(s) na tela antes da virada e "
                  f"{ref['etl'].get('de_tela_depois_da_virada', 0)} depois: ficam como estao.")
        if bloqueiam and not arg.provisorio:
            print(f"  [PARADO] {len(bloqueiam)} pendencia(s) que bloqueiam. Nada foi enviado ao banco para esta turma.")
            veredito = max(veredito, 3)
            continue
        if arg.destino == "remoto":
            ref_local = banco.referencia("local", turma, arg.autor_local or arg.autor, de, ate, virada)
            res_local = resolver(leitura, ref_local, dec, titulos[turma], globais, False)
            proteger(res_local, ref_local, virada)
            if res_local.impressao_digital() != res.impressao_digital():
                print(f"  [PARADO] plano do local {res_local.impressao_digital()} × remoto {res.impressao_digital()}: nao e o mesmo plano.")
                veredito = max(veredito, 6)
                continue
            print(f"  plano do remoto = plano do local ({res.impressao_digital()})")

        incluir = bool(dec.get("incluir_dias_de_calendario_ausentes", True))
        abrangencia = dec.get("abrangencia_do_calendario", "Nacional/Institucional")
        try:
            banco.consultar(arg.destino, sql_da_turma(res, incluir, abrangencia, ensaio=True, relogios=relogios,
                                                      virada=virada, protegidas=protegidas))
            print("  [ERRO] o ensaio nao levantou a sentinela. Confira o banco.")
            return 4
        except banco.RecusaDoBanco as erro:
            mensagem = str(erro)
            if SENTINELA not in mensagem:
                print(f"  ✗ o banco recusou o ensaio: {mensagem[:600]}")
                veredito = max(veredito, 4)
                continue
            # ⚠️ No remoto a recusa chega EMBRULHADA em outro JSON ({"message": "... ENSAIO_DESFEITO {...}"}),
            #    e o ultimo "}" e o do envelope: o objeto da sentinela e lido por `raw_decode`, que para no
            #    fechamento certo. Medido em 06/10/2026, no primeiro ensaio remoto da onda 1.
            texto = mensagem.replace('\\"', '"')
            inicio = texto.index("{", texto.index(SENTINELA))
            contagem = json.JSONDecoder().raw_decode(texto, inicio)[0]
        mudancas = sum(v for v in contagem.values())
        print(f"  ensaio: {contagem} → {mudancas} mudanca(s)")
        resumo.append((turma, contagem, mudancas))
        if not arg.gravar:
            continue
        try:
            banco.consultar(arg.destino, sql_da_turma(res, incluir, abrangencia, ensaio=False, relogios=relogios,
                                                      virada=virada, protegidas=protegidas))
        except banco.RecusaDoBanco as erro:
            print(f"  ✗ o banco recusou a gravacao: {str(erro)[:600]}")
            veredito = max(veredito, 4)
            continue
        depois = banco.referencia(arg.destino, turma, arg.autor, de, ate, virada)
        resto = diferencas(res, depois["atuais"], protegidas)
        sobra = sum(len(d["novas"]) + len(d["mudadas"]) + len(d["reativadas"]) + len(d["saem"]) for d in resto.values())
        if sobra or depois["etl"]["aulas"] or depois["etl"]["avaliacoes"] or depois["etl"]["atividades"]:
            print(f"  ✗ depois da gravacao ainda ha {sobra} diferenca(s) e ETL ativo {depois['etl']}: o banco nao e o plano.")
            veredito = max(veredito, 5)
            continue
        print("  gravado; lido de volta: o banco e o plano, linha a linha, e nao sobrou ETL ativo.")

    catalogo_depois = banco.retrato_do_catalogo(arg.destino)
    titulo("Catalogo (D-CUR-1): a CH de disciplinas e UEs antes e depois desta execucao")
    print(f"  antes  {catalogo_antes}")
    print(f"  depois {catalogo_depois}")
    if catalogo_antes != catalogo_depois:
        print("  ✗ O CATALOGO MUDOU durante a sincronizacao — a rodada nunca altera CH (SC-008).")
        veredito = max(veredito, 7)

    arquivo = escrever_erros_de_planilha(arg.rodada, resolvidos)
    print(f"  lista de erros de planilha: {arquivo}")
    arquivo = escrever_divergencias(arg.rodada, divergencias, viradas)
    print(f"  lista «planilha diverge do sistema»: {arquivo}")
    arquivo = escrever_pendencias_de_responsavel(arg.rodada, resolvidos)
    print(f"  pendencias de responsavel (com a classificacao proposta): {arquivo}")
    arquivo = escrever_provas_sem_casar(arg.rodada, resolvidos)
    print(f"  provas que nao casam com o curriculo (COD, descricao e itens lado a lado): {arquivo}")

    titulo("Resumo da rodada")
    for turma, contagem, mudancas in resumo:
        print(f"  {turma:<26} {mudancas:5d} mudanca(s)")
    print(f"  data da rodada: {date.today().isoformat()} · saida {veredito}")
    return veredito


if __name__ == "__main__":
    raise SystemExit(main())
