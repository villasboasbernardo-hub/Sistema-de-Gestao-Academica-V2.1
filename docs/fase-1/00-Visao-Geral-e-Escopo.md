---
title: "CIAARA-11 v2.1 — Visão Geral e Escopo"
author: "Fase 1 do SDLC — Requisitos"
date: "25/08/2026"
version: "2.1"
---

# Visão Geral e Escopo — CIAARA-11 Versão 2.1

**Status:** Aberto (v2.1) — migração de plataforma · **Fase do SDLC:** 1 — Requisitos · **Precede:** Fase 2 (Arquitetura da v2.1)

## Nota de migração (v2.1)

Este documento é a reescrita do `00-Visao-Geral-e-Escopo.md` da v2.0 para a **v2.1 — migração de plataforma para Next.js + Supabase (PostgreSQL)**. Ele não descarta a v2.0: a v2.0 é um sistema **em produção, bem-sucedido**, e é justamente o trabalho dela que torna esta migração viável e barata. O que muda aqui é o **substrato técnico**; o domínio, o vocabulário institucional e as regras de negócio permanecem os mesmos.

Três convenções valem para toda a suíte da v2.1 e começam neste documento:

1. **Nada é apagado.** Um requisito que perdeu sentido é marcado **[REVOGADO — v2.1]**, com o motivo e o que ficou no lugar. O leitor precisa conseguir seguir a trilha da v2.0 até a v2.1 sem consultar outro arquivo.
2. **Toda mudança é marcada inline** com um destes rótulos: **[PRESERVADO]**, **[MIGRAÇÃO v2.1]**, **[REVOGADO — v2.1]**, **[ABSORVIDO PELA PLATAFORMA]**, **[NOVO — v2.1]**.
3. **Toda afirmação de escopo cita sua origem** (`RF-…`, `RN-…`, `RNF-…`, achado, decisão, épico ou spec), como na v2.0.

**A inversão que define esta versão:** na v2.0, os requisitos `RNF-PLAT-01..04` **proibiam** framework de frontend, banco externo, bundler e CI/CD — e o Princípio III da constitution transformava essa proibição em regra de governança. Na v2.1 esses quatro requisitos são **revogados e substituídos**, e o Princípio III é **reescrito, não deletado**. Isso é dito com todas as letras em cada documento onde a restrição aparecia.

---

## 0. Histórico de revisão

**v2.1 (25/08/2026). [MIGRAÇÃO v2.1]** **Decisão de migrar de plataforma**, tomada por **Bernardo Villas Bôas dos Santos, Primeiro-Tenente — arquiteto/desenvolvedor responsável e Encarregado da Divisão de Administração Acadêmica (CIAARA-11)**, em 25/08/2026. A v2.1 reimplanta o sistema da v2.0 sobre **Next.js 15+ (App Router, React 19, TypeScript `strict`) + Supabase (PostgreSQL, Auth, RLS)**, hospedado na **Vercel**, com repositório no **GitHub**. A decisão não decorre de falha da v2.0 — decorre do fato de que a v2.0 **esgotou o que a plataforma Apps Script/Sheets pode oferecer** e de que os próximos ganhos exigem garantias que só um banco relacional e um framework de componentes fornecem. As consequências desta decisão sobre este documento são: nova seção 3 (três estágios), nova seção 4 (estado da v2.0), seção 5 integralmente reescrita (motivadores reais da migração), seção 6 redefinida como **paridade funcional**, seção 7 com a **revogação explícita do não-objetivo "Migração de plataforma"**, seção 8 reconstruída para a suíte completa da v2.1 e seção 9 convertida em critérios de aceite da migração. As seções 1 e 2 permanecem **[PRESERVADO]**.

Junto com esta decisão, revoga-se também a **decisão D1 da v2.0** (autenticação pela conta Google via `Session.getActiveUser()`), substituída por **e-mail/senha criados por convite do Admin**, no Supabase Auth. Ver documento 01, seção 2.1.

**v1.3 (01/08/2026).** Execução aprovada das 14 propostas formais e das 7 recomendações de robustez do documento 09 (ver nota de execução naquele documento). Destaques: taxonomia de atividades letivas revisada para 5 categorias normativas (item 6.2, ponto 5); perfil "Coordenador de Curso" renomeado para "Encarregado de Curso" em toda a suíte (documento 01); e a **recomendação R-7** — a fronteira organizacional da seção 0 do documento 01 ("CIAARA-11 é o código da Divisão de Administração Acadêmica") — formalizada como **critério permanente de contenção de escopo**, a aplicar a toda nova solicitação da Fase 2 em diante (ver seção 7). **[PRESERVADO na v2.1]**

**v1.2 (31/07/2026).** Auditoria de arquitetura com assimilação do corpo normativo do Sistema de Ensino Naval (Glossário DEnsM, Matriz de Responsabilidades, Regras dos Processos Educacionais e Regimento Interno do CIAARA), incorporação de 14 novas observações e conferência contra a base de dados viva. Resultados registrados no documento **09 — Relatório de Auditoria da Fase 1**. Duas constatações desta revisão alteram a leitura do escopo e continuam valendo na v2.1: **(i) "CIAARA-11" é o código regimental da Divisão de Administração Acadêmica** — o sistema é o de uma divisão, não do Centro inteiro; e **(ii) a Fase 1 original não tratava conformidade normativa**, lacuna corrigida com a seção 10 do documento 03 e com a classificação de conformidade do documento 04. **[PRESERVADO na v2.1]**

**v1.1 (29/07/2026).** Revisão a partir dos comentários feitos por Bernardo Villas Bôas nos oito documentos da suíte, triados no documento **08 — Relatório de Triagem de Comentários** e resolvidos nas decisões D1–D7. A mudança mais relevante: o escopo da v2.0 deixou de ser puramente estrutural e passou a incluir um conjunto confirmado de correções e extensões funcionais.

**v1.0 (28/07/2026).** Versão original, construída a partir da análise integral da pasta de trabalho do projeto (SIS11).

---

## 1. Propósito deste documento

Este documento abre o conjunto de artefatos da **Fase 1 (Requisitos)** da Versão 2.1 do sistema de gestão acadêmica do CIAARA-11. Ele define por que a v2.1 existe, o que está e o que não está dentro do seu escopo, e como os demais documentos desta suíte se encaixam. Nenhuma decisão de arquitetura (Fase 2) ou linha de código de implementação deve ser tomada com base apenas neste conjunto — ele é o alicerce a partir do qual a Fase 2 será construída, seguindo o ciclo Requisitos → Arquitetura → Desenvolvimento → Testes → Manutenção.

**[MIGRAÇÃO v2.1]** A diferença de método em relação à v1.0 e à v2.0 é que **a v2.1 não levanta requisitos novos**. Os requisitos já foram levantados (v1.0), auditados contra a norma (v1.2), triados com o responsável (v1.1/v1.3) e **validados em produção** (v2.0, 39 specs Spec Kit executadas). O trabalho desta fase é, portanto, de **tradução e destino**: para cada `RF-`, `RN-` e `RNF-` da v2.0, dizer explicitamente qual é o seu destino na v2.1 — *preservado*, *preservado com nova implementação*, *substituído pela plataforma* ou *aposentado* — sempre nomeando qual. Essa tabela de destino é registrada **nos próprios documentos 02, 03 e 04**, como coluna *Destino na v2.1* de cada requisito e de cada regra, e é consolidada para execução no documento **10 — Plano de Execução Vibe Coding**.

As fontes desta fase são, além de toda a suíte da v2.0: o repositório da v2.0 (`CLAUDE.md`, `.specify/memory/constitution.md`, `docs/arquitetura/01-schema.md` a `04-appstate.md`, `specs/001-…` a `specs/039-…`, `migracao/*.py`, `tests/`), a planilha viva `Banco de dados CIAARA-11 v2.0` (23 abas) e o histórico de implantações (`implantacao/MANIFESTO.md` e `implantacao/historico/`).

---

## 2. Contexto institucional **[PRESERVADO — texto normativo, sem alteração]**

O CIAARA (Centro de Instrução e Adestramento Almirante Radler de Aquino) é uma organização de ensino da Marinha do Brasil com a missão de ministrar cursos, adestramentos e estágios de hidrografia, oceanografia, meteorologia, navegação e auxílios à navegação, capacitando pessoal nas áreas de competência da DHN (Diretoria de Hidrografia e Navegação).

