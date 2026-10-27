# Plan 027 — Bloco 12: excluir no Calendário

Spec: [`spec.md`](./spec.md). Ordem de dentro para fora (`CLAUDE.md`): domínio → validação → ação → página → componente.

## 1. Banco — `20261027123023_exclusao_logica_no_calendario.sql` (só acrescenta)

- `feriados.excluido_em`, `feriados.excluido_por` (nuláveis) + `feriados_exclusao_completa` e
  `feriados_excluida_inativa` (só sobre as colunas novas).
- `trg_feriados_exclusao` → `app.guardar_exclusao_no_calendario()` (`SECURITY DEFINER`, `revoke` de todos): sem sessão
  não trava; com sessão, a linha não nasce excluída, a excluída não se altera, e marcar a exclusão exige
  `app.eh_admin()`.
- `app.impacto_da_exclusao_do_feriado(uuid) → jsonb` (`stable`, porteiro de Admin): turmas atingidas (D-4) com aulas,
  atividades e avaliações que contam no dia (D-5) e a última versão publicada da semana ISO (D-6); as atividades de todas
  as turmas à parte.
- `app.excluir_linha_do_calendario(uuid) → jsonb` (porteiro de Admin e de sessão): rastro em `exclusoes_registradas`
  (`modo: 'logica'`, o retrato e o impacto) **antes**, depois `status = 'inativo'` + `excluido_*`.
- Espelhos `public.*` `SECURITY INVOKER`; `execute` para `authenticated` e `service_role`, nunca `anon`.
- Medido na cópia `remoto-20261027-061453.sql` com `rollback` (spec §7). `pnpm db:tipos` depois.

## 2. Domínio puro — `lib/dominio/exclusao-no-calendario.ts`

- `resumoDoImpacto(impacto, hoje)`: a data passou (D-7), as turmas atingidas em ordem de turma (`emOrdemDeTurma`), os
  lançamentos do dia por turma (só as com algum), as atividades de todas as turmas, as semanas publicadas com
  `semanaDoCurso` + `datasDaSemanaIso` (D-6), o efeito pela situação (D-9), `semVinculo` e o rótulo do botão (D-8).
- Teste de unidade visto reprovar antes (o módulo não existe).

## 3. Validação e ações

- `lib/validacao/calendario.ts`: `esquemaDaLinhaParaExcluir` (`{ id: uuid }`).
- `lib/acoes/calendario.ts`:
  - `lerImpactoDaExclusao(entrada)` — Zod na 1ª linha; `rpc("impacto_da_exclusao_do_feriado")`; o resumo com
    `hojeNaCiaara()`; `42501` → *"Só o Admin exclui do calendário."*, `P0002` → *"A linha do calendário não existe
    mais."*, outro erro → *"Não foi possível calcular o impacto agora."*
  - `excluirLinhaDoCalendario(entrada)` reescrita: `rpc("excluir_linha_do_calendario")`, as mesmas traduções,
    `revalidar()`.

## 4. Leitura e telas

- `app/(app)/atividades/calendario.ts`: a lista lê `excluido_em is null`.
- `app/(app)/atividades/page.tsx`: `podeExcluir` = perfil `admin` (D-17); sai a leitura dos impedimentos.
- `app/(app)/atividades/ExcluirDoCalendario.tsx` (folha): o ícone *Excluir* (sem estado bloqueado); ao abrir, pede o
  impacto; mostra *"Calculando o impacto…"*, depois a lista; *Cancelar* e *Excluir mesmo assim* / *Excluir*; sem impacto,
  o aviso e nenhum botão de excluir (D-13); recusa e sucesso acima da lista.
- `PainelDoCalendario.tsx`: troca `ExclusaoPermanente` pela folha nova; o cabeçalho de comentário passa a D-COR-7.

## 5. Testes

- Unidade: `tests/unidade/exclusao-no-calendario.test.ts`.
- pgTAP: `supabase/tests/152_exclusao_logica_no_calendario.sql` — estrutura, porteiro sem sessão, a linha da v2.0
  excluída com sessão de Admin simulada, o rastro, a excluída congelada, outra linha na mesma data, `vw_dias_parados_turma`
  que deixa de contar (caso que discrimina), o impacto, zero policy de `DELETE`.
- RLS (sessão real): `tests/invariantes/rls/exclusao-no-calendario.test.ts` — Encarregado recusado na função, no
  impacto e no `UPDATE` direto (`42501`), banco igual; o Encarregado continua desativando (controle positivo); o Admin
  exclui; a excluída congelada até para o Admin.
- Ponta a ponta por clique: `tests/e2e/excluir-no-calendario.spec.ts` (SC-001 feriado futuro → alerta → some da lista →
  um dia útil a mais na ficha → DSA sem a marca, conferido no banco; SC-002 semana publicada → alerta cita turma e
  semana → *"alterado desde a publicação"* e retrato igual; SC-003 Encarregado e Operador sem *Excluir*). E
  `tests/e2e/bloco-10.spec.ts` item 11 passa para a exclusão lógica.
- Regra da ponta a ponta (Bloco 11): unidade, pgTAP e RLS verdes no local; os e2e tocados rodados no local; a suíte
  inteira fica com o CI.
