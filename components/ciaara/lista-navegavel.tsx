/**
 * Navegação por teclado em grade — *roving tabindex*, nas duas dimensões.
 *
 * Contrato: `specs/007-componentes-ciaara/contracts/teclado.md` · documento 23 §8.3 ·
 * `FR-023`, `FR-024`, `SC-006`. **Fecha o `CHK006`.**
 *
 * ⚠️ POR QUE ISTO É UM COMPONENTE PRÓPRIO, fora do inventário do documento 23 §3.1: a tabela densa
 * e o seletor de instrutor precisam da MESMA navegação — o seletor com busca é uma lista de uma
 * coluna. Implementá-la nos dois faria duas navegações por teclado divergirem, que é exatamente o
 * defeito que esta fatia veio fechar, só que em teclado em vez de cor. É a única entrada do
 * *Complexity Tracking* do plano.
 *
 * ⚠️ SEM *ROVING TABINDEX*, uma tabela de 300 linhas por 8 colunas exige **2.400** pressionamentos
 * de tabulação para ser atravessada. É por isso que o documento 23 chama a técnica de obrigatória
 * e não de refinamento.
 */
"use client";

import * as React from "react";
import { cn } from "cn";

/** Uma posição na grade. Zero-indexada nas duas dimensões. */
export type Posicao = { readonly linha: number; readonly coluna: number };

/** Os limites da grade, para a função de movimento. */
export type Limites = { readonly linhas: number; readonly colunas: number };

/**
 * O salto de página, em linhas.
 *
 * ⚠️ AS 20 LINHAS NÃO SÃO ARBITRÁRIAS: são a altura útil de uma tabela densa, e o número vale para
 * as três densidades porque o que ele mede é o passo de leitura, não a altura em pixels
 * (documento 23 §8.3).
 */
export const SALTO_DE_PAGINA = 20;

/**
 * Onde a tecla leva o foco — **função pura**, e é ela que carrega todos os casos de fronteira.
 *
 * Devolve `null` quando a tecla não é de navegação **ou** quando a grade não tem o que navegar
 * naquela dimensão. `null` quer dizer *"não interfira"*: quem chama não impede o comportamento
 * padrão do navegador, e é isso que deixa a seta horizontal mover o cursor dentro do campo de
 * busca de um seletor de uma coluna.
 *
 * ⚠️ A GRADE NÃO ROLA CIRCULARMENTE, e é decisão registrada. Voltar ao topo ao passar do fim faz
 * quem não vê a tela perder a noção de onde está — o fim da lista precisa ser sentido como fim.
 * Por isso o movimento é **preso** aos limites e a posição devolvida pode ser igual à atual: ela
 * ainda é uma posição, e quem chama ainda impede a rolagem da página.
 */
export function proximaPosicao(atual: Posicao, tecla: string, limites: Limites): Posicao | null {
  const { linhas, colunas } = limites;
  if (linhas <= 0 || colunas <= 0) return null;

  const preso = (linha: number, coluna: number): Posicao => ({
    linha: Math.min(Math.max(linha, 0), linhas - 1),
    coluna: Math.min(Math.max(coluna, 0), colunas - 1),
  });

  switch (tecla) {
    case "ArrowUp":
      return preso(atual.linha - 1, atual.coluna);
    case "ArrowDown":
      return preso(atual.linha + 1, atual.coluna);
    case "ArrowLeft":
      // ⚠️ Numa lista de uma coluna a seta horizontal NÃO faz nada — e "nada" aqui quer dizer
      // devolver `null`, não devolver a mesma posição: quem digita no campo de busca precisa que
      // a seta continue movendo o cursor do texto.
      return colunas <= 1 ? null : preso(atual.linha, atual.coluna - 1);
    case "ArrowRight":
      return colunas <= 1 ? null : preso(atual.linha, atual.coluna + 1);
    case "Home":
      return preso(atual.linha, 0);
    case "End":
      return preso(atual.linha, colunas - 1);
    case "PageUp":
      return preso(atual.linha - SALTO_DE_PAGINA, atual.coluna);
    case "PageDown":
      // Com menos de 20 linhas restantes vai para a última, nunca para fora.
      return preso(atual.linha + SALTO_DE_PAGINA, atual.coluna);
    default:
      return null;
  }
}

