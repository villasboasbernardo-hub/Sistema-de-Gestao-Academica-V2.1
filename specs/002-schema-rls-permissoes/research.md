# Fase 0 — Pesquisa e decisões de projeto

**Fatia**: Épico 1 — Schema PostgreSQL, RLS e matriz de permissões
**Data**: 2026-08-28
**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)

Sete pontos exigiam decisão antes de escrever a primeira migration. Nenhum é `NEEDS CLARIFICATION`
remanescente da spec — todos surgiram **ao planejar**, que é o momento certo de encontrá-los.

Formato: **Decisão** · **Motivo** · **Alternativas descartadas**.

---

## 1. A relação com `docs/sql-referencia/`: reaproveitar quanto?

**Decisão.** Reaproveitar como **ponto de partida revisável**, arquivo a arquivo, com **três pontos
reescritos** e todo o resto conferido linha a linha antes de entrar numa migration.

| Ponto | Referência | Migration do Épico 1 |
|---|---|---|
| Inventário | 26 tabelas | **27** — entra `unidades_ensino` |
| Grão de `registros_aula` | `disciplina_id` obrigatório | **`unidade_ensino_id`** — §2 |
| CH executada da disciplina | agregada por `disciplina_id` do fato | agregada **via unidade de ensino** — §4 |

**Motivo.** Os seis scripts foram aplicados em ordem contra um PostgreSQL 16 real, com sessão
autenticada de verdade, e **encontraram dois defeitos de produção** que nenhuma revisão de código
pegaria: o `GRANT` do schema `extensions` e o gatilho anti-escalonamento bloqueando o próprio ETL.
Descartar esse trabalho para reescrever do zero seria jogar fora a validação junto com o código. Mas
copiá-los sem ler contradiz a convenção do CLAUDE.md — *"o SQL é escrito à mão, nunca gerado por diff
não lido"* — e reintroduziria o grão antigo com autoridade.

**Alternativas descartadas.** *Copiar verbatim*: traria `registros_aula` no grão de disciplina, que é
exatamente o risco nomeado no documento 06. *Reescrever do zero*: perderia as duas correções de
produção e os comentários que explicam **por que** cada constraint existe — que são metade do valor
daqueles arquivos.

---

## 2. `registros_aula.unidade_ensino_id` é obrigatório ou aceita vazio?

**Decisão.** **Obrigatório.** E `registros_aula` **não guarda `disciplina_id`** — a disciplina é
alcançada pela unidade de ensino.

**Motivo.** É a leitura literal de *"`registros_aula` nasce no grão de Unidade de Ensino"* (BRIEF
§2.2). Guardar `disciplina_id` em paralelo criaria a segunda fonte de verdade que a rota (b) existe
para eliminar: bastaria um lançamento em que a disciplina da coluna divergisse da disciplina da UE
para ninguém saber qual das duas vale.

**E o risco de Q1.b?** Nenhum, e o motivo é o momento. A tabela nasce **vazia** no Épico 1 e só recebe
dado no Épico 2. Se Q1.b escolher a opção C — vínculo opcional para linha migrada —, relaxar a
obrigatoriedade é `alter table … alter column … drop not null` sobre uma tabela vazia: uma linha, sem
retrabalho. O caminho inverso é que seria caro. Nascer obrigatório **força Q1.b a ser respondida antes
da carga**, em vez de silenciosamente resolvida por um `NULL` que ninguém notou.

**Alternativas descartadas.** *Aceitar vazio desde já*: mais confortável, e é a rota (a) voltando pela
porta dos fundos — a agregação passaria a ter dois caminhos, e o primeiro lançamento sem UE viraria
precedente. *Manter `disciplina_id` "por segurança"*: é precisamente a segunda coluna gravada que o
documento 05 §7.6 e o BRIEF §2.2 proíbem.

---

## 3. Como garantir RN-MAT-01 sem `disciplina_id` no fato

**A regra.** *"Uma aula ou avaliação só pode ser lançada para uma disciplina que pertença ao mesmo
curso da turma selecionada"* — `RN-MAT-01`, **Risco: Alto**.

Com o grão de UE, o fato conhece `turma_id` e `unidade_ensino_id`. Verificar a regra exige percorrer
`unidade_ensino → disciplina → curso` e `turma → curso` e comparar.

**Decisão.** **Cadeia de chaves compostas** — a regra vira declarativa e o motor a impede.

```
turmas             unique (id, curso_id)
disciplinas        unique (id, curso_id)
unidades_ensino    curso_id  +  fk (disciplina_id, curso_id) → disciplinas (id, curso_id)
                   unique (id, curso_id)
registros_aula     curso_id  +  fk (turma_id, curso_id)          → turmas (id, curso_id)
                             +  fk (unidade_ensino_id, curso_id) → unidades_ensino (id, curso_id)
```

