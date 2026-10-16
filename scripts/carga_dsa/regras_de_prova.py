"""As regras da prova da planilha — emenda de 15/10/2026 à spec 014 (Bernardo Villas Boas).

> *"RN-AV-10: a prova da planilha casa com o item do currículo pela coluna COD (PM1/PM2/PP/TG/T/PO),
> normalizando "PM1" = "PM 1" = "PM-1". A descrição só desempata."*
> *"RN-AV-11: COD sem número ("PM") casa com o único item do instrumento; se houver vários, casa pela ordem
> cronológica de aplicação (1ª aplicada = nº 1)."*
> *"RN-AV-12: prova prática (PP), trabalho (T/TG) e qualquer prova com a MESMA descrição em dias consecutivos ou
> próximos (mesma disciplina, mesmo COD) é UMA prova com N sessões de aplicação, não N provas."*
> *"RN-AV-13: vista é obrigatória só para PM e PO. PP, T e TG não geram alerta de vista; se a planilha trouxer
> vista, registra."*

⚠️ O «COD» da emenda é a coluna **U.E.** da PREENCHIMENTO (`PM1`, `PP`, `T`, `AV1`) — a coluna COD da planilha é
   a DISCIPLINA. Na sincronização ele chega como `prova["chave_ue"]`.
⚠️ O DADO das regras (que instrumento exige vista; o que cada COD nomeia) mora num arquivo só,
   `lib/dominio/avaliacoes/instrumentos.json`, lido também pela tela (`lib/dominio/avaliacoes/vista-obrigatoria.ts`).
   Uma regra, um arquivo: mudar aqui sem mudar lá é impossível por construção.
⚠️ Funções PURAS: sem banco, sem planilha. A sincronização (`resolver.py`) as chama; `provar_carga_dsa.py` as prova.
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import date
from pathlib import Path

ARQUIVO_DAS_REGRAS = Path(__file__).resolve().parents[2] / "lib/dominio/avaliacoes/instrumentos.json"
REGRAS: dict = json.loads(ARQUIVO_DAS_REGRAS.read_text(encoding="utf-8"))

VISTA_OBRIGATORIA: frozenset[str] = frozenset(REGRAS["vistaObrigatoria"])
COD_DA_PLANILHA: dict[str, dict] = REGRAS["codDaPlanilha"]

# «PM1», «PM 1», «PM-1», «pm.1», «PP», «AV2»: letras, um separador opcional, o numero opcional.
_COD = re.compile(r"^\s*([A-Z]+)\s*[-.\s]?\s*([0-9]*)\s*$")
# O prefixo que as planilhas escrevem NA DESCRICAO: «PM4 – FISICA … (U.E. 7)», «TI1 – …», «PM – …».
_PREFIXO_DA_DESCRICAO = re.compile(r"^\s*([A-Z]{2,3})\s*([0-9]*)\s*[–—-]")


def _sem_acento(texto: str) -> str:
    return " ".join(unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode().upper().split())


def ler_cod(texto: str) -> tuple[str, int | None] | None:
    """RN-AV-10: «PM1» = «PM 1» = «PM-1» → ("PM", 1); «PP» → ("PP", None). Texto que nao tem a forma → None."""
    achado = _COD.match(_sem_acento(texto))
    if achado is None:
        return None
    return achado.group(1), (int(achado.group(2)) if achado.group(2) else None)


def cod_colado(texto: str) -> str:
    """A forma canonica do COD («PM 1» → «PM1»), para casar com o padrao de chave de avaliacao da turma."""
    lido = ler_cod(texto)
    if lido is None:
        return texto
    return lido[0] + ("" if lido[1] is None else str(lido[1]))


def instrumentos_do_cod(sigla: str, da_disciplina: set[str]) -> list[str]:
    """Os instrumentos que o COD pode nomear, entre os que a disciplina tem. COD fora da tabela → nenhum."""
    regra = COD_DA_PLANILHA.get(sigla)
    if regra is None:
        return []
    if regra["instrumentos"] == "todos":
        return sorted(da_disciplina)
    return [i for i in regra["instrumentos"] if i in da_disciplina]


def numero_do_cod_e_do_item(sigla: str) -> bool:
    """«PM2» e o item PM 2; «AV2» e a 2ª avaliacao da turma, nao o item 2 de instrumento algum."""
    regra = COD_DA_PLANILHA.get(sigla)
    return bool(regra and regra["numeroDoItem"])


def prefixo_da_descricao(descricao: str) -> tuple[str, int | None] | None:
    """O instrumento e o numero escritos no comeco da descricao — so DESEMPATAM (RN-AV-10)."""
    achado = _PREFIXO_DA_DESCRICAO.match((descricao or "").upper())
    if achado is None:
        return None
    return achado.group(1), (int(achado.group(2)) if achado.group(2) else None)


def desempatar(candidatos: list[str], descricao: str, nomes: dict[str, str]) -> list[str]:
    """RN-AV-10: «a descricao so desempata». Entre os candidatos que o COD deu, fica o que a descricao nomeia —
    pelo prefixo («PM4 – …») ou pelo nome do instrumento no texto («PROVA PRATICA»). Nada nomeado: ficam todos."""
    if len(candidatos) <= 1:
        return candidatos
    prefixo = prefixo_da_descricao(descricao)
    if prefixo is not None and prefixo[0] in candidatos:
        return [prefixo[0]]
    texto = _sem_acento(descricao)
    pelo_nome = [c for c in candidatos if nomes.get(c) and _sem_acento(nomes[c]) in texto]
    return pelo_nome if len(pelo_nome) == 1 else candidatos


def nomeados_pela_descricao(candidatos: list[str], descricao: str, nomes: dict[str, str]) -> list[str]:
    """Os candidatos que a descricao NOMEIA — pelo prefixo («PM4 – …») ou pelo nome do instrumento no texto."""
    prefixo = prefixo_da_descricao(descricao)
    if prefixo is not None and prefixo[0] in candidatos:
        return [prefixo[0]]
    texto = _sem_acento(descricao)
    return [c for c in candidatos if nomes.get(c) and _sem_acento(nomes[c]) in texto]


def vista_obrigatoria(instrumento: str | None) -> bool | None:
    """RN-AV-13. `None` quando o instrumento nao e conhecido: quem decide o que fazer e o chamador."""
    if instrumento is None:
        return None
    return instrumento in VISTA_OBRIGATORIA


def agrupar_sessoes(provas: list[dict], janela_dias: int) -> list[list[dict]]:
    """RN-AV-12: mesma disciplina, mesmo COD e MESMA descricao, com cada sessao a no maximo `janela_dias` dias
    corridos da anterior, e UMA prova com N sessoes. Devolve os grupos em ordem; a 1ª sessao e a primeira aplicada
    (data, TA). Cada prova precisa de `disciplina_id`, `chave_ue`, `descricao`, `data_avaliacao`, `ta_inicial`.
    ⚠️ A janela («consecutivos ou proximos») e PARAMETRO — chega de fora, nunca escrita aqui."""
    chave = lambda p: (p["disciplina_id"], cod_colado(p.get("chave_ue") or ""), _sem_acento(p.get("descricao") or ""))  # noqa: E731
    ordem = lambda p: (p["data_avaliacao"], p.get("ta_inicial") or 0)  # noqa: E731
    por_chave: dict[tuple, list[dict]] = {}
    for p in sorted(provas, key=ordem):
        por_chave.setdefault(chave(p), []).append(p)
    grupos: list[list[dict]] = []
    for lista in por_chave.values():
        atual = [lista[0]]
        for p in lista[1:]:
            distancia = (date.fromisoformat(p["data_avaliacao"]) - date.fromisoformat(atual[-1]["data_avaliacao"])).days
            if distancia <= janela_dias:
                atual.append(p)
            else:
                grupos.append(atual)
                atual = [p]
        grupos.append(atual)
    return sorted(grupos, key=lambda g: ordem(g[0]))


def ligar_ao_curriculo(provas: list[dict], itens: list[dict]) -> dict[int, dict]:
    """RN-AV-10 e RN-AV-11, para as provas de UMA disciplina (so a 1ª sessao de cada prova — RN-AV-12).

    `itens`: os itens do curriculo da disciplina, com `id`, `instrumento`, `instrumento_nome`, `numero`.
    Devolve, por indice da prova na lista, um destes:
      {"item": <item>}                                  — casou;
      {"a_mais": "<instrumento>", "numero": n|None}     — o instrumento casou e nao sobrou item para ela (o numero pedido
                                                          nao existe, ja foi tomado, ou todos os itens ja foram aplicados).
                                                          Quem decide se e «a mais» (RN-AV-14) ou «nao casa» e o chamador,
                                                          pela contagem do instrumento;
      {"nao_casa": "<motivo>", "candidatos": [...]}     — o COD nao nomeia, ou nomeia mais de um, ou nenhum da disciplina.

    Ordem: as provas com numero do item (do COD, ou do prefixo da descricao quando o COD nao numera o item) pegam o
    item delas; as sem numero pegam, em ordem cronologica de aplicacao, o MENOR numero livre do instrumento
    («1ª aplicada = nº 1» quando nenhuma e numerada; com numeradas misturadas, o menor que sobrou — interpretacao a
    confirmar). O mesmo numero pedido por duas provas diferentes: a segunda e «a mais»."""
    da_disciplina = {i["instrumento"] for i in itens}
    nomes = {i["instrumento"]: i.get("instrumento_nome") or "" for i in itens}
    por_instrumento: dict[str, dict[int, dict]] = {}
    for i in itens:
        por_instrumento.setdefault(i["instrumento"], {})[int(i["numero"])] = i
    resultado: dict[int, dict] = {}
    pedidos: list[tuple[int, str, int | None]] = []  # (indice, instrumento, numero ou None)
    for n, prova in enumerate(provas):
        lido = ler_cod(prova.get("chave_ue") or "")
        if lido is None or lido[0] not in COD_DA_PLANILHA:
            resultado[n] = {"nao_casa": f"o COD «{prova.get('chave_ue')}» nao nomeia instrumento do curriculo", "candidatos": sorted(da_disciplina)}
            continue
        sigla, numero_do_cod = lido
        candidatos = instrumentos_do_cod(sigla, da_disciplina)
        if not candidatos:
            resultado[n] = {"nao_casa": f"a disciplina nao tem {'/'.join(COD_DA_PLANILHA[sigla]['instrumentos']) if COD_DA_PLANILHA[sigla]['instrumentos'] != 'todos' else 'item'} no curriculo", "candidatos": sorted(da_disciplina)}
            continue
        if COD_DA_PLANILHA[sigla]["instrumentos"] == "todos":
            # «AV» nao nomeia instrumento: so vale o que a DESCRICAO nomear. Sem isso, «a disciplina so tem PM,
            # entao e PM» voltaria — o atalho que a D6.1 (aprovada em 14/10/2026) retirou por ligar Prova Pratica a PM.
            candidatos = nomeados_pela_descricao(candidatos, prova.get("descricao") or "", nomes)
            if not candidatos:
                resultado[n] = {"nao_casa": f"o COD «{prova.get('chave_ue')}» nao nomeia instrumento e a descricao tambem nao", "candidatos": sorted(da_disciplina)}
                continue
        candidatos = desempatar(candidatos, prova.get("descricao") or "", nomes)
        if len(candidatos) != 1:
            resultado[n] = {"nao_casa": f"o COD «{prova.get('chave_ue')}» admite {', '.join(candidatos)} e a descricao nao desempata", "candidatos": candidatos}
            continue
        instrumento = candidatos[0]
        if numero_do_cod_e_do_item(sigla):
            # «PM2» → PM 2; «PM» → None: RN-AV-11 (o unico item, ou a ordem cronologica). A descricao NAO da o numero
            # aqui — ela so desempata (RN-AV-10); «PM» com descricao «PM4 – …» e a ordem cronologica, nao o item 4.
            numero = numero_do_cod
        else:
            # «AV»/«T»: o COD nao numera o item. Se a DESCRICAO nomeia o instrumento COM numero («PM4 – …»), e ela que
            # diz o item — o mesmo criterio da D6.1 (14/10/2026: «o numero escrito vence a ordem de aplicacao»).
            prefixo = prefixo_da_descricao(prova.get("descricao") or "")
            numero = prefixo[1] if prefixo is not None and prefixo[0] == instrumento else None
        pedidos.append((n, instrumento, numero))

    tomados: dict[str, set[int]] = {}
    ordem = lambda n: (provas[n]["data_avaliacao"], provas[n].get("ta_inicial") or 0)  # noqa: E731
    for n, instrumento, numero in sorted(pedidos, key=lambda p: ordem(p[0])):
        if numero is None:
            continue
        if numero in por_instrumento.get(instrumento, {}) and numero not in tomados.setdefault(instrumento, set()):
            tomados[instrumento].add(numero)
            resultado[n] = {"item": por_instrumento[instrumento][numero]}
        else:
            resultado[n] = {"a_mais": instrumento, "numero": numero}
    for n, instrumento, numero in sorted((p for p in pedidos if p[2] is None), key=lambda p: ordem(p[0])):
        livres = sorted(set(por_instrumento.get(instrumento, {})) - tomados.setdefault(instrumento, set()))
        if not livres:
            resultado[n] = {"a_mais": instrumento, "numero": None}
            continue
        tomados[instrumento].add(livres[0])
        resultado[n] = {"item": por_instrumento[instrumento][livres[0]]}
    return resultado
