-- =================================================================================
-- `resp_dinamico_tem_chave` SAI: a linha de assinatura no modo dinâmico deixa de exigir chave de usuário
--
-- O QUÊ  : remove o CHECK `resp_dinamico_tem_chave` de `public.responsaveis_curso`, e com ele a catraca de
--          `20260908083100`. A linha `dinamico_usuario_logado` passa a poder nascer, e a ser editada, sem
--          `email_usuario` e sem `usuario_id`. Nada mais muda: as colunas ficam (nunca `drop column`), e
--          `resp_fixo_tem_nominal`, `resp_ordem_positiva`, `resp_vigencia_coerente` e
--          `ex_assinatura_sem_sobreposicao` seguem como estão.
--
-- PARA QUÊ: decisão de Bernardo Villas Boas, 27/10/2026 (opção B dos acertos finais da carga única de 26/10:
--          «mudar a regra do banco para aceitar linha dinâmica nova sem chave, que é o que o DSA já faz»). É o
--          que permite a linha geral dinâmica nova que preenche as 25 semanas de 2026 com o elaborador em branco,
--          no mesmo modo da `RSP-000001`, sem inventar uma conta como chave.
--
-- POR QUE A CHAVE NÃO TEM LEITOR (medido em 27/10/2026, na `main` `1418036`, código sem comentário):
--   · a leitura do DSA (`app/(app)/turmas/[turma]/dsa/leitura.ts`) seleciona papel, preenchimento, curso,
--     vigência, ordem, nominais e função — NUNCA `email_usuario` nem `usuario_id`;
--   · no modo dinâmico, `lib/dominio/dsa/assinaturas.ts` anula os nominais e marca `resolvePeloUsuarioLogado`, e
--     `rubricaResolvida` imprime o nome de QUEM IMPRIME (Q-14). A chave nunca escolhe quem assina;
--   · nenhum outro arquivo de `app/`, `lib/` ou `components/` lê as duas colunas; só o ETL as transporta.
--   O CHECK do Épico 1 lia o modo dinâmico como «esta linha nomeia QUAL usuário assina»; o sistema que foi
--   construído lê como a v2.0 lia, «assina quem estiver logado na impressão», e o documento 05 §4.5 já dava
--   `instrutor_id` e `usuario_id` como opcionais. A restrição exigia um dado que ninguém usa.
--
-- ⚠️ É MIGRATION QUE ALTERA O QUE EXISTE (afrouxa uma restrição): portão da regra 9.4: o desenho é mostrado a
--    Bernardo ANTES de ela ir ao remoto. Nenhum dado muda nesta migration; a linha geral nova é escrita à parte, por
--    `scripts/carga_dsa/preparo/rodada-2026-10-26-elaborador-geral.sql`.
--
-- Prova: `supabase/tests/152_elaborador_dinamico_sem_chave.sql` (5 de 8 reprovavam antes desta migration, pela
-- `resp_dinamico_tem_chave`; os 3 controles passavam antes e passam depois).
-- =================================================================================

alter table public.responsaveis_curso
  drop constraint resp_dinamico_tem_chave;

comment on column public.responsaveis_curso.preenchimento is
  'A coluna que AUTOMATIZA a assinatura. `fixo` = usa os dados nominais desta linha; '
  '`dinamico_usuario_logado` = assina QUEM IMPRIME: o nome vem da conta da sessao no momento da impressao (Q-14), '
  'e a linha nao guarda pessoa. `email_usuario` e `usuario_id` sao opcionais e o DSA nao os le: desde 27/10/2026 '
  'nao ha CHECK exigindo chave na linha dinamica (decisao de Bernardo Villas Boas, migration 20261027082223).';

-- =================================================================================
-- PLANO DE REVERSÃO (volta à catraca de `20260908083100`)
--
--   alter table public.responsaveis_curso add constraint resp_dinamico_tem_chave check (
--     preenchimento <> 'dinamico_usuario_logado' or email_usuario is not null or usuario_id is not null
--     or (origem_migracao_v1 is not null and editado_em is null));
--   comment on column public.responsaveis_curso.preenchimento is
--     'A coluna que AUTOMATIZA a assinatura. `fixo` = usa os dados nominais desta linha; '
--     '`dinamico_usuario_logado` = resolve Posto + Especialidade + Nome de Guerra a partir do '
--     'usuário da sessão em tempo de impressão.';
--
-- ⚠️ A reversão FALHA enquanto existir linha dinâmica sem chave que não seja a da v2.0 sem edição — a linha geral
--    criada pelo preparo de 27/10/2026 é uma delas. É assim que deve ser: reverter exige antes decidir o que fazer
--    com ela (inativar não basta: o CHECK vale para linha inativa também).
-- =================================================================================
