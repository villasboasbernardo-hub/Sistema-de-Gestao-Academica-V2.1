import * as React from "react";
import { Label, SeletorTurma, type TurmaParaExibir } from "ciaara-11-ds";

/**
 * Rótulo no formato `código · Situação` (`FR-034`), na ordem em que chega — quem chama ordena
 * (ano ↓, início ↓). O `id` é o valor da escolha; o que a pessoa lê é sempre o rótulo.
 */
const TURMAS: readonly TurmaParaExibir[] = [
  { id: "C-Ap-HN 2027", rotulo: "C-Ap-HN 2027 · Planejada" },
  { id: "C-Ap-HN 2026", rotulo: "C-Ap-HN 2026 · Ativa" },
  { id: "CAHO 2026", rotulo: "CAHO 2026 · Ativa" },
  { id: "C-Espc-HN 2026", rotulo: "C-Espc-HN 2026 · Ativa" },
  { id: "C-ApA-PCN-PR-EAD T2 2026", rotulo: "C-ApA-PCN-PR-EAD T2 2026 · Ativa" },
  { id: "C-Ap-HN 2025", rotulo: "C-Ap-HN 2025 · Concluída" },
];

/**
 * A seleção do Radix abre por tecla ou ponteiro, não por `click()`: a prévia manda a mesma tecla
 * (`Enter`) que a pessoa usaria com o foco no gatilho.
 *
 * A margem é da cena: aberta, a seleção trava a rolagem e zera o padding do `body` — sem ela o
 * campo encostaria no canto e a lista seria empurrada pela margem de colisão do Radix.
 */
function AbreAoMontar({ children }: { readonly children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const gatilho = ref.current?.querySelector<HTMLElement>('[data-slot="seletor-turma"]');
    gatilho?.focus();
    gatilho?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  }, []);
  return (
    <div ref={ref} className="p-6">
      {children}
    </div>
  );
}

function Campo({
  id,
  rotulo,
  children,
}: {
  readonly id: string;
  readonly rotulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}

/** Aberta: as opções são os rótulos, e a escolhida leva a marca de seleção. */
export function Aberta() {
  const [turma, definirTurma] = React.useState("C-Ap-HN 2026");
  return (
    <AbreAoMontar>
      <Campo id="turma-aberta" rotulo="Turma">
        <SeletorTurma
          id="turma-aberta"
          turmas={TURMAS}
          valor={turma}
          aoMudar={definirTurma}
          className="w-72"
        />
      </Campo>
      {/* espaço para a lista caber dentro da célula */}
      <div aria-hidden="true" className="h-56" />
    </AbreAoMontar>
  );
}

/** Com escolha: o gatilho mostra o rótulo da turma, nunca o identificador. */
export function ComEscolha() {
  const [turma, definirTurma] = React.useState("CAHO 2026");
  return (
    <Campo id="turma-escolhida" rotulo="Turma">
      <SeletorTurma
        id="turma-escolhida"
        turmas={TURMAS}
        valor={turma}
        aoMudar={definirTurma}
        className="w-72"
      />
    </Campo>
  );
}

/** Sem escolha: a dica nasce do rótulo do campo ("Escolha a turma"). */
export function SemEscolha() {
  const [turma, definirTurma] = React.useState<string | undefined>(undefined);
  return (
    <Campo id="turma-sem-escolha" rotulo="Turma">
      <SeletorTurma
        id="turma-sem-escolha"
        turmas={TURMAS}
        {...(turma === undefined ? {} : { valor: turma })}
        aoMudar={definirTurma}
        className="w-72"
      />
    </Campo>
  );
}

/** Lista vazia não vira um seletor mudo: aparece o estado vazio (`RN-DEG-01`). */
export function SemTurmas() {
  return (
    <div className="flex flex-col gap-1">
      {/* sem controle de escolha, o rótulo não aponta para campo nenhum */}
      <span className="text-texto text-sm leading-none font-medium">Turma</span>
      <SeletorTurma turmas={[]} aoMudar={() => {}} />
    </div>
  );
}
