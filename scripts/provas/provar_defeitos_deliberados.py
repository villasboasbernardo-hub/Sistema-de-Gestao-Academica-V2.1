"""Os quatro defeitos deliberados da Fase 12 do PR 1 (T100 a T103), cada um PROVADO e DESFEITO.

    python -m scripts.provas.provar_defeitos_deliberados

O QUÊ  : para cada defeito, planta a falha, roda as suítes que deveriam pegá-la e exige que
         REPROVEM; desfaz explicitamente; confere que a estrutura voltou ao que era; e roda as
         mesmas suítes de novo, exigindo que PASSEM.

PARA QUÊ: teste que nunca foi visto reprovando não é teste. E defeito plantado que não se
         prova desfeito é o pior resultado possível de uma prova: a suíte seguinte roda sobre
         uma base adulterada e ninguém sabe.

⚠️ **A RESTAURAÇÃO É EXPLÍCITA, NUNCA `ROLLBACK`.** As suítes rodam em outras conexões — a
   de RLS entra pelo PostgREST com sessão de verdade —, então o defeito tem de estar
   **commitado** para que elas o vejam. E a lição do `setval` (gotcha 6 do `CLAUDE.md`) vale
   inteira: o que não obedece a `ROLLBACK` só volta se alguém o puser de volta.

⚠️ **COMO SE CONFERE QUE VOLTOU: `pg_dump` DA ESTRUTURA, ANTES E DEPOIS, BYTE A BYTE.** Os
   esquemas `public` e `app` inteiros — tabelas, policies, funções, gatilhos, comentários e
   permissões. Conferir só o objeto mexido provaria que ele voltou, não que nada mais mudou; e o
   dump pega o que a restauração esquecer — uma função recriada sem o `REVOKE` volta a ser
   executável por `PUBLIC`, e só a comparação inteira mostra isso.

⚠️ **E O T102 SE RESTAURA A PARTIR DO PRÓPRIO DUMP DE ANTES**, seção por seção — função,
   comentário, os dois gatilhos adiados e as permissões —, em vez de reescrever o SQL de memória.
   O que é restaurado é exatamente o que estava lá.

⚠️ **O QUE O DUMP NÃO COBRE, DITO EM VOZ ALTA:** dado. As suítes gravam amostras persistentes e
   consomem sequências a cada execução, com ou sem defeito — isso é o comportamento delas. E um
   defeito que abre uma escrita que devia ser recusada **deixa passar uma linha**: é o ponto dele.
   Essas linhas são procuradas e contadas por nome ao fim de cada defeito.
"""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CONTEINER = "supabase_db_ciaara-11-v2-1"


