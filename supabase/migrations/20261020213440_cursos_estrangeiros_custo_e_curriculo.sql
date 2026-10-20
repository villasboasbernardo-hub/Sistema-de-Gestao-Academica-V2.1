-- =================================================================================
-- Spec 020 (Bloco 5), M1 — curso ofertavel a estrangeiros, custo total e o curriculo em PDF.
-- 20/10/2026 (data local do responsavel; o nome do arquivo carrega o carimbo UTC da CLI).
--
-- > "1. CURSO OFERTAVEL A ESTRANGEIROS: sim/nao + observacao (...) 2. CUSTO TOTAL DO CURSO: um valor
-- > em R$ (unico) + texto opcional de composicao, so informativo (nada calcula a partir dele).
-- > 3. CURRICULO EM PDF: carregar e baixar o curriculo do curso (Supabase Storage, balde privado,
-- > so PDF, limite de tamanho no balde e no transporte — gotcha 14). Substituir sobrescreve; SEM
-- > policy de DELETE (regra 4, STORAGE-1). Quem carrega: quem edita curso; quem baixa: quem le o
-- > curso." — Bernardo Villas Boas, 20/10/2026 (NOVIDADE autorizada nominalmente, regra 3)
--
-- ⚠️ SO ACRESCENTA (regra 9.4): cinco colunas NULAVEIS em `cursos` (nenhuma linha muda), um balde
--    novo e as policies DELE. Nenhuma policy existente e tocada.
-- ⚠️ `cursos` NAO TEM PRIVILEGIO POR COLUNA (medido em 20/10/2026): as colunas novas herdam o
--    `update` de tabela que `authenticated` ja tem, e a RLS `cursos_editar` continua decidindo.
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- PARTE A — as colunas
-- ---------------------------------------------------------------------------------
alter table public.cursos
  add column if not exists ofertavel_estrangeiros boolean,
  add column if not exists estrangeiros_observacao text,
  add column if not exists custo_total numeric(14, 2),
  add column if not exists custo_composicao text,
  add column if not exists curriculo_pdf_em timestamptz;

alter table public.cursos
  add constraint cursos_custo_nao_negativo check (custo_total is null or custo_total >= 0);

comment on column public.cursos.ofertavel_estrangeiros is
  'Spec 020 (C-1): o curso e ofertavel a estrangeiros? NULO = nao informado (nenhum curso tinha a resposta '
  'quando a coluna nasceu, e "nao" seria inventar).';
comment on column public.cursos.estrangeiros_observacao is
  'Spec 020 (C-1): observacao livre sobre a oferta a estrangeiros.';
comment on column public.cursos.custo_total is
  'Spec 020 (C-3): custo total do curso em reais. SO INFORMATIVO: nada no sistema calcula a partir dele. '
  'Regra 2: Bernardo confirma que custo de curso e processo da CIAARA-11.';
comment on column public.cursos.custo_composicao is
  'Spec 020 (C-3): texto opcional de como o custo se compoe.';
comment on column public.cursos.curriculo_pdf_em is
  'Spec 020 (C-8): quando o PDF do curriculo foi registrado. O arquivo mora no balde `curriculos`, em '
  '<id do curso>/curriculo.pdf. NULO = nenhum curriculo carregado.';

-- ---------------------------------------------------------------------------------
-- PARTE B — o balde, com o limite e o tipo no motor (C-6, C-7)
-- ---------------------------------------------------------------------------------
-- ⚠️ 20 MB (20971520 bytes) e DECISAO (C-6), nao medida: os PDFs reais nao estao nesta maquina.
-- ⚠️ O PDF NAO PASSA POR SERVER ACTION: a Vercel corta o corpo de requisicao de uma funcao em 4,5 MB
--    (documentacao "Vercel Functions Limits", 24/08/2026). Ele sobe do navegador direto ao Storage,
--    com a sessao de quem envia, e estas policies decidem quem pode.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'curriculos', 'curriculos', false, 20971520, array['application/pdf']
 where not exists (select 1 from storage.buckets where id = 'curriculos');

-- ---------------------------------------------------------------------------------
-- PARTE C — as TRES policies, todas restritas ao balde (o caminho e <id do curso>/curriculo.pdf)
--
-- ⚠️ LER passa pela RLS de `cursos`: a subconsulta so enxerga o curso que quem pede pode ler
--    (`cursos.ler` e alcance) — "quem baixa: quem le o curso", sem uma segunda regra.
-- ⚠️ CARREGAR e SUBSTITUIR exigem `cursos.editar`, o alcance e curso ATIVO (curso inativo ja recusa
--    qualquer mudanca de coluna, `trg_cursos_guardar_situacao`), e o nome canonico do arquivo — um
--    por curso, substituir sobrescreve.
-- ---------------------------------------------------------------------------------
create policy curriculos_ler
  on storage.objects for select to authenticated
  using (
    bucket_id = 'curriculos'
    and exists (
      select 1 from public.cursos c where c.id::text = (storage.foldername(name))[1]
    )
  );

create policy curriculos_carregar
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'curriculos'
    and name = (storage.foldername(name))[1] || '/curriculo.pdf'
    and app.pode('cursos', 'editar')
    and exists (
      select 1
        from public.cursos c
       where c.id::text = (storage.foldername(name))[1]
         and c.status = 'ativo'
         and app.alcanca_curso(c.id)
    )
  );

create policy curriculos_substituir
  on storage.objects for update to authenticated
  using (
    bucket_id = 'curriculos'
    and name = (storage.foldername(name))[1] || '/curriculo.pdf'
    and app.pode('cursos', 'editar')
    and exists (
      select 1
        from public.cursos c
       where c.id::text = (storage.foldername(name))[1]
         and c.status = 'ativo'
         and app.alcanca_curso(c.id)
    )
  )
  with check (
    bucket_id = 'curriculos'
    and name = (storage.foldername(name))[1] || '/curriculo.pdf'
    and app.pode('cursos', 'editar')
    and exists (
      select 1
        from public.cursos c
       where c.id::text = (storage.foldername(name))[1]
         and c.status = 'ativo'
         and app.alcanca_curso(c.id)
    )
  );

-- ⚠️ NAO HA POLICY DE `DELETE`, de proposito: regra 4 do CLAUDE.md e a pendencia STORAGE-1 (a mesma
--    decisao do balde `avatares`). Substituir sobrescreve o mesmo caminho, entao o lixo nao cresce.

-- =================================================================================
-- PLANO DE REVERSAO
--
--   drop policy curriculos_ler on storage.objects;
--   drop policy curriculos_carregar on storage.objects;
--   drop policy curriculos_substituir on storage.objects;
--   delete from storage.buckets where id = 'curriculos';   -- so com o balde VAZIO (o Storage recusa)
--   alter table public.cursos drop constraint cursos_custo_nao_negativo;
--   alter table public.cursos drop column curriculo_pdf_em, drop column custo_composicao,
--     drop column custo_total, drop column estrangeiros_observacao, drop column ofertavel_estrangeiros;
--
-- ⚠️ As colunas nascem vazias: reverter antes de alguem preencher nao perde nada. Depois, a reversao
--    apaga o que foi digitado — e a decisao de reverter passa a ser de Bernardo.
-- =================================================================================
