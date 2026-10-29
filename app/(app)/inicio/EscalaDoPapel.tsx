/**
 * O papel do DSA enquadrado na janela — folha de cliente (Bloco 11, RD-7; spec 029, Bloco 14, item 8, `FR-008.3`).
 *
 * > *"o PAPEL impresso do DSA (o mesmo componente da impressão, verde e amarelo), reduzido e ocupando a largura da
 * > página"* — Bernardo Villas Boas, 26/10/2026
 *
 * ⚠️ **EMENDA DE 28/10/2026** (spec 029, `FR-008`, que emenda o FR-008.1 e a D-31 da spec 026): a escala saía **só da
 *    largura**, e em 1366 × 768 ela passava de 1 — o papel ficava com ~900 px numa janela de 768. Agora ela sai de
 *    `escalaQueCabe` (`lib/dominio/enquadramento-do-papel.ts`): a menor entre a largura da caixa e a **altura que
 *    sobra na janela**, com piso de 0,35 (D-22). Em 1366 × 768 e 1920 × 1080 o papel aparece inteiro, sem rolar, no
 *    topo do Início.
 * ⚠️ **O PAPEL NÃO MUDA**: ele continua com 297 × 210 mm (`documento.css`), e quem o reduz é uma escala de CSS sobre a
 *    folha inteira — redesenhá-lo em outra medida faria a tela mostrar um papel que não é o impresso.
 * ⚠️ **A ALTURA DISPONÍVEL** é a altura visível da janela (`document.documentElement.clientHeight`) menos o topo da
 *    caixa **no documento** (`top` + `scrollY`: não depende de onde se rolou, e a legenda, que fica acima, já está
 *    nele) menos a **folga abaixo** — o que o carrossel desenha sob o papel: o respiro do trilho, a barra de rolagem
 *    horizontal dele quando o sistema a desenha (Windows; o navegador sem tela do Playwright a esconde) e, com 2 papéis
 *    ou mais, os controles *Anterior · Próximo · Pausar* (D-20: trocar de turma não exige rolar). A folga é **medida**
 *    — o fundo do carrossel menos o fundo do item —, não somada de classes: o item é esticado à altura do trilho, então
 *    a medida não muda com a escala dos outros papéis. ⚠️ **NÃO entra o `p-4` do `<main>`**: ele fica no pé da página,
 *    depois dos cartões do ano, e não embaixo do papel (veredito da triagem do item 8).
 * ⚠️ **REFAZ QUANDO** a janela muda (o `resize`: a altura da janela não muda o tamanho da caixa), a caixa muda (a lateral
 *    recolhida, fixada ou apontada mexe na largura) e o `<main>` ou o `<body>` mudam (o painel de *Filtros* aberto acima
 *    empurra o papel e o encolhe — D-27; a fonte que carrega; e o cabeçalho e a faixa, que ficam fora do `<main>`). O
 *    `<html>` não serve: ele tem `h-full`, a altura da janela, e não cresce com o conteúdo.
 * ⚠️ **SÓ GRAVA QUANDO A ESCALA MUDA**, com 3 casas e **para baixo**: o arredondamento para cima poria a folha até meio
 *    pixel além da janela; e gravar a mesma escala de novo a cada observação seria um laço com o próprio observador.
 *    ⚠️ **E SÓ SOBE COM FOLGA** (`regravarAEscala`, revisão do Bloco 14, achado 4): a guarda acima não impedia a
 *    ALTERNÂNCIA causada pela barra de rolagem vertical clássica (Windows) — a escala maior faz a página passar da
 *    janela, a barra aparece e estreita a caixa, a escala cai, a barra some, e o papel piscava entre dois tamanhos.
 *    Diminuir grava sempre; aumentar, só quando a altura disponível cresce ou a largura cresce mais que uma barra.
 * ⚠️ **CENTRADO (D-21)**: quando a altura limita, sobra largura, e o papel fica no meio, como a folha na rota de
 *    impressão. Abaixo do piso (janela estreita, telefone), a caixa **rola** — a página não (`min-w-0` do `<main>`,
 *    `RNF-COMP-01`) —, em vez de cortar a folha calada: na horizontal, e também na vertical quando a barra horizontal
 *    clássica come a altura reservada.
 * ⚠️ **SAI DO SERVIDOR VISÍVEL (D-28; `RN-DEG-01`)**: antes da medição, a caixa reserva a **proporção da folha pela
 *    largura** e mostra o papel no tamanho da impressão; a medição só ajusta a escala. Escondê-la até medir deixaria a
 *    tela sem papel nenhum se o script não rodasse. `data-escala` só aparece depois da medição.
 *    ⚠️ **ANTES DE MEDIR, A CAIXA ROLA NOS DOIS EIXOS** (achado 3): a folha em escala 1 é mais alta que a proporção
 *    reservada quando a caixa é mais estreita que ela (1366 × 768 com a lateral fixada), e com `overflow-y-hidden` o pé
 *    — as assinaturas — sumia sem rolagem. `overflow-auto` vale também depois da medição: ali a moldura tem a altura
 *    da caixa e a largura que cabe nela, e nenhuma barra aparece.
 * ⚠️ **SEM COR**: só medida.
 */
