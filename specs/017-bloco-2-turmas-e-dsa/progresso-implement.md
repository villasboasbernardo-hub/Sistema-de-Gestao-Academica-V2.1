# Progresso do implement — spec 017 (Bloco 2)

*Aberto em 19/10/2026. Todo número aqui nomeia o artefato contra o qual foi medido (regra 9.2); o que ainda não foi
medido fica `[pendente]` (regra 9.3).*

## T001 — linha de base do ramo

- `pnpm verificar` sobre `c1f8d65` + os commits de docs: `[pendente]` (contagem de unidade e arquivos).

## T002 — medições na cópia do remoto

**Artefato:** o banco **local** (`supabase_db_ciaara-11-v2-1`) restaurado de **`remoto-20261019-024230.sql`**
(19/10/2026, 02:42, o backup do rito do PR #69), com as M1–M3 desta spec aplicadas por cima. Medido em 19/10/2026 pela
sessão principal, só de leitura (`psql` no contêiner). O remoto **não** foi lido de novo.

| Medida | Valor | Consulta (resumo) |
|---|---|---|
| Disciplinas no total / ativas | **175** / **172** | `count(*)`, `count(*) filter (where status = 'ativo')` em `disciplinas` |
| Nomes ativos com mais de 30 / 40 / 50 / 60 caracteres | **61** / **31** / **20** / **9** | `length(nome_disciplina)` nas ativas |
| O maior nome ativo | **81** caracteres | `max(length(nome_disciplina))` nas ativas |
| Turmas por situação | planejada **4** · ativa **8** · concluída **12** · cancelada **5** (**29**) | `group by status` em `turmas` |
| Planejada ou ativa sem janela completa | **1** | `status in ('planejada','ativa') and (data_inicio is null or data_termino is null)` |
| Iniciando em [19/10, 18/11/2026], não cancelada | **0** | `status <> 'cancelada' and data_inicio between '2026-10-19' and '2026-11-18'` |
| Linhas de turma ativas sem instrutor ativo, em turma planejada ou ativa | **52** | `turma_disciplina` ativa sem `turma_disciplina_instrutor` ativo; a spec conta as **turmas** nessa condição: **10** |
| `PEND-016-5` — fato de CHD ativo sem posição que some TA | **0** (aulas, sessões e avaliações vivas); **102** vistas ativas sem `ta_inicial`, todas com 0 TA | medido no specify (spec, Edge Cases), no mesmo banco |

**A fixture do SC-008:** os **172** nomes das ativas, `select nome_disciplina from disciplinas where status =
'ativo' order by nome_disciplina`, guardados fora do git e versionados pela sessão principal como
`tests/unidade/dados/disciplinas-ativas-2026-10-19.txt` — o conjunto contra o qual a T046 prova o *172 de 172*.

⚠️ **Por que os números da `triagem.md` são outros** (*mais de 30: 60; mais de 40: 30; mais de 60: 10*): ela mediu
`scripts/etl/dados/disciplinas-do-banco.txt`, o retrato do remoto de **26/09/2026**, com **175** linhas e **sem filtro
de status** — outro artefato, outro conjunto. Os dois estão certos para o que mediram; o que vale para o SC-008 é o
de 19/10/2026, acima.

## T044/T045 — o cartão de 1 TA e o limite L

- Medida do cartão com o CSS de hoje (vista reprovar): `[pendente]`.
- L (R-8), com a medição: `[pendente]` — troca os marcadores da spec (FR-007.1), do `data-model.md` e do contrato.

## T038 — os leitores de lista de turma (C-24)

- Enumeração dos `from("turmas")` de `app/` e a decisão de cada um: `[pendente]`.

## T063 — defeitos deliberados

- **M3, a agenda alheia inteira** (o corpo de antes do achado 53, aplicado por `psql` no banco local limpo, 19/10/2026):
  `tests/invariantes/rls/bloco-2.test.ts` reprovou **1 de 27** — exatamente *"a ocupação alheia que NÃO cruza a do
  operador não sai"* —, e voltou a **27 de 27** com o corpo da migration. Desfeito por `pnpm db:reset:limpo`.
- Os demais: `[pendente]`.

## T065 — `verificar:tudo` e a suíte rodada duas vezes

- Contagens: `[pendente]`.
- `pnpm test:rls` (a pasta `tests/invariantes` inteira), duas vezes seguidas sem reset, sobre o banco local limpo
  (`pnpm db:reset:limpo`, 19/10/2026, com M1–M3 corrigidas pelo analyze): **362 de 362 em 20 arquivos** na 1ª e
  **362 de 362** na 2ª. pgTAP no mesmo banco: **862 em 59 arquivos**, verde.
- Os e2e novos, duas vezes seguidas: `[pendente]`.