type Contexto = {
  readonly posicao: Posicao;
  readonly registrar: (chave: string, elemento: HTMLElement | null) => void;
  readonly irPara: (destino: Posicao) => void;
};

const ContextoDaGrade = React.createContext<Contexto | null>(null);

const chaveDe = (linha: number, coluna: number) => `${linha}:${coluna}`;

export type ListaNavegavelProps = {
  readonly linhas: number;
  readonly colunas: number;
  /** Nome acessível da grade — `FR-030`, item a. Sem ele o leitor de tela anuncia "grade". */
  readonly rotulo: string;
  /**
   * O papel do contêiner na árvore de acessibilidade.
   *
   * ⚠️ `"nenhum"` EXISTE POR CAUSA DA TABELA, e não por conveniência. Um `<div role="grid">`
   * envolvendo um `<table>` produz uma árvore quebrada — grade contendo tabela contendo linhas —,
   * e leitor de tela anuncia duas estruturas onde há uma. Nesse caso o papel e o nome vão no
   * próprio `<table>`, e este contêiner fica sendo só o que ele de fato é: a caixa que rola e
   * escuta o teclado.
   */
  readonly papel?: "grid" | "listbox" | "nenhum";
  /**
   * Reinicia a posição quando muda. É o que faz um filtro reposicionar o foco na **primeira**
   * opção restante — uma lista que filtra e deixa o foco numa linha que sumiu leva quem usa
   * teclado a lugar nenhum, em silêncio.
   */
  readonly chaveDeReinicio?: string;
  readonly aoAtivar?: (posicao: Posicao) => void;
  readonly aoCancelar?: () => void;
  /** Chamado quando o reinício encontra a grade vazia — o seletor devolve o foco à busca. */
  readonly aoEsvaziar?: () => void;
  readonly className?: string;
  readonly children: React.ReactNode;
};

