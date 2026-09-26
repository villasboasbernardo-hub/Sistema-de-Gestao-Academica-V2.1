# Implementation Plan: Disciplinas e Unidades de Ensino — Épico 5, fatia (b)

**Branch**: `feat/EPICO-5b-disciplinas-e-unidades-de-ensino` | **Date**: 25/09/2026 (plan iniciado em
24/09/2026 à noite; a conferência dos currículos atravessou a meia-noite) | **Spec**: [spec.md](./spec.md)

**Input**: `specs/010-disciplinas-e-unidades-de-ensino/spec.md` com as 22 decisões de Bernardo Villas
Boas de 24/09/2026 (Q-01..Q-17, N-1..N-5), a emenda aprovada da regra 4 e a divisão em 3 PRs aprovada.

**Artefatos desta fase**: [research.md](./research.md) (Fase 0: a conferência dos currículos por
agentes e as decisões de desenho) · [conferencia-dos-curriculos.md](./conferencia-dos-curriculos.md)
(o resultado, curso a curso) · [data-model.md](./data-model.md) · [contracts/](./contracts/) ·
[quickstart.md](./quickstart.md). **`tasks.md` não foi gerado** (decisão de Bernardo: não rodar o tasks).

## Resumo

Entregar o módulo **Disciplinas** da v2.1 em **três PRs**, na ordem aprovada:

1. **PR 1 — banco**: as RPCs de exclusão permanente com porteiro e **rastro** (D-B1, regra 4 emendada),
   a tabela só-de-acréscimo `exclusoes_registradas`, a aposentadoria das três colunas da Q-01 **com a
   prova pgTAP antes**, o gatilho da soma do rateio, o gatilho da janela da turma, o gatilho que faz a
   disciplina nova nascer nas turmas `planejada`/`ativa`, o parâmetro dos 30 dias, as sequências
   `DIS-`/`UE-` (na lista única de `avancar_sequencias`, com teste), a marcação das 3 disciplinas
   `simultaneo`, e as duas colunas de "sem UE". **Vai ao remoto antes do merge, com backup antes.**
2. **PR 2 — carga das UEs**: a partir da **conferência** (Fase 0), o extrator ganha a captura do
   `fundamento_normativo`; um gerador versionado transforma a extração + a tabela de pareamento numa
   **migration de dados idempotente** (`INSERT … SELECT` por `disciplinas.codigo`, que é o mesmo nos dois
   bancos), com a asserção de contagem; a conferência currículo × banco vira script reexecutável.
   **Vai ao remoto antes do merge, com backup antes.**
3. **PR 3 — telas**: `/disciplinas` (cascata curso → turma → disciplina, tabela expansível, estado na
   URL), CRUD com desativar/reativar/excluir, período e instrutores **por turma**, rateio, indicadores,
   filtros, gráfico, painel de UEs, menu ligado — tudo alcançável por clique e provado por clique.

**Abordagem técnica**: de dentro para fora (`lib/dominio/` → `lib/validacao/` → `lib/acoes/` → `app/` →
`components/`), **quem nega é o banco** (Princípio XI), tradução de recusa por chave medida, prova de
permissão com sessão real e **um caso que discrimina** por regra que muda quem/onde grava.

## Contexto técnico

