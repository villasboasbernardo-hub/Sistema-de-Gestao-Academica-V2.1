/**
 * Os ícones do menu lateral — **um lugar só** (`FR-001`, `FR-002` da spec 012).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Ícone do `lucide-react` é SVG: ele se desenha no servidor, e um
 * `"use client"` aqui subiria pelo `NavegacaoLateral` até a casca, que envolve **toda** tela do
 * sistema. É a mesma razão pela qual este arquivo existe separado de `lib/navegacao/menu.ts`.
 *
 * ⚠️ **POR QUE O MAPA, E NÃO O COMPONENTE DENTRO DA LISTA DE ENTRADAS.** `lib/navegacao/menu.ts` é
 * importado por teste de unidade e por `tests/e2e/shell.spec.ts` **fora do navegador** — guardar um
 * componente React ali quebraria essas importações. A lista declara um **nome**; a tradução para
 * desenho mora aqui, e a união fechada de `NomeDeIcone` faz entrada sem ícone **não compilar**.
 *
 * ⚠️ **ÍCONE ESCRITO À MÃO É PROIBIDO** (`fronteira-componentes`: nada de `<path`, `<polygon`,
 * `d="M`). Tudo vem do `lucide-react`, que já estava instalado — **zero dependência nova**, medido
 * antes de escrever.
 *
 * ⚠️ **E O ÍCONE NUNCA É O NOME DA ENTRADA.** Ele leva `aria-hidden`; quem nomeia o link é o rótulo,
 * que continua no DOM mesmo recolhido. A fatia (b) do Épico 4 fixou que *"o ícone acompanha o
 * rótulo, nunca o substitui"* — aqui a substituição é **visual**, nunca acessível.
 */
import {
  BookOpenIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  ContactIcon,
  GraduationCapIcon,
  HouseIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

import type { NomeDeIcone } from "@/lib/navegacao/menu";

type Icone = React.ComponentType<React.SVGProps<SVGSVGElement>>;

/**
 * Os oito, escolhidos em 04/10/2026 (dúvida **D2** do plano, na recomendação).
 *
 * ⚠️ `Users` para **Turmas** e `Contact` para **Instrutores** são a escolha que separa as duas: as
 * duas telas falam de pessoas, e dar a mesma figura às duas é o que faz quem navega por ícone errar
 * o clique. Turma é **grupo**; instrutor é **ficha de pessoa**.
 */
const ICONES: Readonly<Record<NomeDeIcone, Icone>> = {
  inicio: HouseIcon,
  cursos: GraduationCapIcon,
  turmas: UsersIcon,
  disciplinas: BookOpenIcon,
  instrutores: ContactIcon,
  cronograma: CalendarDaysIcon,
  atividades: ClipboardListIcon,
  administracao: SettingsIcon,
};

export function IconeDoMenu({ nome }: { readonly nome: NomeDeIcone }) {
  const Desenho = ICONES[nome];
  // veste: a figura da entrada — decorativa, porque o rótulo ao lado é que nomeia o link
  return <Desenho className="size-4 shrink-0" aria-hidden="true" />;
}
