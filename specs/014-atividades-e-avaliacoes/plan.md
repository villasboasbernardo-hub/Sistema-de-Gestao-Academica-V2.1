# Implementation Plan: Atividades e avaliações — Épicos 9 e 8 (spec 014)

**Branch**: `docs/EPICO-8-9-estado-atual` (o ramo do levantamento e da spec; cada PR nasce em ramo
próprio a partir da `main`) | **Date**: 13/10/2026 | **Spec**: [spec.md](spec.md)

**Input**: `specs/014-atividades-e-avaliacoes/spec.md`, com o clarify **encerrado** em 13/10/2026
(Q-1 a Q-17, D-CUR-1, D-CUR-2, D-AV-1/2, D-TETO-1/2, §11-A aprovado em bloco, E-7 aprovada). As duas
escolhas da OD (pendente antes do 1º lançamento; "concluída" pelo critério do painel da disciplina)
estão aceitas.

> **Leia junto:** [research.md](research.md) (as decisões técnicas R-1 a R-15),
> [data-model.md](data-model.md) (o banco, tabela a tabela), `contracts/` (quatro contratos) e
> [quickstart.md](quickstart.md) (como validar cada PR).

## Summary

O DSA já lança aula, avaliação, vista e atividade. Esta spec entrega, em **duas levas**, o que
ninguém vê e o que o operador não consegue fazer sem sair do DSA:

- **Leva 1 (Épico 9):** cards de **AEC, TAD e TR** por turma com **cumprido · previsto no PROENS ·
  limite máximo** (do currículo, ou da norma quando o currículo não declara), a **5ª categoria Apoio
  Individualizado** fora da CHT, a categoria **derivada do tipo**, a **atividade global** somando em
  cada turma com DSA, o **dia parado** (feriado e licença previstos, fora da CHT; a não prevista pode
  consumir TR) lançado pelo DSA, e a sincronização gravando tudo isso.
- **Leva 2 (Épico 8):** as **avaliações do currículo** transcritas dos 24 PDFs, com **tempo e
  origem** (currículo ou arbitrado), o **painel com projeção** de estouro, o DSA oferecendo UEs e
  itens de avaliação, **N sessões de vista**, os **três papéis**, o **2º instrutor**, o estado
  **"substituída pela planilha"**, a **situação calculada na leitura**, os **cards e abas de
  avaliações** da turma e do curso, e as **correções do banco contra o currículo** (§11-A e a
  unificação HN-2101 / MATFIS).

A abordagem é a de sempre: regra em `lib/dominio/` (TS puro, testado), integridade e permissão no
banco (constraint, gatilho, policy, pgTAP), leitura em Server Component, escrita em Server Action com
Zod, estado de tela na URL. **O banco é corrigido para ficar idêntico ao currículo; a planilha
nunca mais altera CH.**

## Technical Context

**Language/Version**: TypeScript `strict` (Next.js 16.3.3, React 19.2.8), PL/pgSQL (PostgreSQL do
Supabase), Python 3.14 (`scripts/etl/`, `scripts/carga_dsa/`)
**Primary Dependencies**: `@supabase/ssr` 0.12.5 · `@supabase/supabase-js` 2.112.4 · Zod · `nuqs` ·
shadcn/Radix · Tailwind v4 · PyMuPDF (extração dos PDFs, já usado pelas UEs) · openpyxl (planilhas)
**Storage**: Supabase PostgreSQL; **12 migrations novas** (5 de estrutura, 7 de dado; ⚠️ o texto de 13/10/2026 dizia "11, sendo 6 de estrutura e 5 de dado", contagem errada, corrigida no mesmo dia),
detalhadas na §3
**Testing**: Vitest (domínio) · pgTAP (`supabase/tests/123_*` a `130_*`) · `tests/invariantes/rls/`
(sessão real, `42501`) · Playwright por clique (`tests/e2e/`) · `provar_carga_dsa.py`
**Target Platform**: Vercel (preview por branch) + projeto Supabase `cqhpfuaweoyglhtrckcp` (dev,
preview e Production no mesmo projeto — AMBIENTE-1)
**Project Type**: aplicação web (App Router) + scripts Python versionados
**Performance Goals**: uma leitura por tela (`Promise.all` para o que é independente); a página da
turma ganha **duas** consultas novas (tetos e avaliações) e nenhum `await` em laço
**Constraints**: nada é apagado (regra 4); tetos são alerta (regra 6); parâmetro é dado (regra 8);
`lib/dominio/` sem I/O (regra 9); migration no remoto só com backup, dry-run e autorização; migration
de **dado** só depois de Bernardo ver o antes/depois; sem nota/média (`RNF-NORM-06`)
**Scale/Scope**: 24 cursos · 28 turmas · ~175 disciplinas · 587 UEs · ≈ 200–260 itens de avaliação ·
188 avaliações vivas · 7 telas tocadas (data-model §6)

## Constitution Check

*GATE antes da Fase 0, reavaliado na §9 depois do desenho.*

