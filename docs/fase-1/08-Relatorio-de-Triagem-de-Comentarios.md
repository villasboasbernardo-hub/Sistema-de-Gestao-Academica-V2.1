---
title: "CIAARA-11 v2.0 — Relatório de Triagem dos Comentários"
author: "Fase 1 do SDLC — Requisitos"
date: "29/07/2026"
---
> ---
>
> ## ⚠️ NOTA DE CONTEXTO — v2.1 (26/08/2026)
>
> **Este documento é preservado como registro histórico e não foi reescrito para a v2.1.**
>
> Ele documenta a triagem dos 48 comentários registrados por Bernardo Villas Bôas nos documentos da
> Fase 1, e as decisões **D1 a D7** que dela resultaram. Essas decisões moldaram a v2.0 e continuam
> sendo a explicação de *por que* boa parte do sistema é como é — por isso o documento permanece na suíte.
>
> **Uma decisão foi revertida na v2.1:**
>
> | Decisão | Texto original (v2.0) | Situação na v2.1 |
> |---|---|---|
> | **D1** | Manter a autenticação pela conta Google (`Session.getActiveUser()`), sem usuário e senha próprios | **REVERTIDA em 25/08/2026.** A v2.1 adota **e-mail e senha, com conta criada por convite do Admin**. O motivo da D1 era a gratuidade e a simplicidade do mecanismo nativo do Apps Script; fora daquele runtime, a razão deixou de existir. Ver documento 02 (`RF-AUTH`) e documento 22. |
>
> **As demais decisões seguem válidas:** D2 e D6 (RBAC ampliado), D3 (migração estrutural de dados),
> D4 (fusão Diagrama+Cronos e motor preditivo multi-ano), D5 (simplificação de Avaliações) e
> D7 (apoio leve à ROTA). Todas foram implementadas na v2.0 e são herdadas pela v2.1.
>
> **Não edite este documento.** Uma decisão nova não se registra reescrevendo o passado — registra-se
> como evento novo, na documentação da versão corrente. É o mesmo princípio que a constitution aplica
> ao `migracao_log` (Princípio IV — Integridade do Histórico).
>
> ---


# Relatório de Triagem dos Comentários — CIAARA-11 Versão 2.0

**Papel assumido neste relatório:** conselheiro técnico sênior (arquiteto/desenvolvedor) revisando o feedback do responsável pelo produto sobre a suíte de Requisitos (Fase 1). **Este documento não altera nenhum dos 8 arquivos originais.** Ele é o passo 1 combinado: mapear cada comentário, dizer onde ele deve ser aplicado e sinalizar o que precisa de uma decisão sua antes de eu editar qualquer documento.

## 0. O que foi encontrado

Você comentou em 3 dos 8 arquivos Word: **00 (6 comentários)**, **01 (13 comentários)** e **02 (29 comentários)** — total de **48 comentários**, todos gravados em 29/07/2026 entre 00h00 e 02h34. Os documentos 03 a 07 não têm nenhum comentário. Além dos comentários, encontrei uma frase inserida diretamente no corpo do texto do documento 02 (sem controle de alterações ativado), logo após RF-DSA-07: *"O sistema deve ter uma nova funcionalidade de gerar automaticamente o um prévia ou sugestão do detalhe semanal de aula."* — tratei essa frase como mais um item de entrada, junto com o comentário que você anexou a ela (§ Tema G).

Vários comentários parecem ser transcrição por voz (interjeições como "né", "É.", "Ponto." aparecem soltas) — onde o sentido ficou ambíguo por causa disso, marquei minha interpretação e, quando relevante, levantei a dúvida na seção 2.

## 1. Achados-chave (leia isto primeiro)

