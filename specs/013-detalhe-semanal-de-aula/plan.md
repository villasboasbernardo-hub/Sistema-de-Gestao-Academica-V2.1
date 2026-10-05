# Implementation Plan: Detalhe Semanal de Aula (DSA)

**Branch**: `feat/EPICO-6-detalhe-semanal-de-aula` | **Date**: 05/10/2026 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/013-detalhe-semanal-de-aula/spec.md`, clarificada em 05/10/2026 (18 respostas), e as
diretrizes de Bernardo Villas Boas para este plan: a ordem **PR 0 → PR B → PR 1 → PR 2 → PR 3 → PR 4 →
PR 5** (o PR 6 fica fora), o rito completo no PR B, o relógio como **dado** antes do PR 3, nenhuma
biblioteca sem medir, `V-1` a `V-8` como backlog, e as dúvidas **em um lote ao fim** (§10).

> **Antes desta página:** `estado-atual.md` (o que existe, medido), `praticas-da-planilha.md` (o que a
> operação faz), `spec.md` (o que entra). Esta página diz **como** e **em que ordem** — e cada
> decisão de desenho cita a medição que a sustenta, em `research.md`.

---

## Summary

Substituir a planilha-por-turma do DSA por uma grade **dia × TA** lida do regime vigente na data,
com lançamento em bloco de **no máximo quatro decisões**, impressão em **uma página A4 paisagem** com
assinaturas resolvidas por vigência, conflito entre **todas** as turmas sem vazar o DSA alheio, e
exclusão sempre lógica. Sete PRs: **toda regra nasce pura em `lib/dominio/dsa/` (PR 0)**, o banco
muda **uma vez só (PR B)**, e as cinco fatias de tela entram na ordem em que uma lê a anterior.

⚠️ **Quatro coisas que este plan mede e a spec ainda não dizia:**

1. **O gatilho `conferir_vigencia_nova` RECUSA vigência que comece em data ≤ ao último lançamento
   do curso** (`vigencia_reinterpretaria_lancamento`). Logo a correção do relógio (`Q-6`) é
   **prospectiva**: nos seis cursos com lançamento ela só pode valer a partir de **08/08/2026** (quatro
   deles), **13/08** (C-Esp-ME) e **15/08** (C-Espc-FR). As semanas anteriores seguem com o relógio
   do catálogo — e isso é a `RN-2027-09` funcionando, não limitação.
2. **Nenhum gatilho recusa duração ou contagem diferentes numa vigência NOVA** — medido: dos cinco
   porteiros de vigência, só `registrar_vigencia_regime` e `corrigir_vigencia_regime` citam
   `ta_duracao_min`, e nenhum deles levanta exceção por isso. A imutabilidade da `RF-HOR-02` protege
   o `UPDATE` da linha, não o encadeamento. **O 50→45 do C-Ap-HN e do C-Ap-FR cabe numa vigência.**
3. **A tela de vigência já grava os sete campos do relógio** (`esquemaDeVigencia`: `tipo_regime`,
   `vigente_de`, `regime_tempos`, `ta_duracao_min`, os dois intervalos, as duas horas de início).
   **A correção da `Q-6` não precisa de código nem de migration** — é cadastro, pela tela, e é seu
   (§7).
4. **`app.fn_regime_vigente(curso, data, tipo)` já existe** e resolve pela regra certa (`vigente_de <=
   data`, maior primeiro, `status = 'ativo'`). O domínio puro recebe a linha que ela devolve; a
   resolução por data **não é reimplementada** em TypeScript.

---

## Technical Context

**Language/Version**: TypeScript `strict` · Next.js **16.3.3** (App Router, `proxy.ts`) · React 19.2 ·
Node 24 no CI
**Primary Dependencies**: as **13** de produção já instaladas — `@supabase/ssr`, `@supabase/supabase-js`
2.112.4, `nuqs`, `zod`, `radix-ui`, `recharts`, `lucide-react`, `next-themes`, `cva`, `cn`. ⚠️ **Nenhuma
nova** — medido antes de decidir (§4 de `research.md`)
**Storage**: Supabase PostgreSQL — as três tabelas de lançamento **existem**; **uma** migration (PR B)
**Testing**: Vitest (domínio e guardas) · pgTAP (`supabase/tests/116_*.sql`) · sessão real em
`tests/invariantes/rls/dsa.test.ts` · Playwright **por clique**, porta 3100
**Target Platform**: Vercel (preview por ramo; Production por exceção `FR-016.1`); **preview e
Production são o MESMO projeto Supabase** — por isso o PR B tem rito
**Project Type**: aplicação web, Server Components por padrão, **duas** folhas de cliente novas
**Performance Goals**: a semana abre com **uma rodada** de `Promise.all` (6 leituras independentes,
nenhuma dentro de laço); a maior turma tem **45 TA/semana**; nada a otimizar antes de medir
**Constraints**: zero `"use client"` em `page.tsx`/`layout.tsx` · zero import de plataforma em
`lib/dominio/` · a grade rola na horizontal **sozinha**, o `body` nunca · exclusão **lógica** · conflito
**nunca** bloqueia · TFM > 6 TA/semana **sempre** bloqueia
**Scale/Scope**: 24 cursos · 28 turmas (7 ativas) · 1.566 aulas + 188 avaliações + 664 atividades
no remoto · 5 configurações de horário · 2 responsáveis (GERAL) · **oito** rotas/telas novas ou
tocadas

---

## Constitution Check

*GATE: avaliado antes da pesquisa; reavaliado depois do desenho (§9).*

| Princípio | Como este plan o atende | Estado |
|---|---|---|
| **I. Fidelidade à Fase 1** | cada `FR-` da spec cita `RF-`/`RN-` de origem; os sem origem (`SC-017`, `H8`) estão marcados **NOVIDADE** e dois deles ficaram **fora** (PR 6) | ✅ |
| **II. Preservação de regras** | nenhuma `RN-` é alterada. A **única** mudança de restrição — a isenção da catraca de UE — é **nominal e delimitada** (`curriculo_modelo = 'competencias'` ou `sem_unidades_ensino`), decidida por Bernardo na `Q-1`, e não altera o documento 04 | ✅ com decisão nominal |
| **III. Plataforma** | nenhum pacote novo; Server Components; Server Action com Zod na primeira linha, **mesmo esquema nos dois lados**; estado na URL via `nuqs` | ✅ |
| **IV. Integridade do histórico** | mover é `UPDATE` do mesmo `id`; exclusão é `status`; **zero** policy de `DELETE`; o relógio corrigido é **vigência nova**, e o gatilho impede reinterpretar o passado | ✅ |
| **V. Degradação segura** | curso sem regime → grade sem relógio com aviso; lançamento sem posição → faixa própria; assinatura sem responsável → linha em branco; recusa do banco → frase em português (`traduzirRecusa`) | ✅ |
| **VI. Mudança cirúrgica** | **uma** migration, com prova de reversão por `pg_dump` antes/depois; as views recriadas **repetem** `security_invoker` e a asserção I-13 (`010_estrutura.sql:201-205`) já reprova se faltar | ✅ |
| **VII. Configuração sobre constante** | teto de TFM (6), teto recomendado (25), TA do sábado (5), sigla das técnicas → `config_parametros`/`config_listas`; **nenhum** número desses vai para código | ✅ |
| **VIII. Rastreabilidade** | cada módulo de `lib/dominio/dsa/` abre com o `RN-` e a citação literal; cada caso de teste nomeia o critério | ✅ |
| **IX. Contenção de escopo** | fora: Épicos 7, 8, 10, 12; nota/média (`RNF-NORM-06`); reserva de sala (`RF-CRONOS-10`); PR 6 | ✅ |
| **X. Paridade antes de novidade** | o PR 6 (ALT, reposição) **não está neste plan**; sábado entrou **por decisão** (`Q-4`) e é dado da operação medida, não invenção | ✅ |
| **XI. O banco é a fronteira** | toda escrita passa por RLS com `app.pode` + `app.alcanca_turma`; a função de conflito é `SECURITY DEFINER` **com porteiro que falha fechado** (`coalesce(…, false)`, gotcha 15) e devolve o fato, não a linha alheia | ✅ |

**Violações a justificar: nenhuma.** O *Complexity Tracking* (§8) registra as **duas** folhas de
cliente, que não são violação — são a exceção que o `RF-DSA-07` declara.

---

## Project Structure

### Documentation (this feature)

```text
specs/013-detalhe-semanal-de-aula/
├── spec.md                       # clarificada, 18 respostas
├── estado-atual.md               # medido
├── praticas-da-planilha.md       # a operação de hoje
├── plan.md                       # este arquivo
├── research.md                   # Fase 0 — as decisões de desenho e por quê
├── data-model.md                 # Fase 1 — a migration do PR B, o "bloco" e o contrato do Épico 12
├── quickstart.md                 # Fase 1 — como validar cada PR
├── contracts/
│   ├── parametros-dsa.md         # a URL: semana, ano, sabado
│   ├── lancamento.md             # a entrada da Server Action = o bloco do Épico 12
│   ├── conflito.md               # a função com porteiro: o que devolve e o que NÃO devolve
│   └── impressao.md              # o documento, coluna a coluna, contra a §1.2 da prática
├── plano-de-aplicacao-no-remoto.md   # nasce no PR B, com o backup citado
└── tasks.md                      # /speckit-tasks — NÃO é criado aqui
```

### Source Code (repository root)

```text
lib/dominio/dsa/                  # PR 0 — PURO. Primeira subpasta de lib/dominio/ (coberta pelas guardas, medido)
├── horario-do-bloco.ts           # relógio de um TA e de um bloco, com quebra no almoço (RF-HOR-04/06, RN-CONF-02)
├── grade.ts                      # a matriz dia × TA a partir dos fatos; a faixa "Sem posição"; o sábado
├── conflitos.ts                  # RN-CONF-01: sobreposição + mesmo instrutor/fiscal; sala como secundário
├── tetos.ts                      # RN-DIST-03: TFM rígido, fim de curso sem teto, 25 recomendado; TA excepcional
├── capacidade.ts                 # RN-EVT-02: TA da semana descontando feriado dia_inteiro
├── situacao.ts                   # RF-DSA-05 / RN-CRONOS-03: por disciplina e por UE, até a semana
├── assinaturas.ts                # resolução por data e por curso → GERAL (Q-14)
├── numero-do-dsa.ts              # o Nº derivado: semanas com lançamento desde o início da turma (Q-3 fora)
├── posicao-herdada.ts            # Q-12: procedência + nunca editada + ta_inicial = 1 → sem posição
└── bloco.ts                      # o tipo Bloco — o contrato do Épico 12
lib/dominio/distribuicao-semanal.ts   # RN-DIST-01 — FORA de dsa/, porque é de três módulos

