"""Prova da segunda isenção da R-05 — procedência dispensada para quem NASCEU NA TELA.

O QUÊ  : mede os quatro casos que delimitam a isenção decidida por Bernardo Villas Boas em
         24/09/2026 — *"linhas sem procedência criadas pelo aplicativo depois da carga, com
         auditoria preenchida, são legítimas; continua bloqueando linha sem procedência e
         sem auditoria"*.

PARA QUÊ: **o caso que discrimina.** Um negativo (linha sem procedência e sem auditoria
         acusa) e um controle positivo (linha com procedência aprova) dariam o MESMO
         veredito antes e depois desta mudança — logo não provariam nada sobre ela. O que a
         observa é o **P1**: a mesma linha, com a mesma procedência nula, **acusada** pela
         regra velha e **dispensada** pela nova, porque tem `criado_por`.

⚠️ **A AUDITORIA É SIMULADA PELO CAMINHO AUTORIZADO, e isso importa.** `criado_por` vem do
   gatilho `app.set_auditoria()`, que lê `auth.uid()`; num script de manutenção não há
   sessão, e todo `INSERT` sairia com `criado_por` nulo — que é exatamente o que o ETL
   produz. A prova usa `set local request.jwt.claim.sub`, o mesmo recurso que o `CLAUDE.md`
   autoriza *"para auditoria e gatilho (quem carimbou a linha), NUNCA para autorização"*.
   Sem isso, o P1 não teria como existir.

⚠️ **ELA MEDE DELTA, NÃO LISTA ABSOLUTA** — mesma razão de `provar_r05_credencial.py`: curso
   não é apagável (regra 9.1), e toda execução de ponta a ponta deixa cursos sem procedência
   na base local. Comparar a lista inteira faria a prova reprovar pelo **estado da base**, e
   não pela regra que ela mede.

COMO   : `python -m scripts.etl.provar_r05_auditoria`, contra o banco LOCAL, com a base já
         carregada. Escreve e desfaz: ao fim, o P4 confere que as contagens voltaram
         exatamente ao que eram — se não voltarem, a prova sujou a base e diz isso.

⚠️ NUNCA CONTRA O REMOTO. A prova insere linha de mentira de propósito; fazê-lo no remoto é
   sujar a base que a verificação existe para proteger — e o remoto passou a ser a fonte da
   verdade dos cadastros em 24/09/2026, o que torna o estrago pior, não menor.
"""

from __future__ import annotations

import sys

import psycopg

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from scripts.etl import reconciliar  # noqa: E402

C = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# A consulta da R-05 **sem** a isenção da auditoria: é a regra como era antes de 24/09/2026.
# Existe só para o P1 conseguir mostrar os dois vereditos sobre a mesma linha.
SEM_A_ISENCAO_NOVA = (
    "select count(*) from public.instrutores "
    "where (origem_migracao_v1 is null or btrim(origem_migracao_v1) = '')"
)

# A tabela da prova é `instrutores`, e a escolha é deliberada: ela tem `criado_por`, **não**
# tem isenção nominal em `NASCEM_DA_PLATAFORMA`, e é um dos cadastros que a decisão de
# 24/09/2026 move para o remoto. Usar `usuarios` confundiria as duas isenções.
CODIGO_COM_AUDITORIA = "PROVA-R05-COM-AUDITORIA"
CODIGO_SEM_AUDITORIA = "PROVA-R05-SEM-AUDITORIA"


def procedencia(con: psycopg.Connection) -> dict[str, int]:
    """As divergências de procedência da R-05, por tabela — o retrato contra o qual se compara."""
    return {
        d.tabela: int(d.obtido)
        for d in reconciliar.r05_identidade_e_procedencia(con)
        if d.linha == "sem procedência"
    }


def delta(antes: dict[str, int], depois: dict[str, int]) -> dict[str, int]:
    """O que a alteração acrescentou — só o que mudou, e só para mais."""
    return {
        t: depois.get(t, 0) - antes.get(t, 0)
        for t in set(antes) | set(depois)
        if depois.get(t, 0) != antes.get(t, 0)
    }


def _inserir(k, codigo: str, com_sessao: str | None) -> None:
    """Insere um instrutor de prova, com ou sem sessão simulada.

    ⚠️ O `set local` vale até o fim da transação, e por isso o `commit` vem **depois** do
       `INSERT`: o gatilho precisa enxergar o `sub` no mesmo comando.
    """
    if com_sessao:
        k.execute("begin")
        k.execute("select set_config('request.jwt.claim.sub', %s, true)", (com_sessao,))
    k.execute(
        "insert into public.instrutores "
        "(codigo, posto_graduacao, esp_hab_obs, nome_completo, categoria, om) "
        "values (%s, 'CT', '-EF', 'Instrutor Da Prova Da R05', 'organica', 'CIAARA')",
        (codigo,),
    )
    if com_sessao:
        k.execute("commit")


