# Quickstart — como validar cada PR, de ponta a ponta

> Guia de **validação**, não de implementação. O que cada PR precisa ter de pé, o comando que o
> prova e o resultado esperado. A suíte vive na porta **3100**; antes de rodar, derrube o que estiver
> nela. Se faltar memória, `--workers=2`.

## Pré-requisitos (uma vez)

```bash
pnpm db:reset:limpo            # o mesmo comando do CI; sem Admin extra (gotcha 8)
pnpm db:tipos:conferir         # lib/tipos/database.ts em dia — reprova depois do PR B até regenerar
```

---

## PR 0 — o domínio puro

**De pé:** `lib/dominio/dsa/*.ts` e `lib/dominio/distribuicao-semanal.ts`, cada um com o `RN-` no
topo e o teste ao lado.

```bash
pnpm test:unidade -- tests/unidade/dsa          # ou o padrão que o tasks fixar
pnpm lint                                       # a FRONTEIRA 1 cobre a subpasta (medido)
```

| Prova | Esperado |
|---|---|
| G45 inteira: 9 TA nomeados | `07:50–08:35 … 11:10–11:55 \| 13:05–13:50 … 15:35–16:20`, **5** de manhã |
| G50 inteira | `08:10–09:00 … 11:10–12:00 \| 13:05–13:55 … 15:50–16:40`, **4** de manhã |
| as 5 configurações do catálogo (40 TA) | relógio idêntico ao `hora_inicio`/`hora_fim` armazenados, **sem** arredondar |
| EI do C-Espc-HN: 7 TA e 8 TA | **15:50–16:40** e **16:45–17:35** — os dois **exatos** contra a planilha (`plan.md` §7.3) |
| bloco de 4 TA no 3º tempo da G45 | `["09:30–11:55", "13:05–13:50"]` (`SC-011`) |
| feriado `dia_inteiro` / `informativo` | desconta / não desconta (critério 6) |
| TFM 7 TA · LHFC 40 · outra 26 · 9º TA | bloqueia · nada · alerta · alerta |
| avaliação `herdado` + `ta_inicial = 1` · avaliação nova no TA 1 | sem posição · **posicionada** |
| assinatura: linha do curso + GERAL | o curso vence; sem vigente → `null` |
| **defeito deliberado 1**: `distribuicao-semanal` copiada para `dsa/` | `distribuicao-unica.test.ts` **reprova**, nomeando o arquivo |
| **defeito deliberado 2**: `import … "@supabase/supabase-js"` em `lib/dominio/dsa/grade.ts` | ⚠️ **`pnpm lint` reprova pela FRONTEIRA 1** — é o que prova que o ESLint alcança a **primeira subpasta** de `lib/dominio/` (`SC-018`) |

---

## PR B — a migration única

**De pé:** `supabase/migrations/*_dsa_lancamento_sem_ue_e_conflito.sql`, `supabase/tests/116_dsa.sql`,
`tests/invariantes/rls/dsa.test.ts`, `lib/tipos/database.ts` regenerado.

```bash
pnpm db:reset:limpo && pnpm db:tipos
pnpm test:invariantes                           # pgTAP — inclui a I-13 do 010_estrutura.sql
pnpm test:rls                                   # sessão real
```

