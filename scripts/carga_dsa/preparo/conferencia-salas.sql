-- Conferencia de 07/10/2026 (Bernardo Villas Boas: aplicar a recomendacao de cada caso, categoria 3): os locais da
-- planilha que sao SALAS do CIAARA entram no cadastro de salas. Os demais (OM, cidade, navio, simulador) ficam como
-- texto livre, pelas decisoes de local da turma. Idempotente.
insert into public.config_listas (lista, valor, rotulo_exibicao, metadados)
select 'salas', s, s, '{"ambiente_virtual": false}'::jsonb
  from unnest(array['Sala 05', 'Sala 00', 'H36', 'H38']) as s
 where not exists (select 1 from public.config_listas c where c.lista = 'salas' and c.valor = s);
