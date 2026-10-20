# Plano de aplicação no remoto — spec 018 (Bloco 3)

**Uma migration**, `20261020025815_regimes_nomeados_por_curso`, que **só acrescenta** (regra 9.4, emenda de
19/10/2026): tabela nova (`regimes_de_horario`), coluna nova nulável (`turmas.regime_de_horario_id`), funções novas e
`vw_dias_parados_turma` recriada com o mesmo resultado para o dado de hoje (nenhuma turma tem regime escolhido). Segue
o rito completo, sem portão.

## 1. O efeito, medido sobre a cópia antes do remoto (SC-009)

Cópia: `remoto-20261020-004014.sql` (tirada em 20/10/2026 00:40, só leitura). O banco **local** foi recriado pelas
migrations **sem** a do Bloco 3 e **com** ela, a cópia restaurada nos dois, e a impressão digital do conteúdo de
`vw_dias_parados_turma`, `vw_carga_horaria_turma` e `vw_conformidade_tetos` tirada nos dois
(`scripts/provas/impressao_digital_dos_dias_parados.sql`):

| View | Linhas sem | md5 sem | Linhas com | md5 com |
|---|---|---|---|---|
| `vw_dias_parados_turma` | 23 | `dc9b1481…` | 23 | `dc9b1481…` |
| `vw_carga_horaria_turma` | 29 | `a0c03cec…` | 29 | `a0c03cec…` |
| `vw_conformidade_tetos` | 87 | `5f22064e…` | 87 | `5f22064e…` |

**Iguais nas três** (medido em 20/10/2026 no banco local: 83 migrations sem, 84 com; md5 inteiros
`dc9b14814585f949c0019d29728f4bac`, `a0c03cec64b50f2cac572da071b246fb`, `5f22064ebaa2e5ae2b28d335eebf7c48`). Com a
migration, **0 de 29** turmas têm regime e `regimes_de_horario` tem **0** linhas — é por isso que nada muda: o regime da
turma só entra quando alguém o escolhe.

## 2. O rito — aplicado em 20/10/2026, depois do CI verde nos três blocos sobre `ac59c66`

1. **Backup**: `remoto-20261020-015448.sql` (`--somente-copia`, o banco local não foi tocado).
2. **Dry-run**: listou **só** `20261020025815_regimes_nomeados_por_curso.sql`.
3. **Aplicar**: `supabase db push --linked` → *"Applying migration 20261020025815_regimes_nomeados_por_curso.sql…
   Finished"*.
4. **Conferência só de leitura**, na hora:
   - **84 e 84** migrations, pareadas uma a uma (`supabase migration list --linked`), a última `20261020025815`;
   - impressão digital do esquema **idêntica** nos dois bancos: **`39af6fd99bca88710a7af23efbdca7cf`, 2.201 objetos**
     (era `bb6e48a8…`, 2.137, antes do Bloco 3);
   - `regimes_de_horario`: RLS ligada, as três policies (`ler`, `criar`, `editar`), **0** linhas, sem `DELETE` para
     `authenticated`; **0 de 29** turmas com regime; `vw_dias_parados_turma` com `security_invoker`; **0** policies de
     `DELETE` no catálogo;
   - as três views no remoto com os **mesmos md5** da §1 (23, 29 e 87 linhas);
   - os dois retratos datados — `remoto-20261020-015448.sql` (antes) e `remoto-20261020-061239.sql` (depois) —
     comparados tabela a tabela, 36 tabelas: **uma diferença só**, a coluna nova `turmas.regime_de_horario_id`, `NULL`
     em todas as linhas;
   - Production respondendo como antes: `/login` 200; `/inicio`, `/cursos`, `/turmas`, `/disciplinas` 307.

## 3. Reversão

`reversao.sql`, por `psql -v ON_ERROR_STOP=1`, só com a tabela vazia e nenhuma turma com regime; depois,
`supabase migration repair --status reverted 20261020025815`. Provada numa base limpa em 20/10/2026: a impressão digital voltou a `bb6e48a83cd7a0aaa8fe74fe95ef8d24`, 2.137
objetos (a da `main` de partida); com um regime cadastrado, ela recusa e não toca o esquema.
