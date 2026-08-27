#!/usr/bin/env bash
# Verificação pós-tradução. Compara o resultado contra um backup do original.
# Uso:  ./verificar.sh <dir_traduzido> <dir_original>
# Os dois primeiros blocos são o que pega os defeitos que passam despercebidos:
# uma tradução pode zerar as menções à plataforma antiga E destruir o markdown.
set -uo pipefail
NOVO="${1:?}"; ORIG="${2:?}"
echo "── integridade estrutural (o que uma regex ruim destrói em silêncio) ──"
for m in '^```:cercas de código' '^\|:linhas de tabela' '^#{1,6} :títulos' \
         '^\s{2,}:linhas indentadas' '^- \[ \]:tarefas'; do
  pat="${m%%:*}"; lbl="${m##*:}"
  a=$(grep -rhcE "$pat" "$ORIG" 2>/dev/null|paste -sd+|bc)
  b=$(grep -rhcE "$pat" "$NOVO" 2>/dev/null|paste -sd+|bc)
  d=$((a-b)); d=${d#-}
  printf "  %-20s %5d → %5d  %s\n" "$lbl" "$a" "$b" "$([ "$d" -le 40 ] && echo ✅ || echo '⚠️ VERIFIQUE')"
done
q=0; for f in $(find "$NOVO" -name '*.md'); do
  n=$(grep -c '^```' "$f"); [ $((n%2)) -ne 0 ] && q=$((q+1)); done
echo "  cercas ímpares       $q $([ "$q" -eq 0 ] && echo ✅ || echo '⚠️ MARKDOWN QUEBRADO')"
echo
echo "── plataforma antiga ──"
f=0
for t in "Apps Script" "GAS" "google.script" "getSheetByName" "SpreadsheetApp" \
         "HtmlService" "Google Sheets" "Google Docs" "Drive" "clasp" "LockService" \
         "PropertiesService" "CacheService" "Session.getActiveUser" ".gs" "doGet" \
         "iframe" "script.google.com" "ApexCharts" "Bootstrap" "bootstrap" "Chart.js" \
         "Font Awesome" "vm.runInContext" "MANIFESTO" "BUILD_ID" "node --test" \
         ".test.js" "Web App" "gs()" "ABAS." "nova tabela" "tabela do navegador"; do
  n=$(grep -roF "$t" "$NOVO" 2>/dev/null|wc -l)
  [ "$n" -gt 0 ] && { printf "  ⚠️ %-22s %4d\n" "$t" "$n"; f=1; }
done
[ "$f" -eq 0 ] && echo "  ✅ ZERO menções"