supabase/migrations/2026MMDD…_dsa_lancamento_sem_ue_e_conflito.sql   # PR B — a única
supabase/tests/116_dsa.sql        # PR B — pgTAP por regra nova + porteiro sem sessão
tests/invariantes/rls/dsa.test.ts # PR B — negativo por perfil, 42501, e o conflito sem vazamento

lib/navegacao/contrato.ts         # PR 1 — "/turmas/[turma]/dsa": semana, ano, sabado
lib/validacao/dsa.ts              # PR 2 — o esquema do bloco (mesmo nos dois lados)
lib/acoes/dsa.ts                  # PR 2 e PR 4 — lançar, lançarEstudoIndividualDaSemana, mover, editar, excluir

components/ciaara/grade-alocacao.tsx   # PR 1 — o primitivo: matriz com teclado, SEM "use client"
components/ciaara/grade-dsa.tsx        # PR 1 — a composição da semana (servidor)
app/(app)/turmas/[turma]/dsa/
├── page.tsx                      # PR 1 — Server Component; UMA rodada de Promise.all
├── consulta.ts                   # PR 1 — as leituras da semana (view + "Sem posição" + regime + feriados)
├── loading.tsx · error.tsx       # PR 1
├── NavegacaoDaSemana.tsx         # PR 1 — folha de cliente: anterior/próxima/hoje na URL
├── FormularioDeLancamento.tsx    # PR 2 — folha de cliente: as quatro decisões e o pré-preenchimento
└── ArrastarBloco.tsx             # PR 4 — folha de cliente: DnD nativo + alternativa por teclado/menu
app/print/dsa/page.tsx            # PR 3 — fora de (app): sem casca; o proxy já exige sessão (proxy.ts:31)
app/print/dsa/impressao.css       # PR 3 — @media print, A4 paisagem (hoje NÃO há @media print no repositório)
```

---

## 1. A ordem dos PRs, e por que ela não é negociável

| PR | Entrega | Lê o que o anterior fez | Migration |
|---|---|---|---|
| **PR 0** | `lib/dominio/dsa/` + `distribuicao-semanal.ts`, com Vitest em cada módulo e as grades **reais** G45/G50 + as 5 configurações do catálogo como casos | — | nenhuma |
| **PR B** | a migration única: `disciplina_id`, o `CHECK` "UE ou disciplina com tópico", a isenção **nominal** da catraca, as duas views com `LEFT` + `security_invoker`, a atividade global na grade (`V-7`), o `CHECK` do EI (`V-5`), `responsavel_externo`, a função de conflito, `herdado` na view, as siglas das técnicas e os parâmetros | o tipo `Bloco` do PR 0, que a função de conflito espelha | **sim** |
| **PR 1** | ver a semana — rota, contrato, `GradeAlocacao`+`GradeDsa`, feriado, "Sem posição", sábado, degradação, 3 caminhos clicáveis | **`vw_ocupacao_ta` já com `LEFT`, global e `herdado`** — por isso vem depois do PR B | nenhuma |
| **PR 2** | lançar — aula (com e sem UE), avaliação/vista, AEC/TAD/TR, EI da semana num clique | a grade do PR 1 para escolher onde | nenhuma |
| **PR 3** | imprimir — `/print/dsa`, A4 paisagem, assinaturas, Nº derivado | lançamentos do PR 2; **as 10 linhas de relógio corrigidas (§7.2), gravadas por Bernardo e conferidas por leitura** | nenhuma |
| **PR 4** | editar, mover (DnD + teclado), excluir; conflitos e alertas; posicionar o que está sem posição | a função de conflito do PR B; a grade do PR 1 | nenhuma |
| **PR 5** | situação por disciplina e por UE; quadro de CH acumulada até a semana | `distribuicao-semanal.ts` do PR 0; `vw_disciplinas_execucao` do PR B | nenhuma |

⚠️ **O PR B vem antes do PR 1 por uma razão medida:** o PR 1 lê `vw_ocupacao_ta`. Hoje ela **esconde**
aula sem UE (junção interna) e atividade global (`turma_id IS NOT NULL`). Construir a grade antes
seria construí-la cega e reescrever a consulta depois.

⚠️ **E o PR 3 vem depois da correção do relógio (§7) por outra razão medida:** conferir a impressão
contra o PDF assinado com o catálogo de hoje compararia o documento certo com o relógio errado em
**quatro** eixos.

---

## 2. PR 0 — o domínio puro, antes de qualquer componente

**Por que primeiro:** é a ordem do `CLAUDE.md` (*de dentro para fora*) e o único jeito de a `R-2`
("sem arredondamento de minuto") ser verificável antes de existir tela para esconder o erro.

| Módulo | Regra | Entrada → saída | O caso que discrimina |
|---|---|---|---|
| `horario-do-bloco.ts` | `RF-HOR-04/06`, `RN-CONF-02` | regime (início manhã/tarde, duração, intervalos, tempos) → relógio de cada TA; `(taInicial, tempos)` → **1 ou 2 trechos** | G45, bloco de 4 TA no 3º tempo → `["09:30–11:55", "13:05–13:50"]`; **nunca** `"09:30–13:50"` (`SC-011`). E a **manhã é derivada**: cabe TA enquanto termina ≤ 12:00 + a tolerância da `RF-HOR-04` — G45 dá **5**, G50 dá **4**, como medido na operação |
| `grade.ts` | `RF-DSA-03`, `RN-DEG-01` | fatos da semana + regime + feriados → matriz `dia × TA` com blocos, faixa "Sem posição" por dia, sábado quando aberto | lançamento com `taInicial` nulo vai para a faixa; dia com feriado `dia_inteiro` sai bloqueado com a descrição; `parcial` vira aviso |
| `posicao-herdada.ts` | `Q-12` | `{origem, herdado, taInicial}` → `semPosicao` | **as três** condições: avaliação **nova** no TA 1 **fica** posicionada; migrada e nunca editada com `ta_inicial = 1` **não** |
| `conflitos.ts` | `RN-CONF-01` | blocos da turma + ocupações alheias (fato: dia, TA, instrutor/fiscal, local) → marcas por bloco | mesmo instrutor, TA sobrepostos, **turmas diferentes** → conflito; mesma sala → secundário; TA adjacentes sem sobreposição → nada |
| `tetos.ts` | `RN-DIST-03`, `RF-HOR-03.1` | lançamentos da semana por disciplina + parâmetros → `{bloqueia, alertas}` | TFM com 7 TA → **bloqueia**; LHFC com 40 → **nada**; outra com 26 → **alerta**; 9º TA → alerta |
| `capacidade.ts` | `RN-EVT-02` | dias da semana + feriados + regime → TA disponíveis | feriado `dia_inteiro` desconta um dia inteiro; `informativo` não desconta (critério **6**) |
| `situacao.ts` | `RF-DSA-05`, `RN-CRONOS-03` | execução por disciplina e por UE até a semana N + previsto da semana → situação + CH acumulada | semana 20 selecionada: a CH acumulada é **até a 20**, não o total |
| `assinaturas.ts` | critérios 2 e 3, `Q-14` | linhas de `responsaveis_curso` + data da semana + curso → `{esquerda, direita}` | linha **do curso** vence a GERAL; sem vigente → `null` (sai em branco); março com duas vigências → a de março |
| `numero-do-dsa.ts` | `Q-3` fora do núcleo | datas com lançamento da turma + semana → Nº | semana sem aula **não** consome número (convenção CRONOS); turma sem `data_inicio` → `null` |
| `bloco.ts` | contrato do Épico 12 | o tipo `Bloco` e `blocoValido()` | o mesmo objeto que a Server Action grava — ver `contracts/lancamento.md` |
| `lib/dominio/distribuicao-semanal.ts` | `RN-DIST-01` | janela da disciplina + CH → previsto por semana | **fora de `dsa/`**, com guarda de ponto único (`distribuicao-unica.test.ts`, no molde de `andamento-unico`) |

**Verificação:** Vitest por módulo; os casos das grades reais **G45 e G50 inteiras** (18 TA
nomeados) e das **cinco** configurações (CFG-A a E, 40 TA, lidos do catálogo); **sem** `Date`
para dia de calendário — texto → texto, como `lib/formato/data.ts`.

---

## 3. PR B — a migration única, com o rito completo

**O que ela faz, na ordem** (o SQL completo está em `data-model.md` §3):

1. `registros_aula.disciplina_id uuid` nulável + FK composta `(disciplina_id, curso_id) → disciplinas(id, curso_id)`;
2. `CHECK reg_aula_ue_ou_disciplina`: `unidade_ensino_id IS NOT NULL` **ou** (`disciplina_id IS NOT NULL` **e** `length(trim(conteudo_resumo)) > 0`) — com a catraca do histórico preservada;
3. **emenda nominal** ao `reg_aula_ue_so_nula_no_historico`: UE pode faltar em dado novo **só** quando `app.disciplina_sem_ue(disciplina_id)` — função `STABLE` que devolve `true` se o curso é `competencias` **ou** a disciplina é `sem_unidades_ensino`. ⚠️ **Nenhuma outra isenção**;
4. `vw_ocupacao_ta`: `LEFT JOIN unidades_ensino`; `disciplina_id = coalesce(ue.disciplina_id, r.disciplina_id)`; ramo de atividade **sem** `turma_id IS NOT NULL` (a global entra com `turma_id` nulo e a página a aplica a toda turma ativa — `V-7`); colunas novas **`local`**, **`fiscal_id`** e **`herdado`**; `with (security_invoker = true)` **repetido**;
5. `vw_disciplinas_execucao`: `LEFT JOIN` e `coalesce`, `security_invoker` **repetido**;
6. `CHECK ativ_estudo_individual_de_turma`: `categoria_normativa <> 'Estudo_Individual' OR escopo = 'turma'` (`V-5`);
7. `atividades_nao_letivas.responsavel_externo text` + `instrutor_id uuid` nulável + `CHECK` de exclusividade (`Q-8`);
8. `public.conflitos_da_semana(p_turma_id, p_de, p_ate)` — `SECURITY DEFINER`, porteiro `coalesce(app.pode('registros_aula','ler'), false) and coalesce(app.alcanca_turma(p_turma_id), false)`, devolve **só** `(data, ta_inicial, ta_final, instrutor_id, fiscal_id, local)` das ocupações de **outras** turmas que cruzam com instrutores/fiscais/salas da minha semana — **nunca** `turma_id`, `fato_id`, disciplina ou conteúdo alheio (`contracts/conflito.md`);
9. dados idempotentes: `config_listas` lista `tecnicas_de_ensino` com as **10** siglas em `metadados` (`Q-10`); `config_parametros` com `dsa.teto_tfm_semana = 6`, `dsa.teto_recomendado_semana = 25`, `dsa.sabado_tempos = 5` (`Q-4`), cada um com norma de origem;
10. `revoke delete, truncate` nas views recriadas (a lição do Épico 1: "view nova nasce com DELETE para `authenticated`").

**O rito, porque preview e Production são o mesmo projeto:**

| Passo | Comando / prova | Registro |
|---|---|---|
| 1. CI verde no ramo | os três blocos | o run |
| 2. Backup | `python -m scripts.manutencao.dado_do_remoto --somente-copia` | o arquivo datado, **citado** em `plano-de-aplicacao-no-remoto.md` |
| 3. Dry-run | `supabase db push --linked --dry-run` listando **só** esta migration | a saída |
| 4. Aplicação | `supabase db push --linked`, **depois da sua autorização** | código de saída |
| 5. Conferência só de leitura | contagem de migrations nos dois lados; impressão digital do esquema (`scripts/provas/impressao_digital_do_esquema.sql`) idêntica; `reloptions` das duas views com `security_invoker=true`; **zero** policies de `DELETE`; as 1.566 + 188 + 664 linhas intactas (md5 do conteúdo, **com** o aviso do gotcha 13); Production respondendo | números, não adjetivos |
| 6. Prova de reversão (DoD 6) | numa base descartável: aplicar, reverter pelo `down` escrito no cabeçalho, `pg_dump` antes = depois | é aqui que o gotcha 10 se pega |

**Testes do PR B:**

- **pgTAP `116_dsa.sql`** — uma asserção nomeada por regra nova: a coluna e a FK; o `CHECK` de UE-ou-disciplina **recusa** aula sem nenhum dos dois; a isenção **só** vale para curso por competências (um curso `unidades_de_ensino` com UE nula é **recusado**); o `CHECK` do EI; as duas views com `security_invoker`; e **o porteiro da função sem sessão levanta exceção** (gotcha 15 — o pgTAP roda sem sessão, e é por isso que esta asserção é dele);
- **RLS `tests/invariantes/rls/dsa.test.ts`** — sessão real: os **cinco** perfis de leitura tentam **lançar, mover e excluir** nas três tabelas e recebem `42501`, com o valor no banco conferido antes e depois (`SC-016`); o **Operador de escopo recortado** chama `conflitos_da_semana` e **vê o fato** do conflito sem conseguir ler a linha da outra turma (os dois sentidos, no mesmo caso); controle positivo com o Admin;
- **o caso que discrimina (DoD 8):** o Operador de escopo recortado, **antes** da função, não vê o conflito; **depois**, vê — medido na ordem certa.

---

## 4. PR 1 — ver a semana

- **Rota** `app/(app)/turmas/[turma]/dsa/page.tsx`, turma pelo código via `endereco-de-turma.ts`; **contrato** em `lib/navegacao/contrato.ts` com `semana` (inteiro ISO, padrão corrente, `historico: empilha`), `ano` (inteiro, padrão corrente, `empilha`) e `sabado` (`sim/nao`, padrão `nao`, `substitui`) — `contracts/parametros-dsa.md`.
- **Leituras**, numa rodada de `Promise.all`: `vw_ocupacao_ta` da semana (posicionados) · os três `select … where ta_inicial is null` da semana (a faixa "Sem posição") · `app.fn_regime_vigente(curso, segunda, 'padrao')` e `'excecao'` · feriados do intervalo · a turma · `turma_disciplina` para nomes. **Nenhum `await` em laço.**
- **`GradeAlocacao`** (`components/ciaara/`): matriz `linha × coluna` com cabeçalhos fixos, **rolagem horizontal própria** (`overflow-x-auto` no contêiner; o `body` nunca), navegação bidimensional por teclado reaproveitando `proximaPosicao`/`ListaNavegavel`, tokens do tema, **sem `"use client"`** — recebe `conflitos` já calculados. **`GradeDsa`** compõe: colunas = dias (5, ou 6 com sábado), linhas = TA do regime (+ o excepcional), células = blocos com `rowSpan` pelo `tempos`, intervalos e almoço como linhas finas, faixa "Sem posição" ao pé de cada dia.
- **Degradação:** sem regime → grade com TA numerados e sem relógio, aviso com link para *Editar curso → Registrar nova vigência*; EAD puro → a frase da `Q-13`, sem grade.
- **Três caminhos clicáveis:** botão **"Abrir o DSA"** no cabeçalho da ficha da turma; ação de linha em `/turmas`; o bloco da turma no `/inicio` ganha o link — e `toda-tela-tem-caminho.test.ts` cobra os `href`.
- **Folha de cliente:** `NavegacaoDaSemana.tsx` (anterior/próxima/hoje escrevem a URL, `useRouter`), declarada em `fronteira-das-telas.test.ts` com motivo.
- **E2E `dsa-ver.spec.ts`:** chega por clique da ficha; regime mudado em 1º/06 → semana de maio com o relógio de maio (critério **4**); feriado `dia_inteiro` bloqueia e `informativo` não (critério **6**); semana histórica com os 1.566 **toda** em "Sem posição" e sem quebra (`SC-015`); avaliação migrada com `ta_inicial = 1` **na faixa**, avaliação nova no TA 1 **na grade** (`SC-017`); voltar do navegador retorna à semana anterior.

---

## 5. PR 2 — lançar

- **`lib/validacao/dsa.ts`:** `esquemaDoBloco` — o tipo `Bloco` do PR 0 virado Zod, **um** esquema para os três tipos (aula com UE, aula sem UE **só** se `disciplinaSemUe`, avaliação/vista, atividade), usado **no formulário e na Server Action**.
- **`lib/acoes/dsa.ts`:** `lancar(bloco)` → `safeParse` na primeira linha → `insert` na tabela certa (sem `RETURNING`; o `id` é gerado antes — gotcha 4.1) → `revalidatePath` da rota do DSA e da ficha → recusa traduzida por `traduzirRecusa`, com as chaves novas (`reg_aula_ue_ou_disciplina`, `vigencia_reinterpretaria_lancamento`, `curso_em_oferta`) ganhando frase em português. **`lancarEstudoIndividualDaSemana(turma, semana)`** gera um lançamento por dia útil (menos feriado `dia_inteiro`) no slot `regime_tempos + 1`, com `tempos = 1`, numa transação (`Q-7`).
- **`FormularioDeLancamento.tsx`** (folha de cliente): abre ao clicar numa célula vazia; **quatro decisões** — onde (já vem da célula), disciplina, UE (ou tópico, quando a disciplina é sem UE), quantos TA; instrutor pela cascata **UE da turma → disciplina da turma → vazio com aviso**; técnica pela `tecnica_ensino_sugerida` casada com a lista; local por `sala_alocada`; conteúdo pelo `topico`. Todos editáveis **no lançamento**. O seletor de instrutor é o **`SeletorInstrutor`** único (antiguidade, inativo fora). Avaliação: tipo, disciplina, responsável, **fiscal interno ou nome externo**, vista com data e TA próprios. Atividade: categoria (ENUM) + subtipo (lista) + responsável externo ou instrutor.
- **Alertas no gravar** (nunca bloqueio, salvo TFM): `tetos.ts` roda no servidor com os lançamentos da semana; o resultado volta como `avisos[]` e a tela os mostra com `AlertaConformidade`. **TFM > 6** → recusa com frase.
- **E2E `dsa-lancar.spec.ts`:** o caso do `SC-009` **conta os campos tocados** (≤ 4); o `SC-010` lança **45 TA** de uma semana do C-Ap-HN sem recarregar; o `SC-011` lê o horário do bloco de 4 TA no 3º tempo; o `SC-012` troca o instrutor de um lançamento e confere no banco que o outro e o catálogo não mudaram; aula **sem UE** no C-Espc-HN grava e aparece; aula sem UE num curso `unidades_de_ensino` é **recusada** com a frase.

---

## 6. PR 3 — imprimir

- **`app/print/dsa/page.tsx`** — fora de `(app)`, logo **sem casca**; Server Component puro; o `proxy.ts` já exige sessão em `/print/*` (linha 31). Herda `?turma=&semana=&ano=` **sem tradução** (doc 25 §1.3 item 2).
- **`impressao.css`** — `@page { size: A4 landscape; margin: 10mm }`, `@media print`; **não existe `@media print` no repositório hoje** — este é o primeiro, e nasce num arquivo só, importado pela rota.
- **Conteúdo** coluna a coluna contra a §1.2 — `contracts/impressao.md`: cabeçalho da OM e do curso, `Nº` derivado (`numero-do-dsa.ts`), `SEMANA DE … A …` em `DD/MM/AAAA` (`dataParaLeitura`); as oito colunas com **LOCAL por linha**; blocos que atravessam o almoço em **duas** linhas de HORÁRIO; linha fixa `ESTUDO INDIVIDUAL · EI`; rodapé com `Gerado em` (`instanteComHoraParaLeitura`), a nota, `<n> ALUNOS`, tabela de CH **só** das disciplinas da semana, legenda de T/E **só** das siglas usadas, e as **duas assinaturas** por `assinaturas.ts` (curso → GERAL; vazio → linha em branco). `ALT` **não aparece** (PR 6). Em avaliação: nome + **`(FISCAL)`**, T/E = tipo.
- **Nome do instrutor** pelo `NomeInstrutor` único (`RF-INSTR-15`).
- **E2E `dsa-imprimir.spec.ts`:** chega por clique no botão *Imprimir* da grade; `page.emulateMedia({ media: "print" })`; **cabe em uma página** medido por `page.pdf({ format: "A4", landscape: true })` + contagem de páginas = **1** para a semana cheia de 45 TA (critério **1**, `SC-001`); as assinaturas preenchidas (critério **2**); **duas vigências semeadas** e a reimpressão de março trazendo a de março (critério **3**, `SC-003`); rodapé só com o que aparece (`SC-014`); nenhuma cadeia técnica (`SC-013`); semana sem TA imprime com aviso (`SC-015`).

---

## 7. A correção do relógio (`Q-6`) — os valores, curso a curso, para você conferir

> **É cadastro, não código.** A tela *Editar curso → Registrar nova vigência* já grava os sete campos
> (medido no `esquemaDeVigencia`), o RPC `registrar_vigencia_regime` encadeia a anterior, e eu **não
> escrevo dado real no remoto**. Proponho que **você** registre pela tela, com esta tabela, e eu
> **conferir só por leitura** antes do PR 3. A alternativa — migration de dado com o rito — está na
> dúvida **D-1** (§10).

### 7.1 Os dois relógios — o que muda em cada campo

*(decisão de Bernardo, 05/10/2026: **mudam início, intervalos e duração do TA; a QUANTIDADE de TA só
muda onde ele confirmar**, porque a planilha conta o Estudo Individual como tempo.)*

| Campo da vigência | **G45** | **G50** | De onde vem |
|---|---|---|---|
| `hora_inicio_manha` | **07:50** | **08:10** | medido; hoje **08:00** nas **11** linhas ativas desses seis cursos |
| `hora_inicio_tarde` | **13:05** | **13:05** | medido; hoje 13:00 em 6 linhas e 13:05 em 5 |
| `intervalo_manha_min` | **5** | **10** (já está) | medido na grade real |
| `intervalo_tarde_min` | **5** | **5** | medido; hoje **10** em todas as 11 |
| `ta_duracao_min` | **45** | **50** (já está) | ⚠️ muda **só** no `padrao` do C-Ap-HN e do C-Ap-FR (50 → 45) |
| `regime_tempos` | **inalterado** | **inalterado** | ⚠️ **nenhuma contagem muda** — ver 7.2 |
| `configuracao_horario_id` | **nulo** | **nulo** | ⚠️ **sai nulo sozinho**, medido: o `esquemaDeVigencia` **não tem** esse campo, então a tela nunca o manda — e é isso que faz o regime vencer o catálogo (`research.md` §2). Hoje **todas as 11 linhas apontam** CFG-A..E, e é por isso que o 08:00 ganha hoje |
| manhã / tarde | **derivadas** | **derivadas** | `horario-do-bloco.ts`: cabe TA enquanto termina até 12:00 (`RF-HOR-04`) — G45 dá 5 de manhã, G50 dá 4 |

### 7.2 Curso a curso — as DEZ linhas que você grava (não cinco)

⚠️ **A MEDIÇÃO MUDOU A CONTA, e é o achado desta rodada:** há **11 linhas ativas** nesses seis cursos
— um `padrao` **e** um `excecao` em cinco deles —, e **todas as 11 têm `hora_inicio_manha = 08:00` e
intervalos 10/10**, inclusive as exceções. Corrigir só o `padrao` deixaria o dia de **9 TA** do
C-Ap-HN começando às **08:00** enquanto o dia de **8 TA** do mesmo curso começa às **07:50**.
**Então são 10 linhas**, duas por curso, menos o C-Esp-ME.

| # | Curso | Tipo | Hoje (medido) | Passa a ser | O que muda |
|---|---|---|---|---|---|
| 1 | **CAHO** | `padrao` | 8×45 · 10/10 · 08:00/13:00 · CFG-C | 8×45 · **5/5** · **07:50/13:05** · cfg **nulo** | relógio só |
| 2 | **CAHO** | `excecao` | 9×45 · 10/10 · 08:00/13:00 · CFG-D | 9×45 · **5/5** · **07:50/13:05** · cfg **nulo** | relógio só |
| 3 | **C-Ap-HN** | `padrao` | 8×**50** · 10/10 · 08:00/13:05 · CFG-B | 8×**45** · **5/5** · **07:50**/13:05 · cfg **nulo** | **duração** + relógio |
| 4 | **C-Ap-HN** | `excecao` | 9×45 · 10/10 · 08:00/13:00 · CFG-D | 9×45 · **5/5** · **07:50/13:05** · cfg **nulo** | relógio só |
| 5 | **C-Ap-FR** | `padrao` | 8×**50** · 10/10 · 08:00/13:05 · CFG-B | 8×**45** · **5/5** · **07:50**/13:05 · cfg **nulo** | **duração** + relógio |
| 6 | **C-Ap-FR** | `excecao` | 9×45 · 10/10 · 08:00/13:00 · CFG-D | 9×45 · **5/5** · **07:50/13:05** · cfg **nulo** | relógio só |
| 7 | **C-Espc-HN** | `padrao` | 7×50 · 10/10 · 08:00/13:00 · CFG-A | 7×50 · **10/5** · **08:10/13:05** · cfg **nulo** | relógio só |
| 8 | **C-Espc-HN** | `excecao` | 8×50 · 10/10 · 08:00/13:05 · CFG-B | 8×50 · **10/5** · **08:10**/13:05 · cfg **nulo** | relógio só |
| 9 | **C-Espc-FR** | `padrao` | 7×50 · 10/10 · 08:00/13:00 · CFG-A | 7×50 · **10/5** · **08:10/13:05** · cfg **nulo** | relógio só |
| 10 | **C-Espc-FR** | `excecao` | 8×50 · 10/10 · 08:00/13:05 · CFG-B | 8×50 · **10/5** · **08:10**/13:05 · cfg **nulo** | relógio só |
| — | **C-Esp-ME** | `padrao` | 7×50 · 10/10 · 08:00/13:00 · CFG-A | ⚠️ **INTOCADO** | aguarda a sua confirmação |
| — | os outros 18 | — | como estão | **intocados** | sem planilha medida (D-3) |

