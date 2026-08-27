---
title: "CIAARA-11 v2.1 — Prompts por Épico"
author: "Prompts de partida, prontos para copiar e colar"
date: "26/08/2026"
version: "2.1"
---

# Prompts por Épico — CIAARA-11 v2.1

**Status:** v1.0 · **Complementa:** `Fase 1 - Requisitos/10-Plano-de-Execucao-Vibe-Coding.md` (o
roteiro) e `Vibe Coding/41-Guia-de-Vibe-Coding.md` (a técnica) · **Subordinado a:**
`Vibe Coding/40-Constitution-v2.1.md`

---

## Como usar

Cada épico traz **um prompt pronto para copiar e colar**, seguido do que fazer nos passos seguintes
do ciclo e do portão de saída. Os prompts são de **partida** — abrem a fatia; não a fecham.

**Três regras de uso:**

1. **Cole inteiro.** Cada prompt já traz contexto, identificadores, restrições, critérios e o "o que
   não fazer". Cortar a última seção é cortar justamente a parte que evita o retrabalho.
2. **Épicos grandes viram várias fatias.** Os épicos **4, 5 e 7** são grandes demais para uma feature
   só. Onde houver subdivisão sugerida, use-a: uma fatia = uma feature = um PR.
3. **Antes de colar, confira o pré-requisito.** Alguns épicos dependem de decisão do Bernardo que
   ainda pode estar pendente. Colar mesmo assim produz uma spec construída sobre suposição.

**Convenção de caminho:** os prompts assumem a suíte copiada para `docs/` dentro do repositório
(documento 10 §3.1) — `docs/fase-1/`, `docs/fase-2/`, `docs/fase-3/`, `docs/sql-referencia/`,
`docs/vibe-coding/`, `docs/BRIEF-v2.1.md`.

**Rodapé comum.** Todo prompt termina com a mesma cláusula, e ela não é decorativa:

> *Se qualquer regra parecer errada, **liste ao final** em vez de corrigir. Se faltar informação,
> **pergunte** em vez de assumir.*

---

## Épico 0 — Fundação: repositório, Next.js, Supabase, CI, tipos gerados

**Comando:** conversa normal (não `/speckit.specify` — é encanamento, não fatia de domínio).
**Pré-requisito:** ambiente do documento 10 §2 conferido; gerenciador de pacotes decidido.

```
Estamos iniciando o Épico 0 (Fundação) da v2.1 do CIAARA-11. O repositório GitHub e o
projeto Supabase JÁ EXISTEM, criados pelo Bernardo. Seu trabalho é fazer o scaffold DENTRO
do repositório já clonado — não crie repositório, não crie projeto Supabase, não crie
projeto na Vercel.

Leia antes: docs/BRIEF-v2.1.md §1 e §4; docs/fase-1/06 (Épico 0, integral);
docs/fase-2/24 (§1 árvore, §5 configuração, §6 Git e CI, §7 scripts);
docs/fase-2/20 §11 (riscos R-01, R-02, R-04, R-09, R-10);
docs/vibe-coding/40-Constitution-v2.1.md (Princípio III e Restrições Adicionais).

OBJETIVO: um repositório que compila, testa e implanta sozinho, com o Supabase vinculado e
os tipos do banco gerados por comando. Portão: primeira preview verde na Vercel.

ESCOPO:
1. Scaffold do Next.js 15 (App Router, React 19, TypeScript strict, Tailwind v4, ESLint,
   import alias "@/*") dentro do repositório existente, preservando o .git.
2. tsconfig.json com strict: true, conforme documento 24 §5.1.
3. Estrutura de diretórios do BRIEF §4: app/, components/{ui,ciaara,graficos,impressao}/,
   lib/{supabase,dominio,validacao,acoes,tipos}/, supabase/, scripts/etl/,
   tests/{unidade,invariantes,e2e}/, docs/.
4. lib/dominio/ criado e VAZIO, com a regra imposta por ESLint: nada em lib/dominio/
   importa @supabase/*, @/lib/supabase/*, next/*, react ou react-dom.
5. lib/supabase/{client,server,middleware,admin}.ts com @supabase/ssr. admin.ts começa com
   import "server-only" e é o ÚNICO arquivo que lê SUPABASE_SERVICE_ROLE_KEY. Regra ESLint
   no-restricted-imports barrando @/lib/supabase/admin em arquivos "use client".
   Resolva AQUI as armadilhas de cookie/sessão do @supabase/ssr com App Router — não
   espalhadas pelos épicos seguintes.
6. supabase init + config.toml. Tipos: script db:tipos gerando lib/tipos/database.ts.
7. Vitest, Playwright e pgTAP configurados e RODANDO VAZIOS (um teste trivial em cada).
8. Scripts de package.json copiados INTEGRALMENTE do documento 24 §7, com os comentários.
9. .github/workflows/ci.yml com os três jobs do documento 24 §6.4: qualidade
   (typecheck, lint, unidade), banco (supabase start → db reset → conferência dos tipos
   gerados → pgTAP → RLS) e build.
10. .env.local.example completo e comentado, SEM NENHUM SEGREDO REAL.
11. .github/pull_request_template.md conforme documento 24 §6.3.

FORA DE ESCOPO: nenhuma tabela (Épico 1). Nenhuma tela de negócio. Nenhum dado (Épico 2).
Tokens do Design System (Épico 4) — aqui entra só o Tailwind cru funcionando.

CRITÉRIOS DE ACEITE (documento 06, Épico 0):
1. git clone + install + dev sobe a aplicação num ambiente limpo, seguindo SÓ o README.
2. Push em branch gera preview na Vercel com URL própria.
3. O CI roda typecheck, lint, vitest e playwright e FALHA o merge se qualquer um falhar.
4. lib/tipos/database.ts é gerado por comando documentado e o CI falha se estiver
   desatualizado em relação às migrations.
5. A regra de lint impede import de supabase dentro de lib/dominio/ — COM UM TESTE QUE
   PROVA A REGRA ATIVA (fixture em tests/unidade/lint/ + verificação que espera falha).
6. .env.local.example lista toda variável necessária, sem segredo real.

ARMADILHAS DESTE ÉPICO:
- create-next-app apagando o .git ou o README do repositório existente. Confira antes.
- Sobre-engenharia de CI antes de haver o que testar: mantenha mínimo e cresça com os
  épicos.
- Esquecer o import "server-only" em admin.ts — é a defesa que quebra o BUILD, não o
  runtime, e é a única que impede o deploy de sair com a chave vazando.
- Criar regra de lint sem o teste que prova que ela está ativa. Regra que ninguém
  verificou é regra que alguém desligou sem perceber.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Depois:** rode o critério 1 de verdade, numa pasta nova. É o que mais é declarado sem ser
verificado. Quebre o CI de propósito uma vez (`const x: number = "a"`) para provar o critério 3.

**Portão de saída:** os seis critérios verificados um a um, e a primeira preview aberta no navegador.

---

## Épico 1 — Schema PostgreSQL + RLS + matriz de permissões

**Comando:** `/speckit-specify` · **Esforço: G** · **Pré-requisito UE-1: ATENDIDO** — rota (b), 26/08/2026.

```
/speckit.specify Épico 1 da v2.1 — Schema PostgreSQL, RLS e matriz de permissões.

DECISAO UE-1 — TOMADA EM 26/08/2026, ROTA (b). Nao e mais pergunta, e restricao:
- unidades_ensino e entidade de primeira classe: FK disciplina_id -> disciplinas(id),
  unique (disciplina_id, numero_ue), numero_ue > 0.
- registros_aula NASCE NO GRAO DE UNIDADE DE ENSINO, nao no grao de disciplina.
- "CH executada da disciplina" e DERIVADA — VIEW ou GENERATED. Segunda coluna gravada e
  defeito, nao otimizacao (documento 05 §7.6).
- CHD, DSA, Cronograma e motor preditivo leem o agregado, nao o fato bruto — salvo a tela
  do diario de classe, onde a UE e o objeto explicito.
Registro: documento 05 §9.1 e constitution §Governanca. NAO reabrir a comparacao (a) x (b).

