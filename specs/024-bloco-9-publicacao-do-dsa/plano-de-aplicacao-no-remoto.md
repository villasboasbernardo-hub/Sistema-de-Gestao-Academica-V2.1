# Plano de aplicação no remoto — spec 024 (Bloco 9)

Duas migrations: **M1** `20261023161631_publicacao_do_dsa_estrutura` (só acrescenta) e **M2**
`20261023161634_publicacao_do_dsa_so_o_salvo_conta` (o portão autorizado por Bernardo Villas Boas em 22/10/2026: o filtro
`salvo` em tudo o que soma ou cruza lançamentos).

## Executado em 23/10/2026, depois do CI verde nos três blocos sobre `416e77a`

| Passo | Resultado |
|---|---|
| Backup (`dado_do_remoto --somente-copia`) | **`remoto-20261023-192656.sql`** |
| Remedição sobre o backup (restaurado no local; `impressao_digital_do_que_soma.sql`) | as 12 leituras **idênticas** com M1/M2 e depois da reversão; a reversão volta ao esquema do remoto objeto a objeto (`e5b55421…`, 2.425 objetos, `diff` vazio) |
| Dry-run (`supabase db push --linked --dry-run`) | só as duas desta spec |
| `supabase db push --linked` | aplicadas as duas |
| Migrations | as mesmas nos dois lados, até `20261023161634` |
| Esquema (`impressao_digital_do_esquema.sql`) | **idêntico** local × remoto: `80345112…`, 2.573 objetos, `diff` vazio |
| O que soma, lido no remoto (só leitura) | 10 resumos iguais aos de antes; `vw_avaliacoes_situacao` e `vw_instrutor_carga_anual` com resumo diferente e as **580 linhas iguais, texto a texto**, ao local com o backup — a diferença do resumo é a ordem da colação do remoto no `string_agg(… order by x::text)` |
| Policies de `DELETE` | 0 |
| `security_invoker` | nas 9 views recriadas ou novas |
| Dado novo | 0 rascunhos, 0 eventos da trilha, 0 disciplinas marcadas presencial |
| Production | `/login` e `/estilo` 200; as protegidas 307 |

## Reversão

`reversao.sql`, provada duas vezes com dado (cópias `remoto-20261023-140753.sql` e `remoto-20261023-192656.sql`). ⚠️ Vale
antes do uso real: depois, desfazer apaga a trilha das publicações; o primeiro passo dela inativa os rascunhos para
nenhum passar a contar.
