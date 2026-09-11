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
 * ⚠️ COM MARCADOR DE CLIENTE: busca, foco e teclado são comportamento de navegador.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";

import { EstadoVazio, type MotivoDoVazio } from "@/components/ciaara/EstadoVazio";
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
  /** Quando a lista chega vazia: quem chama sabe se foi ausência de dado ou de permissão. */
  readonly motivoDoVazio?: MotivoDoVazio;
  readonly className?: string;
};

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
  motivoDoVazio = "sem-dado",
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
    return (
      <EstadoVazio
        motivo={motivoDoVazio}
        detalhe={
          motivoDoVazio === "sem-dado"
            ? "Nenhum instrutor disponível para escolher."
            : "Existem instrutores cadastrados — o seu perfil não os alcança."
        }
      />
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
