# Implementation Plan: Épico 1 — Schema PostgreSQL, RLS e matriz de permissões

**Branch**: `002-schema-rls-permissoes` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-schema-rls-permissoes/spec.md`

> **Branch real desta sessão:** `chore/UE-1-versionar-v2.1`. O `setup-plan.sh` deriva o nome do
> diretório da fatia, não do git. A branch de trabalho `db/002-schema-rls-permissoes` ainda **não
> foi criada** — ver *Pré-condições*.

---

## Summary

Transformar o modelo conceitual do documento 05 em schema PostgreSQL executável: **27 entidades**,
integridade declarativa, domínios, vigência sem sobreposição, derivados sem segunda fonte de verdade,
RLS em toda tabela e autorização lida de uma matriz de dados. A execução letiva nasce no **grão de
Unidade de Ensino** (decisão UE-1, rota (b)), com a disciplina como agregado derivado.

**Abordagem:** seis migrations temáticas, na ordem dos scripts de `docs/sql-referencia/`, cada uma
aplicável isoladamente e com plano de reversão escrito. Os scripts de referência foram aplicados e
validados contra um PostgreSQL 16 real — são **ponto de partida revisável, não cópia**. Três pontos
divergem deles e o BRIEF vence: o inventário (27, não 26), o grão de `registros_aula` e a CH executada
da disciplina.

**A decisão de projeto que este plano tomou antes de a spec ter o requisito:** RN-MAT-01 — "aula só
para disciplina do mesmo curso da turma" — deixa de depender de gatilho e passa a ser **cadeia de
chaves compostas**, declarativa. Detalhe e alternativas em [research.md](./research.md) §3.

> **Corrigido em 29/08/2026, após `/speckit-analyze`.** A análise apontou como **CRÍTICO** que
> `RN-MAT-01` — regra de *Risco: Alto* — aparecia em seis artefatos e **em nenhum requisito da spec**.
> Uma decisão de projeto sem requisito de origem contraria o Princípio I, e a ausência de asserção
> nomeada contraria o Princípio II. A spec passou a ter **FR-061** (a garantia) e **FR-062** (a
> asserção nomeada obrigatória), e `tasks.md` ganhou **T040**, que insere um lançamento cruzando cursos
> e espera a recusa — em `registros_aula` **e** em `avaliacoes`.

---

## Technical Context

**Language/Version**: SQL (PostgreSQL 17 local, dialeto Supabase) escrito **à mão**; PL/pgSQL para funções
e gatilhos. TypeScript 5.x apenas para os tipos gerados e para o teste negativo de RLS. Python 3.14
no extrator de currículos já entregue.

**Primary Dependencies**: Supabase CLI 2.116 (migrations, `db reset`, `gen types`, `test db`);
extensões `pgcrypto`, `unaccent`, `btree_gist`, `pg_trgm` no schema `extensions`. **Sem ORM** —
proibição permanente do BRIEF §1.

**Storage**: Supabase PostgreSQL. Projeto `cqhpfuaweoyglhtrckcp` designado como
**desenvolvimento/preview** (clarificação da spec 001); o de produção é criado antes da carga real do
Épico 2.

**Testing**: **pgTAP** via `supabase test db` (invariantes de estrutura, unicidade, `CHECK`, vigência,
derivados, imutabilidade) · **Vitest** para o teste negativo de RLS, que precisa de cliente
autenticado por perfil · Playwright **não se aplica** a esta fatia: não há tela. O arnês dos três já
existe e roda vazio.

**Target Platform**: PostgreSQL gerenciado (Supabase), acessado por PostgREST. **Local: PG17** em
Docker (`config.toml`, `major_version = 17`). Os scripts de referência foram validados contra **PG16**
— ver *Pré-condições*.

**Project Type**: Camada de dados de uma aplicação web. Esta fatia entrega **apenas** banco, tipos
gerados e testes — nenhuma rota, nenhum componente.

**Performance Goals**: **Nenhum.** ~2.400 linhas de fato, 572 unidades de ensino, dezenas de usuários
simultâneos no máximo. O documento 05 §10 é explícito: *"priorize clareza de schema e manutenibilidade
sobre desempenho"*. **Índice só se houver consulta lenta observada.** Os índices que entram são os de
integridade (chaves, unicidade) e os de FK — não os de otimização especulativa.

**Constraints**:
- `supabase db reset` reconstrói tudo do zero, sem etapa manual (FR-055).
- Cada migration é aplicável isoladamente e tem reversão escrita (FR-056).
- **Nenhum `drop column` nem `drop table`** em objeto com histórico.
- Nenhuma policy `FOR DELETE`, nenhum `FORCE ROW LEVEL SECURITY` (FR-033, e a proibição do doc 42).
- Nenhum teto normativo vira `CHECK` (FR-049).

**Scale/Scope**: 27 tabelas · ~28 tipos enumerados · ~35 chaves estrangeiras · ~31 regras de unicidade ·
~70 verificações condicionais · **~78 policies** (as 74 do referência + as de `unidades_ensino`) ·
152 linhas de matriz de permissões · ~12 parâmetros normativos.

---

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| # | Princípio | Como esta fatia atende | Veredito |
|---|---|---|---|
| I | Fidelidade à Fase 1 | Todo requisito cita `RF-`/`RN-`/`RNF-`. As três divergências entre BRIEF e `sql-referencia` foram resolvidas pelo BRIEF, com o motivo escrito. Q1.b foi **perguntada**, não assumida | ✅ |
| II | Preservação de Regras de Negócio | Nenhuma regra do documento 04 é alterada. Onde a plataforma tenta "melhorar" — teto virando `CHECK` — a proibição é explícita (FR-049) e tem teste **positivo** (FR-050) | ✅ |
| III | Restrição de Plataforma | PostgreSQL/Supabase, SQL à mão, sem ORM | ✅ |
| IV | Integridade do Histórico | `migracao_log` append-only em três camadas, inclusive contra a credencial de maior privilégio (FR-051, FR-052) | ✅ |
| V | Degradação Segura e Alerta-Não-Bloqueio | Tetos são alerta (FR-049); a negativa silenciosa da RLS é tratada como caso de borda a distinguir | ✅ |
| VI | Mudança Cirúrgica, Validada por Invariantes | Seis migrations pequenas, cada uma com reversão. Validação por invariante — **a CAHO 2026 não é usada como referência** | ✅ |
| VII | Configuração Sobre Constante | Tetos, faixas e feriados em tabela; autorização em matriz (FR-034, FR-048) | ✅ |
| VIII | Rastreabilidade | Asserção nomeada pelo identificador `RN-` (FR-059); `origem_migracao_v1` em toda tabela migrada | ✅ |
| IX | Contenção de Escopo | Nada de nota, média, aprovação, AVA ou corpo discente. Nenhuma tela | ✅ |
| X | Paridade Antes de Novidade | A subunidade de ensino **não** vira tabela (FR-026); o diário de classe por UE **não** é implementado | ✅ |
| XI | O Banco é a Fronteira | RLS em toda tabela; a UI é conveniência | ✅ |

**Gate: PASSA.** Nenhuma violação a justificar — a seção *Complexity Tracking* fica vazia e foi
removida.

**Um ponto de atenção, não violação.** A cadeia de chaves compostas de §3 do research introduz
`curso_id` em `unidades_ensino` e em `registros_aula`. **Não é segunda fonte de verdade**: é
componente de chave composta, e o próprio motor impede que divirja. O documento 04 já endossa a
técnica — *"FK composta `(curso_id, disciplina_id)` para validar instrutor↔disciplina e
disciplina↔curso↔turma em uma única declaração"*.

---

## Pré-condições — conferidas em disco, 28/08/2026

> **Correção.** A primeira redação deste plano listava três bloqueios do Épico 0, herdados de uma
> afirmação errada da spec — *"`supabase/` não existe em disco"*. Ela veio da tabela *Estado atual* do
> `CLAUDE.md`, não do disco. **O arnês está pronto e nada do Épico 0 bloqueia esta fatia.**

| Pré-condição | Documento | Estado | Nota |
|---|---|---|---|
| ESLint das duas fronteiras + teste que prova a regra ativa | doc 10 §6.2 | ✅ | `eslint.config.mjs` + `tests/unidade/lint/fronteiras.test.ts` |
| `supabase init` | doc 10 §6.3 | ✅ | `project_id = "ciaara-11-v2-1"`; `migrations/` vazio com `.gitkeep` |
| Clientes de `lib/supabase/` | doc 10 §6.3 | ✅ | os quatro |
| Suítes vazias (pgTAP, Vitest, Playwright, RLS) | doc 10 §6.5 | ✅ | ver T003 — o stub pgTAP **vai falhar** na primeira migration, de propósito |
| Scripts do `package.json` | doc 24 §7 | ✅ | 28, incluindo `verificar` e `verificar:tudo` |
| `.github/workflows/ci.yml` | doc 10 §6.7 | ⬜ | Portão de **entrega**, não de início |
| **Docker no ar** | — | ⬜ | **Bloqueia de fato**: sem ele não há `db:start` nem `db:reset` |
| Branch `db/002-schema-rls-permissoes` | CLAUDE.md | ⬜ | **Nunca `git push` direto na `main`** |

**Duas descobertas da conferência, ambas com consequência no plano:**

1. **O banco local é PostgreSQL 17**, não 16. Os scripts de referência foram validados contra PG16.
   Nada do que eles usam mudou entre as versões — `EXCLUDE` com `btree_gist`, `GENERATED … STORED`,
   índice parcial e `num_nonnulls` são todos anteriores ao PG16 —, mas *"validado contra PG16 real"*
   deixa de ser transferível ao pé da letra. **T004 existe para confirmar isso antes de escrever DDL.**
2. **O stub pgTAP afirma que `public` tem zero tabelas.** É a invariante correta para o Épico 0 e
   **falha na primeira migration**. Substituí-lo é a primeira tarefa da fase de fundação, não uma
   surpresa a descobrir no meio.

**Uma frente só detém a caneta do schema** (doc 42). Duas migrations concorrentes sobre as mesmas
tabelas produzem conflito de ordem que o `db reset` só revela depois.

---

## Corte das migrations — seis, na ordem de execução

Cada uma é aplicável isoladamente sobre o estado anterior e traz plano de reversão no PR.
Nomeação: `supabase migration new <nome>` (carimbo de tempo automático).

| # | Migration | Cria | Depende de | Reversão |
|---|---|---|---|---|
| **M1** | `fundacao_tipos_e_auditoria` | Schema `app`; 4 extensões em `extensions`; ~28 tipos enumerados; `app.uid_atual`, `app.jsonb_valor`, `app.set_auditoria`, `app.bloquear_reescrita`, `app.normalizar_texto`; **`grant usage on schema extensions to authenticated`** | — | `drop schema app cascade` + `drop type` de cada domínio. Segura: base vazia |
| **M2** | `cadastro_e_unidades_ensino` | 12 tabelas de cadastro, **incluindo `unidades_ensino`**; unicidade; `EXCLUDE` de vigência em `curso_regime_historico` e `responsaveis_curso`; gatilhos de auditoria; colunas derivadas imutáveis | M1 | `drop table` na ordem inversa. Segura enquanto não houver carga |
| **M3** | `fatos_grao_unidade_ensino` | 5 tabelas de fato. **`registros_aula` no grão de UE** — é a divergência central em relação ao referência | M2 | idem |
| **M4** | `configuracao_calendario_e_matriz` | 8 tabelas: listas, parâmetros, matriz de permissões, feriados, janelas, reservas, log de migração, quarentena. **Semente normativa inline**: tetos, faixas, limite diário, listas administráveis. FKs postergadas para `config_listas` | M3 | idem + `delete` da semente |
| **M5** | `derivados_e_funcoes_de_dominio` | Funções de domínio em `app`; **as views de agregação, com `vw_disciplinas_execucao` reescrita para o grão de UE**; nova `vw_unidades_ensino_execucao`; gatilhos de imutabilidade | M4 | `drop view` / `drop function`. Totalmente reversível: não há dado |
| **M6** | `acesso_rls_e_permissoes` | `usuarios`, `usuario_curso`; funções de alcance; `GRANT`/`REVOKE`; **~78 policies**; gatilho anti-escalonamento; **semente das 152 linhas da matriz** | M5 | `drop policy` em massa + `drop table` das duas. A mais delicada |

**Por que a semente normativa vive na migration, e não em `seed.sql`.** É o que o próprio referência
faz (parâmetros e listas no arquivo 03, matriz no 05), e é o comportamento correto: `seed.sql` só roda
em `db reset` **local** — não chega à produção por `db push`. Tetos normativos e matriz de permissões
**precisam** existir em produção. `seed.sql` fica com dado sintético de desenvolvimento e de teste.
O documento 06 diz *"populada por `seed.sql`"*; é linguagem frouxa para "semeada", e não uma
contradição — registrado em [research.md](./research.md) §6.

---

## O que fica FORA desta fatia — e é preciso dizer

**A carga do catálogo de Unidades de Ensino é do Épico 2, não daqui.** É a descoberta mais importante
deste planejamento e ela ajusta o alcance de três requisitos.

`unidades_ensino.disciplina_id` é obrigatório e referencia `disciplinas(id)`. As 175 disciplinas só
existem **depois do ETL do Épico 2**. Logo as 572 unidades extraídas dos currículos **não têm onde
aterrissar** durante o Épico 1.

| Requisito | O que o Épico 1 entrega | O que fica para o Épico 2 |
|---|---|---|
| **FR-022** (catálogo povoado) | A estrutura, as constraints e o arquivo versionado `scripts/etl/dados/unidades_ensino.csv` | O `INSERT … SELECT` que resolve `disciplina_id`, logo após a carga de `disciplinas` |
| **FR-023** (norma de origem) | A coluna e a obrigatoriedade | O preenchimento |
| **FR-024** (soma das UE fecha) | A **asserção pgTAP escrita**, que passa vacuamente em base vazia e passa de verdade após a carga | Nada — o teste já estará lá quando o dado chegar |

**Isto não é escopo reduzido por conveniência**: carga de dado é, por definição, Épico 2 (*"Fora de
escopo: carga de dados históricos"*). O que muda é que o Épico 2 ganha uma tarefa que ninguém tinha
previsto, e ela precisa ser sequenciada **imediatamente após `disciplinas`**.

Também fora: telas (Épico 3+), `liq_emitida` e `papel_liq` (LIQ-3/LIQ-4, Épico 11), subunidade de
ensino (FR-026), motor preditivo e distribuição semanal — que são `lib/dominio/`, não SQL, por
fronteira deliberada do arquivo 04 do referência.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-schema-rls-permissoes/
├── spec.md                  # a especificação (clarificada)
├── plan.md                  # este arquivo
├── research.md              # Fase 0 — as sete decisões de projeto
├── data-model.md            # Fase 1 — entidades, chaves, regras, derivados
├── quickstart.md            # Fase 1 — como validar do zero
├── contracts/
│   ├── superficie-de-dados.md   # o que a aplicação pode consumir e sob que garantia
│   └── matriz-de-permissao.md   # recurso × ação × perfil — o contrato de autorização
└── checklists/requirements.md
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   ├── <ts>_fundacao_tipos_e_auditoria.sql        # M1
│   ├── <ts>_cadastro_e_unidades_ensino.sql        # M2
│   ├── <ts>_fatos_grao_unidade_ensino.sql         # M3
│   ├── <ts>_configuracao_calendario_e_matriz.sql  # M4
│   ├── <ts>_derivados_e_funcoes_de_dominio.sql    # M5
│   └── <ts>_acesso_rls_e_permissoes.sql           # M6
├── seed.sql                  # SÓ dado sintético de desenvolvimento (nunca normativo)
├── tests/                    # pgTAP — é aqui que `supabase test db` procura (research §7)
│   ├── 010_estrutura.sql          # inventário: 27 tabelas, RLS ligada, zero policy de DELETE
│   ├── 020_unicidade.sql          # FR-008 a FR-013 — tenta violar, espera a recusa
│   ├── 030_condicionais.sql       # FR-014 a FR-016
│   ├── 040_vigencia.sql           # FR-017, FR-018
│   ├── 050_grao_unidade_ensino.sql# FR-020, FR-021, FR-024, FR-025
│   ├── 060_derivados.sql          # FR-027 a FR-029
│   ├── 070_normativo.sql          # FR-048 a FR-050 — inclui o teste POSITIVO do 9º TA
│   └── 080_imutabilidade.sql      # FR-051 a FR-054
│
├── lib/tipos/database.ts     # GERADO por `supabase gen types`. Nunca editado à mão
│
├── tests/invariantes/
│   └── rls.test.ts           # T-01 a T-12 — teste NEGATIVO por perfil, com sessão de verdade
│
└── scripts/etl/
    ├── extrair_unidades_ensino.py    # ✅ já entregue
    └── dados/unidades_ensino.{csv,json}  # ✅ já entregue — insumo do Épico 2
```

