-- =================================================================================
-- Spec 029 · Bloco 14, item 2 — o «O que é» OPCIONAL SÓ no Estudo Individual (FR-002, D-5 a D-7)
-- Data local: 28/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- Decisão de Bernardo Villas Boas, 27/10/2026 (pedido do Bloco 14, item 2): ao lançar ou editar um Estudo Individual,
-- «O que é» é opcional — na tela, na Server Action e no banco. Nas demais categorias (AEC, TAD, TR, Apoio
-- Individualizado) continua obrigatório, nas mesmas três camadas. O EI sem descrição grava NULO (D-5): vazio é ausência,
-- e preencher «ESTUDO INDIVIDUAL» no lugar da pessoa apagaria a diferença entre o EI descrito assim e o sem descrição.
--
-- Esta migration SÓ ACRESCENTA (regra 9.4, emenda de 19/10/2026):
--   1. `atividades_nao_letivas.descricao` perde o NOT NULL (de `20260829234045_fatos_grao_unidade_ensino.sql`);
--   2. o CHECK `ativ_descricao_fora_do_estudo_individual` — `descricao is not null or categoria_normativa =
--      'Estudo_Individual'` — devolve ao banco a obrigatoriedade em AEC, TAD, TR e Apoio (D-7), como as irmãs `ativ_*`
--      (`ativ_disciplina_so_aec_da_turma`, `ativ_alunos_so_apoio`). Para essas quatro ele EQUIVALE ao NOT NULL retirado;
--      para o EI, libera o nulo. `categoria_normativa` é NOT NULL, então o CHECK nunca avalia para nulo por ela;
--   3. o comentário da coluna.
--
-- EFEITO: NENHUMA LINHA MUDA, e nenhuma operação aceita hoje passa a ser recusada. Toda linha existente tem descrição
--    (a coluna era NOT NULL até aqui), então o CHECK valida sem tocar em dado — medido na cópia do remoto
--    `remoto-20261028-133702.sql` (spec 029 §3, item 2): 1.090 EI, 0 nulas e 0 em branco, em nenhuma categoria.
-- ⚠️ A RECUSA FORA DO EI MUDA DE CÓDIGO, não de veredito: antes 23502 (NOT NULL), agora 23514 (o CHECK). A tela não
--    chega a ver nenhum dos dois — `recusaPelaCategoria` (lib/dominio/categoria-pelo-tipo.ts) recusa antes com a frase,
--    e o 23514 tem frase própria em `lib/acoes/traducao-de-recusas.ts` para a chamada direta.
-- ⚠️ A CONSEQUÊNCIA ACEITA NA D-7: `app.recategorizar_pelo_tipo` reescreve `categoria_normativa` das linhas ATIVAS do
--    tipo (rascunho e sombra inclusive). Recategorizar um tipo de Estudo Individual para outra categoria passa a ser
--    recusado (23514) se alguma linha ativa dele não tiver descrição. Hoje nenhuma está assim (medição acima) — e o
--    caminho já foi exercido uma vez (a Monitoria, de EI para Apoio, em `20261014052406`), por isso fica escrito.
-- ⚠️ NADA MAIS MUDA: `gravar_rascunho_do_dsa`, o Salvar (`aplicar_rascunhos_da_semana`), a sombra e os gatilhos copiam
--    a coluna como vier e não a leem; o EI da semana em um clique continua gravando «ESTUDO INDIVIDUAL»
--    (`camposDoEstudoIndividual`, lib/dominio/dsa/rotulos.ts). Sem policy nova, sem privilégio novo.
--
-- Reversão: `specs/029-bloco-14-dsa-inicio-e-pendencias/reversao.sql`. ⚠️ ELA MEXE EM DADO: depois de existir EI sem
--    descrição, voltar o NOT NULL exige preencher as nulas antes (`update … set descricao = 'ESTUDO INDIVIDUAL' where
--    descricao is null` — o mesmo texto do EI da semana em um clique). Escrita no remoto: decisão de Bernardo.
-- =================================================================================

alter table public.atividades_nao_letivas
  alter column descricao drop not null;

alter table public.atividades_nao_letivas
  add constraint ativ_descricao_fora_do_estudo_individual
    check (descricao is not null or categoria_normativa = 'Estudo_Individual');

comment on column public.atividades_nao_letivas.descricao is
  '«O que é». Opcional SÓ no Estudo Individual (decisão de Bernardo Villas Boas, 27/10/2026; spec 029, FR-002): o EI '
  'sem descrição grava nulo. Nas demais categorias continua obrigatória (CHECK ativ_descricao_fora_do_estudo_individual).';
