/** First A–Z / 0–9 letter used for jump-to-letter navigation. */
export function firstIndexLetter(label: string): string {
  const match = label.trim().match(/[A-Za-z0-9]/)
  if (match) return match[0].toUpperCase()
  return '#'
}

export function matchesSearchQuery(label: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return label.toLowerCase().includes(q)
}

export function indexLettersFromLabels(labels: string[]): string[] {
  const letters = new Set<string>()
  for (const label of labels) {
    letters.add(firstIndexLetter(label))
  }
  return Array.from(letters).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })
}
