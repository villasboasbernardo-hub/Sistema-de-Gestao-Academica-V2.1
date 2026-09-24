# Plano de implementação: Épico 5, fatia (a) — cursos e turmas

**Ramo**: `feat/EPICO-5a-cursos-e-turmas` | **Data**: 17/09/2026, revisado no mesmo dia com as duas
rodadas de respostas | **Spec**: [spec.md](./spec.md)

**Entrada**: [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) ·
[contracts/](./contracts/) · [quickstart.md](./quickstart.md)

> **Como ler.** Toda decisão cita o `FR-`/`RF-`/`RN-` de onde sai. As **35 perguntas** do lote único
> foram **respondidas por Bernardo em 17/09/2026** e estão aplicadas aqui, na spec e nos artefatos — com
> a letra escolhida, as condições dele e o motivo, quando ele o registrou. A **B-21**, que as respostas
> abriram, **fechou na segunda rodada**, junto com a sigla no código da turma, o número do 9º TA e a
> verificação prévia do ETL; e a **B-22**, que o fechamento da B-21 fez aparecer, **fechou na terceira**.
> **Não há pergunta aberta.** A **divisão dos dois PRs** está em §*Entrega em dois PRs*, com tarefas e
> arquivos de cada um.

---

## Resumo

Entregar o catálogo `/cursos`, a página do curso com as abas "Grade" e "Sobre o Curso", o cadastro de
curso **com o regime**, a vigência de regime append-only com "Corrigir esta vigência", a turma —
criação, ficha, edição, código gerado e linhas de disciplina nascidas com ela —, o seletor de turma
que a fatia (b) e o Épico 6 reutilizam, a tela mínima de salas e a desativação de curso. **É tela e
regra sobre tabelas que já existem** — com **uma** tabela nova, a `curso_sigla_historico`, que audita a
troca de sigla (B-21).

A abordagem tem quatro eixos, **por raio de efeito**:

1. **Curso inativo mexe no alcance de todas as tabelas.** Tirar o filtro de `app.cursos_do_usuario()`
   (`FR-017.1`) retira, junto, a única coisa que hoje impede escrita em curso inativo em **31**
   policies de **16** tabelas (`FR-017.5`). É o maior raio da fatia e alcança telas que já estão na
   `main` (R-1 a R-3).
2. **A vigência de regime é `RN-2027-09`, Risco Alto.** Imutabilidade, sucessão explícita, correção
   atômica, recusa de vigência que reinterpreta lançamento, curso que não existe sem regime, e a corrida
   com lançamento novo (R-7, R-13 a R-15, R-19, R-24).
3. **A turma e o que nasce com ela** — código gerado, rótulo `T<n>` único com o vazio igual, sala
   conferida, `turma_disciplina` por gatilho (R-4 a R-6).
4. **As telas**, sobre o que os Épicos 4 e 5 (c) já entregaram.

⚠️ **A fatia é maior que a (c)**, mesmo depois da linha de corte, que foi **aplicada** (§*Tamanho*). A
resposta ao tamanho foi **dividir a entrega em dois PRs**, não cortar mais.

---

## Contexto técnico

**Linguagem**: TypeScript `strict`, `exactOptionalPropertyTypes` ligado · React 19.2.8

**Dependências principais**: Next.js 16.3.3 (App Router, Server Components por padrão) · Tailwind
v4.3.3 · shadcn/ui sobre **Radix** · `@supabase/ssr` 0.12.5 e `@supabase/supabase-js` 2.112.4 ·
`nuqs` · Recharts via `components/graficos/`. **Nenhuma biblioteca nova.**

**Armazenamento**: Supabase PostgreSQL **17.6** (local e remoto, medido), sem ORM. Leitura por
`cursos`, `turmas`, `vw_cursos_regime_vigente`, `vw_carga_horaria_turma`, `avaliacoes_planejadas`,
`disciplinas`, `config_listas`, e a RPC de leitura da proteção das vigências

**Testes**: Vitest (unidade) · pgTAP (`supabase/tests/099` a `105`) · Vitest com sessão autenticada
(RLS negativa) · Playwright

**Plataforma alvo**: Vercel; Preview e Production sobre o **mesmo** projeto Supabase (`FR-016.1` da
spec 001) — as migrations vão ao remoto **antes** do merge do PR de banco (`FR-046`, `FR-046.1`)

**Tipo de projeto**: aplicação web, App Router, sem `src/`, alias `@/*`

**Metas de desempenho**: nenhuma — 24 cursos, 28 turmas, 29 vigências, 210 `turma_disciplina`;
medido, sem requisito (Assumption 8)

**Restrições** (`FR-041` a `FR-045`): leitura em **Server Component**; escrita em **Server Action** com
`safeParse` na primeira linha; estado de navegação na **URL**, pelo contrato tipado; `"use client"` só em
folha; nenhum `await` em laço em `app/**`; **`lib/dominio/` não importa `supabase`, `next` nem `react`**
(regra 9, imposta por ESLint); nenhuma cor literal

**Escala/escopo**: **7 rotas** (`/cursos`, `/cursos/novo`, `/cursos/[curso]`, `/cursos/[curso]/editar`,
`/cursos/[curso]/turmas/nova`, `/turmas/[turma]`, `/admin/salas`) · **7 migrations** · **3 RPCs de
escrita e 1 de leitura** · **10 módulos** em `lib/dominio/` · 1 em `lib/navegacao/` · 4 arquivos de
ação · 4 esquemas Zod · **1 tabela nova** · 3 passos no ETL (sequências, sala, verificação prévia) ·
**16** testes existentes a ajustar · **2 PRs**

---

## Verificação constitucional

*PORTÃO: passa antes da Fase 0 e é reavaliado após a Fase 1.*

| Princípio | Veredito | Como esta fatia o satisfaz |
|---|---|---|
| **I · Fidelidade à Fase 1** | ✅ | Toda escolha que mudaria comportamento virou pergunta, e as 35 foram respondidas e datadas. As divergências estão **listadas, não corrigidas** (D-1 a D-20) |
| **II · Preservação de regras** | ✅ | Nenhuma `RN-` alterada. `RN-2027-09` imposta também no **registro** de vigência (`FR-019.4`), por decisão; `RN-DEG-02`: limite, incoerência, sala em uso e vigência desprotegida **avisam** |
| **III · Restrição de plataforma** | ✅ | Nada fora da pilha. Nenhum pacote novo |
| **IV · Integridade do histórico** | ✅ | Exclusão lógica de curso e sala; vigência append-only; troca de sigla em tabela **sem alteração nem exclusão**, inclusive `TRUNCATE` (`FR-014.1`); **código de turma nunca reescrito** pela troca de sigla (`FR-014.2`); nenhuma policy `FOR DELETE`; `migracao_log` só recebe evento novo (`FR-029.8`) — e a lacuna de `TRUNCATE` dele está **anotada na regra 5 do `CLAUDE.md`**, sem correção nesta fatia (D-21, `PEND-5a-3`) |
| **V · Degradação segura** | ✅ | Três estados vazios nas listas; recusa do banco traduzida, nunca crua (`FR-021.4`); impasse e recusa no `COMMIT` viram mensagem |
| **VI · Mudança cirúrgica por invariante** | ✅ **justificado e aceito** | *"uma fatia = uma migration coesa"*: sete coesas, **aceitas por Bernardo em 17/09/2026** (B-1) — ver *Complexity Tracking*. Invariantes I-1 a I-10 com defeito deliberado |
| **VII · Configuração sobre constante** | ✅ | Salas e natureza física/virtual são **dado** (`FR-029.1`); o número do 9º TA vira `config_parametros` quando existir (`FR-023`) |
| **VIII · Rastreabilidade** | ✅ | Todo parâmetro de URL com `RF-`/`FR-` de origem, imposto pelo tipo; toda decisão deste plano cita a origem |
| **IX · Contenção de escopo** | ✅ | Reserva de sala, UEs, tetos, DSA, lista global de turmas, assinaturas e "Arquivada" ficam fora. O `MAX+1` da fatia (c) sai em **PR próprio** (T132), não de carona |
| **X · Paridade antes de novidade** | ✅ | O que é novo — tela de salas, desativação de curso, correção de vigência — tem decisão datada. A paridade de indicadores com a v2.0 virou **pedido registrado** (`PEND-5a-2`) |
| **XI · O banco é a fronteira** | ✅ | Recusa de curso inativo, imutabilidade, código, rótulo, sala, curso com regime e permissões do Operador são **banco**. As RPCs declaram por que não são Server Action (XI.5). Regra que depende do que mudou é **gatilho** (XI.b) |

