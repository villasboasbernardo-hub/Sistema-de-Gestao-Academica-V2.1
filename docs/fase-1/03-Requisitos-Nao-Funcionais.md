---
title: "CIAARA-11 v2.1 — Requisitos Não-Funcionais (Next.js + Supabase)"
author: "Fase 1 do SDLC — Requisitos"
date: "25/08/2026"
version: "2.1"
---

# Requisitos Não-Funcionais — CIAARA-11 Versão 2.1

## Nota de migração (v2.1)

Este é o documento da suíte em que a mudança de plataforma se manifesta de forma mais violenta, e por isso ele exige mais cuidado de leitura do que qualquer outro. Na v2.0, a seção 1 deste arquivo era uma **cerca**: `RNF-PLAT-01` a `RNF-PLAT-04` existiam para proibir framework, banco externo, bundler e pipeline de implantação, porque a v2.0 era uma refatoração *dentro* do Google Apps Script e qualquer tentação de sair dali colocaria o redesenho em risco. A v2.1 é exatamente o movimento que aquela cerca proibia: a mesma aplicação, o mesmo domínio e o mesmo vocabulário institucional, reimplantados sobre **Next.js 15 + React 19 + TypeScript `strict`**, hospedados na **Vercel**, com **Supabase PostgreSQL** no lugar do Google Sheets. Os quatro requisitos de plataforma da v2.0 estão, portanto, **revogados** — e permanecem fisicamente neste documento, riscados, com o texto original resumido e o motivo da revogação ao lado. Nenhum requisito é apagado nesta suíte. Quem abrir este arquivo em 2028 tem de conseguir seguir a trilha de `RNF-PLAT-02` ("o banco de dados deve continuar sendo o próprio Google Sheets") até `RNF-PLAT-02.1` ("o banco de dados é o Supabase PostgreSQL") sem precisar de um terceiro documento para entender o que aconteceu.

O segundo movimento deste documento é menos óbvio e mais importante: uma parte relevante dos requisitos não-funcionais da v2.0 **deixa de ser disciplina de código e passa a ser garantia do motor**. Verificação de permissão no servidor (`RNF-SEG-02`) vira *Row Level Security*; integridade referencial deixa de ser uma convenção que a equipe precisava lembrar de honrar e vira *foreign key* declarativa; a duplicação manual de configuração entre frontend e backend (`RNF-MAN-02`) desaparece por construção, porque frontend e backend passam a compilar contra o mesmo `TypeScript` e o mesmo schema `Zod`. Esses itens estão marcados **[ABSORVIDO PELA PLATAFORMA]** — não significa que o requisito perdeu valor, significa que ele saiu da coluna "coisas que dependem de vigilância humana" e entrou na coluna "coisas que o sistema não consegue mais violar". Em contrapartida, a seção 10 (Conformidade Normativa) atravessa a migração **intacta**: `RNF-NORM-01` a `RNF-NORM-08` são requisitos normativos, não técnicos — eles decorrem da DGPM-101/103, das normas DEnsM e do PCP-FCT-2, e não têm a menor relação com a plataforma que os implementa. `RNF-NORM-04` continua rejeitado. Uma seção nova, a **11 — Observabilidade e ambientes**, é acrescentada: ela não existia na v2.0 porque, no Apps Script, "ambiente" e "log" eram o editor e o `Stackdriver`; agora há local, *preview* por branch e produção, e isso precisa ser dito.

---

## Legenda de marcações

| Marca | Significado |
|---|---|
| **[PRESERVADO]** | O requisito atravessa a migração sem mudança de conteúdo. |
| **[MIGRAÇÃO v2.1]** | O requisito continua valendo, mas o mecanismo que o cumpre mudou de plataforma. |
| **[REVOGADO — v2.1]** | O requisito perdeu sentido na nova plataforma. Fica registrado, riscado, com motivo e substituto. |
| **[ABSORVIDO PELA PLATAFORMA]** | O requisito passa a ser garantido pelo motor (PostgreSQL, TypeScript, Next.js), e não mais por disciplina de código. |
| **[NOVO — v2.1]** | Requisito que não existia na v2.0, criado pela nova plataforma ou pelas capacidades que ela destrava. |

> **Notas de revisão herdadas da v2.0** (preservadas para rastreabilidade, sem alteração de conteúdo):
> *v1.3, 01/08/2026 — implementação das propostas P-1 a P-14 do documento 09; seção 10 revisada item a item; `RNF-NORM-04` marcado como rejeitado explicitamente.*
> *v1.2, 31/07/2026 — `RNF-PLAT-01` revisado para registrar a criação de planilha nova; criação da seção 10 (Conformidade Normativa).*
> *v1.1, 29/07/2026 — revisão leve após a triagem de comentários (documento 08); alterações em `RNF-PLAT-02`, `RNF-CONF-02`, `RNF-MAN-04`; item novo `RNF-SEG-05`.*

---

## 1. Restrições de plataforma (não-negociáveis) — **reescritas na v2.1**

### 1.1 Requisitos revogados da v2.0

Os quatro requisitos abaixo definiam a plataforma da v2.0. Eles não foram apagados: estão riscados, com o texto original resumido e a justificativa da revogação. É a trilha que liga a v2.0 à v2.1.

**RNF-PLAT-01. [REVOGADO — v2.1]**
~~O backend deve continuar em Google Apps Script, publicado como Web App; não há migração para outro runtime ou linguagem de servidor, e toda a lógica de Apps Script é mantida. A v2.0 é construída sobre uma planilha nova, no Google Drive, e a planilha da v1.0 passa a ser fonte histórica.~~
**Motivo da revogação:** o runtime do Apps Script era a origem de quase toda restrição estrutural da v2.0 — cota de execução por chamada, ausência de roteamento por URL, impossibilidade de transação, autenticação amarrada à conta Google, implantação por cópia manual. A v2.1 troca o runtime justamente para dissolver essa lista inteira de uma vez. **Substituído por `RNF-PLAT-01.1`.** *Origem da revogação: BRIEF v2.1, §0 e §1.*

**RNF-PLAT-02. [REVOGADO — v2.1]**
~~O banco de dados deve continuar sendo o próprio Google Sheets; não há migração para um banco de dados relacional ou documental externo nesta versão. A reestruturação de schema (documento 08, decisão D3) acontece dentro dessa mesma plataforma.~~
**Motivo da revogação:** o Sheets não oferece integridade referencial, transação, tipo de coluna, restrição de unicidade nem segurança no dado. Todas as regras `RN-` que dependiam dessas garantias precisavam ser reimplementadas como disciplina de código e testadas como se fossem lógica de negócio, quando são, na verdade, propriedades de um banco relacional. **Substituído por `RNF-PLAT-02.1`.** *Origem da revogação: BRIEF v2.1, §0, §1 e §2.*

**RNF-PLAT-03. [REVOGADO — v2.1]**
~~O frontend deve continuar em Vanilla JavaScript + Bootstrap 5, sem framework de componentes; a modularização (RF-MOD) deve ser feita com o recurso nativo de inclusão de arquivos do Apps Script (`HtmlService.include()`), não com um bundler externo.~~
**Motivo da revogação:** `HtmlService.include()` é concatenação de texto, não modularização — não há escopo de módulo, não há verificação de tipo entre arquivos, não há árvore de dependências e não há como testar um componente isoladamente. O objetivo de `RF-MOD` (dividir por domínio) é atendido de forma superior por módulos ES com `import`/`export` e verificação estática. **Substituído por `RNF-PLAT-03.1`.** *Origem da revogação: BRIEF v2.1, §1 e §5.*

**RNF-PLAT-04. [REVOGADO — v2.1]**
~~O procedimento de implantação continua manual (colar o conteúdo dos arquivos no editor do Apps Script e publicar uma nova versão via "Gerenciar implantações"); a v2.0 não pressupõe adoção de `clasp` ou pipeline de CI/CD.~~
**Motivo da revogação:** implantação manual por cópia de arquivo é a causa direta de `RNF-CONF-04` (o requisito de detectar "implantação parcial"), que só existia porque era possível esquecer de colar um arquivo. Com deploy atômico a partir do Git, a classe inteira de defeito desaparece. **Substituído por `RNF-PLAT-04.1`.** *Origem da revogação: BRIEF v2.1, §1 e §7.*

### 1.2 Restrições de plataforma da v2.1

