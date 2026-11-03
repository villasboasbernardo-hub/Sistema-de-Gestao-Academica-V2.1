/**
 * *Novo tipo* do catálogo de tipos de atividade — **folha de cliente** (Bloco 18, spec 033, RA-1, FR-001.3).
 *
 * ⚠️ **A CLASSIFICAÇÃO ABRE SEM PADRÃO**: AEC, TAD ou TR mudam onde o tempo do lançamento conta, e um padrão silencioso
 *    gravaria escolha que ninguém fez (o mesmo cuidado da natureza da sala, `FR-029.6`).
 * ⚠️ **O NOME É A CHAVE E O RÓTULO**: depois de gravado, só o rótulo se edita — a chave é o que o gatilho, a
 *    sincronização e o ETL casam.
 * ⚠️ **O FORMULÁRIO ABRE NUM DIÁLOGO** (RT-3), pelo ícone do topo da página (RT-1).
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { CampoObrigatorio, propsDoControle } from "@/components/ciaara/campo-obrigatorio";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { acrescentarTipo } from "@/lib/acoes/tipos-de-atividade";
import { CLASSIFICACOES_DO_CATALOGO } from "@/lib/dominio/atividades/catalogo-de-tipos";

export function NovoTipoDeAtividade() {
  return (
    <DialogoDeFormulario
      titulo="Novo tipo de atividade"
      descricao="O nome vira a chave do tipo e não muda depois; o rótulo e a classificação padrão se editam."
      slot="dialogo-do-tipo-de-atividade"
      gatilho={
        <BotaoDeIcone
          acao="novo"
          rotulo="Novo tipo de atividade"
          variante="padrao"
          data-slot="novo-tipo-de-atividade"
        />
      }
    >
      {(fechar) => <CadastroDoTipo fechar={fechar} />}
    </DialogoDeFormulario>
  );
}

function CadastroDoTipo({ fechar }: { readonly fechar: () => void }) {
  const router = useRouter();
  const [rotulo, definirRotulo] = React.useState("");
  const [classificacao, definirClassificacao] = React.useState("");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function gravar(evento: React.FormEvent) {
    evento.preventDefault();
    definirGravando(true);
    definirErro(null);
    const resultado = await acrescentarTipo({ rotulo, classificacao });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    fechar();
    router.refresh();
  }

  return (
    <form onSubmit={gravar} className="flex flex-col gap-3" data-slot="formulario-do-tipo-de-atividade">
      {erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="erro-do-tipo-de-atividade">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <CampoObrigatorio para="tipo-novo-nome" rotulo="Nome do tipo" obrigatorio />
        <Input
          {...propsDoControle("tipo-novo-nome", true)}
          name="rotulo"
          value={rotulo}
          maxLength={80}
          onChange={(e) => definirRotulo(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <CampoObrigatorio para="tipo-novo-classificacao" rotulo="Classificação padrão" obrigatorio />
        <select
          {...propsDoControle("tipo-novo-classificacao", true)}
          name="classificacao"
          value={classificacao}
          onChange={(e) => definirClassificacao(e.target.value)}
          className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
        >
          <option value="">Escolha a classificação</option>
          {CLASSIFICACOES_DO_CATALOGO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-texto-suave text-xs">
          AEC é Atividade Extraclasse. O lançamento do DSA pode trocá-la no «Conta como».
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-tipo-de-atividade">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
