# Plano de aplicação no remoto — spec 027 (Bloco 12)

Migration: `supabase/migrations/20261027123023_exclusao_logica_no_calendario.sql`. **Só acrescenta** (regra 9.4, emenda
de 19/10/2026): duas colunas nuláveis em `feriados` com restrições só sobre elas, um gatilho que só guarda as colunas
novas e a linha excluída, e duas funções novas com os espelhos. Nenhuma view, função, policy, privilégio ou dado
existente muda. Por isso **segue sem parar**, com o rito completo, depois do CI verde e antes do merge (o mesmo projeto
serve Preview e Production — AMBIENTE-1).

## Medido antes, na cópia `remoto-20261027-061453.sql` (local recriado do remoto, transação desfeita)
- 32 linhas em 2026, **32** presas pela D-COR-6; 26 da v2.0, 18 nunca editadas.
- Excluir o `FER-000023` (12/11, v2.0, inativo) e o `FER-000002` (09/02, v2.0, ativo, nunca editado): passou; a
  `vw_dias_parados_turma` da CAHO 2026 foi de **FR 19** para **FR 18** dias; o rastro gravado com `modo: 'logica'`; a
  lista ficou com 30 de 32; a excluída recusou reativar (`55000`); outra linha na mesma data entrou.
- O Encarregado (sessão simulada): a função recusou (`42501`), o `UPDATE` de `excluido_em` recusou (`42501`), e o
  desativar da mesma linha passou.

## O rito
1. Backup: `python -m scripts.manutencao.dado_do_remoto --somente-copia` → `[pendente]`.
2. Dry-run: `supabase db push --linked --dry-run` listando **só** `20261027123023` → `[pendente]`.
3. `supabase db push --linked` (o pedido de permissão aparece para Bernardo) → `[pendente]`.
4. Conferência só de leitura → `[pendente]`:
   - migrations iguais nos dois lados (100 e 100);
   - impressão digital do esquema (`scripts/provas/impressao_digital_do_esquema.sql`) igual no local e no remoto;
   - `security_invoker` nas views, zero policy de `DELETE`;
   - as 32 linhas de `feriados` com `excluido_em` e `excluido_por` nulos (nada excluído pela migration);
   - Production respondendo.

## Reversão
`reversao.sql` (nesta pasta). Vale antes de uso real do *Excluir*: depois dele, as linhas excluídas voltariam à lista,
inativas.
