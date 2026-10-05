/**
 * Datas para leitura — o PONTO ÚNICO do formato brasileiro (`DD/MM/AAAA`), documento 24,
 * `lib/formato/`.
 *
 * ⚠️ DATA DE CALENDÁRIO NÃO PASSA POR `Date`. `new Date("2021-03-01")` é meia-noite **em UTC**, e em
 * `America/Sao_Paulo` isso é 28/02 às 21h: a ficha mostraria o dia anterior ao gravado, sem erro. A
 * coluna é `date`, sem hora; a conversão é de texto para texto.
 *
 * ⚠️ **ESTAS FUNÇÕES SÃO AS ÚNICAS AUTORIZADAS A ESCREVER DATA NA TELA** *(decisão de Bernardo Villas
 * Boas, 05/10/2026: toda exibição em `DD/MM/AAAA`, dois dígitos de dia e mês, quatro de ano, barra)*.
 * A guarda `tests/unidade/formato-de-data.test.ts` reprova quem montar o formato por conta própria.
 * ⚠️ **E A DECISÃO É SÓ DE EXIBIÇÃO:** banco, URL, valor de `<input type="date">`, chave de ordenação
 * e aritmética de calendário continuam em **ISO** (`AAAA-MM-DD`). Formatar um desses é defeito, e o
 * caro é o do formulário: um `<input type="date">` que receba `05/10/2026` abre **vazio**, e gravar
 * em seguida escreve nulo sobre a janela que existia, sem erro na tela.
 */

/** O fuso da apresentação. O banco guarda UTC; a CIAARA-11 lê em `America/Sao_Paulo`. */
const FUSO_DA_CIAARA = "America/Sao_Paulo";

/** `AAAA-MM-DD` → `DD/MM/AAAA`. Vazio ou fora do formato devolve "—", nunca "Invalid Date". */
export function dataParaLeitura(valor: string | null | undefined): string {
  const casamento = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor?.trim() ?? "");
  if (!casamento) return "—";
  const [, ano, mes, dia] = casamento;
  return `${dia}/${mes}/${ano}`;
}

/** `true` quando `dataParaLeitura` não conseguiu ler o valor — serve de porteiro a quem interpola. */
export function dataIlegivel(formatada: string): boolean {
  return formatada === "—";
}

/**
 * `timestamptz` → `DD/MM/AAAA`, no fuso da CIAARA-11.
 *
 * ⚠️ **ELA É IRMÃ DE `dataParaLeitura`, E NÃO SUBSTITUTA: O TIPO DO DADO É OUTRO.** `ultimo_acesso`
 * chega como `2026-10-03T14:11:09.123Z` e **não casa** a regex da irmã — passá-lo para lá devolveria
 * `"—"` em silêncio, onde havia uma data. Aqui o `Date` é legítimo, porque o valor **é** um instante.
 *
 * ⚠️ **O FUSO É DECLARADO, E ISSO CONSERTA UM DEFEITO QUE EXISTIA** (medido em 05/10/2026): as duas
 * telas de conta chamavam `new Date(…).toLocaleDateString("pt-BR")` **sem** `timeZone`, e o fuso que
 * valia era o do PROCESSO — `America/Sao_Paulo` nesta máquina e **UTC na Vercel**. Um acesso às 22h
 * de Brasília aparecia com a data do dia seguinte no preview e com a data certa no local: verde na
 * máquina de quem programa, errado para quem usa.
 */
export function instanteParaLeitura(valor: string | null | undefined): string {
  const instante = emInstante(valor);
  if (instante === null) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_DA_CIAARA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/**
 * `timestamptz` → `DD/MM/AAAA, HH:MM`, no fuso da CIAARA-11.
 *
 * ⚠️ **O SEGUNDO FICA FORA.** Quem lê *"último acesso"* decide com o dia e a hora; o segundo só
 * alarga a coluna. Se algum dia um rastro de auditoria precisar dele, a função nasce ao lado — não
 * se acrescenta um parâmetro aqui, porque seria o mesmo nome com dois contratos.
 */
export function instanteComHoraParaLeitura(valor: string | null | undefined): string {
  const instante = emInstante(valor);
  if (instante === null) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_DA_CIAARA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instante);
}

/** O instante, ou `null` — nunca `Invalid Date` adiante (`RN-DEG-01`). */
function emInstante(valor: string | null | undefined): Date | null {
  const texto = valor?.trim() ?? "";
  if (texto === "") return null;
  const instante = new Date(texto);
  return Number.isNaN(instante.getTime()) ? null : instante;
}
