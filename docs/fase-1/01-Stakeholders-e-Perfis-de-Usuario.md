---
title: "CIAARA-11 v2.1 — Stakeholders e Perfis de Usuário"
author: "Fase 1 do SDLC — Requisitos"
date: "25/08/2026"
version: "2.1"
---

# Stakeholders e Perfis de Usuário — CIAARA-11 Versão 2.1

## Nota de migração (v2.1)

Este documento é a reescrita do `01-Stakeholders-e-Perfis-de-Usuario.md` da v2.0 para a **v2.1 — migração para Next.js + Supabase**. O que muda e o que não muda, dito de saída:

- **Seções 0 e 1 — [PRESERVADO integralmente].** A fronteira organizacional ("CIAARA-11 é o código regimental da Divisão de Administração Acadêmica") e os stakeholders regimentais são **normativos**: derivam do Regimento Interno do CIAARA e da Matriz de Responsabilidades, não da tecnologia. Uma migração que alterasse qualquer linha dessas seções estaria errada. O texto é reproduzido sem alteração.
- **Perfis de RBAC — [PRESERVADO] nos nomes, [MIGRAÇÃO v2.1] no mecanismo.** Os perfis mantêm **exatamente** os nomes da v2.0 (inclusive "Encarregado de Curso", renomeado na proposta P-13). O que muda é **como** a permissão é verificada: sai a verificação por função `.gs`, entra **RLS no banco** com a matriz de permissões guardada como **dado**.
- **Autenticação — [REVOGADO — v2.1].** A **decisão D1 da v2.0** (conta Google via `Session.getActiveUser()`) e o requisito `RNF-SEG-01` são revogados em **25/08/2026**, por decisão de **Bernardo Villas Bôas dos Santos**. Em seu lugar: **e-mail/senha criados por convite do Admin**, no Supabase Auth, com signup público desabilitado. Ver seção 2.1.
- **[NOVO — v2.1]:** seção 2.5 (matriz consolidada **perfil × recurso × ação**, insumo direto do seed de `perfil_permissao`) e seção 3 (**ciclo de vida da conta**).

*Nota de revisão herdada (v1.2, 31/07/2026): revisão normativa profunda. A v1.1 descrevia a estrutura organizacional de forma aproximada e incompleta, a partir de inferência sobre o código e os documentos de trabalho. A v1.2 substituiu integralmente as seções 1 e 2 pela estrutura real constante do **Regimento Interno do CIAARA** e do documento normativo consolidado `Stakeholders.md`, e cruzou cada ator com o mapeamento de processos de `Matriz de responsabilidades.md`. Correções relevantes: o nome correto da CIAARA-12 é **Divisão de Orientação Educacional e Pedagógica**; seis atores institucionais ausentes na v1.1 foram incluídos; os perfis "Ajudante" e "Coordenador de Curso" são reclassificados como perfis de sistema sem correspondência regimental direta (ver seção 2.4).*

*Nota de revisão herdada (v1.3, 01/08/2026): proposta P-13 aprovada pelo responsável. O perfil "Coordenador de Curso" foi renomeado para **"Encarregado de Curso"** em toda a matriz de perfis e na nota de conformidade, alinhando o vocabulário do sistema ao da Matriz de Responsabilidades, Parte VII. Origem: documento 09, achado A-8, proposta P-13, aprovada.*

---

## 0. Nota de identidade do sistema **[PRESERVADO — normativo, sem alteração]**

**"CIAARA-11" não é um número de versão — é o código regimental da Divisão de Administração Acadêmica do CIAARA.** O sistema recebeu o nome da divisão que o opera e o mantém. Essa constatação, ausente de toda a documentação anterior, é a chave de leitura de todo o escopo do produto: o CIAARA-11 é o sistema **de uma divisão específica**, não o sistema acadêmico do Centro inteiro. Processos que a Matriz de Responsabilidades atribui a outras divisões (registro escolar, notas, diplomas, EAD/AVA, recursos instrucionais, coordenação de alunos) **não são escopo deste sistema**, ainda que sejam adjacentes a ele. Esta nota é a principal defesa documental contra expansão indevida de escopo (ver documento 09, seção 3).

> **Nota da v2.1.** Este é o Princípio IX (Contenção de Escopo) na sua forma original. Ele **não é afetado pela migração** e continua sendo o primeiro teste de qualquer pedido novo: *este processo está atribuído à CIAARA-11 na Matriz de Responsabilidades?* Uma plataforma mais capaz torna mais fácil implementar o que é de outra divisão — o que aumenta, e não diminui, a importância deste critério.

---

## 1. Partes interessadas (stakeholders) — estrutura regimental **[PRESERVADO — normativo, sem alteração]**

Os atores abaixo seguem a nomenclatura e a codificação do Regimento Interno do CIAARA. A coluna "Relação com o CIAARA-11" classifica cada um como **Usuário direto** (opera o sistema), **Consumidor** (recebe informação produzida por ele), **Fonte** (fornece dado ou norma que o sistema consome) ou **Adjacente** (processo institucional relacionado, fora do escopo funcional).

### 1.1 Atores com perfil de acesso ao sistema

**Chefe do Departamento de Ensino (CIAARA-10).** *Consumidor.* Supervisor e coordenador da Gestão do Conhecimento na OM; preside comissões técnicas; responsável final pela supervisão do Levantamento Hidrográfico de Fim de Curso (LHFC). Homologa rois de notas e TCC, designa orientadores e constitui o Núcleo de Gestão do Conhecimento. No CIAARA-11 consome planos de curso, currículos, RAPE e propostas de revisão curricular — **sem escrita operacional**, porque seus atos de escrita (homologação de notas, designação de orientadores) ocorrem fora deste sistema.