**Resultado do portão: PASSA.**

### Reavaliação após a Fase 1

**Continua passando.** Quatro pontos merecem registro:

⚠️ **Doze funções `SECURITY DEFINER` e uma RPC de leitura com porteiro.** Nenhuma
recebe parâmetro que escolha **o que** escrever; todas têm `search_path` travado e `revoke` de `public` e
`anon`. A escrita discricionária continua **sob RLS**, nas RPCs `SECURITY INVOKER`.

⚠️ **Dois gatilhos de restrição adiados** — mecanismo que o projeto ainda não usava: o encadeamento de
vigências (R-19) e o curso com regime (R-24). São o único jeito de impor, **por qualquer caminho**, uma
regra que só vale no fim da transação. ⚠️ pgTAP em `rollback` não os vê — o teste deles exige
`set constraints … immediate`.

⚠️ **A carga do ETL passa a depender desta fatia** (R-16, R-20, R-24, R-27): o avanço das sequências, a
substituição de sala, a garantia de curso com regime — e a **verificação prévia** que a antecipa, para a
carga falhar antes de escrever e não no `COMMIT`.

⚠️ **A primeira tabela nova da fatia, `curso_sigla_historico`** (B-21, 17/09/2026) — append-only, gravada
só por gatilho, protegida contra `UPDATE`, `DELETE` **e** `TRUNCATE`. Ao desenhar a proteção apareceu um
**achado do Épico 1**: o gatilho de `migracao_log` não cobre `TRUNCATE`, e a `service_role` tem esse
privilégio nela (R-22). **Não corrigido nesta fatia**, por decisão: a regra 5 do `CLAUDE.md` foi **anotada**
com a lacuna, datada e com a pendência `PEND-5a-3` (D-21).

---

## Estrutura do projeto

### Documentação desta fatia

```text
specs/009-cursos-e-turmas/
├── plan.md                               # este arquivo
├── spec.md                               # FR-001 a FR-048 e subitens · SC-001 a SC-014.4 · D-1 a D-20
├── research.md                           # Fase 0 — R-1 a R-25, medidos
├── data-model.md                         # Fase 1 — entidades, funções, 31 policies, invariantes, reversão
├── quickstart.md                         # Fase 1 — 8 passos; o 6 diz onde e quem acrescenta sala
├── contracts/
│   ├── rotas-e-parametros.md             # 7 rotas, parâmetros, endereço de turma, não encontrada, menu
│   └── escritas-recusas-e-avisos.md      # Server Actions, RPCs, recusas traduzidas, avisos, confirmação
├── checklists/requirements.md            # não mexido por este plano
└── tasks.md                              # Fase 2 — /speckit-tasks, NÃO criado aqui
```

### Código (raiz do repositório)

```text
supabase/migrations/                            # 7, na ordem de §Migrations — todas no PR 1
supabase/tests/
├── 099_salas.sql … 105_curso_inativo.sql       # novos
└── 020, 030, 040, 050, 055, 060, 070, 080, 094 …  # 12 amostras ajustadas (R-21) — asserções intactas

scripts/etl/                                    # avanço das sequências (R-16); substituição de sala (R-20); verificação prévia (R-27)

lib/
├── dominio/                                    # PR 2
│   ├── classificacoes-de-curso.ts              # as 5 na ordem do Glossário (FR-003, D-19)
│   ├── indicadores-do-catalogo.ts              # FR-002 — lista fechada
│   ├── pre-selecao-de-turma.ts                 # FR-006.1 — hoje como argumento
│   ├── avisos-do-curso.ts                      # FR-010 — lista aberta
│   ├── avisos-da-turma.ts                      # FR-028.1, FR-028.4 — lista aberta
│   ├── limite-de-turmas.ts                     # FR-030, FR-030.1 — enumeração positiva
│   ├── seletor-de-turma.ts                     # FR-034, FR-035 — rótulo e ordem
│   ├── salas.ts                                # FR-029.1, FR-029.4 — natureza lida do dado
│   ├── vigencia-de-regime.ts                   # FR-019 a FR-021 — o que o formulário oferece
│   └── protecao-de-vigencia.ts                 # FR-021.8 — vigências que perdem a proteção
├── navegacao/
│   ├── endereco-de-turma.ts                    # FR-031.2 — a função única (PR 1)
│   ├── contrato.ts                             # + 7 rotas (PR 2)
│   └── menu.ts                                 # FR-038, FR-039 (PR 2)
├── validacao/{curso,vigencia-regime,turma,sala}.ts        # PR 2
└── acoes/{curso,vigencia-regime,turma,sala}.ts            # PR 2 — e instrutor.ts traduz a recusa nova (PR 1)

app/(app)/
├── cursos/                                     # PR 2
│   ├── page.tsx · consulta.ts · loading.tsx · error.tsx
│   ├── novo/page.tsx
│   └── [curso]/
│       ├── page.tsx · consulta.ts · loading.tsx · error.tsx
│       ├── editar/page.tsx                     # curso + regime + histórico de vigências
│       └── turmas/nova/page.tsx
├── turmas/[turma]/page.tsx · consulta.ts · loading.tsx · error.tsx     # PR 2
├── admin/salas/page.tsx                        # + aba em admin/layout.tsx (PR 2)
├── inicio/page.tsx                             # varredura + link pela função única (PR 1)
└── instrutores/{page,novo/page,[codigo]/page}.tsx   # varredura (PR 1)

components/ciaara/
├── seletor-turma.tsx                           # ✅ EXISTE — consumir (FR-033)
└── avisos-recolhiveis.tsx                      # movido de app/(app)/instrutores/, sem mudar comportamento (PR 2)

tests/
├── unidade/                                    # domínio, ida e volta, varreduras, vazamento, confirmações
├── invariantes/rls/                            # Operador nos dois lados, salas, curso inativo, curso sem regime, N-7
└── e2e/{cursos,curso-pagina,turmas,vigencia,salas}.spec.ts
```

**Decisão de estrutura**: a do documento 24, sem desvio. Ordem **de dentro para fora** (`CLAUDE.md`):
migrations e `pnpm db:tipos` → `lib/dominio/` → `lib/validacao/` → `lib/acoes/` → `app/` →
`components/`. **`AvisosRecolhiveis` sobe para `components/ciaara/`**: é a folha de cliente do quadro
da fatia (c), não tem nada de instrutor, e passam a ser três quadros a usá-la. O `QuadroDeAvisos` da (c)
**não** se move: ele usa `NomeInstrutor`.

---

## O trabalho real — Restrição 4, item a item

### 1. Varredura de consumidores de `app.cursos_do_usuario()` — `FR-017.1`, `FR-017.6` · [R-1](./research.md)

| Camada | Quantos | O que muda |
|---|---|---|
| funções SQL | **3** — `alcanca_curso`, `alcanca_turma`, `alcanca_disciplina` | nada: herdam a função sem filtro |
| policies | **46** em **16** tabelas: **15** de leitura, **31** de escrita | leitura: nada (passa a ver inativo, que é o pedido); escrita: ganham "em oferta" (item 2) |
| views `security_invoker` | **8** | nada: o filtro "só ativo" vai para quem precisa, explicitamente |
| `app/(app)/inicio/page.tsx` | 1 | filtra `status = 'ativo'` explicitamente; a contagem que distingue "ainda não existe" continua sobre todos; o link usa a função única (`FR-031.2`) |
| `app/(app)/instrutores/page.tsx` | 1 | o filtro por curso **mostra** curso inativo, depois dos ativos, marcado (`FR-017.10`) |
| `instrutores/novo` e `instrutores/[codigo]` | 2 | **não oferecem** disciplina de curso inativo para habilitação nova; as existentes aparecem só leitura |
| `public.sincronizar_habilitacoes` | 1 | ignora curso inativo na inativação e recusa marcar (`FR-017.9`) |
| testes que nomeiam a função | **0** | o teste de vazamento do `FR-017.6` nasce aqui |

