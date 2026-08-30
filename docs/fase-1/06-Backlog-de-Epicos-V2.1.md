---
title: "CIAARA-11 v2.1 — Backlog de Épicos"
author: "Fase 1 do SDLC — Requisitos"
date: "25/08/2026"
version: "2.1"
---

# Backlog de Épicos — CIAARA-11 Versão 2.1

## Nota de migração (v2.1)

Este documento substitui `Versão 2.0/Fase 1 - Requisitos/06-Backlog-de-Epicos-V2.md`. Ele **não descarta** aquele backlog nem o trabalho que dele decorreu.

A v2.0 organizou o trabalho em **dez épicos (A a J)** e executou **39 specs Spec Kit** (`specs/001-migracao-saneamento-dados` a `specs/039-cronograma-gantt-sst`), das quais nove fecharam épicos inteiros e trinta entregaram funcionalidade, refinamento de UI ou correção sobre o que já existia. Tudo isso está **em produção** hoje, sobre Google Apps Script + Sheets.

A v2.1 é **migração de plataforma**, não redesenho de produto (BRIEF §0). Consequentemente:

- Os dez épicos da v2.0 são **reagrupados**, não reescritos. Cada um tem destino explícito nos 14 épicos da v2.1 (§2).
- Cada uma das 39 specs tem destino explícito num épico da v2.1 (§4, tabela de rastreabilidade). **Nenhuma funcionalidade entregue pela v2.0 é descartada.**
- O que muda é o **eixo de organização**: a v2.0 organizava por *pilar de melhoria* (design system, modularização, saneamento…); a v2.1 organiza por *fatia vertical entregável* na plataforma nova (fundação → schema → dado → acesso → shell → domínios).

**[REVOGADO — v2.1]** `RNF-PLAT-01` a `RNF-PLAT-04` — a proibição de framework, banco externo, bundler e CI/CD — deixam de valer. Eram restrições da plataforma Apps Script, não do domínio. Em seu lugar: Next.js 15 + Supabase PostgreSQL + Vercel + GitHub Actions (BRIEF §1). O Princípio III da constitution é **reescrito, não deletado**.

**[PRESERVADO]** Todo o corpo normativo, todo termo intraduzível (CHD, AEC, TAD, TR, TA, DSA, CHR, PROENS, CAHO, LIQ, OS de Instrutoria, ROTA, LHFC, PM, OD, TFM), os tetos 10%/5%/10%, as faixas de CH docente, o 9º TA como alerta-nunca-bloqueio, a nomenclatura "Disciplina", a rejeição de `RNF-NORM-04`, o limite de `RNF-NORM-06` e o critério de contenção de escopo (BRIEF §9).

---

## 1. Como usar este documento

Este é um artefato de **Requisitos**: descreve o quê e o porquê de cada fatia, não o desenho técnico. O "como" — DDL das migrations, forma dos Server Actions, estrutura de componentes — é da Fase 2 (Arquitetura), que deve usar este backlog como entrada.

Cada épico traz sete blocos fixos:

| Bloco | O que responde |
|---|---|
| **Objetivo e valor** | Por que esta fatia existe e o que ela entrega a quem |
| **Origem v2.0** | Que épico(s) e spec(s) ela absorve — rastreabilidade obrigatória (BRIEF §11) |
| **Escopo** | O que entra |
| **Fora de escopo** | O que explicitamente **não** entra, e para onde vai |
| **RF-/RN- cobertos** | Identificadores de origem |
| **Critérios de aceite** | Verificáveis, nunca subjetivos |
| **Dependências, riscos, esforço** | O que precisa estar pronto antes; o que pode dar errado; P/M/G |

**Escala de esforço relativo:** **P** = uma fatia de trabalho contida, sem decisão de arquitetura pendente. **M** = várias fatias, ou uma fatia com decisão de arquitetura embutida. **G** = domínio inteiro, com regras de negócio densas e múltiplos consumidores. A escala é **relativa entre os épicos deste backlog**, não uma estimativa de calendário.

**Definition of Done (BRIEF §7).** Nenhum critério de aceite abaixo substitui a DoD, que se aplica a **toda** fatia: `tsc --noEmit` limpo e `eslint` sem aviso novo; Vitest em toda função de `lib/dominio/` tocada; pgTAP com uma asserção nomeada por regra `RN-` de *Risco: Alto* (stub rastreável é aceitável, cobertura fingida não); teste **negativo** de RLS por perfil; Playwright no percurso principal, incluindo a rota de impressão quando houver; migration aplicada em preview e revertível; commit `feat(RF-XXX-NN): …`.

---

## 2. Mapa: dez épicos da v2.0 → catorze épicos da v2.1

| Épico v2.0 | Título | Destino na v2.1 |
|---|---|---|
| **A** | Design System Unificado | Épico **4** (tokens + shadcn/ui) |
| **B** | Modularização do Frontend e do Backend | Épicos **0** (estrutura do repo) e **4** (rotas por segmento) |
| **C** | Migração e Saneamento da Base | Épicos **1** (schema) e **2** (ETL + reconciliação) |
| **D** | Arquitetura de Navegação com `AppState` | Épico **4** (URL como fonte de verdade, `nuqs`) |
| **E** | Categorização de Atividades Letivas | Épico **9** |
| **F** | RBAC Ampliado e Gestão de Usuários | Épicos **1** (matriz como dado + RLS) e **3** (auth + telas) |
| **G** | Cronograma Unificado e Motor Preditivo Multi-Ano | Épico **7** |
| **H** | Motor de Sugestão do DSA | Épico **12** |
| **I** | Simplificação do Módulo de Avaliações | Épico **8** |
| **J** | Apoio Leve à Avaliação Externa/ROTA | Épico **13** |
| — | *(sem épico v2.0 — funcionalidade herdada da v1.0)* | Épicos **5** (cadastros), **6** (DSA), **10** (relatórios), **11** (LIQ/OS/Ficha) |

Quatro épicos da v2.1 não têm épico correspondente na v2.0 porque cobrem funcionalidade que **já existia em produção desde a v1.0** e nunca precisou de épico de melhoria — mas que a v2.1, sendo migração de plataforma, **precisa reimplantar do zero**. É a diferença estrutural entre os dois backlogs: a v2.0 listava o que ia mudar; a v2.1 lista tudo o que precisa existir na plataforma nova.

---

## 3. Os catorze épicos

### Épico 0 — Fundação: repositório, Next.js, Supabase, CI, tipos gerados

**Objetivo e valor.** Existir um repositório que compila, testa e implanta sozinho, com o projeto Supabase conectado e os tipos do banco gerados automaticamente. Valor: todo épico seguinte parte de um chão firme; nenhuma fatia posterior gasta tempo com encanamento.

**Origem v2.0.** Épico **B** (modularização — a divisão em arquivos por domínio vira estrutura de diretórios de verdade). Spec `005-modularizacao-frontend-backend` e, em espírito, `012-hotfix-tratamento-erro-leitura` (degradação segura vira `error.tsx` por segmento). **Novo enquanto migração:** não há equivalente v2.0 para CI/CD, porque `RNF-PLAT-04` o proibia.

**Escopo.**

| Item | Detalhe |
|---|---|
| Repositório | GitHub (já criado por Bernardo), Conventional Commits, proteção da branch principal |
| Aplicação | Next.js 15+, App Router, React 19, TypeScript `strict`; estrutura de diretórios do BRIEF §4 |
| Supabase | Projeto conectado (já criado), `supabase/config.toml`, CLI local, ambiente de preview por branch |
| Tipos | `supabase gen types typescript` → `lib/tipos/database.ts`, regenerado no CI |
| Acesso a dados | `lib/supabase/{client,server,middleware,admin}.ts` com `@supabase/ssr` |
| Qualidade | `tsc --noEmit`, ESLint, Vitest, Playwright, pgTAP configurados e rodando vazios no CI |
| Hospedagem | Vercel, preview por branch, variáveis de ambiente documentadas em `.env.local.example` |
| Governança | `CLAUDE.md`, `AGENTS.md`, `.claude/`, constitution reescrita (Princípio III) |
| Estrutura de domínio | `lib/dominio/` criado e **vazio**, com a regra escrita e testada por lint: **nada em `lib/dominio/` importa `supabase`** |

**Fora de escopo.** Nenhuma tabela (Épico 1). Nenhuma tela de negócio (Épico 4+). Nenhum dado (Épico 2). Design tokens (Épico 4) — aqui entra apenas o Tailwind cru funcionando.

**RF-/RN- cobertos.** `RF-MOD-01`, `RF-MOD-02`, `RF-MOD-03` (reinterpretados: a divisão passa a ser por segmento de rota e por módulo de domínio). **[REVOGADO — v2.1]** `RF-MOD-04` (aviso de implantação parcial) — era proteção contra o modelo de deploy do Apps Script, em que arquivos podiam ser publicados separadamente. Com build atômico e deploy versionado na Vercel, **implantação parcial deixa de ser um estado possível**; o requisito é substituído pela garantia da plataforma. `RN-DEG-01` (degradação segura) vira `error.tsx` + `loading.tsx` por segmento.

**Critérios de aceite.**

1. `git clone` + `npm install` + `npm run dev` sobe a aplicação num ambiente limpo, seguindo apenas o README.
2. Um push em branch gera preview na Vercel com URL própria.
3. O CI roda `tsc --noEmit`, `eslint`, `vitest` e `playwright` e falha o merge se qualquer um falhar.
4. `lib/tipos/database.ts` é gerado por comando documentado e o CI falha se estiver desatualizado em relação às migrations.
5. Uma regra de lint impede `import … from '@/lib/supabase…'` dentro de `lib/dominio/`, com teste que prova a regra ativa.
6. `.env.local.example` lista toda variável necessária, sem nenhum segredo real.

**Dependências.** Nenhuma. É a raiz.

**Riscos.** Baixos e conhecidos: configuração de `@supabase/ssr` com App Router tem armadilhas de cookie/sessão; resolver **aqui**, não espalhado pelos épicos seguintes. Risco secundário: sobre-engenharia de CI antes de haver o que testar — manter mínimo e crescer com os épicos.