# =================================================================================
# Utilidades
# =================================================================================
def _rodar(comando: str, *, entrada: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        comando,
        shell=True,
        cwd=RAIZ,
        input=entrada,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def estrutura() -> str:
    """O `pg_dump` da estrutura de `public` e `app` — o retrato que tem de voltar idêntico.

    ⚠️ **AS LINHAS `\\restrict` E `\\unrestrict` SAEM DA COMPARAÇÃO, e só elas.** A partir do
    PostgreSQL 17.6 o `pg_dump` escreve, no começo e no fim de todo dump, um código ALEATÓRIO
    novo a cada execução — proteção contra dump adulterado ser executado no `psql`. Não é
    estrutura. **Medido em 22/09/2026**: a primeira execução desta prova acusou "estrutura
    diferente" nos quatro defeitos, e as 6 linhas diferentes eram exatamente essas duas, com o
    código trocado — nenhuma outra. Tirar SÓ as linhas que começam com esse comando mantém a
    comparação byte a byte em todo o resto.
    """
    r = _rodar(f"docker exec {CONTEINER} pg_dump -U postgres -d postgres --schema-only -n public -n app")
    if r.returncode != 0 or not r.stdout.strip():
        raise SystemExit(f"[NAO CONFERIDA] o pg_dump falhou: {r.stderr[:300]}")
    return "\n".join(
        linha
        for linha in r.stdout.splitlines()
        if not linha.startswith(("\\restrict ", "\\unrestrict "))
    )


def sql(comandos: str) -> None:
    r = _rodar(
        f"docker exec -i {CONTEINER} psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f -",
        entrada=comandos,
    )
    if r.returncode != 0:
        raise RuntimeError(f"SQL recusado:\n{r.stderr[:600]}")


def uma(consulta: str) -> str:
    r = _rodar(f'docker exec {CONTEINER} psql -U postgres -d postgres -t -A -c "{consulta}"')
    return r.stdout.strip()


def secoes_do_dump(dump: str, nomes: tuple[str, ...]) -> str:
    """As seções do dump cujo cabeçalho `-- Name:` cita algum dos nomes, na ordem do dump.

    ⚠️ A ORDEM DO DUMP É A ORDEM CERTA: função antes do comentário, gatilhos depois da função,
    permissões no fim. Executar na ordem em que o `pg_dump` escreveu é executar na ordem em que
    ele sabe que funciona.
    """
    partes = re.split(r"(?m)^--\n(?=-- Name: )", dump)
    escolhidas = [p for p in partes if p.startswith("-- Name: ") and any(n in p.split("\n", 1)[0] for n in nomes)]
    return "\n".join(escolhidas)


def diferenca(antes: str, depois: str) -> list[str]:
    import difflib

    return [
        linha
        for linha in difflib.unified_diff(antes.splitlines(), depois.splitlines(), lineterm="", n=0)
        if linha[:1] in "+-" and not linha.startswith(("+++", "---"))
    ]


# =================================================================================
# As suítes, e o veredito de cada uma
# =================================================================================
@dataclass
class Veredito:
    passou: bool
    resumo: str
    reprovados: list[str] = field(default_factory=list)


def pgtap() -> Veredito:
    r = _rodar("supabase test db")
    saida = r.stdout + r.stderr
    arquivos = sorted(set(re.findall(r"supabase/tests/(\d{3}_[a-z_]+)\.sql\s+\(Wstat", saida)))
    resultado = re.search(r"Files=(\d+), Tests=(\d+)", saida)
    resumo = f"{resultado.group(2)} assercoes em {resultado.group(1)} arquivos" if resultado else "sem resumo"
    return Veredito("Result: PASS" in saida, resumo, arquivos)


def vitest(arquivo: str, filtro: str) -> Veredito:
    r = _rodar(f"pnpm exec vitest run {arquivo}" + (f' -t "{filtro}"' if filtro else ""))
    saida = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout + r.stderr)
    # ⚠️ SÓ A LINHA `Tests`. A primeira versão pegava o primeiro "N passed" da saída — que é a
    #    linha `Test Files  1 passed`, a contagem de ARQUIVOS — e o relatório dizia "1 passados"
    #    onde tinham passado 8 testes. O veredito saía certo (vem do código de saída), mas o número
    #    era falso, e a guarda contra filtro que não casa nada ficava lendo a coisa errada.
    #    Medido em 22/09/2026.
    linha_tests = re.search(r"(?m)^\s*Tests\s+(.+)$", saida)
    texto_tests = linha_tests.group(1) if linha_tests else ""
    falhos = int((re.search(r"(\d+) failed", texto_tests) or [0, 0])[1])
    passados = int((re.search(r"(\d+) passed", texto_tests) or [0, 0])[1])
    nomes = re.findall(r"(?m)^\s*(?:×|FAIL)\s+.*?›?\s*(.+?)\s*(?:\d+ms)?$", saida)
    # ⚠️ UM FILTRO QUE NÃO CASA NADA DÁ ZERO TESTES E SAI VERDE. Exigir ao menos um executado
    #    é o que impede o "depois" de passar por não ter rodado coisa alguma.
    executou = falhos + passados > 0
    return Veredito(
        r.returncode == 0 and executou and falhos == 0,
        f"{passados} passados, {falhos} reprovados" + ("" if executou else " — NENHUM TESTE CASOU COM O FILTRO"),
        [n for n in nomes if n][:6],
    )


# =================================================================================
# Os defeitos
# =================================================================================
@dataclass
class Defeito:
    tarefa: str
    descricao: str
    plantar: callable  # type: ignore[valid-type]
    desfazer: callable  # type: ignore[valid-type]
    provas: tuple  # ((rótulo, função que devolve Veredito), ...)
    rastro: str | None = None  # consulta que conta as linhas que o defeito deixou passar


def _policy(tabela: str, nome: str) -> str:
    return uma(f"select with_check from pg_policies where tablename='{tabela}' and policyname='{nome}'")


