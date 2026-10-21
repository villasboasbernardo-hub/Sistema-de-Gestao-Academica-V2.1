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

## A aplicação no remoto (20/10/2026, depois do CI verde no PR #79, run `39514018767`)

- **Backup antes:** `remoto-20261020-204113.sql` (`--somente-copia`, 4.157 KB, fora do repositório).
- **Dry-run:** listou **só** as três — `20261020213440`, `20261020213441` e `20261020213443`.
- **`supabase db push --linked`:** as três aplicadas, na ordem, sem erro.
- **Conferência só de leitura, na hora:**
  - **87 e 87** migrations, nenhuma só de um lado;
  - impressão digital do esquema **idêntica nos dois bancos** — **2.237 objetos, `1ba390aa…`**, `diff` vazio nas 2.238
    linhas (era `39af6fd9…`, 2.201, antes: as 36 a mais são as colunas, o tipo, as funções, a tabela, a view e as
    policies desta spec);
  - `vw_instrutores` e `vw_acessos_por_conta` com `security_invoker=true`; **0** policies de `DELETE` no catálogo;
  - balde `curriculos` **privado**, 20.971.520 bytes, `{application/pdf}`, **vazio**, com 3 policies (`SELECT`,
    `INSERT`, `UPDATE`);
  - **a conversão no remoto deu o mesmo que o ensaio**: 181 instrutores, **31** com o texto antigo (intacto), **31** com a
    lista, **0** a corrigir, e a mesma distribuição (11 · 10 · 6 · 2 · 1 · 1);
  - 24 cursos, nenhum com campo novo preenchido; **0** acessos gravados; 7 contas vivas; 29 turmas;
  - Production respondendo como antes (`/login` e `/estilo` **200**, as protegidas **307**).

⚠️ **Até o merge, a Production roda a `main`**, cujo formulário ainda grava a capacitação **no texto antigo**: uma edição
de capacitação feita na Production nesse intervalo muda o texto e **não** a lista. O preview do PR já grava na lista.