**Esforço: P.**

---

### Épico 1 — Schema PostgreSQL + RLS + matriz de permissões

**Objetivo e valor.** O modelo conceitual do documento 05 vira DDL executável, com integridade referencial, unicidade, domínios, vigência por `EXCLUDE` e RLS em toda tabela. Valor: a partir daqui, a classe inteira de defeito de dado que a v2.0 combatia por convenção deixa de ser possível.

**Origem v2.0.** Épico **C** (estrutura da migração) + Épico **F** (RBAC como dado). Specs `001-migracao-saneamento-dados` (o schema que está sendo portado) e `033-limpeza-schema-disciplinas` (colunas mortas que **não** devem ser recriadas).

**Escopo.**

| Item | Detalhe |
|---|---|
| Tabelas | As **27** entidades do **BRIEF §2.1**, que é a autoridade de inventário e de nome (achado D-6). *Corrigido — esta linha dizia "as 24 entidades do documento 05 §3" (achado A-1). O documento 05 §3 lista 24 porque é anterior a `unidades_ensino`, `turma_disciplina_instrutor` e `configuracoes_horario`; ele é fonte de **semântica de atributo**, não de inventário* |
| Convenções | `id uuid` PK, `codigo text unique not null`, `origem_migracao_v1`, `status`, quarteto de auditoria, trigger `set_auditoria()` |
| Integridade | Toda FK da matriz de cardinalidade (documento 05 §5.2), com `on delete restrict` como regra geral |
| Unicidade | As sete regras do documento 05 §7.2, incluindo o índice parcial `UNIQUE (ano_letivo) WHERE status_previa = 'salvo'` |
| Domínios | Sete `ENUM` normativos (BRIEF §2) + FK para `config_listas` no domínio administrável |
| `CHECK` | Escopo global/turma, fiscal exclusivo, linha de disciplina no planejamento (documento 05 §7.3) |
| Vigência | `btree_gist` + `EXCLUDE` em `curso_regime_historico` e `responsaveis_curso` |
| Derivados | `GENERATED … STORED` onde imutável; VIEW onde depende de `now()` ou de agregação (documento 05 §7.6) |
| RLS | `ENABLE ROW LEVEL SECURITY` em toda tabela; policies que consultam `perfil_permissao` |
| Funções | Schema `app`, `SECURITY DEFINER`, `STABLE`, `search_path` fixo: `app.usuario_atual()`, `app.perfil_atual()`, `app.pode(recurso, acao)`, `app.cursos_do_usuario()` |
| Matriz | `perfil_permissao (perfil, recurso, acao, permitido)` populada por `seed.sql` |
| Parâmetros | `config_parametros` populada com tetos 10%/5%/10%, faixas de CH docente e limite de TA por dia |
| Invariantes | Suíte pgTAP inicial: integridade referencial, unicidade, contagem por tabela |

**Fora de escopo.** Carga de dados históricos (Épico 2). Telas de administração de usuários e parâmetros (Épico 3). As entidades das decisões **ainda pendentes** — `liq_emitida`, `papel_liq` (ver §5).

> **[ATUALIZADO — 28/08/2026]** A **origem do dado de UE** está resolvida: as Unidades de Ensino vêm dos **currículos oficiais da DEnsM** (`SIS11/Curriculos/`), não de linha sintética. Extração validada em 28/08/2026: **572 UEs**, 134 disciplinas, 21 dos 24 currículos, com a soma das CH fechando em **134 de 134**. `unidades_ensino` entra no épico **povoada por seed normativo**, com a norma de origem. Três currículos não declaram UE (Est-QF-APOC digitalizado; C-Espc-FR e C-Espc-HN no modelo por competências) — encaminhado em Q1.b, Épico 2. Ver `specs/002-schema-rls-permissoes/spec.md` e documento 05 §9.1.
>
> **[ATUALIZADO — 26/08/2026, decisão UE-1 pela rota (b)]** `unidades_ensino` **entrou no escopo deste épico** e deixou de ser "entidade de decisão pendente". Consequências diretas, todas obrigatórias na primeira migration: a tabela `unidades_ensino` com FK para `disciplinas` e `unique (disciplina_id, numero_ue)`; **`registros_aula` no grão de UE**, não de disciplina; e "CH executada da disciplina" como **derivada** (VIEW ou `GENERATED`), nunca segunda fonte de verdade. Ver documento 05 §9.1.

**RF-/RN- cobertos.** `RF-DADOS-01`, `RF-DADOS-03`, `RF-DADOS-04`, `RF-DADOS-06`, `RF-DADOS-07`, `RF-CRUD-04`, `RF-AUTH-03`; `RN-RBAC-02`, `RN-INST-02`, `RN-INST-05`, `RN-MAT-01`, `RN-MAT-02`, `RN-MAT-05`, `RN-EVT-01`, `RN-EVT-02`, `RN-EVT-03`, `RN-AVAL-02`, `RN-2027-09`, `RN-CRUD-02`; `RNF-NORM-08`, `RNF-SEG-02` (**[ABSORVIDO PELA PLATAFORMA]** — passa a ser RLS), `RNF-CONF-01`.

**Critérios de aceite.**

1. `supabase db reset` reconstrói o schema inteiro do zero a partir das migrations, sem erro e sem passo manual.
2. Toda tabela tem RLS habilitada; um teste prova que uma tabela sem policy é inacessível ao cliente anônimo e ao autenticado sem permissão.
3. Cada uma das sete regras de unicidade do documento 05 §7.2 tem um teste pgTAP que tenta violá-la e **espera a falha**.
4. Cada `CHECK` condicional tem teste que prova a rejeição do caso inválido.
5. `EXCLUDE` de vigência: inserir dois regimes `ativo` do mesmo tipo com intervalos sobrepostos para o mesmo curso **falha**.
6. `app.pode('disciplinas','editar')` devolve resultado coerente com `perfil_permissao` para cada perfil, provado por teste parametrizado.
7. Trocar uma permissão é um `UPDATE` em `perfil_permissao` e **não** exige migration — provado por teste que altera a linha e observa a mudança de comportamento da policy.
8. Nenhuma coluna derivada é gravável: um `UPDATE` em coluna `GENERATED` falha.
9. `migracao_log` não aceita `UPDATE` nem `DELETE` de nenhum perfil (append-only garantido por policy).

**Dependências.** Épico 0. A decisão **UE-1 está tomada** desde 26/08/2026 — rota (b), grão de UE (documento 05 §9.1). Não bloqueia mais; **determina** o grão de `registros_aula`.

**Riscos.**

| Risco | Mitigação |
|---|---|
| ~~Decisão UE-1 chegar depois do schema povoado~~ | **Resolvido em 26/08/2026** — rota (b). O risco vivo passa a ser outro: escrever `registros_aula` no grão de disciplina por hábito. A migration deve provar o grão de UE por teste pgTAP nomeado |
| Agregado "CH executada da disciplina" gravado em vez de derivado | Rota (b) só se sustenta se o agregado for VIEW ou `GENERATED`. Segunda coluna gravada é o defeito que a rota (a) queria evitar e que a (b) não pode reintroduzir |
| Policy RLS mal escrita liberar leitura indevida | Teste **negativo** obrigatório por perfil (BRIEF §7, item 4); nunca só o caminho feliz |
| Recursão infinita em policy que consulta `usuarios` | Funções `SECURITY DEFINER STABLE` com `search_path` fixo, conforme BRIEF §3 |
| `ENUM` fechado cedo demais | Só é `ENUM` o domínio normativo fechado; na dúvida, `config_listas` |

**Esforço: G.**

---

### Épico 2 — ETL Sheets → PostgreSQL + reconciliação

**Objetivo e valor.** Trazer 100% do histórico da planilha `Banco de dados CIAARA-11 v2.0` para o PostgreSQL, com reconciliação verificável linha a linha. Valor: sem dado migrado não há sistema — e sem reconciliação não há confiança no dado migrado.

**Origem v2.0.** Épico **C**. Reaproveita diretamente os scripts `migracao/*.py` já escritos e validados (BRIEF §1: ETL em Python). Specs `001-migracao-saneamento-dados`, `027-liq-automacao` (`criar_turma_disciplina.py`, 210 linhas), `029`, `032`, `033`, e as correções residuais (`corrigir_vinculo_orfao_instrutor_disciplina.py`, `normalizar_posto_graduacao.py`, `renumerar_ids_migracao_avaliacoes_eventos.py`).

**Escopo.**

| Item | Detalhe |
|---|---|
| Extração | Sheets → CSV por aba, com snapshot datado e imutável do arquivo de origem |
| Carga | CSV → `COPY` para tabelas de staging, depois `INSERT … SELECT` para as tabelas finais |
| Chave legada | `codigo` recebe o `ID_*` da v2.0 **verbatim**; FKs resolvidas por lookup `codigo → id` |
| Rastro | `origem_migracao_v1` preenchido em toda linha; `migracao_log` transportada integralmente e continuada |
| Reconciliação | Asserção de contagem por tabela contra os números do documento 05 §10 |
| Aritmética | `registros_aula` 1.566 + 1 transferida + 186 avaliações = 1.753; `atividades_nao_letivas` 663 + 1 = 664; categorias 531/62/60/11 = 664 |
| Integridade | Zero FK órfã em toda a base, provado após a carga |
| Idempotência | Reexecutar o ETL do zero produz exatamente o mesmo resultado |
| Reversão | Procedimento documentado de voltar ao estado anterior (`RNF-BKP-02` preservado) |
| Pendência de dado | Preenchimento do nominal do Encarregado da Divisão em `responsaveis_curso` (achado (b), pendência operacional da v2.0) |

**Fora de escopo.** Correção de conteúdo de negócio — **a v2.0 já saneou**; o ETL transporta, não reinterpreta. Qualquer recategorização nova. Qualquer tela.

