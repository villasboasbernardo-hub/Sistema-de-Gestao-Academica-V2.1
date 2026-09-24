"""Prova do passo 6 de `dado_do_remoto.py` — sem avançar as sequências, a tela QUEBRA.

    python -m scripts.manutencao.provar_sequencias_apos_copia

PARA QUÊ: o defeito que Bernardo achou na conferência de 24/09/2026 — criar curso no local falhava
         com *"Já existe um registro com este valor"* **com dados inéditos**. A cópia do remoto traz
         só o schema `public`; as sequências de código vivem em **`app`**, voltam ao início, e o
         próximo código gerado colide com um que o retrato já trouxe.

⚠️ **O CASO QUE DISCRIMINA É O P1 CONTRA O P2.** Um teste que só criasse os registros depois da
   cópia **corrigida** passaria igualmente numa versão sem o passo 6, se a base estivesse vazia. O
   que observa a correção é o par: com as sequências **no início** (como a restauração as deixa), as
   cinco criações falham com **`23505`**; depois de `avancar_sequencias`, as mesmas cinco passam.

⚠️ **ELA ESCREVE E DESFAZ — MENOS O CURSO.** `curso_regime_historico` é append-only e a FK de
   `cursos` é `restrict` (regra 9.1): o curso da prova **fica**, como fica o de toda suíte. Por isso
   a sigla carrega um carimbo de tempo — duas execuções não podem colidir na `UNIQUE`, e a segunda
   falharia por `23505` **pelo motivo errado**, que é justamente o que esta prova mede.

⚠️ **NUNCA CONTRA O REMOTO.** Ela põe as sequências no início de propósito.
"""

from __future__ import annotations

import sys
from datetime import datetime

import psycopg

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from scripts.etl import carregar  # noqa: E402

C = carregar.CONEXAO_LOCAL
SELO = datetime.now().strftime("%H%M%S")


def _voltar_sequencias_ao_inicio(k) -> None:
    """O estado em que a restauração as deixa — e é o defeito que se quer reproduzir.

    ⚠️ `setval(seq, 1, false)` diz *"o próximo valor é 1"*, sem marcar o 1 como usado. É onde uma
       sequência recém-criada está, e é onde ela fica quando o dump não a traz.
    """
    for sequencia, _, _ in carregar.SEQUENCIAS_DE_CODIGO:
        k.execute("select setval(%s, 1, false)", (sequencia,))


def _tentar_as_cinco(k) -> tuple[bool, str]:
    """Cria curso, vigência, turma, instrutor e habilitação. Devolve (deu certo, o que falhou)."""
    sigla = f"C-Exp-SEQ{SELO}"
    try:
        k.execute(
            "select id from public.criar_curso_com_regime(%s::jsonb, %s::jsonb)",
            (
                f'{{"codigo":"{sigla}","nome_curso":"Curso da prova de sequencia",'
                f'"classificacao":"expedito","modalidade":"ead","duracao_dias":10}}',
                '{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,'
                '"intervalo_tarde_min":10,"hora_inicio_manha":"07:30",'
                '"hora_inicio_tarde":"13:30","vigente_de":"2020-01-01"}',
            ),
        )
        curso = k.fetchone()[0]

        k.execute(
            "insert into public.turmas (curso_id, turma, ano_letivo, status, modalidade) "
            "values (%s, 'T1', 2033, 'planejada', 'ead')",
            (curso,),
        )
        k.execute(
            "insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo, "
            "categoria, om) values (default, 'CT', '-EF', %s, 'organica', 'CIAARA') returning id",
            (f"Instrutor Da Prova De Sequencia {SELO}",),
        )
        instrutor = k.fetchone()[0]
        k.execute(
            "insert into public.disciplinas (codigo, curso_id, cod_disciplina, nome_disciplina, "
            "carga_horaria_tempos) values (%s, %s, %s, 'Disciplina da prova', 20) returning id",
            (f"DIS-SEQ{SELO}", curso, f"SEQ{SELO}"),
        )
        disciplina = k.fetchone()[0]
        k.execute(
            "insert into public.instrutor_disciplina (instrutor_id, disciplina_id) values (%s, %s)",
            (instrutor, disciplina),
        )
        return True, ""
    except psycopg.Error as erro:
        return False, f"{erro.sqlstate}: {str(erro).splitlines()[0][:110]}"


def main() -> int:
    veredito: list[bool] = []

    # -- P1 — SEM o passo 6: as sequências no início, e a criação falha --------------------
    con = psycopg.connect(C)
    con.autocommit = False
    with con.cursor() as k:
        _voltar_sequencias_ao_inicio(k)
        passou, erro = _tentar_as_cinco(k)
    con.rollback()
    ok1 = not passou and erro.startswith("23505")
    veredito.append(ok1)
    print(
        f"P1  sequencias NO INICIO (como a restauracao as deixa): "
        f"{'falhou com ' + erro if not passou else 'PASSOU'}  "
        f"{'-> reproduz o defeito' if ok1 else '-> NAO reproduziu'}"
    )

    # ⚠️ As sequências voltam ao início pelo `setval`, que **não obedece a ROLLBACK** (gotcha 6 do
    #    `CLAUDE.md`). Por isso o P2 as avança de novo em vez de supor que o desfazer bastou.

    # -- P2 — COM o passo 6: as mesmas cinco criações passam -------------------------------
    con = psycopg.connect(C)
    con.autocommit = False
    with con.cursor() as k:
        carregar.avancar_sequencias(con)
        passou, erro = _tentar_as_cinco(k)
    if passou:
        con.commit()
    else:
        con.rollback()
    ok2 = passou
    veredito.append(ok2)
    print(
        f"P2  sequencias AVANCADAS pela funcao do ETL: "
        f"{'as cinco criacoes passaram' if passou else 'falhou com ' + erro}  "
        f"{'-> o veredito VIRA' if ok2 else '-> NAO VIROU'}"
    )

    # -- P3 — a lista de sequências está COMPLETA ------------------------------------------
    with psycopg.connect(C) as con3, con3.cursor() as k:
        k.execute(
            "select n.nspname||'.'||c.relname from pg_class c "
            "join pg_namespace n on n.oid = c.relnamespace "
            "where c.relkind = 'S' and n.nspname = 'app' order by 1"
        )
        no_banco = {r[0] for r in k.fetchall()}
    declaradas = {s for s, _, _ in carregar.SEQUENCIAS_DE_CODIGO}
    faltando = no_banco - declaradas
    ok3 = not faltando
    veredito.append(ok3)
    print(
        f"P3  sequencias em `app`: {len(no_banco)} no banco, {len(declaradas)} declaradas  "
        f"{'-> completa' if ok3 else '-> FALTAM: ' + ', '.join(sorted(faltando))}"
    )

    print()
    if all(veredito):
        print("PROVADO: sem avancar as sequencias a criacao quebra com 23505; com elas, passa.")
        return 0
    print("NAO PROVADO: ver os casos acima.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
