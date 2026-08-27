---
title: "CIAARA-11 v2.1 — Glossário"
author: "Fase 1 do SDLC — Requisitos"
date: "25/08/2026"
version: "2.1"
---

# Glossário — CIAARA-11 Versão 2.1

## Nota de migração (v2.1)

Este documento é a reescrita do `07-Glossario.md` da v2.0 para a **v2.1 — migração para Next.js + Supabase**. A regra que governa esta reescrita é simples e tem duas metades:

- **O vocabulário institucional não se toca. [PRESERVADO]** Todos os termos do domínio de ensino, as grandezas normativas (CHT/CHR/CHD/AEC/TAD/TR/TA), os códigos regimentais e as siglas de curso são reproduzidos **sem uma vírgula de alteração**. São termos **intraduzíveis por decisão de constitution**: nunca traduzidos, nunca abreviados de outra forma, nunca substituídos por sinônimo — em schema, código, interface, spec, commit ou documentação. Uma migração de plataforma que alterasse qualquer entrada desta parte estaria, por definição, errada.
- **O vocabulário técnico é substituído. [MIGRAÇÃO v2.1]** A seção "Termos técnicos do sistema" sai de Apps Script/Sheets e entra em Next.js/PostgreSQL. Nenhum termo antigo é apagado: cada entrada nova traz a coluna **"Equivalente na v2.0"**, para que quem vem do sistema anterior consiga traduzir o que já sabe. Ver seção **Termos técnicos do sistema (v2.0 → v2.1)**.
- **[NOVO — v2.1]** Seção **Termos de migração**, com o vocabulário do corte: paridade funcional, reconciliação, cutover, rollback, congelamento de escrita e dupla escrita. São palavras que a v2.0 nunca precisou, e que na v2.1 aparecem em decisão de risco — precisam significar exatamente a mesma coisa para todos.

*Nota de revisão herdada (v1.3, 01/08/2026): todas as divergências ⚠️ registradas na v1.2 foram resolvidas por decisão do responsável (documento 09, propostas P-1 a P-14, aprovadas em 01/08/2026) — exceto a de sequenciamento pedagógico, que não gerava entrada própria neste glossário. As entradas **AEC**, **Atividade Extraclasse**, **Atividade Extracurricular**, **Estudo Individual**, **TA** e **Regime de Trabalho** foram atualizadas para refletir a taxonomia final (Alternativa 1 — taxonomia normativa completa, com Estudo Individual em categoria à parte) e a fundamentação curricular do 9º TA.*

*Nota de revisão herdada (v1.2, 31/07/2026): alinhamento ao **Glossário Oficial do SEN/DEnsM consolidado**. Onde a definição interna do projeto divergia da definição normativa, a normativa prevalece e a divergência fica registrada explicitamente na própria entrada.*

---

## Nota de vocabulário: "Matéria" (sistema) × "Disciplina" (norma) **[PRESERVADO — e reforçado na v2.1]**

Todo o corpo normativo do SEN — e, por consequência, currículos, PlaDis, CHD e os documentos oficiais do CIAARA — usa o termo **Disciplina**. O sistema CIAARA-11, desde a v1.0, usava **Matéria** em nomes de aba, coluna e tela (`Cad_Matérias`, `ID_Materia`, `Nome_Materia`). São o mesmo conceito. Este glossário adota **Disciplina** como termo normativo preferencial em toda a redação.

**[RESOLVIDO — v2.0, PRESERVADO — v2.1]** A proposta **P-14** foi aprovada e **executada fisicamente na v2.0**: a base de dados passou a usar `Cad_Disciplinas`, `Instrutor_Disciplina`, `ID_Disciplina` e `Nome_Disciplina`, por migração versionada (`migracao/renomear_materia_para_disciplina.py`), com o log acrescentando linhas novas em vez de reescrever as existentes. A FK/PK `ID_Grade` foi deliberadamente mantida — não é sinônimo direto de "Disciplina", é o **slot na grade curricular**.

> **Regra da v2.1, sem exceção:** **"Disciplina" é o nome canônico.** Vale para nome de tabela (`disciplinas`), de coluna (`disciplina_id`, `nome_disciplina`), de tipo TypeScript (`Disciplina`), de rota (`/disciplinas`), de componente, de mensagem de interface, de spec e de mensagem de commit. **"Matéria" não aparece em artefato novo** — sobrevive apenas como sinônimo aceito em conversa e no `codigo` legado migrado, onde é histórico e por isso imutável. Uma tabela `materias` na v2.1 seria uma regressão de vocabulário, não uma escolha de estilo.

---

## Termos institucionais e do domínio de ensino **[PRESERVADO — sem alteração]**

**CIAARA.** Centro de Instrução e Adestramento Almirante Radler de Aquino — organização de ensino da Marinha do Brasil responsável por cursos de hidrografia, oceanografia, meteorologia, navegação e auxílios à navegação.

**DHN.** Diretoria de Hidrografia e Navegação — diretoria da Marinha à qual as áreas de conhecimento ministradas pelo CIAARA se relacionam.

