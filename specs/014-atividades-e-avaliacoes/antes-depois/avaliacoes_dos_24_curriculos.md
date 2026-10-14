# Antes/depois — D-4, as avaliações dos 24 currículos (FR-030, R-13)

Medido em 14/10/2026 no banco **local**, restaurado por `python -m scripts.manutencao.dado_do_remoto` a partir da
cópia **`remoto-20261014-130529.sql`** — o remoto JÁ sincronizado pela rodada do PR 3. As seis migrations do PR 4
foram aplicadas à mão, na ordem do `db push` (E-4 → E-5 → D-5 → D-6 → D-4 → D-7), cada uma numa transação.
**Por turma, nas 28 turmas: aulas, avaliações, atividades, CHD, aplicação, vista e CHT iguais antes e depois
das seis** (0 turmas com diferença).

**Aprovação de Bernardo:** [pendente]

**Antes:** 0 itens. **Depois:** 194 itens em 105 disciplinas de 15 cursos, todos de origem currículo,
com arquivo e página. **Σ (aplicação + vista) ≤ CH em toda disciplina** (FR-031.2; a migration aborta se não). A lista
`instrumentos_avaliacao` (11 instrumentos) entra junto.

⚠️ **FICAM FORA 90 dos 284 itens extraídos**, marcados `conferir` em `scripts/etl/dados/avaliacoes_curriculo.csv`
(relatório da extração: `medicoes/d4-extracao.md`): o instrumento **PT** (prova eletrônica), fora da lista do
data-model §3.2; **"TI ou TG"** no próprio currículo; o tempo do conjunto em duas provas (TFM); a vista da sinopse
geral do C-Esp-ALH; **disciplina sem destino no banco** (10 itens, quatro disciplinas do C-Espc-FR cujo código do
plano difere do sumário); o EST-QF-APOC (digitalizado); e os demais casos da extração. Cada um é decisão sua —
portão **A4.4**.

## Por curso

| Curso | disciplinas com item | itens | Σ TA aplicação | Σ TA vista |
|---|---|---|---|---|
| C-Ap-FR | 13 | 25 | 68 | 24 |
| C-Ap-HN | 18 | 38 | 107 | 37 |
| C-ApA-AuxNav-PR-SP | 1 | 1 | 1 | 1 |
| C-ApA-PCN-PR-EAD | 6 | 6 | 12 | 0 |
| C-ApA-PrevMe-PR-EAD | 2 | 3 | 6 | 0 |
| C-Esp-ME | 12 | 19 | 51 | 19 |
| C-Esp-OpAP | 1 | 1 | 2 | 1 |
| C-Espc-FR | 12 | 22 | 74 | 22 |
| C-Espc-HN | 11 | 26 | 85 | 26 |
| C-Exp-Ag-Mag | 2 | 3 | 6 | 3 |
| C-Exp-BATI | 1 | 2 | 6 | 2 |
| C-Exp-Metoc-OF-SP | 1 | 1 | 0 | 0 |
| C-Exp-MetocOf | 5 | 5 | 10 | 4 |
| C-Exp-Obs-ME | 2 | 4 | 0 | 0 |
| CAHO | 18 | 38 | 94 | 36 |

## Por disciplina

