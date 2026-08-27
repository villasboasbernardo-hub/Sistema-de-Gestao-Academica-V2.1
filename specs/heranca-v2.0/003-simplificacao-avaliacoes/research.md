# Research — Épico I: Simplificação do Módulo de Avaliações

Sem `[NEEDS CLARIFICATION]` remanescente no Technical Context — nenhuma decisão de tecnologia nova
neste épico (mesma stack do Épico E). Os achados abaixo são de **arquitetura/escopo**, no mesmo
formato dos achados do Épico E. **Achado 0 é o mais importante desta rodada** — reabre e corrige
uma premissa que os achados 2/4 originais assumiam errado; os demais foram atualizados em
consequência.

## Achado 0 — RN-AVAL-02 estava lida errado: agendar não é aplicar

**Decisão**: `registrarAvaliacao()` passa a gravar **só** o agendamento (turma, disciplina, tipo,
data prevista) — `TA_Inicial`/`Tempos_Consumidos` deixam de ser aceitos/exigidos nela. Uma função
nova, `aplicarAvaliacaoNoDsa(idAvaliacao, obj)`, registra a aplicação efetiva (grava `TA_Inicial`/
`Tempos_Consumidos`, atualizando a mesma linha) — só a partir desse momento a avaliação consome
tempo de aula e conta para a CHD.

