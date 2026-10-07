/**
 * As ações de um lançamento já na grade — **mover, editar e excluir** (`RF-DSA-07`, `FR-029` a
 * `FR-032`, `RNF-USA-03`, `Q-1`, `Q-12` · spec 013, PR 4).
 *
 * ⚠️ **O CAMINHO PRIMÁRIO É O TECLADO, E ISSO É REQUISITO, não preferência.** O `RF-DSA-07` pede
 * mover *"por arrastar-e-soltar **E** por uma alternativa de teclado/menu"* — e a alternativa não é
 * consolo: `Enter` na célula abre este painel, e daqui se move escolhendo **dia** e **tempo** em
 * dois campos e acionando *Mover*. Arrastar vive na grade e chega ao **mesmo** `mover`.
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** Ela guarda o que está sendo digitado antes de gravar — que
 * não existe no servidor — e as três ações **chegam por propriedade**, nunca por `import` de
 * `@/lib/acoes/` (Princípio XI, imposto pelas guardas de fronteira).
 *
 * ⚠️ **ELA NÃO LÊ BANCO E NÃO CALCULA NADA.** O dia, o tempo, as unidades e os instrutores chegam
 * prontos; quem decide se o movimento é possível é a Server Action, e quem impõe é o banco. Uma
 * conferência de teto escrita aqui seria a segunda implementação da `RN-DIST-03`.
 *
 * ⚠️ **A EXCLUSÃO DESCREVE O EFEITO ANTES DE ACONTECER** (`RNF-USA-03`), e o `DialogoConfirmacao`
 * cobra isso no tipo: `consequencia` é **obrigatória**, porque *"sem isto o diálogo só atrasa o
 * clique"*. E ela diz a verdade: exclusão é **lógica** (regra 4), e o lançamento volta reativando.
 */
"use client";

import * as React from "react";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { OrigemDoFato } from "@/lib/dominio/dsa/posicao-herdada";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { dataComDiaDaSemana } from "@/lib/formato/data";

import { EscolhaSimples } from "./EscolhaSimples";
import type { ResultadoDaAcao, UnidadeOferecida } from "./FormularioDeLancamento";

/** O fato escolhido, como a grade o conhece — **de exibição**, nunca de gravação. */
export type FatoEscolhido = {
  readonly fatoId: string;
  readonly origem: OrigemDoFato;
  readonly data: string;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  readonly disciplina: string | null;
  readonly conteudo: string | null;
  readonly local: string | null;
  readonly tecnica: string | null;
  readonly instrutor: string | null;
  /** `origem_migracao_v1 != null && editado_em == null` — é o que a catraca da `Q-1` lê. */
  readonly herdado: boolean;
  /** `true` quando o fato está na faixa "Sem posição" (`Q-12`). */
  readonly semPosicao: boolean;
};

