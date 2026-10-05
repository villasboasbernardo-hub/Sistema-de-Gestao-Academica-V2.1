/**
 * O período previsto **daquela turma** (`FR-030`, critério 4 do Épico 5).
 *
 * ⚠️ **ESTE PAINEL SÓ EXISTE NA VISÃO POR TURMA, e a razão é o requisito.** O período é da linha de
 * `turma_disciplina`, não da disciplina: a mesma disciplina começa em datas diferentes na `T1` e na
 * `T2`. Oferecê-lo no catálogo faria a pessoa gravar um período "da disciplina" que o modelo de dados
 * não tem.
 *
 * ⚠️ **LIMPAR AS DUAS DATAS É UM ESTADO VÁLIDO, e não um erro de preenchimento.** A base copiada tem
 * **121** linhas sem previsão, e voltar a ela é o que alguém faz ao descobrir que a data que digitou
 * era de outra turma. A ação traduz isso para `origem_periodo = 'nao_informado'`, que é o que o
 * `CHECK` do banco exige.
 *
 * ⚠️ **A JANELA DA TURMA É QUEM RECUSA, e ela é do BANCO.** O gatilho levanta `periodo_fora_da_janela`
 * com as datas da turma no `DETAIL`, e a tradução monta a frase com elas. Conferir aqui daria a mesma
 * resposta quase sempre — e não daria nada para quem chamasse a ação por fora.
 */
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definirPeriodoDaTurma } from "@/lib/acoes/disciplina";
import { dataParaLeitura } from "@/lib/formato/data";

export function PainelDePeriodo({
  turmaDisciplinaId,
  previsaoInicio,
  previsaoTermino,
  podeEditar,
}: {
  readonly turmaDisciplinaId: string;
  readonly previsaoInicio: string | null;
  readonly previsaoTermino: string | null;
  readonly podeEditar: boolean;
}) {
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [gravando, setGravando] = React.useState(false);

  async function gravar(dados: FormData) {
    setMensagem(null);
    setErro(null);
    setGravando(true);
    const resultado = await definirPeriodoDaTurma({
      turmaDisciplinaId,
      previsaoInicio: String(dados.get("previsao_inicio") ?? ""),
      previsaoTermino: String(dados.get("previsao_termino") ?? ""),
    });
    if (resultado.ok) setMensagem("Período gravado nesta turma.");
    else setErro(resultado.erro);
    setGravando(false);
  }

  return (
    <section aria-labelledby="titulo-do-periodo" className="flex flex-col gap-2">
      <h3 id="titulo-do-periodo" className="text-texto text-sm font-semibold">
        Período previsto nesta turma
      </h3>

      {!podeEditar ? (
        <p className="text-texto-suave text-sm">
          {/*
            ⚠️ **AQUI É EXIBIÇÃO E MUDA; OS `defaultValue` DOS CAMPOS, QUINZE LINHAS ABAIXO, SÃO
               VALOR E NÃO MUDAM.** `<input type="date">` só aceita `AAAA-MM-DD`: formatar o campo o
               deixaria **vazio** na abertura, e gravar em seguida escreveria nulo sobre o período
               que existia. Os dois usos do MESMO valor convivem neste arquivo de propósito, e é a
               distinção mais fácil de errar da fatia.
          */}
          {previsaoInicio === null
            ? "Não informado."
            : `${dataParaLeitura(previsaoInicio)}${
                previsaoTermino ? ` a ${dataParaLeitura(previsaoTermino)}` : ""
              }`}{" "}
          {/* veste: dica de por que os campos não aparecem */}
          <span className="text-texto-tenue text-xs">
            O seu perfil não edita o período desta turma.
          </span>
        </p>
      ) : (
        <form action={gravar} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`inicio-${turmaDisciplinaId}`}>Início previsto</Label>
            <Input
              id={`inicio-${turmaDisciplinaId}`}
              name="previsao_inicio"
              type="date"
              lang="pt-BR"
              defaultValue={previsaoInicio ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`termino-${turmaDisciplinaId}`}>Término previsto</Label>
            <Input
              id={`termino-${turmaDisciplinaId}`}
              name="previsao_termino"
              type="date"
              lang="pt-BR"
              defaultValue={previsaoTermino ?? ""}
            />
          </div>
          <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-periodo">
            {gravando ? "Gravando…" : "Gravar período"}
          </Button>

          {/* veste: dica de que limpar as duas datas é um estado válido */}
          <span className="text-texto-tenue w-full text-xs">
            Deixar as duas datas em branco volta ao estado “não informado”.
          </span>
        </form>
      )}

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