**RF-/RN- cobertos.** `RF-DADOS-01`, `RF-DADOS-02`, `RF-DADOS-05`; `RNF-BKP-02`, `RNF-CONF-01`, `RNF-AUD-01`.

**Critérios de aceite.**

1. Contagem de cada tabela bate exatamente com o documento 05 §10; divergência de uma linha **bloqueia**.
2. As três identidades aritméticas de reconciliação fecham, verificadas por pgTAP.
3. Zero FK órfã em toda a base.
4. Toda linha migrada tem `codigo` não nulo e único, e `origem_migracao_v1` preenchido.
5. `migracao_log` contém as 717+ linhas históricas **intactas** — nenhuma reescrita — mais as linhas novas desta migração.
6. Reexecutar o ETL do zero produz base byte-idêntica na comparação de contagens e checksums por tabela.
7. As 210 linhas de `turma_disciplina` chegam com 89 períodos herdados e 121 em branco, exatamente como na origem.
8. **Não regressão por invariante estrutural, nunca por diff com a saída histórica de um curso específico** — a CAHO 2026 permanece rejeitada como padrão-ouro (Bernardo, 2026-08-10). Este critério é inegociável.

**Dependências.** Épico 1 (o schema precisa existir).

**Riscos.**

| Risco | Mitigação |
|---|---|
| Tipo mal convertido em silêncio (data como texto, `1900-03-15` como intervalo) | Staging com tipo `text`, conversão explícita e asserção por coluna antes do `INSERT … SELECT` |
| Timezone deslocando datas em um dia | `timestamptz`, banco em UTC, conversão explícita de `America/Sao_Paulo` na extração; teste com datas de fronteira |
| Tentação de "aproveitar e corrigir" um dado durante o ETL | Proibido. Correção de conteúdo é evento separado, logado — nunca embutido no transporte |

**Esforço: M.**

---

### Épico 3 — Auth por convite, gestão de usuários, RBAC

**Objetivo e valor.** Quem entra no sistema é quem o Admin convidou, e o que cada um pode fazer é o que a matriz permite — verificado pelo banco. Valor: a partir daqui o dado migrado está protegido.

**Origem v2.0.** Épico **F**. Spec `004-rbac-ampliado-usuarios`; parte de `038-hotfix-edicao-inline-datas-admin` (permissão de Admin).

**Escopo.**

| Item | Detalhe |
|---|---|
| Autenticação | Supabase Auth, **e-mail/senha somente por convite do Admin**; signup público desabilitado no painel |
| Fluxo de convite | Admin cadastra → Server Action com `service_role` chama `auth.admin.inviteUserByEmail()` → `/convite/[token]` → definição de senha |
| Senha | Mínimo 12 caracteres, verificação contra vazamentos (HaveIBeenPwned, nativo), **sem expiração compulsória** |
| Ligação | `usuarios.auth_user_id` 1:1 com `auth.users`, `on delete restrict` |
| Telas | `/admin/usuarios`: listar, convidar, editar perfil e escopo, inativar, reenviar convite |
| Perfis | Os ~12 perfis organizacionais do documento 01, com `escopo_curso` e `usuario_curso` (N:N) |
| Matriz | Tela de leitura da matriz `perfil_permissao`; edição por Admin |
| Sessão | Middleware de refresh de sessão; redirecionamento de rota protegida |
| Recuperação | `/recuperar-senha` |
| Auditoria | `usuarios.ultimo_acesso`; `criado_por`/`editado_por` por trigger a partir de `auth.uid()` |

**Fora de escopo.** SSO, MFA, federação com conta institucional — não pedidos e fora do escopo declarado. Auto-cadastro em qualquer forma.

**RF-/RN- cobertos.** `RF-AUTH-02`, `RF-AUTH-03`, `RF-AUTH-04`, `RF-AUTH-05`, `RF-CRUD-04`; `RN-RBAC-02`; `RNF-SEG-01`, `RNF-SEG-02`, `RNF-SEG-03`, `RNF-AUD-02`. **[REVOGADO — v2.1]** `RF-AUTH-01` e `RN-RBAC-01` (autenticação exclusivamente por conta Google via `Session.getActiveUser()`, decisão D1 da v2.0): dependiam do runtime Apps Script. Substituídos por e-mail/senha por convite (BRIEF §3, decisão de Bernardo em 25/08/2026). O requisito subjacente — *só acessa quem o Admin cadastrou* — é **preservado integralmente**.

**Critérios de aceite.**

1. Um e-mail não convidado **não consegue** criar conta por nenhum caminho, inclusive chamando a API diretamente.
2. Convite → definição de senha → primeiro acesso funciona ponta a ponta em ambiente de preview.
3. Senha com menos de 12 caracteres é recusada; senha em lista de vazamento conhecida é recusada.
4. Para **cada** perfil existe um teste que prova que o banco **nega** ao menos uma leitura e uma escrita fora do seu escopo. Teste negativo é obrigatório.
5. Encarregado de Curso com dois cursos em `usuario_curso` lê os dois e **não** lê um terceiro.
6. Alterar uma linha de `perfil_permissao` muda o comportamento efetivo sem redeploy.
7. Botão fora do escopo do perfil fica oculto na UI **e** a ação correspondente é negada pelo banco quando invocada diretamente.
8. `ultimo_acesso` é atualizado no login.

**Dependências.** Épicos 1 e 2. **A ordem 2 antes de 3 é deliberada: sem dado migrado não há o que proteger** (BRIEF §8).

**Riscos.**

| Risco | Mitigação |
|---|---|
| `service_role` vazar para o cliente | `lib/supabase/admin.ts` só é importável de Server Actions; regra de lint + revisão |
| Usuário órfão em `auth.users` sem linha em `usuarios` | Transação no convite; rotina de conferência no CI |
| Mudança de mecanismo de auth confundir usuários acostumados à conta Google | Comunicação do Admin no convite; documentar em nota de versão |

**Esforço: M.**

---

### Épico 4 — Design System Tailwind/shadcn + shell de navegação por URL

**Objetivo e valor.** Uma linguagem visual única e um shell de navegação em que **a URL é o estado**. Valor: entrega de graça o que `RF-NAV` pedia e a v2.0 não conseguia — histórico do navegador, voltar/avançar, compartilhar link de uma tela específica, recarregar sem perder contexto.

**Origem v2.0.** Épicos **A** (design system), **B** (modularização do frontend) e **D** (`AppState`). Specs `007-design-system-unificado`, `005-modularizacao-frontend-backend`, `011-appstate-navegacao`, `009-refatoracao-ui-ux`, `010-hotfix-sidebar-carrossel-estatisticas`, `013-hotfix-carrosseis-pagina-inicial`, `017-hotfix-roteamento-fonte-dsa` (roteamento SPA e fonte Rawline), `018-hotfix-nomenclatura-militar`, `020`, `021` (gráficos e siglas), `035`, `037` (refinamentos que definiram o padrão visual atual).

**Escopo.**

| Item | Detalhe |
|---|---|
| Tokens | CSS custom properties em `app/globals.css` sob `@theme` (Tailwind v4): `--color-ciaara-azul`, `--color-ciaara-ink`, semânticas de status/alerta, escalas tipográfica e de espaçamento |
| Tema | Claro (pastel) e noturno via `next-themes`, estratégia `class`, persistido, **sem flash** de tema errado |
| Componentes base | shadcn/ui copiado para `components/ui/`, versionado |
| Componentes CIAARA | `CardKpi`, `BadgeStatus`, `GradeAlocacao`, `FiltroAvancado`, `AlertaConformidade`, `TabelaDensa`, `SeletorTurma` |
| Nome de instrutor | Componente único `NomeInstrutor` no formato `P/G Especialidade Nome de Guerra` (RF-INSTR-15 / RF-DS-05), alimentado por função pura de `lib/dominio/` |
| Gráficos | Recharts, substituindo Chart.js |
| Shell | Layout raiz, navegação lateral, cabeçalho, breadcrumb; `loading.tsx` e `error.tsx` por segmento |
| Estado | `nuqs` para `?turma=…&curso=…&semana=…&filtros=…`; Zustand **apenas** para estado efêmero de UI |
| Tela Início | `/inicio` com KPIs, panorama por turma, filtros por classificação e modalidade, e o painel consolidado de alertas (conteúdo acende conforme os épicos 5–9 chegam) |
| Identidade | Brasão/identidade institucional do CIAARA (RF-INI-05) |
| Acessibilidade | Contraste AA, foco visível, navegação por teclado em tabelas densas |
| Densidade | Compacto e legível antes de espaçado e bonito — é sistema de gestão, com tabelas grandes |

**Fora de escopo.** Telas de domínio (épicos 5 a 13) — aqui entram apenas o shell, os componentes e a tela Início. Rotas de impressão (Épico 10 e 11).

**RF-/RN- cobertos.** `RF-DS-01` a `RF-DS-05`, `RF-DS-03.1`; `RF-NAV-01`, `RF-NAV-02`, `RF-NAV-03`; `RF-INI-01` a `RF-INI-05`; `RF-MOD-01`, `RF-MOD-03`; `RF-INSTR-15`; `RNF-USA-01` a `RNF-USA-05`; `RN-DEG-01`.

**[MIGRAÇÃO v2.1] — dizer isto explicitamente.** O objeto global `UI` da v2.0 **deixa de existir como objeto**: vira **tokens CSS + biblioteca de componentes tipada**. O requisito `RF-DS-01` ("um único ponto central de onde todas as telas obtêm cores, tipografia, espaçamento e estados") é **preservado**; o mecanismo muda, e melhora — um token errado passa a ser erro de build, não uma cor divergente que ninguém notou. O mesmo vale para `AppState`: o requisito `RF-NAV-01` ("um único ponto de verdade para o estado de navegação") é **preservado**, e o ponto de verdade passa a ser a URL.

**Critérios de aceite.**

