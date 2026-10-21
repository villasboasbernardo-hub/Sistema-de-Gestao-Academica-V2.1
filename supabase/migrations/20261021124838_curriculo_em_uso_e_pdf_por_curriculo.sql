-- =================================================================================
-- Spec 021 · Bloco 6 — PR 2, M4: o que ALTERA (regra 9.4), pelas regras RC-6, RC-10 e RC-11
-- Data local: 21/10/2026 (o carimbo do nome é UTC; não renomear).
--
-- As decisões nominais de Bernardo Villas Boas, 21/10/2026 (`docs/correcoes/regras-do-curriculo-bloco-6.md`):
--   RC-6 · *"Corrigir um currículo que já tem turma com lançamento (mudar valor, acrescentar ou inativar item) é
--          permitido só ao trio (Admin, Encarregado da Administração Acadêmica, Ajudante), com justificativa obrigatória
--          e trilha (quem, quando, o quê, valor anterior). Completar o que estava vazio é livre. Os demais perfis não
--          editam currículo em uso."*
--   RC-10 · *"(…) o trio pode arquivar esse currículo."*
--   RC-11 · *"Cada currículo tem o seu PDF."*
-- ⚠️ ALTERA o que existe — a matriz de permissões (dois recursos novos), um gatilho que recusa escrita hoje aceita e as
--    policies do balde do PDF —, e por isso é portão: aberto pelas RC, que são o desenho (`contracts/banco.md` §6).
--
-- O que faz:
--   1. Dois recursos na matriz: `correcao_de_curriculo`/`editar` (RC-6) e `arquivamento_de_curriculo`/`editar` (RC-10),
--      `true` só para o trio — todos os nove perfis com linha (a ausência não é recusa declarada; molde do Bloco 2).
--   2. `app.guardar_curriculo_em_uso`, antes de toda escrita COM SESSÃO no conteúdo do currículo (o próprio currículo,
--      disciplinas, UEs, avaliações do currículo, limites e regras de avaliação): se o currículo é seguido por turma com
--      lançamento, completar o que era NULO passa (D-24); qualquer outra mudança — valor que muda ou se apaga, item que
--      entra, sai ou volta — exige o recurso da correção (`42501`/`curriculo_em_uso`) E a justificativa
--      (`23514`/`justificativa_obrigatoria`), e grava a trilha ANTES de a linha mudar. Sem sessão (migration, ETL, script
--      revisto) passa (D-5). Habilitação de instrutor não trava (D-25). Arquivar não é correção (RC-10 tem porteiro
--      próprio).
--   3. RC-11 · o balde aceita o PDF de cada currículo, em `<curso>/<currículo>/<arquivo>.pdf` — um arquivo NOVO por
--      envio: substituir troca o caminho no currículo (e no currículo em uso isso é correção, com trilha), e o anterior
--      fica no balde (regra 4, STORAGE-1).
--
-- O caso que discrimina (com sessão real, `tests/invariantes/rls/curriculos.test.ts`): no currículo em uso, o OPERADOR
--   (que edita disciplina) passa de aceito a recusado ao mudar a CH; o AJUDANTE, sem justificativa, é recusado, e com ela
--   corrige — e a trilha guarda o valor anterior; completar o vazio passa para os dois.
--
-- Reversão: `drop trigger` dos seis `trg_*_curriculo_em_uso` e `drop function app.guardar_curriculo_em_uso()`;
--   `update public.perfil_permissao set permitido = false where recurso in ('correcao_de_curriculo',
--   'arquivamento_de_curriculo')` (sem `delete`); `drop policy curriculos_carregar_por_curriculo on storage.objects`.
-- =================================================================================

-- ---------------------------------------------------------------- 1. os recursos na matriz
insert into public.perfil_permissao (perfil, recurso, acao, permitido, observacao)
select p, r.recurso, 'editar',
       p in ('admin', 'encarregado_administracao_academica', 'ajudante_administracao_academica'),
       r.observacao
  from unnest(enum_range(null::public.perfil_usuario)) as p
 cross join (values
   ('correcao_de_curriculo',
    'Bloco 6 (spec 021), RC-6 de 21/10/2026: corrige currículo seguido por turma com lançamento, com justificativa e '
    'trilha. Admin, Encarregado e Ajudante da Administração Acadêmica — e só eles.'),
   ('arquivamento_de_curriculo',
    'Bloco 6 (spec 021), RC-10 de 21/10/2026: arquiva e desarquiva o currículo passado. Admin, Encarregado e Ajudante '
    'da Administração Acadêmica — e só eles.')) as r(recurso, observacao)
