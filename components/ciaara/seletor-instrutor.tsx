/**
 * Seletor de instrutor — **o único da aplicação** (`RN-ANT-01`, *Risco: Alto*, `FR-010`, `FR-011`).
 *
 * > *"Toda lista, seletor (`<select>`) ou filtro de instrutores, em qualquer tela do sistema, deve
 * > ser ordenado por antiguidade crescente — sem exceção."* — documento 04, `RN-ANT-01`
 *
 * ⚠️ ELE **ORDENA SEMPRE**, E IGNORA A ORDEM EM QUE A LISTA CHEGOU (`FR-011.1`, decisão de
 * 10/09/2026). Um ponto único que apenas **exibe** aceita lista desordenada: o esquecimento não
 * desaparece, só muda de lugar — sai da tela e entra na consulta. Um que **ordena** torna o
 * esquecimento impossível, que é o que uma regra de Risco Alto pede.
 *
 * ⚠️ E ISSO NÃO FERE O `FR-020`. Quem **calcula** o peso da antiguidade é a função pura de
 * `lib/dominio/antiguidade.ts`; este componente **aplica**. A escala P/G → peso chega por
 * propriedade, vinda de `config_listas` — ela não está escrita aqui, e não pode estar
 * (`RN-ANT-02`, Princípio VII).
 *
 * ⚠️ 177 INSTRUTORES EXIGEM BUSCA, e a busca aqui não veio de pacote novo. A receita pronta para
 * "escolha com busca" arrasta uma dependência que o portão do `FR-003` **não pegaria**, porque ela
 * não é biblioteca de componentes no sentido do BRIEF §1. A saída foi não passar por essa porta:
 * painel flutuante já instalado, mais a lista navegável que a tabela densa precisaria de qualquer
 * jeito (research §R-3).
 *
 * ⚠️ POSTO DESCONHECIDO VAI PARA O FIM, COM AVISO, E NUNCA SOME (`RN-DEG-01`). Quem some de uma
 * lista é quem ninguém encontra depois.
 *
 * ⚠️ A LISTA VAZIA DIZ O MOTIVO QUE QUEM CHAMA DECLARA — `vazio` É OBRIGATÓRIA (spec 029, `FR-006`,
 * `PEND-026-2`). Até 28/10/2026 havia `motivoDoVazio`, opcional e com padrão `sem-dado`, e nenhum
 * chamador passava outro valor: *"o seu perfil não os alcança"* nunca aparecia, e todo vazio dizia
 * *"Nada cadastrado ainda"* — inclusive o de FILTRO (a habilitação, a atribuição), com instrutor
 * cadastrado. Obrigatória pela razão do `motivo` do `EstadoVazio`: o `tsc` cobra a declaração em todo
 * chamador. A frase do **«você não vê»** é daqui (o motivo é um só, seja qual for a lista); a do
 * **«não há»** vem de quem chama, que sabe qual filtro aplicou — as frases moram em
 * `lib/dominio/dsa/instrutores-da-aula.ts` (`vazioDaListaDeInstrutores`).
 * ⚠️ E O VAZIO É COMPACTO (D-15 da spec 029): uma frase `role="status"` com `data-motivo`, do tamanho
 * do campo — não a caixa de página do `EstadoVazio`, que dentro de diálogo pesava e se repetia em cada
 * unidade de ensino do rateio.
 *
 * ⚠️ COM MARCADOR DE CLIENTE: busca, foco e teclado são comportamento de navegador.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  InboxIcon,
  LockIcon,
  SearchIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { CelulaNavegavel, ListaNavegavel } from "@/components/ciaara/lista-navegavel";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ordenarPorAntiguidade, type EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { nomeEmTexto, type InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";

export type SeletorInstrutorProps = {
  readonly instrutores: readonly InstrutorParaExibir[];
  /** A escala `P/G` → peso, vinda de `config_listas`. NUNCA uma constante deste arquivo. */
  readonly escala: EscalaDeAntiguidade;
  readonly valor?: string;
  readonly aoMudar: (id: string) => void;
  readonly rotulo?: string;
  /**
   * Quando a lista chega vazia, o motivo — e quem chama é quem sabe qual é (spec 029, `FR-006`):
   * **«você não vê»** (perfil sem `instrutores.ler`; a frase é do componente) ou **«não há»**, com a
   * frase do filtro que esvaziou a lista e, se houver, o caminho clicável (`acao`). Sem padrão.
   */
  readonly vazio: VazioDoSeletorInstrutor;
  readonly className?: string;
};

export type VazioDoSeletorInstrutor =
  | { readonly motivo: "sem-permissao" }
  | { readonly motivo: "sem-dado"; readonly detalhe: string; readonly acao?: React.ReactNode };

/**
 * A frase do «você não vê» — do componente, não de quem chama: a RLS de `instrutores` é tudo ou nada
 * por perfil, então o motivo é um só para qualquer lista (FR-006.1 da spec 029).
 */
const FRASE_SEM_PERMISSAO = "Existem instrutores cadastrados — o seu perfil não os alcança.";

/**
 * Normaliza para comparar: sem acento e sem caixa.
 *
 * ⚠️ ELA NÃO ALTERA NADA DO QUE É EXIBIDO — é leitura tolerante, não saneamento de dado. Quem
 * procura "muller" precisa achar "Müller", e quem procura "Müller" também: num domínio de nomes
 * brasileiros, exigir o acento na busca é exigir que a pessoa saiba como o nome foi cadastrado.
 */
function paraBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function SeletorInstrutor({
  instrutores,
  escala,
  valor,
  aoMudar,
  rotulo = "Instrutor",
  vazio,
  className,
}: SeletorInstrutorProps) {
  const [aberto, definirAberto] = React.useState(false);
  const [busca, definirBusca] = React.useState("");
  const campoDeBusca = React.useRef<HTMLInputElement>(null);

  /*
   * ⚠️ A ORDENAÇÃO ACONTECE AQUI, ANTES DO FILTRO, e sobre a lista que CHEGOU — não sobre a que
   * quem chama julgou ordenada. É a linha que faz o `FR-011` valer alguma coisa.
   */
  const { ordenados, avisos } = React.useMemo(
    () => ordenarPorAntiguidade(instrutores, escala),
    [instrutores, escala],
  );

  const visiveis = React.useMemo(() => {
    const alvo = paraBusca(busca.trim());
    if (!alvo) return ordenados;
    return ordenados.filter((i) => paraBusca(nomeEmTexto(i)).includes(alvo));
  }, [ordenados, busca]);

  const escolhido = ordenados.find((i) => i.id === valor);

  if (instrutores.length === 0) {
    /*
     * ⚠️ O VAZIO COMPACTO (D-15): uma região `status` só, com o motivo no atributo — o contrato do
     *    `EstadoVazio` (`role`, `data-motivo`) sem a caixa tracejada de página. O tom acompanha o
     *    motivo: o «não há» pede ação (a cor do atraso, como a frase da aula da D-32); o «você não
     *    vê» é informação, com o cadeado.
     */
    const naoHa = vazio.motivo === "sem-dado" ? vazio : null;
    const Icone = naoHa ? InboxIcon : LockIcon;
    return (
      <div
        role="status"
        data-slot="seletor-instrutor-vazio"
        data-motivo={vazio.motivo}
        className={cn(
          "flex items-start gap-1.5 text-xs",
          naoHa ? "text-atrasado-tinta" : "text-texto-suave",
          className,
        )}
      >
        <Icone aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
        <p>
          {naoHa ? naoHa.detalhe : FRASE_SEM_PERMISSAO}
          {naoHa?.acao ? <> {naoHa.acao}</> : null}
        </p>
      </div>
    );
  }

  return (
    <Popover open={aberto} onOpenChange={definirAberto}>
      <PopoverTrigger asChild>
        <Button
          data-slot="seletor-instrutor"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          aria-label={rotulo}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {escolhido ? (
              <NomeInstrutor instrutor={escolhido} />
            ) : (
              /* veste: a dica de escolha do seletor — texto estático (FR-031) */
              <span className="text-texto-tenue">Escolha o instrutor</span>
            )}
          </span>
          <ChevronsUpDownIcon aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <div className="border-borda flex items-center gap-2 border-b px-2">
          {/* veste: o desenho de apoio do campo de busca — nunca dado (FR-031) */}
          <SearchIcon aria-hidden="true" className="text-texto-tenue size-4 shrink-0" />
          <Input
            ref={campoDeBusca}
            value={busca}
            onChange={(e) => definirBusca(e.target.value)}
            placeholder="Buscar por nome"
            aria-label={`Buscar ${rotulo.toLocaleLowerCase("pt-BR")}`}
            className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        {avisos.length > 0 ? (
          <p className="text-atrasado-tinta bg-atrasado-fundo flex items-start gap-2 px-2 py-1.5 text-2xs">
            <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            <span>
              {avisos.map((a) => a.mensagem).join(" ")} Nenhum registro foi omitido da lista.
            </span>
          </p>
        ) : null}

        <ListaNavegavel
          linhas={visiveis.length}
          colunas={1}
          papel="listbox"
          rotulo={rotulo}
          chaveDeReinicio={busca}
          aoAtivar={({ linha }) => {
            const alvo = visiveis[linha];
            if (!alvo) return;
            aoMudar(alvo.id);
            definirAberto(false);
          }}
          aoCancelar={() => definirAberto(false)}
          /*
           * ⚠️ FILTRO SEM RESULTADO DEVOLVE O FOCO À BUSCA. Uma lista que filtra e deixa o foco
           * numa linha que sumiu leva quem usa teclado a lugar nenhum, em silêncio.
           */
          aoEsvaziar={() => campoDeBusca.current?.focus()}
          className="max-h-72 overflow-y-auto p-1"
        >
          {visiveis.length === 0 ? (
            <p role="status" className="text-texto-suave px-2 py-6 text-center text-sm">
              Nenhum instrutor corresponde a “{busca}”.
            </p>
          ) : (
            <ul className="flex flex-col">
              {visiveis.map((instrutor, linha) => (
                <li key={instrutor.id}>
                  <CelulaNavegavel linha={linha} coluna={0}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={instrutor.id === valor}
                      onClick={() => {
                        aoMudar(instrutor.id);
                        definirAberto(false);
                      }}
                      className={cn(
                        "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                        instrutor.id === valor && "bg-accent text-accent-foreground",
                      )}
                    >
                      <CheckIcon
                        aria-hidden="true"
                        className={cn(
                          "size-4 shrink-0",
                          instrutor.id === valor ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <NomeInstrutor instrutor={instrutor} />
                    </button>
                  </CelulaNavegavel>
                </li>
              ))}
            </ul>
          )}
        </ListaNavegavel>
      </PopoverContent>
    </Popover>
  );
}
