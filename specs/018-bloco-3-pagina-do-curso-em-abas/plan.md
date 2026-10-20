# Implementation Plan: Bloco 3 — a página do curso em abas

**Branch**: `feat/BLOCO-3-pagina-do-curso-em-abas` | **Date**: 19/10/2026 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/018-bloco-3-pagina-do-curso-em-abas/spec.md` (C-1 a C-19 já decididas) e `triagem.md`.

## Summary

Seis abas na página do curso. **Disciplinas** reaproveita a grade de `/disciplinas` (que vira só redirecionamento) e
ganha *Nova disciplina*; o menu perde a entrada. **Avaliações** passa a desenhar só o previsto do currículo, sem
turma. **Atividades** recebe os limites de AEC/TAD/TR (que hoje ficam acima das abas), a referência do Estudo
Individual e o catálogo de tipos por categoria. **Horários** lista os **regimes nomeados** do curso — registro novo —
e as vigências do curso só para ler. A **turma** escolhe um regime (coluna nova, nulável), e o DSA, os alertas, a
cascata, o dia parado e o saldo dela passam a usá-lo; sem escolha, tudo igual. **Uma migration**, que só acrescenta
(tabela nova, coluna nova nulável, funções novas e a view dos dias parados preferindo o regime da turma), com o
resultado igual **provado** sobre a cópia do remoto.

## Technical Context

**Language/Version**: TypeScript 5 (`strict`, `exactOptionalPropertyTypes`), Next.js 16.3.3, React 19.2.8; SQL
(PostgreSQL do Supabase)
**Primary Dependencies**: `@supabase/ssr`, `@supabase/supabase-js`, `nuqs`, Zod, Radix/shadcn — **nenhum pacote novo**
**Storage**: Supabase PostgreSQL — uma migration (`regimes_de_horario`, `turmas.regime_de_horario_id`, três funções de
apoio, dois gatilhos de guarda e `vw_dias_parados_turma` recriada)
**Testing**: Vitest (unidade e invariantes com sessão real), pgTAP, Playwright por clique
**Target Platform**: Vercel (preview por ramo; Production no mesmo projeto Supabase, AMBIENTE-1)
**Project Type**: aplicação web (App Router)
**Performance Goals**: as abas novas carregam só quando abertas (o padrão da aba Avaliações hoje: leitura condicionada
a `aba`); nenhuma consulta por linha
**Constraints**: "hoje" sempre de `hojeNaCiaara()` (nenhum `current_date` novo; D20); nenhuma policy de `DELETE`;
gatilho de `turmas` sem a palavra *status* no corpo (pgTAP 101 e 138)
**Scale/Scope**: 24 cursos, 29 turmas, 29 vigências de regime ativas, 8 configurações de horário (cópia
`remoto-20261019-165417.sql`)

## Constitution Check

*GATE antes da Fase 0; reavaliado na §9.*

| Princípio | Como o plan o cumpre | Veredito |
|---|---|---|
| **I. Fidelidade à Fase 1** | Cada item cita a origem: Bloco 3 do plano, a resposta 6 da triagem, `RF-HOR-02`/`03`/`05` (regime curricular, pares por curso, sem reinterpretar o passado), `RF-CURSO-06` (alerta do curso), `RF-MATERIAS-01` (cadastro de disciplinas), `RN-MAT-04` (capacidade pela modalidade) | ✅ |
| **II. Regras de negócio** | Regime efetivo da turma, travas e rótulos em `lib/dominio/`, com teste; nenhuma regra do documento 04 muda — a `RN-MAT-04` continua decidindo pela modalidade; o 9º TA continua alerta (`RF-HOR-03.1`, `RN-DEG-02`) | ✅ |
| **III. Plataforma** | Sem pacote novo; Server Components; `"use client"` só nas folhas novas, declaradas em `fronteira-das-telas.test.ts` | ✅ |
| **IV. Histórico** | Nenhum regime é apagado (inativa); a quantidade e a duração do regime são imutáveis; o horário de regime em uso com lançamento não muda; a escolha da turma trava no primeiro lançamento | ✅ |
| **V. Degradação e alerta** | Sem regime escolhido, o comportamento antigo inteiro; leitura que falha não cai num regime inventado | ✅ |
| **VI. Cirúrgico, por invariante** | Uma migration coesa; impressão digital das views antes × depois sobre a cópia (SC-009); casos que discriminam em pgTAP, RLS e e2e; reversão provada | ✅ |
| **VII. Configuração sobre constante** | Os regimes são **dado** do curso (`RF-HOR-03`: os pares autorizados por curso são dado, nunca constante) | ✅ |
| **VIII. Rastreabilidade** | Commits `db(BLOCO-3)`/`feat(BLOCO-3)`/`fix(BLOCO-3)`/`test(BLOCO-3)`; pgTAP e RLS nomeados por item | ✅ |
| **IX. Escopo** | Só o Bloco 3; troca de regime por semana e o editor do catálogo de horários ficam fora (Out of scope) | ✅ |
| **X. Paridade** | Classificação na §2 da spec; a regra nova é a resposta 6 da triagem de Bernardo | ✅ |
| **XI. O banco é a fronteira** | As recusas vêm do banco: permissão (`42501`), regime curricular imutável, regime em uso, escolha travada, regime de outro curso (FK composta) | ✅ |

**Gate:** passa.

## Project Structure

### Documentation (this feature)

```text
specs/018-bloco-3-pagina-do-curso-em-abas/
├── spec.md · triagem.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── contracts/migrations.md · contracts/telas.md
├── checklists/requirements.md
├── plano-de-aplicacao-no-remoto.md · progresso-implement.md · roteiro-de-conferencia.md · reversao.sql
```

### Source Code (repository root)

```text
lib/dominio/regime-da-turma.ts          # regime efetivo, TA do dia, rótulo do regime (novo, puro)
lib/validacao/regime-de-horario.ts      # Zod do regime nomeado (novo)
lib/validacao/turma.ts                  # + regime_de_horario_id na edição
lib/acoes/regime-de-horario.ts          # criar, editar, inativar/reativar (novo)
lib/acoes/regime-do-dia.ts              # TA do dia da turma no servidor (novo; dsa.ts e dia-parado.ts)
lib/acoes/{disciplina,unidade-ensino,itens-do-curriculo}.ts   # + revalidar a página do curso
lib/navegacao/{contrato,menu}.ts        # aba nova, params da aba Disciplinas; menu sem Disciplinas
app/(app)/cursos/[curso]/page.tsx · AbasDoCurso.tsx           # seis abas, leitura por aba
app/(app)/cursos/[curso]/{AbaDisciplinas,AbaAvaliacoes,AbaAtividades,AbaHorarios}.tsx
app/(app)/cursos/[curso]/{RegimesDoCurso,FormularioDeRegime}.tsx              # folhas da aba Horários
app/(app)/disciplinas/{page.tsx,GradeDeDisciplinas.tsx}       # redireciona; a grade serve à aba
app/(app)/turmas/FormularioDeTurma.tsx · [turma]/page.tsx     # o campo Regime de horário
app/(app)/turmas/[turma]/dsa/{leitura,consulta}.ts            # o regime da turma no relógio
app/(app)/{turmas,inicio}/…                                    # o regime efetivo no saldo
supabase/migrations/<carimbo>_regimes_nomeados_por_curso.sql
supabase/tests/142_regimes_nomeados.sql
tests/…                                                        # ver §6
```

**Structure Decision**: a aplicação web única que já existe; a pasta `app/(app)/disciplinas/` **fica** — a ficha da
turma importa dela (`consulta.ts`, `PainelDePeriodo`, `PainelDeInstrutores`) — e a página dela passa a só redirecionar.

## 1. Um PR, uma migration, merge depois da conferência

O DSA de toda turma sem regime escolhido — todas as 29 de hoje — sai **idêntico** no papel e na numeração (FR-007.1,
C-19), então o merge segue a conferência de Bernardo, sem esperar a virada de semana.

## 2. Domínio primeiro

- `lib/dominio/regime-da-turma.ts`: `regimeEfetivo(regimeDoCurso, regimeDaTurma)` (o `RegimeDoCurso` do andamento com
  os TA presenciais trocados pelos do regime da turma; o limite EAD intacto — `RN-MAT-04`); `temposDoDia(...)` (o
  regime da turma, senão o padrão do curso, senão a reserva atual); `rotuloDoRegime(regime)` (*"Regime B — 9 TA de
  45 min"*); e as frases das recusas.
- Os testes nascem vermelhos (o módulo não existe) e cobrem: sem regime = o de antes; com regime = os TA dele; EAD
  ignora o regime; a frase de cada recusa.

## 3. A migration — resumo; o desenho inteiro está em `contracts/migrations.md`

Uma só, que **acrescenta**: a tabela `regimes_de_horario` (com código gerado, RLS, auditoria, guarda); a coluna
`turmas.regime_de_horario_id` (nulável, FK composta com o curso); as funções `app.turma_tem_lancamento_no_dsa`,
`app.regime_escolhivel` e `app.regime_em_uso_com_lancamento`; o gatilho de guarda da escolha em `turmas`; e
`vw_dias_parados_turma` recriada preferindo o regime da turma. Com a coluna vazia em toda turma, o resultado de
`vw_dias_parados_turma` (e de `vw_carga_horaria_turma`, que lê dela) é **o mesmo** — provado sobre a cópia (SC-009).

## 4. O fuso

Nada novo depende de data do servidor. As travas olham **existência** de lançamento (não data). A capacidade segue
`hojeNaCiaara()`, passado por quem chama, como hoje.

## 5. Telas — o caminho de clique (detalhe em `contracts/telas.md`)

Menu *Cursos* → curso → aba. *Disciplinas*: a grade do curso, o detalhe por linha e *Nova disciplina*. *Avaliações*:
o previsto por disciplina. *Atividades*: os limites, a referência do EI e o catálogo. *Horários*: os regimes nomeados
(com *Novo regime*, *Editar*, *Inativar*) e as vigências do curso (com o caminho para *Editar curso*). A turma escolhe
o regime em *Editar turma*, na ficha.

## 6. Testes por item — chegando por clique

| Item | Unidade | pgTAP | RLS (sessão real) | E2E (por clique) |
|---|---|---|---|---|
| Aba Disciplinas, menu, redirecionamento | contrato de parâmetros, menu, entrada ativa, toda tela tem caminho | — | — | `curso-abas.spec.ts` (abas na ordem; Disciplinas: criar e editar com o banco); `disciplinas.spec.ts` chegando pelo curso; o redirecionamento |
| Avaliações só previsto | o previsto sem turma | — | — | o curso com turma em andamento não mostra nada de turma |
| Atividades | a origem dos limites (já coberta por `limite-maximo`) | — | — | os limites com a origem |
| Regimes nomeados | `regime-da-turma`, Zod do regime | 142: estrutura, imutáveis, guarda do horário em uso, a escolha travada, FK de outro curso, a view igual | quem cria/edita/inativa e quem não (`42501`), o caso que discrimina | criar regime, escolher na turma, DSA com os tempos do regime, outra turma igual |

## 7. O rito do remoto

`plano-de-aplicacao-no-remoto.md`: backup citado → impressão digital das views sobre a cópia, antes e depois →
dry-run só com a migration → `supabase db push --linked` (o pedido de permissão aparece para Bernardo) → conferência
só de leitura (migrations iguais, impressão digital do esquema, `security_invoker`, zero policy de `DELETE`, os dois
retratos datados, Production).

## 8. Riscos

| Risco | Contenção |
|---|---|
| A view dos dias parados mudar de resultado | `create or replace` com as mesmas colunas e `with (security_invoker = true)` (gotcha 10); impressão digital das views antes × depois sobre a cópia |
| O gatilho de `turmas` acusar o pgTAP 101/138 (*status* no corpo) | a lógica mora em funções de apoio; o corpo do gatilho só as chama |
| Mudar uma linha da turma e o gatilho recusar sem querer (o formulário manda o mesmo valor) | a guarda compara `old` e `new` (`is distinct from`) |
| A aba Disciplinas quebrar a ficha da turma, que importa da pasta | a pasta fica; só a página vira redirecionamento |
| Testes de ponta a ponta que entravam pelo menu *Disciplinas* | trocados pelo caminho pelo curso, num auxiliar só |
| A guarda *toda tela tem caminho* ficar cega para `/disciplinas` | a rota de redirecionamento entra na lista do que não é tela |

## 9. Constitution Check — reavaliação depois do desenho

Sem mudança: o desenho cumpre os onze princípios; a migration é uma, coesa, e só acrescenta.

### Complexity Tracking

Nenhuma exceção.

## 10. Dúvidas do plan — decididas pela recomendação (fluxo `/corrigir`), para a conferência no fim

- **P-1 · A grade de `/disciplinas` muda de pasta?** → **Não**: fica onde está e serve à aba (a ficha importa dela);
  a página antiga só redireciona.
- **P-2 · Como a turma guarda o regime?** → **Coluna nova em `turmas`** com FK composta `(regime, curso)` — o banco
  garante "do próprio curso". Alternativa: tabela de escolha com vigência (a troca no tempo ficou para depois).
- **P-3 · Onde mora a trava "turma com lançamento"?** → **Função de apoio** (`app.turma_tem_lancamento_no_dsa`),
  chamada pelo gatilho de `turmas` e pela guarda do regime — uma lista só de lançamentos.
- **P-4 · Quem inativa?** → `horarios.desativar`, conferido no gatilho de guarda quando a situação muda (policy não
  vê `OLD`, gotcha 4).
- **P-5 · O TA do dia nas ações do DSA** → um auxiliar de servidor só (`lib/acoes/regime-do-dia.ts`) para os alertas,
  a cascata e o dia parado, em vez de três leituras de `vw_cursos_regime_vigente`.
- **P-6 · O DSA lê o regime da turma como?** → na mesma rodada de `lerPeriodoDoDsa`, uma leitura da turma com o regime
  embutido; ele vira a vigência da semana (`vigente = regimeDaTurma ?? exceção ?? padrão`) e entra na lista de
  configurações do catálogo.
