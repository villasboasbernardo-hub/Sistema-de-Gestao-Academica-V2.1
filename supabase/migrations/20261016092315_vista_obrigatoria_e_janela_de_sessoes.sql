-- =================================================================================
-- Spec 014, emenda de 15/10/2026 · migration D-9 (DADO) — a vista obrigatória por instrumento e a janela das sessões
-- Data local: 16/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Decisões de Bernardo Villas Boas, 16/10/2026 (`aprovacoes-pendentes.md`, seção de 16/10/2026):
--   *"Vista obrigatória para PM, PO e PE."*  (emenda a RN-AV-13 de 15/10/2026, que nomeava só PM e PO)
--   *"Dias próximos = 7"*                      (RN-AV-12: "dias consecutivos ou próximos")
--
-- O que faz (A4 e A5 do desenho de 15/10/2026, opção A aprovada em 16/10/2026):
--   1. `config_listas.metadados.vista_obrigatoria` em TODO instrumento de `instrumentos_avaliacao`: `true` em PM, PO
--      e PE, `false` nos demais. É o DADO ÚNICO da regra: `app.fn_status_vista` (E-6), a tela
--      (`lib/dominio/avaliacoes/vista-obrigatoria.ts`, pela consulta) e a sincronização (pelo retrato do banco) leem
--      daqui. Regra 8: parâmetro normativo é dado, nunca constante.
--   2. `config_parametros.avaliacao.janela_sessoes_dias = 7` (operacional): dias corridos entre uma sessão de
--      aplicação e a seguinte para a sincronização juntá-las numa prova só. A junção à mão (a aba Avaliações) não
--      depende dela.
--
-- Idempotente: rodar de novo não muda nada. A lista de instrumentos entra sempre pela D-7 (`20261014151557`), por
-- isso a marca vale também na base recém-resetada.
--
-- Antes/depois (conferido na própria migration, abaixo): 11 instrumentos, 3 com a marca `true` (PE, PM, PO) e 8 com
-- `false`; 1 parâmetro `avaliacao.janela_sessoes_dias` ativo.
--
-- Reversão: `metadados - 'vista_obrigatoria'` nos 11 instrumentos e o parâmetro `inativo` (regra 4: nada é apagado).
-- =================================================================================

update public.config_listas
   set metadados = metadados || jsonb_build_object('vista_obrigatoria', valor in ('PM', 'PO', 'PE'))
 where lista = 'instrumentos_avaliacao'
   and (metadados -> 'vista_obrigatoria') is distinct from to_jsonb(valor in ('PM', 'PO', 'PE'));

insert into public.config_parametros (chave, valor, tipo, unidade, descricao, natureza)
select 'avaliacao.janela_sessoes_dias', '7', 'inteiro', 'dias corridos',
       'Spec 014, RN-AV-12 (decisão de Bernardo Villas Boas, 16/10/2026): dias corridos entre uma sessão de aplicação '
       'e a seguinte (mesma disciplina, mesmo COD, mesma descrição) para a sincronização tratá-las como UMA prova em '
       'N sessões. Juntar o que passou da janela é decisão do Encarregado ou do Admin, na aba Avaliações da turma.',
       'operacional'
 where not exists (select 1 from public.config_parametros
                    where chave = 'avaliacao.janela_sessoes_dias' and status = 'ativo');

do $$
declare
  v_total integer;
  v_com   text;
  v_sem   integer;
begin
  select count(*), string_agg(valor, ',' order by valor) filter (where (metadados ->> 'vista_obrigatoria')::boolean),
         count(*) filter (where metadados ->> 'vista_obrigatoria' = 'false')
    into v_total, v_com, v_sem
    from public.config_listas where lista = 'instrumentos_avaliacao';
  if v_total > 0 and (v_com is distinct from 'PE,PM,PO' or v_sem <> v_total - 3) then
    raise exception 'D-9: a marca de vista obrigatória não ficou em PE, PM e PO (com: %, sem: % de %).', v_com, v_sem, v_total;
  end if;
  if (select count(*) from public.config_parametros where chave = 'avaliacao.janela_sessoes_dias' and status = 'ativo') <> 1 then
    raise exception 'D-9: o parâmetro avaliacao.janela_sessoes_dias não ficou único e ativo.';
  end if;
end;
$$;
