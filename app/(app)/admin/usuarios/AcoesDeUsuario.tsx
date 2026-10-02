"use client";

/**
 * As ações do Admin sobre **outra** conta. Folha — o `"use client"` para aqui.
 *
 * ⚠️ A recusa do último Admin chega do BANCO, e a tela só a mostra. A conferência na Server
 * Action existe para dar mensagem legível antes; a do gatilho existe para que a legível não seja
 * a única coisa entre o sistema e um estado sem volta (FR-016).
 *
 * ⚠️ **AS AÇÕES SOBRE A PRÓPRIA CONTA NÃO APARECEM, E ISSO É O REQUISITO** (`FR-041`): *"a ação MUST
 * NOT aparecer na tela"*. Desabilitar o botão com uma dica seria mostrar uma porta trancada; o pedido
 * é que a porta não exista. ⚠️ **E A RAZÃO FICA ESCRITA ONDE OS BOTÕES ESTARIAM**, senão a ausência se
 * lê como defeito — quem administra procuraria o botão e concluiria que a tela está quebrada.
 *
 * ⚠️ **A SENHA TEMPORÁRIA APARECE UMA VEZ, E SÓ AQUI** (`FR-034`). Ela vem no retorno da Server
 * Action, vive em estado de componente e **não** vai para coluna, log nem endereço. Recarregar a
 * página a perde — o caminho de quem perdeu é redefinir de novo, que gera outra.
 */
import { useState } from "react";

import {
  desativar,
  editarNomeDeConta,
  editarPerfilEEscopo,
  reativar,
  redefinirSenha,
  reenviarConvite,
} from "@/lib/acoes/usuarios";
import { perfisPorDivisao, rotuloDoPerfil } from "@/lib/dominio/perfis";

type Resposta = { ok: boolean; erro?: string; senha?: string };

const BOTAO =
  "border-borda-forte text-texto hover:bg-marca-suave rounded-ciaara-sm focus-visible:ring-marca border px-2 py-0.5 text-xs focus-visible:ring-2 focus-visible:outline-none";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara-sm focus-visible:ring-marca border px-2 py-0.5 text-xs focus-visible:ring-2 focus-visible:outline-none";

