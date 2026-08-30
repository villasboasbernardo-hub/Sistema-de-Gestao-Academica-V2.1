export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      arquivo_avaliacoes_v1: {
        Row: {
          arquivado_em: string
          arquivado_por: string | null
          avaliacao_destino_codigo_v1: string | null
          avaliacao_destino_id: string | null
          codigo: string
          conteudo_resumo_v1: string | null
          data: string | null
          disciplina_codigo_v1: string | null
          id: string
          instrutor_codigo_v1: string | null
          local_v1: string | null
          metodologia_v1: string | null
          observacao_migracao: string | null
          observacoes_v1: string | null
          registrado_em_v1: string | null
          registrado_por_v1: string | null
          ta_inicial_v1: number | null
          tempos_consumidos_v1: number | null
          tipo_atividade_v1: string | null
          turma_codigo_v1: string | null
        }
        Insert: {
          arquivado_em?: string
          arquivado_por?: string | null
          avaliacao_destino_codigo_v1?: string | null
          avaliacao_destino_id?: string | null
          codigo: string
          conteudo_resumo_v1?: string | null
          data?: string | null
          disciplina_codigo_v1?: string | null
          id?: string
          instrutor_codigo_v1?: string | null
          local_v1?: string | null
          metodologia_v1?: string | null
          observacao_migracao?: string | null
          observacoes_v1?: string | null
          registrado_em_v1?: string | null
          registrado_por_v1?: string | null
          ta_inicial_v1?: number | null
          tempos_consumidos_v1?: number | null
          tipo_atividade_v1?: string | null
          turma_codigo_v1?: string | null
        }
        Update: {
          arquivado_em?: string
          arquivado_por?: string | null
          avaliacao_destino_codigo_v1?: string | null
          avaliacao_destino_id?: string | null
          codigo?: string
          conteudo_resumo_v1?: string | null
          data?: string | null
          disciplina_codigo_v1?: string | null
          id?: string
          instrutor_codigo_v1?: string | null
          local_v1?: string | null
          metodologia_v1?: string | null
          observacao_migracao?: string | null
          observacoes_v1?: string | null
          registrado_em_v1?: string | null
          registrado_por_v1?: string | null
          ta_inicial_v1?: number | null
          tempos_consumidos_v1?: number | null
          tipo_atividade_v1?: string | null
          turma_codigo_v1?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivo_avaliacoes_v1_avaliacao_destino_id_fkey"
            columns: ["avaliacao_destino_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivo_avaliacoes_v1_avaliacao_destino_id_fkey"
            columns: ["avaliacao_destino_id"]
            isOneToOne: false
            referencedRelation: "vw_avaliacoes_situacao"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_nao_letivas: {
        Row: {
          categoria_normativa: Database["public"]["Enums"]["categoria_normativa"]
          codigo: string
          compoe_cht: boolean | null
          criado_em: string
          criado_por: string | null
          data: string
          descricao: string
          editado_em: string | null
          editado_por: string | null
          escopo: Database["public"]["Enums"]["escopo_atividade"]
          id: string
          local: string | null
          observacoes: string | null
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_registro"]
          subtipo: string | null
          ta_final: number | null
          ta_inicial: number | null
          tempos_consumidos: number
          tipo_legado_v1: string | null
          turma_id: string | null
        }
        Insert: {
          categoria_normativa: Database["public"]["Enums"]["categoria_normativa"]
          codigo: string
          compoe_cht?: boolean | null
          criado_em?: string
          criado_por?: string | null
          data: string
          descricao: string
          editado_em?: string | null
          editado_por?: string | null
          escopo?: Database["public"]["Enums"]["escopo_atividade"]
          id?: string
          local?: string | null
          observacoes?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          subtipo?: string | null
          ta_final?: number | null
          ta_inicial?: number | null
          tempos_consumidos: number
          tipo_legado_v1?: string | null
          turma_id?: string | null
        }
        Update: {
          categoria_normativa?: Database["public"]["Enums"]["categoria_normativa"]
          codigo?: string
          compoe_cht?: boolean | null
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao?: string
          editado_em?: string | null
          editado_por?: string | null
          escopo?: Database["public"]["Enums"]["escopo_atividade"]
          id?: string
          local?: string | null
          observacoes?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          subtipo?: string | null
          ta_final?: number | null
          ta_inicial?: number | null
          tempos_consumidos?: number
          tipo_legado_v1?: string | null
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_nao_letivas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_nao_letivas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "atividades_nao_letivas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "atividades_nao_letivas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "atividades_nao_letivas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          codigo: string
          conciliacao_migracao:
            | Database["public"]["Enums"]["conciliacao_migracao"]
            | null
          conteudo_resumo: string | null
          criado_em: string
          criado_por: string | null
          curso_id: string
          data_avaliacao: string
          data_vista_prova: string | null
          disciplina_id: string
          editado_em: string | null
          editado_por: string | null
          fiscal_id: string | null
          id: string
          instrutor_responsavel_id: string
          item_planejado_id: string | null
          local: string | null
          local_vista: string | null
          metodologia: string | null
          nome_fiscal_externo: string | null
          observacoes: string | null
          origem_execucao_v1: string | null
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_avaliacao"]
          ta_final: number | null
          ta_final_vista: number | null
          ta_inicial: number | null
          ta_inicial_vista: number | null
          tempos_consumidos: number | null
          tempos_consumidos_vista: number | null
          tipo_avaliacao: string | null
          turma_id: string
        }
        Insert: {
          codigo: string
          conciliacao_migracao?:
            | Database["public"]["Enums"]["conciliacao_migracao"]
            | null
          conteudo_resumo?: string | null
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          data_avaliacao: string
          data_vista_prova?: string | null
          disciplina_id: string
          editado_em?: string | null
          editado_por?: string | null
          fiscal_id?: string | null
          id?: string
          instrutor_responsavel_id: string
          item_planejado_id?: string | null
          local?: string | null
          local_vista?: string | null
          metodologia?: string | null
          nome_fiscal_externo?: string | null
          observacoes?: string | null
          origem_execucao_v1?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_avaliacao"]
          ta_final?: number | null
          ta_final_vista?: number | null
          ta_inicial?: number | null
          ta_inicial_vista?: number | null
          tempos_consumidos?: number | null
          tempos_consumidos_vista?: number | null
          tipo_avaliacao?: string | null
          turma_id: string
        }
        Update: {
          codigo?: string
          conciliacao_migracao?:
            | Database["public"]["Enums"]["conciliacao_migracao"]
            | null
          conteudo_resumo?: string | null
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          data_avaliacao?: string
          data_vista_prova?: string | null
          disciplina_id?: string
          editado_em?: string | null
          editado_por?: string | null
          fiscal_id?: string | null
          id?: string
          instrutor_responsavel_id?: string
          item_planejado_id?: string | null
          local?: string | null
          local_vista?: string | null
          metodologia?: string | null
          nome_fiscal_externo?: string | null
          observacoes?: string | null
          origem_execucao_v1?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_avaliacao"]
          ta_final?: number | null
          ta_final_vista?: number | null
          ta_inicial?: number | null
          ta_inicial_vista?: number | null
          tempos_consumidos?: number | null
          tempos_consumidos_vista?: number | null
          tipo_avaliacao?: string | null
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aval_disciplina_do_curso"
            columns: ["disciplina_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id", "curso_id"]
          },
          {
            foreignKeyName: "aval_disciplina_do_curso"
            columns: ["disciplina_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id", "curso_id"]
          },
          {
            foreignKeyName: "aval_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id", "curso_id"]
          },
          {
            foreignKeyName: "aval_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "aval_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "aval_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "avaliacoes_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "avaliacoes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id"]
          },
          {
            foreignKeyName: "avaliacoes_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
          {
            foreignKeyName: "avaliacoes_instrutor_responsavel_id_fkey"
            columns: ["instrutor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_instrutor_responsavel_id_fkey"
            columns: ["instrutor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
          {
            foreignKeyName: "avaliacoes_item_planejado_id_fkey"
            columns: ["item_planejado_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_planejadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      avaliacoes_planejadas: {
        Row: {
          carater: string | null
          codigo: string
          criado_em: string
          criado_por: string | null
          curso_id: string
          descricao_instrumentos: string | null
          editado_em: string | null
          editado_por: string | null
          formula_mf: string | null
          id: string
          nome_disciplina: string
          nome_normalizado: string | null
          observacoes: string | null
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_registro"]
        }
        Insert: {
          carater?: string | null
          codigo: string
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          descricao_instrumentos?: string | null
          editado_em?: string | null
          editado_por?: string | null
          formula_mf?: string | null
          id?: string
          nome_disciplina: string
          nome_normalizado?: string | null
          observacoes?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
        }
        Update: {
          carater?: string | null
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          descricao_instrumentos?: string | null
          editado_em?: string | null
          editado_por?: string | null
          formula_mf?: string | null
          id?: string
          nome_disciplina?: string
          nome_normalizado?: string | null
          observacoes?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_planejadas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_planejadas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      config_listas: {
        Row: {
          ativo: boolean
          criado_em: string
          criado_por: string | null
          editado_em: string | null
          editado_por: string | null
          id: string
          lista: string
          observacao: string | null
          ordem: number
          origem_migracao_v1: string | null
          rotulo_exibicao: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          lista: string
          observacao?: string | null
          ordem?: number
          origem_migracao_v1?: string | null
          rotulo_exibicao: string
          valor: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          lista?: string
          observacao?: string | null
          ordem?: number
          origem_migracao_v1?: string | null
          rotulo_exibicao?: string
          valor?: string
        }
        Relationships: []
      }
      config_parametros: {
        Row: {
          ano_vigencia: number | null
          chave: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          editado_em: string | null
          editado_por: string | null
          editavel_por: Database["public"]["Enums"]["perfil_usuario"] | null
          fundamento_normativo: string | null
          id: string
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_registro"]
          tipo: string
          unidade: string | null
          valor: string
        }
        Insert: {
          ano_vigencia?: number | null
          chave: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          editado_em?: string | null
          editado_por?: string | null
          editavel_por?: Database["public"]["Enums"]["perfil_usuario"] | null
          fundamento_normativo?: string | null
          id?: string
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          tipo?: string
          unidade?: string | null
          valor: string
        }
        Update: {
          ano_vigencia?: number | null
          chave?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          editado_em?: string | null
          editado_por?: string | null
          editavel_por?: Database["public"]["Enums"]["perfil_usuario"] | null
          fundamento_normativo?: string | null
          id?: string
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          tipo?: string
          unidade?: string | null
          valor?: string
        }
        Relationships: []
      }
      configuracoes_horario: {
        Row: {
          codigo: string
          criado_em: string
          criado_por: string | null
          editado_em: string | null
          editado_por: string | null
          id: string
          nome_config: string
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_config_horario"]
          substituida_por_id: string | null
        }
        Insert: {
          codigo: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          nome_config: string
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_config_horario"]
          substituida_por_id?: string | null
        }
        Update: {
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          nome_config?: string
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_config_horario"]
          substituida_por_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_horario_substituida_por_id_fkey"
            columns: ["substituida_por_id"]
            isOneToOne: false
            referencedRelation: "configuracoes_horario"
            referencedColumns: ["id"]
          },
        ]
      }
      curso_regime_historico: {
        Row: {
          codigo: string
          configuracao_horario_id: string | null
          criado_em: string
          criado_por: string | null
          curso_id: string
          editado_em: string | null
          editado_por: string | null
          fundamento_curricular: string | null
          hora_inicio_manha: string
          hora_inicio_tarde: string
          id: string
          intervalo_manha_min: number
          intervalo_tarde_min: number
          limite_diario_ead_horas: number | null
          motivo: string | null
          origem_migracao_v1: string | null
          regime_tempos: number
          status: Database["public"]["Enums"]["status_vigencia"]
          ta_duracao_min: number
          tipo_regime: Database["public"]["Enums"]["tipo_regime"]
          vigente_ate: string | null
          vigente_de: string
        }
        Insert: {
          codigo: string
          configuracao_horario_id?: string | null
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          editado_em?: string | null
          editado_por?: string | null
          fundamento_curricular?: string | null
          hora_inicio_manha: string
          hora_inicio_tarde: string
          id?: string
          intervalo_manha_min: number
          intervalo_tarde_min: number
          limite_diario_ead_horas?: number | null
          motivo?: string | null
          origem_migracao_v1?: string | null
          regime_tempos: number
          status?: Database["public"]["Enums"]["status_vigencia"]
          ta_duracao_min: number
          tipo_regime: Database["public"]["Enums"]["tipo_regime"]
          vigente_ate?: string | null
          vigente_de: string
        }
        Update: {
          codigo?: string
          configuracao_horario_id?: string | null
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          editado_em?: string | null
          editado_por?: string | null
          fundamento_curricular?: string | null
          hora_inicio_manha?: string
          hora_inicio_tarde?: string
          id?: string
          intervalo_manha_min?: number
          intervalo_tarde_min?: number
          limite_diario_ead_horas?: number | null
          motivo?: string | null
          origem_migracao_v1?: string | null
          regime_tempos?: number
          status?: Database["public"]["Enums"]["status_vigencia"]
          ta_duracao_min?: number
          tipo_regime?: Database["public"]["Enums"]["tipo_regime"]
          vigente_ate?: string | null
          vigente_de?: string
        }
        Relationships: [
          {
            foreignKeyName: "curso_regime_historico_configuracao_horario_id_fkey"
            columns: ["configuracao_horario_id"]
            isOneToOne: false
            referencedRelation: "configuracoes_horario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curso_regime_historico_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curso_regime_historico_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      cursos: {
        Row: {
          classificacao: Database["public"]["Enums"]["escopo_curso"]
          codigo: string
          criado_em: string
          criado_por: string | null
          duracao_dias: number | null
          duracao_semanas: number | null
          editado_em: string | null
          editado_por: string | null
          id: string
          limite_turmas_ano: number
          modalidade: Database["public"]["Enums"]["modalidade_ensino"]
          nome_curso: string
          nome_normalizado: string | null
          origem_migracao_v1: string | null
          prioridade_alocacao: Database["public"]["Enums"]["criterio_prioridade_alocacao"]
          proposito: string | null
          status: Database["public"]["Enums"]["status_registro"]
        }
        Insert: {
          classificacao: Database["public"]["Enums"]["escopo_curso"]
          codigo: string
          criado_em?: string
          criado_por?: string | null
          duracao_dias?: number | null
          duracao_semanas?: number | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          limite_turmas_ano?: number
          modalidade?: Database["public"]["Enums"]["modalidade_ensino"]
          nome_curso: string
          nome_normalizado?: string | null
          origem_migracao_v1?: string | null
          prioridade_alocacao?: Database["public"]["Enums"]["criterio_prioridade_alocacao"]
          proposito?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
        }
        Update: {
          classificacao?: Database["public"]["Enums"]["escopo_curso"]
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          duracao_dias?: number | null
          duracao_semanas?: number | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          limite_turmas_ano?: number
          modalidade?: Database["public"]["Enums"]["modalidade_ensino"]
          nome_curso?: string
          nome_normalizado?: string | null
          origem_migracao_v1?: string | null
          prioridade_alocacao?: Database["public"]["Enums"]["criterio_prioridade_alocacao"]
          proposito?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
        }
        Relationships: []
      }
      disciplinas: {
        Row: {
          carga_horaria_tempos: number
          ch_semanal: number | null
          cod_disciplina: string
          codigo: string
          criado_em: string
          criado_por: string | null
          curso_id: string
          editado_em: string | null
          editado_por: string | null
          id: string
          id_disciplina_legado: string | null
          instrutores_atribuidos: string[]
          instrutores_atribuidos_legado_v1: string | null
          local_padrao: string | null
          modo_atribuicao_padrao: Database["public"]["Enums"]["modo_atribuicao"]
          nome_disciplina: string
          nome_normalizado: string | null
          ordem_sugerida: number | null
          origem_migracao_v1: string | null
          previsao_inicio: string | null
          previsao_termino: string | null
          prioridade_alocacao_peso: number | null
          semanas: number | null
          status: Database["public"]["Enums"]["status_registro"]
          tecnica_ensino_sugerida: string | null
        }
        Insert: {
          carga_horaria_tempos: number
          ch_semanal?: number | null
          cod_disciplina: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          id_disciplina_legado?: string | null
          instrutores_atribuidos?: string[]
          instrutores_atribuidos_legado_v1?: string | null
          local_padrao?: string | null
          modo_atribuicao_padrao?: Database["public"]["Enums"]["modo_atribuicao"]
          nome_disciplina: string
          nome_normalizado?: string | null
          ordem_sugerida?: number | null
          origem_migracao_v1?: string | null
          previsao_inicio?: string | null
          previsao_termino?: string | null
          prioridade_alocacao_peso?: number | null
          semanas?: number | null
          status?: Database["public"]["Enums"]["status_registro"]
          tecnica_ensino_sugerida?: string | null
        }
        Update: {
          carga_horaria_tempos?: number
          ch_semanal?: number | null
          cod_disciplina?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          id_disciplina_legado?: string | null
          instrutores_atribuidos?: string[]
          instrutores_atribuidos_legado_v1?: string | null
          local_padrao?: string | null
          modo_atribuicao_padrao?: Database["public"]["Enums"]["modo_atribuicao"]
          nome_disciplina?: string
          nome_normalizado?: string | null
          ordem_sugerida?: number | null
          origem_migracao_v1?: string | null
          previsao_inicio?: string | null
          previsao_termino?: string | null
          prioridade_alocacao_peso?: number | null
          semanas?: number | null
          status?: Database["public"]["Enums"]["status_registro"]
          tecnica_ensino_sugerida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      feriados: {
        Row: {
          abrangencia: string | null
          ano: number
          codigo: string
          criado_em: string
          criado_por: string | null
          data: string
          descricao: string
          editado_em: string | null
          editado_por: string | null
          id: string
          impacto: Database["public"]["Enums"]["impacto_feriado"]
          origem_migracao_v1: string | null
          origem_proens: string | null
          status: Database["public"]["Enums"]["status_registro"]
        }
        Insert: {
          abrangencia?: string | null
          ano: number
          codigo: string
          criado_em?: string
          criado_por?: string | null
          data: string
          descricao: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          impacto?: Database["public"]["Enums"]["impacto_feriado"]
          origem_migracao_v1?: string | null
          origem_proens?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
        }
        Update: {
          abrangencia?: string | null
          ano?: number
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao?: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          impacto?: Database["public"]["Enums"]["impacto_feriado"]
          origem_migracao_v1?: string | null
          origem_proens?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
        }
        Relationships: []
      }
      horarios_tempos_aula: {
        Row: {
          configuracao_id: string
          criado_em: string
          criado_por: string | null
          editado_em: string | null
          editado_por: string | null
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo_apos_min: number | null
          origem_migracao_v1: string | null
          periodo: Database["public"]["Enums"]["periodo_dia"]
          tempo_numero: number
          tipo_tempo: Database["public"]["Enums"]["tipo_tempo"]
        }
        Insert: {
          configuracao_id: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          hora_fim: string
          hora_inicio: string
          id?: string
          intervalo_apos_min?: number | null
          origem_migracao_v1?: string | null
          periodo: Database["public"]["Enums"]["periodo_dia"]
          tempo_numero: number
          tipo_tempo?: Database["public"]["Enums"]["tipo_tempo"]
        }
        Update: {
          configuracao_id?: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_apos_min?: number | null
          origem_migracao_v1?: string | null
          periodo?: Database["public"]["Enums"]["periodo_dia"]
          tempo_numero?: number
          tipo_tempo?: Database["public"]["Enums"]["tipo_tempo"]
        }
        Relationships: [
          {
            foreignKeyName: "horarios_tempos_aula_configuracao_id_fkey"
            columns: ["configuracao_id"]
            isOneToOne: false
            referencedRelation: "configuracoes_horario"
            referencedColumns: ["id"]
          },
        ]
      }
      instrutor_disciplina: {
        Row: {
          codigo: string
          criado_em: string
          criado_por: string | null
          disciplina_id: string
          editado_em: string | null
          editado_por: string | null
          id: string
          instrutor_id: string
          modo_atribuicao: Database["public"]["Enums"]["modo_atribuicao"]
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_registro"]
        }
        Insert: {
          codigo: string
          criado_em?: string
          criado_por?: string | null
          disciplina_id: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          instrutor_id: string
          modo_atribuicao?: Database["public"]["Enums"]["modo_atribuicao"]
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
        }
        Update: {
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          disciplina_id?: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          instrutor_id?: string
          modo_atribuicao?: Database["public"]["Enums"]["modo_atribuicao"]
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
        }
        Relationships: [
          {
            foreignKeyName: "instrutor_disciplina_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrutor_disciplina_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id"]
          },
          {
            foreignKeyName: "instrutor_disciplina_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrutor_disciplina_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
        ]
      }
      instrutores: {
        Row: {
          antiguidade_declarada: string | null
          antiguidade_declarada_num: number | null
          capacitacao_didatica: string | null
          categoria: string
          codigo: string
          criado_em: string
          criado_por: string | null
          data_assuncao_setor: string | null
          data_avaliacao_desempenho: string | null
          data_inicio_docencia_ciaara: string | null
          data_inicio_docencia_mb: string | null
          data_nascimento: string | null
          dep_divisao: string | null
          disciplinas_ministradas_legado_v1: string | null
          editado_em: string | null
          editado_por: string | null
          email: string | null
          esp_hab_obs: string
          formacao_principal_secundaria: string | null
          id: string
          nip: string | null
          nivel_escolaridade: string | null
          nome_completo: string
          nome_guerra: string | null
          nome_normalizado: string | null
          om: string
          origem_migracao_v1: string | null
          posto_graduacao: string
          preferencia: string | null
          regime_trabalho:
            | Database["public"]["Enums"]["regime_trabalho_docente"]
            | null
          status: Database["public"]["Enums"]["status_registro"]
          ultima_avaliacao_desempenho: string | null
        }
        Insert: {
          antiguidade_declarada?: string | null
          antiguidade_declarada_num?: number | null
          capacitacao_didatica?: string | null
          categoria: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          data_assuncao_setor?: string | null
          data_avaliacao_desempenho?: string | null
          data_inicio_docencia_ciaara?: string | null
          data_inicio_docencia_mb?: string | null
          data_nascimento?: string | null
          dep_divisao?: string | null
          disciplinas_ministradas_legado_v1?: string | null
          editado_em?: string | null
          editado_por?: string | null
          email?: string | null
          esp_hab_obs: string
          formacao_principal_secundaria?: string | null
          id?: string
          nip?: string | null
          nivel_escolaridade?: string | null
          nome_completo: string
          nome_guerra?: string | null
          nome_normalizado?: string | null
          om: string
          origem_migracao_v1?: string | null
          posto_graduacao: string
          preferencia?: string | null
          regime_trabalho?:
            | Database["public"]["Enums"]["regime_trabalho_docente"]
            | null
          status?: Database["public"]["Enums"]["status_registro"]
          ultima_avaliacao_desempenho?: string | null
        }
        Update: {
          antiguidade_declarada?: string | null
          antiguidade_declarada_num?: number | null
          capacitacao_didatica?: string | null
          categoria?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          data_assuncao_setor?: string | null
          data_avaliacao_desempenho?: string | null
          data_inicio_docencia_ciaara?: string | null
          data_inicio_docencia_mb?: string | null
          data_nascimento?: string | null
          dep_divisao?: string | null
          disciplinas_ministradas_legado_v1?: string | null
          editado_em?: string | null
          editado_por?: string | null
          email?: string | null
          esp_hab_obs?: string
          formacao_principal_secundaria?: string | null
          id?: string
          nip?: string | null
          nivel_escolaridade?: string | null
          nome_completo?: string
          nome_guerra?: string | null
          nome_normalizado?: string | null
          om?: string
          origem_migracao_v1?: string | null
          posto_graduacao?: string
          preferencia?: string | null
          regime_trabalho?:
            | Database["public"]["Enums"]["regime_trabalho_docente"]
            | null
          status?: Database["public"]["Enums"]["status_registro"]
          ultima_avaliacao_desempenho?: string | null
        }
        Relationships: []
      }
      janelas_curso: {
        Row: {
          ano: number
          codigo: string
          criado_em: string
          criado_por: string | null
          curso_id: string
          data_inicio_prevista: string | null
          data_termino_prevista: string | null
          editado_em: string | null
          editado_por: string | null
          id: string
          origem_migracao_v1: string | null
          origem_proens: string | null
          status: Database["public"]["Enums"]["status_registro"]
          turma_prevista: string | null
        }
        Insert: {
          ano: number
          codigo: string
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          data_inicio_prevista?: string | null
          data_termino_prevista?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          origem_migracao_v1?: string | null
          origem_proens?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          turma_prevista?: string | null
        }
        Update: {
          ano?: number
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          data_inicio_prevista?: string | null
          data_termino_prevista?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          origem_migracao_v1?: string | null
          origem_proens?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          turma_prevista?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "janelas_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "janelas_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      migracao_log: {
        Row: {
          acao: Database["public"]["Enums"]["acao_migracao"]
          codigo: string
          destino_chave: string | null
          destino_tabela: string | null
          executado_em: string
          executado_por: string | null
          id: string
          observacao: string | null
          origem_chave: string | null
          origem_tabela: string
          regra_aplicada: string | null
          valor_antes: string | null
          valor_depois: string | null
        }
        Insert: {
          acao: Database["public"]["Enums"]["acao_migracao"]
          codigo: string
          destino_chave?: string | null
          destino_tabela?: string | null
          executado_em?: string
          executado_por?: string | null
          id?: string
          observacao?: string | null
          origem_chave?: string | null
          origem_tabela: string
          regra_aplicada?: string | null
          valor_antes?: string | null
          valor_depois?: string | null
        }
        Update: {
          acao?: Database["public"]["Enums"]["acao_migracao"]
          codigo?: string
          destino_chave?: string | null
          destino_tabela?: string | null
          executado_em?: string
          executado_por?: string | null
          id?: string
          observacao?: string | null
          origem_chave?: string | null
          origem_tabela?: string
          regra_aplicada?: string | null
          valor_antes?: string | null
          valor_depois?: string | null
        }
        Relationships: []
      }
      perfil_permissao: {
        Row: {
          acao: string
          criado_em: string
          criado_por: string | null
          editado_em: string | null
          editado_por: string | null
          id: string
          observacao: string | null
          perfil: Database["public"]["Enums"]["perfil_usuario"]
          permitido: boolean
          recurso: string
        }
        Insert: {
          acao: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          observacao?: string | null
          perfil: Database["public"]["Enums"]["perfil_usuario"]
          permitido?: boolean
          recurso: string
        }
        Update: {
          acao?: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          observacao?: string | null
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          permitido?: boolean
          recurso?: string
        }
        Relationships: []
      }
      planejamento_anual: {
        Row: {
          ano_letivo: number
          codigo: string
          criado_em: string
          criado_por: string | null
          curso_id: string
          data_inicio_semana: string
          descricao: string | null
          disciplina_id: string | null
          editado_em: string | null
          editado_por: string | null
          gerado_em: string
          gerado_por: string | null
          id: string
          observacoes: string | null
          origem_linha: Database["public"]["Enums"]["origem_linha_planejamento"]
          origem_migracao_v1: string | null
          rotulo_turma_prevista: string | null
          salvo_em: string | null
          salvo_por: string | null
          semana_ano: number
          status_previa: Database["public"]["Enums"]["status_planejamento"]
          tempos_alocados: number
          tempos_alocados_motor: number | null
          tipo_linha: Database["public"]["Enums"]["tipo_linha_planejamento"]
          turma_prevista_id: string | null
          versao: number
        }
        Insert: {
          ano_letivo: number
          codigo: string
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          data_inicio_semana: string
          descricao?: string | null
          disciplina_id?: string | null
          editado_em?: string | null
          editado_por?: string | null
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          observacoes?: string | null
          origem_linha?: Database["public"]["Enums"]["origem_linha_planejamento"]
          origem_migracao_v1?: string | null
          rotulo_turma_prevista?: string | null
          salvo_em?: string | null
          salvo_por?: string | null
          semana_ano: number
          status_previa?: Database["public"]["Enums"]["status_planejamento"]
          tempos_alocados: number
          tempos_alocados_motor?: number | null
          tipo_linha: Database["public"]["Enums"]["tipo_linha_planejamento"]
          turma_prevista_id?: string | null
          versao: number
        }
        Update: {
          ano_letivo?: number
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          data_inicio_semana?: string
          descricao?: string | null
          disciplina_id?: string | null
          editado_em?: string | null
          editado_por?: string | null
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          observacoes?: string | null
          origem_linha?: Database["public"]["Enums"]["origem_linha_planejamento"]
          origem_migracao_v1?: string | null
          rotulo_turma_prevista?: string | null
          salvo_em?: string | null
          salvo_por?: string | null
          semana_ano?: number
          status_previa?: Database["public"]["Enums"]["status_planejamento"]
          tempos_alocados?: number
          tempos_alocados_motor?: number | null
          tipo_linha?: Database["public"]["Enums"]["tipo_linha_planejamento"]
          turma_prevista_id?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "planejamento_anual_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planejamento_anual_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "planejamento_anual_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planejamento_anual_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id"]
          },
          {
            foreignKeyName: "planejamento_anual_turma_prevista_id_fkey"
            columns: ["turma_prevista_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planejamento_anual_turma_prevista_id_fkey"
            columns: ["turma_prevista_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "planejamento_anual_turma_prevista_id_fkey"
            columns: ["turma_prevista_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "planejamento_anual_turma_prevista_id_fkey"
            columns: ["turma_prevista_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "planejamento_anual_turma_prevista_id_fkey"
            columns: ["turma_prevista_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      registros_aula: {
        Row: {
          categoria_normativa: Database["public"]["Enums"]["categoria_registro_aula"]
          codigo: string
          conteudo_resumo: string | null
          criado_em: string
          criado_por: string | null
          curso_id: string
          data: string
          editado_em: string | null
          editado_por: string | null
          id: string
          instrutor_id: string | null
          local: string | null
          metodologia: string | null
          observacoes: string | null
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_registro"]
          ta_final: number | null
          ta_inicial: number | null
          tempos_consumidos: number
          tipo_atividade: string | null
          turma_id: string
          unidade_ensino_id: string
        }
        Insert: {
          categoria_normativa?: Database["public"]["Enums"]["categoria_registro_aula"]
          codigo: string
          conteudo_resumo?: string | null
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          data: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          instrutor_id?: string | null
          local?: string | null
          metodologia?: string | null
          observacoes?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          ta_final?: number | null
          ta_inicial?: number | null
          tempos_consumidos: number
          tipo_atividade?: string | null
          turma_id: string
          unidade_ensino_id: string
        }
        Update: {
          categoria_normativa?: Database["public"]["Enums"]["categoria_registro_aula"]
          codigo?: string
          conteudo_resumo?: string | null
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          data?: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          instrutor_id?: string | null
          local?: string | null
          metodologia?: string | null
          observacoes?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          ta_final?: number | null
          ta_inicial?: number | null
          tempos_consumidos?: number
          tipo_atividade?: string | null
          turma_id?: string
          unidade_ensino_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reg_aula_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id", "curso_id"]
          },
          {
            foreignKeyName: "reg_aula_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "reg_aula_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "reg_aula_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "reg_aula_ue_do_curso"
            columns: ["unidade_ensino_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "unidades_ensino"
            referencedColumns: ["id", "curso_id"]
          },
          {
            foreignKeyName: "reg_aula_ue_do_curso"
            columns: ["unidade_ensino_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_unidades_ensino_execucao"
            referencedColumns: ["unidade_ensino_id", "curso_id"]
          },
          {
            foreignKeyName: "registros_aula_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_aula_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "registros_aula_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_aula_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "registros_aula_unidade_ensino_id_fkey"
            columns: ["unidade_ensino_id"]
            isOneToOne: false
            referencedRelation: "unidades_ensino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_aula_unidade_ensino_id_fkey"
            columns: ["unidade_ensino_id"]
            isOneToOne: false
            referencedRelation: "vw_unidades_ensino_execucao"
            referencedColumns: ["unidade_ensino_id"]
          },
        ]
      }
      reservas_proens: {
        Row: {
          ano: number
          codigo: string
          criado_em: string
          criado_por: string | null
          criterio: string | null
          curso_id: string
          editado_em: string | null
          editado_por: string | null
          id: string
          origem_migracao_v1: string | null
          origem_proens: string | null
          status: Database["public"]["Enums"]["status_registro"]
          tempos_reservados: number
          tipo_reserva: Database["public"]["Enums"]["tipo_reserva"]
        }
        Insert: {
          ano: number
          codigo: string
          criado_em?: string
          criado_por?: string | null
          criterio?: string | null
          curso_id: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          origem_migracao_v1?: string | null
          origem_proens?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          tempos_reservados: number
          tipo_reserva: Database["public"]["Enums"]["tipo_reserva"]
        }
        Update: {
          ano?: number
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          criterio?: string | null
          curso_id?: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          origem_migracao_v1?: string | null
          origem_proens?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          tempos_reservados?: number
          tipo_reserva?: Database["public"]["Enums"]["tipo_reserva"]
        }
        Relationships: [
          {
            foreignKeyName: "reservas_proens_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_proens_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      responsaveis_curso: {
        Row: {
          codigo: string
          criado_em: string
          criado_por: string | null
          curso_id: string | null
          editado_em: string | null
          editado_por: string | null
          email_usuario: string | null
          especialidade: string | null
          exibir_no_dsa: boolean
          funcao_descricao: string
          id: string
          instrutor_id: string | null
          nip: string | null
          nome_completo: string | null
          nome_guerra: string | null
          ordem: number
          origem_migracao_v1: string | null
          papel_assinatura: Database["public"]["Enums"]["papel_assinatura"]
          posto_graduacao: string | null
          preenchimento: Database["public"]["Enums"]["modo_preenchimento_assinatura"]
          status: Database["public"]["Enums"]["status_registro"]
          usuario_id: string | null
          vigente_ate: string | null
          vigente_de: string
        }
        Insert: {
          codigo: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string | null
          editado_em?: string | null
          editado_por?: string | null
          email_usuario?: string | null
          especialidade?: string | null
          exibir_no_dsa?: boolean
          funcao_descricao: string
          id?: string
          instrutor_id?: string | null
          nip?: string | null
          nome_completo?: string | null
          nome_guerra?: string | null
          ordem: number
          origem_migracao_v1?: string | null
          papel_assinatura: Database["public"]["Enums"]["papel_assinatura"]
          posto_graduacao?: string | null
          preenchimento: Database["public"]["Enums"]["modo_preenchimento_assinatura"]
          status?: Database["public"]["Enums"]["status_registro"]
          usuario_id?: string | null
          vigente_ate?: string | null
          vigente_de: string
        }
        Update: {
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string | null
          editado_em?: string | null
          editado_por?: string | null
          email_usuario?: string | null
          especialidade?: string | null
          exibir_no_dsa?: boolean
          funcao_descricao?: string
          id?: string
          instrutor_id?: string | null
          nip?: string | null
          nome_completo?: string | null
          nome_guerra?: string | null
          ordem?: number
          origem_migracao_v1?: string | null
          papel_assinatura?: Database["public"]["Enums"]["papel_assinatura"]
          posto_graduacao?: string | null
          preenchimento?: Database["public"]["Enums"]["modo_preenchimento_assinatura"]
          status?: Database["public"]["Enums"]["status_registro"]
          usuario_id?: string | null
          vigente_ate?: string | null
          vigente_de?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsaveis_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsaveis_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "responsaveis_curso_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responsaveis_curso_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
        ]
      }
      turma_disciplina: {
        Row: {
          codigo: string
          criado_em: string
          criado_por: string | null
          disciplina_id: string
          editado_em: string | null
          editado_por: string | null
          id: string
          origem_migracao_v1: string | null
          origem_periodo: Database["public"]["Enums"]["origem_periodo"]
          previsao_inicio: string | null
          previsao_termino: string | null
          status: Database["public"]["Enums"]["status_registro"]
          turma_id: string
        }
        Insert: {
          codigo: string
          criado_em?: string
          criado_por?: string | null
          disciplina_id: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          origem_migracao_v1?: string | null
          origem_periodo?: Database["public"]["Enums"]["origem_periodo"]
          previsao_inicio?: string | null
          previsao_termino?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          turma_id: string
        }
        Update: {
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          disciplina_id?: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          origem_migracao_v1?: string | null
          origem_periodo?: Database["public"]["Enums"]["origem_periodo"]
          previsao_inicio?: string | null
          previsao_termino?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_disciplina_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_disciplina_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id"]
          },
          {
            foreignKeyName: "turma_disciplina_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_disciplina_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "turma_disciplina_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "turma_disciplina_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "turma_disciplina_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turma_disciplina_instrutor: {
        Row: {
          ch_prevista_tempos: number | null
          codigo: string
          criado_em: string
          criado_por: string | null
          editado_em: string | null
          editado_por: string | null
          id: string
          instrutor_id: string
          observacao: string | null
          origem_migracao_v1: string | null
          papel: string | null
          status: Database["public"]["Enums"]["status_registro"]
          turma_disciplina_id: string
        }
        Insert: {
          ch_prevista_tempos?: number | null
          codigo: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          instrutor_id: string
          observacao?: string | null
          origem_migracao_v1?: string | null
          papel?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          turma_disciplina_id: string
        }
        Update: {
          ch_prevista_tempos?: number | null
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          instrutor_id?: string
          observacao?: string | null
          origem_migracao_v1?: string | null
          papel?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          turma_disciplina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_disciplina_instrutor_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_disciplina_instrutor_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
          {
            foreignKeyName: "turma_disciplina_instrutor_turma_disciplina_id_fkey"
            columns: ["turma_disciplina_id"]
            isOneToOne: false
            referencedRelation: "turma_disciplina"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          alunos: number | null
          ano_letivo: number
          codigo: string
          criado_em: string
          criado_por: string | null
          curso_id: string
          data_inicio: string | null
          data_termino: string | null
          editado_em: string | null
          editado_por: string | null
          id: string
          modalidade: Database["public"]["Enums"]["modalidade_ensino"] | null
          origem_migracao_v1: string | null
          sala_alocada: string | null
          status: Database["public"]["Enums"]["status_turma"]
          turma: string
        }
        Insert: {
          alunos?: number | null
          ano_letivo: number
          codigo: string
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          data_inicio?: string | null
          data_termino?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          modalidade?: Database["public"]["Enums"]["modalidade_ensino"] | null
          origem_migracao_v1?: string | null
          sala_alocada?: string | null
          status: Database["public"]["Enums"]["status_turma"]
          turma: string
        }
        Update: {
          alunos?: number | null
          ano_letivo?: number
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          data_inicio?: string | null
          data_termino?: string | null
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          modalidade?: Database["public"]["Enums"]["modalidade_ensino"] | null
          origem_migracao_v1?: string | null
          sala_alocada?: string | null
          status?: Database["public"]["Enums"]["status_turma"]
          turma?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      unidades_ensino: {
        Row: {
          ch_prevista_tempos: number
          codigo: string
          criado_em: string
          criado_por: string | null
          curso_id: string
          disciplina_id: string
          editado_em: string | null
          editado_por: string | null
          fundamento_normativo: string | null
          id: string
          numero_ue: number
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_registro"]
          tecnica_ensino_sugerida: string | null
          topico: string
        }
        Insert: {
          ch_prevista_tempos: number
          codigo: string
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          disciplina_id: string
          editado_em?: string | null
          editado_por?: string | null
          fundamento_normativo?: string | null
          id?: string
          numero_ue: number
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          tecnica_ensino_sugerida?: string | null
          topico: string
        }
        Update: {
          ch_prevista_tempos?: number
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          disciplina_id?: string
          editado_em?: string | null
          editado_por?: string | null
          fundamento_normativo?: string | null
          id?: string
          numero_ue?: number
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          tecnica_ensino_sugerida?: string | null
          topico?: string
        }
        Relationships: [
          {
            foreignKeyName: "ue_curso_coerente"
            columns: ["disciplina_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id", "curso_id"]
          },
          {
            foreignKeyName: "ue_curso_coerente"
            columns: ["disciplina_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id", "curso_id"]
          },
          {
            foreignKeyName: "unidades_ensino_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_ensino_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "unidades_ensino_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_ensino_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id"]
          },
        ]
      }
      usuario_curso: {
        Row: {
          codigo: string
          criado_em: string
          criado_por: string | null
          curso_id: string
          editado_em: string | null
          editado_por: string | null
          id: string
          observacao: string | null
          origem_migracao_v1: string | null
          status: Database["public"]["Enums"]["status_registro"]
          usuario_id: string
        }
        Insert: {
          codigo: string
          criado_em?: string
          criado_por?: string | null
          curso_id: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          observacao?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          usuario_id: string
        }
        Update: {
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          curso_id?: string
          editado_em?: string | null
          editado_por?: string | null
          id?: string
          observacao?: string | null
          origem_migracao_v1?: string | null
          status?: Database["public"]["Enums"]["status_registro"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "usuario_curso_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          auth_user_id: string | null
          codigo: string
          criado_em: string
          criado_por: string | null
          editado_em: string | null
          editado_por: string | null
          email: string
          escopo_curso: Database["public"]["Enums"]["escopo_curso"]
          id: string
          instrutor_id: string | null
          nome: string
          nome_exibicao: string | null
          observacao: string | null
          origem_migracao_v1: string | null
          perfil: Database["public"]["Enums"]["perfil_usuario"]
          status: Database["public"]["Enums"]["status_registro"]
          ultimo_acesso: string | null
        }
        Insert: {
          auth_user_id?: string | null
          codigo: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          email: string
          escopo_curso?: Database["public"]["Enums"]["escopo_curso"]
          id?: string
          instrutor_id?: string | null
          nome: string
          nome_exibicao?: string | null
          observacao?: string | null
          origem_migracao_v1?: string | null
          perfil: Database["public"]["Enums"]["perfil_usuario"]
          status?: Database["public"]["Enums"]["status_registro"]
          ultimo_acesso?: string | null
        }
        Update: {
          auth_user_id?: string | null
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          editado_em?: string | null
          editado_por?: string | null
          email?: string
          escopo_curso?: Database["public"]["Enums"]["escopo_curso"]
          id?: string
          instrutor_id?: string | null
          nome?: string
          nome_exibicao?: string | null
          observacao?: string | null
          origem_migracao_v1?: string | null
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
          status?: Database["public"]["Enums"]["status_registro"]
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
        ]
      }
    }
    Views: {
      vw_avaliacoes_situacao: {
        Row: {
          cod_disciplina: string | null
          codigo: string | null
          conciliacao_migracao:
            | Database["public"]["Enums"]["conciliacao_migracao"]
            | null
          conteudo_resumo: string | null
          criado_em: string | null
          criado_por: string | null
          curso_id: string | null
          data_avaliacao: string | null
          data_vista_prova: string | null
          disciplina_id: string | null
          editado_em: string | null
          editado_por: string | null
          fiscal_id: string | null
          id: string | null
          instrutor_responsavel_id: string | null
          item_planejado_id: string | null
          local: string | null
          local_vista: string | null
          metodologia: string | null
          nome_disciplina: string | null
          nome_fiscal_externo: string | null
          observacoes: string | null
          origem_execucao_v1: string | null
          origem_migracao_v1: string | null
          situacao_vista: Database["public"]["Enums"]["status_vista"] | null
          status: Database["public"]["Enums"]["status_avaliacao"] | null
          ta_final: number | null
          ta_final_vista: number | null
          ta_inicial: number | null
          ta_inicial_vista: number | null
          tempos_consumidos: number | null
          tempos_consumidos_vista: number | null
          tipo_avaliacao: string | null
          turma_codigo: string | null
          turma_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aval_disciplina_do_curso"
            columns: ["disciplina_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id", "curso_id"]
          },
          {
            foreignKeyName: "aval_disciplina_do_curso"
            columns: ["disciplina_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id", "curso_id"]
          },
          {
            foreignKeyName: "aval_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id", "curso_id"]
          },
          {
            foreignKeyName: "aval_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "aval_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "aval_turma_do_curso"
            columns: ["turma_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id", "curso_id"]
          },
          {
            foreignKeyName: "avaliacoes_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "avaliacoes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id"]
          },
          {
            foreignKeyName: "avaliacoes_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fiscal_id_fkey"
            columns: ["fiscal_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
          {
            foreignKeyName: "avaliacoes_instrutor_responsavel_id_fkey"
            columns: ["instrutor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_instrutor_responsavel_id_fkey"
            columns: ["instrutor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
          {
            foreignKeyName: "avaliacoes_item_planejado_id_fkey"
            columns: ["item_planejado_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_planejadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "avaliacoes_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      vw_carga_horaria_turma: {
        Row: {
          ano_letivo: number | null
          chd_executada: number | null
          chr_curricular: number | null
          cht_executada: number | null
          curso_codigo: string | null
          curso_id: string | null
          nome_curso: string | null
          status_turma: Database["public"]["Enums"]["status_turma"] | null
          ta_aec: number | null
          ta_aula: number | null
          ta_avaliacao: number | null
          ta_estudo_individual: number | null
          ta_extraclasse: number | null
          ta_tad: number | null
          ta_tr: number | null
          ta_vista_prova: number | null
          turma_codigo: string | null
          turma_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      vw_conformidade_tetos: {
        Row: {
          aec_excedido: boolean | null
          ano_letivo: number | null
          chd_executada: number | null
          chr_curricular: number | null
          cht_executada: number | null
          curso_codigo: string | null
          curso_id: string | null
          nome_curso: string | null
          ta_aec: number | null
          ta_estudo_individual: number | null
          ta_tad: number | null
          ta_tr: number | null
          tad_excedido: boolean | null
          tad_reservado_proens: number | null
          teto_aec: number | null
          teto_tad: number | null
          teto_tr: number | null
          tr_excedido: boolean | null
          tr_reservado_proens: number | null
          turma_codigo: string | null
          turma_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      vw_cursos_regime_vigente: {
        Row: {
          classificacao: Database["public"]["Enums"]["escopo_curso"] | null
          config_horario_excecao: string | null
          config_horario_padrao: string | null
          curso_codigo: string | null
          curso_id: string | null
          fundamento_excecao: string | null
          hora_inicio_manha: string | null
          hora_inicio_tarde: string | null
          intervalo_padrao_manha_min: number | null
          intervalo_padrao_tarde_min: number | null
          limite_diario_ead_horas: number | null
          modalidade: Database["public"]["Enums"]["modalidade_ensino"] | null
          nome_curso: string | null
          regime_excecao_tempos: number | null
          regime_padrao_tempos: number | null
          status: Database["public"]["Enums"]["status_registro"] | null
          ta_excecao_duracao_min: number | null
          ta_padrao_duracao_min: number | null
        }
        Relationships: []
      }
      vw_disciplinas_execucao: {
        Row: {
          ano_letivo: number | null
          carga_horaria_tempos: number | null
          cod_disciplina: string | null
          curso_id: string | null
          data_real_inicio: string | null
          data_real_termino: string | null
          disciplina_codigo: string | null
          disciplina_id: string | null
          nome_disciplina: string | null
          origem_periodo: Database["public"]["Enums"]["origem_periodo"] | null
          previsao_inicio_efetiva: string | null
          previsao_termino_efetiva: string | null
          ta_aula_executados: number | null
          ta_avaliacao_executados: number | null
          ta_executados: number | null
          ta_saldo: number | null
          turma_codigo: string | null
          turma_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      vw_instrutor_carga_anual: {
        Row: {
          ano: number | null
          dep_divisao: string | null
          faixa_semanal_max: number | null
          faixa_semanal_min: number | null
          instrutor_codigo: string | null
          instrutor_id: string | null
          nome_completo: string | null
          nome_exibicao: string | null
          om: string | null
          ordem_antiguidade: number | null
          posto_graduacao: string | null
          qtd_disciplinas_habilitadas: number | null
          regime_trabalho:
            | Database["public"]["Enums"]["regime_trabalho_docente"]
            | null
          status: Database["public"]["Enums"]["status_registro"] | null
          ta_fiscalizado_ano: number | null
          ta_ministrado_ano: number | null
          tempo_setor_anos: number | null
        }
        Relationships: []
      }
      vw_instrutor_disciplina_rotulada: {
        Row: {
          carga_horaria_tempos: number | null
          cod_disciplina: string | null
          curso_codigo: string | null
          curso_id: string | null
          disciplina_id: string | null
          instrutor_id: string | null
          instrutor_rotulo: string | null
          modo_atribuicao_efetivo:
            | Database["public"]["Enums"]["modo_atribuicao"]
            | null
          nome_completo: string | null
          nome_curso: string | null
          nome_disciplina: string | null
          nome_guerra: string | null
          ordem_antiguidade: number | null
          posto_graduacao: string | null
          status: Database["public"]["Enums"]["status_registro"] | null
          vinculo_codigo: string | null
          vinculo_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "instrutor_disciplina_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrutor_disciplina_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id"]
          },
          {
            foreignKeyName: "instrutor_disciplina_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "instrutores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrutor_disciplina_instrutor_id_fkey"
            columns: ["instrutor_id"]
            isOneToOne: false
            referencedRelation: "vw_instrutor_carga_anual"
            referencedColumns: ["instrutor_id"]
          },
        ]
      }
      vw_ocupacao_ta: {
        Row: {
          data: string | null
          disciplina_id: string | null
          fato_id: string | null
          instrutor_id: string | null
          origem: string | null
          ta_final: number | null
          ta_inicial: number | null
          tempos_consumidos: number | null
          turma_id: string | null
        }
        Relationships: []
      }
      vw_turmas_rotulo: {
        Row: {
          ano_letivo: number | null
          curso_codigo: string | null
          curso_id: string | null
          data_inicio: string | null
          data_termino: string | null
          nome_completo_curso: string | null
          nome_curso: string | null
          rotulo_completo: string | null
          status: Database["public"]["Enums"]["status_turma"] | null
          turma: string | null
          turma_codigo: string | null
          turma_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
        ]
      }
      vw_unidades_ensino_execucao: {
        Row: {
          ch_prevista_tempos: number | null
          curso_id: string | null
          data_real_inicio: string | null
          data_real_termino: string | null
          disciplina_id: string | null
          lancamentos: number | null
          numero_ue: number | null
          ta_executados: number | null
          ta_saldo: number | null
          topico: string | null
          turma_id: string | null
          unidade_codigo: string | null
          unidade_ensino_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_carga_horaria_turma"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_conformidade_tetos"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "registros_aula_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "vw_turmas_rotulo"
            referencedColumns: ["turma_id"]
          },
          {
            foreignKeyName: "ue_curso_coerente"
            columns: ["disciplina_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id", "curso_id"]
          },
          {
            foreignKeyName: "ue_curso_coerente"
            columns: ["disciplina_id", "curso_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id", "curso_id"]
          },
          {
            foreignKeyName: "unidades_ensino_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_ensino_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "vw_cursos_regime_vigente"
            referencedColumns: ["curso_id"]
          },
          {
            foreignKeyName: "unidades_ensino_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_ensino_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "vw_disciplinas_execucao"
            referencedColumns: ["disciplina_id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      acao_migracao:
        | "transportado"
        | "transformado"
        | "conciliado"
        | "arquivado"
        | "corrigido"
      categoria_normativa: "AEC" | "TAD" | "TR" | "Estudo_Individual"
      categoria_registro_aula: "aula" | "atividade_extraclasse"
      conciliacao_migracao:
        | "par_exato"
        | "par_inferido"
        | "sem_execucao"
        | "execucao_orfa"
      criterio_prioridade_alocacao:
        | "carga_restante_por_dia_util"
        | "ordem_sugerida"
        | "manual"
      escopo_atividade: "global" | "turma"
      escopo_curso:
        | "geral"
        | "regular"
        | "expedito"
        | "estagio_qualificacao"
        | "ead_semipresencial"
      impacto_feriado: "dia_inteiro" | "parcial" | "informativo"
      modalidade_ensino: "presencial" | "ead" | "semipresencial"
      modo_atribuicao: "herdar" | "dividido" | "simultaneo"
      modo_preenchimento_assinatura: "fixo" | "dinamico_usuario_logado"
      origem_linha_planejamento: "motor" | "motor_editado" | "manual"
      origem_periodo: "herdado_grade" | "manual" | "nao_informado"
      papel_assinatura:
        | "elaborador"
        | "encarregado_divisao"
        | "encarregado_curso"
        | "chefe_departamento"
      perfil_usuario:
        | "admin"
        | "chefe_departamento_ensino"
        | "encarregado_administracao_academica"
        | "ajudante_administracao_academica"
        | "encarregado_orientacao_pedagogica"
        | "ajudante_orientacao_pedagogica"
        | "operador"
        | "encarregado_curso"
        | "visualizacao"
      periodo_dia: "manha" | "tarde"
      regime_trabalho_docente: "20h" | "40h" | "dedicacao_exclusiva"
      status_avaliacao:
        | "pendente"
        | "em_andamento"
        | "concluida"
        | "atrasada"
        | "cancelada"
      status_config_horario: "ativo" | "substituido"
      status_planejamento: "rascunho" | "salvo" | "arquivado"
      status_registro: "ativo" | "inativo"
      status_turma: "planejada" | "ativa" | "concluida" | "cancelada"
      status_vigencia: "ativo" | "cancelado"
      status_vista: "pendente" | "realizada" | "atrasada"
      tipo_linha_planejamento:
        | "disciplina"
        | "evento_manual"
        | "reserva_proens"
        | "feriado"
        | "licenca_pagamento"
      tipo_regime: "padrao" | "excecao"
      tipo_reserva: "TAD" | "TR"
      tipo_tempo: "normal" | "excepcional"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      acao_migracao: [
        "transportado",
        "transformado",
        "conciliado",
        "arquivado",
        "corrigido",
      ],
      categoria_normativa: ["AEC", "TAD", "TR", "Estudo_Individual"],
      categoria_registro_aula: ["aula", "atividade_extraclasse"],
      conciliacao_migracao: [
        "par_exato",
        "par_inferido",
        "sem_execucao",
        "execucao_orfa",
      ],
      criterio_prioridade_alocacao: [
        "carga_restante_por_dia_util",
        "ordem_sugerida",
        "manual",
      ],
      escopo_atividade: ["global", "turma"],
      escopo_curso: [
        "geral",
        "regular",
        "expedito",
        "estagio_qualificacao",
        "ead_semipresencial",
      ],
      impacto_feriado: ["dia_inteiro", "parcial", "informativo"],
      modalidade_ensino: ["presencial", "ead", "semipresencial"],
      modo_atribuicao: ["herdar", "dividido", "simultaneo"],
      modo_preenchimento_assinatura: ["fixo", "dinamico_usuario_logado"],
      origem_linha_planejamento: ["motor", "motor_editado", "manual"],
      origem_periodo: ["herdado_grade", "manual", "nao_informado"],
      papel_assinatura: [
        "elaborador",
        "encarregado_divisao",
        "encarregado_curso",
        "chefe_departamento",
      ],
      perfil_usuario: [
        "admin",
        "chefe_departamento_ensino",
        "encarregado_administracao_academica",
        "ajudante_administracao_academica",
        "encarregado_orientacao_pedagogica",
        "ajudante_orientacao_pedagogica",
        "operador",
        "encarregado_curso",
        "visualizacao",
      ],
      periodo_dia: ["manha", "tarde"],
      regime_trabalho_docente: ["20h", "40h", "dedicacao_exclusiva"],
      status_avaliacao: [
        "pendente",
        "em_andamento",
        "concluida",
        "atrasada",
        "cancelada",
      ],
      status_config_horario: ["ativo", "substituido"],
      status_planejamento: ["rascunho", "salvo", "arquivado"],
      status_registro: ["ativo", "inativo"],
      status_turma: ["planejada", "ativa", "concluida", "cancelada"],
      status_vigencia: ["ativo", "cancelado"],
      status_vista: ["pendente", "realizada", "atrasada"],
      tipo_linha_planejamento: [
        "disciplina",
        "evento_manual",
        "reserva_proens",
        "feriado",
        "licenca_pagamento",
      ],
      tipo_regime: ["padrao", "excecao"],
      tipo_reserva: ["TAD", "TR"],
      tipo_tempo: ["normal", "excepcional"],
    },
  },
} as const

