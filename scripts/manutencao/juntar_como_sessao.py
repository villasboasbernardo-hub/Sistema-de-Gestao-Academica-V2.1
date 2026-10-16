"""Junta uma avaliação como SESSÃO de aplicação de outra prova — o «juntar como sessão da mesma prova» da aba
Avaliações da turma, para quando a decisão é de Bernardo Villas Boas e não há conta para clicar.

    python -X utf8 -m scripts.manutencao.juntar_como_sessao --destino local|remoto \
        --turma "CAHO 2026" --disciplina IV --prova 2026-06-22 --juntar 2026-08-19 [--gravar]

Sem `--gravar`, só LÊ e mostra as duas avaliações e o que a junção faria. Com `--gravar`, chama
`app.juntar_como_sessao_nucleo` (E-7, `20261016153228`) — o MESMO corpo de `public.juntar_como_sessao`, a RPC da tela,
sem o porteiro — numa instrução só, e lê de volta.

⚠️ A TRILHA DIZ A VERDADE: rodando sem sessão, `juntada_por` fica NULO («carga sem sessão», como a E-6 documenta);
   `juntada_em`, a avaliação juntada e o retrato dela ficam. Quem decidiu fica no registro da rodada, não numa conta
   que não clicou.
⚠️ A sincronização respeita a junção: a avaliação juntada fica CANCELADA (a planilha não a reativa, FR-049) e a sessão
   nascida aqui tem código `SAP-`, que a rodada nunca toca (só as `DSAP-`).
⚠️ Mesmo canal do resto da manutenção e da sincronização (`scripts.carga_dsa.banco`, CLI do Supabase): o destino é
   `local` (o Docker desta máquina) ou `remoto` (o projeto vinculado). No remoto, só pelo rito: backup antes.
"""

from __future__ import annotations

import argparse
import sys

from scripts.carga_dsa import banco
from scripts.carga_dsa.banco import lit

VIVA = "('pendente', 'em_andamento', 'concluida', 'atrasada')"


def achar(destino: str, turma: str, disciplina: str, dia: str) -> list[dict]:
    return banco.consultar(destino, f"""
select a.id, a.codigo, a.data_avaliacao::text as data, a.ta_inicial, a.tempos_consumidos, a.status::text as status,
       (select l.valor || ' ' || c.numero from public.avaliacoes_curriculo c join public.config_listas l on l.id = c.instrumento_id
         where c.id = a.avaliacao_curriculo_id) as item,
       (select l.valor from public.config_listas l where l.id = a.instrumento_id) as instrumento,
       (select count(*) from public.sessoes_de_aplicacao s where s.avaliacao_id = a.id and s.status = 'ativo') as sessoes,
       a.tempos_consumidos + coalesce((select sum(s.tempos_consumidos) from public.sessoes_de_aplicacao s
                                        where s.avaliacao_id = a.id and s.status = 'ativo'), 0) as ta_total,
       (select count(*) from public.vistas_de_avaliacao v where v.avaliacao_id = a.id and v.status = 'ativo') as vistas
  from public.avaliacoes a
  join public.turmas t on t.id = a.turma_id
  join public.disciplinas d on d.id = a.disciplina_id
 where t.codigo = {lit(turma)} and d.cod_disciplina = {lit(disciplina)} and a.data_avaliacao = {lit(dia)}::date
   and a.status in {VIVA}
 order by a.ta_inicial;""")


def mostrar(rotulo: str, linhas: list[dict]) -> None:
    for l in linhas:
        print(f"  {rotulo}: {l['codigo']} · {l['data']} · TA {l['ta_inicial']} ×{l['tempos_consumidos']} · item {l['item'] or '—'}"
              f" · instrumento {l['instrumento'] or '—'} · sessões 2..N {l['sessoes']} · TA da prova {l['ta_total']}"
              f" · vistas {l['vistas']} · {l['status']}")


def main() -> int:
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--destino", required=True, choices=sorted(banco.DESTINOS))
    ap.add_argument("--turma", required=True)
    ap.add_argument("--disciplina", required=True, help="o cod_disciplina (IV, XIX…)")
    ap.add_argument("--prova", required=True, help="dia da 1ª aplicação da prova (aaaa-mm-dd)")
    ap.add_argument("--juntar", required=True, help="dia da avaliação que vira sessão (aaaa-mm-dd)")
    ap.add_argument("--gravar", action="store_true", help="sem ele, só lê")
    a = ap.parse_args()

    prova, outra = achar(a.destino, a.turma, a.disciplina, a.prova), achar(a.destino, a.turma, a.disciplina, a.juntar)
    print(f"[{a.destino}] {a.turma} · disciplina {a.disciplina}")
    mostrar("prova ", prova)
    mostrar("juntar", outra)
    if len(prova) != 1 or len(outra) != 1:
        print(f"PARADO: esperava UMA avaliação viva em cada dia; achei {len(prova)} em {a.prova} e {len(outra)} em {a.juntar}.")
        return 2
    if outra[0]["vistas"]:
        print("  ⚠️ a avaliação juntada tem vista: ela passa para a prova (como na tela).")
    if not a.gravar:
        print(f"  (só leitura) a junção faria a prova somar {int(prova[0]['ta_total']) + int(outra[0]['tempos_consumidos'])} TA "
              f"em {int(prova[0]['sessoes']) + 2} sessões. Use --gravar para gravar.")
        return 0

    sessao = banco.consultar(a.destino, f"select app.juntar_como_sessao_nucleo({lit(prova[0]['id'])}::uuid, {lit(outra[0]['id'])}::uuid) as id;")
    lida = banco.consultar(a.destino, f"""
select s.codigo, s.numero, s.data::text as data, s.juntada_por is null as sem_sessao, s.juntada_em is not null as com_instante,
       j.codigo as juntada, j.status::text as status_da_juntada
  from public.sessoes_de_aplicacao s join public.avaliacoes j on j.id = s.juntada_de_avaliacao_id
 where s.id = {lit(sessao[0]['id'])}::uuid;""")
    print(f"  GRAVADO: {lida[0]}")
    mostrar("prova ", achar(a.destino, a.turma, a.disciplina, a.prova))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
