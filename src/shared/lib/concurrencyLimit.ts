// Promise.allSettled с ограничением числа одновременно летящих промисов —
// свой воркер-пул фиксированного размера, готовой библиотеки вроде p-limit
// в проекте нет.
export async function mapWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0

  async function runWorker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1

      try {
        const value = await worker(items[index], index)
        results[index] = { status: 'fulfilled', value }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workerCount }, runWorker))

  return results
}