1. Uma cor semântica nova é adicionada em **um** lugar (`@theme`) e propaga para todos os componentes que a usam.
2. Alternar tema persiste entre recargas e não produz flash de tema errado no carregamento.
3. `/cursos/[curso]?turma=T2&semana=34` restaurado numa aba nova reproduz exatamente a mesma tela.
4. Voltar e avançar do navegador funcionam em toda navegação de contexto.
5. Nenhum componente de `components/ciaara/` define cor literal — só token.
6. Toda tabela densa é navegável por teclado, com foco visível.
7. Auditoria de contraste AA passa em tema claro e escuro.
8. Nenhuma tela existente na v2.0 perde informação, cor semântica ou estado visual ao ser reconstruída sobre o Design System.

**Dependências.** Épico 0. Não depende de dado — pode começar em paralelo aos épicos 1–3 usando dados sintéticos (ver §6).

**Riscos.**

| Risco | Mitigação |
|---|---|
| Deriva visual em relação à v2.0, que Bernardo validou tela a tela ao longo de 39 specs | Capturar o padrão atual como referência antes de reescrever; revisão visual por tela |
| `"use client"` espalhando-se e anulando o ganho dos Server Components | Regra: `"use client"` só onde houver interação; revisão em PR |
| Zustand virar `AppState` disfarçado | Escopo explícito: só estado efêmero (rascunho de formulário longo, seleção múltipla) |

**Esforço: G.**

---

### Épico 5 — Cadastros: cursos, turmas, disciplinas, instrutores

**Objetivo e valor.** Os quatro cadastros estruturantes, com todo o refinamento de UI e as regras que a v2.0 acumulou em quinze specs. Valor: é a maior massa de funcionalidade entregue pela v2.0 e a que Bernardo mais usou e refinou.

**Origem v2.0.** `RF-CURSOS`, `RF-MATERIAS`, `RF-INSTR`, `RF-CRUD` (herdados da v1.0). Specs `014-refatoracao-modulo-instrutores`, `015-hotfix-filtros-cross-instrutores`, `016-ficha-formulario-instrutores`, `019-atribuicao-disciplinas-instrutor`, `020-hotfix-refinamento-listagem-instrutores`, `021-hotfix-graficos-siglas-cursos`, `025-ficha-spa-mascaras-schema` (parte de schema/máscaras), `029-turma-disciplina-instrutor`, `030-ui-disciplinas-cascata`, `031-disciplinas-cascata-expansao`, `032-rateio-ch-multidisciplinar`, `035-refinamento-ui-disciplinas`, `036-disciplinas-crud-antiguidade`, `037-filtros-status-grafico-disciplinas`, `038-hotfix-edicao-inline-datas-admin`.

**Escopo.**

| Módulo | O que entra |
|---|---|
| **Cursos** | CRUD; cartões agrupados por classificação com informações descritivas; aba "Sobre o Curso" com grade curricular; regime de horário com **data de vigência** e histórico imutável; alertas do curso |
| **Turmas** | CRUD; janela real; sala alocada; status; seletor de turma reutilizável |
| **Disciplinas** | CRUD completo com **navegação em cascata** (curso → turma → disciplina) e tabela expansível; período e instrutor **por turma** via `turma_disciplina`; **rateio de CH prevista em atribuição multidisciplinar**; modo de atribuição (Dividido/Simultâneo); unicidade genérica de código; filtros por instrutor e status; gráfico proporcional; ordenação por antiguidade; sinalização de disciplina sem instrutor e de início em ≤ 30 dias |
| **Instrutores** | CRUD com ficha e formulário avançado; máscaras de entrada; filtros e *cross-filtering*; indicadores e gráficos; quadro de avisos de qualidade de cadastro; desativação/reativação lógica; painel de atribuição de disciplinas; duas grandezas de CH **calculadas**; comparação contra faixa normativa do regime; alerta de docência > 1 ano sem capacitação didática |
| **Transversal** | Ordenação por antiguidade em **toda** lista, seletor e filtro, sem exceção; nome no formato padronizado; confirmação antes de salvar; geração automática de identificador |

**Fora de escopo.** Ficha em PDF e documentos oficiais (Épico 11). Lançamento de aula (Épico 6). Cronograma (Épico 7). O papel titular/reserva (LIQ-3) enquanto a decisão não vier (§5.3).

**RF-/RN- cobertos.** `RF-CURSOS-01/02/03`, `RF-CURSO-01` a `RF-CURSO-06`, `RF-MATERIAS-01` a `RF-MATERIAS-06`, `RF-INSTR-01` a `RF-INSTR-16`, `RF-CRUD-01/02/03/04`, `RF-HOR-01/02/03/03.1/05/10`, `RF-DADOS-06`; `RN-ANT-01`, `RN-ANT-02`, `RN-CRUD-01/02/03`, `RN-INST-01` a `RN-INST-05`, `RN-MAT-01/02/04/05`, `RN-2027-09`.

**[MIGRAÇÃO v2.1]** `RF-CRUD-02` ("o mecanismo deve reconhecer automaticamente colunas novas sem alteração de código") era a solução certa para o Sheets, onde o cabeçalho é dinâmico. No PostgreSQL, uma coluna nova é uma migration e o tipo gerado muda junto — o requisito é **[ABSORVIDO PELA PLATAFORMA]**: o objetivo (não ter de reescrever o CRUD a cada coluna) é atendido pelos tipos gerados e por formulários dirigidos por schema Zod, com a vantagem de o compilador avisar. `RF-CRUD-03` (não sobrescrever coluna calculada) vira garantia do motor: `GENERATED` não é gravável.

**Critérios de aceite.**

1. Toda lista, `<select>` e filtro de instrutores está ordenado por antiguidade, derivada de posto/graduação, com `antiguidade_declarada` como desempate — verificado por teste automatizado em **todas** as ocorrências, não por amostragem.
2. Nome de instrutor aparece no formato `P/G Especialidade Nome de Guerra` em toda tela.
3. Cadastrar disciplina com código já existente no mesmo curso é recusado **pelo banco**, com mensagem clara na UI.
4. Editar o período de uma disciplina na turma T2 **não** altera o período da T1 do mesmo curso.
5. Rateio de CH em disciplina com dois instrutores em modo Dividido soma exatamente a CH prevista, sem sobra nem falta — teste de invariante.
6. Desativar instrutor o remove das listas de nova atribuição e o **mantém** em todo o histórico já lançado.
7. Registrar mudança de regime com data de vigência futura preserva o cálculo dos lançamentos anteriores àquela data.
8. Cadastro incompleto (faltando posto, especialidade, nome, categoria ou OM) é recusado.
9. CH do instrutor nunca é campo digitável em nenhum formulário.

**Dependências.** Épicos 1, 2, 4.

**Riscos.**

| Risco | Mitigação |
|---|---|
| Perder um refinamento de UI espalhado em quinze specs | Inventário por spec antes de começar; a tabela de rastreabilidade §4 é a lista de conferência |
| Rateio de CH com arredondamento divergindo da v2.0 | Portar a função para `lib/dominio/` com os mesmos casos de teste; invariante de soma |
| Épico grande demais para uma fatia | Subdividir por módulo: cursos+turmas, disciplinas, instrutores — nesta ordem |

**Esforço: G.**

---

### Épico 6 — Detalhe Semanal de Aula (lançamento + impressão)

**Objetivo e valor.** A tela mais usada do sistema: lançar a semana de uma turma e imprimi-la em A4 paisagem com assinaturas. Valor: é o produto diário do CIAARA-11.

**Origem v2.0.** `RF-DSA` (herdado da v1.0, refinado na v2.0). Specs `017-hotfix-roteamento-fonte-dsa` (performance do DSA) e `001` (a entidade `responsaveis_curso` que faz a assinatura sair preenchida).

**Escopo.**

| Item | Detalhe |
|---|---|
| Lançamento | Registro em um dia da turma nas categorias normativas; navegação semana a semana |
| Grade | Por dia × TA, com disciplina, conteúdo, técnica de ensino, instrutor, local; horário de início e fim de cada TA; intervalos e janela de almoço visíveis |
| Conflito | Sinalização de conflito de horário quando o mesmo instrutor está alocado no mesmo dia com tempos sobrepostos |
| Situação | Por disciplina: Aguardando Início, Em andamento, Concluída, Conflitou; quadro de CH acumulada |
| Edição | Excluir pela grade; reordenar/mover lançamento entre horários e entre dias |
| Impressão | `/print/dsa` — **uma única página A4 paisagem**, sem shell, com `@media print` e quebra controlada; rodapé de assinaturas resolvido de `responsaveis_curso` (modo fixo e dinâmico) |
| Regime | O DSA lê o **regime vigente na data da semana**, nunca o regime corrente |

**Fora de escopo.** Sugestão automática de preenchimento (Épico 12). Relatório do curso (Épico 10). Cronograma (Épico 7).

**RF-/RN- cobertos.** `RF-DSA-01` a `RF-DSA-07`, `RF-HOR-04`, `RF-HOR-06`, `RF-EVT-02`; `RN-CONF-01`, `RN-CONF-02`, `RN-MAT-01`, `RN-MAT-03`, `RN-MAT-04`, `RN-EVT-02`, `RN-EVT-03`, `RN-CRONOS-01`, `RN-CRONOS-03`, `RN-2027-09`; `RNF-COMP-01`.

**Critérios de aceite.**

1. A impressão do DSA cabe em **uma** página A4 paisagem para uma semana cheia, com paridade de layout contra o modelo aprovado da v2.0.
2. O rodapé impresso sai com as assinaturas preenchidas — o defeito histórico do achado (b) não reaparece.
3. Reimprimir hoje um DSA de março traz quem assinava em março, não quem assina hoje.
4. Um DSA de semana anterior a uma mudança de regime é renderizado com o regime **daquela** data.
5. Dois lançamentos do mesmo instrutor com TA sobrepostos no mesmo dia são sinalizados como conflito.
6. Feriado de dia inteiro desconta capacidade da semana; impacto parcial ou informativo não desconta.
7. Mover um lançamento entre dias preserva o registro de auditoria.
8. Teste e2e cobre lançar → visualizar → imprimir.

**Dependências.** Épicos 1, 2, 4, 5.

