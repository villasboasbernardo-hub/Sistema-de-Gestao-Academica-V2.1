-- =================================================================================
-- Migration 1 de 1 — Epico 5, fatia (a), PR 2: o historico de vigencias PARA A TELA
-- (carimbo do arquivo em UTC; o relogio da maquina marcava 23/09/2026)
--
-- O QUE  : A. `public.vigencias_do_curso(curso_id)` — o historico de vigencias de um curso com, em
--             cada linha, o PRIMEIRO lancamento que a trava, quando ha;
--          B. o `grant execute` que faltava em `app.recusar_se_ha_lancamento`, sem o qual NENHUM
--             usuario autenticado consegue corrigir vigencia.
--
-- ORIGEM : FR-011, FR-021.1, FR-021.2, FR-021.4 · spec `009-cursos-e-turmas` · T201, T203.
--
-- ⚠️ POR QUE ELA EXISTE, E POR QUE NAO DA PARA EVITA-LA. O `FR-021.1` manda oferecer
--    "Corrigir esta vigencia" SO onde nao ha lancamento que dependa dela, e quem sabe isso e
--    `app.lancamentos_que_travam_vigencia` — que vive no schema `app`, FORA do que o PostgREST
--    expoe. Sem esta funcao a tela teria dois caminhos, e os dois sao piores:
--      1. reimplementar em TypeScript a leitura das quatro origens (aula, avaliacao, vista de prova
--         e atividade, esta ultima alcancando o curso por janela de turma quando e global) — regra
--         de negocio na UI, que o BRIEF §2 proibe, e duas copias que divergem na primeira tabela
--         nova que passe a depender do regime;
--      2. oferecer a acao em toda vigencia ativa e deixar o banco recusar — a pessoa descobre o
--         impedimento DEPOIS de preencher o formulario inteiro.
--    A regra continua UMA SO, no banco; esta funcao apenas a torna LEGIVEL por quem desenha a tela.
--
-- ⚠️ `SECURITY DEFINER` COM PORTEIRO ESCRITO NA PRIMEIRA LINHA. Ela precisa ser definer porque
--    `app.lancamentos_que_travam_vigencia` le tabelas de lancamento que o perfil de quem consulta
--    pode nao alcancar — e e por isso mesmo que ela NAO responde nada sem `app.alcanca_curso()`.
--    Definer sem porteiro seria um caminho para ler lancamento de curso fora do alcance, que e
--    exatamente o que a RLS desta base existe para impedir.
--
-- ⚠️ ELA NAO ESCREVE, E NAO TEM COMO ESCREVER: `stable`, `language sql`, nenhum comando de escrita.
--
-- ⚠️ E NAO E VIEW, de proposito. View nasce com `INSERT`/`UPDATE`/`DELETE` para `authenticated` (o
--    achado do Epico 3), e o parametro `curso_id` teria de virar filtro — o chamador poderia omiti-lo
--    e varrer o banco inteiro. Funcao com argumento obrigatorio nao tem essa borda.
-- =================================================================================

create or replace function public.vigencias_do_curso(p_curso_id uuid)
returns table (
  id                      uuid,
  codigo                  text,
  tipo_regime             tipo_regime,
  status                  status_vigencia,
  vigente_de              date,
  vigente_ate             date,
  regime_tempos           smallint,
  ta_duracao_min          smallint,
  intervalo_manha_min     smallint,
  intervalo_tarde_min     smallint,
  hora_inicio_manha       time,
  hora_inicio_tarde       time,
  limite_diario_ead_horas numeric,
  fundamento_curricular   text,
  motivo                  text,
  trava_tipo              text,
  trava_data              date,
  trava_turma             text,
  trava_atividade         text,
  trava_total             bigint,
  trava_ponta_ausente     text
)
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  select v.id,
         v.codigo,
         v.tipo_regime,
         v.status,
         v.vigente_de,
         v.vigente_ate,
         v.regime_tempos,
         v.ta_duracao_min,
         v.intervalo_manha_min,
         v.intervalo_tarde_min,
         v.hora_inicio_manha,
         v.hora_inicio_tarde,
         v.limite_diario_ead_horas,
         v.fundamento_curricular,
         v.motivo,
         t.tipo,
         t.data,
         t.turma,
         t.atividade,
         t.total,
         t.ponta_ausente
    from public.curso_regime_historico v
    -- ⚠️ `left join lateral`: ausencia de trava e AUSENCIA DE LINHA, e a vigencia continua na lista.
    left join lateral app.lancamentos_que_travam_vigencia(v.id, v.vigente_de) t on true
   where v.curso_id = p_curso_id
     -- ⚠️ O PORTEIRO. Fora do alcance, a funcao devolve VAZIO — nunca erro, nunca dado.
     and app.alcanca_curso(p_curso_id)
   order by v.tipo_regime, v.vigente_de desc, v.codigo desc;
