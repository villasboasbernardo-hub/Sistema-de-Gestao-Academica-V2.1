---
description: Recebe o texto livre de Bernardo com correções e pedidos, e leva tudo do specify ao PR aberto, de uma vez, com uma conferência só no fim.
argument-hint: <o que está errado ou o que quer mudar, do jeito que vier>
---

# /corrigir — do texto livre ao PR pronto para conferir

Fluxo combinado com Bernardo Villas Boas em 19/10/2026: **um pedido = uma spec = um PR = uma conferência**.
Você trabalha sozinho do começo ao fim; Bernardo pode não estar olhando. Ele confere no preview no fim.

## O pedido de Bernardo

$ARGUMENTS

## 0. Antes de tudo

1. Leia o `CLAUDE.md` inteiro e `docs/correcoes/plano-de-correcoes-em-blocos.md`.
2. Git: árvore limpa e na `main` atualizada. Se houver trabalho não commitado que não é seu, **PARE** e diga o que é.
   Se o `git switch` falhar pelo OneDrive (`cannot stat`), contorne como nos PRs #67/#68 (árvores idênticas, mover a ref sem reescrever arquivo).
3. **Triagem, medindo na `main`** (tela + código + cópia do remoto quando precisar de dado real):
   - quebre o texto em itens numerados, reescritos de forma clara (o que está errado, onde, o que deve acontecer);
   - marque o que **já está feito** (com a evidência) e não refaça;
   - marque o que é **defeito** 🐛 e o que é **regra nova/melhoria**;
   - se o pedido cabe num bloco do plano, use o bloco; se não, crie o próximo número livre. **Não fatie em sub-blocos.**
4. Ramo novo a partir da `main`: `fix/<BLOCO-N>-<resumo-curto>` (ou `feat/…` se for funcionalidade nova).

## 1. Spec Kit, tudo em sequência, sem parar entre as etapas

Rode, nesta ordem, **sem esperar resposta entre elas**: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.

- **Dúvidas:** em cada etapa, para cada dúvida, escolha a **recomendação** e siga. Registre a decisão na spec
  (seção Clarifications) como *"adotada por padrão — Bernardo confere no fim"*. Acumule todas no **lote final**.
- **Um PR só.** Só divida em mais de um PR se houver razão concreta (ex.: mudança do papel do DSA que só pode entrar
  entre semanas junto com outra que não pode esperar); se dividir, explique o porquê no lote final.
- **Commits** com o identificador do bloco (`fix(BLOCO-N): …`) quando o item não tiver RF/RN próprio.
- No `analyze`, corrija você mesmo as inconsistências de texto entre artefatos.

## 2. Quando PARAR e esperar Bernardo (só estes casos)

1. **Migration que ALTERA o que existe** — muda ou apaga dado existente, mexe em RLS/policy/permissão, muda regra
   `RN-` do documento 04, ou recria view/função mudando o resultado de algo que já está em tela. Pare **antes do
   remoto** e mostre o desenho (SQL, quem lê, caso que discrimina, efeito medido na cópia do remoto, reversão).
2. **Regra de negócio que parece errada** ou pedido que contradiz o documento 04, uma decisão D-* registrada ou o
   escopo da CIAARA-11 (regra 2): não "melhore" por conta própria — pergunte.
3. **Algo irreversível ou impossível de continuar**, ou CI vermelho por causa que exija decisão dele.

**Migration que só ACRESCENTA** (tabela nova, coluna nova nulável, view nova, função nova) **segue sozinha**
(emenda à regra 9.4, Bernardo, 19/10/2026), sempre com o rito completo do remoto:
backup (`python -m scripts.manutencao.dado_do_remoto --somente-copia`, arquivo citado) → dry-run listando só as
migrations do PR → `supabase db push --linked` (o pedido de permissão aparece para Bernardo) → conferência só de
leitura (migrations iguais nos dois lados, impressão digital do esquema, `security_invoker`, zero policy de DELETE,
Production respondendo). Nunca `--include-all`.

## 3. Regras de implementação (resumo do CLAUDE.md — ele prevalece)

- `lib/dominio/` só TS puro; leitura em Server Component; escrita em Server Action com Zod na 1ª linha; URL dona do
  estado; só tokens existentes; nada de pacote novo sem perguntar.
- Teste que prova a mudança é escrito e **visto falhar antes**; e2e **chegando por clique**; conferir no **banco**,
  não no valor digitado.
- `pnpm db:reset:limpo` antes dos e2e; apagar a `.next` antes do build (OneDrive); `--workers=2` se faltar memória;
  reprovação instável se **isola** antes de ser chamada de instável (`PEND-014-7`).
- Defeitos deliberados nos testes que provam a mudança → `pnpm verificar:tudo` → commit → push → abrir o PR com o
  template inteiro → **CI verde**.
- **A ponta a ponta inteira fica com o CI** (Bernardo, 26/10/2026; regra no `CLAUDE.md`, *Fluxo de trabalho*): com
  tipos, lint, unidade, build, pgTAP e RLS verdes localmente, siga para o push **sem perguntar**; localmente, só a
  ponta a ponta dos arquivos afetados (pela mudança ou por um rebase), com **1 processo**. Antes do push, o ramo tem de
  estar sobre a `main` atual — se não estiver, rebase mantendo as regras dos dois lados.
- Repositório público: nenhum nome pessoal ou e-mail em código, doc ou commit; instrutor pelo código.
- Não mexer no stash antigo. Não escrever dado no remoto por script sem autorização nominal.

## 4. Entrega final — uma mensagem só, curta

1. **O que foi feito**, item por item (uma linha cada), e o que ficou "já estava feito" ou "sem objeto".
2. **Preview** (endereço do ramo) e o **commit servido**; o PR.
3. **Roteiro de conferência**: um bloco por item, passos por clique, com o **resultado esperado**; avise o passo que
   grava no banco.
4. **Lote de dúvidas** que você decidiu por padrão: número, a escolha feita e a alternativa (1 linha cada).
5. **Banco**, se houve: migrations, backup citado, conferência do remoto.
6. Pendências novas que achou e **não** corrigiu (nome `PEND-…`), registradas no plano de correções.

**Não faça merge.** O merge acontece quando Bernardo disser "aprovado" (mudança no papel do DSA: só entre semanas).
Quando ele aprovar, faça o merge por squash, confira o CI na `main` e a Production, apague o ramo e atualize o plano
de correções e o `CLAUDE.md`.
