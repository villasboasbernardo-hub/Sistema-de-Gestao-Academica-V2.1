# Checklist de fechamento: as emendas de 15/09/2026 da spec 006

**Propósito**: testar a **redação** dos requisitos emendados no fechamento da fatia 5c — carga semanal
por semana ISO, `FR-017` com data vazia, especialidade opcional, escolaridade em barras, legenda
clicável e ficha A4 paradas. Não testa a implementação.
**Criado**: 15/09/2026, por `/speckit-checklist`
**Feature**: [spec.md](../spec.md) · [contrato de carga horária e alertas](../contracts/carga-horaria-e-alertas.md)
**Público e momento**: revisor do PR, antes do merge. Profundidade padrão; rodado sem perguntas, por
instrução de 15/09/2026.

**Legenda**: `[x]` a redação passa — inclusive quando passou **depois** de uma correção mecânica
feita nesta rodada, anotada no item · `[ ]` pede decisão de Bernardo, e o item diz qual.

## Completude

- [x] CHK001 A regra de composição da carga semanal do instrutor está escrita a ponto de dois leitores chegarem ao mesmo número — semana, janela, soma, o que fica de fora? [Completude, Spec §FR-016, Contrato §A semanal do instrutor] — semana ISO, janela que cobre ao menos um dia, soma das médias, semana sem atribuição fora, soma anual proibida.
- [x] CHK002 O comportamento sem faixa (regime não informado) e com atribuição sem janela ou sem média está definido? [Edge Case, Contrato §A semanal do instrutor] — está no contrato; a spec remete a ele.
- [x] CHK003 A spec diz o que acontece com o `FR-017` quando `data_inicio_docencia_ciaara` está vazia? [Completude, Spec §FR-017] — decidido: não alerta, aviso no quadro.
- [ ] CHK004 O recorte do aviso "Data de início de docência não informada" está decidido — quem está sem a data, ou só quem também está sem capacitação? [Ambiguidade, Spec §FR-017, §FR-027] — ⚠️ **Pede decisão.** A decisão diz "em lugar do alerta"; a implementação lista só quem também está sem capacitação (148 na base real; seriam 176 cobrando todos). **Correção mecânica feita**: a spec atribuía esse recorte à decisão de Bernardo, e agora ele aparece separado, como *leitura aplicada, a confirmar*.
- [ ] CHK005 O período avaliado pelo alerta de faixa está definido — semanas já passadas alertam? a janela de uma atribuição do ano anterior que invade o ano corrente entra? [Gap, Spec §FR-016] — ⚠️ **Pede decisão.** A implementação avalia as atribuições do ano corrente pela data de início prevista (T011 c), inclusive semanas passadas. Registrado no contrato como *leitura aplicada, a confirmar*.
- [x] CHK006 O `FR-005` emendado lista explicitamente os campos que continuam obrigatórios e o tratamento do texto só com espaços na especialidade? [Completude, Spec §FR-005] — quatro campos; branco recusado pelo esquema e pelo `CHECK`.
- [x] CHK007 A US2, o `SC-003`, as *Key Entities* e o `data-model.md` acompanham a emenda do `FR-005`? [Consistência, Spec §US2, §SC-003, §Key Entities] — **correção mecânica feita**: os quatro diziam "cinco"; o `data-model.md` ainda dizia `NOT NULL` para `esp_hab_obs`, falso desde o Épico 2.
- [ ] CHK008 A divergência do `RN-INST-03` entre o documento 04 (cinco campos) e a spec (quatro) está registrada no lugar onde o projeto lista divergências? [Rastreabilidade, Spec §Regras que pareceram estranhas] — **correção mecânica feita**: entrou como item 7. ⚠️ **Pede decisão**: emendar o documento 04 é decisão à parte, como no item 1 da mesma seção.

## Clareza