**Riscos.**

| Risco | Mitigação |
|---|---|
| Paridade de impressão é requisito, não detalhe (`RNF-COMP-01`) | Teste e2e de impressão comparando contra o layout aprovado da v2.0 |
| Cálculo de horário de TA divergir por arredondamento de minutos | Portar a função para `lib/dominio/` com os casos das cinco configurações reais |
| Densidade da grade quebrar em telas pequenas | Grade com scroll horizontal próprio; nunca scroll horizontal no `body` |

**Esforço: G.**

---

### Épico 7 — Cronograma unificado + motor preditivo multi-ano

**Objetivo e valor.** Previsão e execução real no mesmo módulo, e um motor preditivo que roda para **qualquer ano**. Valor: é o coração do planejamento anual da Divisão de Administração Acadêmica.

**Origem v2.0.** Épico **G**. Specs `006-cronograma-motor-preditivo` e `039-cronograma-gantt-sst` (visão Gantt do cronograma).

**Escopo.**

| Item | Detalhe |
|---|---|
| Unificação | Diagrama de Alocação + Cronos num único módulo (já compartilhavam a função de distribuição) |
| Granularidade | Semana, mês, trimestre, semestre, ano; visão por disciplina e por instrutor |
| Previsto × Realizado | Comparação por semana e por disciplina, com sinalização de divergência e de densidade |
| Categorias | AEC, TAD, TR e Estudo Individual totalizados **separadamente** |
| Feriados | Linha especial descontando capacidade das semanas |
| Filtros e saída | Filtro por disciplina e instrutor; exportação CSV; impressão da grade |
| **Gantt** | Visão Gantt do cronograma (spec `039`), com barras por disciplina na janela prevista |
| Salas | Visão de ocupação de salas — **planejamento e leitura, não reserva de recursos** |
| Regime | Mudança de regime no meio da janela **efetivamente aplicada** ao cálculo a partir da vigência |
| Motor preditivo | Simulação de **qualquer ano**, alimentada por `feriados`, `janelas_curso` e `reservas_proens`; prévia editável (`rascunho`) promovida a `salvo`; lançamento manual de eventos de calendário; versionamento sem sobrescrita |
| Prioridade | Prioridade relativa entre disciplinas ajustável quando o critério automático não servir |

**Fora de escopo.** Sugestão semanal do DSA (Épico 12). Reserva de salas como recurso gerenciado — explicitamente `RF-CRONOS-10`. Restrições de sequenciamento pedagógico — `RNF-NORM-04` permanece **rejeitado** (BRIEF §9).

**RF-/RN- cobertos.** `RF-CRONOS-01` a `RF-CRONOS-10`, `RF-2027-01` a `RF-2027-05`, `RF-HOR-07`, `RF-HOR-08`, `RF-HOR-09`; `RN-DIST-01`, `RN-DIST-02`, `RN-DIST-03`, `RN-CRONOS-01/02/03`, `RN-2027-01` a `RN-2027-09`, `RN-EVT-02`.

**Critérios de aceite.**

1. O motor roda para **qualquer** ano informado; nenhum literal de ano existe no código — provado por busca.
2. Feriados, janelas de curso e reservas vêm **do banco**; alterar um feriado muda a simulação sem redeploy.
3. Gerar novamente o mesmo ano cria versão nova em `rascunho` e **não apaga** a anterior.
4. Promover a `salvo` arquiva a anterior na mesma transação; duas versões `salvo` no mesmo ano são impossíveis.
5. Uma mudança de regime cadastrada para o meio da janela altera a capacidade calculada **a partir da data de vigência**, e não antes.
6. Prova Mista é sempre bloco fechado de exatamente 3 TA contíguos no mesmo dia, nas disciplinas que a regra alcança.
7. No máximo 4 disciplinas distintas por dia e no máximo 4 TA da mesma disciplina por dia.
8. Teto de TFM respeitado como limite **rígido**; os demais tetos semanais conforme os três regimes de `RN-DIST-03`.
9. Cada regra `RN-2027-*` e `RN-DIST-*` tem função pura em `lib/dominio/` com teste de unidade próprio.
10. Validação de não regressão por **invariante estrutural e matemático**, nunca por diff com a CAHO 2026.

**Dependências.** Épicos 1, 2, 4, 5, e a categorização do Épico 9 para os totais por categoria (ver §6).

**Riscos.**

| Risco | Mitigação |
|---|---|
| Motor preditivo é a regra de negócio mais densa do sistema | Portar como funções puras primeiro, com testes, **antes** de qualquer UI |
| Sem padrão-ouro histórico, validar o motor é mais difícil | Invariantes matemáticos (soma de TA alocados = CH prevista; nenhuma alocação em feriado; nenhum dia acima do regime) |
| Gantt ser tratado como visualização nova em vez de projeção do mesmo dado | O Gantt lê a mesma fonte do cronograma; nenhuma regra de alocação própria |

**Esforço: G.**

---

### Épico 8 — Avaliações simplificadas

**Objetivo e valor.** Acompanhar avaliação pela **situação de execução**, sem fórmula de nota. Valor: elimina campos que ninguém usava e faz agendamento e execução serem o mesmo fato.

**Origem v2.0.** Épico **I**. Spec `003-simplificacao-avaliacoes`.

**Escopo.**

| Item | Detalhe |
|---|---|
| Agendamento | Tipo, data, data da vista, instrutor responsável, fiscal — sem consumir TA |
| Execução | O **mesmo** registro recebe `ta_inicial` e `tempos_consumidos` quando lançado no DSA; compõe a CHD |
| Vista de prova | Campos próprios de posição e consumo; também compõem a CHD |
| Situação | Concluída, Em andamento, Pendente, Atrasada, Sem correspondência |
| Alerta de vista | Sinalização automática quando a vista ultrapassa 7 dias corridos sem registro |
| Fiscal | **Qualquer pessoa**, inclusive fora do cadastro de instrutores, sem exigir habilitação |
| Painel | Comparação por curso entre `avaliacoes_planejadas` e avaliações reais, por casamento de nome normalizado |
| Legado | `formula_mf` e `carater` permanecem no schema como informativos, **não lidos por regra alguma** |

**Fora de escopo.** Cálculo de nota, média final, aprovação ou qualquer documento escolar — `RNF-NORM-06`, competência das divisões CIAARA-32 e CIAARA-12 (BRIEF §9).

**RF-/RN- cobertos.** `RF-AVAL-01` a `RF-AVAL-06`; `RN-AVAL-01`, `RN-AVAL-02`, `RN-EVT-03`, `RN-INST-01` (delimitada); `RNF-NORM-06`.

**Critérios de aceite.**

1. Nenhuma tela, cálculo ou consulta depende de `formula_mf` ou `carater` — provado por busca no código.
2. Agendar avaliação não consome TA; registrar a execução consome e compõe a CHD **do mesmo registro**, sem segundo cadastro.
3. Vista com mais de 7 dias corridos sem registro aparece como Atrasada — teste com data de fronteira exata.
4. Um fiscal externo, sem cadastro de instrutor, é aceito; um aplicador sem habilitação na disciplina é recusado.
5. `fiscal_id` e `nome_fiscal_externo` preenchidos juntos são recusados pelo banco.
6. Toda avaliação e vista aparece corretamente no DSA da turma.
7. O sistema não expõe em lugar nenhum nota, média ou situação de aprovação de aluno.

**Dependências.** Épicos 1, 2, 4, 5, 6 (a avaliação aparece no DSA).

**Riscos.** Baixos. O principal é reintroduzir por conveniência algum campo de nota — barrado por `RNF-NORM-06` e pelo critério de contenção de escopo.

**Esforço: P.**

---

### Épico 9 — Atividades AEC/TAD/TR/Estudo Individual + tetos normativos

**Objetivo e valor.** As grandezas normativas de composição de carga horária representadas corretamente, com os tetos calculados e sinalizados. Valor: é o que torna o sistema conforme ao corpo normativo, e não apenas um registro de aulas.

**Origem v2.0.** Épico **E**. Spec `002-categorizacao-atividades-letivas` (fechada e **confirmada funcionando por Bernardo** em 2026-08-14).

**Escopo.**

| Item | Detalhe |
|---|---|
| Lançamento | AEC, TAD, TR e Estudo Individual, com subtipo operacional administrável |
| Escopo | Global (todas as turmas ativas na data) ou de uma turma específica |
| Posição | `ta_inicial` e `local`, para o lançamento aparecer posicionado na grade do DSA |
| Fórmula | `CHT = CHD + AEC + TAD + TR`; Estudo Individual **fora** da soma, controlado à parte |
| Tetos | AEC ≤ 10% do somatório das CH das disciplinas; TAD ≤ 5% da CHR; TR ≤ 10% da CHR — lidos de `config_parametros` |
| Sinalização | Cálculo e sinalização por curso, com `AlertaConformidade` |
| Totais | Categorias totalizadas separadamente no DSA, no Relatório e no Cronograma |
| Legado | `tipo_legado_v1` preservado, mantendo a recategorização auditável e reversível |

**Fora de escopo.** Bloqueio de lançamento por estouro de teto — é **alerta, nunca bloqueio** (`RN-DEG-02`, BRIEF §9). Nova recategorização: o de-para dos 663→664 já foi executado na v2.0 e chega pronto pelo ETL.

**RF-/RN- cobertos.** `RF-EXTRA-01` a `RF-EXTRA-04`, `RF-DSA-01`, `RF-CRONOS-04`, `RF-DADOS-03`; `RN-EVT-01`, `RN-EVT-03`, `RN-CRONOS-02`, `RN-DEG-02`; `RNF-NORM-01`, `RNF-NORM-02`, `RNF-NORM-08`.

**Critérios de aceite.**

