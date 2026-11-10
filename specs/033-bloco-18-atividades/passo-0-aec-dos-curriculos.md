# Passo 0 — AEC previstas nos currículos (medição de 03/11/2026)

**O que foi medido e contra o quê** (regra 9.2):

- **Storage (remoto, só leitura):** o balde `curriculos` tem **0** objetos, e `curriculos.pdf_caminho` é nulo nos **24**
  currículos. **Não há currículo futuro**: cada curso tem só o currículo 1, vigente desde 01/01/2026.
- **PDFs lidos:** os **24** PDFs de `SIS11/Curriculos/` (os mesmos do catálogo de UEs de 26/09/2026), extraídos com
  `pdftotext -enc UTF-8 -layout`; o do EST-QF-APOC não tem camada de texto e foi lido como imagem.
- **Cadastro da aba Atividades do curso (remoto, só leitura):** `limites_curriculo`, **30** linhas ativas.
- **1 HORA do currículo = 1 TA** (D-1 da spec 006).

Legenda: **Obrig.** = o texto manda fazer («será realizada», «deverão») × facultativa («poderá»). **Cômputo** = onde o
texto manda contar. Itens que o currículo põe na **UE da disciplina** (aula prática, embarque, levantamento de fim de
curso) **não são AEC** e estão separados no fim.

## 1. Limites — PDF × cadastro

| Curso | AEC (PDF / cadastro) | TAD (PDF / cadastro) | TR (PDF / cadastro) | Confere? |
|---|---|---|---|---|
| CAHO | 166 / 166 | — / — | 166 / 166 | sim |
| C-Ap-FR | 110 / 110 | — / — | 126 / 126 | sim |
| C-Ap-HN | 65 / 65 | — / — | 78 / 78 | sim |
| C-Espc-FR | 80 / 80 | 62 / 62 | 57 / 57 | sim |
| C-Espc-HN | 80 / 80 | 62 / 62 | 112 / 112 | sim |
| C-Esp-ALH | 30 / 30 | — / — | 20 / 20 | sim |
| C-Esp-ME | 43 / 43 | — / — | 42 / 42 | sim |
| C-Esp-OpAP | 1 / 1 | — / — | 2 / 2 | sim |
| C-Exp-Ag-Mag | 10 / 10 | — / — | 10 / 10 | sim |
| C-Exp-BATI | 3 / 3 | — / — | 4 / 4 | sim |
| C-Exp-MetocOf | 6 / 6 | — / — | 15 / 15 | sim |
| C-Exp-Obs-ME | 5 / 5 | — / — | 20 / 20 | sim |
| EST-QF-APHID | — / — | — / — | 8 / 8 | sim |
| EST-QF-EM2040PHS | — / — | — / — | 4 / 4 | sim |
| EST-QF-MAREFLU | — / — | — / — | 4 / 4 | sim |
| EST-QF-PGRS100 | — / — | — / — | 5 / 5 | sim |
| **EST-QF-APOC** | — / — | — / — | **1 / —** | **NÃO: o PDF tem 1 h de TR e o cadastro não tem a linha** |
| C-ApA-AuxNav-PR-SP, C-ApA-OcOp-PR-SP, C-ApA-PCN-PR-EAD, C-ApA-PrevMe-PR-EAD, C-Exp-Metoc-OF-SP, EST-QF-NAVFLU-EAD, EST-QF-PROC-MF-EAD | — | — | — | sim (sem AEC, TAD nem TR) |

## 2. AEC previstas por nome

### CAHO — AEC 166 · TR 166

