-- =================================================================================
-- Spec 014, PR 4 · migration de DADO D-5 — as correções banco × currículo (§11-A)
-- Data local: 14/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- O que faz (FR-031.1, D-CUR-1; lote aprovado EM BLOCO por Bernardo Villas Boas em 13/10/2026, com o impacto
-- mostrado CASO A CASO antes da aplicação — antes-depois/correcoes_banco_x_curriculo.md):
--   B-1  C-Ap-FR · III ............................ CH 76 → 75
--   B-2  C-Exp-MetocOf · I ........................ CH 48 → 30
--   B-3  C-Exp-MetocOf · V ........................ CH 40 → 50
--   B-5  C-Esp-ALH · PUBLICAÇÕES E NORMAS ......... reativada, `cod_disciplina` ALH-II → ALH-III (PDF, p. 5 e 9)
--   B-6  C-Espc-FR · TFMFR-004 (TFM) ............... CH 47 → 48
--   B-7  C-Espc-FR · HN-1104-0506 → FAANFR-005 «FÍSICA APLICADA AOS AUXÍLIOS À NAVEGAÇÃO.» (PDF, p. 15)
--        C-Espc-FR · SN-1103-0506 → PSFFR-014 «PRIMEIROS SOCORROS EM FARÓIS.» (PDF, p. 80)
--   B-8  C-Espc-HN · HN-1106-0423 (NAV I) ......... CH 100 → 108 (PDF, p. 32)
--        C-Espc-HN · HN-1107-1011 (NAV II) ........ CH 128 → 120 (PDF, p. 45)
--
--   B-12 C-Exp-Metoc-OF-SP · IV «EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA…» (18 TA) — INATIVADA: o
--        currículo do SP tem quatro disciplinas, I Meteorologia, II Técnicas de Previsão do Tempo, III Oceanografia
--        e IV Estágio Prático (índice, p. 2 de `of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf`); a do
--        banco foi trazida do C-Exp-MetocOf. Nenhum lançamento aponta para ela (conferido aqui dentro).
--        Conferida no PDF por decisão de Bernardo Villas Boas (A4.2, 14/10/2026: «se o PDF confirmar, inclua»).
--
-- ⚠️ FORA DESTA MIGRATION: B-4 (EST-QF-APOC I). O PDF NÃO confirma correção: a disciplina tem CH 79 no próprio
--    currículo (p. 4, «3) DISCIPLINA E CARGA HORÁRIA … 79 HORAS»; p. 5, «CÓDIGO: I · CARGA HORÁRIA: 79 HORAS»), que é
--    o que o banco tem; quem soma 80 são as UEs (9+18+9+20+24, p. 5–6), com o TR de 1 h listado à parte (p. 4).
--    B-9 e B-10 são da D-6; B-11 é a `PEND-014-3`.
-- ⚠️ Cada caso confere o VALOR ANTIGO antes de mudar: se a disciplina não estiver como o lote a mediu, a
--    migration ABORTA nomeando o caso — nunca corrige às cegas. Idempotente: o caso já corrigido é pulado.
-- ⚠️ A contagem de lançamentos por disciplina é conferida INTACTA dentro da transação (nenhum lançamento muda
--    de disciplina numa correção de CH, código ou nome).
-- ⚠️ Abstém-se, com aviso, em base sem cadastros (o `db reset`); a ETAPA 6 do ETL aplica o mesmo arquivo.
--
-- Reversão (reversao-pr4.sql): os valores antigos, escritos aqui e no `migracao_log`.
-- =================================================================================

do $$
declare
  c record;
  v_id uuid;
  v_feitos integer := 0;
  v_pulados integer := 0;
  v_lanc_antes bigint;
  v_lanc_depois bigint;
  v_carimbo text := to_char(now(), 'YYYYMMDDHH24MISS');