⚠️ **Achado:** o ramo do Encarregado de Curso **já** ignora a situação do curso. A mudança iguala os
outros perfis a ele. A varredura é **refeita por busca no repositório** na tarefa, não só por esta lista.

### 2. Recusa de escrita em curso inativo, e a exceção cirúrgica — `FR-017.4`, `FR-017.5`, `FR-017.7` · [R-3](./research.md)

- **31 policies** recebem `app.curso_em_oferta(…)`, `app.turma_em_oferta(…)` ou
  `app.disciplina_em_oferta(…)` — tabela por tabela em [data-model §3](./data-model.md).
- **`cursos_editar` não recebe a condição** — a reativação precisa passar por ela. Quem guarda a linha
  é o gatilho `BEFORE UPDATE` de `cursos`, **por valor alterado**.
- **Curso nasce ativo** pela policy `cursos_criar`, não por gatilho — a carga do ETL continua podendo
  trazer curso inativo da v2.0.
- ⚠️ **`UPDATE` barrado pelo `USING` não dá erro: devolve zero linhas.** Toda ação de edição confere as
  linhas devolvidas ([contrato §2](./contracts/escritas-recusas-e-avisos.md)).

### 3. O gatilho genérico de domínio servindo à sala — `FR-029`, `FR-029.4`, `FR-029.7`, `FR-015.1` · [R-4](./research.md)

- **Parâmetro, não variante:** `TG_ARGV[2] = 'aceita_inativo'`. Sem ele, a função é **byte a byte** a de
  hoje, e os 4 gatilhos existentes **não são recriados**.
- **O valor que impede distinguir "escolheu" de "não informou"** sai: `DEFAULT 1` de
  `cursos.limite_turmas_ano` e `DEFAULT 'presencial'` de `cursos.modalidade`.
- **A natureza da sala** tem a chave **obrigatória e booleana** em toda sala — e a restrição tem as **duas
  metades**, porque a metade do tipo sozinha aceitaria a chave ausente (condição do B-2; [data-model](./data-model.md)).
- **O padrão de `prioridade_alocacao` fica**, com justificativa escrita (`FR-015.2`).

### 4. O gerador do código `TDI-`: sequência, nunca `MAX(...)+1` — `FR-032.2` · [R-5](./research.md), [R-16](./research.md)

- `app.turma_disciplina_codigo_seq`, com `setval` **uma vez**, na migration; o gerador faz **só**
  `nextval` e formata `TDI-` com 6 dígitos. **Nenhum** `max()` em tempo de execução. O mesmo para `REG-`.
- **Por que duas criações simultâneas não colidem:** `nextval` é **atômica e não transacional** — cada
  chamada devolve um número que nenhuma outra sessão recebe, com as duas transações abertas ao mesmo
  tempo e mesmo se uma fizer `rollback`. Duas turmas de 22 disciplinas criadas no mesmo instante
  recebem **44** códigos distintos, sem trava e sem espera. O preço aceito é **buraco** na numeração.
- **O que a sequência sozinha não cobre:** a carga **depois** da migration a deixa atrás. O ETL ganha o
  passo final que as avança, e o pgTAP a invariante *"nenhuma sequência de código atrás do maior código"*.
- **O `MAX+1` dos geradores da fatia (c)** sai em PR próprio, depois do PR 1 — **T132** da spec 006.

### 5. A permissão do gatilho de `turma_disciplina` — `FR-032`, `FR-032.2` · [R-6](./research.md)

**Escolhido: `SECURITY DEFINER`, `search_path = pg_catalog, public` travado**, `revoke all` de
`public`, `anon` e `authenticated`. As linhas são **consequência estrutural** da turma: a autorização
que importa já foi decidida quando a policy `turmas_criar` aceitou a turma. Com os direitos de quem
cria, retirar `disciplinas.editar` de um perfil **quebraria a criação de turma** sem ninguém ligar uma
coisa à outra. A auditoria não perde o autor: `app.set_auditoria()` lê o usuário do JWT da sessão.

### 6. A corrida da Q-06.1 — `FR-021.3`, `FR-021.7` · [R-7](./research.md), [R-19](./research.md)

1. **Ordem de trava**, antes de conferir: turmas do curso **por `id`** `FOR UPDATE` → curso
   `FOR UPDATE` → `pg_advisory_xact_lock_shared` da atividade global → linha da vigência `FOR UPDATE`.
2. **O lado de quem lança já respeita a trava sem mudar nada:** inserir com FK para a turma pega
   `FOR KEY SHARE`, que **conflita** com `FOR UPDATE`.
3. **Atividade global** pega a mesma chave em modo **exclusivo** (`FR-021.7`).
4. **A trava mora nos gatilhos da vigência**, não só na RPC — cancelar, registrar e corrigir por
   **qualquer** caminho passam por ela.
5. **Riscos declarados:** impasse (`40P01`), traduzido em *"tente de novo"*; lançamento existente cuja
   **data** muda sem mudar FK não pega trava.

### 7. Editar a janela depois de existir atividade global — `FR-021.8` · [R-8](./research.md)

**Decidido por Bernardo em 17/09/2026: aviso, não silêncio nem recusa** (B-5, opção C). A edição
**grava**; o diálogo de salvar **nomeia as vigências que deixam de ficar protegidas**. Vale também para
**mudar o curso** da turma. A RPC de leitura `protecao_das_vigencias_por_atividade_global` entrega o fato
no carregamento da ficha, e `lib/dominio/protecao-de-vigencia.ts` recalcula com a janela que a pessoa
digita. A trava continua sendo só do banco.

### 8. "Turma não encontrada" × "sem permissão" por endereço direto — `FR-031.4` · [R-9](./research.md)

**Juntar, para quem tem recorte** — sem objeção nas respostas de 17/09/2026. Alcance total: *"Turma não
encontrada"*. Com recorte: *"Turma não encontrada ou fora do seu alcance"*. A mensagem depende **só do
perfil**, nunca da turma. **Nenhum SQL novo.** Nas listas, os três estados continuam distintos.

---

## Lote B — o que muda o SQL: respondido em 17/09/2026

