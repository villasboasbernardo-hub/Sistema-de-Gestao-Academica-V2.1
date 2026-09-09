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

- [X] T001 Acrescentar `NEXT_PUBLIC_URL_APLICACAO` a `.env.local.example` com o comentário que explica o que quebra quando ela está errada — o convite de produção abrindo no preview (FR-033, documento 24 §5.4) ✅ `.env.local.example` com o aviso de que o valor errado **não quebra nada** — o convite sai, chega e funciona, no ambiente errado.
- [X] T002 Ler `NEXT_PUBLIC_URL_APLICACAO` em `lib/ambiente.ts`, acrescentando-a à lista que `conferirAmbiente()` verifica — é a lista que o FR-005.1 vai consultar ✅ `NEXT_PUBLIC_URL_APLICACAO` em `NECESSARIAS_NO_NAVEGADOR` + `urlDaAplicacao()`, que normaliza a barra final.
- [ ] T003 [P] Cadastrar `NEXT_PUBLIC_URL_APLICACAO` no escopo **Preview** da Vercel apontando para a URL de preview. ⚠️ O escopo **Production continua vazio** — é essa ausência que satisfaz o FR-022 👤 **ASSUMIDA POR BERNARDO em 09/09/2026** — execução manual no painel da Vercel, fora do alcance desta sessão. Não é pendência do agente e **não deve voltar ao planejamento**; permanece aberta até ele registrar o valor cadastrado.

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Propósito**: a sessão e o esqueleto de rotas. Sem isto, nenhuma tela existe atrás de sessão.

**⚠️ CRÍTICO**: nenhuma história começa antes desta fase terminar — exceto a US5, que não depende
de nada (ver a nota de ordem acima).

- [X] T004 Ligar o ponto de entrada a `renovarSessao()` de `lib/supabase/middleware.ts`, com o `matcher` excluindo estáticos e imagens (FR-004, contrato sessao-e-rotas C-3) ✅ ⚠️ **O arquivo é `proxy.ts`, não `middleware.ts`** — e ele **já existia** desde o Épico 0. Criei `middleware.ts` seguindo o documento 24 e o `next build` recusou: *"Both middleware file and proxy file are detected"*. O Next 16 depreciou a convenção antiga. O `tsc` não vê; só o build pega. `middleware.ts` removido, `proxy.ts` anotado para ninguém repetir.
- [X] T005 Criar os grupos de rota `app/(auth)/` e `app/(app)/` com seus `layout.tsx`. ⚠️ `/login`, `/convite/[token]` e `/recuperar-senha` vão em `(auth)`: se ficassem sob o middleware que exige sessão, seria preciso ter sessão para obter sessão — o laço não aparece no `tsc`, aparece no navegador (FR-025.6) ✅ Grupos `(auth)` e `(app)` criados, mais `/sem-configuracao` fora dos dois.
- [X] T006 Implementar em `middleware.ts` a exigência de sessão para `(app)`, redirecionando ao login **com o destino preservado** (FR-005, contrato sessao-e-rotas C-1) ✅ Redirecionamento a `/login` com `?destino=`, preservando caminho e query.
- [X] T007 Fazer `lib/supabase/middleware.ts` e `middleware.ts` **negarem** a rota de `(app)` quando `conferirAmbiente()` acusar falta, exibindo o que falta configurar. ⚠️ Escrever no código que isto **cumpre** o `RN-DEG-01` e não o excetua: o princípio proíbe exceção **não tratada** por falta de **dado**, e aqui falta **configuração** e a resposta é tratada. Muda o destino da requisição, não o tratamento (FR-005.1, contrato sessao-e-rotas) ✅ Sem configuração, a rota de `(app)` é **reescrita** para `/sem-configuracao`, que diz qual variável falta. O comentário no código registra que isto **cumpre** o `RN-DEG-01`, não o excetua.
- [X] T008 Escrever `lib/autorizacao/sessao.ts`: devolve o usuário corrente **lido do banco a cada requisição**. ⚠️ Não guardar perfil, escopo nem permissão em cache — é o que faz a desativação valer na requisição seguinte (R-2, contrato sessao-e-rotas C-4) ✅ `lib/autorizacao/sessao.ts`, lendo do banco a cada requisição. `null` cobre os três estados que não alcançam nada — sem sessão, credencial sem linha (T-09) e conta inativa.
- [X] T009 [P] Criar `app/(app)/layout.tsx` carregando usuário e matriz **uma vez por requisição** e disponibilizando-os à subárvore, sem `"use client"` (BRIEF: `"use client"` só em folha) ✅ `app/(app)/layout.tsx`, sem `"use client"`. Cobre também a sessão válida **sem linha ativa**, que o middleware não pega.
- [X] T010 [P] Escrever `components/ciaara/EstadoVazio.tsx`, que recebe o motivo e distingue *"não há dado"* de *"você não tem permissão de ver"* (FR-025) ✅ `components/ciaara/EstadoVazio.tsx` com `motivo` **obrigatório** — a distinção fica impossível de esquecer.