1. Toda tela e todo cálculo diferencia as categorias; nenhuma soma trata "atividade não letiva" como balde único.
2. Estudo Individual **nunca** entra na soma da CHT — invariante testado.
3. Os três tetos são calculados a partir de `config_parametros`; alterar o parâmetro muda o cálculo sem redeploy.
4. Estourar um teto produz **alerta visível e nunca impede o lançamento**.
5. Lançamento Global aparece em todas as turmas ativas na data; lançamento de turma aparece só nela.
6. Lançamento Global com `turma_id` preenchido é recusado pelo banco, e vice-versa.
7. Os 664 registros históricos totalizam 531 Estudo Individual, 62 AEC, 60 TAD e 11 TR.

**Dependências.** Épicos 1, 2, 4, 6.

**Riscos.** Baixos — a taxonomia já foi decidida, migrada e validada em produção. Risco residual: transformar teto em `CHECK` por zelo de plataforma, o que **mudaria a regra de negócio**. Explicitamente proibido.

**Esforço: M.**

---

### Épico 10 — Relatórios e impressão

**Objetivo e valor.** O relatório consolidado da turma por período, imprimível, por seção ou geral. Valor: é o documento que sustenta a prestação de contas do curso.

**Origem v2.0.** `RF-REL` e `RF-CURSO-05` (herdados da v1.0). Sem spec dedicada na v2.0 — a funcionalidade nunca precisou de épico de melhoria, o que **não** a torna menos obrigatória na migração.

**Escopo.**

| Item | Detalhe |
|---|---|
| Geração | Por turma e período (data inicial/final), consolidando aulas e atividades |
| Formato | Por seção/assunto individual (uma disciplina) **ou** geral consolidado |
| Comentário | Campo de comentário por bloco de assunto, oculto na tela e **impresso** junto ao bloco |
| Impressão | `/print/relatorio`, reaproveitando o layout validado (cabeçalho, tabela, total) |
| Totais | Por categoria normativa, coerentes com o Épico 9 |
| Regime | Mudança de regime durante o curso consta do relatório, com período de vigência de cada configuração |

**Fora de escopo.** Documento escolar, histórico de aluno, nota — `RNF-NORM-06`. Exportação para formatos ofimáticos além da impressão.

**RF-/RN- cobertos.** `RF-REL-01` a `RF-REL-04`, `RF-CURSO-05`, `RF-HOR-09`, `RF-CRONOS-04`; `RN-CRONOS-01`, `RN-CRONOS-02`; `RNF-COMP-01`.

**Critérios de aceite.**

1. Relatório de um período traz todos os lançamentos do intervalo e **nenhum** de fora.
2. Formato por seção e formato geral produzem totais idênticos para o mesmo período.
3. O comentário do usuário não aparece na tela e **aparece** na impressão.
4. Paridade de layout com o relatório aprovado da v2.0, verificada por teste e2e de impressão.
5. Turma com mudança de regime no período mostra as duas configurações com suas vigências.
6. Totais por categoria batem com o DSA e com o Cronograma do mesmo período — invariante cruzado.

**Dependências.** Épicos 1, 2, 4, 5, 6, 9.

**Riscos.** Divergência de total entre Relatório, DSA e Cronograma por caminhos de cálculo diferentes. Mitigação: **um único conjunto de funções de agregação** em `lib/dominio/`, consumido pelos três.

**Esforço: M.**

---

### Épico 11 — LIQ, OS de Instrutoria, Ficha de Docentes (PDF)

**Objetivo e valor.** Os três documentos oficiais que o sistema emite. Valor: substitui trabalho manual de garimpo e transcrição, com rastreabilidade.

**Origem v2.0.** Specs `022-ficha-docentes-pdf`, `023-hotfix-pdf-impressao-ficha`, `024-hotfix-impressao-pdf-ficha`, `025-ficha-spa-mascaras-schema`, `026-substituicao-layout-ficha-template`, `027-liq-automacao`, `028-os-instrutoria`, `034-hotfix-validacao-instrutor-liq`, e `016-ficha-formulario-instrutores` na parte de ficha.

**Escopo.**

| Documento | O que entra |
|---|---|
| **LIQ** | Minuta da Lista de Instrutores Qualificados por trimestre, conforme NORMHIDRO nº 30-23 e Anexos A–D; seção 1 a partir de `instrutores` (posto, nome, OM, divisão, assunção, tempo no setor, formação, CH ministrada no ano); seção 2 por **turma**, com período de `turma_disciplina`; disciplinas habilitadas com CH derivadas de `instrutor_disciplina` × `disciplinas`; ordenação por antiguidade decrescente; validação que reconhece o instrutor **realmente selecionado por turma** (spec `034`); regra de bloqueio para período não informado |
| **OS de Instrutoria** | Ordem de Serviço filtrada por curso/turma/período, com instrutores e disciplinas |
| **Ficha de Docentes** | Ficha individual ampliada, com layout de template fixo, máscaras de entrada, e impressão em PDF |
| **Impressão** | Rotas `/print/liq`, `/print/os-instrutoria`, `/print/ficha-instrutor` — sem shell, `@media print`, quebra de página controlada |

**[MIGRAÇÃO v2.1]** A geração de PDF da v2.0 passava por Google Docs (`renderizarFichaInstrutor_`, template no Drive), que era a única via disponível no Apps Script e que consumiu quatro specs de correção (`023`, `024`, `025`, `026`). Na v2.1 vira **rota `/print/*` com CSS `@media print`** — o mesmo mecanismo de todos os outros documentos, sem dependência externa. O requisito de paridade de layout é **preservado e obrigatório**; o mecanismo muda e simplifica.

**Fora de escopo.** **`Instrutor_Impedimento` não será criada** e a coluna "Observação" da seção 1 da LIQ sai **sempre vazia** — decisão de Bernardo em 2026-08-20 (LIQ-2): o sistema produz uma **minuta**, e impedimento é dado que nasce fora do sistema, declarado pelo próprio instrutor quando consultado. Persistência da LIQ emitida (LIQ-4) e papel titular/reserva (LIQ-3) enquanto as decisões não vierem (§5.3 e §5.4).

**RF-/RN- cobertos.** `RF-INSTR-10`, `RF-INSTR-13`, `RF-INSTR-15`, `RF-INSTR-16`, `RF-MATERIAS-02`; `RN-ANT-01`, `RN-ANT-02`, `RN-INST-01`, `RN-INST-04`; `RNF-COMP-01`, `RNF-NORM-05`.

**Critérios de aceite.**

1. A LIQ de um trimestre que contenha segunda turma sai com o período **da T2**, não o da T1, e sem linha duplicada.
2. A seção 1 sai ordenada por antiguidade decrescente de posto, com desempate por `antiguidade_declarada`.
3. A coluna "Observação" sai vazia — comportamento **pretendido**, verificado por teste.
4. Disciplina de turma sem período informado dispara a regra de bloqueio da LIQ com mensagem que identifica a turma e a disciplina.
5. A validação da LIQ reconhece o instrutor selecionado em `turma_disciplina`, não apenas o habilitado na grade.
6. Ficha, LIQ e OS impressas têm paridade com os modelos aprovados da v2.0, verificada por e2e de impressão.
7. CH ministrada no ano e disciplinas habilitadas com CH são **derivadas**, nunca digitadas.

**Dependências.** Épicos 1, 2, 4, 5.

**Riscos.**

| Risco | Mitigação |
|---|---|
| Paridade de layout com documento normativo (Anexo C da NORMHIDRO) | Comparar contra as LIQs reais do acervo `modelos/LIQ/` (2023–2026) |
| Reintroduzir a via Google Docs por hábito | Explicitamente proibido: `/print/*` é o mecanismo único |
| Assumir a guarda de dado alheio (impedimentos) | LIQ-2 é decisão fechada; não reabrir |

**Esforço: M.**

---

### Épico 12 — Motor de sugestão do DSA

**Objetivo e valor.** Uma prévia semanal sugerida, para reduzir o esforço de montar a semana do zero. Valor: é a maior economia de tempo operacional pedida por Bernardo.

**Origem v2.0.** Épico **H**. Spec `008-motor-sugestao-dsa`.

**Escopo — entrega explicitamente fatiada (recomendação R-5 da v2.0, preservada).**

| Etapa | Conteúdo |
|---|---|
| **(i) Versão simples** | Sugestão determinística, considerando prioridade de disciplina e os limites diário/semanal rígidos já existentes |
| **(ii) Validação obrigatória** | Comparar o que o motor sugeriria contra uma semana real já lançada manualmente, **antes** de qualquer sofisticação |
| **(iii) Sofisticação — só depois** | Preferências semanais do instrutor, priorização configurável, exceção pontual de preferência para uma semana específica sem alterar o cadastro |

**Fora de escopo.** **Restrições de sequenciamento pedagógico de técnica de ensino permanecem rejeitadas** — `RNF-NORM-04` não gera requisito, em nenhuma etapa (BRIEF §9). Imposição da sugestão: é ajuda, nunca trava.

**RF-/RN- cobertos.** `RF-DSA-08`, `RF-DSA-08.1`, `RF-INSTR-06`, `RF-INSTR-06.1`; `RN-DIST-01/02/03`, `RN-CONF-01`, `RN-2027-05`, `RN-2027-06`, `RN-DEG-02`.

**Critérios de aceite.**

1. A sugestão respeita **todos** os limites rígidos existentes, incluindo o teto de TFM (`RN-DIST-03`).
2. A sugestão **nunca** é imposta: lançar manualmente algo diferente funciona a qualquer momento, sem confirmação extra.
3. A etapa (ii) é executada e registrada **antes** de qualquer trabalho da etapa (iii) — critério de processo, verificável no histórico do repositório.
4. Nenhuma restrição de sequenciamento pedagógico é implementada — provado por revisão do código do motor.
5. O motor é função pura de `lib/dominio/`, testável sem banco.
6. Exceção pontual de preferência não altera o cadastro do instrutor.

**Dependências.** Épicos 5, 6, 7 (a sugestão usa a mesma distribuição do cronograma).

**Riscos.**

