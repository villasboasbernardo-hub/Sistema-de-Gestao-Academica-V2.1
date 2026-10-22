"""R1 (decisao de Bernardo Villas Boas, 16/10/2026) — o de-para de UE de uma turma, PELO NOME, para o lote de decisoes.

    python -X utf8 -m scripts.carga_dsa.de_para_de_ue --rodada <pasta> --turma "C-Ap-FR 2026" [--destino local]

Na C-Ap-FR e na Ag-Mag, «1P» e a UE 1 e a chave N e a UE N+1 (C-Ap-FR I+1 = «2 – DISPOSITIVOS DE PROTECAO»): a
sincronizacao lia a UE pelo numero da chave e gravava a aula na UE anterior a certa. Este script le, de um lado, as
chaves de AULA do catalogo da planilha (BD DISCIPLINAS) com o topico e, do outro, as UEs da disciplina no banco, e
casa cada chave com a UE de MESMO NOME (o topico sem o numero do inicio). Onde o numero do topico e o nome divergem
(Ag-Mag I+4 «5- … (Ultima Aula)»), VALE O NOME — e o caso sai listado. Imprime o JSON do de-para («I+1» → «I+2»,
«I+1P» → «I+1»), que vai, conferido, para `ues` em `scripts/carga_dsa/decisoes/<turma>.json`.

⚠️ So leitura: nao grava nada. A chave que nao acha UE de mesmo nome NAO entra no de-para — vai para a saida, para quem
   decide (nada e inferido).
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

from scripts.carga_dsa import banco, planilha
from scripts.carga_dsa.banco import lit
from scripts.carga_dsa.plano import normalizar

PRIMEIRA = re.compile(r"([0-9]+)P")


def nome(topico: str) -> str:
    """«2 – DISPOSITIVOS DE PROTEÇÃO.» → «DISPOSITIVOS DE PROTECAO»: sem o numero do inicio, sem pontuacao nem acento."""
    sem_numero = re.sub(r"^\s*[0-9]+\s*[-–.)]*\s*", "", topico or "")
    sem_parenteses = re.sub(r"\([^)]*\)", "", sem_numero)
    return re.sub(r"[^A-Z0-9 ]", "", normalizar(sem_parenteses)).strip()


def semelhante(a: str, b: str) -> bool:
    """Nome parecido: as cinco primeiras letras iguais, ou semelhanca de texto >= 0,5."""
    if not a or not b:
        return False
    return a.split()[0][:5] == b.split()[0][:5] or difflib.SequenceMatcher(None, a, b).ratio() >= 0.5


def sigla(topico: str) -> str:
    """A sigla que o banco escreve entre parenteses («… INFORMATION SYSTEM (ECDIS)» → «ECDIS»)."""
    achado = re.search(r"\(([^)]+)\)\s*$", topico or "")
    return re.sub(r"[^A-Z0-9 ]", "", normalizar(achado.group(1))).strip() if achado else ""


def numero_do_topico(topico: str) -> str | None:
    achado = re.match(r"^\s*([0-9]+)\s*[-–.)]", topico or "")
    return achado.group(1) if achado else None


def main() -> int:
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rodada", required=True, type=Path)
    ap.add_argument("--turma", required=True)
    ap.add_argument("--destino", default="local", choices=sorted(banco.DESTINOS))
    a = ap.parse_args()

    fontes = json.loads((Path(__file__).parent / "fontes.json").read_text(encoding="utf-8"))["turmas"]
    fonte = next(f for f in fontes if f["turma"] == a.turma)
    decisoes = json.loads((Path(__file__).parent / fonte["decisoes"]).read_text(encoding="utf-8"))
    arquivo = next(a.rodada.glob(f"{a.turma.replace(' ', '_')}__*.xlsx"))
    leitura = planilha.ler(arquivo)
    mapa = decisoes.get("disciplinas", {})
    ues = banco.consultar(a.destino, f"""
select d.cod_disciplina as cod, u.numero_ue::text as numero, u.topico
  from public.unidades_ensino u join public.disciplinas d on d.id = u.disciplina_id
  join public.turmas t on t.curriculo_id = d.curriculo_id
 where t.codigo = {lit(a.turma)} and u.status = 'ativo' and d.status = 'ativo'
 order by 1, u.numero_ue;""")
    por_disciplina: dict[str, list[dict]] = {}
    for u in ues:
        por_disciplina.setdefault(u["cod"], []).append(u)

    usadas = {b.chave for b in leitura.blocos}
    de_para: dict[str, str] = {}
    sem_ue: list[str] = []
    divergem: list[str] = []
    semelhanca: list[str] = []
    for (cod, ue), linha in sorted(leitura.catalogo.items()):
        if (cod, ue) not in usadas:
            continue
        primeira = PRIMEIRA.fullmatch(ue)
        if not (ue.isdigit() or primeira):
            continue
        cod_banco = mapa.get(cod, cod)
        candidatas = [u for u in por_disciplina.get(cod_banco, []) if nome(u["topico"]) == nome(linha.topico)]
        if not candidatas and cod_banco in por_disciplina:
            # Nome escrito diferente (erro de digitacao, abreviacao, sigla): so vale a UE de nome PARECIDO cujo numero e
            # o do topico — os dois concordando. Sai listado como «por semelhanca», para quem confere.
            n_topico = numero_do_topico(linha.topico)
            parecidas = [u for u in por_disciplina[cod_banco] if u["numero"] == n_topico and (
                semelhante(nome(u["topico"]), nome(linha.topico)) or sigla(u["topico"]) == nome(linha.topico))]
            if len(parecidas) == 1:
                candidatas = parecidas
                semelhanca.append(f"{cod}+{ue} «{linha.topico}» → UE {parecidas[0]['numero']} «{parecidas[0]['topico']}»")
        if len(candidatas) != 1:
            if cod_banco in por_disciplina:
                sem_ue.append(f"{cod}+{ue} «{linha.topico}»: {len(candidatas)} UE de mesmo nome na disciplina {cod_banco}")
            continue
        alvo = candidatas[0]["numero"]
        lido = primeira.group(1) if primeira else ue
        n_topico = numero_do_topico(linha.topico)
        if n_topico is not None and n_topico != alvo:
            divergem.append(f"{cod}+{ue} «{linha.topico}»: o numero do topico diz {n_topico}, o nome casa com a UE {alvo} — vale o nome")
        if alvo != lido or primeira:
            # A «NP» entra SEMPRE (mesmo quando ja e a UE N): a consulta pela chave crua vem primeiro, e sem ela a «1P»
            # cairia no de-para da «1» («I+1» → «I+2»).
            de_para[f"{cod}+{ue}"] = f"{cod}+{alvo}"
    print(json.dumps({"ues": de_para}, ensure_ascii=False, indent=2))
    print(f"\n{len(de_para)} chave(s) no de-para; {len(sem_ue)} sem UE de mesmo nome; {len(divergem)} com numero e nome divergentes")
    for x in sem_ue:
        print(f"  SEM UE: {x}")
    for x in divergem:
        print(f"  NOME VALE: {x}")
    for x in semelhanca:
        print(f"  POR SEMELHANCA (numero e nome concordam): {x}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