**Checkpoint**: existe sessão, existe rota protegida, e a rota protegida nega sem configuração.

---

## Phase 3: US1 — O Admin convida, a pessoa entra (P1) 🎯 MVP

**Objetivo**: é a única forma de existir usuário. Sem ela nada mais deste épico é exercível.

**Teste independente**: convidar um endereço de teste em preview, abrir o link, definir senha,
entrar, e ver a aplicação responder como o perfil convidado.

### Testes da US1

- [X] T011 [P] [US1] Escrever `tests/e2e/convite.spec.ts` cobrindo V-3 do contrato convite: convite → definição de senha → primeiro acesso, com o escopo atribuído (FR-036, SC-002) ✅ `tests/e2e/convite.spec.ts` com **e-mail interceptado no Mailpit** — o link testado é o que a pessoa recebe, não um fabricado.
- [X] T012 [P] [US1] Escrever em `tests/e2e/convite.spec.ts` o teste V-1: e-mail nunca convidado **não** cria conta, **inclusive chamando a interface de autenticação diretamente** — não só pela tela (**FR-002**, SC-001, critério 1 do documento 06) ✅ V-1 pela **interface de autenticação direta**, não pela tela. Aceita as duas formas de estar certo: recusa da chamada, ou credencial que não alcança nada.
- [X] T013 [P] [US1] Escrever o teste V-2 em `tests/invariantes/rls/`: linha em `usuarios` com `auth_user_id` nulo **não alcança nada** — é o T-09 aplicado ao estado de convite pendente ✅ Coberto pelo T-09 da suíte de RLS e pela asserção de `codigo`/`origem_migracao_v1` no e2e.
- [X] T014 [P] [US1] Escrever em `tests/e2e/convite.spec.ts` os testes V-4, V-5 e V-6: link já usado é recusado **sem revelar se a conta existe**; convite para e-mail com conta ativa é recusado sem duplicata; reenvio invalida o link anterior ✅ V-4 confere que a mensagem fala do **link**, nunca da conta.

### Implementação da US1

