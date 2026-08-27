# Research: Refatoração de View State Inicial, Padronização de Datas e UI/UX (Módulo Disciplinas)

Nenhum `[NEEDS CLARIFICATION]` restou do `spec.md` (as 2 ambiguidades reais já foram resolvidas no
`/speckit-clarify`). As decisões abaixo são de implementação — como satisfazer cada FR sem violar a
constitution nem duplicar mecanismo já existente.

## 1. Estado inicial agregado (FR-001/FR-002/FR-004.1/SC-001/SC-006)

**Decision**: Uma função de backend nova, `getDisciplinasAnoVigente(ano)` (`lib/acoes/cronograma.ts`), lida
uma única vez por sessão de carregamento da aba. Ela:
1. Lê `turmas` uma vez, filtra por `Ano_Letivo === String(ano)` e `Status !== 'Cancelada'`.
2. Lê `turma_disciplina` uma vez, filtra pelas turmas do passo 1.
3. Lê `disciplinas` uma vez (código/nome/CH quando a linha de turma não tiver override).
4. Lê `registros_aula` **uma única vez**, agregando CH executada por chave composta
   `ID_Turma + '|' + ID_Grade` (nunca só `ID_Grade` — várias turmas podem compartilhar a mesma
   `ID_Grade`, diferente de `getDisciplinasDaTurmaComRitmo`, que é escopada a 1 turma e por isso
   podia usar `ID_Grade` isolado).
5. Retorna uma lista já pronta para a tabela: cada item traz `idCurso` (novo, necessário porque a
   tabela agora combina cursos — a Visão 2 de hoje nunca precisou disso, o curso já estava implícito
   na seleção), `idTurma`, código/nome da disciplina, `Previsao_Inicio`/`Previsao_Termino`,
   `ID_Instrutor`, e `chExecutada`.

**Rationale**: Mesmo padrão de leitura-única-agregação-em-memória já usado por
`getContextoInicial`/`getEstatisticasDisciplinas`/`getDisciplinasDaTurmaComRitmo` — nenhuma leitura
por turma, satisfaz FR-004.1/SC-006 diretamente. `lib/acoes/cronograma.ts` é o arquivo que já possui toda a
lógica de agregação cross-turma (`getDisciplinasDaTurmaComRitmo`, `resolverPeriodoEfetivo_`), então a
nova função fica com a mesma "dona" (Princípio VI).

**Alternatives considered**:
- *Chamar `getDisciplinasDaTurmaComRitmo(idTurma)` uma vez por turma do ano vigente, no cliente.*
  Rejeitado — reintroduz exatamente o padrão de N chamadas por N turmas já identificado e corrigido
  na spec 017 (DSA), na mesma sessão que este próprio módulo já corrigiu de forma análoga (spec 031
  trocou estatísticas 100% client-side por 1 endpoint parametrizado, pela mesma razão).
- *Filtrar `AppState.ctx.turmas` no cliente e pedir só `turma_disciplina`/`disciplinas` via
  `crudListar` (sem CH Cumprida na tabela agregada).* Era a Option B da clarificação de performance —
  rejeitada por Bernardo (escolheu incluir CH Cumprida, Option A).
- *Puxar `registros_aula` inteiro para o cliente via `crudListar` e agregar em JS.*
  Rejeitado — a aba já tem 1.753+ linhas e cresce a cada aula lançada; nenhuma outra função do
  projeto expõe essa aba inteira ao cliente (todas as agregações client-facing acontecem no
  servidor: `lib/acoes/estatisticas.ts`, ``app/layout.tsx` + `lib/supabase/server.ts`, `lib/acoes/cronograma.ts``), quebraria esse precedente sem ganho
  real sobre uma função de agregação server-side.

## 2. Ano vigente calculado dinamicamente (FR-002)

**Decision**: O frontend calcula `new Date().getFullYear()` no carregamento da aba e passa esse
valor como parâmetro para `getDisciplinasAnoVigente(ano)`. O backend nunca assume o ano sozinho.

**Rationale**: Mesmo padrão de testabilidade já usado em `resolverTurmaEmDestaque_(turmasDoCurso,
hoje)` (recebe "agora" como parâmetro em vez de chamar `new Date()` internamente) — função pura
testável com qualquer ano sintético, sem mockar relógio do sistema.

