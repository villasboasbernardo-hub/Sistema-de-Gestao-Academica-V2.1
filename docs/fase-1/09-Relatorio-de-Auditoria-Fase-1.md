---
title: "CIAARA-11 v2.0 — Relatório de Auditoria da Fase 1"
author: "Auditoria de Arquitetura — Consolidação Normativa"
date: "01/08/2026"
---
> ---
>
> ## ⚠️ NOTA DE CONTEXTO — v2.1 (26/08/2026)
>
> **Este documento é preservado como registro histórico e não foi reescrito para a v2.1.**
>
> Ele registra a auditoria normativa e de cobertura da Fase 1: **12 achados (A-1 a A-12)**,
> 4 pontos de contenção de escopo, **7 recomendações de robustez (R-1 a R-7)** e
> **14 propostas formais (P-1 a P-14)** — das quais 13 foram aprovadas e implementadas e 1 rejeitada,
> em 01/08/2026.
>
> **Por que continua valendo.** Os achados desta auditoria são a fundamentação normativa de boa parte
> das regras do sistema — a taxonomia de 5 categorias (A-1/P-1), as faixas de carga horária docente
> (A-2), o 9º TA autorizado por currículo (A-3/A-4), os tetos de composição da carga horária (A-6/P-8),
> a capacitação didática como alerta (A-9/P-10) e a nomenclatura "Disciplina" (P-14). Nada disso muda
> com a troca de plataforma: são exigências da DGPM-101/103 e das normas DEnsM, não do Google Sheets.
>
> **O que mudou de lugar na v2.1:**
>
> | Item | Onde estava na v2.0 | Onde está na v2.1 |
> |---|---|---|
> | R-3 — limites normativos como configuração | aba `Config_Parametros` | tabela `config_parametros` (documento 21) |
> | R-6 — rastreabilidade requisito ↔ regra ↔ teste | linha "*Origem*" de cada RF | preservada, mais o teste nomeado por `RN-` na suíte de invariantes (documento 03, `RNF-AUD-03`) |
> | R-7 — contenção de escopo pela Matriz de Responsabilidades | documento 00 §7 | preservado, e elevado a Princípio IX da constitution (documento 40) |
> | P-9 (`RNF-NORM-04`) — sequenciamento pedagógico | **rejeitado** pelo responsável | **continua rejeitado.** Não gera requisito na v2.1 |
>
> **Não edite este documento.** Ele é a evidência de que a análise foi feita e de quais decisões o
> responsável tomou, com data. Reescrevê-lo apagaria a trilha.
>
> ---


# Relatório Técnico de Auditoria — Fase 1 (Requisitos)

**Objeto:** suíte de documentos 00 a 08 da Fase 1 do CIAARA-11 v2.0
**Bases normativas:** `Glossário_DEnsM_consolidado.md` · `Matriz de responsabilidades.md` · `Regras_dos_processos_educacionais_consolidado.md` · `Stakeholders.md` (Regimento Interno do CIAARA)
**Base empírica:** planilha viva `Banco de dados CIAARA-11 (4).xlsx`, conferida em 31/07/2026
**Base de observações:** 14 comentários novos registrados nos documentos 02, 03 e 04

---

## Nota de execução (v1.3, 01/08/2026)

O responsável aprovou a execução das 14 propostas formais e das 7 recomendações de robustez desta auditoria, com três orientações específicas, transcritas e aplicadas como segue:

1. **P-1 — Alternativa 1**, e não a Alternativa 3 recomendada pela auditoria (seção 5): a taxonomia normativa completa (CHD/AEC/TAD/TR) foi adotada integralmente, com **Estudo Individual registrado em categoria à parte** — não absorvido em nenhuma das quatro grandezas normativas, por ser, na prática, 77% do volume de lançamentos e ter natureza distinta de AEC/TAD/TR. Esta é uma decisão de arquitetura de dados tomada pelo responsável, divergente da recomendação técnica original; registrada aqui para rastreabilidade.
2. **P-5 — não aplicada como proposta genérica.** O responsável instruiu que a solução fosse buscada no documento de regras de tempos de aula da pasta do projeto. A investigação (ver A-3/A-4 revisados abaixo) localizou essa fundamentação **nos currículos por curso** (item 2.1 de cada PDF, "Diretrizes Gerais do Curso"), não em um documento único e explícito como o responsável talvez esperasse. O achado A-3 foi **revertido**: o 9º TA da Configuração D não é defeito, é autorização curricular explícita (CAHO, C-Ap-HN, C-Ap-FR). O achado A-4 (Config D e E sem janela de almoço) permanece como item de correção de dados de migração, não como nova regra de validação.
3. **P-10, conforme escrita pelo responsável** ("Não aplicar a proposta... descondire A-7, é uma regra muito exigente") — **refere-se, pelo conteúdo e pelo achado citado (A-7), à proposta P-9 desta seção**, não à proposta efetivamente numerada P-10 no relatório original (que trata do achado A-9, capacitação didática). Esta discrepância de numeração é registrada aqui de forma transparente: **P-9/A-7 (restrições de sequenciamento pedagógico) foi rejeitada**, exatamente como instruído; **P-10/A-9 (alerta de capacitação didática) foi implementada**, por não ter sido objeto de nenhuma objeção e por a autorização geral de execução cobri-la.