export type AcoesDoBlocoProps = {
  readonly fato: FatoEscolhido;
  /** Os dias da semana aberta — o destino possível do movimento. */
  readonly dias: readonly string[];
  /** Quantos Tempos de Aula a grade tem. */
  readonly linhas: number;
  readonly unidades: readonly UnidadeOferecida[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
  readonly tecnicas: readonly string[];
  readonly mover: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly editar: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly excluir: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly aoFechar: () => void;
};

type Aba = "mover" | "editar";

export function AcoesDoBloco({
  fato,
  dias,
  linhas,
  unidades,
  instrutores,
  escala,
  tecnicas,
  mover,
  editar,
  excluir,
  aoFechar,
}: AcoesDoBlocoProps) {
  const [aba, definirAba] = React.useState<Aba>("mover");
  /*
   * ⚠️ **O DESTINO NASCE NO LUGAR ATUAL, e isso evita um movimento acidental de um clique.** Um
   * destino vazio obrigaria a escolher duas coisas para mover um TA ao lado; nascendo no lugar
   * atual, mover é trocar **um** campo.
   */
  const [dia, definirDia] = React.useState(fato.data);
  const [ta, definirTa] = React.useState(String(fato.taInicial ?? 1));
  const [unidade, definirUnidade] = React.useState("");
  const [tempos, definirTempos] = React.useState(String(fato.tempos ?? 1));
  const [local, definirLocal] = React.useState(fato.local ?? "");
  const [conteudo, definirConteudo] = React.useState(fato.conteudo ?? "");
  const [tecnica, definirTecnica] = React.useState(fato.tecnica ?? "");
  const [instrutorId, definirInstrutor] = React.useState("");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [avisos, definirAvisos] = React.useState<readonly { codigo: string; texto: string }[]>([]);
  const [agindo, definirAgindo] = React.useState(false);

  async function executar(acao: () => Promise<ResultadoDaAcao>): Promise<void> {
    definirRecusa(null);
    definirAvisos([]);
    definirAgindo(true);
    const resposta = await acao();
    definirAgindo(false);
    if (!resposta.ok) {
      definirRecusa(resposta.mensagem);
      return;
    }
    definirAvisos(resposta.avisos);
    /* Sem aviso, o painel fecha; com aviso, ele fica para a pessoa LER (`RN-DEG-02`). */
    if (resposta.avisos.length === 0) aoFechar();
  }

  const unidadeEscolhida = unidade === "" ? null : unidade;

  const titulo = [fato.disciplina, fato.conteudo].filter(Boolean).join(" — ") || "Lançamento";

  return (
    <section
      data-slot="acoes-do-bloco"
      aria-label={`Ações de ${titulo}`}
      className="rounded-ciaara border-borda bg-superficie flex flex-col gap-3 border p-3"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <strong className="text-sm text-texto" data-slot="bloco-escolhido">
            {titulo}
          </strong>
          <span className="text-xs text-texto-suave">
            {/*
              ⚠️ O estado é dito em **texto**: *"sem posição"* não é uma cor na faixa, é a palavra.
            */}
            {fato.semPosicao
              ? `${dataComDiaDaSemana(fato.data)} · sem posição`
              : `${dataComDiaDaSemana(fato.data)} · a partir do tempo ${fato.taInicial ?? "—"}`}
          </span>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={aoFechar}>
          Fechar
        </Button>
      </header>

      <div className="flex flex-wrap gap-1" role="group" aria-label="O que fazer">
        {(
          [
            ["mover", fato.semPosicao ? "Posicionar" : "Mover para…"],
            ["editar", "Editar"],
          ] as readonly (readonly [Aba, string])[]
        ).map(([valor, rotulo]) => (
          <Button
            key={valor}
            type="button"
            size="sm"
            variant={aba === valor ? "default" : "outline"}
            aria-pressed={aba === valor}
            onClick={() => definirAba(valor)}
            data-aba={valor}
          >
            {rotulo}
          </Button>
        ))}
      </div>

      {/*
        ⚠️ **A UNIDADE SÓ É PEDIDA ONDE A CATRACA A EXIGE** (`Q-1`, segunda metade, `FR-028`): linha
           **migrada e nunca editada** que não tem UE. Mover é editar — o gatilho carimba
           `editado_em` —, e naquele instante o `CHECK` passa a cobrar a unidade. Oferecer o campo
           sempre faria a pessoa achar que precisa trocar a UE a cada movimento.
      */}
      {fato.herdado && fato.origem === "aula" ? (
        <EscolhaSimples
          id="dsa-unidade-da-catraca"
          rotulo="Unidade de ensino (exigida para mexer nesta linha)"
          textoVazio="Escolha a unidade…"
          valor={unidade}
          aoMudar={definirUnidade}
          ajuda="Esta aula veio da migração sem unidade. A decisão UE-1 exige a unidade em toda linha editada."
          opcoes={unidades.map((u) => ({
            valor: u.id,
            rotulo: `${u.disciplinaCodigo} · UE ${u.numero} — ${u.topico}`,
          }))}
        />
      ) : null}

      {aba === "mover" ? (
        <div className="flex flex-wrap items-end gap-2">
          <EscolhaSimples
            id="dsa-mover-dia"
            rotulo="Dia"
            valor={dia}
            aoMudar={definirDia}
            opcoes={dias.map((d) => ({ valor: d, rotulo: dataComDiaDaSemana(d) }))}
          />
          <EscolhaSimples
            id="dsa-mover-ta"
            rotulo="Tempo de Aula"
            valor={ta}
            aoMudar={definirTa}
            opcoes={Array.from({ length: Math.max(linhas, 1) }, (_, i) => ({
              valor: String(i + 1),
              rotulo: String(i + 1),
            }))}
          />
          <Button
            type="button"
            size="sm"
            disabled={agindo}
            data-slot="confirmar-movimento"
            onClick={() =>
              executar(() =>
                mover({
                  fatoId: fato.fatoId,
                  origem: fato.origem,
                  data: dia,
                  taInicial: Number(ta),
                  unidadeEnsinoId: unidadeEscolhida,
                }),
              )
            }
          >
            {agindo ? "Movendo…" : fato.semPosicao ? "Posicionar" : "Mover"}
          </Button>
        </div>
      ) : null}

      {aba === "editar" ? (
        <div className="flex flex-col gap-2">
          {/*
            ⚠️ **NENHUM DESTES CAMPOS TOCA O CATÁLOGO** (`SC-012`). É a correção do `D-4`: na
               planilha, instrutor, local e técnica eram atributo **do item do catálogo**, e trocar
               o instrutor de uma UE **reescrevia todo DSA passado**. Aqui o valor é da LINHA.
          */}
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="dsa-editar-tempos">Quantos tempos</Label>
              <Input
                id="dsa-editar-tempos"
                type="number"
                min={1}
                max={12}
                value={tempos}
                onChange={(e) => definirTempos(e.target.value)}
                className="w-24 tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="dsa-editar-local">Local</Label>
              <Input
                id="dsa-editar-local"
                value={local}
                onChange={(e) => definirLocal(e.target.value)}
              />
            </div>
          </div>

          {fato.origem === "aula" || fato.origem === "avaliacao" ? (
            <>
              <div className="flex flex-col gap-1">
                <Label htmlFor="dsa-editar-conteudo">Tópico</Label>
                <Input
                  id="dsa-editar-conteudo"
                  value={conteudo}
                  onChange={(e) => definirConteudo(e.target.value)}
                />
              </div>
              <EscolhaSimples
                id="dsa-editar-tecnica"
                rotulo="Técnica de ensino"
                textoVazio="—"
                valor={tecnica}
                aoMudar={definirTecnica}
                opcoes={tecnicas.map((t) => ({ valor: t, rotulo: t }))}
              />
              {/*
                ⚠️ **TROCAR O INSTRUTOR PASSA PELO PORTEIRO DA HABILITAÇÃO** (`RN-INST-01`, *Risco:
                   Alto*). Sem isso haveria **uma porta lateral**: lançar com quem é habilitado e
                   depois trocar por quem não é. A recusa chega como frase, abaixo.
              */}
              <SeletorInstrutor
                instrutores={instrutores}
                escala={escala}
                valor={instrutorId}
                aoMudar={definirInstrutor}
                rotulo="Trocar quem ministra (opcional)"
              />
            </>
          ) : null}

          <div>
            <Button
              type="button"
              size="sm"
              disabled={agindo}
              data-slot="confirmar-edicao"
              onClick={() =>
                executar(() =>
                  editar({
                    fatoId: fato.fatoId,
                    origem: fato.origem,
                    tempos: Number(tempos),
                    local,
                    ...(fato.origem === "aula" || fato.origem === "avaliacao"
                      ? { conteudo, tecnica }
                      : {}),
                    /*
                     * ⚠️ **CAMPO VAZIO NÃO É MANDADO, e a distinção é a que a spec 011 pagou
                     * caro**: `undefined` é *"não mexi nisso"* e `null` é *"apague"*. Mandar o
                     * instrutor vazio **apagaria** quem ministra a aula, sem nenhuma tela dizendo.
                     */
                    ...(instrutorId === "" ? {} : { instrutorId }),
                    ...(unidadeEscolhida === null ? {} : { unidadeEnsinoId: unidadeEscolhida }),
                  }),
                )
              }
            >
              {agindo ? "Gravando…" : "Gravar as mudanças"}
            </Button>
          </div>
        </div>
      ) : null}

      {recusa ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-da-acao">
          {recusa}
        </p>
      ) : null}

      {avisos.length > 0 ? (
        <div role="status" data-slot="avisos-da-acao" className="flex flex-col gap-1">
          <p className="text-sm font-medium text-atrasado-tinta">
            Feito, com {avisos.length} aviso(s):
          </p>
          <ul className="list-disc pl-5 text-sm text-atrasado-tinta">
            {avisos.map((a) => (
              <li key={a.codigo}>{a.texto}</li>
            ))}
          </ul>
          <Button type="button" size="sm" variant="outline" onClick={aoFechar}>
            Entendi
          </Button>
        </div>
      ) : null}

      <footer className="border-borda flex border-t pt-2">
        <DialogoConfirmacao
          titulo="Excluir este lançamento?"
          /*
           * ⚠️ **A CONSEQUÊNCIA DIZ A VERDADE, e a verdade é que a exclusão é LÓGICA** (regra 4).
           * *"Será apagado para sempre"* seria falso aqui — e treinar a pessoa a ler consequência
           * falsa é pior que não mostrar diálogo.
           */
          consequencia={
            fato.origem === "vista_prova"
              ? "A segunda data (a vista de prova) sai do DSA. A avaliação em si continua lançada — elas são o mesmo fato."
              : "O lançamento sai da grade e do DSA impresso, e deixa de contar na carga horária. Ele não é apagado do banco: fica inativo, e pode voltar."
          }
          rotuloConfirmar="Excluir"
          aoConfirmar={() =>
            void executar(() => excluir({ fatoId: fato.fatoId, origem: fato.origem }))
          }
        >
          <Button type="button" size="sm" variant="outline" data-slot="excluir-bloco">
            Excluir
          </Button>
        </DialogoConfirmacao>
      </footer>
    </section>
  );
}
