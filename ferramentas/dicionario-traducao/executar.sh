#!/usr/bin/env bash
# Executa o pipeline completo de tradução, na ordem. A ordem IMPORTA — ver README.md §3.
#
# Uso:  ./executar.sh <dir_specs> [--aplicar]
#       Sem --aplicar, roda em simulação e só imprime o relatório.
#
# ⚠️  A saída de cada passada é CAPTURADA numa variável, não canalizada para `head`.
#     Canalizar fecha o pipe assim que a primeira linha é lida, o Python morre com
#     BrokenPipeError e o `pipefail` aborta o laço — resultado: só a passada 0 roda,
#     e o relatório final acusa a tradução inteira como não feita. Custou um teste
#     para descobrir; fica registrado para não voltar.
set -euo pipefail
DIR="${1:?informe o diretório das specs}"
MODO="${2:-}"
AQUI="$(cd "$(dirname "$0")" && pwd)"

for p in 0-rejuntar-identificadores 1-dicionario-mecanico 2-campos-spec-kit \
         3-extensoes-e-entrada 4-ferramental-de-teste 5-varredura-ampla \
         6-reparar-aninhamento; do
  printf "  %-32s " "$p"
  saida="$(python3 "$AQUI/$p.py" "$DIR" $MODO)"
  printf '%s\n' "${saida%%$'\n'*}"
done