⚠️ **E A SUA DECISÃO DE MANTER AS CONTAGENS SE CONFIRMOU CONTRA A PLANILHA, nos dois sentidos:** as
exceções **já cadastradas** são exatamente as que faltariam — **9×45** nos três G45 e **8×50** nos
dois G50 —, e é por elas que o C-Ap-HN tem *"9 TA em parte dos dias e 8 em outros"* e o C-Espc-HN tem
*"7 TA … ou 8 TA"*. **Nenhuma exceção nova precisa nascer** (era a `D-2`) e **nenhuma contagem precisa
mudar**.

⚠️ **O `vigente_de` é um piso, não uma escolha:** o gatilho `conferir_vigencia_nova` **recusa** data ≤ ao
último lançamento do curso, com `vigencia_reinterpretaria_lancamento`. Você pode escolher qualquer
data **a partir** dessas. ⚠️ **E depois da VIRADA-1 o piso sobe**: a carga seletiva vai trazer
lançamentos de agosto a outubro — então, se a correção ficar para depois dela, o piso passa a ser o
último lançamento carregado. **Registrar antes da virada é mais barato.**

⚠️ **O que a correção NÃO faz:** as semanas de janeiro a agosto seguem com o relógio do catálogo
(08:00, 10 min). É a `RN-2027-09` — *"o histórico é sempre lido com a configuração vigente na data do
próprio registro"* — e é também por isso que o PR 3 confere a impressão contra o PDF numa **semana a
partir do `vigente_de`**, não numa de março.

