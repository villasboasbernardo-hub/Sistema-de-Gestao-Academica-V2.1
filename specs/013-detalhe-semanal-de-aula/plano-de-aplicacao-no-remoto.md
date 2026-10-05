# Aplicação no remoto — spec 013, PR B (T047)

> **PLANO, NÃO REGISTRO.** Nada abaixo foi executado. Este documento existe para você autorizar —
> *"NÃO aplique no remoto: pare depois do PR aberto e me mostre o plano de aplicação (backup,
> dry-run, reversão) para eu autorizar"* (Bernardo Villas Boas, 05/10/2026). Quando a autorização
> vier, os resultados medidos entram nas colunas vazias e o documento passa a ser o registro.

> **Uma migration só**: `20261005181116_dsa_lancamento_sem_ue_e_conflito.sql`.

⚠️ **APLICAR NO REMOTO É APLICAR TAMBÉM NA PRODUCTION** (AMBIENTE-1): preview e Production
compartilham o mesmo projeto Supabase até o dia da virada. A `main` que a Production roda passa a
falar com o banco novo **antes** do merge — é por isso que a migration vai antes, e não depois.

⚠️ **E ESTA É A PRIMEIRA MIGRATION DO PROJETO QUE ACRESCENTA `CHECK` A TABELA COM DADO REAL NO
REMOTO.** As anteriores criavam tabela, coluna, função ou view. Um `CHECK` novo é **validado contra
todas as linhas existentes** no momento do `ALTER TABLE`: uma linha que o viole faz o push falhar
inteiro. São **1.566** aulas e **664** atividades em jogo. É por isso que o rito abaixo começa com
uma medição, e não com o backup.

---

## 0. A PRÉ-CONFERÊNCIA — executada, só leitura, 05/10/2026

Rodada com `supabase db query --linked -f …` (leitura pura, autorizada pela seção *A fonte da
verdade* do `CLAUDE.md`). **É ela que diz se o push vai passar**, e o veredito é que vai:

| # | O que foi medido no remoto | Valor | O que ele decide |
|---|---|---|---|
| **B** | `registros_aula` que **violariam** a catraca nova — UE nula **e** não-histórica | **0** | ✅ o `ALTER TABLE` da catraca passa. Com 1 só, o push falharia inteiro |
| **G** | `registros_aula` com `editado_em` preenchido | **0** | ✅ as 1.566 estão intactas: nenhuma foi editada na tela, então todas se amparam no ramo histórico |
| **D** | atividades `Estudo_Individual` com escopo **diferente** de `turma` | **0** | ✅ o `CHECK` do V-5 passa sobre as **531** linhas de Estudo Individual |
| **F** | atividades de escopo **global** hoje | **0** | ✅ a correção do V-7 não muda número nenhum **agora** — e é exatamente por isso que ela é barata hoje e caríssima depois da primeira global |
| **K** | `registros_aula.disciplina_id` já existe? | **0** | ✅ a coluna é nova; não há conflito de nome |
| **H** | `config_listas.metodologias` / com sigla | **16 / 0** | a semente fará **3 `update` + 6 `insert`** → 22, dos quais 9 com sigla e **13 sem** (o número que você fixou na H1) |
| **I** | `config_listas.tipos_atividade` / com categoria | **13 / 0** | a semente fará **7 `update` + 3 `insert`** → 16, dos quais 10 com categoria |
| **J** | `config_parametros` com chave `dsa.*` | **0** | os três parâmetros serão `insert` |
| **L** | cursos `curriculo_modelo = 'competencias'` | **2** | a isenção alcança **2 de 24** cursos, como a spec diz |
| **M** | disciplinas `sem_unidades_ensino` | **6** | e **6 de 175** disciplinas |
| **N** | `reloptions` das duas views a recriar | ambas `{security_invoker=true}` | o `with (security_invoker = true)` repetido **preserva**; não introduz |

⚠️ **O QUE ESSA TABELA NÃO PROMETE:** ela é um retrato de **05/10/2026**. O remoto é fonte da verdade
dos cadastros e está sendo usado na tela; se alguém editar uma aula entre esta leitura e o push, o
**B** pode deixar de ser zero. **A pré-conferência MUST ser reexecutada imediatamente antes do passo
2**, e é por isso que ela é o passo 0 do rito e não um anexo.

---

## 1. O rito, na ordem a executar

