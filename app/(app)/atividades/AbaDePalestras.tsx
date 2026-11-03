/**
 * Bloco 18 (spec 033, RA-3, RA-5, RA-7 e RA-9; FR-006.1 a FR-006.3 e FR-006.5) — a aba «Palestras» do módulo
 * Atividades: as AEC previstas do currículo de TODAS as turmas do ano escolhido no cabeçalho, com a situação, a data, o
 * palestrante e o local, e as palestras fora do currículo; *Registrar cumprimento* e *Desfazer* do trio.
 *
 * ⚠️ **O ANO É O DA TURMA** (RA-7, RT-6): as turmas de `ano_letivo = ano`, e a arquivada CONTA nas linhas e nos números
 *    (RT-8) — ela só some das opções do filtro de turma, e não ganha ação.
 * ⚠️ **A TURMA EAD PURA FICA DE FORA**: ela não tem DSA (spec 024, FR-018), e as previstas dela ficariam «a cumprir» para
 *    sempre, contando contra o N de M. Dito na tela, com o número.
 * ⚠️ **FILTROS E ESTATÍSTICAS SÃO ÍCONES NA BARRA** (RT-4): os números saem das MESMAS linhas que a tabela mostra.
 * ⚠️ **«NÃO HÁ» × «VOCÊ NÃO VÊ» × «NÃO FOI POSSÍVEL LER»** (gotcha 4).
 * ⚠️ Sem marcador de cliente: as folhas são o quadro, os filtros e os painéis.
 */
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ConteudoDePainel,
  GatilhoDePainel,
  ProvedorDePaineis,
} from "@/components/ciaara/paineis-da-pagina";
import { pode } from "@/lib/autorizacao/matriz";
import {
  avulsasDaAba,
  filtrarPalestras,
  linhasDePalestras,
  numerosDasPalestras,
  opcoesDeCurso,
  opcoesDeTurma,
  situacaoDePalestraValida,
  type FiltroDePalestras,
} from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";

import { AbasDeAtividades } from "./AbasDeAtividades";
import type { ContextoDoModulo } from "./contexto";
import { EstatisticasDePalestras } from "./EstatisticasDoPlanejado";
import { FiltrosDePalestras } from "./FiltrosDoPlanejado";
import { lerTurmasDoAno } from "./leitura-de-palestras-e-apoinst";
import { lerPalestrasDasTurmas } from "./leitura-do-planejado";
import { QuadroDePalestras } from "./QuadroDePalestras";

export async function AbaDePalestras({ contexto }: { readonly contexto: ContextoDoModulo }) {
  const { valores, ano } = contexto;
  const situacaoNaUrl = String(valores.situacao ?? "");
  const filtro: FiltroDePalestras = {
    turma: String(valores.turma ?? ""),
    curso: String(valores.curso ?? ""),
    situacao: situacaoDePalestraValida(situacaoNaUrl) ? situacaoNaUrl : "",
    vinculo: String(valores.vinculo ?? ""),
  };
  const podeLer = pode(contexto.permissoes, "atividades_nao_letivas", "ler");
  const podeMarcar = pode(contexto.permissoes, "planejamento_de_atividades", "editar");

  const doAno = podeLer ? await lerTurmasDoAno(ano) : { turmas: [], erro: null };
  const comDsa = doAno.turmas.filter((t) => !t.eadPura);
  const semDsa = doAno.turmas.length - comDsa.length;
  const lidas = await lerPalestrasDasTurmas(comDsa);
  const erro = doAno.erro ?? lidas.erro;

  const todas = {
    linhas: linhasDePalestras(comDsa, lidas.quadros),
    avulsas: avulsasDaAba(comDsa, lidas.avulsas),
  };
  const recorte = filtrarPalestras(todas, filtro);
  const numeros = numerosDasPalestras(recorte.linhas, recorte.avulsas);
  const contar = (f: FiltroDePalestras) => {
    const r = filtrarPalestras(todas, f);
    return r.linhas.length + r.avulsas.length;
  };
  const ativos = filtrosForaDoPadrao("/atividades", filtro);
  const haFiltro = ativos > 0;

  const corpo = !podeLer ? (
    <EstadoVazio
      motivo="sem-permissao"
      titulo="O seu perfil não lê as atividades"
      detalhe="Quem nega o acesso é o banco, e a lista chegaria vazia por isso — não por falta de palestra."
    />
  ) : erro ? (
    <EstadoVazio
      motivo="sem-permissao"
      titulo="Não foi possível ler as palestras agora"
      detalhe={erro}
    />
  ) : comDsa.length === 0 ? (
    <EstadoVazio
      motivo="sem-dado"
      titulo={`Nenhuma turma com DSA em ${ano}`}
      detalhe="As palestras são das turmas do ano escolhido, no canto superior direito."
    />
  ) : (
    <QuadroDePalestras
      linhas={recorte.linhas}
      avulsas={recorte.avulsas}
      comTurma
      podeMarcar={podeMarcar}
      turmaDaFicha={null}
      hoje={contexto.hoje}
    />
  );

  return (
    <ProvedorDePaineis>
      <div className="flex flex-col gap-4" data-slot="lista-de-atividades">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-texto text-xl font-semibold">Atividades</h1>
            <p className="text-texto-suave text-sm" data-slot="contagem-de-palestras">
              {numeros.cumpridas} de {numeros.previstas} AEC previstas do currículo cumpridas e{" "}
              {numeros.avulsas} palestra{numeros.avulsas === 1 ? "" : "s"} fora do currículo em{" "}
              {ano}
              {haFiltro ? " neste recorte" : ""}
              {semDsa > 0
                ? ` (${semDsa} turma${semDsa === 1 ? "" : "s"} EAD sem DSA fora da conta)`
                : ""}
              . O lançamento é feito no DSA da turma.
            </p>
          </div>
          <BarraDeAcoes rotulo="Ações das palestras">
            <GatilhoDePainel painel="filtros" contagem={ativos} />
            <GatilhoDePainel painel="estatisticas" />
          </BarraDeAcoes>
        </header>

        <AbasDeAtividades comCalendario={contexto.temCalendario}>
          <ConteudoDePainel painel="filtros">
            <FiltrosDePalestras
              turmas={opcoesDeTurma(comDsa, (codigo) => contar({ ...filtro, turma: codigo }))}
              cursos={opcoesDeCurso(comDsa, (codigo) => contar({ ...filtro, curso: codigo }))}
            />
          </ConteudoDePainel>
          <ConteudoDePainel painel="estatisticas">
            <EstatisticasDePalestras numeros={numeros} recorte={haFiltro} />
          </ConteudoDePainel>
          {corpo}
        </AbasDeAtividades>
      </div>
    </ProvedorDePaineis>
  );
}