| # | Nome (grafia do PDF) | Tipo | TA | Disciplina | Obrig. | Cômputo | Página |
|---|---|---|---|---|---|---|---|
| 1 | SEGURANÇA ORGÂNICA (SEGORG) | Palestra | 1 | — | sim | AEC | A-74 (Anexo B) |
| 2 | AMAZÔNIA AZUL (AMAZUL) | Palestra | 4 | — | sim | AEC | A-76 (Anexo C) |
| 3 | EDUCAÇÃO FINANCEIRA (EDFIN) | Palestra | 2 | — | sim | AEC | A-78 (Anexo D) |
| 4 | ESTRATÉGIA NACIONAL DE DEFESA (END) | Palestra | 2 | — | sim | AEC | A-80 (Anexo E) |
| 5 | Visita orientada ao Centro de Auxílios à Navegação Almirante Moraes Rego (CAMR) | Visita | 4 | VIII Auxílios à Navegação | sim | AEC | A-31 |
| 6 | Visitas ao CHM (UE 3 e 4) | Visita | 6 | XV Gerenciamento de Dados Hidrográficos | sim | AEC | A-51 |
| 7 | Visita à Divisão de Previsões Ambientais e à Divisão de Previsão Numérica (CH-12 e CH-13) | Visita | 2 | V Meteorologia | sim | não diz | A-22 |
| 8 | Visita à oficina de Agulhas Magnéticas da BHMN | Visita | — | XII Agulhas Náuticas | sim | não diz | A-43 |
| 9 | Corrida diurna e noturna de balizamento na Baía de Guanabara (1 dia, Aviso Balizador do CAMR) | Prática | 1 dia | VIII Auxílios à Navegação | sim | não diz | A-31 |
| 10 | Visita técnica à Raia Acústica em Arraial do Cabo (CASOP) | Visita | — | XIII Acústica Submarina | não | AEC | A-46 |
| 11 | Visita ao Centro de Pesquisa da Eletrobrás (CEPEL) | Visita | — | VIII Auxílios à Navegação | não | não diz | A-31 |
| 12 | Palestras e/ou visitas a órgãos da MB e extra-MB | Outra | — | XI Navegação: Sistemas e Normas | não | não diz | A-40 |

Com TA e cômputo AEC explícitos: **19 TA** (palestras 9 + CAMR 4 + CHM 6); **21** se a visita de Meteorologia for AEC.
Também usam «CH das atividades extraclasse», sem TA: o trabalho de III Estatística (A-16) e os T1–T3 de X Marés (A-38).
Genéricos (2.5): visitas de estudo a organizações congêneres («serão realizadas»), palestras de interesse, orientação
educacional. ⚠️ A 2.5 b) manda as palestras de «Segurança Orgânica, **Educação Ambiental**, Educação Financeira e
Estratégia Nacional de Defesa» dos anexos B a E, mas o Anexo C é **Amazônia Azul** e não há roteiro de Educação Ambiental.

### C-Ap-FR — AEC 110 · TR 126

| # | Nome | Tipo | TA | Obrig. | Cômputo | Página |
|---|---|---|---|---|---|---|
| 1 | AMAZÔNIA AZUL (AMAZUL) | Palestra | 2 | sim | AEC (2.5) | C-40 (Anexo A) |
| 2 | PATRULHA NAVAL (PN) | Palestra | 2 | sim | AEC | C-42 (Anexo B) |
| 3 | INTEGRAÇÃO DA MULHER E REGRAS DE CONDUTA E CONVIVÊNCIA (RCCM-MB) | Palestra | 2 | sim | AEC | C-44 (Anexo C) |
| 4 | SEGURANÇA ORGÂNICA (SEGORG) | Palestra | 8 | sim | AEC | C-45 (Anexo D) |

Nomeadas: **14 TA**. Genéricos (2.5): visitas de estudo a organizações congêneres, **atividades de horticultura**,
orientação educacional, palestras de interesse. Nenhuma disciplina prevê visita.

### C-Ap-HN — AEC 65 · TR 78

| # | Nome | Tipo | TA | Disciplina | Obrig. | Cômputo | Página |
|---|---|---|---|---|---|---|---|
| 1 | AMAZÔNIA AZUL (AMAZUL) | Palestra | 2 | — | sim | AEC (2.5) | B-58 (Anexo A) |
| 2 | PATRULHA NAVAL (PN) | Palestra | 2 | — | sim | AEC | B-60 (Anexo B) |
| 3 | INTEGRAÇÃO DA MULHER E REGRAS DE CONDUTA E CONVIVÊNCIA (RCCM-MB) | Palestra | 2 | — | sim | AEC | B-62 (Anexo C) |
| 4 | SEGURANÇA ORGÂNICA (SEGORG) | Palestra | 8 | — | sim | AEC | B-63 (Anexo D) |
| 5 | 2 visitas de 2 TA ao Serviço Meteorológico Marinho no CHM | Visita | 4 | HN-2104-0610 Meteorologia | sim | não diz | B-15 |
| 6 | TG da UE 7 (aspectos práticos de navegação astronômica) | Trabalho | 4 + 1 | HN-2107-0510 Navegação Astronômica | sim | AEC (alínea b) × UE 7 (alínea a) | B-23 |

Nomeadas: **14 TA** de palestra; 18 com o TG; 22 com as visitas de Meteorologia. Genéricos: visitas de estudo,
orientação educacional, palestras de interesse.

### C-Espc-FR — AEC 80 · TAD 62 · TR 57

