-- =====================================================================================================================
-- Bloco 16 (spec 031, FR-006) — MAIS DE UM INSTRUTOR POR AULA. Data local: 30/10/2026 (o carimbo do nome é UTC).
--
-- > "MAIS DE UM INSTRUTOR POR AULA (...): selecionar 1 ou mais instrutores no lançamento; todos têm de ser HABILITADOS
-- > na disciplina (RD-1). REGRA: a CH da TURMA conta os TA uma vez só; a carga de CADA instrutor conta os TA inteiros
-- > (...). Tabela nova de instrutores adicionais = migration que ACRESCENTA. Recriar as views de carga para somar os
-- > adicionais: AUTORIZADO seguir com o rito completo SE a medição na cópia do remoto mostrar efeito ZERO hoje (nenhum
-- > adicional existe); qualquer diferença, PARE." — Bernardo Villas Boas, 30/10/2026
--
-- O que entra, e só isto (só ACRESCENTA — regra 9.4 com a emenda de 19/10/2026):
--   1. `registros_aula.instrutores_adicionais uuid[] not null default '{}'` — os instrutores do cadastro que dão a aula
--      junto de quem ministra. ⚠️ COLUNA, E NÃO TABELA (D-7 da spec 031): o ciclo do rascunho do DSA
--      (`gravar_rascunho_do_dsa`, `aplicar_rascunhos_da_semana`, descartar, publicar) copia as colunas da linha por
--      `app.colunas_copiaveis` — a coluna nova anda com o rascunho sem tocar em função nenhuma; uma tabela filha exigiria
--      reescrever as quatro, que estão em uso (migration que ALTERA).
--   2. O gatilho `trg_registros_aula_instrutores_adicionais`, que recusa id inexistente (23503), repetido e o próprio
--      quem ministra (23514). A HABILITAÇÃO é da Server Action, como a de quem ministra (RD-1, D-11 da spec 031).
--   3. `vw_instrutor_carga_anual` recriada com UM ramo a mais em `fatos`: cada adicional, com os TA inteiros da aula, no
--      ano da turma (RT-6). Mesmas colunas, mesma ordem, mesmos tipos. ⚠️ `with (security_invoker = true)` repetido
--      (gotcha 10). A CH da TURMA não é tocada: nenhuma view da CHD lê a coluna nova — a aula conta uma vez.
--
-- ⚠️ O texto livre `outros_instrutores` (spec 014, FR-046) NÃO entra na conta: no remoto, 25 aulas ativas o têm
--    preenchido (medido em 30/10/2026, só leitura) e somá-las mudaria a carga de dois instrutores — a condição do
--    pedido é efeito zero. Trazê-las é a `PEND-031-1`, decisão de Bernardo.
--
-- EFEITO MEDIDO na cópia `remoto-20261030-194246.sql`, restaurada no banco local (30/10/2026): `vw_instrutor_carga_anual`
-- antes × depois, md5 das linhas ordenadas — 182 linhas e `21e538e8943d48ab075994e0a6972b82` NOS DOIS (efeito zero:
-- a coluna nasce vazia nas 3.896 aulas); `security_invoker=true` mantido.
--
-- REVERSÃO (`specs/031-…/reversao.sql`): recriar `vw_instrutor_carga_anual` com o corpo exato de
-- `20261024213231_ano_da_turma_na_carga_do_instrutor.sql`; `drop trigger`, `drop function` e — só sem adicional gravado,
-- conferido antes — `alter table registros_aula drop column instrutores_adicionais` (coluna nascida aqui, sem histórico).
-- =====================================================================================================================

alter table public.registros_aula
  add column instrutores_adicionais uuid[] not null default '{}';

comment on column public.registros_aula.instrutores_adicionais is
  'Bloco 16 (spec 031, RD-9): os instrutores do cadastro que dão a aula junto de quem ministra — cada um com os TA '
  'inteiros na carga ministrada (vw_instrutor_carga_anual); a CH da turma conta a aula uma vez. Habilitados na '
  'disciplina (RD-1, conferido na Server Action). Diferente de outros_instrutores, o texto livre da spec 014.';

