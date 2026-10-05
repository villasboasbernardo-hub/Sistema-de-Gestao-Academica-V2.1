/**
 * O menu lateral (`RF-NAV-02`, `FR-017`, `FR-019`, `FR-021`; `FR-001` a `FR-009` da spec 012).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE, E ISSO É COBRADO NOMINALMENTE** por
 * `tests/unidade/fronteira-casca.test.ts`. A entrada ativa é derivada do caminho, no servidor: ela
 * muda por navegação, não por interação — **a entrada ativa é a URL**. Quem abre, fecha, aponta e
 * fixa é `painel-retratil.tsx`, a folha de cliente que já existia; este arquivo só **monta a lista**
 * e a entrega como conteúdo dela.
 *
 * ⚠️ **ESCONDER ENTRADA NÃO PROTEGE NADA** (Princípio XI). Quem nega acesso é o banco, ainda que a
 * pessoa digite a URL. O menu é cortesia.
 *
 * ⚠️ **A ENTRADA ATIVA É COMUNICADA ALÉM DA COR** (`FR-021`): `aria-current="page"`, um traço à
 * esquerda e o peso da fonte. É o `FR-025` da fatia (b) aplicado à navegação — quem não distingue as
 * duas cores continua sabendo onde está.
 *
 * ⚠️ **O RÓTULO FICA NO DOM NOS DOIS ESTADOS, E ISSO NÃO É DESPERDÍCIO — É O NOME DO LINK.** Recolhida,
 * a lateral mostra só o ícone; o rótulo some por **opacidade**, não por `display` nem por
 * `visibility`. A diferença importa em dois lugares: leitor de tela continua anunciando *"Cursos"*, e
 * os percursos de ponta a ponta continuam achando `getByRole("link", { name: "Cursos" })` — seis
 * arquivos de teste dependem disso. ⚠️ **E `sr-only` NÃO serve aqui**, embora pareça o natural: ele
 * tira o elemento do fluxo, e devolvê-lo no `:hover` com `not-sr-only` briga com o `truncate` e
 * reflui a linha inteira a cada passada do mouse.
 */
import Link from "next/link";
import { cn } from "cn";

import { IconeDoMenu } from "@/components/casca/icones-do-menu";
import { PainelRetratil } from "@/components/casca/painel-retratil";
import { entradaAtiva, MENU } from "@/lib/navegacao/menu";

const ID_DO_PAINEL = "navegacao-principal";

/**
 * O rótulo que desaparece quando a lateral recolhe.
 *
 * ⚠️ **AS TRÊS CONDIÇÕES QUE O TRAZEM DE VOLTA SÃO IRMÃS, E A SEGUNDA É A DO TECLADO:** apontar,
 * **entrar com `Tab`** e fixar (`group-data-[fixada=true]`). Sem a do foco, quem navega por teclado
 * atravessaria oito ícones sem rótulo visível — o `FR-008` sai dela, de graça, sem uma linha de
 * JavaScript.
 *
 * ⚠️ **AS DUAS PRIMEIRAS MUDARAM DE FORMA EM 05/10/2026, E ELAS MUDAM EM PAR COM A LARGURA.** Quem
 * decide a largura é `components/casca/painel-retratil.tsx`, e as condições de lá e as de cá MUST
 * dizer a mesma coisa: se divergirem, a lateral fica larga com o rótulo apagado — ou estreita com o
 * rótulo transbordando — e **nada acusa**, porque são dois arquivos e nenhum teste de tipo os liga.
 *
 * | Condição | Antes | Agora | Por quê |
 * |---|---|---|---|
 * | apontar | `group-hover` | `group-[[data-apontar=livre]:hover]` | depois de DESAFIXAR, o apontar fica bloqueado até o ponteiro sair — era o defeito de 05/10 |
 * | foco | `group-focus-within` | `group-has-[[data-entrada]:focus-visible]` | `:focus-within` casava com o **botão de fixar**, que vive no mesmo `<nav>` |
 *
 * ⚠️ **TUDO COM `lg:`**: abaixo do ponto de quebra a navegação é gaveta, e ali o rótulo é visível
 * sempre. O `FR-006` sai da **ausência** da variante, não de uma condição em código.
 */
const ROTULO = cn(
  "whitespace-nowrap transition-opacity motion-reduce:transition-none",
  "lg:opacity-0 lg:group-[[data-apontar=livre]:hover]:opacity-100",
  "lg:group-has-[[data-entrada]:focus-visible]:opacity-100",
  "lg:group-data-[fixada=true]:opacity-100",
);

export function NavegacaoLateral({
  caminho,
  fixada,
}: {
  readonly caminho: string;
  readonly fixada: boolean;
}) {
  const ativa = entradaAtiva(caminho);

  return (
    <PainelRetratil idDoPainel={ID_DO_PAINEL} fixadaInicial={fixada}>
      <ul className="flex flex-col gap-0.5 p-2">
        {MENU.map((entrada) => {
          const estaAtiva = ativa?.rota === entrada.rota;

          if (!entrada.disponivel) {
            /*
             * ⚠️ A ENTRADA QUE AINDA NÃO TEM TELA APARECE, E DIZ QUE NÃO TEM. Um menu que cresce
             * a cada épico ensina quem usa a reaprender a navegação sete vezes, e o `RF-NAV-02` é
             * **[PRESERVADO]**: ele manda manter os mesmos pontos de entrada de hoje. Quem chega
             * numa entrada futura sabe que ela vem, em vez de concluir que o sistema perdeu a
             * função — que é a leitura de quem migra de uma versão que tinha tudo. (Decisão
             * MENU-2, intacta na `D-NAV-1` de 04/10/2026.)
             */
            return (
              <li key={entrada.rota}>
                {/* veste: ícone, rótulo e etiqueta da entrada sem tela — texto fixo, nunca dado */}
                <span
                  className="text-texto-tenue rounded-ciaara-sm flex items-center gap-2 px-3 py-2 text-sm"
                  aria-disabled="true"
                  data-entrada={entrada.rota}
                >
                  <IconeDoMenu nome={entrada.icone} />
                  <span className={ROTULO}>{entrada.rotulo}</span>
                  <span className={cn("text-2xs ml-auto", ROTULO)}>em breve</span>
                </span>
              </li>
            );
          }

          return (
            <li key={entrada.rota}>
              <Link
                href={entrada.rota}
                data-entrada={entrada.rota}
                {...(estaAtiva ? { "aria-current": "page" as const } : {})}
                className={cn(
                  "rounded-ciaara-sm flex items-center gap-2 border-l-2 px-3 py-2 text-sm",
                  "hover:bg-marca-suave focus-visible:ring-marca focus-visible:ring-2 focus-visible:outline-none",
                  estaAtiva
                    ? "border-marca bg-marca-suave text-texto font-medium"
                    : "text-texto-suave border-transparent",
                )}
              >
                <IconeDoMenu nome={entrada.icone} />
                <span className={ROTULO}>{entrada.rotulo}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </PainelRetratil>
  );
}
