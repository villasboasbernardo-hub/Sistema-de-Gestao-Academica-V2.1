"""Acesso ao banco pela CLI do Supabase — o MESMO canal para o local e para o remoto.

    supabase db query --local  -f <arquivo>     (Docker desta maquina)
    supabase db query --linked -f <arquivo>     (projeto vinculado, pela Management API)

⚠️ POR QUE A CLI, E NAO `psycopg`: o remoto so e alcancavel por ela (nao ha senha de banco nesta
   maquina, de proposito), e usar dois canais faria o ensaio do local e o do remoto percorrerem
   caminhos diferentes — exatamente o que a comparacao 1:1 entre os dois existe para excluir.

⚠️ CADA CHAMADA E UMA INSTRUCAO SO. A escrita inteira vai num unico bloco `DO`, que e atomico por
   construcao: entra tudo ou nao entra nada, e os gatilhos adiados disparam no fim dele.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

DESTINOS = {"local": "--local", "remoto": "--linked"}


class RecusaDoBanco(Exception):
    """O banco (ou a CLI) recusou a instrucao. A mensagem e a do banco, sem traducao."""


def consultar(destino: str, sql: str) -> list[dict]:
    if destino not in DESTINOS:
        raise ValueError(f"destino desconhecido: {destino}")
    cli = shutil.which("supabase")
    if cli is None:
        raise RecusaDoBanco("a CLI `supabase` nao esta no PATH")

    with tempfile.TemporaryDirectory() as pasta:
        arquivo = Path(pasta) / "instrucao.sql"
        arquivo.write_text(sql, encoding="utf-8", newline="\n")
        processo = subprocess.run(
            [cli, "db", "query", DESTINOS[destino], "--output-format", "json", "-f", str(arquivo)],
            capture_output=True,
            check=False,
        )
    saida = processo.stdout.decode("utf-8", errors="replace")
    erro = processo.stderr.decode("utf-8", errors="replace")

    for bruto in (saida, erro):
        inicio = bruto.find("{")
        if inicio < 0:
            continue
        try:
            corpo = json.loads(bruto[inicio : bruto.rindex("}") + 1])
        except ValueError:
            continue
        if isinstance(corpo, dict) and "rows" in corpo:
            return corpo["rows"]
        if isinstance(corpo, dict) and "error" in corpo:
            detalhe = corpo["error"]
            raise RecusaDoBanco(detalhe.get("message", str(detalhe)) if isinstance(detalhe, dict) else str(detalhe))
    if processo.returncode == 0:
        # Instrucao sem linhas de volta (um `DO`): contra o local a CLI nao imprime JSON nenhum.
        # ⚠️ Medido em 06/10/2026: ler esse silencio como recusa acusava de falha uma escrita que
        #    tinha entrado inteira.
        return []
    raise RecusaDoBanco((erro or saida).strip() or f"a CLI saiu com codigo {processo.returncode}")


def lit(valor: object) -> str:
    """Literal SQL. Texto com aspas dobradas; `None` vira `null`. Nada aqui vem de formulario."""
    if valor is None:
        return "null"
    if isinstance(valor, bool):
        return "true" if valor else "false"
    if isinstance(valor, int):
        return str(valor)
    return "'" + str(valor).replace("'", "''") + "'"


# Uma leitura so, devolvendo um `jsonb`: o retrato contra o qual o plano e resolvido e validado.
# ⚠️ So `select`. Os nomes de instrutor vem para a MEMORIA do processo (o casamento por posto e
#    nome de guerra precisa deles) e NUNCA sao gravados em arquivo por este script.
_REFERENCIA = """
with t as (
  select t.id, t.codigo, t.curso_id, c.codigo as curso, t.alunos, t.sala_alocada, t.data_inicio, t.data_termino,
         t.status, (c.curriculo_modelo = 'competencias') as por_competencias
    from public.turmas t join public.cursos c on c.id = t.curso_id
   where t.codigo = {turma}
)
select jsonb_build_object(
  'turma', (select to_jsonb(t) from t),
  'autor', (select jsonb_build_object('codigo', u.codigo, 'auth_user_id', u.auth_user_id, 'status', u.status)
              from public.usuarios u where u.codigo = {autor}),
  'disciplinas', (select coalesce(jsonb_agg(jsonb_build_object(
       'id', d.id, 'cod', d.cod_disciplina, 'nome', d.nome_disciplina, 'ch', d.carga_horaria_tempos,
       'sem_ue', d.sem_unidades_ensino)), '[]')
       from public.disciplinas d where d.curso_id = (select curso_id from t) and d.status = 'ativo'),
  'ues', (select coalesce(jsonb_agg(jsonb_build_object(
       'id', u.id, 'codigo', u.codigo, 'disciplina_id', u.disciplina_id, 'numero', u.numero_ue,
       'topico', u.topico, 'ch', u.ch_prevista_tempos)), '[]')
       from public.unidades_ensino u where u.curso_id = (select curso_id from t) and u.status = 'ativo'),
  'instrutores', (select coalesce(jsonb_agg(jsonb_build_object(
       'id', i.id, 'codigo', i.codigo, 'posto', i.posto_graduacao, 'esp', i.esp_hab_obs,
       'nome', i.nome_completo, 'guerra', i.nome_guerra)), '[]')
       from public.instrutores i where i.status = 'ativo'),
  'habilitacoes', (select coalesce(jsonb_agg(jsonb_build_object(
       'instrutor_id', h.instrutor_id, 'disciplina_id', h.disciplina_id, 'status', h.status)), '[]')
       from public.instrutor_disciplina h
      where h.disciplina_id in (select id from public.disciplinas where curso_id = (select curso_id from t))),
  'metodologias', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'sigla', metadados ->> 'sigla')), '[]')
       from public.config_listas where lista = 'metodologias' and ativo),
  'tipos_atividade', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'categoria', metadados ->> 'categoria')), '[]')
       from public.config_listas where lista = 'tipos_atividade' and ativo),
  'tipos_avaliacao', (select coalesce(jsonb_agg(valor), '[]') from public.config_listas where lista = 'tipos_avaliacao' and ativo),
  'salas', (select coalesce(jsonb_agg(valor), '[]') from public.config_listas where lista = 'salas' and ativo),
  'tetos', (select coalesce(jsonb_object_agg(chave, valor), '{{}}') from public.config_parametros
             where chave in ('dsa.teto_tfm_semana', 'dsa.teto_recomendado_semana') and status = 'ativo'),
  'feriados', (select coalesce(jsonb_agg(jsonb_build_object(
       'data', f.data, 'descricao', f.descricao, 'impacto', f.impacto, 'codigo', f.codigo)), '[]')
       from public.feriados f where f.status = 'ativo' and f.data between {de}::date and {ate}::date),
  'regime', (select to_jsonb(v) from public.vw_cursos_regime_vigente v where v.curso_id = (select curso_id from t)),
  'da_turma', (select coalesce(jsonb_agg(jsonb_build_object(
       'origem', o.origem, 'data', o.data, 'ta_inicial', o.ta_inicial, 'tempos', o.tempos_consumidos,
       'disciplina_id', o.disciplina_id, 'fato_id', o.fato_id)), '[]')
       from public.vw_ocupacao_ta o where o.turma_id = (select id from t)),
  'codigos', jsonb_build_object(
       'registros_aula', (select coalesce(jsonb_agg(codigo), '[]') from public.registros_aula where turma_id = (select id from t)),
       'avaliacoes', (select coalesce(jsonb_agg(codigo), '[]') from public.avaliacoes where turma_id = (select id from t)),
       'atividades_nao_letivas', (select coalesce(jsonb_agg(codigo), '[]') from public.atividades_nao_letivas where turma_id = (select id from t))),
  -- O que a carga das planilhas JA pos nesta turma, em chaves naturais: e contra isto que a
  -- sincronizacao decide o que e novo, o que mudou e o que saiu da planilha.
  'atuais', jsonb_build_object(
    'aulas', (select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', r.codigo, 'data', r.data, 'ta_inicial', r.ta_inicial, 'tempos_consumidos', r.tempos_consumidos,
        'ue', u.codigo, 'disciplina_sem_ue', d.cod_disciplina, 'instrutor', i.codigo, 'metodologia', r.metodologia,
        'local', r.local, 'conteudo_resumo', r.conteudo_resumo, 'status', r.status,
        'demais', split_part(coalesce(r.observacoes, ''), ' Demais instrutores: ', 2))), '[]')
      from public.registros_aula r left join public.unidades_ensino u on u.id = r.unidade_ensino_id
      left join public.disciplinas d on d.id = r.disciplina_id left join public.instrutores i on i.id = r.instrutor_id
     where r.turma_id = (select id from t) and r.codigo like 'DSAP-%'),
    'avaliacoes', (select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', a.codigo, 'disciplina', d.cod_disciplina, 'tipo_avaliacao', a.tipo_avaliacao,
        'data_avaliacao', a.data_avaliacao, 'ta_inicial', a.ta_inicial, 'tempos_consumidos', a.tempos_consumidos,
        'instrutor', i.codigo, 'fiscal', f.codigo, 'nome_fiscal_externo', a.nome_fiscal_externo,
        'metodologia', a.metodologia, 'local', a.local, 'conteudo_resumo', a.conteudo_resumo,
        'data_vista_prova', a.data_vista_prova, 'ta_inicial_vista', a.ta_inicial_vista,
        'tempos_consumidos_vista', a.tempos_consumidos_vista, 'local_vista', a.local_vista,
        'status', case when a.status = 'cancelada' then 'inativo' else 'ativo' end)), '[]')
      from public.avaliacoes a join public.disciplinas d on d.id = a.disciplina_id
      left join public.instrutores i on i.id = a.instrutor_responsavel_id left join public.instrutores f on f.id = a.fiscal_id
     where a.turma_id = (select id from t) and a.codigo like 'DSAP-%'),
    'atividades', (select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', n.codigo, 'categoria_normativa', n.categoria_normativa, 'data', n.data, 'subtipo', n.subtipo,
        'descricao', n.descricao, 'ta_inicial', n.ta_inicial, 'tempos_consumidos', n.tempos_consumidos,
        'local', n.local, 'instrutor', i.codigo, 'responsavel_externo', n.responsavel_externo, 'status', n.status)), '[]')
      from public.atividades_nao_letivas n left join public.instrutores i on i.id = n.instrutor_id
     where n.turma_id = (select id from t) and n.codigo like 'DSAP-%')),
  -- O que veio do ETL e ainda esta ATIVO: e o que «substituir, nao somar» vai inativar.
  'etl', jsonb_build_object(
    'aulas', (select count(*) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'ativo'),
    'aulas_ta', (select coalesce(sum(tempos_consumidos), 0) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'ativo'),
    'avaliacoes', (select count(*) from public.avaliacoes where turma_id = (select id from t) and origem_migracao_v1 is not null and status <> 'cancelada'),
    'atividades', (select count(*) from public.atividades_nao_letivas where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'ativo'),
    'de_tela', (select count(*) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status = 'ativo')
              + (select count(*) from public.avaliacoes where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status <> 'cancelada')
              + (select count(*) from public.atividades_nao_letivas where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status = 'ativo')),
  'de_outras_turmas', (select coalesce(jsonb_agg(jsonb_build_object(
       'turma', x.codigo, 'origem', o.origem, 'data', o.data, 'ta_inicial', o.ta_inicial, 'ta_final', o.ta_final,
       'instrutor_id', o.instrutor_id, 'fiscal_id', o.fiscal_id, 'local', o.local)), '[]')
       from public.vw_ocupacao_ta o join public.turmas x on x.id = o.turma_id
      where o.turma_id <> (select id from t) and o.data between {de}::date and {ate}::date)
) as m;
"""


def referencia(destino: str, turma: str, autor: str, de: str, ate: str) -> dict:
    linhas = consultar(destino, _REFERENCIA.format(turma=lit(turma), autor=lit(autor), de=lit(de), ate=lit(ate)))
    retrato = linhas[0]["m"] if linhas else None
    if isinstance(retrato, str):
        retrato = json.loads(retrato)
    if not retrato or retrato.get("turma") is None:
        raise RecusaDoBanco(f"a turma «{turma}» nao existe no destino «{destino}»")
    return retrato
