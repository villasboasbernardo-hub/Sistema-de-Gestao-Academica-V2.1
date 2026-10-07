-- O LOCAL DO ESTUDO INDIVIDUAL E «Biblioteca», em todos os cursos e turmas — decisao de Bernardo Villas Boas,
-- 07/10/2026, na conferencia visual do DSA. Rodado nos dois bancos como UM bloco `DO`. Idempotente.
-- A carga das planilhas passa a gravar Biblioteca no EI (fontes.json, `local_do_estudo_individual`), e o EI da
-- semana em um clique tambem (lib/dominio/dsa/rotulos.ts, `LOCAL_DO_ESTUDO_INDIVIDUAL`).
do $$
declare n int;
begin
  insert into public.config_listas (lista, valor, rotulo_exibicao, metadados)
  select 'salas', 'Biblioteca', 'Biblioteca', '{"ambiente_virtual": false}'::jsonb
   where not exists (select 1 from public.config_listas where lista = 'salas' and valor = 'Biblioteca');
  update public.atividades_nao_letivas set local = 'Biblioteca'
   where categoria_normativa = 'Estudo_Individual' and status = 'ativo' and local is distinct from 'Biblioteca';
  get diagnostics n := row_count;
  raise notice 'EI ativos levados para Biblioteca: %', n;
end $$;