**Language/Version**: TypeScript `strict` (Next.js 16.3.3, React 19.2.8), SQL (PostgreSQL 17 no
Supabase), Python 3 (`scripts/etl/`, PyMuPDF para os currículos)
**Primary Dependencies**: `@supabase/ssr` 0.12.5, `@supabase/supabase-js` 2.112.4, `nuqs`, Zod,
shadcn/Radix (`components/ui/`), Recharts — **nenhuma biblioteca nova** (decisão de Bernardo)
**Storage**: Supabase PostgreSQL — `disciplinas`, `turma_disciplina`, `turma_disciplina_instrutor`,
`unidades_ensino`, `instrutor_disciplina` (só leitura), `config_parametros`, `cursos` (2 colunas),
**tabela nova** `exclusoes_registradas`
**Testing**: Vitest (unidade e varreduras) · pgTAP (`supabase/tests/1xx_*.sql`) · RLS com sessão real
(`tests/invariantes/rls/`) · Playwright na porta 3100 (`tests/e2e/disciplinas.spec.ts`)
**Target Platform**: Vercel (preview por ramo; Production no **mesmo** projeto Supabase — AMBIENTE-1)
**Project Type**: aplicação web (App Router, Server Components por padrão)
**Performance Goals**: nenhum além dos existentes — base pequena (175 disciplinas, 210 linhas por
turma, **587** UEs = 582 do extrator + 5 do APOC, P-4); **uma** consulta com join por tela, `Promise.all` para as independentes
**Constraints**: nada é apagado salvo pelas RPCs com porteiro; nada escrito no remoto por script;
nenhuma regra só na UI; `lib/dominio/` sem `supabase`/`next`/`react`; estado de tela na URL;
`"use client"` só em folha; identificadores gerados, nunca fixos, amostras idempotentes (regra 9.1)
**Scale/Scope**: 1 página nova, ~5 diálogos, 3 arquivos de ação, 3 de validação, ~7 funções puras
novas, 1 tabela nova, 8 funções de banco + 1 RPC de atribuição + 5 gatilhos, 2 sequências, 1 migration de dados (587 linhas)

## Verificação constitucional

*Portão: antes da Fase 0, e reavaliado depois da Fase 1.*

| Princípio | Como esta fatia o respeita | Veredito |
|---|---|---|
| **I. Fidelidade à Fase 1** | Cada FR cita `RF-MATERIAS-01..06`, `RF-INSTR-13`, `RF-CRUD-01/04`, `RF-DADOS-06`; nenhum requisito inventado — o que não está na Fase 1 (excluir com rastro) está numa **decisão nominal** (D-B1) | passa |
| **II. Preservação de regras** | `RN-MAT-01/04/05`, `RN-ANT-01/02`, `RN-CRUD-02/03`, `RN-DEG-01/02` portadas sem reinterpretação; **`RN-MAT-02` aposentada por decisão nominal com medição** (Q-16), emenda no `.md` do documento 04; a regra do resto do rateio (Q-03) muda de propósito e está registrada como mudança | passa, com as duas emendas registradas |
| **III. Plataforma** | nada fora da lista; sem ORM; sem biblioteca nova | passa |
| **IV. Integridade do histórico** | exclusão só sem histórico nenhum, por RPC com porteiro e **rastro append-only**; `migracao_log` recebe eventos, nunca reescrita; colunas aposentadas viram comentário, sem `drop` | passa |
| **V. Degradação segura / alerta** | soma das UEs, CH mudada, parcelas vazias, sem turma → **aviso**; recusas só onde é regra de dado (unicidade, janela, soma do rateio, RESTRICT) | passa |
| **VI. Mudança cirúrgica por invariantes** | 12 invariantes pgTAP nomeadas; conferência currículo × banco reexecutável; nenhum diff com saída histórica | passa |
| **VII. Configuração sobre constante** | 30 dias em `config_parametros`; nenhum número de negócio em código | passa |
| **VIII. Rastreabilidade** | cada objeto de banco cita o FR e a decisão; a carga grava `fundamento_normativo` e `origem_migracao_v1`; a conferência cita página | passa |
| **IX. Contenção de escopo** | fora: DSA, cronograma, LIQ, avaliações, preferências, D-B1 nos outros cadastros — todos nomeados como pendência ou épico | passa |
| **X. Paridade antes de novidade** | tudo é paridade com as specs 029–038 da v2.0, exceto o que decisão nominal mandou (excluir com rastro, resto ao mais antigo) | passa |
| **XI. O banco é a fronteira** | unicidade, janela, soma, impedimentos, permissão — tudo no banco; a tela só traduz | passa |

**Reavaliação após a Fase 1**: o desenho não acrescentou tabela além de `exclusoes_registradas`, não
acrescentou rota além de `/disciplinas` e não trouxe dependência nova. Os dois desvios de convenção
estão declarados no [data-model.md](./data-model.md) (tabela de rastro sem `origem_migracao_v1` e sem
`editado_*`, porque a linha nunca muda). **Sem violação a justificar.**

## Estrutura do projeto

### Documentação desta fatia