| Princípio | Como este plan o cumpre | Veredito |
|---|---|---|
| **I. Fidelidade à Fase 1** | Toda tarefa citará `RF-AVAL-*`, `RF-EXTRA-*`, `RF-INI-04`, `RF-CURSO-02/06`, `RN-EVT-01..04`, `RN-AVAL-01/02`, `RN-2027-03`, `RN-DEG-01/02`. O que diverge dos documentos está na spec §9, §12 e §13 como **emenda proposta**, aplicada só no `.md` e com a autorização nominal citada (FR-061) | ✅ |
| **II. Preservação de regras** | As regras `RN-` de Risco Alto tocadas (`RN-EVT-01`, `RN-EVT-03`, `RN-AVAL-02`, `RN-2027-03`, `RN-MAT-01`; a `RN-INST-01` **não é tocada** — decisão D-AV-3 de 13/10/2026: o aplicador sem habilitação recebe aviso, sem recusa) ganham função pura + asserção pgTAP nomeada. As emendas (`RN-EVT-01` 5ª categoria e tetos; `RN-EVT-04` parada de tempos; `RN-AVAL-01` vínculo explícito; `RN-2027-03` por turma) são **autorizadas nominalmente** por D-AA-2/12/13, Q-2 e Q-16 (E-7 aprovada) | ✅ |
| **III. Plataforma** | Sem ORM, sem biblioteca nova de componentes, Server Components por padrão, `"use client"` só nas folhas (`AbasDaTurma`, formulários), RLS em toda tabela nova. Sem envio de e-mail, sem `service_role` fora da tríade | ✅ |
| **IV. Histórico** | Nenhum `drop table`; as colunas de vista única ficam aposentadas; substituída é **estado**, não exclusão; a trilha do previsto é só de acréscimo. ⚠️ **Uma coluna GERADA é recriada** (`compoe_cht`, R-2) — exceção justificada em *Complexity Tracking* e **aceita por Bernardo em 13/10/2026** (dúvida D-1, §10), com a condição de recriar as dependentes na mesma migration e provar o mesmo resultado antes e depois | ⚠️ justificado e aceito |
| **V. Degradação e alerta** | Tetos, previsto acima do máximo, projeção negativa, arbitrado acima da CH: **alerta**, nunca `CHECK` nem recusa. Turma sem previsto: *"previsto não definido"*; sem CH: *"não calculável"*; `error.tsx`/`loading.tsx` por segmento novo | ✅ |
| **VI. Cirúrgico, por invariante** | Cada PR pequeno; migration de dado com antes/depois **contado** (aulas, avaliações, atividades, CH executada por turma; itens por disciplina; 188 → 188) e reversão provada em base descartável. ⚠️ **Mais de uma migration por PR de banco** — exceção registrada em *Complexity Tracking*, como a fatia (c) do Épico 5 | ⚠️ justificado |
| **VII. Configuração sobre constante** | Percentuais, referência de EI, reserva genérica, prazo de vista e "vence em breve" em `config_parametros`; tipos de atividade, de parada e instrumentos em `config_listas`; permissão nova como linha de `perfil_permissao` | ✅ |
| **VIII. Rastreabilidade** | Códigos `DPA-`, `AVC-`, `VST-`; `origem_migracao_v1` em toda tabela nova; item do currículo com arquivo e página; toda tarefa com `RF-`/`RN-` | ✅ |
| **IX. Escopo** | Sem nota, média, aprovação; sem cadastro de alunos (quantidade opcional, A-4); `/admin/calendario` segue no Épico 7; Ambientação dos C-ApA na `PEND-014-3` | ✅ |
| **X. Paridade antes de novidade** | Paridade: `RF-AVAL-01..06`, `RF-EXTRA-01..04`, `RF-INI-04`, `RF-CURSO-02/06`. As **extensões** são as quatro autorizadas nominalmente na spec §2.1 (D-AA-4, 5, 12, 13) mais D-CUR-2, D-AV-1/2 e D-TETO-1/2, todas decisões de Bernardo de 12 e 13/10/2026 | ✅ |
| **XI. O banco é a fronteira** | FK do tipo, FK composta item × disciplina e UE × disciplina, `CHECK` de exclusividade (fiscal, quem conduz, bloqueio só em TR), gatilhos (categoria pelo tipo; sessão após aplicação; trilha do previsto), policies por `app.pode()` e alcance, **zero** `for delete`. Nenhuma regra de negócio vai para PL/pgSQL além do espelho `fn_status_vista`, que ganha teste cruzado (R-8) | ✅ |

**Gate:** passa, com as duas exceções justificadas abaixo.

## Project Structure

### Documentation (this feature)

```text
specs/014-atividades-e-avaliacoes/
├── spec.md · estado-atual.md · medicao-2026-10-12.md
├── plan.md                      # este arquivo
├── research.md                  # R-1 a R-15
├── data-model.md                # tabela a tabela, SQL de rascunho
├── quickstart.md                # validação por PR
├── contracts/
│   ├── dia-parado.md
│   ├── tetos-e-previsto-proens.md
│   ├── avaliacoes-do-curriculo.md
│   └── sincronizacao.md
├── checklists/requirements.md
└── tasks.md                     # /speckit-tasks — NÃO criado por este comando
```

### Source Code (repository root)