export function AcoesDeUsuario({
  usuarioId,
  temCredencial,
  ativo,
  nomeExibicao,
  perfil,
  escopoCurso,
  ehMinhaConta,
}: {
  readonly usuarioId: string;
  readonly temCredencial: boolean;
  readonly ativo: boolean;
  readonly nomeExibicao: string;
  readonly perfil: string;
  readonly escopoCurso: string;
  readonly ehMinhaConta: boolean;
}) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState<"nome" | "perfil" | null>(null);

  async function executar(acao: () => Promise<Resposta>) {
    setOcupado(true);
    setMensagem(null);
    setAviso(null);
    const r = await acao();
    if (!r.ok) setMensagem(r.erro ?? "Não foi possível concluir.");
    else if (r.senha) setSenhaGerada(r.senha);
    else setAviso("Pronto.");
    setOcupado(false);
    if (r.ok) setEditando(null);
  }

  /*
   * ⚠️ **A PRÓPRIA CONTA SAI DAQUI COM A RAZÃO ESCRITA.** Sem a frase, a célula vazia parece
   *    defeito; com ela, quem administra entende que é desenho e sabe o que fazer — pedir a outro
   *    Administrador (`FR-041`).
   */
  if (ehMinhaConta) {
    // veste: a razão de a própria conta não ter ações — texto explicativo, não valor
    return (
      <span className="text-texto-tenue text-xs">
        Esta é a sua conta. Trocar o próprio perfil, desativar-se ou redefinir a própria senha por
        aqui não é possível — peça a outro Administrador. Para a sua senha, use{" "}
        <strong>Trocar a minha senha</strong> no seu perfil.
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-2">
        {!temCredencial ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => executar(() => reenviarConvite({ usuarioId }))}
            className={BOTAO}
          >
            Reenviar convite
          </button>
        ) : null}

        <button
          type="button"
          disabled={ocupado}
          onClick={() => setEditando(editando === "nome" ? null : "nome")}
          className={BOTAO}
        >
          Editar nome
        </button>

        <button
          type="button"
          disabled={ocupado}
          onClick={() => setEditando(editando === "perfil" ? null : "perfil")}
          className={BOTAO}
        >
          Editar perfil
        </button>

        {/*
          ⚠️ **SEM CREDENCIAL NÃO HÁ SENHA A REDEFINIR**, e o botão não aparece: a conta está na
             janela do convite ainda não aceito, e o caminho dela é «Reenviar convite». Oferecer
             «Redefinir senha» ali mandaria a pessoa a uma recusa que a tela já sabia dar.
        */}
        {temCredencial ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => executar(() => redefinirSenha({ usuarioId }) as Promise<Resposta>)}
            className={BOTAO}
          >
            Redefinir senha
          </button>
        ) : null}

        {ativo ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => executar(() => desativar({ usuarioId }))}
            className={BOTAO}
          >
            Desativar
          </button>
        ) : (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => executar(() => reativar({ usuarioId }))}
            className={BOTAO}
          >
            Reativar
          </button>
        )}
      </span>

      {editando === "nome" ? (
        <form
          className="flex flex-wrap items-center gap-1"
          action={(dados) =>
            executar(() =>
              editarNomeDeConta({
                usuarioId,
                nomeExibicao: String(dados.get("nomeExibicao") ?? ""),
              }),
            )
          }
        >
          <label className="text-texto-suave text-xs" htmlFor={`nome-${usuarioId}`}>
            Nome de exibição
          </label>
          <input
            id={`nome-${usuarioId}`}
            name="nomeExibicao"
            defaultValue={nomeExibicao}
            className={CAMPO}
          />
          <button type="submit" disabled={ocupado} className={BOTAO}>
            Gravar nome
          </button>
        </form>
      ) : null}

      {editando === "perfil" ? (
        <form
          className="flex flex-wrap items-center gap-1"
          action={(dados) =>
            executar(() =>
              editarPerfilEEscopo({
                usuarioId,
                perfil: String(dados.get("perfil") ?? ""),
                escopoCurso: escopoCurso,
                cursos: [],
              }),
            )
          }
        >
          <label className="text-texto-suave text-xs" htmlFor={`perfil-${usuarioId}`}>
            Perfil de acesso
          </label>
          {/*
            ⚠️ **OS NOVE, AGRUPADOS POR DIVISÃO** (`FR-040.1`, decisão D-1). Oferecer um subconjunto
               deixaria perfis sem caminho de atribuição pela tela — e `perfisPorDivisao()` é o
               MESMO ponto único que o formulário de convite usa, para que as duas telas nunca
               ofereçam listas diferentes.
          */}
          <select
            id={`perfil-${usuarioId}`}
            name="perfil"
            defaultValue={perfil}
            className={CAMPO}
            aria-label="Perfil de acesso"
          >
            {perfisPorDivisao().map((grupo) => (
              <optgroup key={grupo.divisao} label={grupo.divisao}>
                {grupo.perfis.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="submit" disabled={ocupado} className={BOTAO}>
            Gravar perfil
          </button>
          {/* veste: dica do perfil vigente e de quando a troca passa a valer */}
          <span className="text-texto-tenue text-xs">
            Hoje: {rotuloDoPerfil(perfil)}. O perfil novo vale na próxima tela que a pessoa abrir —
            ela não precisa sair e entrar.
          </span>
        </form>
      ) : null}

      {/*
        ⚠️ A SENHA FICA EM BLOCO PRÓPRIO, com a advertência colada nela. Mostrá-la na mesma linha
           dos botões faria uma credencial em claro passar por mensagem de status.
      */}
      {senhaGerada ? (
        <span
          role="status"
          className="border-borda-forte bg-superficie-2 rounded-ciaara-sm flex flex-col gap-0.5 border px-2 py-1"
        >
          <span className="text-texto text-xs font-semibold">
            Senha temporária: <code>{senhaGerada}</code>
          </span>
          <span className="text-texto-suave text-xs">
            Ela aparece <strong>uma vez</strong>. Copie agora e entregue à pessoa — recarregar esta
            tela a perde, e as sessões abertas dela foram encerradas. No próximo acesso, ela será
            levada à tela de senha nova e não sairá de lá antes de definir uma.
          </span>
        </span>
      ) : null}

      {aviso ? (
        <span role="status" className="text-texto-suave text-xs">
          {aviso}
        </span>
      ) : null}
      {mensagem ? (
        <span role="alert" className="text-erro text-xs">
          {mensagem}
        </span>
      ) : null}
    </span>
  );
}