**PROENS.** Programa de Ensino — documento de planejamento anual do CIAARA, elaborado conforme a DGPM-101, que define calendário escolar, cursos/turmas do ano, grade curricular semanal e reservas de Administração/Tempo Reserva por curso. É a diretiva-mãe que o sistema CIAARA-11 opera e acompanha.

**DGPM-101.** Publicação "Normas para os Cursos e Estágios do Sistema de Ensino Naval (SEN)" — norma da Marinha que rege a elaboração do PROENS.

**OM.** Organização Militar — unidade à qual um instrutor está vinculado (ex.: CHM, DHN, CIAARA, BHMN, CAMR, INPG, HNMD, EN).

**P/G.** Posto/Graduação — patente do militar (ex.: CMG, CF, CC, CT, 1°Ten, 2°Ten, SO, 1°SG, 2°SG, 3°SG, CB, MN), base do cálculo de antiguidade no sistema.

**NIP.** Número de Identificação do Pessoal Militar.

**TA. [CORRIGIDO — v1.2; RESOLVIDO — v1.3]** Tempo de Aula — unidade básica de medida de tempo de efetiva atividade de ensino. Definição normativa completa (Glossário DEnsM, §2): o TA tem duração de **45 ou 50 minutos**; para efeito de cálculo de carga horária, **1 TA equivale a 1 hora** (aula + intervalo); o padrão geral é de **7 TA de 50 minutos** (intervalos de 10 min) **ou 8 TA de 45 minutos** (intervalos de 5 min), com um **9º TA opcional de apoio** admitido quando o **currículo do curso** o autorizar explicitamente como situação especial (confirmado nos currículos de CAHO, C-Ap-HN e C-Ap-FR). Toda carga horária no sistema é contada em TA. *A configuração de horário com 9 TA diários encontrada na base (documento 09, achado A-3) foi confirmada como exceção curricular legítima, não como não conformidade — e é **alerta informativo, nunca bloqueio**.*

**CH.** Carga Horária — soma de tempos de aula (TA) previstos ou executados. No vocabulário normativo, decompõe-se nas quatro grandezas abaixo.

**CHT.** Carga Horária Total — somatório de todos os TA de um curso, pela fórmula normativa **CHT = CHD + AEC + TAD + TR**.

**CHR.** Carga Horária Real — somatório estrito das cargas horárias de todas as disciplinas do currículo. É a base de cálculo dos tetos de TAD e TR.

**CHD.** Carga Horária da Disciplina — somatório dos TA destinados a uma disciplina, **incluindo o tempo de avaliações e de vista/comentários de prova**. Esta inclusão é normativa e fundamenta o requisito de que avaliação e vista de prova consumam TA e apareçam no Detalhe Semanal de Aula (documento 02, RF-AVAL-04).

**AEC. [RESOLVIDO — v1.3]** Atividades Extraclasse — atividades que complementam o ensino (palestras, visitas técnicas, viagens, treinamentos esportivos) e que **não são computadas na carga horária das disciplinas**, com teto de **10% do somatório das CHD**.

**TAD.** Tempo para a Administração — tempo destinado a atividades programadas pelo Comando/Superintendência de Ensino (identificação de alunos, processamento de resultados). Teto normativo: **5% da CHR**.

**TR.** Tempo Reserva — margem de segurança para reposição de TA planejados e não cumpridos por intercorrências. Teto normativo: **10% da CHR**. É a grandeza que a documentação interna vinha chamando informalmente de "gordura"; o termo normativo correto é **Tempo Reserva**, e é ele que prevalece.

**PM.** Prova Mista — avaliação escrita padrão do CIAARA, no motor preditivo sempre alocada como bloco fechado de 3 TAs contíguos. Modalidade de prova que reúne, simultaneamente, questões objetivas e dissertativas (Glossário DEnsM §5; documento 04, RN-2027-04).

**PP.** Prova Prática. · **PE.** Prova Escrita (Objetiva). · **PT.** Prova a Distância/Eletrônica (usada em cursos EAD/semipresenciais).

**OD.** Observação de Desempenho — avaliação por acompanhamento de desempenho prático (ex.: seminário, folha de avaliação de estágio prático), em vez de prova formal.

**TI / TG.** Trabalho Individual / Trabalho em Grupo.

**MF.** Média Final — nota consolidada de uma disciplina a partir das avaliações aplicadas. **Nota de escopo:** o CIAARA-11 **não calcula MF** (`RNF-NORM-06`, decisão D5) — a competência é da CIAARA-32 e da CIAARA-12.3. O termo consta aqui para leitura de documento normativo, não como funcionalidade.

**TFM.** Treinamento Físico Militar — disciplina presente em praticamente todos os cursos, com regra própria e rígida de distribuição semanal (teto de 6 TAs/semana no motor preditivo — documento 04, RN-DIST-03).

**LHFC.** Levantamento Hidroceanográfico de Fim de Curso — atividade prática de encerramento de curso, de caráter eliminatório e sem teto de distribuição semanal (junto com "Prática de Fim de Curso", tratada de forma equivalente pelo sistema).