begin
  if not exists (select 1 from public.cursos where codigo = 'C-Espc-FR') then
    raise notice 'D-5 (spec 014): base sem cadastros — a migration se abstém (a ETAPA 6 do ETL aplica o mesmo arquivo).';
    return;
  end if;

  select (select count(*) from public.registros_aula) + (select count(*) from public.avaliacoes)
       + (select count(*) from public.atividades_nao_letivas) into v_lanc_antes;

  for c in
    select * from (values
      -- caso, curso, cod_disciplina hoje, CH antes, CH depois, cod depois, nome depois, reativar
      ('B-1', 'C-Ap-FR',       'III',          76,  75,  null::text,  null::text,                                     false),
      ('B-2', 'C-Exp-MetocOf', 'I',            48,  30,  null,        null,                                           false),
      ('B-3', 'C-Exp-MetocOf', 'V',            40,  50,  null,        null,                                           false),
      ('B-6', 'C-Espc-FR',     'TFMFR-004',    47,  48,  null,        null,                                           false),
      ('B-7', 'C-Espc-FR',     'HN-1104-0506', 30,  30,  'FAANFR-005', 'FÍSICA APLICADA AOS AUXÍLIOS À NAVEGAÇÃO.',   false),
      ('B-7', 'C-Espc-FR',     'SN-1103-0506', 40,  40,  'PSFFR-014',  'PRIMEIROS SOCORROS EM FARÓIS.',              false),
      ('B-8', 'C-Espc-HN',     'HN-1106-0423', 100, 108, null,        null,                                           false),
      ('B-8', 'C-Espc-HN',     'HN-1107-1011', 128, 120, null,        null,                                           false),
      ('B-5', 'C-Esp-ALH',     'ALH-II',       32,  32,  'ALH-III',   null,                                           true)
    ) as x(caso, curso, cod, ch_antes, ch_depois, cod_depois, nome_depois, reativar)
  loop
    -- Já corrigido? (idempotência)
    select d.id into v_id from public.disciplinas d join public.cursos k on k.id = d.curso_id
     where k.codigo = c.curso and d.cod_disciplina = coalesce(c.cod_depois, c.cod)
       and d.carga_horaria_tempos = c.ch_depois and d.status = 'ativo'
       and (c.nome_depois is null or d.nome_disciplina = c.nome_depois)
       and (c.cod_depois is not null or c.ch_antes <> c.ch_depois);
    if v_id is not null then
      v_pulados := v_pulados + 1;
      continue;
    end if;

    select d.id into v_id from public.disciplinas d join public.cursos k on k.id = d.curso_id
     where k.codigo = c.curso and d.cod_disciplina = c.cod and d.carga_horaria_tempos = c.ch_antes
       and d.status = case when c.reativar then 'inativo'::public.status_registro else 'ativo'::public.status_registro end
       and (not c.reativar or d.nome_disciplina = 'PUBLICAÇÕES E NORMAS.');
    if v_id is null then
      raise exception 'D-5 %: a disciplina % de % não está como o lote a mediu (CH %). Pare e confira.', c.caso, c.cod, c.curso, c.ch_antes;
    end if;

    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    select 'MLOG-014-D5-' || v_carimbo || '-' || c.caso || '-' || c.cod, 'disciplinas', d.codigo, 'disciplinas', d.codigo,
           'corrigido'::public.acao_migracao, 'FR-031.1 / D-CUR-1 (spec 014, ' || c.caso || ')',
           format('cod=%s; nome=%s; ch=%s; status=%s', d.cod_disciplina, d.nome_disciplina, d.carga_horaria_tempos, d.status),
           format('cod=%s; nome=%s; ch=%s; status=ativo', coalesce(c.cod_depois, d.cod_disciplina),
                  coalesce(c.nome_depois, d.nome_disciplina), c.ch_depois),
           'Correção banco × currículo (§11-A), aprovada em bloco em 13/10/2026.'
      from public.disciplinas d where d.id = v_id;

    update public.disciplinas
       set carga_horaria_tempos = c.ch_depois,
           cod_disciplina = coalesce(c.cod_depois, cod_disciplina),
           nome_disciplina = coalesce(c.nome_depois, nome_disciplina),
           status = 'ativo'
     where id = v_id;
    v_feitos := v_feitos + 1;
  end loop;

  -- B-12: inativar a disciplina que o currículo do SP não tem (regra 4: nada é apagado).
  select d.id into v_id from public.disciplinas d join public.cursos k on k.id = d.curso_id
   where k.codigo = 'C-Exp-Metoc-OF-SP' and d.cod_disciplina = 'IV' and d.nome_disciplina like 'EFEITOS ATMOSF%'
     and d.carga_horaria_tempos = 18 and d.status = 'ativo';
  if v_id is not null then
    if exists (select 1 from public.registros_aula r left join public.unidades_ensino u on u.id = r.unidade_ensino_id
                where coalesce(u.disciplina_id, r.disciplina_id) = v_id)
       or exists (select 1 from public.avaliacoes a where a.disciplina_id = v_id) then
      raise exception 'D-5 B-12: há lançamento na disciplina IV do C-Exp-Metoc-OF-SP — pare e confira antes de inativar.';
    end if;
    insert into public.migracao_log (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
                                     acao, regra_aplicada, valor_antes, valor_depois, observacao)
    select 'MLOG-014-D5-' || v_carimbo || '-B-12', 'disciplinas', d.codigo, 'disciplinas', d.codigo,
           'arquivado'::public.acao_migracao, 'FR-031.1 / D-CUR-1 (spec 014, B-12)',
           format('cod=%s; nome=%s; ch=%s; status=ativo', d.cod_disciplina, d.nome_disciplina, d.carga_horaria_tempos),
           'status=inativo', 'O currículo do C-Exp-Metoc-OF-SP não tem esta disciplina (índice, p. 2).'
      from public.disciplinas d where d.id = v_id;
    update public.turma_disciplina set status = 'inativo' where disciplina_id = v_id and status = 'ativo';
    update public.disciplinas set status = 'inativo' where id = v_id;
    v_feitos := v_feitos + 1;
  end if;

  select (select count(*) from public.registros_aula) + (select count(*) from public.avaliacoes)
       + (select count(*) from public.atividades_nao_letivas) into v_lanc_depois;
  if v_lanc_depois <> v_lanc_antes then
    raise exception 'D-5: a contagem de lançamentos mudou (% → %).', v_lanc_antes, v_lanc_depois;
  end if;

  raise notice 'D-5 (spec 014): % correção(ões) aplicada(s), % já estava(m) feita(s).', v_feitos, v_pulados;
end;
$$;