```text
lib/dominio/
├── tetos-da-turma.ts            # RN-EVT-01: cards com cumprido · previsto · máximo (contracts/tetos-…)
├── limite-maximo.ts             # FR-001.1: currículo ou norma, com origem
├── categoria-pelo-tipo.ts       # D-AA-3: tipo → categoria, e o que fica fora da CHT (tipo impede a soma)
├── dsa/dia-bloqueado.ts         # RN-EVT-04 estendida: feriado + dia parado + TR bloqueante
└── avaliacoes/
    ├── previsto.ts              # D-CUR-2: aula + avaliação = CH, por UE quando o currículo diz
    ├── projecao.ts              # FR-031.11: "restam X; faltam N (Y) → sobram Z"
    ├── situacao.ts              # FR-050/051 + OD (Q-17)
    └── contagem.ts              # FR-056: N de M, + K OD, vistas A de B
lib/validacao/
├── dia-parado.ts · previsto-proens.ts · avaliacao-do-curriculo.ts (Zod)
lib/acoes/
├── dsa.ts                       # pararDia, desfazerParada, lancar (item, papéis, sessões, global pela tela)
├── previsto-proens.ts           # gravarPrevistoProens
└── avaliacoes-do-curriculo.ts   # definirTempoArbitrado, criar/editar/inativar item (FR-038)
app/(app)/
├── turmas/[turma]/              # cards, AbasDaTurma, aba Avaliações, edição do previsto
├── turmas/[turma]/dsa/          # Parar dia, tipo → categoria, global, itens e sessões no formulário
├── cursos/[curso]/              # limites máximos, terceira aba Avaliações
├── atividades/                  # a rota que deixa de ser "em breve" (FR-063)
└── inicio/                      # alertas de teto e de vista
app/print/dsa/                   # dias parados no papel
lib/planilha/                    # situação e sessões na CONTROLE
supabase/migrations/             # 12 arquivos (§3)
supabase/tests/123_* … 130_*     # pgTAP
scripts/etl/
├── extrair_avaliacoes_curriculo.py · dados/avaliacoes_curriculo.csv · dados/limites_curriculo.csv
└── conferir_avaliacoes_curriculo.py
scripts/carga_dsa/resolver.py · sincronizar.py · verificar.py   # contracts/sincronizacao.md
tests/unidade/ · tests/invariantes/rls/ · tests/e2e/
docs/fase-1/04, 02, 07 (.md) · docs/vibe-coding/42   # emendas FR-060/061 (§13 da spec)
```

**Structure Decision**: a estrutura existente do repositório (documento 24); nada novo fora de
`lib/dominio/avaliacoes/` e `app/(app)/atividades/`.

---

## 1. A ordem dos PRs, com dependências e o que você confere no preview

Duas levas (D-AA-1): **Épico 9 primeiro**. Cada PR nasce da `main` depois do merge do anterior de
que depende. Todo PR com migration aplica no remoto **antes** do merge, pelo rito (research R-15).

| PR | Ramo | Depende de | Banco? | O que entrega para quem usa | Como você confere (por clique) |
|---|---|---|---|---|---|
| **PR 1** | `db/EPICO-9-banco-da-leva-1` | a spec na `main` (Fase 0 do `tasks.md`) | **4 migrations** (E-1, E-2, D-1, D-2) | Nada na tela ainda. O banco fica pronto: 5ª categoria, tipo com FK e categoria derivada, `dias_parados`, `limites_curriculo` com os 24 currículos, listas de parada e reclassificação dos tipos, views | pgTAP e RLS verdes; o relatório antes/depois da D-1 e da D-2 (quickstart) |
| **PR 1.1** | `db/EPICO-9-previsto-proens-por-turma` | PR 1 | **2 migrations** (E-3, D-3) | Nada na tela. `previsto_proens_turma` + trilha + permissão do Ajudante; as 10 reservas nas turmas; `vw_conformidade_tetos` nova | o antes/depois da D-3: 10 linhas → 10 linhas, 5 turmas |
| **PR 2** | `feat/EPICO-9-cards-de-tetos` | PR 1.1 | não | **Cards de AEC/TAD/TR** (cumprido · previsto · máximo) na página da turma, "Dias parados", EI com as duas referências; **Editar previsto** (Ajudante sim, Operador não); **limites na página do curso**; `/inicio` com teto excedido; **`/atividades`** sai do "em breve"; Glossário e `RN-EVT-01`/`RF-EXTRA-04`/`RN-2027-03` emendados (E-4, E-5, E-7, FR-060) | *Turmas* → turma → cards; *Editar previsto* como Ajudante e como Operador; *Cursos* → curso → limites; *Início*; *Atividades* |
| **PR 2.1** | `feat/EPICO-9-dsa-tipo-global-e-dia-parado` | PR 1 (pode andar em paralelo com PR 2) | não | No DSA: escolher o **tipo** e ver a categoria; lançar **global** (quem pode); **Parar dia** com tipo, motivo, alcance e "consome TR"; **desfazer**; dia e tempos parados na grade e no papel; a leitura de avaliação viva por **lista positiva de status**, que precisa estar em Production antes do `db push` do PR 4; `RN-EVT-04` emendada | DSA → *Parar dia* nos cinco casos da US4; tentar aula no tempo parado; cascata; imprimir |
| **PR 3** | `feat/EPICO-9-carga-da-leva-1` | PR 1, PR 2.1 | não (só `scripts/carga_dsa`) | A sincronização grava dia parado, Apoio Individualizado, uma linha por turma, pendência de responsável; nunca altera CH | rodar uma rodada no **local** e ler `erros-de-planilha.md`; rodar de novo: zero mudança |
| **PR 4** | `db/EPICO-8-banco-da-leva-2` | PR 1 e a §12 aprovada; **o `db push` espera o PR 2.1 na `main`** | **6 migrations**, nesta ordem: E-4, E-5, D-5, D-6, D-4, D-7 (com D-7b e D-8) | Nada na tela. Avaliações do currículo transcritas, ajuste por turma, sessões de vista, papéis, 2º instrutor, substituída, FK do item; **correções §11-A e unificação**; as 188; e a sincronização e o lote de decisões adaptados a elas | **cada migration de dado com o antes/depois antes do `db push`**, caso a caso (§3) |
| **PR 5** | `feat/EPICO-8-avaliacoes-nas-telas` | PR 4, PR 2 | não | **Card "N aplicadas de M" + OD + vistas**; **aba *Avaliações* da turma** (previsto com origem, projeção, situação, papéis, *Definir tempo*); **aba *Avaliações* do curso**; alertas de vista no `/inicio` e na turma; painel da disciplina com aula + avaliação; `RN-AVAL-01/02`, `RF-AVAL-04/05`, doc 42 emendados (§12, E-1..E-3, E-6) | turma → card → aba; disciplina de 120 TA (projeção); Obs-ME (sugestão a confirmar); MetocOf (sem UE); curso → aba |
| **PR 5.1** | `feat/EPICO-8-dsa-itens-sessoes-e-papeis` | PR 4, PR 2.1, **PR 5** | não | No DSA: a disciplina oferece **UEs e avaliações**; lançar prova/trabalho aponta o item e consome o tempo dele; **vista em N sessões**; fiscal e quem conduz; demais instrutores; faixa "U.E. 3 a 6" | DSA → HN-2101 → PM 1 (UE 7) → vista 1 e 2 → painel 18 + 2 + 1 = 21 |
| **PR 6** | `feat/EPICO-8-carga-da-leva-2` | PR 4, PR 3, PR 5.1 | não (só `scripts/carga_dsa`) | A sincronização liga prova e vista ao item, grava sessões, fiscal, 2º instrutor, sugestões do Obs-ME, e a lista de erros de planilha completa | rodada no local; `erros-de-planilha.md` com os casos do §11-B; catálogo intacto |