**DSA.** Detalhe Semanal de Aula — documento (e módulo do sistema) que detalha, dia a dia e tempo de aula a tempo de aula, o que foi ministrado em uma turma numa semana; impresso e assinado semanalmente. Conta com motor de sugestão automática de preenchimento desde a v2.0 (ver **FET**; documento 02, RF-DSA-08).

**Atividade Extraclasse. [RESOLVIDO — v1.3]** Sinônimo de **AEC** — ver entrada própria. Atividade que complementa o ensino — palestra, visita técnica, viagem, treinamento esportivo — **não computada na carga horária da disciplina**, com teto de 10% do somatório das CHD.

**Atividade Extracurricular. [RENOMEADO — v1.3]** Termo **descontinuado**. O vocabulário normativo não usa este termo; a norma distribui o que o sistema chamava de "extracurricular" entre **AEC**, **TAD**, **TR** e **Estudo Individual**, cada um com teto ou regra própria. A aba `Eventos_Extracurriculares` foi recategorizada nesses quatro destinos na migração da v2.0, e a tabela correspondente da v2.1 se chama `atividades_nao_letivas`.

**Estudo Individual. [RESOLVIDO — v1.3]** Tempo de estudo dirigido do aluno, o tipo de lançamento mais frequente da base (531 dos 663 registros de atividades, contando Monitoria e Português para Estrangeiros na recategorização). Normativamente associado ao regime de Estudo Obrigatório, que destina 20% das horas-aula diárias a estudo individual (10% sem esse regime). **Registrado em categoria própria**, separada de AEC/TAD/TR.

**Vista de Prova.** Sessão de apresentação e comentário do resultado da avaliação aos alunos. Normativamente integra a **CHD** da disciplina — ou seja, **consome TA** e deve constar do Detalhe Semanal de Aula.

**CIAARA-11 (código regimental).** Código da **Divisão de Administração Acadêmica** do CIAARA no Regimento Interno. O sistema leva o nome da divisão que o opera — **não é um número de versão**. Ver documento 01, seção 0.

**CIAARA-10 · 12 · 13 · 14 · 31 · 32.** Departamento de Ensino · Divisão de Orientação Educacional e Pedagógica · Divisão de Ensino a Distância · Divisão de Recursos Instrucionais · Divisão de Coordenação de Alunos · Divisão de Registro Escolar. Detalhamento de papéis e fronteiras de escopo no documento 01.

**Cronos** *(v1.0)* **/ Cronograma** *(v2.0 em diante)***.** Na v1.0, "Cronos" era o módulo que comparava carga horária prevista e executada por semana e por matéria. Desde a v2.0 ele se funde com o Diagrama de Alocação em um único módulo chamado **Cronograma** (decisão D4; documento 02, RF-CRONOS), cobrindo tanto a previsão quanto a execução real, para qualquer ano.

**Diagrama de Alocação** *(v1.0, termo retirado)***.** Módulo que mostrava a distribuição semanal de carga horária por matéria (ou por instrutor), com fonte de dados real ou simulada. Absorvido pelo módulo **Cronograma**.

**Motor preditivo.** Função que simula a distribuição completa da grade curricular de um ano futuro, espelhando as janelas oficiais do PROENS do ano corrente. Generalizado para qualquer ano informado desde a v2.0 (não mais `gerarPlanejamento2027()`). *[MIGRAÇÃO v2.1]* Na v2.1 vive em `lib/dominio/` como **função pura, sem acesso a banco** — recebe dados, devolve distribuição.

**FET (Free Timetabling Software).** Software livre de montagem automática de grades horárias, citado por Bernardo como referência de **comportamento** (não de tecnologia) para o motor de sugestão do DSA — propor uma prévia semanal respeitando prioridades e limites, sem travar o ajuste manual (documento 02, RF-DSA-08).

**Margem de Capacidade** *(termo interno)*. Folga entre a carga horária já alocada e o teto (rígido ou recomendado) de uma disciplina, instrutor ou curso; usado pelo motor preditivo e pelo Cronograma para decidir prioridade de alocação. **Nota:** **não** designa a reserva de calendário do curso — essa grandeza tem nome normativo próprio, **Tempo Reserva (TR)**. "Margem de Capacidade" fica restrito ao sentido algorítmico de folga instantânea de alocação.

**Regime de Trabalho (docente).** Número de horas semanais que o docente dedica ao estabelecimento de ensino: **Parcial (20h)**, **Integral (40h)** ou **Dedicação Exclusiva (DE)**. **Distinção crítica:** o número do regime **não é** o limite de horas de aula. As faixas normativas de *horas de aula* por regime são: **20h → 8 a 12 h**; **40h → 16 a 24 h**; **DE → 16 a 30 h** (DGPM-103; Glossário DEnsM §12). O restante é **Tempo de Permanência**. O defeito em que o motor preditivo usava o número do regime como teto de aula (achado A-2) foi corrigido — documento 04, RN-2027-06 revisada.

