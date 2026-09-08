"""As três provas que fecham o carregador — T041, T042 e T058.

Um carregador que "funcionou" não prova nada: prova que hoje deu certo. O que precisa
ser provado é o que ele faz quando dá errado, o que faz quando roda duas vezes, e o que
o banco faz quando alguém tenta mexer no log.

    python -m scripts.etl.provar_carregador

Sai 0 se as três passarem. Qualquer outra coisa é falha da prova, não do dia.
"""

from __future__ import annotations

import subprocess
import sys

import psycopg

from . import carregar, ordem, promover, reconciliar

C = carregar.CONEXAO_LOCAL


def _conta_tudo(con: psycopg.Connection) -> dict[str, int]:
    with con.cursor() as k:
        contagem = {}
        for t in ordem.ORDEM_DE_CARGA:
            k.execute(f"select count(*) from public.{t}")
            contagem[t] = k.fetchone()[0]
        return contagem


def _zerar() -> None:
    """`db:reset` recria o schema do zero — é o único jeito honesto de partir do vazio."""
    subprocess.run(
        ["pnpm", "db:reset"], check=True, capture_output=True, shell=sys.platform == "win32"
    )


# =====================================================================================
# T041 — ATOMICIDADE: defeito no meio da ordem deixa ZERO linha gravada
#
# ⚠️ O DEFEITO É INJETADO NO MEIO DE PROPÓSITO. Se fosse na primeira tabela, a prova
#    seria trivial: nada tinha sido escrito ainda. `instrutores` é a nona de 25 — na
#    hora em que ela falha, oito tabelas já foram inseridas dentro da transação. É
#    exatamente esse estado parcial que o `ROLLBACK` tem de desfazer.
# =====================================================================================
def provar_atomicidade() -> bool:
    print("\n[T041] ATOMICIDADE — defeito na 9ª tabela de 25")
    _zerar()
    carregar.carregar(C)

    original = dict(promover.ALVO_DA_FK)
    # Aponta a FK de instrutores para uma tabela que não tem `codigo` compatível:
    # o `INSERT` da nona tabela falha, com oito já inseridas na mesma transação.
    with psycopg.connect(C) as con:
        con.autocommit = True
        with con.cursor() as k:
            k.execute("create table if not exists public.__prova_vazia (id uuid, codigo text)")
    promover.ALVO_DA_FK["instrutor_id"] = "__prova_vazia"
    try:
        with psycopg.connect(C) as con:
            con.autocommit = False
            with con.cursor() as k:
                k.execute("alter table public.instrutores add constraint __prova_defeito "
                          "check (posto_graduacao <> posto_graduacao)")
            con.commit()
        promover.ALVO_DA_FK.update(original)
        try:
            promover.promover(C)
            print("   FALHOU: a promocao NAO abortou")
            return False
        except Exception as erro:
            print(f"   abortou como esperado: {str(erro).splitlines()[0][:88]}")
    finally:
        promover.ALVO_DA_FK.clear()
        promover.ALVO_DA_FK.update(original)
        with psycopg.connect(C) as con:
            con.autocommit = True
            with con.cursor() as k:
                k.execute("alter table public.instrutores drop constraint if exists __prova_defeito")
                k.execute("drop table if exists public.__prova_vazia")

    with psycopg.connect(C) as con:
        contagem = _conta_tudo(con)
    escritas = {t: n for t, n in contagem.items() if n and t not in ("perfil_permissao",)}
    # `config_listas` e `config_parametros` guardam as linhas semeadas pela migration:
    # elas nao vieram da carga e nao deviam sumir.
    semeadas = {"config_listas", "config_parametros"}
    sobrou = {t: n for t, n in escritas.items() if t not in semeadas}
    if sobrou:
        print(f"   FALHOU: sobraram linhas de {len(sobrou)} tabela(s): {sobrou}")
        return False
    print(f"   ZERO linha gravada nas 23 tabelas de carga "
          f"(as {len(semeadas)} semeadas pela migration permanecem, corretamente)")
    return True


# =====================================================================================
# T042 — IDEMPOTÊNCIA: duas cargas do zero produzem os MESMOS checksums
#
# ⚠️ O CHECKSUM EXCLUI `id` E O QUARTETO DE AUDITORIA. Sem isso a prova seria impossível
#    por construção: `id` é `gen_random_uuid()` e `criado_em` é `now()`, então dois hashes
#    nunca coincidiriam e a "verificação" sempre reprovaria — o que a levaria a ser
#    afrouxada até não verificar nada. `migracao_log` fica fora por ser append-only.
# =====================================================================================
def provar_idempotencia() -> bool:
    print("\n[T042] IDEMPOTENCIA — duas cargas do zero, mesmos checksums")
    somas = []
    contagens = []
    for volta in (1, 2):
        _zerar()
        carregar.carregar(C)
        promover.promover(C)
        with psycopg.connect(C) as con:
            somas.append(reconciliar.r08_checksums(con))
            contagens.append(_conta_tudo(con))
        print(f"   volta {volta}: {sum(contagens[-1].values())} linhas, "
              f"{len(somas[-1])} checksums")

    diferentes = [t for t in somas[0] if somas[0][t] != somas[1].get(t)]
    if diferentes:
        print(f"   FALHOU: {len(diferentes)} tabela(s) com checksum diferente: {diferentes}")
        return False
    if contagens[0] != contagens[1]:
        print("   FALHOU: contagens diferentes entre as duas voltas")
        return False
    print(f"   os {len(somas[0])} checksums coincidem, e as contagens tambem")
    return True


# =====================================================================================
# T058 — `migracao_log` recusa UPDATE e DELETE, INCLUSIVE do perfil administrativo
#
# ⚠️ TESTAR SÓ COM UM PERFIL COMUM NÃO PROVARIA NADA: a RLS já o barraria, e o gatilho
#    ficaria por testar. A prova precisa vir de quem a RLS NÃO barra. Aqui a conexão é
#    `postgres` — dono do schema, acima de `service_role`. Se o gatilho segurar este,
#    segura todos (Princípio IV).
# =====================================================================================
def provar_log_append_only() -> bool:
    print("\n[T058] APPEND-ONLY — UPDATE e DELETE em migracao_log, como `postgres`")
    with psycopg.connect(C) as con:
        con.autocommit = True
        with con.cursor() as k:
            k.execute("select count(*) from public.migracao_log")
            if not k.fetchone()[0]:
                print("   FALHOU: migracao_log vazia, nao ha o que tentar alterar")
                return False
            for verbo, sql in (
                ("UPDATE", "update public.migracao_log set acao = 'corrigido'"),
                ("DELETE", "delete from public.migracao_log"),
            ):
                try:
                    k.execute(sql)
                    print(f"   FALHOU: o {verbo} PASSOU — o log nao e append-only")
                    return False
                except psycopg.Error as erro:
                    print(f"   {verbo} recusado: {str(erro).splitlines()[0][:76]}")
                    con.rollback()
    return True


if __name__ == "__main__":
    provas = [
        provar_atomicidade(),
        provar_idempotencia(),
        provar_log_append_only(),
    ]
    print(f"\n{'=' * 74}")
    print(f"{sum(provas)} de {len(provas)} provas passaram")
    sys.exit(0 if all(provas) else 1)
