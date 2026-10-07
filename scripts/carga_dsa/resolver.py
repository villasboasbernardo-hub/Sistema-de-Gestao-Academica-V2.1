"""Do bloco da planilha a linha do banco, para QUALQUER turma do modelo — a sincronizacao.

E a generalizacao do piloto (`plano.montar`, C-Exp-Obs-ME 2026) para as regras de leitura que as
outras planilhas trouxeram *(decisoes de Bernardo Villas Boas, 06/10/2026)*:

- **a sigla nao decide nada; decide a DESCRICAO do catalogo** — `FR` e feriado numa planilha e
  farol na outra. Chave que nao e UE de disciplina e classificada pelo texto de BD DISCIPLINAS
  (`_REGRAS_POR_DESCRICAO`), e toda classificacao automatica vai para o relatorio;
- **«(FISCAL)» vira fiscal** da avaliacao, e o responsavel e quem conduz a vista;
- **aula com dois instrutores**: o primeiro e o instrutor, os demais vao em observacoes;
- **«1P»** (primeira aula) e a UE 1;
- **a vista** casa com a prova pelo numero da chave (VP1 ↔ AV1/PM1); sem numero, as sessoes casam
  com as ultimas provas da disciplina, em ordem — a convencao do piloto;
- **dia parado** (feriado, licenca) so e CALENDARIO GLOBAL quando parou todas as turmas; parado so
  de algumas, vira TAD da turma;
- **celula digitada por cima da formula na IMPRESSAO** e o DSA assinado: vale, salvo as que as
  decisoes da turma recusam;
- **curso por competencias**: aula por disciplina, sem UE, com o topico da planilha.

⚠️ NADA AQUI CRIA CADASTRO. O que falta — instrutor fora do cadastro, habilitacao, UE, vocabulario —
   vira PENDENCIA tipada, para o lote de decisoes. No modo provisorio (so no banco local) o que da
   para carregar sem cadastro e carregado; no remoto, pendencia que bloqueia para tudo.

⚠️ AS VALIDACOES DO LANCAMENTO MANUAL continuam as de `plano.py` (`pode_atuar`, teto de TFM): este
   modulo as reusa, nao as reescreve.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import date

from scripts.carga_dsa.planilha import Bloco, Leitura
from scripts.carga_dsa.plano import (
    CATEGORIAS,
    casar_instrutor,
    eh_tfm,
    ler_instrutor,
    normalizar,
    pode_atuar,
    sem_teto_algum,
)

VAZIOS = {"", "-", "--", "---"}

# (palavras da descricao, tipo, subtipo) — a PRIMEIRA que casar vale. «VISITA» vem antes de
# «FERIADO» de proposito: ha planilha que cadastra a visita sob a sigla dos feriados.
_REGRAS_POR_DESCRICAO: tuple[tuple[tuple[str, ...], str, str | None], ...] = (
    (("ESTUDO INDIVIDUAL", "TEMPO PARA ESTUDO"), "estudo_individual", "Estudo Individual"),
    # APOINST (apoio a instrucao: pratica de navegacao, posicionamento de sinais) sob a sigla de tempo reserva —
    # pela descricao do catalogo da planilha (decisao de 06/10/2026, item 4 do lote da onda 2).
    (("APOINST", "APOIO A INSTRUCAO"), "aec", "Atividade Extracurricular"),
    (("VISITA",), "aec", "Visita Técnica"),
    (("FERIADO", "LICENCA", "ROTINA DE DOMINGO", "RECESSO", "PONTO FACULTATIVO"), "dia_parado", None),
    (("PALESTRA", "COLOQUIO", "SEMINARIO", "INSTRUCAO"), "aec", "Palestra"),
    (("TFM", "TREINAMENTO FISICO"), "aec", "Orientação de TFM"),
    (("CERIMONIA", "FORMATURA", "SOLENIDADE"), "tad", "Evento/Cerimônia"),
    (("TEMPO RESERVA",), "tr", "Tempo Reserva"),
    (("EXTRA CLASSE", "EXTRACLASSE", "ASSINCRONA"), "aec", "Atividade Extracurricular"),
    (("MONITORIA", "RECEPCAO", "ADMINISTRACAO", "DEPARTAMENTO DE ALUNOS"), "tad", "Administração"),
    # DOEP (decisao do piloto, generalizada na onda 2): palestra/oficina do Departamento de Orientacao.
    (("DOEP", "OFICINA"), "aec", "Palestra"),
)

MARCA_DE_DEMAIS = " Demais instrutores: "


def classificar_pela_descricao(disciplina: str, topico: str) -> tuple[str, str | None] | None:
    descricao = normalizar(f"{disciplina} {topico}")
    for palavras, tipo, subtipo in _REGRAS_POR_DESCRICAO:
        if any(p in descricao for p in palavras):
            return tipo, subtipo
    return None


@dataclass
class Pendencia:
    """O que precisa de decisao ou de cadastro. `bloqueia` = nao vai ao remoto enquanto existir."""

    tipo: str
    turma: str
    detalhe: str
    ta: int = 0
    bloqueia: bool = True
    chave: str = ""  # para agrupar no lote


@dataclass
class Resolvido:
    turma: dict
    autor: dict
    titulo: str
    aulas: list[dict] = field(default_factory=list)
    avaliacoes: list[dict] = field(default_factory=list)
    atividades: list[dict] = field(default_factory=list)
    calendario: list[dict] = field(default_factory=list)
    pendencias: list[Pendencia] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)
    erros_de_planilha: list[str] = field(default_factory=list)
    classificadas: dict[str, str] = field(default_factory=dict)  # chave → como foi classificada
    digitadas_adotadas: list[str] = field(default_factory=list)
    instrutores: dict[str, dict] = field(default_factory=dict)
    insumo_epico_8: list[str] = field(default_factory=list)

    def codigos(self) -> dict[str, list[str]]:
        return {
            "registros_aula": [a["codigo"] for a in self.aulas],
            "avaliacoes": [a["codigo"] for a in self.avaliacoes],
            "atividades_nao_letivas": [a["codigo"] for a in self.atividades],
        }

    def impressao_digital(self) -> str:
        sem_id = lambda linhas: [{k: v for k, v in l.items() if not k.endswith("_id")} for l in linhas]  # noqa: E731
        corpo = json.dumps(
            {"aulas": sem_id(self.aulas), "avaliacoes": sem_id(self.avaliacoes),
             "atividades": sem_id(self.atividades),
             # `ja_no_banco` e ESTADO do destino, nao plano: no local o dia ja entrou, no remoto ainda nao.
             "calendario": [{k: v for k, v in c.items() if k != "ja_no_banco"} for c in self.calendario],
             "pendencias": sorted(p.detalhe for p in self.pendencias if p.bloqueia)},
            sort_keys=True, ensure_ascii=False, default=str,
        )
        return hashlib.sha256(corpo.encode("utf-8")).hexdigest()[:16]


def slug(turma: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", normalizar(turma)).strip("-")


def _numero(chave_ue: str) -> str:
    achado = re.search(r"(\d+)$", chave_ue)
    return achado.group(1) if achado else ""


def resolver(
    leitura: Leitura,
    ref: dict,
    decisoes: dict,
    titulo: str,
    dias_globais: set[str],
    provisorio: bool,
) -> Resolvido:
    turma, autor = ref["turma"], ref.get("autor") or {}
    nome = turma["codigo"]
    r = Resolvido(turma=turma, autor=autor, titulo=titulo)

    def pend(tipo: str, detalhe: str, ta: int = 0, bloqueia: bool = True, chave: str = "") -> None:
        r.pendencias.append(Pendencia(tipo=tipo, turma=nome, detalhe=detalhe, ta=ta, bloqueia=bloqueia, chave=chave))

    if not autor.get("auth_user_id") or autor.get("status") != "ativo":
        pend("autor", "a conta autora nao existe, nao esta ativa ou nao tem credencial neste destino")

    mapa_de_disciplinas = decisoes.get("disciplinas", {})  # COD da planilha → cod_disciplina do banco
    disciplina_por_cod = {d["cod"]: d for d in ref["disciplinas"]}
    isentas = {d["id"] for d in ref["disciplinas"] if d.get("sem_ue")}
    ue_por = {(u["disciplina_id"], str(u["numero"])): u for u in ref["ues"]}
    metodologia_por_sigla = {normalizar(m["sigla"]): m["valor"] for m in ref["metodologias"] if m.get("sigla")}
    categoria_do_subtipo = {t["valor"]: t.get("categoria") for t in ref["tipos_atividade"]}
    locais = {normalizar(k): v for k, v in decisoes.get("locais", {}).items()}
    chaves = decisoes.get("chaves", {})
    padrao_avaliacao = re.compile(decisoes.get("padrao_ue_de_avaliacao", r"(AV|PE|PM|PP|PO|TG|TI|TR|OD)[0-9]*"))
    padrao_vista = re.compile(decisoes.get("padrao_ue_de_vista", r"VP[0-9]*"))
    padrao_primeira = re.compile(r"([0-9]+)P")
    tipo_por_tecnica = decisoes.get("tipo_avaliacao_por_tecnica", {"PP": "Prova Prática", "TG": "Trabalho", "TI": "Trabalho"})
    recusadas = set(decisoes.get("celulas_digitadas_nao_adotadas", {}))
    prefixo = f"DSAP-{slug(nome)}"

    def codigo(bloco: Bloco, sufixo: str) -> str:
        return f"{prefixo}-L{bloco.linha:03d}-{sufixo}"

    def procedencia(bloco: Bloco) -> str:
        return (
            f"Carga da planilha de controle «{titulo}», PREENCHIMENTO linhas "
            f"{bloco.linha}–{bloco.linha + bloco.tempos - 1} (scripts/carga_dsa)."
        )

    def digitado(bloco: Bloco, campo: str) -> str | None:
        valor = leitura.digitadas.get(bloco.linha, {}).get(campo)
        if valor is None or f"L{bloco.linha}.{campo}" in recusadas:
            return None
        return valor

    def ajuste(bloco: Bloco, campo: str) -> str | None:
        for regra in decisoes.get("ajustes", []):
            quando = regra.get("quando", {})
            if campo in regra and all(
                (k != "data" or v == bloco.data.isoformat()) and (k != "cod" or v == bloco.cod)
                and (k != "ue" or v == bloco.ue) and (k != "ta_inicial" or v == bloco.ta_inicial)
                for k, v in quando.items()
            ):
                return regra[campo]
        return None

    def local_de(bloco: Bloco, regra: dict | None = None) -> str | None:
        forcado = ajuste(bloco, "local") or (regra or {}).get("local")
        if forcado:
            return forcado
        bruto = digitado(bloco, "local")
        if bruto is not None:
            r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: local «{bruto}»")
        else:
            bruto = leitura.catalogo[bloco.chave].local
        if bruto.strip() in VAZIOS:
            return None
        achado = locais.get(normalizar(bruto))
        if achado is None:
            pend("local_sem_traducao", f"local «{' '.join(bruto.split())}» sem traducao", bloco.tempos, chave=normalizar(bruto))
            return " ".join(bruto.split())
        return achado

    def tecnica_de(bloco: Bloco) -> tuple[str | None, str]:
        sigla = ajuste(bloco, "tecnica")
        if sigla is None:
            sigla = digitado(bloco, "te")
            if sigla is not None:
                r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: T/E «{sigla}»")
            else:
                sigla = leitura.catalogo[bloco.chave].tecnica
        if sigla.strip() in VAZIOS:
            return None, ""
        if "/" in sigla:
            # «EO/AP», «TG/TI»: duas tecnicas numa celula; vale a PRIMEIRA, como no instrutor (onda 2, CAHO).
            r.alertas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: T/E «{sigla}» traz duas tecnicas; valeu a primeira")
            sigla = sigla.split("/")[0]
        valor = metodologia_por_sigla.get(normalizar(sigla))
        if valor is None:
            pend("tecnica_desconhecida", f"T/E «{sigla}» nao e sigla de metodologia do banco", bloco.tempos, chave=normalizar(sigla))
        return valor, normalizar(sigla)

    def casar(texto_bruto: str, bloco: Bloco, obrigatorio: bool) -> dict | None:
        """Um instrutor do cadastro para um texto «POSTO (ESP) NOME DE GUERRA». Exige exatamente um."""
        lido = ler_instrutor(texto_bruto)
        achados = casar_instrutor(lido, ref["instrutores"], decisoes.get("postos_aceitos_por_codigo")) if lido is not None else []
        if len(achados) > 1:
            # Texto que casa com DOIS do cadastro: o desempate e decisao nominal, versionada POR CODIGO
            # (fontes.json, `desempate_de_instrutor`: «55|58» → «55»), para a sincronizacao semanal aplicar sempre.
            escolhido = decisoes.get("desempate_de_instrutor", {}).get("|".join(sorted(a["codigo"] for a in achados)))
            if escolhido is not None:
                achados = [a for a in achados if a["codigo"] == str(escolhido)]
        if len(achados) == 1:
            r.instrutores[" ".join(texto_bruto.split())] = achados[0]
            return achados[0]
        if obrigatorio:
            limpo = " ".join(re.sub(r"\(\s*FISCAL\s*\)", "", texto_bruto, flags=re.IGNORECASE).split())
            motivo = "nao esta no cadastro" if not achados else f"casa com {len(achados)} do cadastro (codigos {sorted(a['codigo'] for a in achados)})"
            pend("instrutor_nao_casado", f"«{limpo}» {motivo}", bloco.tempos, chave=normalizar(limpo))
        return None

    def instrutores_de(bloco: Bloco) -> tuple[dict | None, str, str]:
        """(primeiro instrutor, demais em texto, texto bruto). Dois instrutores vem separados por «/»."""
        forcado = decisoes.get("instrutor_por_chave", {}).get(f"{bloco.cod}+{bloco.ue}")
        bruto = digitado(bloco, "instrutor")
        if bruto is not None:
            r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: instrutor «{bruto}»")
        else:
            bruto = leitura.catalogo[bloco.chave].instrutor
        if forcado is not None:
            achados = [i for i in ref["instrutores"] if i["codigo"] == str(forcado)]
            return (achados[0] if achados else None), "", bruto
        partes = [p.strip() for p in bruto.split("/") if p.strip()]
        if not partes or bruto.strip() in VAZIOS:
            return None, "", bruto
        # Texto que NAO e pessoa («OFICIAIS-MONITORES»): decisao D3 de 06/10/2026 — a aula entra com o
        # instrutor que a decisao nomeia e a observacao «… (conforme DSA)»; a CH conta normalmente.
        por_texto = decisoes.get("instrutor_por_texto", {}).get(normalizar(partes[0]))
        if por_texto is not None:
            achados = [i for i in ref["instrutores"] if i["codigo"] == str(por_texto["codigo"])]
            if achados:
                r.instrutores[" ".join(partes[0].split())] = achados[0]
                return achados[0], por_texto.get("observacao", ""), bruto
        primeiro = casar(partes[0], bloco, obrigatorio=True)
        return primeiro, "; ".join(partes[1:]), bruto

    def classificar(bloco: Bloco) -> tuple[str, dict]:
        """(tipo, regra). tipo ∈ aula · avaliacao · vista · nao letivo · dia_parado · calendario · ignorar · pendente."""
        regra = chaves.get(f"{bloco.cod}+{bloco.ue}") or chaves.get(bloco.cod)
        if regra is not None:
            return regra["tipo"], regra
        # O de-para de chave («XXI+PM1» → «MAT+PM1») vale tambem para prova e vista, nao so para aula.
        cod_mapeado, ue_mapeada = (decisoes.get("ues", {}).get(f"{bloco.cod}+{bloco.ue}") or f"{bloco.cod}+{bloco.ue}").split("+", 1)
        cod_do_banco = mapa_de_disciplinas.get(cod_mapeado, cod_mapeado)
        if cod_do_banco in disciplina_por_cod:
            if padrao_vista.fullmatch(ue_mapeada):
                return "vista", {}
            if padrao_avaliacao.fullmatch(ue_mapeada):
                return "avaliacao", {}
            if ue_mapeada.isdigit() or padrao_primeira.fullmatch(ue_mapeada):
                return "aula", {}
        linha = leitura.catalogo[bloco.chave]
        achado = classificar_pela_descricao(linha.disciplina, linha.topico)
        if achado is None:
            return "pendente", {}
        tipo, subtipo = achado
        r.classificadas[f"{bloco.cod}+{bloco.ue}"] = (
            f"«{linha.disciplina} · {' '.join(linha.topico.split())}» → {tipo}" + (f" / {subtipo}" if subtipo else "")
        )
        return tipo, {"subtipo": subtipo}

    blocos_de_vista: list[tuple[Bloco, dict]] = []
    dias_parados: dict[str, list[tuple[Bloco, dict]]] = {}
    for linha_digitada, campos in sorted(leitura.digitadas.items()):
        bloco_digitado = next((b for b in leitura.blocos if b.linha == linha_digitada), None)
        if "ta" in campos and bloco_digitado is not None and campos["ta"] != str(bloco_digitado.tempos):
            r.erros_de_planilha.append(
                f"IMPRESSAO linha {linha_digitada} ({bloco_digitado.data:%d/%m/%Y}): nº de TA digitado «{campos['ta']}» por cima da formula, "
                f"e o PREENCHIMENTO tem {bloco_digitado.tempos} TA nesse bloco — o painel de CH da planilha fica deslocado dali em diante"
            )

    for bloco in leitura.blocos:
        if bloco.chave not in leitura.catalogo:
            r.erros_de_planilha.append(
                f"linha {bloco.linha} ({bloco.data:%d/%m/%Y}, {bloco.tempos} TA): a chave {bloco.cod}+{bloco.ue} "
                "nao existe no catalogo (BD DISCIPLINAS) — na IMPRESSAO sai como erro de PROCV"
            )
            pend("chave_sem_catalogo", f"chave {bloco.cod}+{bloco.ue} sem linha no catalogo", bloco.tempos, chave=f"{bloco.cod}+{bloco.ue}")
            continue
        tipo, regra = classificar(bloco)
        linha_do_catalogo = leitura.catalogo[bloco.chave]

        if tipo == "ignorar":
            continue
        if tipo == "pendente":
            pend("chave_sem_regra",
                 f"chave {bloco.cod}+{bloco.ue} («{linha_do_catalogo.disciplina} · {' '.join(linha_do_catalogo.topico.split())}») sem classificacao",
                 bloco.tempos, chave=f"{bloco.cod}+{bloco.ue}")
            continue
        if tipo in ("dia_parado", "calendario"):
            descricao = regra.get("descricao") or " ".join(linha_do_catalogo.topico.split())
            dias_parados.setdefault(bloco.data.isoformat(), []).append((bloco, {**regra, "descricao": descricao, "forcar": tipo == "calendario"}))
            continue

        if tipo in CATEGORIAS:
            subtipo = regra.get("subtipo") or ("Estudo Individual" if tipo == "estudo_individual" else None)
            if subtipo not in categoria_do_subtipo or categoria_do_subtipo[subtipo] != CATEGORIAS[tipo]:
                pend("subtipo_invalido", f"subtipo «{subtipo}» nao e de {CATEGORIAS[tipo]} em `tipos_atividade`", bloco.tempos, chave=str(subtipo))
                continue
            externo = regra.get("responsavel_externo")
            instrutor = None
            if tipo != "estudo_individual" and externo is None and regra.get("responsavel") != "em_branco":
                bruto = digitado(bloco, "instrutor") or linha_do_catalogo.instrutor
                if bruto.strip() not in VAZIOS:
                    instrutor = casar(bruto.split("/")[0], bloco, obrigatorio=False)
                    if instrutor is None:
                        externo = " ".join(bruto.split())
            r.atividades.append({
                "codigo": codigo(bloco, "N"),
                "categoria_normativa": CATEGORIAS[tipo],
                "data": bloco.data.isoformat(),
                "subtipo": subtipo,
                "descricao": "ESTUDO INDIVIDUAL" if tipo == "estudo_individual" else (regra.get("descricao") or " ".join(linha_do_catalogo.topico.split())),
                "ta_inicial": bloco.ta_inicial,
                "tempos_consumidos": bloco.tempos,
                "local": local_de(bloco, regra),
                "instrutor": instrutor["codigo"] if instrutor else None,
                "instrutor_id": instrutor["id"] if instrutor else None,
                "responsavel_externo": externo,
                "observacoes": procedencia(bloco),
            })
            continue

        cod_mapeado, ue_mapeada = (decisoes.get("ues", {}).get(f"{bloco.cod}+{bloco.ue}") or f"{bloco.cod}+{bloco.ue}").split("+", 1)
        disciplina = disciplina_por_cod[mapa_de_disciplinas.get(cod_mapeado, cod_mapeado)]
        if tipo == "vista":
            blocos_de_vista.append((bloco, disciplina))
            continue

        if tipo == "avaliacao":
            bruto = digitado(bloco, "instrutor") or linha_do_catalogo.instrutor
            eh_fiscal = re.search(r"\(\s*FISCAL\s*\)", bruto, flags=re.IGNORECASE) is not None
            pessoa = casar(bruto.split("/")[0], bloco, obrigatorio=False) if bruto.strip() not in VAZIOS else None
            limpo = " ".join(re.sub(r"\(\s*FISCAL\s*\)", "", bruto, flags=re.IGNORECASE).split())
            metodologia, sigla = tecnica_de(bloco)
            tipo_avaliacao = tipo_por_tecnica.get(sigla, decisoes.get("tipo_avaliacao", "Prova Escrita"))
            if tipo_avaliacao not in ref["tipos_avaliacao"]:
                pend("tipo_de_avaliacao", f"tipo «{tipo_avaliacao}» fora de `tipos_avaliacao`", bloco.tempos)
                continue
            if sigla in ("EO", ""):
                r.erros_de_planilha.append(
                    f"linha {bloco.linha} ({bloco.data:%d/%m/%Y}): a avaliacao {bloco.cod}+{bloco.ue} esta com T/E «{sigla or 'vazia'}» no catalogo"
                )
            if not eh_fiscal and pessoa is None and limpo not in VAZIOS:
                pend("instrutor_nao_casado", f"«{limpo}» nao esta no cadastro (responsavel de avaliacao)", bloco.tempos, chave=normalizar(limpo), bloqueia=False)
            r.avaliacoes.append({
                "codigo": codigo(bloco, "V"),
                "chave_ue": ue_mapeada,
                "cod_planilha": bloco.cod,
                "disciplina": disciplina["cod"],
                "disciplina_id": disciplina["id"],
                "tipo_avaliacao": tipo_avaliacao,
                "data_avaliacao": bloco.data.isoformat(),
                "ta_inicial": bloco.ta_inicial,
                "tempos_consumidos": bloco.tempos,
                # «(FISCAL)» vira fiscal; quem conduz a vista vira o responsavel, mais abaixo.
                "instrutor": None if eh_fiscal else (pessoa["codigo"] if pessoa else None),
                "instrutor_responsavel_id": None if eh_fiscal else (pessoa["id"] if pessoa else None),
                "fiscal": pessoa["codigo"] if eh_fiscal and pessoa else None,
                "fiscal_id": pessoa["id"] if eh_fiscal and pessoa else None,
                "nome_fiscal_externo": limpo if eh_fiscal and pessoa is None and limpo not in VAZIOS else None,
                "metodologia": metodologia,
                "local": local_de(bloco),
                "conteudo_resumo": " ".join(linha_do_catalogo.topico.split()) or None,
                "data_vista_prova": None, "ta_inicial_vista": None, "tempos_consumidos_vista": None, "local_vista": None,
                "observacoes": procedencia(bloco),
            })
            faixa = re.search(r"\(\s*U\.?\s*E\.?[^)]*\)", linha_do_catalogo.topico, flags=re.IGNORECASE)
            if faixa:
                r.insumo_epico_8.append(f"{disciplina['cod']} {bloco.ue} ({bloco.data:%d/%m/%Y}): {faixa.group(0)}")
            continue

        # ── aula ──
        primeira = padrao_primeira.fullmatch(bloco.ue)
        numero_ue = primeira.group(1) if primeira else bloco.ue
        # A UE da planilha nem sempre e a do catalogo do banco (a planilha lanca uma disciplina
        # inteira como UE de outra, ou abre a UE em topicos): o de-para e DECISAO, nunca inferencia.
        mapeada = decisoes.get("ues", {}).get(f"{bloco.cod}+{numero_ue}")
        if mapeada is not None:
            cod_do_banco, numero_ue = mapeada.split("+")
            disciplina = disciplina_por_cod[cod_do_banco]
        sem_ue = disciplina["id"] in isentas or bool(turma.get("por_competencias"))
        ue = None if sem_ue else ue_por.get((disciplina["id"], numero_ue))
        if not sem_ue and ue is None:
            pend("ue_inexistente", f"UE {numero_ue} da disciplina {disciplina['cod']} nao existe (ativa) no catalogo do banco", bloco.tempos, chave=f"{disciplina['cod']}+{numero_ue}")
            continue
        instrutor, demais, bruto = instrutores_de(bloco)
        if instrutor is None:
            if bruto.strip() in VAZIOS:
                pend("aula_sem_instrutor", f"aula {bloco.cod}+{bloco.ue} sem instrutor no catalogo", bloco.tempos, chave=f"{bloco.cod}+{bloco.ue}")
            continue
        if not pode_atuar("ministrar", instrutor["id"], disciplina["id"], ref["habilitacoes"]):
            pend("sem_habilitacao", f"instrutor de codigo {instrutor['codigo']} sem habilitacao em {disciplina['cod']} — {disciplina['nome']}",
                 bloco.tempos, chave=f"{instrutor['codigo']}|{disciplina['cod']}")
            if not provisorio:
                continue
        metodologia, _ = tecnica_de(bloco)
        topico_digitado = digitado(bloco, "topico")
        if topico_digitado is not None:
            r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: topico «{topico_digitado}»")
        topico_da_planilha = re.sub(r"^\s*[0-9]+\s*[–-]\s*", "", " ".join((topico_digitado or linha_do_catalogo.topico).split()))
        r.aulas.append({
            "codigo": codigo(bloco, "A"),
            "data": bloco.data.isoformat(),
            "cod_planilha": bloco.cod,
            "disciplina": disciplina["cod"],
            "ue": ue["codigo"] if ue else None,
            "numero_ue": ue["numero"] if ue else None,
            "unidade_ensino_id": ue["id"] if ue else None,
            # XOR do banco: com UE a disciplina fica nula; sem UE (isenta), a disciplina e obrigatoria.
            "disciplina_sem_ue": None if ue else disciplina["cod"],
            "disciplina_id": None if ue else disciplina["id"],
            "instrutor": instrutor["codigo"],
            "instrutor_id": instrutor["id"],
            "ta_inicial": bloco.ta_inicial,
            "tempos_consumidos": bloco.tempos,
            # Com UE, o topico e o do catalogo do BANCO; sem UE, o da planilha (curso por competencias).
            "conteudo_resumo": ue["topico"] if ue else topico_da_planilha,
            "metodologia": metodologia,
            "local": local_de(bloco),
            "observacoes": procedencia(bloco) + ("" if not demais else f" {demais}" if demais.endswith("(conforme DSA)") else f"{MARCA_DE_DEMAIS}{demais}."),
        })

    _casar_vistas(r, blocos_de_vista, decisoes, pend, local_de, casar, leitura, codigo=codigo, procedencia=procedencia)
    _resolver_dias_parados(r, dias_parados, dias_globais, leitura, codigo, procedencia, categoria_do_subtipo)
    _conferencias_internas(r, leitura, decisoes, pend, set(disciplina_por_cod))
    _tetos(r, ref, pend)
    _calendario_do_banco(r, ref)
    return r


def _casar_vistas(r, blocos_de_vista, decisoes, pend, local_de, casar, leitura, codigo=None, procedencia=None) -> None:
    """A vista vai na MESMA linha da avaliacao (`RN-AVAL-02`). Uma linha guarda UMA sessao de vista."""
    explicitas = list(decisoes.get("vistas", []))
    # A aba DATAS AVALIACOES, quando existe, diz QUAL vista e de QUAL prova (chave a chave, com as datas):
    # vale como decisao explicita, antes de qualquer regra por numero (onda 2, C-Ap-HN e C-Espc-HN).
    mapa = decisoes.get("disciplinas", {})
    for d in getattr(leitura, "datas_avaliacoes", []):
        if d["data_vista"] and d["data_prova"] and d["chave_vista"]:
            explicitas.append({"disciplina": mapa.get(d["cod"], d["cod"]), "data": d["data_vista"].isoformat(),
                               "da_prova_de": d["data_prova"].isoformat(), "origem": "DATAS AVALIACOES"})
    por_disciplina: dict[str, list[tuple[Bloco, dict]]] = {}
    for bloco, disciplina in blocos_de_vista:
        por_disciplina.setdefault(disciplina["cod"], []).append((bloco, disciplina))

    for cod, sessoes in por_disciplina.items():
        sessoes.sort(key=lambda s: (s[0].data, s[0].ta_inicial))
        provas = sorted((a for a in r.avaliacoes if a["disciplina"] == cod), key=lambda a: (a["data_avaliacao"], a["ta_inicial"]))
        # Sem numero: a sessao e a vista da ULTIMA prova aplicada ANTES dela (data e TA) que ainda nao tem
        # vista. Medido na onda 1 (C-Exp-Ag-Mag, 06/10/2026): a convencao anterior — k sessoes casam com as
        # ultimas k provas — mandava a vista de 24/03 para a prova de 31/03, e o banco recusava
        # (`aval_vista_apos_aplicacao`). A vista nunca precede a prova; e essa a regra que decide.
        for bloco, _disciplina in sessoes:
            decisao = next((v for v in explicitas if v["disciplina"] == cod and v["data"] == bloco.data.isoformat()
                            and v.get("ta_inicial", bloco.ta_inicial) == bloco.ta_inicial), None)
            if decisao is not None:
                alvo = next((a for a in provas if a["data_avaliacao"] == decisao["da_prova_de"]), None)
            elif _numero(bloco.ue) and any(_numero(a["chave_ue"]) == _numero(bloco.ue) for a in provas):
                candidatas = [a for a in provas if _numero(a["chave_ue"]) == _numero(bloco.ue) and a["data_avaliacao"] <= bloco.data.isoformat()]
                alvo = candidatas[-1] if candidatas else None
            else:
                # Sem numero — ou com numero que nenhuma prova da disciplina tem (C-Espc-HN: provas «PM», vistas
                # «VP1/VP2/VP3»): a sessao e a vista da ultima prova aplicada antes dela que ainda nao tem vista.
                anteriores = [a for a in provas if (a["data_avaliacao"], a["ta_inicial"] or 0) < (bloco.data.isoformat(), bloco.ta_inicial)
                              and a["data_vista_prova"] is None]
                alvo = anteriores[-1] if anteriores else None
            if alvo is None:
                pend("vista_sem_prova", f"vista {cod}+{bloco.ue} de {bloco.data:%d/%m/%Y} nao casa com nenhuma prova da disciplina", bloco.tempos, chave=f"{cod}+{bloco.ue}")
                continue
            if alvo["data_vista_prova"] is not None and decisoes.get("vista_extra_como_aec") and codigo is not None:
                # Decisao de 07/10/2026 (conferencia, C06): a segunda sessao de vista da mesma prova entra como AEC —
                # a linha da avaliacao guarda uma sessao so, e a sessao aconteceu.
                r.atividades.append({
                    "codigo": codigo(bloco, "N"), "categoria_normativa": "AEC", "data": bloco.data.isoformat(),
                    "subtipo": "Atividade Extracurricular",
                    "descricao": f"VISTA DE PROVA (2ª sessão) — {cod} {alvo['chave_ue']} aplicada em {alvo['data_avaliacao']}",
                    "ta_inicial": bloco.ta_inicial, "tempos_consumidos": bloco.tempos, "local": local_de(bloco),
                    "instrutor": alvo.get("instrutor"), "instrutor_id": alvo.get("instrutor_responsavel_id"),
                    "responsavel_externo": None, "observacoes": procedencia(bloco),
                })
                continue
            if alvo["data_vista_prova"] is not None:
                pend("vista_em_mais_de_uma_sessao",
                     f"a prova {cod} {alvo['chave_ue']} de {alvo['data_avaliacao']} ja tem vista em {alvo['data_vista_prova']}; "
                     f"a sessao de {bloco.data:%d/%m/%Y} ({bloco.tempos} TA) nao cabe na mesma linha", bloco.tempos, chave=f"{cod}+{bloco.ue}")
                continue
            alvo["data_vista_prova"] = bloco.data.isoformat()
            alvo["ta_inicial_vista"] = bloco.ta_inicial
            alvo["tempos_consumidos_vista"] = bloco.tempos
            alvo["local_vista"] = local_de(bloco)
            # quem conduz a vista e o responsavel pela avaliacao, quando a prova so trazia o fiscal
            if alvo["instrutor_responsavel_id"] is None:
                bruto = leitura.digitadas.get(bloco.linha, {}).get("instrutor") or leitura.catalogo[bloco.chave].instrutor
                pessoa = casar(bruto.split("/")[0], bloco, obrigatorio=False) if bruto.strip() not in VAZIOS else None
                if pessoa is not None:
                    alvo["instrutor"], alvo["instrutor_responsavel_id"] = pessoa["codigo"], pessoa["id"]


def _resolver_dias_parados(r, dias_parados, dias_globais, leitura, codigo, procedencia, categoria_do_subtipo) -> None:
    """Dia parado de TODAS as turmas e calendario global; so de algumas, vira TAD da turma."""
    for dia, blocos in sorted(dias_parados.items()):
        descricao = blocos[0][1]["descricao"]
        if dia in dias_globais or any(regra.get("forcar") for _b, regra in blocos):
            r.calendario.append({"data": dia, "descricao": descricao, "tempos": sum(b.tempos for b, _ in blocos)})
            continue
        for bloco, regra in blocos:
            r.atividades.append({
                "codigo": codigo(bloco, "N"),
                "categoria_normativa": "TAD",
                "data": dia,
                "subtipo": regra.get("subtipo") or "Administração",
                "descricao": regra["descricao"],
                "ta_inicial": bloco.ta_inicial,
                "tempos_consumidos": bloco.tempos,
                "local": None, "instrutor": None, "instrutor_id": None, "responsavel_externo": None,
                "observacoes": procedencia(bloco) + " Dia parado so desta turma: nao e calendario global.",
            })


def _conferencias_internas(r, leitura, decisoes, pend, disciplinas_do_curso) -> None:
    """As conferencias da planilha contra ela mesma — OBRIGATORIAS (o gabarito e opcional).

    1. chave × «CH CONCLUIDA»: o que o leitor contou em cada chave fecha com o que a PROPRIA
       planilha conta (CONT.SE sobre o ESPELHO). Diverge = o leitor errou, ou a planilha tem linha
       que ele nao viu. BLOQUEIA.
    2. disciplina × CONTROLE: aulas + provas + vistas fecham com a «CH. CUMPRIDA» do CONTROLE.
       BLOQUEIA — salvo o que ficou de fora por pendencia, que e dito com o numero.
    3. chave × CH PREVISTA do catalogo: informativo. «Passou» e «falta» sao estados que a planilha
       mesma registra (coluna OK / PASSOU / FALTA); so viram erro de planilha em turma encerrada.
    """
    lido: dict[tuple[str, str], int] = {}
    for b in leitura.blocos:
        lido[b.chave] = lido.get(b.chave, 0) + b.tempos
    for chave, ta in sorted(lido.items()):
        linha = leitura.catalogo.get(chave)
        if linha is None or linha.ch_concluida is None:
            continue
        if linha.ch_concluida != ta:
            pend("contagem_diverge", f"chave {chave[0]}+{chave[1]}: o leitor contou {ta} TA e a planilha conta {linha.ch_concluida} em CH CONCLUIDA", abs(ta - linha.ch_concluida), chave=f"{chave[0]}+{chave[1]}")

    # ⚠️ A soma e pelo codigo DA PLANILHA, que e como o CONTROLE conta — a planilha pode lancar
    #    uma disciplina sob o codigo de outra, e ai o de-para muda a disciplina do banco, nao a conta.
    carregado: dict[str, int] = {}
    for a in r.aulas:
        carregado[a["cod_planilha"]] = carregado.get(a["cod_planilha"], 0) + a["tempos_consumidos"]
    for a in r.avaliacoes:
        carregado[a["cod_planilha"]] = carregado.get(a["cod_planilha"], 0) + a["tempos_consumidos"] + (a["tempos_consumidos_vista"] or 0)
    for cod_planilha, (_prevista, cumprida) in sorted(leitura.controle.items()):
        if cumprida is None:
            continue
        # O CONTROLE de alguns cursos (CAHO) lista tambem AD, FE, PL, TR — siglas de atividade, nao de
        # disciplina; o fechamento e por disciplina, e so por ela.
        if decisoes.get("disciplinas", {}).get(cod_planilha, cod_planilha) not in disciplinas_do_curso:
            continue
        no_plano = carregado.get(cod_planilha, 0)
        if no_plano != cumprida:
            de_fora = sum(p.ta for p in r.pendencias if p.tipo in ("instrutor_nao_casado", "ue_inexistente", "aula_sem_instrutor", "vista_sem_prova", "vista_em_mais_de_uma_sessao", "sem_habilitacao") and p.bloqueia)
            pend("controle_diverge",
                 f"disciplina {cod_planilha}: o plano soma {no_plano} TA e o CONTROLE conta {cumprida} (diferenca {cumprida - no_plano}; ha {de_fora} TA da turma fora do plano por pendencia)",
                 abs(cumprida - no_plano), chave=cod_planilha)

    em_andamento = bool(decisoes.get("turma_em_andamento"))
    for chave, linha in sorted(leitura.catalogo.items()):
        if linha.ch is None or not chave[1].isdigit() or chave not in lido:
            continue
        if decisoes.get("disciplinas", {}).get(chave[0], chave[0]) not in disciplinas_do_curso:
            continue  # so UE de disciplina: licenca, feriado e afins nao tem carga prevista a cumprir
        if lido[chave] != linha.ch and not (em_andamento and lido[chave] < linha.ch):
            estado = "PASSOU" if lido[chave] > linha.ch else "FALTA"
            r.erros_de_planilha.append(f"UE {chave[0]}+{chave[1]}: {lido[chave]} TA lancados e {linha.ch} previstos no catalogo ({estado})")


def _tetos(r, ref, pend) -> None:
    """`RN-DIST-03`: TFM acima do teto BLOQUEIA; o recomendado so alerta; fim de curso, nada."""
    try:
        tfm = float(ref["tetos"]["dsa.teto_tfm_semana"])
        recomendado = float(ref["tetos"]["dsa.teto_recomendado_semana"])
    except (KeyError, ValueError):
        r.alertas.append("tetos: parametro ausente em `config_parametros` — o teto cala, nao e inventado")
        return
    nome_por_cod = {d["cod"]: d["nome"] for d in ref["disciplinas"]}
    soma: dict[tuple[tuple[int, int], str], int] = {}

    def somar(dia: str | None, cod: str, tempos: int | None) -> None:
        if not dia or not tempos:
            return
        ano, semana, _ = date.fromisoformat(dia).isocalendar()
        soma[((ano, semana), cod)] = soma.get(((ano, semana), cod), 0) + tempos

    for a in r.aulas:
        somar(a["data"], a["disciplina"], a["tempos_consumidos"])
    for a in r.avaliacoes:
        somar(a["data_avaliacao"], a["disciplina"], a["tempos_consumidos"])
        somar(a["data_vista_prova"], a["disciplina"], a["tempos_consumidos_vista"])
    for ((ano, semana), cod), ta in sorted(soma.items()):
        nome = nome_por_cod.get(cod, cod)
        if sem_teto_algum(nome):
            continue
        if eh_tfm(nome):
            if ta > tfm:
                # Regra 6 do projeto: regra normativa vira ALERTA, nunca bloqueio (RN-DEG-02) — e a tela tambem so avisa.
                r.alertas.append(f"semana {semana}/{ano}: «{nome}» tem {ta} TA; o teto de TFM e {tfm:g} (RN-DIST-03 — alerta, nao bloqueio)")
        elif ta > recomendado:
            r.alertas.append(f"semana {semana}/{ano}: «{nome}» tem {ta} TA; o recomendado e {recomendado:g} (alerta, nao bloqueio)")


def _calendario_do_banco(r, ref) -> None:
    bloqueados = {f["data"]: f for f in ref["feriados"] if f["impacto"] == "dia_inteiro"}
    for c in r.calendario:
        c["ja_no_banco"] = c["data"] in bloqueados
    dias = {a["data"] for a in r.aulas} | {a["data_avaliacao"] for a in r.avaliacoes} | {a["data"] for a in r.atividades if a["categoria_normativa"] != "Estudo_Individual"}
    for dia in sorted(dias & set(bloqueados)):
        r.alertas.append(f"{dia}: ha lancamento num dia que o calendario do banco marca como dia inteiro («{bloqueados[dia]['descricao']}»)")
