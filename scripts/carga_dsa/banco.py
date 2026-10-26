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
# ⚠️ Spec 021 (Bloco 6, RC-1): o modelo (UEs ou competencias) e do CURRICULO DA TURMA, nao mais do curso.
# ⚠️ Spec 021 (Bloco 6, D-17): as disciplinas, as UEs, as habilitacoes e os itens sao os do CURRICULO DA TURMA. Com
#    dois curriculos, o curso traria os dois — e a planilha casaria a linha com a disciplina do outro curriculo, que o
#    banco recusa para esta turma (FR-002.3 da spec 021).
_REFERENCIA = """
with t as (
  select t.id, t.codigo, t.curso_id, t.curriculo_id, c.codigo as curso, t.alunos, t.sala_alocada, t.data_inicio, t.data_termino,
         t.status, (cr.curriculo_modelo = 'competencias') as por_competencias
    from public.turmas t join public.cursos c on c.id = t.curso_id
    join public.curriculos cr on cr.id = t.curriculo_id
   where t.codigo = {turma}
)
select jsonb_build_object(
  'turma', (select to_jsonb(t) from t),
  'autor', (select jsonb_build_object('codigo', u.codigo, 'auth_user_id', u.auth_user_id, 'status', u.status)
              from public.usuarios u where u.codigo = {autor}),
  'disciplinas', (select coalesce(jsonb_agg(jsonb_build_object(
       'id', d.id, 'cod', d.cod_disciplina, 'nome', d.nome_disciplina, 'ch', d.carga_horaria_tempos,
       'sem_ue', d.sem_unidades_ensino)), '[]')
       from public.disciplinas d where d.curriculo_id = (select curriculo_id from t) and d.status = 'ativo'),
  'ues', (select coalesce(jsonb_agg(jsonb_build_object(
       'id', u.id, 'codigo', u.codigo, 'disciplina_id', u.disciplina_id, 'numero', u.numero_ue,
       'topico', u.topico, 'ch', u.ch_prevista_tempos)), '[]')
       from public.unidades_ensino u
      where u.disciplina_id in (select id from public.disciplinas where curriculo_id = (select curriculo_id from t))
        and u.status = 'ativo'),
  'instrutores', (select coalesce(jsonb_agg(jsonb_build_object(
       'id', i.id, 'codigo', i.codigo, 'posto', i.posto_graduacao, 'esp', i.esp_hab_obs,
       'nome', i.nome_completo, 'guerra', i.nome_guerra)), '[]')
       from public.instrutores i where i.status = 'ativo'),
  'habilitacoes', (select coalesce(jsonb_agg(jsonb_build_object(
       'instrutor_id', h.instrutor_id, 'disciplina_id', h.disciplina_id, 'status', h.status)), '[]')
       from public.instrutor_disciplina h
      where h.disciplina_id in (select id from public.disciplinas where curriculo_id = (select curriculo_id from t))),
  -- Spec 014 (PR 6, FR-036, FR-039): os itens do curriculo do curso, com o instrumento, e os ajustes desta turma.
  'itens_curriculo', (select coalesce(jsonb_agg(jsonb_build_object(
       'id', c.id, 'disciplina_id', c.disciplina_id, 'numero', c.numero, 'instrumento', l.valor,
       'instrumento_nome', l.rotulo_exibicao, 'natureza', l.metadados ->> 'natureza',
       'ta_aplicacao', c.ta_aplicacao, 'origem_ta_aplicacao', c.origem_ta_aplicacao,
       'ta_vista', c.ta_vista, 'origem_ta_vista', c.origem_ta_vista) order by c.disciplina_id, c.ordem), '[]')
       from public.avaliacoes_curriculo c join public.config_listas l on l.id = c.instrumento_id
      where c.disciplina_id in (select id from public.disciplinas where curriculo_id = (select curriculo_id from t))
        and c.status = 'ativo' and (l.metadados ->> 'natureza') <> 'od'),
  'ajustes', (select coalesce(jsonb_agg(jsonb_build_object(
       'avaliacao_curriculo_id', x.avaliacao_curriculo_id, 'origem', x.origem, 'confirmado', x.confirmado_em is not null,
       'ta_aplicacao', x.ta_aplicacao, 'ta_vista', x.ta_vista, 'status', x.status)), '[]')
       from public.avaliacoes_curriculo_turma x where x.turma_id = (select id from t) and x.status = 'ativo'),
  -- Emenda de 15/10/2026 (desenho aprovado em 16/10/2026): a marca da RN-AV-13 (PM, PO e PE, migration D-9) e a janela
  -- da RN-AV-12 sao DADO do banco — a sincronizacao le daqui, nunca de uma constante.
  'instrumentos_com_vista', (select coalesce(jsonb_agg(valor order by valor), '[]') from public.config_listas
       where lista = 'instrumentos_avaliacao' and (metadados ->> 'vista_obrigatoria')::boolean),
  'instrumentos', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'nome', rotulo_exibicao) order by valor), '[]')
       from public.config_listas where lista = 'instrumentos_avaliacao' and ativo),
  'janela_sessoes_dias', (select valor from public.config_parametros where chave = 'avaliacao.janela_sessoes_dias' and status = 'ativo'),
  'metodologias', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'sigla', metadados ->> 'sigla')), '[]')
       from public.config_listas where lista = 'metodologias' and ativo),
  'tipos_atividade', (select coalesce(jsonb_agg(jsonb_build_object('valor', valor, 'categoria', metadados ->> 'categoria')), '[]')
       from public.config_listas where lista = 'tipos_atividade' and ativo),
  'tipos_avaliacao', (select coalesce(jsonb_agg(valor), '[]') from public.config_listas where lista = 'tipos_avaliacao' and ativo),
  'tipos_parada', (select coalesce(jsonb_object_agg(valor, id), '{{}}') from public.config_listas where lista = 'tipos_parada' and ativo),
  'salas', (select coalesce(jsonb_agg(valor), '[]') from public.config_listas where lista = 'salas' and ativo),
  'tetos', (select coalesce(jsonb_object_agg(chave, valor), '{{}}') from public.config_parametros
             where chave in ('dsa.teto_tfm_semana', 'dsa.teto_recomendado_semana') and status = 'ativo'),
  'feriados', (select coalesce(jsonb_agg(jsonb_build_object(
       'data', f.data, 'descricao', f.descricao, 'impacto', f.impacto, 'codigo', f.codigo)), '[]')
       from public.feriados f where f.status = 'ativo' and f.data between {de}::date and {ate}::date),
  'regime', (select to_jsonb(v) from public.vw_cursos_regime_vigente v where v.curso_id = (select curso_id from t)),
  'catalogos', (select coalesce(jsonb_object_agg(h.codigo, jsonb_build_object('id', h.id, 'tempos', (
       select coalesce(jsonb_agg(jsonb_build_object('tempo_numero', t.tempo_numero, 'hora_inicio', t.hora_inicio, 'hora_fim', t.hora_fim,
              'tipo_tempo', t.tipo_tempo) order by t.tempo_numero), '[]') from public.horarios_tempos_aula t where t.configuracao_id = h.id))), '{{}}')
       from public.configuracoes_horario h where h.status = 'ativo'),
  'vigencias', (select coalesce(jsonb_agg(jsonb_build_object(
       'id', r.id, 'codigo', r.codigo, 'tipo_regime', r.tipo_regime, 'configuracao_horario_id', r.configuracao_horario_id,
       'regime_tempos', r.regime_tempos, 'ta_duracao_min', r.ta_duracao_min, 'intervalo_manha_min', r.intervalo_manha_min,
       'intervalo_tarde_min', r.intervalo_tarde_min, 'hora_inicio_manha', r.hora_inicio_manha, 'hora_inicio_tarde', r.hora_inicio_tarde,
       'limite_diario_ead_horas', r.limite_diario_ead_horas, 'vigente_de', r.vigente_de, 'vigente_ate', r.vigente_ate,
       'fundamento_curricular', r.fundamento_curricular) order by r.vigente_de), '[]')
       from public.curso_regime_historico r where r.curso_id = (select curso_id from t) and r.status = 'ativo'
         and r.vigente_de <= {ate}::date and (r.vigente_ate is null or r.vigente_ate >= {de}::date)),
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
        'local', r.local, 'conteudo_resumo', r.conteudo_resumo, 'status', r.status, 'na_tela', r.editado_por is not null,
        'demais', split_part(coalesce(r.observacoes, ''), ' Demais instrutores: ', 2),
        'outros_instrutores', to_jsonb(r.outros_instrutores))), '[]')
      from public.registros_aula r left join public.unidades_ensino u on u.id = r.unidade_ensino_id
      left join public.disciplinas d on d.id = r.disciplina_id left join public.instrutores i on i.id = r.instrutor_id
     where r.turma_id = (select id from t) and r.codigo like 'DSAP-%'),
    'avaliacoes', (select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', a.codigo, 'disciplina', d.cod_disciplina, 'tipo_avaliacao', a.tipo_avaliacao,
        'data_avaliacao', a.data_avaliacao, 'ta_inicial', a.ta_inicial, 'tempos_consumidos', a.tempos_consumidos,
        'instrutor', i.codigo, 'fiscal', f.codigo, 'nome_fiscal_externo', a.nome_fiscal_externo,
        'metodologia', a.metodologia, 'local', a.local, 'conteudo_resumo', a.conteudo_resumo,
        -- Spec 014 (PR 6): o item (pelo rotulo «PM 1», que e o mesmo nos dois bancos), o 2º instrutor e as SESSOES.
        'item', (select l.valor || ' ' || c.numero from public.avaliacoes_curriculo c
                   join public.config_listas l on l.id = c.instrumento_id where c.id = a.avaliacao_curriculo_id),
        'outros_instrutores', to_jsonb(a.outros_instrutores), 'ues_abordadas', a.ues_abordadas,
        'sessoes', (select coalesce(jsonb_agg(jsonb_build_object(
            'codigo', s.codigo, 'numero', s.numero, 'data', s.data, 'ta_inicial', s.ta_inicial,
            'tempos_consumidos', s.tempos_consumidos, 'local', s.local, 'conduz', ci.codigo::text,
            'conduz_nome_externo', s.conduz_nome_externo) order by s.numero), '[]')
            from public.vistas_de_avaliacao s left join public.instrutores ci on ci.id = s.conduz_instrutor_id
           where s.avaliacao_id = a.id and s.status = 'ativo' and s.data < {virada}::date),
        -- ⚠️ A sessao da virada em diante e do SISTEMA (A3.3): ela nao se compara com a planilha (achado de 16/10/2026,
        --    a vista 2 lancada na tela para 23/10 numa prova de 06/08 da CAHO, que a rodada inativava).
        -- RN-AV-12 (desenho aprovado em 16/10/2026): as sessoes de aplicacao 2..N que a SINCRONIZACAO pos (codigo
        -- DSAP-). A sessao nascida na tela (SAP-, o DSA ou «juntar como sessao») nao e da planilha: fica como esta.
        'aplicacoes', (select coalesce(jsonb_agg(jsonb_build_object(
            'codigo', p.codigo, 'numero', p.numero, 'data', p.data, 'ta_inicial', p.ta_inicial,
            'tempos_consumidos', p.tempos_consumidos, 'local', p.local) order by p.numero), '[]')
            from public.sessoes_de_aplicacao p
           where p.avaliacao_id = a.id and p.status = 'ativo' and p.codigo like 'DSAP-%' and p.data < {virada}::date),
        -- A2: o instrumento gravado da prova SEM item (com item, a coluna fica nula).
        'instrumento_gravado', (select l.valor from public.config_listas l where l.id = a.instrumento_id),
        -- ⚠️ A linha CORRIGIDA NO SISTEMA por decisao (16/10/2026, D1 e D2) tambem vence a planilha, como a editada na
        --    tela: a migration de dado que a corrige roda sem sessao e zera `editado_por`, e a marca na observacao e o
        --    que a mantem protegida.
        'na_tela', a.editado_por is not null or coalesce(a.observacoes, '') like '%[CORRIGIDO NO SISTEMA%',
        -- R7 (16/10/2026): o que PERSISTE alem da planilha — juntada como sessao de outra, o TA das sessoes de aplicacao
        -- nascidas na tela (SAP-, o «juntar») e as vistas nascidas na tela (nao DSAP-). A lista consulta antes de acusar.
        'juntada', coalesce(a.observacoes, '') like '%[JUNTADA COMO SESSAO%',
        'ta_fora_da_planilha', (select coalesce(sum(p.tempos_consumidos), 0) from public.sessoes_de_aplicacao p
                                  where p.avaliacao_id = a.id and p.status = 'ativo' and p.codigo not like 'DSAP-%'),
        'vistas_fora_da_planilha', (select count(*) from public.vistas_de_avaliacao v
                                      where v.avaliacao_id = a.id and v.status = 'ativo' and v.codigo not like 'DSAP-%'),
        'status', case when a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada') then 'ativo'
                       when coalesce(a.observacoes, '') like '%[SAIU DA PLANILHA DE CONTROLE]%' then 'inativo'
                       else 'cancelada_na_tela' end)), '[]')
      from public.avaliacoes a join public.disciplinas d on d.id = a.disciplina_id
      left join public.instrutores i on i.id = a.instrutor_responsavel_id left join public.instrutores f on f.id = a.fiscal_id
     where a.turma_id = (select id from t) and a.codigo like 'DSAP-%'),
    'atividades', (select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', n.codigo, 'categoria_normativa', n.categoria_normativa, 'data', n.data, 'subtipo', n.subtipo,
        'descricao', n.descricao, 'ta_inicial', n.ta_inicial, 'tempos_consumidos', n.tempos_consumidos,
        'local', n.local, 'instrutor', i.codigo, 'responsavel_externo', n.responsavel_externo, 'status', n.status,
        'na_tela', n.editado_por is not null)), '[]')
      from public.atividades_nao_letivas n left join public.instrutores i on i.id = n.instrutor_id
     where n.turma_id = (select id from t) and n.codigo like 'DSAP-%'),
    -- Spec 014 (FR-024): o dia parado da turma que a carga pos (codigo DSAP-…-P).
    'dias_parados', (select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', p.codigo, 'data', p.data, 'ta_inicial', p.ta_inicial, 'tempos', p.tempos,
        'tipo_parada', c.valor, 'motivo', p.motivo, 'prevista', p.prevista, 'status', p.status,
        'na_tela', p.editado_por is not null)), '[]')
      from public.dias_parados p join public.config_listas c on c.id = p.tipo_parada_id
     where p.turma_id = (select id from t) and p.codigo like 'DSAP-%')),
  -- O que veio do ETL e ainda esta ATIVO: e o que «substituir, nao somar» vai inativar.
  'etl', jsonb_build_object(
    'aulas', (select count(*) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'ativo' and data < {virada}::date),
    'aulas_ta', (select coalesce(sum(tempos_consumidos), 0) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'ativo' and data < {virada}::date),
    'avaliacoes', (select count(*) from public.avaliacoes where turma_id = (select id from t) and origem_migracao_v1 is not null and status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and data_avaliacao < {virada}::date),
    'atividades', (select count(*) from public.atividades_nao_letivas where turma_id = (select id from t) and origem_migracao_v1 is not null and status = 'ativo' and data < {virada}::date),
    'de_tela', (select count(*) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status = 'ativo' and data < {virada}::date)
              + (select count(*) from public.avaliacoes where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and data_avaliacao < {virada}::date)
              + (select count(*) from public.atividades_nao_letivas where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status = 'ativo' and data < {virada}::date),
    'de_tela_depois_da_virada', (select count(*) from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status = 'ativo' and data >= {virada}::date)
              + (select count(*) from public.avaliacoes where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and data_avaliacao >= {virada}::date)
              + (select count(*) from public.atividades_nao_letivas where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status = 'ativo' and data >= {virada}::date)),
  -- Spec 014 (A3.3 e A3.4, 14/10/2026): o lancamento NASCIDO na tela antes da virada fica como esta, e a
  -- linha da planilha no mesmo tempo sai do plano e vai para a lista «planilha diverge do sistema».
  'de_tela_linhas', (select coalesce(jsonb_agg(x), '[]') from (
       select jsonb_build_object('tabela', 'aulas', 'codigo', codigo, 'data', data, 'ta_inicial', ta_inicial, 'tempos', tempos_consumidos) as x
         from public.registros_aula where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status = 'ativo' and data < {virada}::date
       union all
       select jsonb_build_object('tabela', 'avaliacoes', 'codigo', codigo, 'data', data_avaliacao, 'ta_inicial', ta_inicial, 'tempos', tempos_consumidos)
         from public.avaliacoes where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and data_avaliacao < {virada}::date
       union all
       -- Spec 014 (PR 6): a vista feita na tela e SESSAO — cada uma ocupa o seu tempo.
       select jsonb_build_object('tabela', 'avaliacoes', 'codigo', a.codigo || ' (vista ' || s.numero || ')', 'data', s.data, 'ta_inicial', s.ta_inicial, 'tempos', s.tempos_consumidos)
         from public.vistas_de_avaliacao s join public.avaliacoes a on a.id = s.avaliacao_id
        where a.turma_id = (select id from t) and a.origem_migracao_v1 is null and a.codigo not like 'DSAP-%' and s.status = 'ativo'
          and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and s.data < {virada}::date
       union all
       -- RN-AV-12: a sessao de aplicacao feita na TELA (SAP-, de qualquer avaliacao) ocupa o seu tempo.
       select jsonb_build_object('tabela', 'avaliacoes', 'codigo', a.codigo || ' (sessao ' || p.numero || ')', 'data', p.data, 'ta_inicial', p.ta_inicial, 'tempos', p.tempos_consumidos)
         from public.sessoes_de_aplicacao p join public.avaliacoes a on a.id = p.avaliacao_id
        where a.turma_id = (select id from t) and p.codigo not like 'DSAP-%' and p.status = 'ativo'
          and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada') and p.data < {virada}::date
       union all
       select jsonb_build_object('tabela', 'atividades', 'codigo', codigo, 'data', data, 'ta_inicial', ta_inicial, 'tempos', tempos_consumidos)
         from public.atividades_nao_letivas where turma_id = (select id from t) and origem_migracao_v1 is null and codigo not like 'DSAP-%' and status = 'ativo' and data < {virada}::date) s),
  'de_outras_turmas', (select coalesce(jsonb_agg(jsonb_build_object(
       'turma', x.codigo, 'origem', o.origem, 'data', o.data, 'ta_inicial', o.ta_inicial, 'ta_final', o.ta_final,
       'instrutor_id', o.instrutor_id, 'fiscal_id', o.fiscal_id, 'local', o.local)), '[]')
       from public.vw_ocupacao_ta o join public.turmas x on x.id = o.turma_id
      where o.turma_id <> (select id from t) and o.data between {de}::date and {ate}::date)
) as m;
"""


