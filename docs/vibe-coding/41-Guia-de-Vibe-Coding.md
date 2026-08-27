---
title: "CIAARA-11 v2.1 — Guia de Vibe Coding"
author: "Manual prático de condução do agente de código"
date: "26/08/2026"
version: "2.1"
---

# Guia de Vibe Coding — CIAARA-11 v2.1

**Status:** v1.0 · **Complementa:** `Fase 1 - Requisitos/10-Plano-de-Execucao-Vibe-Coding.md` ·
**Subordinado a:** `Vibe Coding/40-Constitution-v2.1.md`

---

## 1. Para que serve este documento

O documento 10 responde **o que fazer e em que ordem**. Este responde **como conversar com o
agente** enquanto se faz. Os dois não se repetem: se você está procurando o comando de uma etapa,
está no documento 10; se está procurando como pedir, como revisar e quando desconfiar, está aqui.

Vibe coding neste projeto **não é "descrever o que quero e aceitar o que vier"**. É um ofício com
técnica própria, e a técnica existe porque o custo do erro aqui é assimétrico: uma tela feia se
conserta em vinte minutos; uma regra normativa portada errado produz número errado em documento
assinado, e ninguém percebe até a auditoria da CoPeCoD.

**A premissa que organiza tudo o que vem a seguir:** o agente é excelente em escrever código e
péssimo em saber o que **não** deve escrever. Ele não sabe que a ausência de `for delete` é
deliberada, que o teto de AEC é alerta e não bloqueio, que `RN-CONF-02` está "errada" de propósito.
Ele sabe o que a maioria dos sistemas do mundo faz — e este sistema **não é a maioria**. Seu trabalho
é fechar essa lacuna em cada prompt, e verificá-la em cada revisão.

---

## 2. Anatomia de um bom prompt neste projeto

Um prompt eficaz aqui tem **cinco partes, sempre na mesma ordem**. Faltando qualquer uma, o agente
preenche a lacuna sozinho — e o preenchimento dele vem da média da internet, não deste domínio.

```
1. CONTEXTO      → onde estamos, o que já existe, o que esta fatia é
2. IDENTIFICADOR → RF-/RN-/RNF-/épico de origem + qual documento ler
3. RESTRIÇÃO     → plataforma, camada, fronteira, o que é regra de negócio e não pode mudar
4. CRITÉRIO      → como eu saberei que ficou certo (verificável, nunca subjetivo)
5. O QUE NÃO FAZER → as armadilhas específicas desta fatia, nomeadas
```

### 2.1 Contexto — três frases, no máximo

Onde estamos no roteiro, o que já está pronto, o que esta fatia entrega. O agente tem o `CLAUDE.md`;
não repita o projeto inteiro. Repita **o recorte**.

> *"Estamos no Épico 6 (DSA), com os cadastros do Épico 5 já prontos e povoados pelo ETL. Esta fatia
> entrega o lançamento na grade semanal; a impressão vem na fatia seguinte."*

### 2.2 Identificador — o que separa porte de invenção

**Toda instrução de comportamento cita a origem.** Não é burocracia: é o que permite ao agente ler o
texto real em vez de imaginar a regra pelo nome.

> *"Implemente `RF-DSA-03` e `RF-DSA-04` conforme `docs/fase-1/02-Requisitos-Funcionais.md`,
> preservando `RN-CONF-01` e `RN-CONF-02` **exatamente como descritas** em
> `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`. Leia as duas regras antes de escrever a primeira
> linha e cite o texto de cada uma no topo da função que a implementa."*

Compare com *"implemente a detecção de conflito de horário"* — que produz uma detecção de conflito
de horário genérica, provavelmente correta pelos padrões do mundo e errada pelos deste sistema.

### 2.3 Restrição — repita mesmo estando na constitution

A constitution existe e é carregada. **Repita assim mesmo** nas fatias que tocam as fronteiras
caras. É no `/speckit.plan` que o agente mais propõe "uma pequena biblioteca", e o custo de repetir
uma frase é zero.

> *"Restrições: a regra vai em `lib/dominio/` como **função pura** — sem importar `supabase`, `next`
> nem `react`. A Server Action em `lib/acoes/` valida com Zod na primeira linha. A página é **Server
> Component**; `"use client"` só no componente de folha que tem o formulário. Sem ORM, sem
> biblioteca de componentes além de shadcn."*