### 7.3 ⚠️ A regra nova do Estudo Individual bate num curso e diverge em dois — medido

*(decisão `D-4` de Bernardo, contra a minha recomendação: o EI ocupa o **slot seguinte ao último TA
LANÇADO no dia**, com horário derivado pela mesma regra do relógio — não o slot fixo
`regime_tempos + 1`.)*

| Curso e caso | O que a regra dá | O que a planilha tem (medido) | Diferença |
|---|---|---|---|
| **C-Espc-HN**, 7 TA (`padrao`) | EI no slot 8 → **15:50–16:40** | **15:50–16:40** | ✅ **exato** |
| **C-Espc-HN**, 8 TA (`excecao`) | EI no slot 9 → **16:45–17:35** | **16:45–17:35** | ✅ **exato** |
| **CAHO**, 8 TA | EI no slot 9 → **15:35–16:20** | **15:40–16:25** | ⚠️ **+5 min** no início e no fim |
| **C-Ap-HN**, 9 TA (`excecao`) | EI no slot 10 → **16:25–17:10** | **16:25–17:20** | ⚠️ início **igual**, fim **+10 min** |

⚠️ **O exemplo que você me deu para o C-Ap-HN — «9 TA → EI 16:25–17:20» — tem o início que a regra
produz e um fim 10 minutos maior.** A regra derivada dá **17:10**, porque o TA do C-Ap-HN é de **45
minutos**; os 55 minutos da planilha não saem de campo nenhum da vigência. **Não implemento caso
especial nem corrijo a planilha** (regra 1): a regra fica como você decidiu, as duas divergências
ficam **listadas**, e a escolha entre elas é a dúvida **D-11**. ⚠️ **Nada fica impedido por isso** —
o EI é linha fixa do documento e o horário dele é derivado; a diferença aparece no papel como 10
minutos, não como erro.

