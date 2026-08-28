/** YYYY-MM-DD in America/Lima for download filenames. */
export function reportDateStamp(isoDate: string | Date = new Date()): string {
  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/** ASCII-safe filename for Content-Disposition (HTTP headers are ByteString). */
export function sanitizePdfFilename(
  title: string,
  createdAt?: string | Date,
): string {
  const ascii = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const base = ascii.length > 0 ? ascii : "informe";
  const date = reportDateStamp(createdAt ?? new Date());
  return `${base}-${date}.pdf`;
}

export function contentDispositionHeader(
  title: string,
  options: { inline?: boolean; createdAt?: string | Date } = {},
): string {
  const filename = sanitizePdfFilename(title, options.createdAt);
  const disposition = options.inline ? "inline" : "attachment";
  return `${disposition}; filename="${filename}"`;
}
