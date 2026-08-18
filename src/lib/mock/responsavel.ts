// Dado fixo — sem tabela no banco ainda ("limites de uso" não está no
// schema, ver supabase/migrations/0001_schema_inicial.sql). Consentimento e
// progresso do responsável já são reais — ver src/lib/data/*.
export function getLimitesDeUsoMock() {
  return {
    janelaPermitida: "16h às 20h, dias de aula",
    alertaComportamentoForaDoPadrao: true,
  };
}