**Encarregado da Divisão de Administração Acadêmica (CIAARA-11).** *Usuário direto — dono do sistema.* Gestor do planejamento e programação do ensino; organiza e controla o cumprimento dos currículos e a designação do corpo docente. Elabora o PROENS e o PGI, emite Ordens de Serviço de instrutoria e atualiza trimestralmente o SISCDI. É o principal responsável funcional pelo CIAARA-11 e a origem de todas as rodadas de especificação já realizadas. Sob auditoria da **CoPeCoD** quanto à racionalização de carga horária docente.

**Encarregado da Divisão de Orientação Educacional e Pedagógica (CIAARA-12).** *Usuário direto (leitura ampla, escrita pedagógica).* Presta concurso técnico à gestão curricular e coordena o acompanhamento psicopedagógico e a avaliação do desempenho didático dos docentes. Suas três seções têm relação distinta com o sistema: a **Seção de Orientação Pedagógica (CIAARA-12.1 — SOP)** conduz o treinamento de qualificação de novos docentes e a avaliação de aulas *in loco*, e é a contraparte natural do campo "Capacitação Didática" do cadastro de instrutores; a **Seção de Orientação Educacional (CIAARA-12.2 — SOE)** trata de alunos (BDA, pesquisas sociométricas), fora do escopo; a **Seção de Avaliação do Ensino (CIAARA-12.3)** conduz a avaliação da aprendizagem e a avaliação institucional (RAInt), e é a consumidora natural dos dados de execução do sistema.

**Instrutor / Docente.** *Fonte de dado e objeto de gestão; não usuário nesta versão.* Agente direto da instrução. Ministra aulas, elabora Planos de Aula, confecciona instrumentos de avaliação e lança notas e frequências — **estes três últimos atos ocorrem fora do CIAARA-11**. No sistema, o instrutor é objeto de dados (cadastro, habilitação por disciplina, preferência e restrição de horário, carga horária) e aparece nominalmente nos documentos impressos. Um perfil de autoatendimento do instrutor foi explicitamente adiado para uma v3.0 (documento 08, Tema S).

**Oficial Fiscal.** *Usuário direto pontual.* Militar designado para garantir lisura, sigilo e isonomia na aplicação de avaliações. A norma o define no contexto do TCPL por videoconferência (DEnsM-5002), mas o CIAARA aplica o conceito também à fiscalização interna de provas. **Nota normativa relevante:** o Oficial Fiscal é designado pela OM e **não precisa ser docente nem estar habilitado na disciplina** — o que confirma a observação registrada no documento 04 e sustenta o requisito RF-AVAL-01.

### 1.2 Atores consumidores, fontes e adjacentes

**Conselho de Ensino.** *Consumidor / auditor.* Órgão máximo de auditoria acadêmica interna, presidido pelo **Imediato (CIAARA-02)**; reúne-se no mínimo 4 vezes ao ano, com pautas compulsórias de homologação do RAInt e do RAPE. Consome mapas estatísticos e resultados de avaliação de cursos. Não opera o sistema, mas é o destinatário final de boa parte da informação consolidada que ele produz.

**Divisão de Ensino a Distância (CIAARA-13).** *Adjacente com interface.* Gerencia o Ambiente Virtual de Aprendizagem (AVA), a ambientação virtual dos alunos e a capacitação de tutores; homologa pedagogicamente os conteúdos virtuais. **Interface com o CIAARA-11:** o sistema registra e acompanha cursos de modalidade EAD e Semipresencial, mas apenas em sua dimensão de calendário e carga horária — toda a operação do AVA (credenciamento, fóruns, tarefas, frequência virtual) é da CIAARA-13 e permanece fora de escopo (documento 00, seção 7).

**Divisão de Registro Escolar (CIAARA-32).** *Adjacente com interface crítica.* Responsável pela integridade da documentação acadêmica: matrículas, trancamentos, cancelamentos, diplomas, certificados e fichas histórico-escolares; solicita papel especial à DEnsM com 30 dias de antecedência do término do curso. **Interface com o CIAARA-11:** compartilha com a CIAARA-11 a responsabilidade de alimentar trimestralmente o SISCDI. **Consequência de escopo decisiva:** notas, médias, aprovação e reprovação são competência da CIAARA-32 (registro) e da CIAARA-12.3 (avaliação) — **não do CIAARA-11**. Este é o fundamento normativo que sustenta a decisão D5 (abandono da modelagem de fórmula de média final), que deixa de ser mera simplificação e passa a ser uma correção de fronteira organizacional.

**Divisão de Coordenação de Alunos (CIAARA-31).** *Adjacente.* Coordena a rotina diária dos alunos, o regime escolar, prêmios escolares, municiamento e o monitoramento do desempenho físico (Seção de Educação Física, CIAARA-31.3). Fora do escopo do CIAARA-11, que não gere dados de corpo discente.

**Divisão de Recursos Instrucionais (CIAARA-14).** *Fonte e adjacente com interface.* Controla simuladores, laboratórios, acervo bibliográfico e recursos de TI do ensino. Três interfaces relevantes: a **Seção de Sistemas e Apoio ao Usuário (CIAARA-14.2)** é a responsável pela administração da rede e pela segurança da informação digital de ensino — ou seja, **é a área técnica sob a qual o próprio CIAARA-11 se enquadra em termos de segurança orgânica**; o **Simulador de Navegação (CIAARA-14.4)** tem controle próprio de agendamento; a **Biblioteca (CIAARA-14.1)** mantém o acervo por currículo. **Consequência de escopo:** a visão de ocupação de salas solicitada na revisão desta fase (documento 02, RF-CRONOS-09) é uma visão **de planejamento e leitura**, não um sistema de reserva de recursos — reserva e manutenção são da CIAARA-14.

