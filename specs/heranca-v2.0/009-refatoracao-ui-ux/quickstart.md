# Quickstart — Validação Refatoração UI/UX e Conformidade de Dados

## Pré-requisitos

- Branch `009-refatoracao-ui-ux`, `tasks.md` completo e implementado.
- `pnpm vitest run` disponível.
- Acesso à implantação `o fluxo Git → Vercel` viva para os passos de verificação manual no navegador (a maior
  parte desta spec é visual/interativa — nenhum teste automatizado cobre DOM real).

## 1. Sidebar retrátil e identidade visual (User Story 1, FR-001/002)

1. Abrir o sistema; confirmar fonte Rawline e cor primária `#003366` (já existentes desde o Épico
   A — sem regressão).
2. Confirmar os 3 slots de identidade institucional (CIAARA/Marinha/DHN) presentes na estrutura da
   página, mesmo sem asset de imagem (RN-DEG-01).
3. Clicar no botão de alternar a sidebar; confirmar abertura/fechamento sem recarregar a página.
4. Navegar por todos os itens de menu hoje existentes a partir da sidebar; confirmar que nenhum
   ponto de entrada foi perdido (RF-NAV-02/03).
5. Logar com um perfil sem acesso a uma tela restrita (ex.: Usuários); confirmar que o item
   continua oculto na sidebar.

## 2. Painel Início — carrossel de turmas (User Story 2, FR-003..006)

1. Abrir o Painel Início; confirmar um carrossel por classificação de curso, rolagem horizontal.
2. Confirmar que um curso com mais de uma turma `Ativa` simultânea mostra a turma cuja janela
   contém a data corrente (ou a de `Data_Inicio` mais recente em caso de empate).
3. Confirmar que cada card mostra curso, turma abreviada, status e barra de progresso.
4. Clicar num card; confirmar navegação para a Página do Curso correspondente, com a turma já
   selecionada no contexto.
5. Logar com um perfil de escopo de curso restrito; confirmar que só os cursos dentro do escopo
   aparecem nos carrosséis.

## 3. Cartões expansíveis de Curso/Turma/Disciplina (User Story 3, FR-007..010)

1. Abrir a Página do Curso; confirmar cursos como cartões agrupados por classificação.
2. Clicar num cartão de curso; confirmar expansão com informação completa, sem navegar de página.
3. Acessar o módulo de turmas do curso; confirmar filtro pelos 4 status reais (sem "Arquivada").
4. Selecionar uma turma; confirmar disciplinas como cartões com barra de progresso, status de
   conclusão e indicador de ritmo (Atrasada/No Prazo/Adiantada).
5. Clicar num cartão de disciplina; confirmar expansão para o Diário de Classe Detalhado
   (cronograma global + painel de avaliações, sem tabela de Unidade de Ensino).
6. Testar com uma disciplina sem nenhuma execução registrada; confirmar "sem execução registrada
   ainda" em vez de data inválida.

## 4. Ocultar IDs e usar dropdowns (User Story 4, FR-011..013)

1. Abrir o lançamento manual de Aula (DSA); confirmar que disciplina e instrutor são `<select>`,
   não `prompt()` de texto livre.
2. Abrir a tela de Instrutores; confirmar que a tabela não exibe `ID_Instrutor` cru, e que o
   vínculo de habilitação usa `<select>` de disciplina em vez de campo de texto.
3. Auditar rapidamente DSA/Avaliações/Cronograma/Disciplinas; confirmar nenhuma coluna de ID cru
   restante.
4. Abrir o cadastro de disciplina; confirmar os dois campos novos (`Tecnica_Ensino_Sugerida`,
   `Local_Padrao`).

## 5. Dashboards Recharts (User Story 5, FR-014..016)

1. Abrir o painel de estatísticas de Cursos; confirmar KPIs + gráfico categórico + numérico.
2. Repetir para Disciplinas, Instrutores e Turmas.
3. Confirmar que nenhum painel baixa a aba inteira para o front-end (checar rede/tempo de
   resposta — a chamada retorna já agregada).

## 6. Não regressão geral

```sh
pnpm vitest run tests/unidade/*.test.ts
```

**Esperado**: nenhuma regressão em nenhum teste já existente antes deste épico — só os testes novos
de `calcularRitmoDisciplina_`/`resolverTurmaEmDestaque_`/agregações de estatística aparecem como
passe (FR-016, zero alteração de lógica de cálculo já existente).