```text
specs/010-disciplinas-e-unidades-de-ensino/
├── spec.md                        # requisitos + Clarifications (22 decisões)
├── analise-dos-curriculos.md      # análise do specify (24/09, extrator × banco)
├── conferencia-dos-curriculos.md  # Fase 0 do plan: leitura independente por agentes + 2ª verificação
├── research.md                    # Fase 0: decisões de desenho, cada uma medida
├── data-model.md                  # Fase 1
├── contracts/
│   ├── rotas-e-parametros.md
│   └── escritas-recusas-e-avisos.md
├── quickstart.md
├── plano-de-aplicacao-no-remoto.md   # a escrever no PR 1, no molde da spec 009 (backup, ordem, conferência)
└── checklists/requirements.md
```

### Código (raiz do repositório)

```text
supabase/migrations/
├── <ts>_sequencias_dis_e_ue.sql                 # PR 1 — M1
├── <ts>_exclusao_com_rastro.sql                 # PR 1 — M2: tabela + 8 funções + gatilhos de imutabilidade
├── <ts>_aposentar_colunas_de_atribuicao.sql     # PR 1 — M3: prova pgTAP ANTES (I-3) + 3 comentários + 3 linhas simultaneo
├── <ts>_periodo_por_turma_e_nascimento.sql      # PR 1 — M4: gatilho da janela + disciplina nova nasce nas turmas
├── <ts>_rateio_por_instrutor.sql                # PR 1 — M5: RPC de atribuição + constraint trigger da soma
├── <ts>_curriculo_modelo_e_parametro.sql        # PR 1 — M6: cursos.curriculo_modelo, disciplinas.sem_unidades_ensino, parâmetro
└── <ts>_carga_unidades_ensino.sql               # PR 2 — gerada pelo script, revisada, idempotente
supabase/tests/
├── 106_sequencias_dis_ue.sql · 107_exclusao_com_rastro.sql · 108_atribuicao_aposentada.sql
├── 109_periodo_e_rpc_disciplina.sql · 110_rateio_por_instrutor.sql · 111_curriculo_modelo_parametro.sql
└── 112_carga_unidades_ensino.sql                # PR 2
scripts/etl/
├── extrair_unidades_ensino.py                   # (corrigido: "DEENSINO"; PR 2: captura do fundamento)
├── carregar.py                                  # SEQUENCIAS_DE_CODIGO ganha DIS- e UE-
├── gerar_carga_de_unidades_ensino.py            # PR 2 — extração + pareamento → migration SQL
├── conferir_unidades_ensino.py                  # PR 2 — currículo × banco, reexecutável (FR-067)
└── dados/pareamento_ue.csv                      # PR 2 — sigla→curso, disciplina→codigo, UE→metade (N-3)
lib/dominio/
├── rateio-de-carga.ts · sinalizacao-de-disciplina.ts · indicadores-da-grade.ts
├── soma-das-unidades.ts · exclusao-de-disciplina.ts · modelo-do-curriculo.ts
└── confirmacao-de-gravacao.ts                   # +7 tipos
lib/validacao/  disciplina.ts · atribuicao.ts · unidade-ensino.ts
lib/acoes/      disciplina.ts · atribuicao.ts · unidade-ensino.ts · traducao-de-recusas.ts (+chaves)
lib/navegacao/  contrato.ts (+/disciplinas) · menu.ts (Disciplinas disponivel: true)
app/(app)/disciplinas/
├── page.tsx · loading.tsx · error.tsx · consulta.ts
├── CascataNaUrl.tsx                             # folha de cliente: curso + turma (SeletorTurma único)
├── TabelaDeDisciplinas.tsx                      # TabelaDensa + linha expansível
├── FiltrosDeDisciplinas.tsx · IndicadoresDaGrade.tsx · GraficoDeProporcao.tsx
└── paineis/ FormularioDeDisciplina.tsx · PainelDePeriodo.tsx · PainelDeInstrutores.tsx
             PainelDeUnidades.tsx · DialogoDeExclusao.tsx
components/ciaara/tabela-densa.tsx               # ganha `detalhe(linha)` opcional — sem 2º componente de tabela
tests/unidade/   rateio-de-carga.test.ts · … · sequencias-apos-restaurar.test.ts (6) · toda-tela-tem-caminho (verde)
tests/invariantes/rls/disciplinas.test.ts
tests/e2e/       disciplinas.spec.ts · disciplinas-de-teste.ts
```

