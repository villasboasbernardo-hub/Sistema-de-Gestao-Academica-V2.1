/**
 * Semana anterior · atual · próxima, a semana **pela data** — e a coluna de sábado (`RF-DSA-02`,
 * `RF-NAV-04`, `Q-4`).
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** Ela escreve na URL pelo roteador do Next (`router.push` com o
 * endereço de `enderecoDoDsa`), que é estado de navegador. A grade continua no servidor; só estes
 * cinco controles atravessam a fronteira.
 *
 * ⚠️ **O CAMPO DE DATA É O CALENDÁRIO NATIVO DO NAVEGADOR, E NENHUM PACOTE** (item 4 das correções
 * do DSA, decisão de Bernardo Villas Boas de 08/10/2026): escolhida uma data, abre a semana ISO que
 * a contém. ⚠️ **Ele passa pelo MESMO `ir()` dos botões**, e é isso que o faz empilhar no histórico
 * e levar o sábado aberto junto — um segundo caminho até a URL seria o segundo lugar a esquecer um
 * dos dois. Quem decide se a data serve, e em que semana ela cai, é `semanaDaDataEscolhida`, em
 * `lib/dominio/dsa/semana-pela-data.ts`, com teste ao lado.
 *
 * ⚠️ **`semana` E `ano` EMPILHAM NO HISTÓRICO, e é o `RF-NAV-04` literal** — *"navegar entre
 * semanas usa o histórico do navegador"*. O padrão da biblioteca é SUBSTITUIR: com ele a URL
 * ficaria certa, o link compartilhado abriria na semana certa, **e o botão voltar sairia da tela**
 * em vez de voltar uma semana. Quem garante isso é o contrato, e há asserção sobre ele.
 *
 * ⚠️ **A VIRADA DO ANO É O CASO QUE QUASE NINGUÉM TESTA, e ela acontece DUAS vezes por turma**: a
 * semana anterior à 1 é a **última do ano anterior** — que pode ser 52 **ou 53** —, e a seguinte à
 * última é a 1 do ano seguinte. Um `semana - 1` sem isso produziria `?semana=0`, que o contrato
 * degrada para a semana corrente: o botão "anterior" saltaria para hoje, em silêncio.
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { datasDaSemanaIso, semanasDoAnoIso } from "@/lib/dominio/carga-semanal";
import { datasEscolhiveis, semanaDaDataEscolhida } from "@/lib/dominio/dsa/semana-pela-data";
import { CONTRATO } from "@/lib/navegacao/contrato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { enderecoDoDsa, ROTA_DO_DSA } from "./consulta";

export type NavegacaoDaSemanaProps = {
  readonly codigo: string;
  readonly ano: number;
  readonly semana: number;
  readonly sabadoAberto: boolean;
};

/**
 * Os anos que a URL aceita — **os do contrato da rota**, e não um número escrito aqui.
 *
 * ⚠️ Uma data fora deles produziria um `?ano=` que o contrato descarta: a página trocaria o ano pelo
 * corrente e abriria, com aviso, uma semana que ninguém escolheu. O campo levaria a pessoa a um
 * endereço que ele mesmo sabe que não serve.
 */
const ANOS_DA_URL = CONTRATO[ROTA_DO_DSA].parametros.ano;

/** O que o calendário oferece (`min`/`max`): exatamente as datas cuja semana a URL aceita. */
const ESCOLHIVEIS = datasEscolhiveis(ANOS_DA_URL);

/** O campo de data — `#dsa-…`, como os campos do lançamento. */
const ID_DO_CAMPO_DE_DATA = "dsa-semana-pela-data";

/** A semana anterior, atravessando a virada do ano. */
export function anterior(ano: number, semana: number): { ano: number; semana: number } {
  if (semana > 1) return { ano, semana: semana - 1 };
  const passado = ano - 1;
  return { ano: passado, semana: semanasDoAnoIso(passado) };
}

/** A semana seguinte, atravessando a virada do ano. */
export function proxima(ano: number, semana: number): { ano: number; semana: number } {
  if (semana < semanasDoAnoIso(ano)) return { ano, semana: semana + 1 };
  return { ano: ano + 1, semana: 1 };
}