def montar_defeitos(dump_inicial: str) -> list[Defeito]:
    # --- T100 · a condição de oferta sai de UMA das 30 policies
    check_disciplinas = _policy("disciplinas", "disciplinas_criar")
    assert "curso_em_oferta" in check_disciplinas, check_disciplinas

    # --- T101 · N-7: `cursos_criar` passa a aceitar tudo
    check_cursos = _policy("cursos", "cursos_criar")
    assert check_cursos, "cursos_criar sem WITH CHECK?"

    # --- T102 · as cinco seções que o `DROP ... CASCADE` leva junto
    restauro_t102 = secoes_do_dump(
        dump_inicial,
        ("conferir_curso_com_regime()", "trg_cursos_com_regime", "trg_regime_curso_continua_com_regime"),
    )
    cabecalhos = re.findall(r"(?m)^-- Name: (.+)$", restauro_t102)
    assert len(cabecalhos) == 5, f"esperadas 5 secoes para restaurar o T102, vieram {len(cabecalhos)}: {cabecalhos}"

    return [
        Defeito(
            "T100",
            "`disciplinas_criar` sem `app.curso_em_oferta(curso_id)` — 1 das 30 policies de oferta",
            lambda: sql(
                "alter policy disciplinas_criar on public.disciplinas with check "
                "(app.pode('disciplinas','criar') and app.alcanca_curso(curso_id));"
            ),
            lambda: sql(f"alter policy disciplinas_criar on public.disciplinas with check ({check_disciplinas});"),
            (
                ("pgTAP (o 105 tem de reprovar)", pgtap),
                ("RLS · bloco FR-017.5", lambda: vitest("tests/invariantes/rls/cursos-e-turmas.test.ts", "FR-017.5")),
            ),
            # ⚠️ `LIKE 'DEPOIS-%'`, e não igualdade: o teste acrescenta um carimbo de tempo ao nome
            #    (código único por execução, regra 9.1 do CLAUDE.md). A primeira versão desta prova
            #    procurava `= 'DEPOIS'` e contou ZERO com a disciplina lá — medido em 22/09/2026.
            "select count(*) from public.disciplinas d join public.cursos c on c.id=d.curso_id "
            "where c.codigo='5A-INATIVAVEL' and d.cod_disciplina like 'DEPOIS-%'",
        ),
        Defeito(
            "T101",
            "N-7 · `cursos_criar` com `with check (true)`",
            lambda: sql("alter policy cursos_criar on public.cursos with check (true);"),
            lambda: sql(f"alter policy cursos_criar on public.cursos with check ({check_cursos});"),
            (("RLS · `visualizacao` nao cria curso (N-7)", lambda: vitest("tests/invariantes/rls/rls.test.ts", "cria curso")),),
            # Genérico, e não por código: curso gravado por quem NÃO tem `cursos.criar` na matriz —
            # o que quer que o defeito tenha deixado passar, venha de qual caso vier.
            "select count(*) from public.cursos c join public.usuarios u on u.auth_user_id = c.criado_por "
            "join public.perfil_permissao pp on pp.perfil = u.perfil and pp.recurso = 'cursos' "
            "and pp.acao = 'criar' where not pp.permitido",
        ),
        Defeito(
            "T102",
            "`app.conferir_curso_com_regime()` removida — e com ela os dois gatilhos adiados",
            lambda: sql("drop function app.conferir_curso_com_regime() cascade;"),
            lambda: sql(restauro_t102),
            (
                ("pgTAP (o 104 tem de reprovar)", pgtap),
                ("RLS · N-8", lambda: vitest("tests/invariantes/rls/cursos-e-turmas.test.ts", "N-8")),
            ),
            "select count(*) from public.cursos c where not exists "
            "(select 1 from public.curso_regime_historico r where r.curso_id=c.id "
            "and r.tipo_regime='padrao' and r.status='ativo')",
        ),
    ]


