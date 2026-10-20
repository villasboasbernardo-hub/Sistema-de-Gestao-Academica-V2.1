# Quickstart — validar o Bloco 3

**Pré-requisitos:** `pnpm db:reset:limpo`; `.next` apagada; o build da suíte na porta 3100.

1. **Unidade:** `pnpm test:unidade` — `regime-da-turma`, Zod do regime, contrato de parâmetros, menu, entrada ativa,
   toda tela tem caminho, fronteira das telas.
2. **pgTAP:** `pnpm test:invariantes` — o 142 (estrutura, imutáveis, guarda em uso, escolha travada, FK de outro
   curso, a view com regime de 9 TA).
3. **RLS:** `pnpm test:rls` — quem cria, edita e inativa regime; o Operador cria e não inativa; a Visualização não cria.
4. **Ponta a ponta, por clique** (`--workers=2`):
   - *Cursos* → curso → as seis abas na ordem.
   - Aba *Disciplinas*: criar uma disciplina e conferir no banco; abrir uma linha e editar.
   - Aba *Avaliações* num curso com turma em andamento: nada de turma.
   - Aba *Atividades*: os limites com a origem.
   - Aba *Horários*: criar *Regime B — 9 TA de 45 min*; na ficha de uma turma sem lançamento, escolhê-lo; abrir o DSA e
     ver 9 tempos com os horários do regime; abrir o DSA de outra turma do curso e ver os tempos de antes.
   - `/disciplinas?curso=X` leva à aba Disciplinas de X.
5. **Remoto:** o rito de `plano-de-aplicacao-no-remoto.md`.