### 2.4 Critério de aceite — verificável, nunca subjetivo

*"Que fique bom"* não é critério. *"Que a impressão caiba em uma página A4 paisagem para uma semana
cheia"* é.

> *"Critérios: (1) dois lançamentos do mesmo instrutor com TA sobrepostos no mesmo dia são
> sinalizados como conflito; (2) o conflito é detectado **entre todas as turmas do sistema**, não só
> a visualizada (`RN-CONF-01`); (3) a função de detecção tem teste Vitest com um caso de sobreposição
> parcial, um de sobreposição total e um de encosto exato (fim de um = início do outro, que **não** é
> conflito)."*

O último caso é o tipo de coisa que só aparece se você pedir — e é exatamente onde os bugs moram.

### 2.5 O que NÃO fazer — a parte que quase todo mundo esquece

É a seção mais valiosa do prompt neste projeto, porque enumera o que o agente faria por conta
própria, de boa-fé, e não deve.

> *"Não faça: não altere nenhuma regra do documento 04, mesmo que pareça errada — se algo parecer
> errado, **liste ao final** em vez de corrigir. Não crie policy `for delete` (ausência é
> deliberada). Não transforme o teto em `CHECK` (é alerta, `RN-DEG-02`). Não traduza `TA`, `DSA` nem
> `CHD`. Não ponha `"use client"` no `page.tsx`. Não crie coluna que não esteja em
> `lib/tipos/database.ts` sem me perguntar antes."*

### 2.6 O prompt completo, montado

```
Estamos no Épico 6 (DSA). Os cadastros do Épico 5 estão prontos e povoados pelo ETL.
Esta fatia entrega a detecção de conflito de horário na grade semanal.

Leia antes de escrever: docs/fase-1/04, regras RN-CONF-01 e RN-CONF-02 (texto integral);
docs/fase-1/02, RF-DSA-03 e RF-DSA-04; docs/fase-2/25 (camada de dados).

Restrições: a detecção vai em lib/dominio/conflito.ts como função PURA — sem importar
supabase, next ou react. A página é Server Component; nada de "use client" em page.tsx.
Cite o texto literal de RN-CONF-01 e RN-CONF-02 no topo da função.

Critérios de aceite:
1. Mesmo instrutor com TA sobrepostos no mesmo dia → conflito sinalizado.
2. A verificação alcança TODAS as turmas do sistema, não só a visualizada (RN-CONF-01).
3. Teste Vitest com: sobreposição parcial, sobreposição total, e encosto exato
   (fim de um = início do outro) que NÃO é conflito.
4. O horário ancora no início do dia, conforme RN-CONF-02 — mesmo parecendo divergente
   das planilhas legadas. É deliberado.

Não faça: não altere nenhuma regra do documento 04 — se algo parecer errado, liste ao
final em vez de corrigir. Não traduza TA, DSA, CHD. Não crie coluna nova. Não escreva UI
nesta fatia — só o domínio e o teste.
```

---

## 3. Tipo de tarefa → documentos a citar

Cite **o documento e a seção**, não o nome genérico. "Leia a documentação" faz o agente escolher, e
ele escolhe o mais curto.