| # | Pergunta | Decisão de Bernardo | Requisito |
|---|---|---|---|
| B-1 | Uma migration ou sete? | **A — sete** | `FR-046`, `SC-011` |
| B-2 | Como a sala guarda física/virtual? | **A**, com condição: chave **presente e válida em toda sala**; ausência rejeitada, nunca "física" | `FR-029.7` |
| B-3 | `sincronizar_habilitacoes` com curso inativo | **A** | `FR-017.9` |
| B-4 | Trava em atividade global | **A** | `FR-021.7` |
| B-5 | Encurtar janela com atividade global dentro | ⚠️ **C — aviso**, com condição: **nomear as vigências desprotegidas** | `FR-021.8` |
| B-6 | `MAX+1` da fatia (c) | **B — PR próprio depois**, com condição: pendência nomeada, com número e dono | **T132** da spec 006 |
| B-7 | Linha `horarios` do seed | **A — a linha inteira do documento 01** | `FR-024.1` |
| B-8 | Unicidade por data de início | **A — só entre ativas**. *"Conserta a restrição para o que ela sempre significou"* | `FR-021.9` |
| B-9 | Código da vigência | **A**, com condição: verificar se os dois `REG-` aparecem juntos — **verificado: não aparecem** | `FR-019.3`, D-20 |
| B-10 | Vigência nova sobre lançamento já gravado | **A — o banco recusa** | `FR-019.4` |
| B-11 | Formato do rótulo (Q-21.2) | **A — vazio ou `T<n>`** | `FR-025.2` |
| B-12 | Sigla (Q-19) | **A — digitada e editável**, com condições: confirmação que nomeia a consequência; **registro em auditoria** → abriu a **B-21** | `FR-014.1` |
| B-21 | Mecanismo da auditoria da sigla | **A — tabela `curso_sigla_historico`**, escrita só por gatilho, sem alteração nem exclusão. *"B seria auditoria sem auditoria; C poria o rastro dentro da linha que ele fiscaliza"* | `FR-014.1`, `FR-046` |
| — | Sigla dentro do código da turma | **decisão sem pergunta: a troca de sigla NÃO reescreve código de turma**; turma nova usa a sigla nova; a confirmação diz isso com todas as letras. *"Turma antiga carregando a sigla antiga é história correta, não inconsistência"* | `FR-014.2` |
| B-13 | Limite fixo (Q-08.1) | **A — editável** | `FR-003.2` |
| B-14 | Mudar classificação (Q-09) | **A — edição comum** | `FR-016.1` |
| B-15 | Curso nasce com regime (Q-05) | ⚠️ **C — mesmo passo e o banco recusa curso sem regime** | `FR-019.5` |
| B-16 | Pares curriculares e 9º TA (Q-10) | **A — nenhum dado novo**; `FR-023` **adiado por dado ausente, não cortado**. Número dado na segunda rodada: **2** dias por semana sem aviso, gravado em `config_parametros` | `FR-022`, `FR-023`, `PEND-5a-1` |
| — | Condição da B-15 | **verificação prévia** de cursos sem regime **antes** da carga do ETL, falhando cedo e com mensagem clara — **estendida na terceira rodada aos dez modos de aborto da fatia**, inclusive os que hoje dão zero | `FR-019.6` |
| B-22 | Sigla que já foi de outro curso | **A, como recusa, não aviso** — a mensagem nomeia o curso e até quando. **Exceção explícita:** o curso pode voltar a uma sigla sua. *"B e C deslocam a falha para longe da causa"* | `FR-014.3` |
| — | Lacuna de `TRUNCATE` no `migracao_log` | **anotar a regra 5 do `CLAUDE.md`**, datada e com a pendência; **não** corrigir nesta fatia. *"Documento que promete garantia inexistente é pior que a lacuna"* | D-21, `PEND-5a-3` |
| — | As três escolhas do registro da segunda rodada | **confirmadas**: parâmetro `operacional`; marca `excepcional`; aviso do 9º TA **não** construído nesta fatia | `FR-023` |
| B-17 | "Arquivada" (Q-22.2) | **A — não entra** | — |
| B-18 | Janela × `janelas_curso` (Q-25) | **A — distintas**. *"Sincronizar destruiria a única forma de enxergar divergência"* | `FR-025.3` |
| B-19 | Padrão de `prioridade_alocacao` | **A**, com condição: justificar que não é padrão silencioso — **justificado** | `FR-015.2` |
| B-20 | ETL e grafia de sala | **A — uma lista só**. *"Aceitar grafia antiga criaria segunda representação"* | `FR-029.8` |

### Lote A — não muda o SQL: respondido em 17/09/2026

*Reconstruído em 17/09/2026 (achado 1 do analyze) **só a partir do que está registrado** — a sessão de
*Clarifications* da spec, o texto dos requisitos e as tarefas que implementam cada decisão. A versão
por extenso das quinze perguntas, com o que estava em jogo e todas as alternativas, existiu numa versão
anterior deste arquivo que **não foi commitada** e se perdeu na reescrita. Onde a alternativa recusada
não está no registro, a tabela diz **"opções recusadas não recuperadas"** — nenhuma foi reinventada.*

| # | Pergunta | Opções registradas | Decisão | Requisito · tarefas |
|---|---|---|---|---|
| A-1 | A fatia sai em um PR ou em dois? | **A)** dois — banco e varredura, depois telas · **B)** um, como a (c) (`FR-009.1`: *"132 tarefas num PR só"*) · terceira opção não recuperada | **A**, com três critérios: cada PR verde com a suíte completa; sistema utilizável sem nada meio construído; PR de banco no remoto antes do merge | `FR-046.1` · T104 a T106, T109, T207 |
| A-2 | O filtro por curso de `/instrutores` mostra curso inativo? | **A)** mostra, marcado *inativo* · **B)** só ativos (research R-1: *"é consulta sobre histórico"*) | **A** | `FR-017.10` · T060, T063 |
| A-3 | Onde se cria e edita curso? | **A)** `/cursos/novo` e `/cursos/[curso]/editar` · **B)** edição no lugar, na página do curso — recusada pela spec: duas abas, "Sobre" só consulta (`FR-006.2`, `FR-007`) · terceira opção não recuperada | **A**; Bernardo retirou a ressalva que havia levantado; a diferença de gramática curso × turma é deliberada | `FR-013.1` · T164 a T168 |
| A-4 | Avaliações e Relatório aparecem antes dos Épicos 8 e 10? | **A)** indisponíveis e anunciados, molde da MENU-2 · **B)** não aparecem (`FR-008`, texto original) | **B** — *"a tela não anuncia o que não entrega"* | `FR-008` · T144, T153 |
| A-5 | O histórico de vigências é exibido, e com o quê? | só as ativas · também as canceladas (`FR-011`, Q-06.2); onde: opções não recuperadas | ativas **e** canceladas, marcadas, em `/cursos/[curso]/editar`; a página mostra só o vigente | `FR-011` · T196, T197, T201 |
| A-6 | Indicadores e gráficos do catálogo (Q-15)? | os três do `RF-CURSOS-02` · o conjunto da v2.0 — total, turmas ativas, por classificação, duração média — e os de turma (`FR-002`, texto original) | os três mais barras por classificação; a paridade com a v2.0 vira `PEND-5a-2` | `FR-002` · T118, T119, T126 |
| A-7 | Filtros do catálogo na URL (Q-16)? | classificação e modalidade · busca por nome · status derivado das turmas (`FR-004`) | classificação, modalidade e situação; sem busca, sem status derivado | `FR-004` · T120, T121, T127 |
| A-8 | `responsaveis_curso` nesta fatia (Q-17)? | exibir as vigentes · cadastrar por curso · fora, é do Épico 6 | **fora** — nem exibição nem cadastro; os negativos do `FR-044` ficam | *Fora de escopo* · T053, T054 (negativos nas 16 tabelas, `responsaveis_curso` incluída) |
| A-9 | Quais gravações confirmam antes de salvar (Q-18)? | **A)** todas · **B)** só o difícil de desfazer · terceira opção não recuperada | **B** — *"confirmação em toda gravação treina a pessoa a clicar sem ler"* | `FR-018.1` · T114, T115 |
| A-10 | A primeira turma sem rótulo ganha `T1` quando nasce a segunda (Q-21.1)? | nada automático, a segunda exige rótulo · a primeira ganha `T1` automaticamente | nada automático, com aviso; editar a primeira para `T1` fica possível, código intacto | `FR-026.1` · T186, T190 |
| A-11 | No aviso de incoerência, hoje conta como passado (Q-22.3)? | sim · não | **não** — estrito, como no `FR-006.1` | `FR-028.1` · T138, T139 |
| A-12 | Baixar o limite abaixo da contagem avisa ao salvar o curso (Q-23.2)? | sim, no diálogo · só no quadro | **sim**, por ano afetado | `FR-030.1` · T136, T137, T168 |
| A-13 | O que o seletor mostra em cada turma (Q-26)? | `vw_turmas_rotulo` (nula em 18 de 28) · o `codigo` · nome por extenso · com status ao lado (`FR-034`) | código e status | `FR-034` · T154, T155 |
| A-14 | Ordem e conteúdo do seletor (Q-27)? | ano decrescente · ativas primeiro · canceladas e concluídas entram ou não (`FR-033`, `FR-035`) | as quatro situações; ano e início decrescentes, sem data por último, código | `FR-035` · T154, T155 |
| A-15 | O seletor lista turmas de mais de um curso (Q-29)? | um curso só · global | um curso nesta fatia, sem impedir o uso global depois | `FR-033.1` · T156, T157 |

---

### A última pergunta, já respondida

**B-22 · A sigla que um curso deixou pode passar a outro curso?** (`FR-014.2`; [R-26](./research.md))
- **Em jogo:** com a decisão de que a troca de sigla **não** reescreve código de turma, as turmas antigas
  guardam a sigla antiga para sempre. `cursos.codigo` é único **só entre os cursos de hoje**: depois da troca,
  a sigla fica livre, e outro curso pode adotá-la. Duas consequências: **(1)** DSAs já impressos do curso A
  dizem `X 2026`, e os do curso B passam a dizer `X 2027` — a mesma sigla identifica dois cursos, e só a data
  os separa; **(2)** se B abrir turma no mesmo ano e rótulo de uma turma antiga de A, o código gerado é
  **idêntico**, e a criação é recusada pela unicidade de `turmas.codigo` por um motivo que ninguém na tela de
  B enxerga. Dentro do **mesmo** curso não há problema: voltar à própria sigla e colidir com a própria turma
  antiga já é recusado pelo `FR-026`, com mensagem. **Nenhum caso hoje** — nunca houve troca de sigla.
