"""Carga do DSA a partir da PLANILHA DE CONTROLE de uma turma.

    python -m scripts.carga_dsa.executar --turma "<codigo>" --planilha <xlsx> --decisoes <json> \
        [--gabarito <csv>] --destino local|remoto --autor <codigo do usuario> [--gravar]

O QUE  : le as abas PREENCHIMENTO e BD DISCIPLINAS do modelo de planilha por turma, monta os
         BLOCOS (TA consecutivos do mesmo dia com a mesma chave COD+UE) e grava cada um como o
         lancamento manual do DSA gravaria: `registros_aula`, `avaliacoes` (com a vista na mesma
         linha) e `atividades_nao_letivas`.

⚠️ E EXCECAO A VIRADA-1, AUTORIZADA TURMA A TURMA por Bernardo Villas Boas (a primeira em
   06/10/2026, C-Exp-Obs-ME 2026). O script so toca a turma que recebe por parametro, e a carga
   final da planilha da v2.0 MUST pular toda turma registrada em
   `scripts/carga_dsa/turmas-carregadas.md`.

⚠️ NAO CARREGA O CRONOS (planejamento), NAO CRIA UNIDADE DE ENSINO e NAO CRIA INSTRUTOR. Faltou
   UE, instrutor ou vocabulario: recusa e para, antes de qualquer escrita.

⚠️ SEM ENSAIO NAO HA GRAVACAO: o padrao e o ensaio (tudo dentro de uma transacao desfeita); a
   escrita exige `--gravar`. Uma transacao so, e idempotente: o `codigo` de cada linha e derivado
   da turma e da LINHA da planilha em que o bloco comeca, e rodar de novo nao duplica nada.
"""