| Tipo de tarefa | Documentos a citar no prompt |
|---|---|
| **Portar regra `RN-`** | `04` (a regra, texto integral) · `40` Princípio II · `24 §2.1` (onde o arquivo mora) |
| **Escrever migration** | `21` (DDL da tabela) · `sql/*.sql` na ordem numérica · `05 §7` (unicidade e `CHECK`) · `40` Princípios IV e XI |
| **Escrever policy RLS** | `22 §5` e `§6` (padrão e as três tabelas de fronteira) · `docs/sql-referencia/05_rls_policies.sql` · `40` Princípio XI |
| **Auth, convite, sessão** | `22 §3` e `§4` · `BRIEF §3` · `06` Épico 3 |
| **Tela nova** | `23` (tokens e componentes) · `25` (dados e estado) · `02` (o `RF-`) · `20 §4` (fronteira Server/Client) |
| **Rota de impressão `/print/*`** | `23` (seção de impressão) · `RNF-COMP-01` no `03` · `06` do épico correspondente |
| **Server Action / mutação** | `25` · `20 §5` (critério RPC × Server Action) · `40` Princípio XI |
| **ETL / carga** | `30` (plano) · `31` (de-para) · `06` Épico 2 · `40` Princípio IV |
| **Cronograma / motor preditivo** | `04` (`RN-DIST-*`, `RN-2027-*`) · `02` (`RF-CRONOS-*`, `RF-2027-*`) · `06` Épico 7 |
| **Tetos e categorias normativas** | `04` (`RN-EVT-*`, `RN-DEG-02`) · `06` Épico 9 · `BRIEF §9` |
| **LIQ / OS / Ficha** | `06` Épico 11 · `02` (`RF-INSTR-*`) · acervo `modelos/LIQ/` (2023–2026) |
| **Teste de invariante (pgTAP)** | `04` (classificação de risco) · `22 §10` (a suíte T-01…T-10) · `BRIEF §7` |
| **Qualquer dúvida de vocabulário** | `07` Glossário, coluna *Equivalente na v2.0* |
| **Qualquer dúvida de escopo** | `00 §7` (Matriz de Responsabilidades) · `40` Princípios IX e X |

**Regra prática:** três documentos citados é bom; sete é o mesmo que zero. Escolha o que decide a
questão, não tudo o que é adjacente.

---

## 4. Checklist de revisão do que o agente produziu

Revisar não é ler o diff inteiro procurando erro de digitação — é procurar **as classes de erro que
este projeto sofre**. Quatro listas, por tipo de artefato.

### 4.1 Código TypeScript

- [ ] **A regra está em `lib/dominio/` e é pura?** Nenhum `import` de `supabase`, `next` ou `react`.
- [ ] **A regra é porte ou reescrita?** Compare a função com o texto do documento 04. Se ficou mais
      curta e mais elegante que a original, **desconfie** — elegância aqui costuma ser regra perdida.
- [ ] **O identificador `RN-` está citado no topo da função**, com o texto literal?
- [ ] **`"use client"` só em folha?** Nenhum em `page.tsx` nem em `layout.tsx`.
- [ ] **Nenhum `await` dentro de laço** em `app/**`? (N+1 invisível — risco R-02.)
- [ ] **Server Action começa com `safeParse` do Zod?** Sem exceção — é endpoint HTTP de fato.
- [ ] **Estado de tela está na URL** (`nuqs`) e não em `useState`?
- [ ] **Nenhum termo normativo traduzido?** Busque por `subject`, `grade`, `teacher`, `student`,
      `schedule`, `evaluation` no diff.
- [ ] **Nenhuma cor literal** em `components/ciaara/` — só token?
- [ ] **Nenhuma constante normativa hard-coded** (`0.10`, `0.05`, `12`, `24`, `30`)? Vem de
      `config_parametros`.
- [ ] **Os testes cobrem o caso de borda que você pediu**, e não só o caminho feliz?

### 4.2 SQL e migration

- [ ] **A migration foi escrita à mão** ou gerada por diff que ninguém leu?
- [ ] **`ENABLE ROW LEVEL SECURITY`** na tabela criada? (Tabela sem RLS é tabela exposta.)
- [ ] **As policies vieram junto**, na mesma migration?
- [ ] **Quarteto de auditoria** (`criado_por`, `criado_em`, `editado_por`, `editado_em`) + trigger
      `app.set_auditoria()`?
- [ ] **`origem_migracao_v1`** presente, se a tabela recebe dado migrado?
- [ ] **`codigo text unique not null`** presente, se há chave de negócio legada?
- [ ] **`status` explícito** (`ativo`/`inativo`), nunca exclusão inferida de `NULL`?
- [ ] **Nenhum `drop column`, `drop table`, `truncate` ou `delete from`** — em nenhuma hipótese.
- [ ] **`on delete restrict`** nas FKs, salvo justificativa escrita?
- [ ] **`ENUM` só para domínio normativo fechado?** Se for administrável, é `config_listas`.
- [ ] **Coluna derivada é `GENERATED … STORED` ou VIEW**, nunca segunda fonte de verdade?
- [ ] **`pnpm db:reset` roda do zero sem erro** — a sequência inteira, não só a migration nova?
- [ ] **`pnpm db:tipos` foi executado e `lib/tipos/database.ts` commitado?** (Risco R-04.)
- [ ] **O plano de reversão está escrito no PR?**