| Prova | Esperado |
|---|---|
| `116_dsa.sql` | coluna e FK existem; aula sem UE **e** sem disciplina → recusada; aula sem UE em curso `unidades_de_ensino` → **recusada**; em curso `competencias` com tópico → aceita; EI de escopo `global` → recusada; as duas views com `security_invoker=true`; **a função sem sessão levanta `42501`** |
| `rls/dsa.test.ts` | os 5 perfis de leitura: `insert`/`update` nas 3 tabelas → `42501`, valor no banco **igual** antes e depois (`SC-016`); Operador recortado: `conflitos_da_semana` devolve a ocupação alheia **sem `turma_id`** e `select` direto na turma alheia devolve **0 linhas** — **no mesmo caso**; Admin: controle positivo |
| **ordem certa (DoD 8)** | com a função **comentada**, o caso do Operador recortado **reprova** ("não viu o conflito"); descomentada, passa |
| siglas e categorias (`T040`, `T040.1`) | `metodologias` com **9** linhas com `metadados.sigla` e **22** no total; `tipos_atividade` com **10** com `metadados.categoria` e *Licença de Pagamento* **sem** nenhuma; rodar a migration **duas vezes** não muda contagem (idempotente) |
| **o `coalesce` do `H3`** | `insert` com `disciplina_id` **inexistente** → o `CHECK` **recusa**; ⚠️ sem o `coalesce` ele **passaria**, e é por isso que o caso existe |
| **prova de reversão (DoD 6)** | numa base descartável: `pg_dump` → `up` → `down` → `pg_dump`; `diff` **vazio**, inclusive nas `reloptions` das duas views |
| **o rito do remoto** | backup `--somente-copia` citado · dry-run só com ela · `db push` 0 depois da sua autorização · **N e N** migrations · impressão digital idêntica · 1.566/188/664 linhas intactas · 0 policies de `DELETE` · Production `/login` 200 |

---

## PR 1 — ver a semana

```bash
pnpm test:e2e -- tests/e2e/dsa-ver.spec.ts
```

| Percurso (por clique) | Esperado |
|---|---|
| ficha da turma → **Abrir o DSA** | a grade da semana corrente; URL **sem** `?semana=` (padrão) |
| **próxima** duas vezes → **voltar** do navegador | a semana anterior (`RF-NAV-04`) |
| turma com vigência mudada em 1º/06 → semana de maio | relógio de **maio** (critério 4) |
| feriado `dia_inteiro` na quarta | quarta **bloqueada** com a descrição; `informativo` → aviso, não bloqueia |
| turma do ETL com as 1.566 | tudo em **"Sem posição"**, sem quebra (`SC-015`) |
| avaliação migrada (`ta_inicial = 1`) · avaliação nova no TA 1 | faixa · grade (`SC-017`) |
| sala no cabeçalho | `sala_alocada` aparece **uma vez** no cabeçalho da semana; um bloco com `local` diferente sai **destacado**; os iguais, **não** (`FR-006`) |
| curso sem regime | TA numerados **sem relógio** + aviso com link para a vigência |
| EAD puro | a frase da `Q-13`, sem grade |
| `?sabado=sim` · lançamento no sábado sem o parâmetro | coluna aparece nos dois casos |
| viewport 1280×600 | a grade rola na **horizontal sozinha**; `document.body.scrollWidth` **=** `clientWidth` |
| lista `/turmas` → ação **DSA** · `/inicio` → **DSA da semana** | chegam (os três caminhos) |

---

## PR 2 — lançar

```bash
pnpm test:e2e -- tests/e2e/dsa-lancar.spec.ts
```

| Percurso | Esperado |
|---|---|
| clicar célula → disciplina → UE → 2 TA → gravar | **≤ 4** campos tocados (`SC-009`, contados); instrutor, técnica, local, conteúdo **já preenchidos** |
| lista de UE | prevista, lançada, restante por UE — de `vw_unidades_ensino_execucao` (`T068.1`) |
| 45 TA de uma semana do C-Ap-HN | sem erro, sem recarregar (`SC-010`) |
| trocar o instrutor **deste** lançamento | o outro lançamento e `turma_disciplina_instrutor` **iguais** no banco (`SC-012`) |
| **instrutor não habilitado** | `lancar` **recusa** com `dsa_instrutor_nao_habilitado`, e o `select` depois mostra que **nada** foi gravado (`T065.2`); o habilitado grava — controle positivo; **avaliação não cobra habilitação** (`RN-INST-01` delimitada) |
| instrutor **inativo** | não aparece no seletor |
| a lista de UE | cada UE mostra **prevista, lançada e restante** (`FR-018`, `T068.1`) |
| aula **sem UE** no C-Espc-HN com tópico · no C-Ap-HN | grava e aparece · **recusada** com a frase |
| avaliação com fiscal **externo** | aceita; CHD da disciplina cresce (critério: `RN-EVT-03`) |
| **"Estudo Individual da semana"** | 5 lançamentos (ou 4 com feriado), cada um no slot **seguinte ao último TA daquele dia** — num dia de 8 TA o EI é o 9º; num de 9 TA, o 10º (`D-4`); segundo clique **não duplica** |
| TFM com 7 TA | **recusado** (`dsa_teto_tfm`); 26 TA de outra → grava com **alerta** |

