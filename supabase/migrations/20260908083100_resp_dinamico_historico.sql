-- =================================================================================
-- `resp_dinamico_tem_chave` — a catraca, para a única linha histórica que ele recusa
--
-- O QUÊ  : substitui o `CHECK` por uma versão que admite a ausência de chave **apenas
--          na linha migrada e ainda não editada**, exatamente como
--          `reg_aula_ue_so_nula_no_historico` faz com a Unidade de Ensino.
--
-- PARA QUÊ: `Responsaveis_Curso` da v2.0 tem 2 linhas. Uma delas, `RSP-000001`
--          (papel `Elaborador`, preenchimento `Dinamico_Usuario_Logado`), tem posto,
--          nome de guerra, nome completo, NIP, e-mail e vínculo de instrutor **todos
--          vazios** — e isso não é dado faltando por descuido: na v2.0, "dinâmico"
--          significava literalmente *quem estiver logado no momento da impressão*.
--          Não havia o que guardar.
--
--          O `CHECK` do Épico 1 lê `dinamico` de outro jeito: uma linha dinâmica
--          nomeia QUAL usuário preenche aquele espaço, por e-mail ou por `usuario_id`.
--          Para dado novo essa leitura é a certa — é ela que faz a assinatura ser
--          resolvível. Para o histórico, ela recusa um dado que existe e é correto.
--
-- ⚠️ ISTO NÃO AFROUXA A REGRA. É a MESMA catraca da UE, e vale a mesma frase: o
--    histórico pode nascer sem chave, mas **não pode ser MANTIDO sem chave por quem
--    mexer nele**. `editado_em is null` é a dobradiça: no instante em que alguém
--    editar a linha, o `CHECK` volta a exigir e-mail ou `usuario_id`. E linha NOVA
--    (`origem_migracao_v1 is null`) continua exigindo desde o primeiro INSERT.
--
--    Padrão autorizado por Bernardo em 08/09/2026 para `registros_aula`; aqui é o
--    mesmo padrão aplicado ao mesmo formato de problema. Fica registrado para
--    ratificação.
-- =================================================================================

alter table public.responsaveis_curso
  drop constraint resp_dinamico_tem_chave;

alter table public.responsaveis_curso
  add constraint resp_dinamico_tem_chave check (
    preenchimento <> 'dinamico_usuario_logado'
    or email_usuario is not null
    or usuario_id is not null
    -- A ÚNICA porta: linha vinda da v2.0 que ninguém tocou desde a migração.
    or (origem_migracao_v1 is not null and editado_em is null)
  );

comment on constraint resp_dinamico_tem_chave on public.responsaveis_curso is
  'Modo dinamico precisa de chave de resolucao do usuario da sessao (e-mail ou '
  'usuario_id). EXCECAO, e so ela: linha migrada da v2.0 ainda nao editada — a v2.0 '
  'nao guardava chave nenhuma no modo dinamico, porque resolvia pelo usuario logado. '
  'Editar a linha reativa a exigencia; linha nova nunca escapa dela. '
  'Mesmo padrao de `reg_aula_ue_so_nula_no_historico`. Decisao de 08/09/2026.';

-- =================================================================================
-- PLANO DE REVERSÃO
--
--   alter table public.responsaveis_curso drop constraint resp_dinamico_tem_chave;
--   alter table public.responsaveis_curso add constraint resp_dinamico_tem_chave
--     check (preenchimento <> 'dinamico_usuario_logado'
--            or email_usuario is not null or usuario_id is not null);
--
-- ⚠️ Depois da carga real a reversão FALHA enquanto `RSP-000001` estiver na tabela,
--    e é assim que deve ser: reverter exige antes decidir o que fazer com a linha.
-- =================================================================================