Toda a atividade letiva do CIAARA é regida anualmente pelo **PROENS** (Programa de Ensino), um documento de planejamento elaborado conforme o Capítulo 4 da publicação **DGPM-101** (Normas para os Cursos e Estágios do Sistema de Ensino Naval). O PROENS-2026 — analisado como parte deste levantamento — define, para os 25 cursos e estágios do ano: o calendário escolar, o número de alunos, as datas de início/término de cada turma, a grade curricular semana a semana de cada curso (matérias, carga horária, unidades de ensino) e as reservas de Administração e Tempo Reserva por curso. O sistema CIAARA-11 existe para digitalizar, executar e acompanhar o cumprimento desse plano — ele não o substitui nem o cria; o PROENS é a fonte normativa e o sistema é a ferramenta operacional.

> **Nota de escopo da v2.1.** Nada nesta seção muda por causa da migração. O corpo normativo (DGPM-101/103, DEnsM-1002/1004/2001/2003, PCP-FCT-2, PROENS, Regimento Interno) é **invariável** e independe de plataforma. Uma migração de tecnologia que alterasse qualquer coisa desta seção estaria, por definição, errada.

---

## 3. Como o sistema chegou até aqui — três estágios **[MIGRAÇÃO v2.1]**

A história do CIAARA-11 tem três estágios, e é importante lê-los como **acumulação**, não como sequência de fracassos. Cada estágio resolveu o problema do estágio anterior e produziu o insumo do seguinte.

### 3.0 Antes da v1.0 — planilhas independentes por curso

O CIAARA operava historicamente por planilhas Excel/Sheets independentes por curso (preservadas em `Planilhas/`: `Matérias e Instrutores.xlsx`, `CAHO 2026.xlsx`, `C-ESPC-HN 2026.xlsx`), cada uma com abas manuais de Cronos previsto/cumprido, preenchimento semanal, impressão do Detalhe Semanal de Aula (DSA) e catálogo de disciplinas. Essas planilhas continuam sendo a referência histórica de regras de negócio (fórmulas de carga horária, formato de impressão do DSA, estrutura do Cronos) e foram a fonte consultada para especificar boa parte da v1.0.

### 3.1 v1.0 (2026) — o Apps Script monolítico

A v1.0 substituiu o processo manual por uma aplicação web única: **Google Apps Script (V8) no backend + HTML/JS/Bootstrap 5 no frontend, com Google Sheets como banco de dados**. Foi construída de forma incremental e documentada: uma especificação inicial em linguagem natural (`Spec rudimentar.txt`) refinada em três rodadas formais (`update-spec.md` = Spec V2, `update-spec-dsa-cronos.md` = Spec V3, `update-spec-dsa-cronos-instrutores.md` = Spec V4), cada uma implementada em commits individuais e rastreáveis ("Missão 1" a "Missão 16").

**O que a v1.0 entregou:** o ciclo completo de gestão acadêmica — painel de panorama, página por curso, lançamento e impressão do DSA, Avaliações, Eventos Extracurriculares, Relatório consolidado, Diagrama de Alocação, módulo Cronos, motor preditivo `gerarPlanejamento2027()` e os cadastros de Cursos, Matérias e Instrutores com RBAC de três perfis.

**O que a v1.0 deixou em aberto:** um `index.html` de mais de 3.100 linhas e um `Código.gs` de mais de 2.700 linhas; identidade visual fragmentada em classes ad hoc por módulo; débito de dados acumulado (duplicatas de matéria no C-Ap-FR contornadas em tempo de execução por `deduplicarCApFr_`, aba `Responsaveis_Curso` vazia, colunas ausentes na aba de eventos, calendário do PROENS como constante em código); e navegação por variáveis globais soltas (`CTX`, `turmaSel`, `DIAG`, `CRUD_UI`, `INICIO_STATE`) sem URL, sem histórico e sem ponto único de verdade.

Esses quatro pontos são exatamente os **quatro pilares estruturais da v2.0**, e o valor de engenharia da v1.0 — edição cirúrgica, aditiva, testada contra caso real antes de generalizar, sem quebra retroativa — é um padrão que sobrevive a todas as versões (`RNF-MAN-05`).

### 3.2 v2.0 (agosto/2026) — Apps Script modularizado, base saneada, em produção **— e um sucesso**

A v2.0 **cumpriu o que se propôs a fazer, e está em produção**. Não é um estágio a superar: é o estágio que **consolidou os requisitos, saneou a base e validou as regras** — os três insumos que a v2.1 vai colher.

| Frente da v2.0 | Resultado verificável |
|---|---|
| **Base nova e saneada** | Planilha `Banco de dados CIAARA-11 v2.0` publicada e viva (23 abas), com `_Migracao_Log` apenas-acrescenta. Migração e saneamento fechados no Épico C (`specs/001-migracao-saneamento-dados/`), com correções por script versionado em `migracao/*.py` — FK órfã de `Instrutor_Disciplina`, normalização de `Posto_Graduacao`, renumeração de IDs `AVL-M…`/`EVT-M…`, `Calendario_Reservas` populada a partir da constante `RESERVAS_PROENS` da v1.0. |
| **Modularização** | Épico B (`specs/005-…`): frontend e backend divididos por domínio via `HtmlService`/`include()`, o mecanismo que existia na v1.0 e nunca fora usado (`RNF-MAN-01`). |
| **Design System** | Épico A (`specs/007-…`) + refatoração UI/UX (`specs/009-…`): objeto global `UI`, tema claro/noturno, componentes unificados (`RF-DS`, `RNF-USA-05`). |
| **Estado de navegação** | Épico D (`specs/011-appstate-navegacao/`): `AppState` implantado como ponto único de verdade de contexto e navegação. |
| **Taxonomia normativa** | Épico E (`specs/002-…`): as 5 categorias — CHD (aula/avaliação/vista), AEC, TAD, TR e Estudo Individual à parte — com tetos calculados e sinalizados como aviso, nunca bloqueio. |
| **RBAC organizacional** | Épico F (`specs/004-rbac-ampliado-usuarios/`): os perfis do documento 01 substituem os três genéricos da v1.0. |
| **Cronograma + motor preditivo** | Épico G (`specs/006-…`): Diagrama de Alocação e Cronos fundidos, motor generalizado para qualquer ano. |
| **Sugestão do DSA** | Épico H (`specs/008-motor-sugestao-dsa/`), inspirado no comportamento do FET. |
| **Avaliações simplificadas** | Épico I (`specs/003-…`): agendamento puro, sem `Formula_MF`; a CHD só sobe quando a avaliação é efetivamente registrada no DSA. |
| **LIQ, OS de Instrutoria, Ficha de Docentes** | `specs/022-026`, `027-liq-automacao`, `028-os-instrutoria` — módulos que nem existiam na v1.0. |
| **Governança de engenharia** | Constitution com 9 princípios; **39 ciclos Spec Kit** completos (`specify → clarify → plan → tasks → analyze → implement`); suíte de invariantes estruturais crescendo de 58 para **466 testes, 0 regressão**; implantação padronizada via `clasp` com `BUILD_ID` e `MANIFESTO.md`. |

**Por que isso importa para a v2.1.** A v2.1 não recomeça de uma folha em branco nem "reinventa o domínio": ela reimplanta um domínio **já especificado, já auditado contra a norma, já implementado, já testado por invariantes e já validado por um usuário real** — que é o próprio mantenedor. As ~40 regras `RN-` do documento 04, as ~22 classificadas *Risco: Alto*, e a suíte de 466 invariantes são o contrato que a v2.1 herda pronto. **Esse é o ativo mais valioso do projeto, e ele foi produzido pela v2.0.**

### 3.3 v2.1 (a partir de 25/08/2026) — Next.js + Supabase

A v2.1 é **exclusivamente uma migração de plataforma**. O sistema muda de substrato:

| Camada | v2.0 (em produção) | v2.1 (alvo) |
|---|---|---|
| Backend | Google Apps Script (V8), Web App via `doGet()` | Next.js 15+ (App Router), Server Components e Server Actions |
| Banco | Google Sheets (23 abas) | Supabase PostgreSQL (schema relacional, FKs, transações) |
| Frontend | Vanilla JS ES6+ + Bootstrap 5 via CDN | React 19 + TypeScript `strict` + Tailwind CSS v4 + shadcn/ui |
| Autenticação | Conta Google (`Session.getActiveUser()`) | Supabase Auth — e-mail/senha, somente por convite do Admin |
| Autorização | Verificação em função `.gs` (`exigirFuncao`) | **RLS no banco** + matriz de permissões como dado |
| Estado de navegação | Objeto `AppState` em memória | **URL** (`searchParams`) via `nuqs` |
| Implantação | `clasp push`/`clasp deploy` manual, direto em produção | Vercel, com **preview por branch** e CI |
| Modularização | `HtmlService`/`include()` | Módulos ES + `lib/dominio/` puro, sem I/O |