**Caminho crítico:** Fase 0 → PR 1 → PR 4 → PR 5 → PR 5.1 → PR 6. A leva 1 fica visível por PR 1 →
PR 1.1 → PR 2 e completa no remoto por PR 1 → PR 2.1 → PR 3. **Nove PRs**; os de banco são três.
⚠️ *Corrigido em 13/10/2026, na revisão adversarial do `tasks.md`:* o PR 5.1 passou a depender do PR 5
(o painel do DSA usa `previstoDaDisciplina` e `contagemDeAvaliacoes`, que nascem no PR 5), e o `db push`
do PR 4 espera o PR 2.1 na `main` (sem a lista positiva de status em Production, as 188 voltariam ao DSA
assim que a D-7 rodasse).

## 2. Domínio puro primeiro — o que nasce antes de qualquer tela

Ordem de dentro para fora (convenção de código): `lib/dominio/` → `lib/validacao/` → `lib/acoes/`
→ `app/` → `components/`. As oito funções da árvore acima nascem **com teste** nos PRs 2, 2.1 e 5,
cada uma com o `RN-`/`FR-` no topo e a citação literal:

- `tetosDaTurma` e `limiteMaximo` — tipo que **impede** somar EI, Apoio e dias parados à CHT
  (FR-002); fronteiras: cumprido = previsto (sem alerta), = máximo + 1 (alerta); CH nula.
- `categoriaPeloTipo` — tipo sem categoria → `null` (não oferecido); histórico sem tipo → a coluna.
- `recusaDeAulaNoDia` — três origens; parte do dia só cobre os tempos; avaliação e atividade não são
  recusadas (`RN-EVT-04` L372).
- `previstoDaDisciplina`, `projecaoDaDisciplina` (Z = 0 e Z = −1), `situacaoDaAvaliacao` (7º/8º dia,
  OD nos três estados), `contagemDeAvaliacoes` (vista fora, substituída fora, "não definido" conta).

## 3. As migrations — estrutura separada de dado, cada uma com rito, pgTAP e caminho de volta

Nomes com carimbo UTC da CLI; aqui, o **sufixo** e o conteúdo. Detalhe em `data-model.md`.