**CoPeCoD — Comissão Permanente do Corpo Docente.** *Auditor.* Presidida pelo Superintendente de Ensino; gerencia os processos do pessoal docente. A Matriz de Responsabilidades registra que a fiscalização do cumprimento dos limites semanais de aula pela CIAARA-11 ocorre **sob auditoria da CoPeCoD** — o que torna o controle de carga horária docente do sistema um dado auditável externamente, e não apenas uma conveniência de planejamento (ver documento 09, achado A-2).

**Tutor (EAD).** *Adjacente.* Apoio e orientação pedagógica ao aluno no ambiente virtual; define critérios de avaliação das tarefas no AVA. Ator da CIAARA-13, sem interface com o CIAARA-11.

**DEnsM — Diretoria de Ensino da Marinha.** *Fonte normativa.* Origem de todo o corpo normativo que rege o sistema (DGPM-101, DGPM-103, DEnsM-1002/1004/2001/2003 e correlatas), aprovadora dos currículos e destinatária do RAInt, do RAPE e da atualização do SISCDI. Não opera o sistema; define as regras que ele deve respeitar.

**Arquiteto/Desenvolvedor responsável (Bernardo Villas Bôas).** *Usuário direto e mantenedor.* Acumula o papel de mantenedor técnico e de usuário operacional real, atuando na Divisão de Administração Acadêmica. Esse duplo papel viabiliza o padrão de especificação incremental adotado. **[Atualização — v2.1]:** com a v2.0 em produção, o sistema **deixou de estar em fase de testes**. A janela de tolerância a reestruturações amplas que existia na v2.0 **fechou**. Por isso a v2.1 não altera dado nem regra "de passagem": toda mudança de conteúdo é operação registrada, e o corte para a nova plataforma é planejado com reconciliação e rollback (documento 30). É também por isso que a v2.1 é **migração de plataforma sem funcionalidade nova** (documento 00, seção 6.4).

**Processo institucional adjacente — Avaliação Externa / ROTA.** *Adjacente com apoio leve confirmado.* Instrumento de avaliação de corpo docente e infraestrutura para fins de acreditação, mantido em modelo compartilhado entre organizações de ensino da Marinha. O CIAARA-11 oferece apoio limitado à organização dos dados que já possui, para facilitar o preenchimento manual, restrito aos tópicos que o sistema cobre (documento 02, RF-ROTA).

---

## 2. Perfis de usuário (RBAC) e autorização **[MIGRAÇÃO v2.1]**

### 2.1 Mecanismo de autenticação **[REVOGADO — v2.1: conta Google · substituído por e-mail/senha por convite]**

**O que a v2.0 fazia (revogado).** A autenticação da v1.0 era preservada sem alteração (documento 08, decisão D1; `RNF-SEG-01`): acesso pela própria conta Google do usuário, sem tela de login própria, verificada por `Session.getActiveUser().getEmail()` contra a aba `Usuarios`; e-mail fora da lista recebia tela de acesso negado. A v2.0 registrava explicitamente, como não-objetivo, "Login com usuário e senha próprios".

**Por que foi revogado.** Não por preferência: por **dependência de plataforma**. `Session.getActiveUser()` é um serviço do runtime do Apps Script e **não existe fora dele** — o Web App rodava "como o usuário que acessa o app", e era o próprio Google que resolvia a identidade. Fora do Apps Script, esse mecanismo simplesmente não tem equivalente que preserve o mesmo modelo operacional. Manter login por conta Google na v2.1 significaria adotar OAuth do Google como provedor de identidade — o que traz de volta uma dependência externa desnecessária e deixa o controle de quem entra fora das mãos do Admin do sistema.

**O que a v2.1 faz [MIGRAÇÃO v2.1].** **Supabase Auth com e-mail e senha, e conta criada somente por convite do Admin.** Decisão de Bernardo Villas Bôas dos Santos, 25/08/2026.

| Aspecto | Regra da v2.1 |
|---|---|
| Provedor | Supabase Auth (e-mail/senha). **Signup público desabilitado no painel do Supabase** — não existe "criar conta" na aplicação. |
| Criação de conta | Admin cadastra o usuário → Server Action com `service_role` chama `auth.admin.inviteUserByEmail()` → o convidado define a senha em `/convite/[token]`. |
| Senha | Mínimo **12 caracteres**; verificação contra vazamentos conhecidos (HaveIBeenPwned, recurso nativo do Supabase); **sem expiração compulsória** — troca forçada periódica produz senha pior, não melhor. |
| Vínculo de identidade | `usuarios.auth_user_id uuid unique references auth.users(id) on delete restrict` — relação 1:1 com o Supabase Auth. O `on delete restrict` é deliberado: **ninguém some do sistema por apagar uma linha de autenticação**. |
| Sessão | Cookie gerido por `@supabase/ssr`, validado no middleware do Next.js a cada requisição de rota protegida. |
| Auditoria de acesso | `usuarios.ultimo_acesso` atualizado no login; `criado_por`/`editado_por` preenchidos por trigger a partir de `auth.uid()`. |
| Escopo de identidade | **Uma conta = uma pessoa.** Conta compartilhada de divisão não é permitida: quebraria a auditoria de `criado_por`/`editado_por`, que é o que torna a correção de dado rastreável. |

