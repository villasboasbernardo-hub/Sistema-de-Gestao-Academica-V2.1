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
              monta o codigo de feriado com `'FER-' ||` (varredura SEM comentario, com controle positivo);
           6. D4 (Bernardo Villas Boas, 26/10/2026): a turma ARQUIVADA e pulada, sai no resumo com o motivo
              e nao para a rodada — a outra turma pedida junto chega ao ensaio e a saida e 0 (antes, 4).

PARA QUE: `provar_carga_dsa.py` prova o plano em memoria; so o banco prova que o SQL gerado grava o
         que o plano diz, e que a segunda rodada nao mexe em nada.

COMO   : `python -m scripts.carga_dsa.provar_sincronizacao_no_banco --rodada <pasta> [--turma <codigo>]
          [--autor USR-DEV-LOCAL]` — saida 0 = todas passam. ⚠️ ESCREVE NO BANCO: so roda contra o Docker
         desta maquina (o mesmo porteiro de `dado_do_remoto`), com o retrato do remoto restaurado nele.
"""

from __future__ import annotations

import argparse
import json
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


def rodar(rodada: Path, turma: str, autor: str, gravar: bool = True) -> str:
    r = subprocess.run(
        [sys.executable, "-X", "utf8", "-m", "scripts.carga_dsa.sincronizar", "--rodada", str(rodada),
         "--destino", "local", "--autor", autor, "--turmas", turma, "--provisorio"]
        + (["--gravar"] if gravar else []),
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

    print("D4 — a turma ARQUIVADA e pulada e nao para a rodada (Bernardo Villas Boas, 26/10/2026)")
    fontes = [f["turma"] for f in json.loads((AQUI / "fontes.json").read_text(encoding="utf-8"))["turmas"]]
    arquivadas = banco.arquivadas("local", fontes)
    # Controle positivo: sem turma arquivada no local, as tres conferencias abaixo passariam sem provar nada.
    conferir("ha turma de fontes.json ARQUIVADA no local (o retrato do remoto traz a C-Exp-BATI T1 2026)", bool(arquivadas), arquivadas)
    for turma in sorted(arquivadas)[:1]:
        ensaio = rodar(arg.rodada, f"{turma},{arg.turma}", arg.autor, gravar=False)
        conferir(f"«{turma}» + «{arg.turma}» em ensaio: a rodada sai 0 (antes do D4 o banco recusava a arquivada e a saida era 4)",
                 "saida 0" in ensaio, ensaio[-800:])
        conferir("a arquivada sai no resumo como PULADA, com o motivo e a data",
                 re.search(re.escape(turma) + r"\s+PULADA — turma ARQUIVADA desde \d{4}-\d{2}-\d{2}", ensaio) is not None, ensaio[-800:])
        conferir(f"a outra turma pedida junto chega ao ensaio («{arg.turma}» no resumo com a contagem)",
                 re.search(re.escape(arg.turma) + r"\s+\d+ mudanca\(s\)", ensaio) is not None, ensaio[-800:])
        conferir("nenhuma recusa do banco", "recusou" not in ensaio, ensaio[-800:])

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
    # Spec 014, PR 6 (T223): a vista e SESSAO `…-S`, a prova liga ao item, e a 2ª vista nao e mais AEC.
    sess = banco.consultar("local", f"""
      select count(*) as n, count(*) filter (where s.codigo !~ '-S$') as fora,
             count(distinct (s.avaliacao_id, s.numero)) as distintas
        from public.vistas_de_avaliacao s join public.avaliacoes a on a.id = s.avaliacao_id
       where a.codigo like {lit(prefixo + '%')} and s.status = 'ativo' and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')""")[0]
    conferir("T226 · toda sessao ativa de avaliacao da planilha tem o codigo `…-S` (a espelhada saiu), sem numero repetido",
             int(sess["fora"]) == 0 and int(sess["n"]) == int(sess["distintas"]), sess)
    aec = banco.consultar("local", "select count(*) as n from public.atividades_nao_letivas "
                                   f"where codigo like {lit(prefixo + '%')} and status = 'ativo' and descricao like 'VISTA DE PROVA (2%'")[0]
    conferir("T225 · nenhuma AEC «VISTA DE PROVA (2ª sessão)» ativa", int(aec["n"]) == 0, aec)
    item = banco.consultar("local", f"""
      select count(*) filter (where a.avaliacao_curriculo_id is not null) as com_item, count(*) as n,
             (select count(*) from public.avaliacoes_curriculo c join public.disciplinas d on d.id = c.disciplina_id
                join public.turmas t on t.curriculo_id = d.curriculo_id
               where t.codigo = {lit(arg.turma)} and c.status = 'ativo') as itens
        from public.avaliacoes a where a.codigo like {lit(prefixo + '%')} and a.status in ('pendente', 'em_andamento', 'concluida', 'atrasada')""")[0]
    conferir("T224 · com itens no curriculo, alguma prova da planilha aponta o item",
             int(item["itens"]) == 0 or int(item["com_item"]) > 0, item)
    fer = banco.consultar("local", "select count(*) as n, count(*) filter (where codigo !~ '^FER-[0-9]{6}$') as fora, "
                                   "count(distinct codigo) as distintos from public.feriados")[0]
    conferir("todo `feriados.codigo` e `FER-NNNNNN`, sem repetir", int(fer["fora"]) == 0 and int(fer["n"]) == int(fer["distintos"]), fer)

    print(f"\n{'TODAS AS PROVAS PASSARAM' if not FALHAS else f'{len(FALHAS)} PROVA(S) FALHARAM'}")
    return 1 if FALHAS else 0


if __name__ == "__main__":
    raise SystemExit(main())