**Structure Decision**: camada de dados apenas. Nada em `app/`, `components/` ou `lib/dominio/` é
tocado. `lib/tipos/database.ts` é a única saída fora de `supabase/` e `tests/`, e é **gerada**.

**Os testes vivem em dois lugares, e é deliberado.** pgTAP vai para `supabase/tests/`, porque é onde
o `supabase test db` procura; o teste negativo de RLS vai para `tests/invariantes/rls.test.ts`,
porque precisa de **cliente autenticado por perfil** — algo que só existe do lado da aplicação. A
árvore do documento 24 prevê `tests/invariantes/` para os dois; a divergência e sua resolução estão em
[research.md](./research.md) §7.

---

## Sequenciamento e Definition of Done por migration

Cada migration só é considerada pronta quando, **nesta ordem**:

1. Aplica sobre o estado anterior sem erro.
2. `pnpm db:reset` reconstrói do zero, incluindo-a, sem etapa manual.
3. `pnpm db:tipos` regenerado e commitado — o CI falha se divergir.
4. Os testes pgTAP daquela camada passam.
5. A partir de **M6**: o teste negativo de RLS passa, com sessão autenticada de verdade.
6. Plano de reversão escrito no PR, no template inteiro.
7. Commit no padrão `db(<identificador>): <resumo no imperativo>`.