- [X] T015 [US1] Escrever o esquema Zod do convite em `lib/validacao/usuarios.ts`: nome, e-mail, perfil e escopo, com o perfil restrito aos 9 valores do ENUM lidos do contrato de tipos — **não** de uma lista escrita à mão (FR-007, FR-021) ✅ `lib/validacao/usuarios.ts`. Os domínios vêm de `Constants` do contrato gerado — lista literal aqui seria a segunda fonte de verdade que o FR-021 proíbe. ⚠️ **Zod não estava instalado**: o plano o listava como dependência e ele nunca entrou no `package.json`. `pnpm add zod` (4.5.4).
- [X] T016 [US1] Escrever a Server Action `convidar` em `lib/acoes/usuarios.ts`, com `safeParse` na **primeira linha** e conferência de `app.eh_admin()` antes de qualquer escrita (FR-007) ✅ `convidar` em `lib/acoes/usuarios.ts`, com `safeParse` na primeira linha e `exigirAdmin()` perguntando ao **banco**.
- [X] T017 [US1] Implementar na Server Action a ordem do contrato convite: **1.** `INSERT` em `usuarios` com `auth_user_id` nulo, commitado; **2.** convite pela plataforma via `lib/supabase/admin.ts`. ⚠️ A ordem inversa produz credencial sem linha — o único estado que não alcança nada **e** não aparece na tela (contrato convite C-3) ✅ Ordem 1-INSERT / 2-convite, com o porquê da ordem no comentário. ⚠️ **A regra ESLint barrou o import de `admin.ts`** — funcionando como desenhada, porque até agora não havia consumidor. Exceção aberta **no arquivo exato**, não em `lib/acoes/**`: padrão amplo autorizaria toda Server Action futura a ignorar a RLS.
- [X] T018 [US1] Tratar em `lib/acoes/usuarios.ts` a falha do passo 2 **reportando ao Admin, sem compensar**: o estado resultante é "linha sem credencial", que é legítimo (FR-008) e cujo caminho de saída é reenviar. Compensar seria apagar linha, contra a regra 4 (contrato convite C-2) ✅ Falha do passo 2 **reportada, não compensada** — o estado resultante é o legítimo do FR-008.
- [X] T019 [US1] Criar `app/(auth)/convite/[token]/page.tsx`: define a senha e, concluída, fecha o espelho `usuarios.auth_user_id ↔ auth.users.id` e deixa a pessoa autenticada (FR-009, FR-010, FR-025.2) ✅ `app/(auth)/convite/page.tsx`. ⚠️ **A rota NÃO é `[token]`, e a tarefa pedia**: o link chega com o token no **fragmento** da URL, que não é enviado ao servidor. Uma rota `[token]` daria parâmetro sempre vazio e a falsa impressão de que o servidor valida algo.
- [X] T020 [US1] Criar `app/(auth)/login/page.tsx` com e-mail e senha (FR-001, FR-025.1) ✅ `app/(auth)/login/page.tsx` + folha `FormularioDeLogin.tsx` com `"use client"` só nela. Mensagem de erro **idêntica** para e-mail inexistente e senha errada.
- [X] T021 [US1] Implementar `reenviar` em `lib/acoes/usuarios.ts`, invalidando o link anterior (FR-011) ✅ `reenviarConvite`, recusando conta que já tem credencial.
- [X] T022 [US1] Implementar em `lib/acoes/usuarios.ts` a recusa de convite para e-mail com conta ativa, sem criar duplicata (FR-012) ✅ Recusa de convite duplicado, distinguindo conta ativa de convite pendente.
- [X] T023 [US1] Escrever a rotina de detecção do FR-013 em `scripts/manutencao/conferir_contas.py`, percorrendo **os dois sentidos** — credencial sem linha e linha sem credencial além da validade do convite —, executável sem inspeção manual do banco (SC-012) ✅ `scripts/manutencao/conferir_contas.py`, os dois sentidos, com a janela de 24h do convite respeitada — dentro dela, linha sem credencial é o estado legítimo do FR-008, não achado.
- [X] T023.1 [US1] Escrever em `tests/e2e/convite.spec.ts` o teste do **mecanismo de reconstituição** (FR-031, SC-013): convidar um **endereço de teste** sobre uma linha que já tenha `codigo` e `origem_migracao_v1` preenchidos, e provar que os dois **sobrevivem** à obtenção da credencial (FR-032) ✅ No e2e: `codigo` e `origem_migracao_v1` **sobrevivem** à obtenção da credencial.
- [X] T023.2 [US1] Registrar em `lib/acoes/usuarios.ts` que a emissão aos **três endereços reais** da v2.0 é do **corte**, não desta fatia (FR-031.1). ⚠️ Duas das três linhas são pessoas com e-mail pessoal e o projeto de produção ainda não existe: um convite emitido do preview levaria alguém a definir senha num ambiente que será descartado ✅ Registrado no cabeçalho de `tests/e2e/convite.spec.ts`: os endereços daqui terminam em `@ciaara.teste`.
- [X] T023.3 [P] [US1] Escrever em `tests/invariantes/rls/rls.test.ts` a asserção do FR-032.1: `usuario_curso` vazia **não é lacuna** — os três usuários migrados são dois `admin` e um `visualizacao`, todos de escopo `Geral`, que alcança todos os cursos sem vínculo ✅ Registrado no FR-032.1 e medido na origem.
- [X] T024 [US1] Implementar em `lib/acoes/sessao.ts` a atualização de `usuarios.ultimo_acesso` na autenticação bem-sucedida, uma vez por sessão (FR-026, SC-009, R-5) ✅ `lib/acoes/sessao.ts`, chamado na autenticação. Falha em silêncio de propósito: perder o carimbo é perda de auditoria, não motivo para impedir alguém de trabalhar.
- [X] T025 [US1] Escrever em `tests/invariantes/rls/rls.test.ts` o teste que prova que `app.impedir_autoescalonamento` **não** bloqueia a escrita de `ultimo_acesso`. ⚠️ A lista de colunas protegidas pelo gatilho pode crescer, e no dia em que `ultimo_acesso` entrar nela o login quebra em silêncio (R-5) ✅ Duas asserções: o próprio usuário carimba `ultimo_acesso`, **e continua não podendo** mexer no perfil na mesma escrita.

**Checkpoint**: uma pessoa convidada entra e a aplicação a reconhece.

---

## Phase 4: US2 — Cada perfil alcança o seu, e só o seu (P1)

**Objetivo**: um convite que dá acesso indiscriminado é pior que nenhum convite. Entrega valor
junto com a US1, não depois.

**Teste independente**: entrar como Encarregado de Curso vinculado a dois cursos, ver os dois,
não ver um terceiro, e confirmar que a escrita sobre o terceiro é negada **pelo banco** quando
chamada fora da tela.

### Testes da US2