| # | PR | Tipo | Arquivo (sufixo) | O que faz | pgTAP | Caminho de volta |
|---|---|---|---|---|---|---|
| **E-1** | 1 | estrutura | `apoio_individualizado_e_tipo_com_fk` | `Apoio_Individualizado` no enum; `tipo_atividade_id` + gatilho + catraca (com o tipo preenchido pelo `subtipo` nas linhas que já existem e nas que o DSA e a sincronização de hoje gravam); `bloqueia_aula`, `tipo_parada`, `quantidade_alunos`, `outros_instrutores`; gatilho de `tipos_atividade`; policy do TR global bloqueante por `calendario.criar`. ⚠️ **Nada neste arquivo usa o valor novo** (R-7): a expressão de `compoe_cht` e as `CHECK` que citam `Apoio_Individualizado` vão para a E-2 *(corrigido em 13/10/2026: a primeira redação punha `compoe_cht` aqui, o que o PostgreSQL recusa por uso de valor de enum na mesma transação)* | `123_apoio_individualizado.sql`: `compoe_cht` por categoria, gatilho deriva categoria, catraca, `RN-EVT-01` | **enum não perde valor**: a volta inativa o uso (`update` para a categoria anterior registrada em `migracao_log`) e recria `compoe_cht` com a expressão antiga; colunas novas ficam aposentadas |
| **E-2** | 1 | estrutura | `compoe_cht_dias_parados_limites_e_views` | `compoe_cht` recriada (R-2, decisão D-1) **com as dependentes na mesma migration**; `ativ_alunos_so_apoio`; EI e Apoio só de turma; `dias_parados` + policies (turma: atividades; global: `calendario`); `limites_curriculo`; sequências `DPA-`; `vw_carga_horaria_turma` com globais por turma com DSA, Apoio e dias parados fora da CHT | `124_dias_parados.sql`: `dpa_global_so_parte_do_dia`, zero `DELETE`, views com `security_invoker`, global soma só em turma com DSA (caso que discrimina: EAD) | `drop` das tabelas **vazias** só na base descartável; no remoto, `status = inativo` + view anterior restaurada |
| **D-1** | 1 | dado | `limites_dos_24_curriculos` | 30 linhas em `limites_curriculo`, do CSV revisado, com arquivo e página (M-8) | contagem = CSV; CAHO 166/166; C-Espc TAD 62 | `status = inativo` nas 30, com evento em `migracao_log` |
| **D-2** | 1 | dado | `reclassificar_tipos_de_atividade` | `config_listas`: `tipos_parada`; Recepção → TAD, APOINST → AEC, Monitoria/Português/BDA/BDF → Apoio; tipos de aula marcados; `config_parametros` (vence em breve) | lista completa, categoria em todo tipo de atividade | reverter os `metadados` (valores antigos gravados no comentário da migration) |
| **E-3** | 1.1 | estrutura | `previsto_proens_por_turma` | `previsto_proens_turma`, trilha imutável + gatilho, permissão `previsto_proens.editar`, `vw_conformidade_tetos` nova (só números; o alerta mora em `tetosDaTurma`), `reservas_proens` só leitura | `126_previsto_proens.sql`: trilha recusa `UPDATE` como `service_role`, `unique`, view com origem do limite | `drop` só em base descartável; no remoto, policies de escrita devolvidas a `reservas_proens` e view anterior |
| **D-3** | 1.1 | dado | `reservas_do_proens_para_as_turmas` | 10 linhas → 5 turmas de 2026; genérica → `config_parametros` | 10 = 10, valores iguais, 5 turmas distintas | `status = inativo` + evento no log |
| **E-4** | 4 | estrutura | `avaliacoes_do_curriculo_e_sessoes_de_vista` | `substituida_pela_planilha` no enum; `status_anterior`; `avaliacoes_curriculo` (+ FKs compostas sobre `ue_id_disciplina` e `disciplinas_id_curso`, que já existem; `origem_ue` e `ue_decidida_em`); `avaliacoes_curriculo_turma`; recurso `avaliacoes_curriculo_arbitrado.editar` e o gatilho `app.proteger_arbitrado()` (o Operador e o Ajudante já têm `avaliacoes.editar` e `disciplinas.editar`); `avaliacoes_planejadas` só de leitura; `vistas_de_avaliacao` + gatilho "após aplicação"; `avaliacoes.avaliacao_curriculo_id`, `ues_abordadas`, `outros_instrutores`; `registros_aula.outros_instrutores`; sequências `AVC-`, `VST-` | `127_avaliacoes_do_curriculo.sql`: Σ TA ≤ CH por disciplina (sobre o catálogo), FKs compostas, gatilho, `RN-AVAL-02` (um fato), `RN-EVT-03` | tabelas vazias em base descartável; no remoto, inativação |
| **E-5** | 4 | estrutura | `situacao_calculada_e_vista_pelas_sessoes` | `app.fn_status_vista` pelas sessões, com assinatura nova (e `vw_avaliacoes_situacao` recriada com `security_invoker`); o gatilho de compatibilidade que espelha as colunas de vista na sessão 1 enquanto o DSA e a sincronização escreverem nelas; `vw_carga_horaria_turma` e `vw_ocupacao_ta` lendo só as sessões; `aval_ta_coerente` aceitando a substituída histórica; colunas de vista única comentadas aposentadas; **`public.gravar_lancamentos_em_transacao` passa a aceitar `vistas_de_avaliacao`** (hoje aceita só `registros_aula`, `avaliacoes` e `atividades_nao_letivas`; sem isso a cascata D-DSA-3 não move uma sessão, e o PR 5.1 precisaria de migration) | `128_situacao.sql`: os casos do Vitest (7º/8º dia, OD) com o mesmo veredito | função e view anteriores restauradas |
| **D-4** | 4 | dado | `avaliacoes_dos_24_curriculos` | a lista `instrumentos_avaliacao` (data-model §3.2) e os itens do CSV revisado (R-13), com página | contagem por curso = CSV; HN-2101 UE 7 = PM 2 + vista 1 | inativar os itens |
| **D-5** | 4 | dado | `correcoes_banco_x_curriculo` | B-1, B-2, B-3, B-6, B-7, B-8 (CH, código, nome); B-5 reativada; B-4 e B-12 **só se conferidos no PDF** | CH antes → depois por disciplina; contagem de lançamentos por disciplina intacta | valores antigos gravados na própria migration; `update` de volta |
| **D-6** | 4 | dado | `unificar_hn2101_e_matfis` | mover UEs, `turma_disciplina*`, aulas, avaliações, AEC; inativar I-I e FIS com marca (Q-15, dúvida D-2) | por turma: aulas, avaliações, atividades e CH executada iguais; `turma_disciplina` da unificada com período = união | o mapa `id antigo → id novo` fica na migration; a volta reaponta e reativa |
| **D-7** | 4 | dado | `substituidas_e_vistas_para_sessoes` | D-7: 188 → `substituida_pela_planilha` + `status_anterior`, `L206-V` intocada; D-7b: vistas → sessão 1 (anda **junto** da E-5: recusado, a E-5 e a D-7 saem do `db push`); D-8: 16 aulas → `outros_instrutores` | 188 = 188; vivas 188; sessões = vistas; 16 = 16 | `status_anterior` → `status`; sessões inativadas; `observacoes` restaurada do log |

**Total: 5 de estrutura (E-1 a E-5) e 7 de dado (D-1 a D-7), 12 arquivos.** ⚠️ *Corrigido em
13/10/2026: a primeira redação dizia "6 de estrutura, 5 de dado" e "11"; a tabela acima sempre teve
12 linhas.* A D-7 agrupa D-7, D-7b e D-8, que rodam juntas; cada uma com o antes/depois **por item**
para você aprovar caso a caso. ⚠️ `ADD VALUE` de enum e o `UPDATE` que
o usa vivem em arquivos diferentes (R-7) — é por isso que E-1 precede D-2 e E-4 precede D-7. ⚠️ **No PR 4 a ordem é E-4 → E-5 → D-5 → D-6 → D-4 → D-7**: os itens da D-4 apontam para a disciplina já unificada pela D-6 *(corrigido em 13/10/2026; a tabela acima segue a numeração, não a ordem)*.

