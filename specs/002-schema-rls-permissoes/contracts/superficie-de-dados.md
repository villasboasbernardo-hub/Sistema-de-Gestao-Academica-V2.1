# Contrato — Superfície de dados

**Fatia**: Épico 1 · **Data**: 2026-08-28
**Consumidores**: Server Components e Server Actions da v2.1 (Épicos 3 a 13) · ETL do Épico 2

Esta fatia não expõe rota HTTP nem componente. **A interface que ela publica é a superfície de dados**
— o que a aplicação pode consultar, sob que garantias, e o que ela nunca deve tentar.

---

## 1. Como a aplicação alcança os dados

| Camada | Regra |
|---|---|
| Leitura em servidor | Cliente de servidor com a sessão do usuário. **A RLS se aplica** |
| Leitura em cliente | Cliente do navegador com a chave publicável. **A RLS se aplica** |
| Escrita | **Sempre** por Server Action, com validação na primeira linha |
| Privilégio elevado | **Três usos autorizados, e só estes:** convite de usuário pelo Admin, carga do ETL, script de manutenção versionado rodado à mão. **Nunca por requisição de tela** |

**Tipos gerados são o contrato compilado.** `lib/tipos/database.ts` é gerado do schema; a verificação
automática falha se divergir. **Campo que a aplicação conhece e o dado não é, quase sempre, campo
inventado** (FR-060).

---

## 2. Garantias que a aplicação pode assumir

Estas valem **sem que a aplicação faça nada**. Reimplementá-las na aplicação é duplicação, e
duplicação diverge.

| # | Garantia | Consequência para quem escreve código |
|---|---|---|
| G-01 | Identificador único e estável em todo registro | Não gerar identificador na aplicação |
| G-02 | Identificador legado presente e único no que veio da v2.0 | Rastreabilidade 1:1 de graça |
| G-03 | Situação sempre explícita, nunca ausente | **Nunca** deduzir situação de campo vazio |
| G-04 | Autor e momento preenchidos automaticamente | **Nunca** enviar autor — é sobrescrito |
| G-05 | Nada referenciado por outro registro pode ser removido | Não checar dependência antes de desativar |
| G-06 | Código de disciplina único no curso | Traduzir o erro para português; não pré-validar |
| G-07 | Turma única por curso/rótulo/ano | idem |
| G-08 | Uma habilitação por instrutor↔disciplina | idem |
| G-09 | Uma linha de grade por turma↔disciplina | idem |
| G-10 | No máximo um planejamento salvo por ano | Promover é operação única e indivisível |
| G-11 | Regimes e assinaturas sem sobreposição de vigência | Resolver por data é sempre não ambíguo |
| G-12 | Turma e unidade de ensino **do mesmo curso** em todo lançamento; e turma e disciplina em toda avaliação | **FR-061** / `RN-MAT-01` é impossível de violar. Provado por T040 |
| G-13 | Grandeza derivada não é gravável | Não tentar gravá-la — falha |
| G-14 | Nenhuma exclusão física, por nenhum caminho | "Excluir" é sempre desativar |
| G-15 | Log de migração e quarentena imutáveis | Corrigir é registrar evento novo |

---

## 3. O que a aplicação **não** pode assumir

Continua sendo responsabilidade de código. Dizer isto evita falsa sensação de cobertura (doc 05 §7.8).

| Não garantido | Onde vive | Por quê |
|---|---|---|
| Motor preditivo, distribuição semanal, detecção de conflito, sugestão do DSA, ordenação por antiguidade, cálculo de tetos | `lib/dominio/`, funções puras | Não são expressáveis como regra de dado. **Fronteira deliberada**: o SQL agrega fatos já registrados; **ele não planeja** |
| Casamento entre avaliação planejada e avaliação real | `lib/dominio/` | `RN-AVAL-01` é heurística por nome normalizado, não chave formal. A referência só guarda o vínculo **já confirmado** |
| Alertas normativos — teto excedido, 9º tempo, capacitação pendente | interface + justificativa registrada | **São alerta, nunca bloqueio** (`RN-DEG-02`). Transformá-los em regra de dado mudaria a regra de negócio |
| Ocultar ação fora do perfil | interface | **Conveniência, não segurança.** A fronteira é o dado |

