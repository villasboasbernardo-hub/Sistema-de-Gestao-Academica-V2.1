"""Ponto de entrada ÚNICO do ETL — as seis etapas, na ordem, ou nenhuma.

O QUÊ  : encadeia extração (1 e 1-B), normalização (2), cruzamento da UE (2-B), carga
         em staging (3), promoção (4) e reconciliação (5), e devolve um código de saída
         que diz o que aconteceu.

PARA QUÊ: o contrato pipeline P-7 é explícito — **não existe "rodar só uma tabela para
         corrigir uma coisinha"**. Essa é a operação que, numa migração, produz o
         estado que ninguém sabe descrever: quinze tabelas de um snapshot e dez de
         outro, sem nada que registre a mistura. Ter um ponto de entrada só é o que
         faz "o que está no banco?" ter uma resposta.

COMO   : `python -m scripts.etl.executar [--primeira-carga] [--somente-reconciliar]`

⚠️ A RECONCILIAÇÃO NÃO É OPCIONAL, e não é um passo separado que alguém lembra de
   rodar. Ela roda ao fim de toda carga, e o **código de saída do programa é o veredito
   dela**. Uma carga que termina 0 é uma carga conferida; qualquer outra coisa não é
   carga terminada, é carga interrompida.

Códigos de saída, e a diferença entre eles importa:
   0 — carregou e a reconciliação APROVOU.
   1 — carregou e a reconciliação BLOQUEOU: há divergência nomeada no relatório.
   2 — **não foi possível conferir**. Não é aprovação nem reprovação: é ignorância, e
       ela tem de ser distinguível das outras duas (FR-014.2).
   3 — a carga abortou antes de escrever: domínio sem destino, chave órfã, conflito de
       parâmetro. Nada foi gravado.
"""

from __future__ import annotations

import argparse
import sys

from . import carregar, promover, reconciliar

# ⚠️ O console do Windows abre em cp1252, e cp1252 não tem `→` (U+2192) — o programa
#    morria com `UnicodeEncodeError` ao IMPRIMIR o título de uma etapa, depois de a
#    etapa ter rodado. Falhar na impressão do resultado é a pior forma de falhar: o
#    trabalho foi feito e o operador vê um traceback. Como este é o ponto de entrada
#    único, reconfigurar aqui cobre tudo o que o pipeline imprime.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AMBIENTES = ("local", "preview", "producao")


def _linha(titulo: str) -> None:
    print(f"\n{'=' * 74}\n{titulo}\n{'=' * 74}")


def executar(
    *, conexao: str, primeira_carga: bool, somente_reconciliar: bool
) -> int:
    if not somente_reconciliar:
        _linha("ETAPA 3 — carga em staging")
        try:
            rel = carregar.carregar(conexao)
        except carregar.CoberturaIncompleta as erro:
            print(f"[ABORTADO] {erro}")
            return 3
        print(
            f"  {len(rel.staging)} tabelas, {sum(rel.staging.values())} linhas em staging"
        )

        _linha("ETAPA 4 — promoção staging → public")
        try:
            res = promover.promover(conexao)
        except (promover.DominioSemDestino, promover.ChaveOrfa) as erro:
            print(f"[ABORTADO] {erro}")
            return 3
        except Exception as erro:  # noqa: BLE001 — a mensagem do banco é o diagnóstico
            print(f"[ABORTADO] {str(erro).splitlines()[0]}")
            return 3
        print(f"  {sum(res.inseridas.values())} linhas promovidas")
        if res.vocabulario_semeado:
            print(
                f"  {len(res.vocabulario_semeado)} valores semeados em config_listas "
                f"(usados pelo historico, ausentes da lista)"
            )

    _linha("ETAPA 5 — reconciliação")
    try:
        v = reconciliar.reconciliar(conexao)
    except reconciliar.NaoFoiPossivelReconciliar as erro:
        print(f"[NAO CONFERIDA] {erro}")
        return 2

    caminho = reconciliar.escrever_relatorio(v)
    print(f"  VEREDITO: {'APROVADA' if v.aprovada else 'BLOQUEADA'}")
    for d in v.bloqueantes:
        print(f"    {d}")
    for d in v.informativos:
        print(f"    (informa) {d.verificacao} · {d.tabela} · {d.linha}: {d.obtido}")
    print(f"  relatorio: {caminho}")

    if primeira_carga and v.aprovada:
        print(
            "\n  Primeira carga aprovada. O corte so acontece depois da conferencia "
            "humana dos informativos — a aprovacao aqui e tecnica, nao e a decisao."
        )
    return 0 if v.aprovada else 1


def main() -> int:
    p = argparse.ArgumentParser(
        prog="python -m scripts.etl.executar",
        description="ETL v2.0 → v2.1. As seis etapas, na ordem. Nao ha como rodar uma so.",
    )
    p.add_argument("--ambiente", choices=AMBIENTES, default="local")
    p.add_argument(
        "--primeira-carga",
        action="store_true",
        help="Marca a execucao como a carga inicial: muda o texto final, nao o comportamento.",
    )
    p.add_argument(
        "--somente-reconciliar",
        action="store_true",
        help="Pula as etapas 3 e 4 e so confere o que ja esta no banco. E por isso que a "
        "staging e truncada no INICIO da carga e nao descartada no fim: sem ela guardada, "
        "esta opcao nao teria contra o que comparar.",
    )
    p.add_argument("--conexao", default=carregar.CONEXAO_LOCAL)
    a = p.parse_args()

    if a.ambiente != "local" and a.conexao == carregar.CONEXAO_LOCAL:
        print(
            f"[RECUSADO] --ambiente {a.ambiente} com a conexao LOCAL padrao. Passe "
            f"--conexao explicitamente: escrever em preview ou producao por engano, "
            f"achando que se esta no Docker, e um erro que nao se desfaz."
        )
        return 3

    return executar(
        conexao=a.conexao,
        primeira_carga=a.primeira_carga,
        somente_reconciliar=a.somente_reconciliar,
    )


if __name__ == "__main__":
    sys.exit(main())
