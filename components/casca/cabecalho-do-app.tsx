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
 *
 * ⚠️ **O ANO MORA AQUI DESDE O BLOCO 15** (spec 030, `FR-003`, RT-6 emendada): *"um seletor de ano só, na barra
 * superior, junto do sininho e do tema claro/escuro, valendo para o sistema todo"* — Bernardo Villas Boas, 29/10/2026.
 * Ele saiu das sete páginas que o desenhavam.
 * ⚠️ **SEM `Suspense` EM VOLTA, DE PROPÓSITO** (medido em 29/10/2026): com uma reserva, o servidor mandava o seletor em
 *    dois pedaços — a reserva, com o ano guardado, e o conteúdo, com o do `?ano=` —, e logo depois de abrir
 *    `/instrutores?ano=2027` o DOM tinha os dois `<select>` (um oculto) e o visível dizia 2026 até a troca. Toda página
 *    que desenha este cabeçalho é dinâmica (o layout lê o cookie da sessão e o do ano), então `useSearchParams` não
 *    suspende e o `Suspense` não protegia nada.
 *
 * ⚠️ **O TEXTO SOLTO `nome · perfil` VIROU MENU EM 29/09/2026** (`FR-002` da spec 011), e é
 * substituição, não acréscimo. Ele identificava quem estava dentro **e não oferecia saída nenhuma**:
 * quem entrava pelo preview não conseguia sair, porque `encerrarSessao()` existia sem consumidor. O
 * nome continua à vista em telas largas; o que mudou é que agora ele abre.
 */
import Image from "next/image";

import { MenuDoAvatar } from "@/components/casca/menu-do-avatar";
import { SeletorDeTema } from "@/components/casca/seletor-de-tema";
import { SininhoDeAvisos } from "@/components/casca/sininho-de-avisos";
import { SeletorDeAno, type PropsDoSeletorDeAno } from "@/components/ciaara/seletor-de-ano";
import { rotuloDoPerfil } from "@/lib/dominio/perfis";

export function CabecalhoDoApp({
  nome,
  email,
  perfil,
  fotoUrl,
  aoSair,
  anoEscolhido,
}: {
  readonly nome: string;
  readonly email: string;
  readonly perfil: string;
  readonly fotoUrl: string | null;
  /** A Server Action que encerra a sessão — **chega pronta do layout**. A casca não a
   *  importa: `@/lib/acoes/` é proibido em componente, e a proibição está certa. */
  readonly aoSair: () => Promise<void>;
  /** O ano guardado (ou o de hoje), lido pelo layout — o seletor do cabeçalho (Bloco 15, `FR-003`). */
  readonly anoEscolhido: PropsDoSeletorDeAno;
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
          {nome} · {rotuloDoPerfil(perfil)}
        </span>
        {/* Bloco 15 (spec 030, `FR-003`): o ano do sistema todo, junto do sininho e do tema. */}
        <SeletorDeAno {...anoEscolhido} />
        {/* Spec 022 (Bloco 7, FR-004.1): o sininho de avisos, em toda tela autenticada. */}
        <SininhoDeAvisos />
        <SeletorDeTema />
        <MenuDoAvatar nome={nome} email={email} perfil={perfil} fotoUrl={fotoUrl} aoSair={aoSair} />
      </div>
    </header>
  );
}
