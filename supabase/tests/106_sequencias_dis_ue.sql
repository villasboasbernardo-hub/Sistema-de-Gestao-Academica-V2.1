-- =================================================================================
-- 106 — O codigo de disciplina e de unidade de ensino e GERADO PELO BANCO
--
-- O QUE  : prova o `FR-012` e o `FR-061` da spec 010 — `DIS-NNNNNN` e `UE-NNNNNN` nascem
--          do `DEFAULT`, a pessoa nao digita, e a sequencia comeca em 1 sem colidir com
--          nenhum dos codigos legados (Q-11 e N-5, Bernardo Villas Boas, 24/09/2026).
--
-- ⚠️ O CASO QUE DISCRIMINA E O 1: inserir disciplina SEM `codigo`. Antes desta migration
--    a coluna era `NOT NULL` sem `DEFAULT` e a insercao falhava com `23502`; depois, ela
--    passa. Um teste que so conferisse o formato do codigo daria o mesmo veredito antes e
--    depois — bastaria alguem continuar digitando o codigo a mao.
--
-- ⚠️ A ASSERCAO 3 E A DA N-5, e ela e sobre a BASE, nao sobre o formato: se algum codigo
--    legado comecasse com `DIS-`, a sequencia comecando em 1 colidiria mais cedo ou mais
--    tarde. Medido em 25/09/2026 na base carregada: 0 de 175.
-- =================================================================================
begin;
select plan(8);

insert into public.cursos (id, codigo, nome_curso, classificacao, modalidade, duracao_dias) values
  ('a6200000-0000-0000-0000-000000000001', 'T106-CUR', 'Curso T106', 'regular', 'presencial', 30);

insert into public.curso_regime_historico
  (curso_id, tipo_regime, regime_tempos, ta_duracao_min, intervalo_manha_min,
   intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, vigente_de)
values
  ('a6200000-0000-0000-0000-000000000001', 'padrao', 8, 45, 10, 10, '07:30', '13:30', '2020-01-01');

-- -- 1 e 2 — o caso que discrimina: sem `codigo`, a insercao PASSA e o codigo sai pronto
insert into public.disciplinas (id, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
values ('a6300000-0000-0000-0000-000000000001', 'a6200000-0000-0000-0000-000000000001',
        'T106-A', 'Disciplina sem codigo informado', 30);

select isnt(
  (select codigo from public.disciplinas where id = 'a6300000-0000-0000-0000-000000000001'),
  null,
  'FR-012 · disciplina inserida SEM codigo recebe um do banco — o caso que discrimina'
);

select matches(
  (select codigo from public.disciplinas where id = 'a6300000-0000-0000-0000-000000000001'),
  '^DIS-[0-9]{6}$',
  'FR-012 · e o codigo gerado tem o formato DIS-NNNNNN'
);

-- -- 3 — a N-5: nenhum codigo legado usa o prefixo, logo comecar em 1 e seguro
select is(
  (select count(*)::int from public.disciplinas
    where codigo like 'DIS-%' and id <> 'a6300000-0000-0000-0000-000000000001'),
  0,
  'N-5 · nenhum codigo legado de disciplina usa o prefixo DIS- — a sequencia pode comecar em 1'
);

-- -- 4 — duas insercoes seguidas nao colidem (e o que `MAX+1` nao garante sob concorrencia)
insert into public.disciplinas (id, curso_id, cod_disciplina, nome_disciplina, carga_horaria_tempos)
values ('a6300000-0000-0000-0000-000000000002', 'a6200000-0000-0000-0000-000000000001',
        'T106-B', 'Segunda disciplina', 20);

select isnt(
  (select codigo from public.disciplinas where id = 'a6300000-0000-0000-0000-000000000001'),
  (select codigo from public.disciplinas where id = 'a6300000-0000-0000-0000-000000000002'),
  'FR-012 · duas disciplinas seguidas recebem codigos diferentes'
);

-- -- 5 e 6 — a UE, pelo mesmo caminho
insert into public.unidades_ensino
  (id, disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos)
values ('a6400000-0000-0000-0000-000000000001', 'a6300000-0000-0000-0000-000000000001',
        'a6200000-0000-0000-0000-000000000001', 1, 'Topico da UE sem codigo informado', 30);

select matches(
  (select codigo from public.unidades_ensino where id = 'a6400000-0000-0000-0000-000000000001'),
  '^UE-[0-9]{6}$',
  'FR-061 · unidade de ensino inserida SEM codigo recebe UE-NNNNNN do banco'
);

-- ⚠️ **EMENDADA EM 26/09/2026, PORQUE A CARGA DO PR 2 CHEGOU.** A forma anterior exigia
--    ZERO UEs com o prefixo `UE-` e dizia, no proprio texto, *"a tabela esta vazia ate a carga
--    do PR 2"* — ela media o ESTADO daquele momento, nao a regra. Com as 587 carregadas ela
--    passou a reprovar (`have: 587, want: 0`), e reprovava CERTO: o estado mudou.
--    A regra que importa e a inversa e permanente — **nenhuma UE tem codigo FORA da forma
--    `UE-NNNNNN`**, porque todo codigo vem do gerador unico e nenhum e digitado (FR-012,
--    FR-061, gotcha 9). Nesta forma ela vale na base vazia E na carregada, e reprova no caso
--    que interessa: alguem inserindo UE com codigo proprio.
--    Regra dos valores esperados, caso (a): o numero novo e o certo e passa a ser o esperado.
--    ⚠️ A amostra deste arquivo e excluida nominalmente — ela existe para provar o `DEFAULT`.
select is_empty(
  $$select codigo from public.unidades_ensino
     where codigo !~ '^UE-[0-9]{6}$'
       and id <> 'a6400000-0000-0000-0000-000000000001'$$,
  'FR-061 · toda UE tem codigo na forma UE-NNNNNN, do gerador unico — nenhum digitado'
);

-- -- 7 — o `DEFAULT` chama funcao, e quem insere precisa poder executa-la (gotcha 5.1)
select ok(
  has_function_privilege('authenticated', 'app.proximo_codigo_disciplina()', 'execute')
  and has_function_privilege('authenticated', 'app.proximo_codigo_unidade_ensino()', 'execute'),
  'gotcha 5.1 · `authenticated` executa as duas funcoes do DEFAULT — sem isso, todo INSERT falha'
);

-- -- 8 — as sequencias existem no schema `app`, como as outras
select is(
  (select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S' and n.nspname = 'app'
      and c.relname in ('disciplinas_codigo_seq', 'unidades_ensino_codigo_seq',
                        'turma_disciplina_unidade_codigo_seq')),
  3,
  'FR-012 / FR-061 · as tres sequencias novas vivem em `app`, como as quatro anteriores'
);

select * from finish();
rollback;