**Structure Decision**: uma rota só, com painéis; a tabela expansível **estende** `TabelaDensa` em vez de
criar componente concorrente (mesma regra que o botão *Limpar filtros*); a cascata reaproveita o
`SeletorTurma` único e a função única de endereço de turma.

## Fase 0 — a conferência dos currículos por agentes

Feita em 24–25/09/2026, antes de desenhar a carga. Método, números e vereditos estão em
[conferencia-dos-curriculos.md](./conferencia-dos-curriculos.md); as decisões que ela produziu, em
[research.md](./research.md) (R-1 a R-4). Em uma linha: **24 currículos lidos de forma independente
(um agente por PDF, sem consultar o extrator), leitura × extrator corrigido sem divergência nas
disciplinas com UE, e as divergências leitura × banco reabertas página a página por um segundo
agente** — o que os dois confirmaram entrou como *confirmada*, o resto como *incerta*.

## As decisões de desenho — cada uma em research.md

| # | Decisão | Onde |
|---|---|---|
| R-1 | Carga das UEs como **migration de dados gerada**, resolvendo `disciplina_id` por `disciplinas.codigo` | research §R-1 |
| R-2 | Pareamento **por UE** nas duas desdobradas, tabela versionada revisada (N-3, confirmada pela conferência) | §R-2 |
| R-3 | `EST-QF-APOC`: UEs transcritas de imagem, confirmadas pela 2ª verificação → **candidatas à carga**, marcadas | §R-3 |
| R-4 | O que a conferência achou de novo (competências, ambientação, MetocOf) e o que **não** é desta carga | §R-4 |
| R-5 | Exclusão: RPC + tabela de rastro, no molde de `20260915140100` | §R-5 |
| R-6 | Rateio: RPC que regrava a lista + constraint trigger deferred | §R-6 |
| R-7 | Janela da turma: gatilho só para `origem_periodo = 'manual'` (4 linhas migradas fora da janela ficam) | §R-7 |
| R-8 | Disciplina nova nasce nas turmas `planejada`/`ativa` (gatilho espelho do da turma) | §R-8 |
| R-9 | Tabela expansível: estender `TabelaDensa`, não criar segunda | §R-9 |
| R-10 | Sequências `DIS-` e `UE-`: lista única, prova P3 passa a 6 | §R-10 |
| R-11 | `curriculo_modelo` como `text + CHECK`, não ENUM | §R-11 |

## Entrega em três PRs — aprovada em 24/09/2026

### PR 1 — banco (7 migrations, 16 linhas de tarefa: T001–T015 mais a T008.1)

Ordem das migrations (M1..M6 acima); **M3 abre com a asserção I-3** (79/79 na junção) **antes** de
aposentar. pgTAP `101`–`106`; RLS `disciplinas.test.ts` (operador é o caso que discrimina); Vitest de
`sequencias-apos-restaurar` (6) e da tradução (chaves lidas do SQL); `pnpm db:tipos`; tipos mostram
`codigo` opcional em `Insert` (gotcha 5.2). **Plano de aplicação no remoto** no molde da spec 009 §0.3:
`dado_do_remoto --somente-copia` → arquivo datado citado no PR → CI verde → `db push --linked` com
autorização nominal → conferência só de leitura (contagem de migrations, `md5` do catálogo, Production
respondendo). Reversão por migration no [data-model.md §4](./data-model.md).

### PR 2 — carga das UEs (12 tarefas)

Extrator: captura do `fundamento_normativo` (Ofício ou capa) — teste com os 24 (15 Ofício, 8 capa,
1 ilegível). `pareamento_ue.csv` com as 8 siglas mapeadas, os pares de disciplina por nome/código e as
linhas por UE das duas desdobradas. `gerar_carga_de_unidades_ensino.py` → SQL idempotente
(`on conflict do nothing`), com `assert` de contagem e `migracao_log` recebendo um evento por
currículo. `conferir_unidades_ensino.py` (FR-067). APOC: as 5 UEs entram **só se** o R-3 disser
confirmado, com `origem_migracao_v1 = '<arquivo> (transcrito de imagem)'`. Aplicação no remoto com
backup, como o PR 1. Não toca em nome de disciplina (Q-13) nem em CH do banco (Q-06: aviso).