on conflict (perfil, recurso, acao) do update set permitido = excluded.permitido, observacao = excluded.observacao;

-- ---------------------------------------------------------------- 2. o currículo em uso (RC-6)
create or replace function app.guardar_curriculo_em_uso()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  -- O que não é conteúdo: a auditoria, as colunas GERADAS (no BEFORE elas ainda não foram calculadas) e o arquivamento,
  -- que tem função e porteiro próprios (RC-10).
  v_fora           text[] := array['criado_por', 'criado_em', 'editado_por', 'editado_em', 'nome_normalizado',
                                   'semanas', 'ch_semanal', 'arquivado_em', 'arquivado_por'];
  v_procedencia    text[] := array['origem_item', 'origem_ta_aplicacao', 'origem_ta_vista', 'origem_ue',
                                   'ue_decidida_em'];
  v_novo           jsonb := to_jsonb(new) - v_fora;
  v_velho          jsonb;
  v_curriculo      uuid;
  v_curriculo_velho uuid;
  v_campos         text[];
  v_acao           text;
  v_justificativa  text;
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    v_velho := to_jsonb(old) - v_fora;
  end if;
  -- A SITUAÇÃO DO CURRÍCULO tem regra própria (`app.guardar_situacao_da_versao`, PR 1: o currículo seguido por turma não
  -- se inativa, D-19) — aqui ela não é correção. Sem isto, a recusa certa (`versao_em_uso`) chegaria disfarçada de
  -- pedido de justificativa, e a justificativa só adiaria a mesma recusa.
  if tg_table_name = 'curriculos' then
    v_novo := v_novo - 'status';
    v_velho := v_velho - 'status';
  end if;

  -- O currículo da linha: o próprio; o da coluna; ou, na UE e na avaliação do currículo, o da disciplina.
  if tg_table_name = 'curriculos' then
    v_curriculo := new.id;
  elsif tg_table_name in ('unidades_ensino', 'avaliacoes_curriculo') then
    select d.curriculo_id into v_curriculo from public.disciplinas d where d.id = (v_novo ->> 'disciplina_id')::uuid;
    if tg_op = 'UPDATE' then
      select d.curriculo_id into v_curriculo_velho
        from public.disciplinas d where d.id = (v_velho ->> 'disciplina_id')::uuid;
    end if;
  else
    v_curriculo := (v_novo ->> 'curriculo_id')::uuid;
    v_curriculo_velho := (v_velho ->> 'curriculo_id')::uuid;
    -- ⚠️ A LINHA QUE CHEGA SEM CURRÍCULO: o gatilho `versao` o preenche (o único ativo do curso), mas os gatilhos rodam em
    --    ordem ALFABÉTICA e este vem antes ("curriculo_em_uso" < "versao"). Sem resolver aqui, a disciplina, o limite e a
    --    regra gravados sem `curriculo_id` passariam pela RC-6 sem justificativa (medido no pgTAP 145).
    if v_curriculo is null and tg_op = 'INSERT' then
      select (array_agg(c.id))[1] into v_curriculo
        from public.curriculos c
       where c.curso_id = (v_novo ->> 'curso_id')::uuid and c.status = 'ativo'
      having count(*) = 1;
    end if;
  end if;

  if not (coalesce(app.curriculo_em_uso_com_lancamento(v_curriculo), false)
          or coalesce(app.curriculo_em_uso_com_lancamento(v_curriculo_velho), false)) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_campos
      from jsonb_object_keys(v_novo) k where (v_velho -> k) is distinct from (v_novo -> k);
    if v_campos is null then
      return new;   -- nada do conteúdo mudou
    end if;
    -- D-24: COMPLETAR o que estava vazio é livre — todo campo de CONTEÚDO que mudou era nulo. A PROCEDÊNCIA que acompanha
    -- o valor (de onde ele veio: currículo, arbitrado, sugestão da planilha, decisão da CIAARA-11) não conta como
    -- conteúdo: definir o tempo "não definido" muda o tempo E a origem dele, e confirmar uma sugestão muda só a origem.
    if not exists (select 1 from unnest(v_campos) k
                    where not (k = any (v_procedencia))
                      and jsonb_typeof(v_velho -> k) is distinct from 'null') then
      return new;
    end if;
    v_acao := case
      when v_velho ->> 'status' = 'ativo' and v_novo ->> 'status' = 'inativo' then 'inativar'
      when v_velho ->> 'status' = 'inativo' and v_novo ->> 'status' = 'ativo' then 'reativar'
      else 'alterar' end;
  else
    v_acao := 'incluir';
    select array_agg(k order by k) into v_campos
      from jsonb_object_keys(v_novo) k where jsonb_typeof(v_novo -> k) <> 'null';
  end if;

  if coalesce(app.pode('correcao_de_curriculo', 'editar'), false) is not true then
    raise exception 'Este currículo é seguido por turma que já tem lançamento: só o Admin, o Encarregado e o Ajudante '
                    'da Administração Acadêmica o corrigem, com justificativa. Completar o que estava vazio é livre.'
      using errcode = '42501', hint = 'curriculo_em_uso';
  end if;
  v_justificativa := app.justificativa_de_correcao();
  if v_justificativa is null or length(v_justificativa) < 5 then
    raise exception 'Corrigir um currículo seguido por turma com lançamento exige justificativa (ao menos 5 letras).'
      using errcode = '23514', hint = 'justificativa_obrigatoria';
  end if;

  -- A trilha ANTES de a linha mudar: se a escrita falhar depois, a transação desfaz as duas.
  insert into public.correcoes_de_curriculo (curriculo_id, curso_id, tabela, registro_id, acao, campos, antes, depois,
                                             justificativa, autor_id)
  values (v_curriculo, (v_novo ->> 'curso_id')::uuid, tg_table_name, (v_novo ->> 'id')::uuid, v_acao, v_campos,
          case when v_velho is null then null
               else (select jsonb_object_agg(k, v_velho -> k) from unnest(v_campos) k) end,
          (select jsonb_object_agg(k, v_novo -> k) from unnest(v_campos) k),
          v_justificativa, auth.uid());
  return new;