### 4.3 RLS — a lista que não se pula

- [ ] **A policy pergunta `app.pode(recurso, acao)`** — ou contém `perfil = '...'` literal? Literal é
      defeito: a matriz é o único lugar onde perfil aparece.
- [ ] **`UPDATE` tem `WITH CHECK`, além do `USING`?** Sem ele, um Operador reatribui um registro a
      uma turma fora do escopo dele **e leva o dado junto** — sem violar nada. É o teste T-03.
- [ ] **Nenhuma policy `FOR DELETE` foi acrescentada.** A ausência é regra de negócio.
- [ ] **Nenhum `disable row level security`**, nem "temporariamente para testar".
- [ ] **Nenhum `using (true)`** em tabela de fato ou de cadastro.
- [ ] **Existe teste negativo por perfil?** Para cada perfil, ao menos uma leitura e uma escrita fora
      do escopo **negadas pelo banco**. Só caminho feliz **não vale**.
- [ ] **A função auxiliar é `SECURITY DEFINER`, `STABLE`, com `search_path` fixo?** Os três
      qualificadores resolvem, respectivamente: recursão infinita, custo por linha e sequestro de
      nome.
- [ ] **A regra depende do que mudou** (`OLD` × `NEW`)? Então é **gatilho**, não policy — policy não
      enxerga `OLD`.
- [ ] **Consulta voltou vazia?** Primeiro suspeito é o **`GRANT`**, não a policy.

### 4.4 Spec, plan e tasks

- [ ] **Toda tarefa tem `RF-`/`RN-` de origem?** Sem origem = requisito faltando ou escopo indevido.
- [ ] **A spec repete o comportamento do documento 04** ou parafraseia? Paráfrase é onde a regra se
      perde.
- [ ] **O *fora de escopo* está preenchido?** Um plan sem fora-de-escopo é um plan que vai crescer.
- [ ] **`/speckit.analyze` rodou sem inconsistência pendente?**
- [ ] **Alguma tarefa introduz funcionalidade que não existe na v2.0?** Princípio X: **paridade antes
      de novidade**.

---

## 5. Quando interromper o agente

Interromper cedo é barato; deixar correr é caro. Estes são os sinais de que ele saiu do trilho —
**pare na hora, não no fim do bloco**.

| Sinal | O que provavelmente está acontecendo |
|---|---|
| *"Corrigi o cálculo, que estava considerando…"* | Reescreveu regra de negócio em vez de portar. **O sinal nº 1** |
| *"Simplifiquei a lógica de…"* / *"unifiquei as duas implementações"* | Idem. `RN-DIST-01` proíbe explicitamente uma segunda implementação da distribuição — mas unificar o que é diferente de propósito é o erro espelho |
| *"Faltava a policy de exclusão"* / aparece `for delete` no diff | Vai desfazer a exclusão lógica universal |
| *"A RLS estava bloqueando indevidamente"* + `using (true)` ou `disable row level security` | Diagnóstico provavelmente errado; a causa costuma ser o `GRANT` |
| `"use client"` aparecendo em `page.tsx` ou `layout.tsx` | Cascata de Client Components (R-01) |
| Começou pela tela, não pelo domínio | A regra vai nascer dentro do componente e sairá do alcance do Vitest |
| Sugeriu Prisma, Drizzle, Material UI, Chart.js, um "utilitário de datas" | Deriva de plataforma. A constitution não está sendo lida — investigue por quê |
| Criou coluna para sustentar a própria suposição | Inventou schema. Confira contra `lib/tipos/database.ts` |
| Escreveu 30 linhas de PL/pgSQL com `if`/`case` de regra de negócio | Regra migrando para SQL (R-06) — sai do alcance do teste de unidade |
| Está no décimo arquivo e você pediu uma função | Escopo explodiu. Pare e refatore o pedido |
| Contradisse algo combinado **nesta mesma sessão** | Janela de contexto estourou (ver §7) |
| Usou palavra em inglês para conceito do domínio | Tradução de termo normativo |
| Disse *"conforme o padrão da indústria"* | Este sistema não segue o padrão da indústria; segue a DEnsM |

