#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
traduzir_specs4.py — Passada 4: ferramental de teste e reparo de colateral.

O QUÊ  : (a) traduz o ferramental de teste da v2.0 (`node --test`, `vm.runInContext`);
         (b) repara o colateral que as passadas anteriores produziram — crase dobrada,
             prosa dentro de crase, número de versão órfão.

PARA QUÊ: substituir texto dentro de markdown produz colateral previsível. O valor de
         VIEWS já vem com crase (`` `app/...` ``); quando a origem também tinha crase, o
         resultado sai com crase dupla e o markdown renderiza errado. Vale reparar em
         passada própria, com regra explícita, em vez de complicar as regras anteriores.

         O ferramental de teste ficou para o fim de propósito: `node --test` aparece 250
         vezes e é o comando real que o projeto rodava. Trocá-lo por `vitest` só faz
         sentido depois que o resto do vocabulário já está no lugar.
"""
import re, sys
from pathlib import Path
from collections import Counter

REGRAS = [
    # --- (a) ferramental de teste ----------------------------------------------------
    (r'`node --test tests/\*\.test\.js`',   '`pnpm vitest run`'),
    (r'`node --test`',                      '`pnpm vitest run`'),
    (r'node --test',                        'pnpm vitest run'),
    (r'`tests/([a-z_]+)\.test\.js`',        r'`tests/unidade/\1.test.ts`'),
    (r'tests/\*\.test\.js',                 'tests/unidade/*.test.ts'),
    (r'\.test\.js\b',                       '.test.ts'),
    # `vm.runInContext` existia para carregar função pura de dentro de um `.gs`, que não
    # era módulo. Em TypeScript a função pura é `export`ada e o teste simplesmente importa.
    (r'(?:carregad[ao]s? )?via `?vm\.runInContext`?[^.\n]*',
     'importadas diretamente do módulo (`export` explícito, sem carregamento dinâmico)'),
    (r'`?vm\.runInContext`?',               'importação direta do módulo'),
    (r'extraíd[ao]s? do `<script>`[^.\n]*',
     'importadas do módulo correspondente'),

    # --- resto do protocolo de implantação da v2.0 -----------------------------------
    (r'\(o SHA do commit, MANIFESTO, deploy, quickstart completo\)',
     '(commit, PR, preview da Vercel, quickstart completo)'),
    (r'\bMANIFESTO\b',                      'histórico de deploys da Vercel'),
    (r'`?ViewInstrutores`?(?!\.)',          '`app/(app)/instrutores/page.tsx`'),

    # --- (b) reparo de colateral ------------------------------------------------------
    (r'``([^`\n]+)``',                      r'`\1`'),          # crase dobrada
    (r'`a Server Action`',                  'a Server Action'), # prosa não vai em crase
    (r'`o cliente Supabase`',               'o cliente Supabase'),
    (r'`\.from\(<tabela>\)`\(([^)]*)\)',    r'`.from(\1)`'),   # `.from(<tabela>)`('x')
    (r'Recharts \(CDN[^)]*\)',              'Recharts'),
    (r'\(CDN,\s*',                          '('),
    (r'\(CDN\)',                            '(pacote npm)'),
    (r'\bvia CDN\b',                        'como dependência do `package.json`'),

    # --- vocabulário de planilha ------------------------------------------------------
    # ⚠️  "aba" tem TRÊS sentidos neste corpus, e confundi-los estraga a spec:
    #       (a) aba da PLANILHA   → vira "tabela"          ex.: "a aba `Cad_Instrutor`"
    #       (b) aba do NAVEGADOR  → continua "aba"          ex.: "abre em nova aba"
    #       (c) aba do FORMULÁRIO → continua "aba"          ex.: "o formulário tem 3 abas"
    #     A primeira versão desta passada usava `\ba aba\b → a tabela`, que atingiu os três
    #     e produziu "abre uma nova tabela do navegador" em 82 lugares. Só as formas com
    #     nome de tabela colado (tratadas na passada 1, com crase) são seguras aqui.
    (r'\baba da planilha\b',              'tabela'),
    (r'\babas da planilha\b',             'tabelas'),
    (r'\bcoluna/aba nova\b',              'coluna nova'),
    (r'\baba/coluna ausente\b',           'tabela/coluna ausente'),
    (r'\bplanilha viva\b',                'banco de produção'),
    (r'\bplanilha ao vivo\b',             'banco de produção'),
    (r'\bplanilha V2\.0\b',               'banco da v2.1'),
    (r'\bplanilha nova\b',                'banco novo'),
    (r'\bna planilha\b',                  'no banco'),
    (r'\bda planilha\b',                  'do banco'),
    (r'\bA planilha\b',                   'O banco'),
    (r'\ba planilha\b',                   'o banco'),
]

def main():
    raiz = Path(sys.argv[1]); aplicar = '--aplicar' in sys.argv
    c = Counter()
    for f in sorted(raiz.rglob('*.md')):
        orig = t = f.read_text(encoding='utf-8')
        for pat, rep in REGRAS:
            t, n = re.subn(pat, rep, t)
            if n: c[pat[:46]] += n
        if aplicar and t != orig: f.write_text(t, encoding='utf-8')
    print(f"{'APLICADO' if aplicar else 'SIMULAÇÃO'} · {sum(c.values())} correções")
    for k, v in c.most_common(24): print(f"  {v:5d}  {k}")

if __name__ == '__main__':
    main()