- **Recomendação: A.** É o mesmo raciocínio da decisão que a originou: a sigla antiga **continua valendo**
  dentro dos documentos já emitidos, então ela não está livre de verdade. E a tabela que a B-21 criou é
  exatamente o dado que a conferência precisa.
- **Opções:**
  - **A)** o banco **recusa**, ao criar ou editar curso, sigla que conste como sigla anterior de **outro**
    curso em `curso_sigla_historico`, com mensagem que nomeia o curso que a usou e até quando; o próprio
    curso pode voltar a uma sigla sua. Custo: **+1** tarefa no PR 1.
  - **B)** permitir; se o código de turma colidir, a recusa nomeia a turma antiga que já tem aquele código;
    a ambiguidade nos documentos fica aceita. Custo: **+0** no PR 1, a tradução entra no PR 2.
  - **C)** permitir sem tratamento: a colisão chega como *"código duplicado"* genérico.

**✅ Respondida em 17/09/2026 — opção A, como recusa** (`FR-014.3`). **Não há pergunta aberta.**

---

## Migrations — sete, em ordem (B-1)

**Decidido: sete**, cada uma coesa, com o seu plano de reversão ([data-model §5](./data-model.md)),
deixando o banco coerente se a seguinte falhar. **Todas no PR 1.**

| # | Migration | Conteúdo | Origem |
|---|---|---|---|
| 1 | `salas_lista_e_validacao` | `metadados` com a restrição de duas metades; 8 salas; reconciliação **conferida no momento em que roda**, com a lista de substituições em comentário e **aborto** se sobrar valor sem par; `aceita_inativo`; gatilho de sala | `FR-029` a `FR-029.7` |
| 2 | `curso_e_turma_obrigatorios` | saem os 2 `DEFAULT`; `NOT NULL` em `duracao_dias` e `turmas.modalidade`; gatilho do limite; `CHECK` sem `ead_semipresencial`; rótulo `T<n>`; **tabela `curso_sigla_historico`** com o gatilho que a alimenta e os que a protegem; **recusa de sigla que já foi de outro curso**, com a exceção do próprio curso | `FR-003.1`, `FR-003.2`, `FR-015`, `FR-025.2`, `FR-027`, `FR-014.1`, `FR-014.2` |
| 3 | `turma_codigo_e_rotulo` | gatilho do código; `UNIQUE NULLS NOT DISTINCT` | `FR-025.1`, `FR-026` |
| 4 | `turma_disciplina_nasce` | sequência `TDI-`; gerador; gatilho `AFTER INSERT` `SECURITY DEFINER` | `FR-032` a `FR-032.3` |
| 5 | `permissoes_horarios_turmas_cursos` | linha `horarios` inteira, `turmas.criar` do Operador, `cursos.desativar`; policies de escrita de `curso_regime_historico` sobre `horarios` | `FR-024`, `FR-024.1`, `FR-028`, `FR-017` |
| 6 | `vigencia_de_regime` | imutabilidade; gatilho adiado de encadeamento; unicidade parcial; gerador `REG-`; recusa de vigência sobre lançamento; **gatilho adiado de curso com regime**; funções de lançamento e de trava; RPCs de registrar, corrigir e criar curso com regime; **RPC de leitura da proteção**; trava em atividade global; **parâmetro do 9º TA** em `config_parametros` | `FR-019` a `FR-021.9`, `FR-023`, `RN-2027-09` |
| 7 | `curso_inativo` | `cursos_do_usuario()` sem filtro; 3 funções de oferta; **31** policies; `cursos_criar`; gatilho de `cursos`; `sincronizar_habilitacoes` | `FR-017` a `FR-017.9` |

**Por que esta ordem.** A **1** é a única que altera dado de turma e **aborta** se achar sala sem par —
melhor abortar antes de tudo. A **2** muda colunas que os gatilhos da 3 e da 4 leem. A **4** depende de o
`INSERT` de turma já estar formado pela **3**. A **5** cria as permissões que as policies da **6** e o
gatilho da **7** consultam. A **7** tem o **maior raio** — vai por último, com a varredura dos consumidores.

**Cada migration traz** (`FR-046`): comentário com a origem; `revoke` de `public` e `anon` em toda
função; **o ajuste das amostras de teste que ela quebra, no mesmo commit** (R-21); pgTAP nomeado,
inclusive negativo; `pnpm db:tipos` depois. **Nenhuma** `drop table`, `drop column` nem policy de `DELETE`.

---

## Entrega em dois PRs (A-1)

**Decidido por Bernardo em 17/09/2026**, com três critérios obrigatórios (`FR-046.1`):
1. cada PR **mescla verde com a suíte completa** — `pnpm verificar:tudo` e o CI com o mesmo veredito;
2. cada PR deixa o sistema **utilizável, sem nada meio construído**;
3. o PR de banco vai **ao Supabase remoto antes do merge**, como a fatia (c) fez.

**Adendo de 17/09/2026 — medição por decomposição (achado 3 do analyze).** Os números desta seção são a
**estimativa do plano** e ficam como foram escritos. O `tasks.md`, decompondo tarefa a tarefa, mediu
**110 no PR 1, 102 no PR 2, 212 no total** (com os sub-IDs T031.1, T031.2 e T182.1), e **17** testes
existentes a ajustar, não 16 — o `010_estrutura.sql` entrou com a 28ª tabela. O motivo do crescimento
está no `tasks.md` §*Medida honesta*: as dez provas do ETL, uma tarefa por arquivo de teste, testes
pareados de validação e de contrato. Nenhum escopo novo.

### Números — depois da linha de corte, com todas as decisões de 17/09/2026

| | **PR 1 — banco, carga e varredura** | **PR 2 — telas** | Fatia inteira |
|---|---|---|---|
| **Tarefas planejadas** | **65** | **79** | **144** |
| Tarefas projetadas (+47%, a razão da c) | ~96 | ~116 | ~212 |
| **Arquivos tocados** | **~62** | **~82** | **~141 distintos** (3 em comum) |
| Migrations | **7** | 0 | 7 |
| Vai ao remoto antes do merge | **sim** | não — não tem migration | — |

**O que mudou desde a primeira divisão** (59 no PR 1): **+2** da verificação prévia do ETL e da prova dela
(`FR-019.6`), **+1** do parâmetro do 9º TA (`FR-023`), **+1** da sigla reservada (B-22), e, na terceira
rodada, **+2** da extensão da verificação às **dez** conferências e da prova de cada uma. A nota da regra 5
do `CLAUDE.md` já foi feita e não custa tarefa. A auditoria da
sigla (B-21) já estava contada; a regra da sigla no código da turma não custa tarefa — é a **ausência** de
cascata, provada dentro do pgTAP da auditoria, e o texto do diálogo, dentro da tela de edição do PR 2.

### PR 1 — banco, carga e varredura: 65 tarefas

