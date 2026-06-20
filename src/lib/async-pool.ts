/** Run async work over items with a fixed concurrency limit. */
export async function runPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (!items.length) return

  const limit = Math.max(1, Math.min(Math.floor(concurrency), items.length))
  let next = 0

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const index = next++
        if (index >= items.length) break
        await worker(items[index]!, index)
      }
    })
  )
}

export class AsyncMutex {
  private chain: Promise<void> = Promise.resolve()

  run<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn)
    this.chain = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }
}
