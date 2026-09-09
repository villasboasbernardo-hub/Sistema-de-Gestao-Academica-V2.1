# Tasks: Épico 3 — Auth por convite, gestão de usuários e RBAC

**Entrada**: `specs/004-auth-convite-e-rbac/` · **Ramo**: `feat/EPICO-3-auth-convite-e-rbac`
**Pré-requisitos**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/](./contracts/)

**Testes**: **obrigatórios**, e são metade do produto. O FR-034, o FR-035 e o FR-036 os exigem
nominalmente, e a Definition of Done do projeto não aceita fatia sem teste negativo. Aqui vale a
frase do documento 22 §10.1: *uma suíte de RLS só com caminho feliz é uma suíte que aprova uma RLS
desligada*.

**Formato**: `[ID] [P?] [História] Descrição com o caminho do arquivo`

---

## ⚠️ Ordem recomendada difere da ordem das fases

As fases estão em ordem de prioridade, como manda o processo. A **ordem de execução recomendada**
é outra, e a razão é concreta:

> **Faça a Fase 7 (US5 — recorte de PII) LOGO DEPOIS DA FASE 2.**
> É a única fatia que toca o banco. Ela exige `pnpm db:tipos` **commitado**, e
> `db:tipos:conferir` compara contra o **commit**, não contra o disco. Deixá-la para o fim
> significa regenerar o contrato de tipos depois de todo o código de tela já escrito — que foi
> exatamente a omissão que o portão pegou no Épico 2.
>
> Ela não bloqueia ninguém e ninguém a bloqueia: pode ser feita e mesclada sozinha.

---

## Phase 1: Setup

**Propósito**: o que falta de configuração antes de qualquer código.

- [ ] T001 Acrescentar `NEXT_PUBLIC_URL_APLICACAO` a `.env.local.example` com o comentário que explica o que quebra quando ela está errada — o convite de produção abrindo no preview (FR-033, documento 24 §5.4)
- [ ] T002 Ler `NEXT_PUBLIC_URL_APLICACAO` em `lib/ambiente.ts`, acrescentando-a à lista que `conferirAmbiente()` verifica — é a lista que o FR-005.1 vai consultar
- [ ] T003 [P] Cadastrar `NEXT_PUBLIC_URL_APLICACAO` no escopo **Preview** da Vercel apontando para a URL de preview. ⚠️ O escopo **Production continua vazio** — é essa ausência que satisfaz o FR-022

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Propósito**: a sessão e o esqueleto de rotas. Sem isto, nenhuma tela existe atrás de sessão.

**⚠️ CRÍTICO**: nenhuma história começa antes desta fase terminar — exceto a US5, que não depende
de nada (ver a nota de ordem acima).

- [ ] T004 Criar `middleware.ts` na raiz, chamando `renovarSessao()` de `lib/supabase/middleware.ts`, com o `matcher` excluindo estáticos e imagens (FR-004, contrato sessao-e-rotas C-3)
- [ ] T005 Criar os grupos de rota `app/(auth)/` e `app/(app)/` com seus `layout.tsx`. ⚠️ `/login`, `/convite/[token]` e `/recuperar-senha` vão em `(auth)`: se ficassem sob o middleware que exige sessão, seria preciso ter sessão para obter sessão — o laço não aparece no `tsc`, aparece no navegador (FR-025.6)
- [ ] T006 Implementar em `middleware.ts` a exigência de sessão para `(app)`, redirecionando ao login **com o destino preservado** (FR-005, contrato sessao-e-rotas C-1)
- [ ] T007 **Inverter o `RN-DEG-01`** em `lib/supabase/middleware.ts` e `middleware.ts`: quando `conferirAmbiente()` acusar falta, **negar** a rota de `(app)` em vez de seguir. Escrever no código o porquê — degradar para "vazio com aviso" numa fronteira de autenticação é degradar para "aberto" (FR-005.1, contrato sessao-e-rotas)
- [ ] T008 Escrever `lib/autorizacao/sessao.ts`: devolve o usuário corrente **lido do banco a cada requisição**. ⚠️ Não guardar perfil, escopo nem permissão em cache — é o que faz a desativação valer na requisição seguinte (R-2, contrato sessao-e-rotas C-4)
- [ ] T009 [P] Criar `app/(app)/layout.tsx` carregando usuário e matriz **uma vez por requisição** e disponibilizando-os à subárvore, sem `"use client"` (BRIEF: `"use client"` só em folha)
- [ ] T010 [P] Escrever `components/ciaara/EstadoVazio.tsx`, que recebe o motivo e distingue *"não há dado"* de *"você não tem permissão de ver"* (FR-025)