**(a) Vários itens do documento 04 ("Regras a Preservar") precisam ser reclassificados para "corrigir".** A diretriz original era reaproveitar ao máximo a lógica já consolidada. Mas você mesmo sinalizou que partes específicas dela **não estão corretas hoje**: a lógica de registro de aula/DSA ("não estão funcionando corretamente... erros na lógica"), a modelagem de Avaliações ("numa lógica deturpada que precisa ser corrigida"), e a forma como atividades sem matéria são tratadas (redundância entre avaliações/extraclasse/extracurricular). Isso muda o "tom" do documento 04: ele deixa de ser 100% "não toque nisso" e passa a ter uma segunda categoria, "toque nisso de propósito, está errado". Detalho cada caso no Tema Q.

**(b) A distinção Aula × Atividade Extraclasse × Atividade Extracurricular é o achado conceitual mais importante de toda a triagem.** Hoje o sistema tem só um balde para tudo que não é aula (`Eventos_Extracurriculares`). Você deixou claro que são **três categorias diferentes**, e que isso afeta diretamente o cálculo de carga horária da matéria (Tema D) — é provavelmente a mudança de maior impacto no modelo de dados.

**(c) Você autorizou uma mudança de premissa de engenharia.** As especificações históricas (V2/V3/V4) sempre operaram sob "edição cirúrgica, aditiva, nunca reescrever". Você agora diz que vale a pena "refazer a estrutura do banco de dados do zero". Não vou aplicar isso silenciosamente — ver Decisão D3.

**(d) O escopo da v2.0 cresceu além dos 4 pilares originais (Design System, Modularização, Saneamento, AppState).** Boa parte dos seus comentários pede **funcionalidade nova de negócio** (login próprio, RBAC com ~12 perfis, motor de sugestão automática do DSA, fusão Diagrama+Cronos, apoio à Avaliação Externa/ROTA). Isso é legítimo, mas é bom você decidir conscientemente — e não por acidente — que a v2.0 agora é maior do que "só reestruturar". Recomendo formalizar isso no documento 00.

