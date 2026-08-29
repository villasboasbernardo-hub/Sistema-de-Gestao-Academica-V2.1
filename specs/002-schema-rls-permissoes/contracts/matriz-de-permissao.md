# Contrato — Matriz de permissão

**Fatia**: Épico 1 · **Data**: 2026-08-28
**Fonte**: BRIEF §3 · doc 01 §2.2 · doc 22 §5 e §6 · `docs/sql-referencia/05_rls_policies.sql`

Este é o contrato de autorização do sistema inteiro. Toda regra de acesso o consulta; **nenhuma
contém um perfil escrito dentro de si** (FR-034).

---

## 1. A forma do contrato

```
perfil_permissao (perfil, recurso, acao, permitido)
  unique (perfil, recurso, acao)
```

**Duas perguntas, ambas precisam ser verdade** (doc 22 §5):

| Pergunta | Responde | Consultado por |
|---|---|---|
| Este **perfil** pode executar esta **ação** neste **recurso**? | permissão | a matriz |
| Sobre **quais cursos**? | alcance | o vínculo usuário↔curso e o escopo do usuário |

Um Operador de escopo expedito **pode** criar registro de aula — mas só nas turmas dos cursos
expeditos. Separar as duas dimensões é o que evita a explosão combinatória de 9 perfis × 5 escopos ×
25 recursos, que na prática seriam centenas de regras impossíveis de manter.

---

## 2. Perfis — nove valores

| Perfil | Correspondência regimental |
|---|---|
| `admin` | papel técnico, sem correspondência regimental |
| `chefe_departamento_ensino` | CIAARA-10 — leitura total, escrita nenhuma |
| `encarregado_administracao_academica` | **CIAARA-11 — dono do sistema** |
| `ajudante_administracao_academica` | apoio da CIAARA-11 — **permissão idêntica ao encarregado** |
| `encarregado_orientacao_pedagogica` | CIAARA-12 |
| `ajudante_orientacao_pedagogica` | apoio da CIAARA-12 |
| `operador` | lançamento diário, restrito por escopo de curso |
| `encarregado_curso` | leitura restrita aos cursos sob coordenação |
| `visualizacao` | leitura total, escrita nenhuma |

**Encarregado e Ajudante têm permissão idêntica**, por fidelidade ao documento 01, que não os
distingue em nenhuma área de dados (doc 22 §11, item 4). Distinguir seria decisão nova.

**Acrescentar um perfil** exige ampliar o domínio fechado (decisão organizacional, versionada) e
inserir as linhas da matriz. **Nenhuma regra de acesso muda** — elas já sabem responder ao perfil
novo, porque perguntam à matriz.

---

## 3. Recursos — treze

O recurso é a **área de dados**, não a tabela. É o que preserva `RN-RBAC-02`: *"a permissão de escrita
é definida por área de dados, não globalmente por perfil"*.

| Recurso | Cobre |
|---|---|
| `cursos` | cursos, regime, configuração de horário, tempos de aula |
| `turmas` | turmas e a grade por turma |
| `disciplinas` | disciplinas e **unidades de ensino** |
| `instrutores` | instrutores, habilitação, atribuição real por turma, responsáveis pela assinatura |
| `registros_aula` | execução letiva |
| `avaliacoes` | avaliações e o catálogo de planejadas |
| `atividades_nao_letivas` | atividades de **escopo de turma** |
| `atividades_globais` | atividades de **escopo global** — separado de propósito, ver §5 |
| `planejamento_anual` | o resultado do motor preditivo |
| `calendario` | feriados, janelas, reservas do PROENS |
| `parametros` | tetos, faixas, listas administráveis |
| `usuarios` | usuários e vínculo usuário↔curso |
| `auditoria` | log de migração e quarentena — **somente leitura** |

**`unidades_ensino` entra sob `disciplinas`, não como recurso novo.** É subordinada à disciplina e não
tem ciclo de autorização próprio; criar um recurso para ela multiplicaria linhas sem separar nada.

---

## 4. Ações — quatro

