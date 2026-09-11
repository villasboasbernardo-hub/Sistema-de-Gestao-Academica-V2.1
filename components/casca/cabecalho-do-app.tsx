/**
 * O cabeçalho do sistema (`RF-NAV-02`, `RF-INI-05`, `FR-018`, `FR-032.1`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O alternador de tema é folha de cliente e entra como filho; o
 * cabeçalho em si é servidor. Marcá-lo aqui mandaria toda tela do sistema para o navegador.
 *
 * ⚠️ **O BRASÃO É O DE TELA, NUNCA O DE IMPRESSÃO** (`FR-032.1`). Medido: 226 KB contra 6,3 MB, para
 * um desenho que aparece a quarenta pixels de altura. O de impressão existe para a rota `/print/*`,
 * e trocar um pelo outro aqui não muda nada na tela — só o tempo de carregar, e só para quem estiver
 * numa conexão ruim, que é justamente quem não vai reportar.
 *
 * ⚠️ **ELE SUBSTITUI O ALTERNADOR DE TEMA DA VITRINE** (`FR-018`) — substituição, não duplicação.
 * Dois alternadores é o resultado que o `CHK019` previu, e a vitrine perde o dela no mesmo commit.
 */
import Image from "next/image";

import { SeletorDeTema } from "@/components/casca/seletor-de-tema";

export function CabecalhoDoApp({
  nome,
  perfil,
}: {
  readonly nome: string;
  readonly perfil: string;
}) {
  return (
    <header
      data-slot="cabecalho-do-app"
      className="border-borda bg-superficie flex items-center justify-between gap-3 border-b px-4 py-2"
    >
      <div className="flex items-center gap-3">
        <Image
          src="/marca/brasao-ciaara.png"
          alt="Brasão do CIAARA"
          width={28}
          height={40}
          priority
          className="h-10 w-auto"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-texto text-sm font-semibold">CIAARA-11</span>
          {/* veste: o subtítulo identifica a divisão; não é dado de negócio (FR-031 da fatia b) */}
          <span className="text-texto-suave text-2xs">Administração Acadêmica</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-texto-suave hidden text-sm sm:inline">
          {nome} · {perfil}
        </span>
        <SeletorDeTema />
      </div>
    </header>
  );
}