**O que **não** muda:** continua **não existindo acesso anônimo**, e continua valendo que a ocultação de botões na tela é conveniência de uso, nunca o mecanismo de segurança (`RNF-SEG-02` — ver 2.6).

### 2.2 Matriz de perfis **[PRESERVADO nos nomes · MIGRAÇÃO v2.1 no mecanismo]**

Os perfis abaixo são **exatamente** os da v2.0 v1.3, sem renomeação, sem fusão e sem acréscimo. Eles se tornam os valores do `ENUM` `perfil_usuario` no PostgreSQL. A permissão de escrita continua sendo definida **por área de dados**, não globalmente por perfil (documento 04, `RN-RBAC-02`).

| Perfil (nome canônico) | Valor no `ENUM` `perfil_usuario` | Correspondência regimental | Leitura | Escrita |
|---|---|---|---|---|
| **Admin** | `admin` | Papel técnico, sem correspondência regimental | Total | Total, incluindo gestão de usuários |
| **Chefe do Departamento de Ensino** | `chefe_departamento_ensino` | CIAARA-10 | Total | Nenhuma |
| **Encarregado da Divisão de Administração Acadêmica** | `encarregado_administracao_academica` | CIAARA-11 | Total | Cursos, turmas, disciplinas, instrutores, vínculo de habilitação, configuração de regime/horário, geração e edição do planejamento anual |
| **Ajudante da Divisão de Administração Acadêmica** | `ajudante_administracao_academica` | Ver nota 2.4 | Total | Idêntica à do Encarregado |
| **Encarregado da Divisão de Orientação Educacional e Pedagógica** | `encarregado_orientacao_pedagogica` | CIAARA-12 | Total | Disciplinas, avaliações planejadas e agendadas |
| **Ajudante da Divisão de Orientação Educacional e Pedagógica** | `ajudante_orientacao_pedagogica` | Ver nota 2.4 | Total | Idêntica à do Encarregado |
| **Operador** (atributo *Escopo de Curso*) | `operador` | Sem correspondência regimental direta | Restrita ao escopo, quando não "Geral" | Registro de aulas/atividades, avaliações, atividades extraclasse e não letivas, cadastro/edição/desativação de instrutor, vínculo de habilitação, configuração de regime/horário |
| **Encarregado de Curso** | `encarregado_curso` | Ver nota 2.4 | Restrita ao(s) curso(s) sob coordenação | Nenhuma |
| **Visualização** | `visualizacao` | — | Total | Nenhuma |

> **Nota sobre a contagem "cerca de doze perfis".** O documento 00 da v2.0 (§6.2, ponto 6) fala em *"cerca de doze perfis de usuário organizacionais"*, enquanto esta matriz nomeia **nove**. Os dois números são compatíveis e descrevem coisas diferentes: são **9 perfis** (valores do `ENUM`) e, com o **Operador segmentado por escopo de curso** (5 escopos possíveis), o número de **configurações efetivas de acesso** chega a doze ou mais. Na v2.1 essa distinção deixa de ser ambígua, porque perfil e escopo passam a ser **duas colunas separadas** (`usuarios.perfil` e `usuarios.escopo_curso`), e não um conceito só. **Ponto a confirmar com Bernardo:** se a intenção original era criar perfis nomeados adicionais que esta matriz não registra, eles precisam ser nomeados agora — o `ENUM` é fixado no Épico 1 e acrescentar valor depois exige migration.

### 2.3 As duas dimensões da autorização **[NOVO — v2.1]**

Na v2.0, "o que pode fazer" e "sobre quais linhas" viviam misturados na mesma verificação de função. Na v2.1 são **duas dimensões independentes**, e essa separação é o que torna a matriz da seção 2.5 possível.

| Dimensão | Pergunta que responde | Onde vive | Como a RLS consulta |
|---|---|---|---|
| **Permissão** | *Este perfil pode executar esta ação neste recurso?* | Tabela `perfil_permissao (perfil, recurso, acao, permitido)` — **dado, não código** | `app.pode('registros_aula', 'criar')` |
| **Escopo (visibilidade de linha)** | *Este usuário enxerga esta linha?* | `usuarios.escopo_curso` (`ENUM`) + `usuario_curso` (N:N) | `app.cursos_do_usuario()` |

**Escopo de curso — `ENUM` `escopo_curso`:** `geral`, `regular`, `expedito`, `estagio_qualificacao`, `ead_semipresencial`. Aplica-se ao **Operador** (e a qualquer perfil que venha a ser segmentado no futuro). `geral` significa "todos os cursos"; os demais restringem às turmas do curso cuja **Classificação** corresponde ao escopo.

**Vínculo N:N do Encarregado de Curso — `usuario_curso`:** o Encarregado de Curso não é segmentado por classificação, e sim por **curso nominalmente atribuído**. A tabela `usuario_curso (usuario_id, curso_id, status, vigente_de, vigente_ate)` registra quais cursos cada Encarregado acompanha. É N:N nos dois sentidos, deliberadamente: **um Encarregado pode acompanhar mais de um curso, e um curso pode ter mais de um Encarregado** — o que a aba `Responsaveis_Curso` da v2.0 já admitia na prática. O par `vigente_de`/`vigente_ate` preserva o histórico: quando a responsabilidade muda de mão, **encerra-se a vigência, nunca se apaga a linha** — do contrário, um documento impresso no ano passado deixaria de ser reproduzível.

`app.cursos_do_usuario()` resolve as duas fontes numa lista única de `curso_id`, e é ela que as policies de linha usam. Perfis de leitura total (`admin`, `chefe_departamento_ensino`, encarregados e ajudantes de divisão, `visualizacao`) recebem a lista completa.

