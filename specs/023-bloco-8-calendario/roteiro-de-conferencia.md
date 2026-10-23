# Roteiro de conferência — spec 023 (Bloco 8)

No preview, com uma conta **Admin** ou **Encarregado da Administração Acadêmica**, e outra **Operador** para o item 3.
⚠️ Os passos marcados **[GRAVA]** escrevem no banco remoto (é o calendário real de todas as turmas): use uma data
**passada** e sem aula (ex.: um sábado de 2026), e desfaça no fim.

## 1. Desfazer feriado pelo DSA

1. *Turmas* → uma turma ativa presencial → *Abrir DSA* → uma semana passada.
2. Ícone **Parar dia** → um dia sem aula, tipo *FR — Feriado*, motivo *"teste do Bloco 8"*, marque **Todas as turmas**,
   *Dia inteiro* → *Registrar parada*. **[GRAVA]**
   - Esperado: a faixa acima da grade mostra *"dd/mm/aaaa · FR: teste do Bloco 8 (dia inteiro) · todas as turmas"* com
     o ícone **Desfazer**; o dia fica bloqueado na grade.
3. Clique no ícone **Desfazer** do feriado.
   - Esperado: diálogo *"Desfazer o feriado de dd/mm/aaaa?"* com *"Isso libera o dia em todas as turmas…"*.
4. **Desfazer**. **[GRAVA]**
   - Esperado: *"Feriado desfeito: o dia está liberado."*, o feriado sai da faixa, o dia volta a aceitar aula.
5. *Atividades* → aba **Calendário** → o ano da data.
   - Esperado: a linha *"FR — teste do Bloco 8"* aparece **Inativo** (não foi apagada).

## 2. A aba Calendário

1. *Atividades* → aba **Calendário**. Esperado: a caixa **Ano** no canto superior direito (o de hoje); a lista do ano com
   Data · Nome · Tipo · Abrangência · Impacto · Situação. As linhas antigas mostram o tipo pela sigla do nome ou *"não
   informado"*; o 28/10/2026 (*Dia do Servidor Público*) aparece **Inativo**.
2. Ícone **Cadastrar no calendário** → data passada, nome *"licença de teste"*, tipo *LA — Licença Administrativa*,
   impacto *Dia inteiro*, **Turmas escolhidas** → marque uma turma → *Cadastrar*. **[GRAVA]**
   - Esperado: *"Linha cadastrada no calendário."* acima da lista; a linha com a turma na coluna Abrangência.
3. Abra o DSA da turma escolhida, na semana da data: o dia bloqueado, *"· turmas escolhidas"* na faixa. Abra o DSA de
   **outra** turma ativa na mesma semana: o dia **livre**.
4. Volte à aba Calendário → ícone **Inativar** na linha → confirme. **[GRAVA]** Esperado: *Inativo*, e o dia livre no DSA.
5. Ícone **Reativar** → confirme. **[GRAVA]** Esperado: *Ativo*; se já houver aula no dia, o diálogo diz quantas.
6. Ícone **Editar** → troque para *Todas as turmas* → *Gravar alterações*. **[GRAVA]** Esperado: Abrangência *Todas as
   turmas*.
7. Ícone **Parar dia (todas as turmas)** → um dia, *Dia inteiro* → *Registrar parada*. **[GRAVA]** Esperado: nova linha
   na lista; desmarcando *Dia inteiro* (tempos), a linha sai como *"Parada de parte do dia (tempos a a b)"* com
   **Desfazer**.
8. No fim, inative as linhas de teste. **[GRAVA]**

## 3. Sem permissão

1. Entre como **Operador** → *Atividades*. Esperado: a lista de sempre, **sem** as abas.
2. DSA de uma turma numa semana com feriado ativo. Esperado: o feriado na faixa, **sem** o ícone Desfazer.

## 4. O sininho e o saldo

- Uma linha de dia inteiro ativa num dia **com** aula lançada gera o aviso *"dd/mm/aaaa: dia bloqueado com N
  lançamento(s)"* no sininho, módulo **Calendário**, levando à aba do ano.
- Inativar uma linha de dia inteiro futura devolve 1 dia útil ao saldo das turmas que ela alcança (*Turmas*, coluna
  Saldo) — o efeito medido do 28/10 está em `antes-depois.md`.
- O papel do DSA (*Imprimir*) não muda de forma.
