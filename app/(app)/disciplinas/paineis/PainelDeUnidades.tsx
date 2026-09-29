/**
 * As Unidades de Ensino da disciplina (`FR-060` a `FR-063`, D-B3).
 *
 * ⚠️ **DISCIPLINA SEM UE NÃO RENDERIZA A SEÇÃO — NEM AVISA QUE FALTAM** (`FR-061`). Ter UE é **dado**,
 * não dedução: das 175 disciplinas reais, **138 têm** e 37 não. Avisar *"faltam unidades"* nas 37
 * inventaria uma pendência que ninguém tem. Quem decide é `lib/dominio/modelo-do-curriculo.ts`, e
 * quem chama este painel já perguntou.
 *
 * ⚠️ **A SOMA AVISA, NUNCA BLOQUEIA** (`FR-062`, `RN-DEG-02`). Uma UE sozinha nunca fecha a CH da
 * disciplina; recusar a primeira impediria de construir qualquer currículo.
 *
 * ⚠️ **UE INATIVA CONTINUA NA LISTA** (regra 4). Ela sai da soma e some da atribuição por unidade —
 * sumir da tela seria exclusão com outro nome, e ninguém conseguiria reativá-la.
 */
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  criarUnidadeEnsino,
  desativarUnidadeEnsino,
  editarUnidadeEnsino,
  reativarUnidadeEnsino,
} from "@/lib/acoes/unidade-ensino";

import type { UnidadeDaLinha } from "../consulta";
import { DialogoDeExclusao } from "./DialogoDeExclusao";

export function PainelDeUnidades({
  disciplinaId,
  unidades,
  avisoDaSoma,
  podeEditar,
  podeDesativar,
}: {
  readonly disciplinaId: string;
  readonly unidades: readonly UnidadeDaLinha[];
  readonly avisoDaSoma: string | null;
  readonly podeEditar: boolean;
  readonly podeDesativar: boolean;
}) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);

  async function executar(acao: () => Promise<{ ok: boolean; erro?: string }>, feito: string) {
    setErro(null);
    setMensagem(null);
    setOcupado(true);
    const resultado = await acao();
    if (resultado.ok) setMensagem(feito);
    else setErro(resultado.erro ?? "Não foi possível concluir.");
    setOcupado(false);
  }

  async function acrescentar(dados: FormData) {
    await executar(
      () =>
        criarUnidadeEnsino({
          disciplinaId,
          numeroUe: String(dados.get("numero_ue") ?? ""),
          topico: String(dados.get("topico") ?? ""),
          chPrevistaTempos: Number(dados.get("ch") ?? 0),
        }),
      "Unidade acrescentada.",
    );
  }

  return (
    <section aria-labelledby="titulo-das-unidades" className="flex flex-col gap-2">
      <h3 id="titulo-das-unidades" className="text-texto text-sm font-semibold">
        Unidades de ensino
      </h3>

      {avisoDaSoma !== null ? (
        /* ⚠️ Aviso, não bloqueio — ver o cabeçalho. */
        <p className="text-alerta text-xs" data-slot="aviso-da-soma">
          {avisoDaSoma}
        </p>
      ) : null}

      <ul className="flex flex-col gap-1" data-slot="lista-de-unidades">
        {unidades.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-2 text-sm">
            {/* ⚠️ **INATIVA USA `--texto-suave`, NÃO `--texto-tenue`, e a guarda do `FR-031` está
                certa ao cobrar.** O que está aqui é VALOR — número, tópico e carga da unidade —, e
                `--texto-tenue` é para rótulo, dica e traço de campo. Apagar um valor até o limite da
                legibilidade para dizer "inativa" troca a mensagem pela cor; quem diz é a palavra. */}
            <span className={u.ativa ? "text-texto" : "text-texto-suave"}>
              {u.numeroUe} — {u.topico} ({u.chPrevistaTempos} tempos)
              {!u.ativa ? " · inativa" : ""}
            </span>

            {podeEditar ? (
              <form
                action={async (dados: FormData) => {
                  await executar(
                    () =>
                      editarUnidadeEnsino({
                        unidadeId: u.id,
                        numeroUe: String(dados.get("numero_ue") ?? ""),
                        topico: String(dados.get("topico") ?? ""),
                        chPrevistaTempos: Number(dados.get("ch") ?? 0),
                      }),
                    "Unidade atualizada.",
                  );
                }}
                className="flex flex-wrap items-center gap-1"
              >
                <Input
                  name="numero_ue"
                  aria-label={`Número da unidade ${u.numeroUe}`}
                  defaultValue={u.numeroUe}
                  className="w-16"
                />
                <Input
                  name="topico"
                  aria-label={`Tópico da unidade ${u.numeroUe}`}
                  defaultValue={u.topico}
                  className="w-64"
                />
                <Input
                  name="ch"
                  type="number"
                  min={1}
                  step={1}
                  aria-label={`Carga horária da unidade ${u.numeroUe}`}
                  defaultValue={u.chPrevistaTempos}
                  className="w-20"
                />
                <Button type="submit" size="sm" variant="outline" disabled={ocupado}>
                  Salvar
                </Button>
              </form>
            ) : null}

            {podeDesativar ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={ocupado}
                  onClick={() =>
                    void executar(
                      () =>
                        u.ativa
                          ? desativarUnidadeEnsino({ unidadeId: u.id })
                          : reativarUnidadeEnsino({ unidadeId: u.id }),
                      u.ativa ? "Unidade desativada." : "Unidade reativada.",
                    )
                  }
                >
                  {u.ativa ? "Desativar" : "Reativar"}
                </Button>

                <DialogoDeExclusao
                  tipo="unidade_de_ensino"
                  nome={`${u.numeroUe} — ${u.topico}`}
                  codigo={u.codigo}
                  identificador={u.id}
                />
              </>
            ) : null}
          </li>
        ))}
      </ul>

      {podeEditar ? (
        <form action={acrescentar} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`numero-nova-${disciplinaId}`}>Número</Label>
            <Input id={`numero-nova-${disciplinaId}`} name="numero_ue" required className="w-20" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`topico-nova-${disciplinaId}`}>Tópico</Label>
            <Input id={`topico-nova-${disciplinaId}`} name="topico" required className="w-72" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`ch-nova-${disciplinaId}`}>Tempos</Label>
            <Input
              id={`ch-nova-${disciplinaId}`}
              name="ch"
              type="number"
              min={1}
              step={1}
              required
              className="w-20"
            />
          </div>
          <Button type="submit" size="sm" disabled={ocupado} data-slot="acrescentar-unidade">
            Acrescentar unidade
          </Button>
        </form>
      ) : null}

      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-erro text-sm">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
