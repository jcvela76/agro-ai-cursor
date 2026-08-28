/** ASCII-safe filename for Content-Disposition (HTTP headers are ByteString). */
export function sanitizePdfFilename(title: string): string {
  const ascii = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return ascii.length > 0 ? `${ascii}.pdf` : "informe.pdf";
}

export function contentDispositionHeader(title: string, inline = false): string {
  const filename = sanitizePdfFilename(title);
  const disposition = inline ? "inline" : "attachment";
  return `${disposition}; filename="${filename}"`;
}
