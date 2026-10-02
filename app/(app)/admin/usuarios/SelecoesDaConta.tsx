"use client";

/**
 * As duas escolhas fechadas da conta: **perfil de acesso** e **escopo**.
 *
 * ⚠️ **ELAS MORAM EM ARQUIVO PRÓPRIO POR CAUSA DE UMA GUARDA, e isso é desenho, não contorno.** O
 * `SC-002` reprova **qualquer** arquivo que mencione instrutor **e** contenha `<select` — a `RN-ANT-01`
 * é de Risco Alto e vale por ponto único, e a guarda é ampla de propósito (gotcha 12 do `CLAUDE.md`).
 * Os formulários de conta oferecem o vínculo de instrutor; se estes dois `<select>` morassem lá, a
 * guarda reprovaria com razão. **O conserto é usar o canônico e mover o que não é dele para cá** —
 * nunca excepcionar a guarda.
 *
 * ⚠️ **NENHUMA PALAVRA "instrutor" APARECE NO CÓDIGO DESTE ARQUIVO.** A varredura lê código **sem
 * comentário**, então esta explicação é segura; um `instrutorId` entre as propriedades não seria.
 *
 * ⚠️ **OS NOVE PERFIS SAEM DE `perfisPorDivisao()`, o mesmo ponto único das outras telas** (`FR-040.1`,
 * decisão D-1). Oferecer um subconjunto deixaria perfis sem caminho de atribuição pela tela.
 */
import { perfisPorDivisao } from "@/lib/dominio/perfis";
import { Constants } from "@/lib/tipos/database";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

/** Os rótulos de tela do escopo — o valor do banco é `snake_case`, a tela não é. */
const ROTULO_DO_ESCOPO: Readonly<Record<string, string>> = {
  geral: "Geral — todos os cursos",
  regular: "Regular",
  expedito: "Expedito",
  estagio_qualificacao: "Estágio de qualificação",
  ead_semipresencial: "EAD / semipresencial",
  aperfeicoamento_avancado: "Aperfeiçoamento avançado",
  especial: "Especial",
};

export function SeletorDePerfil({
  valor,
  aoMudar,
  dica,
}: {
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly dica: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-texto-suave text-xs" htmlFor="perfil-da-conta">
        Perfil de acesso
      </label>
      <select
        id="perfil-da-conta"
        name="perfil"
        required
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className={CAMPO}
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
      {/* veste: a dica do perfil escolhido — texto de apoio, dito ANTES de alguém errar */}
      <span className="text-texto-tenue text-xs">{dica}</span>
    </div>
  );
}

export function SeletorDeEscopo({
  valor,
  aoMudar,
  restringe,
}: {
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  /** O escopo restringe este perfil? Quando não, a tela diz que ele é inerte em vez de esconder. */
  readonly restringe: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-texto-suave text-xs" htmlFor="escopo-da-conta">
        Escopo
      </label>
      <select
        id="escopo-da-conta"
        name="escopo"
        required
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        className={CAMPO}
      >
        {Constants.public.Enums.escopo_curso.map((e) => (
          <option key={e} value={e}>
            {ROTULO_DO_ESCOPO[e] ?? e}
          </option>
        ))}
      </select>
      {/*
        ⚠️ **ESCONDER O CAMPO SERIA PIOR**: quem administra procuraria o escopo, não o acharia, e
           concluiria que a tela está incompleta. Dizer que ele não muda nada é a informação.
        veste: o aviso de que o campo é inerte para este perfil — texto de apoio, não valor
      */}
      {!restringe ? (
        <span className="text-texto-tenue text-xs">
          Para este perfil o escopo não altera o que a pessoa vê.
        </span>
      ) : null}
    </div>
  );
}
