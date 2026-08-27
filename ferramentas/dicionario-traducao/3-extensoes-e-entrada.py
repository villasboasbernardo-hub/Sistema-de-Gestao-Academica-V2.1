#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
traduzir_specs3.py — Terceira passada: sobras de extensão, ponto de entrada e biblioteca.

O QUÊ  : fecha os cinco padrões que sobreviveram às duas primeiras passadas — extensão de
         arquivo solta (`.gs`), caminho de código do repositório antigo, ponto de entrada
         `doGet`, o iframe do script.google.com e a biblioteca de gráficos.

PARA QUÊ: nenhum deles é prosa; são identificadores que a passada 1 não pegou por virem
         sem o nome do módulo junto (`.gs` sozinho, `src/backend/*.gs`).

COMO   : regex ordenada do mais específico para o mais genérico.
"""
import re, sys
from pathlib import Path
from collections import Counter

REGRAS = [
    # --- caminhos do repositório: a estrutura mudou (documento 24) --------------------
    (r'`src/backend/\*\.gs`',            '`lib/acoes/*.ts` e `lib/dominio/*.ts`'),
    (r'`src/frontend/\*\.html`',         '`app/**/page.tsx` e `components/**/*.tsx`'),
    (r'src/backend/',                    'lib/acoes/'),
    (r'src/frontend/',                   'app/'),
    (r'`\.gs`/`\.html`',                 '`.ts`/`.tsx`'),
    (r'`\.gs`/frontend',                 'backend/frontend'),
    (r'`\.gs`',                          '`.ts`'),
    (r"'\.gs'",                          "'.ts'"),
    (r'\.gs\b',                          '.ts'),

    # --- ponto de entrada: doGet deixa de existir ------------------------------------
    # No Apps Script, `doGet(e)` era A função que servia a aplicação inteira. No App
    # Router não há ponto de entrada único: cada rota é um arquivo, e o layout raiz
    # envolve todas. Não é renomeação — é a ausência do conceito.
    (r'`doGet\(e\)`',                    '`app/layout.tsx` (layout raiz)'),
    (r'`doGet\(\)`',                     '`app/layout.tsx`'),
    (r'`doGet`',                         '`app/layout.tsx`'),
    (r'\bdoGet\b',                       'o layout raiz'),

    # --- o sandbox do iframe não existe mais -----------------------------------------
    (r'servid[oa] dentro de um iframe do `?script\.google\.com`?[^.\n]*',
     'servida diretamente pela Vercel, sem iframe nem sandbox intermediário'),
    (r'iframe do `?script\.google\.com`?', 'a página servida pela Vercel'),
    (r'`?script\.google\.com`?',          'a URL do projeto na Vercel'),
    (r'\bsandbox do iframe\b',            'isolamento de origem do navegador'),
    (r'\biframe\b',                       'página'),

    # --- gráficos: ApexCharts → Recharts (BRIEF §1) ----------------------------------
    (r'ApexCharts \(CDN[^)]*\)',          'Recharts'),
    (r'\bApexCharts\b',                   'Recharts'),

    # --- entrega de dependência: CDN → pacote versionado -----------------------------
    (r'via CDN',                          'como dependência versionada no `package.json`'),
    (r'\(CDN\)',                          '(pacote npm)'),
]

def main():
    raiz = Path(sys.argv[1]); aplicar = '--aplicar' in sys.argv
    c = Counter()
    for f in sorted(raiz.rglob('*.md')):
        orig = t = f.read_text(encoding='utf-8')
        for pat, rep in REGRAS:
            t, n = re.subn(pat, rep, t)
            if n: c[pat[:44]] += n
        if aplicar and t != orig: f.write_text(t, encoding='utf-8')
    print(f"{'APLICADO' if aplicar else 'SIMULAÇÃO'} · {sum(c.values())} correções")
    for k, v in c.most_common(20): print(f"  {v:5d}  {k}")

if __name__ == '__main__':
    main()