Todas as 7 recomendações (R-1 a R-7) foram implementadas. O detalhamento por item está nas seções 2, 5 e 6 abaixo, cada achado/proposta/recomendação agora com seu status final.

---

## 1. Sumário executivo

A auditoria confrontou os oito documentos da Fase 1 com quatro documentos normativos consolidados, com 14 novas observações do responsável e com a base de dados real. O resultado é positivo quanto à **cobertura** — a Fase 1 está substancialmente completa — e preocupante quanto à **precisão normativa**: a documentação foi construída por engenharia reversa do código, sem acesso ao corpo normativo do Sistema de Ensino Naval, e isso produziu erros de fundamento que não seriam detectáveis apenas lendo o código.

**O achado de maior consequência é A-2:** a regra que limita a carga horária semanal do instrutor no motor preditivo confunde o *número do regime de trabalho* com o *teto de horas de aula*. Pela DGPM-103, um docente de regime de 20h deve ministrar entre 8 e 12 horas de aula semanais, não 20. Como **90,4% do corpo docente cadastrado está no regime de 20h**, o motor preditivo pode alocar sistematicamente até 67% a 150% acima do máximo normativo, num controle que é auditado externamente pela CoPeCoD.

**O achado de maior impacto conceitual é A-1:** o termo "Atividade Extraclasse", introduzido na revisão anterior como categoria central do modelo, tem definição normativa oficial que é o **oposto** da adotada — a norma exclui a AEC da carga horária da disciplina, e usa como exemplos de AEC justamente as atividades que a documentação classificou como "extracurriculares".

Foram identificados **12 achados**, **4 pontos de gold plating**, **7 recomendações de robustez** e **14 propostas formais**, submetidas à trava de governança. **Em 01/08/2026, o responsável aprovou a execução de 13 das 14 propostas e das 7 recomendações**, com as três orientações registradas na "Nota de execução" acima; **1 proposta (P-9, achado A-7) foi explicitamente rejeitada**. O status final de cada item está detalhado nas seções 2, 5 e 6.

---

## 2. Achados de auditoria

Cada achado indica **Severidade** (Crítica / Alta / Média / Baixa), a **evidência** que o sustenta e a **proposta** correspondente, quando houver.

### A-1 · Conflito de definição: "Atividade Extraclasse" — Severidade: Crítica

**Evidência.** O Glossário DEnsM (§2) define **AEC — Atividades Extraclasse** como atividades que complementam o ensino — *palestras, visitas técnicas, viagens, treinamentos esportivos* — e que **não são computadas na carga horária das disciplinas**, com teto de 10% do somatório das CHD. A documentação interna (documento 04, RN-EVT-01) definiu "Atividade Extraclasse" como atividade *vinculada a uma disciplina e que conta a carga horária dela*. As duas definições divergem em ambos os eixos: no cômputo e nos exemplos.

Há um segundo nível do problema. A norma **não usa** o termo "extracurricular". Ela decompõe a Carga Horária Total pela fórmula **CHT = CHD + AEC + TAD + TR**, com três tetos distintos (AEC 10% das CHD; TAD 5% da CHR; TR 10% da CHR). A taxonomia de três categorias proposta na revisão anterior não mapeia essa estrutura de quatro grandezas.

A conferência da base confirma que o problema é real e não teórico. Os 663 lançamentos de `Eventos_Extracurriculares` distribuem-se hoje entre grandezas normativas diferentes: **Estudo Individual 512 (77%)** e Monitoria 13 — de natureza curricular; Palestra 42, Visita Técnica 11, Treinamento Físico 2, Oficina 3 — AEC própria; Atividade Administrativa 34 — TAD; Tempo Reserva 11 — TR. Um único balde acumula quatro categorias com tetos normativos distintos, e nenhum teto é verificado.

**Impacto.** Atinge o modelo conceitual de dados, o cálculo de carga horária de disciplina, o Cronograma, o motor preditivo e a taxonomia de tipos de lançamento. É a alteração de maior alcance da Fase 1.

**Proposta P-1** (três alternativas na seção 5). **✅ Aprovada e implementada — Alternativa 1** (taxonomia normativa completa, com Estudo Individual em categoria à parte, ver Nota de execução). Requisitos: documento 02, RF-DSA-01, RF-EXTRA; regra: documento 04, RN-EVT-01; modelo de dados: documento 05, seção 7.1 (de-para de migração).

### A-2 · Teto de carga horária docente confunde regime com horas de aula — Severidade: Crítica

**Evidência.** A regra RN-2027-06 respeita "o limite semanal do regime de trabalho dele (20h ou 40h/dedicação exclusiva, aproximando 1 tempo de aula a 1 hora)". Pela DGPM-103 (Regras §5.1; Glossário DEnsM §12), o regime designa o vínculo com o estabelecimento; as horas de **aula** são um subconjunto: **20h → 8 a 12 h de aula**; **40h → 16 a 24 h**; **DE → 16 a 30 h**. O restante é Tempo de Permanência (planejamento, reuniões, elaboração de material). A equivalência "1 TA ≈ 1 hora" usada pela regra está correta e é normativa; o erro está no teto.

Distribuição real do corpo docente cadastrado: **20h Semanais — 160 instrutores (90,4%)**; 40h — 11; Dedicação Exclusiva — 6. Para a esmagadora maioria do cadastro, o teto aplicado é 20 TA/semana quando o máximo normativo é 12 — uma folga indevida de 67%. Nos casos em que o motor emite "alerta de sobrecarga" ao estourar 20, a sobrecarga normativa real já ocorreu muito antes.