**Checkpoint**: existe sessão, existe rota protegida, e a rota protegida nega sem configuração.

---

## Phase 3: US1 — O Admin convida, a pessoa entra (P1) 🎯 MVP

**Objetivo**: é a única forma de existir usuário. Sem ela nada mais deste épico é exercível.

**Teste independente**: convidar um endereço de teste em preview, abrir o link, definir senha,
entrar, e ver a aplicação responder como o perfil convidado.

### Testes da US1

- [ ] T011 [P] [US1] Escrever `tests/e2e/convite.spec.ts` cobrindo V-3 do contrato convite: convite → definição de senha → primeiro acesso, com o escopo atribuído (FR-036, SC-002)
- [ ] T012 [P] [US1] Escrever em `tests/e2e/convite.spec.ts` o teste V-1: e-mail nunca convidado **não** cria conta, **inclusive chamando a interface de autenticação diretamente** — não só pela tela (SC-001, critério 1 do documento 06)
- [ ] T013 [P] [US1] Escrever o teste V-2 em `tests/invariantes/rls/`: linha em `usuarios` com `auth_user_id` nulo **não alcança nada** — é o T-09 aplicado ao estado de convite pendente
- [ ] T014 [P] [US1] Escrever em `tests/e2e/convite.spec.ts` os testes V-4, V-5 e V-6: link já usado é recusado **sem revelar se a conta existe**; convite para e-mail com conta ativa é recusado sem duplicata; reenvio invalida o link anterior

### Implementação da US1

- [ ] T015 [US1] Escrever o esquema Zod do convite em `lib/validacao/usuarios.ts`: nome, e-mail, perfil e escopo, com o perfil restrito aos 9 valores do ENUM lidos do contrato de tipos — **não** de uma lista escrita à mão (FR-007, FR-021)
- [ ] T016 [US1] Escrever a Server Action `convidar` em `lib/acoes/usuarios.ts`, com `safeParse` na **primeira linha** e conferência de `app.eh_admin()` antes de qualquer escrita (FR-007)
- [ ] T017 [US1] Implementar na Server Action a ordem do contrato convite: **1.** `INSERT` em `usuarios` com `auth_user_id` nulo, commitado; **2.** convite pela plataforma via `lib/supabase/admin.ts`. ⚠️ A ordem inversa produz credencial sem linha — o único estado que não alcança nada **e** não aparece na tela (contrato convite C-3)
- [ ] T018 [US1] Tratar em `lib/acoes/usuarios.ts` a falha do passo 2 **reportando ao Admin, sem compensar**: o estado resultante é "linha sem credencial", que é legítimo (FR-008) e cujo caminho de saída é reenviar. Compensar seria apagar linha, contra a regra 4 (contrato convite C-2)
- [ ] T019 [US1] Criar `app/(auth)/convite/[token]/page.tsx`: define a senha e, concluída, fecha o espelho `usuarios.auth_user_id ↔ auth.users.id` e deixa a pessoa autenticada (FR-009, FR-010, FR-025.2)
- [ ] T020 [US1] Criar `app/(auth)/login/page.tsx` com e-mail e senha (FR-001, FR-025.1)
- [ ] T021 [US1] Implementar `reenviar` em `lib/acoes/usuarios.ts`, invalidando o link anterior (FR-011)
- [ ] T022 [US1] Implementar em `lib/acoes/usuarios.ts` a recusa de convite para e-mail com conta ativa, sem criar duplicata (FR-012)
- [ ] T023 [US1] Escrever a rotina de detecção do FR-013 em `scripts/manutencao/conferir_contas.py` ou equivalente versionado, percorrendo **os dois sentidos** — credencial sem linha e linha sem credencial além da validade do convite —, executável sem inspeção manual do banco (SC-012)
- [ ] T024 [US1] Implementar em `lib/acoes/sessao.ts` a atualização de `usuarios.ultimo_acesso` na autenticação bem-sucedida, uma vez por sessão (FR-026, SC-009, R-5)
- [ ] T025 [US1] Escrever em `tests/invariantes/rls/rls.test.ts` o teste que prova que `app.impedir_autoescalonamento` **não** bloqueia a escrita de `ultimo_acesso`. ⚠️ A lista de colunas protegidas pelo gatilho pode crescer, e no dia em que `ultimo_acesso` entrar nela o login quebra em silêncio (R-5)

