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
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
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

