// Génération de CSV ouvrable directement dans Excel (séparateur ";" + BOM UTF-8,
// convention FR). Utilisé par les routes d'export et les boutons « Exporter Excel ».

import { NextResponse } from "next/server";

/** Échappe une valeur de cellule pour le CSV (guillemets, séparateur, retours ligne). */
function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Construit un CSV (point-virgule) à partir d'en-têtes et de lignes.
 * `rows` = tableau d'objets ; `columns` = [clé, libellé] dans l'ordre voulu.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<[keyof T, string]>,
): string {
  const header = columns.map(([, label]) => cell(label)).join(";");
  const body = rows
    .map((r) => columns.map(([key]) => cell(r[key])).join(";"))
    .join("\r\n");
  return `${header}\r\n${body}`;
}

/** Réponse HTTP de téléchargement CSV (BOM UTF-8 pour Excel + nom de fichier). */
export function csvResponse(csv: string, filename: string): NextResponse {
  const bom = "﻿";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