A Matriz de Responsabilidades registra que a fiscalização dos limites semanais de aula é atribuição da CIAARA-11 **sob auditoria da CoPeCoD** — ou seja, trata-se de um controle com auditoria externa, não de conveniência interna de planejamento.

**Observação metodológica.** Há divergência entre as próprias fontes normativas consolidadas: o Glossário (§12) agrupa "40h/DE: 16 a 30h", enquanto as Regras (§5.1) separam "40h: 16-24" e "DE: 16-30". A proposta adota a leitura mais restritiva e conservadora (as Regras), e a divergência fica registrada para confirmação.

**Proposta P-2.** **✅ Aprovada e implementada.** Regra: documento 04, RN-2027-06 revisada; requisito não-funcional: documento 03, RNF-NORM-03.

### A-3 · Configuração de horário excede o limite normativo de tempos de aula por dia — Severidade: ~~Alta~~ **Revertida — v1.3**

**🔄 Resolução (v1.3, 01/08/2026).** Por instrução do responsável, a investigação foi refeita a partir dos currículos por curso (item 2.1, "Diretrizes Gerais do Curso" de cada PDF aprovado pela DEnsM), em vez de um documento único de regras de tempos de aula. **Conclusão: este achado estava incorreto.** Os currículos de **CAHO**, **C-Ap-HN** e **C-Ap-FR** autorizam explicitamente, em "situações especiais", um 9º TA diário como "tempo opcional de apoio previsto no DSA" — exatamente a Configuração D encontrada na base. Não é uma não conformidade; é uma exceção curricular formal, já prevista pela norma que rege cada curso individualmente. O texto original do achado é preservado abaixo para rastreabilidade da análise.

**Evidência.** O Glossário DEnsM (§2) fixa: **7 TA de 50 min** (intervalos de 10 min) **ou 8 TA de 45 min** (intervalos de 5 min); **mais de 8 TA por dia exige justificativa específica**. A conferência de `Horarios_Tempos_Aula` mostra:

| Config | TA/dia | Duração | Intervalos | Situação |
|---|---|---|---|---|
| A | 7 | 50 min | 10 min manhã / 5 min tarde | ✅ Conforme |
| B | 8 | 50 min | 10 min / 5 min | ⚠️ Dentro do teto de 8, mas fora dos dois padrões normativos (8 TA pareia com 45 min) |
| C | 8 | 45 min | 5 min | ✅ Conforme |
| D | **9** | 45 min | 10 min | 🚨 **Excede o limite de 8 TA** |
| E | 8 | 45 min | 5 min | ✅ Conforme quanto ao regime |

`Cad_Cursos` mostra que a Config D é adotada como regime de exceção ("9 Tempos de 45 min") por **3 cursos**, e a Config B ("8 Tempos de 50 min") por **2 cursos**.

**Complicador.** As duas observações desta rodada divergem entre si sobre os pares admitidos: a observação 02#2 fala em "8 tempos ou 9 tempos"; a 02#4 fala em "regime padrão de 7 tempos e regime de exceção de 8 tempos". A norma respalda a 02#4. A base respalda a 02#2. Não é possível resolver sem decisão do responsável.

**Nota de rigor.** A norma não proíbe 9 TA — exige *justificativa específica*. É plausível que os três cursos tenham justificativa formal registrada fora do sistema. O achado não afirma irregularidade; afirma que **o sistema não registra nem exige essa justificativa**, e portanto não é auditável nesse ponto.

**Proposta P-5.** **🔄 Não aplicada como proposta genérica — resolvida por fundamentação curricular** (ver Nota de execução, item 2). Requisito: documento 02, RF-HOR-03 [RESOLVIDO — v1.3], RF-HOR-03.1 (9º TA como alerta, não bloqueio); requisito não-funcional: documento 03, RNF-NORM-01 revisado.

### A-4 · Duas configurações de horário não reservam a janela de almoço — Severidade: Alta (mantida — item de migração)

**Evidência.** A observação 02#2 estabelece como requisito que a janela de 12h00 às 13h00 seja reservada em **todos** os cursos. Conferindo as configurações:

- **Config A** — 4º TA termina 12h00, intervalo até 13h05. ✅
- **Config B** — idem. ✅
- **Config C** — 5º TA termina 11h55, intervalo até 13h05. ✅
- **Config D** — 5º TA 11h40–12h25, 6º TA 12h35–13h20. 🚨 **Aulas atravessam o almoço.**
- **Config E** — 5º TA 11h20–12h05, 6º TA 12h10–12h55, 7º TA 13h00–13h45. 🚨 **Aulas atravessam o almoço.**

A Config E é o horário **padrão** de 2 cursos; a Config D é regime de exceção de 3 cursos. Não se trata de configurações órfãs.

**Proposta P-5** (tratada em conjunto com A-3). **✅ Mantida como item de correção de dados de migração** (não como nova regra de validação) — nenhum dos currículos consultados prescreve horário de relógio, apenas quantidade e duração de TA; a ausência de janela de almoço nas Configs D e E permanece um problema de dado, a corrigir no ato da migração. *Origem: documento 05, seção 7.2, item 4.*

### A-5 · Avaliação agendada não consome tempo de aula — Severidade: Alta