export function NavegacaoDaSemana({ codigo, ano, semana, sabadoAberto }: NavegacaoDaSemanaProps) {
  const router = useRouter();

  /*
   * ⚠️ `router.push` e NÃO `replace`: é o `push` que empilha, e é o empilhamento que faz o botão
   * voltar do navegador voltar **uma semana** (`RF-NAV-04`). Trocar por `replace` deixaria o
   * histórico sem nada para desfazer, com a URL correta — o defeito silencioso do `FR-004`.
   */
  const ir = React.useCallback(
    (destino: { ano: number; semana: number }) => {
      router.push(
        enderecoDoDsa(codigo, {
          semana: destino.semana,
          ano: destino.ano,
          ...(sabadoAberto ? { sabado: true } : {}),
        }),
      );
    },
    [codigo, router, sabadoAberto],
  );

  /*
   * ⚠️ **O CAMPO MOSTRA A SEGUNDA-FEIRA DA SEMANA ABERTA, e só deixa de mostrá-la ENQUANTO alguém
   * mexe nele.** O rascunho vive da primeira mudança até a saída do campo, e há duas razões para ele
   * existir:
   *   · **campo controlado sem rascunho não aceita digitação** — o React devolve ao campo o valor da
   *     propriedade sempre que o `onChange` não muda o estado, então toda data intermediária que não
   *     navega (um ano ainda incompleto, por exemplo) seria desfeita antes da tecla seguinte;
   *   · **trocar o valor pela segunda-feira quando a semana nova chega atropelaria quem digita** — um
   *     dia de dois dígitos pode chegar em duas mudanças, e a primeira já formar uma data que navega;
   *     reescrever o campo naquele instante faria a segunda tecla cair noutra data.
   * ⚠️ **As duas são leitura do mecanismo, não medição**: a ponta a ponta usa `fill`, que escreve a
   * data inteira de uma vez, e o que cada navegador entrega tecla a tecla não foi medido aqui.
   * Ao sair do campo, ele volta a dizer a semana que está aberta — inclusive depois de uma data
   * apagada ou recusada, que não navegou.
   */
  const [rascunho, definirRascunho] = React.useState<string | null>(null);
  const segunda = datasDaSemanaIso(ano, semana)[0] ?? "";

  const escolherData = (valor: string) => {
    definirRascunho(valor);
    const destino = semanaDaDataEscolhida(valor, ANOS_DA_URL);
    /* Apagada, incompleta, inexistente ou fora dos anos da URL: não navega (`RN-DEG-01`). */
    if (destino === null) return;
    /*
     * A semana que já está aberta não empilha nada: o voltar desfaria um passo que não houve — e a
     * semana corrente, aberta sem parâmetro, perderia o endereço favoritável.
     */
    if (destino.ano === ano && destino.numero === semana) return;
    ir({ ano: destino.ano, semana: destino.numero });
  };

  const antes = anterior(ano, semana);
  const depois = proxima(ano, semana);

  return (
    <nav
      aria-label="Navegação da semana"
      className="flex flex-wrap items-center gap-2"
      data-slot="navegacao-da-semana"
    >
      <Button variant="outline" size="sm" onClick={() => ir(antes)} data-acao="semana-anterior">
        Semana anterior
      </Button>
      {/*
       * ⚠️ "Esta semana" leva ao endereço SEM parâmetro — e é isso que o torna favoritável: o
       * valor no padrão não aparece na URL, então o link guardado abre sempre na semana corrente.
       */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(enderecoDoDsa(codigo))}
        data-acao="semana-atual"
      >
        Esta semana
      </Button>
      <Button variant="outline" size="sm" onClick={() => ir(depois)} data-acao="semana-proxima">
        Próxima semana
      </Button>
      <span className="ml-1 text-sm tabular-nums text-texto-suave" data-slot="semana-atual">
        semana {semana} de {ano}
      </span>
      {/*
       * ⚠️ `<label>` DE VERDADE, ligado pelo `htmlFor`: é ele que dá nome ao campo para quem usa
       * leitor de tela, e o caso de ponta a ponta o encontra PELO RÓTULO — se a ligação quebrar, o
       * caso quebra junto.
       * ⚠️ O VALOR É ISO (`aaaa-mm-dd`), que é o formato do `<input type="date">`; quem o escreve em
       * DD/MM/AAAA na tela é o próprio navegador. Passá-lo por `dataParaLeitura` abriria o campo
       * VAZIO — o mesmo aviso de `PainelDePeriodo.tsx`.
       */}
      <div className="ml-2 flex items-center gap-2">
        <label htmlFor={ID_DO_CAMPO_DE_DATA} className="text-sm whitespace-nowrap text-texto-suave">
          Ir para a semana do dia
        </label>
        <Input
          id={ID_DO_CAMPO_DE_DATA}
          type="date"
          lang="pt-BR"
          min={ESCOLHIVEIS.primeira}
          max={ESCOLHIVEIS.ultima}
          value={rascunho ?? segunda}
          onChange={(evento) => escolherData(evento.target.value)}
          onBlur={() => definirRascunho(null)}
          className="h-8 w-auto text-sm"
          data-acao="semana-pela-data"
        />
      </div>
      {/*
       * O sábado (`Q-4`): entra **por ação do operador**. ⚠️ Quando há lançamento nele a coluna
       * aparece de qualquer jeito, e aí o botão só muda o que já está à vista — esconder um
       * lançamento gravado seria esconder um fato.
       */}
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto"
        aria-pressed={sabadoAberto}
        onClick={() =>
          router.push(
            enderecoDoDsa(codigo, {
              semana,
              ano,
              ...(sabadoAberto ? {} : { sabado: true }),
            }),
          )
        }
        data-acao="alternar-sabado"
      >
        {sabadoAberto ? "Fechar o sábado" : "Abrir o sábado"}
      </Button>
    </nav>
  );
}