**RNF-PLAT-01.1. [NOVO — v2.1] — Runtime da aplicação.** A aplicação é um projeto **Next.js 15 ou superior, com App Router e React 19**, hospedado na **Vercel**. *Server Components* são o padrão; `"use client"` é usado apenas onde houver interatividade real. As mutações de dados são feitas por **Server Actions** validadas com **Zod**, nunca por endpoints ad hoc sem validação. O acesso a dados no servidor usa `@supabase/ssr`; no cliente, `@supabase/supabase-js`. Não se adota ORM. *Substitui `RNF-PLAT-01`.*

**RNF-PLAT-02.1. [NOVO — v2.1] — Banco de dados.** O banco de dados é o **Supabase PostgreSQL**, projeto já provisionado. Todo o schema segue as convenções do BRIEF §2: identificadores em `snake_case` sem acento, tabelas no plural, `id uuid` como chave primária, `codigo text unique not null` guardando a chave de negócio legada (`CUR-000001`, `VIN-000123`), `origem_migracao_v1` em toda tabela migrada, exclusão lógica universal por coluna `status` explícita e vigência temporal por par `vigente_de`/`vigente_ate`. **Nenhum outro banco de dados é admitido**, nem como cache persistente nem como armazenamento auxiliar. *Substitui `RNF-PLAT-02`.*

**RNF-PLAT-03.1. [NOVO — v2.1] — Camada de apresentação.** O frontend é **React 19 com Tailwind CSS v4** (configuração CSS-first via `@theme`) e **shadcn/ui** (Radix + `cva`), com os componentes copiados para `components/ui/` e versionados no repositório. Bootstrap 5 e o CSS ad hoc por módulo da v2.0 são descontinuados. A modularização exigida por `RF-MOD` passa a ser feita por módulos ES e pela estrutura de diretórios do App Router, com fronteiras verificadas pelo compilador. *Substitui `RNF-PLAT-03`.*

**RNF-PLAT-04.1. [NOVO — v2.1] — Implantação.** A implantação é feita **exclusivamente por Git**: `push` na branch de trabalho gera um ambiente de *preview* na Vercel; *merge* na branch principal publica em produção. Não existe cópia manual de arquivo para nenhum ambiente. Mensagens de commit seguem *Conventional Commits* citando o identificador de origem (`feat(RF-DSA-08): …`), conforme o Princípio VIII. *Substitui `RNF-PLAT-04`.*

**RNF-PLAT-05. [NOVO — v2.1] — TypeScript `strict` obrigatório.** Todo o código da aplicação é TypeScript com `strict: true`. `any` implícito, `@ts-ignore` e `as unknown as` são tratados como defeito, não como atalho. O comando `tsc --noEmit` sem erro e `eslint` sem aviso novo são o **primeiro item da Definition of Done** (BRIEF §7.1) e bloqueiam a integração — não são verificação opcional de fim de sprint.

**RNF-PLAT-06. [NOVO — v2.1] — Migrations versionadas.** Toda alteração de schema — tabela, coluna, `ENUM`, índice, *constraint*, função, *trigger*, *policy* RLS ou *view* — é expressa como arquivo SQL versionado em `supabase/migrations/*.sql`, revisado em *pull request* e aplicado pelo Supabase CLI. **É proibido alterar schema pelo painel web do Supabase**: uma mudança feita pelo painel não existe no repositório, não é revisável, não é reprodutível em outro ambiente e quebra a paridade entre *preview* e produção.

**RNF-PLAT-07. [NOVO — v2.1] — Tipos gerados a partir do schema.** Os tipos TypeScript do banco são **gerados**, nunca escritos à mão, por `supabase gen types typescript`, com saída em `lib/tipos/database.ts`, versionada no repositório e regenerada obrigatoriamente a cada migration. Este requisito é o que torna real o item mais citado desta migração: a aba `_Meta_Colunas` da v2.0, que existia só para dar ao Sheets um contrato de coluna que ele não tinha nativamente, é **aposentada** — o contrato de dados passa a ser o próprio schema mais os tipos gerados, com garantia do compilador. *É o exemplo canônico de requisito absorvido pela plataforma (BRIEF §2.1).*

**RNF-PLAT-08. [NOVO — v2.1] — Proibições permanentes de stack.** Continuam proibidos, em caráter permanente e independentemente de conveniência pontual: (a) **ORM que esconda o SQL** (Prisma, Drizzle ou equivalente) — o SQL é artefato de revisão, não detalhe gerado; (b) **banco de dados fora do Supabase**; (c) **biblioteca de componentes além de shadcn/Radix**; (d) **qualquer regra de negócio implementada apenas na interface** — uma regra que só existe no cliente não é uma regra, é uma sugestão. *Origem: BRIEF v2.1, §1.*

---

## 2. Desempenho e escala

> **Princípio que atravessa a seção, preservado da v2.0 e reafirmado:** a base é pequena — 24 cursos, 29 turmas, 175 disciplinas, 177 instrutores, 798 vínculos instrutor↔disciplina, ~1.753 registros de aula, 663 atividades não letivas, 111 avaliações, dezenas de usuários simultâneos no máximo. **Desempenho não é um problema real deste sistema, e a v2.1 não deve fingir que é.** Clareza de schema e manutenibilidade vencem desempenho em toda decisão de projeto.

**RNF-PERF-01. [PRESERVADO]** O sistema deve manter tempo de resposta equivalente ou melhor ao da v2.0 para as operações mais frequentes (carregar contexto inicial, listar registros de uma área de dados, montar o Cronograma de um curso). Dado o volume atual, **não há requisito de reengenharia para grandes volumes** — não se projeta particionamento, *sharding*, cache distribuído ou desnormalização preventiva.

**RNF-PERF-02. [MIGRAÇÃO v2.1]** Toda operação que dependa do servidor deve ter tempo-limite explícito e falhar de forma compreensível, em vez de travar a interface indefinidamente. O mecanismo muda: onde a v2.0 usava um *timeout* de 30 segundos no `google.script.run`, a v2.1 usa o limite de execução da função na Vercel somado a `AbortController` nas chamadas do cliente, com o erro capturado pelo `error.tsx` do segmento e apresentado com texto de negócio, nunca com *stack trace*. *Mantém o comportamento exigido pela v2.0; troca o mecanismo.*

**RNF-PERF-03. [REVOGADO — v2.1]**
~~O sistema deve continuar operando dentro das cotas de execução do Google Apps Script (tempo máximo de execução por chamada, número de chamadas simultâneas); qualquer nova função de longa duração introduzida na modularização deve ser avaliada contra esse limite.~~
**Motivo da revogação:** as cotas do Apps Script deixam de existir junto com o runtime. Este requisito era o principal fator limitante do motor preditivo na v2.0 e não tem sucessor equivalente. **Substituído por `RNF-PERF-03.1`**, que registra os limites *reais* da nova plataforma — que são outros, e muito mais folgados.

**RNF-PERF-03.1. [NOVO — v2.1] — Limites reais da plataforma.** O sistema deve operar dentro dos limites do Supabase e da Vercel, que passam a ser os únicos limites técnicos relevantes:

| Limite | O que exige do projeto |
|---|---|
| **Connection pooling** (PgBouncer, modo *transaction*) | O acesso do servidor usa a porta *pooler*, não a conexão direta. Nenhum código mantém conexão aberta entre requisições. *Prepared statements* nomeados e `SET` de sessão persistente são evitados, por serem incompatíveis com o modo *transaction*. |
| **Tamanho de payload** de requisição/resposta | Respostas de tela são paginadas quando passarem de algumas centenas de linhas; nenhuma tela carrega uma tabela inteira "por precaução". Exportações grandes (relatórios, LIQ) são geradas por rota dedicada, não embutidas na resposta de uma Server Action. |
| **Tempo de execução de função** na Vercel | Operações longas — em especial o motor preditivo (`RNF-PERF-04`) — são explicitamente medidas contra esse limite antes de ir a produção; se não couberem, são fatiadas por curso/ano, não aceleradas por gambiarra. |

**RNF-PERF-04. [PRESERVADO]** O motor preditivo de planejamento anual continua sendo executado **sob demanda**, nunca automaticamente a cada acesso, por ser uma operação custosa que recalcula toda a grade curricular de um ano inteiro. Na v2.1 ele roda como Server Action disparada por ação explícita do usuário, com estado de progresso visível.

**RNF-PERF-05. [NOVO — v2.1] — Orçamento de Core Web Vitals.** As telas principais (Início, Cronograma, Detalhe Semanal de Aula, Relatório do Curso) devem respeitar, em rede e máquina típicas do CIAARA, o seguinte orçamento: **LCP ≤ 2,5 s**, **INP ≤ 200 ms**, **CLS ≤ 0,1**. O orçamento é uma referência de qualidade percebida, medida continuamente (`RNF-OBS-04`); estourá-lo abre uma investigação, não um bloqueio de entrega. Este requisito não existia na v2.0 porque, no Apps Script, a página era um `iframe` monolítico sobre o qual não havia controle.