### 2.4 Nota de conformidade sobre três perfis sem correspondência regimental **[PRESERVADO]**

Três perfis desta matriz **não têm correspondência direta no Regimento Interno** e são mantidos como perfis de sistema, com a ressalva registrada aqui para rastreabilidade:

**Ajudante de Divisão.** O Regimento nomeia o *Encarregado* de cada divisão; a figura do "Ajudante" é uma função interna de apoio, não um cargo regimental descrito nas fontes normativas consultadas. Mantido porque reflete a operação real e porque a decisão D2 já o previu, com permissão idêntica à do Encarregado — a diferença é hierárquica, não de acesso.

**Encarregado de Curso [RENOMEADO — v1.3, PRESERVADO na v2.1].** O vocabulário normativo consultado registra **"Coordenador de Disciplina"** (DGPM-103, com obrigação própria de carga horária mínima em sala) e **"Encarregado de Curso"** (Matriz de Responsabilidades, Parte VII), mas não "Coordenador de Curso". O perfil foi renomeado de "Coordenador de Curso" para **Encarregado de Curso** — proposta P-13 do documento 09, **aprovada e aplicada em 01/08/2026**. **O nome é canônico e não pode ser reescrito na migração**, inclusive no valor do `ENUM`.

**Operador.** É um papel de sistema, não um cargo. Corresponde, na prática, ao militar da CIAARA-11 que executa o lançamento diário. Mantido por ser operacionalmente necessário e por já constar da v1.0.

**Perfis explicitamente fora da v2.1:** Instrutor (autoatendimento) e quaisquer perfis ligados ao corpo discente — adiados para v3.0 (documento 08, Tema S; documento 00 da v2.1, seção 7.2). Perfis das divisões CIAARA-13, CIAARA-14, CIAARA-31 e CIAARA-32 não são criados, por operarem processos fora do escopo deste sistema (seção 0).

### 2.5 Matriz consolidada perfil × recurso × ação **[NOVO — v2.1]**

Esta é a tradução operacional das seções 2.2 e 2.3, e o **insumo direto do seed de `perfil_permissao`**. Cada célula preenchida vira uma linha `(perfil, recurso, acao, permitido = true)`; **toda combinação ausente é negada** — negação é o padrão, e não precisa de linha.

**Perfis (colunas):** `ADM` Admin · `CHE` Chefe do Departamento de Ensino · `E11` Encarregado CIAARA-11 · `A11` Ajudante CIAARA-11 · `E12` Encarregado CIAARA-12 · `A12` Ajudante CIAARA-12 · `OPE` Operador · `ENC` Encarregado de Curso · `VIS` Visualização

**Ações (letras na célula):** `L` ler · `C` criar · `E` editar · `D` desativar (exclusão lógica — **nunca `DELETE`**) · `X` executar (motor preditivo, geração de documento, ETL) · `I` imprimir / gerar PDF

| Recurso (`recurso`) | Cobre | ADM | CHE | E11 | A11 | E12 | A12 | OPE | ENC | VIS |
|---|---|---|---|---|---|---|---|---|---|---|
| `cursos` | Cadastro de cursos e sua classificação | LCED | L | LCED | LCED | L | L | L | L¹ | L |
| `turmas` | Turmas, datas, nº de alunos, modalidade | LCED | L | LCED | LCED | L | L | L | L¹ | L |
| `horarios` | Regime de horário e vigência (`horarios_tempos_aula`, `curso_regime_historico`) | LCED | L | LCED | LCED | L | L | LCE | L¹ | L |
| `disciplinas` | Disciplinas e grade curricular por turma | LCED | L | LCED | LCED | LCE | LCE | L | L¹ | L |
| `instrutores` | Cadastro de instrutores | LCED | L | LCED | LCED | L | L | LCED | L¹ | L |
| `habilitacoes` | Vínculo instrutor↔disciplina (`instrutor_disciplina`) | LCED | L | LCED | LCED | L | L | LCED | L¹ | L |
| `registros_aula` | DSA: aula, avaliação aplicada, vista de prova | LCEDI | LI | L†I | L†I | LI | LI | LCEDI | L¹I | LI |
| `avaliacoes` | Agendamento e acompanhamento de execução | LCED | L | L† | L† | LCE | LCE | LCED | L¹ | L |
| `atividades` | AEC · TAD · TR · Estudo Individual | LCED | L | L† | L† | L | L | LCED | L¹ | L |
| `planejamento` | Motor preditivo, prévia e planejamento anual oficial | LCEDX | L | LCEX | LCEX | L | L | L | L¹ | L |
| `cronograma` | Previsto × executado, alocação | LI | LI | LI | LI | LI | LI | LI | L¹I | LI |
| `relatorios` | Relatório do curso e demais visões consolidadas | LI | LI | LI | LI | LI | LI | LI | L¹I | LI |
| `liq` | Lista de Instrutores Qualificados | LXI | LI | LXI | LXI | LI | LI | LXI† | L¹I | LI |
| `os_instrutoria` | Ordem de Serviço de Instrutoria | LXI | LI | LXI | LXI | LI | LI | L†I | L¹I | LI |
| `ficha_instrutor` | Ficha de Docentes em PDF | LXI | LI | LXI | LXI | LI | LI | LXI | L¹I | LI |
| `rota` | Apoio à Avaliação Externa / ROTA (organização de dados) | LI | LI | LI | LI | LI | LI | LI | — | LI |
| `calendario` | Feriados, janelas de curso, reservas do PROENS | LCED | L | LCED† | LCED† | L | L | L | L¹ | L |
| `parametros` | `config_parametros` e `config_listas` | LCED | L | LE† | LE† | L | L | L | — | L |
| `usuarios` | Contas, perfis, escopo, vínculo de curso, permissões | LCED | — | — | — | — | — | — | — | — |
| `migracao_log` | Log de migração (apenas-acrescenta) | LC | L | L | L | — | — | — | — | L |