| Bloco | Tarefas | Arquivos |
|---|---|---|
| Preparação — base conferida, decisões registradas, emenda do documento 01 (`FR-028.3`), porque a permissão do Operador muda **aqui** | 3 | documento 01 |
| Migrations 1 a 7 — SQL, pgTAP e reversão de cada uma | 21 | 7 migrations · 7 pgTAP novos |
| Curso com regime (gatilho adiado), auditoria da sigla com as três proteções (B-21), sigla de outro curso recusada com a exceção do próprio curso (B-22), RPC de leitura da proteção (B-5), parâmetro do 9º TA | 5 | dentro das migrations 2 e 6 |
| Amostras de teste existentes — 12 pgTAP, `rls.test.ts`, 3 da ponta a ponta; amostras de curso **pela RPC**; o caso "não cria curso" exigindo `42501` | 6 | 12 pgTAP · 4 TS |
| RLS negativa nova — Operador nos dois lados, salas, curso inativo nas 16 tabelas, curso sem regime, leitura da auditoria | 5 | 2 arquivos novos |
| ETL — avanço das sequências, substituição de sala com `migracao_log`, **verificação prévia com as dez conferências** e **a prova com um `staging` que faz cada uma falhar**, carga e reconciliação | 7 | 5 |
| `pnpm db:tipos`, aplicação no remoto **antes do merge**, conferência só de leitura no remoto | 3 | `lib/tipos/database.ts` |
| Varredura — Início (filtro e link), filtro de instrutores, painel de habilitação no cadastro e na ficha, tradução da recusa nova em `lib/acoes/instrutor.ts`, teste de vazamento | 6 | 6 |
| Endereço de turma — a função única, a ida e volta dos 28 códigos e das 24 siglas, a varredura | 3 | 4 (com o retrato dos códigos) |
| Ponta a ponta — link do Início codificado; nenhuma disciplina de curso inativo no painel | 1 | 2 ajustados |
| Defeitos deliberados — policy de oferta desligada; endereço de turma montado à mão | 2 | — |
| Fechamento — `verificar:tudo` e CI, `CLAUDE.md`, PR com o plano de reversão das 7 e a lista de reporte (inclui D-21, o `TRUNCATE` de `migracao_log`) | 3 | `CLAUDE.md` · 9 da `specs/009` · `specs/006/tasks.md` |
| **Total** | **65** | **~62** |

**Por que o PR 1 não deixa nada meio construído (critério 2).**
- **Tudo o que ele acrescenta ao banco é exercido por teste** — pgTAP, RLS negativa e defeito deliberado —,
  e **nenhuma tela, menu ou rota aponta para o que ainda não tem tela**: o menu continua *"Cursos — em
  breve"*, e não existe `/cursos` nem `/turmas`.
- **As telas que já estão na `main` continuam inteiras**, e é **por isso** que a varredura vai no PR 1 e
  não no 2: a migration 7 sem a varredura faria curso inativo vazar para o painel de habilitação no dia do
  merge. O Início, os instrutores e a administração seguem funcionando como antes.
- **A carga do ETL continua passando** — `pnpm db:reset` seguido da carga, o caminho de todo
  desenvolvedor, é verificado no próprio PR —, e **falha cedo e dizendo por quê** em qualquer dos dez modos
  de aborto que a fatia cria (`FR-019.6`).
- **A auditoria da sigla já grava** desde o merge do PR 1, mesmo sem tela: a sigla só pode ser editada pelo
  banco até o PR 2, e o gatilho não depende de tela.
- ⚠️ **Uma coisa já está "a meio" na `main` e continua igual**: o link do Início aponta para
  `/cursos/[sigla]?turma=…`, rota que só o PR 2 entrega — é assim desde o Épico 4 (c). O PR 1 **corrige a
  codificação** do link (`FR-031.2`) e não piora nada.

### PR 2 — telas: 79 tarefas

| Bloco | Tarefas | Arquivos |
|---|---|---|
| Preparação — emenda datada da MENU-1 em `specs/008…/casca.md` (`FR-040`) | 1 | 1 |
| `lib/dominio/` — 10 módulos, regra e teste (lista em §*Estrutura*) | 20 | 20 |
| `lib/navegacao/` — contrato das 7 rotas; menu com os 4 épicos e "Cursos" disponível **no mesmo commit** de `/cursos` | 2 | 4 |
| `lib/validacao/` — curso, vigência, turma, sala | 4 | 4 |
| `lib/acoes/` — curso, vigência, turma, sala, e a tradução comum das recusas | 8 | 5 |
| Telas `/cursos` — página, consulta, carregando e erro, cartões, indicadores e gráficos, filtros | 5 | 7 |
| Telas `/cursos/[curso]` — página, consulta, carregando e erro, cabeçalho com regime vigente, quadro de avisos, abas, aba "Grade" (seletor, indicadores, lista de turmas), aba "Sobre o Curso", desativar e reativar | 9 | 10 |
| `/cursos/novo` e `/cursos/[curso]/editar` — formulário de curso, seção de regime, histórico de vigências, "Corrigir esta vigência", confirmações de sigla, classificação e limite | 7 | 5 |
| Turma — criação, ficha, formulário, quadro de avisos, diálogo de limite e de vigências desprotegidas, nota da segunda turma, não encontrada | 7 | 7 |
| `/admin/salas` — aba, página, acrescentar, desativar com aviso | 3 | 4 |
| Seletor de turma — adoção e teste de construtor único; `AvisosRecolhiveis` para `components/ciaara/` | 2 | 4 |
| Ponta a ponta — 5 percursos, amostra de cursos, teclado e acessibilidade das telas novas | 7 | 8 |
| Defeito deliberado — segundo construtor de seletor | 1 | — |
| Fechamento — `verificar:tudo` e CI, regra de cor em zero, `CLAUDE.md`, PR | 3 | `CLAUDE.md` · `specs/009` |
| **Total** | **79** | **~82** |

**Por que o PR 2 não deixa nada meio construído.** Ele só mescla com as **sete** rotas, o menu virado e as
quatro ações de sala: o teste do shell reprova "Cursos" disponível sem a tela, e a tela sem "Cursos"
disponível (`FR-039`). O que ficou fora **não aparece** — nem Avaliações e Relatório (`FR-008`), nem
progresso por disciplina (`FR-009.1`), nem alerta do 9º TA (`FR-023`).

⚠️ **Se o PR 2 precisar de migration corretiva** — a fatia (c) cresceu 47% na verificação com dado real —,
ela vale o critério 3 do mesmo jeito: remoto antes do merge.

---

## Tamanho, medido contra a fatia (c)

**A régua** é o `specs/006-cadastro-de-instrutores/tasks.md` e o PR #16 ([R-12](./research.md)).

**Adendo de 17/09/2026:** as colunas *planejada* e *depois do corte* abaixo são a estimativa do plano. A decomposição
do `tasks.md` mediu **212** tarefas (110 + 102) e **17** testes existentes a ajustar — ver o adendo de §*Entrega em
dois PRs*. A régua não muda: cada PR continua menor que as 132 da (c).

| Medida | Fatia (c) | Esta fatia, planejada | Depois do corte |
|---|---|---|---|
| Tarefas planejadas | **90** | **~149** | **~144** (65 + 79) |
| Tarefas ao final (projeção, +47%) | **132** | **~219** | **~212** |
| Migrations | **9** | **7** | 7 |
| Arquivos pgTAP novos / asserções | **5** / **59** | **7** / **~112** | 7 / ~112 |
| Arquivos de teste **existentes** a ajustar | — | **16** (R-21) | 16 |
| Arquivos em `app/` / em `lib/dominio/` | **27** / **12** | **~37** / **~11** | ~36 / ~10 |
| Arquivos tocados | **103** | **~144** | **~141** |

⚠️ **A contagem de arquivos subiu em relação à primeira versão deste plano** (~121) porque foi feita **item a
item, por PR**, e inclui os documentos e os 16 testes existentes que a primeira estimativa agregava.

**A linha de corte do `FR-009.1` foi aplicada — e só ela.**
- **Saiu:** o progresso por disciplina da aba "Grade" (`FR-009`, `RF-CURSO-03`) — **5** tarefas: a função e o
  teste, a consulta de `vw_disciplinas_execucao`, o componente e a asserção de ponta a ponta. Todas eram
  do PR 2.
- **Ficou na aba "Grade":** o seletor, os indicadores da turma selecionada, a lista de turmas com a contagem
  de avisos e o botão de nova turma.
- **Ficou todo o resto da spec.** Depois do corte, **~144 contra 90**: continua maior que a (c), e **nada mais
  foi cortado**. A resposta ao tamanho foram os dois PRs.

---

## Pendências nomeadas

