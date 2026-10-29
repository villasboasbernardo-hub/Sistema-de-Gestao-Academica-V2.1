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

## O rito
[pendente — preenchido na aplicação, depois do CI verde]

## Reversão
`reversao.sql` (nesta pasta): `drop constraint`; `update … set descricao = 'ESTUDO INDIVIDUAL' where descricao is null
and categoria_normativa = 'Estudo_Individual'` — **a reversão escreve em dado** quando já houver EI sem descrição; `set
not null`; o comentário de volta a nulo. **Provada** em 28/10/2026 no banco local limpo, numa transação desfeita: com um
EI nulo inserido, a reversão o preencheu, a coluna voltou a `NOT NULL`, a restrição saiu, e a impressão digital foi de
**2.737 objetos `32ba63c9…`** a **2.736 objetos `4b7fb5fe…`** — a do remoto antes desta migration —, voltando a 2.737
com o `rollback`.