create or replace function app.conferir_instrutores_adicionais()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_faltando uuid;
begin
  if new.instrutores_adicionais is null or cardinality(new.instrutores_adicionais) = 0 then
    return new;
  end if;
  if array_position(new.instrutores_adicionais, null) is not null then
    raise exception 'instrutor adicional nulo'
      using errcode = '23514', hint = 'instrutor_adicional_inexistente';
  end if;
  if (select count(distinct x) from unnest(new.instrutores_adicionais) x) <> cardinality(new.instrutores_adicionais) then
    raise exception 'instrutor adicional repetido na aula'
      using errcode = '23514', hint = 'instrutor_adicional_repetido';
  end if;
  if new.instrutor_id is not null and new.instrutor_id = any (new.instrutores_adicionais) then
    raise exception 'quem ministra nao entra como instrutor adicional'
      using errcode = '23514', hint = 'instrutor_adicional_e_quem_ministra';
  end if;
  select x into v_faltando
    from unnest(new.instrutores_adicionais) x
   where not exists (select 1 from public.instrutores i where i.id = x)
   limit 1;
  if v_faltando is not null then
    raise exception 'instrutor adicional % nao existe no cadastro', v_faltando
      using errcode = '23503', hint = 'instrutor_adicional_inexistente';
  end if;
  return new;
end;
$$;

-- ⚠️ Função de gatilho não precisa de EXECUTE de quem grava (gotcha 5.1): sem privilégio para ninguém.
revoke all on function app.conferir_instrutores_adicionais() from public, anon, authenticated;

create trigger trg_registros_aula_instrutores_adicionais
  before insert or update of instrutores_adicionais, instrutor_id on public.registros_aula
  for each row execute function app.conferir_instrutores_adicionais();

