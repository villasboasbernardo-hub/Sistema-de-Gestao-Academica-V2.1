import * as React from "react";
import { NomeInstrutor, type InstrutorParaExibir } from "ciaara-11-ds";
import { ordenarPorAntiguidade, type EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";

/** Formato do `RF-INSTR-15`: P/G Especialidade Nome Completo, com o nome de guerra em negrito. */
const ANDRADE: InstrutorParaExibir = {
  id: "i-412",
  pg: "CC",
  especialidade: "(T)",
  nomeCompleto: "Paulo Roberto Andrade",
  nomeDeGuerra: "Andrade",
};

export function Padrao() {
  return (
    <p className="text-sm">
      <NomeInstrutor instrutor={ANDRADE} />
    </p>
  );
}

/** A escala vem de `config_listas` no sistema; aqui é insumo da prévia. */
const ESCALA: EscalaDeAntiguidade = {
  CMG: 1,
  CF: 2,
  CC: 3,
  CT: 4,
  "1ºTen": 5,
  "2ºTen": 6,
  SO: 7,
  "1ºSG": 8,
  "2ºSG": 9,
  "3ºSG": 10,
  CB: 11,
  MN: 12,
};

const DA_DISCIPLINA: readonly InstrutorParaExibir[] = [
  {
    id: "i-07",
    pg: "3ºSG",
    especialidade: "-HN",
    nomeCompleto: "Renato Farias Coelho",
    nomeDeGuerra: "Coelho",
  },
  ANDRADE,
  {
    id: "i-21",
    pg: "CT",
    especialidade: "(T)",
    nomeCompleto: "Juliana Prado Monteiro",
    nomeDeGuerra: "Prado",
  },
  {
    id: "i-33",
    pg: "1ºSG",
    especialidade: "-HN",
    nomeCompleto: "Carlos Henrique Moura Lima",
    nomeDeGuerra: "Carlos Moura",
  },
  {
    id: "i-02",
    pg: "CMG",
    especialidade: null,
    nomeCompleto: "Heitor Vasconcelos Lima",
    nomeDeGuerra: "Vasconcelos",
  },
  {
    id: "i-58",
    pg: "SO",
    especialidade: "-EF",
    nomeCompleto: "Edson Luís Barreto",
    nomeDeGuerra: null,
  },
  {
    id: "i-64",
    pg: "1ºTen",
    especialidade: "(T)",
    nomeCompleto: "Marina Duarte Sampaio",
    nomeDeGuerra: "Marina Duarte",
  },
];

/** Uma lista de instrutores — sempre em antiguidade (`RN-ANT-01`), pela função do domínio. */
export function ListaEmAntiguidade() {
  const { ordenados } = ordenarPorAntiguidade(DA_DISCIPLINA, ESCALA);
  return (
    <section className="border-borda rounded-ciaara bg-superficie max-w-md border">
      <h3 className="border-borda border-b px-3 py-2 text-sm font-semibold">
        XI — Hidrografia · C-Ap-HN 2026
      </h3>
      <ul className="flex flex-col gap-1 px-3 py-2 text-sm">
        {ordenados.map((i) => (
          <li key={i.id}>
            <NomeInstrutor instrutor={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Uma linha rotulada: o caso à esquerda, o nome como o componente o desenha à direita. */
function Caso({
  rotulo,
  children,
}: {
  readonly rotulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <dt className="text-texto-suave w-40 shrink-0 text-xs">{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** O destaque é palavra a palavra: nome de guerra que não é contíguo no nome completo também marca. */
export function NomeDeGuerraSeparado() {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <Caso rotulo="Palavras não contíguas">
        <NomeInstrutor
          instrutor={{
            id: "i-33",
            pg: "1ºSG",
            especialidade: "-HN",
            nomeCompleto: "Carlos Henrique Moura Lima",
            nomeDeGuerra: "Carlos Moura",
          }}
        />
      </Caso>
      <Caso rotulo="Palavras contíguas">
        <NomeInstrutor
          instrutor={{
            id: "i-64",
            pg: "1ºTen",
            especialidade: "(T)",
            nomeCompleto: "Marina Duarte Sampaio",
            nomeDeGuerra: "Marina Duarte",
          }}
        />
      </Caso>
    </dl>
  );
}

/** Degradação sem defeito visual: sem nome de guerra, sem especialidade, com acento, civil. */
export function CasosDeFronteira() {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <Caso rotulo="Sem nome de guerra">
        <NomeInstrutor
          instrutor={{
            id: "i-58",
            pg: "SO",
            especialidade: "-EF",
            nomeCompleto: "Edson Luís Barreto",
            nomeDeGuerra: null,
          }}
        />
      </Caso>
      <Caso rotulo="Sem especialidade">
        <NomeInstrutor
          instrutor={{
            id: "i-02",
            pg: "CMG",
            especialidade: null,
            nomeCompleto: "Heitor Vasconcelos Lima",
            nomeDeGuerra: "Vasconcelos",
          }}
        />
      </Caso>
      <Caso rotulo="Nome de guerra acentuado">
        <NomeInstrutor
          instrutor={{
            id: "i-71",
            pg: "CT",
            especialidade: "(T)",
            nomeCompleto: "Ana Lúcia Teixeira",
            nomeDeGuerra: "Lúcia",
          }}
        />
      </Caso>
      <Caso rotulo="Servidora civil">
        <NomeInstrutor
          instrutor={{
            id: "i-90",
            pg: "SCNS",
            especialidade: null,
            nomeCompleto: "Beatriz Nogueira Ramos",
            nomeDeGuerra: "Nogueira",
          }}
        />
      </Caso>
    </dl>
  );
}
