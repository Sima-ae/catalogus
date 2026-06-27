export function slugifyCategory(value: string) {
  const compoundMarker = '\u0000'
  return value
    .toLowerCase()
    .trim()
    .replace(/\s*[|&]\s*/g, compoundMarker)
    .replace(/\s+/g, '-')
    .replace(new RegExp(`[^a-z0-9-${compoundMarker}]`, 'g'), '')
    .replace(/-+/g, '-')
    .split(compoundMarker)
    .join('--')
    .replace(/^-|-$/g, '')
}