**A ordem 4 → 5 não é arbitrária.** O teste negativo de RLS depende de `usuarios` e da matriz, que só
existem em M6; até lá, o que se prova é estrutura e regra de dado.

---

## Riscos deste plano

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Escrever `registros_aula` no grão de disciplina por hábito | **Alta** — é o risco nomeado no doc 06 | Asserção pgTAP **nomeada** que falha se `disciplina_id` reaparecer como coluna gravável em `registros_aula` (`050_grao_unidade_ensino.sql`) |
| Acrescentar policy `FOR DELETE` "consertando um esquecimento" | Alta | Asserção que conta policies de `DELETE` e **exige zero** (`010_estrutura.sql`) |
| Transformar teto normativo em `CHECK` | Média | Teste **positivo** provando que o 9º TA é aceito (`070_normativo.sql`) |
| Esquecer `WITH CHECK` no `UPDATE` de alguma policy | Média — é o defeito T-03 | Teste negativo de fuga de escopo, por tabela com recorte de curso |
| Esquecer o `GRANT` de `extensions` | Média — passa em migration, seed e ETL | O teste de RLS roda com **sessão autenticada de verdade**, não com privilégio de dono |
| M6 grande demais para revisar | Média | ~78 policies num arquivo. Aceito: quebrá-lo por tabela produziria 25 migrations e perderia a visão do conjunto. Mitigado pelo teste negativo por perfil |
| Q1.b chegar depois de M3 | Baixa | `unidade_ensino_id` nasce obrigatório; relaxar depois é uma linha, e a tabela está vazia. Ver [research.md](./research.md) §2 |

---

## Rastreabilidade

**Requisitos cobertos:** FR-001 a FR-060, exceto o **preenchimento** de FR-022 e FR-023, cujo alcance
nesta fatia está delimitado acima.

**Documentos-fonte:** BRIEF §2, §2.1, §2.2, §3, §11 · doc 05 §3, §5.2, §6, §7.2–§7.8, §9.1, §9.2,
§10 · doc 21 (DDL comentado) · doc 22 §5, §6, §7.3, §8, §10 · doc 24 §1, §7 · doc 06 (Épico 1) ·
doc 42 (Épico 1) · `docs/sql-referencia/00` a `05`.

**Decisões de Bernardo aplicadas:** UE-1 rota (b) (26/08) · origem do dado de UE, TURMA-1 e as
concessões `(a)`/`(b)` da matriz (28/08).