**Rito, para cada uma (R-15):** backup `--somente-copia` citado · dry-run só com ela · `db push` ·
contagem de migrations dos dois lados · impressão digital do esquema · as contagens de dado que a
própria migration declara · Production respondendo · registro em
`plano-de-aplicacao-no-remoto.md`. Reversão provada em base descartável **antes** do merge (DoD 6).

## 4. A sincronização

Ver [contracts/sincronizacao.md](contracts/sincronizacao.md). Em uma frase: **passa a gravar** dia
parado, Apoio Individualizado, item do currículo ligado, sessões, fiscal, 2º instrutor e as sugestões
onde o currículo é mudo; **nunca mais altera** CH de disciplina, UE ou avaliação, e prova isso por
impressão digital do catálogo antes e depois de cada rodada; e **emite** `erros-de-planilha.md`.

## 5. Telas — novas e alteradas, com o caminho de clique

| Tela | PR | Novo/alterado | Caminho de clique (FR-063) |
|---|---|---|---|
| `/turmas/[turma]` — cards AEC/TAD/TR, "Dias parados", EI, Apoio | 2 | alterado (acima das abas) | menu *Turmas* → linha da turma |
| `/turmas/[turma]` — *Editar previsto* (formulário recolhido, por card) | 2 | novo | card → botão (segue `previsto_proens.editar`) |
| `/cursos/[curso]` — bloco *Limites máximos* + turmas excedidas | 2 | alterado | menu *Cursos* → curso |
| `/inicio` — alertas de teto (e, no PR 5, de vista) | 2, 5 | alterado | menu *Início* |
| `/atividades` — lista por turma, tipo, categoria, filtros na URL | 2 | **nova** (sai do "em breve") | menu *Atividades* |
| `/turmas/[turma]/dsa` — tipo → categoria; global; **Parar dia**; desfazer; grade com parada | 2.1 | alterado | turma → *DSA* → *Lançar* / *Parar dia* |
| `/print/dsa` — tipo e motivo da parada | 2.1 | alterado | DSA → *Imprimir* |
| `/turmas/[turma]` — **`AbasDaTurma`** (`?aba=ficha\|avaliacoes`) + card *Avaliações* | 5 | alterado | turma → card → aba |
| `/turmas/[turma]?aba=avaliacoes` — por disciplina: previsto com origem, projeção, itens, situação, papéis, *Definir tempo* | 5 | **nova aba** | card ou barra de abas |
| `/cursos/[curso]?aba=avaliacoes` — terceira aba (`RF-CURSO-02`) | 5 | **nova aba** | curso → aba |
| `/disciplinas` — painel *Unidades de ensino* com as avaliações do currículo (FR-038) | 5 | alterado | menu *Disciplinas* → linha → painel |
| `/turmas/[turma]/dsa` — UEs **e** avaliações da disciplina; vista em sessões; fiscal, quem conduz, demais instrutores; faixa de UEs | 5.1 | alterado | turma → DSA → *Lançar* |

Toda tela nova tem `error.tsx`/`loading.tsx` no segmento e um percurso de ponta a ponta que chega
**por clique** (`toda-tela-tem-caminho.test.ts` cobra o `href`). Nenhum `<select>` de instrutor ou
turma fora dos canônicos (gotcha 12). Datas por `dataParaLeitura`. Cores só por token.

## 6. Testes

| Camada | O que cobre | Onde |
|---|---|---|
| **Vitest** | as oito funções de `lib/dominio/` (§2), com fronteiras; `tipo impede a soma` (erro de `tsc` provado por caso `// @ts-expect-error`); tradução das recusas novas | `tests/unidade/tetos-da-turma.test.ts`, `limite-maximo`, `categoria-pelo-tipo`, `dia-bloqueado`, `avaliacoes/*` |
| **pgTAP** | 123 a 130 (§3): `compoe_cht`, gatilho do tipo, catraca, `dias_parados`, globais por turma com DSA, trilha imutável, `unique`, FKs compostas, Σ TA ≤ CH, sessão após aplicação, `fn_status_vista` × Vitest, zero `DELETE`, `security_invoker` em toda view, `RN-EVT-01`, `RN-EVT-03`, `RN-AVAL-02`, `RN-2027-03`, `RN-MAT-01` | `supabase/tests/` |
| **RLS (sessão real, `42501`)** | Operador: parada de turma sim, global não; previsto não; arbitrado não. Ajudante: previsto **sim** (caso que discrimina), global parada **não**. Encarregado: tudo. Leitura por alcance de curso/turma nas tabelas novas | `tests/invariantes/rls/atividades-e-avaliacoes.test.ts` |
| **Playwright, por clique** | US1 (cards, previsto, limites, `/inicio`), US2 (tipo, Apoio), US3 (global), US4 (os 10 cenários), US5 (situação), US6 (UE 7 = 18 + 2 + 1), US7 (sessões e papéis), US8 (substituída fora), US9 (origem e projeção), US10 (card e aba) | `tests/e2e/tetos-da-turma.spec.ts`, `previsto-proens`, `limites-do-curso`, `atividades`, `dsa-tipo`, `dsa-global`, `dsa-parar-dia`, `avaliacoes-da-turma`, `avaliacoes-do-curso`, `card-de-avaliacoes`, `dsa-avaliacao-item`, `dsa-vista-sessoes`, `dsa-papeis` |
| **Carga** | duas rodadas = zero mudança; catálogo intacto; `erros-de-planilha.md` com os casos do §11-B; sugestão confirmada não é tocada | `provar_carga_dsa.py` (recusas, em memória) e `provar_sincronizacao_no_banco.py` (no Docker local) |
| **Defeitos deliberados** (um por PR de banco, registrados) | `compoe_cht` com a expressão antiga; sessão antes da aplicação; policy global aberta ao Ajudante | quickstart |

