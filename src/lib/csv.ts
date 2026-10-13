export function csvCell(value: string | number, protectFormula = false) {
  let normalized = String(value);
  if (protectFormula && /^[\s\u0000-\u001f]*[=+\-@]/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function csvDocument(headers: string[], rows: string[][]) {
  const encodedHeaders = headers.map((header) => csvCell(header)).join(",");
  return `\uFEFF${[encodedHeaders, ...rows.map((row) => row.join(","))].join("\r\n")}\r\n`;
}
