/**
 * Quem responde por um papel do lançamento: o instrutor do cadastro e, quando a regra aceita, o «outro responsável
 * (nome livre)» — `RN-RESP-1`, emenda de 15/10/2026 à spec 014.
 *
 * ⚠️ **QUEM DECIDE É `regraDoResponsavel`** (`lib/dominio/responsavel.ts`), recebida por propriedade: este componente
 *    só desenha. O campo livre aparece porque a regra diz `nomeLivre`, nunca por uma lista de tipos escrita aqui.
 * ⚠️ **CADASTRO OU NOME LIVRE, NÃO OS DOIS**: com um instrutor escolhido o campo livre some (e quem monta o lançamento
 *    manda o nome livre nulo); no papel em que o instrutor é OPCIONAL, «Tirar o instrutor» devolve o campo livre.
 * ⚠️ **O SELETOR É O CANÔNICO** (`SeletorInstrutor`, `RN-ANT-01`, gotcha 12): nenhuma escolha de instrutor é
 *    construída aqui.
 * ⚠️ **A LISTA VAZIA DIZ O MOTIVO** (spec 029, `FR-006`): aqui ela é o cadastro ativo inteiro — a aula vazia não chega
 *    a este componente (a frase da D-32 a substitui antes) —, então vazia com `instrutores.ler` é *"Nenhum instrutor
 *    ativo no cadastro"*, e sem a permissão é o «você não vê» do seletor. Uma falha de leitura já aparece na faixa da
 *    semana (`aviso-de-leitura`).
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA**: digitar e escolher são interação.
 */
"use client";

import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { vazioDaListaDeInstrutores } from "@/lib/dominio/dsa/instrutores-da-aula";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { ROTULO_NOME_LIVRE, type RegraDoResponsavel } from "@/lib/dominio/responsavel";

export type ResponsavelOuNomeLivreProps = {
  readonly regra: RegraDoResponsavel;
  readonly instrutores: readonly InstrutorParaExibir[];
  /** O perfil tem `instrutores.ler`? Decidido no servidor: o «você não vê» da lista vazia (FR-006 da spec 029). */
  readonly podeLerInstrutores: boolean;
  readonly escala: EscalaDeAntiguidade;
  /** O rótulo do seletor do cadastro ("Quem ministra", "Fiscal do cadastro (opcional)"…). */
  readonly rotuloDoCadastro: string;
  /** Com legenda, o grupo vira um `fieldset` — é o que diz de QUEM é o nome livre (fiscal, quem conduz). */
  readonly legenda?: string;
  /** O `id` do campo livre; o rótulo dele é sempre `ROTULO_NOME_LIVRE`. */
  readonly idDoNomeLivre: string;
  readonly exemplo: string;
  readonly instrutorId: string;
  readonly aoMudarInstrutor: (id: string) => void;
  readonly nomeLivre: string;
  readonly aoMudarNomeLivre: (texto: string) => void;
  readonly slot: string;
};

export function ResponsavelOuNomeLivre({
  regra,
  instrutores,
  podeLerInstrutores,
  escala,
  rotuloDoCadastro,
  legenda,
  idDoNomeLivre,
  exemplo,
  instrutorId,
  aoMudarInstrutor,
  nomeLivre,
  aoMudarNomeLivre,
  slot,
}: ResponsavelOuNomeLivreProps) {
  const conteudo = (
    <>
      <SeletorInstrutor
        instrutores={instrutores}
        escala={escala}
        valor={instrutorId}
        aoMudar={aoMudarInstrutor}
        rotulo={rotuloDoCadastro}
        vazio={vazioDaListaDeInstrutores(podeLerInstrutores, "sem-cadastro")}
      />
      {regra.instrutorDoCadastro === "opcional" && instrutorId !== "" ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="self-start"
          data-slot="tirar-instrutor-do-cadastro"
          onClick={() => aoMudarInstrutor("")}
        >
          Tirar o instrutor do cadastro
        </Button>
      ) : null}
      {regra.nomeLivre && instrutorId === "" ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor={idDoNomeLivre}>{ROTULO_NOME_LIVRE}</Label>
          <Input
            id={idDoNomeLivre}
            value={nomeLivre}
            onChange={(e) => aoMudarNomeLivre(e.target.value)}
            placeholder={exemplo}
          />
        </div>
      ) : null}
    </>
  );
  if (legenda === undefined) {
    return (
      <div className="flex flex-col gap-1" data-slot={slot}>
        {conteudo}
      </div>
    );
  }
  return (
    <fieldset
      className="border-borda rounded-ciaara flex flex-col gap-1 border p-2"
      data-slot={slot}
    >
      <legend className="text-texto-suave px-1 text-xs">{legenda}</legend>
      {conteudo}
    </fieldset>
  );
}