**Como interromper sem perder o que estava bom:** pare, **não** mande refazer. Diga o que aceita e o
que não aceita, nominalmente (§6).

---

## 6. Como pedir correção sem destruir o que estava certo

O erro mais comum do humano nesta relação é o *"não é bem isso, refaz"*. O agente refaz **tudo** — e
o que estava certo volta diferente. Você troca um defeito conhecido por três desconhecidos.

### 6.1 A fórmula: preserve → aponte → restrinja → verifique

```
PRESERVE  → o que está certo e não deve ser tocado, nominalmente (arquivo, função)
APONTE    → o defeito específico, com o identificador da regra violada
RESTRINJA → o alcance da correção: quais arquivos podem mudar
VERIFIQUE → como saberemos que corrigiu sem quebrar o resto
```

**Ruim:**

> *"A detecção de conflito está errada, refaz."*

**Bom:**

> *"`lib/dominio/conflito.ts` está correto e os testes dele passam — **não toque nesse arquivo**.
> O defeito está em `lib/acoes/dsa.ts`: a consulta filtra por `turma_id`, e `RN-CONF-01` exige
> verificação **entre todas as turmas do sistema**. Corrija **apenas** essa consulta.
> Depois rode `pnpm test:unidade` e confirme que os 7 testes de conflito continuam verdes."*

### 6.2 Correção em cima de regra de negócio: cite o texto

Quando o defeito é de domínio, **cole o texto da regra no prompt**. Não peça para ele reler — cole.
A diferença de resultado é grande e o custo é uma linha.

> *"`RN-2027-06` diz literalmente: «o teto do instrutor são as faixas por regime — 20h → 8 a 12h de
> aula, 40h → 16 a 24h, DE → 16 a 30h», e explicitamente **não** é o número do regime. Sua
> implementação usou `regime` como teto. Corrija **só** a função `tetoDocente()`; o resto do arquivo
> está certo."*

### 6.3 Quando a correção é grande: volte um passo no ciclo

Se a correção toca mais de uns três arquivos, o problema provavelmente não é o `implement` — é a
`spec` ou o `plan`. Corrija lá e reimplemente **aquela fase**, em vez de remendar o código. Remendo
em cima de plano errado produz código que passa nos testes e não faz o que o requisito pede.

### 6.4 Nunca aceite correção que você não entendeu

Se o agente explicar a correção e você não entender **por que** funciona, não faça merge. Peça:
*"explique em três frases, sem código, por que isso corrige o problema"*. Se a explicação não fechar,
o problema não foi entendido — nem por ele, nem por você. Fatia parada é barata; fatia errada em
produção com dado de 177 instrutores em cima, não.

---

## 7. Gestão de contexto em sessão longa

A janela de contexto é finita e enche sem avisar. O sintoma é sempre o mesmo: o agente contradiz o
que foi combinado **na própria sessão**, ou volta a propor algo que já foi rejeitado.

### 7.1 As seis práticas que funcionam

**1. Uma sessão por fatia, não por dia.** Terminou a fatia, fez o merge, **abre sessão nova**. O
`CLAUDE.md` e a constitution recarregam limpos.

**2. Comece pedindo o resumo.** Ao abrir a fatia:

> *"Leia `specs/012-dsa-conflito/spec.md` e `.specify/memory/constitution.md`. Resuma em **cinco
> linhas** o que você vai implementar, onde cada arquivo vai morar e quais regras `RN-` estão em
> jogo. **Não escreva código ainda.**"*

Trinta segundos que evitam duas horas. Se o resumo estiver errado, você descobre agora.

**3. Refixe a âncora antes de tarefa crítica.** Antes de migration, policy ou regra de domínio:
*"antes de escrever, releia a seção X do documento 22 e me diga em uma frase qual é a restrição que
se aplica aqui."*

**4. Prefira arquivo a conversa.** Decisão tomada no meio da sessão vai para a spec ou para o
`CLAUDE.md`, não fica só no histórico do chat. O que está no arquivo sobrevive à sessão; o que está
na conversa, não.

**5. Não deixe o `implement` correr sozinho por vinte tarefas.** `/speckit.implement fase 1`, revisa,
`fase 2`, revisa. Diff grande é diff não revisado — e "revisei" vira afirmação sem lastro.