### PR 3 — telas (17 tarefas)

De dentro para fora: 7 funções puras com Vitest → 3 Zod → 3 ações + tradução → `contrato.ts` +
`menu.ts` → página, consulta (`vw_disciplinas_execucao` + `turma_disciplina_instrutor` +
`instrutor_disciplina` + `unidades_ensino`, uma consulta com join por bloco, `Promise.all`) → folhas de
cliente → painéis → e2e por clique com os casos que discriminam → `verificar:tudo` → PR. Sem migration
(tudo de banco veio nos PRs 1 e 2) — logo **sem ida ao remoto**.

## Tamanho, medido contra a fatia (a)

A spec 009 fechou com 215 tarefas em dois PRs, no tamanho de micro-passo. Esta fatia saiu com **44 em
três PRs** (15 · 12 · 17), no tamanho de **entrega verificável** — cada tarefa traz o teste que a prova
*(decisão de Bernardo Villas Boas, 25/09/2026)*. A massa é menor porque o banco desta fatia é cirúrgico
(nenhuma tabela de negócio nova, só a de rastro) e a cascata reaproveita o seletor de turma, o endereço
de turma, a confirmação e os filtros da fatia (a). Ver [tasks.md](./tasks.md).

## Pendências nomeadas

`PEND-5b-1` (D-B1 nos outros cadastros; rastro da RPC de instrutor) · `PEND-5b-2` (grafia das
disciplinas × currículo, Q-13) · `PEND-5b-3` (APOC — fechada se R-3 confirmar; senão transcrição) ·
`PEND-5b-5` (UEs da disciplina emprestada `C-Exp-Metoc-OF-SP IV`) · **`PEND-5b-6`** (a prova de
COMPORTAMENTO do `security_invoker` da view de CH prevista: a invariante I-13 confere a **opção** no
catálogo, que é o que pega o defeito da M5, mas não há caso lendo a view com sessão de alcance
restrito e exigindo que ela **não** enxergue outro curso. Ela precisa de um usuário com alcance por
curso, que só existe no PR 3 — **vai para a T033**) · **novas da conferência** em
[research §R-4](./research.md) — códigos e CH dos cursos por competências, ambientação, MetocOf.

## Dúvidas do lote — ✅ TODAS RESPONDIDAS em 25/09/2026

*(Registro do que foi perguntado e da decisão. O texto integral de cada resposta está em
[spec.md › Clarifications › Session 2026-09-25](./spec.md).)*

| # | Dúvida | Decisão de Bernardo Villas Boas, 25/09/2026 |
|---|---|---|
| **P-1** | CH de disciplina no banco divergente do currículo, confirmada com página em 9 casos | **(a) nenhuma CH é corrigida por script.** Ficam com o aviso da Q-06; a correção é **pela tela do PR 3**, com rastro |
| **P-2** | Qual currículo vale para o `C-Exp-MetocOf`? | **São DOIS CURSOS DIFERENTES**: `C-Exp-MetocOf` **presencial** (currículo de 2011, 27 UEs) e `C-Exp-Metoc-OF-SP` **semipresencial** (SP de 2025, 24 UEs), com CH diferente por ser semipresencial. **Pareamento sempre curso ↔ o próprio currículo, nunca cruzado.** As CH do presencial que coincidem com as do SP são divergências da P-1, com a observação *"provavelmente copiadas do SP"* |
| **P-3** | Quem lê `exclusoes_registradas`? | **(a) quem tem `auditoria.ler`** |
| **P-4** | As 5 UEs do `EST-QF-APOC` transcritas de imagem | **(a) entram nesta carga**, marcadas *"transcrito de imagem"*, com a asserção de soma **excluindo o APOC nominalmente** |
| **N-3** | Tabela de destino por UE das desdobradas | **Confirmada pela conferência (§4.2, com página) — aceita** |

⚠️ **Correção feita em 25/09/2026, por ordem de Bernardo**: a conferência (§4.3, §4.6) e este plano
tratavam `C-Exp-MetocOf` e `C-Exp-Metoc-OF-SP` como se fossem o mesmo curso com dois currículos
possíveis. **Não são**: são dois cursos, cada um com o seu. Os dois documentos foram emendados.

## Complexity Tracking

Sem violações a justificar.