Um lançamento cuja turma e cuja unidade de ensino pertençam a cursos diferentes **não tem `curso_id`
que satisfaça as duas chaves ao mesmo tempo**. A regra passa a ser impossível de violar, sem gatilho e
sem código.

**`curso_id` aqui não é segunda fonte de verdade.** É componente de chave composta: o motor garante
que ele concorda com a origem, e divergir é o que as duas chaves impedem. O documento 04 já endossa a
técnica ao registrar, como implementação de RN-MAT-01, *"FK composta `(curso_id, disciplina_id)` para
validar instrutor↔disciplina e disciplina↔curso↔turma em uma única declaração"*.

**Alternativas descartadas.** *Gatilho de validação*: funciona, mas é código a manter, roda por linha
e pode ser contornado por operação em massa que o desabilite. *Deixar para `lib/dominio/`*: violaria a
proibição do BRIEF §1 — *"nenhuma regra de negócio implementada apenas na UI"* — e RN-MAT-01 é de
risco alto justamente por ser fácil de esquecer num ponto de lançamento. *Não garantir*: é o estado da
v2.0, que a migração existe para superar.

**Consequência a registrar — e a cadeia de `avaliacoes` NÃO é a mesma.** `avaliacoes` referencia
**disciplina**, não unidade de ensino. A cadeia lá é `(turma_id, curso_id) → turmas(id, curso_id)` e
`(disciplina_id, curso_id) → disciplinas(id, curso_id)`, com `curso_id` também em `avaliacoes`.
Descrevê-la como "a mesma" foi o achado **M1** da análise de 29/08/2026: quem implementasse pela
descrição antiga procuraria uma FK para `unidades_ensino` que não existe naquela tabela.

**Requisito de origem:** **FR-061** (a garantia) e **FR-062** (a asserção nomeada). Ambos foram
acrescentados à spec em 29/08/2026, depois de a análise apontar que esta decisão não tinha requisito.

---

## 4. "CH executada da disciplina" com o fato no grão de UE

**Decisão.** **Duas views**, uma sobre a outra:

- `vw_unidades_ensino_execucao` — por unidade: previsto (do currículo), executado (soma dos fatos),
  saldo. **Existe porque o agregado por disciplina precisa dela**, não por antecipação de tela: sem ela
  a agregação por disciplina teria de repetir a soma das unidades em cada consulta. Que um futuro
  diário de classe venha a consumi-la é consequência, não justificativa — a distinção importa por
  causa do Princípio X (achado L4 da análise de 29/08/2026).
- `vw_disciplinas_execucao` — **reescrita**: agrega a anterior por disciplina × turma e continua
  somando avaliação e vista, como exige `RN-EVT-03`.

A assinatura pública de `vw_disciplinas_execucao` **não muda**. Quem a consome — CHD, DSA, Cronograma,
motor preditivo — não percebe a mudança de grão, que é exatamente o que a rota (b) prometeu.

**Motivo.** `GENERATED … STORED` está fora de questão: depende de agregação entre tabelas, e o
PostgreSQL exige imutabilidade. Sobra VIEW, que é o que o documento 05 §7.6 já determina para
*"`Carga_Horaria_Ministrada_Ano` — VIEW agregada"*.

**Alternativas descartadas.** *Coluna gravada em `disciplinas`, atualizada por gatilho*: é a segunda
fonte de verdade proibida, e o gatilho erra em carga em massa. *View materializada*: precisaria de
política de atualização; com ~2.400 fatos, a view comum resolve sem esforço mensurável — e o documento
05 §10 pede explicitamente *"prefira VIEW a coluna materializada quando as duas resolverem"*.

---

## 5. Quantas migrations, e cortadas onde

**Decisão.** **Seis**, na ordem temática dos scripts de referência (00→05), como o documento 42 exige
— *"uma migration por grupo temático, cada uma aplicável isoladamente e com plano de reversão"*.

**Motivo.** O corte por tema é o que torna a reversão pensável: reverter "os derivados" é
compreensível, reverter "a terça-feira" não é. E a ordem 00→05 já foi validada como sequência
aplicável contra um banco real.

**Uma dependência para frente, deliberada.** `app.usuario_atual()` nasce em M5 e lê `usuarios`, que só
existe em M6. O referência já resolve com elegância: a função captura o erro de tabela inexistente e
**devolve "ninguém"**. Como nenhuma policy concede acesso a "ninguém", o padrão de falha é **negar** —
degradação segura, Princípio V. M5 aplica isoladamente sem quebrar.

