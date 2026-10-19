# Roteiro de conferência — PR 2 da spec 016 (DSA, papel e planilha)

> Conferência por clique no **preview** do ramo `fix/BLOCO-1-dsa`.
> Preview: <https://sistema-de-gestao-academica-v2-1-git-fix-bloco-1-dsa-ciaara-11.vercel.app> (endereço do
> ramo, sempre no último commit do PR) · PR #68 · ⚠️ ele pede o
> login da Vercel antes do login do sistema.
>
> ⚠️ O preview fala com o banco remoto, que é a fonte da verdade dos cadastros, e a **C-Ap-FR 2026 já lança
> pelo sistema** desde 13/10/2026. **Nenhum passo abaixo precisa gravar**: onde um formulário abre, feche
> com *Cancelar* ou `Esc`.
>
> Este PR **não tem migration**. ⚠️ **O merge é entre semanas** (sexta à noite ou fim de semana), depois
> da sua conferência.

## 1 · As setas dentro do detalhe aberto (`PEND-016-3`)

1. Menu *Disciplinas* → escolha um curso → clique numa disciplina para abrir o detalhe → *Editar* numa UE.
2. No campo do tópico, use `Home`, `End`, `←` e `→`.
3. **Esperado:** o cursor anda **dentro do texto**; a linha da disciplina **continua aberta**, e o foco não
   pula para outra linha da tabela. Não grave: `Esc` ou *Cancelar*.
4. Menu *Turmas* → uma turma → abra uma disciplina na tabela da ficha → no campo de **data** da previsão,
   aperte `↑`.
5. **Esperado:** a **data muda** (é o campo que responde), e a linha continua aberta. Não grave.

## 2 · "Semana N de T" na tela e no papel (FR-009)

1. Menu *Turmas* → *C-Ap-FR 2026*.
2. **Esperado:** em *Avisos de qualidade de cadastro* → *Exibir avisos*: *"A turma tem 37 semanas e o
   curso, 35."*
3. *Abrir o DSA* → *Ir para a semana do dia* → **12/10/2026**.
4. **Esperado:** ao lado dos botões, **"Semana 28 de 37 · 12/10/2026 a …"** — e nenhum *"semana 42 de
   2026"*. No cabeçalho, *Semana do curso: Semana 28 de 37*, e **não há** mais *"DSA Nº"*. *(Até este PR
   saía "Nº 26".)*
5. *Imprimir*.
6. **Esperado:** no papel, *Semana do curso: Semana 28 de 37*, e o rodapé termina em *"… · Semana 28 de
   37"*. Nenhum *"Nº"* na folha.
7. *(Opcional)* Volte e escolha **30/03/2026**, antes do início da turma. **Esperado:** *"—"* no lugar da
   semana, e o aviso ao lado do *Imprimir* diz por quê.

## 3 · A planilha com a mesma numeração (FR-009.5)

