# Roteiro de conferência — spec 025 (Bloco 10, padrões de tela)

No preview, com a conta de **Admin**. Os passos **[GRAVA]** escrevem no banco remoto; os demais só leem.

> ✅ **A MIGRATION DA EXCLUSÃO PERMANENTE ESTÁ NO REMOTO DESDE 24/10/2026** (portão 9.4 autorizado na conferência
> parcial; registro em `plano-de-aplicacao-no-remoto.md` §7). Os passos marcados **[DEPOIS DA MIGRATION]** já se
> conferem. Antes dela, o *Excluir* novo aparecia desabilitado com *"não foi possível conferir os registros"*
> (`RN-DEG-01`).

Regras de tela de referência: `docs/correcoes/padroes-de-tela.md` (RT-1 a RT-7 e D-COR-6).

## 1. Página da turma

1. *Turmas* → uma turma ativa → clique no código. Esperado: no alto, à esquerda, **só** o código da turma, *Curso*
   (sigla — nome, clicável como texto), *Currículo* (com a vigência) e *Situação* (o selo). **Não há** o link solto
   *"← Turmas"* (o caminho de volta é a lateral).
2. No canto superior direito, os ícones na ordem **Abrir o DSA · Baixar planilha de contingência · Editar turma ·
   Arquivar turma · Excluir turma**. Passe o mouse: a dica é **só o verbo** (*"Editar"*, *"Baixar"*, *"Arquivar"*…).
3. Logo abaixo, **oito cartões do mesmo tamanho, juntos**: CH prevista, CH executada, Progresso, Saldo de capacidade,
   AEC, TAD, TR e Avaliações (o de Avaliações leva à aba Avaliações). Depois, o *Histórico da situação*; depois as abas
   *Ficha* (com **Dados da turma**: modalidade, período, sala, efetivo e regime) e *Avaliações*.
4. Não há mais *Editar turma* no fim da página, nem o botão *Trocar situação* ao lado do selo.
5. *Editar turma* (ícone) → abre **a página** `/turmas/…/editar`, com **Situação** no formulário. Troque a situação:
   aparece o campo *Observação da troca*. Escreva uma observação e salve. **[GRAVA]** Esperado: volta à ficha com
   *"Situação gravada. <nova>."*, o selo novo e, no Histórico, a troca com a sua observação. Volte a situação ao que era
   **[GRAVA]**.
6. Numa turma **EAD**: no lugar do *Abrir o DSA* e dos cartões de andamento, o aviso da Divisão de Ensino a Distância.

## 2. Aba Turmas do curso

1. *Cursos* → um curso → aba *Turmas*. Esperado: em cada linha, à direita, os ícones **Editar · Arquivar · Excluir**.
   *Editar* abre a página de edição da turma; *Arquivar* abre o mesmo aviso da ficha.
2. A lista mostra **só as turmas do ano escolhido** no canto superior direito (item 10). Troque o ano: a lista troca.
3. **[DEPOIS DA MIGRATION]** Numa turma **com** lançamento, o *Excluir* fica desabilitado com a dica *"tem registros:
   use Arquivar"*; o nome acessível diz o que prende (*"Tem aula lançada…"*).

## 3. D-COR-6 — Excluir turma e Excluir feriado

1. **[DEPOIS DA MIGRATION]** Crie uma turma de teste num curso (*Nova turma*) **[GRAVA]**, sem lançar nada. Na ficha dela,
   *Excluir turma* está liberado: clique → o alerta diz que é **permanente**; o botão *Excluir permanentemente* só libera
   com o **código da turma** digitado → confirme. **[GRAVA]** Esperado: vai para *Turmas* com *"Turma … excluída
   permanentemente."*; a turma sumiu.
2. **[DEPOIS DA MIGRATION]** *Atividades* → *Calendário*: numa linha de uma data cuja semana **tem lançamento salvo ou
   DSA publicado** de uma turma alcançada (quase todas as de 2026), o *Excluir* está desabilitado com *"tem registros: use
   Desativar"*; medido na cópia do remoto, só 3 das 32 ficam liberadas (02/11, 12/11 e 15/11/2026).

## 4. Curso, aba Disciplinas — barras

1. *Cursos* → um curso → aba *Disciplinas* → ícone **Estatísticas** (canto superior direito da aba). Esperado: os cartões
   *Disciplinas* e *CH prevista* e o gráfico de **barras verticais**: uma barra por disciplina, o **código** no eixo X
   (`I`, `II`, … em ordem natural), o eixo Y em *"Tempos de aula (TA)"*, a legenda com *"código — nome: N TA"*.