**Alternativas descartadas.** *Uma migration única*: irrevisável e irreversível. *Uma por tabela* (27):
a ordem entre elas viraria o problema, e a visão do conjunto — sobretudo das policies — se perderia.
*Reordenar para eliminar a dependência para frente*: exigiria separar as funções de autorização das de
domínio, quebrando o corte temático por uma dependência que o referência já trata.

---

## 6. Onde vive o dado normativo: migration ou `seed.sql`?

**Decisão.** **Na migration.** `seed.sql` fica com dado **sintético** de desenvolvimento e de teste.

| Dado | Onde | Por quê |
|---|---|---|
| Tetos, faixas de CH docente, limite diário | M4 | Precisa existir **em produção** |
| Listas administráveis | M4 | idem |
| Matriz de permissões — 152 linhas | M6 | Sem ela, ninguém acessa nada |
| Catálogo de unidades de ensino | **Épico 2** | Depende de `disciplinas`, que ainda não existem — ver plan.md |
| Cursos, turmas e usuários de exemplo | `seed.sql` | Só desenvolvimento local e Playwright |

**Motivo.** `seed.sql` roda em `supabase db reset`, que é **local**. Ele **não** é aplicado por
`supabase db push`. Um teto normativo em `seed.sql` simplesmente não chegaria à produção, e a falha
seria silenciosa: as consultas devolveriam vazio, e o sistema calcularia com teto ausente. É também o
que o próprio referência faz — parâmetros e listas no arquivo 03, matriz no 05.

**Sobre a redação do documento 06.** Ele diz *"`perfil_permissao` populada por `seed.sql`"*. É
linguagem frouxa para "semeada", não contradição: o arquivo de referência que o próprio documento cita
põe a semente na migration. Registrado para não ser lido como divergência.

**Alternativa descartada.** *Semente por script Python à parte*: acrescentaria um passo manual e
violaria FR-055 — *"reconstruir do zero é um comando, sem nenhuma etapa manual"*.

---

## 7. Onde ficam os testes pgTAP: `supabase/tests/` ou `tests/invariantes/`?

**O conflito, real.** O documento 24 §1 desenha `tests/invariantes/` para *"pgTAP + SQL: contagens,
integridade, `RN-` de risco alto"*. O documento 24 §7 define
`"test:invariantes": "supabase test db"`. Mas `supabase test db` **só procura em
`supabase/tests/`** — não é configurável. Os dois pontos do mesmo documento não podem estar certos ao
mesmo tempo.

**Decisão.** Dividir por **natureza do teste**, não por gosto:

| Onde | O quê | Roda com |
|---|---|---|
| `supabase/tests/*.sql` | pgTAP: estrutura, unicidade, condicionais, vigência, grão, derivados, imutabilidade | `pnpm test:invariantes` |
| `tests/invariantes/rls.test.ts` | Teste **negativo** de RLS, T-01 a T-12 | `pnpm test:rls` |

**Motivo.** Não é acomodação da ferramenta: os dois testes são de naturezas diferentes. O pgTAP prova
**regra de dado** e roda como dono do schema. O teste de RLS precisa de **cliente autenticado por
perfil**, com JWT de verdade — e foi justamente rodar com sessão real que encontrou o defeito do
`GRANT` de `extensions`, que passa despercebido sob privilégio de dono. Um teste de RLS escrito em
pgTAP rodaria com o privilégio errado e **aprovaria uma RLS desligada**.

**Alternativa descartada.** *Forçar tudo em `tests/invariantes/`* com link simbólico ou cópia: frágil
no Windows, e esconderia a distinção que importa.

**Achado documental (A-12):** o documento 24 §1 precisa refletir os dois endereços. Registrado na
spec, não corrigido aqui.

---

## Resumo das decisões

| # | Decisão | Requisito servido |
|---|---|---|
| 1 | `sql-referencia` é ponto de partida revisável; três pontos reescritos | FR-001, FR-020 |
| 2 | `unidade_ensino_id` **obrigatório**; sem `disciplina_id` no fato | FR-020, FR-027 |
| 3 | RN-MAT-01 por **cadeia de chaves compostas**, declarativa | FR-007, e `RN-MAT-01` |
| 4 | Duas views; a assinatura pública de `vw_disciplinas_execucao` não muda | FR-028, FR-030 |
| 5 | **Seis** migrations temáticas; dependência para frente tratada por degradação segura | FR-055, FR-056 |
| 6 | Dado normativo na migration; `seed.sql` só sintético | FR-034, FR-048 |
| 7 | pgTAP em `supabase/tests/`; RLS negativo em `tests/invariantes/` | FR-057, FR-058 |

**Nenhum `NEEDS CLARIFICATION` remanescente.** A única pergunta aberta do domínio é **Q1.b**, que é do
Épico 2 e cuja resposta não altera nenhuma das sete decisões acima — no máximo relaxa uma
obrigatoriedade sobre tabela vazia (§2).