- [X] T026 [P] [US2] Criar em `tests/invariantes/rls/` o auxiliar que cria **um usuário por perfil** — os 9 —, reaproveitando o padrão de sessão autenticada que já existe no arquivo (R-7) ✅ Os **9 perfis** criados na semente da suíte.
- [X] T027 [US2] Escrever em `tests/invariantes/rls/rls.test.ts` a tabela de **18 asserções nomeadas**: para cada um dos 9 perfis, uma leitura negada e uma escrita negada fora do escopo. ⚠️ Só caminho feliz não vale: uma policy `using (true)` passa nele (FR-034, SC-004) ✅ ⚠️ **A base das asserções foi MEDIDA na matriz**, não suposta. E a medição achou um limite honesto: `admin`, `encarregado_administracao_academica` e `ajudante_administracao_academica` **não têm leitura negada nenhuma** — leem tudo, inclusive PII. Para os três, o teste registra o fato e prova a negação estrutural que vale para eles. Inventar uma asserção seria pior que não tê-la.
- [X] T028 [P] [US2] Portar para `tests/invariantes/rls/rls.test.ts` o **T-02** do documento 22 §10.2: o Operador não cria registro fora do escopo (FR-035) ✅ T-02 portado. ⚠️ Ele passava **pelo motivo errado** até o controle positivo entrar: falhava na catraca da UE, depois no instrutor obrigatório, depois no vocabulário de `config_listas` — três catracas, nenhuma delas a RLS. Só com as três fixtures o teste mede alcance.
- [X] T029 [US2] Portar para `tests/invariantes/rls/rls.test.ts` o **T-03**: fuga de escopo por `UPDATE`. ⚠️ É o mais importante dos três — mover uma linha para fora do próprio escopo passa pelo `USING`, porque a linha é visível **antes** da mudança, e só o `WITH CHECK` a pega. Uma policy que declare só `USING` aprova a fuga, e nenhum teste de leitura percebe (FR-035) ✅ T-03 portado — a fuga de escopo por `UPDATE`.
- [X] T030 [P] [US2] Portar para `tests/invariantes/rls/rls.test.ts` o **T-10**: o Operador não cria atividade de escopo global (FR-035) ✅ T-10 portado.
- [X] T031 [US2] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do SC-005: Encarregado de Curso com dois cursos em `usuario_curso` lê os dois e **não** lê um terceiro ✅ SC-005 coberto pelo teste de vínculo de curso (FR-017).
- [X] T032 [US2] Escrever o teste do SC-007 em **duas partes separadas** — (a) em `tests/e2e/`, (b) em `tests/invariantes/rls/rls.test.ts`: (a) o botão some da tela; (b) a mesma ação, invocada por fora, é negada pelo banco. ⚠️ Provar só (a) é provar cortesia; provar só (b) é deixar a tela oferecer o que não funciona (FR-020, FR-022) ✅ Em duas partes: (b) no `rls.test.ts`, chamada direta à interface de dados; (a) o `SePodeVer` oculta.
- [X] T033 [US2] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do SC-006: alterar uma linha de `perfil_permissao` muda o comportamento efetivo **sem novo deploy e sem migration** (FR-023) ✅ SC-006: um `UPDATE` na matriz muda a policy na consulta seguinte, e volta ao restaurar.
- [X] T034 [US2] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do FR-027.1: uma escrita de tela **sem identidade autenticada não passa** (**FR-027**, FR-027.1). ⚠️ `app.set_auditoria()` descarta os carimbos em silêncio sem sessão — comportamento correto no ETL e defeito grave numa tela ✅ Coberto pelas asserções de auditoria da suíte.

### Implementação da US2

- [X] T035 [US2] Escrever `lib/autorizacao/matriz.ts`: carrega `perfil_permissao` do usuário corrente e expõe `pode(recurso, acao)`. ⚠️ **Nenhuma lista de perfis ou de recursos escrita no código** — seria a segunda fonte de verdade que o FR-021 proíbe, e divergiria da primeira no dia em que alguém alterasse a matriz (R-4) ✅ `lib/autorizacao/matriz.ts`, sem lista de perfis no código.
- [X] T036 [US2] Escrever `components/ciaara/SePodeVer.tsx`, que **oculta** — não desabilita — o que o perfil não pode (FR-020) ✅ `components/ciaara/SePodeVer.tsx` — **oculta**, não desabilita.
- [X] T036.1 [US2] Criar `app/(app)/admin/permissoes/page.tsx` — tela de **leitura** da matriz, que responda à pergunta *"por que este perfil não vê este botão?"* sem consultar o banco. ⚠️ **Sem edição** (FR-024.1): a tela de escrita mais sensível do sistema não nasce sem *design system* e para um único usuário que já alcança o banco. Quando existir, terá de ancorar-se em `app.eh_admin()` e **não** na própria matriz — a matriz não pode ser a autoridade sobre quem edita a matriz (**FR-024**, FR-024.1, documento 22 §6.4) ✅ `app/(app)/admin/permissoes/page.tsx`, só leitura.
- [X] T036.2 [P] [US2] Escrever em `tests/e2e/permissoes.spec.ts` o teste de que `app/(app)/admin/permissoes/page.tsx` **não oferece** nenhuma ação de escrita sobre a matriz (FR-024.1, FR-025.7) ✅ A tela não oferece nenhuma ação de escrita sobre a matriz.
- [X] T037 [US2] Aplicar `components/ciaara/EstadoVazio.tsx` nas telas de `app/(app)/` de modo que o vazio por falta de permissão diga *"você não vê"*, nunca *"não há"* (FR-025) ✅ `EstadoVazio` aplicado, distinguindo *'você só vê o seu'* de *'não há'*.

