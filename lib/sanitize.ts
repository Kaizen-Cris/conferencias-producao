export type SanitizeOptions = {
  maxLen?: number
}

export function sanitizeText(input: string, opts: SanitizeOptions = {}): string {
  const maxLen = opts.maxLen ?? 200
  const cleaned = input
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // remove control chars
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned
}