## 7. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R-A | **Recriar `compoe_cht`** é `drop column` numa tabela com histórico (R-2) | coluna derivada, nada a perder; **as views e consultas dependentes recriadas na mesma migration**; pgTAP com o mesmo resultado antes e depois (contagem de `true` por categoria e as somas das views); dúvida D-1 **respondida: sim** |
| R-B | **A unificação (D-6) toca lançamentos reais** (aulas da I-I e de FIS, `turma_disciplina_instrutor`, `turma_disciplina_unidade`) | migration com mapa `antigo → novo`, contagens por turma iguais, reversão provada; impacto mostrado antes, **com as duas listas de instrutores**; período e atribuições = **união**, a linha extra **inativada**; dúvida D-2 **respondida: sim** |
| R-C | **Transcrição heurística** das avaliações (M-7 marca ≈) | CSV **revisado à mão** antes da migration, como `pareamento_ue.csv`; `conferir_avaliacoes_curriculo.py` cobra Σ ≤ CH e página em todo item; APOC por dois leitores |
| R-D | **Enum com valor novo na mesma transação** | arquivos separados (R-7); pgTAP que usa o valor roda depois |
| R-E | **A SC-001 muda de resposta** quando feriado e licença saem do TAD (Q-14) | `[pendente]` na spec; remedida no **PR 3**, depois da rodada que tira as linhas do TAD, no local e no remoto *(corrigido em 13/10/2026; dizia "no PR 1", onde nada as move)* |
| R-F | **Carga grava aula em dia que a planilha marcou parado** | sem gatilho (R-9): entra como fato e vai para `erros-de-planilha.md` **sem abortar a carga**; dúvida D-3 **respondida: Server Action + domínio** |
| R-G | **Dois caminhos para a situação** (TS e SQL) | pgTAP cruzado com os casos do Vitest (R-8) |
| R-H | **Duas abas novas e cards na página da turma**, que já é a mais pesada | `Promise.all`; a aba *Avaliações* só consulta quando aberta; medir o tempo como na ficha do instrutor |
| R-I | **O previsto do PROENS de AEC não existe em lugar nenhum** | fica *"previsto não definido"* até alguém gravar; a sugestão genérica só cobre TAD e TR |
| R-J | **Reclassificação pela rodada, não por migration** (FR-022) exige rodar a sincronização de todas as turmas de `fontes.json` no remoto | PR 3 e PR 6 entram no rito da VIRADA-1; até lá, linhas antigas contam como estão; a data da última rodada fica em `scripts/carga_dsa/turmas-carregadas.md` e no `plano-de-aplicacao-no-remoto.md`, e **não** no painel, porque não há fonte para ela no banco sem migration *(corrigido em 13/10/2026, na revisão adversarial do `tasks.md`)* |
| R-K | A regra de **"disciplina concluída"** para a OD depende do critério do painel, que lê UEs; disciplina sem UE (C-Espc) usa CH da disciplina | documentado na função; caso de teste por competência |

## 8. O que fica fora (backlog nomeado)

- **`PEND-014-2`** — consumir TA ao **agendar** avaliação (D-AA-15), com a contradição
  `RF-AVAL-04/05` × doc 06 anotada.
- **`PEND-014-1`** — tabela de junção instrutor × lançamento com rateio (D-AA-7).
- **`PEND-014-3`** — Ambientação dos C-ApA (B-11): disciplina no banco, fase no currículo.
- **`PEND-DSA-VISTA`** — a `L206-V` relançada sem vista e o possível bug (backlog do DSA).
- `/admin/calendario`, janelas e reservas do PROENS como tela: Épico 7. Relatório do curso: Épico 10.
  LIQ e OS: Épico 11. Nota, média, aprovação: nunca (`RNF-NORM-06`). Policy de `DELETE`: nunca.
- **Trilha do previsto na tela** (além do "alterado por … em …"): junto da `PEND-011-2`.

### Complexity Tracking

| Violação | Por que é necessária | Alternativa mais simples, rejeitada porque |
|---|---|---|
| **Mais de uma migration por PR de banco** (PR 1: 4; PR 1.1: 2; PR 4: 6) — contra "uma fatia = uma migration coesa" (Princípio VI) | (1) valor novo de enum não pode ser usado no arquivo que o cria (R-7); (2) **migration de dado separada da de estrutura** é exigência expressa de Bernardo (pedido do plan, item 3), para aprovar o antes/depois caso a caso; (3) cada uma tem contagem e reversão próprias | Uma migration só por PR: misturaria estrutura com dado aprovado caso a caso, e quebraria no enum. Um PR por migration: 12 PRs de banco, cada um com o rito inteiro do remoto, por mudanças que só fazem sentido juntas |
| **`drop column compoe_cht` + `add column`** — contra "nunca `drop column` em tabela com histórico" | coluna **gerada**, recalculada da expressão: não há valor que a expressão nova não reproduza; a expressão precisa mudar para a 5ª categoria (FR-018) | `drop expression` + gatilho (duas fontes); `compoe_cht_v2` (a antiga continuaria **errada** para Apoio Individualizado, e duas colunas quase homônimas). Submetido como **D-1** e **aceito por Bernardo em 13/10/2026**, com a condição de recriar as dependentes na mesma migration e provar por pgTAP o mesmo resultado antes e depois |

## 9. Constitution Check — reavaliação depois do desenho

