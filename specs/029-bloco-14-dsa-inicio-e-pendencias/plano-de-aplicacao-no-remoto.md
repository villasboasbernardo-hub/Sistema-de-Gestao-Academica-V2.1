# Plano de aplicação no remoto — spec 029 (Bloco 14)

Migration: `supabase/migrations/20261028182926_estudo_individual_sem_descricao.sql`. **Só acrescenta** (regra 9.4,
emenda de 19/10/2026; o pedido diz *"tirá-lo só ACRESCENTA permissão: siga com o rito"*): `atividades_nao_letivas.descricao`
perde o `NOT NULL` e ganha o CHECK `ativ_descricao_fora_do_estudo_individual` (`descricao is not null or
categoria_normativa = 'Estudo_Individual'`), mais o comentário da coluna. Para AEC, TAD, TR e Apoio o CHECK equivale ao
`NOT NULL` retirado; para o Estudo Individual libera o nulo. Nenhuma view, função, policy, privilégio ou dado muda. Segue
com o rito completo, depois do CI verde e antes do merge (o mesmo projeto serve Preview e Production — AMBIENTE-1).

## Medido antes, na cópia `remoto-20261028-133702.sql` (local recriado do remoto)
- `atividades_nao_letivas`: **1.090** Estudo Individual, **190** AEC, **143** TAD, **75** TR, **40** Apoio — **0** com
  descrição nula e **0** em branco em todas as categorias. O CHECK valida sem tocar em dado.
- Impressão digital do esquema do remoto antes desta migration: **2.736 objetos, `4b7fb5fe…`** (a do Bloco 12; o Bloco
  13 não teve banco).

## O rito — aplicado em 29/10/2026, depois do CI verde em `e62ae10` (runs `40813730436` e `40813725925`)
1. **Backup** — `python -m scripts.manutencao.dado_do_remoto --somente-copia` → **`remoto-20261029-011810.sql`**
   (4.721.766 bytes, *"dump complete"*, fora do git).
2. **Dry-run** — `supabase db push --linked --dry-run` listou **só** `20261028182926_estudo_individual_sem_descricao.sql`.
3. **Aplicação** — `supabase db push --linked`, saída **0**.
4. **Conferência só de leitura**, na hora:
   - migrations: **101 e 101**, os 101 pares iguais (`supabase migration list --linked`);
   - impressão digital do esquema **idêntica nos dois bancos**: **2.737 objetos, `32ba63c9…`** (era 2.736, `4b7fb5fe…`);
   - `atividades_nao_letivas.descricao` aceita nulo; `ativ_descricao_fora_do_estudo_individual` = `CHECK (((descricao IS
     NOT NULL) OR (categoria_normativa = 'Estudo_Individual')))`;
   - as linhas por categoria **iguais às de antes** — AEC 190, TAD 143, TR 75, Estudo Individual 1.090, Apoio 40 — e
     **0** descrições nulas: a migration não mudou linha nenhuma;
   - **0** policies de `DELETE` no catálogo; **0** views de `public`/`app` sem `security_invoker`, fora a exceção nominal
     `vw_instrutor_dados_pessoais`;
   - Production respondendo: `/login` **200**; `/`, `/inicio` e `/turmas` **307** (para o login).

## Reversão
`reversao.sql` (nesta pasta): `drop constraint`; `update … set descricao = 'ESTUDO INDIVIDUAL' where descricao is null
and categoria_normativa = 'Estudo_Individual'` — **a reversão escreve em dado** quando já houver EI sem descrição; `set
not null`; o comentário de volta a nulo. **Provada** em 28/10/2026 no banco local limpo, numa transação desfeita: com um
EI nulo inserido, a reversão o preencheu, a coluna voltou a `NOT NULL`, a restrição saiu, e a impressão digital foi de
**2.737 objetos `32ba63c9…`** a **2.736 objetos `4b7fb5fe…`** — a do remoto antes desta migration —, voltando a 2.737
com o `rollback`.