| Pendência | O que é | Dono | Quando volta |
|---|---|---|---|
| **`PEND-5a-1`** | alerta do 9º TA (`FR-023`) e registro dos pares por currículo (`FR-022`) — **adiados por dado ausente, não cortados**. O número **chegou** (2, gravado em `config_parametros` no PR 1); falta **qual TA cada aula ocupou** | Épico 6 — é quem passa a gravar `ta_inicial` e `ta_final` | na fatia que gravar o TA de cada aula |
| **`PEND-5a-2`** | paridade de indicadores com o catálogo da v2.0 — total de cursos, turmas ativas, e os indicadores de turma: total, ativas, por status, por ano de início | Bernardo — escolher a fatia | fatia posterior, como **pedido separado** |
| **T132** (spec 006) | tirar o `MAX+1` de `proximo_codigo_vinculo` e `proximo_codigo_instrutor` | Bernardo | PR próprio, **depois** do PR 1 desta fatia |
| **`PEND-5a-3`** | `migracao_log` sem proteção contra `TRUNCATE` — a `service_role` pode esvaziá-la sem passar pelo gatilho (D-21). **A regra 5 do `CLAUDE.md` já diz isso**, com esta pendência | Bernardo | **fora desta fatia**, por decisão — é tabela do Épico 1 |
| **`PEND-5a-4`** | levar ao CI as provas do ETL desta fatia — as sequências, a substituição de sala e as **dez** conferências prévias —, hoje rodadas à mão com a saída registrada no PR 1. ⚠️ **Sem dado real da v2.0 no CI**: o repositório é público, e a prova tem de rodar sobre `staging` sintético | Bernardo | PR próprio, **depois** do PR 1 (decisão de 17/09/2026, pergunta 2 do `tasks.md`) |
| **`PEND-5a-5`** | **`tests/invariantes/rls/rls.test.ts` pressupõe ser o único Admin, e sobre base carregada não é.** O caso `FR-016` prova *"desativar o último Admin ativo é recusado pelo banco"*, e `app.impedir_remocao_do_ultimo_admin()` conta os **outros** Admins ativos do banco inteiro. A premissa é verdadeira só em base **recém-resetada**: a base carregada pelo ETL traz **`USR-01`** e **`USR-02`**, dois Admins reais e ativos. Com eles, a desativação **passa**, a conta Admin da suíte fica `inativo`, e as **12** falhas seguintes são `42501` **em cascata** — nenhuma delas com relação ao que se mexeu. `pnpm verificar:tudo` **não vê**, porque faz `db:reset` antes. **Correção proposta, não aplicada:** contar os Admins ativos antes e sair pelo `skip` com motivo, como o `090_reconciliacao_etl.sql` faz com a base vazia ⚠️ **A consequência de não resolver, registrada em 22/09/2026** *(decisão de Bernardo Villas Boas)*: rodar a suíte contra a base **carregada** expôs **três defeitos de tempo** que a base vazia escondia — casos do Início que liam o panorama sem esperar, medidos com a **casca em 1136 ms** e o **conteúdo em 2159 ms** —, e **`verificar:tudo` nunca os acharia**, porque faz `db:reset` antes. **Enquanto a 5a-5 e a 5a-6 não forem resolvidas, essa conferência não pode virar rotina — e é esse o ganho de resolvê-las**: rodar as suítes sobre o dado real, sempre, e não só quando alguém lembrar. | Bernardo | **fora desta fatia, por decisão de 17/09/2026** — o teste é do **Épico 1**, e o caminho documentado roda depois do `db:reset`. Registrado no `quickstart.md` |
| **`PEND-5a-6`** | **Seis casos de `tests/e2e/instrutores.spec.ts` reprovam sobre a base CARREGADA pelo ETL**, e nenhum tem relação com esta fatia: eles semeiam a própria amostra e afirmam contagens que só valem se a base **não tiver mais nada** — medido em 18/09/2026, `"11 instrutor(es)"` esperados contra os **177** reais. ⚠️ **É a mesma família da `PEND-5a-5`, e não o mesmo defeito**: lá o teste supõe ser o único Admin, aqui supõe ser o único dado. O conserto é recortar as asserções à amostra (pela OM do processo, que já existe), e é mudança na suíte do **Épico 5 (c)** — fora do escopo desta. ⚠️ **Não afeta `verificar:tudo` nem o CI**, que rodam sobre base resetada; afeta o passo 1 do quickstart | Bernardo | PR próprio, junto da `PEND-5a-5` |
| **`PEND-5a-7`** ⛔ **BLOQUEIA O MERGE DO PR 2** *(decisão de Bernardo Villas Boas, 23/09/2026)* | **`tests/e2e/instrutores.spec.ts` reprova quando roda EM PARALELO com outra suíte pesada**, e isso **não** depende da base carregada — é a irmã de carga da `PEND-5a-6`. Medido em 23/09/2026 na **árvore limpa** do commit `3442e44` (`git stash push -u` antes, `pop` depois, para não medir a fatia em curso): `inicio.spec.ts + instrutores.spec.ts` em paralelo → **3 reprovações**; as mesmas duas com `--workers=1` → **tudo passa**. Assinatura: `Error: The destination stream closed early` no `[WebServer]`, e a página parada em *"Carregando a ficha do instrutor…"*. **Causa medida e já registrada no `CLAUDE.md`**: a ficha leva **1,5 a 2,4 s**, e **4,2 a 5,1 s com quatro acessos**, dominada por `vw_instrutor_carga_anual` a ~700 ms sob RLS — contra o prazo padrão do `expect`, de **5 s**. ⚠️ **E o CI esconde**: `playwright.config.ts:71` usa `retries: process.env.CI ? 2 : 0` — no CI as duas repetições reabsorvem, local com zero a instabilidade aparece. **Verde no CI não é prova de que não existe.** ⚠️ **O custo já cobrado é o diagnóstico errado**: quem acaba de acrescentar uma suíte lê as reprovações como regressão da própria mudança — foi o que aconteceu na fatia 13 do PR 2, com a `amostra-de-cursos.spec.ts` recém-criada, e só a medição na árvore limpa desfez. ⚠️ **REMEDIDA em 23/09/2026, depois da correção da paginação de `listUsers()`: a pendência CONTINUA.** A hipótese de que a causa fosse a conta não apagada foi **descartada** — `inicio + instrutores` em paralelo, sem retries, agora reprova **5** casos (eram 3), e a assinatura é a mesma de sempre: `element(s) not found` com a página parada em carregamento, e **nunca** `already registered`. São dois defeitos independentes, e só um estava consertado. ⚠️ **DIAGNOSTICADA E CONSERTADA EM 23/09/2026, e a causa NÃO era lentidão de página: eram TRÊS CÓPIAS NÃO ENDURECIDAS DE DOIS AUXILIARES.** O padrão é sempre o mesmo — o auxiliar único foi corrigido e as cópias ficaram como estavam: (1) `listUsers()` **sem paginar** em `destino-do-login.spec.ts` e `convite.spec.ts`, com **165** contas no Auth local, fazendo a limpeza não apagar a própria conta (*already been registered*) e a busca dizer *"a credencial não foi criada"* sobre uma que existia; (2) `supabase status -o env` chamado **no carregamento do módulo**, sem ler o ambiente que `playwright.config.ts` já resolveu e sem a repetição que `conta-de-teste.ts` tem, nos mesmos dois arquivos — três chamadas por processo, e `Command failed: supabase status -o env` derrubando um caso sem relação nenhuma com a causa. Os dois passaram a usar `chaveLocal`/`apagarConta`/`contasDoAuth` do auxiliar único, e `chaveLocal` passou a **ler `process.env` antes** de chamar a CLI. **Medido depois disso, sem `retries`, em paralelo, base resetada: três execuções da suíte inteira — 251, 251 e 250 passados, com UMA reprovação na terceira**, e nenhuma das assinaturas antigas voltou. ⚠️ **O que restou é prazo, e é decisão do Bernardo.** A única reprovação foi o primeiro `expect` de um percurso longo de `/admin/salas` — uma tela que lê a lista **e** todas as turmas —, com **5 s** de prazo enquanto os passos seguintes do mesmo percurso já pediam **15 s**. Ele foi igualado aos demais **dentro daquele caso**; o que continua em aberto é a escolha geral, e as opções são duas: **(a)** elevar o prazo padrão do `expect` em `playwright.config.ts`, assumindo que telas de gestão levam mais que 5 s sob quatro processos; **(b)** otimizar o que as torna lentas — `vw_instrutor_carga_anual` a ~700 ms sob RLS na ficha do instrutor, e a leitura de todas as turmas na tela de salas. **Nenhuma das duas foi tomada aqui**, porque as duas mudam o que a suíte promete. ⚠️ **REMEDIDA DE NOVO em 23/09/2026, na Fase 19-B, e ela ENCOLHEU sem fechar.** Dois defeitos de paginação foram consertados no caminho, e nenhum deles era este: `destino-do-login.spec.ts` e `convite.spec.ts` ainda chamavam `listUsers()` **sem paginar** — o helper `conta-de-teste.ts` tinha sido corrigido, esses dois não —, e com **165** contas no Auth local a limpeza não apagava a própria conta (`already been registered`) e a busca da credencial recém-criada dizia *"a credencial não foi criada"* sobre uma credencial que existia. Os dois agora passam por `contasDoAuth`, que varre as páginas. **Medido depois disso, sem `retries`, base resetada:** a suíte **inteira** (243 casos, em paralelo) deu **três execuções seguidas com 0, 0 e 1 reprovação**; e o par nomeado `inicio + instrutores`, **três execuções: 40 passados, 40 passados, 1 reprovação**. A reprovação que sobra é sempre de `instrutores.spec.ts`, sempre por prazo, e nunca por conta duplicada. **A pendência continua aberta e continua bloqueando o merge**: o que mudou é que ela deixou de ser reproduzível a cada execução e passou a ser **1 em 3** — e um defeito de tempo que aparece um terço das vezes é mais caro de diagnosticar, não menos. **Sem conserto agora, por decisão de Bernardo Villas Boas, 23/09/2026** — otimizar a view ou rever o prazo é decisão à parte, não conserto de passagem | Bernardo | ⛔ **antes do merge do PR 2** — deixou de ser "fora desta fatia" em 23/09/2026 |
| ~~**`PEND-5a-8`**~~ | ✅ **FECHADA em 23/09/2026 — unificada no `+`, a grafia do `nuqs`** *(decisão de Bernardo Villas Boas, declaração (a))*. O `FR-036` obriga a escrita a ir pelo `useParametro`, e o `encodeQueryValue` do `nuqs` não emite `%20` — **não há costura**. O `FR-031.1` exige UMA representação, e a única alcançável é a dele. `enderecoDaTurmaNoCurso` passou a escrever `+` na consulta (o **caminho** continua `%20`), e a guarda de `inicio.spec.ts` mudou de valor esperado com a declaração. ⚠️ **O que o `%20` protegia continua protegido**: o defeito de 18/09/2026 era **espaço cru** no `href` (`FR-031.2`), e `+` não é espaço cru. ⚠️ **E um leitor manual foi consertado no mesmo passo**: `app/(app)/cursos/[curso]/consulta.ts` decodificava o `?turma=` com `codigoDaTurmaNoSegmento`, sobre um valor que o `searchParams` já entrega decodificado — inofensivo hoje, **destrutivo** para código que contenha `%`. Guarda nova: `tests/unidade/sem-decode-manual.test.ts` | — | — |
| **`PEND-5a-9`** *(não bloqueante)* | **`vw_turmas_rotulo` devolve `NULL` em 18 das 28 turmas.** **Causa, em uma linha:** `rotulo_completo` e `nome_completo_curso` montam a cadeia com `||`, e `t.turma` (o rótulo `T1`/`T2`) é nulo nessas 18 — `||` com `NULL` zera a cadeia inteira. **Conserto:** `concat_ws` ou `coalesce(t.turma, '')` na montagem; **não foi feito agora, e não há migração para ela nesta fatia**. ⚠️ **NENHUMA TELA USA A VIEW** — medido em 23/09/2026 por varredura em `app/`, `lib/`, `components/`, `tests/` e `scripts/`: os únicos acertos são comentários explicando por que ela foi **recusada** (`FR-034`, A-13, D-3) e metadados de FK no `lib/tipos/database.ts` gerado. Por isso **não bloqueia o merge**: ela não alimenta nada. O seletor usa `código · Status`, de `lib/dominio/seletor-de-turma.ts` | Bernardo | fatia futura, quando alguma tela precisar da view |