- [x] CHK009 "Mais de um ano" está quantificado, com o caso de fronteira de um ano exato? [Clareza, Spec §FR-017] — estrito; um ano exato não alerta (dentro da leitura aplicada do CHK004).
- [x] CHK010 A mensagem do alerta de faixa tem formato definido — como a semana é nomeada, a unidade, acima ou abaixo? [Clareza, Contrato §A semanal do instrutor] — `Semana 12/2026 (16/03 a 22/03): 14 h, acima da faixa de 8 a 12 h.`, uma linha por semana.
- [x] CHK011 Os cenários da US4 e o `SC-006` dizem que "previsão" é a carga **por semana coberta**, e não uma média anual? [Clareza, Spec §US4, §SC-006] — **correção mecânica feita**: os dois só diziam "20h previstas" e "14h"; com a decisão da semana ISO, a frase admitia a leitura anual proibida. A US4 ganhou também o cenário 4, da data vazia.
- [ ] CHK012 O título "Campo obrigatório pendente" continua exato quando o aviso cobra a especialidade, que deixou de ser obrigatória? [Ambiguidade, Spec §FR-027] — ⚠️ **Pede decisão.** A decisão manda o aviso cobrar os militares sem especialidade (os 15 da base real são militares), mas a regra escrita cobra **qualquer** instrutor sem ela: um civil cadastrado sem especialidade no futuro também seria cobrado, e nenhuma delimitação para civil está escrita. Falta dizer se o aviso fica restrito a militares e se o título muda.

## Consistência

- [x] CHK013 A contagem de gráficos é a mesma no `FR-026.2`, no `SC-007.1` e no contrato? [Consistência, Spec §FR-026.2, §SC-007.1] — 9 gráficos, 4 de barras e 5 de pizza, nos três.
- [x] CHK014 A proibição de somar o ano inteiro está escrita no requisito, e não só no contrato? [Consistência, Spec §FR-016] — está nos dois.
- [x] CHK015 Nenhum requisito ou contrato ainda anuncia `ta_previsto_semanal` como coluna a entregar? [Consistência, Contrato §tabela de colunas, tasks T014] — a tabela do contrato diz que não é coluna; a T014 foi fechada como superada.
- [x] CHK016 O `FR-018` (aviso, nunca bloqueio) cobre os dois alertas e o aviso novo? [Consistência, Spec §FR-018, §FR-027] — os alertas pelo `FR-018`; o quadro pelo `RN-DEG-02` citado no `FR-027`.

## Cobertura de cenários

- [x] CHK017 Estão cobertos janelas que não se tocam, janelas sobrepostas e os limites exatos da faixa? [Cobertura, Spec §FR-016] — escritos no contrato e exigidos pela decisão de 15/09/2026.
- [x] CHK018 O cenário da janela que começa no meio da semana ISO está descrito, com a consequência sobre `disciplinas.semanas`? [Edge Case, Contrato §A semanal do instrutor] — anotado: pode tocar uma semana ISO a mais do que `semanas` conta.
- [ ] CHK019 A spec diz se os alertas aparecem na ficha de instrutor **inativo**? [Gap, Spec §FR-016, §FR-017, §US5] — ⚠️ **Pede decisão** (baixa urgência). Nada está escrito; hoje a ficha do inativo mostra os alertas como a do ativo.

## Requisitos parados

- [ ] CHK020 O `FR-026.6` (legenda clicável) tem comportamento descrito o bastante para ser implementado? [Completude, Spec §FR-026.6] — ⚠️ **Pede decisão.** A conferência no código real da v2.0 não achou o comportamento. Pela regra 3 do `CLAUDE.md` (*paridade antes de novidade*), sem origem na v2.0 isto é **novidade**, e precisa ser escrito e autorizado como tal.
- [ ] CHK021 O `FR-031` (ficha A4) tem todos os insumos que o layout oficial exige? [Dependência, Spec §FR-031] — ⚠️ **Pede insumo.** Falta o selo oficial "Marinha do Brasil — Hidrografia e Navegação" (`image2.png` do modelo); o brasão do CIAARA já está no repositório.

## Não funcionais

- [ ] CHK022 Existe critério de tempo de resposta para a ficha do instrutor? [Gap, Não funcional] — ⚠️ **Pede decisão.** Nenhum requisito fala em tempo. Medido em 15/09/2026, com a base real: 1,5 a 2,4 s por ficha com um acesso, 4,2 a 5,1 s com quatro simultâneos; `vw_instrutor_carga_anual` custa ~700 ms sob RLS. O ponta a ponta ganhou espera medida e o achado ficou registrado, sem otimização nesta fatia.

## Notas

- **22 itens**: 14 passam — CHK007 e CHK011 depois de correção mecânica nesta rodada — e **8 pedem
  decisão ou insumo** de Bernardo: CHK004, CHK005, CHK008 (só quanto ao documento 04), CHK012, CHK019,
  CHK020, CHK021 e CHK022. CHK004 e CHK008 também receberam correção mecânica e seguem abertos.
- As correções mecânicas desta rodada **não mudam regra nenhuma**: alinham texto que ficou para trás
  de uma decisão já tomada, e separam decisão de leitura onde as duas estavam misturadas (CHK004).
