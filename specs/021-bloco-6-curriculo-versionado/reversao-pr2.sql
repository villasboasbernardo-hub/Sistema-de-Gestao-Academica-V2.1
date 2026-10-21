-- =================================================================================
-- Spec 021 · Bloco 6 — a REVERSÃO do PR 2: desfaz a M4 (`20261021124838`) e depois a M3 (`20261021124836`).
--
-- ⚠️ ANTES de rodar: nenhum currículo além do 1 (os currículos novos, as disciplinas, UEs e avaliações copiadas e as
--    turmas que os seguem saem antes, pelo caminho que a decisão da reversão disser — não por este script), e o PDF de
--    cada currículo 1 no lugar do Bloco 5 (`<curso>/curriculo.pdf`): o código antigo lê só esse caminho.
-- ⚠️ A TRILHA SAI COM A TABELA: `correcoes_de_curriculo` é só de acréscimo (os gatilhos recusam UPDATE, DELETE e
--    TRUNCATE), mas `drop table` não passa por eles. Guardar a trilha antes (`pg_dump -t`) é a decisão de quem reverte;
--    o que ela registrou deixa de existir no banco.
-- ⚠️ Os arquivos novos do balde (`<curso>/<currículo>/<instante>.pdf`) FICAM — regra 4, sem `DELETE`; sem a policy de
--    INSERT, ninguém acrescenta outro.
-- =================================================================================
begin;

-- ── M4: a correção do currículo em uso, a matriz e a policy do balde ──
drop policy if exists curriculos_carregar_por_curriculo on storage.objects;
drop trigger if exists trg_curriculos_curriculo_em_uso on public.curriculos;
drop trigger if exists trg_disciplinas_curriculo_em_uso on public.disciplinas;
drop trigger if exists trg_unidades_ensino_curriculo_em_uso on public.unidades_ensino;
drop trigger if exists trg_avaliacoes_curriculo_em_uso on public.avaliacoes_curriculo;
drop trigger if exists trg_limites_curriculo_em_uso on public.limites_curriculo;
drop trigger if exists trg_avaliacoes_planejadas_curriculo_em_uso on public.avaliacoes_planejadas;
drop function if exists app.guardar_curriculo_em_uso();
delete from public.perfil_permissao where recurso in ('correcao_de_curriculo', 'arquivamento_de_curriculo');

-- ── M3: a cópia, o arquivamento, a justificativa, a trilha e o caminho do PDF ──
drop function if exists public.desarquivar_curriculo(uuid);
drop function if exists public.arquivar_curriculo(uuid, date);
drop function if exists public.criar_curriculo(uuid, date, text, date);
drop function if exists app.justificativa_de_correcao();
drop table if exists public.correcoes_de_curriculo;
drop function if exists app.correcoes_de_curriculo_imutaveis();
revoke update (pdf_caminho) on public.curriculos from authenticated;
alter table public.curriculos drop column if exists pdf_caminho;

commit;
