const DAYS_PT_BR = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MONTHS_PT_BR = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Formats a Date object as a PT-BR long date string.
 * Example: "Terça-feira, 17 de Março de 2026"
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDatePtBr(date) {
  const dayOfWeek = DAYS_PT_BR[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_PT_BR[date.getMonth()];
  const year = date.getFullYear();
  return `${dayOfWeek}, ${day} de ${month} de ${year}`;
}

/**
 * Returns a new Date that is `days` calendar days after `date`.
 *
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
