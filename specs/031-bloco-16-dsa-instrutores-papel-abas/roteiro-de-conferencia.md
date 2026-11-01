# Roteiro de conferência — spec 031 (Bloco 16)

No preview, com a sua conta de Admin: *Turmas* → uma turma → *Abrir o DSA* → uma semana **futura** sem publicação.
⚠️ **Os passos marcados com ✍️ gravam no banco remoto**: no fim, *Descartar rascunho* (ou exclua pela tela o que
lançou). O que for **publicado** fica na trilha imutável — use uma semana de teste sua.

## 1. Lançar e Cancelar em ícones (FR-001)
1. Clique numa célula vazia. **Esperado:** no fim do formulário, **dois ícones juntos à esquerda** — *Lançar* (quadrado
   com +) e *Cancelar* (×); aponte cada um: a dica é só o verbo. Nenhum botão escrito.
2. Troque o tipo para *AEC*, *TAD*, *TR*, *Apoio*: os mesmos dois ícones. *Cancelar* fecha sem gravar.

## 2. «Início» (FR-002)
1. No formulário e no cartão de um lançamento já na grade: o campo do tempo inicial se chama **Início**.

## 3. Avaliação (FR-003)
1. Tipo *Avaliação* → escolha a disciplina. **Esperado:** **sem** *Técnica de ensino*. *Tipo da avaliação* e
   *Instrumento* **continuam** — ⛔ o item 3a está parado: o banco mostrou que os dois guardam coisa diferente (veja o
   lote de dúvidas). Na *Aula*, a *Técnica de ensino* continua.

## 4. Estudo Individual (FR-004)
1. Tipo *Estudo Individual*. **Esperado:** nenhum campo de instrutor nem de nome livre.
2. ✍️ Lance um EI e abra o cartão dele: também sem instrutor.

## 5. Apoio Individualizado (FR-005)
1. Tipo *Apoio Individualizado* → escolha o tipo da atividade. **Esperado:** *"Conta como: Apoio Individualizado (fora da
   CHT)"*, sem *"alunos específicos"*.
2. ✍️ Lance, *Salvar minuta*, *Gerar prévia*: o cartão diz *"Apoio Individualizado: …"* na grade e no papel.

## 6. Mais de um instrutor (FR-006)
1. Tipo *Aula* → disciplina → *Quem ministra*. **Esperado:** abaixo, **Instrutores adicionais (opcional)**, com a lista
   dos **habilitados** na disciplina, sem quem ministra. Sem outro habilitado: *"Nenhum outro instrutor habilitado nesta
   disciplina…"*.
2. ✍️ Escolha um ou dois adicionais (cada um vira uma etiqueta com *Retirar*), lance 1 tempo, *Salvar minuta*.
   **Esperado:** o cartão mostra *"Quem ministra / Adicional · Local"*; o papel (*Gerar prévia*) também.
3. Troque a disciplina no formulário: o adicional não habilitado na nova sai da lista.
4. Ficha do instrutor adicional → a CH ministrada do ano conta os tempos inteiros da aula; a da turma (ficha da turma)
   sobe só uma vez. ⚠️ Só depois do *Salvar minuta* (rascunho não conta).
5. ⚠️ As 25 aulas antigas com *"Demais instrutores"* em texto continuam mostrando os nomes e **não** contam na carga
   (`PEND-031-1`, decisão sua).

## 7. ORIGINAL / ALT N / PRÉVIA (FR-007)
1. *Gerar prévia*: o campo *Alteração* diz **PRÉVIA**.
2. Numa semana publicada: a aba *Original* → *Reimprimir* → **ORIGINAL**; uma *ALT 1* → **ALT 1**. O carrossel do Início
   mostra o mesmo.

## 8. Instrutor e local na mesma linha (FR-008)
1. Um cartão de **1 tempo** com local: o local aparece **na linha do instrutor**, depois de « · », na grade e no papel.

## 9. Abas de acompanhamento (FR-009)
1. Abaixo da grade: **Disciplinas · Avaliações · APOINST · Palestras**. *Disciplinas* é o painel de sempre.
2. *Avaliações*: uma linha por avaliação da turma — *Situação · Semana prevista · Semana lançada · Semana aplicada · TA*;
   o endereço ganha `?acompanhamento=avaliacoes` (copie o link e abra: volta na aba).
3. *APOINST* e *Palestras*: **"Em breve"**.
