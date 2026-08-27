# Research — Épico H: Motor de Sugestão Automática do Detalhe Semanal de Aula

Nenhum `NEEDS CLARIFICATION` restou no Technical Context do `plan.md`. A spec já registrava (Nota de
escopo) que RF-DSA-03/04/06/07 nunca foram portados para o backend V2.0 — a leitura de
`Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)`/`index.html` antes de escrever `tasks.md`, porém, revelou que **quatro das
seis User Stories têm uma implementação V1.0 real e funcionando para portar/generalizar**, não para
construir do zero — mesma diretriz "portar, não reescrever" já usada nos Épicos E/G. Só a sugestão
propriamente dita (US3/US4) e o arrastar-e-soltar (parte de US6) são trabalho genuinamente novo.

## Achado 1 — `getDsaSemanal` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):1258`) já é a grade completa por TA — corrigir só o escopo do conflito

A V1.0 já monta a grade dia×TA de uma turma, já resolve horário via `horarioDoBloco_`/
`lerCatalogoHorarios_`, já junta `registros_aula` + `atividades_nao_letivas` na mesma
grade, e já calcula situação por matéria/quadro de CH reaproveitando `distribuicaoSemanalMateria_`
(mesma função que RN-DIST-01 exige, confirmando que a V1.0 já não duplicava esse cálculo). A detecção
de conflito (linhas 1339-1354) já usa exatamente a regra de RN-CONF-01 — sobreposição de TA **e**
(mesmo instrutor **ou** mesma sala) — mas **só compara blocos dentro do `porDia` da própria turma**
(o loop `x`/`y` roda sobre `blocos` de uma única turma) — é exatamente o bug que a revisão de
RN-CONF-01 (documento 08, Tema G) documenta e exige corrigir.

**Decisão**: portar `getDsaSemanal`/`horarioDoBloco_`/a lógica de `seOverlap_` para `lib/acoes/dsa.ts`,
adaptando à leitura da nova `horarios_tempos_aula` despivotada (achado 2) e ao schema V2.0
(`Categoria_Normativa`, `ID_Instrutor` → `ID_Instrutor`/`ID_Fiscal` para blocos de Avaliação). A
única mudança estrutural do algoritmo de conflito é o **escopo da comparação**: em vez de comparar
só os blocos da turma sendo montada, buscar todos os lançamentos (`registros_aula` +
`avaliacoes`) do mesmo dia em **qualquer turma do sistema**, filtrando por data antes de comparar
pares (RF-DSA-04, FR-004) — o resto do algoritmo (`seOverlap_`, mesmo instrutor OU mesma sala) é
idêntico.

## Achado 2 — `lerCatalogoHorarios_`/`horarioDoBloco_` (V1.0) leem uma tabela pivotada que não existe mais no V2.0

A V1.0 lê `horarios_tempos_aula` como uma tabela larga (`Config`, `Tempo_Numero`, `Hora_Inicio`,
`Hora_Fim`, `Intervalo_Inicio`, `Intervalo_Fim` por linha, agrupada em memória por `Config`) — essa é
exatamente a estrutura que a auditoria da Fase 1 (`01-schema.md` §1) descobriu **não existir de
verdade** na banco de produção da V1.0 (era uma tabela pivotada de 5×30, reconstruída pelo Épico C). O
schema V2.0 já entrega o formato despivotado que `lerCatalogoHorarios_` sempre assumiu ter —
`ID_Config`+`Tempo_Numero` como chave composta, `Periodo`, `Tipo_Tempo`, `Intervalo_Apos_Min` em vez
de `Intervalo_Inicio`/`Intervalo_Fim` (`01-schema.md` §4.3).

**Decisão**: portar a *intenção* de `lerCatalogoHorarios_` (agrupar por config, montar `{n, inicio,
fim}` por TA) para uma função nova `lerCatalogoHorarios_` em `lib/acoes/dsa.ts`, lendo `horarios_tempos_aula`
via `lerAbaComoObjetos_` (não `getDataRange()`.select()`` manual como a V1.0 fazia) e agrupando por
`ID_Config` — o algoritmo de montar `horarioDoBloco_(taInicial, tempos, config, catalogo)` fica
idêntico, só a leitura da fonte muda. Resolve `ID_Config_Horario` do curso via
`curso_regime_historico`/`getRegimeVigente` (Épico G) — nunca lendo `cursos` diretamente,
mesmo padrão já estabelecido para regime.

## Achado 3 — `registrarAula` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):828`) é a função de lançamento manual que faltava — FR-002 é um porte, não uma criação do zero

A spec registrou como "achado novo" que nenhum arquivo do backend V2.0 escreve
`registros_aula` — verdade para o **V2.0**, mas a V1.0 tem `registrarAula(p)`
funcionando: valida turma/matéria/instrutor habilitado (`instrutorHabilitado_`, já portado e
corrigido no Épico F), calcula o total já lançado no dia como aviso (soft-validation, nunca bloqueia
— "o registro é fato histórico e é sempre gravado"), e grava via `crudCriar`.

**Decisão**: portar `registrarAula` para `lib/acoes/dsa.ts` como `lancarAula(p)`, adaptando ao schema V2.0
(`Categoria_Normativa='Aula'` fixo, `Tipo_Atividade` como subtipo opcional — `01-schema.md` §5.5) e
reaproveitando `instrutorHabilitado_`/`exigirEscopoTurma_` já existentes. **Único comportamento
genuinamente novo em relação à V1.0**: o teto diário de `registrarAula` já era soft (aviso, nunca
bloqueia) — mas o teto **semanal** de TFM (RN-DIST-03) nunca foi verificado por nenhuma função de
lançamento manual, nem na V1.0. A decisão de Clarifications 2026-08-15 (bloqueio rígido só para TFM)
é adicionada como uma validação nova antes do `crudCriar`, sem alterar o aviso diário já existente.

