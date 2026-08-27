#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
traduzir_specs6.py — Passada 6: o que a varredura ampla encontrou.

O QUÊ  : fecha as famílias que as passadas anteriores não previram — a abreviação `GAS`,
         o wrapper `gs()`, a constante `ABAS.*`, o conceito de "Web App", e a integração
         com Google Docs/Drive da Ficha de Docentes.

PARA QUÊ: a Ficha de Docentes (specs 022–026) não usava só a plataforma: usava o Google
         Docs como TEMPLATE e o Drive como ARMAZENAMENTO. Isso não é vocabulário, é
         dependência funcional — e tem substituto direto na v2.1: rota `/print/*` para
         gerar o PDF e Supabase Storage para guardá-lo.
"""
import re, sys
from pathlib import Path
from collections import Counter

REGRAS = [
    # --- Ficha de Docentes: Google Docs + Drive → /print + Supabase Storage ----------
    (r'Template do Google Docs',      'template da rota `/print/ficha-instrutor`'),
    (r'[Tt]emplate Google Docs',      'template da rota `/print/ficha-instrutor`'),
    (r'Google Docs \(PDF\)',          'PDF gerado pela rota `/print/*`'),
    (r'Google Docs',                  'a rota de impressão `/print/*`'),
    (r'Salvar Ficha no Drive',        'Salvar Ficha'),
    (r'salvos? com o ID na raiz do Drive', 'salvos no Supabase Storage'),
    (r'\bna raiz do Drive\b',         'no Supabase Storage'),
    (r'\bno Drive\b',                 'no Supabase Storage'),
    (r'\bdo Drive\b',                 'do Supabase Storage'),
    (r'\bao Drive\b',                 'ao Supabase Storage'),
    # Identificador do código da v2.0 que carrega "Drive" no nome. O botão passou a se
    # chamar apenas "Salvar Ficha" (o destino deixou de ser o Drive), e a função acompanha.
    (r'salvarFichaNoDriveClick_',     'salvarFichaClick_'),
    (r'salvarFichaNoDrive',           'salvarFicha'),
    (r'\bDrive\b',                    'Supabase Storage'),
    (r'\bGoogle Sheet ao vivo\b',     'banco Supabase em produção'),
    (r'\bGoogle Sheet\b',             'banco Supabase'),
    (r'\bSheets\b',                   'PostgreSQL'),
    (r'\bGoogle\b(?! Docs)',          ''),

    # --- abreviação e conceitos do runtime antigo ------------------------------------
    (r'\bGAS\b',                      'Next.js'),
    (r'\bWeb App\b',                  'aplicação Next.js'),
    (r'\bWebApp\b',                   'aplicação Next.js'),

    # --- wrapper gs() e constante ABAS.* --------------------------------------------
    # `gs()` era o invólucro de promessa em volta de `google.script.run`. Server Action já
    # é uma função assíncrona tipada: o invólucro deixa de ter função.
    (r'\(wrapper `?gs\(\)`?[^)]*\)',  '(chamada direta, tipada)'),
    (r'wrapper `?gs\(\)`?',           'chamada direta da Server Action'),
    (r'`gs\(\)`',                     'a Server Action'),
    (r'\bgs\(\)',                     'a Server Action'),
    (r'ABAS\.INSTRUTOR_DISCIPLINA',   "'instrutor_disciplina'"),
    (r'ABAS\.TURMA_DISCIPLINA',       "'turma_disciplina'"),
    (r'ABAS\.USUARIO_CURSO',          "'usuario_curso'"),
    (r'ABAS\.DISCIPLINAS',            "'disciplinas'"),
    (r'ABAS\.INSTRUTORES',            "'instrutores'"),
    (r'ABAS\.TURMAS',                 "'turmas'"),
    (r'ABAS\.([A-Z_]+)',              lambda m: "'" + m.group(1).lower() + "'"),
    (r'\bABAS\b',                     'TABELAS'),

    # --- Bootstrap em minúscula, arquivo de bundle -----------------------------------
    (r'`?bootstrap\.bundle\.min\.js`?', 'o pacote `tailwindcss` + `shadcn/ui`'),
    (r'`?bootstrap\.min\.css`?',      '`app/globals.css`'),
    (r'\bbootstrap\b',                'Tailwind'),

    # --- artigo duplicado que minhas próprias substituições criaram -------------------
    (r'\ba a Server Action\b',        'a Server Action'),
    (r'\bde a Server Action\b',       'da Server Action'),
    (r'\bvia a Server Action\b',      'via Server Action'),
    (r'\bpor a Server Action\b',      'pela Server Action'),
    (r'\bem a Server Action\b',       'na Server Action'),
    (r'\bo o cliente Supabase\b',     'o cliente Supabase'),
    (r'\bde o cliente Supabase\b',    'do cliente Supabase'),
    # ⚠️  NÃO acrescentar aqui uma regra `r'  +' → ' '` para colapsar espaço duplo.
    #     Ela parece inofensiva e destrói TODA a indentação do markdown: lista aninhada,
    #     conteúdo de bloco de código e alinhamento de tabela. Custou 223 linhas indentadas
    #     num único arquivo antes de a verificação pegar. Espaço duplo em prosa é feio;
    #     indentação perdida é documento quebrado.
]

def main():
    raiz = Path(sys.argv[1]); aplicar = '--aplicar' in sys.argv
    c = Counter()
    for f in sorted(raiz.rglob('*.md')):
        t = o = f.read_text(encoding='utf-8')
        for pat, rep in REGRAS:
            t, n = re.subn(pat, rep, t)
            if n: c[pat[:40]] += n
        if aplicar and t != o: f.write_text(t, encoding='utf-8')
    print(f"{'APLICADO' if aplicar else 'SIMULAÇÃO'} · {sum(c.values())} correções")
    for k, v in c.most_common(16): print(f"  {v:5d}  {k}")

if __name__ == '__main__':
    main()
