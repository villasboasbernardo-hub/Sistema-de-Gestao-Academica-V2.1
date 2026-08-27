#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
traduzir_specs0.py — Passada 0: normalização de identificador quebrado por fim de linha.

O QUÊ  : junta os identificadores que o Spec Kit quebrou ao formatar o markdown em 100
         colunas — `Cad_\\nDisciplinas`, `Apps\\nScript`, `google.script.\\nrun`.

PARA QUÊ: as passadas seguintes usam regex de uma linha só. Um identificador partido ao
         meio simplesmente não casa, e sobrevive à tradução inteira. Foram 11 sobreviventes
         detectados na verificação — poucos, mas cada um é uma menção à plataforma antiga
         num documento que se declara migrado, que é pior do que não ter migrado.

COMO   : para cada identificador conhecido, monta um padrão que tolera uma quebra de linha
         (com a indentação seguinte) entre QUAISQUER dois caracteres. `'\\n?'.join(chars)`
         resolve o caso geral sem precisar adivinhar onde o formatador quebrou.
         O risco de falso positivo é desprezível: são cadeias longas e distintivas.
"""
import re, sys
from pathlib import Path
from collections import Counter

TOKENS = [
    'google.script.run', 'SpreadsheetApp', 'getSheetByName', 'HtmlService',
    'Session.getActiveUser', 'LockService', 'PropertiesService', 'CacheService',
    'Apps Script', 'Google Sheets', 'ApexCharts', 'script.google.com',
    'Cad_Cursos_Regime_Historico', 'Registro_Aulas_E_Atividades',
    'Eventos_Extracurriculares', 'Calendario_Janelas_Curso', 'Avaliacoes_Planejadas',
    '_Arquivo_Avaliacoes_v1', 'Horarios_Tempos_Aula', 'Instrutor_Disciplina',
    'Calendario_Feriados', 'Calendario_Reservas', 'Planejamento_Anual',
    'Responsaveis_Curso', 'Cad_Disciplinas', 'Config_Parametros', 'Turma_Disciplina',
    'Eventos_Globais', 'Config_Listas', 'Cad_Instrutor', 'Turmas_Ativas',
    'Usuario_Curso', '_Migracao_Log', 'Cad_Cursos',
    'ViewInstrutores.html', 'ViewDisciplinas.html', 'ViewCurso.html', 'ViewDsa.html',
    'ViewCronograma.html', 'ViewInicio.html', 'ViewAvaliacoes.html',
    'ViewExtracurriculares.html', 'ViewUsuarios.html', 'ViewRelatorio.html',
    '_Comum.html', '_Estilos.html', 'Index.html',
    'Instrutores.gs', 'Cronograma.gs', 'Crud.gs', 'Liq.gs', 'Core.gs',
    'Estatisticas.gs', 'MotorPreditivo.gs', 'Bootstrap.gs', 'Dsa.gs',
    'RegrasNormativas.gs', 'Avaliacoes.gs', 'Disciplinas.gs', 'Auth.gs',
    'SugestaoDsa.gs', 'Relatorio.gs', 'OsInstrutoria.gs', 'Usuarios.gs',
    'Aulas.gs', 'RegimeCurso.gs',
]

def padrao(tok):
    """Tolera uma quebra de linha (e a indentação seguinte) entre quaisquer dois chars."""
    return re.compile(r'[ \t]*\n[ \t]*'.join(re.escape(c) for c in tok).replace(
        r'[ \t]*\n[ \t]*', r'(?:[ \t]*\n[ \t]*)?', 0))

PADROES = [(re.compile('(?:[ \t]*\n[ \t]*)?'.join(re.escape(c) for c in t)), t)
           for t in sorted(TOKENS, key=len, reverse=True)]

def main():
    raiz = Path(sys.argv[1]); aplicar = '--aplicar' in sys.argv
    c = Counter()
    for f in sorted(raiz.rglob('*.md')):
        orig = t = f.read_text(encoding='utf-8')
        for pat, tok in PADROES:
            def sub(m):
                if '\n' in m.group(0):      # só conta quando REALMENTE havia quebra
                    c[tok] += 1
                    return tok
                return m.group(0)
            t = pat.sub(sub, t)
        if aplicar and t != orig: f.write_text(t, encoding='utf-8')
    print(f"{'APLICADO' if aplicar else 'SIMULAÇÃO'} · {sum(c.values())} identificadores rejuntados")
    for k, v in c.most_common(20): print(f"  {v:4d}  {k}")

if __name__ == '__main__':
    main()