**O número do 9º TA, decidido em 17/09/2026: 2.** Até dois dias por semana ISO com uso do 9º tempo, nenhum
aviso; a partir do terceiro, aviso informativo. Gravado como `regime.nono_ta_dias_por_semana_sem_aviso`,
natureza **`operacional`** — ⚠️ **não** `normativo`, como a pergunta dizia: o número é decisão da Divisão, e a
norma que ele parametriza, o `RF-HOR-03.1`, fica no fundamento. "Uso do 9º tempo" é ocupar um tempo marcado
`excepcional` na configuração de horário, e não o número 9 escrito em código ([R-25](./research.md)).

**Achado fora de escopo — `PEND-5a-3`:** `migracao_log` é protegida por gatilho contra `UPDATE` e `DELETE`,
mas **não** contra `TRUNCATE`, e a `service_role` tem esse privilégio nela ([R-22](./research.md)). **Provado**
numa tabela descartável com o mesmo gatilho: `DELETE` recusado, `TRUNCATE` esvaziou. Por decisão de Bernardo,
a regra 5 do `CLAUDE.md` foi **anotada** com a lacuna — *"documento que promete garantia inexistente é pior
que a lacuna"* —, e nada foi corrigido.

---

## Emendas feitas na spec em 17/09/2026

*Números livres atribuídos, sem reutilizar número ocupado nem renumerar requisito existente.*

| Tipo | Números novos |
|---|---|
| Requisitos | `FR-013.1`, `FR-014.1`, `FR-015.2`, `FR-016.1`, `FR-017.9`, `FR-017.10`, `FR-018.1`, `FR-019.3`, `FR-019.4`, `FR-019.5`, `FR-021.7`, `FR-021.8`, `FR-021.9`, `FR-024.1`, `FR-025.2`, `FR-025.3`, `FR-026.1`, `FR-029.7`, `FR-029.8`, `FR-030.1`, `FR-033.1`, `FR-046.1` — na segunda rodada, **`FR-014.2`** e **`FR-019.6`**; na terceira, **`FR-014.3`** |
| Critérios | `SC-002.3`, `SC-004.4`, `SC-011.3`, `SC-011.4`, `SC-011.5`, `SC-014.4` — na segunda rodada, **`SC-001.6`**, **`SC-011.6`** e **`SC-011.7`**; na terceira, **`SC-001.7`** |
| Divergências | `D-20` e, na terceira rodada, **`D-21`** |
| Perguntas | `B-21` e `B-22`, **ambas fechadas** |
| Emendados no lugar | `FR-002`, `FR-003.2`, `FR-004`, `FR-008`, `FR-009` e `FR-009.1` (corte aplicado), `FR-011`, `FR-013`, `FR-014`, `FR-016`, `FR-018`, `FR-019.1`, `FR-021.5`, `FR-022`, `FR-023` (adiado), `FR-028.1`, `FR-028.2`, `FR-031.4`, `FR-033`, `FR-034`, `FR-035`, `FR-037`, `FR-046`, `SC-002.2`, `SC-011`, Assumption 1, *Fora de escopo*, D-12, *Clarifications* (sessão de 17/09/2026) e os 20 pontos em aberto fechados |

---

## Complexity Tracking

| Violação | Por que é necessária | Alternativa mais simples recusada porque |
|---|---|---|
| **Sete migrations** numa fatia — Princípio VI | sete assuntos com raio e reversão independentes; `db push` isola falha por arquivo | **uma migration**: uma falha em regime desfaz a reconciliação de salas. **Aceito por Bernardo em 17/09/2026 (B-1)** |
| **Três RPCs de escrita e uma de leitura** — Princípio XI.5 | transação do banco para curso com regime, registrar e corrigir vigência; e a leitura da proteção precisa do fato inteiro, sob porteiro | **Server Action com várias escritas**: não é transação; **leitura pela RLS de quem edita**: pode não ver a atividade global que trava |
| **Dois gatilhos de restrição adiados** — mecanismo novo no projeto | únicos que impõem, por qualquer caminho, *"`vigente_ate` só com sucessora"* e *"curso só com regime"* | **gatilho imediato**: recusaria criar curso e vigência juntos; **gatilho automático de sucessão**: derruba duas asserções do Épico 1 (R-19) |
| **Tabela nova** `curso_sigla_historico` — `FR-046` | único registro da troca de sigla que nenhuma edição posterior apaga. **Decidido por Bernardo em 17/09/2026 (B-21)** | **quarteto de auditoria**: perde a sigla anterior, *"auditoria sem auditoria"*; **coluna em `cursos`**: o rastro dentro da linha que ele fiscaliza |