**Checkpoint**: uma pessoa convidada entra e a aplicação a reconhece.

---

## Phase 4: US2 — Cada perfil alcança o seu, e só o seu (P1)

**Objetivo**: um convite que dá acesso indiscriminado é pior que nenhum convite. Entrega valor
junto com a US1, não depois.

**Teste independente**: entrar como Encarregado de Curso vinculado a dois cursos, ver os dois,
não ver um terceiro, e confirmar que a escrita sobre o terceiro é negada **pelo banco** quando
chamada fora da tela.

### Testes da US2

- [ ] T026 [P] [US2] Criar em `tests/invariantes/rls/` o auxiliar que cria **um usuário por perfil** — os 9 —, reaproveitando o padrão de sessão autenticada que já existe no arquivo (R-7)
- [ ] T027 [US2] Escrever em `tests/invariantes/rls/rls.test.ts` a tabela de **18 asserções nomeadas**: para cada um dos 9 perfis, uma leitura negada e uma escrita negada fora do escopo. ⚠️ Só caminho feliz não vale: uma policy `using (true)` passa nele (FR-034, SC-004)
- [ ] T028 [P] [US2] Portar para `tests/invariantes/rls/rls.test.ts` o **T-02** do documento 22 §10.2: o Operador não cria registro fora do escopo (FR-035)
- [ ] T029 [US2] Portar para `tests/invariantes/rls/rls.test.ts` o **T-03**: fuga de escopo por `UPDATE`. ⚠️ É o mais importante dos três — mover uma linha para fora do próprio escopo passa pelo `USING`, porque a linha é visível **antes** da mudança, e só o `WITH CHECK` a pega. Uma policy que declare só `USING` aprova a fuga, e nenhum teste de leitura percebe (FR-035)
- [ ] T030 [P] [US2] Portar para `tests/invariantes/rls/rls.test.ts` o **T-10**: o Operador não cria atividade de escopo global (FR-035)
- [ ] T031 [US2] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do SC-005: Encarregado de Curso com dois cursos em `usuario_curso` lê os dois e **não** lê um terceiro
- [ ] T032 [US2] Escrever o teste do SC-007 em **duas partes separadas** — (a) em `tests/e2e/`, (b) em `tests/invariantes/rls/rls.test.ts`: (a) o botão some da tela; (b) a mesma ação, invocada por fora, é negada pelo banco. ⚠️ Provar só (a) é provar cortesia; provar só (b) é deixar a tela oferecer o que não funciona (FR-020, FR-022)
- [ ] T033 [US2] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do SC-006: alterar uma linha de `perfil_permissao` muda o comportamento efetivo **sem novo deploy e sem migration** (FR-023)
- [ ] T034 [US2] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do FR-027.1: uma escrita de tela **sem identidade autenticada não passa**. ⚠️ `app.set_auditoria()` descarta os carimbos em silêncio sem sessão — comportamento correto no ETL e defeito grave numa tela

### Implementação da US2

- [ ] T035 [US2] Escrever `lib/autorizacao/matriz.ts`: carrega `perfil_permissao` do usuário corrente e expõe `pode(recurso, acao)`. ⚠️ **Nenhuma lista de perfis ou de recursos escrita no código** — seria a segunda fonte de verdade que o FR-021 proíbe, e divergiria da primeira no dia em que alguém alterasse a matriz (R-4)
- [ ] T036 [US2] Escrever `components/ciaara/SePodeVer.tsx`, que **oculta** — não desabilita — o que o perfil não pode (FR-020)
- [ ] T037 [US2] Aplicar `components/ciaara/EstadoVazio.tsx` nas telas de `app/(app)/` de modo que o vazio por falta de permissão diga *"você não vê"*, nunca *"não há"* (FR-025)