"use client";

import * as React from "react";

import {
  ALTURA_DA_FOLHA_PX,
  LARGURA_DA_FOLHA_PX,
  escalaQueCabe,
  regravarAEscala,
  type MedidaDoPapel,
} from "@/lib/dominio/enquadramento-do-papel";

/** A escala com 3 casas, para baixo — a folha nunca passa do espaço medido por arredondamento. */
function tresCasasParaBaixo(escala: number): number {
  return Math.floor(escala * 1000 + 1e-6) / 1000;
}

/**
 * O que o carrossel desenha abaixo do papel: o fundo do carrossel menos o fundo do item (esticado à altura do trilho).
 * Fora de um carrossel, nada.
 */
function folgaAbaixo(caixa: HTMLElement): number {
  const item = caixa.closest('[data-slot="item-do-carrossel"]');
  const carrossel = caixa.closest('[data-carrossel="sim"]');
  if (item === null || carrossel === null) return 0;
  return Math.max(
    0,
    carrossel.getBoundingClientRect().bottom - item.getBoundingClientRect().bottom,
  );
}

export function EscalaDoPapel({ children }: { readonly children: React.ReactNode }) {
  const caixa = React.useRef<HTMLDivElement>(null);
  /* `null` = ainda não medido: é o que o servidor desenha (D-28). */
  const [escala, definirEscala] = React.useState<number | null>(null);
  /* A medida da última escala gravada — a referência da histerese (`regravarAEscala`). */
  const gravada = React.useRef<MedidaDoPapel | null>(null);

  /*
   * ⚠️ `useLayoutEffect`: na navegação dentro da aplicação, a medida entra antes da primeira pintura, sem o papel
   *    aparecer grande e encolher. Na primeira carga o HTML do servidor já foi pintado — é a D-28 que cobre esse quadro.
   */
  React.useLayoutEffect(() => {
    const elemento = caixa.current;
    if (elemento === null) return;
    const medir = () => {
      const retangulo = elemento.getBoundingClientRect();
      if (!(retangulo.width > 0)) return;
      const topoNoDocumento = retangulo.top + window.scrollY;
      const alturaDisponivel =
        document.documentElement.clientHeight - topoNoDocumento - folgaAbaixo(elemento);
      /*
       * ⚠️ NÃO SOBRAR ALTURA NÃO É MEDIDA INVÁLIDA: é o piso (D-22). `escalaQueCabe` devolve o neutro (1) para altura
       *    zero ou negativa, e por isso a altura que falta chega como 1 px — senão o papel voltaria ao tamanho natural
       *    justamente na janela mais baixa.
       */
      const nova = tresCasasParaBaixo(
        escalaQueCabe(retangulo.width, Math.max(alturaDisponivel, 1)),
      );
      const medicao: MedidaDoPapel = {
        escala: nova,
        largura: retangulo.width,
        altura: alturaDisponivel,
      };
      if (!regravarAEscala(gravada.current, medicao)) return;
      gravada.current = medicao;
      definirEscala(nova);
    };
    medir();
    const observador = new ResizeObserver(() => medir());
    observador.observe(elemento);
    const principal = elemento.closest("main");
    if (principal !== null) observador.observe(principal);
    observador.observe(document.body);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  const medida = escala ?? 1;
  return (
    <div
      ref={caixa}
      className="w-full overflow-auto"
      style={
        escala === null
          ? { aspectRatio: "297 / 210" }
          : { height: `${ALTURA_DA_FOLHA_PX * escala}px` }
      }
      data-slot="papel-reduzido"
      data-escala={escala === null ? undefined : escala.toFixed(3)}
    >
      {/* A moldura tem o tamanho da folha JÁ reduzida — `transform` não ocupa espaço no fluxo — e é ela que centra. */}
      <div
        className="mx-auto overflow-hidden"
        style={{
          width: `${LARGURA_DA_FOLHA_PX * medida}px`,
          height: `${ALTURA_DA_FOLHA_PX * medida}px`,
        }}
      >
        <div
          style={{
            width: `${LARGURA_DA_FOLHA_PX}px`,
            transform: `scale(${medida})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