2. Clique numa disciplina da legenda (ou na barra): ela some do gráfico, fica riscada na legenda, e aparece *Mostrar
   todos*.

## 5. Lista de cursos — Filtros e Estatísticas

1. *Cursos*. Esperado: no canto superior direito, na mesma linha de *Novo curso*, os ícones **Filtros** e
   **Estatísticas**. Os dois painéis começam **recolhidos**; abrir não muda o endereço.
2. Filtre por uma classificação: o ícone *Filtros* mostra o número **1**; *Limpar filtros* está dentro do painel.
3. O mesmo padrão em **Instrutores**, **Turmas** (os seis números foram para *Estatísticas*), **Atividades** (Filtros),
   **Início** (Filtros; os números do ano continuam à vista), a aba **Disciplinas** do curso e de *Editar curso*, e
   **Usuários** (*Estatísticas* com o quadro *Acessos ao sistema*; a busca continua à vista).

## 6. Estatísticas de cursos

1. *Cursos* → *Estatísticas*. Esperado: **sete cartões do mesmo tamanho**: *Total de cursos e estágios do CIAARA-11*,
   *Cursos regulares*, *Cursos expeditos*, *Cursos especiais*, *Estágios de qualificação*, *Cursos de aperfeiçoamento
   avançado* e *Demais cursos* — os seis somam o total. Depois a pizza *Quantidade de cursos em cada classificação* e as
   barras da duração em semanas. Com filtro, o total diz *"neste recorte"*.

## 7. Editar curso

1. Um curso → *Editar curso*. Esperado: duas abas, **Cadastro** (o formulário do curso, um *Salvar*) e **Currículo**.
2. *Currículo*: no alto, a barra do currículo (escolher, novo, arquivar, descartar), os **dados** (vigência, descrição,
   propósito, duração — um *Salvar*) e o **PDF**; embaixo, as sub-abas **Disciplinas · Horários · Atividades e limites**.
3. *Disciplinas*: o lápis de uma disciplina abre a página dela; a UE continua em janela.
4. *Horários*: *Registrar nova vigência* e *Corrigir esta vigência* abrem em **janela** (eram blocos abertos na página).
5. Um link antigo com `?parte=horarios` abre direto o *Currículo* → *Horários*.
6. Estando em *Currículo* → *Horários*, clique em *Cadastro*: a página **fica** no Cadastro (antes da revisão, voltava ao
   Currículo).

## 8. Gráficos interativos

1. *Instrutores* → *Estatísticas* → a pizza de **escolaridade**: clique em *"Não informado"* na legenda. Esperado: o grupo
   sai, os percentuais se refazem sobre o que ficou, e *Mostrar todos* devolve. O mesmo em toda pizza e barra das
   estatísticas (cursos, instrutores, turmas). O último grupo à vista não se oculta.

## 9. Instrutores — semanas acima da faixa

1. *Instrutores* → um instrutor **ativo** com carga prevista acima da faixa. Esperado: no alto da ficha, o alerta
   **lilás** *"Carga semanal prevista acima da faixa do regime em <ano>"*, uma linha por semana. Abaixo da faixa ou
   dentro dela, nenhum alerta. Troque o ano no canto superior direito: o alerta e a carga seguem o ano escolhido.
2. *Editar instrutor* abre **a página** `/instrutores/…/editar`; *Desativar* e *Excluir* ficam na barra do topo.

## 10. Ano (RT-6)

1. *Turmas* → no canto superior direito, o seletor de ano: oferece **de 2020 até o ano de hoje + 10**, com o de hoje por
   padrão. Escolha o ano seguinte. Esperado: *"N turmas em <ano>"*.
2. Vá pelo menu ao **Início**: ele abre no ano escolhido (o seletor e *"Turmas de <ano>"*). O mesmo em *Instrutores* (a
   coluna de CH), na ficha do instrutor, na página do curso, em *Atividades* (lista e Calendário) e no submenu de
   *Turmas* da lateral.
3. Volte ao ano de hoje: a escolha é apagada. A escolha expira sozinha na virada do ano.
4. Abra um endereço com o ano nele (copie a barra com `?ano=` e cole numa aba nova) e troque o ano no seletor: a tela e o
   endereço trocam juntos (antes da revisão, a tela ficava presa no ano do link).