create or replace view public.vw_instrutor_carga_anual with (security_invoker = true) as
 WITH vivas AS (
         -- RT-6 (24/10/2026): a avaliação leva o ano da TURMA dela, e é ele que vale para a aplicação, a sessão e a vista.
         SELECT a.id, a.instrutor_responsavel_id, a.fiscal_id, a.data_avaliacao, a.tempos_consumidos,
                t.ano_letivo AS ano_da_turma
           FROM avaliacoes a
             JOIN turmas t ON t.id = a.turma_id
          WHERE a.status = ANY (ARRAY['pendente'::status_avaliacao, 'em_andamento'::status_avaliacao,
                                      'concluida'::status_avaliacao, 'atrasada'::status_avaliacao]) AND a.salvo
        ), aplicacoes AS (
         -- RN-AV-12: cada sessão de aplicação, para o aplicador e o fiscal da avaliação — no ano da turma.
         SELECT a_1.instrutor_responsavel_id, a_1.fiscal_id, a_1.ano_da_turma, p.tempos_consumidos
           FROM sessoes_de_aplicacao p
             JOIN vivas a_1 ON a_1.id = p.avaliacao_id
          WHERE p.status = 'ativo'::status_registro AND p.salvo
        UNION ALL
         SELECT a_1.instrutor_responsavel_id, a_1.fiscal_id, a_1.ano_da_turma, a_1.tempos_consumidos
           FROM vivas a_1
        ), fatos AS (
         SELECT r.instrutor_id,
            t.ano_letivo AS ano,
            sum(r.tempos_consumidos) AS ta,
            0 AS ta_fiscal
           FROM registros_aula r
             JOIN turmas t ON t.id = r.turma_id
          WHERE r.status = 'ativo'::status_registro AND r.salvo AND r.instrutor_id IS NOT NULL
          GROUP BY r.instrutor_id, t.ano_letivo
        UNION ALL
         -- Bloco 16 (RD-9, emenda da RN-INST-04): cada INSTRUTOR ADICIONAL da aula leva os TA inteiros dela.
         SELECT ad.instrutor_id,
            t.ano_letivo AS ano,
            sum(r.tempos_consumidos) AS ta,
            0 AS ta_fiscal
           FROM registros_aula r
             JOIN turmas t ON t.id = r.turma_id
             CROSS JOIN LATERAL unnest(r.instrutores_adicionais) ad(instrutor_id)
          WHERE r.status = 'ativo'::status_registro AND r.salvo
          GROUP BY ad.instrutor_id, t.ano_letivo
        UNION ALL
         SELECT ap.instrutor_responsavel_id,
            ap.ano_da_turma,
            sum(COALESCE(ap.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM aplicacoes ap
          GROUP BY ap.instrutor_responsavel_id, ap.ano_da_turma
        UNION ALL
         -- A vista conta para quem a CONDUZ; sem condutor registrado, para o responsável da avaliação.
         SELECT COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id),
            a_1.ano_da_turma,
            sum(COALESCE(s.tempos_consumidos::integer, 0)) AS sum,
            0
           FROM vistas_de_avaliacao s
             JOIN vivas a_1 ON a_1.id = s.avaliacao_id
          WHERE s.status = 'ativo'::status_registro AND s.salvo
          GROUP BY (COALESCE(s.conduz_instrutor_id, a_1.instrutor_responsavel_id)), a_1.ano_da_turma
        UNION ALL
         SELECT ap.fiscal_id,
            ap.ano_da_turma,
            0,
            sum(COALESCE(ap.tempos_consumidos::integer, 0)) AS sum
           FROM aplicacoes ap
          WHERE ap.fiscal_id IS NOT NULL
          GROUP BY ap.fiscal_id, ap.ano_da_turma
        ), consolidado AS (
         SELECT fatos.instrutor_id,
            fatos.ano,
            sum(fatos.ta) AS ta_ministrado,
            sum(fatos.ta_fiscal) AS ta_fiscalizado
           FROM fatos
          WHERE fatos.instrutor_id IS NOT NULL
          GROUP BY fatos.instrutor_id, fatos.ano
        ), previstos AS (
         SELECT vw_instrutor_carga_prevista.instrutor_id,
            vw_instrutor_carga_prevista.ano,
            sum(vw_instrutor_carga_prevista.tempos_previstos) AS ta_previsto
           FROM vw_instrutor_carga_prevista
          WHERE vw_instrutor_carga_prevista.ano IS NOT NULL
          GROUP BY vw_instrutor_carga_prevista.instrutor_id, vw_instrutor_carga_prevista.ano
        ), janelas AS (
         SELECT p_1.instrutor_id,
            generate_series(EXTRACT(year FROM p_1.previsao_inicio - 3)::integer, EXTRACT(year FROM p_1.previsao_termino + 3)::integer)::smallint AS ano
           FROM vw_instrutor_carga_prevista p_1
          WHERE p_1.previsao_inicio IS NOT NULL AND p_1.previsao_termino IS NOT NULL AND p_1.previsao_termino >= p_1.previsao_inicio
        ), anos AS (
         SELECT consolidado.instrutor_id,
            consolidado.ano
           FROM consolidado
        UNION
         SELECT previstos.instrutor_id,
            previstos.ano
           FROM previstos
        UNION
         SELECT janelas.instrutor_id,
            janelas.ano
           FROM janelas
        )
 SELECT i.id AS instrutor_id,
    i.codigo AS instrutor_codigo,
    i.posto_graduacao,
    COALESCE(i.nome_guerra, i.nome_completo) AS nome_exibicao,
    i.nome_completo,
    i.om,
    i.dep_divisao,
    i.regime_trabalho,
    i.status,
    app.fn_antiguidade_ordem(i.id) AS ordem_antiguidade,
    a.ano,
    COALESCE(co.ta_ministrado, 0::numeric) AS ta_ministrado_ano,
    COALESCE(co.ta_fiscalizado, 0::numeric) AS ta_fiscalizado_ano,
    app.fn_parametro_numerico(('ch_docente.'::text || i.regime_trabalho::text) || '.min'::text, a.ano) AS faixa_semanal_min,
    app.fn_parametro_numerico(('ch_docente.'::text || i.regime_trabalho::text) || '.max'::text, a.ano) AS faixa_semanal_max,
        CASE
            WHEN i.data_assuncao_setor IS NOT NULL THEN floor((CURRENT_DATE - i.data_assuncao_setor)::numeric / 365.25)::integer
            ELSE NULL::integer
        END AS tempo_setor_anos,
    ( SELECT count(*) AS count
           FROM instrutor_disciplina v
          WHERE v.instrutor_id = i.id AND v.status = 'ativo'::status_registro) AS qtd_disciplinas_habilitadas,
    COALESCE(p.ta_previsto, 0::numeric) AS ta_previsto_ano
   FROM instrutores i
     LEFT JOIN anos a ON a.instrutor_id = i.id
     LEFT JOIN consolidado co ON co.instrutor_id = i.id AND co.ano = a.ano
     LEFT JOIN previstos p ON p.instrutor_id = i.id AND p.ano = a.ano;

-- ⚠️ Repetido de proposito: view recriada nasce com DELETE e TRUNCATE para `authenticated`.
revoke insert, update, delete, truncate on public.vw_instrutor_carga_anual from authenticated, anon;
revoke all    on public.vw_instrutor_carga_anual from anon;
grant  select on public.vw_instrutor_carga_anual to authenticated;
