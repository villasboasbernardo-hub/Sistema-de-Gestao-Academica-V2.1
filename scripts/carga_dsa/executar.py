"""Ponto de entrada da carga do DSA a partir da planilha de controle.

    python -m scripts.carga_dsa.executar \
        --turma "C-Exp-Obs-ME 2026" \
        --planilha planilhas-de-origem/<arquivo>.xlsx \
        --decisoes scripts/carga_dsa/decisoes/<turma>.json \
        --gabarito planilhas-de-origem/<gabarito>.csv \
        --destino local --autor USR-DEV-LOCAL            # ensaio (padrao)
        ... --gravar                                      # escreve

A ORDEM, e ela nao tem atalho:
  1. le a planilha e monta os blocos;
  2. com `--gabarito`, confere a extracao 1:1 contra a segunda leitura — divergiu, PARA;
  3. le o retrato do destino e resolve cada bloco (UE, instrutor, vocabulario);
  4. aplica as validacoes do lancamento manual — houve recusa, PARA, sem tocar no banco;
  5. ENSAIA: roda a transacao inteira e a desfaz;
  6. so com `--gravar`: escreve, le de volta e confere linha a linha contra o plano.

O CODIGO DE SAIDA E O VEREDITO: 0 passou · 2 planilha ou gabarito · 3 recusa de validacao ·
4 recusa do banco · 5 a conferencia apos a escrita divergiu.

⚠️ ESCREVER NO REMOTO EXIGE A EXCECAO ESCRITA NAS DECISOES DA TURMA (`excecao_virada_1`). A regra
   geral do projeto e que dado nao vai para o remoto por script; quem abre a excecao e Bernardo,
   turma a turma, e sem ela o `--gravar` contra o remoto e recusado antes de qualquer coisa.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

from scripts.carga_dsa import banco, planilha, plano as modulo_do_plano

# Como o gabarito pode chamar cada coluna. A comparacao e por (data, TA inicial, tempos, COD, UE).
_APELIDOS = {
    "data": ("data", "dia", "date"),
    "ta_inicial": ("ta_inicial", "ta inicial", "ta_ini", "inicio", "ta"),
    "tempos": ("tempos", "n_ta", "qtd_ta", "num_ta", "ta_qtd", "tas", "duracao", "nº de ta", "n ta"),
    "cod": ("cod", "cód", "codigo", "código", "disciplina_cod", "cod_disciplina"),
    "ue": ("ue", "u.e.", "u.e", "unidade", "n_ue", "nº ue"),
}


def _coluna(cabecalhos: list[str], campo: str, forcada: str | None) -> str | None:
    if forcada:
        return forcada if forcada in cabecalhos else None
    por_nome = {c.strip().lower(): c for c in cabecalhos}
    for apelido in _APELIDOS[campo]:
        if apelido in por_nome:
            return por_nome[apelido]
    return None


def _data_do_gabarito(bruto: str) -> str:
    bruto = bruto.strip()[:10]
    if len(bruto) == 10 and bruto[2] == "/" and bruto[5] == "/":
        return f"{bruto[6:10]}-{bruto[3:5]}-{bruto[0:2]}"
    return bruto


def conferir_gabarito(leitura: planilha.Leitura, caminho: Path, colunas: dict) -> list[str]:
    """A extracao contra a segunda leitura, bloco a bloco. Devolve as divergencias (vazia = 1:1)."""
    linhas = planilha.ler_csv(caminho)
    if not linhas:
        return [f"o gabarito {caminho.name} esta vazio"]
    cabecalhos = list(linhas[0].keys())
    mapa = {campo: _coluna(cabecalhos, campo, colunas.get(campo)) for campo in _APELIDOS}
    faltam = [campo for campo, coluna in mapa.items() if coluna is None]
    if faltam:
        return [
            f"nao reconheci no gabarito a(s) coluna(s) {faltam}; cabecalhos encontrados: {cabecalhos}. "
            "Nomeie-as em `gabarito_colunas`, nas decisoes da turma."
        ]

    def chave_do_gabarito(l: dict) -> tuple:
        return (
            _data_do_gabarito(l[mapa["data"]]),
            int(float(l[mapa["ta_inicial"]].replace("º", "") or 0)),
            int(float(l[mapa["tempos"]] or 0)),
            planilha.texto(l[mapa["cod"]]),
            planilha.texto(l[mapa["ue"]]).removesuffix(".0"),
        )

    esperado = Counter(chave_do_gabarito(l) for l in linhas)
    lido = Counter((b.data.isoformat(), b.ta_inicial, b.tempos, b.cod, b.ue) for b in leitura.blocos)
    divergencias = [f"so no gabarito: {k}" for k in sorted((esperado - lido).elements())]
    divergencias += [f"so na extracao: {k}" for k in sorted((lido - esperado).elements())]
    return divergencias


def _titulo(texto: str) -> None:
    print(f"\n── {texto} " + "─" * max(0, 88 - len(texto)))


def relatar(leitura: planilha.Leitura, p: modulo_do_plano.Plano, ref: dict) -> None:
    ta = lambda linhas, campo="tempos_consumidos": sum(l[campo] or 0 for l in linhas)  # noqa: E731
    vistas = [a for a in p.avaliacoes if a["data_vista_prova"]]
    ei = [a for a in p.atividades if a["categoria_normativa"] == "Estudo_Individual"]
    outras = [a for a in p.atividades if a["categoria_normativa"] != "Estudo_Individual"]

    _titulo("O que a planilha tem")
    print(f"  blocos lidos: {len(leitura.blocos)} · TA preenchidos: {len(leitura.linhas)}")
    for c in leitura.ignoradas:
        print(f"  ignorada (fora de linha de TA): {c.celula} = «{c.valor}»")
    for d in leitura.duplicadas:
        print(f"  chave repetida no catalogo (valeu a primeira): {d.cod}+{d.ue}, linha {d.linha}")

    _titulo("O que vira lancamento")
    print(f"  registros_aula          {len(p.aulas):3d} blocos · {ta(p.aulas):3d} TA")
    print(f"  avaliacoes (aplicacao)  {len(p.avaliacoes):3d} blocos · {ta(p.avaliacoes):3d} TA")
    print(f"  avaliacoes (vista)      {len(vistas):3d} blocos · {ta(vistas, 'tempos_consumidos_vista'):3d} TA")
    print(f"  Estudo Individual       {len(ei):3d} blocos · {ta(ei):3d} TA")
    for a in outras:
        print(
            f"  {a['categoria_normativa']}/{a['subtipo']}: {a['data']} TA {a['ta_inicial']}+{a['tempos_consumidos']} "
            f"«{a['descricao']}» local={a['local']} externo={a['responsavel_externo']}"
        )
    for c in p.calendario:
        estado = "ja esta no calendario do banco" if c.get("ja_no_banco") else "AUSENTE do calendario do banco"
        print(f"  calendario (NAO vira lancamento): {c['data']} «{c['descricao']}» — {estado}")

    _titulo("CH por unidade de ensino: lancado × catalogo da planilha × catalogo do banco")
    disciplina_por_id = {d["id"]: d for d in ref["disciplinas"]}
    for ue in sorted(ref["ues"], key=lambda u: (disciplina_por_id[u["disciplina_id"]]["cod"], u["numero"])):
        cod = disciplina_por_id[ue["disciplina_id"]]["cod"]
        lancado = sum(a["tempos_consumidos"] for a in p.aulas if a["ue"] == ue["codigo"])
        da_planilha = leitura.catalogo.get((cod, str(ue["numero"])))
        ch_planilha = da_planilha.ch if da_planilha else None
        marca = "" if lancado == ch_planilha else "  ⚠ nao fecha com a planilha"
        marca += "" if ch_planilha == ue["ch"] else "  (banco difere da planilha)"
        print(f"  {cod:>4} UE {ue['numero']}: lancado {lancado:3d} · planilha {ch_planilha} · banco {ue['ch']}{marca}")
    for d in sorted(ref["disciplinas"], key=lambda d: d["cod"]):
        aulas = sum(a["tempos_consumidos"] for a in p.aulas if a["disciplina"] == d["cod"])
        provas = sum(a["tempos_consumidos"] for a in p.avaliacoes if a["disciplina"] == d["cod"])
        vista = sum(a["tempos_consumidos_vista"] or 0 for a in p.avaliacoes if a["disciplina"] == d["cod"])
        print(f"  {d['cod']:>4} total: aulas {aulas} + provas {provas} + vistas {vista} = {aulas + provas + vista} · CH da disciplina {d['ch']}")

    _titulo("Instrutores: planilha × cadastro (casados por posto + nome de guerra)")
    for bruto, i in sorted(p.instrutores.items()):
        lido = modulo_do_plano.ler_instrutor(bruto)
        print(
            f"  codigo {i['codigo']:>3}: planilha posto={lido.posto} esp=«{lido.especialidade}» · "
            f"cadastro posto={i['posto']} esp=«{i.get('esp') or ''}» nome_guerra={'preenchido' if i.get('guerra') else 'VAZIO'}"
        )

    for nome, itens in (("Alertas (nao bloqueiam)", p.alertas), ("Conflitos com outras turmas (relatorio)", p.conflitos)):
        _titulo(nome)
        print("\n".join(f"  {i}" for i in itens) or "  nenhum")
    _titulo("RECUSAS")
    print("\n".join(f"  ✗ {r}" for r in p.recusas) or "  nenhuma")
    print(f"\n  impressao digital do plano: {p.impressao_digital()}")


_CONFERIR = """
select jsonb_build_object(
  'aulas', (select coalesce(jsonb_agg(jsonb_build_object('codigo', r.codigo, 'data', r.data, 'ta_inicial', r.ta_inicial,
      'tempos_consumidos', r.tempos_consumidos, 'ue', u.codigo, 'instrutor', i.codigo, 'metodologia', r.metodologia,
      'local', r.local, 'conteudo_resumo', r.conteudo_resumo, 'status', r.status)), '[]')
      from public.registros_aula r left join public.unidades_ensino u on u.id = r.unidade_ensino_id
      left join public.instrutores i on i.id = r.instrutor_id where r.turma_id = {turma}::uuid),
  'avaliacoes', (select coalesce(jsonb_agg(jsonb_build_object('codigo', a.codigo, 'data_avaliacao', a.data_avaliacao,
      'ta_inicial', a.ta_inicial, 'tempos_consumidos', a.tempos_consumidos, 'disciplina', d.cod_disciplina,
      'instrutor', i.codigo, 'metodologia', a.metodologia, 'local', a.local, 'tipo_avaliacao', a.tipo_avaliacao,
      'data_vista_prova', a.data_vista_prova, 'ta_inicial_vista', a.ta_inicial_vista,
      'tempos_consumidos_vista', a.tempos_consumidos_vista, 'local_vista', a.local_vista)), '[]')
      from public.avaliacoes a join public.disciplinas d on d.id = a.disciplina_id
      left join public.instrutores i on i.id = a.instrutor_responsavel_id where a.turma_id = {turma}::uuid),
  'atividades', (select coalesce(jsonb_agg(jsonb_build_object('codigo', n.codigo, 'data', n.data,
      'categoria_normativa', n.categoria_normativa, 'subtipo', n.subtipo, 'descricao', n.descricao,
      'ta_inicial', n.ta_inicial, 'tempos_consumidos', n.tempos_consumidos, 'local', n.local,
      'instrutor', i.codigo, 'responsavel_externo', n.responsavel_externo)), '[]')
      from public.atividades_nao_letivas n left join public.instrutores i on i.id = n.instrutor_id
      where n.turma_id = {turma}::uuid),
  'feriados', (select coalesce(jsonb_agg(f.data), '[]') from public.feriados f
      where f.status = 'ativo' and f.impacto = 'dia_inteiro' and f.data between {de}::date and {ate}::date)
) as m;
"""


def conferir_gravado(destino: str, p: modulo_do_plano.Plano, decisoes: dict, de: str, ate: str) -> list[str]:
    """Le de volta o que ficou no banco e confere campo a campo contra o plano."""
    linhas = banco.consultar(destino, _CONFERIR.format(turma=banco.lit(p.turma["id"]), de=banco.lit(de), ate=banco.lit(ate)))
    gravado = linhas[0]["m"]
    if isinstance(gravado, str):
        gravado = json.loads(gravado)
    divergencias: list[str] = []
    campos = {
        "aulas": ("data", "ta_inicial", "tempos_consumidos", "ue", "instrutor", "metodologia", "local", "conteudo_resumo"),
        "avaliacoes": ("data_avaliacao", "ta_inicial", "tempos_consumidos", "disciplina", "instrutor", "metodologia",
                       "local", "tipo_avaliacao", "data_vista_prova", "ta_inicial_vista", "tempos_consumidos_vista",
                       "local_vista"),
        "atividades": ("data", "categoria_normativa", "subtipo", "descricao", "ta_inicial", "tempos_consumidos", "local",
                       "instrutor", "responsavel_externo"),
    }
    for nome, esperadas in (("aulas", p.aulas), ("avaliacoes", p.avaliacoes), ("atividades", p.atividades)):
        por_codigo = {g["codigo"]: g for g in gravado[nome]}
        if len(por_codigo) != len(esperadas):
            divergencias.append(f"{nome}: o plano tem {len(esperadas)} e o banco tem {len(por_codigo)}")
        for e in esperadas:
            g = por_codigo.get(e["codigo"])
            if g is None:
                divergencias.append(f"{nome}: {e['codigo']} nao esta no banco")
                continue
            for campo in campos[nome]:
                if g.get(campo) != e.get(campo):
                    divergencias.append(f"{nome} {e['codigo']}.{campo}: plano «{e.get(campo)}» × banco «{g.get(campo)}»")
    if decisoes.get("incluir_dias_de_calendario_ausentes"):
        for c in p.calendario:
            if c["data"] not in gravado["feriados"]:
                divergencias.append(f"calendario: {c['data']} nao esta em `feriados` como dia inteiro")
    return divergencias


def main() -> int:
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    argumentos = argparse.ArgumentParser(description="Carga do DSA a partir da planilha de controle de uma turma.")
    argumentos.add_argument("--turma", required=True, help="codigo da turma no banco")
    argumentos.add_argument("--planilha", required=True, type=Path)
    argumentos.add_argument("--decisoes", required=True, type=Path)
    argumentos.add_argument("--gabarito", type=Path, help="CSV da segunda leitura; divergiu, para")
    argumentos.add_argument("--destino", required=True, choices=sorted(banco.DESTINOS))
    argumentos.add_argument("--autor", required=True, help="codigo da conta (usuarios.codigo) que autoriza a carga")
    argumentos.add_argument("--gravar", action="store_true", help="sem isto, so ensaia")
    argumentos.add_argument("--plano-json", type=Path, help="grava o plano (chaves naturais, sem nomes) neste arquivo")
    a = argumentos.parse_args()

    decisoes = json.loads(a.decisoes.read_text(encoding="utf-8"))
    if decisoes.get("turma") != a.turma:
        print(f"[RECUSADO] as decisoes sao da turma «{decisoes.get('turma')}», e o pedido e para «{a.turma}».")
        return 2
    if a.gravar and a.destino == "remoto" and not decisoes.get("excecao_virada_1"):
        print("[RECUSADO] escrever no remoto exige `excecao_virada_1` nas decisoes da turma (VIRADA-1).")
        return 2

    try:
        leitura = planilha.ler(a.planilha)
    except planilha.PlanilhaInvalida as erro:
        print(f"[PLANILHA] {erro}")
        return 2
    print(f"planilha: {a.planilha.name} · destino: {a.destino} · turma: {a.turma} · modo: {'GRAVAR' if a.gravar else 'ensaio'}")

    if a.gabarito is not None:
        divergencias = conferir_gabarito(leitura, a.gabarito, decisoes.get("gabarito_colunas", {}))
        if divergencias:
            _titulo("GABARITO — a extracao NAO bate 1:1")
            print("\n".join(f"  ✗ {d}" for d in divergencias))
            return 2
        print(f"gabarito: {len(leitura.blocos)} blocos, 1:1 com {a.gabarito.name}")
    elif a.gravar and a.destino == "remoto":
        print("[RECUSADO] nao se escreve no remoto sem `--gabarito`: a extracao precisa de uma segunda leitura.")
        return 2
    else:
        print("gabarito: NAO INFORMADO — a extracao nao foi conferida contra a segunda leitura")

    de = min(b.data for b in leitura.blocos).isoformat()
    ate = max(b.data for b in leitura.blocos).isoformat()
    try:
        ref = banco.referencia(a.destino, a.turma, a.autor, de, ate)
    except banco.RecusaDoBanco as erro:
        print(f"[BANCO] {erro}")
        return 4

    p = modulo_do_plano.montar(leitura, ref, decisoes, a.planilha.name, date.today().isoformat())
    relatar(leitura, p, ref)
    if a.plano_json is not None:
        sem_id = lambda linhas: [{k: v for k, v in l.items() if not k.endswith("_id")} for l in linhas]  # noqa: E731
        a.plano_json.write_text(
            json.dumps({"aulas": sem_id(p.aulas), "avaliacoes": sem_id(p.avaliacoes), "atividades": sem_id(p.atividades),
                        "calendario": p.calendario, "impressao_digital": p.impressao_digital()},
                       ensure_ascii=False, indent=1),
            encoding="utf-8",
        )
    if p.recusas:
        print(f"\n[PARADO] {len(p.recusas)} recusa(s) de validacao. Nada foi enviado ao banco.")
        return 3

    _titulo("Ensaio (transacao inteira, desfeita)")
    try:
        banco.consultar(a.destino, modulo_do_plano.sql(p, decisoes, ensaio=True))
        print("  [ERRO] o ensaio nao levantou a sentinela — nada garante que foi desfeito. Confira o banco.")
        return 4
    except banco.RecusaDoBanco as erro:
        mensagem = str(erro)
        if modulo_do_plano.SENTINELA_DO_ENSAIO not in mensagem:
            print(f"  ✗ o banco recusou: {mensagem}")
            return 4
        inicio = mensagem.index("{", mensagem.index(modulo_do_plano.SENTINELA_DO_ENSAIO))
        contagem = json.loads(mensagem[inicio : mensagem.index("}", inicio) + 1].replace('\\"', '"'))
        print(f"  o banco aceitaria: {contagem} (linhas NOVAS; o que ja existe pelo codigo nao conta)")

    if not a.gravar:
        print("\n[ENSAIO] nada foi gravado. Para escrever, repita com --gravar.")
        return 0

    _titulo("Gravacao")
    try:
        banco.consultar(a.destino, modulo_do_plano.sql(p, decisoes, ensaio=False))
    except banco.RecusaDoBanco as erro:
        print(f"  ✗ o banco recusou: {erro}")
        return 4
    divergencias = conferir_gravado(a.destino, p, decisoes, de, ate)
    if divergencias:
        print("\n".join(f"  ✗ {d}" for d in divergencias))
        print("\n[DIVERGIU] o que ficou no banco nao e o plano.")
        return 5
    print(f"  gravado e conferido linha a linha: {len(p.aulas)} aulas, {len(p.avaliacoes)} avaliacoes, {len(p.atividades)} atividades.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
