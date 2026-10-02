"use client";

/**
 * O formulário de cadastro de conta — **folha de cliente** (`FR-033`, `FR-040`).
 *
 * ⚠️ **A SENHA APARECE UMA VEZ, E ESTA TELA É O ÚNICO LUGAR ONDE ELA EXISTE** (`FR-034`). Ela vem no
 * retorno da Server Action, vive em estado de componente e **não** vai para coluna, log nem endereço.
 * Recarregar a página a perde; o caminho de quem perdeu é *Redefinir senha* na página da conta.
 *
 * ⚠️ **DEPOIS DE CRIAR, O FORMULÁRIO SAI DA TELA E A SENHA FICA.** A primeira escrita mantinha os dois,
 * e o risco era claro: quem clicasse em *Cadastrar* de novo criaria uma segunda conta sem perceber, e a
 * senha da primeira — que ainda não foi copiada — desapareceria.
 *
 * ⚠️ **OS CAMPOS COMPARTILHADOS COM A EDIÇÃO VÊM DE `CamposDaConta`**, para as duas telas não oferecerem
 * listas diferentes de perfil nem exigências diferentes de vínculo.
 */
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cadastrarUsuario } from "@/lib/acoes/usuarios";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { PERFIL_PADRAO_DE_CADASTRO } from "@/lib/dominio/perfis";

import { CamposDaConta, ESCOPO_PADRAO_DE_CADASTRO, type EstadoDaConta } from "../CamposDaConta";
import type { CursoParaVincular } from "../dados-da-conta";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

const INICIAL: EstadoDaConta = {
  // ⚠️ O valor vem do módulo de perfis, nunca escrito aqui: `FR-005` proíbe `snake_case` do enum fora
  //    dele, e a razão da escolha está documentada lá.
  perfil: PERFIL_PADRAO_DE_CADASTRO,
  escopo: ESCOPO_PADRAO_DE_CADASTRO,
  cursos: [],
  vinculoDeDocente: "",
};

export function FormularioDeCadastro({
  cursos,
  instrutores,
  escala,
}: {
  readonly cursos: readonly CursoParaVincular[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
}) {
  const [estado, definirEstado] = useState<EstadoDaConta>(INICIAL);
  const [senha, definirSenha] = useState<string | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [ocupado, definirOcupado] = useState(false);

  async function enviar(dados: FormData) {
    definirErro(null);
    definirOcupado(true);

    const resultado = await cadastrarUsuario({
      nome: String(dados.get("nome") ?? ""),
      email: String(dados.get("email") ?? ""),
      perfil: estado.perfil,
      escopoCurso: estado.escopo,
      cursos: [...estado.cursos],
      instrutorId: estado.vinculoDeDocente,
    });

    if (resultado.ok && "senha" in resultado) definirSenha(resultado.senha);
    else if (!resultado.ok) definirErro(resultado.erro);
    definirOcupado(false);
  }

  if (senha) {
    return (
      <div
        role="status"
        className="border-borda-forte bg-superficie-2 rounded-ciaara flex flex-col gap-2 border p-3"
      >
        <h2 className="text-texto text-sm font-semibold">Conta criada.</h2>
        <p className="text-texto text-sm">
          Senha temporária: <code className="font-semibold">{senha}</code>
        </p>
        {/* veste: advertência colada na credencial — texto de apoio */}
        <p className="text-texto-suave text-xs">
          Ela aparece <strong>uma vez</strong>. Copie agora e entregue à pessoa — recarregar esta
          tela a perde. No primeiro acesso ela será levada à tela de senha nova e não sairá de lá
          antes de definir uma.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/usuarios"
            className="border-borda-forte text-texto hover:bg-marca-suave rounded-ciaara focus-visible:ring-marca border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            Voltar à lista
          </Link>
          {/*
            ⚠️ CADASTRAR OUTRA LIMPA A SENHA DA TELA, de propósito: a pessoa confirmou que copiou ao
               escolher seguir, e deixar a anterior visível faria duas credenciais conviverem na tela.
          */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              definirSenha(null);
              definirEstado(INICIAL);
            }}
          >
            Cadastrar outra
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={enviar} className="flex max-w-xl flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-texto-suave text-xs" htmlFor="nome-da-conta">
          Nome completo
        </label>
        <input id="nome-da-conta" name="nome" required minLength={3} className={CAMPO} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-texto-suave text-xs" htmlFor="email-da-conta">
          E-mail
        </label>
        <input id="email-da-conta" name="email" type="email" required className={CAMPO} />
        {/* veste: aviso de que o e-mail não muda depois — texto de apoio */}
        <span className="text-texto-tenue text-xs">
          É com ele que a pessoa entra, e ele <strong>não é editável depois</strong>.
        </span>
      </div>

      <CamposDaConta
        estado={estado}
        aoMudar={definirEstado}
        cursos={cursos}
        instrutores={instrutores}
        escala={escala}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupado}>
          {ocupado ? "Cadastrando…" : "Cadastrar usuário"}
        </Button>
        <Link
          href="/admin/usuarios"
          className="border-borda-forte text-texto hover:bg-marca-suave rounded-ciaara focus-visible:ring-marca border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          Cancelar
        </Link>
      </div>

      {erro ? (
        <p role="alert" className="text-erro text-sm">
          {erro}
        </p>
      ) : null}
    </form>
  );
}