**Evidência.** Diagnóstico preciso da observação 02#9. Existem **dois caminhos paralelos e não vinculados**: a aba `Avaliacoes` (111 linhas) registra o *agendamento* — tipo, data, data de vista, responsável, status — e **não possui coluna de tempos consumidos**; a aba `Registro_Aulas_E_Atividades` contém **186 linhas com `Tipo_Atividade = "Avaliação"`**, que consomem TA normalmente. Os números não coincidem e os cadastros não se referenciam: agendar uma avaliação não produz consumo de carga horária, e registrar a execução exige um segundo lançamento manual, que pode ou não acontecer.

A norma é explícita: a **CHD** é o somatório dos TA da disciplina *incluindo o tempo de avaliações e de vista/comentários de prova* (Glossário DEnsM §2). O modelo atual, portanto, subdimensiona a carga horária real das disciplinas sempre que o duplo lançamento não é feito.

**Proposta P-6.** **✅ Aprovada e implementada.** Regra: documento 04, RN-AVAL-02 [NOVA — v1.3]; modelo de dados: documento 05, entidade `Avaliacoes` revisada (campos `Tempos_Consumidos`/`TA_Inicial`); requisito: documento 02, RF-AVAL-05.

### A-6 · Tetos normativos de composição de carga horária não são verificados — Severidade: Média

**Evidência.** A norma fixa AEC ≤ 10% do somatório das CHD, TAD ≤ 5% da CHR e TR ≤ 10% da CHR. O sistema importa as reservas de Administração e Tempo Reserva do PROENS como valores absolutos por curso (RN-2027-03) e **não as confronta com os tetos percentuais**. Como o sistema já conhece a carga horária de todas as disciplinas de cada curso, dispõe de tudo o que precisa para calcular a CHR e verificar os três tetos. É uma verificação de custo baixo e valor de conformidade alto — mas depende da resolução de A-1, porque sem categorias corretas não há o que somar.

**Proposta P-8.** **✅ Aprovada e implementada** (destravada pela resolução de A-1/P-1). Requisito: documento 02, RF-EXTRA-04; requisito não-funcional: documento 03, RNF-NORM-02 revisado.

### A-7 · Restrições pedagógicas de sequenciamento não são consideradas — Severidade: Média — **❌ Rejeitada — v1.3**

**Evidência.** O PCP-FCT-2 e as normas de currículo fixam: intervalo obrigatório de 10 min a cada 2 TA geminados; **proibido mais de 2 TA consecutivos com a mesma técnica de ensino** (3 TA em aulas práticas/demonstrações); **3 TA consecutivos exigem no mínimo duas técnicas distintas**; aula expositiva/dialógica limitada a **5 TA por dia letivo**. O sistema já grava a `Metodologia` de cada lançamento — ou seja, **tem o dado e não o usa**. Nenhuma dessas restrições é verificada hoje, nem entrou na especificação do motor de sugestão do DSA (RF-DSA-08), que é exatamente onde teria maior valor.

**Ponto que exige confirmação.** A regra RN-2027-04 aloca Prova Mista como bloco fechado de **3 TA contíguos**. Se uma avaliação for considerada "técnica de ensino" para efeito da regra de sequenciamento, haveria conflito direto. A leitura desta auditoria é que avaliação não é técnica de ensino e portanto não há conflito — mas a interpretação deve ser confirmada com a CIAARA-12.1 (Seção de Orientação Pedagógica), que é a área competente.

**Proposta P-9.** **❌ Rejeitada explicitamente pelo responsável** em 01/08/2026 ("é uma regra muito exigente e será desconsiderada" — ver Nota de execução, item 3, sobre a numeração citada pelo responsável como "P-10"). Não gera nenhum RF, RN ou critério de aceitação nesta versão. Registrado para memória em documento 03, RNF-NORM-04 [REJEITADO — v1.3].

### A-8 · Seleção de instrutores por disciplina indisponível — Severidade: Média

**Evidência.** A observação 02#5 relata que a funcionalidade de selecionar instrutores para uma disciplina existiu em versão anterior e não está disponível na versão corrente. A conferência da base é consistente com uma regressão: `Cad_Matérias` mantém a coluna `ID_Instrutor` (lista de IDs) e a coluna derivada `Instrutores_Selecionados`, e a aba `Instrutor_Materia` mantém 798 vínculos de habilitação — ou seja, **a estrutura de dados está íntegra**; o que falta é o ponto de entrada na interface. Não é perda de dado, é perda de acesso.

**Proposta:** tratada como correção funcional direta (documento 02, RF-MATERIAS-05), sem necessidade de decisão estrutural.

### A-9 · Exposição de conformidade em capacitação didática — Severidade: Média

**Evidência.** **148 dos 177 instrutores (83,6%) não têm capacitação didática registrada.** A norma (Regras §5.3) permite que militares sem curso de técnica de ensino atuem por **no máximo 1 ano**, condicionados à primeira capacitação disponível; a Matriz atribui à CIAARA-12.1, em interface com a CIAARA-11, formalizar esse período de orientação. O PCQD exige ainda que **100% dos docentes** participem de ao menos um evento de capacitação a cada três anos.

O sistema já possui os campos `Capacitação Didática`, `Início da Docência na MB` e `Início da Docência no CIAARA` — tem, portanto, os dados necessários para calcular a janela de um ano e sinalizar os casos vencidos, sem nenhuma coleta adicional.