5. Na página de um curso com currículo futuro, escolha o ano dele: *Sobre o curso* → *Baixar o currículo (PDF)* traz o PDF
   **desse** currículo, e o *Editar* da aba *Horários* abre *Editar curso* nesse currículo.

## 11. Calendário

1. *Atividades* → *Calendário*. Esperado: os ícones de cada linha com a dica **só o verbo** — *Editar*, *Desativar*,
   *Reativar*, *Excluir*; não aparece mais *"Inativar"* (o confirmar diz *Desativar*).
2. **[DEPOIS DA MIGRATION]** Cadastre uma linha de teste numa data sem DSA salvo **[GRAVA]** → *Excluir* → digite o código
   da linha → confirme. **[GRAVA]** Esperado: *"Linha excluída do calendário."*, e a linha some.

## 12. Varredura RT-1 a RT-3 — o que foi tocado

| Tela / cadastro | O que mudou |
|---|---|
| Ficha da turma | barra no topo direito; edição em página própria; situação dentro de *Editar turma*; *Excluir* |
| Lista de turmas e aba Turmas do curso | *Editar · Arquivar · Excluir* na linha |
| Ficha do instrutor | *Editar* em página própria; *Excluir* desabilitado com a dica *"tem registros: use Desativar"* |
| Regime de horário (Editar curso → Horários) | *"Inativar"* → *Desativar*; **[DEPOIS DA MIGRATION]** *Excluir* (sem turma que o use e com o currículo sem lançamento) |
| Vigência do regime | registrar e corrigir em **janela** |
| Avaliação do currículo (página da disciplina) | *"Inativar"* → *Desativar*; **[DEPOIS DA MIGRATION]** *Excluir* |
| Disciplina e UE | o *Excluir* já chega desabilitado, com a dica e o que prende (o banco é consultado ao abrir) |
| Sala (*Administração* → *Salas*) | *Editar* (só a natureza, em janela) **[GRAVA]**; **[DEPOIS DA MIGRATION]** *Excluir* (sem turma que a use) |
| Curso | *Excluir* sempre desabilitado, com a dica: todo curso tem o histórico do regime, que é permanente |
| Usuários | *Estatísticas* (quadro de acessos) na barra |
| Mensagens | *"Regime desativado."*, *"… desativada."*, *"não pode ser desativado."* — nenhum *"Inativar"* em texto de tela (guarda `sem-inativar.test.ts`) |

## 13. Rodada da conferência parcial (24/10/2026) — só o que mudou

1. *Instrutores* → ícone **Estatísticas**, no ano de hoje: o cartão diz *"Habilitados × selecionados em <ano>"*. Troque o
   ano para o **seguinte** no seletor: os **selecionados vão a 0** (não há turma do ano seguinte com instrutor
   designado), o habilitado continua o mesmo, e o gráfico *Status de Seleção* acompanha.
2. *Filtros* → *Selecionado: Sim* no ano seguinte → **0 instrutor(es)**; volte ao ano de hoje → os designados.
3. Abra um instrutor pela lista: *Carga horária de <ano>* segue o ano escolhido.
4. **[GRAVA]** A exclusão permanente agora funciona: os passos **[DEPOIS DA MIGRATION]** dos itens 2, 3, 11 e 12.

## 14. Segunda conferência (24/10/2026) — só o que mudou

1. *Instrutores* → o instrutor que você designou na mesma disciplina numa turma de 2026 e numa de 2027 (no remoto, a atribuição da `CAHO 2027`). Em **2026**, *Carga horária de 2026*:
   a **prevista** e a lista de atribuições têm **só a turma de 2026**. Troque para **2027** no seletor: só a de 2027.
   A **ministrada** segue o ano da turma da aula; o **alerta lilás**, só as turmas do ano.
2. *Instrutores* → *Filtros* → *Curso: CAHO*: em 2026, os designados em turma CAHO de 2026; em 2027, só o designado na
   CAHO 2027. Quem só tem habilitação não entra mais.
3. *Instrutores* → a coluna *CH do ano* e o sininho (alerta de carga) seguem a mesma regra.
4. *Atividades*: a atividade de turma aparece no ano da turma; a global (de todas as turmas), pela data.
5. *Cursos*: o seletor de ano no canto superior direito; a duração de cada cartão e as *Estatísticas* de duração são as
   do currículo vigente no ano escolhido (troque o ano num curso com currículo novo vigente no ano seguinte).