O detalhamento de cada linha é da Fase 2 (documentos 20–25). O que este documento fixa é: **a mudança é de plataforma, não de domínio.**

---

## 4. O sistema hoje (v2.0 em produção) — resumo do estado atual

Em produção, a v2.0 cobre o ciclo completo de gestão acadêmica do CIAARA-11: painel de panorama geral por turma; página dedicada por curso; lançamento e grade impressa do **Detalhe Semanal de Aula (DSA)**, com motor de sugestão; agendamento e acompanhamento de **Avaliações** (execução, sem nota); registro de **atividades não letivas** nas cinco categorias normativas (AEC, TAD, TR, Estudo Individual, além da CHD); **Relatório** consolidado por turma/período; **Cronograma** unificado (previsto × executado) com motor preditivo multi-ano; **cadastros** de Cursos, Turmas, Disciplinas e Instrutores; **Ficha de Docentes** em PDF; **LIQ** (Lista de Instrutores Qualificados); **OS de Instrutoria**; e apoio leve à **Avaliação Externa/ROTA**. O detalhamento funcional está no documento **02 — Requisitos Funcionais**; as regras que sustentam esses módulos, no documento **04 — Regras de Negócio a Preservar**.

Em volume de dados, levantado da base viva:

| Entidade | Volume |
|---|---|
| Cursos/estágios | 24 |
| Turmas | 29 |
| Disciplinas | 175 |
| Instrutores | 177 |
| Vínculos instrutor↔disciplina | 798 |
| Registros de aula | ~1.753 |
| Atividades não letivas | 663 |
| Avaliações | 111 |
| Usuários simultâneos | dezenas, no máximo |

**É uma base pequena.** Esse fato é uma diretriz de projeto, não uma nota de rodapé: a v2.1 deve **priorizar clareza de schema e manutenibilidade sobre desempenho**. Desempenho não é um problema real deste sistema, e a v2.1 não deve fingir que é. Qualquer decisão de arquitetura justificada por "escala" nesta versão deve ser tratada com desconfiança.

**Pendências conhecidas da v2.0 que a v2.1 herda.** Boa parte das specs implantadas registra "teste de aceite contra a planilha ao vivo ainda pendente". Isso não é descuido: é consequência direta de a plataforma não ter ambiente de teste separado da produção (ver seção 5, motivador **(e)**). O plano de corte da v2.1 (documento 30) trata explicitamente dessa herança — nenhuma pendência de aceite da v2.0 é fechada "por migração".

---

## 5. Por que a v2.1 agora **[MIGRAÇÃO v2.1 — seção integralmente reescrita]**

### 5.1 Os quatro problemas estruturais da v2.0 estão resolvidos

A seção 5 da v2.0 listava quatro motivadores estruturais: **(a)** identidade visual fragmentada, **(b)** arquivo único monolítico, **(c)** débito de dados acumulado e **(d)** estado de navegação disperso. **Os quatro foram resolvidos** — respectivamente pelos Épicos A, B, C e D, todos implantados (ver seção 3.2). **[RESOLVIDO — v2.0]**

Portanto, **eles não são mais motivo para nada**, e repeti-los aqui seria desonesto. A v2.1 precisa de motivadores próprios, e eles são de outra natureza: não são defeitos do código, são **limites do substrato**. O código da v2.0 está tão bom quanto o Apps Script/Sheets permite; o que segue é a lista do que essa plataforma **não permite**, com evidência tirada do próprio histórico do projeto.

### 5.2 Os sete motivadores reais da migração

#### (a) Teto de execução e cotas do Apps Script

O Apps Script impõe um **tempo máximo de execução por invocação** (6 minutos por chamada de função de servidor) e **cotas diárias por conta** (tempo total de execução, execuções simultâneas, chamadas de serviços externos), publicadas pelo Google e sujeitas a revisão unilateral — o projeto não controla nenhuma delas. O próprio `RNF-PERF-03` da v2.0 já registrava essa dependência como restrição, e o `RNF-PERF-02` fixou um **tempo-limite de 30 segundos no cliente** para não travar a interface.

Na prática, esse teto **já molda o desenho do código**, não apenas o desempenho. Cada `getValues()` do `SpreadsheetApp` é uma chamada remota; o custo dominante não é processar, é **ir buscar**. Por isso o projeto tem uma regra explícita, nascida da spec 017 (*Hotfix Roteamento SPA, Fonte Rawline e Performance do DSA*) e reafirmada na spec 035 (SC-006): funções como `getDisciplinasAnoVigente(ano)` fazem **3 leituras de aba, nunca 1 por turma**. É uma boa regra — e é uma regra que só existe porque a plataforma cobra caro por leitura. O `RNF-PERF-04` (motor preditivo executado sob demanda, nunca a cada acesso) tem a mesma origem.

Em PostgreSQL, o motor preditivo de um ano inteiro é uma consulta com `JOIN` sobre alguns milhares de linhas — trabalho de milissegundos, dentro de uma transação, sem teto de 6 minutos e sem cota diária. **A restrição desaparece; o requisito `RNF-PERF-03` fica [ABSORVIDO PELA PLATAFORMA].**

#### (b) Ausência de integridade referencial e de transações no Google Sheets

Uma planilha não tem chave estrangeira, não tem `UNIQUE`, não tem `CHECK`, não tem tipo de coluna e não tem transação. Tudo isso, na v2.0, é **disciplina de código** — e a evidência de que disciplina de código não basta está registrada nas próprias specs:

- **FK órfã real.** `Instrutor_Disciplina!VIN-000419` apontava para um `ID_Grade` inexistente. Só foi descoberto pela auditoria do Épico C e corrigido por script (`migracao/corrigir_vinculo_orfao_instrutor_disciplina.py`), com o valor bruto preservado em `ID_Grade_Legado_v1`. Em PostgreSQL, essa linha **nunca teria sido gravada** — a FK a teria recusado.
- **Unicidade sem garantia.** A regra "`ID_Curso` + `Cod_Disciplina` é único" estava documentada desde a migração original e **nunca tinha implementação real** até a spec 036 escrever `existeCodDisciplinaNoCurso_`. Um `UNIQUE (curso_id, codigo)` a teria garantido desde o primeiro dia, para todo caminho de escrita — inclusive os scripts Python de migração, que não passam pelo código da aplicação.
- **Chave primária em branco por configuração errada.** A spec 036 encontrou `CRUD_CONFIG['Turma_Disciplina'].prefixo` vazio: as 210+ linhas reais tinham sido semeadas por script Python e nunca por `crudCriar`, então a primeira escrita real pela aplicação teria gravado `ID_Turma_Disciplina` em branco. `id uuid primary key default gen_random_uuid()` torna essa classe de defeito impossível.
- **Transação simulada à mão.** A spec 036 precisou implementar rollback manualmente: se a segunda gravação falha, a primeira é desfeita por exclusão lógica (`crudExcluir`). Funciona, é bem-feito, tem teste — e é trabalho que `BEGIN … COMMIT` faz sozinho.
- **Duas fontes de verdade divergindo.** A spec 029 encontrou **divergência real entre a cópia `.xlsx` local e a planilha ao vivo** (89 linhas semeadas / 121 em branco), resolvida por decisão do responsável elegendo a planilha viva como fonte de verdade. A spec 025 revelou o mesmo padrão: nenhuma migração desde 2026-08-14 havia de fato rodado contra o Sheets ao vivo, só contra a cópia local.
- **Fórmula quebrada em produção.** A coluna `Cad_Disciplinas.Instrutores_Selecionados` exibia `#ERROR!` na planilha viva até ser removida pela spec 033. Uma coluna derivada em PostgreSQL é `GENERATED ALWAYS AS … STORED` ou uma `VIEW` — ou está correta, ou a migração falha; não existe estado "erro visível permanente".
- **`_Meta_Colunas`.** A v2.0 precisou **criar uma aba** para dar ao Sheets um contrato de coluna que ele não tem nativamente. No PostgreSQL, o catálogo (`information_schema`) e os tipos TypeScript gerados pelo Supabase CLI cumprem esse papel **com garantia do motor**. É o exemplo canônico de requisito **[ABSORVIDO PELA PLATAFORMA]**: a tabela é aposentada porque o problema que ela resolvia deixa de existir.

Some-se a isso que a planilha é **editável à mão por qualquer pessoa com acesso ao arquivo**, contornando todas as validações da aplicação — o que nos leva ao motivador (d).

#### (c) Impossibilidade de deep-link e de histórico de navegação