**Tempo de Permanência (docente).** Tempo total a que o docente fica sujeito para cumprir seu regime, incluindo sala de aula e atividades complementares; o mínimo deve igualar a carga horária máxima do regime.

**CoPeCoD.** Comissão Permanente do Corpo Docente — comissão que gerencia os processos do pessoal docente, presidida pelo Superintendente de Ensino. Audita o cumprimento, pela CIAARA-11, dos limites semanais de aula dos docentes.

**PCQD.** Plano de Capacitação e Qualificação de Docentes — planejamento anual das ações de aprimoramento técnico-pedagógico, aprovado até 15 de janeiro; exige que **100% dos docentes participem de ao menos um evento de capacitação a cada três anos** (instrutores de Liderança: um evento anual).

**SISCDI.** Sistema do Corpo Docente Integrado — sistema externo da DEnsM, alimentado **trimestralmente** (março, junho, setembro e dezembro) pela CIAARA-11 em conjunto com a CIAARA-32, com ratificação por mensagem à DEnsM até o último dia útil do trimestre.

**PlaCur / PlaDis / PA.** Plano de Curso · Plano de Disciplina · Plano de Aula. São documentos normativos do currículo; o CIAARA-11 opera a execução do que eles definem, mas **não os elabora nem os armazena**.

**RC.** Referencial de Competências — descreve o perfil profissional e as competências (Conhecimentos, Habilidades e Atitudes) necessárias ao exercício de cargos e funções.

**RAInt / RAPE.** Relatório de Avaliação Interna (retrospectiva crítica anual, homologada pelo Conselho de Ensino e enviada à DEnsM até 30 de março) · Relatório de Avaliação Pós-Escolar (consolida a verificação de competências do egresso em contexto real de trabalho, enviado em até 60 dias após o período de observação).

**Instrutor Efetivo / Eventual / Convidado.** Subdivisão normativa do Instrutor da Ativa: **Efetivo** (lotado no estabelecimento, exerce exclusivamente instrutoria), **Eventual** (tem função administrativa na OM e também instrui) e **Convidado** (lotado em OM diferente daquela onde instrui). O campo "Categoria" do cadastro de instrutores deve ser lido à luz desta taxonomia.

**TTC.** Tarefa por Tempo Certo — militar da reserva remunerada contratado para instrutoria por prazo determinado; enquadramento obrigatório no regime de 40 horas; exige FAO ≥ 8 (Oficiais) ou AMC ≥ "Muito Bom" (Praças).

**LIQ.** Lista de Instrutores Qualificados — documento que relaciona, por trimestre, os instrutores habilitados por disciplina de cada curso. Automatizada na v2.0 (`specs/027-liq-automacao`, regras RN-LIQ-01..04), com fundamento normativo na NORMHIDRO 30-23.

**OS de Instrutoria.** Ordem de Serviço de Instrutoria — documento emitido pelo Encarregado da CIAARA-11 agrupando, por instrutor, as aulas efetivamente realizadas em um curso ou período. Módulo gerador implantado na v2.0 (`specs/028-os-instrutoria`).

**ROTA / Avaliação Externa.** Planilha institucional de avaliação de corpo docente e infraestrutura, usada por organizações de ensino da Marinha para fins de acreditação/inspeção, mantida **à parte** do CIAARA-11. O apoio é **leve**: organizar os dados que o sistema já possui para facilitar o preenchimento manual, **sem gerar nem submeter a planilha automaticamente** (decisão D7; documento 02, RF-ROTA).

**Turma.** Ocorrência concreta de um curso em um ano letivo (ex.: "CAHO 2026"), com data de início/término, número de alunos e modalidade próprios — distinta do **curso**, que é o catálogo/grade que pode ter várias turmas ao longo dos anos.

**Classificação (do curso).** Categoria administrativa do curso: Curso Regular, Curso Expedito, Curso Especial, Curso de Aperfeiçoamento Avançado, ou Estágio de Qualificação. *[Nota v2.1]* É a grandeza que alimenta o `ENUM` `escopo_curso` do RBAC (documento 01, seção 2.3).

**EAD / Semipresencial / Presencial.** Modalidades de ministração de um curso ou turma; determinam qual regra de capacidade diária de TAs se aplica (documento 04, RN-MAT-04).

**LP.** Licença de Pagamento — um dia inteiro não letivo por mês, calculado automaticamente pelo motor preditivo (1ª segunda-feira útil do mês, com reserva para a 1ª sexta-feira útil).

**AD / TR.** Administração / Tempo Reserva — categorias de tempo não letivo reservadas por curso conforme o PROENS.

---

## Siglas de cursos e estágios citadas neste conjunto de documentos **[PRESERVADO — sem alteração]**

