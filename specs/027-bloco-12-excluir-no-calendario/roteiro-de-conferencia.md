# Roteiro de conferência — spec 027 (Bloco 12): excluir no Calendário

No preview do ramo `fix/BLOCO-12-excluir-no-calendario`. O preview fala com o **remoto** (o mesmo banco da Production):
⚠️ **os passos marcados GRAVA mudam dado real**. Use uma linha de teste criada por você no passo 1; **o 12/11 você exclui
depois do merge**, como combinado.

## 1. Preparar uma linha de teste (GRAVA)
1. Entre como **Admin** → menu **Atividades** → aba **Calendário**.
2. Ícone *Cadastrar* → data num dia útil **futuro** de uma turma ativa (ex.: uma quarta de novembro), nome *"Teste
   Bloco 12"*, tipo *FR — Feriado*, impacto *Dia inteiro*, abrangência *Turmas escolhidas* → marque **uma** turma →
   *Salvar*.
3. **Esperado:** a linha aparece, *Ativo*. Abra a ficha da turma: em *Andamento*, anote os **dias úteis**.

## 2. O alerta e a exclusão (GRAVA)
1. Volte a **Atividades → Calendário**. Na linha *"Teste Bloco 12"*, o ícone **Excluir** (lixeira) está **habilitado**.
2. Clique. **Esperado:** abre *"Excluir «Teste Bloco 12» (dd/mm/aaaa)?"*, primeiro *"Calculando o impacto…"*, depois:
   *"A data (…) ainda não passou."*, *"Turmas atingidas (1): <a turma>."* e a frase de que o dia volta a ser útil.
   Botões **Cancelar** e **Excluir mesmo assim**.
3. *Cancelar* → nada muda. Abra de novo → **Excluir mesmo assim**.
4. **Esperado:** acima da lista, *"Linha excluída do calendário. Ela fica na auditoria."*; a linha **sumiu** — também
   não está entre as *Inativo* da lista.
5. Abra a ficha da turma: **um dia útil a mais** que o anotado. Abra o DSA da semana: o dia **sem** a marca do feriado.

## 3. Qualquer linha sai — a da v2.0, a inativa, a de semana com aula (só olhar, sem gravar)
1. Em **Calendário**, todas as linhas têm o **Excluir habilitado** (nenhuma mais com *"tem registros: use
   Desativar"*), inclusive o **12/11/2026** (*Nossa Senhora Aparecida*, inativo).
2. Clique no *Excluir* do **12/11** e **só leia** o alerta. **Esperado:** *"ainda não passou"*; a linha *já está
   desativada: excluí-la não muda dias úteis, saldo nem DSA*; *Lançados neste dia:* **C-Espc-FR 2026: 1 aula** e
   **CAHO 2026: 1 aula**; nenhuma semana publicada. → **Cancelar** (você exclui depois do merge).

## 4. Semana do DSA publicada (GRAVA — só se quiser publicar uma semana de teste)
1. Num feriado de uma semana **já publicada** de alguma turma, o alerta lista em *"Semanas do DSA publicadas que contêm
   o dia"* a turma, *"Semana N de T (dd/mm/aaaa a dd/mm/aaaa), original"* (ou *ALT N*) e avisa que a versão publicada
   não muda.
2. Excluído, abra o DSA daquela semana: aparece **"alterado desde a publicação"**; o histórico mostra a mesma versão, e
   *Reimprimir* sai igual.

## 5. Só o Admin (só olhar)
1. Entre como **Encarregado** → Atividades → Calendário. **Esperado:** *Editar* e *Desativar/Reativar* em cada linha,
   **sem** a lixeira.
2. Entre como **Operador** → Atividades. **Esperado:** sem a aba *Calendário* (como antes).
