# Roteiro único de conferência — spec 014 em Production, logado, SÓ LEITURA

> Para Bernardo Villas Boas, em **https://sistema-de-gestao-academica-v2-1.vercel.app**, com a conta dele (Admin).
> Substitui, para a conferência final, os roteiros dos PRs 5, 5.1 e 6 (T198, T221, T235), que lançavam e excluíam:
> **este não grava nada**.
>
> **Os números esperados foram medidos no banco remoto, só por leitura, em 15/10/2026** (`supabase db query --linked`,
> `vw_carga_horaria_turma` e as avaliações vivas), e são iguais aos do relatório da rodada
> (`antes-depois/rodada-do-pr6-no-remoto.md`). ⚠️ **Três deles dependem da data** e estão marcados ⏱ com o valor de
> cada dia. ⚠️ CAHO, C-Ap-FR e C-Ap-HN **lançam no sistema desde 13/10/2026**: um lançamento novo nelas muda o
> número, e isso não é defeito — anote o que viu.

## ⛔ O que NÃO clicar (grava no banco)

Como Admin você vê os botões de quem edita. **Não clique em:** *Definir tempo*, *Confirmar sugestão*, *Nomear*,
*Gravar*, *Lançar*, *Excluir*, *Mover*, *Parar dia*, *Desfazer*, *Editar turma*, nem em **célula da grade do DSA**
(abre o formulário de lançamento). Abrir abas, `<details>` (as disciplinas), trocar de semana e **Imprimir** não
gravam.

## 1. O alerta de vistas no Início — ⏱

Menu **Início** → região de alertas → **Vistas de prova**.

| Dia da conferência | Deve aparecer |
|---|---|
| 15/10 ou 16/10/2026 | **"6 vistas atrasadas · 1 vencendo em breve"** (a que vence é da CAHO 2026, prova de 09/10) |
| de 17/10/2026 em diante | **"7 vistas atrasadas"**, sem "vencendo" — se ninguém lançar a vista da CAHO até lá |

Abrir a lista: as 6 (ou 7) são **só de prova ligada a item do currículo** (decisão de 14/10/2026). As 38 de prova sem
item **não** aparecem aqui; estão na lista de erros de planilha. Clicar numa delas leva à aba **Avaliações** da turma
(só leitura).

## 2. C-Ap-HN 2026 — o card e a aba Avaliações — ⏱

Menu **Turmas** → **C-Ap-HN 2026**.

1. Card **Avaliações**: **"28 aplicadas de 37 previstas no currículo"** até 15/10/2026; **"29 aplicadas de 37"** a
   partir de 16/10/2026 (a prova `DSA-MV723OPT-V`, lançada na tela para 16/10, passa a contar no N). A prova sem item
   do currículo conta no N — é a regra; ela não some da conta.
2. Clicar no card → a URL ganha `?aba=avaliacoes`; **voltar** do navegador volta à Ficha.
3. Abrir uma disciplina (clicar no título): *"CH … = … aula + … avaliação"*, *"X de Y avaliações aplicadas"*, os itens
   com a situação e, quando houver, o bloco **"Lançadas no DSA sem avaliação do currículo ligada"**, e a linha de
   projeção *"restam … TA; faltam … → sobram … TA para aula"*.

## 3. C-Ap-HN 2026 — UE 7 – Física no DSA

Ainda na C-Ap-HN 2026 → **Abrir o DSA** → no campo da semana pela data, **05/10/2026** (ou qualquer semana depois de
maio) → painel **Situação por disciplina** → abrir **I – MATEMÁTICA E FÍSICA** → a linha da **UE 7 – Física**:

> **conteúdo 18 de 18 · prova 2 de 2 · vista 1 de 1** — **Concluída**, sem "resta" (18 + 2 + 1 = 21).

Opcional: **Imprimir** (só abre o papel; não grava).

## 4. C-Exp-Obs-ME 2026 — a CHD depois da A6.1

Menu **Turmas** → **C-Exp-Obs-ME 2026** → seção **Andamento** → card **CH executada**: **114 TA** (era 113 antes da
A6.1). Abaixo, **Apoio Individualizado: 1 TA** (a Recepção aos alunos, que saiu do TAD).
No DSA, semana de **07/10/2026**: a prova de 07/10 e a vista dela em 09/10 (a original `L206`, reativada).

## 5. A CHT das sete turmas depois do Apoio Individualizado

⚠️ **A CHT não aparece como um número só em tela nenhuma.** Na ficha de cada turma ela é a soma de
**CH executada** (seção Andamento, que já soma aula + avaliação + vista) com os cards **AEC**, **TAD** e **TR** ("N
de M máximos"); o **Apoio Individualizado** aparece na linha abaixo dos cards e **fica fora** da CHT (D-AA-12).

| Turma | CH executada | AEC | TAD | TR | **CHT** (soma) | CHT antes | Apoio Individualizado |
|---|---:|---:|---:|---:|---:|---:|---:|
| C-Ap-HN 2026 | 953 | 41 | 54 | 58 | **1106** | 1107 | 1 |
| C-Esp-ME 2026 | 586 | 17 | 0 | 0 | **603** | 617 | 14 |
| C-Espc-FR 2026 | 1075 | 108 | 15 | 1 | **1199** | 1212 | 31 |
| C-Espc-HN 2026 | 1126 | 83 | 31 | 27 | **1267** | 1277 | 12 |
| C-Exp-Ag-Mag 2026 | 131 | 1 | 0 | 0 | **132** | 133 | 1 |
| C-Exp-BATI T1 2026 | 42 | 1 | 0 | 0 | **43** | 45 | 2 |
| C-Exp-MetocOf 2026 | 153 | 5 | 0 | 0 | **158** | 160 | 2 |

Fonte: `vw_carga_horaria_turma` no remoto, 15/10/2026 (igual à de 14/10/2026 depois da rodada). A queda vem das **17**
linhas que viraram Apoio Individualizado (lista no relatório da rodada); na C-Espc-FR, mais −2 de avaliação, pela
prova agendada de 16/10 que saiu da planilha; na C-Espc-HN, +2 de vista (a 2ª sessão que era AEC).

## 6. Disciplinas — as avaliações do currículo

Menu **Disciplinas** → curso **C-Ap-HN** → disciplina **I** → painel **Avaliações do currículo**: os itens com
instrumento, número, UE e TA. **Não** clique em *Acrescentar* nem *Inativar*.

## 7. Uma disciplina sem avaliação do currículo (A4.7)

Menu **Turmas** → **C-Espc-FR 2026** → aba **Avaliações** → uma disciplina das que a A4.7 deixou fora (por exemplo,
a de TFM) → *"Nenhuma avaliação do currículo carregada para esta disciplina"* e as provas dela em *"Lançadas no DSA sem
avaliação do currículo ligada"*. É o estado esperado até a sua decisão da A4.7.

## Conferência de Bernardo

| Passo | Viu o esperado? | Observação |
|---|---|---|
| 1 | [pendente] | |
| 2 | [pendente] | |
| 3 | [pendente] | |
| 4 | [pendente] | |
| 5 | [pendente] | |
| 6 | [pendente] | |
| 7 | [pendente] | |