**6. Atualize o *Estado atual* do `CLAUDE.md` ao fim de cada fatia.** É a primeira coisa que a
próxima sessão lê. Custa duas linhas e é o que impede a pergunta "onde a gente parou?".

### 7.2 O sinal de que o `CLAUDE.md` cresceu demais

Se o agente violar uma restrição que **está escrita** no `CLAUDE.md`, o diagnóstico provável **não** é
"falta escrever mais". É "o arquivo ficou longo e parou de ser lido com atenção". A ação certa é
**cortar**, não acrescentar: mova o detalhe para o documento próprio e deixe no `CLAUDE.md` só a
regra e o ponteiro.

---

## 8. O que nunca delegar sem revisar linha a linha

Cinco categorias. Em todas, o agente **escreve** e o humano **lê inteiro, antes do merge**. Não é
desconfiança do modelo: é proporcionalidade ao custo do erro.

### 8.1 Migration destrutiva

Qualquer `drop`, `alter … type`, `alter … set not null`, `update` em massa, renomeação de coluna.
Este banco guarda ~1.753 registros de aula, 664 atividades e 717+ linhas de `migracao_log` que **são
a evidência auditável** da migração da v2.0.

**Leia procurando:** o que acontece com a linha que já existe? Existe reversão escrita? A migration
aplica do zero (`pnpm db:reset`) **e** sobre a base povoada? Se a resposta a qualquer uma for
"provavelmente", não faça merge.

**A regra desta base:** coluna que perdeu uso vira comentário `-- [APOSENTADA — v2.1]` e **fica**.
Não se apaga história para deixar o schema bonito.

### 8.2 Policy RLS

É a fronteira de segurança inteira do sistema. Uma policy frouxa não gera erro — gera **acesso
indevido silencioso**. Uma policy apertada demais também não gera erro — gera **tela vazia** que
todos interpretam como "não tem dado" (risco R-03).

**Leia procurando:** `perfil = '...'` literal (deveria ser `app.pode()`) · `using (true)` ·
`for delete` · `UPDATE` sem `WITH CHECK` · `disable row level security` · ausência de teste negativo.

**E o aviso que já apanhou de todo mundo:** um agente que encontre a ausência de policy de `DELETE`
vai propor acrescentá-la, **de boa-fé**, como quem corrige um esquecimento. É regra de negócio, não
lacuna. Rejeite sem discussão.

### 8.3 Regra de negócio de `lib/dominio/`

É o coração portado da v2.0. Cada função ali é uma norma da Marinha do Brasil escrita em TypeScript.

**Leia com o documento 04 aberto ao lado, comparando texto com código.** As mais convidativas ao
"conserto": `RN-CRUD-03` (inteiro simples, não prefixo) · `RN-ANT-02` (antiguidade vem do P/G;
`antiguidade_declarada` é só desempate) · `RN-CONF-02` (âncora no início do dia — divergência
deliberada) · `RN-DIST-03` (três regimes: rígido, recomendado, sem-teto) · `RN-MAT-02` (dedução
silenciosa de identidade) · `RN-2027-06` (faixa por regime, **nunca** o número do regime).

**Teste de leitura em cinco segundos:** a função ficou mais curta e mais elegante que a descrição da
regra? Então provavelmente perdeu um caso.

### 8.4 Qualquer coisa que toque `migracao_log`

`migracao_log` é a prova de que 100% do histórico foi transportado. Uma linha reescrita destrói a
evidência **sem deixar rastro**. Ela é append-only por três mecanismos independentes (`GRANT`
revogado, gatilho que bloqueia **inclusive `service_role`**, policy só de `SELECT`) — e a redundância
é de propósito.

**Nunca aceite:** `update migracao_log …` · `delete from migracao_log …` · qualquer migration que
altere o gatilho de bloqueio · qualquer "vamos limpar as linhas de teste". Corrigir o passado é
**logar evento novo**. Vale o mesmo para `arquivo_avaliacoes_v1`.

### 8.5 Qualquer uso de `service_role`

Ela **ignora a RLS inteira**. É acesso administrativo ao banco, e vazá-la é o pior incidente possível
neste sistema — dado pessoal de 177 militares (nome completo, nome de guerra, NIP, posto/graduação,
data de nascimento, OM) exposto.