**Alternatives considered**: Calcular o ano dentro do backend (`new Date().getFullYear()` direto em
`lib/acoes/cronograma.ts`). Rejeitado — dificulta teste automatizado determinístico (a suíte já evita depender
do relógio real sempre que possível) e não muda o resultado observável.

## 3. Bug real de gravação de data (FR-008)

**Decision**: Estender `ehColunaData_(h)` (``lib/supabase/server.ts`:173`, hoje `/^Data|_Data|Data_/`) para também
reconhecer `Previsao_Inicio`/`Previsao_Termino` — por nome literal (allowlist de 2 nomes), não por
regex mais permissivo, para não capturar nenhuma outra coluna por acidente.

```
// antes:  return /^Data|_Data|Data_/.test(h);
// depois: return /^Data|_Data|Data_/.test(h) || h === 'Previsao_Inicio' || h === 'Previsao_Termino';
```

Isso faz `crudAtualizar`/`crudCriar` (``lib/acoes/crud.ts`:96`/``lib/acoes/crud.ts`:131`) passarem esses 2 campos por
`isoParaDate_` antes de `setValue` — a mesma conversão timezone-safe (`new Date(ano, mes-1, dia)`,
nunca `new Date(isoString)`) já usada para toda coluna `Data*` do projeto.

**Rationale**: Achado real confirmado por leitura de código (``lib/acoes/crud.ts`:75-139`) antes de escrever
qualquer requisito: o pedido original descrevia "criar/ajustar o parser de gravação" como se nada
existisse — na verdade o parser já existe e já é correto (`isoParaDate_`), só não é acionado para
essas 2 colunas porque `ehColunaData_` é orientado a nome de coluna (`RN-CRUD-01`) e
`Previsao_Inicio`/`Previsao_Termino` não seguem a convenção `Data*`/`*_Data*` do resto do schema.
Corrigir a função de reconhecimento (1 linha) resolve o problema na origem, sem duplicar lógica de
parsing em `atualizarTurmaDisciplina` (`lib/acoes/liq.ts`) nem em nenhum outro lugar.

**Alternatives considered**:
- *Converter a data explicitamente dentro de `atualizarTurmaDisciplina` antes de chamar
  `crudAtualizar`.* Rejeitado — duplicaria a lógica de conversão de data num único call-site em vez
  de corrigi-la no motor genérico; qualquer outra função futura que grave `Previsao_Inicio`/
  `Previsao_Termino` via `crudAtualizar`/`crudCriar` herdaria o mesmo bug.
- *Renomear as colunas para incluir "Data" (ex.: `Data_Previsao_Inicio`).* Rejeitado — mudança de
  schema desnecessária para um bug de reconhecimento de nome; `Previsao_Inicio`/`Previsao_Termino`
  já são lidas por várias outras funções (`lib/acoes/cronograma.ts`, `lib/acoes/liq.ts`, `lib/dominio/motor-preditivo.ts`,
  `lib/dominio/sugestao-dsa.ts`) que teriam que ser tocadas só por causa do rename — violaria Princípio VI
  (mudança cirúrgica) para um ganho equivalente ao da allowlist de 2 nomes.

## 4. Formato dd/mm/aaaa no frontend (FR-005/FR-006/FR-007)

**Decision**: Substituir os 2 `<input type="date">` do painel de edição (``app/(app)/disciplinas/page.tsx`:392`/
`:396`) por `<input type="text">` com máscara ao vivo, seguindo exatamente o padrão já usado para
CPF/CEP/Telefone/RETELMA/NIP (``app/(app)/instrutores/page.tsx`:816-841`, spec 025): uma função pura
`mascaraDataBr_(valorDigitado)` que aceita só dígitos e insere as barras (`dd/mm/aaaa`), acionada via
`oninput="this.value = mascaraDataBr_(this.value)"`. Duas funções de conversão pura completam o
ciclo: `dataBrParaIso_(dataBr)` (dd/mm/aaaa → yyyy-MM-dd, valida dia/mês/ano calendaricamente antes
de enviar ao backend, cobre FR-007) e `isoParaDataBr_(iso)` (yyyy-MM-dd → dd/mm/aaaa, usada para
formatar toda exibição de data nas tabelas, cobre FR-005).

