import { GradeAlocacao } from "ciaara-11-ds";

const COLUNAS = [
  { chave: "2026-08-17", rotulo: "SEG 17/08/2026" },
  { chave: "2026-08-18", rotulo: "TER 18/08/2026", destacada: true },
  { chave: "2026-08-19", rotulo: "QUA 19/08/2026", bloqueio: "Data Magna do CIAARA" },
  { chave: "2026-08-20", rotulo: "QUI 20/08/2026", nota: "Ponto facultativo à tarde" },
];

const LINHAS = [
  { chave: "1", rotulo: "1º · 07:50" },
  { chave: "2", rotulo: "2º · 08:40" },
  { chave: "almoco", rotulo: "almoço 11:55–13:05", separadora: true },
  { chave: "6", rotulo: "6º · 13:05" },
  { chave: "7", rotulo: "7º · 13:55" },
];

export function SemanaComBloqueio() {
  const vazia = {};
  return (
    <GradeAlocacao
      rotulo="Grade de alocação da semana"
      colunas={COLUNAS}
      linhas={LINHAS}
      celulas={[
        [
          { conteudo: "XI · Hidrografia", tom: "ocupada" as const, alturaEmLinhas: 2 },
          { conteudo: "Palestra — Segurança da navegação", tom: "nao_letivo" as const },
          { tom: "bloqueada" as const },
          vazia,
        ],
        [
          { coberta: true },
          { conteudo: "PM1 · Navegação", tom: "avaliacao" as const },
          { tom: "bloqueada" as const },
          vazia,
        ],
        [],
        [
          vazia,
          {
            conteudo: "IV · Meteorologia",
            tom: "conflito" as const,
            marcaDeConflito: "conflito de instrutor",
          },
          { tom: "bloqueada" as const },
          { conteudo: "V · Navegação", tom: "ocupada" as const },
        ],
        [vazia, vazia, { tom: "bloqueada" as const }, vazia],
      ]}
      cantoSuperior="TA"
      rodapeDasColunas={["—", "1 avaliação sem posição", "—", "—"]}
    />
  );
}

export function SemRelogio() {
  const semRelogio = { tom: "sem_relogio" as const };
  return (
    <GradeAlocacao
      rotulo="Grade sem relógio: os tempos saem numerados"
      colunas={COLUNAS.slice(0, 3).map(({ chave, rotulo }) => ({ chave, rotulo }))}
      linhas={[
        { chave: "1", rotulo: "1" },
        { chave: "2", rotulo: "2" },
        { chave: "3", rotulo: "3" },
      ]}
      celulas={[
        [semRelogio, semRelogio, semRelogio],
        [semRelogio, semRelogio, semRelogio],
        [semRelogio, semRelogio, semRelogio],
      ]}
      cantoSuperior="TA"
    />
  );
}
