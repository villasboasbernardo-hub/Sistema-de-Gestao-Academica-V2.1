# Roteiro de conferência — PR 2 da planilha de contingência (spec 015): CONTROLE e CRONOS

**Quem confere:** Bernardo Villas Boas, no **preview** do PR 2, com uma **turma real** — o mesmo arquivo
do roteiro do PR 1, que agora traz seis abas.
**O que já foi provado antes dela:** `medicoes.md` — a CONTROLE contra o painel de situação do sistema
nas três turmas semeadas, e a CONTROLE e a CRONOS recalculadas pelos Excel 16 e 2007 com um lançamento
offline feito pela automação.

| # | Faça | Tem de acontecer |
|---|---|---|
| 1 | Baixe a planilha de uma turma com lançamentos e abra a aba **CONTROLE** | Uma linha por disciplina, na ordem natural (I, II, …, IX), com CH prevista, CH lançada até a data de referência (hoje), restante e situação |
| 2 | Abra o **DSA** do sistema na semana corrente e compare com o painel de situação dele | A CH lançada de cada disciplina é a acumulada do painel até hoje; a situação diz *Aguardando início*, *Em andamento* ou *Concluída* com as mesmas palavras |
| 3 | Olhe a coluna **No sistema em DD/MM/AAAA** | Só aparece *Atrasada* ou *Conflitou*, e só onde o painel do sistema diz isso; a coluna da situação nunca diz nenhuma das duas |
| 4 | Na **PREENCHIMENTO**, lance um TA de uma disciplina num dia **anterior** a hoje (COD e ITEM) | Na CONTROLE, a CH lançada da disciplina sobe 1 e a restante desce 1; na **CRONOS**, a semana daquele dia sobe 1 |
| 5 | Lance outro TA da mesma disciplina num dia **depois** de hoje | A CONTROLE **não** muda (o lançamento à frente não conta até a data de referência); a CRONOS sobe 1 na semana dele |
| 6 | Na CONTROLE, escreva uma data de referência mais antiga no lugar de hoje | A CH lançada passa a contar só até aquela data; a situação acompanha |
| 7 | Abra a **CRONOS** | Uma coluna por semana do ano da turma, com os TA de cada disciplina; a distribuída é a soma, e a restante é a prevista menos a distribuída, nunca negativa |
| 8 | Envie o arquivo para o **Google Drive**, abra como Planilhas Google e repita os passos 4 a 6 | O mesmo comportamento; nenhuma célula de erro; a data de referência mostra a data de hoje |

⚠️ **O que esta conferência pode encontrar e a suíte não**: se a ordem e as palavras da CONTROLE servem
ao acompanhamento do dia a dia, e se a CRONOS de 50 semanas cabe na tela e no papel.