end;
$$;
revoke all on function app.guardar_curriculo_em_uso() from public, anon, authenticated;

create trigger trg_curriculos_curriculo_em_uso before update on public.curriculos
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_disciplinas_curriculo_em_uso before insert or update on public.disciplinas
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_unidades_ensino_curriculo_em_uso before insert or update on public.unidades_ensino
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_avaliacoes_curriculo_em_uso before insert or update on public.avaliacoes_curriculo
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_limites_curriculo_em_uso before insert or update on public.limites_curriculo
  for each row execute function app.guardar_curriculo_em_uso();
create trigger trg_avaliacoes_planejadas_curriculo_em_uso before insert or update on public.avaliacoes_planejadas
  for each row execute function app.guardar_curriculo_em_uso();

-- ---------------------------------------------------------------- 3. o PDF de cada currículo (RC-11)
-- ⚠️ SÓ ACRESCENTA UMA POLICY: as do Bloco 5 (`<curso>/curriculo.pdf`) ficam — o PDF do currículo 1 continua onde está.
--    O envio novo vai para `<curso>/<currículo>/<arquivo>.pdf`, do currículo DAQUELE curso, por quem edita o curso.
create policy curriculos_carregar_por_curriculo
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'curriculos'
    and (storage.foldername(name))[2] is not null
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9]+\.pdf$'
    and app.pode('cursos', 'editar')
    and exists (
      select 1
        from public.curriculos cr join public.cursos c on c.id = cr.curso_id
       where c.id::text = (storage.foldername(name))[1]
         and cr.id::text = (storage.foldername(name))[2]
         and c.status = 'ativo'
         and cr.arquivado_em is null
         and app.alcanca_curso(c.id)
    )
  );