---

## 4. Superfície de leitura — as views

A aplicação **prefere a view ao fato bruto** para grandezas derivadas. Todas respeitam a RLS das
tabelas de origem.

| View | Entrega | Consumidor previsto |
|---|---|---|
| `vw_cursos_regime_vigente` | Regime resolvido pela vigência | Cursos, DSA, motor preditivo |
| `vw_turmas_rotulo` | Rótulo completo da turma | Toda tela com seletor de turma |
| `vw_instrutor_disciplina_rotulada` | Habilitação com rótulos | Atribuição, LIQ |
| `vw_ocupacao_ta` | Ocupação de tempos por dia | DSA, detecção de conflito |
| `vw_carga_horaria_turma` | Carga por turma | Relatório do curso |
| `vw_conformidade_tetos` | Situação dos tetos AEC/TAD/TR | Painel de conformidade — **alerta, não bloqueio** |
| `vw_instrutor_carga_anual` | Carga anual do docente | Ficha de Docentes, LIQ |
| `vw_avaliacoes_situacao` | Situação de agendamento e vista | Avaliações |
| **`vw_unidades_ensino_execucao`** | **Previsto × executado por unidade** — **nova** | **É a origem da agregação de `vw_disciplinas_execucao`** — existe porque o agregado por disciplina precisa dela, não por antecipação de tela (Princípio X) |
| **`vw_disciplinas_execucao`** | Previsto × executado por disciplina × turma — **reescrita sobre a anterior** | **CHD, DSA, Cronograma, motor preditivo** |

**A mudança de grão é invisível ao consumidor.** `vw_disciplinas_execucao` mantém a mesma assinatura
pública: quem a consome hoje continua consumindo amanhã. É o que a rota (b) prometeu e o que este
contrato garante.

**Sobre `vw_instrutor_carga_anual`:** onde existirem as duas implementações — a view e a função pura
de `lib/dominio/` —, **a função pura é a referência e a view é testada contra ela**, nunca o contrário.

---

## 5. Erros que a aplicação precisa traduzir

O texto cru do sistema de dados **nunca** chega ao usuário (`RF-DADOS-06`). A Server Action captura e
traduz para português, com mensagem específica.

| Situação | O que o usuário deve ler |
|---|---|
| Violação de unicidade | O que já existe, nomeado. Ex.: *"Já existe uma disciplina com o código MAT neste curso."* |
| Violação de referência | Por que não pode. Ex.: *"Este curso tem turmas vinculadas e não pode ser removido. Desative-o."* |
| Sobreposição de vigência | *"Já existe um regime deste tipo vigente no período informado."* |
| Tentativa de gravar derivado | Não deve ocorrer — é defeito de código, não de uso |
| **Acesso negado pela RLS** | **Distinguir "não há" de "você não vê"** — ver §6 |

---

## 6. A armadilha da tela vazia

**Uma regra de leitura restritiva demais faz a tela abrir vazia, sem erro**, e o usuário conclui "não
há cadastro". É risco registrado (doc 20 §11, R-03).

**Obrigação desta superfície:** permitir distinguir *"não há registro"* de *"há registro que você não
alcança"*. A leitura da matriz de permissão é aberta a qualquer sessão autenticada **exatamente para
isto** — a aplicação sabe se o usuário tem a permissão e pode dizer qual dos dois casos é.

A apresentação é do Épico 4. **A informação existe desde aqui.**

---

## 7. Compatibilidade — o que pode mudar sem quebrar quem consome

| Mudança | Quebra? |
|---|---|
| Acrescentar coluna | Não |
| Acrescentar view | Não |
| Acrescentar valor a domínio administrável | Não |
| Trocar linha da matriz de permissão | Não — **é o mecanismo previsto** |
| Ampliar domínio normativo fechado | Não, mas **exige decisão versionada** |
| Renomear coluna | **Sim** — pega na verificação de tipos antes da produção |
| Mudar assinatura de view | **Sim** — evitado por construção na reescrita de `vw_disciplinas_execucao` |
| Remover coluna ou tabela | **Proibido** em objeto com histórico. O que sai de uso vira anotação e fica |