def main() -> int:
    con = psycopg.connect(C)
    con.autocommit = True
    k = con.cursor()

    k.execute(
        "select count(*) from public.instrutores where codigo = any(%s)",
        ([CODIGO_COM_AUDITORIA, CODIGO_SEM_AUDITORIA],),
    )
    if k.fetchone()[0]:
        print("[NAO CONFERIDA] sobrou linha de uma execucao anterior desta prova.")
        print("                Apague-a e rode de novo — a prova nao apaga o que nao criou.")
        return 2

    # Um `auth.uid()` de verdade: o gatilho grava o que lhe derem, mas usar um id que existe
    # mantém a linha coerente com o resto da base.
    k.execute("select auth_user_id from public.usuarios where auth_user_id is not null limit 1")
    achado = k.fetchone()
    if not achado:
        print("[NAO CONFERIDA] a base local nao tem nenhuma conta com credencial do Auth:")
        print("                sem `auth.uid()` de verdade, o P1 nao teria o que simular.")
        return 2
    sessao = str(achado[0])

    base = procedencia(con)
    k.execute(SEM_A_ISENCAO_NOVA)
    base_velha = k.fetchone()[0]
    print(f"linha de base (restos de amostra): {base or 'nenhuma'}\n")

    veredito = []

    # -- P1 — O CASO QUE DISCRIMINA ----------------------------------------------------
    _inserir(k, CODIGO_COM_AUDITORIA, com_sessao=sessao)
    k.execute(
        "select criado_por is not null from public.instrutores where codigo = %s",
        (CODIGO_COM_AUDITORIA,),
    )
    carimbou = k.fetchone()[0]
    k.execute(SEM_A_ISENCAO_NOVA)
    pela_regra_velha = k.fetchone()[0] - base_velha
    pela_regra_nova = delta(base, procedencia(con))
    ok1 = carimbou and pela_regra_velha == 1 and not pela_regra_nova
    veredito.append(ok1)
    print(
        f"P1  sem procedencia, COM auditoria (`criado_por` carimbado={carimbou}): "
        f"regra velha acusa +{pela_regra_velha} · regra nova acusa {pela_regra_nova or '+0'}  "
        f"{'-> o veredito VIRA' if ok1 else '-> NAO VIROU'}"
    )

    # -- P2 — a mesma ausência, SEM auditoria, continua bloqueando ---------------------
    _inserir(k, CODIGO_SEM_AUDITORIA, com_sessao=None)
    k.execute(
        "select criado_por is null from public.instrutores where codigo = %s",
        (CODIGO_SEM_AUDITORIA,),
    )
    sem_carimbo = k.fetchone()[0]
    depois_p2 = delta(base, procedencia(con))
    ok2 = sem_carimbo and depois_p2.get("instrutores") == 1
    veredito.append(ok2)
    print(
        f"P2  sem procedencia, SEM auditoria (`criado_por` nulo={sem_carimbo}): "
        f"regra nova acusa {depois_p2 or '+0'}  "
        f"{'-> continua BLOQUEANDO' if ok2 else '-> DEIXOU DE BLOQUEAR'}"
    )

    # -- P3 — controle positivo: com procedência, ninguém acusa ------------------------
    k.execute(
        "update public.instrutores set origem_migracao_v1 = 'Prova:R05' where codigo = any(%s)",
        ([CODIGO_COM_AUDITORIA, CODIGO_SEM_AUDITORIA],),
    )
    depois_p3 = delta(base, procedencia(con))
    ok3 = not depois_p3
    veredito.append(ok3)
    print(
        f"P3  controle positivo, com procedencia: regra nova acusa {depois_p3 or '+0'}  "
        f"{'-> aprova' if ok3 else '-> ACUSOU SEM MOTIVO'}"
    )

    # -- P4 — a prova desfaz o que fez --------------------------------------------------
    k.execute(
        "delete from public.instrutores where codigo = any(%s)",
        ([CODIGO_COM_AUDITORIA, CODIGO_SEM_AUDITORIA],),
    )
    k.execute(SEM_A_ISENCAO_NOVA)
    voltou_velha = k.fetchone()[0] == base_velha
    voltou_nova = procedencia(con) == base
    ok4 = voltou_velha and voltou_nova
    veredito.append(ok4)
    print(
        f"P4  a base voltou ao que era: regra velha={voltou_velha} · regra nova={voltou_nova}  "
        f"{'-> limpa' if ok4 else '-> A PROVA SUJOU A BASE'}"
    )

    con.close()
    print()
    if all(veredito):
        print("PROVADA: a auditoria isenta quem nasceu na tela, e so ela.")
        return 0
    print("NAO PROVADA: ver os casos acima.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