**Legenda das marcas:**

- **¹** — Leitura **restrita aos cursos vinculados** ao usuário em `usuario_curso` (seção 2.3). Não é uma permissão diferente: é a **mesma** permissão `ler` com a dimensão de escopo aplicada pela RLS. O mesmo vale para o Operador com `escopo_curso ≠ geral`, em **todos** os recursos que tenham curso ou turma.
- **†** — **Célula a confirmar com Bernardo.** Marca as posições que a matriz da v2.0 (seção 2.2) **não decidia explicitamente** e que esta tabela precisou resolver para virar seed. Todas foram preenchidas pela leitura mais conservadora, e estão listadas em 2.5.1.
- **—** — sem acesso; a RLS nega. Nenhuma linha em `perfil_permissao`.

#### 2.5.1 Células que precisam de confirmação explícita

| Recurso | Perfis | O que está proposto | Por quê é uma decisão, não um dado |
|---|---|---|---|
| `registros_aula`, `avaliacoes`, `atividades` | E11, A11 | **Somente leitura** | A matriz da v2.0 atribui o lançamento ao Operador e **não lista** registro de aulas na escrita do Encarregado da CIAARA-11. Literalmente lido, o **dono do sistema não pode lançar uma aula** — o que parece inversão de papéis na prática real. Mantido como está para não alterar regra por conta própria (documento 00, §7.2), e **marcado para decisão**. |
| `calendario`, `parametros` | E11, A11 | `LCED` / `LE` | `RNF-NORM-08` e `RNF-MAN-04` exigem que tetos, faixas e dados anuais do PROENS sejam **administráveis**, mas nenhum documento diz **por quem**. Proposta: a CIAARA-11, que é quem elabora o PROENS. Alternativa: restringir ao Admin. |
| `liq`, `os_instrutoria` | OPE | `X` (gerar) sim para LIQ, não para OS | A LIQ é operação de rotina trimestral; a **OS de Instrutoria é ato do Encarregado** (seção 1.1 — "emite Ordens de Serviço de instrutoria"). Proposta reflete essa assimetria. |
| `migracao_log` | E12, A12, OPE, ENC | sem acesso | É registro técnico de migração. Proposta: visível a Admin, CIAARA-10 e CIAARA-11 (auditoria), oculto aos demais. |

#### 2.5.2 Forma do seed

A matriz acima é carregada como dado, não como código. Trocar uma permissão vira um `UPDATE` — **não uma migration, não um deploy**. É o Princípio VII (Configuração sobre Constante) aplicado à autorização.

```sql
-- Tabela de permissões: a matriz da seção 2.5, como dado.
-- Cada linha responde: "o perfil P pode executar a ação A sobre o recurso R?"
create table perfil_permissao (
  perfil     perfil_usuario not null,          -- ENUM: os 9 perfis da seção 2.2
  recurso    text           not null,          -- 'cursos', 'registros_aula', ... (seção 2.5)
  acao       text           not null,          -- 'ler' | 'criar' | 'editar' | 'desativar' | 'executar' | 'imprimir'
  permitido  boolean        not null default true,
  primary key (perfil, recurso, acao)
);

-- Função consultada pelas policies. SECURITY DEFINER para poder ler perfil_permissao
-- mesmo quando o usuário não tem permissão de leitura sobre ela; STABLE porque o
-- resultado não muda dentro da mesma consulta; search_path fixo contra sequestro de schema.
create or replace function app.pode(p_recurso text, p_acao text)
returns boolean
language sql
security definer
stable
set search_path = app, public
as $$
  select coalesce(
    (select pp.permitido
       from perfil_permissao pp
      where pp.perfil  = app.perfil_atual()
        and pp.recurso = p_recurso
        and pp.acao    = p_acao),
    false                                       -- ausência de linha = negado. O padrão é negar.
  );
$$;

-- Exemplo de policy: leitura de registros de aula.
-- As duas dimensões da seção 2.3 aparecem juntas e separadas:
--   app.pode(...)               -> a permissão  (o QUE)
--   app.cursos_do_usuario()     -> o escopo     (QUAIS LINHAS)
create policy registros_aula_leitura on registros_aula
for select using (
  app.pode('registros_aula', 'ler')
  and turma_id in (select t.id from turmas t
                    where t.curso_id in (select * from app.cursos_do_usuario()))
);
```

### 2.6 `RNF-SEG-02` deixa de ser disciplina e passa a ser garantia **[MIGRAÇÃO v2.1]**

O `RNF-SEG-02` da v2.0 — *"toda operação de escrita deve ser verificada no servidor contra o perfil do usuário autenticado, independentemente do que a interface exibe ou oculta"* — é **[PRESERVADO na intenção, com nova implementação]**:

| | v2.0 | v2.1 |
|---|---|---|
| Onde a verificação vive | Chamada a `exigirFuncao(...)` no topo de cada função `.gs` de escrita | **Policy RLS na tabela** |
| O que acontece se alguém esquecer | A operação passa sem verificação (aconteceu: `definirPrioridadeDisciplina` sem `'Admin'`, spec 038) | Uma tabela sem policy é **inacessível por padrão** — o esquecimento **fecha**, não abre |
| Quem pode contornar | Qualquer pessoa com acesso ao arquivo no Drive edita a linha direto na planilha | Ninguém pela aplicação; no banco, apenas `service_role`, usado só em Server Actions administrativas explícitas |
| Como se prova que funciona | Inspeção de código | **Teste negativo obrigatório**: para cada perfil, o que ele **não** pode ler/escrever é negado pelo banco, com cliente autenticado. Testar só o caminho feliz de RLS não prova nada. |

