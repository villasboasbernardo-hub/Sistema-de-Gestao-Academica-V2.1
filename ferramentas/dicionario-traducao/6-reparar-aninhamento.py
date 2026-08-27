#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reparar_aninhamento.py — Passada 5: desfaz o aninhamento de caminho que as passadas
                          anteriores produziram.

O QUÊ  : colapsa `app/`app/(app)/x/page.tsx`` em `app/(app)/x/page.tsx`.

PARA QUÊ: a passada 1 traduziu `ViewInstrutores.html` → `` `app/(app)/instrutores/page.tsx` ``
         (já com crase). A passada 3 traduziu o prefixo de diretório `src/frontend/` → `app/`.
         Onde a origem trazia o caminho completo (`src/frontend/ViewInstrutores.html`), as
         duas regras se somaram e produziram prefixo duplicado com crase no meio.

         É colateral previsível de pipeline de substituição: quando duas regras mordem
         pedaços diferentes da mesma cadeia, a ordem importa e o resultado precisa de
         reparo explícito. Reparar em passada própria é mais honesto — e muito mais fácil
         de revisar — do que tentar prever toda combinação nas regras anteriores.

⚠️  LIÇÃO REGISTRADA NO CÓDIGO, de propósito:
    a primeira versão desta passada tinha uma regra `r'```(?![a-z])' → '`'` para limpar
    crase tripla. Ela também casava com o FECHAMENTO DE BLOCO DE CÓDIGO do markdown
    (``` sozinho na linha), e destruiu as 300 cercas de fechamento das 314 specs — 58
    arquivos com markdown quebrado, sem nenhum erro visível no processo.
    Só a verificação "aberturas × fechamentos" pegou. Por isso, aqui, TODA regra que
    toca crase é ancorada de forma a nunca casar no início de linha.
"""
import re, sys
from pathlib import Path
from collections import Counter

PREFIXOS = r'(?:app/|lib/acoes/|lib/dominio/|lib/supabase/|components/|src/)'

REGRAS = [
    # `app/`app/(app)/x`` → `app/(app)/x`     (?<!^) impede casar em início de linha
    (re.compile(r'(?<!^)`' + PREFIXOS + r'`([^`\n]+)``', re.MULTILINE), r'`\1`'),
    (re.compile(r'(?<!^)`' + PREFIXOS + r'`([^`\n]+)`',  re.MULTILINE), r'`\1`'),
    # app/`app/(app)/x`  (prefixo solto antes da crase)
    (re.compile(r'(?<![`\w])' + PREFIXOS + r'`((?:app|lib|components)/[^`\n]+)`'), r'`\1`'),
    # crase dobrada em prosa — NUNCA em início de linha (lá é cerca de código)
    (re.compile(r'(?<!^)``([^`\n]+)``', re.MULTILINE), r'`\1`'),
]

def main():
    raiz = Path(sys.argv[1]); aplicar = '--aplicar' in sys.argv
    c = Counter()
    for f in sorted(raiz.rglob('*.md')):
        t = o = f.read_text(encoding='utf-8')
        for _ in range(3):                       # o aninhamento pode ter dois níveis
            for pat, rep in REGRAS:
                t, n = pat.subn(rep, t)
                if n: c[pat.pattern[:44]] += n
        if aplicar and t != o: f.write_text(t, encoding='utf-8')
    print(f"{'APLICADO' if aplicar else 'SIMULAÇÃO'} · {sum(c.values())} reparos")
    for k, v in c.most_common(): print(f"  {v:5d}  {k}")

if __name__ == '__main__':
    main()
