import * as React from "react";
import { SeletorInstrutor, type InstrutorParaExibir } from "ciaara-11-ds";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";

/** A escala `P/G` → peso vem de `config_listas` no sistema; aqui é insumo da prévia. */
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

/**
 * DESORDENADA DE PROPÓSITO, como na vitrine: o seletor ignora a ordem de chegada e mostra em
 * antiguidade (`RN-ANT-01`). A última tem um P/G que a escala não conhece — vai para o fim, com
 * aviso, e não some (`RN-DEG-01`).
 */
const INSTRUTORES: readonly InstrutorParaExibir[] = [
  {
    id: "i-07",
    pg: "3ºSG",
    especialidade: "-HN",
    nomeCompleto: "Renato Farias Coelho",
    nomeDeGuerra: "Coelho",
  },
  {
    id: "i-21",
    pg: "CT",
    especialidade: "(T)",
    nomeCompleto: "Juliana Prado Monteiro",
    nomeDeGuerra: "Prado",
  },
  {
    id: "i-02",
    pg: "CMG",
    especialidade: null,
    nomeCompleto: "Heitor Vasconcelos Lima",
    nomeDeGuerra: "Vasconcelos",
  },
  {
    id: "i-64",
    pg: "1ºTen",
    especialidade: "(T)",
    nomeCompleto: "Marina Duarte Sampaio",
    nomeDeGuerra: "Marina Duarte",
  },
  {
    id: "i-412",
    pg: "CC",
    especialidade: "(T)",
    nomeCompleto: "Paulo Roberto Andrade",
    nomeDeGuerra: "Andrade",
  },
  {
    id: "i-33",
    pg: "1ºSG",
    especialidade: "-HN",
    nomeCompleto: "Carlos Henrique Moura Lima",
    nomeDeGuerra: "Carlos Moura",
  },
  {
    id: "i-58",
    pg: "SO",
    especialidade: "-EF",
    nomeCompleto: "Edson Luís Barreto",
    nomeDeGuerra: null,
  },
  {
    id: "i-71",
    pg: "CT",
    especialidade: "(T)",
    nomeCompleto: "Ana Lúcia Teixeira",
    nomeDeGuerra: "Teixeira",
  },
  {
    id: "i-90",
    pg: "SCNS",
    especialidade: null,
    nomeCompleto: "Beatriz Nogueira Ramos",
    nomeDeGuerra: "Nogueira",
  },
];

/** Abre o painel ao montar: o clique que a pessoa daria no seletor. */
function AbreAoMontar({ children }: { readonly children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-slot="seletor-instrutor"]')?.click();
  }, []);
  return <div ref={ref}>{children}</div>;
}

function Campo({
  rotulo,
  children,
}: {
  readonly rotulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-1">
      <span className="text-texto text-sm leading-none font-medium">{rotulo}</span>
      {children}
    </div>
  );
}

/** Aberto: a lista chegou desordenada e aparece em antiguidade, com o posto desconhecido no fim. */
export function AbertoEmAntiguidade() {
  const [escolhido, definirEscolhido] = React.useState<string | undefined>(undefined);
  return (
    <AbreAoMontar>
      <Campo rotulo="Acrescentar instrutor — XI Hidrografia · C-Ap-HN 2026">
        <SeletorInstrutor
          instrutores={INSTRUTORES}
          escala={ESCALA}
          {...(escolhido === undefined ? {} : { valor: escolhido })}
          aoMudar={definirEscolhido}
        />
      </Campo>
      {/* espaço para o painel flutuante caber dentro da célula */}
      <div aria-hidden="true" className="h-96" />
    </AbreAoMontar>
  );
}

/** Com escolha: o gatilho mostra o nome no formato padronizado, nome de guerra em negrito. */
export function ComEscolha() {
  const [escolhido, definirEscolhido] = React.useState("i-412");
  return (
    <Campo rotulo="Instrutor da unidade 3">
      <SeletorInstrutor
        instrutores={INSTRUTORES}
        escala={ESCALA}
        valor={escolhido}
        aoMudar={definirEscolhido}
        rotulo="Instrutor da unidade 3"
      />
    </Campo>
  );
}

/** Fechado e sem escolha: só a dica. */
export function Fechado() {
  const [escolhido, definirEscolhido] = React.useState<string | undefined>(undefined);
  return (
    <Campo rotulo="Instrutor responsável">
      <SeletorInstrutor
        instrutores={INSTRUTORES}
        escala={ESCALA}
        {...(escolhido === undefined ? {} : { valor: escolhido })}
        aoMudar={definirEscolhido}
        rotulo="Instrutor responsável"
      />
    </Campo>
  );
}

/** Lista vazia por ausência de dado: "não há". */
export function VazioNaoHa() {
  return (
    <Campo rotulo="Instrutor responsável">
      <SeletorInstrutor
        instrutores={[]}
        escala={ESCALA}
        aoMudar={() => {}}
        motivoDoVazio="sem-dado"
      />
    </Campo>
  );
}

/** Lista vazia por recorte de perfil: "você não vê" — existe instrutor, o perfil não alcança. */
export function VazioVoceNaoVe() {
  return (
    <Campo rotulo="Instrutor responsável">
      <SeletorInstrutor
        instrutores={[]}
        escala={ESCALA}
        aoMudar={() => {}}
        motivoDoVazio="sem-permissao"
      />
    </Campo>
  );
}