---

## 8. PR 4 e PR 5, e o Complexity Tracking

**PR 4 — editar, mover, excluir · conflitos e alertas**

- `mover(id, origem, novaData, novoTa)` — `UPDATE` do mesmo registro, `editado_por/em` carimbados, `id` e `criado_por` intactos (critério **7**); **TFM** recusado também no mover; para linha histórica sem UE em curso que **exige** UE, a tela pede a UE no mesmo ato (`Q-1`, segunda metade); curso fora de oferta → frase da `curso_em_oferta`.
- `excluir(id, origem)` — `status = 'inativo'` (ou `cancelada` em `avaliacoes`), com `DialogoConfirmacao` descrevendo o efeito (`RNF-USA-03`).
- **`ArrastarBloco.tsx`** (folha de cliente, a **segunda**): `draggable` + `dragstart/drop` **nativos**; a alternativa por teclado é o caminho **primário** — `Enter` abre o menu *Mover para…* com dia e TA — e o DnD é atalho. **Posicionar** o que está em "Sem posição" é o mesmo `mover`.
- **Conflitos:** a página chama `conflitos_da_semana` e `conflitos.ts` marca; `GradeAlocacao` **pinta**. Sinalização sempre; bloqueio nunca.
- E2E: critérios **5** e **7**; mover só pelo teclado; o Operador recortado **vê** o conflito com a turma de outro curso **sem** ver a turma.