CAHO (Aperfeiçoamento de Hidrografia para Oficiais) · C-Ap-HN (Aperfeiçoamento de Hidrografia e Navegação) · C-Ap-FR (Aperfeiçoamento de Faroleiro) · C-Espc-HN (Especialização em Hidrografia e Navegação) · C-Espc-FR (Especialização de Faroleiro) · C-Esp-ALH (Especial em Análise de Levantamentos Hidrográficos) · C-Esp-ME (Especial de Meteorologia) · C-Esp-OpAP (Especial de Operações em Águas Polares) · C-ApA-AuxNav-PR-SP, C-ApA-PCN-PR-EAD, C-ApA-PrevMe-PR-EAD, C-ApA-OcOp-PR-SP (Aperfeiçoamento Avançado para Praças, semipresenciais/EAD) · C-Exp-AgMag, C-Exp-BATI, C-Exp-MetocOf(-SP), C-Exp-Obs-ME (Cursos Expeditos) · EST-QF-APHID, EST-QF-APOC, EST-QF-PROC-MF-EAD, EST-QF-EM2040PHS, EST-QF-PGRS100, EST-QF-MAREFLU (Estágios de Qualificação).

> **Regra permanente:** estas siglas **nunca** são expandidas, traduzidas ou "normalizadas" em código, schema, rota, interface ou commit. `CAHO` é `CAHO`.

---

## Termos técnicos do sistema (v2.0 → v2.1) **[MIGRAÇÃO v2.1 — seção substituída]**

Esta seção substitui a "Termos técnicos do sistema (v1.0 → v2.0)" da v2.0. Nenhum termo antigo foi apagado: a coluna **Equivalente na v2.0** existe justamente para quem já conhece o sistema anterior e precisa traduzir o que sabe.

### Framework e execução

| Termo (v2.1) | O que é | Equivalente na v2.0 |
|---|---|---|
| **App Router** | Modelo de roteamento do Next.js em que **a estrutura de pastas de `app/` é o mapa de URLs**. `app/turmas/[turma]/dsa/page.tsx` responde por `/turmas/CAHO-2026/dsa`. | Mapa `TAB_LOADERS` + função `irPara()`, que trocava classes CSS no DOM sem mudar a URL |
| **RSC — React Server Component** | Componente React que **executa no servidor** e chega ao navegador já renderizado, sem enviar seu código JavaScript. Pode consultar o banco diretamente. É o padrão da v2.1. | Não existia. O `.gs` montava HTML ou o navegador montava tudo em JS |
| **Server Component** | Sinônimo prático de RSC. **É o padrão**: um componente só deixa de ser Server Component quando tem motivo. | `include()` de um `.html` parcial pelo `HtmlService` |
| **Client Component** | Componente marcado com `"use client"` no topo, que roda no navegador. Necessário só quando há **interação** (estado local, evento, `useEffect`). Regra: `"use client"` é exceção justificada, nunca ponto de partida. | Todo o JavaScript de `ViewX.html` — que era, por falta de alternativa, 100% cliente |
| **Server Action** | Função assíncrona marcada com `"use server"` que o cliente chama como se fosse local, mas que **executa no servidor**. É o caminho único de escrita da v2.1, sempre com validação Zod. | `google.script.run.minhaFuncao()` chamando uma função `.gs` |
| **Middleware** | Código que roda antes da rota, em toda requisição. Na v2.1 valida a sessão do Supabase e redireciona quem não está autenticado. | Verificação de e-mail em `getContextoInicial` |
| **`searchParams`** | Os parâmetros da URL depois do `?` (`?turma=CAHO-2026&semana=12`). Na v2.1 são **a fonte de verdade do estado de navegação**, geridos por `nuqs`. | Objeto `AppState` (Épico D) e, antes dele, as globais soltas `CTX`, `turmaSel`, `cursoSel`, `DIAG` |
| **`revalidatePath` / `revalidateTag`** | Instruções que invalidam o cache do servidor após uma escrita, para que a próxima leitura traga o dado novo. | Rechamada manual do loader da view após salvar |

### Banco de dados e segurança