Nenhum princípio novo é tocado pelo desenho da Fase 1. As duas exceções (acima) continuam as
únicas, e as duas estão justificadas e, a primeira, submetida. O `fn_status_vista` em PL/pgSQL é
**espelho** de regra que mora em TS, com teste cruzado — não é regra migrando para o banco (XI.5).
A terceira aba do curso contraria a Q-02 da spec 009 ("exatamente duas") **porque o requisito que
a motivava chegou** (`RF-CURSO-02`, FR-053) — o registro de 25/09 fica no cabeçalho de
`AbasDoCurso`. **Gate: passa.**

## 10. Dúvidas — ✅ AS TRÊS RESPONDIDAS por Bernardo Villas Boas em 13/10/2026 (não reabrir)

> ⚠️ **Os rótulos "D-1", "D-2" e "D-3" desta seção são DÚVIDAS do plan, e não as migrations de
> dado de mesmo nome da §3.** Em `tasks.md` elas aparecem como "decisão D-1/D-2/D-3 do plan".

| # | Resposta de Bernardo, 13/10/2026 | Condição que vira tarefa |
|---|---|---|
| **D-1** | **SIM, opção (a).** Recriar a coluna gerada `compoe_cht` (`drop` + `add`) é **exceção aceita** à regra "nunca `drop column`", por ser derivada. | Recriar **na mesma migration** as views e consultas dependentes, com **pgTAP provando o mesmo resultado antes e depois**. A exceção nominal é registrada no `CLAUDE.md` (convenções de banco) no PR 1. |
| **D-2** | **SIM, opção (a).** Na unificação, a `turma_disciplina` unificada fica com a **UNIÃO** dos períodos e das atribuições de instrutores; a linha extra é **INATIVADA**, nunca apagada. | As **duas listas de instrutores** aparecem no antes/depois que Bernardo aprova antes da migration D-6. |
| **D-3** | **Opção (a): Server Action + domínio**, como a `RN-EVT-04` hoje, **sem gatilho** no banco. | A sincronização com as planilhas registra aula em dia parado como **ERRO DE PLANILHA**, **sem abortar a carga** (PR 3). |

**Premissa A-10** (1 hora do currículo = 1 TA) **confirmada** por Bernardo em 13/10/2026.

*As opções abaixo ficam como registro do que foi considerado.*

**D-1 — Recriar `compoe_cht` (coluna gerada) é exceção aceitável à regra "nunca `drop column`"?**
A expressão precisa incluir `Apoio_Individualizado`, e coluna gerada não muda de expressão no lugar.
| Opção | O que é | Implicação |
|---|---|---|
| **(a)** `drop column` + `add column … generated` na mesma migration, com contagem antes/depois | Nada a perder: é derivada | Exceção nominal, registrada aqui e no `CLAUDE.md` |
| (b) Aposentar `compoe_cht` e criar `compoe_cht_v2` | Obedece à letra | A antiga fica **errada** para a categoria nova, e duas colunas quase iguais |
| (c) `drop expression` e manter por gatilho | Obedece à letra | Duas fontes da mesma verdade, contra a convenção de coluna derivada |
**Recomendação: (a).**

**D-2 — Na unificação (Q-15), como fica a linha `turma_disciplina` da disciplina unificada quando as
duas metades tinham período e instrutores diferentes?** Medido: C-Ap-HN 2026 tem uma linha para I e
outra para I-I, com `previsao_inicio/termino` e atribuições próprias.
| Opção | O que é | Implicação |
|---|---|---|
| **(a)** Período = **união** (menor início, maior término), `origem_periodo = manual`; atribuições = **união** das duas listas; o código `TDI-` da linha da "I" fica e o da "I-I" é inativado com marca | Nada se perde; o rateio (A-1) passa a dividir 126 entre os instrutores das duas | O rateio muda para quem tinha só a Física; a LIQ futura lê a unificada |
| (b) Manter as duas linhas `turma_disciplina` apontando para a disciplina unificada | Rateio e período intactos | Viola `unique (turma_id, disciplina_id)` ou exige exceção; a "quantidade igual ao currículo" fica só em `disciplinas` |
| (c) Você informa o período e os instrutores de cada unificada no lote de aprovação da D-6 | Exato | Mais uma decisão sua por turma |
**Recomendação: (a)**, com o antes/depois mostrando as duas listas de instrutores.

**D-3 — A recusa de aula em dia parado fica só na Server Action e no domínio (como a `RN-EVT-04`
hoje) ou ganha gatilho no banco?**
| Opção | O que é | Implicação |
|---|---|---|
| **(a)** Server Action + `recusaDeAulaNoDia` (R-9), sem gatilho | Igual à `RN-EVT-04` de hoje; a carga grava aula de planilha incoerente e lista o erro | Uma inserção direta no banco por quem tem `registros_aula.criar` passa; Princípio XI aceita, porque é regra de negócio (XI.5) |
| (b) Gatilho `BEFORE INSERT OR UPDATE` em `registros_aula` | O banco nega por autoridade | A carga de planilha com aula em dia parado **aborta a transação** da turma inteira, em vez de listar o erro; e a `RN-EVT-04` existente ficaria com dois mecanismos |
**Recomendação: (a).**

*(Sem mais dúvidas reais. O resto do que a spec deixou para o plan está decidido no `research.md`; A-10 confirmada:
dia parado em tabela própria (R-1), origem por campo (R-4), sessões em tabela filha (R-5), 2º
instrutor em `text[]` (R-6), substituída como valor do enum (R-7), trilha do previsto só de acréscimo
(R-10), limites como dado com página (R-11), abas na turma (R-12), horas = TA (A-10).)*

## O que este plan NÃO contém, de propósito

Tarefas (são do `/speckit-tasks`); SQL final das migrations (escrito à mão na implementação, a
partir do rascunho do `data-model.md`); qualquer escrita no remoto; qualquer emenda aos documentos
(acontecem nos PRs 2 e 5, só no `.md`, com a autorização citada).