1. No DSA da *C-Ap-FR 2026*, *Baixar planilha de contingência*, e abra o arquivo.
2. **Esperado na PREENCHIMENTO:** o cabeçalho de cada semana traz *"Semana N de T"* (a de 12/10, *"Semana
   28 de 37"*) e o rótulo da semana começa por ele: *"Semana 28 de 37 — 12/10/2026 a 17/10/2026"*.
3. **Esperado na IMPRESSÃO:** escolhendo essa semana no seletor, a identificação traz *"Semana 28 de 37"*
   no lugar de *"Semana 42/2026"* e de *"DSA Nº"*.
4. **Esperado na BD DISCIPLINAS:** início, término e duração do curso (35), e as contas *Semanas da turma*
   (37) e *T* (37). Mude o início da turma ali para uma semana antes: a numeração da PREENCHIMENTO inteira
   acompanha (feche sem salvar).
5. **Esperado na CRONOS:** as colunas dizem *S1, S2…* (a semana do curso, não mais a ISO), com a data
   inteira embaixo.

## 4 · O cartão novo do DSA (FR-008)

1. No DSA da *C-Ap-FR 2026*, numa semana com aula.
2. **Esperado:** em cada cartão, o **nome** da disciplina em destaque, o **código** depois, menor; a
   técnica numa **linha própria**, discreta, abaixo do tópico — não mais ao lado do *"N TA"*.
3. *Imprimir*. **Esperado:** o papel **não mudou** — o código vem antes do nome, como no documento
   assinado, e a técnica continua na coluna T/E.

## 5 · A sugestão de instrutor (FR-012.2)

1. No DSA da *C-Ap-FR 2026*, clique num **tempo vazio** → tipo *Aula* → disciplina **I**.
2. **Esperado:** *Quem ministra* já vem com o instrutor atribuído a essa disciplina na turma. *(Até este
   PR o campo abria vazio: a consulta por UE falhava, e a por disciplina não existia.)*
3. Escolha uma UE. **Esperado:** o instrutor continua o mesmo.
4. Troque o instrutor no seletor. **Esperado:** a troca vale — a sugestão nunca prende.
5. *(Se houver)* escolha uma disciplina **sem** instrutor atribuído na turma. **Esperado:** o campo fica
   vazio e aparece a frase *"Esta disciplina não tem instrutor atribuído nesta turma. Atribua em
   Disciplinas, no painel «Instrutores nesta turma»…"*.
6. *Cancelar*.

## 6 · O 2º lançamento no mesmo TA aparecendo (FR-012.3)

1. **Não há caso no remoto** — medido na cópia de 17/10/2026: zero. E **pela tela ele não nasce**: lançar
   sobre um bloco empurra os seguintes (`D-DSA-3`). Ele só aparece por carga.
2. **O que garante:** o segundo vai para *"Sem posição"* com o motivo *"no mesmo TA de outro lançamento"*
   na tela, para a lista *fora da grade* do papel, e para a lista sem posição da planilha; a ordem é por
   criação e código, e não muda mais entre cargas. Provado por teste de unidade nas duas ordens de entrada,
   no papel e na planilha — e os três reprovaram antes do conserto.

## 7 · Datas com ano no papel (FR-005)

1. No DSA da *C-Ap-FR 2026*, *Imprimir*.
2. **Esperado:** o cabeçalho dos dias diz *"SEG 12/10/2026"*, *"TER 13/10/2026"*… — com o ano. Na prévia
   de impressão (`Ctrl+P`, A4 paisagem), a folha continua em **uma** página.
3. Na planilha baixada no bloco 3: o cabeçalho dos dias da IMPRESSÃO e a CRONOS também com o ano.
4. Menu *Atividades* → *Filtros*. **Esperado:** *De* e *Até* abrem um **calendário** (não pedem mais
   *aaaa-mm-dd*); escolhida a data, a lista recorta e o endereço guarda a data em `aaaa-mm-dd`.

## 8 · O dia de 7 TA (FR-011.1, caso de regressão)

1. Menu *Turmas* → *C-Exp-Obs-ME 2026* → *Abrir o DSA* → semana de **05/10/2026**.
2. **Esperado:** a segunda-feira mostra os **7 TA** da aula, em duas partes — 4 de manhã e 3 à tarde — e o
   papel (*Imprimir*) também.

---

# Reconferência dos ajustes de 18/10/2026 — só A e B

> Em **Production** (<https://sistema-de-gestao-academica-v2-1.vercel.app>), depois do merge de 19/10/2026 — o
> preview do ramo some com ele. Nada é gravado.

## A · "Semana do curso: 28 de 37", num rótulo só

1. Menu *Turmas* → *C-Ap-FR 2026* → *Abrir o DSA* → *Ir para a semana do dia* → **12/10/2026**.
2. **Esperado na tela:** no cabeçalho, uma linha só: *"Semana do curso: 28 de 37"*. A palavra "Semana" não
   aparece duas vezes. Ao lado dos botões, continua *"Semana 28 de 37 · 12/10/2026 a …"*.
3. *Imprimir*. **Esperado no papel:** na faixa de identificação, *"SEMANA DO CURSO: 28 de 37"* numa linha. O
   rodapé continua terminando em *"… · Semana 28 de 37"*.
4. *(A planilha não mudou: a IMPRESSÃO mostra "Semana 28 de 37" sem o rótulo ao lado, e não há repetição.)*

## B · o quadro de CH não cruza a assinatura do Auxiliar

1. No DSA da *C-Ap-FR 2026*, vá a uma semana com mais de 4 disciplinas: **17/08/2026** (9 disciplinas, medido
   na cópia de 17/10) e depois **14/09/2026**.
2. *Imprimir* → `Ctrl+P` no **mesmo navegador e com as mesmas opções** em que você viu a sobreposição.
3. **Esperado:** o quadro de CH sai em duas colunas, e a 2ª termina **antes** da assinatura da esquerda. Um
   nome longo quebra em mais linhas e nunca passa para a coluna das assinaturas. A prévia continua com **uma**
   página A4 paisagem.
4. ⚠️ **Se ainda cruzar, me diga o navegador e as opções da impressão** (margens, escala, papel): no Chromium
   desta máquina, nenhuma das 131 semanas reais cruzava nem antes do conserto.