| Termo (v2.1) | O que é | Equivalente na v2.0 |
|---|---|---|
| **RLS — Row Level Security** | Recurso do PostgreSQL que decide, **linha a linha**, o que cada usuário pode ler ou escrever. A regra vive **no banco**, não na aplicação. Toda tabela da v2.1 tem `ENABLE ROW LEVEL SECURITY`, e **tabela sem policy é inacessível por padrão** — isso é intencional. | `exigirFuncao(PERFIS...)` no topo de cada função `.gs` de escrita |
| **policy** | Uma regra RLS nomeada, por tabela e por operação (`select`/`insert`/`update`/`delete`), escrita em SQL. É o que materializa `RNF-SEG-02`. | Uma linha da matriz de perfis do documento 01, aplicada à mão em cada função |
| **`perfil_permissao`** | Tabela `(perfil, recurso, acao, permitido)` que guarda a **matriz de permissões como dado**. As policies a consultam por função. Trocar uma permissão vira `UPDATE`, não migration. | Constantes de perfil no código `.gs` (`PERFIS_DIVISAO_ADMIN_ACADEMICA`) |
| **migration** | Arquivo `.sql` numerado e versionado que altera o schema (`supabase/migrations/*.sql`). Roda em ordem, é revisável em *pull request* e **deve ser revertível**. | Script Python em `migracao/*.py` + edição manual da planilha |
| **seed** | Carga inicial de dados que o sistema precisa para funcionar — `perfil_permissao`, `config_parametros`, `config_listas`. Fica em `supabase/seed.sql` e é reaplicável do zero. | Constantes no `Código.gs` (`FERIADOS_2027`, `RESERVAS_PROENS`) e semeadura manual de aba |
| **RPC** | Função SQL exposta como chamada remota (`supabase.rpc('nome', {...})`). Usada quando a operação é essencialmente de banco (agregação pesada, verificação transacional). Não é o padrão — o padrão é Server Action. | Função `.gs` chamada por `google.script.run` |
| **Edge Function** | Função Deno hospedada pelo Supabase, executada perto do usuário, fora do ciclo do Next.js. Reservada para *webhook* e tarefa agendada. **Não é onde regra de negócio mora.** | Gatilho de tempo (`ScriptApp` trigger) do Apps Script |
| **PITR — Point-in-Time Recovery** | Recuperação do banco para **qualquer instante** dentro da janela de retenção, não só para o último backup diário. Recurso de plano pago do Supabase; requisito operacional da v2.1 (documento 00, §5.3). | Histórico de versões do Google Sheets + `baseline/v1-snapshot/` |
| **tipos gerados** | Arquivo `lib/tipos/database.ts` produzido por `supabase gen types typescript`, que traduz o schema real em tipos TypeScript. Se a coluna mudar e o código não acompanhar, **`tsc` acusa**. | Aba **`_Meta_Colunas`**, mantida à mão para dar ao Sheets um contrato de coluna que ele não tinha. **[ABSORVIDO PELA PLATAFORMA]** — tabela aposentada |
| **`codigo`** | Coluna `text unique not null` que guarda o `ID_*` legado da v2.0 (`CUR-000001`, `VIN-000123`). Garante rastreabilidade 1:1 com o histórico. **FKs apontam para `id` (uuid), nunca para `codigo`.** | O próprio `ID_*` como chave primária da aba |
| **exclusão lógica** | Marcar `status = 'inativo'` em vez de apagar. Universal na v2.1, com `status` **explícito**, nunca inferido de `NULL`. **Nada é apagado, nunca.** | Mesma regra, aplicada por convenção de código (documento 04, RN-INST-02) |
| **vigência temporal** | Par `vigente_de` / `vigente_ate` (`NULL` = vigente). A resolução é sempre pelo maior `vigente_de <= data_do_fato`, de modo que **nenhuma edição reinterpreta o passado**. | Colunas de vigência em `Cad_Cursos_Regime_Historico`, resolvidas em JavaScript |

### Interface e design

| Termo (v2.1) | O que é | Equivalente na v2.0 |
|---|---|---|
| **Tailwind CSS v4** | Framework de estilo por classes utilitárias, configurado **em CSS** via `@theme` (não em arquivo JS). | Bootstrap 5 via CDN + CSS ad hoc por módulo |
| **shadcn/ui** | Coleção de componentes acessíveis (Radix + `cva`) que são **copiados para dentro do repositório** em `components/ui/` e versionados — não é dependência opaca, é código do projeto. | Componentes do Bootstrap + HTML repetido por view |
| **token de design** | Variável CSS que carrega uma decisão visual (`--color-ciaara-azul`, `--color-ciaara-ink`, escalas de espaçamento e tipografia), declarada uma vez sob `@theme` e consumida em todo lugar. | Variáveis CSS da v1.0 + o objeto global **`UI`** da v2.0. **`UI` deixa de existir como objeto**: vira tokens + biblioteca tipada. `RF-DS` é preservado; o mecanismo muda |
| **`components/ciaara/`** | Os componentes de domínio do sistema: `CardKpi`, `BadgeStatus`, `GradeAlocacao`, `FiltroAvancado`, `AlertaConformidade`, `TabelaDensa`, `SeletorTurma`. | Blocos de HTML/JS duplicados entre `ViewInstrutores.html`, `ViewDisciplinas.html` etc. |
| **rota de impressão (`/print/*`)** | Rota que renderiza **sem o shell da aplicação**, com `@media print` e quebra de página controlada: `dsa`, `relatorio`, `cronograma`, `ficha-instrutor`, `liq`, `os-instrutoria`. Impressão é requisito (`RNF-COMP-01`), não detalhe. | Blocos `@media print` e telas dedicadas dentro das views |
| **`next-themes`** | Biblioteca que gere tema claro/noturno por classe no elemento raiz, com persistência no navegador — preserva `RNF-USA-05`. | Alternância de tema implementada à mão na v1.0/v2.0 |
| **Recharts** | Biblioteca de gráficos em React usada na v2.1. | ApexCharts (adotada no Épico 009), com helper único `renderizarGrafico_` |

### Testes, entrega e qualidade

