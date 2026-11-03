# Regras de atividades — RA-1 a RA-9 (decisões de Bernardo Villas Boas, 03/11/2026)

Pedido do **Bloco 18** pelo `/corrigir` (spec `033-bloco-18-atividades`), com a conferência do passo 0 por Bernardo em
**03/11/2026** («recomendações, com estes detalhes»). As nove regras valem para o **módulo Atividades**, a **turma**, o
**DSA** e o **currículo**. Elas se leem junto com os padrões de tela ([`padroes-de-tela.md`](padroes-de-tela.md), RT-1 a
RT-8), as regras do lançamento do DSA ([`regras-do-dsa-lancamento.md`](regras-do-dsa-lancamento.md)) e as do currículo
([`regras-do-curriculo-bloco-6.md`](regras-do-curriculo-bloco-6.md), RC-1 a RC-12), e **não mudam** regra `RN-` do
documento 04: os limites de AEC, TAD e TR continuam **alerta, nunca bloqueio** (`RN-DEG-02`, regra 6 do `CLAUDE.md`).

**Vocabulário** (pedido nominal): **AEC** é *Atividade Extraclasse* — nunca «extracurricular»; **TAD**; **TR**;
**APOINST**. A grafia de «Prática Oceanográfica / Topogeodésica / Hidrográfica» não ocorre nos PDFs de 2026 (passo 0, §4);
os currículos de 2027 não estão no sistema, e a conferência da grafia de 2027 fica para quando chegarem.

A primeira coluna é o texto de Bernardo; a segunda, como a regra se aplica no código (preenchida pela spec 033).

| # | A regra | Como se aplica |
|---|---|---|
| **RA-1** | *"Catálogo de tipos de atividade (lista do sistema, Admin edita): Palestra · Visita · APOINST/Prática · Desportiva · Cerimônia · Monitoria · DeCAT · Reforço · Outra. Cada tipo tem classificação PADRÃO (AEC/TAD/TR), que o operador pode trocar no lançamento. APOINST conta como AEC (FR-021)."* | [pendente — spec 033] |
| **RA-2** | *"AEC previstas pertencem ao CURRÍCULO (RC-1): nome, tipo, TA previstos, disciplina opcional, obrigatória sim/não. Editadas na aba Atividades de Editar curso → Currículo. Correção em currículo em uso segue RC-6."* | [pendente — spec 033] |
| **RA-3** | *"A turma herda as AEC previstas do seu currículo como 'a cumprir'. Palestra fora do currículo entra sem vínculo e CONTA no limite de AEC do currículo (limite é de tempo, não de conteúdo)."* | [pendente — spec 033] |
| **RA-4** | *"Lançamento de atividade no DSA ganha: tipo (RA-1), 'Conta como' (TA da disciplina escolhida / AEC / TAD / TR), vínculo opcional com uma AEC prevista ou uma APOINST planejada, Responsável/Palestrante (instrutor cadastrado OU texto livre com nome e OM para externo), Local (sala cadastrada OU texto livre). 'Conta como TA da disciplina' soma na CH da disciplina e do instrutor, como aula."* | [pendente — spec 033] |
| **RA-5** | *"Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (data, palestrante, local vêm do lançamento) OU marcada à mão pelo trio (Admin/Encarregado/Ajudante) com justificativa obrigatória e trilha, como os ajustes de avaliação do Bloco 16."* | [pendente — spec 033] |
| **RA-6** | *"APOINST: planejada no módulo Atividades pelo trio, por turma: nome, disciplina, instrutor responsável (designado da disciplina), período previsto, TA previstos. Execução = lançamentos do DSA vinculados (Operador lança). Situação: Planejada · Em andamento (tem lançamento) · Concluída (TA lançados ≥ previstos ou marcada à mão com justificativa) · Atrasada (passou o fim previsto sem concluir). Comparar previsto × realizado (datas e TA). Só turmas de 2027 em diante; as de 2026 ficam como estão, sem retroajuste."* | [pendente — spec 033] |
| **RA-7** | *"Tudo que é ligado a turma segue o ano da turma (RT-6); o seletor do cabeçalho filtra."* | [pendente — spec 033] |
| **RA-8** | *"Avisos no sininho: AEC obrigatória não cumprida a 4 semanas do fim da turma; APOINST atrasada; AEC/TAD/TR da turma acima do limite do currículo."* | [pendente — spec 033] |
| **RA-9** | *"Estatísticas pensadas para a DEnsM e a auditoria interna: por turma, TA de AEC/TAD/TR usados × limite do currículo; palestras previstas cumpridas N de M, com data, palestrante e local; visitas com local; APOINST por situação. Calculadas em lib/dominio (TS puro) e reaproveitáveis pelo Épico 10."* | [pendente — spec 033] |

## As decisões da conferência do passo 0 *(Bernardo Villas Boas, 03/11/2026)*

1. **A classificação escolhida pelo operador** é uma coluna nova, nulável; o gatilho `app.categoria_pelo_tipo` só a
   respeita quando ela vem preenchida — autorizada **se** a medição na cópia do remoto der efeito **zero**.
2. **Monitoria continua Apoio Individualizado** (D-AA-12 da spec 014).
3. **O catálogo** acrescenta **Desportiva** (AEC), **DeCAT** (TR), **Reforço** (TR) e **Outra** (AEC). **Nenhum tipo
   existente é renomeado**: *Visita Técnica*, *Apoio à Instrução* e *Evento/Cerimônia* só se **agrupam** nas estatísticas
   como *Visita*, *APOINST/Prática* e *Cerimônia*. Todos os tipos com lançamento ficam. A aba e a sigla na tela são
   **APOINST**; o tipo segue **«Apoio à Instrução»**.
4. **Só o rótulo** «Atividade Extracurricular» passa a **«Atividade Extraclasse»**, sem mudar categoria nem lançamento,
   por migration com o rito completo.
5. **AEC prevista** = os roteiros de palestra + as visitas nomeadas (visita de estudo é AEC pelo item 2.5 dos currículos,
   inclusive as de cômputo não informado). **Ficam fora** as categorias genéricas, o que o currículo põe na UE e o TG da
   Navegação Astronômica do C-Ap-HN (texto contraditório).
6. **Autorização nominal** para carregar, no remoto, as AEC previstas da tabela do passo 0 nos currículos 1 de 2026, como
   correção RC-6 com a justificativa *«Carga inicial das AEC previstas do currículo (bloco de Atividades, conferida por
   Bernardo em 03/11/2026)»* e trilha; item sem TA no currículo entra com TA vazio.
7. **Autorização nominal** para carregar no balde `curriculos` do remoto os 24 PDFs de `SIS11/Curriculos`, cada um no
   currículo 1 do seu curso, pelo mesmo caminho da tela *Editar curso → Currículo*, sem apagar nem sobrescrever nada.