| # | Passo | Comando | Resultado esperado | Medido |
|---|---|---|---|---|
| 0 | **Reexecutar a pré-conferência** | `supabase db query --linked -f <o arquivo acima>` | **B = 0** e **D = 0**. Se qualquer um for diferente de zero, **PARAR** e me chamar: há linha que o `CHECK` recusa, e o push falharia | — |
| 1 | **Backup** | `python -m scripts.manutencao.dado_do_remoto --somente-copia` | um `remoto-AAAAMMDD-HHMMSS.sql` em `%LOCALAPPDATA%\ciaara-11\copias-do-remoto\`, fora do git, com o tamanho citado no relatório | — |
| 2 | **Dry-run** | `supabase db push --linked --dry-run` | *"Would push these migrations: • 20261005181116_dsa_lancamento_sem_ue_e_conflito.sql"* — **uma só**, nenhum `seed`, nenhum `role` | — |
| 3 | **Aplicação** | `pnpm db:push` | `Applying migration 20261005181116…` · saída **0** | — |
| 4 | **Retrato depois** | `--somente-copia` de novo | o segundo arquivo datado, que sustenta a conferência de dado | — |

⚠️ **O BACKUP NÃO É REDE DE SEGURANÇA AUTOMÁTICA.** Restaurá-lo no remoto seria **escrita no
remoto**, que a seção da fonte da verdade proíbe sem decisão expressa sua. O que ele garante é que o
dado **existe** para ser reposto quando a decisão vier. ⚠️ E **ele não traz o schema `auth`**:
credencial não é cadastro.

---

## 2. A conferência depois, só por leitura

| # | O que conferir | Como | Esperado |
|---|---|---|---|
| 1 | **As migrations, dos dois lados** | lista local × remota | **52 e 52**, nenhuma só de um lado; a última é `20261005181116` |
| 2 | **O esquema, objeto a objeto** | `scripts/provas/impressao_digital_do_esquema.sql` nos dois | **mesmo número de objetos e mesmo md5** nos dois bancos, `diff` vazio. ⚠️ O md5 **vai mudar** em relação ao de 03/10 (`ba7f116c…`, 1.595 objetos) — é o ponto: ele tem de mudar **igual** nos dois lados |
| 3 | **A coluna e a FK composta** | catálogo | `registros_aula.disciplina_id` anulável; `reg_aula_disciplina_do_curso` → `disciplinas(id, curso_id)` `restrict` |
| 4 | **Os três CHECK** | catálogo | `reg_aula_ue_so_nula_no_historico` (com `app.disciplina_sem_ue` e `coalesce`), `reg_aula_ue_ou_disciplina`, `reg_aula_ue_xor_disciplina` |
| 5 | **O porteiro da isenção** | catálogo | `app.disciplina_sem_ue` **`SECURITY DEFINER`**, `STABLE`; `anon` **sem** `execute`; `authenticated` **com** (gotcha 5.1 — sem ele toda gravação falha) |
| 6 | ⚠️ **`security_invoker` nas duas views** | `reloptions` | `{security_invoker=true}` em `vw_ocupacao_ta` **e** `vw_disciplinas_execucao`. **É a conferência que esta base já pagou uma vez** (gotcha 10, 25/09/2026, vazamento que foi ao remoto) |
| 7 | **Zero `DELETE`/`TRUNCATE` novos** | catálogo | **0** policies de `DELETE` no catálogo inteiro; `authenticated` sem `DELETE`/`TRUNCATE` nas duas views |
| 8 | **A função de conflito** | catálogo | `public.conflitos_da_semana(uuid,date,date)` `SECURITY DEFINER`; `anon` **sem** `execute`; `authenticated` **com** |
| 9 | **O dado INTACTO** | contagens | `registros_aula` **1.566**, `atividades_nao_letivas` **664**, `avaliacoes` **188**, e **`disciplina_id` nula nas 1.566** — a migration não preenche linha nenhuma |
| 10 | **As sementes** | contagens | `metodologias` **22** (9 com sigla), `tipos_atividade` **16** (10 com categoria), `config_parametros dsa.*` **3** |
| 11 | **`Licença de Pagamento` sem categoria** | catálogo | **0** linhas — ela vem do calendário (Q-16), não do DSA |
| 12 | **O comentário da E-1** | `obj_description` | contém *"NAO descontam nada"* e **não** contém *"`parcial` reduz;"* |
| 13 | **Production respondendo** | HTTP | `/login` **200**, rotas protegidas **307** — como antes |

⚠️ **A CONFERÊNCIA DE "ZERO LINHAS ALTERADAS" NÃO É md5 DE TABELA VIVA** (gotcha 13): `usuarios`
carrega `ultimo_acesso` e `editado_em`, que mudam sozinhos enquanto alguém usa o preview, e ler isso
como *"a migration mexeu em linha"* já levou uma sessão a querer restaurar backup no remoto. O
instrumento é **comparar os dois retratos datados** (passos 1 e 4) com `diff`, onde a diferença
aparece **nomeada**. A diferença esperada aqui é **só a coluna nova na lista do `INSERT` de
`registros_aula`**, com `NULL` nas 1.566 linhas, mais as linhas de `config_listas`/
`config_parametros` que a semente acrescenta.

---

## 3. A reversão (DoD 6)

O texto completo, executável, está **no cabeçalho da própria migration**, escrito **antes** do `up`.
Resumo da ordem, que é a inversa da aplicação:

1. a semente e os comentários (`update … metadados - 'sigla'`, `delete` dos 10 valores novos e dos 3
   parâmetros, `comment on type` de volta ao texto anterior);
2. `drop function public.conflitos_da_semana(uuid, date, date)`;
3. as duas views recriadas com a definição **anterior** e o `with (security_invoker = true)`
   **repetido** — é justamente essa opção que a prova de `pg_dump` confere;
4. o responsável da atividade (`constraint` + duas colunas);
5. o `CHECK` do Estudo Individual;
6. os três `CHECK` de `registros_aula`, e a catraca de volta à forma original;
7. `drop function app.disciplina_sem_ue(uuid)`; a FK composta; a coluna.

⚠️ **A REVERSÃO NÃO APAGA LANÇAMENTO, MAS PODE PERDER A DISCIPLINA DELE.** Se alguém gravar aula sem
UE antes da reversão, o `drop column disciplina_id` **perde a disciplina daquelas linhas** e a
catraca original as recusaria na primeira edição. Quem reverter MUST medir antes:

```sql
select count(*) from public.registros_aula where disciplina_id is not null;
```

Com resultado diferente de zero, a reversão deixa de ser reversão e passa a ser perda de dado —
**pare e me chame**.

### ✅ A reversão FOI executada numa base descartável, e achou TRÊS defeitos (T046)

`pg_dump` → `up` → `down` → `pg_dump`, no banco local, em 05/10/2026: **diff VAZIO em 11.753 linhas**,
tirando só o par `\restrict`/`\unrestrict` que o `pg_dump` sorteia a cada execução. Ao fim,
`security_invoker=true` nas duas views e **zero** privilégios de `anon` em `vw_ocupacao_ta`.

⚠️ **Mas o diff NÃO era vazio na primeira volta, e os três achados valem mais que o veredito —
dois deles eram defeito do `up`, não do `down`:**

| # | O que o `pg_dump` acusou | Onde estava o defeito |
|---|---|---|
| 1 | **7 linhas perdidas**: o `COMMENT ON CONSTRAINT reg_aula_ue_so_nula_no_historico` desapareceu | **No `up`.** `drop constraint` + `add constraint` **descarta o comentário em silêncio**, e o que estava ali era a razão da catraca e a citação da decisão UE-1 — o texto que a próxima pessoa lê antes de mexer nela. A migration teria ido ao remoto **apagando a explicação**. Consertado: o `up` repõe o comentário, agora citando também a isenção da Q-1 |
| 2 | `GRANT SELECT,INSERT,… ON vw_ocupacao_ta TO anon` **apareceu** no revertido | **No `down`.** A reversão faz `drop view` + `create view` (o `replace` não tira coluna), e **view nova nasce com privilégio para `anon`** — a reversão **alargava permissão**. `revoke delete, truncate` não cobre isso; o que cobre é `revoke all … from anon` |
| 3 | o `COMMENT ON VIEW` voltava com texto diferente | **No `down`**, que trazia a minha redação em vez da original. Reposto verbatim |

⚠️ **E um quarto, achado por leitura e não pelo diff:** o `delete from config_listas` da reversão
apagava os 19 valores por `(lista, valor)` — e **9 deles vieram da planilha**. Numa base recriada
isso é correto (a migration os criou); **no remoto seria apagar DADO**. O `delete` passou a ser
escopado por `origem_migracao_v1 is null`, que acerta nas duas bases.

### ✅ E o caso que discrimina (T045, DoD 8)

Com `public.conflitos_da_semana` **inerte** — mesma assinatura, mesmo porteiro, `return` vazio —,
`tests/invariantes/rls/dsa.test.ts` reprova **exatamente um** caso, *"⚠️ O CASO QUE DISCRIMINA · e
ainda assim o Operador VÊ o conflito, pela função com porteiro"*, com a frase que ele existe para
dar: *"o conflito da turma alheia não chegou"*. **Os outros 28 passam** — o que prova que o caso
isola o resultado da função e não o cenário. Com a função de volta: **29 de 29**.

---

## 4. O que NÃO entra nesta aplicação

- **Nenhuma correção de dado.** A migration cria estrutura e semeia **vocabulário**; ela não toca
  cadastro, não preenche `disciplina_id` de linha histórica e não corrige feriado.
- **A correção do relógio (Q-6) não é esta migration.** Ela entra como **dado**, por nova vigência
  de regime, gravada **por você pela tela**, antes do PR 3 — e eu confiro por leitura depois.
- **A carga do ETL não roda contra o remoto.** A `VIRADA-1` e os dois pré-requisitos da `AMBIENTE-2`
  continuam valendo. ⚠️ O conserto de `promover.py` que entra neste PR é para a carga **local**: ele
  faz a promoção de `config_listas` tolerar a linha que a migration semeia.