Este é o motivador em que a plataforma não apenas dificulta: ela **proíbe**.

O Apps Script serve o Web App dentro de um **iframe isolado** sob `script.google.com`. Durante a implantação do Épico E, dois achados só visíveis em produção foram registrados; o segundo é decisivo: **mutar `window.location.hash` — ou usar navegação padrão de âncora — dentro desse iframe quebra a sincronização `postMessage` com o wrapper externo e apaga a página cerca de 1 segundo após o carregamento.** A correção foi remover toda mutação de hash e trocar os links por `href="#" onclick="irPara(...); return false;"`.

Ou seja: a v2.0 **não pode** usar a URL como estado, por decisão da plataforma, não por escolha de arquitetura. O `AppState` (Épico D, `specs/011-appstate-navegacao/`) é a melhor resposta possível dentro dessa restrição — e continua não entregando o que `RF-NAV` queria:

| O que se queria | v2.0 | v2.1 |
|---|---|---|
| Voltar/avançar do navegador | ✗ impossível no iframe | ✓ nativo do App Router |
| Recarregar sem perder contexto | ✗ | ✓ `searchParams` |
| Compartilhar link de uma tela específica ("veja o DSA da CAHO 2026, semana 12") | ✗ | ✓ `/turmas/caho-2026/dsa?semana=12` |
| Abrir duas telas em abas diferentes | ✗ | ✓ |
| Favoritar uma visão filtrada | ✗ | ✓ |

Na v2.1 isso vem **de graça**: `AppState` deixa de ser um objeto e vira a **URL como fonte de verdade** (`?turma=…&curso=…&semana=…`), gerida por `nuqs`. O requisito `RF-NAV` é **[PRESERVADO com nova implementação]**; o objeto `AppState` é **[ABSORVIDO PELA PLATAFORMA]**.

#### (d) Segurança que depende de disciplina de código, não de garantia do motor

O `RNF-SEG-02` da v2.0 diz: *"Toda operação de escrita deve continuar sendo verificada no servidor contra o perfil do usuário autenticado, independentemente do que a interface exibe ou oculta"*. É o requisito certo. O problema é **como ele é cumprido**: por uma chamada a `exigirFuncao(...)` no topo de cada função `.gs` de escrita. Se alguém esquecer a chamada, ou passar a lista errada de perfis, **não existe nada que perceba**.

E isso aconteceu, de forma verificável:

- A spec 038 encontrou `definirPrioridadeDisciplina` (`MotorPreditivo.gs`) chamando `exigirFuncao(PERFIS_DIVISAO_ADMIN_ACADEMICA)` **sem `'Admin'`** — a única função de escrita do arquivo fora do padrão `['Admin'].concat(...)` usado pelas três funções irmãs. Um usuário Admin era barrado de uma operação que lhe cabia, e ninguém percebeu por várias specs.
- Antes do Épico F, **7 dos 9 perfis do documento 01 sequer carregavam o sistema**, bloqueados em `getContextoInicial` — o código só reconhecia `Admin` e `Operador`.
- O `RNF-SEG-04` existe justamente porque a modularização podia expor funções de escrita fora da verificação de perfil. É um requisito que só faz sentido numa plataforma onde a verificação é convenção.
- E, acima de tudo: **a planilha é acessível fora da aplicação**. Quem tem acesso ao arquivo no Drive edita a linha diretamente, e nenhuma verificação de perfil roda. O `RNF-SEG-03` (lock contra condição de corrida) é outro sintoma da mesma coisa — proteção implementada por acordo entre chamadores, não pelo armazenamento.

Na v2.1, `RNF-SEG-02` **deixa de ser disciplina de código e passa a ser garantia do motor: é RLS**. Toda tabela tem `ENABLE ROW LEVEL SECURITY`; **uma tabela sem policy é inacessível por padrão** — e isso é intencional, é o comportamento seguro. A matriz de permissões vira **dado** (`perfil_permissao (perfil, recurso, acao, permitido)`), consultada pelas policies através de funções `SECURITY DEFINER STABLE` no schema `app`. Consequências diretas: trocar uma permissão vira `UPDATE`, não migration; esquecer a verificação numa rota nova **não abre buraco**, porque a fronteira não está na rota, está no banco; e `RNF-SEG-03` fica **[ABSORVIDO PELA PLATAFORMA]** — controle de concorrência é transação, não `LockService`.

#### (e) Ausência de ambiente de teste/preview e de integração contínua

O `RNF-PLAT-04` da v2.0 dizia, textualmente, que a implantação continua manual e que *"a v2.0 não pressupõe adoção de `clasp` ou pipeline de CI/CD"*. O Princípio III da constitution ia além: `clasp` é rodado **manualmente por sessão — nunca pipeline automatizado, gatilho de commit, ou serviço de CI/CD**.

O resultado operacional é objetivo: **existe uma URL só, e ela é a produção.** Isso produziu, no histórico do projeto:

- 17 implantações órfãs e um erro de digitação despercebido na primeira implantação manual (o que motivou a adoção do `clasp` em 2026-08-14);
- os dois achados do Épico E, invisíveis em qualquer teste local porque dependiam do **sandbox de iframe que só existe em produção**;
- implantações corrigidas e refeitas logo após o deploy (`@31` após achado em `@30`; `@34` corrigido em `@35`);
- e a marca registrada da fase: quase toda linha do quadro de estado da v2.0 termina em **"teste de aceite contra a planilha ao vivo ainda pendente"** — porque testar de verdade significa mexer na base de produção, no meio do ano letivo.

Na v2.1, **cada branch ganha um preview deploy na Vercel** com seu próprio ambiente Supabase de teste, e o portão de qualidade roda em CI antes do merge: `tsc --noEmit`, `eslint`, Vitest (unidade e RLS), pgTAP (invariantes SQL) e Playwright (e2e, incluindo as rotas de impressão). `RNF-PLAT-04` é **[REVOGADO — v2.1]** e substituído por CI/CD com preview por branch. Isso não é conforto de desenvolvedor: é **a única forma de fechar as pendências de aceite herdadas da v2.0 sem arriscar a produção**.

#### (f) Dificuldade de evoluir a interface sem framework de componentes

A v2.0 tem Design System (`RF-DS`) e ele funciona. O que ela não tem é **um mecanismo de reuso que o motor garanta** — porque `RNF-PLAT-03` proibia framework de componentes e bundler, e porque o Apps Script tem uma limitação estrutural: **arquivos `.gs` não são visíveis dentro de arquivos `.html`**. A consequência é duplicação obrigatória, registrada nas specs:

- `ORDEM_ANTIGUIDADE_POSTO` e a função de ordenação por antiguidade existem em `Instrutores.gs`/`ViewInstrutores.html` **e precisaram ser duplicadas** em `ViewDisciplinas.html` (spec 036), com o comentário explícito: *"Apps Script não compartilha `.gs` entre `.html`"*.
- As máscaras de campo (`mascaraCpf_`, `mascaraDataBr_`, `dataBrParaIso_`, `isoParaDataBr_`) seguem o mesmo padrão de repetição por view (specs 025, 035).
- O componente `.modal` do Bootstrap foi **evitado por várias specs** por causa de um bug de impressão da Ficha do Instrutor, e só foi adotado na spec 035, com a justificativa de que "este painel nunca é impresso". Um componente cuja adoção depende de arqueologia de bug não é um sistema de componentes.
- O `RNF-MAN-02` já pedia "uma única fonte" para configurações duplicadas manualmente entre frontend e backend — pedido que a plataforma não deixa atender.
- E a lacuna de teste: a spec 030 fechou com **"nenhum caso novo — mudança de DOM/UI puro, sem harness de mock disponível"**. Mudança de interface, na v2.0, é a única categoria de mudança sem rede de proteção.

Na v2.1, um componente é **um módulo importado**, tipado, usado em qualquer tela, e testável com Playwright e testes de componente. `components/ciaara/` (`CardKpi`, `BadgeStatus`, `GradeAlocacao`, `FiltroAvancado`, `AlertaConformidade`, `TabelaDensa`, `SeletorTurma`) substitui a duplicação por importação. O objeto global `UI` **deixa de existir como objeto** e vira **tokens de design + biblioteca de componentes tipada**: `RF-DS` é **[PRESERVADO]**, o mecanismo muda.

#### (g) Custo crescente de manter regras de negócio em JavaScript não tipado

Este é o motivador que menos aparece e mais cobra. As ~40 regras `RN-` são o coração do sistema, e hoje vivem em JavaScript sem tipos, sem compilador e sem contrato verificável entre quem escreve e quem lê um objeto. Erros de contrato **só aparecem em produção, quando aparecem**:

- **Spec 034 — o caso mais caro.** `validarLiq_`/`montarDadosSecao2Liq_` liam a tabela errada: `Instrutor_Disciplina` (habilitação) em vez de `Turma_Disciplina.ID_Instrutor` (seleção real por turma, fonte de verdade desde a spec 029). O gap ficou aberto desde a spec 027 e produziu, com dado ao vivo, **27 falsos positivos em 54 casos**, bloqueando a geração da LIQ nos quatro trimestres de 2026. Duas tabelas com papéis diferentes, colunas parecidas e nenhum tipo separando uma da outra.
- **Spec 035.** Um parser de data timezone-safe (`isoParaDate_`) existia e era correto — mas **nunca era acionado** para `Previsao_Inicio`/`Previsao_Termino`, porque `ehColunaData_` reconhece coluna de data **pelo nome** (`Data*`/`*_Data*`) e esses dois campos não seguem a convenção. Uma regra de tipo escrita em convenção de nome de string é exatamente o que um tipo de verdade elimina.
- **Spec 038.** Datas do painel "Editar" revertiam no F5 sem nenhum erro na tela — falha silenciosa, corrigida transformando-a em falha visível (releitura de verificação pós-gravação).
- **Spec 036.** O pedido original citava uma escala de precedência militar (`Almirante, CMG, …, CB, MN`) que **não bate com o dado real** — `Posto_Graduacao` nunca grava "Almirante" e os 11 códigos reais não incluem `CB`/`MN`. Um `ENUM` no banco teria tornado essa divergência impossível de nascer.
- E a armadilha estrutural, registrada como regra permanente na constitution: **todos os arquivos `.gs` compartilham um único escopo global**, e a ordem de execução de código de nível superior depende da ordem dos arquivos no projeto Apps Script — que não é a ordem do repositório. Toda inicialização precisa ser preguiçosa, por regra. Um sistema de módulos ES elimina a classe inteira.

Na v2.1, as regras `RN-` viram **funções TypeScript puras em `lib/dominio/`, sem acesso a banco**, com Zod validando as fronteiras e `tsc --noEmit` como portão de CI. Puras ⇒ testáveis sem banco ⇒ a suíte de invariantes da v2.0 **porta quase 1:1**. Regra permanente: **nada em `lib/dominio/` importa `supabase`.** `lib/dominio/` é o item mais importante desta migração.

### 5.3 O que se perde — e como isso é mitigado

Uma migração honesta declara o que custa. São três perdas reais, e nenhuma delas é retórica.

#### Perda 1 — dependência de conta paga e de limites de terceiros (Supabase e Vercel)

Hoje o sistema roda sobre a conta Google institucional que o CIAARA já tem, **sem custo marginal e sem contrato novo**. A v2.1 introduz **dois fornecedores** com planos, cotas e políticas próprias:

| Fornecedor | O que limita | Consequência prática |
|---|---|---|
| **Supabase** | Tamanho do banco, uso de banda, número de projetos, retenção de backup. O plano gratuito **pausa projetos ociosos** e **não inclui Point-in-Time Recovery (PITR)**. | Um sistema institucional não pode ser pausado nem depender só de backup diário. O plano pago passa a ser requisito operacional, não conveniência. |
| **Vercel** | Cotas de build, execução e banda; o plano gratuito é de uso **não comercial**. | Uso institucional pede plano pago. |

**Mitigação, em três camadas.** **(i) Dimensionamento:** a base é pequena (seção 4) — o menor plano pago de cada fornecedor sobra com folga, e o custo é previsível e discutível como despesa de manutenção de sistema, não como surpresa. **(ii) Portabilidade real:** o banco é **PostgreSQL padrão**, não um formato proprietário; um `pg_dump` diário versionado, mais as migrations em `supabase/migrations/*.sql`, reconstroem o sistema inteiro em qualquer PostgreSQL — inclusive num Supabase auto-hospedado, já que o Supabase é software aberto. É por isso que a v2.1 **proíbe permanentemente ORM que esconda o SQL** (Prisma, Drizzle) e banco fora do Supabase: manter o SQL explícito é o que mantém a saída aberta. **(iii) Backup independente:** exportação periódica para a conta Google institucional (Drive), que continua existindo, garante que a saída não depende da boa vontade de nenhum fornecedor.

**O que não se pode prometer:** que o custo será zero, e que os limites de terceiros nunca mudarão. Não serão, e podem mudar. A troca honesta é *custo previsível em dinheiro* por *garantias que a plataforma anterior não dá em nenhum preço*.

#### Perda 2 — curva de aprendizado

A v2.0 usa JavaScript e uma planilha. A v2.1 exige **TypeScript, React Server Components, SQL, RLS, migrations, Zod, Tailwind e Playwright**. A equipe é, na prática, **uma pessoa** — que acumula mantenedor técnico e usuário operacional real. É uma curva concreta, e ela cobra no início.

**Mitigação.** **(i)** O método já está dominado: 39 ciclos Spec Kit completos, constitution, `CLAUDE.md`, rastreabilidade por identificador, testes por invariante. **O que muda é a stack, não a disciplina** — e a disciplina é a parte difícil. **(ii)** A documentação de vibe coding da v2.1 (documentos 40–42) existe exatamente para isso: constitution reescrita, épicos fatiados e `CLAUDE.md` do repositório carregando as convenções, para que o assistente trabalhe dentro delas em vez de improvisar. **(iii)** O sequenciamento protege a curva: Épico 0 (fundação) → 1 (schema/RLS) → 2 (ETL) → 3 (auth) → 4 (Design System) antes de qualquer tela de negócio; **e o Épico 2 vem antes do 3, porque sem dado migrado não há o que proteger**. **(iv)** `lib/dominio/` é TypeScript puro sem I/O — é a parte do sistema mais parecida com o que já se sabe fazer, e é a parte que mais importa.

#### Perda 3 — o fim da facilidade de "abrir a planilha e olhar o dado"

Esta é a perda que mais dói no dia a dia, e a mais fácil de subestimar. Hoje, diante de qualquer dúvida, abre-se a planilha e **olha-se o dado** — filtrar, ordenar, conferir uma linha, corrigir uma célula, exportar para mandar por e-mail. Foi assim que se descobriu a divergência da spec 029 e se conferiu o `_Migracao_Log` linha a linha. É uma capacidade real, e ela **não sobrevive intacta** à migração: um banco não se abre com dois cliques, e — deliberadamente — **não se corrige mais uma linha na mão sem passar por regra alguma**.

**Mitigação, e o que efetivamente se recupera:**

| O que se fazia na planilha | Como se faz na v2.1 |
|---|---|
| Abrir e olhar uma tabela | **Supabase Studio** — editor de tabelas com filtro e ordenação, mais um editor SQL para qualquer pergunta que a tela não responda |
| "Ver a aba `X` como ela era" | **`VIEW`s de leitura** espelhando as 23 abas da v2.0 com os nomes antigos (`vw_cad_disciplinas`, `vw_registro_aulas_e_atividades`…), para quem vem do sistema anterior |
| Exportar para mandar/analisar | **Exportação CSV/XLSX** a partir do Studio, de uma `VIEW` ou de um botão nas telas de listagem — requisito de paridade, não extra |
| Conferir o log de migração | `migracao_log` como tabela consultável, com a mesma regra de sempre: **apenas-acrescenta, jamais reescrever linha já gravada** |
| Corrigir uma célula na mão | **Deixa de existir como caminho normal** — e essa é a metade boa da perda. Correção passa a ser operação registrada, com autor (`editado_por`), data (`editado_em`) e regra aplicada. Correção excepcional é SQL no Studio, deliberada e auditável. |

Duas ressalvas honestas: **o Studio não é o Sheets** — não há fórmula ad hoc na célula nem colaboração simultânea sobre a mesma grade; e **é preciso saber um pouco de SQL** para as perguntas fora do trilho. Em troca, o dado passa a ter **tipo, restrição, autor e histórico** — coisas que a planilha nunca teve, e cuja falta produziu, comprovadamente, uma FK órfã, uma unicidade nunca aplicada, uma PK em branco à espera e duas cópias da base divergindo.

### 5.4 O que **não** é motivo para a v2.1

Registrado explicitamente, para que nenhuma decisão de Fase 2 se apoie em premissa falsa:

- **Não é desempenho.** A base é pequena (seção 4). Ganho de velocidade é efeito colateral, não objetivo. Nenhuma decisão de arquitetura da v2.1 deve ser justificada por escala.
- **Não é funcionalidade nova.** A v2.1 não traz nenhuma funcionalidade de negócio além da paridade (seção 6).
- **Não é insatisfação com a v2.0.** A v2.0 está em produção, cumpriu suas dez frentes e é o insumo desta versão (seção 3.2).
- **Não é modernização por modernização.** Cada item de 5.2 aponta um limite concreto, com evidência tirada do histórico do próprio sistema. Um motivador que não conseguir apontar evidência assim **não entra nesta lista**.

---

## 6. Escopo confirmado da v2.1 **[MIGRAÇÃO v2.1]**

### 6.1 A regra de ouro desta versão

> **A v2.1 não reinventa o domínio. Ela reimplanta o mesmo domínio noutra plataforma.**

O critério de sucesso é **paridade funcional integral com a v2.0**: todo `RF-` implantado na v2.0 tem correspondente funcionando na v2.1, e toda `RN-` preservada continua produzindo o mesmo resultado, verificado por invariante — nunca por diff com a saída histórica de um curso específico.

### 6.2 Paridade funcional integral (o escopo)

Todos os módulos abaixo são reimplantados com comportamento equivalente. A coluna "Origem" cita o épico/spec da v2.0 que é o contrato a honrar.

| # | Módulo / capacidade | Origem v2.0 |
|---|---|---|
| 1 | Cadastros: Cursos, Turmas, Disciplinas, Instrutores, habilitação instrutor↔disciplina | `RF-CURSOS`, `RF-MATERIAS`, `RF-INSTR`, `RF-CRUD`, specs 019/029/031/036 |
| 2 | Regime de horário por curso, com vigência temporal e mudança no meio do curso | `RF-HOR`, Épico G |
| 3 | Detalhe Semanal de Aula — lançamento, saldo de CH e **impressão** | `RF-DSA`, Épico E |
| 4 | Motor de sugestão do DSA (comportamento inspirado no FET) | `RF-DSA-08`, Épico H, spec 008 |
| 5 | Avaliações — agendamento e acompanhamento de execução, **sem nota e sem média** | Épico I, spec 003, `RN-AVAL-02` |
| 6 | Atividades não letivas: AEC, TAD, TR e Estudo Individual, com tetos normativos sinalizados | Épico E, spec 002, `RNF-NORM-02` |
| 7 | Cronograma unificado (previsto × executado) e motor preditivo multi-ano | Épico G, spec 006 |
| 8 | Planejamento anual: prévia, edição manual e gravação como plano oficial | `RF-PLAN`, Épico G |
| 9 | Relatório consolidado por turma/período, com **impressão** | `RF-REL` |
| 10 | LIQ — Lista de Instrutores Qualificados | spec 027, `RN-LIQ-01..04` |
| 11 | OS de Instrutoria | spec 028 |
| 12 | Ficha de Docentes em PDF | specs 022–026 |
| 13 | Apoio leve à Avaliação Externa / ROTA | `RF-ROTA`, decisão D7 |
| 14 | RBAC com os perfis organizacionais e escopo de curso | Épico F, spec 004, documento 01 |
| 15 | Design System e tema claro/noturno persistido | `RF-DS`, `RNF-USA-05`, Épico A |
| 16 | Calendário administrável: feriados, janelas de curso, reservas do PROENS | `RF-DADOS-04`, `RNF-MAN-04` |
| 17 | Parâmetros normativos administráveis (tetos AEC/TAD/TR, faixas de CH docente, limite de TA/dia) | `RNF-NORM-08`, Princípio VII |

**Impressão é requisito, não detalhe (`RNF-COMP-01`).** DSA, Relatório do Curso, Cronograma, Ficha do Instrutor, LIQ e OS de Instrutoria mantêm paridade com a v2.0, em rotas dedicadas `/print/*` que renderizam sem o shell da aplicação, com `@media print` e quebra de página controlada. Todo teste e2e de impressão compara contra o layout aprovado da v2.0.

### 6.3 O que a plataforma destrava (ganhos, não funcionalidades novas)

Estes itens **não são requisitos funcionais novos**: são consequências diretas da troca de substrato, que aparecem sem trabalho de domínio adicional.

| Ganho | O que era na v2.0 | Requisito de origem |
|---|---|---|
| **Deep-link e histórico de navegação** | Impossível dentro do iframe do Apps Script | `RF-NAV` — [PRESERVADO com nova implementação] |
| **Integridade referencial declarativa** | Disciplina de código e script de auditoria | `RNF-CONF-01/05` — [ABSORVIDO PELA PLATAFORMA] |
| **Transações ACID** | Rollback manual por exclusão lógica | `RNF-SEG-03` — [ABSORVIDO PELA PLATAFORMA] |
| **Segurança no dado (RLS), não só na função** | `exigirFuncao(...)` no topo de cada escrita | `RNF-SEG-02/04` — [PRESERVADO com nova implementação] |
| **Ambiente de pré-visualização por branch e CI** | Uma URL só, que é a produção | `RNF-PLAT-04` — [REVOGADO — v2.1] |
| **Contrato de dados garantido pelo motor** | Aba `_Meta_Colunas` mantida à mão | — tabela **aposentada**; `information_schema` + tipos gerados |
| **Tipos verificados em tempo de compilação** | JavaScript sem tipos | `RNF-MAN-02` — atendido por `tsc --noEmit` no CI |

### 6.4 Não há funcionalidade nova de negócio nesta versão

**Declaração explícita, e é um limite duro:** além da paridade descrita em 6.2, **a v2.1 não entrega nenhuma funcionalidade de negócio nova**. O valor desta versão é **a plataforma** — a garantia, a testabilidade, a segurança no dado e a capacidade de evoluir. Qualquer pedido de funcionalidade nova durante a v2.1 é tratado como **v2.2 ou v3.0**, registrado no backlog e **não implementado no meio da migração**, ainda que pareça simples.

O motivo é de risco, não de burocracia: uma migração cuja meta se move não tem como provar que chegou. Se a paridade for negociável, **não existe critério de aceite** (seção 9).

---

## 7. Fora de escopo (não-objetivos da v2.1) **[Revisado — v2.1]**

**Critério permanente de contenção de escopo [PRESERVADO — v1.3, recomendação R-7; Princípio IX].** Toda nova solicitação de funcionalidade — nesta fase ou em qualquer fase seguinte — é confrontada com um teste objetivo único: ***este processo é atribuído à CIAARA-11 (Divisão de Administração Acadêmica) na Matriz de Responsabilidades?*** Se não for, o pedido é, por definição, fora de escopo deste sistema, ainda que adjacente ou tecnicamente simples de implementar — cabe a outra divisão (CIAARA-12, -13, -14, -31 ou -32, conforme o processo) ou a outro sistema. Este critério substitui julgamento subjetivo por um teste verificável contra documento normativo, e é a defesa formal contra expansão indevida de escopo. **A migração de plataforma não o afeta em nada: ele é organizacional, não técnico.**

### 7.1 Item revogado nesta versão

**"Migração de plataforma" — [REVOGADO — v2.1, em 25/08/2026].** A v2.0 listava, nesta seção, o seguinte não-objetivo:

> *"**Migração de plataforma.** A v2.0 permanece sobre Google Apps Script no backend e Vanilla JS/Bootstrap 5 no frontend, dividida via `include()`; o banco de dados continua sendo Google Sheets. O que muda (documento 08, decisão D3) é a estrutura/schema dentro dessa mesma plataforma — uma reestruturação de dados, não uma troca de tecnologia."*

Esse não-objetivo **era correto para a v2.0 e está revogado para a v2.1**, por decisão de Bernardo Villas Bôas dos Santos em **25/08/2026**. Ele não é apagado: fica registrado aqui, com a data e o motivo, porque a suíte da v2.1 precisa deixar o leitor seguir a trilha da v2.0 até aqui. Os motivos estão na seção 5.2; as consequências normativas são a revogação de `RNF-PLAT-01`, `RNF-PLAT-02`, `RNF-PLAT-03` e `RNF-PLAT-04` (documento 03 da v2.1) e a reescrita do **Princípio III** da constitution (documento 40).

**Também revogado no mesmo ato: "Login com usuário e senha próprios".** A v2.0 registrava como não-objetivo a autenticação própria, mantendo a conta Google (`RNF-SEG-01`, decisão D1). **[REVOGADO — v2.1, 25/08/2026]:** a v2.1 adota **e-mail/senha por convite do Admin**, no Supabase Auth, com signup público desabilitado. O motivo é de dependência de plataforma, não de preferência: `Session.getActiveUser()` é um serviço do runtime Apps Script e não existe fora dele. Detalhamento no documento 01, seção 2.1.

### 7.2 Não-objetivos que continuam valendo integralmente