def referencia(destino: str, turma: str, autor: str, de: str, ate: str, virada: str | None = None) -> dict:
    """`virada` (spec 014, A3.3): a data a partir da qual o SISTEMA e a fonte da turma; sem ela, nunca."""
    linhas = consultar(destino, _REFERENCIA.format(turma=lit(turma), autor=lit(autor), de=lit(de), ate=lit(ate),
                                                   virada=lit(virada or "9999-12-31")))
    retrato = linhas[0]["m"] if linhas else None
    if isinstance(retrato, str):
        retrato = json.loads(retrato)
    if not retrato or retrato.get("turma") is None:
        raise RecusaDoBanco(f"a turma «{turma}» nao existe no destino «{destino}»")
    return retrato


def arquivadas(destino: str, turmas: list[str]) -> dict[str, str]:
    """D4 (Bernardo Villas Boas, 26/10/2026): as turmas pedidas que estao ARQUIVADAS no destino, com a data do arquivamento.

    So leitura. «Arquivada» e o que `app.turma_arquivada` diz (D-COR-5: o ultimo evento de `turma_arquivamentos` e
    `arquivar`) — a mesma funcao que o gatilho de somente leitura consulta, para a rodada e o banco nunca discordarem.
    """
    if not turmas:
        return {}
    linhas = consultar(destino, f"""
select t.codigo, (select (a.criado_em at time zone 'America/Sao_Paulo')::date::text from public.turma_arquivamentos a
                   where a.turma_id = t.id order by a.ordem desc limit 1) as desde
  from public.turmas t
 where t.codigo = any (array[{', '.join(lit(x) for x in turmas)}]::text[]) and app.turma_arquivada(t.id)""")
    return {l["codigo"]: l["desde"] for l in linhas}