| Curso | Disciplina | CH | itens | Σ aplicação | Σ vista | Σ ≤ CH | os itens |
|---|---|---|---|---|---|---|---|
| C-Ap-FR | I INSTALAÇÕES ELÉTRICAS. | 120 | 2 | 4 | 2 | sim | PM 1 (UE 2), PM 2 (UE 4) |
| C-Ap-FR | II AUXÍLIOS À NAVEGAÇÃO. | 65 | 1 | 2 | 1 | sim | PM 1 (UE 4) |
| C-Ap-FR | III EQUIPAMENTOS DE AUXÍLIOS À NAVEGAÇÃO. | 75 | 2 | 6 | 2 | sim | PM 1 (UE 3), PP 1 (UE 3) |
| C-Ap-FR | IV PROJETOS DE AUXÍLIOS À NAVEGAÇÃO. | 104 | 2 | 10 | 2 | sim | PM 1 (UE 1), TG 1 (UE 2) |
| C-Ap-FR | IX MANUTENÇÃO EM AUXÍLIOS À NAVEGAÇÃO FEITOS EM ALVENARIA. | 110 | 2 | 10 | 2 | sim | PM 1 (UE 5), PP 1 (UE 5) |
| C-Ap-FR | V OPERAÇÕES E ADM DE AUXÍLIOS À NAVEGAÇÃO. | 140 | 2 | 4 | 2 | sim | PM 1 (UE 3), PM 2 (UE 5) |
| C-Ap-FR | VI NAVEGAÇÃO. | 120 | 3 | 9 | 3 | sim | PM 1 (UE 1), PM 2 (UE 2), PP 1 (UE 2) |
| C-Ap-FR | VII INGLÊS TÉCNICO. | 50 | 2 | 4 | 2 | sim | PM 1 (UE 1), PM 2 (UE 2) |
| C-Ap-FR | VIII TOPOGRAFIA. | 100 | 4 | 10 | 4 | sim | PM 1 (UE 4), PM 2 (UE 6), PM 3 (UE 10), PP 1 (UE 10) |
| C-Ap-FR | X TFM. | 40 | 1 | 1 | 0 | sim | PP 3 (UE 2) |
| C-Ap-FR | XI PREVENÇÃO DE ACIDENTES. | 50 | 2 | 6 | 2 | sim | PM 1 (UE 8), PP 1 (UE 4) |
| C-Ap-FR | XII EQUIPAMENTOS E SISTEMAS ELETRÔNICOS DE AUXÍLIOS À NAVEGAÇÃO. | 30 | 1 | 2 | 1 | sim | PM 1 (UE 2) |
| C-Ap-FR | XIII PRÁTICA DE  DE CURSO EM MANUTENÇÃO DE AUXÍLIOS À NAVEGAÇÃO. | 160 | 1 | 0 | 1 | sim | OD 1 |
| C-Ap-HN | I MATEMÁTICA E FÍSICA APLICADAS À HIDROGRAFIA. | 126 | 4 | 10 | 4 | sim | PM 1 (UE 1), PM 2 (UE 2), PM 3 (UE 6), PM 4 (UE 7) |
| C-Ap-HN | II INFO. APLICADA À HIDROGRAFIA. | 51 | 2 | 4 | 2 | sim | TI 1 (UE 1), TI 2 (UE 4) |
| C-Ap-HN | III INGLÊS TÉCNICO. | 40 | 2 | 4 | 2 | sim | PM 1 (UE 1), PM 2 (UE 2) |
| C-Ap-HN | IV METEOROLOGIA. | 60 | 2 | 5 | 2 | sim | PM 1 (UE 1), PM 2 (UE 2) |
| C-Ap-HN | IX GEODÉSIA. | 70 | 2 | 8 | 2 | sim | PM 1 (UE 3), PM 2 (UE 6) |
| C-Ap-HN | V NAVEGAÇÃO. | 92 | 3 | 8 | 3 | sim | PM 1 (UE 4), PM 2 (UE 8), TG 1 (UE 9) |
| C-Ap-HN | VI HIDROGRAFIA. E NAVEGAÇÃO - ASPECTOS LEGAIS. | 34 | 1 | 2 | 1 | sim | PM 1 (UE 4) |
| C-Ap-HN | VII NAVEGAÇÃO ASTRONÔMICA. | 56 | 3 | 8 | 3 | sim | PM 1 (UE 3), PM 2 (UE 6), TG 1 (UE 7) |
| C-Ap-HN | VIII CARTOGRAFIA. | 60 | 2 | 6 | 2 | sim | PM 1 (UE 3), PM 2 (UE 6) |
| C-Ap-HN | X MARÉS. | 64 | 2 | 7 | 2 | sim | PM 1 (UE 2), PM 2 (UE 4) |
| C-Ap-HN | XI HIDROGRAFIA. | 148 | 3 | 16 | 3 | sim | PM 1 (UE 5), PM 2 (UE 10), PP 1 (UE 12) |
| C-Ap-HN | XII GERENCIAMENTO DE DADOS HIDRO.. | 25 | 2 | 4 | 2 | sim | TI 1 (UE 1), PM 1 (UE 2) |
| C-Ap-HN | XIII OCEANOGRAFIA. | 75 | 2 | 6 | 2 | sim | PM 1 (UE 1), PM 2 (UE 3) |
| C-Ap-HN | XIV TOPOGRAFIA. | 90 | 3 | 12 | 3 | sim | PM 1 (UE 3), PM 2 (UE 5), TG 1 (UE 6) |
| C-Ap-HN | XV SENSORIAMENTO REMOTO. | 38 | 2 | 3 | 2 | sim | PM 1 (UE 3), TG 1 (UE 3) |
| C-Ap-HN | XVI ACÚSTICA SUBMARINA. | 28 | 1 | 3 | 1 | sim | PM 1 (UE 5) |
| C-Ap-HN | XVII TFM. | 40 | 1 | 1 | 0 | sim | PP 3 (UE 2) |
| C-Ap-HN | XVIII LEVANTAMENTO HIDROGRÁFICO DE  DE CURSO. | 160 | 1 | 0 | 1 | sim | OD 1 |
| C-ApA-AuxNav-PR-SP | VII FUNDAMENTOS BÁSICOS PARA A ANÁLISE DE PROJETOS DE AUXÍLIOS À NAVEGAÇÃO. | 40 | 1 | 1 | 1 | sim | PM 1 (UE 4) |
| C-ApA-PCN-PR-EAD | PCN-PR-I-EAD INGLÊS TÉCNICO APLICADO À PRODUÇÃO CARTOGRÁFICA. | 30 | 1 | 2 | 0 | sim | PE 1 |
| C-ApA-PCN-PR-EAD | PCN-PR-II-EAD INTRODUÇÃO À SEGURANÇA DA NAVEGAÇÃO. | 40 | 1 | 2 | 0 | sim | PE 1 (UE 4) |
| C-ApA-PCN-PR-EAD | PCN-PR-III-EAD CARTOGRAFIA NÁUTICA BRASILEIRA. | 40 | 1 | 2 | 0 | sim | PE 1 (UE 4) |
| C-ApA-PCN-PR-EAD | PCN-PR-IV-EAD PRODUÇÃO CARTOGRÁFICA. | 50 | 1 | 2 | 0 | sim | PE 1 (UE 2) |
| C-ApA-PCN-PR-EAD | PCN-PR-V-EAD ATUALIZAÇÃO CARTOGRÁFICA. | 40 | 1 | 2 | 0 | sim | PE 1 (UE 3) |
| C-ApA-PCN-PR-EAD | PCN-PR-VI-EAD DESENVOLVIMENTOS PARA O FUTURO. | 40 | 1 | 2 | 0 | sim | PE 1 (UE 2) |
| C-ApA-PrevMe-PR-EAD | PrevMe III INTERAÇÃO OCEANO-ATMOSFERA. | 47 | 2 | 4 | 0 | sim | PM 1 (UE 2), PM 2 (UE 4) |
| C-ApA-PrevMe-PR-EAD | PrevMe VI PUBLICAÇÕES E NORMAS DE METEOROLOGIA E OCEANOGRAFIA. | 54 | 1 | 2 | 0 | sim | PM 1 (UE 6) |
| C-Esp-ME | I METEOROLOGIA BÁSICA. | 28 | 1 | 2 | 1 | sim | PM 1 (UE 8) |
| C-Esp-ME | II INSTRUMENTAÇÃO E OBSERVAÇÃO  METEOROLÓGICA | 70 | 2 | 6 | 2 | sim | PM 1 (UE 4), PP 1 (UE 5) |
| C-Esp-ME | III INFORMÁTICA APLICADA. | 46 | 2 | 6 | 2 | sim | PM 1 (UE 4), PP 1 (UE 4) |
| C-Esp-ME | IV METEOROLOGIA DINÂMICA. | 22 | 1 | 2 | 1 | sim | PM 1 (UE 4) |
| C-Esp-ME | IX TERMODINÂMICA DA ATMOSFERA. | 38 | 1 | 2 | 1 | sim | PM 1 (UE 5) |
| C-Esp-ME | V CLIMATOLOGIA. | 25 | 2 | 5 | 2 | sim | PM 1 (UE 2), PP 1 (UE 3) |
| C-Esp-ME | VI METEOROLOGIA SINÓTICA. | 72 | 2 | 6 | 2 | sim | PM 1 (UE 6), PM 2 (UE 9) |
| C-Esp-ME | VII SENSORIAMENTO REMOTO. | 50 | 2 | 6 | 2 | sim | PM 1 (UE 5), PP 1 (UE 5) |
| C-Esp-ME | VIII METEOROLOGIA AERONÁUTICA. | 48 | 2 | 6 | 2 | sim | PM 1 (UE 6), PP 1 (UE 7) |
| C-Esp-ME | X OCEANOGRAFIA E METEOROLOGIA MARINHA. | 22 | 1 | 2 | 1 | sim | PM 1 (UE 3) |
| C-Esp-ME | XI METEOROLOGIA PRÁTICA. | 72 | 2 | 6 | 2 | sim | PM 1 (UE 3), PP 1 (UE 6) |
| C-Esp-ME | XII INGLÊS TÉCNICO. | 52 | 1 | 2 | 1 | sim | PM 1 (UE 3) |
| C-Esp-OpAP | OPAP IV PRÁTICA EM SIMULADOR. | 15 | 1 | 2 | 1 | sim | PP 1 |
| C-Espc-FR | ADMANFR-014 ADMINISTRAÇÃO DE AUXÍLIOS À NAVEGAÇÃO. | 80 | 2 | 4 | 2 | sim | PM 1, PP 1 |
| C-Espc-FR | AUXNAVFR-008 AUXÍLIOS À NAVEGAÇÃO. | 90 | 2 | 4 | 2 | sim | PM 1, PM 2 |
| C-Espc-FR | FAANFR-005 FÍSICA APLICADA AOS AUXÍLIOS À NAVEGAÇÃO. | 30 | 1 | 3 | 1 | sim | PM 1 |
| C-Espc-FR | FANAVFR-13 FAINAS DE AUXÍLIOS À NAVEGAÇÃO. | 80 | 2 | 8 | 2 | sim | PP 1, PP 2 |
| C-Espc-FR | FONFR-011 FONTES DE ENERGIA E PROJETOS DE AUXÍLIOS À NAVEGAÇÃO. | 115 | 3 | 15 | 3 | sim | PM 1, PP 1, PP 2 |
| C-Espc-FR | IITFR-003 INTRODUÇÃO AO INGLÊS TÉCNICO. | 62 | 2 | 6 | 2 | sim | PM 1, PM 2 |
| C-Espc-FR | INELEFR-009 INSTALAÇÕES ELÉTRICAS. | 90 | 2 | 4 | 2 | sim | PM 1, PM 2 |
| C-Espc-FR | INTANFR-006 INTRODUÇÃO AOS AUXÍLIOS À NAVEGAÇÃO. | 30 | 1 | 2 | 1 | sim | PE 1 |
| C-Espc-FR | MAANFR-001 MATEMÁTICA APLICADA AOS AUX. À NAV.. | 40 | 1 | 3 | 1 | sim | PM 1 |
| C-Espc-FR | MBFCFR-017 MANUTENÇÃO DE AUXÍLIOS À NAVEGAÇÃO DE  FIM DE CURSO. | 113 | 1 | 7 | 1 | sim | OD 1 |
| C-Espc-FR | NAV-015 NAVEGAÇÃO. | 123 | 3 | 12 | 3 | sim | PM 1, PP 1, PM 2 |
| C-Espc-FR | PSFFR-014 PRIMEIROS SOCORROS EM FARÓIS. | 40 | 2 | 6 | 2 | sim | PM 1, PP 1 |
| C-Espc-HN | HN-1102-0710 INTRODUÇÃO AO INGLÊS TÉCNICO. | 60 | 2 | 4 | 2 | sim | PM 1, PO 1 |
| C-Espc-HN | HN-1104-0506 FÍSICA APLICADA À HIDROGRAFIA. | 30 | 1 | 3 | 1 | sim | PM 1 |
| C-Espc-HN | HN-1104-0808 MATEMÁTICA APLICADA À HIDROGRAFIA. | 46 | 1 | 4 | 1 | sim | PM 1 |
| C-Espc-HN | HN-1105-0243 CARTOGRAFIA. | 86 | 2 | 6 | 2 | sim | PE 1, TG 1 |
| C-Espc-HN | HN-1106-0423 NAVEGAÇÃO I. | 108 | 3 | 7 | 3 | sim | PM 1, PP 1, PM 2 |
| C-Espc-HN | HN-1107-1011 NAVEGAÇÃO II. | 120 | 4 | 12 | 4 | sim | PM 1, PM 2, PM 3, PP 1 |
| C-Espc-HN | HN-1108-0619 METEOROLOGIA. | 114 | 3 | 10 | 3 | sim | PM 1, PP 1, PM 2 |
| C-Espc-HN | HN-1109-0812 OCEANOGRAFIA. | 96 | 3 | 16 | 3 | sim | PM 1, PM 2, PP 1 |
| C-Espc-HN | HN-1110-0815 TOPOGRAFIA. | 108 | 2 | 6 | 2 | sim | PM 1, PP 1 |
| C-Espc-HN | HN-1111-0508 MARÉS. | 40 | 2 | 7 | 2 | sim | PM 1, PP 1 |
| C-Espc-HN | HN-1112-0815 SONDAGEM. | 120 | 3 | 10 | 3 | sim | PM 1, PM 2, PP 1 |
| C-Exp-Ag-Mag | I METODOS DE COMP. AGU-MAG-1. | 60 | 2 | 4 | 2 | sim | PM 1 (UE 2), PM 2 (UE 4) |
| C-Exp-Ag-Mag | II METODOS DE COMP. AGU-MAG-2. | 80 | 1 | 2 | 1 | sim | TG 1 (UE 2) |
| C-Exp-BATI | I BATITERMOGRAFIA / C-Exp-BATI | 42 | 2 | 6 | 2 | sim | PM 1 (UE 8), PP 1 (UE 9) |
| C-Exp-Metoc-OF-SP | V ESTÁGIO PRÁTICO . | 40 | 1 | 0 | 0 | sim | OD 1 |
| C-Exp-MetocOf | I METEOROLOGIA. | 30 | 1 | 3 | 1 | sim | PM 1 |
| C-Exp-MetocOf | II TÉCNICAS DE PREVISÃO DO TEMPO. | 19 | 1 | 3 | 1 | sim | PM 1 |
| C-Exp-MetocOf | III OCEANOGRAFIA . | 37 | 1 | 2 | 1 | sim | PM 1 |
| C-Exp-MetocOf | IV EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA / C-Exp-METOC-OF | 18 | 1 | 2 | 1 | sim | PM 1 |
| C-Exp-MetocOf | V ESTÁGIO PRÁTICO . | 50 | 1 | 0 | 0 | sim | OD 1 |
| C-Exp-Obs-ME | I OBSERVAÇÃO METEOROLÓGICA I. | 50 | 2 | 0 | 0 | sim | PE 1, PE 2 |
| C-Exp-Obs-ME | II OBSERVAÇÃO METEOROLÓGICA II. | 65 | 2 | 0 | 0 | sim | PE 1, PE 2 |
| CAHO | II OCEANOGRAFIA. | 87 | 3 | 9 | 3 | sim | PM 1 (UE 5), PM 2 (UE 9), TI 1 (UE 10) |
| CAHO | III ESTATÍSTICA. | 39 | 1 | 2 | 1 | sim | PM 1 (UE 9) |
| CAHO | IV TOPOGRAFIA. | 148 | 2 | 8 | 2 | sim | PM 1 (UE 4), PM 2 (UE 5) |
| CAHO | IX CARTOGRAFIA. | 41 | 1 | 2 | 1 | sim | PM 1 (UE 6) |
| CAHO | MATFIS NIVELAMENTO DE MATEMÁTICA E FÍSICA. | 56 | 2 | 4 | 2 | sim | PM 1 (UE 1), PM 2 (UE 2) |
| CAHO | V METEOROLOGIA. | 78 | 3 | 8 | 3 | sim | PM 1 (UE 3), PM 2 (UE 6), OD 1 |
| CAHO | VI GEODÉSIA. | 107 | 6 | 12 | 6 | sim | PM 1 (UE 2), PM 2 (UE 4), PM 3, TI 1, TG 1 (UE 6), TG 2 |
| CAHO | VIII AUXÍLIOS À NAVEGAÇÃO. | 30 | 2 | 4 | 2 | sim | PM 1 (UE 6), TG 1 (UE 5) |
| CAHO | X MARÉS. | 86 | 2 | 6 | 2 | sim | PM 1 (UE 6), PM 2 (UE 11) |
| CAHO | XI NAVEGAÇÃO: SISTEMAS E NORMAS. | 49 | 2 | 4 | 2 | sim | PM 1 (UE 4), PM 2 (UE 6) |
| CAHO | XII AGULHAS NÁUTICAS. | 32 | 2 | 4 | 2 | sim | PM 1 (UE 5), PP 1 (UE 6) |
| CAHO | XIII ACÚSTICA SUBMARINA. | 47 | 2 | 7 | 2 | sim | PM 1 (UE 5), TG 1 (UE 5) |
| CAHO | XIV SENSORIAMENTO REMOTO, AEROFOTOGRAMETRIA e LiDAR. | 60 | 2 | 4 | 2 | sim | PM 1 (UE 6), TI 1 (UE 6) |
| CAHO | XIX TFM. | 70 | 1 | 1 | 0 | sim | PP 3 (UE 2) |
| CAHO | XV GERENCIAMENTO DE DADOS HIDROGRÁFICOS. | 35 | 2 | 4 | 2 | sim | PM 1 (UE 4), TI 1 (UE 4) |
| CAHO | XVI HIDROGRAFIA. | 239 | 2 | 7 | 2 | sim | PM 1 (UE 6), PM 2 (UE 14) |
| CAHO | XVII TEORIA DOS ERROS. | 60 | 2 | 8 | 2 | sim | PM 1 (UE 4), TI 1 (UE 4) |
| CAHO | XVIII LEVANTAMENTO HIDROGRÁFICO DE  DE CURSO. | 200 | 1 | 0 | 0 | sim | OD 1 |

**Resposta de Bernardo:** [pendente]
