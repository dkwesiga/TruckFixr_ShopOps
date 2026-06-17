export type CsvCell = string | number | null | undefined;

/** Serialize rows to RFC-4180 CSV (CRLF line endings, quoted when needed). */
export function toCsv(rows: CsvCell[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = cell == null ? "" : String(cell);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\r\n");
}
