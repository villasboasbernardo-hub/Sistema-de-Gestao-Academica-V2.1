<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# CIAARA-11 v2.1 — Papéis e limites dos agentes

> **Sobre o bloco em inglês acima.** Ele não é nosso: é gerado pelo Next.js e **reescrito a cada
> `pnpm dev`**. Traduzi-lo ou apagá-lo não resolve — volta no próximo comando, e a árvore fica suja
> para sempre. Fica onde está, entre os marcadores, e nada nosso entra ali dentro. Tudo abaixo desta
> linha é do projeto e é **português do Brasil**, como manda a constitution.

Este arquivo diz **quem decide o quê**. Não repete regra técnica: para *como* escrever código, leia o
[`CLAUDE.md`](./CLAUDE.md); para o que prevalece sobre tudo, a
[constitution](./docs/vibe-coding/40-Constitution-v2.1.md).

## Quem é quem

| Papel | Quem | O que pode decidir |
|---|---|---|
| **Responsável** | Bernardo | **Tudo.** Regra de negócio, escopo, plataforma, exposição institucional, emenda à constitution. É a única autoridade nominal do projeto |
| **Agente de código** | Claude Code e afins | Implementa o que está especificado. Escolhe *como*, nunca *o quê*. Reporta divergência; não a conserta por conta própria |
| **Subagente** | Agentes derivados | Os mesmos limites do agente que o invocou. Delegar não amplia permissão |
| **Outras divisões** | CIAARA-14.2, PROENS, DEnsM | Fora do alcance deste repositório. Suas decisões chegam como fato registrado, não como coisa a negociar aqui |

## O que um agente nunca faz sem autorização nominal do Bernardo

1. **Alterar regra do documento 04.** Portar é reescrever na sintaxe nova **preservando o
   comportamento — inclusive o que parecer errado**. Achou algo estranho? **Liste ao final.**
2. **Ampliar escopo.** A pergunta de triagem é: *este processo está atribuído à CIAARA-11 na Matriz
   de Responsabilidades?* Se não, está fora (`RNF-NORM-06`).
3. **Trazer novidade antes da paridade** com a v2.0.
4. **Apagar qualquer coisa.** Exclusão é lógica (`status = 'inativo'`). Nenhuma policy `FOR DELETE`;
   nenhum `drop column` ou `drop table` em tabela com histórico; nenhuma reescrita de história de git.
5. **Transformar alerta normativo em bloqueio.** Os tetos AEC 10% / TAD 5% / TR 10% e o 9º TA são
   **alerta** (`RN-DEG-02`). Virar `CHECK` mudaria a regra de negócio.
6. **Usar a `service_role` fora dos três usos autorizados** — convite de usuário pelo Admin, carga do
   ETL, script de manutenção versionado rodado à mão. **Nunca por requisição de tela.**
7. **`git push` direto na `main`.** Branch, PR, revisão, squash.
8. **Decidir por uma pendência aberta.** As que estão no `CLAUDE.md` em *Decisões pendentes* se
   **perguntam**, não se supõem. É o Princípio I.

## Como um agente reporta divergência

Achado não vira correção silenciosa. Vira **registro**, num destes lugares, nesta ordem de preferência:

- a seção *Pendências* da spec da fatia, quando for divergência entre documentos;
- uma tarefa nova no `tasks.md`, quando exigir trabalho;
- o corpo do commit e a descrição do PR, quando for consequência do que se acabou de fazer.

Regra prática: **se o próximo a chegar precisaria saber, está escrito.** Se só o autor sabe, não está
pronto.

## O que o agente prova, em vez de declarar

O Princípio VI é *prova, não declaração*. Na prática:

- regra de lint só conta com **teste que quebra quando a regra é desligada**;
- migration só conta se aplica **do zero** e tem plano de reversão escrito;
- RLS só conta com **teste negativo por perfil** — caminho feliz não prova nada;
- verificação local vale pelo que **coincide com o CI** (`pnpm verificar:tudo`).

## Idioma

Português do Brasil em **tudo**: interface, spec, plano, tarefa, comentário, commit, nome de variável
e de função. Identificadores de banco em `snake_case` sem acento — restrição do motor, não tradução.

**Termos intraduzíveis**, que nunca viram sinônimo nem tradução: CHD · AEC · TAD · TR · TA · DSA ·
CHR · PROENS · DGPM-101 · DGPM-103 · PCP-FCT-2 · NORMHIDRO nº 30-23 · CAHO · LIQ · OS de Instrutoria ·
ROTA · LHFC · PM · OD · TFM, e todas as siglas de curso.

**"Disciplina", nunca "Matéria"** (decisão P-14, 10/08/2026).

Regra prática: **se o Bernardo não usaria a palavra numa conversa, ela não entra no código.**
