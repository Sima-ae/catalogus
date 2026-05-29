/** Merge category labels with "All" first and no duplicates. */
export function mergeShopCategoryLabels(...lists: (readonly string[] | string[])[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  const add = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === 'All' || seen.has(trimmed)) return
    seen.add(trimmed)
    result.push(trimmed)
  }

  result.push('All')
  seen.add('All')

  for (const list of lists) {
    for (const name of list) {
      add(name)
    }
  }

  return result
}