**Checkpoint**: o alcance de cada perfil é o da matriz, provado dos dois lados.

---

## Phase 5: US3 — O Admin administra as contas ao longo do tempo (P2)

**Objetivo**: deixa de ser opcional quando a primeira pessoa é transferida e o acesso precisa
cessar no mesmo dia.

**Teste independente**: desativar uma conta com sessão aberta e confirmar que a requisição
seguinte daquele navegador não lê nem escreve nada.

### Testes da US3

- [ ] T038 [P] [US3] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do SC-008: desativar conta com sessão aberta zera o alcance na **requisição seguinte**. ⚠️ Este passa por engano se a aplicação guardar perfil em cache — o teste automatizado abre conexão nova e não percebe. Verificar **também no navegador** (quickstart V-6)
- [ ] T039 [P] [US3] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do FR-016: o **último Admin ativo** não se desativa nem se rebaixa, e a recusa explica o motivo
- [ ] T040 [P] [US3] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do FR-017: vincular um curso em `usuario_curso` muda o alcance **imediatamente**

### Implementação da US3

- [ ] T041 [US3] Criar `app/(app)/admin/usuarios/page.tsx` listando perfil, escopo, **situação do convite** e último acesso — com os quatro estados de conta do data-model distinguíveis à vista (FR-014, FR-025.4)
- [ ] T042 [US3] Implementar `desativar` em `lib/acoes/usuarios.ts` como **exclusão lógica** (`status = 'inativo'`), nunca remoção (FR-015)
- [ ] T043 [US3] Escrever `supabase/migrations/<ts>_ultimo_admin_protegido.sql` com o gatilho que impede o **último Admin ativo** de se desativar ou rebaixar. ⚠️ **É uma segunda migration nesta fatia**, e ela é necessária: a policy não enxerga `OLD`/`NEW`, e uma conferência que só exista na Server Action é contornável por quem chamar a interface de dados diretamente. Mesmo motivo pelo qual `app.impedir_autoescalonamento` é gatilho e não policy (FR-016, documento 22 §6.3)
- [ ] T043.1 [US3] Rodar `pnpm db:tipos` depois da T043 e **commitar** `lib/tipos/database.ts` — a segunda vez nesta fatia que o contrato de tipos precisa ser regenerado
- [ ] T044 [US3] Implementar `editarPerfilEEscopo` e `vincularCursos` em `lib/acoes/usuarios.ts`, com Zod na primeira linha (FR-017)
- [ ] T045 [US3] Fazer `app/(app)/admin/usuarios/page.tsx` distinguir *"convite recém-enviado"* de *"convite esquecido"* pela data — os dois são `auth_user_id` nulo, e tratá-los igual esconde o segundo (data-model, Edge Cases)

**Checkpoint**: uma conta pode ser corrigida, vinculada e encerrada.

---

## Phase 6: US4 — A pessoa recupera o próprio acesso (P2)

**Objetivo**: quem esquece a senha resolve sozinho, sem que o Admin conheça a nova senha.

**Teste independente**: solicitar recuperação para um e-mail cadastrado e para um não cadastrado e
confirmar que **as duas respostas são idênticas**.

### Testes da US4

- [ ] T046 [P] [US4] Escrever em `tests/e2e/recuperacao.spec.ts` o teste do SC-010, comparando **a resposta visível e o tempo de resposta** para e-mail cadastrado e não cadastrado. ⚠️ Comparar só o texto deixa passar o oráculo por tempo: se o caminho com conta faz trabalho a mais, o relógio conta quem tem acesso ao sistema
- [ ] T047 [P] [US4] Escrever em `tests/e2e/recuperacao.spec.ts` o teste de que conta **inativa** não recebe e-mail de recuperação (FR-019, US3 cenário 3)

### Implementação da US4