$$;

comment on function public.vigencias_do_curso(uuid) is
  'FR-021.1/FR-021.2: o historico de vigencias do curso com o primeiro lancamento que trava cada uma, '
  'para a tela decidir onde oferecer "Corrigir esta vigencia". A REGRA e de '
  'app.lancamentos_que_travam_vigencia; esta funcao so a torna legivel. SECURITY DEFINER com porteiro '
  'app.alcanca_curso() na propria consulta — fora do alcance devolve vazio.';

revoke all on function public.vigencias_do_curso(uuid) from public, anon;
grant execute on function public.vigencias_do_curso(uuid) to authenticated, service_role;

-- =================================================================================
-- PARTE B — o `grant` que faltava, e o defeito que ele conserta
--
-- ⚠️ MEDIDO EM 23/09/2026, PELA TELA, e NAO pelas suites que ja existiam:
--    `public.corrigir_vigencia_regime` e `SECURITY INVOKER` — de proposito, para que a RLS de quem
--    chama valha nas escritas dela — e chama `app.recusar_se_ha_lancamento`. A migration
--    `20260918025141` faz `revoke all ... from public, anon, authenticated` nessa auxiliar e nunca
--    devolve o `execute` a `authenticated`. Resultado: a correcao de vigencia falhava para TODO
--    usuario autenticado com *permission denied for function recusar_se_ha_lancamento* — o unico
--    caminho do FR-021.1 estava fechado.
--
-- ⚠️ POR QUE NENHUMA SUITE PEGOU, e e o mesmo motivo de sempre: o pgTAP roda como DONO do schema,
--    que tem tudo; e um teste negativo que aceite "deu erro" como prova de recusa **passa pelo motivo
--    errado** — aqui o erro era de privilegio, nao a recusa do FR-021.2. So o caminho de tela, com
--    sessao de verdade, encontrou.
--
-- ⚠️ E AS DUAS IRMAS DELA JA TINHAM O GRANT: `app.lancamentos_que_travam_vigencia` e
--    `app.travar_curso_para_correcao`, chamadas pela mesma RPC, foram concedidas a `authenticated` na
--    mesma migration. Era grant esquecido, nao decisao.
--
-- ⚠️ O QUE ISSO ABRE: nada que `authenticated` ja nao alcance. A funcao nao escreve — ela levanta
--    excecao —, e o dado que a mensagem carrega e o mesmo que `app.lancamentos_que_travam_vigencia`
--    ja devolve a `authenticated` desde 18/09/2026. A alternativa (tornar a RPC `SECURITY DEFINER`)
--    seria pior: as escritas dela passariam a rodar como dono, IGNORANDO A RLS.
-- =================================================================================

grant execute on function app.recusar_se_ha_lancamento(uuid, date, text)
  to authenticated, service_role;

-- =================================================================================
-- PLANO DE REVERSAO
--
--   -- B: revoke execute on function app.recusar_se_ha_lancamento(uuid, date, text)
--   --      from authenticated, service_role;
--   -- A: drop function if exists public.vigencias_do_curso(uuid);
--
-- ⚠️ REVERTER A PARTE B FECHA DE NOVO A CORRECAO DE VIGENCIA para todo usuario autenticado, com uma
--    mensagem que aponta para privilegio de funcao e nao para a regra.
--
-- ⚠️ REVERTER NAO TIRA GARANTIA NENHUMA DO BANCO: a trava do FR-021.2 e
--    `app.conferir_vigencia_nova()` e a recusa do cancelamento, que esta migration nao toca. O que
--    se perde e a TELA saber, antes de perguntar, quais vigencias sao corrigiveis — a secao de
--    regime volta a oferecer a acao onde o banco vai recusar.
-- =================================================================================
