# Roteiro de conferência — PR 2.1 (parcial: parar dia, desfazer e avaliação viva)

> Depende das migrations do PR 1 **no remoto**. Capturas no banco local: `C:/Users/VILLAS BOAS/AppData/Local/ciaara-11/capturas-014/pr2.1-*.png`.

1. Menu **Turmas** → uma turma fora de `scripts/carga_dsa/fontes.json` → **DSA** → **Parar dia**.
2. Tipo **LA**, motivo, desmarcar *Dia inteiro*, do tempo 6, quantos 2 → **Registrar parada**. Se o dia
   tiver lançamento, aparece o aviso com o número; **Parar mesmo assim**.
3. A etiqueta da parada aparece acima da grade, o cabeçalho do dia diz *"Parado — LA: …"* e os tempos 6 e 7
   ficam bloqueados; os lançamentos que já estavam continuam.
4. Tentar lançar uma **aula** no tempo 6 → recusa *"Dia bloqueado: LA — <motivo>. Para lançar, desfaça a
   parada ou ajuste o calendário."*; uma **atividade** no mesmo tempo é aceita.
5. Como **Operador**: *Parar dia* aparece, sem a opção *Todas as turmas*.
6. **Desfazer** na etiqueta → a parada some e os tempos voltam.