**Reescrita arbitrária de regras de negócio. [PRESERVADO]** As regras do documento 04 continuam exatamente como especificado — **reimplementadas, não reinterpretadas**. Uma regra só muda onde houver decisão explícita e registrada do responsável. A migração **não é licença para "melhorar" regra de negócio de passagem**, e uma diferença de comportamento descoberta durante a migração é tratada como defeito da migração até prova em contrário.

**Portal de autoatendimento do instrutor → v3.0. [PRESERVADO]** A ideia de o próprio instrutor acessar o sistema (consultar sua grade, confirmar preferências, ver sua carga horária) foi explicitamente adiada por Bernardo para uma v3.0 futura (documento 08, Tema S). A v2.1 mantém os perfis organizacionais de RBAC, mas **não constrói nenhuma tela de autoatendimento para instrutores**. O instrutor continua sendo objeto de dados do sistema, não usuário dele. *Observação honesta: a v2.1 torna esse portal tecnicamente muito mais fácil — Supabase Auth por convite e RLS por escopo já resolvem o difícil. Isso **não antecipa o escopo**; apenas registra que o custo da v3.0 cai.*

**Controle operacional completo de EAD/Semipresencial. [PRESERVADO]** O sistema continua registrando e acompanhando apenas a dimensão de calendário e carga horária de cursos híbridos; a operação do AVA (credenciamento, fóruns, tarefas, frequência virtual) é da **CIAARA-13** e permanece fora do sistema.

**Integração ou geração automática da Avaliação Externa/ROTA. [PRESERVADO]** O apoio confirmado (item 6.2, linha 13) é limitado à organização dos dados que o sistema já possui, para preenchimento manual. **Não há integração de sistemas nem geração automática da planilha ROTA** (documento 08, decisão D7).

**O sistema não calcula nota, média final, aprovação ou documento escolar. [PRESERVADO — `RNF-NORM-06`]** É competência das divisões **CIAARA-32** (Registro Escolar) e **CIAARA-12.3** (Avaliação do Ensino), não da CIAARA-11. Este é o fundamento normativo da decisão D5 e o principal critério objetivo de contenção de escopo. **A migração não abre exceção**: um banco relacional torna trivial calcular médias — e isso continua sendo fora de escopo, por fronteira organizacional, não por dificuldade técnica. *Este é o teste mais claro de que a v2.1 entendeu o Princípio IX.*

**Sequenciamento pedagógico dos tempos de aula. [PRESERVADO — `RNF-NORM-04` permanece REJEITADO]** Rejeitado explicitamente pelo responsável em 01/08/2026 ("é uma regra muito exigente e será desconsiderada"). Mantido apenas como registro histórico; **não gera requisito** em nenhum documento da v2.1.

**Novas funcionalidades de negócio. [PRESERVADO, e reforçado]** Ver seção 6.4. Pedidos desse tipo viram v2.2 ou v3.0.

### 7.3 Não-objetivos técnicos novos desta versão **[NOVO — v2.1]**

Proibições permanentes da v2.1, registradas aqui para que a Fase 2 não precise redecidi-las:

| Proibição | Motivo |
|---|---|
| **ORM que esconda o SQL** (Prisma, Drizzle ou similar) | O SQL explícito é o que mantém a portabilidade real do banco (seção 5.3, Perda 1) e o que permite auditar uma policy RLS lendo-a. |
| **Banco fora do Supabase** | Um só banco, um só lugar de verdade. Nenhuma base auxiliar, nenhum cache persistente paralelo. |
| **Biblioteca de componentes além de shadcn/Radix** | shadcn/ui é copiado para o repositório e versionado; adicionar uma segunda biblioteca recria a fragmentação visual que o Épico A resolveu. |
| **Regra de negócio implementada apenas na UI** | Toda `RN-` vive em `lib/dominio/` (função pura) e/ou no banco (constraint, trigger, policy). A tela nunca é a única guardiã de uma regra. |
| **Reescrever regra de negócio "de passagem"** | Ver 7.2, primeiro item. |
| **Otimização de desempenho não solicitada** | A base é pequena (seção 4). Complexidade em nome de escala inexistente é dívida, não ganho. |

---

## 8. Estrutura deste conjunto de documentos **[MIGRAÇÃO v2.1]**

A suíte da v2.1 é maior que a da v2.0 porque a migração exige documentar três coisas que a v2.0 não precisava: o **destino** de cada requisito, o **plano de dados** e o **corte**. A numeração é por faixa, para que a ordem do arquivo seja a ordem de leitura.

### Fase 1 — Requisitos (00–10)

| # | Documento | Conteúdo |
|---|---|---|
| 00 | **Visão Geral e Escopo** | Este documento — motivação, escopo, não-escopo e critérios de aceite da migração |
| 01 | **Stakeholders e Perfis de Usuário** | Fronteira organizacional, stakeholders regimentais, perfis de RBAC, matriz perfil × recurso × ação, ciclo de vida da conta, cenários típicos |
| 02 | **Requisitos Funcionais** | O que o sistema deve fazer, módulo a módulo, com a coluna *Destino na v2.1* para cada `RF-` |
| 03 | **Requisitos Não-Funcionais** | Desempenho, usabilidade, segurança, manutenibilidade, conformidade — com `RNF-PLAT-01..04` e `RNF-SEG-01` marcados **[REVOGADO — v2.1]** e seus substitutos nomeados |
| 04 | **Regras de Negócio a Preservar** | As ~40 regras `RN-`, com destino, risco e o mapeamento para `lib/dominio/`, constraint, trigger ou policy |
| 05 | **Modelo de Dados Conceitual** | As entidades e seus relacionamentos, e as convenções da v2.1 (`codigo`, `origem_migracao_v1`, exclusão lógica, auditoria, vigência temporal) |
| 06 | **Backlog de Épicos V2.1** | Os 14 épicos (0–13), sequenciamento e critérios de aceite de alto nível |
| 07 | **Glossário** | Termos institucionais e siglas de curso (invariáveis) + termos técnicos da nova stack com equivalente na v2.0 + termos de migração |
| 08 | **Relatório de Triagem de Comentários** *(histórico)* | Registro do processo que gerou a v1.1: os 48 comentários, as decisões **D1–D7** e o mapeamento tema→documento. **Preservado sem alteração** — é a trilha que explica por que cada decisão existe, inclusive as revogadas nesta versão |
| 09 | **Relatório de Auditoria da Fase 1** *(histórico)* | Auditoria normativa e de cobertura: 12 achados, 4 pontos de escopo, 7 recomendações e 14 propostas (13 aprovadas, 1 rejeitada). **Preservado sem alteração** — é a fundamentação normativa de boa parte das regras |
| 10 | **Plano de Execução Vibe Coding** | Como os épicos viram ciclos Spec Kit, a consolidação dos destinos de requisito, a Definition of Done, o protocolo de commit e o portão de CI |

> **Por que 08 e 09 não são reescritos.** São **relatórios de processo**, não especificações: registram o que foi decidido, por quem e com que fundamento, em datas determinadas. Reescrevê-los para "atualizar" apagaria a trilha — exatamente o que a regra "nunca apagar um requisito" existe para impedir. Eles entram na suíte da v2.1 **como estão**, e é neste documento (seção 7.1) que se registra o que foi revogado depois.

### Fase 2 — Arquitetura (20–25)

| # | Documento | Conteúdo |
|---|---|---|
| 20 | **Arquitetura Alvo Next.js + Supabase** | Visão de conjunto: App Router, Server/Client Components, Server Actions, fronteiras de camada e o papel de `lib/dominio/` |
| 21 | **Schema Físico PostgreSQL** | DDL comentado tabela a tabela, tipos, `ENUM`, constraints, índices, colunas geradas e views de compatibilidade |
| 22 | **Segurança, RLS e Autenticação** | Convite e sessão, `usuarios ↔ auth.users`, `perfil_permissao`, funções `app.*`, policies por tabela e os testes negativos obrigatórios |
| 23 | **Design System Tailwind + shadcn** | Tokens CIAARA sob `@theme`, tema claro/noturno, `components/ciaara/`, densidade, acessibilidade e as rotas `/print/*` |
| 24 | **Estrutura do Repositório e Convenções** | Árvore de pastas, nomenclatura, Conventional Commits, organização de testes e o que nunca entra no repositório |
| 25 | **Camada de Dados e Estado** | Acesso a dados por `@supabase/ssr`, URL como fonte de verdade (`nuqs`), `revalidatePath`/`revalidateTag`, `loading.tsx`/`error.tsx` e degradação segura |

### Fase 3 — Migração (30–31)

