"""T022 — a reversao da carga de UE EXECUTADA, e tres defeitos deliberados.

    python -m scripts.provas.provar_carga_de_ue

O QUE  : (1) executa, na base local CARREGADA, o plano de reversao escrito no cabecalho da
         migration da carga e confere o que volta e o que **nao** volta; (2) planta tres
         defeitos, um por guarda, e ve **cada um ser pego pela guarda certa**; (3) desfaz tudo e
         confere que a base voltou.

PARA QUE: as tres guardas desta carga protegem coisas diferentes, e **cada uma tem um ponto
         cego que a outra cobre**. Sem plantar os tres defeitos, ninguem sabe qual guarda pega
         o que — e uma guarda que nao pega nada e uma guarda que ninguem vai manter.

⚠️ **NUNCA CONTRA O REMOTO.** Ela mexe no Docker desta maquina e recarrega a base no fim.

⚠️ **O QUE A REVERSAO NAO DESFAZ, e esta declarado no cabecalho da migration**: o evento em
   `migracao_log`. Corrigir ali e logar evento novo (regra 5), e a tabela recusa `UPDATE` e
   `DELETE` por gatilho — inclusive para a `service_role`. A prova **confere que ele fica**.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MIGRACAO = next((RAIZ / "supabase" / "migrations").glob("*_carga_unidades_ensino.sql"))
PAREAMENTO = RAIZ / "scripts" / "etl" / "dados" / "pareamento_ue.csv"
CONTEINER = "supabase_db_ciaara-11-v2-1"


def _rodar(comando: str, entrada: str | None = None) -> tuple[int, str]:
    r = subprocess.run(
        comando, shell=True, cwd=RAIZ, input=entrada, capture_output=True,
        text=True, encoding="utf-8", errors="replace",
    )
    return r.returncode, r.stdout + r.stderr


def sql(comandos: str) -> tuple[int, str]:
    return _rodar(
        f"docker exec -i {CONTEINER} psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f -",
        comandos,
    )


def uma(consulta: str) -> str:
    _, saida = _rodar(f'docker exec {CONTEINER} psql -U postgres -d postgres -t -A -c "{consulta}"')
    return saida.strip().splitlines()[-1].strip() if saida.strip() else ""


def retrato() -> str:
    return uma(
        "select (select count(*) from public.unidades_ensino) || '/' ||"
        " (select count(*) from public.cursos where curriculo_modelo = 'competencias') || '/' ||"
        " (select count(*) from public.disciplinas where sem_unidades_ensino) || '/' ||"
        " (select count(*) from public.migracao_log where codigo like 'MLOG-5B-UE-%')"
    )


def aplicar_a_carga() -> None:
    codigo, saida = sql(MIGRACAO.read_text(encoding="utf-8"))
    if codigo != 0:
        raise SystemExit(f"[NAO CONFERIDA] a carga nao aplicou: {saida[-600:]}")


def pgtap() -> tuple[bool, str]:
    """(passou, QUAIS arquivos reprovaram).

    ⚠️ Nomear os arquivos importa. A CH trocada reprova **duas** guardas: o `112`, que e desta
    fatia, e a assercao `FR-024` do `050`, que e do Epico 1 e passou a medir de verdade agora que
    o catalogo chegou — ela vinha passando vacuamente desde 30/08/2026. Dizer so "o pgTAP
    reprovou" esconderia que sao duas, e que a mais antiga voltou a valer.
    """
    codigo, saida = _rodar("pnpm exec supabase test db")
    arquivos = sorted(set(re.findall(r"tests/(\d{3}_[a-z_]+)\.sql\s+\(Wstat", saida)))
    return ("Result: PASS" in saida,
            ", ".join(arquivos) if arquivos else "nenhum arquivo reprovou")


def conferencia() -> tuple[bool, str]:
    codigo, saida = _rodar("python -m scripts.etl.conferir_unidades_ensino")
    linha = next(
        (l.strip() for l in saida.splitlines()
         if l.startswith("BLOQUEADA") or l.startswith("CONFERIDA")), "sem veredito"
    )
    return codigo == 0, linha


def gerador() -> tuple[bool, str]:
    codigo, saida = _rodar(f"python -m scripts.etl.gerar_carga_de_unidades_ensino {MIGRACAO.name}")
    recusa = next((l.strip() for l in saida.splitlines() if "SEM DESTINO" in l), "")
    return codigo == 0, recusa or saida.strip().splitlines()[-1][:120]


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    problemas: list[str] = []

    print(f"migration: {MIGRACAO.name}\n")
    inicial = retrato()
    print(f"retrato inicial (UEs/competencias/sem_ue/eventos): {inicial}")
    if not inicial.startswith("587/"):
        print("[NAO CONFERIDA] a base precisa estar CARREGADA — rode "
              "`pnpm db:reset:limpo && python -m scripts.etl.executar`")
        return 1

    # ================================================================ 1. a reversao
    print("\n" + "=" * 78)
    print("1 · o plano de reversao do cabecalho, EXECUTADO")
    print("=" * 78)
    codigo, saida = sql(f"""
        delete from public.unidades_ensino
         where origem_migracao_v1 = '{MIGRACAO.name}';
        update public.cursos set curriculo_modelo = 'unidades_de_ensino'
         where codigo in ('C-Espc-FR', 'C-Espc-HN');
        update public.disciplinas set sem_unidades_ensino = false
         where sem_unidades_ensino;
    """)
    if codigo != 0:
        print(f"X a reversao falhou: {saida[-400:]}")
        return 1
    revertido = retrato()
    print(f"  retrato revertido: {revertido}")
    esperado = "0/0/0/22"
    if revertido == esperado:
        print(f"  OK voltou ao estado de antes da carga — e os 22 eventos de `migracao_log` FICAM")
        print("     (regra 5: corrigir ali e logar evento novo; a tabela recusa UPDATE e DELETE)")
    else:
        problemas.append(f"reversao: retrato {revertido}, esperava {esperado}")
        print(f"X esperava {esperado}")

    # ⚠️ E a assercao do `112` tem de reprovar aqui? NAO: ela foi escrita para valer nos DOIS
    #    estados da base, e uma base revertida e indistinguivel de uma base sem carga. O que
    #    prova a reversao e o retrato acima, nao a suite.
    ok, detalhe = conferencia()
    print(f"  {'X ' if ok else 'OK'} a conferencia na base revertida: {detalhe}")
    if ok:
        problemas.append("a conferencia PASSOU com a carga revertida — ela nao mede a carga")

    print("\n  reaplicando a carga...")
    aplicar_a_carga()
    if retrato() != inicial:
        problemas.append(f"reaplicar nao devolveu o retrato inicial: {retrato()} x {inicial}")
        print(f"X o retrato nao voltou: {retrato()}")
    else:
        print(f"  OK retrato de volta em {retrato()} — a carga e idempotente")

    # ================================================================ 2. defeito 1
    print("\n" + "=" * 78)
    print("2 · defeito 1 — UE SEM DESTINO no pareamento (a guarda do gerador, D-B4)")
    print("=" * 78)
    original = PAREAMENTO.read_text(encoding="utf-8")
    linhas = original.splitlines(keepends=True)
    alvo = next(i for i, l in enumerate(linhas) if l.startswith("c-ap-hn.pdf;C-Ap-HN;"))
    partes = linhas[alvo].rstrip("\r\n").split(";")
    apagada = partes[8]
    partes[8] = ""  # destino_disciplina_codigo
    try:
        linhas[alvo] = ";".join(partes) + "\n"
        PAREAMENTO.write_text("".join(linhas), encoding="utf-8")
        print(f"  destino apagado da linha {alvo} (era {apagada!r})")
        ok, detalhe = gerador()
        if ok:
            problemas.append("D-1: o gerador PASSOU com uma UE sem destino")
            print("  X o gerador passou — a guarda D-B4 nao existe")
        else:
            print(f"  OK o gerador RECUSOU, como devia: {detalhe}")
    finally:
        PAREAMENTO.write_text(original, encoding="utf-8")
    ok, _ = gerador()
    print(f"  {'OK' if ok else 'X '} gerador verde de novo depois de desfeito")
    if not ok:
        problemas.append("D-1: o gerador continua recusando depois de desfeito")

    # ================================================================ 3. defeito 2
    print("\n" + "=" * 78)
    print("3 · defeito 2 — LINHA REMOVIDA do pareamento (o ponto cego do gerador)")
    print("=" * 78)
    print("  ⚠️ Este defeito existe para mostrar o que o gerador NAO pega: removida a linha, ele")
    print("     declara 586 e a assercao da migration confere 586 = 586. Quem pega e a")
    print("     CONFERENCIA, comparando declaradas com carregadas.")
    try:
        del linhas[alvo]
        linhas = original.splitlines(keepends=True)
        del linhas[alvo]
        PAREAMENTO.write_text("".join(linhas), encoding="utf-8")
        ok_ger, _ = gerador()
        print(f"  {'OK' if ok_ger else 'X '} o gerador {'passou (ponto cego, como previsto)' if ok_ger else 'recusou'}")
        if not ok_ger:
            problemas.append("D-2: o gerador recusou — o ponto cego descrito nao existe mais")
        ok_conf, detalhe = conferencia()
        if ok_conf:
            problemas.append("D-2: a conferencia PASSOU com uma UE a menos no pareamento")
            print(f"  X a conferencia passou: {detalhe}")
        else:
            print(f"  OK a conferencia BLOQUEOU, como devia: {detalhe}")
    finally:
        PAREAMENTO.write_text(original, encoding="utf-8")
        # ⚠️ O gerador rodou com o pareamento mutilado e REESCREVEU a migration. Ela volta agora.
        _rodar(f"python -m scripts.etl.gerar_carga_de_unidades_ensino {MIGRACAO.name} "
               f"> supabase/migrations/{MIGRACAO.name}")
    ok, detalhe = conferencia()
    print(f"  {'OK' if ok else 'X '} conferencia verde de novo: {detalhe}")
    if not ok:
        problemas.append(f"D-2: a conferencia continua bloqueando depois de desfeito ({detalhe})")

    # ================================================================ 4. defeito 3
    print("\n" + "=" * 78)
    print("4 · defeito 3 — CH TROCADA numa UE carregada (a guarda do `112` e da conferencia)")
    print("=" * 78)
    antes_ch = uma(
        "select ch_prevista_tempos::text from public.unidades_ensino u"
        " join public.disciplinas d on d.id = u.disciplina_id"
        " where d.codigo = '3 - CAHO - I' and u.numero_ue = 1"
    )
    print(f"  CH da UE 1 de `3 - CAHO - I`: {antes_ch}")
    try:
        sql(f"""
            update public.unidades_ensino u set ch_prevista_tempos = {int(antes_ch) + 3}
              from public.disciplinas d
             where d.id = u.disciplina_id and d.codigo = '3 - CAHO - I' and u.numero_ue = 1;
        """)
        print(f"  trocada para {int(antes_ch) + 3}")
        passou, detalhe = pgtap()
        if passou:
            problemas.append("D-3: o pgTAP PASSOU com a CH de uma UE trocada")
            print(f"  X pgTAP passou: {detalhe}")
        else:
            print(f"  OK pgTAP REPROVOU, como devia: {detalhe}")
        ok_conf, detalhe = conferencia()
        if ok_conf:
            problemas.append("D-3: a conferencia PASSOU com a CH de uma UE trocada")
            print(f"  X a conferencia passou: {detalhe}")
        else:
            print(f"  OK a conferencia BLOQUEOU, como devia: {detalhe}")
    finally:
        sql(f"""
            update public.unidades_ensino u set ch_prevista_tempos = {antes_ch}
              from public.disciplinas d
             where d.id = u.disciplina_id and d.codigo = '3 - CAHO - I' and u.numero_ue = 1;
        """)
    passou, _ = pgtap()
    ok_conf, detalhe = conferencia()
    print(f"  {'OK' if passou else 'X '} pgTAP verde de novo")
    print(f"  {'OK' if ok_conf else 'X '} conferencia verde de novo: {detalhe}")
    if not passou:
        problemas.append("D-3: o pgTAP continua reprovando depois de desfeito")
    if not ok_conf:
        problemas.append("D-3: a conferencia continua bloqueando depois de desfeito")

    # ================================================================ o fecho
    final = retrato()
    print(f"\nretrato final: {final}")
    if final != inicial:
        problemas.append(f"o retrato final {final} difere do inicial {inicial}")
    # ⚠️ `--quiet` e o CODIGO DE SAIDA, nao a saida de texto: a primeira versao lia qualquer
    #    coisa em stderr como modificacao, e o aviso de CRLF que o git da no Windows ("CRLF will
    #    be replaced by LF") reprovava a prova inteira com os dois arquivos intactos. Alarme
    #    falso sobre arquivo certo — a mesma classe do filtro `d.status` na conferencia.
    codigo_git, _ = _rodar(f"git diff --quiet -- scripts/etl/dados/pareamento_ue.csv "
                           f"supabase/migrations/{MIGRACAO.name}")
    if codigo_git != 0:
        _, detalhe = _rodar(f"git diff --stat -- scripts/etl/dados/pareamento_ue.csv "
                            f"supabase/migrations/{MIGRACAO.name}")
        problemas.append(f"arquivo do repositorio ficou modificado: {detalhe.strip()[-300:]}")
    else:
        print("OK nem o pareamento nem a migration ficaram modificados — `git diff` limpo")

    print(f"\n{'=' * 78}")
    if problemas:
        for x in problemas:
            print(f"X {x}")
        print("\nNAO PROVADA.")
        return 1
    print("PROVADA: a reversao executa e o retrato volta; os eventos de `migracao_log` ficam;")
    print("         e os tres defeitos foram pegos, cada um pela guarda certa —")
    print("         destino vazio pelo GERADOR, linha removida pela CONFERENCIA,")
    print("         CH trocada pelo `112` E pela conferencia.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