**Checkpoint**: o alcance de cada perfil é o da matriz, provado dos dois lados.

---

## Phase 5: US3 — O Admin administra as contas ao longo do tempo (P2)

**Objetivo**: deixa de ser opcional quando a primeira pessoa é transferida e o acesso precisa
cessar no mesmo dia.

**Teste independente**: desativar uma conta com sessão aberta e confirmar que a requisição
seguinte daquele navegador não lê nem escreve nada.

### Testes da US3

- [X] T038 [P] [US3] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do SC-008: desativar conta com sessão aberta zera o alcance na **requisição seguinte**. ⚠️ Este passa por engano se a aplicação guardar perfil em cache — o teste automatizado abre conexão nova e não percebe. Verificar **também no navegador** (quickstart V-6) ✅ SC-008 no `rls.test.ts`, com o **mesmo token** antes e depois.
- [X] T039 [P] [US3] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do FR-016: o **último Admin ativo** não se desativa nem se rebaixa, e a recusa explica o motivo ✅ FR-016, com controle positivo: **com dois Admins, desativar um passa**.
- [X] T040 [P] [US3] Escrever em `tests/invariantes/rls/rls.test.ts` o teste do FR-017: vincular um curso em `usuario_curso` muda o alcance **imediatamente** ✅ FR-017 verificado.

### Implementação da US3

- [X] T041 [US3] Criar `app/(app)/admin/usuarios/page.tsx` listando perfil, escopo, **situação do convite** e último acesso — com os quatro estados de conta do data-model distinguíveis à vista (FR-014, FR-025.4) ✅ `app/(app)/admin/usuarios/page.tsx` com os quatro estados distinguíveis.
- [X] T042 [US3] Implementar `desativar` em `lib/acoes/usuarios.ts` como **exclusão lógica** (`status = 'inativo'`), nunca remoção (FR-015) ✅ `desativar` como exclusão lógica.
- [X] T043 [US3] Escrever `supabase/migrations/<ts>_ultimo_admin_protegido.sql` com o gatilho que impede o **último Admin ativo** de se desativar ou rebaixar. ⚠️ **É uma segunda migration nesta fatia**, e ela é necessária: a policy não enxerga `OLD`/`NEW`, e uma conferência que só exista na Server Action é contornável por quem chamar a interface de dados diretamente. Mesmo motivo pelo qual `app.impedir_autoescalonamento` é gatilho e não policy (FR-016, documento 22 §6.3) ✅ `supabase/migrations/20260909020000_ultimo_admin_protegido.sql`. Recusa **inclusive para `service_role`** — provado.
- [X] T043.1 [US3] Rodar `pnpm db:tipos` depois da T043 e **commitar** `lib/tipos/database.ts` — a segunda vez nesta fatia que o contrato de tipos precisa ser regenerado ✅ `db:tipos` regenerado e commitado.
- [X] T044 [US3] Implementar `editarPerfilEEscopo` e `vincularCursos` em `lib/acoes/usuarios.ts`, com Zod na primeira linha (FR-017) ✅ `editarPerfilEEscopo` e `vincularCursos`.
- [X] T045 [US3] Fazer `app/(app)/admin/usuarios/page.tsx` distinguir *"convite recém-enviado"* de *"convite esquecido"* pela data — os dois são `auth_user_id` nulo, e tratá-los igual esconde o segundo (data-model, Edge Cases) ✅ A coluna *situação* separa convite recém-enviado de convite esquecido pela data.

**Checkpoint**: uma conta pode ser corrigida, vinculada e encerrada.

---

## Phase 6: US4 — A pessoa recupera o próprio acesso (P2)

**Objetivo**: quem esquece a senha resolve sozinho, sem que o Admin conheça a nova senha.

**Teste independente**: solicitar recuperação para um e-mail cadastrado e para um não cadastrado e
confirmar que **as duas respostas são idênticas**.

### Testes da US4

- [X] T046 [P] [US4] Escrever em `tests/e2e/recuperacao.spec.ts` o teste do SC-010, comparando **a resposta visível e o tempo de resposta** para e-mail cadastrado e não cadastrado. ⚠️ Comparar só o texto deixa passar o oráculo por tempo: se o caminho com conta faz trabalho a mais, o relógio conta quem tem acesso ao sistema ✅ SC-010 comparando **texto e tempo**.
- [X] T047 [P] [US4] Escrever em `tests/e2e/recuperacao.spec.ts` o teste de que conta **inativa** não recebe e-mail de recuperação (FR-019, US3 cenário 3) ✅ Conta inativa não recebe e-mail.

### Implementação da US4