| Risco | Mitigação |
|---|---|
| Construir motor sofisticado antes de saber se vale a pena | O fatiamento em (i)/(ii)/(iii) existe exatamente para isso; a etapa (ii) é **porta**, não formalidade |
| Sugestão virar obrigação na prática, por atrito de UI | Lançamento manual precisa ser igualmente fácil; testado por e2e |

**Esforço: M.**

---

### Épico 13 — Apoio à Avaliação Externa / ROTA

**Objetivo e valor.** Organizar, numa visão só, os dados que o CIAARA-11 já possui e que alimentam a planilha institucional da ROTA. Valor: elimina garimpo manual, sem expandir escopo.

**Origem v2.0.** Épico **J**. **Único épico da v2.0 que nunca virou spec** — foi especificado na Fase 1 e nunca executado. A v2.1 o mantém no backlog, no mesmo escopo contido.

**Escopo.** Visão consolidada de qualificação, capacitação didática e carga horária dos instrutores, e dos tópicos de curso que o sistema cobre, organizados na ordem em que a planilha institucional os pede, prontos para transcrição manual.

**Fora de escopo — e este é o ponto do épico.** Gerar a planilha ROTA automaticamente. Submeter, integrar ou trocar dados com qualquer sistema externo. Cobrir dimensões que o CIAARA-11 não trata — corpo discente, infraestrutura. O critério de contenção de escopo (Princípio IX / BRIEF §9) aplica-se com força máxima aqui: *este processo está atribuído à CIAARA-11 na Matriz de Responsabilidades?*

**RF-/RN- cobertos.** `RF-ROTA-01`, `RF-ROTA-02`, `RF-ROTA-03`; `RNF-NORM-05`.

**Critérios de aceite.**

1. A visão **não** gera nem submete a planilha ROTA.
2. Cobre exclusivamente dados que já existem no CIAARA-11 — nenhum campo novo de cadastro é criado para alimentá-la.
3. Nenhuma dimensão fora do escopo (discente, infraestrutura) aparece.
4. Os dados exibidos são derivados das mesmas fontes do resto do sistema, sem consulta paralela.

**Dependências.** Épicos 1, 2, 4, 5. Isolado — pode entrar a qualquer momento depois do Épico 5.

**Riscos.** O risco é de **escopo**, não técnico: a tentação de "já que estamos aqui, gerar a planilha". Barrado pelo critério de contenção.

**Esforço: P.**

---

## 4. Rastreabilidade — as 39 specs da v2.0 → épicos da v2.1

A v2.0 executou **39 specs Spec Kit**, de `001-migracao-saneamento-dados` a `039-cronograma-gantt-sst`. Nove fecharam épicos inteiros (A a I); trinta entregaram funcionalidade nova, refinamento de UI ou correção sobre o que já existia. **A v2.1 não descarta esse trabalho.** Cada spec tem destino num épico da v2.1.

A coluna "Destino v2.1" traz o épico **primário** primeiro; quando a spec atravessa mais de um, os demais aparecem em seguida.

| Spec v2.0 | Tema | Épico v2.0 | Destino v2.1 |
|---|---|---|---|
| `001-migracao-saneamento-dados` | Migração e saneamento da base | C | **1**, **2** |
| `002-categorizacao-atividades-letivas` | Taxonomia AEC/TAD/TR/Estudo Individual, tetos | E | **9** |
| `003-simplificacao-avaliacoes` | Avaliações por situação de execução | I | **8** |
| `004-rbac-ampliado-usuarios` | Perfis ampliados, escopo, gestão de usuários | F | **3**, **1** |
| `005-modularizacao-frontend-backend` | Divisão em arquivos por domínio | B | **0**, **4** |
| `006-cronograma-motor-preditivo` | Cronograma unificado, motor multi-ano | G | **7** |
| `007-design-system-unificado` | Objeto `UI`, tokens, componentes | A | **4** |
| `008-motor-sugestao-dsa` | Sugestão semanal do DSA | H | **12** |
| `009-refatoracao-ui-ux` | Refatoração de UI/UX; campos DISC-1 aprovados | — | **4**, **5** |
| `010-hotfix-sidebar-carrossel-estatisticas` | Sidebar, carrossel, estatísticas | — | **4** |
| `011-appstate-navegacao` | Estado centralizado de navegação | D | **4** (URL + `nuqs`) |
| `012-hotfix-tratamento-erro-leitura` | Degradação segura em leitura | — | **0**, **4** (`error.tsx`) |
| `013-hotfix-carrosseis-pagina-inicial` | Carrosséis da tela Início | — | **4** |
| `014-refatoracao-modulo-instrutores` | Módulo de Instrutores | — | **5** |
| `015-hotfix-filtros-cross-instrutores` | Filtros e *cross-filtering* de instrutores | — | **5**, **4** |
| `016-ficha-formulario-instrutores` | Ficha e formulário avançado | — | **5**, **11** |
| `017-hotfix-roteamento-fonte-dsa` | Roteamento SPA, fonte Rawline, performance do DSA | — | **4**, **6** |
| `018-hotfix-nomenclatura-militar` | Nomenclatura militar e formatação | — | **4** (componente `NomeInstrutor`) |
| `019-atribuicao-disciplinas-instrutor` | Painel de atribuição de disciplinas | — | **5** |
| `020-hotfix-refinamento-listagem-instrutores` | Listagem e algoritmo de nome de guerra | — | **5**, **4** |
| `021-hotfix-graficos-siglas-cursos` | Gráficos, siglas de curso, botão reativar | — | **5**, **4** (Recharts) |
| `022-ficha-docentes-pdf` | Ficha ampliada e geração de PDF | — | **11**, **5** |
| `023-hotfix-pdf-impressao-ficha` | Motor de PDF e regras de impressão | — | **11** |
| `024-hotfix-impressao-pdf-ficha` | Cabeçalho, fluxo de impressão, tags do template | — | **11** |
| `025-ficha-spa-mascaras-schema` | Template SPA, máscaras de entrada, schema | — | **11**, **5** |
| `026-substituicao-layout-ficha-template` | Substituição estrita do layout da ficha | — | **11** |
| `027-liq-automacao` | Automação da LIQ; entidade `Turma_Disciplina` (LIQ-1) | — | **11**, **1**, **2** |
| `028-os-instrutoria` | Gerador de OS de Instrutoria | — | **11** |
| `029-turma-disciplina-instrutor` | Instrutor por turma; validação de janela | — | **5**, **1** |
| `030-ui-disciplinas-cascata` | Navegação em cascata; período/instrutor por turma | — | **5** |
| `031-disciplinas-cascata-expansao` | Cascata limpa, nomenclatura de turma, tabela expansível | — | **5** |
| `032-rateio-ch-multidisciplinar` | Rateio de CH prevista em atribuição multidisciplinar | — | **5**, **7** |
| `033-limpeza-schema-disciplinas` | Colunas mortas; coerência de datas por turma | — | **1**, **2** |
| `034-hotfix-validacao-instrutor-liq` | LIQ reconhece o instrutor selecionado por turma | — | **11** |
| `035-refinamento-ui-disciplinas` | View state inicial, padronização de datas, UI/UX | — | **5**, **4** |
| `036-disciplinas-crud-antiguidade` | CRUD completo e ordenação hierárquica por antiguidade | — | **5** |
| `037-filtros-status-grafico-disciplinas` | Filtros avançados e gráfico proporcional | — | **5**, **4** |
| `038-hotfix-edicao-inline-datas-admin` | Remoção de edição inline, persistência de datas, permissão de Admin | — | **5**, **3** |
| `039-cronograma-gantt-sst` | Visão Gantt do cronograma | — | **7** |

### 4.1 Cobertura por épico da v2.1

| Épico v2.1 | Specs v2.0 que nele desaguam | Observação |
|---|---|---|
| **0** Fundação | 005, 012 | Estrutura e degradação segura |
| **1** Schema + RLS | 001, 004, 027, 029, 033 | Toda decisão de schema já tomada |
| **2** ETL | 001, 027, 033 | Reaproveita `migracao/*.py` |
| **3** Auth + RBAC | 004, 038 | Mecanismo de auth **substituído**, requisito preservado |
| **4** Design System + shell | 005, 007, 009, 010, 011, 012, 013, 015, 017, 018, 020, 021, 035, 037 | 14 specs — a maior concentração de refinamento visual |
| **5** Cadastros | 009, 014, 015, 016, 019, 020, 021, 022, 025, 029, 030, 031, 032, 035, 036, 037, 038 | 17 specs — a maior massa funcional |
| **6** DSA | 017 | Funcionalidade da v1.0; a spec tocou performance |
| **7** Cronograma + motor | 006, 032, 039 | Inclui o Gantt |
| **8** Avaliações | 003 | — |
| **9** Atividades + tetos | 002 | Fechado e confirmado por Bernardo |
| **10** Relatórios | — | Funcionalidade da v1.0, sem spec dedicada — **não** dispensada |
| **11** LIQ/OS/Ficha | 016, 022, 023, 024, 025, 026, 027, 028, 034 | 9 specs — todo o bloco de documentos oficiais |
| **12** Sugestão do DSA | 008 | Fatiamento (i)/(ii)/(iii) preservado |
| **13** ROTA | — | Épico J nunca virou spec; mantido no backlog |

**Duas leituras que este quadro permite.** Primeira: **nenhuma spec fica órfã** — as 39 têm destino. Segunda: os épicos **10** e **13** não têm spec de origem, e é justamente por isso que precisam de atenção. Funcionalidade sem spec na v2.0 é funcionalidade que ninguém reespecificou recentemente — no caso do Relatório, porque já funcionava desde a v1.0; no caso da ROTA, porque nunca foi construída. São os dois pontos do backlog com maior risco de subestimação.

---

## 5. Decisões pendentes que atravessam o backlog

Herdadas de `docs/arquitetura/01-schema.md` §7 e §8 e detalhadas no documento 05 §9. Nenhuma é reaberta aqui; o que este backlog acrescenta é **onde cada uma bloqueia**.

