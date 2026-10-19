# Implementation Plan: Correções do Bloco 1 — tela e defeitos dos testes de 16/10/2026

**Branch**: `fix/BLOCO-1-correcoes-de-tela` | **Date**: 17/10/2026 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/016-correcoes-bloco-1/spec.md`, com o clarify de 17/10/2026 (17 respostas da §12 e 4 da
§13, todas registradas na seção *Clarifications*).

**Status**: ✅ **APROVADO por Bernardo Villas Boas em 17/10/2026** — o desenho das migrations (regra 9.4) e
as cinco dúvidas da §10, todas pela recomendação. Registro na §0. ✅ **Spec encerrada em 19/10/2026**: os
três PRs aprovados e mesclados na `main` (#67 `a64791d`, #68 `5e55f97`, #69 `c7313c3`).

> **Leia junto:** `contracts/migrations.md` — **o desenho das duas migrations, para aprovar antes do
> remoto** (regra 9.4) —, `contracts/telas.md`, `research.md` (as decisões R-1 a R-14), `data-model.md`,
> `quickstart.md` e `plano-de-aplicacao-no-remoto.md`.

> **Onde foi medido** (regra 9.2): código no ramo `fix/BLOCO-1-correcoes-de-tela`; dado no banco local
> restaurado de **`remoto-20261017-005738.sql`**; os esboços das migrations **executados no local e
> desfeitos** (`begin … rollback`); o efeito de antes × depois calculado **pelas funções reais** de
> `lib/dominio/`. "Hoje" = 17/10/2026.

## 0. Decisões de Bernardo Villas Boas sobre este plan (17/10/2026)

- **Regra 9.4 — o desenho de `contracts/migrations.md` (M1 e M2) está APROVADO**, com o efeito medido
  **aceito**: a C-Ap-FR 2026 passa a "em atraso" no `/inicio`, e o instrutor de código 13 ganha 4 semanas
  acima da faixa. ⚠️ **Se a nova medição sobre o backup do dia (rito, passo 4) mudar o efeito, o desenho
  volta para ele antes do `db push`.**
- **P-1:** três PRs, na ordem **tela → DSA → banco**.
- **P-2:** **aceita a exceção ao Princípio VI** — M1 e M2 no mesmo PR (PR 3). Registro datado no
  *Complexity Tracking* (§9).
- **P-3:** a soma da CHD fica em **três lugares**, guardada pelo teste de igualdade do pgTAP 135.
  Unificar é **fatia própria**: pendência **`PEND-016-1`** (§0.1).
- **P-4:** em `/turmas`, **Progresso para todas** as turmas; **Saldo só em ativa e planejada**; **"—"** nas
  demais (FR-014.6 da spec emendado no mesmo dia).
- **P-5:** o PR do DSA (PR 2) é **mesclado entre semanas** — sexta à noite ou fim de semana —, para que
  nenhum DSA da mesma semana saia com dois números.
- **Analyze (17/10/2026):** os commits dos itens **sem requisito próprio da Fase 1** (faixa, filtros, ver
  senha, página do curso, situação da turma…) usam o identificador **`BLOCO-1`** (opção A) — como o
  `EPICO-5.5`. Os itens com requisito de origem usam o dele (`RF-DS-03`, `RF-DSA-06`, `RF-INI-01`…).
- **Conferência do PR 1 (#67), 17/10/2026** — aprovados os passos 1, 3, 4, 5, 6 e 8 do roteiro; **dois
  defeitos corrigidos no mesmo ramo, antes do merge**: o item ativo do menu preso à primeira página
  carregada (passo 2) e a linha de disciplina que abria e não fechava (passo 6). O lote de dúvidas do
  implement seguiu **todas as recomendações**:
  1. **"Outras (N)"** só a partir de 6 disciplinas — com 5, as cinco inteiras (sem *"Outras (1)"*).
  2. **Desativar instrutor** fica com contorno; só *Excluir* em vermelho.
  3. **A confirmação de gravação fica na URL** (`?gravada=`), como o aviso de exclusão de conta.
  4. **Curso fora de oferta:** *Trocar situação* some, e o formulário *Editar turma* fica como era.
  5. **Faixa em Production** na cor da marca.
  6. **`avaliacoes-nas-telas.spec.ts:53`** vai para a **`PEND-014-7`** (instável também na `main`).
  7. **Testes que conferem o valor que eles mesmos digitaram** viram a **`PEND-016-2`** (§0.1).
- **Conferência do PR 2 (#68), 18/10/2026** — aprovado, com dois ajustes feitos no mesmo ramo antes do merge: o
  campo da semana num rótulo só (*"Semana do curso: 28 de 37"*, na tela e no papel) e o quadro de CH em duas
  colunas sem cruzar as assinaturas. Do lote do implement: a 2 (só linha de turma **ativa** sugere instrutor) e a
  6 (`limparDsa` apaga as atribuições pela linha da turma) entraram no PR; a 7 foi para a `PEND-014-7`; a 1, a 3, a
  4 e a 5 ficaram como deixadas. Mesclado em 19/10/2026, 00:21.
- **Conferência do PR 3 (#69), 19/10/2026** — aprovado; as dúvidas 1 a 5 do lote do implement como deixadas, e a 6
  registrada como **`PEND-016-5`** (§0.1), ligada ao Bloco 2. O lote, item a item, está em
  `progresso-implement.md` (*Encerramento*).

### 0.1 Pendências e dependências registradas por este plan

| # | O quê | Quando |
|---|---|---|
| **`PEND-016-1`** | **Unificar a composição da CHD**: fazer `vw_carga_horaria_turma` e `vw_disciplinas_execucao` lerem de `vw_chd_por_fato`, para a soma viver num lugar só. Até lá, o pgTAP 135 garante que as três batem | Fatia própria, depois do Bloco 1 (P-3) |
| **Dependência do Bloco 2** | Os **"TA fora do DSA"** da D-COR-3 vão **somar na base da M1** (`vw_chd_por_fato`), para entrarem na CH executada e no saldo como os lançamentos do DSA. **Nenhuma tarefa aqui**; quem especificar o Bloco 2 lê esta linha | Bloco 2 (spec 017) |
| **D20 residual** | `vw_cursos_regime_vigente` escolhe o regime vigente por `current_date` (UTC) | Não é deste bloco |
| **`PEND-016-2`** | **Varrer os testes de ponta a ponta que conferem o valor que eles mesmos digitaram** — *preencher o campo, gravar, conferir o campo* passa mesmo quando a gravação não acontece. Medido no PR 1 (#67): *"turma ativa com término passado avisa, e a gravação acontece"* não confirmava o aviso do limite de turmas do ano e passava **sem gravar**. A prova da gravação é a confirmação da tela **e** o valor no banco, ou o campo depois de recarregar | Fatia própria (decisão de Bernardo Villas Boas, 17/10/2026) |
| **`PEND-016-3`** | **As teclas de navegação apertadas DENTRO do detalhe aberto são capturadas pela grade de fora** (achado pela revisão do conserto da conferência do PR #67, 17/10/2026; anterior a esta spec — fatia (b) do Épico 5). `components/ciaara/lista-navegavel.tsx`, em `aoPressionar`, só confere a origem do evento para Enter e Espaço; setas, Home, End e PageUp/PageDown num campo do detalhe fazem `preventDefault` e movem o foco para a grade: o cursor não anda num texto, a seta não muda a data nem a opção, e no seletor de instrutor do detalhe da ficha a seta tira o foco do painel. **Conserto proposto:** tratar as teclas só quando o alvo é uma célula registrada da grade, com um caso de ponta a ponta que foca um campo do detalhe e aperta seta à direita | ✅ **Feita no PR 2 (#68)**, em commit próprio, por decisão de Bernardo Villas Boas (18/10/2026) |
| **`PEND-016-4`** | **As prévias de `.design-sync/previews/` ficam fora do `tsc`** — o `include` `**/*.tsx` não casa diretório que começa com ponto, e elas importam o pacote compilado `ciaara-11-ds`. Medido no PR 1: a `TabelaDensa` e a `FiltroAvancado` mudaram de contrato e as prévias seguiam no antigo, sem nada acusar (corrigidas à mão em 17/10/2026). Uma mudança de contrato de componente tem de varrer as prévias | Fatia própria |
| **`PEND-016-5`** | **A situação do DSA não soma lançamento histórico sem `ta_inicial`** (dúvida 6 do implement do PR 3; registrada por decisão de Bernardo Villas Boas, 19/10/2026). O acumulado do painel *Situação por disciplina* lê `vw_ocupacao_ta`, que filtra `ta_inicial is not null`; a CH executada do `/inicio`, da ficha e de `/turmas` soma o lançamento inteiro. Medido na semente do e2e (`tests/e2e/panorama-de-teste.ts`): na semana do lançamento futuro, **8 %** e não **18 %** — os 10 TA do histórico, sem `ta_inicial`, de fora. Anterior a esta spec | Bloco 2, item 1 (TA fora do DSA / histórico) |

## Summary

Quinze itens: onze de tela, um de leitura (1.12), um sem objeto (1.11, que deixa um caso de regressão) e
dois que tocam o banco. **Nenhuma tabela nova.** O banco ganha **duas migrations**, as duas pelo portão
da regra 9.4:

- **M1** (1.14, D-COR-2) — uma base de fatos de CHD e duas funções de leitura que somam **até uma data
  recebida**; as views de hoje e o DSA não mudam. Efeito medido: a **C-Ap-FR 2026 passa a "em atraso"**
  (saldo +24 → −16 TA), e 19 linhas de disciplina mudam de execução.
- **M2** (1.13) — `vw_instrutor_carga_prevista` com a janela efetiva (linha da turma → disciplina →
  turma), mesmas colunas. Efeito medido: **5** instrutores mudam de CH prevista em 2026; o de código 15
  vai de **114 para 271** TA.

**Três PRs** — tela (PR 1), DSA (PR 2), banco (PR 3) —, em vez dos dois do pedido, pelas razões da §1;
**decidido** por Bernardo em 17/10/2026 (P-1).

## Technical Context

**Language/Version**: TypeScript `strict` (Next.js 16.3.3, React 19.2.8); SQL e PL/pgSQL (PostgreSQL do
Supabase)
**Primary Dependencies**: `@supabase/ssr` 0.12.5 · `@supabase/supabase-js` 2.112.4 · Zod · `nuqs` ·
shadcn/Radix · Tailwind v4 · Recharts (pizza) · `lucide-react` (o olho do 1.3; já é dependência). **Nenhum
pacote novo.**
**Storage**: Supabase PostgreSQL; **2 migrations** no PR 3 (M1: uma view e duas funções novas; M2: uma
view recriada com as mesmas colunas). Nenhuma tabela, coluna de tabela, policy ou dado tocado
**Testing**: Vitest (domínio e guardas) · pgTAP **135** (M1) e **136** (M2) · `tests/invariantes/rls/`
com sessão real · Playwright **por clique**
**Target Platform**: Vercel (preview por ramo) + projeto Supabase `cqhpfuaweoyglhtrckcp` (preview e
Production no mesmo projeto, AMBIENTE-1)
**Project Type**: aplicação web (App Router)
**Performance Goals**: uma leitura a mais por tela que mostra execução (uma chamada às funções da M1, em
`Promise.all` com as de hoje); nenhum `await` em laço
**Constraints**: nada é apagado (regra 4); alerta, não bloqueio (regra 6); `lib/dominio/` sem I/O
(regra 9); "hoje" é São Paulo, passado explicitamente (FR-014.3); só tokens existentes; toda tela com
caminho clicável
**Scale/Scope**: 29 turmas · 228 linhas turma × disciplina · 2.510 fatos de CHD (2.163 aulas,
180 aplicações, 19 sessões, 148 vistas) · 108 atribuições · 181 instrutores · 13 rotas com mudança
própria, mais a faixa em todas (lista em `contracts/telas.md`)

## Constitution Check

*GATE antes da Fase 0; reavaliado na §9.*

| Princípio | Como o plan o cumpre | Veredito |
|---|---|---|
| **I. Fidelidade à Fase 1** | Cada item cita a origem: `RF-DSA-06`/`RF-PDF-01` (1.9), `RF-DSA-08` e o `FR-014` da spec 013 (1.12), `RN-INST-04`/`RF-INSTR-13` (1.13), `RF-INI-01` (1.14), `RF-DS-03` (1.2, *"contraste AA em ambos os temas"*). Os documentos de Fase 1 não são emendados; as decisões que mudam convenção estão listadas na §10 da spec | ✅ |
| **II. Regras de negócio** | A semana do curso, o andamento, a média semanal de reserva, o "só habilitado" e a ordem da grade vivem em `lib/dominio/`, com teste de unidade. Nenhuma regra do documento 04 muda: a `RN-DIST-02` é **aplicada** (1.13), a `RN-DIST-01` mantém a régua única de semana | ✅ |
| **III. Plataforma** | Sem pacote novo, sem ORM; Server Components; `"use client"` só nas folhas novas (olho da senha, diálogo de situação, recolhível do instrutor), declaradas nas listas das guardas de fronteira | ✅ |
| **IV. Histórico** | Nenhum dado tocado; nenhuma tabela apagada; as duas migrations são derivadas e reversíveis | ✅ |
| **V. Degradação e alerta** | Semana sem T → *"Semana N"* com aviso; erro da leitura de atribuições → aviso, não lista vazia; atraso e faixa continuam alerta | ✅ |
| **VI. Cirúrgico, por invariante** | Invariantes de igualdade (base = views de hoje, 29/29 e 228/228), casos que discriminam em pgTAP e e2e, reversão provada antes do PR. ⚠️ **Duas migrations num PR** — exceção ao *"uma fatia = uma migration coesa"*, justificada no *Complexity Tracking* e **aprovada por Bernardo em 17/10/2026** (P-2) | ⚠️ justificado e aprovado |
| **VII. Configuração sobre constante** | Feriados, regime, faixa docente e duração do curso continuam lidos do banco; nenhum número normativo novo no código | ✅ |
| **VIII. Rastreabilidade** | Commits `fix(<RF>)`/`feat(<RF>)`/`db(<RF>)` pela tabela da §6; pgTAP nomeados pelo item; spec e plan citam artefato e data | ✅ |
| **IX. Escopo** | Só o Bloco 1; observação de status, TA fora do DSA e arquivar ficam no Bloco 2 | ✅ |
| **X. Paridade** | Classificação item a item na §2 da spec; nada de funcionalidade de negócio nova | ✅ |
| **XI. O banco é a fronteira** | As funções da M1 são de **leitura**, `security invoker` (a RLS de quem lê vale), `execute` só para `authenticated`; por que RPC e não Server Action: a soma precisa da RLS e do banco, e a regra (andamento) continua em `lib/dominio/`. A troca de situação é Server Action com Zod; a recusa vem da RLS e é conferida no banco | ✅ |

**Gate:** passa, com a exceção do Princípio VI aprovada em 17/10/2026 (P-2).

## Project Structure

### Documentation (this feature)

```text
specs/016-correcoes-bloco-1/
├── spec.md
├── plan.md                         # este arquivo
├── research.md                     # R-1 a R-14
├── data-model.md
├── quickstart.md
├── plano-de-aplicacao-no-remoto.md # o rito do PR 3
├── contracts/
│   ├── migrations.md               # O DESENHO DAS DUAS MIGRATIONS (regra 9.4)
│   └── telas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
PR 1 — casca, entrada, listas e fichas
  components/faixa-de-ambiente.tsx · lib/ambiente.ts · app/layout.tsx · app/print/dsa/{loading,error}.tsx
  components/casca/{navegacao-lateral,painel-retratil}.tsx · lib/design/vocabulario.ts (par novo)
  app/(auth)/login/FormularioDeLogin.tsx · app/(app)/perfil/senha/FormularioDeSenhaNova.tsx
  components/ciaara/{filtro-avancado,botao-limpar-filtros,barra-de-acoes}.tsx · lib/navegacao/ (contagem)
  app/(app)/{turmas,cursos,instrutores,atividades,disciplinas}/Filtros*.tsx | GradeDeDisciplinas.tsx
  app/(app)/cursos/[curso]/{CabecalhoDoCurso,AcoesDeSituacao,AbasDoCurso,AbaGrade,page}.tsx · lib/navegacao/contrato.ts
  app/(app)/disciplinas/paineis/{PainelDeUnidades,PainelDeAvaliacoesDoCurriculo,ProporcaoDaCarga}.tsx · components/graficos/tipos.ts
  app/(app)/instrutores/[codigo]/page.tsx (+ recolhível novo)
  app/(app)/turmas/{FormularioDeTurma.tsx,[turma]/page.tsx (+ TrocarSituacao.tsx)} · lib/acoes/turma.ts · lib/validacao/turma.ts

PR 2 — DSA, papel e planilha
  lib/dominio/dsa/semana-do-curso.ts (novo, substitui numero-do-dsa.ts) · lib/dominio/dsa/{grade,grade-do-papel}.ts
  lib/dominio/dsa/planilha/{preenchimento,impressao,cronos,semanas}.ts · app/print/dsa/{documento.ts,DocumentoDoDsa.tsx}
  app/(app)/turmas/[turma]/dsa/{page.tsx,leitura.ts,NavegacaoDaSemana.tsx,DocumentoNaTela.tsx,FormularioDeLancamento.tsx}
  app/(app)/turmas/[turma]/dsa/planilha/leitura.ts · components/ciaara/grade-dsa.tsx
  app/(app)/atividades/FiltrosDeAtividades.tsx · tests/unidade/formato-de-data.test.ts (guarda reforçada)

PR 3 — banco e o que depende dele
  supabase/migrations/<carimbo>_execucao_ate_uma_data.sql (M1) · <carimbo>_janela_da_ch_prevista.sql (M2)
  supabase/tests/135_execucao_ate_uma_data.sql · 136_janela_da_ch_prevista.sql · lib/tipos/database.ts
  lib/dominio/{andamento-da-turma,media-semanal,so-habilitado}.ts
  app/(app)/inicio/{page,panorama}.ts(x) · app/(app)/turmas/{page.tsx,TabelaDeTurmas.tsx,[turma]/page.tsx,[turma]/consulta-de-avaliacoes.ts}
  app/(app)/disciplinas/consulta.ts · app/(app)/instrutores/[codigo]/{page,CargaDoInstrutor}.tsx
  scripts/provas/medir_bloco_1.sql (a medição do antes × depois, versionada)
```

**Structure Decision**: aplicação Next.js única, na estrutura de `docs/fase-2/24`. Regra nova em
`lib/dominio/`; leitura em Server Component; escrita em Server Action com Zod.

---

## 1. Os PRs — três, em sequência (decidido em 17/10/2026, P-1)

| PR | Ramo | Itens | Banco | O que Bernardo confere no preview |
|---|---|---|---|---|
| **1** | `fix/BLOCO-1-correcoes-de-tela` (este) | 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.10, 1.15 | não | faixa, lateral, olho da senha, filtros, página do curso, disciplinas, ficha do instrutor, trocar situação |
| **2** | `fix/BLOCO-1-dsa` | 1.5, 1.8, 1.9, 1.11, 1.12 | não | "Semana N de T" na tela, no papel e na planilha; aviso de duração na ficha; cartão; sugestão de instrutor; datas com ano no papel e na planilha. ⚠️ **Mesclado entre semanas** — sexta à noite ou fim de semana (P-5) |
| **3** | `db/BLOCO-1-execucao-e-ch-prevista` | 1.13, 1.14 | **M1 e M2** | `/inicio`, `/turmas`, ficha da turma, aba Avaliações e `/disciplinas` até hoje; CH prevista e "só habilitado" na ficha do instrutor |

**Por que três e não dois** (research R-1): (a) o DSA é usado todo dia e o 1.9 muda o número **do papel
assinado** — merece conferência própria; (b) os itens do DSA mexem nos mesmos arquivos (grade, leitura,
papel, planilha); (c) o 1.5 inteiro vai com o DSA, senão a guarda reforçada de datas reprova no PR 1;
(d) isola as suítes de ponta a ponta mais instáveis (`PEND-014-7`).

**Por que o PR 3 por último:** a marca *"só habilitado"* mora na ficha que o 1.10 reorganiza (PR 1) e
precisa da view corrigida. O PR 2 não depende do PR 3. Cada PR nasce da `main` atualizada depois do merge
do anterior.

## 2. Domínio primeiro — o que nasce antes da tela

| Módulo | PR | Regra | Testes de unidade |
|---|---|---|---|
| `lib/dominio/dsa/semana-do-curso.ts` (novo; `numero-do-dsa.ts` sai) | 2 | D-COR-1, Q-1, Q-3; `RF-DSA-06` | semana vazia **consome** número; virada do ano; início em quinta; T pela duração, pela turma mais longa, sem duração, sem os dois; N ≤ T; fora da janela; semipresencial; aviso de duração |
| `lib/dominio/dsa/grade.ts` | 2 | ordem estável; *"um lançamento nunca pode ficar escondido"* | dois lançamentos no mesmo TA, em duas ordens de entrada, mesmo resultado; o segundo em *"sem posição"* com o motivo |
| `lib/dominio/dsa/pre-preenchimento.ts` | 2 | `FR-014` da spec 013 (sem mudança de regra; ganha consumidor) | os de hoje, mais o degrau por disciplina com a lista em antiguidade |
| `lib/dominio/andamento-da-turma.ts` (+ `diaSeguinte`) | 3 | D-COR-2; `RF-INI-01` | U1, U2, U3, U4 e U7 reescritos; borda de hoje em sábado e em segunda; virada de mês e de ano no `diaSeguinte` |
| `lib/dominio/media-semanal.ts` (novo) | 3 | `RN-DIST-02` com a régua da `RN-DIST-01` | média cadastrada vence; sem semanas, CH ÷ semanas da janela; sem janela, nulo |
| `lib/dominio/so-habilitado.ts` (novo) | 3 | NQ-4 | habilitada sem atribuição no ano → marcada; atribuída em outro ano → marcada; atribuída no ano → não |

## 3. As migrations — resumo; o desenho inteiro está em `contracts/migrations.md`

| | M1 — executado até uma data | M2 — janela da CH prevista |
|---|---|---|
| Item | 1.14 | 1.13 |
| Objetos | **novos**: `vw_chd_por_fato`, `chd_da_turma_ate(p_ate)`, `execucao_por_disciplina_ate(p_ate, p_turma_id)` | **recriada**: `vw_instrutor_carga_prevista`, mesmas colunas |
| Quem lê | `/inicio`, ficha da turma, `/turmas`, tabela de disciplinas (ficha e `/disciplinas`), aba Avaliações | `vw_instrutor_carga_anual`, ficha e lista de instrutores |
| Não muda | `vw_carga_horaria_turma`, `vw_disciplinas_execucao`, DSA, planilha, tetos | tempos previstos, rateio, `semanas`, `media_semanal` |
| Caso que discrimina | pgTAP 135 (3 × 9 TA no mesmo dia); e2e com um lançamento futuro | pgTAP 136 (ano preenchido onde era nulo; linha da turma vence a disciplina) |
| Guarda | base sem corte = as duas views (medido 29/29 e 228/228) | colunas iguais (medido 0 diferenças); `security_invoker` mantido |
| Reversão | `drop` dos três objetos novos | `create or replace` com o corpo de `20260926005750` |
| Efeito medido | C-Ap-FR 2026 em atraso; 4 turmas perdem saldo; 19 disciplinas | 5 instrutores; o 15 vai de 114 a 271; o 13 ganha 4 semanas acima da faixa |

## 4. O fuso — "hoje" é São Paulo, nunca `current_date` (D20)

- **Hoje** é `hojeNaCiaara()` (`lib/formato/ano-corrente.ts`, `America/Sao_Paulo`), calculado no Server
  Component e passado como `p_ate` às funções da M1. **Amanhã** é `diaSeguinte(hoje)`, no domínio, por
  aritmética de calendário sobre `aaaa-mm-dd`.
- As funções **não têm valor padrão** para a data; o pgTAP 135 reprova `current_date`, `now()`,
  `current_timestamp` e `localtimestamp` no corpo delas, lido sem comentário (regra 9.1.1). Quem esquecer
  de mandar o dia ganha erro de chamada, não um número errado das 21h à meia-noite.
- Teste de unidade com o relógio às **23:30 em São Paulo** (que já é o dia seguinte em UTC): o andamento
  usa o dia de São Paulo.
- **Fica de fora, registrado:** `vw_cursos_regime_vigente` escolhe o regime vigente por `current_date`
  (o D20 original). Numa troca de regime, a escolha pode adiantar um dia entre 21h e meia-noite. Não é
  deste bloco.

## 5. Telas — o caminho de clique

Em `contracts/telas.md`, tela por tela, com rota, mudança, permissão e `data-slot`. Toda tela tocada é
alcançada por clique a partir do menu; nenhuma rota nova é criada.

## 6. Testes por item — chegando por clique

*Ponto de partida de todo e2e: `entrar(...)` (`tests/e2e/conta-de-teste.ts`) e o menu; `goto` só para o
login e para o ponto de partida.*

| Item | Commit | Unidade / pgTAP / RLS | E2e (por clique) | O caso que discrimina |
|---|---|---|---|---|
| 1.1 | `fix(BLOCO-1)` | texto da faixa por ambiente: `local`, `preview`, `producao`, ausente, desconhecido | `/login` → faixa e *"· ambiente local"*; menu → tela longa, rolar, faixa no topo; DSA → *Imprimir* → sem faixa (inclui `dsa-imprimir.spec.ts:114`) | com `producao` ou ausente, **sem** *"ambiente local"* |
| 1.2 | `fix(RF-DS-03)` | `contraste.test.ts` com o par novo, nos dois temas | menu → item com `aria-current` e fundo diferente da lateral, nos temas *Claro* e *Noturno* (clicados) | fundo do ativo ≠ fundo da lateral |
| 1.3 | `fix(BLOCO-1)` | — | `/login`: digitar, olho → `type="text"`, olho → `password`, entrar; primeiro acesso → `/perfil/senha` com olho nos dois campos | o botão não envia o formulário |
| 1.4 | `fix(BLOCO-1)` | contagem fora do padrão (`situacao=ativo` não conta); guardas `filtro-avancado` e `estado-efemero-intacto` | `/turmas`, `/cursos`, `/instrutores`, `/atividades`, `/disciplinas` pelo menu: recolhido, *"Filtros"* → 2 filtros → *"Filtros 2"* → limpar. Ajustes em `instrutores.spec.ts`, `turmas-lista.spec.ts`, `estado-na-url.spec.ts` | tela limpa em `/cursos` **sem** número (hoje mostra 1) |
| 1.5 | `fix(BLOCO-1)` | `formato-de-data.test.ts` reforçado (dois pedaços com `padStart`, `.slice(0, 5)` de data, `Intl.DateTimeFormat` fora do ponto único); planilha (IMPRESSÃO, CRONOS, semanas) com ano | menu *Atividades* → filtros de data; DSA → *Imprimir* → dias com ano | a guarda reprova com cada ocorrência de volta (defeito deliberado) |
| 1.6 | `fix(BLOCO-1)` | contrato: padrão `sobre`, um dono só | menu *Cursos* → curso → aba *Sobre o Curso*, barra com três botões de mesma altura; *Nova turma* leva ao formulário; `/inicio` → cartão → aba Grade | entrar sem `?aba=` abre *Sobre* |
| 1.7 | `fix(BLOCO-1)` | `agruparEmOutras` (4 + *"Outras (N)"*) | menu *Disciplinas* → curso → expandir → UEs sem campo; *Editar* numa UE → gravar → valor novo; pizza com *"Outras"* | 0 campos editáveis antes de *Editar* |
| 1.8 | `fix(RF-DSA-03)` | — | turma → *Abrir o DSA* → cartão: nome antes do código; técnica em `cartao-tecnica` | ordem nome → código |
| 1.9 | `fix(RF-DSA-06)` | `semana-do-curso.test.ts`; planilha (fórmula = função) | turma semeada 35/37 → ficha (aviso de duração) → *Abrir o DSA* → *Ir para a semana do dia* → *"Semana 28 de 37"* → *Imprimir* → o mesmo; auxiliar `percurso-do-dsa.ts:27` ajustado | semana vazia no meio: hoje 26, depois 28 |
| 1.10 | `fix(BLOCO-1)` | — | menu *Instrutores* → instrutor → 0 campos editáveis; barra Editar · Desativar · Excluir; *Editar* → gravar; disciplina → avaliações do currículo em leitura | 0 campos antes de *Editar* (hoje 207) |
| 1.11 | `test(RF-DSA-03)` | planilha: dia com 7 TA na entrada | turma semeada (regime 7, 4 de manhã, bloco 1–7) → DSA → 7 TA na tela (4 + 3) e no papel | — (regressão) |
| 1.12 | `fix(RF-DSA-08)` | `grade.test.ts` (mesmo TA, duas ordens); `pre-preenchimento` com o degrau por disciplina; leitura com filtro errado → aviso | turma semeada com atribuição por disciplina → DSA → tempo vazio → disciplina e UE → instrutor preenchido | o filtro antigo (`turma_id`) reprova o caso |
| 1.13 | `db(RN-INST-04)` | `media-semanal`, `so-habilitado`; pgTAP **136**; `rateio-da-view.test.ts` sem mudança | menu *Instrutores* → instrutor semeado com atribuição sem período na disciplina → CH prevista inclui; habilitação sem atribuição → *"só habilitado"* | pgTAP 136 casos 1–3 reprovam antes |
| 1.14 | `db(RF-INI-01)` | `andamento-da-turma` (amanhã); pgTAP **135**; RLS `execucao-ate.test.ts` (alcance restrito × Admin; `anon` sem `execute`) | semente com **um lançamento futuro** → menu *Início* (saldo não o conta) → menu *Turmas* (colunas novas) → turma (andamento, disciplinas, aba *Avaliações*) → menu *Disciplinas* → curso → turma; e o DSA da semana dele **o conta** | o e2e reprova com o código de hoje |
| 1.15 | `fix(BLOCO-1)` | Zod de `trocarSituacaoDaTurma`; edição sem `status`; RLS: `UPDATE` de perfil sem `turmas/editar` → zero linhas, conferido no banco | Admin **e** Encarregado: menu *Turmas* → turma → *Trocar situação* → confirmação → recarregar → selo; perfil `visualizacao`: sem botão; criação continua com o campo. Corrigir `turmas.spec.ts:297-313`, `:391-412` e `rls/cursos-e-turmas.test.ts:564-576` | o caso novo reprova sem gravar (o atual passaria) |

**Defeitos deliberados antes de cada PR** (para provar que os testes discriminam): faixa voltando a sumir
em Production; contagem voltando a contar o padrão; `numeroDoDsa` CRONOS de volta; filtro `turma_id` de
volta; `current_date` dentro da função; janela da CH prevista voltando à disciplina.

## 7. O rito do remoto (PR 3)

Em `plano-de-aplicacao-no-remoto.md`: portão 9.4 → CI verde → reversão provada em base descartável →
backup (`--somente-copia`, arquivo citado) → **remedição sobre o backup** (se mudar, volta a Bernardo) →
dry-run só com M1 e M2 → `db push` → conferência só de leitura (migrations N e N, impressão digital igual,
`security_invoker`, funções sem padrão e sem `anon`, 0 policies de `DELETE`, a medição refeita no remoto)
→ Production respondendo → merge.

## 8. Riscos

- ⚠️ **O `/inicio` passa a acusar a C-Ap-FR 2026** (medido). É o efeito da D-COR-2, e está dito antes do
  PR 3 para não parecer defeito.
- ⚠️ **A M2 aparece na Production antes do merge** (mesmo projeto): a CH prevista dos 5 instrutores muda
  na ficha de hoje assim que a migration é aplicada. O código da `main` continua funcionando (mesmas
  colunas).
- ⚠️ **O número do DSA muda no meio de um curso** quando o PR 2 entra: um DSA desta semana pode já ter
  saído com *"Nº 26"* e a reimpressão sair *"Semana 28 de 37"*. **Decidido (P-5):** o PR 2 é mesclado
  entre semanas — sexta à noite ou fim de semana.
- **A cópia envelhece:** a medição é de 17/10/2026, 00:57. O rito remede sobre o backup do dia.
- **Fórmula da planilha:** o número passa a ser diferença de datas ÷ 7 + 1 — mais simples que a de hoje,
  mas tem de continuar no vocabulário do Excel 2007 (`DP-2` da spec 015) e ser provada contra a função.
- **Faixa fixa** muda a altura útil: a lateral fixa e as telas de altura cheia descontam a faixa; o papel
  não a mostra nem no carregamento.
- **Suíte de ponta a ponta instável sob carga** (`PEND-014-7`): toda reprovação é isolada e repetida antes
  de ser chamada de instável.
- **Divergência anterior, não corrigida:** `vw_disciplinas_execucao` faz `coalesce` **independente** para
  início e término do período efetivo (pode misturar fontes); a M2 não repete isso (research R-4).

## 9. Constitution Check — reavaliação depois do desenho

O desenho não mudou o veredito da tabela inicial: nenhuma tabela, nenhuma policy, nenhum dado; as duas
migrations são derivadas, com `security_invoker`, reversíveis e com caso que discrimina. A exceção
do Princípio VI foi aprovada em 17/10/2026 (P-2).

### Complexity Tracking

| Exceção | Por que é preciso | A alternativa mais simples foi recusada porque |
|---|---|---|
| **Duas migrations num PR** (Princípio VI) — ✅ **aprovada por Bernardo Villas Boas em 17/10/2026 (P-2)** | M1 e M2 são independentes entre si e cada uma é coesa; vão juntas porque compartilham o rito do remoto (um backup, um dry-run, uma conferência) e a conferência de Bernardo das telas de execução e de instrutor | **uma migration com as duas** juntaria dois assuntos sem relação (não seria coesa); **dois PRs de banco** dobrariam o rito sem ganho de reversão, que já é por migration |
| **A composição da CHD em três lugares** (as duas views de hoje e a base nova) — ✅ **aceita em 17/10/2026 (P-3); unificar é a `PEND-016-1`** | a base é o único jeito de cortar por data sem recriar as views do DSA e dos tetos | refatorar as views para lerem da base elimina a cópia, mas recria duas views com dependentes e toca o DSA (P-3). A cópia é guardada por invariante pgTAP: base = views, sempre |

## 10. Dúvidas do plan — ✅ **AS CINCO RESPONDIDAS por Bernardo Villas Boas em 17/10/2026**, todas pela recomendação (registro na §0)

### P-1 — Quantos PRs, e em que ordem? · ✅ **RESPONDIDA: opção A**
| Opção | Resposta | Implicações |
|---|---|---|
| A | **Três**: tela (PR 1) → DSA (PR 2) → banco (PR 3) | conferência própria do DSA; o PR 3 nasce depois da ficha do instrutor reorganizada |
| B | **Dois**, como o pedido: tela e DSA juntos, depois banco | uma conferência com doze itens e o DSA dentro |
| C | Três, com o banco antes do DSA: 1 → 3 → 2 | os números do `/inicio` e da ficha corrigidos antes; a numeração do DSA por último |
| D | Quatro: uma migration por PR | o rito do remoto duas vezes |

**Recomendação: A.**

### P-2 — Duas migrations no mesmo PR (exceção ao Princípio VI)? · ✅ **RESPONDIDA: opção A**
| Opção | Resposta | Implicações |
|---|---|---|
| A | **Aceitar**, com a justificativa do *Complexity Tracking* | um rito, duas reversões independentes |
| B | Uma migration só com as duas | dois assuntos num arquivo; a reversão de uma desfaz a outra |
| C | Dois PRs de banco | o rito duas vezes |

**Recomendação: A.** A constituição pede a decisão registrada e datada.

### P-3 — A composição da CHD fica em três lugares, guardada por invariante, ou numa só? · ✅ **RESPONDIDA: opção A**
| Opção | Resposta | Implicações |
|---|---|---|
| A | **Base nova + pgTAP de igualdade** com as duas views de hoje | as views do DSA e dos tetos não são tocadas; quem mudar uma sem as outras reprova no 135 |
| B | Refatorar `vw_carga_horaria_turma` e `vw_disciplinas_execucao` para lerem da base | uma composição só; recria duas views com dependentes (`vw_conformidade_tetos` exige a ordem das colunas) e mexe na leitura do DSA |

**Recomendação: A** neste bloco; a B pode ser uma fatia própria depois.

### P-4 — Na lista `/turmas`, o Saldo aparece para turma que não está ativa? · ✅ **RESPONDIDA: opção A**
**Contexto:** o andamento calcula saldo para toda turma com término e regime; numa turma concluída, a
capacidade é zero e o saldo é o restante com sinal negativo (a ficha da C-Exp-Obs-ME 2026, concluída,
mostra hoje *"−1 TA"*).

| Opção | Resposta | Implicações |
|---|---|---|
| A | **Progresso** para todas; **Saldo** só para **ativa e planejada**; *"—"* para concluída e cancelada | a coluna não acusa turma encerrada; a ficha continua mostrando tudo |
| B | Saldo para todas | concluída com restante aparece negativa na lista |
| C | As duas colunas só para ativa | planejada sem progresso nem saldo |

**Recomendação: A.**

### P-5 — Quando o PR 2 (numeração do DSA) entra em Production? · ✅ **RESPONDIDA: opção A**
**Contexto:** o merge muda o número que sai no papel: o DSA de uma semana pode ter sido impresso com
*"Nº 26"* e a reimpressão sair *"Semana 28 de 37"*.

| Opção | Resposta | Implicações |
|---|---|---|
| A | **Entre semanas** — depois do DSA da sexta e antes do da segunda | nenhuma semana sai com dois números |
| B | Assim que aprovado | pode haver uma semana com os dois números no papel |

**Recomendação: A.**

---

## O que este plan NÃO contém, de propósito
- **Tasks** (`/speckit-tasks`) e implementação.
- Migration no repositório e qualquer escrita no remoto: o desenho espera a aprovação (regra 9.4).
- Os itens dos Blocos 2 a 6.