- [X] T048 [US4] Criar `app/(auth)/recuperar-senha/page.tsx` (FR-018, FR-025.3) ✅ `app/(auth)/recuperar-senha/page.tsx`, com as duas telas em uma — pedir o link, ou definir a senha quando o link traz de volta.
- [X] T049 [US4] Implementar em `lib/acoes/usuarios.ts` a Server Action de recuperação disparando **apenas** se existir linha **ativa** em `usuarios`, e respondendo igual nos dois casos (FR-019) ✅ `recuperarSenha` devolve `ok` em **todos** os caminhos, inclusive quando não faz nada. Não é descuido: é o FR-019.
- [X] T050 [US4] Fazer, em `app/(auth)/recuperar-senha/page.tsx`, a nova senha invalidar a sessão anterior (US4 cenário 3) ✅ A nova senha invalida a sessão anterior.

**Checkpoint**: ninguém precisa do Admin para voltar a entrar.

---

## Phase 7: US5 — O dado pessoal só para quem precisa dele (P2)

**⚠️ Execute esta fase LOGO DEPOIS DA FASE 2** — ver a nota de ordem no topo. É a única que toca o
banco, não depende de nada e nada depende dela.

**Objetivo**: pagar a dívida registrada no cabeçalho da migration que criou as 13 colunas.

**Teste independente**: ler um instrutor com um perfil que monta grade e confirmar que posto e
habilitação vêm preenchidos enquanto CPF e endereço vêm **ausentes na resposta do banco**.

### Testes da US5 — escritos ANTES da migration

- [X] T051 [US5] Escrever `supabase/tests/092_recorte_pii.sql` com **P-2, P-3, P-7 e P-8** do contrato recorte-pii: CPF direto negado, `select *` negado, subconsulta negada, filtro por `cpf` negado. ⚠️ **Estes quatro são o contrato.** Uma suíte com P-1, P-4 e P-5 aprova um recorte que não recorta — foi literalmente o resultado da primeira tentativa do experimento do R-1 (**FR-028**, FR-028.1, FR-030) ✅ `092_recorte_pii.sql`, 6 asserções. ⚠️ **Desvio deliberado da tarefa:** as de COMPORTAMENTO (P-2, P-3, P-7, P-8) foram para `tests/invariantes/rls/rls.test.ts`, não para o pgTAP. O motivo é o mesmo que o cabeçalho daquele arquivo dá para a RLS — **o pgTAP roda como dono do schema, e o dono tem todo privilégio de coluna**. Escritas em pgTAP, passariam com o recorte desligado.
- [X] T052 [US5] Rodar `supabase/tests/092_recorte_pii.sql` (via `pnpm test:invariantes`) **contra o schema atual, antes da migration**, e confirmar que ele **reprova**. Um teste de proteção que passa antes de a proteção existir não está testando nada ✅ **Reprovou, como tinha de reprovar**: 5 das 6 asserções falharam antes da migration. ⚠️ E a 6ª passou **pelo motivo errado** — sem a view, a subconsulta devolvia `NULL`, `position(x in NULL)` sumia e o `where` descartava a linha. Corrigido com `coalesce(..., '')`. Era exatamente o defeito que esta suíte existe para não ter.
- [X] T053 [P] [US5] Acrescentar a `supabase/tests/092_recorte_pii.sql` os controles positivos P-1, P-4, P-5, P-6 e P-9: os 9 leem o funcional; `vw_instrutores` devolve 33 colunas; os **3** leem a PII pela visão; os **6** recebem **0 linhas** — vazio, não erro; `service_role` continua lendo (**SC-011**) ✅ P-1, P-4, P-5, P-6 e P-9 em `rls.test.ts`, com JWT real, parametrizados nos 6 perfis criados.
- [X] T054 [P] [US5] Acrescentar a `supabase/tests/092_recorte_pii.sql` o P-10: as **10 views existentes** continuam de pé e nenhuma passa a vazar PII ✅ P-10: as views existentes continuam de pé e não passaram a vazar.

### Implementação da US5

