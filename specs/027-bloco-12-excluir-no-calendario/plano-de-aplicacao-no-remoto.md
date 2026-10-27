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

## O rito — aplicado em 27/10/2026, depois do CI verde em `f849acb` (runs `40508281506` e `40508316390`)
1. **Backup** — `python -m scripts.manutencao.dado_do_remoto --somente-copia` → **`remoto-20261027-103324.sql`**
   (4.529 KB, fora do git).
2. **Dry-run** — `supabase db push --linked --dry-run` listou **só** `20261027123023_exclusao_logica_no_calendario.sql`.
3. **Aplicação** — `supabase db push --linked`, saída **0**.
4. **Conferência só de leitura**, na hora:
   - migrations: **100 e 100**, nenhuma só de um lado (`supabase migration list --linked`);
   - impressão digital do esquema **idêntica nos dois bancos**: **2.736 objetos, `4b7fb5fe…`** (era 2.721,
     `d69c3a6c…`, depois do Bloco 11);
   - `feriados`: **32** linhas, **0** com `excluido_em`/`excluido_por` (a migration não excluiu nada); o gatilho
     `trg_feriados_exclusao` ao lado dos dois de antes; **0** linhas de rastro em modo lógica;
   - `public.excluir_linha_do_calendario` e `public.impacto_da_exclusao_do_feriado`: `execute` para `authenticated`, não
     para `anon`; a função do gatilho, nem para `authenticated`;
   - **0** policies de `DELETE` no catálogo;
   - toda view de `public`/`app` com `security_invoker`, menos a exceção nominal `vw_instrutor_dados_pessoais`;
   - Production respondendo: `/login` **200**; `/`, `/inicio` e `/atividades` **307** (para o login).

## Reversão
`reversao.sql` (nesta pasta). Vale antes de uso real do *Excluir*: depois dele, as linhas excluídas voltariam à lista,
inativas. **Provada** em 27/10/2026, numa transação desfeita no banco local recriado da cópia
`remoto-20261027-100041.sql` (100 migrations): a impressão digital do esquema vai de **2.736 objetos `4b7fb5fe…`** a
**2.721 objetos `d69c3a6c…`** — a do remoto antes desta migration, lida no mesmo dia — e volta a 2.736 com o `rollback`.