**Usos autorizados, e só estes três:** convite de usuário pelo Admin
(`auth.admin.inviteUserByEmail()`, que a exige) · carga do ETL (Épico 2) · script de manutenção
versionado, rodado à mão. **Nunca por requisição de tela.** Um quarto uso é decisão do Bernardo,
registrada na constitution.

**Leia procurando:** `import` de `lib/supabase/admin` fora de Server Action · falta de
`import "server-only"` no topo de `admin.ts` · a variável ganhando prefixo `NEXT_PUBLIC_` · a chave
literal em qualquer arquivo versionado.

**Se vazar:** rotacione **imediatamente** no painel do Supabase. Ela não expira sozinha.

---

## 9. Prompt bom × prompt ruim

Cinco pares reais, com o resultado esperado de cada.

### 9.1 Portar uma regra de negócio

| | |
|---|---|
| ❌ **Ruim** | *"Implemente a distribuição semanal de carga horária das disciplinas."* |
| **Resultado** | Uma distribuição plausível e genérica. Provavelmente divide por igual, ignora `RN-DIST-02` (a **última** semana recebe o resto), trata todos os regimes iguais e perde `RN-DIST-03` (TFM é teto **rígido** em 6 TA/semana; disciplinas de fim de curso **não têm teto**; as demais têm 25 TA/semana apenas **recomendado**). Três regras perdidas, nenhuma detectável sem ler o documento 04 |
| ✅ **Bom** | *"Porte `RN-DIST-01`, `RN-DIST-02` e `RN-DIST-03` de `docs/fase-1/04` para `lib/dominio/distribuicao.ts`, como função pura. Cite o texto literal das três no topo. Atenção a `RN-DIST-03`: são **três regimes distintos** — TFM rígido em 6 TA/semana, disciplinas de fim de curso **sem teto algum**, demais com 25 TA/semana **apenas recomendado**. `RN-DIST-01` proíbe que exista uma segunda implementação da distribuição: se já houver uma, reutilize. Testes: um por regime + o caso de resto na última semana. Se algo na regra parecer errado, **liste ao final** em vez de corrigir."* |
| **Resultado** | Uma função com as três regras preservadas, testes nomeados pelos identificadores, e uma lista de dúvidas ao final para você levar ao Bernardo |

### 9.2 Escrever migration

| | |
|---|---|
| ❌ **Ruim** | *"Crie a tabela de registros de aula."* |
| **Resultado** | `create table registros_aula (id serial primary key, turma_id int, data date, …)`. Sem RLS, sem auditoria, sem `codigo`, sem `origem_migracao_v1`, PK errada, e uma tabela exposta a qualquer sessão autenticada até alguém notar |
| ✅ **Bom** | *"Crie a migration de `registros_aula` seguindo `docs/fase-2/21` e `docs/sql-referencia/02_tabelas_fato.sql`. Obrigatório: `id uuid default gen_random_uuid()`; `codigo text unique not null`; `origem_migracao_v1`; `status`; o quarteto de auditoria com trigger `app.set_auditoria()`; `ENABLE ROW LEVEL SECURITY` **e as policies na mesma migration**; FKs com `on delete restrict`; **nenhuma policy `for delete`**. Escreva o SQL à mão, com comentário explicando cada bloco. Depois rode `pnpm db:reset` e `pnpm db:tipos`. Antes de escrever: a decisão **UE-1** (grão desta tabela) está tomada? Se não souber, **pergunte — não assuma**."* |
| **Resultado** | Migration completa, testável do zero, com os tipos regenerados — e a pergunta certa feita antes do dano |

### 9.3 Tela nova