**PR 5 — situação e quadro de CH:** `situacao.ts` + `distribuicao-semanal.ts` sobre `vw_disciplinas_execucao` e `vw_unidades_ensino_execucao`; o painel ao lado da grade; a marca de **lançado-à-frente** (`Q-2`) no quadro e na grade — **sem corte por data no cálculo**.

### Complexity Tracking

| Exceção | Por que é necessária | A alternativa mais simples, e por que foi recusada |
|---|---|---|
| **Duas folhas de cliente** novas na rota (`FormularioDeLancamento`, `ArrastarBloco`) + `NavegacaoDaSemana` | o `RF-DSA-07` exige arrastar-e-soltar, e o formulário precisa reagir à célula clicada e pré-preencher sem viagem ao servidor | tudo no servidor: possível para navegar (links) e para o formulário (uma rota por célula), **impossível** para DnD. As três são declaradas em `fronteira-das-telas.test.ts`, com motivo, como as de 012 |
| **Função `SECURITY DEFINER`** para o conflito | a `RN-CONF-01` exige todas as turmas e a RLS esconde as que o perfil não alcança (medido) | afrouxar a policy: **recusada**, entrega o DSA alheio. Conflito só no alcance: **recusada**, deixa cego o perfil que mais lança |
| **Isenção nominal** à catraca de UE | decisão `Q-1` de Bernardo | UE operacional no catálogo (minha recomendação): recusada por ele |