**RNF-PERF-06. [NOVO — v2.1] — Streaming e Suspense por segmento.** Nenhuma tela deve ficar inteiramente em branco esperando a consulta mais lenta. Cada segmento de rota tem seu `loading.tsx`, e as partes da página que dependem de consultas independentes são envolvidas em `<Suspense>` com *skeleton* próprio, de modo que o cabeçalho, os filtros e a navegação apareçam imediatamente enquanto a grade densa ainda carrega. Isso é, na prática, a implementação de `RN-DEG-01` (degradação segura) na camada de renderização.

**RNF-PERF-07. [NOVO — v2.1] — Regra de decisão sobre otimização.** Nenhum índice além dos decorrentes de chave primária, chave única e chave estrangeira, nenhuma coluna desnormalizada e nenhuma camada de cache (incluindo TanStack Query) é introduzida **sem medição prévia** que demonstre o problema — `EXPLAIN ANALYZE` para consulta, medição de Web Vitals para tela. TanStack Query é a exceção, não o padrão: onde *Server Components* bastarem, não se acrescenta cache de cliente. *Este requisito existe para que a v2.1 não importe complexidade que a v2.0, com razão, nunca precisou.*

---

## 3. Usabilidade

**RNF-USA-01. [PRESERVADO]** A interface permanece integralmente em **português do Brasil**, sem necessidade de suporte a outros idiomas. Isso vale também para mensagens de erro, textos de validação Zod, rótulos gerados e mensagens de commit.

**RNF-USA-02. [MIGRAÇÃO v2.1]** O layout continua responsivo, mantendo o uso típico em desktop para as telas com tabelas e grades densas (Cronograma, Detalhe Semanal de Aula, Diagrama de Alocação), sem exigir uma versão mobile dedicada nesta fase. O mecanismo muda: a grade do Bootstrap 5 é substituída pelos *breakpoints* e utilitários do Tailwind v4. **Densidade é requisito**: este é um sistema de gestão com tabelas grandes — prefira compacto e legível a espaçado e bonito.

**RNF-USA-03. [PRESERVADO]** Toda ação destrutiva ou irreversível (excluir um lançamento, desativar um instrutor, salvar um cadastro, aplicar um planejamento anual sobre outro) continua exigindo **confirmação explícita** do usuário antes de ser efetivada — na v2.1, pelo componente `AlertDialog` do shadcn/ui, com o efeito da ação descrito em texto, não apenas "Tem certeza?".

**RNF-USA-04. [PRESERVADO]** Avisos e alertas de qualidade de dados (cadastro incompleto, conflito de horário, sobrecarga de instrutor, teto normativo excedido, uso do 9º TA) continuam **sempre visíveis, nunca ocultos por padrão**. Na v2.1 são renderizados pelo componente `AlertaConformidade` (`components/ciaara/`), que é parte do Design System e não uma composição improvisada por tela.

**RNF-USA-05. [PRESERVADO]** O tema claro (pastel) e o modo noturno continuam **selecionáveis pelo usuário e persistidos entre sessões** no próprio navegador. Mecanismo na v2.1: `next-themes` com estratégia `class`, sobre os *tokens* CIAARA declarados em `app/globals.css` sob `@theme`.

**RNF-USA-06. [NOVO — v2.1] — Acessibilidade.** As telas devem atender contraste **AA**, foco visível em todos os elementos interativos e navegação completa por teclado nas tabelas densas (movimentação por célula, atalhos de linha, acionamento de ações sem mouse). O uso de shadcn/ui sobre Radix entrega boa parte disso por construção; o que não vier por construção é responsabilidade da tela.

**RNF-USA-07. [NOVO — v2.1] — Endereçabilidade das telas (*deep-link*).** Toda tela com contexto (curso, turma, semana, filtros) deve ser **endereçável por URL** e reconstituível a partir dela. Isso entrega o que `RF-NAV` pedia e a v2.0 não conseguia entregar: histórico do navegador funcional, botões voltar/avançar coerentes, recarregar sem perder contexto e compartilhar por mensagem o link de uma tela específica. Mecanismo: `searchParams` gerenciados com `nuqs`, substituindo o objeto global `AppState` da v2.0.

---

## 4. Segurança e controle de acesso

**RNF-SEG-01. [MIGRAÇÃO v2.1] — Autenticação por e-mail/senha, somente por convite.**
~~Texto v2.0: o acesso deve continuar restrito a contas Google individualmente cadastradas — não deve existir usuário/senha próprio do sistema nem acesso anônimo.~~
**Texto v2.1:** o acesso é restrito a usuários com **conta de e-mail/senha criada exclusivamente por convite do Administrador**, com **cadastro público desabilitado** no painel do Supabase e **sem acesso anônimo**. O fluxo é: o Admin cadastra o usuário → uma Server Action com `service_role` chama `auth.admin.inviteUserByEmail()` → o usuário define a senha em `/convite/[token]` → primeiro acesso. A coluna `usuarios.auth_user_id uuid unique references auth.users(id) on delete restrict` mantém a correspondência 1:1 entre o cadastro institucional e o Supabase Auth.
**Motivo da mudança:** a autenticação por conta Google da v2.0 (decisão D1) dependia de `Session.getActiveUser()`, uma primitiva do runtime Apps Script que não existe fora dele. A decisão do responsável em 25/08/2026 reverte D1. O invariante que importava — *nenhum acesso anônimo, todo usuário nominal e previamente cadastrado* — é integralmente preservado. *Origem: BRIEF v2.1, §3.*

**RNF-SEG-02. [ABSORVIDO PELA PLATAFORMA] — Verificação no servidor vira RLS.**
*Texto v2.0 preservado:* "Toda operação de escrita deve continuar sendo verificada no servidor contra o perfil do usuário autenticado, independentemente do que a interface exibe ou oculta (a ocultação de botões na tela é conveniência de uso, não o mecanismo de segurança)."
**Na v2.1 isto deixa de ser disciplina de código e passa a ser garantia do motor.** Toda tabela tem `ENABLE ROW LEVEL SECURITY`, e **uma tabela sem *policy* é inacessível por padrão — isso é intencional, não um descuido de configuração**. A autorização é expressa como dado na tabela `perfil_permissao (perfil, recurso, acao, permitido)`, consultada pelas *policies* através de funções `SECURITY DEFINER STABLE` do schema `app` (`app.usuario_atual()`, `app.perfil_atual()`, `app.pode(recurso, acao)`, `app.cursos_do_usuario()`). Não se escreve uma *policy* por perfil: **trocar uma permissão vira `UPDATE`, não migration** — é o Princípio VII aplicado à autorização. A interface continua ocultando o que o usuário não pode fazer, mas agora isso é exclusivamente conveniência: **o banco é a fronteira real**, e uma requisição que escape da interface é negada pelo PostgreSQL, não por um `if` esquecido em alguma função. *Origem: BRIEF v2.1, §3.*

**RNF-SEG-03. [MIGRAÇÃO v2.1] — Bloqueio (lock) vira transação PostgreSQL.**
~~Texto v2.0: operações concorrentes de escrita sobre a mesma fonte de dados devem continuar protegidas por bloqueio (lock) para evitar condição de corrida entre dois usuários salvando ao mesmo tempo.~~
**Texto v2.1:** operações concorrentes de escrita são protegidas por **transação PostgreSQL**, não por `LockService`. Toda mutação que toque mais de uma linha ou mais de uma tabela roda dentro de uma transação (`BEGIN … COMMIT`), com `SELECT … FOR UPDATE` onde houver leitura-e-decisão sobre a mesma linha, e nível de isolamento elevado apenas quando a regra exigir. O `LockService.getScriptLock()` da v2.0 era um **mutex global de aplicação** — serializava o sistema inteiro para proteger uma linha; a transação protege exatamente a linha disputada e deixa o resto passar. *Ver também `RNF-CONF-07`.*