- [ ] T048 [US4] Criar `app/(auth)/recuperar-senha/page.tsx` (FR-018, FR-025.3)
- [ ] T049 [US4] Implementar em `lib/acoes/usuarios.ts` a Server Action de recuperação disparando **apenas** se existir linha **ativa** em `usuarios`, e respondendo igual nos dois casos (FR-019)
- [ ] T050 [US4] Fazer, em `app/(auth)/recuperar-senha/page.tsx`, a nova senha invalidar a sessão anterior (US4 cenário 3)

**Checkpoint**: ninguém precisa do Admin para voltar a entrar.

---

## Phase 7: US5 — O dado pessoal só para quem precisa dele (P2)

**⚠️ Execute esta fase LOGO DEPOIS DA FASE 2** — ver a nota de ordem no topo. É a única que toca o
banco, não depende de nada e nada depende dela.

**Objetivo**: pagar a dívida registrada no cabeçalho da migration que criou as 13 colunas.

**Teste independente**: ler um instrutor com um perfil que monta grade e confirmar que posto e
habilitação vêm preenchidos enquanto CPF e endereço vêm **ausentes na resposta do banco**.

### Testes da US5 — escritos ANTES da migration

- [ ] T051 [US5] Escrever `supabase/tests/092_recorte_pii.sql` com **P-2, P-3, P-7 e P-8** do contrato recorte-pii: CPF direto negado, `select *` negado, subconsulta negada, filtro por `cpf` negado. ⚠️ **Estes quatro são o contrato.** Uma suíte com P-1, P-4 e P-5 aprova um recorte que não recorta — foi literalmente o resultado da primeira tentativa do experimento do R-1
- [ ] T052 [US5] Rodar `supabase/tests/092_recorte_pii.sql` (via `pnpm test:invariantes`) **contra o schema atual, antes da migration**, e confirmar que ele **reprova**. Um teste de proteção que passa antes de a proteção existir não está testando nada
- [ ] T053 [P] [US5] Acrescentar a `supabase/tests/092_recorte_pii.sql` os controles positivos P-1, P-4, P-5, P-6 e P-9: os 9 leem o funcional; `vw_instrutores` devolve 33 colunas; os **3** leem a PII pela visão; os **6** recebem **0 linhas** — vazio, não erro; `service_role` continua lendo
- [ ] T054 [P] [US5] Acrescentar a `supabase/tests/092_recorte_pii.sql` o P-10: as **10 views existentes** continuam de pé e nenhuma passa a vazar PII

### Implementação da US5

- [ ] T055 [US5] Escrever `supabase/migrations/<ts>_recorte_dado_pessoal_instrutor.sql` com as três peças **na ordem**: `revoke select on public.instrutores from authenticated`; `grant select (<as 33 funcionais>)`; `create view public.vw_instrutor_dados_pessoais` com o porteiro `app.perfil_atual() in (<os 3>)`. ⚠️ Sem o `revoke` da **tabela**, o `grant` por coluna não tem efeito nenhum — medido (R-1, contrato recorte-pii C-1)
- [ ] T056 [US5] Criar `public.vw_instrutores` **com `security_invoker = true`**, só as 33 funcionais. ⚠️ Sem essa opção a view roda com os direitos do dono e **contorna a policy** — trocaria um problema de coluna por um problema de linha (contrato recorte-pii C-5)
- [ ] T057 [US5] Escrever no comentário de `supabase/migrations/<ts>_recorte_dado_pessoal_instrutor.sql` **o erro que a pessoa vai ver** — `permission denied for table instrutores` — e que ele **não é a RLS**, é `select *` ou uma coluna de PII citada por nome numa consulta que deveria usar `vw_instrutores`
- [ ] T058 [US5] Escrever o plano de reversão no rodapé de `supabase/migrations/<ts>_recorte_dado_pessoal_instrutor.sql`, com o SQL literal, e registrar que reverter **devolve a PII a 6 perfis**
- [ ] T059 [US5] Rodar `pnpm db:reset` e `pnpm test:invariantes`, e confirmar que `supabase/tests/092_recorte_pii.sql` agora **passa** — o mesmo arquivo que reprovava na T052
- [ ] T060 [US5] Rodar `pnpm db:tipos` e **commitar** `lib/tipos/database.ts`. ⚠️ `db:tipos:conferir` compara contra o **commit**, não contra o disco: regenerar sem commitar reprova no CI (achado do Épico 2)
- [ ] T061 [US5] Conferir na lista de colunas de `supabase/migrations/<ts>_recorte_dado_pessoal_instrutor.sql` que `area_conhecimento` **ficou fora** do recorte — nasceu no mesmo bloco de colunas, não é dado pessoal, e a grade precisa dela (data-model)