A UI continua ocultando o que o usuário não pode fazer — mas isso é **conveniência de uso**, exatamente como a v2.0 já dizia. **A fronteira real é o banco.** O `RNF-SEG-04` (modularização não pode expor escrita sem verificação) fica **[ABSORVIDO PELA PLATAFORMA]**: não há mais como expor, porque a verificação não está na porta, está no dado. O `RNF-SEG-05` (cobertura de teste para cada combinação relevante de perfil × área × escopo) é **[PRESERVADO e reforçado]** — vira o critério de aceite **CA-05** do documento 00.

---

## 3. Ciclo de vida da conta **[NOVO — v2.1]**

A v2.0 não precisava desta seção: a conta era a conta Google do usuário, gerida fora do sistema, e o sistema só decidia se aquele e-mail estava autorizado. Com autenticação própria, **o ciclo de vida da conta passa a ser responsabilidade do CIAARA-11** e precisa estar especificado.

Regra que atravessa todos os estados: **exclusão lógica universal — nada é apagado.** Nenhum `DELETE` em `usuarios` nem em `auth.users`, jamais. Um usuário desativado precisa continuar resolvendo nome e posto corretamente em todo registro histórico que ele criou (`criado_por`), do mesmo modo que `RNF-CONF-05` já exigia para instrutores desativados.

| # | Etapa | Quem dispara | O que acontece | Estado resultante |
|---|---|---|---|---|
| 1 | **Convite** | Admin (`usuarios.criar`) | Admin informa nome, posto/graduação, NIP, e-mail, **perfil**, **escopo de curso** e, se for Encarregado de Curso, os **cursos vinculados**. Uma Server Action com `service_role` chama `auth.admin.inviteUserByEmail()`; a linha em `usuarios` é criada já com `status = 'ativo'` e `auth_user_id` preenchido. | Convidado (sem senha definida) |
| 2 | **Primeiro acesso** | O convidado | Abre `/convite/[token]` a partir do e-mail e define a senha (mín. 12 caracteres, verificada contra vazamentos). O token tem validade limitada; expirado, o Admin reenvia — **não se cria conta nova**, o que preservaria dois registros para a mesma pessoa. | **Ativo** |
| 3 | **Uso normal** | O usuário | Login em `/login`. `usuarios.ultimo_acesso` é atualizado. Toda escrita carimba `criado_por`/`editado_por` por trigger, a partir de `auth.uid()`. | Ativo |
| 4 | **Troca de senha** | O usuário | Em `/conta`, exigindo a senha atual. Sem expiração compulsória. | Ativo |
| 5 | **Recuperação de senha** | O usuário | `/recuperar-senha` envia link ao e-mail cadastrado. **Só funciona para conta com `status = 'ativo'`** — conta desativada não recupera senha, por definição. A resposta na tela é sempre a mesma, exista o e-mail ou não, para não revelar quem tem conta. | Ativo |
| 6 | **Mudança de perfil, escopo ou cursos** | Admin | `UPDATE` em `usuarios` / `usuario_curso`. Para `usuario_curso`, **encerra-se a vigência** (`vigente_ate`) e cria-se linha nova — nunca se sobrescreve, para que documento antigo continue reproduzível (seção 2.3). | Ativo |
| 7 | **Desativação** | Admin (`usuarios.desativar`) | `usuarios.status = 'inativo'`; sessões ativas invalidadas. **Nenhum `DELETE`**, nem em `usuarios`, nem em `auth.users` (a FK é `on delete restrict`). Todo histórico de `criado_por`/`editado_por` continua íntegro e resolvendo nome. | **Inativo** |
| 8 | **Reativação** | Admin | `usuarios.status = 'ativo'`. A **mesma linha** volta a valer — mesmo `id`, mesmo `auth_user_id`, mesmo histórico. Se a senha se perdeu no intervalo, segue-se o passo 5. | Ativo |
| 9 | **Último Admin** | — | O sistema **impede** desativar ou rebaixar de perfil o último `admin` ativo. É uma `CHECK`/trigger no banco, não uma validação de tela: um sistema sem Admin não tem como se recuperar. | — |

**Efeito da desativação na RLS.** As funções `app.usuario_atual()` e `app.perfil_atual()` **só resolvem para usuário com `status = 'ativo'`**. Um usuário inativo com sessão em cache não obtém perfil, `app.pode(...)` retorna `false` para tudo, e o banco nega — sem depender de a aplicação lembrar de checar. É a mesma ideia da seção 2.6: a garantia está no motor.

---

## 4. Cenários de uso típicos **[PRESERVADO no conteúdo · ajustado o mecanismo de plataforma]**

**Encarregado/Ajudante da CIAARA-11 configurando o regime de horário de um curso.** Seleciona o regime previsto no currículo (quantidade de tempos por dia e duração do tempo de aula, ambos imutáveis por norma), arbitra o horário de início do primeiro tempo da manhã e da tarde, ajusta a duração dos intervalos e registra a data de vigência da configuração — que passa a alimentar o Detalhe Semanal de Aula **sem alterar nenhum registro anterior**. *[MIGRAÇÃO v2.1]* A vigência deixa de ser convenção de leitura e passa a ser estrutura: o par `vigente_de` / `vigente_ate` em `horarios_tempos_aula`, com resolução sempre pelo maior `vigente_de <= data_do_fato`. **Nenhuma edição reinterpreta o passado** — e agora isso é propriedade do schema, não disciplina de quem escreve a consulta.