# Spec 014, SC-008 e D-CUR-1: a sincronizacao NUNCA muda o catalogo. O retrato e o md5 da CH de toda
# disciplina e de toda UE, ordenados por codigo, tirado antes da primeira escrita e depois da ultima.
# ⚠️ Desde o PR 6 (T228) ele inclui as AVALIACOES DO CURRICULO de origem `curriculo` (tempos e situacao) e a
#    quantidade de itens: a sugestao da planilha vai para o AJUSTE da turma, nunca para o item.
_RETRATO_DO_CATALOGO = """
select md5(coalesce((select string_agg(codigo || ':' || coalesce(carga_horaria_tempos::text, '-') || ':' || status::text, '|' order by codigo)
                       from public.disciplinas), '')) as disciplinas,
       md5(coalesce((select string_agg(codigo || ':' || coalesce(ch_prevista_tempos::text, '-') || ':' || status::text, '|' order by codigo)
                       from public.unidades_ensino), '')) as unidades,
       md5(coalesce((select string_agg(codigo || ':' || coalesce(ta_aplicacao::text, '-') || ':' || coalesce(ta_vista::text, '-')
                                       || ':' || status::text, '|' order by codigo)
                       from public.avaliacoes_curriculo where origem_item = 'curriculo'), '')) as avaliacoes_do_curriculo,
       (select count(*) from public.disciplinas) as n_disciplinas,
       (select count(*) from public.unidades_ensino) as n_unidades,
       (select count(*) from public.avaliacoes_curriculo) as n_avaliacoes_do_curriculo
"""


def retrato_do_catalogo(destino: str) -> dict:
    """O md5 da CH do catalogo (disciplinas e UEs) — so leitura."""
    return consultar(destino, _RETRATO_DO_CATALOGO)[0]
