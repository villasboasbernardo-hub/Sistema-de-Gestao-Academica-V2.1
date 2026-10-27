-- O QUADRO NAS ASSINATURAS DIGITADAS do 3º-Sargento FR — acertos finais da carga única de 26/10/2026 (R2 de Bernardo
-- Villas Boas, 27/10/2026). Sem nome de pessoa neste arquivo. Idempotente. Roda no local e, depois do merge, no remoto.
--
-- A RSP-000012 (C-Exp-BATI, de 14/03 em diante) e a RSP-000014 (C-Exp-Obs-ME T1, de 02/02 a 27/02) foram digitadas sem a
-- especialidade, e o rodapé do DSA saía «Terceiro-Sargento». O rodapé da planilha escreve «Terceiro-Sargento (FR)».
-- O quadro entra no MESMO FORMATO das assinaturas que vêm do cadastro: a `especialidade` sem hífen nem parênteses, como
-- o caminho de `onda-2-cadastro.sql` deriva do `esp_hab_obs` do instrutor (`-HN` → `HN`, na RSP-000015). Quem põe os
-- parênteses é `postoParaAssinatura`, na impressão: «Terceiro-Sargento (FR)».
-- É um UPDATE comum: o gatilho de auditoria carimba `editado_em` (script sem sessão: `editado_por` fica nulo, como no
-- acerto de 09/10/2026). Nada mais da linha muda.
update public.responsaveis_curso set especialidade = 'FR'
 where codigo in ('RSP-000012', 'RSP-000014')
   and papel_assinatura = 'elaborador' and preenchimento = 'fixo' and instrutor_id is null and posto_graduacao = '3ºSG'
   and especialidade is distinct from 'FR';