**Racional**: a leitura original de RN-AVAL-02 ("agendar uma avaliação já produz o consumo de
tempos de aula correspondente") levou o Épico E a fazer `registrarAvaliacao()` exigir
`TA_Inicial`/`Tempos_Consumidos` já na criação. Bernardo corrigiu isso durante o planejamento desta
feature: agendar é só reservar a data prevista, que deve aparecer como sugestão na prévia do DSA;
o consumo de TA só acontece quando a avaliação é de fato registrada no DSA. A correção já foi
registrada na fonte normativa do projeto — `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`
(RN-AVAL-02 revisada v1.4, RN-EVT-03 com nota de referência cruzada) e
`docs/arquitetura/01-schema.md` §4.4 (`TA_Inicial`/`Tempos_Consumidos` viram `Obrig.: Não`) —
mesmo padrão de registro de decisão usado para P-14 e a rejeição da CAHO 2026 (constitution,
Princípio I). O espírito original de RN-AVAL-02 (nunca dois cadastros paralelos) é preservado: é a
mesma linha, só preenchida em dois momentos — o mesmo padrão que `registrarVistaProva` (achado 2)
já usa para o bloco de vista.

**Consequência para `Status`**: como uma avaliação agendada não tem mais `TA_Inicial`/
`Tempos_Consumidos` garantidos na criação, `Pendente`/`Em_andamento`/`Atrasada` deixam de ser
estados só de dado legado migrado (como a spec original desta feature assumia) — passam a ser o
**caminho normal** de qualquer avaliação agendada e ainda não aplicada. Decisão de design: `Status`
continua uma coluna literal (não uma `FORMULA`, ao contrário de `Status_Vista`) — mas o backend só
grava literalmente `Concluida` (em `aplicarAvaliacaoNoDsa`) e `Cancelada` (em `cancelarAvaliacao`).
`Pendente`/`Em_andamento`/`Atrasada` **nunca são escritos** — são calculados dinamicamente pelo
painel (`painelavaliacoesCurso_`, achado 4) a partir de `TA_Inicial` vazio + comparação entre
`Data_Avaliacao` e a data atual. Alternativa rejeitada: transformar `Status` numa `FORMULA` nativa
como `Status_Vista` — mudaria o tipo de uma coluna já populada no banco em produção, um risco
maior do que necessário quando o cálculo em JavaScript já resolve o mesmo problema.

**Alternativas consideradas**: manter `registrarAvaliacao()` como está e criar só a função de
aplicação por cima (rejeitado — deixaria `TA_Inicial`/`Tempos_Consumidos` obrigatórios numa função
que não deveria mais aceitá-los, uma contradição direta com a regra corrigida). Renomear
`registrarAvaliacao()` para refletir o escopo mais estreito, ex. `agendarAvaliacao()` (rejeitado —
é uma função já pública/implantada pelo Épico E; renomear quebra o contrato existente sem
necessidade, quando manter o nome e corrigir o comportamento já comunica a mudança através do
`contracts/server-functions.md`).

## Achado 1 — `registrarAvaliacao()` do Épico E removeu uma validação que não devia

**Decisão**: restaurar a checagem de habilitação para `ID_Instrutor_Responsavel` (aplicador),
mantendo `ID_Fiscal`/`Nome_Fiscal_Externo` isentos.

**Racional**: `lib/acoes/avaliacoes.ts` (Épico E) tem o comentário "a checagem
`instrutorHabilitado_(...)` de V1.0 é REMOVIDA: RN-INST-01 delimitada isenta explicitamente o
**aplicador/fiscal** de avaliação da exigência de habilitação" — mas o texto real de RN-INST-01
delimitada (`docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`, linha 51) diz: "Esta validação não
se aplica **ao papel de fiscal de avaliação** [...] o Oficial Fiscal é designado pela OM" — só o
fiscal, não o aplicador. A V1.0 original (``lib/` (monólito da v1.0, hoje dividido por domínio)`, linha 928-930) já tinha essa validação:
`if (obj['ID_Instrutor_Responsavel'] && !instrutorHabilitado_(...)) throw new Error('O instrutor
responsável não está habilitado nesta matéria.')`. O schema V2.0 confirma a distinção
fisicamente: `ID_Instrutor_Responsavel` "**exige** habilitação" vs `ID_Fiscal` "**não exige**"
(`docs/arquitetura/01-schema.md` §4.4). Épico I corrige a leitura equivocada, sem reabrir o schema.

**Alternativas consideradas**: manter como está (rejeitado — é uma regressão de Risco Alto segundo
o próprio documento 04, RN-INST-01, "validação de integridade mais citada nas especificações").

## Achado 2 — Toda escrita sobre uma linha já existente segue o mesmo padrão: update, não create

**Decisão**: três funções desta feature escrevem sobre uma linha já criada por `registrarAvaliacao`
— `aplicarAvaliacaoNoDsa` (achado 0), `registrarVistaProva` (bloco de vista) e `cancelarAvaliacao`
(exclusão lógica, achado 5) — todas localizam a linha por `ID_Avaliacao` e escrevem célula a célula
sobre ela, nunca `appendRow`.

**Racional**: RN-AVAL-02 revisada estabelece que agendamento, aplicação e (por extensão de design)
qualquer atualização posterior do mesmo lançamento são sempre a mesma linha, nunca um cadastro
novo. Nenhuma função hoje faz update por chave — `crudCriar` (`lib/acoes/crud.ts`) só sabe inserir linha
nova. É a primeira vez que o projeto precisa de escrita por linha existente; as três funções desta
feature compartilham o mesmo mecanismo de localização (buscar `_row` via `lerAbaComoObjetos_`,
escrever com `getRange(...).setValue(...)` como `crudCriar` já faz, só que sobre a linha encontrada
em vez de `getLastRow()+1`).

**Alternativas consideradas**: uma função `crudAtualizar` genérica (como `crudExcluir` do achado 5)
cobrindo os três casos (rejeitado por ora — os três têm validações e conjuntos de campos
suficientemente diferentes entre si que um genérico ganharia parâmetros condicionais demais; fica
como oportunidade de refatoração para o épico que precisar de um quarto caso de update).

## Achado 3 — FR-009/FR-010 (sinalização de vista atrasada) já estão fisicamente resolvidos

**Decisão**: nenhum cálculo de prazo é escrito em `.ts` para a vista de prova. `aplicarAvaliacaoNoDsa`
e `getPainelavaliacoesCurso` só **leem** `avaliacoes.Status_Vista` (já presente em cada linha via
`lerAbaComoObjetos_`, que devolve valores computados de fórmula) e repassam ao frontend.

**Racional**: o schema já entregue pelo Épico C define `Status_Vista` como `FORMULA` nativa da
planilha: `` `Realizada` se `Data_Vista_Prova` preenchida e `Status=Concluida`; `Atrasada` se `HOJE()
- Data_Avaliacao > 7` e vista não realizada; senão `Pendente` `` (`01-schema.md` §4.4, RF-AVAL-03).
`lib/acoes/crud.ts` já trata essa coluna como fórmula protegida (`COLUNAS_FORMULA['avaliacoes'] =
['Status_Vista']`, nunca sobrescrita por `crudCriar`). FR-009/FR-010 do spec descrevem exatamente
esse comportamento — a única coisa que faltava era uma tela que exibisse o valor. **Nota**: essa
fórmula depende de `Status=Concluida` — que, pós-achado 0, só é gravado por `aplicarAvaliacaoNoDsa`,
nunca por `registrarAvaliacao`. Consistente: uma vista só faz sentido depois que a aplicação já
aconteceu.

**Alternativas consideradas**: recalcular a lateness em JavaScript no backend, ignorando a fórmula
(rejeitado — duplicaria uma regra de negócio em dois lugares).

## Achado 4 — `painelavaliacoesCurso_` adapta `getDashboardavaliacoes` (V1.0), com classificação por data

**Decisão**: portar o núcleo de casamento de `getDashboardavaliacoes` (``lib/` (monólito da v1.0, hoje dividido por domínio)` V1.0, linha
952-990) como função **pura** `painelavaliacoesCurso_(planejadas, disciplinasCurso, avaliacoesReais,
hoje)` — recebe arrays já carregados **e a data de referência como parâmetro** (para ser
determinística e testável, em vez de chamar `new Date()` internamente), testável em Node.

**Racional**: o algoritmo de casamento por nome normalizado já está correto e validado na V1.0 — a
mudança real (pós-achado 0) é a classificação de situação por lançamento: `TA_Inicial` preenchido →
`Concluída`; vazio e `Data_Avaliacao` = hoje → `Em andamento`; vazio e no passado → `Atrasada`;
vazio e no futuro → `Pendente`; `Status = Cancelada` → `Cancelada` (checado primeiro, tem
prioridade sobre a comparação de data). `Formula_MF`/`Carater` continuam fora do retorno (FR-008).
Receber `hoje` como parâmetro (em vez de calcular internamente) é o mesmo padrão que mantém a
função pura e testável com fixtures fixas, sem depender do relógio do ambiente de teste.

**Alternativas consideradas**: casar por `ID_Grade` direto entre `avaliacoes_planejadas` e
`disciplinas` (rejeitado — `avaliacoes_planejadas` não tem `ID_Grade` próprio, só o nome da
disciplina; o casamento por nome é a própria regra RN-AVAL-01).

## Achado 5 — exclusão lógica de agendamento precisa de `crudExcluir`, ainda inexistente

**Decisão**: `crudExcluir(nomeAba, idColuna, idValor)` genérico em `lib/acoes/crud.ts` — localiza a linha
pelo valor da coluna PK e escreve `Status = 'Cancelada'` (mais `Editado_Por`/`Timestamp_Edicao`),
nunca `deleteRow`. `cancelarAvaliacao(idAvaliacao)` em `lib/acoes/avaliacoes.ts` chama essa função.

**Racional**: `lib/acoes/crud.ts` já documentou essa lacuna no Épico E ("`crudAtualizar`/`crudExcluir` ficam
para o épico que primeiro precisar deles") — FR do painel (exclusão de agendamento) é essa
necessidade. Segue C-05 (nunca apagar fisicamente) e o mesmo padrão de exclusão lógica via campo
`Status` já usado em `turmas`, `instrutores` e `instrutor_disciplina`.

**Alternativas consideradas**: reusar `crudCriar` com `obj['Status']='Cancelada'` (rejeitado —
`crudCriar` sempre insere linha nova via `getLastRow()+1`; cancelar precisa localizar e escrever
sobre uma linha **existente**).

## Achado 6 — prévia do DSA nesta feature é lista de sugestões, não a grade completa por TA

**Decisão**: `getDsaSemanal` (Épico E, `lib/acoes/dsa.ts`) ganha um campo novo,
`avaliacoesAgendadasNaSemana` — lista simples das avaliações da turma cuja `Data_Avaliacao` cai na
semana consultada e `TA_Inicial` ainda está vazio. Nenhum posicionamento visual por TA é entregue
por esta feature.

**Racional**: `lib/acoes/dsa.ts` já documenta explicitamente esse limite desde o Épico E: "a grade completa
por TA, detecção de conflito (RN-CONF-01, pendente) e impressão ficam para o Épico H". A prévia com
sugestão/pré-preenchimento pedida por Bernardo é satisfeita por uma lista simples (o Operador vê
"esta avaliação está agendada para esta semana, ainda não aplicada" e usa `aplicarAvaliacaoNoDsa`
para confirmar) — sem precisar antecipar o motor de sugestão de posicionamento automático que é o
próprio objeto do Épico H (documento 06). Contenção de escopo (constitution, Princípio IX).

**Alternativas consideradas**: implementar já a grade posicional por TA para acomodar a sugestão
visualmente (rejeitado — antecipa trabalho de Épico G/H sem necessidade; o valor pedido pelo
responsável — "não deixar a avaliação agendada cair no esquecimento" — já é entregue pela lista).

## Achado 7 — prazo de "Atrasada" da própria avaliação (distinto do prazo da vista)

**Decisão**: sem prazo de graça — qualquer dia corrido após `Data_Avaliacao` sem `TA_Inicial`
preenchido já classifica a avaliação como `Atrasada` no painel.

**Racional**: RN-AVAL-01 já define os 7 dias corridos para a vista de prova, com base normativa
explícita. Não há equivalente documentado para a aplicação da própria avaliação atrasar — a data
prevista já é o compromisso; o dia seguinte sem aplicação é, por definição, atraso. Decisão tomada
durante o planejamento desta feature (registrada em `spec.md`, Assumptions), não coletada por um
`/speckit-clarify` formal — de baixo custo para ajustar depois caso o responsável prefira um prazo
de graça diferente (ficaria em `config_parametros`, Princípio VII, se algum dia precisar de valor
administrável em vez de zero).

**Alternativas consideradas**: reusar os mesmos 7 dias corridos da vista (rejeitado — misturaria
duas contagens normativamente distintas sob o mesmo número, sem base documental para isso).