| Ação | Significa |
|---|---|
| `ler` | consultar |
| `criar` | inserir |
| `editar` | alterar |
| `desativar` | tirar de uso — **o que a interface chama de "excluir"** |

**Não existe ação `excluir`** (FR-035). A matriz descreve o que o sistema faz, e este sistema não
apaga nada. **Nenhuma tabela tem regra de exclusão física, e nenhuma recebe o privilégio de apagar** —
a proteção é dupla e deliberada (FR-033). Um pedido de mudança que acrescente exclusão é recusado sem
discussão: **é regra de negócio, não lacuna.**

---

## 5. Invariantes do contrato — o que os testes provam

| # | Invariante | Teste |
|---|---|---|
| C-01 | Nenhuma regra de acesso contém perfil literal | leitura do catálogo de policies |
| C-02 | **Zero** regras de exclusão em todo o schema | T-07 |
| C-03 | Toda regra de alteração restringe **também o destino**, não só a origem | T-03 |
| C-04 | Trocar uma linha da matriz muda o comportamento **sem alteração de código** | critério 7 do doc 06 |
| C-05 | Só o Administrador escreve nas três tabelas de fronteira | T-06 |
| C-06 | A leitura da matriz é aberta a qualquer sessão autenticada | — |
| C-07 | Perfil de visualização não escreve em lugar nenhum | T-04 |
| C-08 | Sessão sem cadastro de usuário não alcança nada | T-09 |
| C-09 | Usuário desativado perde o acesso imediatamente | T-11 |
| C-10 | Operador de escopo restrito não enxerga curso fora do escopo | T-01 |
| C-11 | Operador **não cria** atividade de escopo global | T-10 |
| C-12 | Ninguém amplia o próprio perfil, escopo ou situação | T-05 |
| C-13 | O log de migração não aceita alteração nem remoção, **nem pela credencial de maior privilégio** | T-08 |
| C-14 | Encarregado de Curso vê só os cursos vinculados | T-12 |

**C-03 é a que mais gente esquece, e é a que impede a fuga de escopo.** Sem ela, um Operador pega um
registro que alcança e o reatribui a uma turma que não alcança: a linha sai do alcance dele **levando
o dado junto**, e nenhuma verificação foi violada, porque a linha *original* era legítima.

**Escopo global alcança todos, de propósito** (FR-040). Uma atividade sem turma vale para todas as
turmas ativas na data (`RN-EVT-02`); negar alcance esconderia feriado e formatura de quem tem escopo
restrito. **O contrapeso está na escrita**, e é por isso que `atividades_globais` é recurso separado:
o Operador lança a palestra da turma dele, não decreta feriado para o Centro.

---

## 6. As duas concessões confirmadas — decisão de 28/08/2026

| Marca | Concessão | Estado |
|---|---|---|
| `(a)` | Encarregado e Ajudante da **CIAARA-11 escrevem** em `registros_aula`, `avaliacoes` e `atividades_nao_letivas` | ✅ **Confirmada.** A leitura literal do doc 01 impediria o dono do sistema de lançar aula — artefato da leitura, não intenção da norma |
| `(b)` | `calendario` e `parametros` administrados pela **CIAARA-11 e pelo Admin** | ✅ **Confirmada.** Nenhum documento designava; agora é decisão registrada |

**Consequência:** é a matriz do documento 01 que está desatualizada neste ponto — achado **A-7** da
spec, para correção no documento, não no contrato.

---

## 7. Como o contrato muda

| Mudança | Custo |
|---|---|
| Trocar quem pode executar uma ação | **Alteração de uma linha.** Sem código, sem implantação, sem janela |
| Acrescentar um recurso | Linhas novas na matriz + regra de acesso na tabela correspondente |
| Acrescentar um perfil | Ampliar o domínio fechado (versionado) + linhas na matriz. **Nenhuma regra de acesso muda** |
| Acrescentar uma ação | Revisão do contrato — as quatro cobrem o ciclo de vida inteiro |
| **Acrescentar exclusão física** | **Recusado.** É regra de negócio (FR-033) |