| # | Decisão | Impacto | Bloqueia | Recomendação desta revisão |
|---|---|---|---|---|
| **UE-1** | Unidade de Ensino como entidade (diário de classe abaixo da disciplina) | **Alto** | ~~Épico 1~~ — **DECIDIDO em 26/08/2026** | **Rota (b)**, por decisão de Bernardo: o fato de execução vai ao **grão de UE** e a disciplina é o agregado (VIEW). A recomendação desta revisão era a rota (a) para a primeira entrega; a rota (b) foi escolhida pela coerência conceitual, assumindo que CHD, DSA, Cronograma e motor preditivo entram no Épico 1 desde o primeiro dia. Registro em documento 05 §9.1 e na constitution §Governança |
| **TURMA-1** | Status "Arquivada" no domínio de turma | Baixo | ~~Épico 1~~ — **DECIDIDO em 28/08/2026** | **Filtro de apresentação**, por decisão de Bernardo: a recomendação desta linha foi acolhida. O domínio `status_turma` fica com os quatro valores reais (`planejada`, `ativa`, `concluida`, `cancelada`); "Arquivada" é VIEW e **não** entra no `ENUM`. Registro em documento 05 §9.2 |
| **LIQ-3** | Papel titular/reserva na atribuição | Médio | **Épico 11** (aditivo, não bloqueia o Épico 1) | Preferir inteiro `ordem_prioridade` a `ENUM` de três valores, com `UNIQUE` na posição. Pergunta a responder: o papel é **da grade** ou **da turma**? Depois de LIQ-1, provavelmente da turma |
| **LIQ-4** | Persistência da LIQ emitida | Médio | **Épico 11** | Implementar apenas a persistência do que foi emitido (ano, trimestre, versão, nº do Ofício, status, URL), com índice parcial de uma aprovada por trimestre. **Não** implementar workflow de aprovação da DHN — está fora da Matriz de Responsabilidades da CIAARA-11 |
| ~~**P-1**~~ | `turma_disciplina` fora do mapa do BRIEF §2.1 | Alto (documental) | ✅ **ATENDIDO** — verificado em 30/08/2026 (achado A-4) | A linha `Turma_Disciplina → turma_disciplina` **já consta** do BRIEF §2.1 (item 8), e a tabela foi criada em M2 do Épico 1 com as 210 linhas previstas. Continuava listado como pendente por engano |

**LIQ-2 permanece fechado.** `Instrutor_Impedimento` **não será criada**; a coluna "Observação" da LIQ sai sempre vazia. Decisão de Bernardo, 2026-08-20. Registrada aqui para que nenhum épico a reabra por engano.

---

## 6. Sequenciamento recomendado

### 6.1 A espinha obrigatória: 0 → 1 → 2 → 3 → 4

Esta sequência não é preferência; é dependência dura.

| Passo | Por quê **precisa** vir aqui |
|---|---|
| **0 → 1** | Não se escreve migration sem repositório, CLI conectada e CI que a aplique em preview. Sem o Épico 0 não há onde a migration viver nem como validá-la |
| **1 → 2** | Não se carrega dado numa tabela que não existe. E carregar antes das constraints estarem declaradas é pior que não carregar: o dado entra sujo e as constraints depois falham em massa, sem indicar a causa |
| **2 → 3** | **Sem dado migrado não há o que proteger** (BRIEF §8). Escrever RLS contra tabelas vazias produz policies que passam em todo teste e falham no primeiro dado real, porque o caso interessante — "este usuário vê estas linhas e não aquelas" — só existe quando há linhas |
| **3 → 4** | O shell precisa saber quem está logado para montar navegação e ocultar o que o perfil não pode. Construir shell antes de auth significa reescrever o layout depois |

**Nuance importante sobre 2 antes de 3.** A inversão é contraintuitiva — o instinto é proteger antes de povoar. A justificativa do BRIEF é operacional e correta: durante o Épico 2, o único acesso ao banco é o do ETL, com `service_role`, num ambiente que ainda não tem usuário nenhum. Não há exposição real. Já uma suíte de RLS validada contra dados reais é qualitativamente diferente de uma validada contra fixtures — e é a única que prova alguma coisa.

### 6.2 Depois do 4: por valor, respeitando dependências

Do Épico 5 em diante a ordem é por **valor entregue**, com as dependências reais como única restrição.

| Ordem | Épico | Justificativa |
|---|---|---|
| 5 | **5 — Cadastros** | Maior massa funcional (17 specs) e pré-requisito de todo o resto. Sem cadastro não há o que lançar, cronogramar ou imprimir. Subdividir em cursos+turmas → disciplinas → instrutores |
| 6 | **6 — DSA** | A tela mais usada do sistema. Primeiro valor operacional visível ao usuário final |
| 7 | **9 — Atividades + tetos** | Pequena, já validada em produção na v2.0, e **pré-requisito de totais** para os épicos 7 e 10. Vem antes do Cronograma por isso |
| 8 | **8 — Avaliações** | Baixo risco, escopo contido, e completa o DSA (avaliação aparece na grade) |
| 9 | **7 — Cronograma + motor** | Depende de 5, 6 e 9. É o épico de maior densidade de regra; entra quando o domínio já está estável |
| 10 | **10 — Relatórios** | Depende de 6, 7 e 9 para que os totais fechem entre os três módulos |
| 11 | **11 — LIQ/OS/Ficha** | Depende só de 5 — **pode ser antecipado** (ver §6.3). Colocado aqui por valor relativo, não por dependência |
| 12 | **12 — Sugestão do DSA** | Depende de 6 e 7. É melhoria sobre funcionalidade que precisa estar madura antes |
| 13 | **13 — ROTA** | O mais isolado e de menor risco. Encaixável a qualquer momento depois do 5 |

### 6.3 O que pode ser paralelizado

| Pode correr em paralelo | Com | Condição |
|---|---|---|
| **Épico 4** (Design System) | Épicos 1, 2, 3 | Não depende de dado. Tokens, componentes e shell podem ser construídos sobre dados sintéticos. **É a paralelização de maior ganho do backlog** — tira o épico G da UI do caminho crítico |
| **Épico 4** e **Épico 5** | Entre si, parcialmente | Componentes CIAARA (`TabelaDensa`, `FiltroAvancado`, `CardKpi`) podem ser desenvolvidos com os cadastros como primeiro consumidor real, em vez de em isolamento |
| **Épico 11** (LIQ/OS/Ficha) | Épicos 6, 7, 8, 9 | Depende só de 5. Uma segunda frente pode atacá-lo assim que o cadastro de instrutores estiver de pé |
| **Épico 13** (ROTA) | Qualquer coisa depois do 5 | Isolado por construção |
| Funções puras de `lib/dominio/` | **Todos os épicos** | Portar as ~40 regras `RN-` como funções puras com testes Vitest **não depende de banco nem de UI** e pode começar logo após o Épico 0. É a segunda maior oportunidade de paralelização, e reduz o risco dos épicos 6, 7 e 12 |

### 6.4 O que **não** deve ser paralelizado

| Nunca em paralelo | Por quê |
|---|---|
| Épicos 1 e 2 | Constraint declarada depois de dado carregado falha em massa, sem indicar causa |
| Épicos 2 e 3 | RLS ativa durante o ETL transforma cada erro de carga num erro de permissão indistinguível |
| Épicos 7 e 12 | O motor de sugestão consome a distribuição do cronograma; construir os dois ao mesmo tempo é construir sobre alvo móvel |
| Duas frentes escrevendo migrations | Conflito de ordenação de migrations é caro de resolver. Uma frente detém a caneta do schema |

### 6.5 Resumo do sequenciamento

```
Caminho crítico:   0 → 1 → 2 → 3 → 5 → 6 → 9 → 8 → 7 → 10 → 12
Paralelo desde 0:  4 (Design System + shell)  ·  lib/dominio/ (regras RN- puras)
Paralelo desde 5:  11 (LIQ/OS/Ficha)  ·  13 (ROTA)
Decisão antes de 1: nenhuma pendente   [UE-1 rota (b) 26/08 · TURMA-1 28/08 · P-1 já atendido]
Decisão antes de 11: LIQ-3 · LIQ-4
```

---

## 7. Rastreabilidade do documento

| Origem | Destino nesta revisão |
|---|---|
| Documento 06 da v2.0, épicos A–J | §2 (mapa de destino) e §3 (os catorze épicos) |
| Documento 06 da v2.0, sequenciamento | §6, reescrito para as dependências da plataforma nova |
| 39 specs Spec Kit da v2.0 | §4, tabela de rastreabilidade completa, com cobertura por épico em §4.1 |
| `01-schema.md` §7 e §8 (achados abertos) | §5, com o ponto de bloqueio de cada decisão |
| Documento 05 da v2.1 | Fonte do escopo dos épicos 1 e 2, e das decisões pendentes |
| BRIEF §8 | Os catorze épicos e sua ordem, seguidos exatamente |
| BRIEF §7 | Definition of Done, aplicada a toda fatia |
| BRIEF §9 | Invariáveis citadas em cada épico onde incidem |

**Requisitos revogados neste documento, com substituto nomeado:** `RNF-PLAT-01` a `RNF-PLAT-04` (proibição de framework, banco externo, bundler e CI/CD) → stack do BRIEF §1. `RF-AUTH-01` e `RN-RBAC-01` (conta Google via `Session.getActiveUser()`) → e-mail/senha por convite do Admin (BRIEF §3). `RF-MOD-04` (aviso de implantação parcial) → build atômico e deploy versionado; implantação parcial deixa de ser estado possível.

**Requisitos absorvidos pela plataforma:** `RNF-SEG-02` (verificação no servidor) → RLS. `RF-CRUD-02` (reconhecimento automático de coluna nova) → tipos gerados + Zod. `RF-CRUD-03` (não sobrescrever coluna calculada) → `GENERATED` não é gravável. O contrato de coluna de `_Meta_Colunas` → `information_schema` + `lib/tipos/database.ts`.

**Nenhum requisito foi apagado.** Todo item que perdeu sentido está marcado, com o motivo e o substituto — a trilha da v2.0 até a v2.1 é seguível de ponta a ponta.