**RNF-SEG-04. [MIGRAÇÃO v2.1] — Fronteira de escrita na modularização.**
~~Texto v2.0: nenhuma refatoração de arquivos (modularização) pode expor funções de escrita a chamadas que não passem pela verificação de perfil.~~
**Texto v2.1:** toda escrita passa obrigatoriamente por uma **Server Action** em `lib/acoes/`, que (i) obtém a sessão pelo cliente `@supabase/ssr`, (ii) valida a entrada com o schema Zod correspondente em `lib/validacao/`, e (iii) executa a operação com o **cliente do usuário autenticado**, de modo que a RLS se aplique. Nenhuma função exportada de `lib/dominio/` escreve em banco — por construção, `lib/dominio/` não conhece o Supabase (`RNF-MAN-06`). O risco que este requisito cobria na v2.0 — uma função de escrita ficar acessível sem a verificação, por descuido de refatoração — é agora mitigado em duas camadas: a fronteira `"use server"` e, atrás dela, a RLS.

**RNF-SEG-05. [PRESERVADO E REFORÇADO]** A ampliação do número de perfis de RBAC (documento 01) continua exigindo casos de teste específicos para cada combinação relevante de **perfil × recurso × ação × escopo de curso**. Na v2.1 este requisito é reforçado e passa a ser item obrigatório da Definition of Done (BRIEF §7.4): para cada perfil, testa-se **o que ele não pode ler nem escrever**, e a negativa tem de vir do banco. **Teste negativo é obrigatório — testar só o caminho feliz de RLS não prova absolutamente nada.** *Origem: documento 08, decisões D2/D6; reforço: BRIEF v2.1, §7.*

**RNF-SEG-06. [NOVO — v2.1] — Gestão de segredos e variáveis de ambiente.** Nenhum segredo é versionado no repositório. O arquivo `.env.local.example` documenta os nomes das variáveis, nunca os valores. As variáveis reais vivem em `.env.local` (local, no `.gitignore`) e nas variáveis de ambiente da Vercel, **segregadas por ambiente** (desenvolvimento, *preview*, produção), com credenciais distintas em cada um. O prefixo `NEXT_PUBLIC_` só pode ser usado em valores que podem ser lidos por qualquer visitante — na prática, a URL do projeto Supabase e a `anon key`. Rotação de credencial é procedimento documentado, não improviso.

**RNF-SEG-07. [NOVO — v2.1] — A chave `service_role` nunca alcança o cliente.** A chave `service_role` do Supabase **ignora toda RLS** e, por isso, é tratada como credencial de administrador do banco. Ela só pode ser lida em `lib/supabase/admin.ts`, que é importado **exclusivamente** por Server Actions que legitimamente precisem dela (convite de usuário, ETL, tarefas administrativas), nunca por *Client Component*, nunca por rota pública, nunca com prefixo `NEXT_PUBLIC_`. A fronteira deve ser verificada mecanicamente (regra de *lint* de importação ou teste de arquitetura), não confiada à memória de quem revisa.

**RNF-SEG-08. [NOVO — v2.1] — Política de senha.** Mínimo de **12 caracteres**; verificação contra bases de vazamento (HaveIBeenPwned, recurso nativo do Supabase Auth) habilitada; **sem expiração compulsória** — trocar senha a cada 90 dias produz senhas piores, não melhores. Recuperação por e-mail em `/recuperar-senha`, com *token* de uso único e validade curta. **Cadastro público permanece desabilitado**: não existe caminho de criação de conta que não passe por convite do Administrador (`RNF-SEG-01`).

**RNF-SEG-09. [NOVO — v2.1] — Proteção de rotas por middleware.** O `middleware.ts` intercepta todas as rotas do grupo `(app)` e de `/print/*`, renova a sessão do Supabase e redireciona requisições não autenticadas para `/login`, preservando a URL de destino para retorno após o *login*. **O middleware é conveniência de navegação, não mecanismo de segurança** — a mesma advertência que `RNF-SEG-02` fazia sobre botões ocultos vale aqui: se o middleware falhar ou for contornado, a RLS continua negando o dado. Nunca se deve implementar uma autorização apenas no middleware.

**RNF-SEG-10. [NOVO — v2.1] — Auditoria de acesso.** O sistema registra `usuarios.ultimo_acesso` a cada autenticação bem-sucedida, e preenche `criado_por`/`editado_por` por *trigger* `set_auditoria()` a partir de `auth.uid()` — **nunca a partir de um campo enviado pelo cliente**, que seria falsificável. Tentativas de escrita negadas pela RLS devem ser observáveis nos logs (`RNF-OBS-02`) com perfil, recurso e ação, para que uma negativa recorrente seja lida como erro de matriz de permissões e não como usuário insistente. Nenhum registro de auditoria é editado; correção se faz por novo evento.

---

## 5. Confiabilidade e integridade de dados

**RNF-CONF-01. [PRESERVADO E REFORÇADO]** Nenhuma operação de saneamento, migração ou refatoração de dados pode resultar em **perda de histórico** de aulas, avaliações ou eventos já lançados. Na v2.1 este requisito é reforçado pelo desenho do ETL (BRIEF §2 e Épico 2): toda tabela migrada carrega `origem_migracao_v1`, todo evento de migração é registrado em `migracao_log`, e **nenhuma linha de `migracao_log` já gravada é reescrita** — corrige-se logando um novo evento. A reconciliação pós-carga (contagens por tabela, somatórios de carga horária, órfãos) é critério de aceite do Épico 2.

**RNF-CONF-02. [MIGRAÇÃO v2.1] — Princípio aditivo, agora expresso em migration.**
*Texto v2.0 preservado em substância:* toda coluna nova introduzida em uma fonte de dados já em produção deve ser aditiva e não exigir migração obrigatória das linhas existentes.
**Na v2.1** o princípio é expresso como regra sobre migrations: uma coluna nova entra como `ADD COLUMN … NULL` ou com `DEFAULT`, jamais como `NOT NULL` sem *default* sobre tabela populada; `DROP COLUMN`, `DROP TABLE` e mudança de tipo que perca informação só ocorrem **com snapshot prévio** (`RNF-BKP-02`) e em migration separada, isolada, revisada por si só. A migração estrutural Sheets → PostgreSQL da v2.1 é a mesma **exceção única e controlada** que a v2.0 declarou para a sua própria migração: feita uma vez, com snapshot e preservação de 100% do histórico — não é prática recorrente.

**RNF-CONF-03. [PRESERVADO]** O sistema continua **degradando com segurança** quando uma fonte de dados referenciada ainda não existir ou estiver incompleta, retornando resultado vazio/neutro com aviso em vez de falhar de forma não tratada. Mecanismo na v2.1: `error.tsx` e `not-found.tsx` por segmento de rota, mais o contrato das funções de `lib/dominio/`, que devolvem resultado neutro acompanhado de lista de avisos em vez de lançar exceção. *Este é o `RN-DEG-01` do documento 04, visto do lado não-funcional.*

**RNF-CONF-04. [REVOGADO — v2.1]**
~~O sistema deve continuar validando a implantação completa dos arquivos de frontend e backend, alertando explicitamente sobre implantação parcial em vez de apresentar erros genéricos ao usuário final.~~
**Motivo da revogação:** "implantação parcial" era um estado possível apenas porque a implantação da v2.0 consistia em colar arquivos manualmente no editor do Apps Script (`RNF-PLAT-04`, também revogado). Com *build* e *deploy* atômicos a partir do Git, ou a versão inteira está publicada ou nada mudou — o estado intermediário que este requisito detectava **não pode mais existir**. **Substituído por `RNF-CONF-04.1`.**

**RNF-CONF-04.1. [NOVO — v2.1] — Integridade da entrega.** O *build* reprovado (erro de `tsc`, falha de teste, *lint* com aviso novo) **impede a publicação**; não existe publicação de artefato que não passou pela verificação. Além disso, deve existir um ponto de verificação de saúde acessível ao Administrador que informe **a versão publicada e a última migration aplicada**, de modo que uma divergência entre código e schema seja detectada em segundos, e não pelo primeiro usuário que abrir a tela quebrada. *Ver `RNF-OBS-06`.*

