# Roteiro de conferência — PR 2.1 (DSA: tipo, global, parar dia, desfazer e avaliação viva)

> As migrations do PR 1 e do PR 1.1 estão **no remoto** desde 14/10/2026 (`plano-de-aplicacao-no-remoto.md`).
> Capturas no banco local: `C:/Users/VILLAS BOAS/AppData/Local/ciaara-11/capturas-014/pr2.1-*.png`.
> Use uma turma **fora** de `scripts/carga_dsa/fontes.json` e, no fim, **desfaça** toda parada e **exclua**
> todo lançamento feito aqui, o global inclusive.

## Parar dia

1. Menu **Turmas** → a turma → **DSA** → **Parar dia**.
2. Tipo **LA**, motivo, desmarcar *Dia inteiro*, do tempo 6, quantos 2 → **Registrar parada**. Se o dia
   tiver lançamento, aparece o aviso com o número; **Parar mesmo assim**.
3. A etiqueta da parada aparece acima da grade, o dia avisa *"Parado — LA: … (tempos 6 a 7)"* e os tempos
   6 e 7 ficam bloqueados; os lançamentos que já estavam continuam.
4. Tentar lançar uma **aula** no tempo 6 → recusa *"Tempo bloqueado: LA — <motivo>. Para lançar, desfaça
   a parada ou ajuste o calendário."*; uma **atividade** no mesmo tempo é aceita.
5. Uma aula no tempo 4 que **cresça** até o 6 → recusa nomeando a parada (a parada é parede na cascata).
6. **Imprimir** → no papel, os tempos 6 e 7 saem com *"Parado — LA: …"*.
7. **Desfazer** na etiqueta → a parada some e os tempos voltam.
8. Parar de novo, agora **não prevista** (desmarcar *Prevista no calendário*) e **consome Tempo Reserva** →
   o TR da turma na ficha sobe pelos tempos parados, e a célula mostra *"TR — tempo bloqueado para aula"*.
   **Desfazer** → o TR volta.
9. Como **Encarregado**: *Todas as turmas* aparece; como **Operador**, não — e a parada só da turma continua.

## O tipo da atividade

10. Numa célula livre → **Apoio Individualizado** → tipo **Monitoria** (ou BDA) → aparece *"Conta como:
    Apoio Individualizado — alunos específicos (fora da CHT)"* antes de gravar; quantos alunos (opcional).
    Gravar → a grade marca *"Apoio Individualizado — alunos específicos"*, e a CHT da turma na ficha não muda.
11. **TAD** → tipo **Recepção aos alunos** → *"Conta como: TAD"*. O campo de fora se chama *"Entidade ou
    palestrante externo"*.

## A atividade de todas as turmas

12. Como **Encarregado**: **AEC** → tipo → marcar *Todas as turmas* → gravar. Ela aparece no DSA de outra
    turma com DSA na mesma data (e não numa EAD). Como **Operador**, a caixa não aparece. **Excluir** no fim.

## Conferência de Bernardo

[pendente]