Leia antes: docs/fase-1/05 (integral — entidades, §5.2 cardinalidade, §7.2 unicidade,
§7.3 CHECK, §7.6 derivados, §9 decisões pendentes, §10 volumes);
docs/fase-2/21 (DDL comentado tabela a tabela);
docs/sql-referencia/*.sql NA ORDEM NUMÉRICA (00 a 05) — é a ordem de execução;
docs/fase-2/22 (§5 permissão × alcance, §6 as policies, §7.3 o GRANT de extensions);
docs/BRIEF-v2.1.md §2 (convenções) e §2.1 (mapa de tabelas — use EXATAMENTE estes nomes);
docs/fase-1/06 (Épico 1).

OBJETIVO: o modelo conceitual do documento 05 vira DDL executável, com integridade
referencial, unicidade, domínios, vigência por EXCLUDE e RLS em toda tabela.

ESCOPO:
- As 24 entidades do documento 05 §3, com os nomes do BRIEF §2.1 — incluindo
  turma_disciplina (210 linhas reais, com id_instrutor e ch_prevista_por_instrutor) e
  configuracoes_horario (o cabeçalho que elimina as chaves órfãs D/E).
- Convenções obrigatórias em toda tabela: id uuid PK default gen_random_uuid();
  codigo text unique not null (o ID_* da v2.0); origem_migracao_v1; status explícito
  (ativo/inativo, NUNCA inferido de NULL); quarteto de auditoria + trigger
  app.set_auditoria().
- FKs conforme a matriz de cardinalidade, com on delete restrict como regra geral.
- As sete regras de unicidade do documento 05 §7.2, incluindo o índice parcial
  UNIQUE (ano_letivo) WHERE status_previa = 'salvo'.
- Sete ENUM normativos fechados (BRIEF §2) + FK para config_listas no domínio
  administrável.
- CHECK condicionais do documento 05 §7.3: escopo global/turma, fiscal exclusivo, linha de
  disciplina no planejamento.
- Vigência: btree_gist + EXCLUDE em curso_regime_historico e responsaveis_curso.
- Derivados: GENERATED ALWAYS AS ... STORED onde imutável; VIEW onde depende de now() ou
  de agregação.
- ENABLE ROW LEVEL SECURITY em TODA tabela. Policies que consultam perfil_permissao.
- Funções do schema app, todas SECURITY DEFINER, STABLE, com search_path fixo:
  usuario_atual(), perfil_atual(), pode(recurso,acao), eh_admin(), cursos_do_usuario(),
  alcanca_curso/turma/disciplina().
- perfil_permissao (perfil, recurso, acao, permitido) populada por seed.sql.
- config_parametros populada: tetos AEC 10% / TAD 5% / TR 10%, faixas de CH docente
  (20h → 8-12h, 40h → 16-24h, DE → 16-30h), limite de TA por dia.
- grant usage on schema extensions to authenticated — sem isso TODO INSERT de usuário
  autenticado falha (documento 22 §7.3, achado do teste T-04).
- Suíte pgTAP inicial: integridade referencial, unicidade, contagem por tabela.

FORA DE ESCOPO: carga de dado histórico (Épico 2). Telas de administração (Épico 3).
Entidades das decisões AINDA PENDENTES: liq_emitida, papel_liq.
unidades_ensino NAO esta fora de escopo — entrou por forca da decisao UE-1 rota (b).

CRITÉRIOS DE ACEITE (documento 06, Épico 1):
1. supabase db reset reconstrói o schema do zero, sem erro e sem passo manual.
2. Toda tabela tem RLS; um teste prova que tabela sem policy é inacessível ao cliente
   anônimo e ao autenticado sem permissão.
3. Cada uma das sete regras de unicidade tem teste pgTAP que TENTA VIOLÁ-LA E ESPERA A
   FALHA.
4. Cada CHECK condicional tem teste que prova a rejeição do caso inválido.
5. Dois regimes ativos do mesmo tipo com intervalos sobrepostos no mesmo curso FALHAM.
6. app.pode('disciplinas','editar') é coerente com perfil_permissao para cada perfil.
7. Trocar uma permissão é um UPDATE em perfil_permissao e NÃO exige migration — provado
   por teste que altera a linha e observa a mudança de comportamento da policy.
8. UPDATE em coluna GENERATED falha.
9. migracao_log não aceita UPDATE nem DELETE de nenhum perfil.

ARMADILHAS DESTE ÉPICO:
- NÃO crie policy FOR DELETE em nenhuma tabela. A ausência é a implementação física de
  RN-INST-05 generalizada (exclusão lógica universal). É regra de negócio, não lacuna.
- UPDATE precisa de WITH CHECK além do USING. Sem ele, um Operador reatribui um registro a
  uma turma fora do escopo dele e LEVA O DADO JUNTO, sem violar nada (teste T-03).
- Nenhuma policy contém perfil = 'operador' literal. Toda policy pergunta app.pode().
- Auto-escalonamento de perfil NÃO se fecha com policy (ela não enxerga OLD/NEW): exige o
  gatilho app.impedir_autoescalonamento (documento 22 §6.3, teste T-05).
- SECURITY DEFINER nessas funções não é preferência: é o que quebra a recursão infinita da
  policy de usuarios. E NENHUMA dessas tabelas recebe FORCE ROW LEVEL SECURITY.
- ENUM fechado cedo demais é migration para desfazer. Na dúvida entre ENUM e
  config_listas, é config_listas.
- NÃO recrie as colunas mortas que a spec 033 da v2.0 removeu de disciplinas.
- app.set_auditoria() quebra no caminho do ETL se assumir sessão autenticada: auth.uid()
  devolve NULL sem JWT. Use o invólucro app.jsonb_valor() (documento 22 §8.1).

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**No `/speckit.plan`:** exija uma migration por grupo temático, na ordem dos scripts de `docs/sql-referencia/`, cada
uma aplicável isoladamente e com plano de reversão. **Uma frente só detém a caneta do schema.**

**Portão de saída:** `supabase db reset` limpo + os nove critérios verdes + a suíte pgTAP inicial no
CI.

---

## Épico 2 — ETL Sheets → PostgreSQL + reconciliação

**Comando:** `/speckit.specify` · **Esforço: M** · **Pré-requisito:** Épico 1 fechado; decisão sobre
hospedagem fora da infraestrutura da MB encaminhada.

```
/speckit.specify Épico 2 da v2.1 — ETL Sheets → PostgreSQL com reconciliação verificável.

Leia antes: docs/fase-3/30 (plano de migração: ordem de carga, congelamento de escrita,
corte, reconciliação, critério de aborto e rollback);
docs/fase-3/31 (mapa de-para, aba por aba e coluna por coluna);
docs/fase-1/05 §10 (volumes — são os números que a reconciliação precisa fechar);
docs/fase-1/06 (Épico 2); docs/vibe-coding/40 (Princípio IV — integridade do histórico).

OBJETIVO: trazer 100% do histórico da planilha "Banco de dados CIAARA-11 v2.0" (23 abas)
para o PostgreSQL, com reconciliação verificável linha a linha.

ESCOPO:
- Extração Sheets → CSV por aba, com SNAPSHOT DATADO E IMUTÁVEL do arquivo de origem.
  A planilha continua sendo escrita em produção — a extração é um ponto no tempo.
- Carga CSV → COPY para tabelas de STAGING COM TIPO text, depois conversão EXPLÍCITA e
  asserção por coluna antes do INSERT ... SELECT nas tabelas finais.
- codigo recebe o ID_* da v2.0 VERBATIM; FKs resolvidas por lookup codigo → id.
- origem_migracao_v1 preenchido em toda linha.
- migracao_log transportada INTEGRALMENTE (717+ linhas históricas, INTACTAS) e continuada
  com as linhas desta migração.
- Reconciliação: contagem por tabela contra o documento 05 §10.
- As três identidades aritméticas: registros_aula 1.566 + 1 transferida + 186 avaliações
  = 1.753; atividades_nao_letivas 663 + 1 = 664; categorias 531 Estudo Individual + 62 AEC
  + 60 TAD + 11 TR = 664.
- Zero FK órfã em toda a base, provado após a carga.
- Idempotência: reexecutar o ETL do zero produz exatamente o mesmo resultado.
- Procedimento documentado de reversão ao estado anterior.
- Preenchimento do nominal do Encarregado da Divisão em responsaveis_curso (achado (b)).
- Reaproveite os scripts migracao/*.py da v2.0 já validados, incluindo
  criar_turma_disciplina.py, corrigir_vinculo_orfao_instrutor_disciplina.py,
  normalizar_posto_graduacao.py e renumerar_ids_migracao_avaliacoes_eventos.py.

FORA DE ESCOPO: correção de conteúdo de negócio. A v2.0 JÁ SANEOU — o ETL transporta, não
reinterpreta. Nenhuma recategorização nova. Nenhuma tela.

CRITÉRIOS DE ACEITE (documento 06, Épico 2):
1. Contagem de cada tabela bate EXATAMENTE com o documento 05 §10; divergência de UMA
   linha bloqueia.
2. As três identidades aritméticas fecham, verificadas por pgTAP.
3. Zero FK órfã em toda a base.
4. Toda linha migrada tem codigo não nulo e único, e origem_migracao_v1 preenchido.
5. migracao_log contém as 717+ linhas históricas INTACTAS — nenhuma reescrita — mais as
   novas.
6. Reexecutar do zero produz base idêntica em contagens e checksums por tabela.
7. As 210 linhas de turma_disciplina chegam com 89 períodos herdados e 121 em branco,
   exatamente como na origem.
8. Não regressão por invariante estrutural, NUNCA por diff com a saída histórica de um
   curso específico. A CAHO 2026 permanece rejeitada como padrão-ouro (Bernardo,
   2026-08-10). Inegociável.

ARMADILHAS DESTE ÉPICO:
- "Aproveitar e corrigir" um dado durante o transporte. PROIBIDO. Correção de conteúdo é
  evento separado e logado, nunca embutido no ETL.
- Tipo mal convertido em silêncio: data como texto, "1900-03-15" interpretado como
  intervalo. Por isso staging com tipo text e asserção por coluna.
- Timezone deslocando datas em um dia: timestamptz, banco em UTC, conversão explícita de
  America/Sao_Paulo na extração, teste com datas de fronteira.
- Preencher os 121 períodos em branco de turma_disciplina "porque ficaria mais completo".
  Eles estão em branco na origem e precisam chegar em branco — é o alvo do achado LIQ-1 e
  a regra de bloqueio da LIQ depende disso.
- Rodar o ETL com RLS ativa e sem service_role: cada erro de carga vira erro de permissão
  indistinguível. O ETL roda com service_role, num ambiente sem usuário nenhum.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**No `/speckit.plan`:** exija **modo de simulação** que produz o relatório completo sem escrever
nada, e relatório de reconciliação por entidade com contagem origem × destino.

**Portão de saída:** reconciliação fechando em todas as entidades e o ETL executado **duas vezes do
zero** sobre o snapshot, com resultado idêntico.

---

## Épico 3 — Auth por convite, gestão de usuários, RBAC

**Comando:** `/speckit.specify` · **Esforço: M** · **Pré-requisito:** Épicos 1 e 2 (a ordem 2 antes
de 3 é deliberada: sem dado migrado não há o que proteger).

```
/speckit.specify Épico 3 da v2.1 — Autenticação por convite, gestão de usuários e RBAC.

Leia antes: docs/fase-2/22 (§3 convite, §4 ciclo de vida da conta, §5 permissão e alcance,
§6 policies, §7 segredos, §10 testes de segurança);
docs/BRIEF-v2.1.md §3; docs/fase-1/01 (§2.2 matriz de perfis, §2.5 perfil × recurso ×
ação); docs/fase-1/06 (Épico 3).

OBJETIVO: quem entra é quem o Admin convidou, e o que cada um faz é o que a matriz
permite — verificado PELO BANCO, não pela interface.

ESCOPO:
- Supabase Auth, e-mail/senha SOMENTE POR CONVITE DO ADMIN. Signup público desabilitado no
  painel do Supabase (passo manual, documente-o).
- Fluxo: Admin cadastra → Server Action com service_role chama
  auth.admin.inviteUserByEmail() → /convite/[token] → definição de senha → primeiro acesso.
- Senha: mínimo 12 caracteres, verificação contra vazamentos (HaveIBeenPwned, nativo no
  Supabase), SEM expiração compulsória.
- usuarios.auth_user_id uuid unique references auth.users(id) on delete restrict.
- /admin/usuarios: listar, convidar, editar perfil e escopo, inativar, reenviar convite.
- Os ~12 perfis organizacionais do documento 01, com escopo_curso e usuario_curso (N:N)
  para o Encarregado de Curso.
- Tela de leitura da matriz perfil_permissao; edição restrita ao Admin.
- Middleware de refresh de sessão; redirecionamento de rota protegida.
- /recuperar-senha.
- usuarios.ultimo_acesso atualizado no login; criado_por/editado_por por trigger a partir
  de auth.uid().

FORA DE ESCOPO: SSO, MFA, federação com conta institucional. Auto-cadastro em qualquer
forma.

DESTINO DOS REQUISITOS — declare isto na spec: RF-AUTH-01 e RN-RBAC-01 (autenticação
exclusivamente por conta Google via Session.getActiveUser(), decisão D1 da v2.0) são
[REVOGADO — v2.1]: dependiam do runtime Apps Script. Substituídos por e-mail/senha por
convite (decisão de Bernardo em 25/08/2026). O requisito subjacente — só acessa quem o
Admin cadastrou — é PRESERVADO INTEGRALMENTE. RNF-SEG-02 é [ABSORVIDO PELA PLATAFORMA]:
deixa de ser disciplina de código e passa a ser RLS.

CRITÉRIOS DE ACEITE (documento 06, Épico 3):
1. Um e-mail não convidado NÃO consegue criar conta por NENHUM caminho, inclusive chamando
   a API diretamente.
2. Convite → definição de senha → primeiro acesso funciona ponta a ponta em preview.
3. Senha com menos de 12 caracteres é recusada; senha em lista de vazamento é recusada.
4. Para CADA perfil existe teste que prova que o banco NEGA ao menos uma leitura e uma
   escrita fora do seu escopo. Teste negativo é obrigatório.
5. Encarregado de Curso com dois cursos em usuario_curso lê os dois e NÃO lê um terceiro.
6. Alterar uma linha de perfil_permissao muda o comportamento efetivo SEM REDEPLOY.
7. Botão fora do escopo fica oculto na UI E a ação é negada pelo banco quando invocada
   diretamente.
8. ultimo_acesso é atualizado no login.

ARMADILHAS DESTE ÉPICO:
- A Server Action de convite é o ÚNICO lugar legítimo de uso da service_role no fluxo de
  tela. Ela confere app.eh_admin() ANTES. Revise-a linha a linha sempre que mudar.
- service_role vazando para o cliente: lib/supabase/admin.ts só é importável de Server
  Action; import "server-only"; regra de lint; variável sem prefixo NEXT_PUBLIC_.
- Usuário órfão em auth.users sem linha em usuarios: transação no convite + rotina de
  conferência no CI.
- perfil_permissao, usuarios e usuario_curso são as TRÊS TABELAS DE FRONTEIRA: presas a
  app.eh_admin(), não à matriz. A matriz não pode ser autoridade sobre quem edita a matriz.
- A LEITURA de perfil_permissao é liberada a qualquer sessão autenticada — a UI precisa
  saber que botões mostrar, e esconder a matriz seria segurança por obscuridade.
- Testar só o caminho feliz de RLS não prova nada.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Portão de saída:** a suíte T-01…T-10 do documento 22 §10 verde, **com os testes negativos**.

---

## Épico 4 — Design System Tailwind/shadcn + shell de navegação por URL

**Comando:** `/speckit.specify` · **Esforço: G** · **Subdivida em três fatias:**
(a) tokens + tema, (b) componentes CIAARA, (c) shell + `/inicio`.
**Pode começar em paralelo desde o Épico 0** — não depende de dado.

```
/speckit.specify Épico 4 da v2.1 — Design System (Tailwind v4 + shadcn/ui) e shell de
navegação com a URL como fonte de verdade. FATIA (a): tokens, tema e configuração base.

Leia antes: docs/fase-2/23 (integral — tokens sob @theme, tema claro/noturno,
components/ciaara/, rotas /print/*); docs/BRIEF-v2.1.md §5 e §6;
docs/fase-1/02 (RF-DS-01 a 05, RF-DS-03.1, RF-NAV-01 a 03, RF-INI-01 a 05);
docs/fase-1/03 (RNF-USA-01 a 05); docs/fase-1/06 (Épico 4).

OBJETIVO: uma linguagem visual única e um shell em que A URL É O ESTADO.

DECLARE ISTO EXPLICITAMENTE NA SPEC (é exigência do documento 06):
- O objeto global UI da v2.0 DEIXA DE EXISTIR COMO OBJETO: vira tokens CSS + biblioteca de
  componentes tipada. RF-DS-01 ("um único ponto central de onde todas as telas obtêm cores,
  tipografia, espaçamento e estados") é PRESERVADO; o mecanismo muda e melhora — um token
  errado passa a ser erro de build, não uma cor divergente que ninguém notou.
- AppState idem: RF-NAV-01 ("um único ponto de verdade para o estado de navegação") é
  PRESERVADO, e o ponto de verdade passa a ser A URL.

ESCOPO DA FATIA (a):
- Tokens CIAARA como CSS custom properties em app/globals.css sob @theme (Tailwind v4):
  --color-ciaara-azul, --color-ciaara-ink, semânticas de status e alerta, escala
  tipográfica e de espaçamento.
- Tema claro (pastel) e noturno via next-themes, estratégia class, persistido, SEM FLASH de
  tema errado no carregamento.
- shadcn/ui inicializado, componentes base copiados para components/ui/ e VERSIONADOS.
- Fonte institucional e brasão/identidade do CIAARA (RF-INI-05).
- Auditoria de contraste AA nos dois temas.

FATIAS SEGUINTES (não implemente agora, só registre): (b) componentes CIAARA — CardKpi,
BadgeStatus, GradeAlocacao, FiltroAvancado, AlertaConformidade, TabelaDensa, SeletorTurma,
NomeInstrutor; gráficos com Recharts. (c) shell — layout raiz, navegação lateral,
cabeçalho, breadcrumb, loading.tsx e error.tsx por segmento, nuqs para
?turma=&curso=&semana=&filtros=, e a tela /inicio.

FORA DE ESCOPO: telas de domínio (épicos 5 a 13). Rotas de impressão (épicos 10 e 11).

CRITÉRIOS DE ACEITE (documento 06, Épico 4):
1. Uma cor semântica nova é adicionada em UM lugar (@theme) e propaga para todos os
   componentes que a usam.
2. Alternar tema persiste entre recargas e não produz flash de tema errado.
3. /cursos/[curso]?turma=T2&semana=34 restaurado numa aba nova reproduz exatamente a mesma
   tela.
4. Voltar e avançar do navegador funcionam em toda navegação de contexto.
5. Nenhum componente de components/ciaara/ define cor literal — só token.
6. Toda tabela densa é navegável por teclado, com foco visível.
7. Contraste AA passa em tema claro e escuro.
8. Nenhuma tela existente na v2.0 perde informação, cor semântica ou estado visual.

ARMADILHAS DESTE ÉPICO:
- Deriva visual em relação à v2.0, que o Bernardo validou tela a tela ao longo de 39
  specs. Capture o padrão atual como referência ANTES de reescrever.
- "use client" espalhando-se e anulando o ganho dos Server Components: só onde houver
  interação, nunca em page.tsx nem layout.tsx.
- Zustand virando AppState disfarçado. Escopo explícito e único: estado EFÊMERO de UI
  (rascunho de formulário longo, seleção múltipla em massa). Contexto de tela vai para a
  URL.
- Espaçado e bonito em vez de compacto e legível. É sistema de gestão, com tabelas grandes:
  densidade vence estética.
- Instalar biblioteca de componentes além de shadcn/Radix. Proibido (BRIEF §1).

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Portão de saída:** os oito critérios verdes nas três fatias, com auditoria de contraste registrada.

---

## Épico 5 — Cadastros: cursos, turmas, disciplinas, instrutores

**Comando:** `/speckit.specify` · **Esforço: G** · **Subdivida em três fatias, nesta ordem:**
(a) cursos + turmas, (b) disciplinas, (c) instrutores.

```
/speckit.specify Épico 5 da v2.1 — Cadastros. FATIA (c): INSTRUTORES.
(As fatias (a) cursos+turmas e (b) disciplinas seguem o mesmo molde, trocando o módulo e a
lista de specs de origem.)

Leia antes: docs/fase-1/02 (RF-INSTR-01 a 16, RF-CRUD-01 a 04);
docs/fase-1/04 (RN-ANT-01, RN-ANT-02, RN-CRUD-01/02/03, RN-INST-01 a RN-INST-05);
docs/fase-1/06 (Épico 5, e a tabela de rastreabilidade §4 — é a LISTA DE CONFERÊNCIA dos
refinamentos entregues pelas specs 014, 015, 016, 019, 020, 025, 036, 038);
docs/fase-2/23 (componentes) e docs/fase-2/25 (dados e estado).

OBJETIVO: o cadastro de instrutores com TODO o refinamento que a v2.0 acumulou — é a maior
massa de funcionalidade entregue e a que o Bernardo mais usou.

ESCOPO DA FATIA (c):
- CRUD com ficha e formulário avançado; máscaras de entrada.
- Filtros e cross-filtering; indicadores e gráficos (Recharts).
- Quadro de avisos de qualidade de cadastro.
- Desativação/reativação LÓGICA (status), nunca exclusão.
- Painel de atribuição de disciplinas.
- DUAS grandezas de CH, ambas CALCULADAS — nunca digitáveis.
- Comparação contra a faixa normativa do regime: 20h → 8-12h, 40h → 16-24h,
  DE → 16-30h (RN-2027-06). O teto é a FAIXA, jamais o número do regime.
- Alerta de docência > 1 ano sem capacitação didática (alerta, nunca bloqueio).
- Nome no formato P/G Especialidade Nome de Guerra, pelo componente NomeInstrutor,
  alimentado por função pura de lib/dominio/ (RF-INSTR-15, RF-DS-05).
- ORDENAÇÃO POR ANTIGUIDADE em TODA lista, todo <select> e todo filtro, SEM EXCEÇÃO.

FORA DE ESCOPO: ficha em PDF e documentos oficiais (Épico 11). Lançamento de aula
(Épico 6). Cronograma (Épico 7). Papel titular/reserva (LIQ-3, decisão pendente).

CRITÉRIOS DE ACEITE — os que se aplicam a ESTA fatia; a numeração é a do documento 06,
Épico 5, e os itens 3, 4, 5 e 7 pertencem à fatia (b), disciplinas:
1. Toda lista, <select> e filtro de instrutores ordenado por antiguidade derivada de
   posto/graduação, com antiguidade_declarada como DESEMPATE — verificado por teste
   automatizado em TODAS as ocorrências, não por amostragem.
2. Nome no formato padronizado em toda tela.
6. Desativar instrutor o remove das listas de nova atribuição e o MANTÉM em todo o
   histórico já lançado.
8. Cadastro incompleto (faltando posto, especialidade, nome, categoria ou OM) é recusado.
9. CH do instrutor NUNCA é campo digitável em nenhum formulário.

ARMADILHAS DESTE ÉPICO:
- RN-ANT-02: a antiguidade vem do POSTO/GRADUAÇÃO, não da coluna antiguidade_declarada —
  ela é só desempate. Inverter isso quebra a ordenação de todo o sistema e a seção 1 da
  LIQ.
- RN-CRUD-03: o instrutor usa inteiro simples, NÃO prefixo. Unificar quebra referências.
- Perder um refinamento de UI espalhado em quinze specs. Use a tabela §4 do documento 06
  como inventário ANTES de começar.
- Ordenação por antiguidade "na maioria das telas". É em TODAS, sem exceção — e o teste
  precisa cobrir todas.
- Transformar CH calculada em campo editável "para permitir ajuste". Proibido: é derivada.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Para a fatia (b) — disciplinas**, acrescente ao escopo: navegação em cascata (curso → turma →
disciplina) com tabela expansível; **período e instrutor por turma via `turma_disciplina`**; rateio
de CH prevista em atribuição multidisciplinar (modo Dividido/Simultâneo, soma exata sem sobra nem
falta); unicidade genérica de código **recusada pelo banco**; sinalização de disciplina sem instrutor
e de início em ≤ 30 dias. Critério crítico: *editar o período da disciplina na turma T2 **não** altera
o da T1 do mesmo curso*.

---

## Épico 6 — Detalhe Semanal de Aula (lançamento + impressão)

**Comando:** `/speckit.specify` · **Esforço: G** · **Subdivida em duas fatias:** (a) lançamento e
grade, (b) impressão `/print/dsa`.

```
/speckit.specify Épico 6 da v2.1 — Detalhe Semanal de Aula (DSA). FATIA (a): lançamento e
grade semanal.

Leia antes: docs/fase-1/02 (RF-DSA-01 a 07, RF-HOR-04, RF-HOR-06, RF-EVT-02);
docs/fase-1/04 (RN-CONF-01, RN-CONF-02, RN-MAT-01/03/04, RN-EVT-02, RN-EVT-03,
RN-CRONOS-01/03, RN-2027-09) — TEXTO INTEGRAL de cada uma;
docs/fase-1/06 (Épico 6); docs/fase-2/25.

OBJETIVO: a tela mais usada do sistema — lançar a semana de uma turma. É o produto diário
do CIAARA-11.

ESCOPO DA FATIA (a):
- Lançamento em um dia da turma nas categorias normativas; navegação semana a semana pela
  URL (?turma=&semana=), nunca por estado interno.
- Grade por dia × TA, com disciplina, conteúdo, técnica de ensino, instrutor e local;
  horário de início e fim de cada TA; intervalos e janela de almoço visíveis.
- Sinalização de conflito quando o mesmo instrutor está alocado no mesmo dia com tempos
  sobrepostos — verificada ENTRE TODAS AS TURMAS DO SISTEMA, não só a visualizada
  (RN-CONF-01).
- Situação por disciplina: Aguardando Início, Em andamento, Concluída, Conflitou; quadro de
  CH acumulada.
- Excluir pela grade (exclusão LÓGICA); reordenar e mover lançamento entre horários e
  entre dias, PRESERVANDO o registro de auditoria.
- O DSA lê o REGIME VIGENTE NA DATA DA SEMANA, nunca o regime corrente (RN-2027-09).
- Feriado de dia inteiro desconta capacidade da semana; impacto parcial ou informativo NÃO
  desconta.

Toda regra de cálculo vai para lib/dominio/ como função pura, com teste Vitest ao lado,
ANTES de existir qualquer componente.

FORA DE ESCOPO: sugestão automática de preenchimento (Épico 12). Relatório do curso
(Épico 10). Cronograma (Épico 7). A impressão vem na fatia (b).

CRITÉRIOS DE ACEITE — numeração do documento 06, Épico 6; os itens 1, 2 e 3 são de
impressão e pertencem à fatia (b):
4. Um DSA de semana anterior a uma mudança de regime é renderizado com o regime DAQUELA
   data.
5. Dois lançamentos do mesmo instrutor com TA sobrepostos no mesmo dia são sinalizados como
   conflito.
6. Feriado de dia inteiro desconta capacidade; impacto parcial ou informativo não desconta.
7. Mover um lançamento entre dias preserva o registro de auditoria.
8. Teste e2e cobre lançar → visualizar (a impressão entra na fatia (b)).

ARMADILHAS DESTE ÉPICO:
- RN-CONF-02: o horário ANCORA NO INÍCIO DO DIA, deliberadamente diferente das planilhas
  legadas. NÃO "corrija" isso — é o exemplo canônico de regra que parece errada e não é.
- RN-CONF-01 verificado só na turma visualizada. O conflito é entre TODAS as turmas.
- Cálculo de horário de TA divergindo por arredondamento de minutos: porte a função para
  lib/dominio/ com os casos das CINCO configurações reais de horário.
- Densidade da grade quebrando em tela pequena: a grade tem scroll horizontal PRÓPRIO;
  nunca scroll horizontal no body.
- await dentro de laço para montar a grade. É N+1 (risco R-02): um select com join.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Fatia (b) — impressão.** Acrescente: `/print/dsa` sem shell, servidor puro, `@media print`, quebra
de página controlada, **uma única página A4 paisagem** para uma semana cheia; rodapé de assinaturas
resolvido de `responsaveis_curso` (modo fixo e dinâmico). Critérios: *reimprimir hoje um DSA de março
traz quem assinava em março*; *o rodapé sai preenchido — o defeito do achado (b) não reaparece*;
teste e2e comparando com o layout aprovado da v2.0 (`RNF-COMP-01`).

---

## Épico 7 — Cronograma unificado + motor preditivo multi-ano

**Comando:** `/speckit.specify` · **Esforço: G** · **Subdivida em três fatias:**
(a) funções puras do motor em `lib/dominio/` **com testes, antes de qualquer UI**,
(b) cronograma previsto × realizado + Gantt, (c) prévia editável e versionamento.

```
/speckit.specify Épico 7 da v2.1 — Cronograma unificado e motor preditivo multi-ano.
FATIA (a): AS FUNÇÕES PURAS DO MOTOR, em lib/dominio/, com testes. NENHUMA UI nesta fatia.

Leia antes: docs/fase-1/04 — TEXTO INTEGRAL de RN-DIST-01/02/03, RN-2027-01 a RN-2027-09,
RN-CRONOS-01/02/03, RN-CONF-01;
docs/fase-1/02 (RF-CRONOS-01 a 10, RF-2027-01 a 05, RF-HOR-07/08/09);
docs/fase-1/06 (Épico 7); docs/fase-1/05 (planejamento_anual, curso_regime_historico).

OBJETIVO: portar o motor preditivo — a regra de negócio MAIS DENSA do sistema — como
funções puras testáveis, antes de qualquer tela. Este é o épico onde uma regra perdida
custa mais caro.

ESCOPO DA FATIA (a) — cada item é uma função pura em lib/dominio/, com o texto literal da
regra citado no topo e teste Vitest próprio:
- Distribuição semanal de CH: FUNÇÃO ÚNICA (RN-DIST-01 — é PROIBIDO existir uma segunda
  implementação; se já houver uma no repositório, REUTILIZE).
- A última semana recebe o resto (RN-DIST-02).
- Os TRÊS regimes de teto (RN-DIST-03): TFM RÍGIDO em 6 TA/semana; disciplinas de fim de
  curso SEM TETO ALGUM; demais com 25 TA/semana APENAS RECOMENDADO. São três, não um.
- Espelhamento pelo n-ésimo dia da semana do mês (RN-2027-01).
- Prova mista em bloco fechado de EXATAMENTE 3 TA CONTÍGUOS no mesmo dia, com revisão de
  1 TA em até 7 dias (RN-2027-04).
- Diluição (RN-2027-05): no máximo 4 disciplinas distintas por dia e 4 TA da mesma
  disciplina por dia.
- Faixas de CH docente por regime (RN-2027-06): 20h → 8-12h, 40h → 16-24h, DE → 16-30h.
- Mudança de regime com data de vigência aplicada DE FATO ao cálculo, sem reinterpretar
  histórico (RN-2027-09).
- Detecção de conflito entre TODAS as turmas (RN-CONF-01).

NENHUMA função desta fatia importa supabase, next ou react. Feriados, janelas de curso e
reservas do PROENS entram como PARÂMETRO, nunca como consulta.

FORA DE ESCOPO desta fatia: qualquer UI, qualquer Server Action, qualquer migration.

CRITÉRIOS DE ACEITE — numeração do documento 06, Épico 7; os itens 2 a 8 dependem de UI ou
de banco e pertencem às fatias (b) e (c):
1. O motor roda para QUALQUER ano informado; NENHUM literal de ano existe no código —
   provado por busca (grep por "2027", "2026").
9. Cada regra RN-2027-* e RN-DIST-* tem função pura própria com teste de unidade próprio,
   nomeado pelo identificador.
10. Validação por INVARIANTE MATEMÁTICO: soma de TA alocados = CH prevista; nenhuma
    alocação em feriado de dia inteiro; nenhum dia acima do limite do regime. NUNCA por
    diff com a CAHO 2026 — rejeitada como padrão-ouro em 2026-08-10.

ARMADILHAS DESTE ÉPICO — é o de maior risco de regra perdida:
- RN-2027-06 usando o NÚMERO DO REGIME como teto em vez da FAIXA. 90,4% dos instrutores
  estão em 20h; usar 20 como teto permitiria 67% acima do máximo normativo, num controle
  auditado pela CoPeCoD. É o erro mais caro possível aqui.
- RN-DIST-03 tratado como teto único. São TRÊS regimes distintos.
- Criar uma segunda implementação da distribuição semanal. RN-DIST-01 proíbe.
- Literal de ano (2027) sobrevivendo em algum canto. O motor é multi-ano por requisito.
- "Simplificar" o espelhamento do n-ésimo dia da semana para dia do mês. São coisas
  diferentes.
- RNF-NORM-04 (sequenciamento pedagógico de técnica de ensino) permanece REJEITADO: não
  implemente, não sugira, não deixe preparado.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Fatias (b) e (c).** (b) unificação Diagrama + Cronos num módulo; granularidade semana/mês/
trimestre/semestre/ano; previsto × realizado com sinalização de divergência; categorias AEC/TAD/TR/
Estudo Individual totalizadas **separadamente**; feriados como linha que desconta capacidade; filtro
por disciplina e instrutor; exportação CSV; **Gantt** (spec 039) lendo a **mesma fonte**, sem regra de
alocação própria; visão de ocupação de salas — **planejamento e leitura, nunca reserva de recurso**.
(c) prévia editável `rascunho` → `salvo`, promoção arquivando a anterior **na mesma transação**, duas
versões `salvo` no mesmo ano impossíveis, lançamento manual de eventos de calendário, prioridade
relativa ajustável.

---

## Épico 8 — Avaliações simplificadas

**Comando:** `/speckit.specify` · **Esforço: P** · **Pré-requisito:** Épicos 1, 2, 4, 5, 6.

```
/speckit.specify Épico 8 da v2.1 — Avaliações simplificadas, por situação de execução.

Leia antes: docs/fase-1/02 (RF-AVAL-01 a 06);
docs/fase-1/04 (RN-AVAL-01 revisada, RN-AVAL-02, RN-EVT-03, RN-INST-01 delimitada);
docs/fase-1/03 (RNF-NORM-06); docs/fase-1/06 (Épico 8).

OBJETIVO: acompanhar avaliação pela SITUAÇÃO DE EXECUÇÃO, sem nenhuma fórmula de nota.

ESCOPO:
- Agendamento: tipo, data, data da vista, instrutor responsável, fiscal — SEM consumir TA.
- Execução: o MESMO registro recebe ta_inicial e tempos_consumidos quando lançado no DSA;
  compõe a CHD. Agendamento e execução são UM FATO ÚNICO (RN-AVAL-02) — sem segundo
  lançamento, sem segundo cadastro.
- Vista de prova: campos próprios de posição e consumo; também compõem a CHD.
- Situação: Concluída, Em andamento, Pendente, Atrasada, Sem correspondência.
- Alerta automático quando a vista ultrapassa 7 DIAS CORRIDOS sem registro de realização.
- Fiscal: QUALQUER PESSOA, inclusive fora do cadastro de instrutores, SEM exigir
  habilitação. O aplicador, esse sim, exige habilitação na disciplina (RN-INST-01
  delimitada).
- Painel comparando avaliacoes_planejadas × avaliações reais por curso, com casamento por
  NOME NORMALIZADO, tolerante a abreviação — NUNCA por chave rígida (RN-AVAL-01).
- formula_mf e carater permanecem no schema como informativos, NÃO LIDOS POR REGRA ALGUMA.

FORA DE ESCOPO: cálculo de nota, média final, aprovação ou qualquer documento escolar.
RNF-NORM-06 — competência das divisões CIAARA-32 e CIAARA-12, não da CIAARA-11.

CRITÉRIOS DE ACEITE (documento 06, Épico 8):
1. Nenhuma tela, cálculo ou consulta depende de formula_mf ou carater — provado por BUSCA
   no código.
2. Agendar não consome TA; registrar a execução consome e compõe a CHD DO MESMO REGISTRO.
3. Vista com mais de 7 dias corridos sem registro aparece como Atrasada — teste com data
   de fronteira EXATA (7 dias não é atrasado; 8 é).
4. Fiscal externo sem cadastro de instrutor é aceito; aplicador sem habilitação na
   disciplina é recusado.
5. fiscal_id e nome_fiscal_externo preenchidos juntos são recusados PELO BANCO.
6. Toda avaliação e vista aparece corretamente no DSA da turma.
7. O sistema não expõe em lugar nenhum nota, média ou situação de aprovação de aluno.

ARMADILHAS DESTE ÉPICO:
- Reintroduzir por conveniência algum campo de nota ou média. Barrado por RNF-NORM-06 e
  pelo critério de contenção de escopo. É o único risco relevante deste épico.
- Casar avaliação planejada com real por chave rígida. É por nome normalizado, tolerante a
  abreviação — RN-AVAL-01, revisada na v2.0.
- Exigir habilitação do FISCAL. A validação de habilitação não se aplica a esse papel.
- Criar um segundo registro para a execução. É o mesmo fato (RN-AVAL-02).

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Portão de saída:** busca por `formula_mf` e `carater` sem nenhuma leitura funcional; avaliação
agendada aparecendo no DSA e somando na CHD.

---

## Épico 9 — Atividades AEC/TAD/TR/Estudo Individual + tetos normativos

**Comando:** `/speckit.specify` · **Esforço: M** · **Vem antes do Épico 7:** é pré-requisito de
totais para o Cronograma e para os Relatórios.

```
/speckit.specify Épico 9 da v2.1 — Atividades AEC/TAD/TR/Estudo Individual e tetos
normativos.

Leia antes: docs/fase-1/02 (RF-EXTRA-01 a 04, RF-DSA-01, RF-CRONOS-04, RF-DADOS-03);
docs/fase-1/04 (RN-EVT-01, RN-EVT-02, RN-EVT-03, RN-CRONOS-02, RN-DEG-02);
docs/fase-1/03 (RNF-NORM-01, RNF-NORM-02, RNF-NORM-08); docs/fase-1/06 (Épico 9).

OBJETIVO: as grandezas normativas de composição de carga horária representadas
corretamente, com os tetos calculados e SINALIZADOS. É o que torna o sistema conforme ao
corpo normativo, e não apenas um registro de aulas.

ESCOPO:
- Lançamento de AEC, TAD, TR e Estudo Individual, com subtipo operacional ADMINISTRÁVEL
  (config_listas, não ENUM).
- Escopo Global (todas as turmas ativas na data) OU de uma turma específica.
- ta_inicial e local, para o lançamento aparecer POSICIONADO na grade do DSA.
- Fórmula: CHT = CHD + AEC + TAD + TR. ESTUDO INDIVIDUAL FICA FORA DA SOMA, controlado à
  parte contra 20%/10% das horas-aula diárias, informativamente.
- Tetos, lidos de config_parametros e NUNCA de literal: AEC ≤ 10% do somatório das CH das
  disciplinas; TAD ≤ 5% da CHR; TR ≤ 10% da CHR.
- Cálculo e sinalização por curso, com o componente AlertaConformidade.
- Categorias totalizadas SEPARADAMENTE no DSA, no Relatório e no Cronograma — nenhuma soma
  trata "atividade não letiva" como balde único.
- tipo_legado_v1 preservado, mantendo a recategorização auditável e reversível.

FORA DE ESCOPO: BLOQUEIO de lançamento por estouro de teto — é ALERTA, NUNCA BLOQUEIO
(RN-DEG-02). Nova recategorização: o de-para dos 663→664 já foi executado na v2.0 e chega
pronto pelo ETL.

CRITÉRIOS DE ACEITE (documento 06, Épico 9):
1. Toda tela e todo cálculo diferencia as categorias.
2. Estudo Individual NUNCA entra na soma da CHT — invariante testado.
3. Os três tetos vêm de config_parametros; alterar o parâmetro muda o cálculo SEM REDEPLOY.
4. Estourar um teto produz alerta visível e NUNCA impede o lançamento.
5. Lançamento Global aparece em todas as turmas ativas na data; de turma aparece só nela.
6. Lançamento Global com turma_id preenchido é recusado PELO BANCO, e vice-versa.
7. Os 664 registros históricos totalizam 531 Estudo Individual, 62 AEC, 60 TAD e 11 TR.

ARMADILHAS DESTE ÉPICO — uma delas é específica e crítica:
- TRANSFORMAR O TETO EM CHECK CONSTRAINT "por zelo de plataforma". Isso MUDARIA A REGRA DE
  NEGÓCIO: o teto é alerta, e o estouro é autorizado por currículo em cursos como CAHO,
  C-Ap-HN e C-Ap-FR. EXPLICITAMENTE PROIBIDO (documento 06, Épico 9; constitution,
  Princípio V).
- Somar Estudo Individual na CHT. Ele fica FORA da fórmula, por definição normativa.
- Ler o teto de um literal no código em vez de config_parametros (RNF-NORM-08).
- app.alcanca_turma(NULL) devolve VERDADEIRO de propósito: turma_id nulo = escopo global
  (RN-EVT-02). O contrapeso está na ESCRITA — criar evento global exige
  app.pode('atividades_globais','criar'), que o Operador não tem.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

---

## Épico 10 — Relatórios e impressão

**Comando:** `/speckit.specify` · **Esforço: M** · **Pré-requisito:** Épicos 6, 7 e 9 (para os totais
fecharem entre os três módulos).

```
/speckit.specify Épico 10 da v2.1 — Relatório consolidado do curso e impressão.

Leia antes: docs/fase-1/02 (RF-REL-01 a 04, RF-CURSO-05, RF-HOR-09, RF-CRONOS-04);
docs/fase-1/04 (RN-CRONOS-01, RN-CRONOS-02); docs/fase-1/03 (RNF-COMP-01);
docs/fase-2/23 (rotas /print/*); docs/fase-1/06 (Épico 10).

OBJETIVO: o relatório consolidado da turma por período, imprimível, por seção ou geral. É o
documento que sustenta a prestação de contas do curso.

ESCOPO:
- Geração por turma e período (data inicial/final), consolidando aulas e atividades.
- Dois formatos: por seção/assunto individual (uma disciplina) OU geral consolidado.
- Campo de comentário por bloco de assunto: OCULTO NA TELA e IMPRESSO junto ao bloco.
- /print/relatorio, sem shell, servidor puro, @media print, reaproveitando o layout
  validado da v2.0 (cabeçalho, tabela, total).
- Totais por categoria normativa, coerentes com o Épico 9.
- Mudança de regime durante o curso consta do relatório, com o período de vigência de cada
  configuração.

FORA DE ESCOPO: documento escolar, histórico de aluno, nota (RNF-NORM-06). Exportação para
formatos ofimáticos além da impressão.

CRITÉRIOS DE ACEITE (documento 06, Épico 10):
1. Relatório de um período traz TODOS os lançamentos do intervalo e NENHUM de fora.
2. Formato por seção e formato geral produzem TOTAIS IDÊNTICOS para o mesmo período.
3. O comentário do usuário não aparece na tela e APARECE na impressão.
4. Paridade de layout com o relatório aprovado da v2.0, verificada por teste e2e.
5. Turma com mudança de regime no período mostra as duas configurações com suas vigências.
6. Totais por categoria batem com o DSA e com o Cronograma do mesmo período — INVARIANTE
   CRUZADO.

ARMADILHAS DESTE ÉPICO:
- Divergência de total entre Relatório, DSA e Cronograma por caminhos de cálculo
  diferentes. Mitigação obrigatória: UM ÚNICO CONJUNTO DE FUNÇÕES DE AGREGAÇÃO em
  lib/dominio/, consumido pelos três. Se você escrever uma segunda função de soma, o
  invariante cruzado vai falhar — e é assim que ele deve falhar.
- Reescrever o @media print do zero. O da v2.0 levou quatro hotfixes (specs 023–026) para
  funcionar. Parta do layout aprovado.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

---

## Épico 11 — LIQ, OS de Instrutoria, Ficha de Docentes (PDF)

**Comando:** `/speckit.specify` · **Esforço: M** · **Depende só do Épico 5 — pode ser antecipado.**
**Pré-requisito:** decisões LIQ-3 e LIQ-4 (ou escopo reduzido registrado).

```
/speckit.specify Épico 11 da v2.1 — LIQ, OS de Instrutoria e Ficha de Docentes.
FATIA (a): LIQ — Lista de Instrutores Qualificados.

Leia antes: docs/fase-1/06 (Épico 11, integral); docs/fase-1/02 (RF-INSTR-10/13/15/16,
RF-MATERIAS-02); docs/fase-1/04 (RN-ANT-01, RN-ANT-02, RN-INST-01, RN-INST-04);
docs/fase-1/03 (RNF-COMP-01, RNF-NORM-05); NORMHIDRO nº 30-23 e Anexos A–D;
o acervo modelos/LIQ/ (2023–2026) — é a referência de paridade de layout.

OBJETIVO: a minuta da LIQ por trimestre, com rastreabilidade e sem garimpo manual.

ESCOPO DA FATIA (a):
- Seção 1, a partir de instrutores: posto, nome, OM, divisão, assunção, tempo no setor,
  formação, CH ministrada no ano. ORDENADA POR ANTIGUIDADE DECRESCENTE, com
  antiguidade_declarada como desempate.
- Seção 2, POR TURMA, com o período vindo de turma_disciplina — NÃO da grade de curso.
  Este é o achado LIQ-1: previsao_inicio/previsao_termino são POR TURMA.
- Disciplinas habilitadas com CH derivadas de instrutor_disciplina × disciplinas.
- Validação que reconhece o instrutor REALMENTE SELECIONADO POR TURMA em turma_disciplina,
  não apenas o habilitado na grade (spec 034 da v2.0).
- Regra de bloqueio para período não informado, com mensagem que IDENTIFICA a turma e a
  disciplina.
- Rota /print/liq: sem shell, @media print, quebra de página controlada.
- CH ministrada no ano e disciplinas habilitadas com CH são DERIVADAS, nunca digitadas.

FORA DE ESCOPO — DECISÃO FECHADA, NÃO REABRIR: a tabela Instrutor_Impedimento NÃO SERÁ
CRIADA, e a coluna "Observação" da seção 1 sai SEMPRE VAZIA. Decisão de Bernardo em
2026-08-20 (LIQ-2): o sistema produz uma MINUTA, e impedimento é dado que nasce fora do
sistema, declarado pelo próprio instrutor quando consultado. A coluna vazia é
COMPORTAMENTO PRETENDIDO e tem teste próprio.
Também fora: persistência da LIQ emitida (LIQ-4) e papel titular/reserva (LIQ-3), enquanto
as decisões não vierem.

CRITÉRIOS DE ACEITE (documento 06, Épico 11):
1. A LIQ de um trimestre que contenha segunda turma sai com o período DA T2, não o da T1, e
   SEM LINHA DUPLICADA.
2. A seção 1 sai ordenada por antiguidade decrescente de posto, com desempate por
   antiguidade_declarada.
3. A coluna "Observação" sai VAZIA — verificado por teste.
4. Disciplina de turma sem período informado dispara a regra de bloqueio, com mensagem que
   identifica turma e disciplina.
5. A validação reconhece o instrutor selecionado em turma_disciplina.
6. Paridade de layout com os modelos aprovados, verificada por e2e de impressão.
7. CH ministrada e disciplinas habilitadas são derivadas, nunca digitadas.

ARMADILHAS DESTE ÉPICO:
- Ler o período da grade de curso em vez de turma_disciplina. É o achado LIQ-1 e a causa do
  defeito histórico.
- "Preencher" a coluna Observação por parecer um esquecimento. É decisão fechada.
- Reintroduzir a via Google Docs por hábito — a v2.0 gerava PDF por template no Drive e
  gastou QUATRO specs de correção nisso. Na v2.1 o mecanismo é ÚNICO: rota /print/* com
  @media print.
- Assumir a guarda de dado alheio (impedimentos). LIQ-2 é decisão fechada; não reabrir.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Fatias (b) e (c).** (b) **OS de Instrutoria** — filtrada por curso/turma/período, com instrutores e
disciplinas, em `/print/os-instrutoria`. (c) **Ficha de Docentes** — ficha individual ampliada com
layout de template fixo e máscaras de entrada, em `/print/ficha-instrutor`.

---

## Épico 12 — Motor de sugestão do DSA

**Comando:** `/speckit.specify` · **Esforço: M** · **Entrega OBRIGATORIAMENTE fatiada.**
**Pré-requisito:** Épicos 6 e 7 maduros.

```
/speckit.specify Épico 12 da v2.1 — Motor de sugestão do DSA. ETAPA (i) APENAS: versão
simples e determinística.

Leia antes: docs/fase-1/02 (RF-DSA-08, RF-DSA-08.1, RF-INSTR-06, RF-INSTR-06.1);
docs/fase-1/04 (RN-DIST-01/02/03, RN-CONF-01, RN-2027-05, RN-2027-06, RN-DEG-02);
docs/fase-1/03 (RNF-NORM-04 — REJEITADO); docs/fase-1/06 (Épico 12).

OBJETIVO: uma prévia semanal sugerida, para reduzir o esforço de montar a semana do zero. É
a maior economia de tempo operacional pedida pelo Bernardo — e o épico com maior risco de
virar projeto próprio.

ESCOPO — ETAPA (i) SOMENTE:
- Sugestão DETERMINÍSTICA, considerando a prioridade de disciplina e os limites diário e
  semanal RÍGIDOS já existentes.
- Reutiliza a distribuição do Épico 7 — RN-DIST-01 PROÍBE uma segunda implementação.
- Respeita o teto RÍGIDO de TFM (6 TA/semana), o máximo de 4 disciplinas por dia e 4 TA da
  mesma disciplina por dia (RN-2027-05), e a detecção de conflito entre todas as turmas.
- O motor é FUNÇÃO PURA de lib/dominio/, testável sem banco.
- A sugestão NUNCA é imposta: lançar manualmente algo diferente funciona a qualquer
  momento, sem confirmação extra e sem atrito de UI.

ETAPA (ii) — VALIDAÇÃO OBRIGATÓRIA, entregue JUNTO com a (i): instrumento que compara o que
o motor sugeriria contra pelo menos UMA SEMANA REAL já lançada manualmente, com TAXA DE
APROVEITAMENTO MEDIDA e registrada no repositório.

ETAPA (iii) — NÃO ESPECIFICAR AGORA. Preferências semanais do instrutor, priorização
configurável e exceção pontual de preferência só entram DEPOIS que a taxa da etapa (ii)
for medida e considerada satisfatória pelo Bernardo. A etapa (ii) é PORTA, não formalidade.

FORA DE ESCOPO — PROIBIDO NESTA E EM QUALQUER ETAPA: restrições de sequenciamento
pedagógico de técnica de ensino — intervalo a cada 2 TA geminados, limite de TA
consecutivos com a mesma técnica, mínimo de técnicas distintas por bloco, teto de TA
expositivos por dia. RNF-NORM-04 foi EXPLICITAMENTE REJEITADO pelo responsável. Não
implementar, não sugerir, NÃO DEIXAR PREPARADO.

CRITÉRIOS DE ACEITE (documento 06, Épico 12):
1. A sugestão respeita TODOS os limites rígidos existentes, incluindo o teto de TFM.
2. A sugestão NUNCA é imposta: lançar manualmente algo diferente funciona sempre.
3. A etapa (ii) é executada e registrada ANTES de qualquer trabalho da (iii) — critério de
   PROCESSO, verificável no histórico do repositório.
4. Nenhuma restrição de sequenciamento pedagógico é implementada — provado por revisão do
   código do motor.
5. O motor é função pura de lib/dominio/, testável sem banco.
6. Exceção pontual de preferência não altera o cadastro do instrutor.

ARMADILHAS DESTE ÉPICO:
- Construir motor sofisticado antes de saber se vale a pena. Motor de horário é um problema
  de otimização SEM FUNDO. O fatiamento (i)/(ii)/(iii) existe exatamente para isso.
- "Deixar preparado" para o sequenciamento pedagógico. Rejeitado é rejeitado.
- Sugestão virando obrigação na prática, por atrito de UI. Lançar manualmente precisa ser
  igualmente fácil — testado por e2e.
- Reimplementar a distribuição semanal em vez de reutilizar a do Épico 7.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

**Portão de saída:** relatório de comparação contra semana real produzido e **apresentado ao
Bernardo**. Sem esse número, a etapa (iii) não abre.

---

## Épico 13 — Apoio à Avaliação Externa / ROTA

**Comando:** `/speckit.specify` · **Esforço: P** · **Isolado — encaixável depois do Épico 5.**

```
/speckit.specify Épico 13 da v2.1 — Apoio leve à Avaliação Externa / ROTA.

Leia antes: docs/fase-1/02 (RF-ROTA-01 a 03); docs/fase-1/01 (§1.2);
docs/fase-1/03 (RNF-NORM-05); docs/fase-1/06 (Épico 13);
docs/fase-1/00 §7 (o teste de contenção de escopo) — LEIA ESTE ANTES DOS OUTROS.

OBJETIVO: organizar, numa visão só, os dados que o CIAARA-11 JÁ POSSUI e que alimentam a
planilha institucional da ROTA, reduzindo o garimpo no preenchimento manual.

ESCOPO: visão consolidada de qualificação, capacitação didática e carga horária dos
instrutores, e dos tópicos de curso que o sistema cobre, organizados NA ORDEM EM QUE A
PLANILHA INSTITUCIONAL OS PEDE, prontos para transcrição manual.

FORA DE ESCOPO — E ESTE É O PONTO DO ÉPICO:
- NÃO gera a planilha ROTA.
- NÃO submete, NÃO integra e NÃO troca dados com nenhum sistema externo.
- NÃO cobre dimensão que o CIAARA-11 não trata: corpo discente e infraestrutura física
  estão fora.
- NENHUM campo novo de coleta é criado para alimentar a visão.

O critério de contenção de escopo (Princípio IX / BRIEF §9) aplica-se aqui COM FORÇA
MÁXIMA: este processo está atribuído à CIAARA-11 na Matriz de Responsabilidades?

CRITÉRIOS DE ACEITE (documento 06, Épico 13):
1. A visão NÃO gera nem submete a planilha ROTA.
2. Cobre exclusivamente dados que já existem no CIAARA-11 — nenhum campo novo de cadastro é
   criado para alimentá-la.
3. Nenhuma dimensão fora do escopo (discente, infraestrutura) aparece.
4. Os dados exibidos são derivados das MESMAS FONTES do resto do sistema, sem consulta
   paralela.

ARMADILHAS DESTE ÉPICO — o risco é de ESCOPO, não técnico:
- "Já que estamos aqui, vamos gerar a planilha." NÃO. É exatamente o que este épico não
  faz, e é a razão de ele ter "apoio LEVE" no nome.
- Criar um campo de cadastro "só para completar a visão". Se o dado não existe, a coluna
  fica vazia e a visão diz isso.
- Criar uma consulta paralela "mais eficiente" para a visão. Ela lê as mesmas fontes; caso
  contrário, dois números divergem e ninguém sabe qual está certo.
- Este foi o ÚNICO épico da v2.0 que nunca virou spec. Isso não o torna menos contido —
  torna-o mais fácil de inflar por falta de precedente.

Se qualquer regra parecer errada, liste ao final em vez de corrigir. Se faltar
informação, pergunte em vez de assumir.
```

---

## Anexo — Prompt de abertura de sessão (use antes de qualquer um dos acima)

Cole isto ao **abrir uma sessão nova**, antes do prompt do épico. Custa trinta segundos e evita duas
horas (documento 41 §7).

```
Antes de qualquer trabalho, leia:
- CLAUDE.md (raiz)
- .specify/memory/constitution.md (os 11 princípios)
- specs/<a spec desta fatia>/spec.md, se já existir

Em seguida, resuma em CINCO LINHAS: (1) o que você vai implementar nesta fatia; (2) em que
arquivos, com o caminho; (3) quais regras RN- estão em jogo; (4) qual é o critério de
aceite que fecha a fatia; (5) qual restrição desta plataforma é mais fácil de violar aqui.

NÃO ESCREVA CÓDIGO AINDA. Vou conferir seu resumo antes de liberar.
```

---

*Fim do documento 42. Ver também `Vibe Coding/40-Constitution-v2.1.md` (os princípios),
`Vibe Coding/41-Guia-de-Vibe-Coding.md` (como conversar com o agente) e
`Fase 1 - Requisitos/10-Plano-de-Execucao-Vibe-Coding.md` (o roteiro macro e o protocolo de
implantação).*