**Operador lançando a semana letiva.** Abre o Detalhe Semanal de Aula da turma, opcionalmente solicita a sugestão automática da semana, ajusta manualmente o que for necessário, lança cada aula, avaliação, vista de prova ou atividade, acompanha o saldo de carga horária da disciplina e imprime a grade assinada ao fim da semana. *[MIGRAÇÃO v2.1]* A tela vive em `/turmas/[turma]/dsa?semana=…`: **a semana está na URL**, então recarregar não perde o contexto, voltar funciona e o link pode ser mandado a outra pessoa — o que era impossível na v2.0 (documento 00, §5.2 (c)). A impressão sai por `/print/dsa`, rota dedicada sem o shell da aplicação.

**Encarregado da CIAARA-11 gerando e editando o planejamento do ano seguinte.** Executa o motor preditivo para o ano desejado, obtém uma **prévia** de distribuição, edita manualmente os pontos que o algoritmo não resolveu bem, lança os eventos não previsíveis pelo sistema (licenças administrativas de ocasião, por exemplo) e só então salva a prévia como o planejamento oficial daquele ano, que passa a servir de base de comparação previsto × executado. *[MIGRAÇÃO v2.1]* A gravação da prévia como plano oficial é **uma transação**: ou o ano inteiro entra, ou nada entra. Na v2.0 esse "tudo ou nada" tinha de ser encenado no código.

**Operador cadastrando instrutor e habilitando-o em disciplina.** Com a ampliação confirmada na decisão D2, executa o cadastro completo e o vínculo de habilitação **dentro do seu escopo de curso**. *[MIGRAÇÃO v2.1]* O escopo deixa de ser um `if` no início da função e passa a ser **a linha que o banco devolve**: fora do escopo, o registro simplesmente não existe para aquele usuário.

**Encarregado de Curso acompanhando seu curso.** Consulta o Cronograma e o Relatório do curso sob sua responsabilidade, sem escrita e sem visão de outros cursos. *[MIGRAÇÃO v2.1]* A restrição vem de `usuario_curso` via `app.cursos_do_usuario()`, aplicada por RLS. Se ele adivinhar a URL de outro curso, **o banco devolve vazio** — não é a tela que esconde.

**Chefe do Departamento de Ensino revisando o panorama institucional.** Consulta indicadores consolidados de todos os cursos para reportar ao Comando e ao Conselho de Ensino. *[MIGRAÇÃO v2.1]* Pode **compartilhar o link exato** da visão filtrada que quer discutir, em vez de descrever o caminho de cliques.

**Admin gerindo usuários.** Usa a tela dedicada para convidar um e-mail, atribuir perfil e escopo, vincular cursos e desativar/reativar contas — sem editar a planilha diretamente. *[MIGRAÇÃO v2.1]* Substitui o `RF-AUTH-05` da v2.0: a tela agora **cria a identidade de verdade** (convite no Supabase Auth), não apenas autoriza um e-mail que já existia no Google. Ajustar uma permissão de perfil é `UPDATE` em `perfil_permissao` (seção 2.5.2) — **não exige deploy**.

---

## 5. Ambiente de acesso **[MIGRAÇÃO v2.1]**

| Aspecto | v2.0 (revogado) | v2.1 |
|---|---|---|
| Como se acessa | Web App do Apps Script publicado, executando "como o usuário que acessa o app", dentro de iframe sob `script.google.com` | Aplicação **Next.js hospedada na Vercel**, em domínio próprio, sem iframe |
| Identidade | Conta Google individual autorizada | **E-mail/senha por convite do Admin** (seção 2.1) |
| Endereço | URL única do deployment; **sem URL por tela** | **URL por tela, com estado nos `searchParams`** — deep-link, voltar/avançar, favoritar, abrir em duas abas |
| Ambientes | Um só: **produção** | **Produção + preview por branch**, cada uma com seu banco de teste |
| Dispositivo | Navegador de desktop; layout responsivo, sem app móvel nem modo offline | Igual — **sem mudança de requisito** (`RNF-USA-02`). Uso típico continua em desktop, pelo volume de tabelas e grades densas |
| Densidade da interface | Tabelas grandes, prioridade à leitura | Igual, e reforçado: o sistema é de gestão. **Prefira compacto e legível a espaçado e bonito** |
| Tema | Claro (pastel) e noturno, persistidos no navegador | Igual (`RNF-USA-05` **[PRESERVADO]**), agora via `next-themes` com estratégia `class` |
| Acessibilidade | — | Contraste AA, foco visível e navegação por teclado nas tabelas densas |
| Segurança orgânica institucional | Competência da **Seção de Sistemas e Apoio ao Usuário (CIAARA-14.2)** | **Inalterada** — a mudança de hospedagem não muda a fronteira regimental. **Ponto a confirmar com Bernardo:** hospedar fora da infraestrutura da Marinha exige ciência e, possivelmente, anuência formal da CIAARA-14.2. Este documento registra a pendência; não a resolve. |

**Dados sensíveis.** O sistema guarda dado pessoal de militares (nome, NIP, posto/graduação, e-mail, endereço, telefone). Isso já era verdade na v2.0, com o dado no Google Drive institucional; na v2.1 ele passa a residir no Supabase. A mudança **não altera a classificação do dado**, mas altera **onde ele fica** — e essa é exatamente a informação que a CIAARA-14.2 precisa ter para se pronunciar. Tratado como restrição de plataforma no documento 03 e como item de corte no documento 30.
