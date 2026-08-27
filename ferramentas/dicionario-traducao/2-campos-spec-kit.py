#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
traduzir_specs2.py — Segunda passada: campos estruturados do template Spec Kit.

O QUÊ  : reescreve por inteiro os campos do `plan.md` que declaram a plataforma, e as
         linhas do Constitution Check que citam o Princípio III.

PARA QUÊ: a primeira passada resolveu 6.319 identificadores e deixou 128 menções a
         "Apps Script" em prosa. Olhando onde elas moram, quase todas estão em CAMPOS
         DE FORMULÁRIO do template Spec Kit — `**Language/Version**:`,
         `**Target Platform**:`, `**Project Type**:` — idênticos nas 39 specs.

         Campo de formulário não se traduz palavra a palavra: substitui-se o valor
         inteiro. "Apps Script Web App (`doGet`), servido dentro de um iframe do
         script.google.com" não vira "Next.js Web App (`doGet`) servido num iframe" —
         vira a declaração correta da plataforma nova, e ponto.

COMO   : regex por campo, do início do rótulo até a linha em branco seguinte.
         Preserva o que é conteúdo da spec (ex.: a lista de tabelas em `**Storage**`)
         e troca só o que é declaração de plataforma.
"""

import re, sys
from pathlib import Path
from collections import Counter

# =====================================================================================
# Campos do bloco "Technical Context" — valor inteiro substituído
# -------------------------------------------------------------------------------------
# O padrão captura do rótulo até a próxima linha em branco, porque o Spec Kit quebra
# valores longos em várias linhas.
# =====================================================================================
CAMPOS = {
    'Language/Version':
        'TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; '
        'SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.',

    'Target Platform':
        'Next.js (App Router) publicado na Vercel, com preview por branch; '
        'navegador desktop moderno (o sistema é de gestão, com tabelas densas — '
        'ver `RNF-USA-02`).',

    'Testing':
        'Vitest para as funções puras de `lib/dominio/` (uma asserção nomeada por regra '
        '`RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO '
        'de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. '
        'Não regressão se prova por invariante, nunca por diff com a saída histórica de um '
        'curso (decisão de 2026-08-10).',

    'Project Type':
        'Aplicação web Next.js com App Router. **Server Components por padrão**; '
        '`"use client"` apenas em componente-folha com interação. Sem SPA servida por '
        'template — o roteamento é do framework, e o estado de tela vive na URL.',
}

# Rótulos cujo valor NÃO se substitui por inteiro: o conteúdo pertence à spec.
# Aqui só se corrige o miolo de plataforma, preservando a lista de tabelas/regras.
CORRECOES_PONTUAIS = [
    # --- declaração de dependências -----------------------------------------------
    (r'\*\*Primary Dependencies\*\*:\s*Bootstrap[^\n]*(?:\n(?!\n)[^\n]*)*',
     '**Primary Dependencies**: Next.js, React, `@supabase/ssr` e `@supabase/supabase-js`, '
     'Tailwind CSS v4, shadcn/ui (Radix + `cva`), Zod, `nuqs`, Recharts. '
     'Nenhuma dependência fora desta lista sem decisão registrada.'),

    # --- armazenamento ---------------------------------------------------------------
    (r'\*\*Storage\*\*:\s*(?:PostgreSQL|Google Sheets)[^\n—-]*[—-]?\s*',
     '**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — '),

    # --- Constitution Check, Princípio III -------------------------------------------
    (r'(\|\s*III\.\s*Restrição de Plataforma\s*\|\s*(?:PASSA|PASS)\s*[—-]\s*)'
     r'(?:Apps Script|Next\.js)[^|]*?(\||\n)',
     r'\1Next.js (App Router) + Supabase PostgreSQL + TypeScript `strict` + '
     r'Tailwind/shadcn intactos; nenhuma dependência nova fora da lista do '
     r'Princípio III da constitution v2.1. \2'),

    # --- o gotcha da plataforma mudou de assunto -------------------------------------
    (r'[Gg]otcha crítico de (?:Apps Script|Next\.js)[^.\n]*',
     'gotcha crítico da plataforma — a fronteira Server/Client Component e o '
     'isolamento da chave `service_role`'),

    # --- ambiente/projeto -------------------------------------------------------------
    (r'(?:o |O |do |ao )?projeto Apps Script(?: v2\.0)?',
     'o projeto Supabase e o repositório Next.js'),
    (r'[Aa]plicaç(?:ão|ao) web Apps Script',
     'aplicação web Next.js'),
    (r'(?:serviços|recursos) nativos do Apps Script',
     'recursos nativos do Next.js e do Supabase'),
    (r'mecanismo nativo do Apps Script \(`?[^`)]*`?\)',
     'mecanismo de composição de componentes do App Router'),
    (r'(?:limite|cota)[s]? de execução do Apps Script[^.\n]*',
     'limite de execução da função serverless da Vercel (padrão de 10 s no plano Hobby, '
     '60 s no Pro; operação longa vai para RPC no banco ou rotina de fundo)'),
    (r'execução do Apps Script \(`Extensões >[^)]*\)',
     'execução na Vercel (painel de Logs do projeto)'),
    (r'deploy de Apps Script', 'deploy na Vercel'),

    # --- include() / HtmlService: o mecanismo deixou de existir -----------------------
    (r'`?include\(\)`? do `?HtmlService`?',
     'a composição de componentes do App Router'),
    (r'`?HtmlService`?/`?include\(\)`?',
     'App Router (layout + componentes)'),
    (r'mecanismo `?include\(\)`?',
     'composição de componentes'),
    (r'`include\(\)`', 'a importação de componentes'),
    (r'\binclude\(\)', 'a importação de componentes'),

    # --- escopo global dos .gs: substituído pelo módulo ES ---------------------------
    (r'escopo global compartilhado(?: (?:dos|de) [^,.\n]*)?',
     'módulo ES com escopo próprio por arquivo (o problema de escopo global '
     'compartilhado deixou de existir)'),
    (r'(?:um )?único escopo global',
     'escopo de módulo isolado por arquivo'),
    (r'código executável de nível superior[^.\n]*',
     'importação estática de módulo, resolvida pelo empacotador'),

    # --- implantação manual -----------------------------------------------------------
    (r'colar (?:o conteúdo|os arquivos|no editor)[^.\n]*',
     'abrir PR e deixar a Vercel publicar a preview da branch'),
    (r'Gerenciar implantações', 'o painel de Deployments da Vercel'),
    (r'implantaç(ão|ões) órfã(s)?', r'deploy\1 sem rastro de commit'),
    (r'substituição completa de arquivo(?: nunca edição parcial)?',
     'commit atômico revisado por PR'),

    # --- sobras genéricas --------------------------------------------------------------
    (r'\bApps Script\b', 'Next.js'),
    (r'\bGoogle Sheets\b', 'PostgreSQL'),
    (r'\bclasp\b', 'o fluxo Git → Vercel'),
]


def campo(texto, rotulo, valor, contador):
    """Substitui o valor inteiro de um campo `**Rótulo**:` até a linha em branco."""
    pat = re.compile(r'\*\*' + re.escape(rotulo) + r'\*\*:\s*(?:[^\n]*)(?:\n(?!\n)[^\n]*)*')
    def sub(m):
        contador[f'campo:{rotulo}'] += 1
        return f'**{rotulo}**: {valor}'
    return pat.sub(sub, texto)


def main():
    raiz = Path(sys.argv[1]); aplicar = '--aplicar' in sys.argv
    contador = Counter()
    for f in sorted(raiz.rglob('*.md')):
        orig = t = f.read_text(encoding='utf-8')
        for rot, val in CAMPOS.items():
            t = campo(t, rot, val, contador)
        for pat, rep in CORRECOES_PONTUAIS:
            t, n = re.subn(pat, rep, t)
            if n: contador[f'regex:{pat[:46]}'] += n
        if aplicar and t != orig:
            f.write_text(t, encoding='utf-8')
    print(f"{'APLICADO' if aplicar else 'SIMULAÇÃO'} · {sum(contador.values())} correções\n")
    for k, v in contador.most_common(30):
        print(f"  {v:5d}  {k}")


if __name__ == '__main__':
    main()