| # | Nome | Tipo | TA | Obrig. | Cômputo | Página |
|---|---|---|---|---|---|---|
| 1 | SEGURANÇA ORGÂNICA | Palestra | 8 | sim | AEC (4.2.2) | A-97 (Anexo A) |
| 2 | DIREITO INTERNACIONAL DOS CONFLITOS ARMADOS | Palestra | 2 | sim | AEC | A-99 (Anexo B) |
| 3 | SEGURANÇA DA INFORMAÇÃO E COMUNICAÇÕES | Palestra | 2 | sim | AEC | A-101 (Anexo C) |
| 4 | PROGRAMA DE EXCELÊNCIA DE GESTÃO DA MARINHA - PROGRAMA NETUNO | Palestra | 3 | sim | AEC | A-104 (Anexo D) |
| 5 | AMAZÔNIA AZUL | Palestra | 4 | sim | AEC | A-107 (Anexo E) |
| 6 | EDUCAÇÃO AMBIENTAL | Palestra | 2 | sim | AEC | A-110 (Anexo F) |
| 7 | EDUCAÇÃO FINANCEIRA 1 (início do curso) | Palestra | 2 | sim | AEC | A-113 (Anexo G) |
| 8 | EDUCAÇÃO FINANCEIRA 2 (meio do ano) | Palestra | 2 | sim | AEC | A-115 (Anexo H) |
| 9 | EDUCAÇÃO FINANCEIRA 3 (final do curso) | Palestra | 2 | sim | AEC | A-117 (Anexo I) |
| 10 | PATRULHA NAVAL | Palestra | 2 | sim | AEC | A-119 (Anexo J) |
| 11 | REGRAS DE CONDUTA E CONVIVÊNCIA ENTRE MILITARES DA MARINHA | Palestra | 2 | sim | **não diz** (fora da lista do 4.2.2) | A-121 (Anexo K) |

Nomeadas: **31 TA** (29 sem a RCCM). Genéricos de AEC (4.2.2): visitas a órgãos da MB e extra-MB, adestramentos,
Ordem Unida, horticultura, SOE/SOP, atividades esportivas, concurso literário, recuperação paralela (BDA). **TAD**
(4.2.3, «tais como»): identificação dos alunos, documentos individuais, atendimentos do SOE/SOP/NAS, resultados finais,
treinamentos para formatura — sem TA por item. ⚠️ O Anexo I repete o conteúdo do Anexo H.

### C-Espc-HN — AEC 80 · TAD 62 · TR 112

As 11 palestras do C-Espc-FR (mesmos nomes e TA, Anexos A a K, B-114 a B-138; a RCCM aqui **está** em AEC) **mais**:

| # | Nome | Tipo | TA | Disciplina | Obrig. | Cômputo | Página |
|---|---|---|---|---|---|---|---|
| 12 | APOIO LOGÍSTICO INTEGRADO E GESTÃO DO CICLO DE VIDA | Palestra | 2 | — | sim | AEC | B-139 (Anexo L) |
| 13 | Trabalhos práticos em 1 dia de embarque em navio adequado às fainas oceanográficas | Prática | 8 | HN-1109-0812 Oceanografia | sim | não diz | B-72 |

Nomeadas: **33 TA** de palestra. Genéricos e TAD: os mesmos do C-Espc-FR, sem horticultura. ⚠️ Os anexos de Educação
Financeira trazem «CURSO C-Espc-FR» no cabeçalho.

### Os cursos menores

| Curso | AEC | O que o currículo nomeia | Página |
|---|---|---|---|
| C-Exp-MetocOf (currículo de 2011) | 6 | 3 visitas a setores do CHM: Divisão de Informações Oceanográficas (CH-11), Divisão de Sensoriamento Remoto (CH-14), Divisão do BNDO (CH-22) — obrig., AEC, as 6 h não repartidas | 4 |
| C-Exp-Obs-ME (currículo de 2011) | 5 | 2 visitas: Divisão de Previsões Ambientais do CHM; Departamento de Controle do Espaço Aéreo do Galeão (DTCEA-GL) — obrig., AEC, as 5 h não repartidas | 4 |
| C-Exp-Ag-Mag | 10 | visita à oficina de Agulhas Magnéticas da BHMN — obrig., sem TA, cômputo não diz (AGU-MAG-2) | 8 |
| C-Esp-ALH | 30 | só genéricos: palestras, seminários, exercícios práticos, eventos, visitas | 4 |
| C-Esp-ME | 43 | só genéricos (com orientação educacional) | 4 |
| C-Esp-OpAP | 1 | só genéricos | 4 |
| C-Exp-BATI | 3 | só genéricos | 4 |
| EST-QF-MAREFLU | — | «podendo ser realizadas visitas a setores técnicos do CHM e embarques» (facultativo, sem AEC no currículo) | 6 |
| EST-QF-EM2040PHS | — | treinamento opcional de montagem a bordo do AvB Pollux (CAMR) | 3 |
| EST-QF-PROC-MF-EAD | — | visita ao CIAARA «caso necessário», para licenças (administrativa) | 7 |
| C-ApA-* (4), C-Exp-Metoc-OF-SP, EST-QF-APHID, EST-QF-APOC, EST-QF-NAVFLU-EAD, EST-QF-PGRS100 | — | nada de AEC | — |