---

## PR 3 — imprimir

**Antes:** a correção do relógio registrada por você (plan §7) e **conferida por leitura** — a semana
testada é **a partir do `vigente_de`**.

```bash
pnpm test:e2e -- tests/e2e/dsa-imprimir.spec.ts
```

| Percurso | Esperado |
|---|---|
| grade → **Imprimir** | `/print/dsa?turma=&semana=&ano=` com os mesmos parâmetros; **sem** casca |
| `page.pdf({ format: "A4", landscape: true })` da semana de 45 TA + sábado | **1** página (`SC-001`) |
| rodapé | assinaturas **preenchidas** (critério 2); duas vigências semeadas → a reimpressão de março traz a de março (critério 3) |
| bloco de 4 TA no 3º tempo | **duas** linhas de HORÁRIO (`SC-011`) |
| rodapé | tabela de CH e legenda só com o que aparece (`SC-014`) |
| `page.content()` | nenhum `undefined`/`null`/`#REF!`/uuid (`SC-013`) |
| semana sem TA | imprime, com o aviso **na tela** antes (`SC-015`) |
| **a jornada do critério 8** | `dsa-jornada.spec.ts`: ficha → *Abrir o DSA* → lança → vê na grade → *Imprimir* → PDF de **1** página, **num percurso só** e **por clique** (`SC-008`) |
| a linha `OBSERVAÇÕES:` | aparece **em branco** no rodapé (`H8`, `T082.1`) |
| sem responsável vigente (semeado) | linha **em branco** |

---

## PR 4 — editar, mover, excluir · conflitos

```bash
pnpm test:e2e -- tests/e2e/dsa-mover.spec.ts tests/e2e/dsa-conflito.spec.ts
```

| Percurso | Esperado |
|---|---|
| mover terça → quinta **só pelo teclado** (`Enter` → *Mover para…*) | mesmo `id`, `criado_por` intacto, `editado_em` carimbado (critério 7, `SC-007`) |
| arrastar e soltar | mesmo resultado |
| excluir | diálogo descreve o efeito; some da grade; `status = 'inativo'` no banco; **zero** `DELETE` |
| mover linha histórica sem UE em curso com UE | a tela **pede a UE**; sem ela, a frase da catraca |
| curso fora de oferta | a frase, não o `42501` cru |
| Admin: mesmo instrutor, TA sobrepostos, **turmas diferentes** | ambos marcados (critério 5); gravação **não** impedida |
| posicionar da faixa "Sem posição" | é o mesmo `mover` |

---

## PR 5 — situação e CH

| Prova | Esperado |
|---|---|
| semana 20 selecionada | CH acumulada **até a 20** (`RF-DSA-05`) |
| disciplina sem lançamento · com · concluída · com conflito | Aguardando · Em andamento · Concluída · Conflitou |
| lançamento com data futura | **conta** e aparece marcado *lançado à frente* (`Q-2`); `chd_executada` da ficha **igual** à de antes |
| por UE | prevista, lançada, restante (`vw_unidades_ensino_execucao`) |

---

## Antes de cada PR

```bash
pnpm verificar          # tipos, lint, formatação, unidade, build — alvo 5 min
pnpm verificar:tudo     # + pgTAP, RLS, ponta a ponta — tem de coincidir com o CI (SC-005)
```

Verde local e vermelho no CI é **defeito da verificação**, não azar.
