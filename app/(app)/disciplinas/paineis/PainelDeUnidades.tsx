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
 *
 * ⚠️ **TABELA SÓ DE LEITURA, COM *EDITAR* POR LINHA, desde 17/10/2026** (spec 016, FR-007.1). Até ali
 * cada linha trazia um formulário de edição aberto e o de acrescentar ficava sempre à vista: abrir uma
 * disciplina mostrava dezenas de campos, e não havia como ler as unidades sem estar editando. Agora a
 * linha abre o formulário **só dela**, e acrescentar fica atrás de um botão. Qual linha está aberta é
 * estado efêmero — não faz sentido num link —, e por isso mora no componente, não na URL.
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
  /** A unidade cujo formulário está aberto — uma por vez. */
  const [editando, setEditando] = React.useState<string | null>(null);
  const [acrescentando, setAcrescentando] = React.useState(false);

  async function executar(
    acao: () => Promise<{ ok: boolean; erro?: string }>,
    feito: string,
  ): Promise<boolean> {
    setErro(null);
    setMensagem(null);
    setOcupado(true);
    const resultado = await acao();
    if (resultado.ok) setMensagem(feito);
    else setErro(resultado.erro ?? "Não foi possível concluir.");
    setOcupado(false);
    return resultado.ok;
  }

  async function acrescentar(dados: FormData) {
    const ok = await executar(
      () =>
        criarUnidadeEnsino({
          disciplinaId,
          numeroUe: String(dados.get("numero_ue") ?? ""),
          topico: String(dados.get("topico") ?? ""),
          chPrevistaTempos: Number(dados.get("ch") ?? 0),
        }),
      "Unidade acrescentada.",
    );
    if (ok) setAcrescentando(false);
  }

  async function gravarEdicao(unidadeId: string, dados: FormData) {
    const ok = await executar(
      () =>
        editarUnidadeEnsino({
          unidadeId,
          numeroUe: String(dados.get("numero_ue") ?? ""),
          topico: String(dados.get("topico") ?? ""),
          chPrevistaTempos: Number(dados.get("ch") ?? 0),
        }),
      "Unidade atualizada.",
    );
    if (ok) setEditando(null);
  }

  const temAcoes = podeEditar || podeDesativar;
  const colunas = temAcoes ? 5 : 4;
  /* ⚠️ **INATIVA USA `--texto-suave`, NÃO `--texto-tenue`, e a guarda do `FR-031` está certa ao
     cobrar.** O que está na linha é VALOR — número, tópico e carga da unidade —, e `--texto-tenue` é
     para rótulo, dica e traço de campo. Quem diz "inativa" é a palavra da coluna Situação. */
  const corDoValor = (ativa: boolean) => (ativa ? "text-texto" : "text-texto-suave");

  return (
    <section aria-labelledby="titulo-das-unidades" className="flex flex-col gap-2">
      <h3 id="titulo-das-unidades" className="text-texto text-sm font-semibold">
        Unidades de ensino
      </h3>

      {avisoDaSoma !== null ? (
        /* ⚠️ Aviso, não bloqueio — ver o cabeçalho. */
        <p className="text-atrasado-tinta text-xs" data-slot="aviso-da-soma">
          {avisoDaSoma}
        </p>
      ) : null}

      {unidades.length > 0 ? (
        <table
          className="w-full border-collapse text-sm"
          data-slot="tabela-de-unidades"
          aria-labelledby="titulo-das-unidades"
        >
          <thead>
            <tr className="border-borda text-texto-suave border-b text-left text-xs">
              <th scope="col" className="py-1 pr-3 font-medium">
                UE
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Tópico
              </th>
              <th scope="col" className="py-1 pr-3 text-right font-medium">
                Tempos
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Situação
              </th>
              {temAcoes ? (
                <th scope="col" className="py-1 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {unidades.map((u) =>
              editando === u.id ? (
                <tr key={u.id} className="border-borda border-b" data-unidade={u.numeroUe}>
                  <td colSpan={colunas} className="py-1">
                    <form
                      action={(dados: FormData) => gravarEdicao(u.id, dados)}
                      className="flex flex-wrap items-center gap-1"
                      data-slot="formulario-da-unidade"
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
                      <Button type="submit" size="sm" disabled={ocupado} data-slot="gravar-unidade">
                        Gravar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={ocupado}
                        onClick={() => setEditando(null)}
                      >
                        Cancelar
                      </Button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className="border-borda border-b" data-unidade={u.numeroUe}>
                  <td className={`py-1 pr-3 ${corDoValor(u.ativa)}`}>{u.numeroUe}</td>
                  <td className={`py-1 pr-3 ${corDoValor(u.ativa)}`}>{u.topico}</td>
                  <td className={`py-1 pr-3 text-right tabular-nums ${corDoValor(u.ativa)}`}>
                    {u.chPrevistaTempos}
                  </td>
                  <td className="text-texto-suave py-1 pr-3">{u.ativa ? "Ativa" : "Inativa"}</td>
                  {temAcoes ? (
                    <td className="py-1">
                      <div className="flex flex-wrap items-center gap-1">
                        {podeEditar ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={ocupado}
                            data-slot="editar-unidade"
                            aria-label={`Editar a unidade ${u.numeroUe}`}
                            onClick={() => {
                              setAcrescentando(false);
                              setEditando(u.id);
                            }}
                          >
                            Editar
                          </Button>
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
                      </div>
                    </td>
                  ) : null}
                </tr>
              ),
            )}
          </tbody>
        </table>
      ) : null}

      {podeEditar && !acrescentando ? (
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={ocupado}
            data-slot="acrescentar-unidade"
            onClick={() => {
              setEditando(null);
              setAcrescentando(true);
            }}
          >
            Acrescentar unidade
          </Button>
        </div>
      ) : null}

      {podeEditar && acrescentando ? (
        <form
          action={acrescentar}
          className="flex flex-wrap items-end gap-2"
          data-slot="formulario-de-unidade-nova"
        >
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
          <Button type="submit" size="sm" disabled={ocupado} data-slot="gravar-unidade-nova">
            Gravar unidade
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={ocupado}
            onClick={() => setAcrescentando(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : null}

      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
    </section>
  );
}
