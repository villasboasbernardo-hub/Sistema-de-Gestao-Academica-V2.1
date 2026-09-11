# Procedência da identidade institucional

**`RF-INI-05`** · Épico 4, fatia (c) · registrado em 11/09/2026

## O que está aqui

| Arquivo                       | Dimensões   | Peso   | Destino                                      |
| ----------------------------- | ----------- | ------ | -------------------------------------------- |
| `brasao-ciaara.png`           | 794 × 1123  | 221 KB | tela — cabeçalho e casca de autenticação     |
| `brasao-ciaara-impressao.png` | 3250 × 4913 | 6,0 MB | impressão — rotas `/print/*`, Épicos 10 e 11 |

Os dois são PNG com transparência, medidos na entrega.

## De onde vieram

**Fornecidos por Bernardo em 11/09/2026**, durante a especificação desta fatia. São o brasão
institucional do **Centro de Instrução e Adestramento Almirante Radler de Aquino**, da Marinha do
Brasil — a própria organização a que este sistema serve.

⚠️ **A pergunta que originou este arquivo foi "de onde vem o arquivo?".** Ela precisou ser feita
porque o `RF-INI-05` exigia o brasão desde a Fase 1 e **não havia brasão no repositório** — medido em
11/09/2026, `public/` só tinha os desenhos padrão do arcabouço. A pendência é anterior a esta versão:
a spec 009 da v2.0 já registrava _"3 assets de brasão ainda ausentes"_.

## Por que este arquivo existe

⚠️ **É o mesmo tratamento que a fatia (a) deu à tipografia**, e pelo mesmo motivo: arquivo binário
versionado sem procedência escrita é arquivo que ninguém sabe de onde veio quando a pergunta
aparecer — e ela aparece sempre no pior momento, que é o da publicação.

## Duas escolhas registradas

**1. Duas resoluções, e não uma.** Não existe versão vetorial. Mandar a de impressão para o cabeçalho
multiplicaria por vinte e oito o peso de um desenho que aparece a quarenta pixels de altura; usar a
de tela na impressão daria um brasão borrado num documento oficial. **Sem vetor, não há atalho.**

**2. Nome sem acento e sem espaço.** Os arquivos chegaram como `Brasão CIAARA PNG.png` e
`Brasão CIAARA.png`. Espaço vira `%20` na URL, e acento depende da codificação que o servidor
escolher. A convenção é a mesma de `public/fontes/`, fixada na fatia (a).

⚠️ **Um vetor resolveria os dois destinos com um arquivo só.** Converter, porém, é redesenhar brasão
institucional, e o Princípio I não autoriza recriar identidade oficial por conveniência técnica.
Fica registrado como o caminho, se um dia a versão oficial em vetor existir.