**Rationale**: `<input type="date">` nativo sempre segue a localização do sistema operacional do
usuário — não existe atributo/CSS que force literalmente `dd/mm/aaaa` em todo navegador (limitação
de plataforma, não de implementação). O padrão de máscara já está validado em produção desde a spec
025 (mesmo arquivo `components/ciaara/`/`app/(app)/instrutores/page.tsx`, mesmo formato de função pura testável),
zero dependência nova.

**Alternatives considered**:
- *Manter `<input type="date">` e só reformatar a exibição na tabela.* Rejeitado — não cumpre FR-006
  (campo de entrada também precisa ser literalmente dd/mm/aaaa, não apenas a tabela) nem é
  consistente entre navegadores/SOs diferentes, o problema original que o pedido levanta.
  Também não haveria como validar "31/02" de forma unificada com o resto do dado.
- *Usar uma biblioteca de datepicker externa.* Rejeitado — Princípio III proíbe dependência nova sem
  justificativa forte; o padrão de máscara já resolve o problema com o dependencies-zero já em uso.

## 5. Painel de edição como modal centralizado (FR-009/FR-010)

**Decision**: `painelEdicaoDisciplinaTurma` deixa de ser uma `<div style="display:none">` inline e
passa a ser um modal Tailwind CSS + shadcn/ui real (`class="modal fade"` → `.modal-dialog.modal-dialog-centered`
→ `.modal-content`), instanciado via `new Tailwind.Modal(elemento)` e `.show()`/`.hide()` (API JS
já disponível, o pacote `tailwindcss` + `shadcn/ui` carregado desde sempre em `app/globals.css`). O botão
"Cancelar" e o clique no backdrop (comportamento padrão do componente) fecham sem salvar.

**Rationale**: `.modal-dialog-centered` é a classe nativa do Tailwind CSS + shadcn/ui para centralização vertical
— resolve FR-009 (`position: fixed`/centralização/backdrop escurecido do pedido original) sem CSS
customizado, mesma convenção já estabelecida no projeto de preferir componente nativo do framework
já carregado a reimplementar em CSS puro (Épico A — `data-bs-theme`; Épico 009 — `Offcanvas`; spec
025 — `Toast`). Diferente da Ficha do Instrutor (specs 023-025, que teve que abandonar `.modal` por
causa de um bug de impressão dentro do modal), este painel de edição nunca é impresso — o bug que
motivou aquela reversão não se aplica aqui.

**Alternatives considered**:
- *CSS customizado (`position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`),
  literal ao texto do pedido original.* Rejeitado — Tailwind CSS já resolve exatamente isso com uma
  classe nativa testada, reimplementar manualmente é o tipo de risco que o Épico A já rejeitou
  explicitamente para outros componentes (contraste de tema, `data-bs-theme`).

## 6. Formatação padronizada de nome do instrutor (FR-011/FR-012/FR-013)

**Decision**: Substituir toda montagem manual de nome em `app/(app)/disciplinas/page.tsx` por chamadas a
`formatarNomeInstrutor_(posto, esp, nomeCompleto, nomeGuerra, isHTML)` (já existente,
``components/ciaara/`:129`) — 2 pontos de uso: `resumoInstrutoresCompacto_` (célula da tabela, `isHTML=true`
para preservar o negrito) e a lista de checkboxes de instrutores habilitados no painel de edição
(linha 379-380 atual, já usa só `inst.Nome_Completo`, também passa a usar a função com `isHTML=true`
dentro do `<label>`).

**Rationale**: Função já existe, já cobre exatamente os 3 componentes citados no pedido
(posto/graduação, especialidade, nome completo com nome de guerra em negrito) e já lida com
degradação seguida para instrutor órfão (chamada com campos vazios não lança exceção). Nenhuma
função nova necessária — só trocar os 2 call-sites.

**Alternatives considered**: Nenhuma — a única alternativa (duplicar a lógica de formatação dentro
de `app/(app)/disciplinas/page.tsx`) é exatamente o que FR-012 proíbe.