**Ressalva importante.** Não é possível, com os dados disponíveis, distinguir **lacuna de cadastro** de **exposição normativa real**. Os 83,6% podem ser majoritariamente campo não preenchido. O achado aponta a ausência do controle, não a existência da irregularidade.

**Proposta P-10.** **✅ Aprovada e implementada, como alerta (não bloqueio)** — ver R-4. Requisito: documento 02, RF-INSTR-16; requisito não-funcional: documento 03, RNF-NORM-05 revisado.

### A-10 · Duplicata de disciplina migrou de curso; contorno não a alcança — Severidade: Média

**Evidência.** A observação 04#3 afirma que as duplicatas do C-Ap-FR foram removidas. **Confirmado** — a conferência não encontra nenhuma duplicata naquele curso. Contudo, a mesma verificação encontrou **uma duplicata nova**: `C-Esp-ALH` / `ALH-II`, em duas linhas. Como a função de contorno em tempo de leitura é escrita especificamente para o C-Ap-FR, ela **não captura** este caso — a disciplina é contada duas vezes nos cálculos.

O padrão importa mais que a instância: o contorno resolveu um sintoma em um curso e não impediu a recorrência do problema em outro. A correção durável é uma validação genérica de unicidade `ID_Curso` + `Cod_Matéria`, e não um novo contorno específico.

**Proposta P-11.** **✅ Aprovada e implementada.** Requisito: documento 02, RF-DADOS-06; regra: documento 04, nota de RN-MAT-02 estendida (31/07/2026).

### A-11 · Exclusão lógica de instrutor nunca exercitada em produção — Severidade: Baixa

**Evidência.** A coluna `Status` de `Cad_Instrutor` está **vazia nos 177 registros**. A regra RN-INST-02 é classificada como regra de negócio de risco Alto a preservar, e o código a implementa — mas nenhum instrutor foi jamais desativado. Todo o comportamento dependente (ocultar de novas atribuições, preservar em histórico, reativar) está sem qualquer cobertura empírica. Some-se a isso que a semântica atual depende de interpretar célula vazia como "ativo", o que é frágil.

**Proposta P-12.** **✅ Aprovada e implementada.** Requisito: documento 02, RF-DADOS-07; regra: documento 04, RN-INST-05 [NOVA — v1.3].

### A-12 · Lacunas de cobertura da Fase 1 — Severidade: Média

Auditoria de completude por categoria exigida:

| Categoria | Situação |
|---|---|
| Requisitos Funcionais | ✅ Cobertos; ampliados nesta revisão com RF-HOR (regime/horário), RF-2027-04/05 (planejamento editável), RF-CRONOS-09/10 (salas), RF-AVAL-05/06, RF-INSTR-13/14/15, RF-MATERIAS-05/06 |
| Requisitos Não-Funcionais | ✅ Cobertos; **lacuna corrigida nesta revisão** com a nova seção 10 (Conformidade Normativa), inexistente até aqui |
| Modelo de Domínio | ✅ Coberto; vocabulário alinhado ao SEN nesta revisão |
| Restrições de Compliance | ⚠️ **Era a maior lacuna da Fase 1** — não havia nenhum tratamento de conformidade normativa. Corrigida com RNF-NORM-01 a 07 e com a classificação de conformidade do documento 04 |
| Matriz de Permissões RBAC | ⚠️ Coberta, mas com três perfis sem correspondência regimental (documento 01, seção 2.3) e **sem dados**: a aba `Usuarios` tem 4 registros para um modelo de nove perfis |
| Stakeholders | ✅ Corrigido nesta revisão: seis atores institucionais estavam ausentes e o nome da CIAARA-12 estava incorreto |
| Rastreabilidade | ✅ **Resolvida — v1.3** (recomendação R-6): documento 04 já classifica cada regra por origem normativa/interna (RNF-NORM-07); "Matéria" adotado explicitamente como sinônimo transitório de "Disciplina" no documento 07, com nota de convergência terminológica (P-14) |

**Duas pendências operacionais persistem desde a primeira versão e continuam sem solução:** a aba `Responsaveis_Curso` permanece **com zero registros**, o que significa que todo DSA impresso sai sem assinatura; e a aba `Usuarios` mantém apenas 4 registros.

---

## 3. Auditoria de escopo — anti-gold plating

O sistema é o da **Divisão de Administração Acadêmica (CIAARA-11)**, não do Centro inteiro. Este é o critério objetivo de contenção, e a Matriz de Responsabilidades permite aplicá-lo com precisão. Quatro pontos merecem atenção:

### G-1 · Motor de sugestão automática do DSA (RF-DSA-08) — risco alto de inchaço

Inspirado no FET, é o requisito de maior complexidade algorítmica de toda a v2.0: envolve prioridade de disciplina, limites diário e semanal, preferências e restrições gerais e semanais por instrutor. É um problema de *timetabling*, NP-difícil na forma geral, sendo especificado como acréscimo a uma versão cujo propósito declarado é reestruturação.

**Recomendação (✅ acatada — R-5):** manter no escopo, mas **fatiar**. Entregar primeiro uma sugestão simples e determinística (distribuir a disciplina mais apertada nos espaços livres respeitando os tetos rígidos), medir a taxa de aproveitamento real pelo operador e só então decidir se vale sofisticar. Um motor sofisticado cuja sugestão seja descartada em 80% dos casos é esforço perdido. **Restrições de sequenciamento pedagógico (A-7/P-9) foram rejeitadas pelo responsável em 01/08/2026 e não entram em nenhuma entrega desta versão** — a ressalva original desta recomendação tornou-se, na prática, a decisão final.

