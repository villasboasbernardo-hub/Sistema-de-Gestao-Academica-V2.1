"""O relogio do curso, lido da aba HORARIOS da planilha de controle.

Decisao de Bernardo Villas Boas, 06/10/2026 (item 3 do lote da onda 1 da VIRADA-1): a fonte do
relogio e a aba HORARIOS de cada planilha — "horario de cada tempo pela quantidade de TA do curso";
a IMPRESSAO e so conferencia. O Estudo Individual e o tempo seguinte ao ultimo TA do dia, com o
horario desse tempo na tabela.

A aba e uma tabela de consulta: para cada tempo inicial (colunas «1º TEMPO» … «5º TEMPO») e cada
quantidade de TA, o texto «HH:MM as HH:MM». Daqui saem os CINCO campos do relogio que o sistema
guarda na vigencia de regime (`curso_regime_historico`): duracao do TA, inicio da manha, intervalo
da manha, inicio da tarde e intervalo da tarde. A conferencia e por RECONSTRUCAO: com os cinco
campos, o mesmo algoritmo de `lib/dominio/dsa/horario-do-bloco.ts` (`relogioDoRegime`) regenera a
tabela inteira, e toda celula que nao bate e erro de planilha — listado, nunca adotado.

⚠️ O NUMERO DE TEMPOS DO REGIME NAO VEM DAQUI. A tabela diz ate onde ha horario (8 ou 9 linhas); a
   quantidade de TA por dia do curso e cadastro (v2.0 → `regime_tempos`), e so e trocada quando a
   DURACAO do TA no cadastro nao e a da tabela — ai o cadastro e o padrao copiado, nao o curso.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

FIM_DA_MANHA = 12 * 60
TA_MAXIMO = 12
CAMPOS = ("ta_duracao_min", "intervalo_manha_min", "intervalo_tarde_min", "hora_inicio_manha", "hora_inicio_tarde")


@dataclass
class TabelaDeHorarios:
    """Uma tabela da aba: `faixas[(tempo_inicial, quantidade)] = (inicio, fim)` em minutos."""

    linha_inicial: int
    faixas: dict[tuple[int, int], tuple[int, int]] = field(default_factory=dict)

    @property
    def max_tempos(self) -> int:
        return max((q for (t, q) in self.faixas if t == 1), default=0)


@dataclass
class Regime:
    ta_duracao_min: int
    intervalo_manha_min: int
    intervalo_tarde_min: int
    hora_inicio_manha: str
    hora_inicio_tarde: str
    max_tempos: int
    # Celulas da tabela que a reconstrucao nao reproduz: (tempo inicial, quantidade, na planilha, reconstruido).
    erros: list[tuple[int, int, str, str]] = field(default_factory=list)

    def campos(self) -> dict[str, object]:
        return {c: getattr(self, c) for c in CAMPOS}


def minutos(hora: str) -> int:
    h, m = hora.strip().split(":")[:2]
    return int(h) * 60 + int(m)


def hora(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


_FAIXA = re.compile(r"(\d{1,2}:\d{2})\s*(?:as|às|a|-|–)\s*(\d{1,2}:\d{2})", re.IGNORECASE)
_TEMPO = re.compile(r"(\d+)\s*º?\s*TEMPO", re.IGNORECASE)


def ler_tabelas(aba) -> list[TabelaDeHorarios]:
    """Le todas as tabelas da aba HORARIOS (algumas planilhas trazem duas ou tres, empilhadas)."""
    tabelas: list[TabelaDeHorarios] = []
    atual: TabelaDeHorarios | None = None
    colunas: dict[int, int] = {}  # coluna da HORA -> tempo inicial
    for linha in aba.iter_rows(min_row=1, max_row=aba.max_row, values_only=False):
        textos = {c.column: str(c.value).strip() for c in linha if c.value is not None and str(c.value).strip()}
        if not textos:
            continue
        cabecalho = {col: int(m.group(1)) for col, v in textos.items() if (m := _TEMPO.search(v))}
        if cabecalho:
            atual = TabelaDeHorarios(linha_inicial=linha[0].row)
            tabelas.append(atual)
            colunas = {col + 1: tempo for col, tempo in cabecalho.items()}
            continue
        if atual is None or all(v.upper().startswith(("QUANT", "HORA")) for v in textos.values()):
            continue
        for col, tempo in colunas.items():
            faixa, quantidade = textos.get(col), textos.get(col - 1)
            if faixa is None or quantidade is None:
                continue
            m = _FAIXA.search(faixa)
            try:
                q = int(float(quantidade))
            except ValueError:
                continue
            if m and q > 0:
                atual.faixas[(tempo, q)] = (minutos(m.group(1)), minutos(m.group(2)))
    return [t for t in tabelas if t.faixas]


def reconstruir(r: Regime | dict, max_tempos: int) -> list[tuple[int, int]]:
    """O mesmo algoritmo de `relogioDoRegime`: manha enquanto o fim cabe em 12:00; o resto na tarde."""
    g = r if isinstance(r, dict) else r.campos()
    tempos: list[tuple[int, int]] = []
    cursor = minutos(str(g["hora_inicio_manha"]))
    while len(tempos) < max_tempos:
        fim = cursor + int(g["ta_duracao_min"])
        if fim > FIM_DA_MANHA:
            break
        tempos.append((cursor, fim))
        cursor = fim + int(g["intervalo_manha_min"])
    cursor = minutos(str(g["hora_inicio_tarde"]))
    while len(tempos) < max_tempos:
        fim = cursor + int(g["ta_duracao_min"])
        tempos.append((cursor, fim))
        cursor = fim + int(g["intervalo_tarde_min"])
    return tempos


def derivar(tabela: TabelaDeHorarios) -> Regime | None:
    """Os cinco campos, lidos da coluna «1º TEMPO» e conferidos contra a tabela inteira."""
    primeira = {q: faixa for (t, q), faixa in tabela.faixas.items() if t == 1}
    if 1 not in primeira or 2 not in primeira:
        return None
    inicio_manha, fim_1 = primeira[1]
    duracao = fim_1 - inicio_manha
    # fim de cada tempo k = fim da faixa (1, k); inicio do tempo k = fim(k) - duracao
    fins = {q: faixa[1] for q, faixa in primeira.items()}
    inicios = {q: fins[q] - duracao for q in fins}
    manha = [q for q in sorted(fins) if fins[q] <= FIM_DA_MANHA]
    if len(manha) < 2 or len(fins) <= len(manha):
        return None
    intervalo_manha = inicios[manha[1]] - fins[manha[0]]
    primeiro_da_tarde = manha[-1] + 1
    inicio_tarde = inicios[primeiro_da_tarde]
    intervalo_tarde = (
        inicios[primeiro_da_tarde + 1] - fins[primeiro_da_tarde] if primeiro_da_tarde + 1 in fins else intervalo_manha
    )
    regime = Regime(duracao, intervalo_manha, intervalo_tarde, hora(inicio_manha), hora(inicio_tarde), max(fins))
    tempos = reconstruir(regime, max(fins))
    for (t, q), (ini, fim) in sorted(tabela.faixas.items()):
        esperado = (tempos[t - 1][0], tempos[t + q - 2][1]) if t + q - 1 <= len(tempos) else None
        if esperado != (ini, fim):
            regime.erros.append((t, q, f"{hora(ini)} as {hora(fim)}", "fora da tabela" if esperado is None else f"{hora(esperado[0])} as {hora(esperado[1])}"))
    return regime


def escolher(tabelas: list[TabelaDeHorarios], vigencia: dict) -> tuple[Regime | None, str]:
    """A tabela que corresponde a vigencia: mesma duracao de TA; senao, a unica que houver.

    Devolve (regime, criterio). `criterio` diz por que a tabela foi escolhida, para o relatorio.
    """
    regimes = [r for t in tabelas if (r := derivar(t)) is not None]
    if not regimes:
        return None, "a aba HORARIOS nao tem tabela legivel"
    mesma_duracao = [r for r in regimes if r.ta_duracao_min == int(vigencia["ta_duracao_min"])]
    if len(mesma_duracao) == 1:
        return mesma_duracao[0], f"tabela com TA de {mesma_duracao[0].ta_duracao_min} min, a mesma duracao da vigencia"
    if len(mesma_duracao) > 1:
        # Mais de uma tabela com a mesma duracao: a que comporta os tempos do regime, e entre elas a primeira.
        cabem = [r for r in mesma_duracao if r.max_tempos >= int(vigencia["regime_tempos"])]
        r = (cabem or mesma_duracao)[0]
        return r, f"{len(mesma_duracao)} tabelas com TA de {r.ta_duracao_min} min; valeu a primeira que comporta {vigencia['regime_tempos']} tempos"
    if len(regimes) == 1:
        return regimes[0], f"a unica tabela da aba (TA de {regimes[0].ta_duracao_min} min; a vigencia dizia {vigencia['ta_duracao_min']})"
    return None, f"nenhuma tabela tem TA de {vigencia['ta_duracao_min']} min e ha {len(regimes)} tabelas: nao da para escolher sem decisao"


def correcao(vigencia: dict, regime: Regime) -> dict | None:
    """O que muda na vigencia para o relogio ficar o da tabela — ou None se ja e o mesmo.

    `regime_tempos` so muda quando a duracao do TA do cadastro nao e a da tabela (cadastro = padrao
    copiado, nao o curso — medido: C-Exp-BATI 7x50 no banco, 9x45 na tabela). Ai vale o maior tempo
    da tabela; o Estudo Individual, que e o tempo SEGUINTE ao ultimo TA, nao conta.
    """
    novo: dict[str, object] = {
        "ta_duracao_min": regime.ta_duracao_min,
        "intervalo_manha_min": regime.intervalo_manha_min,
        "intervalo_tarde_min": regime.intervalo_tarde_min,
        "hora_inicio_manha": regime.hora_inicio_manha,
        "hora_inicio_tarde": regime.hora_inicio_tarde,
        "regime_tempos": int(vigencia["regime_tempos"]),
    }
    if int(vigencia["ta_duracao_min"]) != regime.ta_duracao_min:
        novo["regime_tempos"] = regime.max_tempos
    atual = {k: (str(vigencia[k])[:5] if k.startswith("hora") else int(vigencia[k])) for k in novo}
    if atual == novo and vigencia.get("configuracao_horario_id") is None:
        return None
    return novo