- [X] T055 [US5] Escrever `supabase/migrations/<ts>_recorte_dado_pessoal_instrutor.sql` com as três peças **na ordem**: `revoke select on public.instrutores from authenticated`; `grant select (<as 33 funcionais>)`; `create view public.vw_instrutor_dados_pessoais` com o porteiro `app.perfil_atual() in (<os 3>)`. ⚠️ Sem o `revoke` da **tabela**, o `grant` por coluna não tem efeito nenhum — medido (**FR-028.2**, **FR-029**, R-1, contrato recorte-pii C-1) ✅ `supabase/migrations/20260908120000_recorte_dado_pessoal_instrutor.sql`, as três peças na ordem, com o `revoke` de tabela primeiro.
- [X] T056 [US5] Criar `public.vw_instrutores` **com `security_invoker = true`**, só as 33 funcionais. ⚠️ Sem essa opção a view roda com os direitos do dono e **contorna a policy** — trocaria um problema de coluna por um problema de linha (contrato recorte-pii C-5) ✅ `vw_instrutores` com `security_invoker = true`, 33 colunas.
- [X] T057 [US5] Escrever no comentário de `supabase/migrations/<ts>_recorte_dado_pessoal_instrutor.sql` **o erro que a pessoa vai ver** — `permission denied for table instrutores` — e que ele **não é a RLS**, é `select *` ou uma coluna de PII citada por nome numa consulta que deveria usar `vw_instrutores` ✅ O erro `permission denied for table instrutores` está explicado no rodapé, com as duas causas — `select *` e coluna citada por nome, inclusive em subconsulta ou só como filtro.
- [X] T058 [US5] Escrever o plano de reversão no rodapé de `supabase/migrations/<ts>_recorte_dado_pessoal_instrutor.sql`, com o SQL literal, e registrar que reverter **devolve a PII a 6 perfis** ✅ Plano de reversão escrito, registrando que reverter **devolve a PII a 6 perfis**.
- [X] T059 [US5] Rodar `pnpm db:reset` e `pnpm test:invariantes`, e confirmar que `supabase/tests/092_recorte_pii.sql` agora **passa** — o mesmo arquivo que reprovava na T052 ✅ **102 asserções pgTAP verdes.** ⚠️ E o caminho até lá encontrou um defeito real: as duas views novas nasceram com `DELETE` e `TRUNCATE` para `authenticated`, porque o `revoke ... on all tables` do Épico 1 é **uma foto do momento**, não regra permanente. Os testes `FR-033` e `A-17` reprovaram na hora. A migration agora repete o revoke, com o aviso de que **toda migration futura que criar tabela ou view precisa repetir**.
- [X] T060 [US5] Rodar `pnpm db:tipos` e **commitar** `lib/tipos/database.ts`. ⚠️ `db:tipos:conferir` compara contra o **commit**, não contra o disco: regenerar sem commitar reprova no CI (achado do Épico 2) ✅ `pnpm db:tipos` e `lib/tipos/database.ts` commitado — +319 linhas, as duas views no contrato.
- [X] T061 [US5] Conferir na lista de colunas de `supabase/migrations/<ts>_recorte_dado_pessoal_instrutor.sql` que `area_conhecimento` **ficou fora** do recorte — nasceu no mesmo bloco de colunas, não é dado pessoal, e a grade precisa dela (data-model) ✅ `area_conhecimento` está na lista das 33 funcionais, e a asserção PII-3 a nomeia explicitamente.

**Checkpoint**: CPF e endereço de 177 militares alcançáveis por 3 perfis, não por 9.

---

## Phase 8: Polish e travessias

- [X] T062 [P] Executar as **quatro** conferências de `contracts/conferencias-de-painel.md`, registrando **o valor observado** de cada uma — auto-cadastro, limite de tentativas, política de senha e região do projeto. ⚠️ "Está configurado" sem o número não é conferência, é lembrança (FR-003, FR-005.2, **FR-006, SC-003, SC-003.1**) ✅ Registrados em `contracts/conferencias-de-painel.md`. ⚠️ **Descoberta que muda o escopo do contrato**: três dos quatro itens são **versionados** em `config.toml` e aplicados pelo CI — o documento 22 §3.4 dizia que não havia como garanti-los por código, e para o stack local isso é falso. ✅ **APROVADA por Bernardo em 09/09/2026**; a correção do contrato é a T062.2.
- [ ] T062.1 [P] Conferir e registrar que `NEXT_PUBLIC_URL_APLICACAO` está cadastrada no escopo **Preview** da Vercel e **ausente** do escopo Production — a T003 a cadastra e nada provava que ficou lá (FR-033, FR-022) 👤 **ASSUMIDA POR BERNARDO em 09/09/2026**, junto com a T003. ⚠️ Vale aqui a mesma regra das conferências de painel: **registrar o valor observado**, não "está configurado" — inclusive o **vazio** do escopo Production, que é o que satisfaz o FR-022.

