/**
 * Normaliza um número de telefone brasileiro para o formato 55DDDNNNNNNNNN.
 * - Remove qualquer caractere não numérico.
 * - Garante DDI 55.
 * - Aceita números de 10 ou 11 dígitos (sem DDI) ou já com DDI.
 * Retorna null se não for um número válido.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, "");
  if (!digits) return null;

  // Remove DDI 55 inicial se existir, depois reanexa.
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  // Aceita 10 (fixo) ou 11 (móvel) dígitos no formato local.
  if (digits.length !== 10 && digits.length !== 11) return null;
  return `55${digits}`;
}