## Achado 4 — Impressão do DSA (RF-DSA-06) usa um padrão de CSS já provado na V1.0, ainda não portado ao Design System V2.0

A V1.0 não tem nenhuma função de backend para impressão — o padrão inteiro é front-end: uma classe
`.area-impressao` + `@media print { @page { size: landscape; } body * { visibility: hidden; }
#areaImpressao, .area-impressao * { visibility: visible; } }`, reaproveitada por **duas** telas
diferentes na V1.0 (DSA e Ficha do Instrutor) — confirma que é um padrão genérico, não algo
DSA-específico. `app/globals.css` (V2.0, Épico A) ainda não tem essa classe — nenhuma tela V2.0 imprime
ainda.

**Decisão**: portar `.area-impressao`/`@media print` para `app/globals.css` como componente reutilizável
do Design System (mesmo espírito de `.card-kpi`/`.grade-semanal` do Épico A — nenhum consumidor além
do DSA nesta entrega, mas disponível para telas futuras). O HTML de assinaturas
(`responsaveis.map(...)`, com fallback para "Instrutor" genérico quando `responsaveis_curso` estiver
vazio) é portado quase literal — só que no V2.0 essa degradação deve raramente disparar, já que
`responsaveis_curso` está populada desde o Épico C (ainda assim, a degradação graciosa (RN-DEG-01)
é mantida, nunca removida por "não ser mais necessária hoje").

## Achado 5 — Motor de sugestão (RF-DSA-08/08.1) não tem nenhum precedente na V1.0 — é trabalho novo

Diferente de US1/US2/US5, a V1.0 nunca teve nenhuma prévia/sugestão automática de DSA — o próprio
documento 06 descreve isso como inspirado no comportamento do FET (software externo, citado só como
referência de comportamento, nunca de tecnologia/dependência — RN-EVT nenhuma menção a bibliotecas
externas, constitution Princípio III proíbe dependência nova de qualquer forma). Não há código para
portar aqui.

**Decisão**: construir `lib/dominio/sugestao-dsa.ts` do zero, reaproveitando só as **peças** já existentes
(`distribuicaoSemanalMateria_` para saber quanto falta de cada disciplina; `escolherInstrutor_`/
`faixaRegimeInstrutor_` para escolher instrutor) — nunca duplicando essas duas funções (FR-006).
Algoritmo de preenchimento: para cada dia útil da semana, identificar espaços livres (TAs sem
lançamento), ordenar as disciplinas candidatas por "carga restante ÷ dias úteis restantes"
(RN-2027-05) ajustado pelo peso manual (`PRIORIDADE_DISCIPLINA_{ID_Grade}`), respeitando o teto
diário (4 disciplinas distintas/dia, 4 tempos da mesma disciplina/dia) e semanal (TFM 6, demais 25
recomendado) antes de propor um bloco — mesmo formato de saída de `alocarBlocosCurso_`
(`{data, idGrade, tipo, tempos, alerta}`), mas operando sobre uma única turma/semana real, nunca
sobre `planejamento_anual`.

## Achado 6 — Arrastar-e-soltar (RF-DSA-07) não tem nenhum precedente na V1.0 nem em nenhuma view V2.0 — é trabalho novo

Nenhuma tela da V1.0 ou da V2.0 usa a HTML5 Drag and Drop API (nenhum `draggable`/`dragstart`/`drop`
em nenhum arquivo do projeto) — não há padrão a reaproveitar. Excluir (a outra metade de US6) **já
tem** precedente direto: `excluirRegistroAula` (V1.0) chama `crudExcluir(nomeAba, idRegistro)`, e
`crudExcluir` já existe idêntico em `lib/acoes/crud.ts` (V2.0) — não precisa de nenhuma função
nova, só um botão na grade chamando `gs('crudExcluir', 'registros_aula', idRegistro)`.

**Decisão**: excluir reaproveita `crudExcluir` diretamente (sem wrapper novo em `lib/acoes/dsa.ts`). Mover por
arrastar-e-soltar é implementado com a API nativa do navegador (`draggable="true"`,
`ondragstart`/`ondrop`, vanilla — sem biblioteca, constitution Princípio III), chamando
`crudAtualizar('registros_aula', idRegistro, {Data: novaData, TA_Inicial: novoTa})` —
já existe e é genérico — mais a nova verificação de TFM/conflito (FR-012) antes de aceitar o drop.

## Achado 7 — RN-CONF-01 cross-turma: volume de dados é pequeno, sem necessidade de índice novo

A verificação cross-turma (achado 1) precisa ler `registros_aula`+`avaliacoes` de
**todas** as turmas para o dia em questão — não só da turma aberta. Mesmo assim, o volume total
(dezenas de turmas ativas, mesma ordem de grandeza já processada inteira em memória pelo motor
preditivo anual do Épico G para o catálogo completo de cursos) não justifica cache ou índice
persistido — filtrar por `Data` antes de montar os pares de comparação (O(n²) só dentro do mesmo
dia, não da semana inteira) mantém o cálculo tão barato quanto o da V1.0 já era para uma turma só.

**Decisão**: manter o cálculo em memória, sem tabela de conflitos persistida (RF-DSA-04 já exige
isso explicitamente) — nenhuma otimização especulativa além do filtro por data.