export function ListaNavegavel({
  linhas,
  colunas,
  rotulo,
  papel = "grid",
  chaveDeReinicio,
  aoAtivar,
  aoCancelar,
  aoEsvaziar,
  className,
  children,
}: ListaNavegavelProps) {
  const [posicao, definirPosicao] = React.useState<Posicao>({ linha: 0, coluna: 0 });
  const celulas = React.useRef(new Map<string, HTMLElement>());
  /**
   * ⚠️ O FOCO SÓ É MOVIDO QUANDO A NAVEGAÇÃO PARTIU DO TECLADO. Sem esta trava, a grade roubaria
   * o foco de quem estivesse digitando em outro lugar a cada nova renderização — e uma tela que
   * puxa o foco sozinha é pior que uma tela sem navegação nenhuma.
   */
  const navegouPorTeclado = React.useRef(false);

  const registrar = React.useCallback((chave: string, elemento: HTMLElement | null) => {
    if (elemento) celulas.current.set(chave, elemento);
    else celulas.current.delete(chave);
  }, []);

  const irPara = React.useCallback((destino: Posicao) => {
    navegouPorTeclado.current = true;
    definirPosicao(destino);
  }, []);

  // Reinício por filtro: volta à primeira posição, e avisa quando não sobrou nada.
  const reinicioAnterior = React.useRef(chaveDeReinicio);
  React.useEffect(() => {
    if (reinicioAnterior.current === chaveDeReinicio) return;
    reinicioAnterior.current = chaveDeReinicio;
    navegouPorTeclado.current = false;
    definirPosicao({ linha: 0, coluna: 0 });
    if (linhas <= 0) aoEsvaziar?.();
  }, [chaveDeReinicio, linhas, aoEsvaziar]);

  // A posição não pode sobreviver ao encolhimento da grade apontando para fora dela.
  const presa: Posicao = {
    linha: Math.min(posicao.linha, Math.max(linhas - 1, 0)),
    coluna: Math.min(posicao.coluna, Math.max(colunas - 1, 0)),
  };

  React.useEffect(() => {
    if (!navegouPorTeclado.current) return;
    navegouPorTeclado.current = false;
    celulas.current.get(chaveDe(presa.linha, presa.coluna))?.focus();
  }, [presa.linha, presa.coluna]);

  function aoPressionar(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      aoCancelar?.();
      return;
    }
    if (evento.key === "Enter" || evento.key === " ") {
      // ⚠️ Só quando o foco está numa célula desta grade: o `Espaço` dentro de um campo de busca
      // é um espaço, não uma ativação.
      const atual = celulas.current.get(chaveDe(presa.linha, presa.coluna));
      if (atual && atual === document.activeElement) {
        evento.preventDefault();
        aoAtivar?.(presa);
      }
      return;
    }

    const destino = proximaPosicao(presa, evento.key, { linhas, colunas });
    if (!destino) return;
    evento.preventDefault();
    irPara(destino);
  }

  const vazia = linhas <= 0 || colunas <= 0;

  return (
    <ContextoDaGrade.Provider value={{ posicao: presa, registrar, irPara }}>
      <div
        data-slot="lista-navegavel"
        {...(papel === "nenhum" ? {} : { role: papel, "aria-label": rotulo })}
        /*
         * ⚠️ UM ÚNICO PONTO DE PARADA NA ORDEM DE TABULAÇÃO, e é isto que concilia as duas frases
         * do contrato. O contêiner só é alcançável por tabulação quando NÃO HÁ célula — que é o
         * caso de fronteira da grade vazia, onde o estado vazio precisa ser lido. Havendo célula,
         * quem carrega o `0` é a célula sob o foco, e a grade se entra e se sai em UM passo.
         * Dar `0` aos dois faria a tabulação parar duas vezes na mesma grade.
         */
        tabIndex={vazia ? 0 : -1}
        onKeyDown={aoPressionar}
        className={cn("outline-none", className)}
      >
        {children}
      </div>
    </ContextoDaGrade.Provider>
  );
}

export type CelulaNavegavelProps = {
  readonly linha: number;
  readonly coluna: number;
  readonly children: React.ReactElement<{
    ref?: React.Ref<HTMLElement>;
    tabIndex?: number;
    onFocus?: (evento: React.FocusEvent<HTMLElement>) => void;
    "data-celula"?: string;
  }>;
};

/**
 * Marca um elemento como célula navegável, sem envolvê-lo em nada.
 *
 * ⚠️ ELE CLONA O FILHO em vez de desenhar um invólucro, e a razão é a tabela: um `<div>` entre o
 * `<tr>` e o `<td>` é HTML inválido, e navegador conserta HTML inválido movendo o elemento para
 * fora da tabela — silenciosamente, e só em alguns casos.
 */
export function CelulaNavegavel({ linha, coluna, children }: CelulaNavegavelProps) {
  const contexto = React.useContext(ContextoDaGrade);
  if (!contexto) throw new Error("CelulaNavegavel exige uma ListaNavegavel em volta");

  const { posicao, registrar, irPara } = contexto;
  const chave = chaveDe(linha, coluna);
  const ehAtual = posicao.linha === linha && posicao.coluna === coluna;

  return React.cloneElement(children, {
    ref: (elemento: HTMLElement | null) => registrar(chave, elemento),
    tabIndex: ehAtual ? 0 : -1,
    "data-celula": chave,
    /*
     * ⚠️ O CLIQUE TAMBÉM MOVE A POSIÇÃO. Sem isto, clicar numa célula e depois usar as setas
     * faria o foco saltar de volta para onde o teclado tinha parado — o pior dos dois mundos,
     * porque parece defeito aleatório.
     */
    onFocus: () => {
      if (!ehAtual) irPara({ linha, coluna });
    },
  });
}