---

## 9. Constitution Check — reavaliação depois do desenho

Os onze princípios continuam ✅. O desenho acrescentou **duas** verificações que o gate inicial não
tinha e que nascem no PR B: a asserção pgTAP do **porteiro sem sessão** (XI, gotcha 15) e a **prova
de reversão com `pg_dump`** (VI, gotcha 10). E uma guarda nova no PR 0: `distribuicao-unica.test.ts`
(II, `RN-DIST-01`).

---

## 10. Dúvidas — em um lote, com recomendação adotada como padrão provisório

> Nenhuma trava o desenho do PR B. Todas foram adotadas na recomendação para o plan sair completo; a
> sua resposta muda tarefa, não arquitetura.

| # | Dúvida | Opções | **Recomendação** |
|---|---|---|---|
| **D-1** | **Quem grava a correção do relógio (§7)?** | (a) **você**, pela tela *Registrar nova vigência*, com a tabela 7.2, e eu confiro por leitura · (b) migration de **dado** com o rito do remoto, escrita por mim | **(a)** — são **10** linhas (§7.2), a tela existe, o RPC encadeia, e eu não escrevo dado real no remoto. (b) só se você preferir rastro em migration |
| ~~**D-2**~~ ✅ **RESOLVIDA pela medição, sem decisão: nenhuma exceção nova.** As cinco que faltariam **já estão cadastradas** (9×45 nos G45, 8×50 nos G50) e Bernardo decidiu **não criar 9×50**. O que elas precisam é da **mesma correção de relógio** do `padrao` — §7.2, linhas 2, 4, 6, 8 e 10 | — | — |
| ~~descartada~~ | ~~**O 9º tempo nos cursos G50** (C-Espc-HN tem *"8 TA + EI 16:45–17:35"* medido) — a `RF-HOR-03` só nomeia 9×45 para CAHO, C-Ap-HN e C-Ap-FR~~ | ~~as duas opções~~ | ~~vencida pela medição~~ |
| **D-3** | **Os 18 cursos sem planilha medida** (expeditos *"as duas grades conforme a turma"*, estágios, EAD) | (a) ficam como estão até haver turma ativa com DSA · (b) você informa a grade de cada um agora | **(a)** — nenhum tem lançamento, e regime é por **curso**: um expedito cujas turmas alternam G45/G50 não cabe numa vigência, e isso é pergunta para quando a turma existir |
| ~~**D-4**~~ ✅ **DECIDIDA por Bernardo:** o EI vai para o **slot seguinte ao último TA lançado no dia**, com horário derivado. ⚠️ A regra reproduz o C-Espc-HN **exatamente nos dois casos** medidos; CAHO e C-Ap-HN divergem — §7.3 e `D-11` | — | — |
| ~~descartada~~ | ~~**Onde o Estudo Individual de um clique cai** (`Q-7`)~~ | ~~as duas opções~~ | ~~Bernardo escolheu a (b), adaptada~~ |
| **D-5** | **Como o sábado "é adicionado por ação do operador"** (`Q-4`) | (a) parâmetro `sabado=sim` na URL (contrato), **e** automático quando há lançamento no sábado · (b) preferência persistida por turma | **(a)** — é estado de navegação (URL, Princípio do doc 25) e some sozinho quando o sábado está vazio e fechado |
| **D-6** | **A marca `herdado` das avaliações** (`Q-12`) | (a) coluna `herdado` na própria `vw_ocupacao_ta` (PR B) · (b) a página lê `avaliacoes` à parte e cruza | **(a)** — uma coluna booleana na migration que já recria a view; (b) é uma leitura a mais em toda abertura de semana |
| **D-7** | **O Nº do DSA de turma sem `data_inicio`** | (a) `Nº —` e aviso na tela antes de imprimir · (b) contar da primeira semana com lançamento | **(a)** — `data_inicio` é nulável e inventar o início é inventar o número |
| ~~**D-8**~~ ✅ **DECIDIDA: a semeadura é do PR B**, com os nomes por extenso propostos — ⚠️ **menos `PE`, que fica de fora até você confirmar o nome**. Semeia **9** linhas; a sigla `PE` não é usada por lançamento nenhum hoje (medido em `tipo_avaliacao`), então a ausência não quebra legenda alguma | — | — |
| ~~descartada~~ | ~~**A lista de técnicas com sigla** (`Q-10`): quem semeia os 10 valores?~~ | ~~as duas opções~~ | ~~adotada a (a), com PE de fora~~ |
| **D-9** | **Alcance da função de conflito**: instrutor, fiscal **e** sala, na janela da semana | (a) os três, uma função · (b) só instrutor e fiscal; sala pela própria turma | **(a)** — a `RN-CONF-01` cita a sala, e "duas turmas de cursos diferentes na mesma sala" é exatamente o caso que a RLS esconderia |
| **D-10** | **Quais disciplinas aceitam aula sem UE** (`Q-1`): a tela oferece o modo "sem UE" | (a) **só** quando `disciplina_sem_ue()` é verdadeiro, e o `CHECK` recusa fora disso · (b) sempre, e o banco recusa | **(a)** — a tela não oferece o que o banco vai recusar; a recusa fica como **segunda** defesa, não como interface |
| ~~**D-11**~~ ✅ **DECIDIDA por Bernardo (05/10/2026): opção (a)** — o EI dura **um TA**, derivado pela regra, **sem parâmetro novo**; as diferenças do CAHO (+5 min) e do C-Ap-HN (+10 min no fim) ficam **registradas em §7.3 como diferença da planilha**, não corrigidas | — | — |
| ~~descartada~~ | ~~**A duração do Estudo Individual**: a regra derivada dá 45 min no C-Ap-HN e a planilha mostra **55**; no CAHO a regra começa **5 min antes** | (a) o EI dura **um TA**, como a regra deriva, e as duas diferenças ficam registradas · (b) o EI ganha duração própria em `config_parametros` (`dsa.ei_duracao_min`, por curso) · (c) você confirma o horário do EI curso a curso, como dado | **(a)** — é o que a sua `D-4` decidiu, é derivado, e reproduz o C-Espc-HN **exatamente** nos dois casos; (b) acrescenta parâmetro por 10 minutos; (c) devolve horário escrito à mão, que é o `D-7` da planilha |

---

## O que este plan NÃO contém, de propósito

- **PR 6** (ALT, DSA de reposição) — fora, por diretriz.
- **Correção dos documentos 02, 04, 24, 25** (`V-1` a `V-8`) — backlog, por diretriz; só `V-5` e `V-7` entram, **por comportamento**, no PR B.
- **Qualquer escrita no remoto por mim** — o PR B é aplicado com a sua autorização e o rito; a correção do relógio é sua (D-1).
- **Biblioteca nova** — medido: zero de DnD, PDF, calendário ou data entre as 13; o DnD é nativo com teclado como primário, a impressão é CSS.
