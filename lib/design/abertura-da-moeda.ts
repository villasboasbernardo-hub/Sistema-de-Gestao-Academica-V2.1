/**
 * A abertura com a moeda do CIAARA na raiz (spec 028, Bloco 13) — o roteiro e a máquina de estados, como DADO puro.
 *
 * > *"A moeda surge no verso (brasão) com zoom-out de 1,6x para 1x, dá duas voltas e meia em 3D (rotateY de 180° a
 * > 1080°) e para na frente (CIAARA). [...] No fim, um reflexo metálico passa na frente e o botão aparece e recebe o
 * > foco."* — pedido de 27/10/2026; os tempos são os do protótipo aprovado (`specs/028-…/referencia-prototipo.html`).
 *
 * ⚠️ OS TEMPOS MORAM AQUI, E NÃO NO COMPONENTE: a folha `app/AberturaComMoeda.tsx` só aplica o roteiro, e
 *    `tests/unidade/abertura-da-moeda.test.ts` confere que ele soma os ~3,5 s do pedido.
 * ⚠️ NADA DE `react`, `next` NEM DOM EM TEMPO DE EXECUÇÃO: os tipos `Keyframe` e `CompositeOperation` são só de
 *    compilação, e o módulo roda igual no teste de unidade.
 */

/** As peças da moeda que o roteiro anima. */
export type Alvo = "aproximacao" | "moeda" | "subida" | "sombra" | "reflexo";

export type PassoDoRoteiro = {
  readonly alvo: Alvo;
  readonly quadros: readonly Keyframe[];
  readonly opcoes: {
    readonly duration: number;
    readonly delay?: number;
    readonly easing: string;
    readonly fill: "both";
    readonly composite?: CompositeOperation;
  };
};

/** A curva de saída do protótipo: começa rápido e assenta devagar. */
const SAIDA = "cubic-bezier(.2,.7,.2,1)";

/**
 * O roteiro: surge no verso, afasta-se girando duas voltas e meia, sobe e desce, ganha a sombra e, no fim, o reflexo
 * atravessa a frente. Todo passo fica no quadro final (`fill: both`), para o pular e a pausa deixarem a moeda no lugar.
 */
export const ROTEIRO: readonly PassoDoRoteiro[] = [
  {
    alvo: "aproximacao",
    quadros: [{ opacity: 0 }, { opacity: 1 }],
    opcoes: { duration: 400, easing: "ease-out", fill: "both" },
  },
  {
    alvo: "aproximacao",
    quadros: [{ transform: "scale(1.6)" }, { transform: "scale(1)" }],
    opcoes: { duration: 2500, easing: SAIDA, fill: "both", composite: "add" },
  },
  {
    alvo: "moeda",
    quadros: [{ transform: "rotateY(180deg)" }, { transform: "rotateY(1080deg)" }],
    opcoes: { duration: 3000, easing: "cubic-bezier(.3,.05,.15,1)", fill: "both" },
  },
  {
    alvo: "subida",
    quadros: [
      { transform: "translateZ(0) rotateX(0)" },
      { transform: "translateZ(60px) rotateX(8deg)", offset: 0.4 },
      { transform: "translateZ(0) rotateX(0)" },
    ],
    opcoes: { duration: 3000, easing: "ease-in-out", fill: "both" },
  },
  {
    alvo: "sombra",
    quadros: [{ opacity: 0 }, { opacity: 1 }],
    opcoes: { duration: 1200, delay: 400, easing: "linear", fill: "both" },
  },
  {
    alvo: "reflexo",
    quadros: [{ backgroundPosition: "130% 0" }, { backgroundPosition: "-30% 0" }],
    opcoes: { duration: 750, delay: 2750, easing: "ease-in-out", fill: "both" },
  },
];

/** Quando o passo termina, em milissegundos desde o começo. */
export function fimDoPasso(passo: PassoDoRoteiro): number {
  return (passo.opcoes.delay ?? 0) + passo.opcoes.duration;
}

/** O fim do reflexo: é quando o botão aparece. */
export const DURACAO_TOTAL_MS = 3500;

/** O botão "Início" aparece subindo 8 px e ganhando opacidade. */
export const REVELACAO_DO_BOTAO = {
  quadros: [
    { opacity: 0, transform: "translateY(8px)" },
    { opacity: 1, transform: "none" },
  ] as readonly Keyframe[],
  opcoes: { duration: 350, easing: SAIDA },
} as const;

/**
 * Quanto a abertura espera as faces da moeda ficarem prontas para desenhar antes de começar (D-5): sem isso, numa
 * conexão lenta a moeda giraria sem as faces. Passado o prazo, começa assim mesmo.
 */
export const ESPERA_MAXIMA_DAS_IMAGENS_MS = 1500;

/** As fases da abertura. */
export type Fase = "aguardando" | "tocando" | "pausado" | "fim";

/** O que acontece com a página: a aba fica visível ou oculta, a pessoa pula, o roteiro termina. */
export type Evento = "visivel" | "oculta" | "pular" | "terminou";

/**
 * O que a folha faz com as animações: *iniciar* cria as do roteiro; *finalizar* as leva ao quadro final e revela o
 * botão; *revelar* só revela (o roteiro já terminou sozinho).
 */
export type Efeito =
  "iniciar" | "iniciar-e-finalizar" | "pausar" | "retomar" | "finalizar" | "revelar" | null;

/**
 * A máquina de estados da abertura (FR-006 a FR-008).
 *
 * ⚠️ SÓ COMEÇA COM A ABA VISÍVEL: a folha despacha `visivel` quando a aba está visível E as faces estão prontas.
 * ⚠️ O FIM É ABSORVENTE: depois dele, nenhum evento revela o botão de novo nem reanima a moeda.
 */
export function transicao(fase: Fase, evento: Evento): { fase: Fase; efeito: Efeito } {
  switch (fase) {
    case "aguardando":
      if (evento === "visivel") return { fase: "tocando", efeito: "iniciar" };
      if (evento === "pular") return { fase: "fim", efeito: "iniciar-e-finalizar" };
      return { fase, efeito: null };
    case "tocando":
      if (evento === "oculta") return { fase: "pausado", efeito: "pausar" };
      if (evento === "pular") return { fase: "fim", efeito: "finalizar" };
      if (evento === "terminou") return { fase: "fim", efeito: "revelar" };
      return { fase, efeito: null };
    case "pausado":
      if (evento === "visivel") return { fase: "tocando", efeito: "retomar" };
      if (evento === "pular") return { fase: "fim", efeito: "finalizar" };
      return { fase, efeito: null };
    case "fim":
      return { fase, efeito: null };
  }
}