| Termo (v2.1) | O que é | Equivalente na v2.0 |
|---|---|---|
| **Vitest** | Executor de testes de unidade. Na v2.1 cobre **toda função de `lib/dominio/`** e os **testes negativos de RLS** com cliente autenticado. | Suíte de invariantes em `tests/*.test.js` (466 testes ao fim da v2.0) |
| **Playwright** | Testes de ponta a ponta em navegador real: percorre a tela como o usuário, inclusive as rotas de impressão. | Não existia — o teste de aceite era **manual, contra a planilha ao vivo** |
| **pgTAP** | Framework de teste **dentro do PostgreSQL**: contagens, integridade referencial e uma asserção nomeada por regra `RN-` de *Risco: Alto*. Um *stub* rastreável e explicitamente pendente é melhor que cobertura fingida (Princípio VIII). | Parte dos testes de invariante, escritos em JavaScript sobre leitura de aba |
| **CI (integração contínua)** | Execução automática do portão de qualidade a cada *push*: `tsc --noEmit`, `eslint`, Vitest, pgTAP, Playwright. | **Proibida** por `RNF-PLAT-04` e pelo Princípio III. **[REVOGADO — v2.1]** |
| **preview deploy** | Ambiente completo e descartável publicado pela Vercel **para cada branch**, com seu próprio banco de teste. Permite testar de verdade sem tocar em produção. | Não existia: **uma URL só, que era a produção**. Daí a marca "teste de aceite contra a planilha ao vivo ainda pendente" |
| **`lib/dominio/`** | Pasta onde as ~40 regras `RN-` viram **funções TypeScript puras, sem I/O**. Regra permanente: **nada em `lib/dominio/` importa `supabase`**. Puras ⇒ testáveis sem banco ⇒ a suíte da v2.0 porta quase 1:1. É o item mais importante da migração. | Regras espalhadas entre `MotorPreditivo.gs`, `Cronograma.gs`, `Liq.gs`, `Estatisticas.gs` |
| **Zod** | Biblioteca de validação de esquema em TypeScript, usada nas fronteiras (formulário e Server Action) com **o mesmo esquema no cliente e no servidor**. Atende `RNF-MAN-02`. | Validação duplicada à mão entre `.html` e `.gs` |
| **Conventional Commits** | Padrão de mensagem de commit (`feat(RF-DSA-08): …`) que cita o identificador de origem — Princípio VIII. | Mesma prática, no formato "Missão N" (v1.0) e `feat(RF-…)` (v2.0) |

### Vibe coding

| Termo | O que é | Nota |
|---|---|---|
| **Spec Kit** | Método de desenvolvimento assistido em ciclos nomeados: `specify → clarify → plan → tasks → analyze → implement`. `clarify` e `analyze` são **obrigatórios, não opcionais**. | **[PRESERVADO]** — 39 ciclos executados na v2.0 (`specs/001-…` a `specs/039-…`). O método atravessa a migração intacto; o que muda é a stack, não a disciplina |
| **constitution** | Arquivo `.specify/memory/constitution.md` com os princípios que governam o repositório e **prevalecem sobre qualquer plano ou tarefa**. Emenda exige decisão explícita de Bernardo, registrada com data e motivo. | **[PRESERVADO com reescrita]** — o **Princípio III** deixa de proibir framework/banco externo/CI e passa a fixar a nova stack e suas proibições. É **reescrito, não deletado** (documento 40) |
| **épico** | Unidade grande de escopo, com valor próprio e critérios de aceite. A v2.1 tem 14 (0 a 13). Granularidade Spec Kit: **1 épico = 1 feature**. | Sequenciamento: 0 → 1 → 2 → 3 → 4, depois por valor. **2 antes de 3**: sem dado migrado não há o que proteger |
| **fatia** | Recorte implementável de um épico, do banco à tela, que passa sozinho pela Definition of Done. É a unidade de commit e de *pull request*. | Herda o padrão da v1.0/v2.0: mudança cirúrgica, aditiva, um commit por unidade (Princípio VI) |
| **`CLAUDE.md`** | Arquivo na raiz do repositório com o contexto operacional do dia a dia: convenções, gotchas, comandos, o que nunca fazer. É o que o assistente lê antes de escrever código. | **[PRESERVADO]** — existe desde a v2.0; reescrito para a nova stack (documento 42) |
| **`AGENTS.md`** | Complemento do `CLAUDE.md` com instruções específicas por agente/ferramenta. | **[NOVO — v2.1]** |

---

## Termos de migração **[NOVO — v2.1]**

Vocabulário do corte. Estas palavras aparecem em decisão de risco, e **precisam significar exatamente a mesma coisa para todos** — ambiguidade aqui custa dado.

**Paridade funcional.** Critério de sucesso da v2.1: **todo `RF-` implantado na v2.0 tem correspondente funcionando na v2.1, e toda `RN-` preservada produz o mesmo resultado.** Paridade é verificada por **invariante estrutural e matemático** — nunca por diff com a saída histórica de um curso específico. *(A CAHO 2026 foi rejeitada como padrão-ouro por Bernardo em 10/08/2026 — "descobri que ele possui muitos erros" — e essa decisão continua valendo.)* Paridade **não** inclui funcionalidade nova: a v2.1 não entrega nenhuma (documento 00, §6.4). Se a paridade for negociável, não existe critério de aceite.

