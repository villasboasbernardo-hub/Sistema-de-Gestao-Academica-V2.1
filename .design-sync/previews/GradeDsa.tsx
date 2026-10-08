import { GradeDsa } from "ciaara-11-ds";
import { montarSemana } from "@/lib/dominio/dsa/grade";
import { gradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import { relogioDoRegime } from "@/lib/dominio/dsa/horario-do-bloco";
import { documentoImpresso } from "@/lib/dominio/dsa/impressao";

const RELOGIO = relogioDoRegime({
  regimeTempos: 9,
  taDuracaoMin: 45,
  intervaloManhaMin: 5,
  intervaloTardeMin: 5,
  horaInicioManha: "07:50",
  horaInicioTarde: "13:05",
  configuracaoHorarioId: null,
});

function semanaDeExemplo() {
  return montarSemana({
    dias: ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"],
    relogio: RELOGIO,
    temposDeclarados: 9,
    fatos: [
      {
        fatoId: "a1",
        origem: "aula",
        data: "2026-08-17",
        taInicial: 3,
        tempos: 4,
        herdado: false,
        disciplina: "V",
        conteudo: "UE 2 — Sistemas empregados na navegação",
        tecnica: "EO",
        instrutor: "1ºTEN (T) Marina Duarte",
        local: "Sala 01",
      },
      {
        fatoId: "a2",
        origem: "avaliacao",
        data: "2026-08-18",
        taInicial: 1,
        tempos: 2,
        herdado: false,
        disciplina: "VII",
        conteudo: "PM1 — Navegação Astronômica",
        tecnica: "PM",
        instrutor: "CC (T) Paulo Andrade (FISCAL)",
        local: "Sala 01",
      },
      {
        fatoId: "a3",
        origem: "aula",
        data: "2026-08-20",
        taInicial: 1,
        tempos: 5,
        herdado: false,
        disciplina: "XI",
        conteudo: "UE 4 — Sondagem multifeixe",
        tecnica: "EO",
        instrutor: "CC (T) Paulo Andrade",
        local: "Laboratório de Hidrografia",
      },
      {
        fatoId: "a4",
        origem: "aula",
        data: "2026-08-21",
        taInicial: null,
        tempos: null,
        herdado: true,
        disciplina: "IV",
        conteudo: "Lançamento migrado da planilha",
        tecnica: null,
        instrutor: null,
        local: null,
      },
    ],
    feriados: [{ data: "2026-08-19", descricao: "Data Magna do CIAARA", impacto: "dia_inteiro" }],
    marcas: new Map(),
    hoje: "2026-08-18",
    sabadoAberto: false,
  });
}

const NOMES = new Map([
  ["IV", "Meteorologia"],
  ["V", "Navegação"],
  ["VII", "Navegação Astronômica"],
  ["XI", "Hidrografia"],
]);

export function SemanaNoModeloV4() {
  const semana = semanaDeExemplo();
  return (
    <GradeDsa
      semana={semana}
      grade={gradeDoPapel(
        documentoImpresso(semana, { tecnicas: [], idsDeEstudoIndividual: new Set() }),
        semana.relogio,
        { minimoDeTempos: semana.linhas },
      )}
      nomesDasDisciplinas={NOMES}
      salaDaTurma="Sala 01"
      aoEscolherFato={() => {}}
      aoEscolherCelula={() => {}}
    />
  );
}

export function SemanaComSabado() {
  const semana = montarSemana({
    dias: ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22"],
    relogio: RELOGIO,
    temposDeclarados: 9,
    fatos: [
      {
        fatoId: "s1",
        origem: "aula",
        data: "2026-08-17",
        taInicial: 1,
        tempos: 5,
        herdado: false,
        disciplina: "XI",
        conteudo: "UE 4 — Sondagem multifeixe",
        tecnica: "EO",
        instrutor: "CC (T) Paulo Andrade",
        local: "Sala 01",
      },
      {
        fatoId: "s2",
        origem: "atividade_nao_letiva",
        data: "2026-08-20",
        taInicial: 6,
        tempos: 1,
        herdado: false,
        disciplina: null,
        conteudo: "Tempo para Administração",
        tecnica: "Administração",
        instrutor: null,
        local: "Sala 01",
      },
      {
        fatoId: "s3",
        origem: "aula",
        data: "2026-08-22",
        taInicial: 1,
        tempos: 5,
        herdado: false,
        disciplina: "XI",
        conteudo: "UE 5 — Instalações de sensores hidrográficos",
        tecnica: "EO",
        instrutor: "CC (T) Paulo Andrade",
        local: "Sala 01",
      },
    ],
    feriados: [],
    marcas: new Map(),
    hoje: "2026-08-18",
    sabadoAberto: true,
  });
  return (
    <GradeDsa
      semana={semana}
      grade={gradeDoPapel(
        documentoImpresso(semana, { tecnicas: [], idsDeEstudoIndividual: new Set() }),
        semana.relogio,
        { minimoDeTempos: semana.linhas },
      )}
      nomesDasDisciplinas={NOMES}
      salaDaTurma="Sala 01"
      aoEscolherFato={() => {}}
      aoEscolherCelula={() => {}}
    />
  );
}
