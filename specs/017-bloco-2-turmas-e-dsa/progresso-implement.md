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

Enumeração por `grep` de `from("turmas")` e `from("vw_carga_horaria_turma")` em `app/` e `lib/` (19/10/2026), e a
decisão de cada leitor:

| Leitor | Decisão | Por quê |
|---|---|---|
| `app/(app)/turmas/page.tsx` | **some**, volta com *Mostrar arquivadas*, com o selo | D-COR-5 |
| `app/(app)/inicio/page.tsx` (panorama, tetos, vistas) | **some** | C-24; tetos e vistas seguem o panorama |
| `app/(app)/cursos/[curso]/page.tsx` (lista, seletor, pré-seleção, *teto excedido*) | **some**; o **limite** conta todas | C-24 e C-7 |
| `app/(app)/atividades/page.tsx` (filtro de turma) | **some** | C-24 |
| `app/(app)/disciplinas/consulta.ts` (cascata) | **some da cascata**; a turma pedida pelo código continua lida | a mesma função monta a ficha da turma |
| `app/(app)/admin/salas/page.tsx` | **fica** | histórico (C-24) |
| `app/(app)/cursos/[curso]/editar/page.tsx` | **fica** | limite e proteção de vigência contam a arquivada (C-7) |
| `app/(app)/cursos/[curso]/turmas/nova/page.tsx` | **fica** | o limite de turmas por ano conta a arquivada (C-7) |
| ficha, DSA, impressão, planilha, avaliações da turma, ações | **não é lista** | leitura de UMA turma; a arquivada abre só para ler |

## T063 — defeitos deliberados

- **M3, a agenda alheia inteira** (o corpo de antes do achado 53, aplicado por `psql` no banco local limpo, 19/10/2026):
  `tests/invariantes/rls/bloco-2.test.ts` reprovou **1 de 27** — exatamente *"a ocupação alheia que NÃO cruza a do
  operador não sai"* —, e voltou a **27 de 27** com o corpo da migration. Desfeito por `pnpm db:reset:limpo`.
- **`PEND-016-5`, o painel sem o sem posição** (o acumulado do DSA lendo `[]` no lugar de `dados.semPosicao`, 19/10/2026):
  `tests/invariantes/planilha-igual-ao-papel.test.ts` reprovou **2 de 7** — *"D95: painel 25 × base da CHD 40"*, a
  CONTROLE e a situação junto —, e voltou a **7 de 7** com a leitura.
- Os demais: `[pendente]`.

## T021/T022 — o que a prova contra o banco mediu

- **A faixa *sem posição* das abas de semana da planilha NÃO soma** (19/10/2026, banco local limpo, semente do DSA
  mais 10 TA sem posição na W16 e 5 TA fora do DSA): com o sem posição da pasta deixado fora de `FORA_TEMPOS` — o
  desenho que o achado 3 do analyze propunha para não contar duas vezes —, a CONTROLE deu **30 × 40** do painel, a
  CRONOS **32 × 42** da base, e o rodapé da IMPRESSÃO ficou **10 abaixo do papel** em quatro semanas. O risco era o
  oposto do previsto: não dobrava, sumia. Todo fato sem posição foi para `FORA_TEMPOS`, e as três batem.

## T065 — `verificar:tudo` e a suíte rodada duas vezes

- Contagens: `[pendente]`.
- `pnpm test:rls` (a pasta `tests/invariantes` inteira), duas vezes seguidas sem reset, sobre o banco local limpo
  (`pnpm db:reset:limpo`, 19/10/2026, com M1–M3 corrigidas pelo analyze): **362 de 362 em 20 arquivos** na 1ª e
  **362 de 362** na 2ª. pgTAP no mesmo banco: **862 em 59 arquivos**, verde.
- Os e2e novos, duas vezes seguidas: `[pendente]`.