### G-2 · Visão de ocupação de salas (RF-CRONOS-09) — fronteira já delimitada, manter vigilância

O risco não está na visão pedida, e sim na deriva natural dela para reserva de salas, agenda de simulador, controle de laboratório e manutenção — tudo competência da **CIAARA-14** (com o Simulador de Navegação tendo controle próprio na CIAARA-14.4). A delimitação foi registrada em RF-CRONOS-10. **Recomendação:** manter estritamente leitura e planejamento; qualquer pedido de reserva ou bloqueio de recurso deve ser recusado com base na fronteira organizacional.

### G-3 · RBAC de nove perfis para uma base de quatro usuários — desproporção real

O modelo tem nove perfis, dois deles com atributo de escopo, para uma aba `Usuarios` com **4 registros**. A matriz de teste correspondente (RNF-SEG-05) cresce multiplicativamente. Ainda que os perfis reflitam a estrutura regimental, construir e testar nove trilhas de permissão antes de existir gente para ocupá-las é investimento de baixo retorno.

**Recomendação:** implementar o **modelo de dados** com os nove perfis desde já — é barato e evita migração futura —, mas **ativar e testar** inicialmente apenas os que terão ocupante real na entrada em produção. Os demais ficam declarados e inativos.

### G-4 · Apoio à ROTA (RF-ROTA) — corretamente contido, sem ação necessária

A decisão D7 restringiu o apoio à organização de dados existentes para preenchimento manual, sem geração automática nem integração. Confrontado com a estrutura da avaliação institucional — que envolve RAInt, RAPE, Conselho de Ensino, CAC e dimensões de corpo discente e infraestrutura, todas fora da CIAARA-11 —, o escopo definido está adequado. **Registro apenas para memória de decisão.**

### Nota inversa: um item cujo escopo está subdimensionado

Vale o contraponto. A **fronteira da decisão D5** (abandono da fórmula de média final) revelou-se, na auditoria, mais sólida do que a documentação anterior sugeria: notas, médias e situação de aprovação são competência da CIAARA-32 (Registro Escolar) e da CIAARA-12.3 (Avaliação do Ensino), com homologação de rois de notas pela CIAARA-10. A decisão deixa de ser simplificação de conveniência e passa a ser **correção de fronteira organizacional** — está agora registrada nesses termos em RNF-NORM-06 e no documento 01.

---

## 4. Incoerências detectadas

Distinguem-se as incoerências **entre normas e prática** das incoerências **internas à documentação**.

**I-1 · Entre fontes normativas.** Glossário DEnsM §12 agrupa "regime de 40h/DE: 16 a 30h de aula"; Regras §5.1 separa "40h: 16 a 24h" e "DE: 16 a 30h". A proposta P-2 adota a leitura mais restritiva. **Requer confirmação com a CIAARA-11.**

**I-2 · Entre observações da mesma rodada.** A observação 02#2 indica regimes de "8 ou 9 tempos"; a 02#4 indica "7 ou 8 tempos". A norma respalda a segunda; a base de dados respalda a primeira. **Requer decisão** (proposta P-5).

**I-3 · Entre norma e base de dados.** Config D com 9 TA/dia excede o limite de 8 sem justificativa registrada (A-3); Configs D e E não reservam a janela de almoço (A-4).

**I-4 · Entre norma e documentação interna.** Definição de "Atividade Extraclasse" (A-1) e teto de carga horária docente (A-2).

**I-5 · Interna à documentação, entre versões.** A revisão v1.1 propôs "Margem de Capacidade" para o conceito informalmente chamado de "gordura", sem saber que a grandeza tem nome normativo próprio — **Tempo Reserva (TR)**, com teto de 10% da CHR. Corrigido no documento 07 nesta revisão: "Margem de Capacidade" fica restrito ao sentido algorítmico de folga instantânea.

**I-6 · Interna, entre regra preservada e requisito novo.** RN-2027-07 declara o resultado do motor não editável; RF-2027-04 exige que seja editável. Resolvido em favor do requisito novo, com a regra marcada como revertida.

**I-7 · Superada — v1.3.** RN-2027-04 (Prova Mista em bloco de 3 TA contíguos) versus a regra de no máximo 2 TA consecutivos com a mesma técnica de ensino (A-7). Com a rejeição explícita de P-9/A-7 pelo responsável, esta potencial incoerência deixa de ter efeito prático nesta versão — não há verificação de sequenciamento de técnica de ensino a confrontar com RN-2027-04. Fica registrada apenas para memória, caso a restrição seja reavaliada em versão futura.

**Não foi identificado nenhum choque entre as Normas da Marinha e o Regimento Interno do CIAARA.** O Regimento distribui competências de forma consistente com as normas da DEnsM; as incoerências encontradas são entre a **implementação do sistema** e as normas, não entre as normas entre si.

---

## 5. Propostas formais — status final (01/08/2026)

**13 das 14 propostas foram aprovadas e implementadas; 1 foi explicitamente rejeitada.** Ver "Nota de execução" no início deste documento para as três orientações específicas do responsável.

