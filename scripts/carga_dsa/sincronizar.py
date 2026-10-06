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
     e `status = cancelada`, com o status anterior escrito na marca. Nada e apagado (regra 4).
  2. INSERE o que e novo, ATUALIZA o que mudou e INATIVA o que saiu da planilha. O codigo de cada
     linha e derivado da turma e da LINHA da planilha em que o bloco comeca: a mesma celula da o
     mesmo codigo em toda rodada.
  3. Rodar de novo, sem a planilha mudar, da ZERO mudanca — e o programa confere isso.

⚠️ `--provisorio` SO EXISTE CONTRA O LOCAL. Ele carrega o que da para carregar sem cadastro novo
   (aula de instrutor sem habilitacao, por exemplo) para a verificacao andar, e lista o resto. Contra
   o remoto, qualquer pendencia que bloqueia PARA a turma inteira: cadastro so entra pelo lote de
   decisoes aprovado.

⚠️ LANCAMENTO FEITO NA TELA, NUMA TURMA SINCRONIZADA, PARA A TURMA. Ate a virada ninguem lanca no
   sistema nas turmas da lista; se houver linha que nao e do ETL nem desta carga, quem decide e gente.

SAIDA: 0 passou · 2 planilha ou rodada · 3 pendencia que bloqueia · 4 recusa do banco ·
5 a conferencia apos a escrita divergiu · 6 o plano do remoto nao e o do local.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from scripts.carga_dsa import banco, planilha, relogio
from scripts.carga_dsa.banco import lit
from scripts.carga_dsa.resolver import MARCA_DE_DEMAIS, Resolvido, classificar_pela_descricao, resolver, slug

AQUI = Path(__file__).parent
MARCA_DO_ETL = "[SUBSTITUIDO PELA PLANILHA DE CONTROLE]"
MARCA_DE_SAIDA = "[SAIU DA PLANILHA DE CONTROLE]"
SENTINELA = "ENSAIO_DESFEITO"

# Os campos COMPARADOS de cada tabela, em chaves naturais. `observacoes` fica de fora de proposito:
# guarda a procedencia de quando a linha entrou, e so e regravada quando outro campo muda.
CAMPOS = {
    "aulas": ("data", "ta_inicial", "tempos_consumidos", "ue", "disciplina_sem_ue", "instrutor", "metodologia", "local", "conteudo_resumo", "demais"),
    "avaliacoes": ("disciplina", "tipo_avaliacao", "data_avaliacao", "ta_inicial", "tempos_consumidos", "instrutor", "fiscal",
                   "nome_fiscal_externo", "metodologia", "local", "conteudo_resumo", "data_vista_prova", "ta_inicial_vista",
                   "tempos_consumidos_vista", "local_vista"),
    "atividades": ("categoria_normativa", "data", "subtipo", "descricao", "ta_inicial", "tempos_consumidos", "local", "instrutor", "responsavel_externo"),
}


def _demais(linha: dict) -> str:
    return linha["observacoes"].split(MARCA_DE_DEMAIS, 1)[1] if MARCA_DE_DEMAIS in linha.get("observacoes", "") else ""


def diferencas(res: Resolvido, atuais: dict) -> dict:
    """Plano × o que ja esta no banco: novas, mudadas (campo a campo), reativadas e as que saem."""
    saida = {}
    for nome, plano in (("aulas", res.aulas), ("avaliacoes", res.avaliacoes), ("atividades", res.atividades)):
        por_codigo = {a["codigo"]: a for a in atuais[nome]}
        novas, mudadas, reativadas = [], [], []
        for linha in plano:
            atual = por_codigo.get(linha["codigo"])
            if atual is None:
                novas.append(linha["codigo"])
                continue
            esperado = {**linha, "demais": _demais(linha)} if nome == "aulas" else linha
            campos = [(c, atual.get(c), esperado.get(c)) for c in CAMPOS[nome] if (atual.get(c) or None) != (esperado.get(c) or None)]
            if campos:
                mudadas.append((linha["codigo"], campos))
            elif atual["status"] != "ativo":
                reativadas.append(linha["codigo"])
        do_plano = {l["codigo"] for l in plano}
        saem = sorted(c for c, a in por_codigo.items() if c not in do_plano and a["status"] == "ativo")
        saida[nome] = {"novas": novas, "mudadas": mudadas, "reativadas": reativadas, "saem": saem}
    return saida


