# Quickstart — Hotfix: Edição Inline, Persistência de Datas, Permissão de Admin

Roteiro de validação manual contra o app publicado (aplicação Next.js via `o fluxo Git → Vercel`).

## Passo 1 — Tabela principal somente leitura (User Story 1)

1. Selecione um Curso e uma Turma (ou fique no estado inicial, sem selecionar nada).
2. **Esperado**: as colunas Carga Horária e Prioridade mostram só texto — nenhum campo clicável,
   nenhum botão "Salvar" na linha (só o botão "Editar").
3. Clique em "Editar" numa linha — **esperado**: os campos Carga Horária e Prioridade aparecem
   pré-preenchidos e editáveis dentro do painel; salvar funciona normalmente.
4. Selecione um Curso **sem** selecionar Turma (visão de catálogo puro) — **esperado**: Carga
   Horária e Prioridade continuam editáveis inline, com botão "Salvar" (comportamento preservado,
   FR-002).

## Passo 2 — Persistência de datas (User Story 2)

1. Abra o painel "Editar" de uma disciplina/turma, altere a Data de Início e/ou Término, salve.
2. **Esperado**: sem erro na tela; painel fecha; a tabela recarrega mostrando a data nova.
3. Dê F5 na página inteira.
4. **Esperado**: a data continua sendo a editada, nunca reverte para a antiga.
5. Se o sintoma original se repetir (data reverte após F5): **esperado agora** um alerta visível
   no momento de salvar (não mais silencioso) — abra o log de execução do Next.js
   (`Extensões > Next.js > Execuções`, ou `o fluxo Git → Vercel logs`) e confira as 2 linhas de log
   (`[atualizarTurmaDisciplina]`, payload recebido e resultado da releitura) para diagnosticar.

## Passo 3 — Admin edita Prioridade (User Story 3)

1. Logado como usuário de perfil `Admin`, abra o painel "Editar" de uma disciplina/turma.
2. Altere o campo Prioridade (1-10) e salve.
3. **Esperado**: sem "Acesso negado"; F5 confirma o valor persistido.
4. Repita logado como `Encarregado_Divisao_Administracao_Academica` (ou Ajudante) —
   **esperado**: continua funcionando exatamente como antes (não regressão).
