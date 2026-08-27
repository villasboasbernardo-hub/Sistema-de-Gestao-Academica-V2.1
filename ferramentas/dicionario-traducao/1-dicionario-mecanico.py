#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
traduzir_specs.py — Tradução determinística das specs da v2.0 (Apps Script + Sheets)
                     para a plataforma da v2.1 (Next.js + Supabase).

O QUÊ  : aplica um dicionário CURADO de substituições sobre os 314 arquivos das 39 specs,
         e produz um relatório do que sobrou.

PARA QUÊ: 1.864 menções a Apps Script/Sheets espalhadas por 314 arquivos. Reescrevê-las com
         agente, uma a uma, seria caro e — pior — INCONSISTENTE: o mesmo `Instrutores.gs`
         viraria `instrutores.ts` num arquivo e `acoes-instrutores.ts` noutro. Um dicionário
         garante que a mesma coisa recebe o mesmo nome em toda a suíte.

COMO   : três categorias de tratamento, deliberadamente separadas.

         (1) MECÂNICO — identificador que tem equivalente exato na plataforma nova:
             nome de arquivo, nome de aba, chamada de API, comando de implantação.
             Substituição direta, ordenada da chave mais longa para a mais curta (senão
             `Avaliacoes` estraga `Avaliacoes_Planejadas`).

         (2) PROSA — passagem que descreve MECÂNICA do Apps Script: cota de execução,
             escopo global compartilhado, protocolo de implantação manual, `include()`.
             NÃO se traduz por dicionário — traduzir palavra a palavra produz frase que
             descreve um problema que não existe mais. Fica MARCADA para reescrita.

         (3) HISTÓRICO — menção que deve permanecer: registro de migração, decisão datada,
             de-para da v1.0→v2.0. Protegida por marcador antes das substituições.

Uso: python3 traduzir_specs.py <dir_specs> [--aplicar]
     Sem --aplicar, roda em modo simulação e só imprime o relatório.