| | |
|---|---|
| ❌ **Ruim** | *"Faça a tela de instrutores com filtros e um gráfico."* |
| **Resultado** | `"use client"` no `page.tsx`, `useEffect` buscando os 177 instrutores, filtro em `useState` (sem deep-link, sem voltar/avançar), Chart.js instalado, cores literais, nome do instrutor no formato errado |
| ✅ **Bom** | *"Construa `/instrutores` conforme `RF-INSTR-01..16` (`docs/fase-1/02`) e `docs/fase-2/23`. A página é **Server Component**: busca os dados no servidor com um `select` do PostgREST, **sem `await` dentro de laço**. Filtros vão para a **URL** via `nuqs`, não para `useState`. `"use client"` só no componente de folha do filtro. Gráfico com **Recharts**. Nome no formato `P/G Especialidade Nome de Guerra` pelo componente `NomeInstrutor`, alimentado por função pura de `lib/dominio/`. **Ordenação por antiguidade em toda lista, seletor e filtro, sem exceção** (`RN-ANT-01`/`RN-ANT-02`). Nenhuma cor literal — só token do `@theme`. CH do instrutor **nunca é campo digitável**: é derivada."* |
| **Resultado** | Tela com deep-link, bundle pequeno, ordenação correta em todas as ocorrências e CH calculada |

### 9.4 Corrigir um defeito

| | |
|---|---|
| ❌ **Ruim** | *"A LIQ está saindo errada, arruma."* |
| **Resultado** | O agente reescreve o módulo inteiro. O que estava certo volta diferente, e você perde os quatro hotfixes de layout que a v2.0 levou quatro specs para acertar |
| ✅ **Bom** | *"Defeito na LIQ: um trimestre com segunda turma está saindo com o período da **T1**, e `docs/fase-1/06` (Épico 11, critério 1) exige o período **da T2**, sem linha duplicada. A causa provável é a consulta ler o período da grade de curso em vez de `turma_disciplina` — é o achado **LIQ-1**. Corrija **apenas** a consulta em `lib/acoes/liq.ts`. **Não toque** no layout de `/print/liq` nem em `lib/dominio/liq.ts`, que estão validados. Depois: teste e2e com um curso de duas turmas, conferindo que sai o período da T2 e que não há duplicata."* |
| **Resultado** | Uma consulta corrigida, layout intacto, teste que impede a regressão voltar |

### 9.5 Quando o agente propõe uma "melhoria"

| | |
|---|---|
| ❌ **Ruim** | *"Boa ideia, pode fazer."* |
| **Resultado** | Escopo cresce, o Princípio X é atropelado, e três fatias depois ninguém lembra de onde aquilo veio nem qual requisito o sustenta |
| ✅ **Bom** | *"Não implemente. Responda três coisas: (1) isto é **paridade** com a v2.0 ou **novidade**? (2) qual `RF-`/`RN-` sustenta? (3) o processo está atribuído à CIAARA-11 na Matriz de Responsabilidades (documento 00 §7)? Se for novidade, escreva como **nota** no final da spec, com identificador provisório, e siga com o escopo combinado."* |
| **Resultado** | A ideia fica registrada e rastreável, e a fatia entrega o que prometeu. O Bernardo decide depois do corte |

---

## 10. Cartão de bolso

**Antes de pedir**

1. Contexto em três frases · 2. Identificador `RF-`/`RN-` + documento · 3. Restrição de camada e
plataforma · 4. Critério verificável · 5. O que **não** fazer.

**Enquanto ele trabalha**

Pare ao primeiro *"corrigi"*, *"simplifiquei"*, *"faltava"*. Pare ao ver `for delete`,
`using (true)`, `disable row level security`, `"use client"` em `page.tsx`, ou termo do domínio em
inglês.

**Antes do merge**

`lib/dominio/` puro · migration com RLS e auditoria · policy sem literal de perfil e com
`WITH CHECK` · teste **negativo** de RLS · `pnpm db:tipos` rodado · commit com identificador · PR
com plano de reversão · **validado na preview pelo Bernardo**.

**Nunca sem ler linha a linha**

Migration destrutiva · policy RLS · regra de `lib/dominio/` · qualquer toque em `migracao_log` ·
qualquer uso de `service_role`.

**A pergunta que resolve metade das dúvidas**

> *Isto é paridade com a v2.0 ou é novidade?*

E a outra metade:

> *Este processo está atribuído à CIAARA-11 na Matriz de Responsabilidades?*

---

*Fim do documento 41. Ver também `Vibe Coding/40-Constitution-v2.1.md` (os princípios),
`Fase 1 - Requisitos/10-Plano-de-Execucao-Vibe-Coding.md` (o roteiro macro) e
`Vibe Coding/42-Prompts-por-Epico.md` (os prompts prontos de cada épico).*
