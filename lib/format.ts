/** Format a number as F CFA (XOF), e.g. 35000 -> "35 000 F CFA". */
export function formatCFA(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toLocaleString("fr-FR").replace(/ /g, " ")} F CFA`;
}

/** Date courte FR à partir d'une Date ou d'une chaîne ISO, ex. "18/06/2026". */
export function formatDateFR(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Date + heure FR, ex. "18/06/2026 14:05". */
export function formatDateTimeFR(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Valeur de jour ISO (YYYY-MM-DD) pour les <input type="date">. */
export function toDateInput(value: Date | string = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
