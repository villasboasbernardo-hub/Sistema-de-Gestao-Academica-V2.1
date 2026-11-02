# Roteiro de conferência — spec 032 (Bloco 17)

No preview, com a sua conta de Admin. **Nenhum passo grava no banco.**

## 1. Cartões menores e a situação num cartão (item 1)
1. *Turmas* → `C-Ap-FR 2026`. **Esperado:** em *Andamento*, cartões compactos (número menor, menos respiro), até seis por
   linha. O primeiro é **Situação**, tingido na cor da situação (verde para *Ativa*), com o texto dentro. A *Situação*
   saiu da lista de dados do cabeçalho.
2. Numa turma arquivada (*Mostrar arquivadas* em `/turmas`): o cartão diz *Arquivada* abaixo da situação.

## 2. Os três cartões novos (item 2)
1. Na mesma ficha: **CH restante** (*prevista − executada*), **Dias úteis até o término** (*de amanhã a DD/MM/AAAA*) e
   **CH disponível até o término** (com *N TA/dia · N dias úteis*).
2. Confira: CH restante = CH prevista − CH executada.

## 3. Saldo de CH e a situação (item 3)
1. O cartão **Saldo de CH** = CH disponível − CH restante, tingido pela situação; abaixo, a situação, o saldo em dias e
   *«uma semana de aula = N TA»*. Ao lado do título *Andamento*, a etiqueta e a frase.
2. Pela medição de 01/11/2026 (spec §6): `CAHO 2026` **Adiantada** (+62), `C-Ap-HN 2026` e `C-Espc-HN 2026` **Dentro do
   previsto** (+37, +25), `C-Ap-FR 2026`, `C-Espc-FR 2026` e `C-ApA-AuxNav-PR-SP T2 2026` **Atrasada** (−9, −80, −228).
   ⚠️ Os números andam com o dia: o que vale é a conta fechar.
3. *Turmas*: a coluna *Saldo (TA)* traz a mesma etiqueta. *Início*: o cartão da turma também.

## 4. Abas da turma (item 4)
1. Abaixo do histórico: **Ficha · Avaliações · APOINST · Palestras**. Clique em *APOINST* e em *Palestras*: **«Em breve»**,
   e o endereço ganha `?aba=apoinst` / `?aba=palestras`.

## 5. Abas de Atividades (item 5)
1. Menu *Atividades*: **Atividades · Calendário · Palestras**. *Palestras* → **«Em breve»** (`?aba=palestras`).

## 6. Estudo Individual fora da lista (item 6)
1. *Atividades*: nenhuma linha *Estudo Individual*; a contagem *«N atividades em 2026»* caiu; *Filtros → Categoria* não
   oferece *Estudo Individual*.
2. Abra o DSA de uma turma com EI: ele continua lá, e a CH da ficha não mudou.
