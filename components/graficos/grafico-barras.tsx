/**
 * Gráfico de barras — genérico (`FR-016`, documento 23 §7).
 *
 * ⚠️ ELE COBRE SEIS DOS SETE GRÁFICOS QUE A SPEC 006 NOMEIA. Aqueles sete são sete **perguntas
 * sobre instrutores**, não sete formas de desenhar; construir sete componentes seria construir a
 * tela do Épico 5 dentro do Design System — a mesma decisão que esta fatia recusou para as três
 * grades em 10/09/2026.
 *
 * ⚠️ ELE **NÃO ORDENA E NÃO AGREGA**. O gráfico de posto/graduação da spec 006 vem *"sempre em
 * ordem de antiguidade"*, e a ordenação alfabética é **proibida** nele — mas quem impõe essa ordem
 * é a função pura, como no seletor. O componente recebe a ordem pronta e a respeita.
 *
 * ⚠️ E UM INSTRUTOR COM DUAS QUALIFICAÇÕES CONTA NAS DUAS BARRAS, enquanto quem tem o campo vazio
 * não conta em nenhuma. **A soma das barras não fecha com o total, e isso é correto.** O componente
 * não "conserta" a soma, porque consertá-la apagaria o fato.
 *
 * ⚠️ O EIXO VERTICAL COMEÇA EM ZERO, E ISSO NÃO É PROPRIEDADE. Eixo truncado exagera diferença, e
 * estes gráficos vão para documento institucional.
 *
 * ⚠️ SEM ANIMAÇÃO DE ENTRADA. A preferência por menos movimento (`FR-029`) valeria de qualquer
 * forma, e a impressão captura o quadro errado quando há animação.
 */
"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Symbols, XAxis, YAxis } from "recharts";

import { MolduraDeGrafico } from "@/components/graficos/moldura";
import { corDaSerie, SIMBOLO_DA_FORMA, type Serie } from "@/components/graficos/tipos";

export type GraficoBarrasProps = {
  readonly series: readonly Serie[];
  readonly rotulo: string;
  readonly altura?: number;
  readonly className?: string;
};

/** Pivota as séries para a forma que a biblioteca espera: uma linha por categoria do eixo. */
function paraLinhas(series: readonly Serie[]): Record<string, string | number>[] {
  const categorias: string[] = [];
  for (const serie of series) {
    for (const ponto of serie.pontos) {
      if (!categorias.includes(ponto.nome)) categorias.push(ponto.nome);
    }
  }
  return categorias.map((nome) => {
    const linha: Record<string, string | number> = { nome };
    for (const serie of series) {
      const ponto = serie.pontos.find((p) => p.nome === nome);
      // ⚠️ Categoria ausente numa série vira 0, e NÃO some: uma barra que desaparece faz o leitor
      // concluir que a categoria não existe, quando o que houve foi a série não tê-la.
      linha[serie.chave] = ponto?.valor ?? 0;
    }
    return linha;
  });
}

export function GraficoBarras({ series, rotulo, altura = 260, className }: GraficoBarrasProps) {
  const linhas = paraLinhas(series);

  return (
    <MolduraDeGrafico
      series={series}
      rotulo={rotulo}
      altura={altura}
      {...(className === undefined ? {} : { className })}
    >
      <div data-slot="grafico-barras" className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={linhas} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--borda)" vertical={false} />
            <XAxis
              dataKey="nome"
              tick={{ fill: "var(--texto-suave)", fontSize: 11 }}
              stroke="var(--borda-forte)"
            />
            {/* ⚠️ `domain` começando em zero, fixo — ver o cabeçalho. */}
            <YAxis
              domain={[0, "auto"]}
              allowDecimals={false}
              tick={{ fill: "var(--texto-suave)", fontSize: 11 }}
              stroke="var(--borda-forte)"
            />
            {series.map((serie, i) => (
              <Bar
                key={serie.chave}
                dataKey={serie.chave}
                name={serie.rotulo}
                fill={corDaSerie(i)}
                isAnimationActive={false}
                /*
                 * ⚠️ O MARCADOR DE FORMA VAI EM CIMA DA BARRA, não só na legenda (`FR-018`). É o
                 * que mantém duas séries distinguíveis quando a cor some — impressa em cinza ou
                 * lida por quem não distingue cores. Com até quatro séries o rótulo também vai
                 * direto; acima disso a legenda assume, e o marcador continua nos dois lugares.
                 */
                label={(props: {
                  x?: string | number | undefined;
                  y?: string | number | undefined;
                  width?: string | number | undefined;
                }) => {
                  // A biblioteca tipa as coordenadas como texto OU número — ela aceita as duas
                  // formas em SVG. O marcador precisa de número para calcular o centro da barra.
                  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
                  const y = Number(props.y ?? 0) - 8;
                  return (
                    <Symbols
                      type={SIMBOLO_DA_FORMA[serie.forma]}
                      cx={x}
                      cy={y}
                      size={60}
                      fill={corDaSerie(i)}
                    />
                  );
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </MolduraDeGrafico>
  );
}
