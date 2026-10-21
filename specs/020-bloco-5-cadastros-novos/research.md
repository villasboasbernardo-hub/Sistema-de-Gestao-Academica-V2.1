# Research — Bloco 5

- **R-1 · O teto de corpo da Vercel.** *"The maximum payload size for the request body or the response body of a Vercel
  Function is 4.5 MB"* (documentação *Vercel Functions Limits*, atualizada em 24/08/2026). Logo o PDF não passa por Server
  Action nem por Route Handler: sobe do navegador ao Storage e desce por link assinado. **Decisão:** C-5, P-2, P-3.
- **R-2 · Os PDFs reais.** Varredura da pasta do projeto (fora de `node_modules` e das `worktrees`) em 20/10/2026:
  **zero** PDFs — os currículos lidos pelo ETL não estão nesta máquina. O limite de 20 MB é **decisão** (C-6), não medida.
- **R-3 · Quem lê `capacitacao_didatica`.** `vw_instrutores` (ficha, lista, filtro, indicadores, gráficos, avisos de
  cadastro e o alerta de `RNF-NORM-05`), o formulário e a validação. A view **não tem dependentes** (medido no catálogo
  local), então recriá-la com duas colunas no fim não arrasta outra.
- **R-4 · Restrições de `instrutores`.** Só `btrim(...) <> ''` em cinco campos, uma coerência de datas e o formato do
  e-mail (medido no catálogo local); nenhuma catraca de linha migrada. A conversão não esbarra em nada.
- **R-5 · Privilégio por coluna.** `authenticated` tem `SELECT`, `INSERT` e `UPDATE` **por coluna** em
  `capacitacao_didatica` (medido); as colunas novas recebem o mesmo. `cursos` não tem privilégio por coluna.
- **R-6 · Dependentes de conta.** `public.dependentes_da_conta` varre **toda** coluna `criado_por`/`editado_por` de tabela
  de `public` (`20261003000205_exclusao_de_conta.sql`). Daí a C-14.
- **R-7 · Onde o login carimba.** `FormularioDeLogin.tsx` faz `signInWithPassword` no navegador e chama a Server Action
  `registrarAcesso` (`lib/acoes/sessao.ts`), que atualiza `ultimo_acesso`. O acesso entra no mesmo ponto (P-5).
- **R-8 · A semente do DSA.** `tests/e2e/dsa-de-teste.ts` é importada por **22** arquivos e fixa semanas de 2026 (abril)
  e vigências de regime (`2026-01-01`, `2026-06-01`); por isso a C-16 trata o `dsa-ver` Q-13 pela caixa de ano.