**Checkpoint**: CPF e endereço de 177 militares alcançáveis por 3 perfis, não por 9.

---

## Phase 8: Polish e travessias

- [ ] T062 [P] Executar as três conferências de `contracts/conferencias-de-painel.md`, registrando **o valor observado** de cada uma — auto-cadastro, limite de tentativas e região do projeto. ⚠️ "Está configurado" sem o número não é conferência, é lembrança (FR-003, FR-005.2)
- [ ] T063 Redigir a proposta de **ameaça A-8** para o `docs/fase-2/22-Seguranca-RLS-e-Autenticacao.md` §1.2: tentativa repetida de senha contra o endereço de login, com a defesa observada na T062. ⚠️ Propor é desta fatia; **aprovar é do Bernardo**
- [ ] T064 [P] Atualizar `docs/fase-2/22-Seguranca-RLS-e-Autenticacao.md` §10.2 marcando T-02, T-03 e T-10 como portados, e §9 registrando que a pendência da CIAARA-14.2 foi resolvida em 08/09/2026
- [ ] T065 [P] Registrar em `contracts/conferencias-de-painel.md` os valores observados na T062, com a data
- [ ] T066 Atualizar o *Estado atual* do `CLAUDE.md`: Épico 3 e o que o Épico 4 herda — inclusive a dívida de estilo das cinco telas sem tokens `@theme`
- [ ] T067 Rodar `pnpm verificar:tudo` e abrir o PR com o template inteiro preenchido, incluindo o plano de reversão da migration

---

## Dependências

```
Fase 1 (Setup)
   └── Fase 2 (Foundational) ──┬── Fase 3 (US1) ──┐
                               │                  ├── Fase 5 (US3)
                               ├── Fase 4 (US2) ──┘
                               └── Fase 6 (US4)

Fase 7 (US5) ── independente. Executar logo após a Fase 2.
Fase 8 (Polish) ── depois de tudo.
```

| Dependência | Por quê |
|---|---|
| Fase 2 → todas | Sem sessão nem grupos de rota não há tela atrás de autenticação |
| US1 → US3 | Não se administra conta que não existe |
| US2 ⟂ US1 | Independentes tecnicamente; **entregam valor só juntas** |
| US4 ⟂ US1 | A recuperação não depende do convite |
| **US5 ⟂ tudo** | Só banco. Pode ser mesclada sozinha, e deveria ser a primeira |

## Paralelismo

| Podem correr juntas | Por quê |
|---|---|
| T003, T009, T010 | Arquivos distintos, sem dependência |
| T011 – T014 | Quatro arquivos de teste da US1 |
| T026, T028, T030 | Auxiliar e dois portes independentes |
| T038, T039, T040 | Três testes da US3 |
| T046, T047 | Dois testes da US4 |
| T053, T054 | Controles positivos, depois da migration |
| T062, T064, T065 | Conferência e documentação |

## Estratégia

**MVP = Fase 2 + Fase 3 (US1)**, com a Fase 7 (US5) mesclada antes por ser só banco.

Ordem sugerida de entrega, em quatro PRs:

1. **US5** — uma migration, dois testes negativos, `db:tipos` commitado. Pequeno e independente.
2. **Fases 1 e 2** — sessão, rotas e a inversão declarada do `RN-DEG-01`.
3. **US1 + US2** — o MVP de verdade: alguém entra, e alcança só o que a matriz permite.
4. **US3 + US4 + Polish** — administração, recuperação e as conferências.

⚠️ **Não entregar a US1 sem a US2.** Um convite que dá acesso indiscriminado é pior que nenhum
convite — está escrito assim na spec, e a ordem dos PRs respeita isso.