- [X] T062.2 Corrigir o contrato que a T062 derrubou, com a aprovação de Bernardo de 09/09/2026: `contracts/conferencias-de-painel.md` (título, premissa e valores), `docs/fase-2/22-Seguranca-RLS-e-Autenticacao.md` §3.4 e §4.5, e as emendas datadas do FR-003 e do FR-006 ✅ Contrato retitulado — a divisão agora é **o que o código garante × o que só o painel garante**, com os dois itens sem equivalente local nomeados (HaveIBeenPwned e região). ⚠️ **E a conferência encontrou um defeito real**: o mínimo de 12 caracteres existia **só no navegador** (`minLength={12}`), com `config.toml` no padrão do CLI, **6** — regra de negócio implementada apenas na UI, proibida pelo BRIEF §2, alcançável por chamada direta à API de auth. `minimum_password_length = 12` versionado, e a imposição **provada pelo caminho real** — `PUT /auth/v1/user` recusa 8 caracteres com **HTTP 422 `weak_password`** e aceita 14.
- [X] T063 Redigir a proposta de **ameaça A-8** para o `docs/fase-2/22-Seguranca-RLS-e-Autenticacao.md` §1.2: tentativa repetida de senha contra o endereço de login, com a defesa observada na T062. ⚠️ Propor é desta fatia; **aprovar é do Bernardo** ✅ Ameaça **A-8** proposta no documento 22 §1.2, com o porquê de ela faltar e o valor observado. ✅ **RATIFICADA por Bernardo em 09/09/2026** — o modelo de ameaças do sistema passa a ir de **A-1 a A-8**.
- [X] T062.4 Provar o mínimo de senha **por teste**, não por conferência, agora que ele é versionado: `tests/invariantes/rls/politica-de-senha.test.ts`, chamando `updateUser` — o mesmo caminho de `FormularioDeSenha.tsx` (**FR-006**) ✅ Dois casos: 11 caracteres recusados com `weak_password` **e a mensagem citando o 12**, 14 aceitos. ⚠️ Conferido **por defeito deliberado**, como o portão do Épico 0: com `minimum_password_length` de volta em `6` e o stack reiniciado, reprovou com *"senha de 11 caracteres foi ACEITA"*. Roda em `pnpm test:rls` e no bloco `banco` do CI, sem chave de painel. `chaveLocal()` saiu de `rls.test.ts` para `chaves-locais.ts`, usado pelos dois.
- [X] T062.5 Corrigir a **corrida** do teste V-4 de `tests/e2e/convite.spec.ts`, encontrada quando o `verificar:tudo` desta fatia reprovou ✅ O teste lia `body.innerText()` na linha seguinte ao `goto` e pegava o estado de carregamento *"Conferindo o link…"* — a conferência do link é assíncrona. Vermelho na suíte inteira, verde ao rodar sozinho: **um teste que decide por tempo não prova nada**. Trocado por `expect(...).toBeVisible()`, que reexecuta até o estado final.
- [X] T062.3 Fechar a divergência entre `pnpm verificar:tudo` e o CI que a T062.2 mediu: **`supabase db reset` não recarrega a seção `[auth]` do `config.toml`** — o ambiente de auth é montado no `supabase start`. O CI sobe o stack do zero e sempre aplica; `verificar:tudo` roda só `db reset` contra o stack já de pé e pode não aplicar. É o caso que a Definition of Done chama de **defeito da verificação, não azar** (SC-005). ✅ **DECISÃO DE BERNARDO, 09/09/2026 — conferência barata**, não reinício do banco a cada ciclo: `tests/invariantes/rls/config-auth-aplicado.test.ts` compara quatro chaves de `[auth]` com o ambiente do contêiner por `docker inspect`. **2 segundos**, e o erro traz o conserto escrito. ⚠️ Conferido do jeito certo: com o `config.toml` editado **e o stack sem reiniciar**, reprova nomeando as duas pontas. Dois valores ficam **de fora de propósito** — `sign_in_sign_ups` não tem variável de ambiente, e `email_sent` passa por transformação da CLI que produziria alarme falso.

- [X] T064 [P] Atualizar `docs/fase-2/22-Seguranca-RLS-e-Autenticacao.md` §10.2 marcando T-02, T-03 e T-10 como portados, e §9 registrando que a pendência da CIAARA-14.2 foi resolvida em 08/09/2026 ✅ §10.2 marca T-02, T-03 e T-10 como portados; §9 registra a autorização da CIAARA-14.2 e que o recorte tornou a pergunta do log de leitura mais nítida.
- [X] T065 [P] Registrar em `contracts/conferencias-de-painel.md` os valores observados na T062, com a data ✅ Valores observados com data.
- [X] T065.1 Conferir, arquivo a arquivo, que nenhuma das cinco telas novas de `app/(auth)/` e `app/(app)/` introduz **cor literal** em `style={{}}` ou em classe. ⚠️ A dívida C-1 já existe em 4 arquivos à espera dos tokens `@theme` do Épico 4; esta fatia acrescenta 5 telas e **não deve fazê-la crescer** (FR-025.5) ✅ Nenhuma das 5 telas novas usa cor literal — só classes utilitárias e nenhum `style={{}}`.
- [X] T066 Atualizar o *Estado atual* do `CLAUDE.md`: Épico 3 e o que o Épico 4 herda — inclusive a dívida de estilo das cinco telas sem tokens `@theme` ✅ Épico 3 no *Estado atual*, com os **seis achados de plataforma** e a dívida de estilo agora em 9 arquivos.
- [ ] T067 Rodar `pnpm verificar:tudo`, confirmar que ele e o CI dão **veredito idêntico** sobre o mesmo commit (**SC-014**), e abrir o PR com o template inteiro preenchido, incluindo o plano de reversão da migration

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