| # | Proposta | Origem | Impacto | Esforço | Status final |
|---|---|---|---|---|---|
| **P-1** | Resolver a taxonomia de atividades (ver alternativas abaixo) | A-1 | Modelo de dados, cálculo de CH, Cronograma | Alto | ✅ Aprovada — **Alternativa 1** (não a recomendada Alt. 3), com Estudo Individual à parte |
| **P-2** | Corrigir o teto de carga horária docente para as faixas da DGPM-103 (20h → 8-12; 40h → 16-24; DE → 16-30) | A-2 | Motor preditivo, alertas | Baixo | ✅ Aprovada e implementada |
| **P-3** | Tornar o planejamento anual dado de primeira classe, versionado por ano e editável | 02#3 | Modelo de dados | Médio | ✅ Aprovada e implementada |
| **P-4** | Acrescentar data de vigência à configuração de regime/horário, com imutabilidade do histórico | 02#4 | Modelo de dados | Médio | ✅ Aprovada e implementada |
| **P-5** | Definir os pares regime/duração admitidos e exigir justificativa registrada acima de 8 TA; corrigir Configs D e E quanto ao almoço | A-3, A-4, I-2 | Dados e validação | Baixo | 🔄 Resolvida por via distinta — fundamentação curricular, não teto genérico |
| **P-6** | Unificar agendamento e execução de avaliação num único fato que consome TA | A-5 | Modelo de dados | Médio | ✅ Aprovada e implementada |
| **P-7** | Modelar o modo de atribuição da disciplina (dividido × simultâneo) | 02#5 | Modelo de dados | Baixo | ✅ Aprovada e implementada |
| **P-8** | Calcular e verificar os tetos normativos AEC/TAD/TR | A-6 | Cálculo, alertas | Baixo (depende de P-1) | ✅ Aprovada e implementada |
| **P-9** | Verificar restrições de sequenciamento pedagógico no DSA | A-7 | Validação, motor de sugestão | Médio | ❌ **Rejeitada explicitamente** pelo responsável |
| **P-10** | Alertar capacitação didática vencida (1 ano) e apoiar o PCQD | A-9 | Alertas | Baixo | ✅ Aprovada e implementada (como alerta, R-4) |
| **P-11** | Substituir o contorno específico de curso por validação genérica de unicidade | A-10 | Lógica de leitura | Baixo | ✅ Aprovada e implementada |
| **P-12** | Definir `Status` explícito para todos os instrutores na migração | A-11 | Dados | Baixo | ✅ Aprovada e implementada |
| **P-13** | Renomear o perfil "Coordenador de Curso" para "Encarregado de Curso" | Doc 01, §2.3 | Nomenclatura | Baixo | ✅ Aprovada e implementada |
| **P-14** | Adotar "Disciplina" como termo canônico (hoje "Matéria") e vincular requisitos a critérios de teste | A-12, Doc 07 | Nomenclatura, rastreabilidade | Médio | ✅ Aprovada — vocabulário de redação aplicado; renomeação física de schema registrada para a Fase 2 |

### Detalhamento da P-1 — três alternativas

**Alternativa 1 — Adotar integralmente a taxonomia normativa.** Substituir as três categorias por quatro grandezas: **CHD** (aula + avaliação + vista de prova, vinculadas a disciplina), **AEC** (palestra, visita técnica, treinamento esportivo — teto 10%), **TAD** (administração — teto 5%) e **TR** (tempo reserva — teto 10%). *Vantagem:* conformidade total, tetos verificáveis, vocabulário comum com a DEnsM e com o PROENS. *Custo:* recategorizar os 663 lançamentos existentes; decidir onde entra "Estudo Individual", que é 77% do volume e não se encaixa limpo em nenhuma das quatro.

**Alternativa 2 — Manter a taxonomia interna, renomeando o termo em conflito.** Preservar o modelo de três categorias, mas trocar "Atividade Extraclasse" por um termo que não colida com a norma — por exemplo, **"Atividade Curricular Complementar"** —, reservando "Extraclasse/AEC" ao sentido normativo. *Vantagem:* baixo custo, sem recategorização em massa. *Custo:* o sistema permanece incapaz de verificar os tetos normativos, e a comunicação com a DEnsM continua exigindo tradução mental.

**Alternativa 3 — Modelo híbrido (recomendada).** Manter as categorias operacionais que o usuário já domina, e acrescentar a cada tipo de lançamento um **campo de classificação normativa** (CHD / AEC / TAD / TR). O operador continua lançando "Palestra"; o sistema sabe que aquilo é AEC e soma no teto certo. *Vantagem:* conformidade sem retreinar o usuário nem reescrever a interface; a recategorização vira uma tabela de-para aplicada uma vez na migração. *Custo:* uma coluna adicional e a manutenção da tabela de-para.

**Recomendação da auditoria: Alternativa 3.** Ela resolve A-1 e destrava P-8 com o menor impacto sobre a operação e sobre o cronograma.

---

## 6. Recomendações de robustez estrutural

**Todas as 7 recomendações abaixo foram aprovadas e implementadas em 01/08/2026.**

**R-1 · Sequenciar a migração pela dependência real, não pela ordem dos épicos. ✅ Implementada.** As propostas P-1, P-3, P-4, P-6 e P-7 são todas alterações de modelo de dados. Executá-las em migrações separadas multiplica risco e retrabalho. Consolidá-las em **uma única migração**, precedida de snapshot, é sensivelmente mais seguro. A criação da planilha nova (RNF-PLAT-01) é a oportunidade natural para isso — e ela ocorre uma vez só. *Implementado em:* documento 06, Épico C (seção "Nota de consolidação").