"""

import re, sys, os, json
from pathlib import Path
from collections import Counter

# =====================================================================================
# CATEGORIA 3 — HISTÓRICO: trechos que NÃO devem ser traduzidos
# -------------------------------------------------------------------------------------
# Uma spec que diz "a migração transportou de `Cad_Matérias` para `Cad_Disciplinas`" está
# narrando um fato datado da v2.0. Traduzir isso apagaria a trilha — é o Princípio IV
# (Integridade do Histórico) aplicado à documentação. Estas linhas são congeladas antes
# de qualquer substituição e restauradas depois.
# =====================================================================================
LINHAS_HISTORICAS = re.compile(
    r'^.*(?:'
    r'Origem_Migracao_v1|_Legado_v1|Cad_Matérias|Cad_Materias|ID_Materia|Nome_Materia'
    r'|decisão de 20\d\d-\d\d-\d\d|P-14|Missão \d+|v1\.0 →|v1\.0 para|da v1\.0'
    r'|Histórico de revisão|histórico de revisão'
    r').*$',
    re.MULTILINE)

# =====================================================================================
# CATEGORIA 1 — MECÂNICO
# =====================================================================================

# --- 1.1 Módulos de backend: arquivo .gs → módulo TypeScript --------------------------
# `lib/acoes/`   = Server Actions (fazem I/O, falam com o Supabase)
# `lib/dominio/` = regras de negócio puras (sem I/O, sem import de supabase)
# A separação não é cosmética: é o Princípio II da constitution, e é o que permite testar
# as regras `RN-` sem banco.
MODULOS = {
    'Código.gs':                   '`lib/` (monólito da v1.0, hoje dividido por domínio)',
    'Codigo.gs':                   '`lib/` (monólito da v1.0, hoje dividido por domínio)',
    'Core.gs':                     '`lib/supabase/server.ts`',
    'Crud.gs':                     '`lib/acoes/crud.ts`',
    'Auth.gs':                     '`lib/supabase/middleware.ts` + policies RLS',
    'Bootstrap.gs':                '`app/layout.tsx` + `lib/supabase/server.ts`',
    'Instrutores.gs':              '`lib/acoes/instrutores.ts`',
    'Disciplinas.gs':              '`lib/acoes/disciplinas.ts`',
    'TurmaDisciplina.gs':          '`lib/acoes/turma-disciplina.ts`',
    'Cronograma.gs':               '`lib/acoes/cronograma.ts`',
    'Dsa.gs':                      '`lib/acoes/dsa.ts`',
    'SugestaoDsa.gs':              '`lib/dominio/sugestao-dsa.ts`',
    'MotorPreditivo.gs':           '`lib/dominio/motor-preditivo.ts`',
    'RegrasNormativas.gs':         '`lib/dominio/regras-normativas.ts`',
    'RegimeCurso.gs':              '`lib/dominio/regime-curso.ts`',
    'Avaliacoes.gs':               '`lib/acoes/avaliacoes.ts`',
    'Aulas.gs':                    '`lib/acoes/aulas.ts`',
    'Estatisticas.gs':             '`lib/acoes/estatisticas.ts`',
    'Liq.gs':                      '`lib/acoes/liq.ts`',
    'OsInstrutoria.gs':            '`lib/acoes/os-instrutoria.ts`',
    'OsInstrutoriaCursoTurma.gs':  '`lib/acoes/os-instrutoria.ts`',
    'FichaMerge.gs':               '`lib/acoes/ficha-docente.ts`',
    'Relatorio.gs':                '`lib/acoes/relatorio.ts`',
    'Usuarios.gs':                 '`lib/acoes/usuarios.ts`',
    'Dashboards.gs':               '`lib/acoes/dashboards.ts`',
}

# --- 1.2 Views: arquivo .html → rota do App Router ------------------------------------
VIEWS = {
    'ViewInstrutores.html':        '`app/(app)/instrutores/page.tsx`',
    'ViewDisciplinas.html':        '`app/(app)/disciplinas/page.tsx`',
    'ViewCurso.html':              '`app/(app)/cursos/[curso]/page.tsx`',
    'ViewCursos.html':             '`app/(app)/cursos/page.tsx`',
    'ViewDsa.html':                '`app/(app)/turmas/[turma]/dsa/page.tsx`',
    'ViewCronograma.html':         '`app/(app)/cronograma/page.tsx`',
    'ViewInicio.html':             '`app/(app)/inicio/page.tsx`',
    'ViewAvaliacoes.html':         '`app/(app)/avaliacoes/page.tsx`',
    'ViewExtracurriculares.html':  '`app/(app)/atividades/page.tsx`',
    'ViewUsuarios.html':           '`app/(app)/admin/usuarios/page.tsx`',
    'ViewRelatorio.html':          '`app/(app)/relatorio/page.tsx`',
    'ViewFeriados.html':           '`app/(app)/admin/calendario/page.tsx`',
    'ModalLancamentoAula.html':    '`components/ciaara/ModalLancamentoAula.tsx`',
    '_Comum.html':                 '`components/ciaara/`',
    '_Estilos.html':               '`app/globals.css`',
    'Index.html':                  '`app/layout.tsx`',
    'template_ficha_nova.html':    '`app/print/ficha-instrutor/page.tsx`',
}

# --- 1.3 Abas do Sheets → tabelas do PostgreSQL ---------------------------------------
# Nomes exatos do BRIEF §2.1. A ordem de aplicação é resolvida por comprimento (ver
# `montar_regras`), senão `Avaliacoes` mutila `Avaliacoes_Planejadas`.
TABELAS = {
    'Cad_Cursos_Regime_Historico': 'curso_regime_historico',
    'Registro_Aulas_E_Atividades': 'registros_aula',
    'Eventos_Extracurriculares':   'atividades_nao_letivas',
    'Calendario_Janelas_Curso':    'janelas_curso',
    'Avaliacoes_Planejadas':       'avaliacoes_planejadas',
    '_Arquivo_Avaliacoes_v1':      'arquivo_avaliacoes_v1',
    'Horarios_Tempos_Aula':        'horarios_tempos_aula',
    'Instrutor_Disciplina':        'instrutor_disciplina',
    'Calendario_Feriados':         'feriados',
    'Calendario_Reservas':         'reservas_proens',
    'Planejamento_Anual':          'planejamento_anual',
    'Responsaveis_Curso':          'responsaveis_curso',
    'Cad_Disciplinas':             'disciplinas',
    'Config_Parametros':           'config_parametros',
    'Turma_Disciplina':            'turma_disciplina',
    'Eventos_Globais':             'feriados',
    'Config_Listas':               'config_listas',
    'Cad_Instrutor':               'instrutores',
    'Turmas_Ativas':               'turmas',
    'Usuario_Curso':               'usuario_curso',
    '_Migracao_Log':               'migracao_log',
    'Cad_Cursos':                  'cursos',
    'Avaliacoes':                  'avaliacoes',
    'Usuarios':                    'usuarios',
}

# --- 1.4 APIs e serviços --------------------------------------------------------------
APIS = {
    'google.script.run.withSuccessHandler': 'a Server Action (retorno tipado)',
    'google.script.run.withFailureHandler': 'o tratamento de erro da Server Action',
    'google.script.run':                    'a Server Action',
    'SpreadsheetApp.getActiveSpreadsheet()': '`createClient()` (cliente Supabase de servidor)',
    'SpreadsheetApp.openById':              '`createClient()`',
    'SpreadsheetApp':                       'o cliente Supabase',
    'getSheetByName':                       '`.from(<tabela>)`',
    '.getDataRange().getValues()':          '`.select()`',
    '.getRange(':                           '`.select(` ',
    '.getValues()':                         '`.select()`',
    '.setValues(':                          '`.update(`',
    '.appendRow(':                          '`.insert(`',
    'Session.getActiveUser().getEmail()':   '`(await supabase.auth.getUser()).data.user.email`',
    'Session.getActiveUser()':              '`supabase.auth.getUser()`',
    'LockService':                          'a transação do PostgreSQL',
    'PropertiesService':                    '`config_parametros` (ou variável de ambiente)',
    'CacheService':                         'o cache do Next.js (`revalidateTag`)',
    'Utilities.formatDate':                 '`Intl.DateTimeFormat` (fuso `America/Sao_Paulo`)',
    'Utilities.formatString':               'template literal',
    'HtmlService.createTemplateFromFile':   'o App Router (composição de componentes)',
    'HtmlService':                          'o App Router',
    'DocumentApp':                          'a rota de impressão `/print/*`',
    'DriveApp':                             'o Supabase Storage',
    'ScriptApp':                            'o runtime do Next.js',
}

# --- 1.5 Implantação: o protocolo inteiro muda ---------------------------------------
IMPLANTACAO = {
    'clasp login':   '`vercel login`',
    'clasp push':    '`git push` (a Vercel publica a preview da branch)',
    'clasp deploy':  'o merge na `main` (a Vercel publica em produção)',
    'clasp pull':    '`git pull`',
    'clasp':         'o fluxo Git → Vercel',
    'BUILD_ID':      'o SHA do commit',
    'implantacao/MANIFESTO.md': 'o histórico de deploys da Vercel',
    'MANIFESTO.md':  'o histórico de deploys da Vercel',
}

# --- 1.6 Vocabulário de plataforma ----------------------------------------------------
VOCABULARIO = {
    'aba de fato':          'tabela de fato',
    'aba de cadastro':      'tabela de cadastro',
    'abas de fato':         'tabelas de fato',
    # 'nova aba' NÃO entra aqui: na esmagadora maioria das ocorrências é aba do
    # NAVEGADOR ("o PDF abre em nova aba"), não aba da planilha. Traduzir produziu
    # "abre em nova tabela" em 82 lugares. Aba de planilha só é traduzida quando vem
    # com o nome colado, nas quatro formas com crase abaixo.
    'a aba `':              'a tabela `',
    'da aba `':             'da tabela `',
    'na aba `':             'na tabela `',
    'à aba `':              'à tabela `',
    'planilha viva':        'banco de produção',
    'planilha ao vivo':     'banco de produção',
    'planilha v2.0':        'banco da v2.0',
    'a planilha':           'o banco',
    'da planilha':          'do banco',
    'na planilha':          'no banco',
    'Google Sheets como banco': 'PostgreSQL como banco',
    'Google Sheets':        'PostgreSQL',
    'Google Apps Script':   'Next.js',
    'Apps Script V8':       'Next.js (App Router)',
    'Vanilla JS/Bootstrap 5': 'React + Tailwind CSS',
    'Vanilla JS':           'React',
    # As versões vêm coladas no nome ('Bootstrap 5.3.3'). Sem capturá-las, a
    # substituição deixa órfão o número: 'Tailwind CSS + shadcn/ui.3.3'. A ordem por
    # comprimento decrescente de `montar_regras` garante que a forma mais longa vence.
    'Bootstrap 5.3.3':      'Tailwind CSS + shadcn/ui',
    'Bootstrap 5.3':        'Tailwind CSS + shadcn/ui',
    'Bootstrap 5':          'Tailwind CSS + shadcn/ui',
    'Bootstrap':            'Tailwind CSS',
    'ApexCharts 3.x':       'Recharts',
    'ApexCharts':           'Recharts',
    'Chart.js 4':           'Recharts',
    'Chart.js':             'Recharts',
    'Font Awesome 6':       'lucide-react',
    'Font Awesome':         'lucide-react',
}

# =====================================================================================
# CATEGORIA 2 — PROSA: marcar, não traduzir
# -------------------------------------------------------------------------------------
# Estes padrões descrevem MECÂNICA da plataforma antiga. Substituir termo por termo aqui
# produz uma frase gramaticalmente correta que descreve um problema inexistente — o pior
# resultado possível numa spec, porque parece certa.
# =====================================================================================
PADROES_PROSA = [
    (r'escopo global',                      'gotcha do escopo global compartilhado dos .gs'),
    (r'código executável de nível superior','ordem de carga dos arquivos .gs'),
    (r'cota[s]? de execução',               'cotas do runtime Apps Script'),
    (r'tempo de execução por chamada',      'limite de execução do Apps Script'),
    (r'colar (o conteúdo|no editor|os arquivos)', 'implantação manual por cópia'),
    (r'implantaç(ão|ões) órfã',             'implantações órfãs do Apps Script'),
    (r'include\(\)',                        'mecanismo include() do HtmlService'),
    (r'substituição completa de arquivo',   'protocolo de deploy manual'),
    (r'Gerenciar implantações',             'painel de deploy do Apps Script'),
]


def montar_regras():
    """Ordena todas as substituições da chave mais longa para a mais curta.

    PARA QUÊ: sem isso, `Avaliacoes` casa dentro de `Avaliacoes_Planejadas` e produz
    `avaliacoes_Planejadas` — um nome que não existe em lugar nenhum. Ordenar por
    comprimento decrescente resolve a classe inteira de sobreposição de uma vez.
    """
    regras = []
    for grupo, d in (('modulo', MODULOS), ('view', VIEWS), ('api', APIS),
                     ('implantacao', IMPLANTACAO), ('tabela', TABELAS),
                     ('vocabulario', VOCABULARIO)):
        for k, v in d.items():
            regras.append((grupo, k, v))
    return sorted(regras, key=lambda r: -len(r[1]))


def traduzir(texto, contador):
    """Aplica as regras preservando as linhas históricas."""
    # 1. Congela as linhas que narram a história — elas não se traduzem.
    congeladas = []
    def congelar(m):
        congeladas.append(m.group(0))
        return f'\x00HIST{len(congeladas)-1}\x00'
    texto = LINHAS_HISTORICAS.sub(congelar, texto)

    # 2. Substituições mecânicas, da chave mais longa para a mais curta.
    for grupo, velho, novo in montar_regras():
        if velho in texto:
            n = texto.count(velho)
            texto = texto.replace(velho, novo)
            contador[f'{grupo}:{velho}'] += n

    # 3. Restaura o histórico.
    for i, orig in enumerate(congeladas):
        texto = texto.replace(f'\x00HIST{i}\x00', orig)
    return texto


RESIDUAL = re.compile(
    r'Apps Script|google\.script\.run|getSheetByName|SpreadsheetApp|HtmlService'
    r'|\b[A-Za-zÇç]+\.gs\b|Google Sheets|\bclasp\b|LockService|Session\.getActiveUser',
    re.IGNORECASE)


def main():
    raiz = Path(sys.argv[1])
    aplicar = '--aplicar' in sys.argv
    contador, residuais, prosa = Counter(), [], Counter()

    arquivos = sorted(raiz.rglob('*.md'))
    for f in arquivos:
        orig = f.read_text(encoding='utf-8')
        novo = traduzir(orig, contador)
        if aplicar and novo != orig:
            f.write_text(novo, encoding='utf-8')
        for m in RESIDUAL.finditer(novo):
            ini = max(0, m.start() - 90); fim = min(len(novo), m.end() + 90)
            residuais.append((str(f.relative_to(raiz)), m.group(0),
                              novo[ini:fim].replace('\n', ' ')))
        for pat, rot in PADROES_PROSA:
            n = len(re.findall(pat, novo, re.IGNORECASE))
            if n: prosa[rot] += n

    print(f"{'APLICADO' if aplicar else 'SIMULAÇÃO'} · {len(arquivos)} arquivos\n")
    print(f"=== SUBSTITUIÇÕES MECÂNICAS: {sum(contador.values())} ===")
    por_grupo = Counter()
    for k, v in contador.items(): por_grupo[k.split(':')[0]] += v
    for g, n in por_grupo.most_common(): print(f"  {g:14s} {n:5d}")
    print(f"\n  top 15 chaves:")
    for k, v in contador.most_common(15): print(f"    {v:4d}  {k}")

    print(f"\n=== RESIDUAIS (exigem reescrita de prosa): {len(residuais)} ===")
    porarq = Counter(r[0] for r in residuais)
    print(f"  em {len(porarq)} arquivos · top 12:")
    for a, n in porarq.most_common(12): print(f"    {n:4d}  {a}")
    print(f"\n  por termo:")
    for t, n in Counter(r[1] for r in residuais).most_common(12): print(f"    {n:4d}  {t}")

    print(f"\n=== PROSA a reescrever ===")
    for r, n in prosa.most_common(): print(f"  {n:4d}  {r}")

    Path('/home/claude/residuais.json').write_text(
        json.dumps({'residuais': residuais, 'por_arquivo': dict(porarq)},
                   ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"\n→ detalhe em /home/claude/residuais.json")


if __name__ == '__main__':
    main()
