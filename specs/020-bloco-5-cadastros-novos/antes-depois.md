# Antes × depois da conversão da capacitação didática — spec 020 (Bloco 5), C-10

*Conversão **autorizada** por Bernardo Villas Boas (resposta 12 da triagem de 16/10/2026), com backup e antes × depois
medido e registrado.*

## O ensaio, sobre a cópia do remoto (20/10/2026)

- **Artefato:** a cópia datada `remoto-20261020-195426.sql` (`python -m scripts.manutencao.dado_do_remoto`, modo
  completo), restaurada na base local **depois** das três migrations — então a M2 rodou sobre a tabela vazia e a
  conversão foi chamada à mão, com a **mesma função** que a M2 chama no remoto (`app.converter_capacitacoes_didaticas()`).
- **Instrumento:** `docker exec … psql` com o roteiro do ensaio; "hoje" = 20/10/2026 no alerta de docência.

### Antes — o texto como está no remoto

| Situação | Instrutores | Com texto de capacitação |
|---|---|---|
| ativo | 180 | 31 |
| inativo | 1 | 0 |

| Texto | Instrutores |
|---|---|
| `C-Exp-TE` | 11 |
| `C-Esp-DID` | 10 |
| `Licenciatura` | 6 |
| `C-Exp-TE, C-Esp-DID` | 2 |
| `Licenciatura, C-Esp-DID` | 1 |
| `Licenciatura, C-Exp-TE` | 1 |

### Depois — a lista fechada

| Lista | Texto a corrigir | Instrutores |
|---|---|---|
| `{C-Exp-TE}` | — | 11 |
| `{C-Esp-DID}` | — | 10 |
| `{Licenciatura}` | — | 6 |
| `{C-Esp-DID,C-Exp-TE}` | — | 2 |
| `{C-Esp-DID,Licenciatura}` | — | 1 |
| `{C-Exp-TE,Licenciatura}` | — | 1 |

### O que pediu ser listado no fim

- **Casaram: 31 de 31** (inteiros). **Em parte: 0. Não casaram: 0** — nenhum aviso de *"Capacitação a corrigir"* nasce
  com o dado de hoje.
- **O veredito não mudou** (C-12): *"tem capacitação"* mudou em **0** dos 181; o alerta de docência há mais de um ano sem
  capacitação dá **0 antes e 0 depois** (nenhum instrutor sem capacitação tem a data de início no CIAARA há mais de um
  ano).
- **O texto antigo ficou intocado** nos 181 (md5 da coluna por linha, antes × depois: **0** diferenças).
- **Idempotente:** a segunda chamada converte **0**.

### pgTAP sobre esta base

**939** asserções em **63** arquivos; `143_bloco_5.sql` **ok**. Reprovam cinco arquivos, **todos pré-existentes e
dependentes do dado do remoto**, nenhum tocado por esta spec: `090` (R-05/R-07 — lançamentos da sincronização sem
procedência de ETL), `099` (o remoto tem 14 salas, o inventário declara 8), `108` (`PEND-014-5`), `112` (`PEND-014-4`) e
`115` (a cópia tem mais de um Admin; o arquivo pressupõe um só, a classe da `PEND-5a-5`).

## A aplicação no remoto

[pendente — depois do CI verde: backup citado, dry-run só com as três, `db push`, conferência só de leitura]