**R-2 · Fazer da nova planilha um marco de qualidade, não apenas de estrutura. ✅ Implementada.** A migração é a única janela em que corrigir dado é barato. Nela devem entrar: duplicata do C-Esp-ALH (A-10), `Status` de instrutor (A-11), Configs D e E de horário (A-4), recategorização de atividades (P-1) e o povoamento de `Responsaveis_Curso`, pendente desde a primeira versão e que hoje faz todo DSA sair sem assinatura. *Implementado em:* documento 05, seção 7.2 (checklist de qualidade da migração, 8 itens).

**R-3 · Tratar limites normativos como configuração, não como constante em código. ✅ Implementada.** Os valores de 10%/5%/10%, as faixas de carga horária docente e os limites de TA diários são estáveis, mas **não permanentes** — normas são revisadas. Mantê-los em tabela de parâmetros, com identificação da norma de origem, evita reeditar código a cada revisão normativa. É a mesma lição já aprendida com as constantes anuais do PROENS. *Implementado em:* documento 03, RNF-NORM-08 [NOVO — v1.3].

**R-4 · Adotar alerta em vez de bloqueio para regras normativas. ✅ Implementada.** Configurações fora do padrão já existem em produção e podem ter justificativa formal registrada fora do sistema (caso dos 9 TA). Bloquear inviabilizaria a operação real; não sinalizar perpetua a opacidade. O caminho correto é **sinalizar e exigir justificativa registrada**, mantendo a decisão com o operador e a rastreabilidade com o sistema. *Implementado em:* documento 04, RN-DEG-02 [NOVA — v1.3]; aplicado em RF-HOR-03.1 (9º TA) e RF-INSTR-16 (capacitação didática).

**R-5 · Validar o motor de sugestão do DSA contra uma semana real antes de generalizar. ✅ Implementada.** Aplicar o mesmo método já validado no projeto — testar contra o CAHO 2026 antes de generalizar. Uma semana já lançada manualmente é o melhor caso de teste possível: compara-se a sugestão com o que o operador de fato fez. *Implementado em:* documento 02, RF-DSA-08.1 [NOVO — v1.3]; documento 06, Épico H revisado.

**R-6 · Fechar a rastreabilidade requisito → regra → teste. ✅ Implementada (primeiro elo).** Cada requisito do documento 02 deveria apontar a regra do documento 04 que o sustenta e o caso de teste da Fase 4 que o verifica. Os identificadores existem; faltava o vínculo formal. *Implementado em:* documento 03, RNF-AUD-03 [NOVO — v1.3] — formaliza o vínculo requisito↔regra (já praticado nesta revisão via a linha "Origem" de cada RF) e registra o vínculo requisito↔teste como compromisso explícito da Fase 4, não como pendência desta fase.

**R-7 · Registrar a fronteira organizacional como critério permanente de escopo. ✅ Implementada.** A seção 0 do documento 01 — "CIAARA-11 é o código da Divisão de Administração Acadêmica" — é a defesa mais eficaz contra expansão de escopo nas fases seguintes, porque substitui julgamento subjetivo por um teste objetivo: *este processo é atribuído à CIAARA-11 na Matriz de Responsabilidades?* Recomenda-se aplicá-lo a toda nova solicitação da Fase 2 em diante. *Implementado em:* documento 00, seção 7 (critério permanente de contenção de escopo, novo parágrafo introdutório).

---

## 7. Conclusão

A Fase 1 está **completa**: normativamente ancorada (seção 10 do documento 03; classificação de conformidade do documento 04), com as 14 propostas formais e as 7 recomendações de robustez desta auditoria **decididas e, com uma única exceção, implementadas**, em 01/08/2026.

**Resumo final de disposição:**

- **13 propostas aprovadas e implementadas** (P-1 a P-8, P-10 a P-14), uma delas (P-1) por uma alternativa diferente da recomendada pela auditoria (Alternativa 1, não a Alternativa 3) — decisão do responsável, registrada como tal.
- **1 proposta resolvida por via distinta** da formulação original (P-5) — a solução veio da leitura dos currículos por curso, não de uma regra genérica de teto diário, e reverteu por completo o achado A-3 (deixou de ser defeito).
- **1 proposta rejeitada explicitamente** (P-9, achado A-7) — restrições de sequenciamento pedagógico de técnica de ensino não entram nesta versão, por decisão direta do responsável.
- **7 recomendações de robustez, todas implementadas** — consolidação de migração (R-1/R-2), configuração externalizada (R-3), alerta em vez de bloqueio (R-4), fatiamento e validação do motor de sugestão (R-5), primeiro elo da rastreabilidade requisito↔regra (R-6) e formalização do critério de escopo (R-7).

Uma nota de esclarecimento fica registrada para memória do projeto: a segunda mensagem de aprovação do responsável referiu-se a "P-10" ao descartar a restrição de sequenciamento — mas o achado citado (A-7) identifica, sem ambiguidade, a proposta **P-9** desta auditoria como a rejeitada; a proposta efetivamente numerada P-10 (capacitação didática, A-9) não foi objeto de nenhuma objeção e foi implementada. Ver "Nota de execução" no início deste documento.

A Fase 1 está pronta para servir de base à Fase 2 (Arquitetura), com o critério de contenção de escopo da recomendação R-7 (documento 00, seção 7) já em vigor para toda solicitação futura.