def provar_defeito_de_banco(d: Defeito) -> list[str]:
    problemas: list[str] = []
    print(f"\n{'=' * 78}\n{d.tarefa} · {d.descricao}\n{'=' * 78}")

    antes = estrutura()
    rastro_antes = uma(d.rastro) if d.rastro else None

    d.plantar()
    print("  defeito PLANTADO e commitado")
    try:
        for rotulo, prova in d.provas:
            v = prova()
            if v.passou:
                problemas.append(f"{d.tarefa}: '{rotulo}' PASSOU com o defeito no lugar — ela nao prova nada ({v.resumo})")
                print(f"  ✗ {rotulo}: PASSOU com o defeito — {v.resumo}")
            else:
                extra = f" · {', '.join(v.reprovados)}" if v.reprovados else ""
                print(f"  ✓ {rotulo}: REPROVOU, como devia — {v.resumo}{extra}")
    finally:
        # ⚠️ NO `finally`: se uma prova estourar, o defeito NÃO pode ficar no banco.
        d.desfazer()
        print("  defeito DESFEITO, explicitamente")

    depois = estrutura()
    fora = diferenca(antes, depois)
    if fora:
        problemas.append(f"{d.tarefa}: a estrutura NAO voltou identica — {len(fora)} linha(s) diferentes:\n      " + "\n      ".join(fora[:12]))
        print(f"  ✗ estrutura DIFERENTE da de antes em {len(fora)} linha(s)")
    else:
        print(f"  ✓ estrutura IDENTICA a de antes — pg_dump de public e app, {len(antes.splitlines())} linhas, byte a byte")

    for rotulo, prova in d.provas:
        v = prova()
        if not v.passou:
            problemas.append(f"{d.tarefa}: '{rotulo}' continua REPROVANDO depois de desfeito ({v.resumo})")
            print(f"  ✗ {rotulo}: reprova DEPOIS de desfeito — {v.resumo}")
        else:
            print(f"  ✓ {rotulo}: verde de novo — {v.resumo}")

    if d.rastro:
        rastro_depois = uma(d.rastro)
        print(f"  (dado) linhas que o defeito deixou passar: {rastro_antes} antes → {rastro_depois} depois")
    return problemas


# =================================================================================
# T103 — o defeito de CÓDIGO
# =================================================================================
def provar_t103() -> list[str]:
    problemas: list[str] = []
    alvo = RAIZ / "app" / "(app)" / "inicio" / "page.tsx"
    certo = "href={enderecoDaTurmaNoCurso(t.cursoCodigo, t.turmaCodigo)}"
    errado = "href={`/cursos/${t.cursoCodigo}?turma=${t.turmaCodigo}`}"
    print(f"\n{'=' * 78}\nT103 · endereco de turma montado a mao em app/(app)/inicio/page.tsx\n{'=' * 78}")

    original = alvo.read_bytes()
    texto = original.decode("utf-8")
    assert texto.count(certo) == 1, "a linha-alvo do T103 mudou; a prova precisa ser revista"

    alvo.write_bytes(texto.replace(certo, errado).encode("utf-8"))
    print("  defeito PLANTADO")
    try:
        v = vitest("tests/unidade/endereco-de-turma-unico.test.ts", "")
        if v.passou:
            problemas.append("T103: a varredura PASSOU com o endereco montado a mao")
            print(f"  ✗ varredura T070: PASSOU com o defeito — {v.resumo}")
        else:
            print(f"  ✓ varredura T070: REPROVOU, como devia — {v.resumo}")
    finally:
        alvo.write_bytes(original)
        print("  defeito DESFEITO, com o conteudo original byte a byte")

    limpo = _rodar(f'git diff --quiet -- "{alvo.relative_to(RAIZ).as_posix()}"').returncode == 0
    if not limpo:
        problemas.append("T103: o arquivo NAO voltou ao que esta no git")
    print(f"  {'✓' if limpo else '✗'} `git diff` do arquivo: {'vazio — identico ao commitado' if limpo else 'HA DIFERENCA'}")

    v = vitest("tests/unidade/endereco-de-turma-unico.test.ts", "")
    print(f"  {'✓' if v.passou else '✗'} varredura T070 depois de desfeito: {v.resumo}")
    if not v.passou:
        problemas.append(f"T103: a varredura continua reprovando depois de desfeito ({v.resumo})")
    return problemas


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    inicial = estrutura()
    print(f"estrutura inicial: pg_dump de public e app, {len(inicial.splitlines())} linhas")

    problemas: list[str] = []
    for d in montar_defeitos(inicial):
        problemas.extend(provar_defeito_de_banco(d))
    problemas.extend(provar_t103())

    final = estrutura()
    fora = diferenca(inicial, final)
    print(f"\n{'=' * 78}")
    if fora:
        problemas.append(f"a estrutura FINAL difere da INICIAL em {len(fora)} linha(s)")
        print(f"✗ estrutura final DIFERENTE da inicial em {len(fora)} linha(s)")
    else:
        print("✓ estrutura final IDENTICA a inicial, byte a byte, depois dos quatro defeitos")

    if problemas:
        print(f"\n[REPROVADO] {len(problemas)} problema(s):")
        for p in problemas:
            print(f"  - {p}")
        return 1
    print("\n[APROVADO] os quatro defeitos foram pegos, desfeitos, e a base voltou ao que era.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