**RNF-CONF-05. [PRESERVADO E REFORÇADO]** Registros históricos que referenciam um **instrutor desativado** ou uma **disciplina remapeada por deduplicação** continuam resolvendo nome e informação corretamente em relatórios e módulos de acompanhamento. Na v2.1 o requisito ganha garantia estrutural: a referência é uma *foreign key* para `id`, o instrutor inativo continua existindo com `status = 'inativo'` (nada é apagado), e a resolução do nome é feita por `JOIN`/*view*, não por busca textual. O caso que gerava o defeito na v2.0 — o registro apontar para uma linha que sumiu — passa a ser impossível por `ON DELETE RESTRICT`.

**RNF-CONF-06. [ABSORVIDO PELA PLATAFORMA] — Integridade referencial deixa de ser disciplina.** Na v2.0, a coerência entre um registro de aula e a disciplina, a turma, o curso e o instrutor que ele citava era mantida por **convenção**: cada função de escrita precisava lembrar de conferir. Não havia mecanismo que impedisse gravar um `ID_Instrutor` inexistente numa célula. Na v2.1, isso é **`FOREIGN KEY` declarativa** com `ON DELETE RESTRICT`, complementada por `CHECK` para domínios e faixas, `UNIQUE` para chaves de negócio (incluindo a unicidade genérica `(curso_id, codigo_disciplina)` de `RN-MAT-02`) e `NOT NULL` para obrigatoriedade. **A classe inteira de defeito "registro órfão" deixa de ser possível** — não é mais uma coisa a testar com cuidado, é uma coisa que o motor recusa. As asserções correspondentes (contagem de órfãos = 0) permanecem na suíte pgTAP como verificação de que o schema realmente declara o que dizemos que declara.

**RNF-CONF-07. [NOVO — v2.1] — Transações ACID.** Toda mutação que altere mais de uma tabela, ou que dependa de uma leitura para decidir a escrita, executa dentro de uma **transação única**: ou tudo é gravado, ou nada é. Os casos mais sensíveis são (a) o lançamento de avaliação como fato único (`RN-AVAL-02`), que na v2.0 exigia dois cadastros paralelos sem correspondência garantida; (b) o salvamento do planejamento anual (`RN-2027-07` revertida), que grava um conjunto coerente de blocos; (c) a reativação/desativação de instrutor com efeito sobre atribuições futuras (`RN-INST-02`). Quando a lógica exigir múltiplas idas ao banco, ela é encapsulada em função `plpgsql` chamada por RPC — **não se simula transação com uma sequência de chamadas independentes a partir do TypeScript**.

**RNF-CONF-08. [NOVO — v2.1] — Migrations revertíveis.** Cada migration deve ter um caminho de reversão conhecido e **testado no ambiente de *preview*** antes de ser aplicada em produção, e a Definition of Done (BRIEF §7.6) só é atingida quando isso é demonstrado. Migrations destrutivas são sempre precedidas de snapshot (`RNF-BKP-02`). Migration aplicada em produção **nunca é editada** — corrige-se com uma nova migration, pelo mesmo motivo pelo qual não se reescreve linha de `migracao_log`.

---

## 6. Manutenibilidade (motivação central da v2.0, preservada na v2.1)

**RNF-MAN-01. [PRESERVADO]** Nenhum arquivo de frontend ou backend pode concentrar a totalidade da lógica do sistema; a divisão por domínio continua sendo o requisito não-funcional mais diretamente ligado ao motivo de existir do redesenho. Na v2.1 a divisão é a estrutura do BRIEF §4: rotas por domínio no App Router, `components/{ui,ciaara,graficos,impressao}/`, `lib/dominio/` (regras puras), `lib/validacao/` (Zod), `lib/acoes/` (Server Actions) e `lib/supabase/` (acesso). O `Código.gs` monolítico da v1.0/v2.0 não tem sucessor.

**RNF-MAN-02. [ABSORVIDO PELA PLATAFORMA] — A configuração duplicada entre frontend e backend deixa de existir.**
*Texto v2.0 preservado:* "Configurações hoje duplicadas manualmente entre frontend e backend para permanecerem 'em sincronia' (por exemplo, a lista de colunas de data fora do padrão de nome, ou a lista de colunas de fórmula que não podem ser sobrescritas) devem ser avaliadas na Fase 2 quanto à possibilidade de ter uma única fonte de verdade."
**Este requisito não é apenas cumprido na v2.1: a classe de defeito que ele tentava conter deixa de ser construível.** Na v2.0, frontend (`index.html`, JavaScript de navegador) e backend (`Código.gs`, Apps Script) eram dois programas distintos que só se encontravam em tempo de execução; manter duas listas idênticas em sincronia dependia de alguém lembrar. Na v2.1 há **um único projeto TypeScript**, e as três fontes de verdade que sobram são todas geradas ou compartilhadas:

| Fonte de verdade | Onde vive | Quem consome |
|---|---|---|
| **Formato do dado** | `lib/tipos/database.ts`, gerado por `supabase gen types typescript` a partir do schema | servidor e cliente, verificado por `tsc` |
| **Regra de validação** | schemas **Zod** em `lib/validacao/` | o formulário no cliente e a Server Action no servidor — *o mesmo objeto*, importado nos dois lados |
| **Parâmetro normativo** | tabelas `config_parametros` e `config_listas` | lido do banco em tempo de execução, nunca constante em código (`RNF-NORM-08`) |

Divergir passa a ser **erro de compilação**, não defeito silencioso descoberto em produção. É o mesmo movimento de `_Meta_Colunas` → schema + tipos gerados descrito em `RNF-PLAT-07`.

**RNF-MAN-03. [PRESERVADO]** O vocabulário visual (cores, espaçamentos, tipografia, componentes) continua tendo um **único ponto de manutenção**, de forma que uma mudança de identidade visual não exija editar dezenas de blocos de CSS espalhados. Mecanismo na v2.1: *tokens* CIAARA como *custom properties* em `app/globals.css` sob `@theme` (Tailwind v4), mais os componentes de `components/ui/` e `components/ciaara/`. **O objeto global `UI` da v2.0 deixa de existir como objeto**: vira *tokens* + biblioteca de componentes tipada. O requisito `RF-DS` é preservado; o mecanismo muda.

**RNF-MAN-04. [PRESERVADO E REFORÇADO]** Constantes anuais derivadas do PROENS (feriados, janelas de curso, reservas de Administração e Tempo Reserva) continuam sendo **dados administráveis**, não constantes em código — requisito confirmado na v2.0 e necessário à generalização multi-ano do motor preditivo. Na v2.1 isso deixa de depender de disciplina e vira estrutura: tabelas `feriados`, `janelas_curso`, `reservas_proens` e `planejamento_anual`, com FK, tipo e vigência. *Origem: documento 08, decisão D4.*

**RNF-MAN-05. [PRESERVADO]** O padrão de trabalho validado nas quatro rodadas de especificação da v1.0 e nas 39 specs da v2.0 — **edição cirúrgica, aditiva, um commit por unidade de mudança, validação antes de generalizar** — continua sendo a forma de conduzir a implementação. Na v2.1 ele é formalizado em *Conventional Commits* citando o identificador de origem (`feat(RF-DSA-08): …`) e em *pull requests* pequenos, com migration e teste no mesmo PR da funcionalidade que a exige.

**RNF-MAN-06. [NOVO — v2.1] — `lib/dominio/` não conhece o banco.** **Nada em `lib/dominio/` importa `supabase`, `next` ou qualquer biblioteca de I/O.** As funções de domínio recebem dados já carregados como argumento e devolvem resultado — motor preditivo, distribuição semanal de carga horária, detecção de conflito de horário, sugestão do Detalhe Semanal de Aula, ordenação por antiguidade e verificação de tetos normativos são **funções puras**. A consequência prática é o que torna esta migração viável: puras ⇒ testáveis sem banco ⇒ a suíte de invariantes da v2.0 (`tests/*.test.js`) porta quase 1:1 para Vitest. A fronteira deve ser verificada mecanicamente por regra de *lint* de importação, não confiada à disciplina de quem escreve. *Origem: BRIEF v2.1, §4; ver documento 04, seção "Regra crítica".*

---

## 7. Auditoria e rastreabilidade

**RNF-AUD-01. [PRESERVADO E REFORÇADO]** Lançamentos de aula continuam registrando **quem os lançou e quando**. Na v2.1 isso não depende mais de a função de escrita lembrar de preencher os campos: `criado_por`, `criado_em`, `editado_por` e `editado_em` são preenchidos por *trigger* `set_auditoria()` a partir de `auth.uid()`, com `timestamptz` em UTC e apresentação em `America/Sao_Paulo`.

**RNF-AUD-02. [RESOLVIDO — v2.1]**
*Texto v2.0:* "Deve-se avaliar, na Fase 2, estender esse mesmo padrão de autoria/data a outras operações de escrita que hoje não o possuem uniformemente (cadastros de curso, matéria, instrutor, eventos), como parte do saneamento de dados."
**A avaliação está encerrada e a resposta é sim.** Na v2.1 a auditoria é **convenção universal de schema** (BRIEF §2): `criado_por`/`criado_em`/`editado_por`/`editado_em` em toda tabela transacional, e ao menos o par de edição em toda tabela de cadastro. Deixa de ser item em aberto e passa a ser regra de aceite de qualquer migration que crie tabela.

**RNF-AUD-03. [PRESERVADO]** Todo requisito funcional do documento 02 que decorrer de uma regra de negócio deve citar o identificador `RN-` correspondente do documento 04, e todo requisito deve ser referenciável por um caso de teste. Na v2.1 o segundo elo dessa cadeia — antes um "compromisso de continuidade" para a Fase 4 — passa a ser **executável desde a primeira fatia**: o nome do teste carrega o identificador (`RN-2027-04`, `RF-DSA-08`), a mensagem de commit também, e a Definition of Done (BRIEF §7.3) exige uma asserção nomeada por regra `RN-` classificada *Risco: Alto*, **mesmo que ainda como *stub* explicitamente pendente**. Um *stub* rastreável é melhor que cobertura fingida (Princípio VIII). *Origem: documento 09, recomendação R-6.*

---

## 8. Compatibilidade e impressão

**RNF-COMP-01. [PRESERVADO E REFORÇADO] — Paridade de impressão é critério de aceite.** Todas as visões com layout de impressão dedicado devem **preservar paridade** com a v2.0 após a migração de plataforma e a adoção do novo Design System. As saídas cobertas são:

| Saída | Rota v2.1 | Origem |
|---|---|---|
| Detalhe Semanal de Aula (DSA) | `/print/dsa` | `RF-DSA`, Épico 6 |
| Relatório do Curso | `/print/relatorio` | `RF-REL`, Épico 10 |
| Cronograma (fusão Diagrama de Alocação + Cronos) | `/print/cronograma` | documento 08, decisão D4; Épico 7 |
| Ficha do Instrutor | `/print/ficha-instrutor` | specs 022–026, Épico 11 |
| LIQ | `/print/liq` | spec 027, Épico 11 |
| OS de Instrutoria | `/print/os-instrutoria` | spec 028, Épico 11 |

**Reforço da v2.1 — impressão é requisito, não detalhe:** (a) as rotas `/print/*` renderizam **sem o *shell* de navegação**, com CSS `@media print` e quebra de página controlada; (b) cada uma delas tem **teste e2e Playwright obrigatório** na Definition of Done da fatia correspondente (BRIEF §7.5), que compara o resultado contra o layout aprovado da v2.0; (c) **uma fatia que produza uma dessas saídas não está pronta enquanto o teste de impressão não passar** — paridade de impressão é critério de aceite, não ajuste posterior. Esta é a área do sistema em que o usuário final percebe regressão de imediato, porque o documento impresso circula fora do sistema e tem leitores que nunca abriram a aplicação.

**RNF-COMP-02. [MIGRAÇÃO v2.1]** O sistema deve funcionar nos navegadores de desktop correntes — **Chrome, Edge, Firefox e Safari, nas duas versões mais recentes de cada** — sem exigir plugin ou extensão adicional. Substitui a formulação da v2.0 ("navegadores compatíveis com Bootstrap 5"), que perdeu referência com a saída do Bootstrap.

**RNF-COMP-03. [NOVO — v2.1] — Geração de documento sem serviço externo.** A produção dos documentos impressos usa **CSS `@media print` sobre rota dedicada mais a impressão do próprio navegador**, sem dependência de serviço externo de geração de PDF e sem envio do conteúdo para fora do ambiente. Além de eliminar custo e ponto de falha, isso mantém dado institucional dentro da fronteira do sistema.

---

## 9. Backup e continuidade

**RNF-BKP-01. [MIGRAÇÃO v2.1] — PITR do Supabase substitui a exportação manual.**
~~Texto v2.0: o procedimento atual de backup (exportação manual periódica da planilha viva para um arquivo `.xlsx` local, nunca escrito pelo código) deve continuar disponível como salvaguarda durante e após a migração estrutural.~~
**Texto v2.1:** a salvaguarda primária é o ***Point-in-Time Recovery* (PITR) do Supabase**, habilitado no projeto, com janela de retenção conforme o plano contratado. O PITR permite restaurar o banco a um instante arbitrário dentro da janela — capacidade que a exportação manual periódica nunca teve, porque só recuperava até o último `.xlsx` salvo à mão. **Confirmar com o Bernardo o plano do projeto Supabase e a janela de retenção efetivamente disponível.**

**RNF-BKP-02. [PRESERVADO — mecanismo migrado] — Snapshot antes de operação estrutural.** Antes de qualquer migration destrutiva ou operação de saneamento em massa (`RNF-CONF-02`, `RNF-CONF-08`), deve ser tirado um **snapshot explícito** do banco de produção via `pg_dump`, armazenado fora do Supabase, identificado pelo nome da migration que ele antecede. É o mesmo requisito da v2.0 — só muda o artefato: era `.xlsx` da planilha viva, agora é *dump* SQL. **Nenhuma migration destrutiva é aplicada em produção sem esse snapshot registrado.**

**RNF-BKP-03. [NOVO — v2.1] — `pg_dump` agendado e restauração testada.** Além do PITR, deve existir um **`pg_dump` completo agendado** (periodicidade diária como ponto de partida), cifrado, armazenado fora da infraestrutura do Supabase, com política de retenção definida. **Um backup que nunca foi restaurado não é um backup**: a restauração deve ser exercitada periodicamente em ambiente de *preview*, e o resultado do exercício registrado. **Definir com o Bernardo o destino de armazenamento e a periodicidade do exercício de restauração.**

**RNF-BKP-04. [NOVO — v2.1] — Continuidade durante a transição.** Enquanto a v2.1 não estiver estabilizada em produção, a planilha `Banco de dados CIAARA-11 v2.0` permanece **congelada como fonte histórica de leitura** — não é editada, não é sincronizada de volta e não é fonte de verdade, mas continua acessível. É o mesmo papel que a planilha da v1.0 teve durante a v2.0. O critério e a data de encerramento desse período de transição são decisão do responsável.

---

## 10. Conformidade normativa (compliance) — **PRESERVADA INTEGRALMENTE**

> **[PRESERVADO — v2.1]** Esta seção inteira atravessa a migração **sem alteração de conteúdo**. Seus requisitos decorrem da DGPM-101 (9ª Rev.), da DGPM-103 (4ª Rev.), das normas DEnsM-1002/1004/2001/2003, do PCP-FCT-2 e do Regimento Interno do CIAARA — **são normativos, não técnicos**, e não têm relação alguma com a plataforma que os implementa. O texto abaixo é o da v2.0, reproduzido na íntegra. O único acréscimo da v2.1 é, ao final de cada requisito, uma linha **"Implementação v2.1"** dizendo onde ele passa a viver — o requisito em si é intocado.

Esta seção registra as restrições do corpo normativo do Sistema de Ensino Naval que o sistema deve respeitar ou ajudar a fazer respeitar, e é a resposta à exigência de que a Fase 1 documente explicitamente as restrições de compliance. As fontes são a DGPM-101 (9ª Rev.), a DGPM-103 (4ª Rev.), as normas DEnsM-1002/1004/2001/2003, o PCP-FCT-2 e o Regimento Interno do CIAARA, consolidadas nos documentos `Glossário_DEnsM_consolidado.md`, `Regras_dos_processos_educacionais_consolidado.md` e `Matriz de responsabilidades.md`.

**RNF-NORM-01. [RESOLVIDO — v1.3] [PRESERVADO — v2.1]** **Limite diário de tempos de aula, fundamentado por currículo.** O sistema não deve permitir configurar nem alocar mais TA por dia do que o autorizado pelo **currículo do curso**, aprovado pela DEnsM: o padrão geral é 8 TA/dia (50 ou 45 min, conforme o curso), mas currículos que preveem explicitamente um 9º TA como "tempo opcional de apoio" em situação especial (confirmado nos currículos de CAHO, C-Ap-HN e C-Ap-FR) são uma exceção legítima, não um erro de configuração. **Correção relevante daquela rodada:** a investigação original (achado A-3) presumiu que o 9º TA da Configuração D fosse uma falha de dado; a leitura dos currículos por curso (item 2.1, "Diretrizes Gerais do Curso" de cada PDF) confirmou que é uma autorização normativa explícita, não uma não conformidade. O 9º TA deve ser tratado como **alerta informativo, não bloqueio** (ver `RN-DEG-02`, documento 04). *Origem: documento 09, achados A-3/A-4, proposta P-5, resolvida por fundamentação curricular (instrução do responsável de 01/08/2026); requisitos correspondentes: documento 02, RF-HOR-03/03.1.*
**Implementação v2.1:** limite por par duração/curso em `config_parametros`; validação como função pura em `lib/dominio/tempos-aula.ts`; alerta renderizado por `AlertaConformidade`. **Não se cria `CHECK` bloqueante para o 9º TA** — bloquear contrariaria a norma que o autoriza.

**RNF-NORM-02. [RESOLVIDO — v1.3] [PRESERVADO — v2.1]** **Tetos de composição da carga horária.** O sistema deve calcular e sinalizar o cumprimento dos tetos normativos de composição da Carga Horária Total, viabilizado pela taxonomia normativa de 5 categorias (Aula, Avaliação/Vista, AEC, TAD, TR, com Estudo Individual registrado à parte): Atividades Extraclasse ≤ 10% do somatório das cargas horárias das disciplinas; Tempo para Administração ≤ 5% da Carga Horária Real; Tempo Reserva ≤ 10% da Carga Horária Real. *Origem: documento 09, achado A-6, propostas P-1 e P-8, aprovadas; requisitos correspondentes: documento 02, RF-DSA-01, RF-EXTRA-04.*
**Implementação v2.1:** percentuais em `config_parametros`; cálculo em `lib/dominio/tetos-normativos.ts` (função pura); apuração por `VIEW` para relatório; asserção pgTAP por teto (`RN-EVT-01`, *Risco: Alto*).

**RNF-NORM-03. [RESOLVIDO — v1.2/v1.3] [PRESERVADO — v2.1]** **Faixas de carga horária semanal docente.** O sistema deve respeitar, no planejamento e no acompanhamento, as faixas de horas de aula por regime de trabalho: 20h → 8 a 12 h; 40h → 16 a 24 h; Dedicação Exclusiva → 16 a 30 h — corrigindo o defeito em que o número do regime (20, 40) era usado diretamente como teto. *Origem: documento 09, achado A-2; regra correspondente: documento 04, RN-2027-06 revisada.*
**Implementação v2.1:** faixas em `config_parametros` (mínimo e máximo por regime, com norma de origem); consumo em `lib/dominio/motor-preditivo/escolha-instrutor.ts`; sobrecarga gera alerta, nunca bloqueio de alocação (`RN-2027-06`).

**RNF-NORM-04. [REJEITADO — v1.3, decisão explícita do responsável] [PERMANECE REJEITADO — v2.1]** **Sequenciamento pedagógico dos tempos de aula.** Este requisito propunha que o sistema considerasse, na sugestão automática do Detalhe Semanal de Aula e na sinalização de inconsistências, restrições de sequenciamento de técnica de ensino (intervalo a cada 2 TA geminados, limite de TA consecutivos com a mesma técnica, mínimo de técnicas distintas em blocos de 3 TA, teto de 5 TA expositivos/dia). **O responsável determinou não aplicar esta proposta**, por considerá-la uma regra excessivamente exigente para o estágio atual do sistema ("é uma regra muito exigente e será desconsiderada"). O requisito é mantido neste documento **apenas para registro histórico da análise e da decisão** — não gera nenhum RF, RN ou critério de aceitação em nenhum outro documento desta Fase 1. Uma reavaliação futura, se desejada, deve ser tratada como novo ciclo de proposta, não como pendência aberta desta versão. *Origem: documento 09, achado A-7, proposta P-9 (referida pelo responsável como "P-10" na aprovação de 01/08/2026 — ver nota de esclarecimento no documento 09, seção 5); rejeitada.*
**Implementação v2.1: nenhuma.** A mudança de plataforma **não reabre esta decisão**. O fato de o motor de sugestão do DSA passar a ser uma função pura, mais fácil de estender, é irrelevante: a rejeição foi de mérito, não de viabilidade técnica. Nenhuma linha de `lib/dominio/` implementa sequenciamento pedagógico.

**RNF-NORM-05. [RESOLVIDO — v1.3, como alerta] [PRESERVADO — v2.1]** **Habilitação e capacitação docente.** O sistema deve sinalizar instrutores sem capacitação didática registrada que ultrapassem um ano de exercício de docência, conforme o limite normativo de atuação sem curso de técnica de ensino, e apoiar o acompanhamento da exigência do PCQD de participação de todos os docentes em ao menos um evento de capacitação a cada três anos. Implementado como **alerta informativo**, nunca como bloqueio de cadastro ou de habilitação (princípio geral R-4, documento 04 `RN-DEG-02`) — dado que 83,6% dos 177 instrutores da base atual não têm este campo preenchido, um bloqueio rígido inviabilizaria a operação corrente. *Origem: documento 09, achado A-9, proposta P-10, aprovada; requisito correspondente: documento 02, RF-INSTR-16.*
**Implementação v2.1:** `VIEW` de instrutores com pendência de capacitação; alerta na Ficha do Instrutor e no painel; **coluna de capacitação permanece anulável** — o dado ausente em 83,6% da base não pode virar `NOT NULL` sob pena de inviabilizar a migração (`RNF-CONF-02`).

**RNF-NORM-06. [PRESERVADO — v2.1]** **Fronteira de competência organizacional.** O sistema não deve produzir, calcular ou armazenar notas, médias finais, situação de aprovação ou documentos escolares — competências das Divisões de Registro Escolar (CIAARA-32) e de Orientação Educacional e Pedagógica (CIAARA-12), não da Divisão de Administração Acadêmica (CIAARA-11). Este requisito é o fundamento normativo da decisão D5 e o principal critério objetivo de contenção de escopo desta versão.
**Implementação v2.1:** critério de contenção de escopo aplicado ao schema — **não existe coluna de nota, média ou situação de aprovação em nenhuma tabela da v2.1**. Os campos `Formula_MF` e `Carater` herdados da v1.0 permanecem informativos, se mantidos (`RN-AVAL-01`). A facilidade técnica de calcular uma média no PostgreSQL não altera a competência organizacional: **a pergunta continua sendo "este processo está atribuído à CIAARA-11 na Matriz de Responsabilidades?"** (Princípio IX).

**RNF-NORM-07. [PRESERVADO — v2.1]** **Rastreabilidade normativa.** Toda regra de negócio do documento 04 deve indicar se decorre de norma externa (com a fonte identificada) ou de prática interna do CIAARA, de modo que uma futura alteração normativa possa ser propagada com segurança. Implementado pela classificação de conformidade introduzida no documento 04.
**Implementação v2.1:** a classificação de conformidade é preservada regra a regra no documento 04 da v2.1, ao lado da nova coluna de camada de destino. Além disso, `config_parametros` guarda a **norma de origem** de cada parâmetro, o que torna a rastreabilidade consultável em tempo de execução, e não só em documento.

**RNF-NORM-08. [NOVO — v1.3, recomendação R-3] [PRESERVADO E REFORÇADO — v2.1]** **Limites normativos como configuração, não como constante em código.** Os valores percentuais de tetos (AEC 10%, TAD 5%, TR 10%), as faixas de carga horária docente por regime (20h → 8-12h; 40h → 16-24h; DE → 16-30h) e os limites de TA diários por par duração/curso devem ser mantidos em uma tabela de parâmetros administrável, com identificação da norma de origem, e não *hard-coded* na lógica do sistema. O mesmo princípio já se aplica às constantes anuais do PROENS (`RNF-MAN-04`); este requisito o estende explicitamente aos limites de conformidade normativa. Evita reeditar e reimplantar código a cada revisão normativa da DGPM/DEnsM. *Origem: documento 09, recomendação R-3.*
**Implementação v2.1 — o requisito ganha força:** deixa de ser uma intenção sobre "uma tabela de parâmetros" e passa a ser a tabela **`config_parametros`**, com chave, valor, tipo, **norma de origem** e vigência (`vigente_de`/`vigente_ate`), protegida por RLS de escrita restrita ao Administrador. As funções de `lib/dominio/` **recebem os parâmetros como argumento**, nunca os leem por conta própria — o que preserva a pureza (`RNF-MAN-06`) e, de quebra, torna trivial testar a mesma regra sob dois conjuntos de parâmetros. Consequência direta: **uma revisão da DGPM vira `UPDATE` com nova vigência, não *deploy***. Este é o Princípio VII no seu enunciado mais literal.

---

## 11. Observabilidade e ambientes **[NOVA SEÇÃO — v2.1]**

> Esta seção não existia na v2.0, e não por esquecimento: no Google Apps Script, "ambiente" era o editor aberto no navegador e "log" era o `Logger`/`Stackdriver` do projeto. Não havia *preview*, não havia paridade entre ambientes, não havia como medir uma tela. A v2.1 tem três ambientes e um pipeline — isso precisa estar escrito, ou a promessa de "*preview* por branch" vira improviso.

**RNF-OBS-01. [NOVO — v2.1] — Três ambientes, com paridade de schema.**

| Ambiente | Aplicação | Banco | Uso |
|---|---|---|---|
| **Local** | `next dev` | Supabase local (`supabase start`), migrations aplicadas do zero + `seed.sql` | desenvolvimento e teste de migration |
| **Preview** | Vercel Preview, um por *branch* | projeto/branch de *preview* do Supabase, com dados sintéticos ou anonimizados | revisão de PR, teste e2e, exercício de reversão de migration e de restauração |
| **Produção** | Vercel Production, *branch* principal | projeto Supabase de produção | operação real |

**Nenhum ambiente diverge de outro em schema**: o schema de todos os três é o resultado de aplicar a mesma sequência de `supabase/migrations/*.sql` (`RNF-PLAT-06`). **Dado real de produção não é copiado para *preview*** sem anonimização — a base contém nome, posto e vínculo funcional de 177 militares.

**RNF-OBS-02. [NOVO — v2.1] — Logs.** O servidor produz **logs estruturados** com nível, mensagem, identificador de correlação da requisição, perfil do usuário e recurso acessado. **Não se registra dado pessoal além do necessário** para investigar o evento — nunca senha, nunca *token*, nunca `service_role`, e identificação de usuário por `auth.uid()`, não por nome. Erros de escrita negados pela RLS são logados com perfil, recurso e ação (`RNF-SEG-10`), porque uma negativa recorrente costuma ser defeito de matriz de permissões, não tentativa de burla.

**RNF-OBS-03. [NOVO — v2.1] — Monitoramento de erro.** Deve existir captura centralizada de exceções não tratadas de servidor e de cliente, com *source maps* publicados para que o *stack trace* seja legível, agrupamento por assinatura e alerta por taxa de erro acima do normal. **Ferramenta a confirmar com o Bernardo** (Sentry é a opção de referência; a alternativa é usar apenas o observatório nativo da Vercel, com menor granularidade). O usuário final continua vendo a mensagem tratada do `error.tsx` (`RNF-CONF-03`), nunca o erro cru.

**RNF-OBS-04. [NOVO — v2.1] — Métricas.** São acompanhadas continuamente: (a) **Web Vitals** das telas principais, para verificar o orçamento de `RNF-PERF-05`; (b) **consultas lentas** no PostgreSQL, via logs do Supabase e `pg_stat_statements`, que é a evidência exigida por `RNF-PERF-07` antes de criar qualquer índice; (c) **taxa de erro** por rota. Métrica sem dono nem limiar é ruído: cada uma das três tem limiar declarado e alguém responsável por olhar.

**RNF-OBS-05. [NOVO — v2.1] — Feature flags simples.** Funcionalidade em construção que já esteja publicada deve poder ser ligada e desligada **sem novo *deploy***, por meio de parâmetros booleanos em `config_parametros`, lidos no servidor e restritos ao Administrador por RLS. **Não se adota serviço externo de *feature flag***: o volume do sistema não justifica, e a tabela de parâmetros já é o lugar canônico desse tipo de configuração (`RNF-NORM-08`). Toda *flag* nasce com data prevista de remoção — *flag* permanente é dívida técnica disfarçada de configuração.

**RNF-OBS-06. [NOVO — v2.1] — Verificação de saúde e de versão.** Deve existir um ponto de verificação, acessível ao Administrador, que informe: versão do *build* publicado (SHA do commit), **última migration aplicada no banco**, conectividade com o Supabase e horário do servidor. É o que sustenta `RNF-CONF-04.1`: divergência entre código publicado e schema aplicado é a falha de implantação mais provável desta arquitetura, e ela deve ser detectável em segundos. **Confirmar com o Bernardo se essa verificação fica em rota de API dedicada ou em tela do painel administrativo.**

---

## Quadro-resumo de destino dos requisitos não-funcionais

| Requisito v2.0 | Destino na v2.1 | Onde se cumpre |
|---|---|---|
| `RNF-PLAT-01` | **REVOGADO** → `RNF-PLAT-01.1` | Next.js 15 / React 19 / Vercel |
| `RNF-PLAT-02` | **REVOGADO** → `RNF-PLAT-02.1` | Supabase PostgreSQL |
| `RNF-PLAT-03` | **REVOGADO** → `RNF-PLAT-03.1` | Tailwind v4 + shadcn/ui |
| `RNF-PLAT-04` | **REVOGADO** → `RNF-PLAT-04.1` | Deploy por Git na Vercel |
| `RNF-PERF-01` | PRESERVADO | princípio: base pequena, sem reengenharia |
| `RNF-PERF-02` | MIGRAÇÃO | `AbortController` + `error.tsx` |
| `RNF-PERF-03` | **REVOGADO** → `RNF-PERF-03.1` | limites de Supabase/Vercel |
| `RNF-PERF-04` | PRESERVADO | motor preditivo sob demanda |
| `RNF-USA-01..05` | PRESERVADOS | Tailwind, shadcn, `next-themes` |
| `RNF-SEG-01` | MIGRAÇÃO | e-mail/senha por convite |
| `RNF-SEG-02` | **ABSORVIDO** | RLS + `perfil_permissao` |
| `RNF-SEG-03` | MIGRAÇÃO | transação PostgreSQL |
| `RNF-SEG-04` | MIGRAÇÃO | Server Actions + RLS |
| `RNF-SEG-05` | PRESERVADO E REFORÇADO | teste negativo de RLS por perfil |
| `RNF-CONF-01` | PRESERVADO E REFORÇADO | `origem_migracao_v1` + `migracao_log` |
| `RNF-CONF-02` | MIGRAÇÃO | migration aditiva |
| `RNF-CONF-03` | PRESERVADO | `error.tsx` + domínio neutro (`RN-DEG-01`) |
| `RNF-CONF-04` | **REVOGADO** → `RNF-CONF-04.1` | *build*/deploy atômico |
| `RNF-CONF-05` | PRESERVADO E REFORÇADO | FK + `status` + *view* |
| `RNF-MAN-01` | PRESERVADO | estrutura do BRIEF §4 |
| `RNF-MAN-02` | **ABSORVIDO** | TypeScript + Zod + tipos gerados |
| `RNF-MAN-03` | PRESERVADO | `@theme` + `components/` |
| `RNF-MAN-04` | PRESERVADO E REFORÇADO | tabelas de calendário e parâmetros |
| `RNF-MAN-05` | PRESERVADO | *Conventional Commits*, PR pequeno |
| `RNF-AUD-01` | PRESERVADO E REFORÇADO | *trigger* `set_auditoria()` |
| `RNF-AUD-02` | **RESOLVIDO** | convenção universal de schema |
| `RNF-AUD-03` | PRESERVADO | teste nomeado por identificador |
| `RNF-COMP-01` | **PRESERVADO E REFORÇADO** | `/print/*` + e2e obrigatório |
| `RNF-COMP-02` | MIGRAÇÃO | matriz de navegadores atualizada |
| `RNF-BKP-01` | MIGRAÇÃO | PITR do Supabase |
| `RNF-BKP-02` | PRESERVADO | `pg_dump` pré-migration |
| `RNF-NORM-01..08` | **PRESERVADOS INTEGRALMENTE** | normativos, independentes de plataforma |
| `RNF-NORM-04` | **PERMANECE REJEITADO** | nenhuma implementação |

**Novos na v2.1:** `RNF-PLAT-05..08`, `RNF-PERF-05..07`, `RNF-USA-06..07`, `RNF-SEG-06..10`, `RNF-CONF-06..08`, `RNF-MAN-06`, `RNF-COMP-03`, `RNF-BKP-03..04`, `RNF-OBS-01..06`.

---

## Pontos que dependem de confirmação do responsável

| # | Ponto | Por que precisa de decisão |
|---|---|---|
| 1 | Plano do projeto Supabase e janela de retenção do PITR (`RNF-BKP-01`) | define se o PITR sozinho basta ou se o `pg_dump` agendado é a salvaguarda principal |
| 2 | Destino de armazenamento do `pg_dump` agendado e periodicidade do exercício de restauração (`RNF-BKP-03`) | envolve infraestrutura fora do Supabase |
| 3 | Ferramenta de monitoramento de erro (`RNF-OBS-03`) | Sentry implica conta e custo; o nativo da Vercel é mais pobre porém imediato |
| 4 | Forma da verificação de saúde (`RNF-OBS-06`) | rota de API dedicada ou tela do painel administrativo |
| 5 | Critério e data de encerramento do período de transição da planilha v2.0 (`RNF-BKP-04`) | decisão de operação, não técnica |