## 3. Não são AEC (o currículo põe na disciplina) — para não confundir com APOINST

| Curso | O quê (grafia do PDF) | TA | Onde | Página |
|---|---|---|---|---|
| CAHO | Semana Topogeodésica (UE 6 – Levantamento Topográfico, IV Topografia) | 40 | UE 6 | A-19 |
| CAHO | Planejamento e execução de levantamento oceanográfico (UE 10, II Oceanografia; ≥ 4 dias embarcado) | 32 | UE 10 | A-12 |
| CAHO | Execução da compensação a bordo (UE 6, XII Agulhas Náuticas) | 15 | UE 6 | A-43 |
| CAHO | LEVANTAMENTO HIDROCEANOGRÁFICO DE FIM DE CURSO (LHFC) | 200 | disciplina XVIII | A-62 |
| C-Ap-FR | 2 saídas em lanchas balizadoras (Navegação, UE 2 a 4) | 8 | UE | C-19 |
| C-Ap-FR | PRÁTICA DE FIM DE CURSO EM MANUTENÇÃO DE AUXÍLIOS À NAVEGAÇÃO | 160 | disciplina | C-6 |
| C-Ap-HN | LEVANTAMENTO HIDROGRÁFICO DE FIM DE CURSO | 160 | disciplina | B-54 |
| C-Espc-FR | Aulas práticas em lancha balizadora (NAV-013, 2 dias × 4 TA, o 2º é a PP) | 8 | disciplina (não diz) | A-79 |
| C-Espc-FR | Aulas práticas de oficina no BH-10 (MFMFR-003) | 8 | disciplina (não diz) | A-42 |
| C-Espc-FR | Manutenção de Auxílios à Navegação de Fim de Curso (balizamentos de Angra, Vitória, SSN) | 113 | disciplina | A-96 |
| C-Esp-ME | atividades práticas na Superintendência de Meteorologia e Oceanografia do CHM (II UE 5: 6; XI UE 6: 4) e na BHMN (II UE 2: 2) | 12 | UE | 9, 29 |
| C-Exp-Ag-Mag | PRÁTICA DE COMPENSAÇÃO DE AGULHA MAGNÉTICA A BORDO DE NAVIO (UE 2) | 32 | UE | 8 |
| C-Exp-BATI | prática de lançamento do Batitermógrafo no mar (1 dia de embarque, UE 9) | 7 | UE | 6 |
| C-ApA-OcOp-PR-SP | OCEANOGRAFIA PRÁTICA (disciplina IX) e PRÁTICA DE OCEANOGRAFIA FÍSICA DESCRITIVA (UE 6) | 29 e 5 | disciplina / UE | 22, 10 |
| EST-QF-APOC | Atividade embarcada «nos meios da MB designados para a prática oceanográfica» (UE 5) | 24 | UE | 6 |

## 4. Grafias pedidas

| Termo | Nos 24 PDFs de 2026 |
|---|---|
| **APOINST** | **nenhuma ocorrência.** No sistema, o APOINST das planilhas é o tipo **«Apoio à Instrução»** (AEC, FR-021 da spec 014, 14 lançamentos) |
| Prática Oceanográfica | não ocorre como nome; «prática oceanográfica» (minúsculas, EST-QF-APOC p. 6); disciplina «OCEANOGRAFIA PRÁTICA» (C-ApA-OcOp) |
| Prática Topogeodésica | não ocorre; o CAHO usa «**Semana Topogeodésica**» (A-19) e, na avaliação, «(Semana Topográfica)» |
| Prática Hidrográfica | não ocorre; «LEVANTAMENTO HIDROGRÁFICO DE FIM DE CURSO» (C-Ap-HN) e «LEVANTAMENTO HIDROCEANOGRÁFICO DE FIM DE CURSO (LHFC)» (CAHO) |

**Os currículos de 2027 não estão no sistema** (nenhum currículo futuro, balde vazio): a grafia de 2027 não pôde ser
conferida.