| # | Documento | Conteúdo |
|---|---|---|
| 30 | **Plano de Migração ETL** | Ordem de carga, scripts Python reaproveitados de `migracao/`, tratamento de órfãos, **congelamento de escrita, corte, reconciliação, critério de aborto e rollback** |
| 31 | **Mapa De-Para Sheets → PostgreSQL** | Aba por aba e coluna por coluna: nome de origem, nome de destino, tipo, transformação aplicada e destino do `ID_*` legado em `codigo` |

### Vibe Coding (40–42)

| # | Documento | Conteúdo |
|---|---|---|
| 40 | **Constitution v2.1** | Os princípios reescritos para a nova plataforma — em especial o **Princípio III**, que deixa de proibir framework/banco externo/CI e passa a fixar a nova stack e suas proibições |
| 41 | **Guia de Vibe Coding** | Como conduzir os ciclos Spec Kit nesta stack: o que verificar antes de escrever requisito, o que exige `clarify`, o que exige `analyze`, e a Definition of Done por fatia |
| 42 | **Prompts por Épico** | O prompt de partida de cada um dos 14 épicos, com contexto, arquivos a ler, entregáveis e critérios de aceite |

### `docs/sql-referencia/`

Scripts de referência versionados junto da documentação. São a fonte de `supabase/migrations/*.sql` e `supabase/seed.sql` no repositório, e a ordem dos arquivos **é** a ordem de execução.

| Arquivo | Conteúdo |
|---|---|
| `sql/00-extensoes-e-tipos.sql` | Extensões (`pgcrypto` etc.), schema `app` e os `ENUM` normativos: `perfil_usuario`, `escopo_curso`, `categoria_normativa`, `tipo_reserva`, `modo_atribuicao`, `impacto_feriado`, `status_registro` |
| `sql/01-tabelas-cadastro.sql` | `cursos`, `curso_regime_historico`, `turmas`, `disciplinas`, `instrutores`, `instrutor_disciplina`, `responsaveis_curso`, `usuarios`, `usuario_curso` |
| `sql/02-tabelas-fato.sql` | `registros_aula`, `avaliacoes`, `avaliacoes_planejadas`, `atividades_nao_letivas`, `planejamento_anual`, `migracao_log`, `arquivo_avaliacoes_v1` |
| `sql/03-config-e-calendario.sql` | `config_listas`, `config_parametros`, `feriados`, `janelas_curso`, `reservas_proens`, `horarios_tempos_aula` |
| `sql/04-views-e-funcoes.sql` | Funções `app.usuario_atual()`, `app.perfil_atual()`, `app.pode()`, `app.cursos_do_usuario()`, trigger `set_auditoria()` e as `VIEW`s de compatibilidade com os nomes de aba da v2.0 |
| `sql/05-policies-rls.sql` | `ENABLE ROW LEVEL SECURITY` em toda tabela e as policies por tabela e operação, mais o seed de `perfil_permissao` a partir da matriz do documento 01 |

### Raiz da pasta

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Índice mestre: mapa de leitura por papel, árvore de arquivos, ordem de leitura, estado do projeto e o primeiro comando prático |
| `CLAUDE.md` | Contexto operacional do repositório de código: convenções, gotchas, comandos e o que nunca fazer. É a versão de trabalho do documento 42 |

> **Formato.** Cada `.md` desta pasta tem uma versão **`.docx`** ao lado, gerada para leitura e revisão fora do editor de texto. **O `.md` é a fonte de verdade**; o `.docx` é derivado e nunca é editado diretamente — uma correção feita só no `.docx` se perde na próxima geração.

> **Nota de manutenção.** A numeração deixa faixas livres de propósito (11–19, 26–29, 32–39, 43+) para documentos futuros sem renumerar os existentes — a renumeração quebra toda citação cruzada já escrita, e citação cruzada é a espinha dorsal desta suíte.

---

## 9. Critérios de aceite da migração **[MIGRAÇÃO v2.1]**

A Fase 1 da v2.1 está concluída quando: (i) todo `RF-`/`RN-`/`RNF-` da v2.0 tiver destino explícito nos documentos 02, 03 e 04; (ii) o modelo relacional estiver descrito no documento 05; (iii) a matriz perfil × recurso × ação estiver fechada no documento 01; (iv) os épicos estiverem sequenciados no documento 06; e (v) Bernardo tiver validado esta suíte antes do início da Fase 2.

**A migração como um todo** — que é o que esta versão entrega — só é aceita quando **todos** os critérios abaixo estiverem satisfeitos. Cada um é verificável; nenhum depende de julgamento subjetivo.

| # | Critério | Como se verifica |
|---|---|---|
| **CA-01** | **Paridade funcional.** Todo módulo da seção 6.2 opera na v2.1 com comportamento equivalente ao da v2.0. | Roteiro de aceite por módulo, executado por Bernardo em ambiente de preview antes do corte. |
| **CA-02** | **Paridade de dados.** Contagem por entidade idêntica à da base v2.0 (seção 4), e **rastreabilidade 1:1** por `codigo` (o `ID_*` legado) em toda tabela migrada. | Relatório de reconciliação do documento 30: contagem por tabela, contagem de `codigo` distintos, lista de divergências — que deve ser vazia ou justificada linha a linha. |
| **CA-03** | **Zero órfão.** Nenhuma FK apontando para linha inexistente; toda exceção herdada da v2.0 (como `ID_Grade_Legado_v1`) explicitamente registrada. | O próprio banco: se a carga completou com as FKs ativas, não há órfão. Confirmado por consulta de auditoria. |
| **CA-04** | **Invariantes preservadas.** As regras `RN-` classificadas *Risco: Alto* no documento 04 têm asserção nomeada pelo identificador, em Vitest (função pura) e/ou pgTAP (SQL). Stub explicitamente pendente é aceito e rastreável; cobertura fingida, não. | Suíte verde no CI, com o relatório de stubs pendentes visível. |
| **CA-05** | **RLS provada por teste negativo.** Para **cada** perfil, o que ele **não** pode ler ou escrever é negado **pelo banco**, com cliente autenticado — não pela UI. | Vitest com cliente Supabase autenticado por perfil. **Testar só o caminho feliz de RLS não prova nada.** |
| **CA-06** | **Paridade de impressão.** DSA, Relatório do Curso, Cronograma, Ficha do Instrutor, LIQ e OS de Instrutoria conferem com o layout aprovado da v2.0. | E2E de impressão no Playwright + conferência visual por Bernardo. `RNF-COMP-01`. |
| **CA-07** | **Portão de qualidade verde.** `tsc --noEmit` sem erro, `eslint` sem aviso novo, unidade + invariantes + RLS + e2e passando, migration aplicada em preview **e revertível**. | CI da branch, antes do merge. |
| **CA-08** | **Parâmetros normativos como dado.** Tetos (AEC 10%, TAD 5%, TR 10%), faixas de CH docente e limite de TA/dia vivem em `config_parametros`; **nenhum literal equivalente no código**. Princípio VII. | Busca por literal no repositório + conferência do seed. |
| **CA-09** | **Vocabulário preservado.** Os termos intraduzíveis (CHD, AEC, TAD, TR, TA, DSA, CHR, PROENS, DGPM-101/103, CAHO, LIQ, OS de Instrutoria, ROTA, LHFC, PM, OD, TFM e as siglas de curso) aparecem sem tradução, sem abreviação alternativa e sem sinônimo, em schema, código, interface e documentação. **"Disciplina", nunca "Matéria"** (P-14). | Revisão do schema e busca por termo. |
| **CA-10** | **Nada perdido, nada apagado.** `migracao_log` migrado íntegro e apenas-acrescenta; a planilha v2.0 preservada como fonte histórica somente-leitura, com data de congelamento registrada. | Documento 31 + contagem de linhas do log. |
| **CA-11** | **Rollback executável.** Existe um caminho documentado e **ensaiado** de voltar à v2.0 dentro da janela de corte, com o critério objetivo de aborto declarado antes do corte. | Ensaio registrado no documento 30. |
| **CA-12** | **Escopo intacto.** Nenhuma funcionalidade de negócio nova entrou (seção 6.4); nenhum não-objetivo da seção 7.2 foi violado. | Revisão de escopo contra este documento, por Bernardo, antes do corte. |

**Definição de "pronto para corte":** CA-01 a CA-09 verdes em ambiente de preview, CA-10 e CA-11 documentados e ensaiados, CA-12 declarado por Bernardo. Enquanto qualquer um estiver aberto, **a v2.0 continua sendo o sistema de produção** — e isso não é fracasso, é o plano funcionando.