**(e) Uma peça foi explicitamente adiada por você mesmo:** acesso de instrutores ao próprio cadastro/escala (documento 01, comentário #3) — você já escreveu "isso pode ficar para uma v3.0". Vou manter isso fora do escopo da v2.0 e apenas registrar a intenção futura (Tema S).

## 2. Decisões que preciso da sua confirmação antes de editar

Estas 7 perguntas afetam múltiplos documentos cada uma. Prefiro confirmar agora do que reescrever tudo e ter que desfazer depois.

**D1 — Autenticação.** Você pediu e-mail+senha em vez de login só por conta Google (Tema A). Um detalhe técnico real: o Apps Script Web App roda sempre sob uma identidade Google (a que publica o app, ou a de quem acessa, dependendo da configuração) — trocar para e-mail+senha própria significa **construir uma tela de login e uma tabela de credenciais dentro do próprio sistema**, sem depender do `Session.getActiveUser()` de hoje para saber "quem é". Isso é factível, mas é uma mudança de segurança não trivial (hash de senha, recuperação de senha, expiração de sessão). Confirma que é isso mesmo que você quer, sabendo desse custo? Ou prefere manter a conta Google como identidade e só adicionar uma segunda camada (ex.: PIN) em ações sensíveis?

**D2 — Limite exato do perfil Operador.** Um comentário diz que o Operador pode cadastrar/remover instrutor (01#12); outro diz que ele só pode escolher, dentre os instrutores **já habilitados**, quem ministra cada matéria — sem poder criar essa habilitação (01#9). Confirmo o seguinte split: Operador **pode** cadastrar/editar/desativar instrutor (dados cadastrais), mas **não pode** criar o vínculo de habilitação instrutor↔matéria (isso permanece Admin)? 

**D3 — Redesenho do banco de dados.** Aceito modelar a v2.0 com liberdade para mudar a estrutura das tabelas (não só adicionar colunas), contanto que nenhum dado histórico já lançado seja perdido — ou seja, uma migração estrutural com carga (ETL) dos dados atuais para o novo formato, em vez do padrão "só aditivo" usado até aqui. Confirma essa abordagem?

**D4 — Fusão Diagrama de Alocação + Cronos.** Você acha que os dois módulos são conceitualmente a mesma coisa (previsto × realizado) e deveriam virar um só, para qualquer ano. Isso é uma mudança de arquitetura grande (afeta telas, funções de backend e a forma como pensamos "fonte 2026/2027" hoje). Confirma que quer isso registrado como requisito da v2.0, ou prefere que eu registre como "recomendação a avaliar na Fase 2" sem comprometer a v2.0 com a fusão completa?

**D5 — Avaliações sem fórmula de média final.** Confirma que o sistema **não precisa mais** modelar/calcular a fórmula de média final (`Formula_MF`) de cada avaliação, e que o foco passa a ser 100% controle de execução (feita/pendente/atrasada, data da prova, data da vista)?

**D6 — Quantos perfis de RBAC entram já na v2.0.** Você listou cerca de 12 perfis novos (Tema B). Além do perfil de Instrutor (que você mesmo sugeriu adiar — Tema S), todos os outros 9+ entram na v2.0, ou alguns podem esperar (ex.: os operadores segmentados por tipo de curso)?

**D7 — Nível de apoio à Avaliação Externa/ROTA.** "Ajudar a responder o máximo de informações possíveis" pode significar coisas bem diferentes em esforço: (i) só organizar os dados do CIAARA-11 de um jeito que facilite preencher a planilha ROTA manualmente; ou (ii) o sistema gerar automaticamente uma exportação that already preenche parte da planilha ROTA. Qual desses dois (ou algo entre eles) você tem em mente para a v2.0?

## 3. Mapeamento por tema

Cada tema lista os comentários de origem (`documento#id`), uma síntese, para onde deve ir a correção, e a ação recomendada.

### Tema A — Autenticação própria (e-mail + senha)
**Origem:** 02#3, 02#4, 01#7, 01#8.
**Síntese:** substituir (ou complementar — ver D1) o login via conta Google por tela própria de e-mail/senha; Admin ganha uma função dedicada de cadastrar novos usuários.
**Aplicar em:** doc 01 (seção "Ambiente de acesso"), doc 02 (grupo RF-AUTH inteiro), doc 03 (RNF-SEG-01, hoje diz o oposto disso), doc 04 (RN-RBAC-01).
**Ação:** reescrever RF-AUTH-01/02, adicionar requisito de cadastro de usuário pelo Admin, revisar RNF-SEG-01. *Depende de D1.*

### Tema B — Expansão do RBAC (novos perfis e permissões)
**Origem:** 01#4, 01#9, 01#10, 01#12, 01#13, 01#14, 02#5, 02#7.
**Síntese:** novos perfis — Chefe do Departamento de Ensino, Encarregado da Divisão de Administração Acadêmica, Encarregado da Divisão de Orientação Pedagógica, Ajudante de cada uma dessas divisões, Operador da Divisão de Administração Acadêmica, Coordenador de Curso (leitura total, zero edição), e opcionalmente Operadores segmentados por tipo de curso (Regular/Expedito/Estágio/EAD/Geral). O perfil "Imediato" foi cogitado e depois retirado por você mesmo. Geração do planejamento anual (hoje só Admin) deve ficar restrita ao Encarregado/Ajudante da Divisão de Administração Acadêmica. Visualização confirmado como somente leitura + impressão, sem exceção.
**Aplicar em:** doc 01 (seção 2 — tabela de perfis, reescrever), doc 02 (RF-AUTH-03 e RF-INI-01 — painel filtrado por escopo de curso do operador), doc 04 (RN-RBAC-02).
**Ação:** redesenhar a tabela de perfis com granularidade nova. *Depende de D2 e D6.*

### Tema C — Redesenho estrutural do banco de dados
**Origem:** 00#8, 00#11, 01#17.
**Síntese:** ao invés de só "saneamento aditivo", refazer a estrutura das tabelas que tiverem problema conceitual, podendo manter ~80% do schema atual como está.
**Aplicar em:** doc 00 (seção 6, redefinir o pilar "Saneamento e Normalização"), doc 05 (reescrever a abordagem dos achados), doc 06 (Épico C).
**Ação:** ajustar a linguagem de "somente aditivo" para "migração estrutural sem perda de histórico". *Depende de D3.*

### Tema D — Aula × Atividade Extraclasse × Atividade Extracurricular (achado mais importante)
**Origem:** 00#8, 00#14, 01#17, 02#15, 02#17, 02#28, 02#36, 02#38.
**Síntese:** são três categorias, não uma: **Aula** (curricular, conta tempo da matéria); **Atividade Extraclasse** (curricular, não é uma "aula" no formato padrão, mas ainda conta tempo da matéria/currículo — ex. prática supervisionada, seminário previsto no currículo); **Atividade Extracurricular** (não conta tempo de nenhuma matéria — ex. palestra não prevista, cerimônia, licença). Hoje só existe um balde (`Eventos_Extracurriculares`) misturando os três. Isso também explica a "redundância entre abas de avaliação" citada em 00#8.
**Aplicar em:** doc 04 (nova regra RN, substituindo o RN-EVT atual), doc 05 (provável nova entidade/coluna de categoria — talvez `Categoria_Atividade` com os 3 valores, em vez de decidir só pelo tipo), doc 02 (RF-DSA, RF-EXTRA e RF-CRONOS precisam refletir as 3 categorias, inclusive no cálculo de carga horária da matéria).
**Ação:** esta é a mudança que mais se propaga por outros documentos — tratar com prioridade 1 na correção.

### Tema E — Eventos Extracurriculares: escopo Global × específico da turma
**Origem:** 02#28.
**Síntese:** alguns eventos (cerimônia do centro, licença de pagamento) valem para **todos os cursos ao mesmo tempo**; outros (palestra, visita) são de uma turma específica. Deve ser possível lançar pelo DSA **e** por um módulo dedicado a eventos globais.
**Aplicar em:** doc 02 (RF-EXTRA), doc 05 (campo de escopo Global/Turma na entidade de eventos, coerente com o Tema D).
**Ação:** adicionar RF-EXTRA-04 (escopo global) e ajustar o modelo de dados correspondente.

### Tema F — Avaliações: simplificar para controle de execução
**Origem:** 02#24, 02#25, 02#26.
**Síntese:** a fórmula de média final não importa para o sistema; o que importa é: a avaliação foi feita ou não, qual data estava prevista, se a vista de prova aconteceu em até 7 dias corridos (alertar se passou disso), quem fiscaliza não precisa ser instrutor da matéria, e a avaliação/vista consome tempo de aula que deve aparecer no DSA. "Essas são regras que não existem atualmente no sistema e que estão numa lógica deturpada que precisa ser corrigida" (suas palavras, 02#24).
**Aplicar em:** doc 04 (RN-AVAL-01 — reclassificar de "preservar" para "corrigir"), doc 02 (RF-AVAL-01/02/03, reescrever), doc 05 (o papel de `Formula_MF`/`Carater` em `Avaliacoes_Planejadas` muda de "núcleo da regra" para "informativo apenas").
**Ação:** reescrita completa do grupo de avaliações nos docs 02 e 04. *Depende de D5.*

### Tema G — DSA: motor de sugestão automática + edição + impressão livre
**Origem:** 02#14, 02#16, 02#17, 02#18, 02#19, 02#20, 02#21, 02#22 (+ frase inserida no corpo do doc 02).
**Síntese, em partes:**
- Nova funcionalidade central: gerar automaticamente uma prévia/sugestão do DSA da semana, ao estilo do **FET (Free Timetabling Software)** — considerando prioridade de execução da matéria, limites diário/semanal por instrutor e por matéria, preferência do instrutor (inclusive uma exceção pontual só para aquela semana, sem mudar a preferência cadastrada), e não travando o lançamento se a preferência não puder ser respeitada.
- Navegação por semana deve virar um menu/abas com todas as semanas do curso rotuladas por data real de início/fim, permitindo inclusive sábado (alguns cursos precisam).
- Grade deve mostrar hora de início/fim por tempo de aula; intervalos ocupando o mínimo de espaço visual; sala exibida **uma vez para a semana inteira** no cabeçalho do DSA (não por bloco) — a turma quase sempre fica na mesma sala o curso inteiro.
- Conflito de sala deixa de ser prioridade (só relevante entre cursos diferentes na mesma sala); conflito de **instrutor entre turmas diferentes no mesmo horário** continua importante e deve gerar alerta.
- Deve ser possível editar um lançamento já feito e **reordenar por arrastar** (mesmo dia ou entre dias da semana), não só excluir e relançar.
- Impressão: uma única página A4 paisagem, com liberdade total de redesenho visual — "não se prenda muito ao modelo das planilhas em anexo... pode ter liberdade pra desenvolver um modelo melhor" (02#20) — mas mantendo o conteúdo: semana/datas/curso, matérias com horário, intervalos, almoço, atividades da semana, nome do instrutor, tipo de avaliação/metodologia, observação breve, e assinaturas do Encarregado da Divisão de Administração Acadêmica e do Operador responsável.
**Aplicar em:** doc 02 (RF-DSA quase inteiro — reescrever e expandir, remover a exigência de reproduzir o layout legado), doc 04 (RN-CONF-01 ajustar para sábado e para o novo peso relativo sala×instrutor), doc 06 (novo épico ou item de destaque: "Motor de Sugestão Automática do DSA").
**Ação:** maior reescrita funcional de toda a triagem depois do Tema D.

### Tema H — Painel Início: personalização por papel e visual convidativo
**Origem:** 02#7.
**Síntese:** conteúdo do painel filtrado pelo escopo de curso do usuário (ligado ao Tema B); visual mais "convidativo" com o brasão/símbolo do CIAARA; navegação por cartões que abrem como menu/acordeão; alertas expandidos (matéria sem instrutor, matéria atrasada, prova vencida, necessidade de trocar regime de tempos de aula).
**Aplicar em:** doc 02 (RF-INI-01/02, expandir).
**Ação:** incorporar como novos itens RF-INI.

### Tema I — Modalidade EAD/Semipresencial: não duplicar controle
**Origem:** 02#8.
**Síntese:** o sistema deve focar só na fase presencial de cursos híbridos; já existe outra plataforma cuidando da parte a distância — não vale a pena reconstruir isso.
**Aplicar em:** doc 00 (reforçar como não-objetivo explícito), doc 02 (RF-CURSOS/RF-MATERIAS, deixar claro que campos de EAD são só referência, não controle operacional).
**Ação:** adicionar frase explícita de não-escopo no doc 00 e uma nota nos RF correspondentes.

### Tema J — Página do Curso: turma padrão, aba "Sobre", relatórios granulares
**Origem:** 02#10, 02#11, 02#12.
**Síntese:** quando o curso tem mais de uma turma, abrir por padrão a que está em andamento ou mais próxima de começar (nunca uma concluída/cancelada, exceto para imprimir relatório antigo); nova aba "Sobre" com informações do currículo (propósito, matérias, avaliações previstas) só para consulta; permitir gerar relatório **por seção visualizada** (instrutores, avaliações, matérias) além do relatório geral do curso; alertas adicionais (dias insuficientes para a carga horária restante, matéria sem instrutor, matéria atrasada para começar/terminar, matéria com avaliação vencida sem ter sido aplicada).
**Aplicar em:** doc 02 (RF-CURSO-01/02/03, expandir bastante).
**Ação:** adicionar RF-CURSO-04 (aba Sobre) e detalhar os alertas em RF-CURSO-03.

### Tema K — Relatório do Curso: formato narrativo
**Origem:** 02#30 (relacionado a 02#11).
**Síntese:** o relatório deve parecer um documento de texto com tópicos (para ser lido por um Comandante/Imediato), não uma planilha — poucos gráficos, o restante em prosa. Deve cobrir instrutores, matérias, andamento, alertas, avaliações, comparação previsto×realizado, número de matérias previstas×realizadas, alunos matriculados, datas, atividades curriculares/extracurriculares realizadas, e um anexo com o Cronos.
**Aplicar em:** doc 02 (RF-REL, reescrever o formato esperado), doc 07 (nomenclatura — ver Tema N).
**Ação:** redefinir RF-REL como documento textual, não tabular.

### Tema L — Fusão Diagrama de Alocação + Cronos, multi-ano
**Origem:** 02#32, 02#33, 02#34, 02#39, 01#14.
**Síntese:** você entende que os dois módulos são a mesma informação (previsto × realizado) e deveriam ser um só, disponível para qualquer ano (não só 2026/2027); o motor preditivo precisa generalizar — considerar feriados, licença de pagamento (regra: 1ª segunda-feira útil do mês, ou 1ª sexta-feira útil quando não houver segunda), preferência e limite semanal de cada instrutor, prioridade/data de início de cada matéria, e a possibilidade de o **regime de tempos por dia mudar no meio do curso** (de um "regime padrão" para um "regime de exceção" quando o calendário não fechar) — e isso precisa ficar visível nas duas pontas (antes e depois da mudança de regime). Visão por instrutor também deve existir no Cronos, não só no Diagrama.
**Aplicar em:** doc 02 (fundir RF-DIAG e RF-CRONOS em um grupo só, ou deixar claro que são duas telas da mesma informação), doc 04 (RN-2027 generalizar para "motor preditivo multi-ano", RN-DIST incorporar a troca de regime no meio da janela), doc 05 (estrutura de dados: catálogo de feriados/licenças/reservas por ano deixa de ser "recomendação de saneamento" e vira pré-requisito direto desta funcionalidade), doc 06 (redesenhar o épico correspondente).
**Ação:** é a segunda maior mudança estrutural depois do Tema D. *Depende de D4.*

### Tema M — Exportação em planilha real, não só CSV
**Origem:** 02#35.
**Síntese:** exportar em Excel/ODS com formatação de cor (parecida com a do sistema), além de imprimir em PDF — CSV sozinho não é suficiente.
**Aplicar em:** doc 02 (RF-DIAG-04/RF-CRONOS-04).
**Ação:** trocar "exportar em CSV" por "exportar em planilha formatada (xlsx/ods)".

### Tema N — Terminologia: renomear "gordura"
**Origem:** 02#30.
**Síntese:** o termo "gordura" (do código-fonte v1.0 — margem entre capacidade e carga restante) precisa de um nome mais técnico.
**Aplicar em:** doc 07 (Glossário — registrar o termo antigo e o novo), doc 02/04/05 onde o conceito de margem de capacidade aparece.
**Ação:** proponho **"Margem de Capacidade"** (ou "Folga de Capacidade") como substituto — confirmar se prefere outro termo.

### Tema O — Avaliação Externa/ROTA passa a ser objetivo
**Origem:** 00#12, 01#5.
**Síntese:** essa planilha é o instrumento da Diretoria de Ensino da Marinha para avaliar centros de instrução; um objetivo da v2.0 deve ser ajudar a responder o máximo possível dela.
**Aplicar em:** doc 00 (remover/suavizar da seção 7 "fora de escopo", mover para dentro do escopo como objetivo de apoio a um processo institucional adjacente), doc 02 (novo grupo de requisitos, ex. RF-ROTA), doc 06 (novo épico).
**Ação:** reverter a exclusão que eu havia registrado. *Depende de D7 (nível de esforço).*

### Tema P — PROENS: apoiar também o planejamento do ano seguinte
**Origem:** 00#3.
**Síntese:** o sistema deve ajudar não só a acompanhar a execução do PROENS do ano corrente, mas também o **planejamento** do PROENS do ano seguinte.
**Aplicar em:** doc 00 (seção 2, reforçar o propósito), doc 02 (contexto do motor preditivo — já capturado, mas reforçar a motivação institucional).
**Ação:** ajuste de redação, sem mudança de requisito (o motor preditivo já serve a esse propósito; falta deixar isso explícito).

### Tema Q — Reclassificação geral do documento 04
**Origem:** 00#10, 00#14 (mais os Temas D e F, que são as instâncias concretas).
**Síntese:** nem toda "regra de negócio consolidada" está de fato correta — registro de aula/atividades, controle de tempo de reserva, atividades extracurriculares e avaliações foram citados nominalmente como precisando de revisão de lógica.
**Aplicar em:** doc 04 inteiro.
**Ação:** na correção, vou adicionar uma categoria explícita "Regras corrigidas nesta revisão" separada de "Regras preservadas", com a justificativa de cada mudança (a maior parte já está detalhada nos Temas D e F).

### Tema R — Relaxar a restrição de não exigir retrabalho do usuário
**Origem:** 01#2.
**Síntese:** eu havia escrito que nenhuma refatoração deveria exigir retrabalho de dados/treinamento de quem já opera o sistema. Você observou que o sistema ainda está em fase de testes, sem usuários finais reais ainda — então essa restrição não precisa se aplicar com tanto rigor.
**Aplicar em:** doc 01 (stakeholder "Arquiteto/Desenvolvedor responsável"), doc 03 (se houver requisito não-funcional equivalente).
**Ação:** suavizar essa frase, deixando claro que mudanças de dado/estrutura são aceitáveis nesta fase, desde que documentadas.

### Tema S — Acesso de instrutores (deferido para v3.0 pelo próprio autor)
**Origem:** 01#3.
**Síntese:** instrutores poderiam ter acesso próprio (dados cadastrais, escala de aulas, avaliações, matérias que ministram), mas você mesmo marcou isso como candidato a **v3.0**.
**Aplicar em:** doc 00 (seção 7, registrar como não-objetivo explícito da v2.0, com nota de intenção futura), doc 06 (mencionar como item de backlog futuro, fora da v2.0).
**Ação:** manter fora do escopo da v2.0; só documentar a intenção para não se perder.

## 4. Comentário apenas confirmatório (nenhuma ação de correção necessária)

**01#15** (exclusão lógica de instrutor): ao longo do comentário, você mesmo raciocina em voz alta e chega exatamente ao modelo que já está descrito em RN-INST-02 (doc 04) — manter o histórico de aulas e retirar o instrutor das estatísticas/seleções ativas. Não há mudança a fazer aqui; é uma confirmação de que a regra já documentada está certa. Vou manter RN-INST-02 como está.

## 5. Índice rápido por documento (para onde cada tema aponta)

| Documento | Temas que o afetam |
|---|---|
| 00 — Visão Geral e Escopo | C, I, O, P, S |
| 01 — Stakeholders e Perfis de Usuário | A, B, C, R, S |
| 02 — Requisitos Funcionais | A, B, D, E, F, G, H, I, J, K, L, M, O |
| 03 — Requisitos Não-Funcionais | A (RNF-SEG-01) |
| 04 — Regras de Negócio a Preservar | A, B, C, D, F, G, L, Q |
| 05 — Modelo de Dados Conceitual | C, D, E, L |
| 06 — Backlog de Épicos V2 | C, G, L, O, S |
| 07 — Glossário | K, N |

## 6. Próximos passos

Assim que você responder às 7 decisões da seção 2 (ou confirmar que concorda com minhas interpretações padrão), eu aplico as correções documento a documento, na ordem 00 → 07, e finalizo com uma revisão de coerência entre os 8 (terminologia única, sem contradição entre o que cada um diz sobre o mesmo assunto — por exemplo, hoje o doc 00 e o doc 04 tratam do mesmo motor preditivo, e depois da fusão do Tema L os dois precisam concordar).