**Reconciliação.** Conferência formal, após a carga (ETL), de que a base nova **contém exatamente** o que a base velha continha. Tem três níveis, e os três precisam passar: **(i) contagem** por entidade (24 cursos, 29 turmas, 175 disciplinas, 177 instrutores, 798 vínculos, ~1.753 registros de aula, 663 atividades, 111 avaliações); **(ii) identidade**, conferindo que todo `codigo` legado migrou e é único; **(iii) invariante**, rodando as asserções de regra sobre a base nova. O relatório de reconciliação é entregável do documento 30, e **divergência não justificada linha a linha bloqueia o corte**.

**Corte (*cutover*).** O momento único em que a **produção deixa de ser a v2.0 e passa a ser a v2.1**. É um evento planejado, com data, hora, responsável e roteiro escrito — não um período difuso de "ir migrando". Sequência: congelamento de escrita → carga final → reconciliação → verificação dos critérios de aceite → liberação de acesso na v2.1 → planilha da v2.0 marcada como somente-leitura. Enquanto o corte não acontece, **a v2.0 é o sistema de produção** — e isso não é fracasso, é o plano funcionando.

**Congelamento de escrita (*freeze*).** Janela em que **ninguém escreve na base v2.0**, para que a carga final capture um estado estável. Sem congelamento, um lançamento feito durante o ETL entra na planilha e **não** no PostgreSQL, e ninguém percebe. Na prática: avisar os usuários, retirar a permissão de escrita da planilha e registrar a hora exata do congelamento. É a razão pela qual o corte se faz **fora do horário letivo**.

**Dupla escrita (*dual write*).** Estratégia em que, por um período, toda escrita vai **às duas bases ao mesmo tempo**, permitindo rodar os dois sistemas em paralelo. **Deliberadamente não adotada nesta migração.** Motivo: dupla escrita exige manter duas implementações da mesma regra sincronizadas, e é justamente a duplicação de regra que a v2.1 existe para eliminar — o risco de as duas divergirem em silêncio é maior que o risco do corte único. A base é pequena e o congelamento é curto (horas, não dias), o que torna o corte único a opção mais segura. O termo fica registrado aqui **como alternativa considerada e rejeitada**, para que ninguém a proponha de novo sem saber que já foi decidida.

**Rollback.** Caminho documentado e **ensaiado** de voltar à v2.0 dentro da janela de corte. Tem dois componentes: **(i) rollback de corte** — reabrir a escrita na planilha v2.0 e descartar a v2.1, viável enquanto nenhum dado novo tiver sido lançado só na base nova; e **(ii) rollback de migration** — toda migration é revertível, e a reversão é testada em preview antes de ir a produção. **Critério de aborto declarado antes do corte, nunca durante**: decidir se aborta no meio do corte, sob pressão, é como não ter plano. Critério de aceite **CA-11**.

**Origem de migração (`origem_migracao_v1`).** Coluna presente em toda tabela migrada, guardando a referência à linha de origem na base anterior. Junto com `codigo` e com a tabela `migracao_log`, forma o **rastro completo** de onde cada linha veio. `migracao_log` é **apenas-acrescenta**: nenhuma linha já gravada é reescrita — corrige-se **logando um novo evento** (Princípio IV, Integridade do Histórico).

**Requisito absorvido pela plataforma.** Classificação de destino, registrada na coluna *Destino na v2.1* dos documentos 02, 03 e 04, para o requisito que **deixa de precisar de implementação porque o motor passa a garanti-lo**. Exemplo canônico: a aba `_Meta_Colunas` existia para dar ao Sheets um contrato de coluna que ele não tinha; no PostgreSQL, o `information_schema` e os tipos gerados cumprem esse papel com garantia do motor — a tabela é **aposentada**, e o requisito não é perdido nem reimplementado: é **absorvido**. Os outros destinos possíveis são *preservado*, *preservado com nova implementação* e *revogado* — e **todo** `RF-`/`RN-`/`RNF-` da v2.0 recebe exatamente um deles.

---

## Sobre este glossário

Novos termos de domínio ou de sistema introduzidos durante as Fases 2–5 da v2.1 devem ser adicionados aqui, mantendo este documento como a **referência única de vocabulário do projeto** — evitando que o mesmo conceito receba nomes diferentes em código, schema, spec, interface e conversa com o Comando do CIAARA.

Duas regras de manutenção específicas desta versão:

1. **Termo institucional não se traduz nem se abrevia** — nem para caber numa coluna, nem para ficar bonito num identificador. Se um nome de tabela ou de componente ficar longo por causa disso, o nome fica longo.
2. **Todo termo técnico novo entra com sua coluna "Equivalente na v2.0"**, enquanto houver alguém que opere ou consulte o sistema anterior. Essa coluna é a ponte que torna a migração legível para quem a vive — e ela só pode ser retirada depois que a planilha da v2.0 deixar de ser consultada.
