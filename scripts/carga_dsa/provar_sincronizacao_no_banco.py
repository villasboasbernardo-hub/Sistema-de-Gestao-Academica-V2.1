"""Prova, NO BANCO LOCAL, o que a sincronizacao da spec 014 promete (T106 do PR 3).

O QUE  : roda `sincronizar` DUAS vezes, gravando, sobre uma turma real do retrato do remoto
         restaurado no Docker, e confere no banco:
           1. a segunda rodada da ZERO mudanca;
           2. o catalogo (CH de disciplinas e UEs) e o mesmo antes e depois (SC-008, D-CUR-1);
           3. todo dia parado da turma tem o codigo estavel `DSAP-<turma>-L<linha>-P`, e o mesmo
              conjunto de codigos nas duas rodadas;
           4. a linha TAD da mesma linha da planilha (`…-N`) esta INATIVA, com a marca
              «[RECLASSIFICADO PELA SPEC 014]» — nada foi apagado (regra 4);
           5. todo `feriados.codigo` tem a forma `FER-NNNNNN` e nenhum script de `scripts/carga_dsa`
              monta o codigo de feriado com `'FER-' ||` (varredura SEM comentario, com controle positivo).

PARA QUE: `provar_carga_dsa.py` prova o plano em memoria; so o banco prova que o SQL gerado grava o
         que o plano diz, e que a segunda rodada nao mexe em nada.

COMO   : `python -m scripts.carga_dsa.provar_sincronizacao_no_banco --rodada <pasta> [--turma <codigo>]
          [--autor USR-DEV-LOCAL]` — saida 0 = todas passam. ⚠️ ESCREVE NO BANCO: so roda contra o Docker
         desta maquina (o mesmo porteiro de `dado_do_remoto`), com o retrato do remoto restaurado nele.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from scripts.carga_dsa import banco
from scripts.carga_dsa.banco import lit
from scripts.carga_dsa.resolver import slug
from scripts.manutencao.dado_do_remoto import _do_cli

AQUI = Path(__file__).parent
FALHAS: list[str] = []


def conferir(nome: str, condicao: bool, detalhe: object = "") -> None:
    print(f"  {'ok ' if condicao else 'FALHOU'}  {nome}" + (f" — {detalhe}" if not condicao else ""))
    if not condicao:
        FALHAS.append(nome)


def sem_comentario(texto: str) -> str:
    """Regra 9.1.1: tira o comentario de linha (`#`) e as docstrings antes de casar o padrao."""
    texto = re.sub(r'"""[\s\S]*?"""', "", texto)
    return "\n".join(re.sub(r"(^|\s)#.*$", "", linha) for linha in texto.splitlines())


def monta_fer_a_mao(texto: str) -> bool:
    return re.search(r"'FER-'\s*\|\|", sem_comentario(texto)) is not None


def rodar(rodada: Path, turma: str, autor: str) -> str:
    r = subprocess.run(
        [sys.executable, "-X", "utf8", "-m", "scripts.carga_dsa.sincronizar", "--rodada", str(rodada),
         "--destino", "local", "--autor", autor, "--turmas", turma, "--provisorio",
         "--gravar"],
        capture_output=True, text=True, encoding="utf-8", check=False,
    )
    return r.stdout + r.stderr


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    a = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    a.add_argument("--rodada", required=True, type=Path)
    a.add_argument("--turma", default="C-Exp-MetocOf 2026")
    a.add_argument("--autor", default="USR-DEV-LOCAL")
    arg = a.parse_args()

    url = _do_cli("API_URL")
    if not url.startswith(("http://127.0.0.1", "http://localhost")):
        print(f"[RECUSADO] o `supabase status` aponta para {url}: esta prova escreve no banco e so roda no Docker local.")
        return 3

    print("VARREDURA — nenhum codigo de feriado montado a mao")
    conferir("controle positivo: a varredura acha `'FER-' ||` num texto plantado",
             monta_fer_a_mao("x = \"select 'FER-' || lpad(n::text, 6, '0')\""))
    conferir("controle: o mesmo texto num COMENTARIO nao conta (regra 9.1.1)",
             not monta_fer_a_mao("# select 'FER-' || lpad(n::text, 6, '0')"))
    achados = [p.name for p in AQUI.glob("*.py") if p.name != Path(__file__).name and monta_fer_a_mao(p.read_text(encoding="utf-8"))]
    conferir("nenhum script de scripts/carga_dsa monta `'FER-' ||`", not achados, achados)

    print(f"NO BANCO LOCAL — {arg.turma}, duas rodadas gravando")
    catalogo_antes = banco.retrato_do_catalogo("local")
    prefixo = f"DSAP-{slug(arg.turma)}-L"
    consulta_p = (f"select coalesce(string_agg(codigo, ',' order by codigo), '') as c from public.dias_parados "
                  f"where codigo like {lit(prefixo + '%')} and status = 'ativo'")

    primeira = rodar(arg.rodada, arg.turma, arg.autor)
    codigos_1 = banco.consultar("local", consulta_p)[0]["c"]
    segunda = rodar(arg.rodada, arg.turma, arg.autor)
    codigos_2 = banco.consultar("local", consulta_p)[0]["c"]
    catalogo_depois = banco.retrato_do_catalogo("local")

    zero = re.search(r"→ (\d+) mudanca\(s\)", segunda)
    conferir("a primeira rodada terminou sem recusa do banco", "✗" not in primeira and "saida 0" in primeira, primeira[-600:])
    conferir("a SEGUNDA rodada da zero mudanca", zero is not None and zero.group(1) == "0", segunda[-600:])
    conferir("o catalogo e o mesmo antes e depois (SC-008)", catalogo_antes == catalogo_depois, (catalogo_antes, catalogo_depois))
    lista = [c for c in codigos_2.split(",") if c]
    conferir("a turma tem dia parado da planilha gravado em `dias_parados`", bool(lista), codigos_2)
    conferir("todo dia parado tem o codigo estavel `…-L<linha>-P`", all(re.fullmatch(re.escape(prefixo) + r"\d+-P", c) for c in lista), lista)
    conferir("os mesmos codigos nas duas rodadas", codigos_1 == codigos_2, (codigos_1, codigos_2))
    if lista:
        n = [c[:-1] + "N" for c in lista]
        linhas = banco.consultar("local", "select codigo, status::text as status, observacoes from public.atividades_nao_letivas "
                                 f"where codigo = any (array[{', '.join(lit(x) for x in n)}]::text[])")
        conferir("a linha TAD antiga da mesma linha esta INATIVA, com a marca de reclassificacao (nada apagado)",
                 linhas and all(l["status"] == "inativo" and "[RECLASSIFICADO PELA SPEC 014]" in (l["observacoes"] or "") for l in linhas),
                 linhas)
    fer = banco.consultar("local", "select count(*) as n, count(*) filter (where codigo !~ '^FER-[0-9]{6}$') as fora, "
                                   "count(distinct codigo) as distintos from public.feriados")[0]
    conferir("todo `feriados.codigo` e `FER-NNNNNN`, sem repetir", int(fer["fora"]) == 0 and int(fer["n"]) == int(fer["distintos"]), fer)

    print(f"\n{'TODAS AS PROVAS PASSARAM' if not FALHAS else f'{len(FALHAS)} PROVA(S) FALHARAM'}")
    return 1 if FALHAS else 0


if __name__ == "__main__":
    raise SystemExit(main())