def _valores(linhas: list[list[object]]) -> str:
    return ",\n    ".join("(" + ", ".join(lit(v) for v in linha) + ")" for linha in linhas)


def plano_do_relogio(leitura: planilha.Leitura, ref: dict, res: Resolvido, titulo_da_planilha: str) -> list[dict]:
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
        novo = relogio.correcao(vig, regime)
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


def sql_da_turma(res: Resolvido, incluir_calendario: bool, abrangencia: str | None, ensaio: bool, relogios: list[dict] | None = None) -> str:
    """Um bloco `DO` por turma — atomico. No ensaio ele termina levantando a sentinela.

    ⚠️ NENHUM CODIGO SAI DE SEQUENCIA (gotcha 6: sequencia nao obedece a `ROLLBACK`): o ensaio nao
       consome numero. A unica excecao e `feriados.codigo`, calculado por `max + 1` dentro do bloco.
    """
    t, c, autor = lit(res.turma["id"]) + "::uuid", lit(res.turma["curso_id"]) + "::uuid", lit(res.autor["auth_user_id"]) + "::uuid"
    prefixo = f"DSAP-{slug(res.turma['codigo'])}-L"
    p: list[str] = []

    # 1. substituir, nao somar
    p.append(f"""
  update public.registros_aula set status = 'inativo', observacoes = concat_ws(' ', {lit(MARCA_DO_ETL)}, observacoes)
   where turma_id = {t} and origem_migracao_v1 is not null and status = 'ativo';
  get diagnostics n := row_count; k := k || jsonb_build_object('etl_aulas', n);
  update public.atividades_nao_letivas set status = 'inativo', observacoes = concat_ws(' ', {lit(MARCA_DO_ETL)}, observacoes)
   where turma_id = {t} and origem_migracao_v1 is not null and status = 'ativo';
  get diagnostics n := row_count; k := k || jsonb_build_object('etl_atividades', n);
  update public.avaliacoes set observacoes = concat_ws(' ', {lit(MARCA_DO_ETL)} || ' (status anterior: ' || status::text || ')', observacoes),
         status = 'cancelada'
   where turma_id = {t} and origem_migracao_v1 is not null and status <> 'cancelada';
  get diagnostics n := row_count; k := k || jsonb_build_object('etl_avaliacoes', n);""")

    # 1b. o relogio do curso: com o ETL ja fora do caminho e antes de a planilha entrar (ordem do item 3b)
    p.append(sql_do_relogio(res, relogios or [], ensaio))
    p.append("  k := k || jsonb_build_object('relogio_corrigido', r);")

    # 2. inserir o novo e atualizar o que mudou
    if res.aulas:
        p.append(f"""
  with dados(codigo, data, ue, disciplina, instrutor, ta, tempos, conteudo, metodologia, local, obs) as (values
    {_valores([[a["codigo"], a["data"], a["unidade_ensino_id"], a["disciplina_id"], a["instrutor_id"], a["ta_inicial"], a["tempos_consumidos"], a["conteudo_resumo"], a["metodologia"], a["local"], a["observacoes"]] for a in res.aulas])}
  ), gravadas as (
    insert into public.registros_aula as r
      (codigo, data, turma_id, curso_id, unidade_ensino_id, disciplina_id, instrutor_id, ta_inicial,
       tempos_consumidos, conteudo_resumo, metodologia, local, observacoes, criado_por)
    select d.codigo, d.data::date, {t}, {c}, d.ue::uuid, d.disciplina::uuid, d.instrutor::uuid, d.ta::smallint,
           d.tempos::smallint, d.conteudo, d.metodologia, d.local, d.obs, {autor}
      from dados d
    on conflict (codigo) do update set
       data = excluded.data, unidade_ensino_id = excluded.unidade_ensino_id, disciplina_id = excluded.disciplina_id,
       instrutor_id = excluded.instrutor_id, ta_inicial = excluded.ta_inicial, tempos_consumidos = excluded.tempos_consumidos,
       conteudo_resumo = excluded.conteudo_resumo, metodologia = excluded.metodologia, local = excluded.local,
       observacoes = excluded.observacoes, status = 'ativo'
     where (r.data, r.unidade_ensino_id, r.disciplina_id, r.instrutor_id, r.ta_inicial, r.tempos_consumidos,
            r.conteudo_resumo, r.metodologia, r.local, r.status::text,
            split_part(coalesce(r.observacoes, ''), {lit(MARCA_DE_DEMAIS)}, 2))
       is distinct from
           (excluded.data, excluded.unidade_ensino_id, excluded.disciplina_id, excluded.instrutor_id, excluded.ta_inicial,
            excluded.tempos_consumidos, excluded.conteudo_resumo, excluded.metodologia, excluded.local, 'ativo',
            split_part(coalesce(excluded.observacoes, ''), {lit(MARCA_DE_DEMAIS)}, 2))
    returning (xmax = 0) as nova
  ) select count(*) filter (where nova), count(*) filter (where not nova) into n, m from gravadas;
  k := k || jsonb_build_object('aulas_novas', n, 'aulas_atualizadas', m);""")

    if res.avaliacoes:
        p.append(f"""
  with dados(codigo, disciplina, tipo, data, ta, tempos, instrutor, fiscal, fiscal_externo, conteudo, metodologia, local,
             data_vista, ta_vista, tempos_vista, local_vista, obs) as (values
    {_valores([[a["codigo"], a["disciplina_id"], a["tipo_avaliacao"], a["data_avaliacao"], a["ta_inicial"], a["tempos_consumidos"], a["instrutor_responsavel_id"], a["fiscal_id"], a["nome_fiscal_externo"], a["conteudo_resumo"], a["metodologia"], a["local"], a["data_vista_prova"], a["ta_inicial_vista"], a["tempos_consumidos_vista"], a["local_vista"], a["observacoes"]] for a in res.avaliacoes])}
  ), gravadas as (
    insert into public.avaliacoes as r
      (codigo, turma_id, curso_id, disciplina_id, tipo_avaliacao, data_avaliacao, ta_inicial, tempos_consumidos,
       instrutor_responsavel_id, fiscal_id, nome_fiscal_externo, conteudo_resumo, metodologia, local,
       data_vista_prova, ta_inicial_vista, tempos_consumidos_vista, local_vista, observacoes, criado_por)
    select d.codigo, {t}, {c}, d.disciplina::uuid, d.tipo, d.data::date, d.ta::smallint, d.tempos::smallint,
           d.instrutor::uuid, d.fiscal::uuid, d.fiscal_externo, d.conteudo, d.metodologia, d.local,
           d.data_vista::date, d.ta_vista::smallint, d.tempos_vista::smallint, d.local_vista, d.obs, {autor}
      from dados d
    on conflict (codigo) do update set
       disciplina_id = excluded.disciplina_id, tipo_avaliacao = excluded.tipo_avaliacao, data_avaliacao = excluded.data_avaliacao,
       ta_inicial = excluded.ta_inicial, tempos_consumidos = excluded.tempos_consumidos,
       instrutor_responsavel_id = excluded.instrutor_responsavel_id, fiscal_id = excluded.fiscal_id,
       nome_fiscal_externo = excluded.nome_fiscal_externo, conteudo_resumo = excluded.conteudo_resumo,
       metodologia = excluded.metodologia, local = excluded.local, data_vista_prova = excluded.data_vista_prova,
       ta_inicial_vista = excluded.ta_inicial_vista, tempos_consumidos_vista = excluded.tempos_consumidos_vista,
       local_vista = excluded.local_vista, observacoes = excluded.observacoes,
       status = case when r.status = 'cancelada' then 'pendente' else r.status end
     where (r.disciplina_id, r.tipo_avaliacao, r.data_avaliacao, r.ta_inicial, r.tempos_consumidos, r.instrutor_responsavel_id,
            r.fiscal_id, r.nome_fiscal_externo, r.conteudo_resumo, r.metodologia, r.local, r.data_vista_prova,
            r.ta_inicial_vista, r.tempos_consumidos_vista, r.local_vista, r.status = 'cancelada')
       is distinct from
           (excluded.disciplina_id, excluded.tipo_avaliacao, excluded.data_avaliacao, excluded.ta_inicial, excluded.tempos_consumidos,
            excluded.instrutor_responsavel_id, excluded.fiscal_id, excluded.nome_fiscal_externo, excluded.conteudo_resumo,
            excluded.metodologia, excluded.local, excluded.data_vista_prova, excluded.ta_inicial_vista,
            excluded.tempos_consumidos_vista, excluded.local_vista, false)
    returning (xmax = 0) as nova
  ) select count(*) filter (where nova), count(*) filter (where not nova) into n, m from gravadas;
  k := k || jsonb_build_object('avaliacoes_novas', n, 'avaliacoes_atualizadas', m);""")

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

    # 3. inativar o que saiu da planilha
    codigos = res.codigos()
    for tabela, chave, comando in (
        ("registros_aula", "aulas_que_sairam", "status = 'inativo'"),
        ("atividades_nao_letivas", "atividades_que_sairam", "status = 'inativo'"),
        ("avaliacoes", "avaliacoes_que_sairam", "status = 'cancelada'"),
    ):
        ativa = "status <> 'cancelada'" if tabela == "avaliacoes" else "status = 'ativo'"
        lista = "array[" + ", ".join(lit(x) for x in codigos[tabela]) + "]::text[]"
        p.append(f"""
  update public.{tabela} set {comando}, observacoes = concat_ws(' ', {lit(MARCA_DE_SAIDA)}, observacoes)
   where turma_id = {t} and codigo like {lit(prefixo + '%')} and {ativa} and not (codigo = any ({lista}));
  get diagnostics n := row_count; k := k || jsonb_build_object({lit(chave)}, n);""")

    # 4. o calendario global: so o dia que parou TODAS as turmas, e so se ainda nao estiver la
    if incluir_calendario:
        for dia in res.calendario:
            p.append(f"""
  if not exists (select 1 from public.feriados where data = {lit(dia["data"])}::date and impacto = 'dia_inteiro' and status = 'ativo') then
    insert into public.feriados (codigo, ano, data, descricao, impacto, abrangencia, criado_por)
    select 'FER-' || lpad((coalesce(max(substring(codigo from '^FER-([0-9]+)$')::int), 0) + 1)::text, 6, '0'),
           extract(year from {lit(dia["data"])}::date)::smallint, {lit(dia["data"])}::date, {lit(dia["descricao"])}, 'dia_inteiro',
           {lit(abrangencia)}, {autor}
      from public.feriados;
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


def titulo(texto: str) -> None:
    print(f"\n── {texto} " + "─" * max(0, 96 - len(texto)))


def relatar(res: Resolvido, leitura: planilha.Leitura, ref: dict, dif: dict) -> None:
    ta = lambda linhas, campo="tempos_consumidos": sum(l[campo] or 0 for l in linhas)  # noqa: E731
    vistas = [a for a in res.avaliacoes if a["data_vista_prova"]]
    ei = [a for a in res.atividades if a["categoria_normativa"] == "Estudo_Individual"]
    outras = [a for a in res.atividades if a["categoria_normativa"] != "Estudo_Individual"]
    print(f"  planilha: {len(leitura.blocos)} blocos em {len(leitura.linhas)} TA · siglas do cabecalho: {sorted(set(leitura.siglas))} · alunos: {leitura.alunos}")
    print(f"  banco:    alunos {ref['turma'].get('alunos')} · sala {ref['turma'].get('sala_alocada')} · situacao {ref['turma'].get('status')}")
    print(f"  aulas {len(res.aulas)} ({ta(res.aulas)} TA) · avaliacoes {len(res.avaliacoes)} ({ta(res.avaliacoes)} TA) · vistas {len(vistas)} "
          f"({ta(vistas, 'tempos_consumidos_vista')} TA) · EI {len(ei)} ({ta(ei)} TA) · outras atividades {len(outras)} ({ta(outras)} TA) · "
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
    for turma in pedidas:
        leitura, dec = leituras[turma], decisoes[turma]
        titulo(f"{turma} ← «{titulos[turma]}»")
        de, ate = min(b.data for b in leitura.blocos).isoformat(), max(b.data for b in leitura.blocos).isoformat()
        try:
            ref = banco.referencia(arg.destino, turma, arg.autor, de, ate)
        except banco.RecusaDoBanco as erro:
            print(f"  [BANCO] {erro}")
            return 4
        res = resolver(leitura, ref, dec, titulos[turma], globais, arg.provisorio)
        relogios = plano_do_relogio(leitura, ref, res, titulos[turma])
        dif = diferencas(res, ref["atuais"])
        relatar(res, leitura, ref, dif)
        for plano in relogios:
            vig = plano["vigencia"]
            atual = (f"{vig['codigo']} {vig['tipo_regime']} {str(vig['hora_inicio_manha'])[:5]} {vig['intervalo_manha_min']}/{vig['intervalo_tarde_min']}"
                     f" {str(vig['hora_inicio_tarde'])[:5]} {vig['regime_tempos']}x{vig['ta_duracao_min']}" + (" +catalogo" if vig.get("configuracao_horario_id") else ""))
            if plano["novo"] is None:
                print(f"  relogio: {atual} — " + ("ja e o da aba HORARIOS" if plano["criterio"].startswith(("tabela", "a unica", "2 ", "3 ")) else plano["criterio"]))
            else:
                n_ = plano["novo"]
                print(f"  relogio: {atual} → {n_['hora_inicio_manha']} {n_['intervalo_manha_min']}/{n_['intervalo_tarde_min']} {n_['hora_inicio_tarde']}"
                      f" {n_['regime_tempos']}x{n_['ta_duracao_min']} sem catalogo ({plano['criterio']})")
            for e in plano["erros"]:
                print(f"    erro de planilha: {e}")
        if arg.relatorio is not None:
            arg.relatorio.mkdir(parents=True, exist_ok=True)
            sem_id = lambda linhas: [{k: v for k, v in l.items() if not k.endswith("_id")} for l in linhas]  # noqa: E731
            (arg.relatorio / f"plano-{slug(turma)}.json").write_text(json.dumps({
                "turma": turma, "aulas": sem_id(res.aulas), "avaliacoes": sem_id(res.avaliacoes), "atividades": sem_id(res.atividades),
                "calendario": res.calendario, "pendencias": [p.__dict__ for p in res.pendencias], "alertas": res.alertas,
                "erros_de_planilha": res.erros_de_planilha, "classificadas": res.classificadas,
                "digitadas_adotadas": res.digitadas_adotadas, "insumo_epico_8": res.insumo_epico_8,
                "instrutores": {k: v["codigo"] for k, v in res.instrutores.items()},
                "impressao_digital": res.impressao_digital(), "diferencas": dif, "etl": ref["etl"],
                "relogio": [{"vigencia": p["vigencia"]["codigo"], "novo": p["novo"], "criterio": p["criterio"]} for p in relogios],
            }, ensure_ascii=False, indent=1, default=str), encoding="utf-8")

        bloqueiam = [p for p in res.pendencias if p.bloqueia]
        if ref["etl"]["de_tela"]:
            print(f"  [PARADO] a turma tem {ref['etl']['de_tela']} lancamento(s) feito(s) na tela: quem decide o que fazer e gente.")
            veredito = max(veredito, 3)
            continue
        if bloqueiam and not arg.provisorio:
            print(f"  [PARADO] {len(bloqueiam)} pendencia(s) que bloqueiam. Nada foi enviado ao banco para esta turma.")
            veredito = max(veredito, 3)
            continue
        if arg.destino == "remoto":
            ref_local = banco.referencia("local", turma, arg.autor_local or arg.autor, de, ate)
            res_local = resolver(leitura, ref_local, dec, titulos[turma], globais, False)
            if res_local.impressao_digital() != res.impressao_digital():
                print(f"  [PARADO] plano do local {res_local.impressao_digital()} × remoto {res.impressao_digital()}: nao e o mesmo plano.")
                veredito = max(veredito, 6)
                continue
            print(f"  plano do remoto = plano do local ({res.impressao_digital()})")

        incluir = bool(dec.get("incluir_dias_de_calendario_ausentes", True))
        abrangencia = dec.get("abrangencia_do_calendario", "Nacional/Institucional")
        try:
            banco.consultar(arg.destino, sql_da_turma(res, incluir, abrangencia, ensaio=True, relogios=relogios))
            print("  [ERRO] o ensaio nao levantou a sentinela. Confira o banco.")
            return 4
        except banco.RecusaDoBanco as erro:
            mensagem = str(erro)
            if SENTINELA not in mensagem:
                print(f"  ✗ o banco recusou o ensaio: {mensagem[:600]}")
                veredito = max(veredito, 4)
                continue
            inicio = mensagem.index("{", mensagem.index(SENTINELA))
            contagem = json.loads(mensagem[inicio : mensagem.rindex("}") + 1].replace('\\"', '"'))
        mudancas = sum(v for v in contagem.values())
        print(f"  ensaio: {contagem} → {mudancas} mudanca(s)")
        resumo.append((turma, contagem, mudancas))
        if not arg.gravar:
            continue
        try:
            banco.consultar(arg.destino, sql_da_turma(res, incluir, abrangencia, ensaio=False, relogios=relogios))
        except banco.RecusaDoBanco as erro:
            print(f"  ✗ o banco recusou a gravacao: {str(erro)[:600]}")
            veredito = max(veredito, 4)
            continue
        depois = banco.referencia(arg.destino, turma, arg.autor, de, ate)
        resto = diferencas(res, depois["atuais"])
        sobra = sum(len(d["novas"]) + len(d["mudadas"]) + len(d["reativadas"]) + len(d["saem"]) for d in resto.values())
        if sobra or depois["etl"]["aulas"] or depois["etl"]["avaliacoes"] or depois["etl"]["atividades"]:
            print(f"  ✗ depois da gravacao ainda ha {sobra} diferenca(s) e ETL ativo {depois['etl']}: o banco nao e o plano.")
            veredito = max(veredito, 5)
            continue
        print("  gravado; lido de volta: o banco e o plano, linha a linha, e nao sobrou ETL ativo.")

    titulo("Resumo da rodada")
    for turma, contagem, mudancas in resumo:
        print(f"  {turma:<26} {mudancas:5d} mudanca(s)")
    print(f"  data da rodada: {date.today().isoformat()} · saida {veredito}")
    return veredito


if __name__ == "__main__":
    raise SystemExit(main())
